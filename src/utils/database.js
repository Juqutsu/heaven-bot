/**
 * Database utility functions using SQLite
 * @module database
 */

const Database = require('better-sqlite3');
const path = require('node:path');
const fs = require('node:fs').promises;
const { initializeSchema } = require('./db-schema');
const { userCache, settingsCache } = require('./cache');

// Database file path
const DB_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DB_DIR, 'heaven.db');

// Ensure data directory exists
async function ensureDataDirectory() {
  try {
    await fs.mkdir(DB_DIR, { recursive: true });
  } catch (error) {
    logger.error('Error creating data directory:', error);
    throw error;
  }
}

// Initialize database connection
let db = null;

/**
 * Get or create database instance
 * @returns {import('better-sqlite3').Database} Database instance
 */
function getDatabase() {
  if (!db) {
    // Ensure directory exists (sync for initial setup)
    if (!require('fs').existsSync(DB_DIR)) {
      require('fs').mkdirSync(DB_DIR, { recursive: true });
    }

    db = new Database(DB_FILE);
    
    // Enable WAL mode for better concurrency
    db.pragma('journal_mode = WAL');
    
    // Initialize schema
    initializeSchema(db);
  }
  return db;
}

/**
 * Close database connection
 */
function closeDatabase() {
  if (db) {
    db.close();
    db = null;
  }
}

/**
 * Get rank settings
 * @returns {Promise<Object>} Rank settings
 */
async function getRankSettings() {
  // Check cache first
  const cacheKey = 'rank_settings';
  const cached = settingsCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const database = getDatabase();
  const rows = database.prepare('SELECT key, value FROM rank_settings').all();
  
  const settings = {};
  for (const row of rows) {
    try {
      settings[row.key] = JSON.parse(row.value);
    } catch (error) {
      logger.error(`Error parsing setting ${row.key}:`, error);
      settings[row.key] = row.value;
    }
  }
  
  // Ensure all required settings exist
  if (!settings.textXp) settings.textXp = { baseAmount: 15, cooldown: 60, randomBonus: 5 };
  if (!settings.voiceXp) settings.voiceXp = { perMinute: 10, afkDisabled: true };
  if (!settings.formula) settings.formula = { baseXp: 100, exponent: 1.5 };
  
  // Cache for 10 minutes
  settingsCache.set(cacheKey, settings, 10 * 60 * 1000);
  
  return settings;
}

/**
 * Save rank settings
 * @param {Object} settings - Rank settings to save
 */
async function saveRankSettings(settings) {
  const database = getDatabase();
  const insert = database.prepare('INSERT OR REPLACE INTO rank_settings (key, value, updated_at) VALUES (?, ?, strftime("%s", "now"))');
  const insertMany = database.transaction((settingsObj) => {
    for (const [key, value] of Object.entries(settingsObj)) {
      insert.run(key, JSON.stringify(value));
    }
  });
  insertMany(settings);
  
  // Invalidate cache
  settingsCache.delete('rank_settings');
}

/**
 * Get prestige settings
 * @returns {Promise<Object>} Prestige settings with prestiges object
 */
async function getPrestigeSettings() {
  // Check cache first
  const cacheKey = 'prestige_settings';
  const cached = settingsCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const database = getDatabase();
  const rows = database.prepare('SELECT * FROM prestiges ORDER BY prestige_level').all();
  
  const prestiges = {};
  for (const row of rows) {
    prestiges[row.prestige_level] = {
      name: row.name,
      requiredLevel: row.required_level,
      color: row.color,
      roleId: row.role_id,
      xpBoost: row.xp_boost
    };
  }
  
  const result = { prestiges };
  
  // Cache for 10 minutes
  settingsCache.set(cacheKey, result, 10 * 60 * 1000);
  
  return result;
}

/**
 * Save prestige settings
 * @param {Object} settings - Prestige settings to save
 */
async function savePrestigeSettings(settings) {
  const database = getDatabase();
  const insert = database.prepare(`
    INSERT OR REPLACE INTO prestiges 
    (prestige_level, name, required_level, color, role_id, xp_boost, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, strftime('%s', 'now'))
  `);
  const insertMany = database.transaction((prestiges) => {
    for (const [level, config] of Object.entries(prestiges)) {
      insert.run(
        parseInt(level),
        config.name,
        config.requiredLevel,
        config.color,
        config.roleId,
        config.xpBoost
      );
    }
  });
  insertMany(settings.prestiges);
  
  // Invalidate cache
  settingsCache.delete('prestige_settings');
}

/**
 * Get user data
 * @param {string} userId - User ID
 * @returns {Promise<Object>} User data
 */
async function getUserData(userId) {
  // Check cache first
  const cacheKey = `user_${userId}`;
  const cached = userCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const database = getDatabase();
  let user = database.prepare('SELECT * FROM users WHERE user_id = ?').get(userId);
  
  if (!user) {
    // Create default user data
    const insert = database.prepare(`
      INSERT INTO users (user_id, xp, level, prestige, last_message_timestamp, voice_join_timestamp, total_text_xp, total_voice_xp)
      VALUES (?, 0, 1, 0, 0, 0, 0, 0)
    `);
    insert.run(userId);
    user = database.prepare('SELECT * FROM users WHERE user_id = ?').get(userId);
  }
  
  const userData = {
    xp: user.xp,
    level: user.level,
    prestige: user.prestige,
    lastMessageTimestamp: user.last_message_timestamp,
    voiceJoinTimestamp: user.voice_join_timestamp,
    totalTextXp: user.total_text_xp,
    totalVoiceXp: user.total_voice_xp
  };
  
  // Cache for 5 minutes
  userCache.set(cacheKey, userData, 5 * 60 * 1000);
  
  return userData;
}

/**
 * Get all users data
 * @returns {Promise<Object>} All users data as object with userId keys
 */
async function getAllUsers() {
  const database = getDatabase();
  const rows = database.prepare('SELECT * FROM users').all();
  
  const users = {};
  for (const row of rows) {
    users[row.user_id] = {
      xp: row.xp,
      level: row.level,
      prestige: row.prestige,
      lastMessageTimestamp: row.last_message_timestamp,
      voiceJoinTimestamp: row.voice_join_timestamp,
      totalTextXp: row.total_text_xp,
      totalVoiceXp: row.total_voice_xp
    };
  }
  
  return users;
}

/**
 * Save user data
 * @param {string} userId - User ID
 * @param {Object} userData - User data to save
 */
async function saveUserData(userId, userData) {
  const database = getDatabase();
  const update = database.prepare(`
    INSERT INTO users (user_id, xp, level, prestige, last_message_timestamp, voice_join_timestamp, total_text_xp, total_voice_xp, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, strftime('%s', 'now'))
    ON CONFLICT(user_id) DO UPDATE SET
      xp = excluded.xp,
      level = excluded.level,
      prestige = excluded.prestige,
      last_message_timestamp = excluded.last_message_timestamp,
      voice_join_timestamp = excluded.voice_join_timestamp,
      total_text_xp = excluded.total_text_xp,
      total_voice_xp = excluded.total_voice_xp,
      updated_at = strftime('%s', 'now')
  `);
  
  update.run(
    userId,
    userData.xp || 0,
    userData.level || 1,
    userData.prestige || 0,
    userData.lastMessageTimestamp || 0,
    userData.voiceJoinTimestamp || 0,
    userData.totalTextXp || 0,
    userData.totalVoiceXp || 0
  );
  
  // Update cache with new data
  const cacheKey = `user_${userId}`;
  userCache.set(cacheKey, userData, 5 * 60 * 1000);
}

/**
 * Get user statistics
 * @param {string} userId - User ID
 * @returns {Promise<Object>} User statistics
 */
async function getUserStatistics(userId) {
  const database = getDatabase();
  const rows = database.prepare(`
    SELECT stat_type, period_type, period_key, value 
    FROM statistics 
    WHERE user_id = ?
  `).all(userId);
  
  const stats = {
    messages: {
      total: 0,
      daily: {},
      weekly: {},
      monthly: {}
    },
    voice: {
      totalMinutes: 0,
      daily: {},
      weekly: {},
      monthly: {}
    },
    commands: {
      total: 0,
      types: {}
    }
  };
  
  for (const row of rows) {
    if (row.period_type === 'total') {
      if (row.stat_type === 'messages') {
        stats.messages.total = row.value;
      } else if (row.stat_type === 'voice') {
        stats.voice.totalMinutes = row.value;
      } else if (row.stat_type === 'commands') {
        stats.commands.total = row.value;
      }
    } else if (row.period_type === 'daily') {
      stats[row.stat_type].daily[row.period_key] = row.value;
    } else if (row.period_type === 'weekly') {
      stats[row.stat_type].weekly[row.period_key] = row.value;
    } else if (row.period_type === 'monthly') {
      stats[row.stat_type].monthly[row.period_key] = row.value;
    } else if (row.stat_type === 'commands' && row.period_type === 'type') {
      stats.commands.types[row.period_key] = row.value;
    }
  }
  
  return stats;
}

/**
 * Save user statistics
 * @param {string} userId - User ID
 * @param {Object} statistics - User statistics to save
 */
async function saveUserStatistics(userId, statistics) {
  const database = getDatabase();
  const insert = database.prepare(`
    INSERT OR REPLACE INTO statistics (user_id, stat_type, period_type, period_key, value, updated_at)
    VALUES (?, ?, ?, ?, ?, strftime('%s', 'now'))
  `);
  
  const insertMany = database.transaction((userId, stats) => {
    // Messages
    insert.run(userId, 'messages', 'total', 'total', stats.messages.total || 0);
    for (const [key, value] of Object.entries(stats.messages.daily || {})) {
      insert.run(userId, 'messages', 'daily', key, value);
    }
    for (const [key, value] of Object.entries(stats.messages.weekly || {})) {
      insert.run(userId, 'messages', 'weekly', key, value);
    }
    for (const [key, value] of Object.entries(stats.messages.monthly || {})) {
      insert.run(userId, 'messages', 'monthly', key, value);
    }
    
    // Voice
    insert.run(userId, 'voice', 'total', 'total', stats.voice.totalMinutes || 0);
    for (const [key, value] of Object.entries(stats.voice.daily || {})) {
      insert.run(userId, 'voice', 'daily', key, value);
    }
    for (const [key, value] of Object.entries(stats.voice.weekly || {})) {
      insert.run(userId, 'voice', 'weekly', key, value);
    }
    for (const [key, value] of Object.entries(stats.voice.monthly || {})) {
      insert.run(userId, 'voice', 'monthly', key, value);
    }
    
    // Commands
    insert.run(userId, 'commands', 'total', 'total', stats.commands.total || 0);
    for (const [key, value] of Object.entries(stats.commands.types || {})) {
      insert.run(userId, 'commands', 'type', key, value);
    }
  });
  
  insertMany(userId, statistics);
}

/**
 * Calculate XP required for a specific level
 * @param {number} level - Target level
 * @returns {Promise<number>} XP required
 */
async function calculateRequiredXp(level) {
  if (level < 1) level = 1;
  
  const settings = await getRankSettings();
  const requiredXp = Math.floor(settings.formula.baseXp * Math.pow(level, settings.formula.exponent));
  
  return requiredXp;
}

/**
 * Calculate level based on XP
 * @param {number} xp - Current XP
 * @returns {Promise<number>} Current level
 */
async function calculateLevel(xp) {
  if (xp < 0) xp = 0;
  
  const settings = await getRankSettings();
  let level = 1;
  
  while (xp >= await calculateRequiredXp(level)) {
    level++;
  }
  
  return level - 1 || 1;
}

/**
 * Initialize database (create directory and schema)
 */
async function initializeDatabase() {
  await ensureDataDirectory();
  getDatabase(); // This will initialize the schema
}

// ========== ACHIEVEMENTS ==========

/**
 * Get all achievements
 * @returns {Promise<Array>} All achievements
 */
async function getAllAchievements() {
  const database = getDatabase();
  const rows = database.prepare('SELECT * FROM achievements ORDER BY type, requirement_value').all();
  return rows.map(row => ({
    achievementId: row.achievement_id,
    name: row.name,
    description: row.description,
    icon: row.icon,
    type: row.type,
    requirementValue: row.requirement_value,
    rewardXp: row.reward_xp
  }));
}

/**
 * Get user achievements
 * @param {string} userId - User ID
 * @returns {Promise<Array>} User achievements
 */
async function getUserAchievements(userId) {
  const database = getDatabase();
  const rows = database.prepare(`
    SELECT a.*, ua.unlocked_at
    FROM achievements a
    INNER JOIN user_achievements ua ON a.achievement_id = ua.achievement_id
    WHERE ua.user_id = ?
    ORDER BY ua.unlocked_at DESC
  `).all(userId);
  return rows.map(row => ({
    achievementId: row.achievement_id,
    name: row.name,
    description: row.description,
    icon: row.icon,
    type: row.type,
    requirementValue: row.requirement_value,
    rewardXp: row.reward_xp,
    unlockedAt: row.unlocked_at
  }));
}

/**
 * Check if user has achievement
 * @param {string} userId - User ID
 * @param {string} achievementId - Achievement ID
 * @returns {Promise<boolean>} Whether user has achievement
 */
async function hasAchievement(userId, achievementId) {
  const database = getDatabase();
  const row = database.prepare('SELECT 1 FROM user_achievements WHERE user_id = ? AND achievement_id = ?').get(userId, achievementId);
  return !!row;
}

/**
 * Unlock achievement for user
 * @param {string} userId - User ID
 * @param {string} achievementId - Achievement ID
 * @returns {Promise<Object|null>} Achievement data if unlocked, null if already unlocked
 */
async function unlockAchievement(userId, achievementId) {
  const database = getDatabase();
  
  // Check if already unlocked
  if (await hasAchievement(userId, achievementId)) {
    return null;
  }
  
  // Get achievement data
  const achievement = database.prepare('SELECT * FROM achievements WHERE achievement_id = ?').get(achievementId);
  if (!achievement) {
    return null;
  }
  
  // Unlock achievement
  database.prepare('INSERT INTO user_achievements (user_id, achievement_id) VALUES (?, ?)').run(userId, achievementId);
  
  // Award XP if applicable
  if (achievement.reward_xp > 0) {
    const userData = await getUserData(userId);
    userData.xp += achievement.reward_xp;
    await saveUserData(userId, userData);
  }
  
  return {
    achievementId: achievement.achievement_id,
    name: achievement.name,
    description: achievement.description,
    icon: achievement.icon,
    rewardXp: achievement.reward_xp
  };
}

// ========== CHALLENGES ==========

/**
 * Get active challenges
 * @param {string} type - Challenge type ('daily' or 'weekly')
 * @returns {Promise<Array>} Active challenges
 */
async function getActiveChallenges(type = null) {
  const database = getDatabase();
  const now = Math.floor(Date.now() / 1000);
  let query = 'SELECT * FROM challenges WHERE start_date <= ? AND end_date >= ?';
  const params = [now, now];
  
  if (type) {
    query += ' AND type = ?';
    params.push(type);
  }
  
  query += ' ORDER BY type, start_date';
  
  const rows = database.prepare(query).all(...params);
  return rows.map(row => ({
    challengeId: row.challenge_id,
    type: row.type,
    name: row.name,
    description: row.description,
    requirementType: row.requirement_type,
    requirementValue: row.requirement_value,
    rewardXp: row.reward_xp,
    startDate: row.start_date,
    endDate: row.end_date
  }));
}

/**
 * Get user challenge progress
 * @param {string} userId - User ID
 * @param {string} challengeId - Challenge ID
 * @returns {Promise<Object|null>} Challenge progress
 */
async function getUserChallengeProgress(userId, challengeId) {
  const database = getDatabase();
  const row = database.prepare('SELECT * FROM user_challenges WHERE user_id = ? AND challenge_id = ?').get(userId, challengeId);
  
  if (!row) {
    // Initialize progress
    database.prepare('INSERT INTO user_challenges (user_id, challenge_id, progress, completed) VALUES (?, ?, 0, 0)').run(userId, challengeId);
    return {
      userId,
      challengeId,
      progress: 0,
      completed: false,
      completedAt: null
    };
  }
  
  return {
    userId,
    challengeId,
    progress: row.progress,
    completed: row.completed === 1,
    completedAt: row.completed_at
  };
}

/**
 * Update user challenge progress
 * @param {string} userId - User ID
 * @param {string} challengeId - Challenge ID
 * @param {number} progress - Progress value
 * @returns {Promise<boolean>} Whether challenge was completed
 */
async function updateChallengeProgress(userId, challengeId, progress) {
  const database = getDatabase();
  
  // Get challenge
  const challenge = database.prepare('SELECT * FROM challenges WHERE challenge_id = ?').get(challengeId);
  if (!challenge) return false;
  
  // Update progress
  database.prepare(`
    INSERT INTO user_challenges (user_id, challenge_id, progress, completed)
    VALUES (?, ?, ?, 0)
    ON CONFLICT(user_id, challenge_id) DO UPDATE SET
      progress = excluded.progress,
      completed = CASE WHEN excluded.progress >= ? THEN 1 ELSE completed END,
      completed_at = CASE WHEN excluded.progress >= ? AND completed = 0 THEN strftime('%s', 'now') ELSE completed_at END
  `).run(userId, challengeId, progress, challenge.requirement_value, challenge.requirement_value);
  
  // Check if completed
  const userChallenge = database.prepare('SELECT * FROM user_challenges WHERE user_id = ? AND challenge_id = ?').get(userId, challengeId);
  const wasCompleted = userChallenge.completed === 1;
  
  // Award XP if just completed
  if (wasCompleted && userChallenge.completed_at && challenge.reward_xp > 0) {
    const userData = await getUserData(userId);
    userData.xp += challenge.reward_xp;
    await saveUserData(userId, userData);
  }
  
  return wasCompleted;
}

/**
 * Create challenge
 * @param {Object} challenge - Challenge data
 * @returns {Promise<string>} Challenge ID
 */
async function createChallenge(challenge) {
  const database = getDatabase();
  const challengeId = challenge.challengeId || `challenge_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  database.prepare(`
    INSERT INTO challenges (challenge_id, type, name, description, requirement_type, requirement_value, reward_xp, start_date, end_date)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    challengeId,
    challenge.type,
    challenge.name,
    challenge.description,
    challenge.requirementType,
    challenge.requirementValue,
    challenge.rewardXp || 0,
    challenge.startDate,
    challenge.endDate
  );
  
  return challengeId;
}

// ========== STREAKS ==========

/**
 * Get user streak
 * @param {string} userId - User ID
 * @returns {Promise<Object>} User streak data
 */
async function getUserStreak(userId) {
  const database = getDatabase();
  let row = database.prepare('SELECT * FROM user_streaks WHERE user_id = ?').get(userId);
  
  if (!row) {
    // Initialize streak
    database.prepare('INSERT INTO user_streaks (user_id, current_streak, longest_streak, last_activity_date) VALUES (?, 0, 0, NULL)').run(userId);
    return {
      userId,
      currentStreak: 0,
      longestStreak: 0,
      lastActivityDate: null,
      streakBonusMultiplier: 0
    };
  }
  
  return {
    userId,
    currentStreak: row.current_streak,
    longestStreak: row.longest_streak,
    lastActivityDate: row.last_activity_date,
    streakBonusMultiplier: row.streak_bonus_multiplier
  };
}

/**
 * Update user streak
 * @param {string} userId - User ID
 * @param {string} activityDate - Activity date (YYYY-MM-DD)
 * @returns {Promise<Object>} Updated streak data
 */
async function updateUserStreak(userId, activityDate) {
  const database = getDatabase();
  const streak = await getUserStreak(userId);
  
  let currentStreak = streak.currentStreak;
  let longestStreak = streak.longestStreak;
  
  if (streak.lastActivityDate === activityDate) {
    // Already counted today
    return streak;
  }
  
  // Check if consecutive day
  if (streak.lastActivityDate) {
    const lastDate = new Date(streak.lastActivityDate);
    const today = new Date(activityDate);
    const daysDiff = Math.floor((today - lastDate) / (1000 * 60 * 60 * 24));
    
    if (daysDiff === 1) {
      // Consecutive day
      currentStreak += 1;
    } else if (daysDiff > 1) {
      // Streak broken
      currentStreak = 1;
    }
    // daysDiff === 0 means same day, already handled above
  } else {
    // First activity
    currentStreak = 1;
  }
  
  // Update longest streak
  if (currentStreak > longestStreak) {
    longestStreak = currentStreak;
  }
  
  // Calculate streak bonus (1% per 7 days, max 10%)
  const streakBonus = Math.min(0.1, Math.floor(currentStreak / 7) * 0.01);
  
  // Update database
  database.prepare(`
    UPDATE user_streaks
    SET current_streak = ?,
        longest_streak = ?,
        last_activity_date = ?,
        streak_bonus_multiplier = ?,
        updated_at = strftime('%s', 'now')
    WHERE user_id = ?
  `).run(currentStreak, longestStreak, activityDate, streakBonus, userId);
  
  return {
    userId,
    currentStreak,
    longestStreak,
    lastActivityDate: activityDate,
    streakBonusMultiplier: streakBonus
  };
}

// ========== XP MULTIPLIERS ==========

/**
 * Get active XP multipliers for user
 * @param {string} userId - User ID
 * @param {Array<string>} roleIds - User role IDs
 * @returns {Promise<Array>} Active multipliers
 */
async function getActiveMultipliers(userId, roleIds = []) {
  const database = getDatabase();
  const now = Math.floor(Date.now() / 1000);
  
  // Get global multipliers
  const globalMultipliers = database.prepare(`
    SELECT * FROM xp_multipliers
    WHERE scope = 'global' AND start_time <= ? AND end_time >= ?
  `).all(now, now);
  
  // Get user-specific multipliers
  const userMultipliers = database.prepare(`
    SELECT * FROM xp_multipliers
    WHERE scope = 'user' AND scope_id = ? AND start_time <= ? AND end_time >= ?
  `).all(userId, now, now);
  
  // Get role-specific multipliers
  let roleMultipliers = [];
  if (roleIds.length > 0) {
    const placeholders = roleIds.map(() => '?').join(',');
    roleMultipliers = database.prepare(`
      SELECT * FROM xp_multipliers
      WHERE scope = 'role' AND scope_id IN (${placeholders}) AND start_time <= ? AND end_time >= ?
    `).all(...roleIds, now, now);
  }
  
  const allMultipliers = [...globalMultipliers, ...userMultipliers, ...roleMultipliers];
  
  return allMultipliers.map(row => ({
    multiplierId: row.multiplier_id,
    name: row.name,
    description: row.description,
    multiplierValue: row.multiplier_value,
    startTime: row.start_time,
    endTime: row.end_time,
    scope: row.scope,
    scopeId: row.scope_id
  }));
}

/**
 * Create XP multiplier
 * @param {Object} multiplier - Multiplier data
 * @returns {Promise<string>} Multiplier ID
 */
async function createMultiplier(multiplier) {
  const database = getDatabase();
  const multiplierId = multiplier.multiplierId || `mult_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  database.prepare(`
    INSERT INTO xp_multipliers (multiplier_id, name, description, multiplier_value, start_time, end_time, scope, scope_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    multiplierId,
    multiplier.name,
    multiplier.description || null,
    multiplier.multiplierValue,
    multiplier.startTime,
    multiplier.endTime,
    multiplier.scope,
    multiplier.scopeId || null
  );
  
  return multiplierId;
}

/**
 * Remove XP multiplier
 * @param {string} multiplierId - Multiplier ID
 */
async function removeMultiplier(multiplierId) {
  const database = getDatabase();
  database.prepare('DELETE FROM xp_multipliers WHERE multiplier_id = ?').run(multiplierId);
}

/**
 * Get all multipliers
 * @returns {Promise<Array>} All multipliers
 */
async function getAllMultipliers() {
  const database = getDatabase();
  const rows = database.prepare('SELECT * FROM xp_multipliers ORDER BY start_time DESC').all();
  return rows.map(row => ({
    multiplierId: row.multiplier_id,
    name: row.name,
    description: row.description,
    multiplierValue: row.multiplier_value,
    startTime: row.start_time,
    endTime: row.end_time,
    scope: row.scope,
    scopeId: row.scope_id
  }));
}

// ========== RANK CARD SETTINGS ==========

/**
 * Get user rank card settings
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Rank card settings
 */
async function getUserRankCardSettings(userId) {
  const database = getDatabase();
  const row = database.prepare('SELECT * FROM user_rank_card_settings WHERE user_id = ?').get(userId);
  
  if (!row) {
    return {
      userId,
      primaryColor: null,
      backgroundColor: null
    };
  }
  
  return {
    userId,
    primaryColor: row.primary_color,
    backgroundColor: row.background_color
  };
}

/**
 * Save user rank card settings
 * @param {string} userId - User ID
 * @param {Object} settings - Rank card settings
 */
async function saveUserRankCardSettings(userId, settings) {
  const database = getDatabase();
  database.prepare(`
    INSERT INTO user_rank_card_settings (user_id, primary_color, background_color, updated_at)
    VALUES (?, ?, ?, strftime('%s', 'now'))
    ON CONFLICT(user_id) DO UPDATE SET
      primary_color = excluded.primary_color,
      background_color = excluded.background_color,
      updated_at = strftime('%s', 'now')
  `).run(userId, settings.primaryColor || null, settings.backgroundColor || null);
}

// ========== NOTIFICATION SETTINGS ==========

/**
 * Get user notification settings
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Notification settings
 */
async function getUserNotificationSettings(userId) {
  const database = getDatabase();
  const row = database.prepare('SELECT * FROM notification_settings WHERE user_id = ?').get(userId);
  
  if (!row) {
    return {
      userId,
      levelUpDm: false,
      achievementDm: false,
      challengeCompleteDm: false
    };
  }
  
  return {
    userId,
    levelUpDm: row.level_up_dm === 1,
    achievementDm: row.achievement_dm === 1,
    challengeCompleteDm: row.challenge_complete_dm === 1
  };
}

/**
 * Save user notification settings
 * @param {string} userId - User ID
 * @param {Object} settings - Notification settings
 */
async function saveUserNotificationSettings(userId, settings) {
  const database = getDatabase();
  database.prepare(`
    INSERT INTO notification_settings (user_id, level_up_dm, achievement_dm, challenge_complete_dm, updated_at)
    VALUES (?, ?, ?, ?, strftime('%s', 'now'))
    ON CONFLICT(user_id) DO UPDATE SET
      level_up_dm = excluded.level_up_dm,
      achievement_dm = excluded.achievement_dm,
      challenge_complete_dm = excluded.challenge_complete_dm,
      updated_at = strftime('%s', 'now')
  `).run(
    userId,
    settings.levelUpDm ? 1 : 0,
    settings.achievementDm ? 1 : 0,
    settings.challengeCompleteDm ? 1 : 0
  );
}

module.exports = {
  getDatabase,
  closeDatabase,
  initializeDatabase,
  getRankSettings,
  saveRankSettings,
  getPrestigeSettings,
  savePrestigeSettings,
  getUserData,
  getAllUsers,
  saveUserData,
  getUserStatistics,
  saveUserStatistics,
  calculateRequiredXp,
  calculateLevel,
  // Achievements
  getAllAchievements,
  getUserAchievements,
  hasAchievement,
  unlockAchievement,
  // Challenges
  getActiveChallenges,
  getUserChallengeProgress,
  updateChallengeProgress,
  createChallenge,
  // Streaks
  getUserStreak,
  updateUserStreak,
  // Multipliers
  getActiveMultipliers,
  createMultiplier,
  removeMultiplier,
  getAllMultipliers,
  // Rank card settings
  getUserRankCardSettings,
  saveUserRankCardSettings,
  // Notification settings
  getUserNotificationSettings,
  saveUserNotificationSettings
};
