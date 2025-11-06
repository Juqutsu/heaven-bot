/**
 * XP multiplier system utilities
 * @module multipliers
 */

const { getActiveMultipliers } = require('./database');

/**
 * Calculate total XP multiplier for user
 * @param {string} userId - User ID
 * @param {Array<string>} roleIds - User role IDs
 * @returns {Promise<number>} Total multiplier (e.g., 1.5 for 50% boost)
 */
async function getTotalMultiplier(userId, roleIds = []) {
  const multipliers = await getActiveMultipliers(userId, roleIds);
  
  if (multipliers.length === 0) {
    return 1.0;
  }
  
  // Combine multipliers multiplicatively
  let totalMultiplier = 1.0;
  for (const multiplier of multipliers) {
    totalMultiplier *= multiplier.multiplierValue;
  }
  
  return totalMultiplier;
}

/**
 * Apply multiplier to XP amount
 * @param {number} baseXp - Base XP amount
 * @param {number} multiplier - Multiplier value
 * @returns {number} Adjusted XP amount
 */
function applyMultiplier(baseXp, multiplier) {
  return Math.floor(baseXp * multiplier);
}

/**
 * Format multiplier for display
 * @param {number} multiplier - Multiplier value
 * @returns {string} Formatted multiplier string
 */
function formatMultiplier(multiplier) {
  if (multiplier === 1.0) {
    return 'No multiplier';
  }
  
  const percentage = Math.round((multiplier - 1.0) * 100);
  return `${percentage > 0 ? '+' : ''}${percentage}% XP`;
}

module.exports = {
  getTotalMultiplier,
  applyMultiplier,
  formatMultiplier
};

