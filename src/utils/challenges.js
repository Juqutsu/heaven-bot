/**
 * Challenge generation and tracking utilities
 * @module challenges
 */

const { getActiveChallenges, createChallenge, updateChallengeProgress, getUserChallengeProgress } = require('./database');
const logger = require('./logger');

/**
 * Generate daily challenges
 * @returns {Promise<Array>} Created challenge IDs
 */
async function generateDailyChallenges() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const startDate = Math.floor(today.getTime() / 1000);
  const endDate = Math.floor(tomorrow.getTime() / 1000);
  
  const challenges = [
    {
      type: 'daily',
      name: 'Daily Chatter',
      description: 'Send 50 messages today',
      requirementType: 'messages',
      requirementValue: 50,
      rewardXp: 100,
      startDate,
      endDate
    },
    {
      type: 'daily',
      name: 'Voice Enthusiast',
      description: 'Spend 30 minutes in voice today',
      requirementType: 'voice_minutes',
      requirementValue: 30,
      rewardXp: 150,
      startDate,
      endDate
    },
    {
      type: 'daily',
      name: 'XP Collector',
      description: 'Gain 500 XP today',
      requirementType: 'xp',
      requirementValue: 500,
      rewardXp: 200,
      startDate,
      endDate
    }
  ];
  
  const challengeIds = [];
  for (const challenge of challenges) {
    try {
      const challengeId = await createChallenge(challenge);
      challengeIds.push(challengeId);
    } catch (error) {
      logger.error('Error creating daily challenge:', error);
    }
  }
  
  return challengeIds;
}

/**
 * Generate weekly challenges
 * @returns {Promise<Array>} Created challenge IDs
 */
async function generateWeeklyChallenges() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Get Monday of current week
  const dayOfWeek = today.getDay();
  const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
  const monday = new Date(today.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  
  const nextMonday = new Date(monday);
  nextMonday.setDate(nextMonday.getDate() + 7);
  
  const startDate = Math.floor(monday.getTime() / 1000);
  const endDate = Math.floor(nextMonday.getTime() / 1000);
  
  const challenges = [
    {
      type: 'weekly',
      name: 'Weekly Warrior',
      description: 'Send 500 messages this week',
      requirementType: 'messages',
      requirementValue: 500,
      rewardXp: 1000,
      startDate,
      endDate
    },
    {
      type: 'weekly',
      name: 'Voice Champion',
      description: 'Spend 5 hours in voice this week',
      requirementType: 'voice_minutes',
      requirementValue: 300,
      rewardXp: 1500,
      startDate,
      endDate
    },
    {
      type: 'weekly',
      name: 'XP Master',
      description: 'Gain 5000 XP this week',
      requirementType: 'xp',
      requirementValue: 5000,
      rewardXp: 2000,
      startDate,
      endDate
    }
  ];
  
  const challengeIds = [];
  for (const challenge of challenges) {
    try {
      const challengeId = await createChallenge(challenge);
      challengeIds.push(challengeId);
    } catch (error) {
      logger.error('Error creating weekly challenge:', error);
    }
  }
  
  return challengeIds;
}

/**
 * Update challenge progress for user based on activity
 * @param {string} userId - User ID
 * @param {string} activityType - Activity type ('messages', 'voice_minutes', 'xp')
 * @param {number} amount - Amount of activity
 * @returns {Promise<Array>} Completed challenges
 */
async function updateChallengesForActivity(userId, activityType, amount) {
  const activeChallenges = await getActiveChallenges();
  const completed = [];
  
  for (const challenge of activeChallenges) {
    if (challenge.requirementType !== activityType) continue;
    
    const progress = await getUserChallengeProgress(userId, challenge.challengeId);
    
    // Skip if already completed
    if (progress.completed) continue;
    
    const newProgress = progress.progress + amount;
    const wasCompleted = await updateChallengeProgress(userId, challenge.challengeId, newProgress);
    
    // Check if just completed (wasCompleted is true if challenge was completed)
    if (wasCompleted) {
      completed.push(challenge);
    }
  }
  
  return completed;
}

/**
 * Get user challenges with progress
 * @param {string} userId - User ID
 * @returns {Promise<Array>} User challenges with progress
 */
async function getUserChallenges(userId) {
  const activeChallenges = await getActiveChallenges();
  const userChallenges = [];
  
  for (const challenge of activeChallenges) {
    const progress = await getUserChallengeProgress(userId, challenge.challengeId);
    userChallenges.push({
      ...challenge,
      progress: progress.progress,
      completed: progress.completed,
      completedAt: progress.completedAt
    });
  }
  
  return userChallenges;
}

module.exports = {
  generateDailyChallenges,
  generateWeeklyChallenges,
  updateChallengesForActivity,
  getUserChallenges
};

