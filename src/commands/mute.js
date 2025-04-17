const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { createInfraction, canModerate, getModerationSettings } = require('../utils/moderation');
const { updateCommandStats } = require('../utils/statistics');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mute')
    .setDescription('Mute a user for a specified duration')
    .addUserOption(option => 
      option
        .setName('user')
        .setDescription('The user to mute')
        .setRequired(true))
    .addStringOption(option => 
      option
        .setName('duration')
        .setDescription('Duration of the mute (e.g. 1h, 1d, 7d)')
        .setRequired(true))
    .addStringOption(option => 
      option
        .setName('reason')
        .setDescription('The reason for the mute')
        .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
  
  async execute(interaction) {
    // Check if the user has permission to mute
    if (!canModerate(interaction.member)) {
      return interaction.reply({ 
        content: 'You do not have permission to use this command.',
        ephemeral: true 
      });
    }
    
    await interaction.deferReply();
    
    try {
      // Update command stats
      updateCommandStats(interaction.user.id, 'mute');
      
      // Get target user
      const targetUser = interaction.options.getUser('user');
      const durationString = interaction.options.getString('duration');
      const reason = interaction.options.getString('reason');
      
      // Parse duration
      const duration = parseDuration(durationString);
      if (!duration) {
        return interaction.editReply('Invalid duration format. Please use formats like 1h, 1d, 7d, etc.');
      }
      
      // Cannot mute bots
      if (targetUser.bot) {
        return interaction.editReply('You cannot mute bot users.');
      }
      
      // Cannot mute yourself
      if (targetUser.id === interaction.user.id) {
        return interaction.editReply('You cannot mute yourself.');
      }
      
      // Check if target is moderator
      const targetMember = interaction.guild.members.cache.get(targetUser.id) || 
        await interaction.guild.members.fetch(targetUser.id).catch(() => null);
        
      if (!targetMember) {
        return interaction.editReply('User not found in this server.');
      }
      
      if (canModerate(targetMember)) {
        return interaction.editReply('You cannot mute other moderators.');
      }
      
      // Get mute role ID from settings
      const { autoMuteRole } = getModerationSettings();
      
      // Check if mute role is set up
      if (!autoMuteRole) {
        return interaction.editReply('Mute role is not set up. Please use the /modsettings command to set it up.');
      }
      
      // Try to add mute role
      try {
        await targetMember.roles.add(autoMuteRole);
      } catch (error) {
        console.error('Error adding mute role:', error);
        return interaction.editReply('Failed to add mute role. Please check my permissions and role hierarchy.');
      }
      
      // Create mute infraction
      const infraction = await createInfraction(
        targetUser.id,
        'mute',
        reason,
        interaction.user.id,
        duration,
        interaction.client
      );
      
      // Format duration for response
      const durationText = formatDuration(duration);
      
      interaction.editReply(`Successfully muted ${targetUser.tag} for ${durationText}. Reason: ${reason}`);
    } catch (error) {
      console.error('Error executing mute command:', error);
      interaction.editReply('There was an error executing the mute command.');
    }
  },
};

/**
 * Parse duration string into milliseconds
 * @param {string} durationString - Duration string (e.g. 1h, 1d, 7d)
 * @returns {number|null} Duration in milliseconds or null if invalid
 */
function parseDuration(durationString) {
  const regex = /^(\d+)([smhdw])$/;
  const match = durationString.match(regex);
  
  if (!match) return null;
  
  const value = parseInt(match[1], 10);
  const unit = match[2];
  
  if (value <= 0) return null;
  
  // Convert to milliseconds
  switch (unit) {
    case 's': return value * 1000; // seconds
    case 'm': return value * 60 * 1000; // minutes
    case 'h': return value * 60 * 60 * 1000; // hours
    case 'd': return value * 24 * 60 * 60 * 1000; // days
    case 'w': return value * 7 * 24 * 60 * 60 * 1000; // weeks
    default: return null;
  }
}

/**
 * Format duration in milliseconds to human-readable string
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
  if (days < 7) {
    return `${days} day${days === 1 ? '' : 's'}`;
  }
  
  const weeks = Math.floor(days / 7);
  return `${weeks} week${weeks === 1 ? '' : 's'}`;
} 