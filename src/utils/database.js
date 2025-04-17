const fs = require('node:fs');
const path = require('node:path');

// Database file paths
const DB_DIR = path.join(process.cwd(), 'data');
const RANKS_FILE = path.join(DB_DIR, 'ranks.json');
const USERS_FILE = path.join(DB_DIR, 'users.json');
const PRESTIGES_FILE = path.join(DB_DIR, 'prestiges.json');
const STATISTICS_FILE = path.join(DB_DIR, 'statistics.json');

// Ensure data directory exists
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

// Default database structures
const DEFAULT_RANKS = {
  roles: {}, // level -> role ID
  textXp: {
    baseAmount: 15,
    cooldown: 60, // seconds
    randomBonus: 5 // max random bonus
  },
  voiceXp: {
    perMinute: 10,
    afkDisabled: true
  },
  // Formula: xp needed for level n = baseXp * (level ^ exponent)
  formula: {
    baseXp: 100,
    exponent: 1.5
  }
};

const DEFAULT_PRESTIGES = {
  // Prestige level -> configuration
  prestiges: {
    1: {
      name: "Bronze",
      requiredLevel: 100,
      color: "#CD7F32",
      roleId: null,
      xpBoost: 0.05 // 5% boost
    },
    2: {
      name: "Silver",
      requiredLevel: 200,
      color: "#C0C0C0",
      roleId: null,
      xpBoost: 0.1 // 10% boost
    },
    3: {
      name: "Gold",
      requiredLevel: 300,
      color: "#FFD700",
      roleId: null,
      xpBoost: 0.15 // 15% boost
    },
    4: {
      name: "Platinum",
      requiredLevel: 400,
      color: "#E5E4E2",
      roleId: null,
      xpBoost: 0.2 // 20% boost
    },
    5: {
      name: "Diamond",
      requiredLevel: 500,
      color: "#B9F2FF",
      roleId: null,
      xpBoost: 0.25 // 25% boost
    }
  }
};

/**
 * Initialize database files with default values if they don't exist
 */
function initializeDatabase() {
  // Create ranks file if it doesn't exist
  if (!fs.existsSync(RANKS_FILE)) {
    fs.writeFileSync(RANKS_FILE, JSON.stringify(DEFAULT_RANKS, null, 2));
  }

  // Create users file if it doesn't exist
  if (!fs.existsSync(USERS_FILE)) {
    fs.writeFileSync(USERS_FILE, JSON.stringify({}, null, 2));
  }

  // Create prestiges file if it doesn't exist
  if (!fs.existsSync(PRESTIGES_FILE)) {
    fs.writeFileSync(PRESTIGES_FILE, JSON.stringify(DEFAULT_PRESTIGES, null, 2));
  }

  // Create statistics file if it doesn't exist
  if (!fs.existsSync(STATISTICS_FILE)) {
    fs.writeFileSync(STATISTICS_FILE, JSON.stringify({}, null, 2));
  }
}

/**
 * Get rank settings
 * @returns {Object} Rank settings
 */
function getRankSettings() {
  try {
    const data = fs.readFileSync(RANKS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading rank settings:', error);
    return DEFAULT_RANKS;
  }
}

/**
 * Save rank settings
 * @param {Object} settings - Rank settings to save
 */
function saveRankSettings(settings) {
  fs.writeFileSync(RANKS_FILE, JSON.stringify(settings, null, 2));
}

/**
 * Get prestige settings
 * @returns {Object} Prestige settings
 */
function getPrestigeSettings() {
  try {
    const data = fs.readFileSync(PRESTIGES_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading prestige settings:', error);
    return DEFAULT_PRESTIGES;
  }
}

/**
 * Save prestige settings
 * @param {Object} settings - Prestige settings to save
 */
function savePrestigeSettings(settings) {
  fs.writeFileSync(PRESTIGES_FILE, JSON.stringify(settings, null, 2));
}

/**
 * Get user data
 * @param {string} userId - User ID
 * @returns {Object} User data
 */
function getUserData(userId) {
  try {
    const data = fs.readFileSync(USERS_FILE, 'utf8');
    const users = JSON.parse(data);
    
    if (!users[userId]) {
      // Create default user data if it doesn't exist
      users[userId] = {
        xp: 0,
        level: 1,
        prestige: 0,
        lastMessageTimestamp: 0,
        voiceJoinTimestamp: 0,
        totalTextXp: 0,
        totalVoiceXp: 0
      };
      fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
    }
    
    return users[userId];
  } catch (error) {
    console.error('Error reading user data:', error);
    return {
      xp: 0,
      level: 1,
      prestige: 0,
      lastMessageTimestamp: 0,
      voiceJoinTimestamp: 0,
      totalTextXp: 0,
      totalVoiceXp: 0
    };
  }
}

/**
 * Get all users data
 * @returns {Object} All users data
 */
function getAllUsers() {
  try {
    const data = fs.readFileSync(USERS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading user data:', error);
    return {};
  }
}

/**
 * Save user data
 * @param {string} userId - User ID
 * @param {Object} userData - User data to save
 */
function saveUserData(userId, userData) {
  try {
    const data = fs.readFileSync(USERS_FILE, 'utf8');
    const users = JSON.parse(data);
    
    users[userId] = userData;
    
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
  } catch (error) {
    console.error('Error saving user data:', error);
  }
}

/**
 * Get user statistics
 * @param {string} userId - User ID
 * @returns {Object} User statistics
 */
function getUserStatistics(userId) {
  try {
    const data = fs.readFileSync(STATISTICS_FILE, 'utf8');
    const stats = JSON.parse(data);
    
    if (!stats[userId]) {
      // Create default statistics if they don't exist
      stats[userId] = {
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
      fs.writeFileSync(STATISTICS_FILE, JSON.stringify(stats, null, 2));
    }
    
    return stats[userId];
  } catch (error) {
    console.error('Error reading user statistics:', error);
    return {
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
  }
}

/**
 * Save user statistics
 * @param {string} userId - User ID
 * @param {Object} statistics - User statistics to save
 */
function saveUserStatistics(userId, statistics) {
  try {
    const data = fs.readFileSync(STATISTICS_FILE, 'utf8');
    const stats = JSON.parse(data);
    
    stats[userId] = statistics;
    
    fs.writeFileSync(STATISTICS_FILE, JSON.stringify(stats, null, 2));
  } catch (error) {
    console.error('Error saving user statistics:', error);
  }
}

/**
 * Calculate XP required for a specific level
 * @param {number} level - Target level
 * @returns {number} XP required
 */
function calculateRequiredXp(level) {
  if (level < 1) level = 1; // Ensure level is at least 1
  
  const settings = getRankSettings();
  const requiredXp = Math.floor(settings.formula.baseXp * Math.pow(level, settings.formula.exponent));
  
  return requiredXp;
}

/**
 * Calculate level based on XP
 * @param {number} xp - Current XP
 * @returns {number} Current level
 */
function calculateLevel(xp) {
  if (xp < 0) xp = 0; // Ensure XP is not negative
  
  const settings = getRankSettings();
  let level = 1;
  
  while (xp >= calculateRequiredXp(level)) {
    level++;
  }
  
  const result = level - 1 || 1; // Ensure minimum level is 1
  
  return result;
}

module.exports = {
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
  calculateLevel
}; 