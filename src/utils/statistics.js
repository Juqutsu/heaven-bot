const { getUserStatistics, saveUserStatistics } = require('./database');

/**
 * Update message statistics for a user
 * @param {string} userId - User ID
 */
function updateMessageStats(userId) {
  const stats = getUserStatistics(userId);
  const date = new Date();
  
  // Increment total messages
  stats.messages.total++;
  
  // Update daily stats
  const day = formatDate(date);
  stats.messages.daily[day] = (stats.messages.daily[day] || 0) + 1;
  
  // Update weekly stats
  const week = getISOWeek(date);
  stats.messages.weekly[week] = (stats.messages.weekly[week] || 0) + 1;
  
  // Update monthly stats
  const month = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
  stats.messages.monthly[month] = (stats.messages.monthly[month] || 0) + 1;
  
  // Prune old stats
  pruneOldStats(stats.messages);
  
  // Save updated statistics
  saveUserStatistics(userId, stats);
}

/**
 * Update voice statistics for a user
 * @param {string} userId - User ID
 * @param {number} minutes - Minutes to add
 */
function updateVoiceStats(userId, minutes) {
  const stats = getUserStatistics(userId);
  const date = new Date();
  
  // Increment total voice minutes
  stats.voice.totalMinutes += minutes;
  
  // Update daily stats
  const day = formatDate(date);
  stats.voice.daily[day] = (stats.voice.daily[day] || 0) + minutes;
  
  // Update weekly stats
  const week = getISOWeek(date);
  stats.voice.weekly[week] = (stats.voice.weekly[week] || 0) + minutes;
  
  // Update monthly stats
  const month = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
  stats.voice.monthly[month] = (stats.voice.monthly[month] || 0) + minutes;
  
  // Prune old stats
  pruneOldStats(stats.voice);
  
  // Save updated statistics
  saveUserStatistics(userId, stats);
}

/**
 * Update command usage statistics for a user
 * @param {string} userId - User ID
 * @param {string} commandName - Name of the command used
 */
function updateCommandStats(userId, commandName) {
  const stats = getUserStatistics(userId);
  
  // Increment total commands
  stats.commands.total++;
  
  // Update command type stats
  stats.commands.types[commandName] = (stats.commands.types[commandName] || 0) + 1;
  
  // Save updated statistics
  saveUserStatistics(userId, stats);
}

/**
 * Get recent statistics for a user
 * @param {string} userId - User ID
 * @param {number} days - Number of days to look back
 * @returns {Object} Recent statistics
 */
function getRecentStats(userId, days = 7) {
  const stats = getUserStatistics(userId);
  const date = new Date();
  const result = {
    messages: {
      total: 0,
      daily: {}
    },
    voice: {
      totalMinutes: 0,
      daily: {}
    }
  };
  
  // Get dates to check
  const datesToCheck = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(date);
    d.setDate(d.getDate() - i);
    datesToCheck.push(formatDate(d));
  }
  
  // Compile message stats
  for (const day of datesToCheck) {
    const count = stats.messages.daily[day] || 0;
    result.messages.daily[day] = count;
    result.messages.total += count;
  }
  
  // Compile voice stats
  for (const day of datesToCheck) {
    const minutes = stats.voice.daily[day] || 0;
    result.voice.daily[day] = minutes;
    result.voice.totalMinutes += minutes;
  }
  
  return result;
}

/**
 * Format a date as YYYY-MM-DD
 * @param {Date} date - Date to format
 * @returns {string} Formatted date
 */
function formatDate(date) {
  return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
}

/**
 * Get ISO week number (YYYY-Www)
 * @param {Date} date - Date to get week for
 * @returns {string} ISO week string
 */
function getISOWeek(date) {
  const dt = new Date(date);
  dt.setHours(0, 0, 0, 0);
  dt.setDate(dt.getDate() + 3 - (dt.getDay() + 6) % 7);
  const week = Math.floor((dt.getTime() - new Date(dt.getFullYear(), 0, 4).getTime()) / 86400000 / 7) + 1;
  return `${dt.getFullYear()}-W${week.toString().padStart(2, '0')}`;
}

/**
 * Prune old statistics
 * @param {Object} statObject - Statistics object to prune
 */
function pruneOldStats(statObject) {
  const now = new Date();
  
  // Keep only last 30 days of daily stats
  if (statObject.daily) {
    const cutoffDay = new Date(now);
    cutoffDay.setDate(cutoffDay.getDate() - 30);
    const cutoffDayString = formatDate(cutoffDay);
    
    for (const day in statObject.daily) {
      if (day < cutoffDayString) {
        delete statObject.daily[day];
      }
    }
  }
  
  // Keep only last 12 weeks of weekly stats
  if (statObject.weekly) {
    const cutoffDate = new Date(now);
    cutoffDate.setDate(cutoffDate.getDate() - 84); // 12 weeks * 7 days
    const cutoffWeek = getISOWeek(cutoffDate);
    
    for (const week in statObject.weekly) {
      if (week < cutoffWeek) {
        delete statObject.weekly[week];
      }
    }
  }
  
  // Keep only last 12 months of monthly stats
  if (statObject.monthly) {
    const cutoffDate = new Date(now);
    cutoffDate.setMonth(cutoffDate.getMonth() - 12);
    const cutoffMonth = `${cutoffDate.getFullYear()}-${(cutoffDate.getMonth() + 1).toString().padStart(2, '0')}`;
    
    for (const month in statObject.monthly) {
      if (month < cutoffMonth) {
        delete statObject.monthly[month];
      }
    }
  }
}

module.exports = {
  updateMessageStats,
  updateVoiceStats,
  updateCommandStats,
  getRecentStats
}; 