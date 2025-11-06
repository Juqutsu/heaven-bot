/**
 * Achievement checking and management utilities
 * @module achievements
 */

const { getAllAchievements, unlockAchievement, getUserAchievements } = require('./database');
const logger = require('./logger');

/**
 * Check and unlock achievements for a user based on their stats
 * @param {string} userId - User ID
 * @param {Object} stats - User stats (messages, voice, level, streak)
 * @returns {Promise<Array>} Newly unlocked achievements
 */
async function checkAchievements(userId, stats) {
  const achievements = await getAllAchievements();
  const unlocked = [];
  
  for (const achievement of achievements) {
    let shouldUnlock = false;
    
    switch (achievement.type) {
      case 'messages':
        if (stats.messages >= achievement.requirementValue) {
          shouldUnlock = true;
        }
        break;
      case 'voice':
        if (stats.voice >= achievement.requirementValue) {
          shouldUnlock = true;
        }
        break;
      case 'level':
        if (stats.level >= achievement.requirementValue) {
          shouldUnlock = true;
        }
        break;
      case 'streak':
        if (stats.streak >= achievement.requirementValue) {
          shouldUnlock = true;
        }
        break;
    }
    
    if (shouldUnlock) {
      const unlockedAchievement = await unlockAchievement(userId, achievement.achievementId);
      if (unlockedAchievement) {
        unlocked.push(unlockedAchievement);
      }
    }
  }
  
  return unlocked;
}

/**
 * Get user achievement progress
 * @param {string} userId - User ID
 * @param {Object} stats - User stats
 * @returns {Promise<Object>} Achievement progress with unlocked and locked achievements
 */
async function getUserAchievementProgress(userId, stats) {
  const allAchievements = await getAllAchievements();
  const userAchievements = await getUserAchievements(userId);
  const unlockedIds = new Set(userAchievements.map(a => a.achievementId));
  
  const unlocked = [];
  const locked = [];
  
  for (const achievement of allAchievements) {
    let progress = 0;
    let maxProgress = achievement.requirementValue;
    
    switch (achievement.type) {
      case 'messages':
        progress = stats.messages || 0;
        break;
      case 'voice':
        progress = stats.voice || 0;
        break;
      case 'level':
        progress = stats.level || 0;
        break;
      case 'streak':
        progress = stats.streak || 0;
        break;
    }
    
    const achievementData = {
      ...achievement,
      progress,
      maxProgress,
      unlocked: unlockedIds.has(achievement.achievementId)
    };
    
    if (achievementData.unlocked) {
      unlocked.push(achievementData);
    } else {
      locked.push(achievementData);
    }
  }
  
  return {
    unlocked: unlocked.sort((a, b) => b.unlockedAt - a.unlockedAt),
    locked: locked.sort((a, b) => a.requirementValue - b.requirementValue)
  };
}

module.exports = {
  checkAchievements,
  getUserAchievementProgress
};

