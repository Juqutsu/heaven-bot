/**
 * Streak calculation and management utilities
 * @module streaks
 */

const { getUserStreak, updateUserStreak } = require('./database');

/**
 * Format date as YYYY-MM-DD
 * @param {Date} date - Date to format
 * @returns {string} Formatted date
 */
function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Update streak for user activity
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Updated streak data
 */
async function updateStreakForActivity(userId) {
  const today = formatDate(new Date());
  return await updateUserStreak(userId, today);
}

/**
 * Get formatted streak display
 * @param {Object} streak - Streak data
 * @returns {string} Formatted streak string
 */
function formatStreak(streak) {
  if (streak.currentStreak === 0) {
    return 'No active streak';
  }
  
  const days = streak.currentStreak === 1 ? 'day' : 'days';
  return `${streak.currentStreak} ${days} 🔥`;
}

module.exports = {
  formatDate,
  updateStreakForActivity,
  formatStreak
};

