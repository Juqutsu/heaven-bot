const { getUserData, saveUserData, calculateRequiredXp, calculateLevel, getRankSettings, getPrestigeSettings, getUserStatistics } = require('./database');
const { createCanvas } = require('canvas');
const {
  drawBackground,
  drawAvatar,
  drawUsername,
  drawLevelIndicator,
  drawXpInfo,
  drawProgressBar
} = require('./rankCard');
const { getTotalMultiplier, applyMultiplier } = require('./multipliers');
const { updateStreakForActivity } = require('./streaks');
const { checkAchievements } = require('./achievements');
const { updateChallengesForActivity } = require('./challenges');
const logger = require('./logger');

/**
 * Award XP to a user for sending a message
 * @param {string} userId - User ID
 * @param {Object} client - Discord client
 * @param {Object} member - Discord guild member (optional, for multipliers)
 * @returns {Object|null} Level up information if user leveled up, null otherwise
 */
async function awardMessageXp(userId, client, member = null) {
  const userData = await getUserData(userId);
  const rankSettings = await getRankSettings();
  
  // Check if cooldown has passed
  const now = Date.now();
  const cooldownMs = rankSettings.textXp.cooldown * 1000;
  
  if (now - userData.lastMessageTimestamp < cooldownMs) {
    return null; // Cooldown hasn't passed yet
  }
  
  // Calculate XP to award
  const baseXP = rankSettings.textXp.baseAmount;
  const randomBonus = Math.floor(Math.random() * (rankSettings.textXp.randomBonus + 1));
  
  // Apply prestige bonus if applicable
  let xpToAdd = baseXP + randomBonus;
  if (userData.prestige > 0) {
    const prestigeSettings = await getPrestigeSettings();
    const currentPrestige = prestigeSettings.prestiges[userData.prestige];
    if (currentPrestige) {
      xpToAdd = Math.floor(xpToAdd * (1 + currentPrestige.xpBoost));
    }
  }
  
  // Apply streak bonus
  const { getUserStreak } = require('./database');
  const streak = await getUserStreak(userId);
  if (streak.streakBonusMultiplier > 0) {
    xpToAdd = Math.floor(xpToAdd * (1 + streak.streakBonusMultiplier));
  }
  
  // Apply XP multipliers
  if (member) {
    const roleIds = member.roles.cache.map(r => r.id);
    const multiplier = await getTotalMultiplier(userId, roleIds);
    if (multiplier > 1.0) {
      xpToAdd = applyMultiplier(xpToAdd, multiplier);
    }
  }
  
  // Update user data
  const oldLevel = userData.level;
  userData.xp += xpToAdd;
  userData.totalTextXp += xpToAdd;
  userData.lastMessageTimestamp = now;
  
  // Recalculate level
  userData.level = await calculateLevel(userData.xp);
  
  // Check for level up
  const leveledUp = userData.level > oldLevel;
  
  // Save updated user data
  await saveUserData(userId, userData);
  
  // Update streak
  try {
    await updateStreakForActivity(userId);
  } catch (error) {
    logger.error('Error updating streak:', error);
  }
  
  // Update challenge progress
  try {
    const stats = await getUserStatistics(userId);
    const messageCount = stats.messages.total || 0;
    await updateChallengesForActivity(userId, 'messages', 1);
  } catch (error) {
    logger.error('Error updating challenge progress:', error);
  }
  
  // Check achievements
  try {
    const stats = await getUserStatistics(userId);
    const unlockedAchievements = await checkAchievements(userId, {
      messages: stats.messages.total || 0,
      voice: Math.floor((stats.voice.totalMinutes || 0) / 60),
      level: userData.level,
      streak: (await getUserStreak(userId)).currentStreak
    });
    
    if (unlockedAchievements.length > 0) {
      // Return achievements in level up info if any
      if (leveledUp) {
        return {
          oldLevel,
          newLevel: userData.level,
          xp: userData.xp,
          requiredXp: await calculateRequiredXp(userData.level + 1),
          achievements: unlockedAchievements
        };
      }
    }
  } catch (error) {
    logger.error('Error checking achievements:', error);
  }
  
  if (leveledUp) {
    return {
      oldLevel,
      newLevel: userData.level,
      xp: userData.xp,
      requiredXp: await calculateRequiredXp(userData.level + 1)
    };
  }
  
  return null;
}

/**
 * Update voice XP for a user
 * @param {string} userId - User ID
 * @param {number} minutesInVoice - Minutes spent in voice chat
 * @param {boolean} isAFK - Whether the user is AFK
 * @param {Object} client - Discord client
 * @param {Object} member - Discord guild member (optional, for multipliers)
 * @returns {Object|null} Level up information if user leveled up, null otherwise
 */
async function updateVoiceXp(userId, minutesInVoice, isAFK, client, member = null) {
  const userData = await getUserData(userId);
  const rankSettings = await getRankSettings();
  
  // Skip if AFK and AFK is disabled
  if (isAFK && rankSettings.voiceXp.afkDisabled) {
    return null;
  }
  
  // Calculate XP to award
  let xpToAdd = minutesInVoice * rankSettings.voiceXp.perMinute;
  
  // Apply prestige bonus if applicable
  if (userData.prestige > 0) {
    const prestigeSettings = await getPrestigeSettings();
    const currentPrestige = prestigeSettings.prestiges[userData.prestige];
    if (currentPrestige) {
      xpToAdd = Math.floor(xpToAdd * (1 + currentPrestige.xpBoost));
    }
  }
  
  // Apply streak bonus
  const { getUserStreak } = require('./database');
  const streak = await getUserStreak(userId);
  if (streak.streakBonusMultiplier > 0) {
    xpToAdd = Math.floor(xpToAdd * (1 + streak.streakBonusMultiplier));
  }
  
  // Apply XP multipliers
  if (member) {
    const roleIds = member.roles.cache.map(r => r.id);
    const multiplier = await getTotalMultiplier(userId, roleIds);
    if (multiplier > 1.0) {
      xpToAdd = applyMultiplier(xpToAdd, multiplier);
    }
  }
  
  // Update user data
  const oldLevel = userData.level;
  userData.xp += xpToAdd;
  userData.totalVoiceXp += xpToAdd;
  
  // Recalculate level
  userData.level = await calculateLevel(userData.xp);
  
  // Check for level up
  const leveledUp = userData.level > oldLevel;
  
  // Save updated user data
  await saveUserData(userId, userData);
  
  // Update streak
  try {
    await updateStreakForActivity(userId);
  } catch (error) {
    logger.error('Error updating streak:', error);
  }
  
  // Update challenge progress
  try {
    await updateChallengesForActivity(userId, 'voice_minutes', minutesInVoice);
  } catch (error) {
    logger.error('Error updating challenge progress:', error);
  }
  
  // Check achievements
  try {
    const stats = await getUserStatistics(userId);
    const unlockedAchievements = await checkAchievements(userId, {
      messages: stats.messages.total || 0,
      voice: Math.floor((stats.voice.totalMinutes || 0) / 60),
      level: userData.level,
      streak: (await getUserStreak(userId)).currentStreak
    });
    
    if (unlockedAchievements.length > 0) {
      // Return achievements in level up info if any
      if (leveledUp) {
        return {
          oldLevel,
          newLevel: userData.level,
          xp: userData.xp,
          requiredXp: await calculateRequiredXp(userData.level + 1),
          achievements: unlockedAchievements
        };
      }
    }
  } catch (error) {
    logger.error('Error checking achievements:', error);
  }
  
  if (leveledUp) {
    return {
      oldLevel,
      newLevel: userData.level,
      xp: userData.xp,
      requiredXp: await calculateRequiredXp(userData.level + 1)
    };
  }
  
  return null;
}

/**
 * Check and apply role rewards for a level up
 * @param {Object} member - Discord guild member
 * @param {number} newLevel - New level
 */
async function checkRoleRewards(member, newLevel) {
  const rankSettings = await getRankSettings();
  const database = require('./database').getDatabase();
  
  // Get role rewards from database
  const roleRows = database.prepare('SELECT level, role_id FROM ranks WHERE role_id IS NOT NULL').all();
  const roleRewards = {};
  for (const row of roleRows) {
    roleRewards[row.level] = row.role_id;
  }
  
  // Levels to check (current and all previous levels)
  const levelsToCheck = Array.from({ length: newLevel }, (_, i) => i + 1);
  
  // Roles to add
  const rolesToAdd = [];
  
  // Check role rewards
  for (const level of levelsToCheck) {
    const roleId = roleRewards[level];
    if (roleId && !member.roles.cache.has(roleId)) {
      rolesToAdd.push(roleId);
    }
  }
  
  // Add roles if needed
  if (rolesToAdd.length > 0) {
    try {
      await member.roles.add(rolesToAdd);
      return rolesToAdd;
    } catch (error) {
      logger.error('Error adding role rewards:', error);
      return [];
    }
  }
  
  return [];
}

/**
 * Check and apply prestige if eligible
 * @param {Object} member - Discord guild member
 * @param {number} level - Current level
 * @returns {Object|null} Prestige information if prestige was earned, null otherwise
 */
async function checkPrestige(member, level) {
  const userData = await getUserData(member.id);
  const prestigeSettings = await getPrestigeSettings();
  
  // Check if user is eligible for a higher prestige
  let highestEligiblePrestige = userData.prestige;
  
  for (const [prestigeLevel, config] of Object.entries(prestigeSettings.prestiges)) {
    const prestige = parseInt(prestigeLevel);
    if (level >= config.requiredLevel && prestige > highestEligiblePrestige) {
      highestEligiblePrestige = prestige;
    }
  }
  
  // No prestige change
  if (highestEligiblePrestige === userData.prestige) {
    return null;
  }
  
  // Update prestige
  const oldPrestige = userData.prestige;
  userData.prestige = highestEligiblePrestige;
  
  // Save updated user data
  await saveUserData(member.id, userData);
  
  // Add prestige role if defined
  const newPrestigeConfig = prestigeSettings.prestiges[highestEligiblePrestige];
  if (newPrestigeConfig.roleId) {
    try {
      // Remove old prestige roles
      const oldPrestigeRoles = Object.values(prestigeSettings.prestiges)
        .filter(p => p.roleId)
        .map(p => p.roleId);
      
      await member.roles.remove(oldPrestigeRoles);
      
      // Add new prestige role
      await member.roles.add(newPrestigeConfig.roleId);
    } catch (error) {
      logger.error('Error updating prestige roles:', error);
    }
  }
  
  return {
    oldPrestige,
    newPrestige: highestEligiblePrestige,
    prestigeName: newPrestigeConfig.name,
    color: newPrestigeConfig.color,
    xpBoost: newPrestigeConfig.xpBoost
  };
}

/**
 * Generate rank card image
 * @param {Object} member - Discord guild member
 * @returns {Buffer} Rank card image buffer
 */
async function generateRankCard(member) {
  // Load user data
  const userData = await getUserData(member.id);
  const rankSettings = await getRankSettings();
  const prestigeSettings = await getPrestigeSettings();
  const { getUserRankCardSettings, getUserStreak } = require('./database');
  
  // Get custom rank card settings
  const cardSettings = await getUserRankCardSettings(member.id);
  
  // Calculate XP progress more explicitly
  const totalXp = userData.xp;
  const currentLevel = userData.level;
  
  // Special handling for level 1
  // Level 1 users start at 0 XP, not at the XP required for level 1
  const currentLevelXp = currentLevel === 1 ? 0 : await calculateRequiredXp(currentLevel);
  const nextLevelXp = await calculateRequiredXp(currentLevel + 1);
  
  // Calculate XP needed for current level
  const xpForThisLevel = totalXp - currentLevelXp;
  const xpNeededForNextLevel = nextLevelXp - currentLevelXp;
  
  // Calculate progress percentage (make sure to handle edge cases)
  let progressPercent = 0;
  if (xpNeededForNextLevel > 0) {
    progressPercent = (xpForThisLevel / xpNeededForNextLevel) * 100;
    progressPercent = Math.max(0, Math.min(100, progressPercent));
  }
  
  // Define color scheme - use custom colors if set, otherwise use prestige/default
  const primaryColor = cardSettings.primaryColor || (userData.prestige > 0 
    ? prestigeSettings.prestiges[userData.prestige].color 
    : '#5865F2');
  const secondaryColor = '#FFFFFF';
  const bgColor = cardSettings.backgroundColor || '#1F2937';
  const darkAccentColor = '#111827';
  const lightAccentColor = '#374151';
  
  // Set up canvas with clean dimensions
  const canvas = createCanvas(1000, 280);
  const ctx = canvas.getContext('2d');
  
  // Draw background and decorations
  drawBackground(ctx, canvas.width, canvas.height, primaryColor, bgColor, darkAccentColor);
  
  // Draw avatar
  await drawAvatar(ctx, member, 40, 40, 200, primaryColor, darkAccentColor);
  
  // Draw username and prestige badge
  const prestige = userData.prestige > 0 ? prestigeSettings.prestiges[userData.prestige] : null;
  drawUsername(ctx, member.user.username, 280, 100, primaryColor, secondaryColor, prestige);
  
  // Draw level indicator
  drawLevelIndicator(ctx, userData.level, 960, 100, primaryColor, secondaryColor);
  
  // Draw XP information
  drawXpInfo(ctx, totalXp, nextLevelXp, 280, 140, secondaryColor);
  
  // Draw progress bar
  drawProgressBar(ctx, progressPercent, 280, 180, 680, 24, primaryColor, lightAccentColor, secondaryColor);
  
  return canvas.toBuffer();
}


/**
 * Get sorted leaderboard data
 * @param {number} limit - Maximum number of users to return
 * @returns {Promise<Array>} Sorted leaderboard data
 */
async function getLeaderboard(limit = 10) {
  const database = require('./database').getDatabase();
  
  // Use SQL query for better performance
  const rows = database.prepare(`
    SELECT user_id, xp, level, prestige 
    FROM users 
    ORDER BY prestige DESC, level DESC, xp DESC 
    LIMIT ?
  `).all(limit);
  
  return rows.map(row => ({
    userId: row.user_id,
    xp: row.xp,
    level: row.level,
    prestige: row.prestige
  }));
}

module.exports = {
  awardMessageXp,
  updateVoiceXp,
  checkRoleRewards,
  checkPrestige,
  generateRankCard,
  getLeaderboard
}; 