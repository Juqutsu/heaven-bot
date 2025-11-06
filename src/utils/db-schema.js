/**
 * Database schema definitions and initialization
 * @module db-schema
 */

/**
 * SQL schema for creating all database tables
 */
const SCHEMA = `
-- Users table: stores user XP, level, prestige, and timestamps
CREATE TABLE IF NOT EXISTS users (
    user_id TEXT PRIMARY KEY,
    xp INTEGER NOT NULL DEFAULT 0,
    level INTEGER NOT NULL DEFAULT 1,
    prestige INTEGER NOT NULL DEFAULT 0,
    last_message_timestamp INTEGER NOT NULL DEFAULT 0,
    voice_join_timestamp INTEGER NOT NULL DEFAULT 0,
    total_text_xp INTEGER NOT NULL DEFAULT 0,
    total_voice_xp INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

-- Ranks table: stores level-based role configuration
CREATE TABLE IF NOT EXISTS ranks (
    level INTEGER PRIMARY KEY,
    role_id TEXT,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

-- Rank settings table: stores global rank configuration
CREATE TABLE IF NOT EXISTS rank_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

-- Prestiges table: stores prestige tier configuration
CREATE TABLE IF NOT EXISTS prestiges (
    prestige_level INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    required_level INTEGER NOT NULL,
    color TEXT NOT NULL,
    role_id TEXT,
    xp_boost REAL NOT NULL DEFAULT 0.0,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

-- Statistics table: stores user statistics
CREATE TABLE IF NOT EXISTS statistics (
    user_id TEXT NOT NULL,
    stat_type TEXT NOT NULL, -- 'messages', 'voice', 'commands'
    period_type TEXT NOT NULL, -- 'total', 'daily', 'weekly', 'monthly'
    period_key TEXT NOT NULL, -- date/week/month identifier or 'total'
    value INTEGER NOT NULL DEFAULT 0,
    updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    PRIMARY KEY (user_id, stat_type, period_type, period_key)
);

-- Voice sessions table: stores active voice channel sessions
CREATE TABLE IF NOT EXISTS voice_sessions (
    user_id TEXT PRIMARY KEY,
    channel_id TEXT NOT NULL,
    join_time INTEGER NOT NULL,
    last_update INTEGER NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

-- Achievements table: stores achievement definitions
CREATE TABLE IF NOT EXISTS achievements (
    achievement_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    icon TEXT,
    type TEXT NOT NULL, -- 'messages', 'voice', 'level', 'streak', etc.
    requirement_value INTEGER NOT NULL,
    reward_xp INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

-- User achievements table: tracks user achievements
CREATE TABLE IF NOT EXISTS user_achievements (
    user_id TEXT NOT NULL,
    achievement_id TEXT NOT NULL,
    unlocked_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    PRIMARY KEY (user_id, achievement_id),
    FOREIGN KEY (achievement_id) REFERENCES achievements(achievement_id)
);

-- Challenges table: stores challenge definitions
CREATE TABLE IF NOT EXISTS challenges (
    challenge_id TEXT PRIMARY KEY,
    type TEXT NOT NULL, -- 'daily', 'weekly'
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    requirement_type TEXT NOT NULL, -- 'messages', 'voice_minutes', 'xp'
    requirement_value INTEGER NOT NULL,
    reward_xp INTEGER NOT NULL DEFAULT 0,
    start_date INTEGER NOT NULL,
    end_date INTEGER NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

-- User challenges table: tracks user challenge progress
CREATE TABLE IF NOT EXISTS user_challenges (
    user_id TEXT NOT NULL,
    challenge_id TEXT NOT NULL,
    progress INTEGER NOT NULL DEFAULT 0,
    completed INTEGER NOT NULL DEFAULT 0, -- boolean: 0 or 1
    completed_at INTEGER,
    PRIMARY KEY (user_id, challenge_id),
    FOREIGN KEY (challenge_id) REFERENCES challenges(challenge_id)
);

-- User streaks table: tracks activity streaks
CREATE TABLE IF NOT EXISTS user_streaks (
    user_id TEXT PRIMARY KEY,
    current_streak INTEGER NOT NULL DEFAULT 0,
    longest_streak INTEGER NOT NULL DEFAULT 0,
    last_activity_date TEXT, -- YYYY-MM-DD format
    streak_bonus_multiplier REAL NOT NULL DEFAULT 0.0,
    updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

-- XP multipliers table: stores active XP multipliers
CREATE TABLE IF NOT EXISTS xp_multipliers (
    multiplier_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    multiplier_value REAL NOT NULL, -- e.g., 1.5 for 50% boost
    start_time INTEGER NOT NULL,
    end_time INTEGER NOT NULL,
    scope TEXT NOT NULL, -- 'global', 'user', 'role'
    scope_id TEXT, -- user_id or role_id if scope is 'user' or 'role'
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

-- User rank card settings table: stores rank card customizations
CREATE TABLE IF NOT EXISTS user_rank_card_settings (
    user_id TEXT PRIMARY KEY,
    primary_color TEXT,
    background_color TEXT,
    updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

-- Notification settings table: stores user notification preferences
CREATE TABLE IF NOT EXISTS notification_settings (
    user_id TEXT PRIMARY KEY,
    level_up_dm INTEGER NOT NULL DEFAULT 0, -- boolean: 0 or 1
    achievement_dm INTEGER NOT NULL DEFAULT 0,
    challenge_complete_dm INTEGER NOT NULL DEFAULT 0,
    updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_users_level ON users(level DESC);
CREATE INDEX IF NOT EXISTS idx_users_prestige ON users(prestige DESC, level DESC);
CREATE INDEX IF NOT EXISTS idx_users_xp ON users(xp DESC);
CREATE INDEX IF NOT EXISTS idx_statistics_user_type ON statistics(user_id, stat_type);
CREATE INDEX IF NOT EXISTS idx_statistics_period ON statistics(period_type, period_key);
CREATE INDEX IF NOT EXISTS idx_voice_sessions_channel ON voice_sessions(channel_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_user ON user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_user_challenges_user ON user_challenges(user_id);
CREATE INDEX IF NOT EXISTS idx_challenges_type ON challenges(type);
CREATE INDEX IF NOT EXISTS idx_xp_multipliers_scope ON xp_multipliers(scope, scope_id);
CREATE INDEX IF NOT EXISTS idx_xp_multipliers_time ON xp_multipliers(start_time, end_time);
`;

/**
 * Default rank settings
 */
const DEFAULT_RANK_SETTINGS = {
  textXp: {
    baseAmount: 15,
    cooldown: 60,
    randomBonus: 5
  },
  voiceXp: {
    perMinute: 10,
    afkDisabled: true
  },
  formula: {
    baseXp: 100,
    exponent: 1.5
  }
};

/**
 * Default prestige tiers
 */
const DEFAULT_PRESTIGES = [
  {
    prestige_level: 1,
    name: 'Bronze',
    required_level: 100,
    color: '#CD7F32',
    role_id: null,
    xp_boost: 0.05
  },
  {
    prestige_level: 2,
    name: 'Silver',
    required_level: 200,
    color: '#C0C0C0',
    role_id: null,
    xp_boost: 0.1
  },
  {
    prestige_level: 3,
    name: 'Gold',
    required_level: 300,
    color: '#FFD700',
    role_id: null,
    xp_boost: 0.15
  },
  {
    prestige_level: 4,
    name: 'Platinum',
    required_level: 400,
    color: '#E5E4E2',
    role_id: null,
    xp_boost: 0.2
  },
  {
    prestige_level: 5,
    name: 'Diamond',
    required_level: 500,
    color: '#B9F2FF',
    role_id: null,
    xp_boost: 0.25
  }
];

/**
 * Default achievements
 */
const DEFAULT_ACHIEVEMENTS = [
  // Message achievements
  { achievement_id: 'msg_100', name: 'Chatterbox', description: 'Send 100 messages', icon: '💬', type: 'messages', requirement_value: 100, reward_xp: 50 },
  { achievement_id: 'msg_500', name: 'Social Butterfly', description: 'Send 500 messages', icon: '🦋', type: 'messages', requirement_value: 500, reward_xp: 200 },
  { achievement_id: 'msg_1000', name: 'Conversation Master', description: 'Send 1,000 messages', icon: '💭', type: 'messages', requirement_value: 1000, reward_xp: 500 },
  { achievement_id: 'msg_5000', name: 'Message Legend', description: 'Send 5,000 messages', icon: '📢', type: 'messages', requirement_value: 5000, reward_xp: 2000 },
  { achievement_id: 'msg_10000', name: 'Ultimate Chatter', description: 'Send 10,000 messages', icon: '🗣️', type: 'messages', requirement_value: 10000, reward_xp: 5000 },
  
  // Level achievements
  { achievement_id: 'level_10', name: 'Rising Star', description: 'Reach level 10', icon: '⭐', type: 'level', requirement_value: 10, reward_xp: 100 },
  { achievement_id: 'level_25', name: 'Experienced', description: 'Reach level 25', icon: '🌟', type: 'level', requirement_value: 25, reward_xp: 300 },
  { achievement_id: 'level_50', name: 'Veteran', description: 'Reach level 50', icon: '💫', type: 'level', requirement_value: 50, reward_xp: 750 },
  { achievement_id: 'level_100', name: 'Elite', description: 'Reach level 100', icon: '🏆', type: 'level', requirement_value: 100, reward_xp: 2000 },
  { achievement_id: 'level_200', name: 'Master', description: 'Reach level 200', icon: '👑', type: 'level', requirement_value: 200, reward_xp: 5000 },
  
  // Voice achievements
  { achievement_id: 'voice_60', name: 'Voice Enthusiast', description: 'Spend 60 minutes in voice', icon: '🎤', type: 'voice', requirement_value: 60, reward_xp: 100 },
  { achievement_id: 'voice_300', name: 'Voice Regular', description: 'Spend 300 minutes in voice', icon: '🎧', type: 'voice', requirement_value: 300, reward_xp: 500 },
  { achievement_id: 'voice_1000', name: 'Voice Champion', description: 'Spend 1,000 minutes in voice', icon: '🎙️', type: 'voice', requirement_value: 1000, reward_xp: 2000 },
  
  // Streak achievements
  { achievement_id: 'streak_7', name: 'Week Warrior', description: 'Maintain a 7-day streak', icon: '🔥', type: 'streak', requirement_value: 7, reward_xp: 200 },
  { achievement_id: 'streak_30', name: 'Monthly Dedication', description: 'Maintain a 30-day streak', icon: '💪', type: 'streak', requirement_value: 30, reward_xp: 1000 },
  { achievement_id: 'streak_100', name: 'Centurion', description: 'Maintain a 100-day streak', icon: '⚡', type: 'streak', requirement_value: 100, reward_xp: 5000 }
];

/**
 * Initialize database schema and default data
 * @param {import('better-sqlite3').Database} db - Database instance
 */
function initializeSchema(db) {
  // Create tables
  db.exec(SCHEMA);

  // Insert default rank settings if they don't exist
  const settingsExist = db.prepare('SELECT COUNT(*) as count FROM rank_settings').get();
  if (settingsExist.count === 0) {
    const insertSetting = db.prepare('INSERT INTO rank_settings (key, value) VALUES (?, ?)');
    const insertMany = db.transaction((settings) => {
      for (const [key, value] of Object.entries(settings)) {
        insertSetting.run(key, JSON.stringify(value));
      }
    });
    insertMany(DEFAULT_RANK_SETTINGS);
  }

  // Insert default prestiges if they don't exist
  const prestigesExist = db.prepare('SELECT COUNT(*) as count FROM prestiges').get();
  if (prestigesExist.count === 0) {
    const insertPrestige = db.prepare(`
      INSERT INTO prestiges (prestige_level, name, required_level, color, role_id, xp_boost)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const insertMany = db.transaction((prestiges) => {
      for (const prestige of prestiges) {
        insertPrestige.run(
          prestige.prestige_level,
          prestige.name,
          prestige.required_level,
          prestige.color,
          prestige.role_id,
          prestige.xp_boost
        );
      }
    });
    insertMany(DEFAULT_PRESTIGES);
  }

  // Insert default achievements if they don't exist
  const achievementsExist = db.prepare('SELECT COUNT(*) as count FROM achievements').get();
  if (achievementsExist.count === 0) {
    const insertAchievement = db.prepare(`
      INSERT INTO achievements (achievement_id, name, description, icon, type, requirement_value, reward_xp)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const insertMany = db.transaction((achievements) => {
      for (const achievement of achievements) {
        insertAchievement.run(
          achievement.achievement_id,
          achievement.name,
          achievement.description,
          achievement.icon,
          achievement.type,
          achievement.requirement_value,
          achievement.reward_xp
        );
      }
    });
    insertMany(DEFAULT_ACHIEVEMENTS);
  }
}

module.exports = {
  SCHEMA,
  DEFAULT_RANK_SETTINGS,
  DEFAULT_PRESTIGES,
  DEFAULT_ACHIEVEMENTS,
  initializeSchema
};

