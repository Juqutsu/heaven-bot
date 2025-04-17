const fs = require('node:fs');
const path = require('node:path');
const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');

// Database file paths
const DB_DIR = path.join(process.cwd(), 'data');
const MODERATION_FILE = path.join(DB_DIR, 'moderation.json');

// Ensure data directory exists
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

// Initialize moderation database if it doesn't exist
if (!fs.existsSync(MODERATION_FILE)) {
  fs.writeFileSync(MODERATION_FILE, JSON.stringify({
    infractions: {},
    settings: {
      logChannelId: null,
      dmNotifications: true,
      autoMuteRole: null
    }
  }, null, 2));
}

/**
 * Get moderation data from database
 * @returns {Object} Moderation data
 */
function getModerationData() {
  try {
    const data = fs.readFileSync(MODERATION_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading moderation data:', error);
    return { 
      infractions: {},
      settings: {
        logChannelId: null,
        dmNotifications: true,
        autoMuteRole: null
      }
    };
  }
}

/**
 * Save moderation data to database
 * @param {Object} data - Moderation data to save
 */
function saveModerationData(data) {
  try {
    fs.writeFileSync(MODERATION_FILE, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error saving moderation data:', error);
  }
}

/**
 * Create a new infraction for a user
 * @param {string} userId - User ID
 * @param {string} type - Type of infraction (warn, mute, kick, ban)
 * @param {string} reason - Reason for the infraction
 * @param {string} moderatorId - Moderator ID who issued the infraction
 * @param {number|null} duration - Duration in milliseconds (for temporary actions)
 * @param {Object} client - Discord client
 * @returns {Object} The created infraction
 */
async function createInfraction(userId, type, reason, moderatorId, duration = null, client) {
  const data = getModerationData();
  
  // Initialize user infractions if they don't exist
  if (!data.infractions[userId]) {
    data.infractions[userId] = [];
  }
  
  const infraction = {
    id: generateInfractionId(),
    type,
    reason,
    moderatorId,
    timestamp: Date.now(),
    active: true
  };
  
  // Add duration for temporary infractions
  if (duration) {
    infraction.duration = duration;
    infraction.expiresAt = Date.now() + duration;
  }
  
  // Add to infractions database
  data.infractions[userId].push(infraction);
  saveModerationData(data);
  
  // Log the infraction
  await logInfraction(userId, infraction, client);
  
  // Send DM notification if enabled
  if (data.settings.dmNotifications) {
    await sendInfractionDM(userId, infraction, client);
  }
  
  return infraction;
}

/**
 * Generate a unique infraction ID
 * @returns {string} Unique ID
 */
function generateInfractionId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

/**
 * Log an infraction to the log channel
 * @param {string} userId - User ID
 * @param {Object} infraction - Infraction data
 * @param {Object} client - Discord client
 */
async function logInfraction(userId, infraction, client) {
  const data = getModerationData();
  const logChannelId = data.settings.logChannelId;
  
  if (!logChannelId) return;
  
  const logChannel = await client.channels.fetch(logChannelId).catch(() => null);
  if (!logChannel) return;
  
  const user = await client.users.fetch(userId).catch(() => null);
  const moderator = await client.users.fetch(infraction.moderatorId).catch(() => null);
  
  const embed = new EmbedBuilder()
    .setTitle(`Moderation Action: ${capitalize(infraction.type)}`)
    .setColor(getInfractionColor(infraction.type))
    .setTimestamp()
    .addFields(
      { name: 'User', value: user ? `${user.tag} (${user.id})` : `Unknown (${userId})`, inline: true },
      { name: 'Moderator', value: moderator ? `${moderator.tag}` : `Unknown (${infraction.moderatorId})`, inline: true },
      { name: 'Reason', value: infraction.reason || 'No reason provided' }
    );
  
  if (infraction.duration) {
    const durationText = formatDuration(infraction.duration);
    embed.addFields({ name: 'Duration', value: durationText, inline: true });
  }
  
  embed.addFields({ name: 'Infraction ID', value: infraction.id, inline: true });
  
  await logChannel.send({ embeds: [embed] });
}

/**
 * Send a DM to a user about their infraction
 * @param {string} userId - User ID
 * @param {Object} infraction - Infraction data
 * @param {Object} client - Discord client
 */
async function sendInfractionDM(userId, infraction, client) {
  const user = await client.users.fetch(userId).catch(() => null);
  if (!user) return;
  
  const embed = new EmbedBuilder()
    .setTitle(`You have received a ${capitalize(infraction.type)}`)
    .setColor(getInfractionColor(infraction.type))
    .setTimestamp()
    .addFields(
      { name: 'Reason', value: infraction.reason || 'No reason provided' }
    );
  
  if (infraction.duration) {
    const durationText = formatDuration(infraction.duration);
    embed.addFields({ name: 'Duration', value: durationText });
  }
  
  embed.setFooter({ text: 'If you believe this action was made in error, please contact a server administrator.' });
  
  await user.send({ embeds: [embed] }).catch(() => {
    // User might have DMs closed
  });
}

/**
 * Get the color for an infraction type
 * @param {string} type - Infraction type
 * @returns {number} Color code
 */
function getInfractionColor(type) {
  switch (type.toLowerCase()) {
    case 'warn':
      return 0xFFD700; // Gold
    case 'mute':
      return 0xFF8C00; // Dark Orange
    case 'kick':
      return 0xFF4500; // Orange Red
    case 'ban':
      return 0xFF0000; // Red
    default:
      return 0x7289DA; // Discord Blue
  }
}

/**
 * Format a duration in milliseconds to a human-readable string
 * @param {number} duration - Duration in milliseconds
 * @returns {string} Formatted duration
 */
function formatDuration(duration) {
  const seconds = Math.floor(duration / 1000);
  
  if (seconds < 60) {
    return `${seconds} second${seconds === 1 ? '' : 's'}`;
  }
  
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes} minute${minutes === 1 ? '' : 's'}`;
  }
  
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours} hour${hours === 1 ? '' : 's'}`;
  }
  
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? '' : 's'}`;
}

/**
 * Capitalize the first letter of a string
 * @param {string} string - String to capitalize
 * @returns {string} Capitalized string
 */
function capitalize(string) {
  return string.charAt(0).toUpperCase() + string.slice(1).toLowerCase();
}

/**
 * Get user infractions
 * @param {string} userId - User ID
 * @returns {Array} User infractions
 */
function getUserInfractions(userId) {
  const data = getModerationData();
  return data.infractions[userId] || [];
}

/**
 * Get a specific infraction by ID
 * @param {string} infractionId - Infraction ID
 * @returns {Object|null} Infraction data or null if not found
 */
function getInfractionById(infractionId) {
  const data = getModerationData();
  
  for (const [userId, infractions] of Object.entries(data.infractions)) {
    const infraction = infractions.find(inf => inf.id === infractionId);
    if (infraction) {
      return { userId, infraction };
    }
  }
  
  return null;
}

/**
 * Update an infraction's active status
 * @param {string} infractionId - Infraction ID
 * @param {boolean} active - New active status
 * @returns {boolean} Success status
 */
function updateInfractionStatus(infractionId, active) {
  const data = getModerationData();
  const infractionData = getInfractionById(infractionId);
  
  if (!infractionData) return false;
  
  const { userId, infraction } = infractionData;
  const index = data.infractions[userId].findIndex(inf => inf.id === infractionId);
  
  if (index === -1) return false;
  
  data.infractions[userId][index].active = active;
  saveModerationData(data);
  
  return true;
}

/**
 * Count infractions by type for a user
 * @param {string} userId - User ID
 * @returns {Object} Counts by infraction type
 */
function countUserInfractions(userId) {
  const infractions = getUserInfractions(userId);
  const counts = {
    total: infractions.length,
    warn: 0,
    mute: 0,
    kick: 0,
    ban: 0,
    active: 0
  };
  
  for (const infraction of infractions) {
    const type = infraction.type.toLowerCase();
    if (counts[type] !== undefined) {
      counts[type]++;
    }
    
    if (infraction.active) {
      counts.active++;
    }
  }
  
  return counts;
}

/**
 * Check if a user has required permissions for moderation
 * @param {Object} member - Guild member
 * @returns {boolean} Whether the user has moderation permissions
 */
function canModerate(member) {
  return member.permissions.has(PermissionFlagsBits.ModerateMembers) || 
         member.permissions.has(PermissionFlagsBits.BanMembers) || 
         member.permissions.has(PermissionFlagsBits.KickMembers);
}

/**
 * Check for expired infractions and remove them
 * @param {Object} client - Discord client
 */
async function checkExpiredInfractions(client) {
  const data = getModerationData();
  const now = Date.now();
  let updated = false;
  
  for (const [userId, infractions] of Object.entries(data.infractions)) {
    for (let i = 0; i < infractions.length; i++) {
      const infraction = infractions[i];
      
      if (infraction.active && infraction.expiresAt && infraction.expiresAt <= now) {
        // Mark as inactive
        infraction.active = false;
        updated = true;
        
        // Handle unmuting
        if (infraction.type.toLowerCase() === 'mute') {
          await handleExpiredMute(userId, infraction, client);
        }
      }
    }
  }
  
  if (updated) {
    saveModerationData(data);
  }
}

/**
 * Handle expired mute
 * @param {string} userId - User ID
 * @param {Object} infraction - Infraction data
 * @param {Object} client - Discord client
 */
async function handleExpiredMute(userId, infraction, client) {
  const data = getModerationData();
  const { autoMuteRole } = data.settings;
  
  if (!autoMuteRole) return;
  
  // Try to unmute in all guilds (in case of multi-guild bot)
  for (const guild of client.guilds.cache.values()) {
    try {
      const member = await guild.members.fetch(userId).catch(() => null);
      if (member && member.roles.cache.has(autoMuteRole)) {
        await member.roles.remove(autoMuteRole);
        
        // Log unmute
        const logInfraction = {
          id: 'auto-' + generateInfractionId(),
          type: 'unmute',
          reason: 'Temporary mute expired',
          moderatorId: client.user.id,
          timestamp: Date.now(),
          active: false
        };
        
        await logInfraction(userId, logInfraction, client);
      }
    } catch (error) {
      console.error(`Error unmuting user ${userId} in guild ${guild.id}:`, error);
    }
  }
}

/**
 * Update moderation settings
 * @param {Object} settings - New settings
 * @returns {Object} Updated settings
 */
function updateModerationSettings(settings) {
  const data = getModerationData();
  data.settings = { ...data.settings, ...settings };
  saveModerationData(data);
  return data.settings;
}

/**
 * Get moderation settings
 * @returns {Object} Moderation settings
 */
function getModerationSettings() {
  const data = getModerationData();
  return data.settings;
}

module.exports = {
  createInfraction,
  getUserInfractions,
  getInfractionById,
  updateInfractionStatus,
  countUserInfractions,
  canModerate,
  checkExpiredInfractions,
  updateModerationSettings,
  getModerationSettings
}; 