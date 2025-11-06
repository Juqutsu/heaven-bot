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
    coins INTEGER NOT NULL DEFAULT 0,
    reputation INTEGER NOT NULL DEFAULT 0,
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

-- Economy: currency settings
CREATE TABLE IF NOT EXISTS currency_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

-- Economy: currency transactions log
CREATE TABLE IF NOT EXISTS currency_transactions (
    transaction_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    amount INTEGER NOT NULL,
    type TEXT NOT NULL, -- 'earn', 'spend', 'transfer_in', 'transfer_out', 'admin'
    source TEXT NOT NULL, -- 'message', 'voice', 'achievement', 'daily', 'purchase', etc.
    description TEXT,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

CREATE INDEX IF NOT EXISTS idx_currency_transactions_user ON currency_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_currency_transactions_type ON currency_transactions(type);
CREATE INDEX IF NOT EXISTS idx_currency_transactions_created ON currency_transactions(created_at DESC);

-- Shop: shop items table
CREATE TABLE IF NOT EXISTS shop_items (
    item_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    price INTEGER NOT NULL,
    currency_type TEXT NOT NULL DEFAULT 'coins',
    stock INTEGER,
    max_purchases INTEGER,
    duration_hours INTEGER,
    effect_data TEXT,
    icon TEXT,
    rarity TEXT NOT NULL DEFAULT 'common',
    available INTEGER NOT NULL DEFAULT 1,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

-- Shop: user inventory
CREATE TABLE IF NOT EXISTS user_inventory (
    inventory_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    item_id TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    purchased_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    expires_at INTEGER,
    is_active INTEGER NOT NULL DEFAULT 0,
    metadata TEXT,
    FOREIGN KEY (user_id) REFERENCES users(user_id),
    FOREIGN KEY (item_id) REFERENCES shop_items(item_id)
);

-- Shop: active user items
CREATE TABLE IF NOT EXISTS active_user_items (
    user_id TEXT NOT NULL,
    item_id TEXT NOT NULL,
    activated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    expires_at INTEGER NOT NULL,
    metadata TEXT,
    PRIMARY KEY (user_id, item_id),
    FOREIGN KEY (user_id) REFERENCES users(user_id),
    FOREIGN KEY (item_id) REFERENCES shop_items(item_id)
);

-- Shop: categories
CREATE TABLE IF NOT EXISTS shop_categories (
    category_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

-- Shop indexes
CREATE INDEX IF NOT EXISTS idx_shop_items_category ON shop_items(category);
CREATE INDEX IF NOT EXISTS idx_shop_items_available ON shop_items(available);
CREATE INDEX IF NOT EXISTS idx_user_inventory_user ON user_inventory(user_id);
CREATE INDEX IF NOT EXISTS idx_user_inventory_item ON user_inventory(item_id);
CREATE INDEX IF NOT EXISTS idx_user_inventory_expires ON user_inventory(expires_at);
CREATE INDEX IF NOT EXISTS idx_active_user_items_user ON active_user_items(user_id);
CREATE INDEX IF NOT EXISTS idx_active_user_items_expires ON active_user_items(expires_at);

-- Trading: trade offers table
CREATE TABLE IF NOT EXISTS trade_offers (
    trade_id TEXT PRIMARY KEY,
    initiator_id TEXT NOT NULL,
    recipient_id TEXT NOT NULL,
    initiator_items TEXT NOT NULL,
    recipient_items TEXT NOT NULL,
    initiator_coins INTEGER NOT NULL DEFAULT 0,
    recipient_coins INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    expires_at INTEGER NOT NULL,
    completed_at INTEGER,
    FOREIGN KEY (initiator_id) REFERENCES users(user_id),
    FOREIGN KEY (recipient_id) REFERENCES users(user_id)
);

-- Trading: trade history
CREATE TABLE IF NOT EXISTS trade_history (
    trade_id TEXT PRIMARY KEY,
    initiator_id TEXT NOT NULL,
    recipient_id TEXT NOT NULL,
    initiator_items TEXT NOT NULL,
    recipient_items TEXT NOT NULL,
    initiator_coins INTEGER NOT NULL DEFAULT 0,
    recipient_coins INTEGER NOT NULL DEFAULT 0,
    completed_at INTEGER NOT NULL,
    FOREIGN KEY (initiator_id) REFERENCES users(user_id),
    FOREIGN KEY (recipient_id) REFERENCES users(user_id)
);

-- Trading indexes
CREATE INDEX IF NOT EXISTS idx_trade_offers_initiator ON trade_offers(initiator_id);
CREATE INDEX IF NOT EXISTS idx_trade_offers_recipient ON trade_offers(recipient_id);
CREATE INDEX IF NOT EXISTS idx_trade_offers_status ON trade_offers(status);
CREATE INDEX IF NOT EXISTS idx_trade_offers_expires ON trade_offers(expires_at);
CREATE INDEX IF NOT EXISTS idx_trade_history_initiator ON trade_history(initiator_id);
CREATE INDEX IF NOT EXISTS idx_trade_history_recipient ON trade_history(recipient_id);

-- Reputation: reputation transactions
CREATE TABLE IF NOT EXISTS reputation_transactions (
    transaction_id TEXT PRIMARY KEY,
    giver_id TEXT NOT NULL,
    receiver_id TEXT NOT NULL,
    amount INTEGER NOT NULL,
    reason TEXT,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    FOREIGN KEY (giver_id) REFERENCES users(user_id),
    FOREIGN KEY (receiver_id) REFERENCES users(user_id)
);

-- Reputation: cooldown (prevent spam)
CREATE TABLE IF NOT EXISTS reputation_cooldowns (
    giver_id TEXT NOT NULL,
    receiver_id TEXT NOT NULL,
    last_given_at INTEGER NOT NULL,
    PRIMARY KEY (giver_id, receiver_id)
);

-- Reputation indexes
CREATE INDEX IF NOT EXISTS idx_reputation_transactions_giver ON reputation_transactions(giver_id);
CREATE INDEX IF NOT EXISTS idx_reputation_transactions_receiver ON reputation_transactions(receiver_id);
CREATE INDEX IF NOT EXISTS idx_reputation_transactions_created ON reputation_transactions(created_at DESC);

-- Friends: friendships table
CREATE TABLE IF NOT EXISTS friendships (
    user_id TEXT NOT NULL,
    friend_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    requested_by TEXT NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    accepted_at INTEGER,
    PRIMARY KEY (user_id, friend_id),
    FOREIGN KEY (user_id) REFERENCES users(user_id),
    FOREIGN KEY (friend_id) REFERENCES users(user_id)
);

-- Friends: activity feed (optional)
CREATE TABLE IF NOT EXISTS friend_activity (
    activity_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    activity_type TEXT NOT NULL,
    activity_data TEXT,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- Friends indexes
CREATE INDEX IF NOT EXISTS idx_friendships_user ON friendships(user_id);
CREATE INDEX IF NOT EXISTS idx_friendships_friend ON friendships(friend_id);
CREATE INDEX IF NOT EXISTS idx_friendships_status ON friendships(status);
CREATE INDEX IF NOT EXISTS idx_friend_activity_user ON friend_activity(user_id);

-- Partnerships: partnerships table
CREATE TABLE IF NOT EXISTS partnerships (
    partnership_id TEXT PRIMARY KEY,
    user1_id TEXT NOT NULL,
    user2_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'engaged',
    proposed_by TEXT NOT NULL,
    proposed_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    married_at INTEGER,
    divorced_at INTEGER,
    shared_coins INTEGER NOT NULL DEFAULT 0,
    shared_xp_bonus REAL NOT NULL DEFAULT 0.0,
    FOREIGN KEY (user1_id) REFERENCES users(user_id),
    FOREIGN KEY (user2_id) REFERENCES users(user_id)
);

-- Partnerships: events table
CREATE TABLE IF NOT EXISTS partnership_events (
    event_id TEXT PRIMARY KEY,
    partnership_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    event_data TEXT,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    FOREIGN KEY (partnership_id) REFERENCES partnerships(partnership_id)
);

-- Partnership indexes
CREATE INDEX IF NOT EXISTS idx_partnerships_user1 ON partnerships(user1_id);
CREATE INDEX IF NOT EXISTS idx_partnerships_user2 ON partnerships(user2_id);
CREATE INDEX IF NOT EXISTS idx_partnerships_status ON partnerships(status);

-- Guilds: guilds/clans table
CREATE TABLE IF NOT EXISTS guilds (
    guild_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT,
    leader_id TEXT NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    level INTEGER NOT NULL DEFAULT 1,
    experience INTEGER NOT NULL DEFAULT 0,
    coins INTEGER NOT NULL DEFAULT 0,
    max_members INTEGER NOT NULL DEFAULT 50,
    settings TEXT,
    FOREIGN KEY (leader_id) REFERENCES users(user_id)
);

-- Guilds: members table
CREATE TABLE IF NOT EXISTS guild_members (
    guild_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'member',
    joined_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    contribution_xp INTEGER NOT NULL DEFAULT 0,
    contribution_coins INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (guild_id, user_id),
    FOREIGN KEY (guild_id) REFERENCES guilds(guild_id),
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- Guilds: leaderboards table
CREATE TABLE IF NOT EXISTS guild_leaderboards (
    guild_id TEXT NOT NULL,
    period_type TEXT NOT NULL,
    period_key TEXT NOT NULL,
    total_xp INTEGER NOT NULL DEFAULT 0,
    total_coins INTEGER NOT NULL DEFAULT 0,
    member_count INTEGER NOT NULL DEFAULT 0,
    rank INTEGER,
    updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    PRIMARY KEY (guild_id, period_type, period_key),
    FOREIGN KEY (guild_id) REFERENCES guilds(guild_id)
);

-- Guild indexes
CREATE INDEX IF NOT EXISTS idx_guilds_leader ON guilds(leader_id);
CREATE INDEX IF NOT EXISTS idx_guild_members_user ON guild_members(user_id);
CREATE INDEX IF NOT EXISTS idx_guild_members_guild ON guild_members(guild_id);
CREATE INDEX IF NOT EXISTS idx_guild_leaderboards_period ON guild_leaderboards(period_type, period_key);
CREATE INDEX IF NOT EXISTS idx_guild_leaderboards_rank ON guild_leaderboards(rank);

-- Guild settings table: per-guild configuration for utilities
CREATE TABLE IF NOT EXISTS guild_settings (
    guild_id TEXT PRIMARY KEY,
    welcome_channel_id TEXT,
    welcome_message TEXT,
    goodbye_channel_id TEXT,
    goodbye_message TEXT,
    reaction_roles_message_id TEXT,
    updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

-- Reaction roles mapping: emoji -> role for a specific message
CREATE TABLE IF NOT EXISTS reaction_roles (
    guild_id TEXT NOT NULL,
    message_id TEXT NOT NULL,
    emoji TEXT NOT NULL,
    role_id TEXT NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    PRIMARY KEY (guild_id, message_id, emoji)
);

-- Giveaways table: metadata for giveaways
CREATE TABLE IF NOT EXISTS giveaways (
    giveaway_id TEXT PRIMARY KEY,
    guild_id TEXT NOT NULL,
    channel_id TEXT NOT NULL,
    message_id TEXT,
    prize TEXT NOT NULL,
    winner_count INTEGER NOT NULL DEFAULT 1,
    end_time INTEGER NOT NULL,
    created_by TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'running', -- running | ended | canceled
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

-- Giveaway entries: users who reacted to participate
CREATE TABLE IF NOT EXISTS giveaway_entries (
    giveaway_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    PRIMARY KEY (giveaway_id, user_id),
    FOREIGN KEY (giveaway_id) REFERENCES giveaways(giveaway_id)
);

-- Indexes for utilities
CREATE INDEX IF NOT EXISTS idx_giveaways_guild_status ON giveaways(guild_id, status);
CREATE INDEX IF NOT EXISTS idx_giveaways_end_time ON giveaways(end_time);
CREATE INDEX IF NOT EXISTS idx_reaction_roles_message ON reaction_roles(guild_id, message_id);
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

  // Ensure users.coins and users.reputation columns exist for older databases
  try {
    const columns = db.prepare('PRAGMA table_info(\'users\')').all();
    const hasCoins = columns.some(c => c.name === 'coins');
    if (!hasCoins) {
      db.exec('ALTER TABLE users ADD COLUMN coins INTEGER NOT NULL DEFAULT 0');
    }
    const hasReputation = columns.some(c => c.name === 'reputation');
    if (!hasReputation) {
      db.exec('ALTER TABLE users ADD COLUMN reputation INTEGER NOT NULL DEFAULT 0');
    }
  } catch (_) {
    // ignore
  }

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

  // Insert default currency settings if they don't exist
  try {
    const currencySettingsCount = db.prepare('SELECT COUNT(*) as count FROM currency_settings').get();
    if (currencySettingsCount.count === 0) {
      const insertCurrencySetting = db.prepare('INSERT INTO currency_settings (key, value) VALUES (?, ?)');
      const defaults = {
        messageCoins: { min: 1, max: 3, cooldown: 60 },
        voiceCoinsPerMinute: 2,
        voiceMaxMinutes: 60,
        achievementCoins: { common: 10, rare: 25, epic: 50, legendary: 100 },
        dailyBonus: 50,
        streakBonus: { enabled: true, multiplier: 0.1 }
      };
      const insertManyCurrency = db.transaction((settings) => {
        for (const [key, value] of Object.entries(settings)) {
          insertCurrencySetting.run(key, JSON.stringify(value));
        }
      });
      insertManyCurrency(defaults);
    }
  } catch (_) {
    // ignore
  }

  // Insert default shop categories if they don't exist
  try {
    const categoriesCount = db.prepare('SELECT COUNT(*) as count FROM shop_categories').get();
    if (categoriesCount.count === 0) {
      const insertCategory = db.prepare('INSERT INTO shop_categories (category_id, name, description, icon, display_order) VALUES (?, ?, ?, ?, ?)');
      const categories = [
        { id: 'xp_boost', name: 'XP Boosts', description: 'Temporary XP multipliers', icon: '⚡', order: 1 },
        { id: 'rank_card_theme', name: 'Rank Card Themes', description: 'Customize your rank card', icon: '🎨', order: 2 },
        { id: 'temporary_role', name: 'Temporary Roles', description: 'Temporary Discord roles', icon: '👑', order: 3 },
        { id: 'badge', name: 'Badges', description: 'Collectible badges', icon: '🏅', order: 4 },
        { id: 'title', name: 'Titles', description: 'Custom titles', icon: '📜', order: 5 }
      ];
      const insertManyCategories = db.transaction((cats) => {
        for (const cat of cats) {
          insertCategory.run(cat.id, cat.name, cat.description, cat.icon, cat.order);
        }
      });
      insertManyCategories(categories);
    }
  } catch (_) {
    // ignore
  }

  // Insert default shop items if they don't exist
  try {
    const itemsCount = db.prepare('SELECT COUNT(*) as count FROM shop_items').get();
    if (itemsCount.count === 0) {
      const insertItem = db.prepare(`
        INSERT INTO shop_items (item_id, name, description, category, price, duration_hours, effect_data, icon, rarity, available)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      const defaultItems = [
        {
          id: 'xp_boost_1h',
          name: 'XP Boost (1 Hour)',
          description: '1.5x XP multiplier for 1 hour',
          category: 'xp_boost',
          price: 100,
          durationHours: 1,
          effectData: { multiplier: 1.5 },
          icon: '⚡',
          rarity: 'common',
          available: 1
        },
        {
          id: 'xp_boost_6h',
          name: 'XP Boost (6 Hours)',
          description: '1.5x XP multiplier for 6 hours',
          category: 'xp_boost',
          price: 500,
          durationHours: 6,
          effectData: { multiplier: 1.5 },
          icon: '⚡',
          rarity: 'common',
          available: 1
        },
        {
          id: 'xp_boost_24h',
          name: 'XP Boost (24 Hours)',
          description: '2x XP multiplier for 24 hours',
          category: 'xp_boost',
          price: 2000,
          durationHours: 24,
          effectData: { multiplier: 2.0 },
          icon: '⚡',
          rarity: 'rare',
          available: 1
        }
      ];
      const insertManyItems = db.transaction((items) => {
        for (const item of items) {
          insertItem.run(
            item.id,
            item.name,
            item.description,
            item.category,
            item.price,
            item.durationHours,
            JSON.stringify(item.effectData),
            item.icon,
            item.rarity,
            item.available
          );
        }
      });
      insertManyItems(defaultItems);
    }
  } catch (_) {
    // ignore
  }
}

module.exports = {
  SCHEMA,
  DEFAULT_RANK_SETTINGS,
  DEFAULT_PRESTIGES,
  DEFAULT_ACHIEVEMENTS,
  initializeSchema
};

