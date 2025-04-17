const { getUserData, saveUserData, calculateRequiredXp, calculateLevel, getRankSettings, getPrestigeSettings } = require('./database');
const { createCanvas, loadImage, registerFont } = require('canvas');
const path = require('node:path');
const fs = require('node:fs');

/**
 * Award XP to a user for sending a message
 * @param {string} userId - User ID
 * @param {Object} client - Discord client
 * @returns {Object|null} Level up information if user leveled up, null otherwise
 */
async function awardMessageXp(userId, client) {
  const userData = getUserData(userId);
  const rankSettings = getRankSettings();
  
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
    const prestigeSettings = getPrestigeSettings();
    const currentPrestige = prestigeSettings.prestiges[userData.prestige];
    if (currentPrestige) {
      xpToAdd = Math.floor(xpToAdd * (1 + currentPrestige.xpBoost));
    }
  }
  
  // Update user data
  const oldLevel = userData.level;
  userData.xp += xpToAdd;
  userData.totalTextXp += xpToAdd;
  userData.lastMessageTimestamp = now;
  
  // Recalculate level
  userData.level = calculateLevel(userData.xp);
  
  // Check for level up
  const leveledUp = userData.level > oldLevel;
  
  // Save updated user data
  saveUserData(userId, userData);
  
  if (leveledUp) {
    return {
      oldLevel,
      newLevel: userData.level,
      xp: userData.xp,
      requiredXp: calculateRequiredXp(userData.level + 1)
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
 * @returns {Object|null} Level up information if user leveled up, null otherwise
 */
async function updateVoiceXp(userId, minutesInVoice, isAFK, client) {
  const userData = getUserData(userId);
  const rankSettings = getRankSettings();
  
  // Skip if AFK and AFK is disabled
  if (isAFK && rankSettings.voiceXp.afkDisabled) {
    return null;
  }
  
  // Calculate XP to award
  let xpToAdd = minutesInVoice * rankSettings.voiceXp.perMinute;
  
  // Apply prestige bonus if applicable
  if (userData.prestige > 0) {
    const prestigeSettings = getPrestigeSettings();
    const currentPrestige = prestigeSettings.prestiges[userData.prestige];
    if (currentPrestige) {
      xpToAdd = Math.floor(xpToAdd * (1 + currentPrestige.xpBoost));
    }
  }
  
  // Update user data
  const oldLevel = userData.level;
  userData.xp += xpToAdd;
  userData.totalVoiceXp += xpToAdd;
  
  // Recalculate level
  userData.level = calculateLevel(userData.xp);
  
  // Check for level up
  const leveledUp = userData.level > oldLevel;
  
  // Save updated user data
  saveUserData(userId, userData);
  
  if (leveledUp) {
    return {
      oldLevel,
      newLevel: userData.level,
      xp: userData.xp,
      requiredXp: calculateRequiredXp(userData.level + 1)
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
  const rankSettings = getRankSettings();
  
  // Levels to check (current and all previous levels)
  const levelsToCheck = Array.from({ length: newLevel }, (_, i) => i + 1);
  
  // Roles to add
  const rolesToAdd = [];
  
  // Check role rewards
  for (const level of levelsToCheck) {
    const roleId = rankSettings.roles[level];
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
      console.error('Error adding role rewards:', error);
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
  const userData = getUserData(member.id);
  const prestigeSettings = getPrestigeSettings();
  
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
  saveUserData(member.id, userData);
  
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
      console.error('Error updating prestige roles:', error);
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
  const userData = getUserData(member.id);
  const rankSettings = getRankSettings();
  const prestigeSettings = getPrestigeSettings();
  
  // Calculate XP progress more explicitly
  const totalXp = userData.xp;
  const currentLevel = userData.level;
  
  // Special handling for level 1
  // Level 1 users start at 0 XP, not at the XP required for level 1
  const currentLevelXp = currentLevel === 1 ? 0 : calculateRequiredXp(currentLevel);
  const nextLevelXp = calculateRequiredXp(currentLevel + 1);
  
  // Calculate XP needed for current level
  const xpForThisLevel = totalXp - currentLevelXp;
  const xpNeededForNextLevel = nextLevelXp - currentLevelXp;
  
  // Calculate progress percentage (make sure to handle edge cases)
  let progressPercent = 0;
  if (xpNeededForNextLevel > 0) {
    progressPercent = (xpForThisLevel / xpNeededForNextLevel) * 100;
    progressPercent = Math.max(0, Math.min(100, progressPercent));
  }
  
  // Define color scheme
  const primaryColor = userData.prestige > 0 
    ? prestigeSettings.prestiges[userData.prestige].color 
    : '#5865F2';
  const secondaryColor = '#FFFFFF';
  const bgColor = '#2C2F33';
  const darkAccentColor = '#1E2124';
  const lightAccentColor = '#40444B';
  
  // Set up canvas with better dimensions for modern look
  const canvas = createCanvas(1100, 380);
  const ctx = canvas.getContext('2d');
  
  // Draw modern rounded rectangle background
  ctx.fillStyle = bgColor;
  roundedRect(ctx, 0, 0, canvas.width, canvas.height, 20);
  ctx.fill();
  
  // Add subtle gradient overlay for depth
  const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0.2)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Add accent decorations
  ctx.fillStyle = darkAccentColor;
  ctx.fillRect(0, 0, 15, canvas.height);
  ctx.fillStyle = primaryColor;
  ctx.fillRect(15, 0, 10, canvas.height);
  
  // Add decorative corner effect
  ctx.fillStyle = primaryColor;
  ctx.globalAlpha = 0.2;
  ctx.beginPath();
  ctx.moveTo(canvas.width, 0);
  ctx.lineTo(canvas.width - 250, 0);
  ctx.lineTo(canvas.width, 150);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;
  
  // Draw avatar with shadow
  try {
    const avatarSize = 200;
    const avatarX = 100;
    const avatarY = 90;
    const avatar = await loadImage(member.user.displayAvatarURL({ extension: 'png', size: 512 }));
    
    // Draw shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
    ctx.shadowBlur = 15;
    ctx.shadowOffsetX = 5;
    ctx.shadowOffsetY = 5;
    
    // Draw circle avatar background
    ctx.beginPath();
    ctx.arc(avatarX + avatarSize/2, avatarY + avatarSize/2, avatarSize/2 + 10, 0, Math.PI * 2, true);
    ctx.fillStyle = darkAccentColor;
    ctx.fill();
    ctx.closePath();
    
    // Clear shadow for actual avatar
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    
    // Draw circle avatar
    ctx.save();
    ctx.beginPath();
    ctx.arc(avatarX + avatarSize/2, avatarY + avatarSize/2, avatarSize/2, 0, Math.PI * 2, true);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(avatar, avatarX, avatarY, avatarSize, avatarSize);
    ctx.restore();
    
    // Draw avatar border
    ctx.strokeStyle = primaryColor;
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(avatarX + avatarSize/2, avatarY + avatarSize/2, avatarSize/2 + 4, 0, Math.PI * 2, true);
    ctx.closePath();
    ctx.stroke();
  } catch (error) {
    console.error('Error loading avatar:', error);
  }
  
  // Draw username with text shadow
  ctx.font = 'bold 48px Arial';
  ctx.textAlign = 'left';
  ctx.fillStyle = secondaryColor;
  ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
  ctx.shadowBlur = 5;
  ctx.shadowOffsetX = 2;
  ctx.shadowOffsetY = 2;
  
  // Get username and truncate if too long
  let username = member.user.username;
  if (username.length > 15) {
    username = username.substring(0, 15) + '...';
  }
  
  ctx.fillText(username, 350, 130);
  
  // Clear shadow for remaining text
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
  
  // Show prestige badge if applicable
  if (userData.prestige > 0) {
    const prestige = prestigeSettings.prestiges[userData.prestige];
    ctx.font = 'bold 26px Arial';
    ctx.fillStyle = primaryColor;
    
    // Draw badge
    ctx.beginPath();
    const badgeX = 350;
    const badgeY = 150;
    const badgeWidth = ctx.measureText(`★ ${prestige.name} Prestige`).width + 20;
    const badgeHeight = 35;
    
    roundedRect(ctx, badgeX, badgeY, badgeWidth, badgeHeight, 10);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fill();
    
    // Draw star and text
    ctx.fillStyle = primaryColor;
    ctx.fillText(`★ ${prestige.name} Prestige`, badgeX + 10, badgeY + 25);
  }
  
  // Level display with stylish indicator
  const levelDisplayX = 800;
  const levelDisplayY = 125;
  const levelCircleRadius = 45;
  
  // Draw level circle background
  ctx.beginPath();
  ctx.arc(levelDisplayX, levelDisplayY, levelCircleRadius, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.fill();
  
  // Draw level circle border
  ctx.lineWidth = 5;
  ctx.strokeStyle = primaryColor;
  ctx.stroke();
  
  // Draw "LEVEL" label
  ctx.font = 'bold 16px Arial';
  ctx.textAlign = 'center';
  ctx.fillStyle = secondaryColor;
  ctx.fillText('LEVEL', levelDisplayX, levelDisplayY - 15);
  
  // Draw level text - properly centered in the circle
  ctx.font = 'bold 30px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = secondaryColor;
  ctx.fillText(`${userData.level}`, levelDisplayX, levelDisplayY + 5);
  ctx.textBaseline = 'alphabetic'; // Reset to default
  
  // XP Info section
  ctx.textAlign = 'left';
  ctx.font = '24px Arial';
  ctx.fillStyle = '#B9BBBE';
  ctx.fillText('XP:', 350, 235);
  
  // Current XP display
  ctx.font = 'bold 24px Arial';
  ctx.fillStyle = secondaryColor;
  ctx.fillText(`${totalXp.toLocaleString()} / ${nextLevelXp.toLocaleString()}`, 400, 235);
  
  // XP Needed display
  ctx.font = '20px Arial';
  ctx.fillStyle = '#B9BBBE';
  ctx.fillText(`${(nextLevelXp - totalXp).toLocaleString()} XP needed for next level`, 350, 270);
  
  // Progress bar
  const barWidth = 730;
  const barHeight = 30;
  const barX = 350;
  const barY = 290;
  const cornerRadius = barHeight/2;
  
  // Bar background with rounded corners
  ctx.beginPath();
  roundedRect(ctx, barX, barY, barWidth, barHeight, cornerRadius);
  ctx.fillStyle = lightAccentColor;
  ctx.fill();
  
  // Only draw progress if there is actual progress
  const progressWidth = Math.max(1, (progressPercent / 100) * barWidth);
  
  if (progressWidth > 0) {
    ctx.beginPath();
    
    // Define corner radii explicitly
    const topLeft = cornerRadius;
    const bottomLeft = cornerRadius;
    const topRight = progressWidth >= barWidth ? cornerRadius : 0;
    const bottomRight = progressWidth >= barWidth ? cornerRadius : 0;
    
    // Draw progress bar with appropriate corners rounded
    roundedRect(ctx, barX, barY, progressWidth, barHeight, [topLeft, topRight, bottomRight, bottomLeft]);
    
    // Progress gradient
    const progressGradient = ctx.createLinearGradient(barX, barY, barX + progressWidth, barY);
    progressGradient.addColorStop(0, primaryColor);
    progressGradient.addColorStop(1, shadeColor(primaryColor, 20));
    ctx.fillStyle = progressGradient;
    ctx.fill();
    
    // Add sparkle effect to progress bar
    ctx.globalAlpha = 0.2;
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.rect(barX, barY, progressWidth, barHeight/2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  
  // Percentage display
  ctx.font = 'bold 18px Arial';
  ctx.textAlign = 'right';
  ctx.fillStyle = secondaryColor;
  ctx.fillText(`${progressPercent.toFixed(1)}%`, barX + barWidth - 10, barY + barHeight - 7);
  
  return canvas.toBuffer();
}

/**
 * Utility function to draw rounded rectangles
 * @param {Object} ctx - Canvas context
 * @param {number} x - X position
 * @param {number} y - Y position
 * @param {number} width - Rectangle width
 * @param {number} height - Rectangle height
 * @param {number|Array} radius - Corner radius or array of corner radii
 */
function roundedRect(ctx, x, y, width, height, radius) {
  if (typeof radius === 'number') {
    radius = {tl: radius, tr: radius, br: radius, bl: radius};
  } else if (Array.isArray(radius)) {
    // Handle array of radii [tl, tr, br, bl]
    radius = {tl: radius[0], tr: radius[1], br: radius[2], bl: radius[3]};
  } else {
    radius = {tl: 0, tr: 0, br: 0, bl: 0};
  }
  ctx.beginPath();
  ctx.moveTo(x + radius.tl, y);
  ctx.lineTo(x + width - radius.tr, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius.tr);
  ctx.lineTo(x + width, y + height - radius.br);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius.br, y + height);
  ctx.lineTo(x + radius.bl, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius.bl);
  ctx.lineTo(x, y + radius.tl);
  ctx.quadraticCurveTo(x, y, x + radius.tl, y);
  ctx.closePath();
}

/**
 * Utility function to lighten or darken a color
 * @param {string} color - Hex color
 * @param {number} percent - Percentage to lighten (positive) or darken (negative)
 * @returns {string} Modified color
 */
function shadeColor(color, percent) {
  let R = parseInt(color.substring(1, 3), 16);
  let G = parseInt(color.substring(3, 5), 16);
  let B = parseInt(color.substring(5, 7), 16);

  R = parseInt(R * (100 + percent) / 100);
  G = parseInt(G * (100 + percent) / 100);
  B = parseInt(B * (100 + percent) / 100);

  R = (R < 255) ? R : 255;
  G = (G < 255) ? G : 255;
  B = (B < 255) ? B : 255;

  const RR = ((R.toString(16).length === 1) ? '0' + R.toString(16) : R.toString(16));
  const GG = ((G.toString(16).length === 1) ? '0' + G.toString(16) : G.toString(16));
  const BB = ((B.toString(16).length === 1) ? '0' + B.toString(16) : B.toString(16));

  return '#' + RR + GG + BB;
}

/**
 * Get sorted leaderboard data
 * @param {number} limit - Maximum number of users to return
 * @returns {Array} Sorted leaderboard data
 */
function getLeaderboard(limit = 10) {
  const allUsers = require('./database').getAllUsers();
  
  const leaderboardData = Object.entries(allUsers).map(([userId, data]) => ({
    userId,
    xp: data.xp,
    level: data.level,
    prestige: data.prestige
  }));
  
  // Sort by prestige (highest first), then level, then XP
  return leaderboardData.sort((a, b) => {
    if (a.prestige !== b.prestige) return b.prestige - a.prestige;
    if (a.level !== b.level) return b.level - a.level;
    return b.xp - a.xp;
  }).slice(0, limit);
}

module.exports = {
  awardMessageXp,
  updateVoiceXp,
  checkRoleRewards,
  checkPrestige,
  generateRankCard,
  getLeaderboard
}; 