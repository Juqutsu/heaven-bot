const { getUserData, saveUserData, calculateRequiredXp, calculateLevel, getRankSettings, getPrestigeSettings, getUserStatistics } = require('./database');
const { createCanvas, loadImage } = require('canvas');
const { roundedRect } = require('./rankCard');
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
  const { getUserRankCardSettings } = require('./database');
  const { mergeWithDefaults } = require('./rankCardDefaults');
  
  // Get custom rank card settings
  const cardSettingsData = await getUserRankCardSettings(member.id);
  
  // Merge user settings with defaults
  const settings = mergeWithDefaults(cardSettingsData.settings || {});
  
  // Override with prestige color if no custom primary color is set
  if (!settings.primaryColor && userData.prestige > 0) {
    const prestige = prestigeSettings.prestiges[userData.prestige];
    if (prestige) {
      settings.primaryColor = prestige.color;
    }
  }
  
  // Calculate XP progress more explicitly
  const totalXp = userData.xp;
  const currentLevel = userData.level;
  
  // Special handling for level 1
  const currentLevelXp = currentLevel === 1 ? 0 : await calculateRequiredXp(currentLevel);
  const nextLevelXp = await calculateRequiredXp(currentLevel + 1);
  
  // Calculate XP needed for current level
  const xpForThisLevel = totalXp - currentLevelXp;
  const xpNeededForNextLevel = nextLevelXp - currentLevelXp;
  
  // Calculate progress percentage
  let progressPercent = 0;
  if (xpNeededForNextLevel > 0) {
    progressPercent = (xpForThisLevel / xpNeededForNextLevel) * 100;
    progressPercent = Math.max(0, Math.min(100, progressPercent));
  }
  
  // Get prestige info
  const prestige = userData.prestige > 0 ? prestigeSettings.prestiges[userData.prestige] : null;
  
  // Determine canvas dimensions based on orientation
  const isVertical = settings.orientation === 'vertical';
  const width = isVertical ? 280 : 1000;
  const height = isVertical ? 1000 : 280;
  
  // Set up canvas
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  
  // Draw background
  if (settings.backgroundStyle === 'gradient') {
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, settings.backgroundColor || '#1F2937');
    // Add alpha to primary color for gradient end
    const primaryColorWithAlpha = (settings.primaryColor || '#5865F2') + '66'; // 40% opacity
    gradient.addColorStop(1, primaryColorWithAlpha);
    ctx.fillStyle = gradient;
  } else {
    ctx.fillStyle = settings.backgroundColor || '#1F2937';
  }
  roundedRect(ctx, 0, 0, width, height, 16);
  ctx.fill();
  
  // Draw accent bar
  ctx.fillStyle = settings.primaryColor || '#5865F2';
  ctx.globalAlpha = settings.accentBarOpacity || 0.15;
  if (settings.accentBarPosition === 'left') {
    roundedRect(ctx, 0, 0, settings.accentBarWidth, height, [16, 0, 0, 16]);
  } else if (settings.accentBarPosition === 'right') {
    roundedRect(ctx, width - settings.accentBarWidth, 0, settings.accentBarWidth, height, [0, 16, 16, 0]);
  } else if (settings.accentBarPosition === 'top') {
    roundedRect(ctx, 0, 0, width, settings.accentBarWidth, [16, 16, 0, 0]);
  } else {
    roundedRect(ctx, 0, height - settings.accentBarWidth, width, settings.accentBarWidth, [0, 0, 16, 16]);
  }
  ctx.fill();
  ctx.globalAlpha = 1;
  
  // Apply shadow if enabled
  if (settings.shadowEnabled) {
    ctx.shadowBlur = settings.shadowBlur;
    ctx.shadowOffsetX = settings.shadowOffsetX;
    ctx.shadowOffsetY = settings.shadowOffsetY;
    ctx.shadowColor = settings.shadowColor;
  }
  
  // Draw avatar
  if (settings.showAvatar) {
    try {
      const avatar = await loadImage(member.user.displayAvatarURL({ extension: 'png', size: 512 }));
      const avatarX = settings.avatar.x;
      const avatarY = settings.avatar.y;
      const avatarSize = settings.avatarSize;
      
      ctx.save();
      ctx.beginPath();
      ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(avatar, avatarX, avatarY, avatarSize, avatarSize);
      ctx.restore();
      
      // Avatar border
      if (settings.avatarBorderWidth > 0) {
        ctx.strokeStyle = settings.avatarBorderColor;
        ctx.lineWidth = settings.avatarBorderWidth;
        ctx.beginPath();
        ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
        ctx.closePath();
        ctx.stroke();
      }
    } catch (error) {
      // Error loading avatar - continue without avatar
    }
  }
  
  // Reset shadow for text
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
  
  // Draw username
  if (settings.showUsername) {
    ctx.font = `600 ${settings.usernameFontSize}px Arial`;
    ctx.textAlign = settings.usernameAlign;
    ctx.fillStyle = settings.usernameColor;
    let displayName = member.user.username;
    if (displayName.length > 18) {
      displayName = displayName.substring(0, 18) + '...';
    }
    const usernameX = settings.usernameAlign === 'center' ? width / 2 : 
                      settings.usernameAlign === 'right' ? width - settings.username.x : 
                      settings.username.x;
    ctx.fillText(displayName, usernameX, settings.username.y);
  }
  
  // Draw prestige badge
  if (settings.showPrestige && prestige) {
    ctx.font = `${settings.prestigeFontSize}px Arial`;
    ctx.textAlign = settings.prestigeAlign;
    ctx.fillStyle = settings.prestigeColor;
    const prestigeX = settings.prestigeAlign === 'center' ? width / 2 : 
                      settings.prestigeAlign === 'right' ? width - settings.prestige.x : 
                      settings.prestige.x;
    ctx.fillText(`★ ${prestige.name}`, prestigeX, settings.prestige.y);
  }
  
  // Draw level indicator
  if (settings.showLevel) {
    // Level label
    ctx.font = `500 ${settings.levelLabelFontSize}px Arial`;
    ctx.textAlign = settings.levelAlign;
    ctx.fillStyle = '#9CA3AF';
    const levelX = settings.levelAlign === 'center' ? width / 2 : 
                   settings.levelAlign === 'right' ? width - settings.level.x : 
                   settings.level.x;
    ctx.fillText('LEVEL', levelX, settings.level.y - 8);
    
    // Level number
    ctx.font = `600 ${settings.levelFontSize}px Arial`;
    ctx.fillStyle = settings.levelColor;
    ctx.fillText(`${userData.level}`, levelX, settings.level.y + 28);
  }
  
  // Draw XP info
  if (settings.showXpInfo) {
    ctx.font = `500 ${settings.xpFontSize}px Arial`;
    ctx.textAlign = settings.xpAlign;
    ctx.fillStyle = settings.xpTextColor;
    const xpX = settings.xpAlign === 'center' ? width / 2 : 
                 settings.xpAlign === 'right' ? width - settings.xpInfo.x : 
                 settings.xpInfo.x;
    ctx.fillText(`${totalXp.toLocaleString()} / ${nextLevelXp.toLocaleString()} XP`, xpX, settings.xpInfo.y);
  }
  
  // Draw progress bar
  if (settings.showProgressBar) {
    const barX = settings.progressBar.x;
    const barY = settings.progressBar.y;
    const barWidth = settings.progressBarWidth;
    const barHeight = settings.progressBarHeight;
    const cornerRadius = settings.progressBarStyle === 'rounded' ? barHeight / 2 : 0;
    
    // Bar background
    roundedRect(ctx, barX, barY, barWidth, barHeight, cornerRadius);
    ctx.fillStyle = settings.progressBarBgColor;
    ctx.fill();
    
    // Progress fill
    const progressWidth = Math.max(1, (progressPercent / 100) * barWidth);
    if (progressWidth > 0) {
      if (settings.progressBarStyle === 'gradient') {
        const gradient = ctx.createLinearGradient(barX, 0, barX + barWidth, 0);
        gradient.addColorStop(0, settings.progressBarFillColor || '#5865F2');
        gradient.addColorStop(1, settings.primaryColor || '#5865F2');
        ctx.fillStyle = gradient;
      } else {
        ctx.fillStyle = settings.progressBarFillColor || '#5865F2';
      }
      
      const topLeft = cornerRadius;
      const bottomLeft = cornerRadius;
      const topRight = progressWidth >= barWidth ? cornerRadius : 0;
      const bottomRight = progressWidth >= barWidth ? cornerRadius : 0;
      roundedRect(ctx, barX, barY, progressWidth, barHeight, [topLeft, topRight, bottomRight, bottomLeft]);
      ctx.fill();
    }
    
    // Percentage text
    if (settings.showProgressText) {
      ctx.font = `500 ${settings.progressBarTextFontSize}px Arial`;
      ctx.textAlign = settings.progressTextAlign;
      ctx.fillStyle = settings.progressBarTextColor;
      const textX = settings.progressTextAlign === 'center' ? barX + barWidth / 2 : 
                    settings.progressTextAlign === 'right' ? barX + barWidth - 8 : 
                    barX + 8;
      ctx.fillText(`${progressPercent.toFixed(1)}%`, textX, barY + barHeight - 6);
    }
  }
  
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