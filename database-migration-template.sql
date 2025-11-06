-- ============================================
-- Database Migration Template
-- Economy, Social & Gamification Features
-- ============================================
-- 
-- IMPORTANT: Backup database before running!
-- Run this migration in phases as features are implemented.
-- ============================================

-- ============================================
-- PHASE 1: ECONOMY SYSTEM
-- ============================================

-- Add coins column to users table
ALTER TABLE users ADD COLUMN coins INTEGER NOT NULL DEFAULT 0;

-- Currency transactions log
CREATE TABLE IF NOT EXISTS currency_transactions (
    transaction_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    amount INTEGER NOT NULL,
    type TEXT NOT NULL, -- 'earn', 'spend', 'trade', 'gift', 'admin'
    source TEXT NOT NULL, -- 'message', 'voice', 'achievement', 'quest', 'purchase', etc.
    description TEXT,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- Currency earning rates configuration
CREATE TABLE IF NOT EXISTS currency_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

-- Indexes for currency
CREATE INDEX IF NOT EXISTS idx_currency_transactions_user ON currency_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_currency_transactions_type ON currency_transactions(type);
CREATE INDEX IF NOT EXISTS idx_currency_transactions_created ON currency_transactions(created_at DESC);

-- ============================================
-- PHASE 2: SHOP SYSTEM
-- ============================================

-- Shop items table
CREATE TABLE IF NOT EXISTS shop_items (
    item_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL, -- 'xp_boost', 'rank_card_theme', 'temporary_role', 'badge', 'title', 'consumable'
    price INTEGER NOT NULL,
    currency_type TEXT NOT NULL DEFAULT 'coins', -- 'coins' or 'xp'
    stock INTEGER, -- NULL for unlimited
    max_purchases INTEGER, -- NULL for unlimited, per user
    duration_hours INTEGER, -- NULL for permanent items
    effect_data TEXT, -- JSON string for item-specific data
    icon TEXT,
    rarity TEXT NOT NULL DEFAULT 'common', -- 'common', 'rare', 'epic', 'legendary'
    available INTEGER NOT NULL DEFAULT 1, -- boolean: 0 or 1
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

-- User inventory (purchased items)
CREATE TABLE IF NOT EXISTS user_inventory (
    inventory_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    item_id TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    purchased_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    expires_at INTEGER, -- NULL for permanent items
    is_active INTEGER NOT NULL DEFAULT 0, -- boolean: 0 or 1
    metadata TEXT, -- JSON string for item-specific data
    FOREIGN KEY (user_id) REFERENCES users(user_id),
    FOREIGN KEY (item_id) REFERENCES shop_items(item_id)
);

-- Active user items (currently in use)
CREATE TABLE IF NOT EXISTS active_user_items (
    user_id TEXT NOT NULL,
    item_id TEXT NOT NULL,
    activated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    expires_at INTEGER NOT NULL,
    metadata TEXT, -- JSON string for item-specific data
    PRIMARY KEY (user_id, item_id),
    FOREIGN KEY (user_id) REFERENCES users(user_id),
    FOREIGN KEY (item_id) REFERENCES shop_items(item_id)
);

-- Shop categories
CREATE TABLE IF NOT EXISTS shop_categories (
    category_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

-- Indexes for shop
CREATE INDEX IF NOT EXISTS idx_shop_items_category ON shop_items(category);
CREATE INDEX IF NOT EXISTS idx_shop_items_available ON shop_items(available);
CREATE INDEX IF NOT EXISTS idx_user_inventory_user ON user_inventory(user_id);
CREATE INDEX IF NOT EXISTS idx_user_inventory_item ON user_inventory(item_id);
CREATE INDEX IF NOT EXISTS idx_user_inventory_expires ON user_inventory(expires_at);
CREATE INDEX IF NOT EXISTS idx_active_user_items_user ON active_user_items(user_id);
CREATE INDEX IF NOT EXISTS idx_active_user_items_expires ON active_user_items(expires_at);

-- ============================================
-- PHASE 3: TRADING SYSTEM
-- ============================================

-- Trade offers table
CREATE TABLE IF NOT EXISTS trade_offers (
    trade_id TEXT PRIMARY KEY,
    initiator_id TEXT NOT NULL,
    recipient_id TEXT NOT NULL,
    initiator_items TEXT NOT NULL, -- JSON array of {itemId, quantity}
    recipient_items TEXT NOT NULL, -- JSON array of {itemId, quantity}
    initiator_coins INTEGER NOT NULL DEFAULT 0,
    recipient_coins INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'accepted', 'rejected', 'cancelled', 'expired'
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    expires_at INTEGER NOT NULL,
    completed_at INTEGER,
    FOREIGN KEY (initiator_id) REFERENCES users(user_id),
    FOREIGN KEY (recipient_id) REFERENCES users(user_id)
);

-- Trade history
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

-- Indexes for trading
CREATE INDEX IF NOT EXISTS idx_trade_offers_initiator ON trade_offers(initiator_id);
CREATE INDEX IF NOT EXISTS idx_trade_offers_recipient ON trade_offers(recipient_id);
CREATE INDEX IF NOT EXISTS idx_trade_offers_status ON trade_offers(status);
CREATE INDEX IF NOT EXISTS idx_trade_offers_expires ON trade_offers(expires_at);
CREATE INDEX IF NOT EXISTS idx_trade_history_initiator ON trade_history(initiator_id);
CREATE INDEX IF NOT EXISTS idx_trade_history_recipient ON trade_history(recipient_id);

-- ============================================
-- PHASE 4: SOCIAL FEATURES
-- ============================================

-- Add reputation column to users table
ALTER TABLE users ADD COLUMN reputation INTEGER NOT NULL DEFAULT 0;

-- Reputation transactions
CREATE TABLE IF NOT EXISTS reputation_transactions (
    transaction_id TEXT PRIMARY KEY,
    giver_id TEXT NOT NULL,
    receiver_id TEXT NOT NULL,
    amount INTEGER NOT NULL, -- +1 or -1
    reason TEXT,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    FOREIGN KEY (giver_id) REFERENCES users(user_id),
    FOREIGN KEY (receiver_id) REFERENCES users(user_id)
);

-- Reputation cooldown (prevent spam)
CREATE TABLE IF NOT EXISTS reputation_cooldowns (
    giver_id TEXT NOT NULL,
    receiver_id TEXT NOT NULL,
    last_given_at INTEGER NOT NULL,
    PRIMARY KEY (giver_id, receiver_id)
);

-- Friends table
CREATE TABLE IF NOT EXISTS friendships (
    user_id TEXT NOT NULL,
    friend_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'accepted', 'blocked'
    requested_by TEXT NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    accepted_at INTEGER,
    PRIMARY KEY (user_id, friend_id),
    FOREIGN KEY (user_id) REFERENCES users(user_id),
    FOREIGN KEY (friend_id) REFERENCES users(user_id)
);

-- Friend activity feed (optional)
CREATE TABLE IF NOT EXISTS friend_activity (
    activity_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    activity_type TEXT NOT NULL, -- 'level_up', 'achievement', 'purchase', etc.
    activity_data TEXT, -- JSON string
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- Partnerships/Marriages
CREATE TABLE IF NOT EXISTS partnerships (
    partnership_id TEXT PRIMARY KEY,
    user1_id TEXT NOT NULL,
    user2_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'engaged', -- 'engaged', 'married', 'divorced'
    proposed_by TEXT NOT NULL,
    proposed_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    married_at INTEGER,
    divorced_at INTEGER,
    shared_coins INTEGER NOT NULL DEFAULT 0,
    shared_xp_bonus REAL NOT NULL DEFAULT 0.0, -- e.g., 0.1 for 10% bonus
    FOREIGN KEY (user1_id) REFERENCES users(user_id),
    FOREIGN KEY (user2_id) REFERENCES users(user_id)
);

-- Partnership events (anniversaries, etc.)
CREATE TABLE IF NOT EXISTS partnership_events (
    event_id TEXT PRIMARY KEY,
    partnership_id TEXT NOT NULL,
    event_type TEXT NOT NULL, -- 'anniversary', 'milestone'
    event_data TEXT, -- JSON string
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    FOREIGN KEY (partnership_id) REFERENCES partnerships(partnership_id)
);

-- Indexes for social features
CREATE INDEX IF NOT EXISTS idx_reputation_transactions_giver ON reputation_transactions(giver_id);
CREATE INDEX IF NOT EXISTS idx_reputation_transactions_receiver ON reputation_transactions(receiver_id);
CREATE INDEX IF NOT EXISTS idx_friendships_user ON friendships(user_id);
CREATE INDEX IF NOT EXISTS idx_friendships_friend ON friendships(friend_id);
CREATE INDEX IF NOT EXISTS idx_friendships_status ON friendships(status);
CREATE INDEX IF NOT EXISTS idx_friend_activity_user ON friend_activity(user_id);
CREATE INDEX IF NOT EXISTS idx_partnerships_user1 ON partnerships(user1_id);
CREATE INDEX IF NOT EXISTS idx_partnerships_user2 ON partnerships(user2_id);
CREATE INDEX IF NOT EXISTS idx_partnerships_status ON partnerships(status);

-- ============================================
-- PHASE 5: GUILD SYSTEM
-- ============================================

-- Guilds/Clans table
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
    settings TEXT, -- JSON string for guild settings
    FOREIGN KEY (leader_id) REFERENCES users(user_id)
);

-- Guild members
CREATE TABLE IF NOT EXISTS guild_members (
    guild_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'member', -- 'leader', 'officer', 'member'
    joined_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    contribution_xp INTEGER NOT NULL DEFAULT 0,
    contribution_coins INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (guild_id, user_id),
    FOREIGN KEY (guild_id) REFERENCES guilds(guild_id),
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- Guild leaderboards (cached)
CREATE TABLE IF NOT EXISTS guild_leaderboards (
    guild_id TEXT NOT NULL,
    period_type TEXT NOT NULL, -- 'daily', 'weekly', 'monthly', 'all_time'
    period_key TEXT NOT NULL,
    total_xp INTEGER NOT NULL DEFAULT 0,
    total_coins INTEGER NOT NULL DEFAULT 0,
    member_count INTEGER NOT NULL DEFAULT 0,
    rank INTEGER,
    updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    PRIMARY KEY (guild_id, period_type, period_key),
    FOREIGN KEY (guild_id) REFERENCES guilds(guild_id)
);

-- Indexes for guilds
CREATE INDEX IF NOT EXISTS idx_guilds_leader ON guilds(leader_id);
CREATE INDEX IF NOT EXISTS idx_guild_members_user ON guild_members(user_id);
CREATE INDEX IF NOT EXISTS idx_guild_members_guild ON guild_members(guild_id);
CREATE INDEX IF NOT EXISTS idx_guild_leaderboards_period ON guild_leaderboards(period_type, period_key);
CREATE INDEX IF NOT EXISTS idx_guild_leaderboards_rank ON guild_leaderboards(rank);

-- ============================================
-- PHASE 6: GAMIFICATION
-- ============================================

-- Quest definitions
CREATE TABLE IF NOT EXISTS quests (
    quest_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    type TEXT NOT NULL, -- 'daily', 'weekly', 'story', 'event'
    difficulty TEXT NOT NULL, -- 'easy', 'medium', 'hard', 'epic'
    steps TEXT NOT NULL, -- JSON array of step definitions
    reward_coins INTEGER NOT NULL DEFAULT 0,
    reward_xp INTEGER NOT NULL DEFAULT 0,
    reward_items TEXT, -- JSON array of {itemId, quantity}
    available_from INTEGER,
    available_until INTEGER,
    repeatable INTEGER NOT NULL DEFAULT 0, -- boolean: 0 or 1
    max_completions INTEGER, -- NULL for unlimited
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

-- User quest progress
CREATE TABLE IF NOT EXISTS user_quests (
    user_id TEXT NOT NULL,
    quest_id TEXT NOT NULL,
    current_step INTEGER NOT NULL DEFAULT 0,
    progress_data TEXT NOT NULL, -- JSON string for step-specific progress
    status TEXT NOT NULL DEFAULT 'in_progress', -- 'in_progress', 'completed', 'failed', 'abandoned'
    started_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    completed_at INTEGER,
    completion_count INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (user_id, quest_id),
    FOREIGN KEY (quest_id) REFERENCES quests(quest_id)
);

-- Badge definitions
CREATE TABLE IF NOT EXISTS badges (
    badge_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    icon TEXT NOT NULL,
    category TEXT NOT NULL, -- 'achievement', 'event', 'purchase', 'special'
    rarity TEXT NOT NULL DEFAULT 'common', -- 'common', 'rare', 'epic', 'legendary', 'mythic'
    unlock_condition TEXT, -- JSON string for unlock requirements
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

-- User badges (separate from achievements)
CREATE TABLE IF NOT EXISTS user_badges (
    user_id TEXT NOT NULL,
    badge_id TEXT NOT NULL,
    unlocked_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    source TEXT, -- 'achievement', 'purchase', 'event', 'admin'
    PRIMARY KEY (user_id, badge_id),
    FOREIGN KEY (badge_id) REFERENCES badges(badge_id)
);

-- Badge display settings (which badges to show on rank card)
CREATE TABLE IF NOT EXISTS user_badge_display (
    user_id TEXT PRIMARY KEY,
    badge_ids TEXT NOT NULL, -- JSON array of badge IDs (max 3-5)
    updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- Title definitions
CREATE TABLE IF NOT EXISTS titles (
    title_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL, -- 'default', 'purchase', 'achievement', 'event', 'custom'
    unlock_condition TEXT, -- JSON string for unlock requirements
    color TEXT, -- Hex color for title display
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

-- User titles
CREATE TABLE IF NOT EXISTS user_titles (
    user_id TEXT NOT NULL,
    title_id TEXT NOT NULL,
    unlocked_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    source TEXT, -- 'achievement', 'purchase', 'event', 'admin', 'custom'
    PRIMARY KEY (user_id, title_id),
    FOREIGN KEY (title_id) REFERENCES titles(title_id)
);

-- Add active_title_id to users table
ALTER TABLE users ADD COLUMN active_title_id TEXT;

-- Event definitions
CREATE TABLE IF NOT EXISTS events (
    event_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    type TEXT NOT NULL, -- 'seasonal', 'holiday', 'special'
    start_date INTEGER NOT NULL,
    end_date INTEGER NOT NULL,
    active INTEGER NOT NULL DEFAULT 1, -- boolean: 0 or 1
    settings TEXT, -- JSON string for event-specific settings
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

-- Event participation
CREATE TABLE IF NOT EXISTS event_participation (
    user_id TEXT NOT NULL,
    event_id TEXT NOT NULL,
    progress_data TEXT NOT NULL, -- JSON string for event progress
    rewards_claimed TEXT, -- JSON array of claimed reward IDs
    started_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    PRIMARY KEY (user_id, event_id),
    FOREIGN KEY (event_id) REFERENCES events(event_id)
);

-- Event rewards
CREATE TABLE IF NOT EXISTS event_rewards (
    reward_id TEXT PRIMARY KEY,
    event_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    reward_type TEXT NOT NULL, -- 'badge', 'title', 'item', 'coins', 'xp'
    reward_data TEXT NOT NULL, -- JSON string for reward data
    unlock_condition TEXT NOT NULL, -- JSON string for unlock requirements
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    FOREIGN KEY (event_id) REFERENCES events(event_id)
);

-- Lottery draws
CREATE TABLE IF NOT EXISTS lotteries (
    lottery_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    ticket_price INTEGER NOT NULL,
    max_tickets_per_user INTEGER NOT NULL DEFAULT 10,
    draw_date INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'open', -- 'open', 'closed', 'drawn', 'cancelled'
    prize_pool_coins INTEGER NOT NULL DEFAULT 0,
    prize_items TEXT, -- JSON array of {itemId, quantity}
    winner_count INTEGER NOT NULL DEFAULT 1,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    drawn_at INTEGER
);

-- Lottery tickets
CREATE TABLE IF NOT EXISTS lottery_tickets (
    ticket_id TEXT PRIMARY KEY,
    lottery_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    ticket_number INTEGER NOT NULL,
    purchased_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    FOREIGN KEY (lottery_id) REFERENCES lotteries(lottery_id),
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- Lottery winners
CREATE TABLE IF NOT EXISTS lottery_winners (
    lottery_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    ticket_number INTEGER NOT NULL,
    prize_coins INTEGER NOT NULL DEFAULT 0,
    prize_items TEXT, -- JSON array
    won_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    PRIMARY KEY (lottery_id, user_id),
    FOREIGN KEY (lottery_id) REFERENCES lotteries(lottery_id),
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- Indexes for gamification
CREATE INDEX IF NOT EXISTS idx_quests_type ON quests(type);
CREATE INDEX IF NOT EXISTS idx_quests_available ON quests(available_from, available_until);
CREATE INDEX IF NOT EXISTS idx_user_quests_user ON user_quests(user_id);
CREATE INDEX IF NOT EXISTS idx_user_quests_status ON user_quests(status);
CREATE INDEX IF NOT EXISTS idx_badges_category ON badges(category);
CREATE INDEX IF NOT EXISTS idx_badges_rarity ON badges(rarity);
CREATE INDEX IF NOT EXISTS idx_user_badges_user ON user_badges(user_id);
CREATE INDEX IF NOT EXISTS idx_titles_category ON titles(category);
CREATE INDEX IF NOT EXISTS idx_user_titles_user ON user_titles(user_id);
CREATE INDEX IF NOT EXISTS idx_events_active ON events(active);
CREATE INDEX IF NOT EXISTS idx_events_dates ON events(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_event_participation_user ON event_participation(user_id);
CREATE INDEX IF NOT EXISTS idx_lotteries_status ON lotteries(status);
CREATE INDEX IF NOT EXISTS idx_lotteries_draw_date ON lotteries(draw_date);
CREATE INDEX IF NOT EXISTS idx_lottery_tickets_lottery ON lottery_tickets(lottery_id);
CREATE INDEX IF NOT EXISTS idx_lottery_tickets_user ON lottery_tickets(user_id);

-- ============================================
-- DEFAULT DATA INSERTION
-- ============================================

-- Insert default currency settings
INSERT OR IGNORE INTO currency_settings (key, value) VALUES
('messageCoins', '{"min": 1, "max": 3, "cooldown": 60}'),
('voiceCoinsPerMinute', '2'),
('voiceMaxMinutes', '60'),
('achievementCoins', '{"common": 10, "rare": 25, "epic": 50, "legendary": 100}'),
('dailyBonus', '50'),
('streakBonus', '{"enabled": true, "multiplier": 0.1}');

-- Insert default shop categories
INSERT OR IGNORE INTO shop_categories (category_id, name, description, icon, display_order) VALUES
('xp_boost', 'XP Boosts', 'Temporary XP multipliers', '⚡', 1),
('rank_card_theme', 'Rank Card Themes', 'Customize your rank card appearance', '🎨', 2),
('temporary_role', 'Temporary Roles', 'Temporary Discord role assignments', '👑', 3),
('badge', 'Badges', 'Collectible badges for your profile', '🏅', 4),
('title', 'Titles', 'Custom titles for your profile', '📜', 5),
('consumable', 'Consumables', 'One-time use items', '💊', 6);

-- ============================================
-- MIGRATION COMPLETE
-- ============================================
-- 
-- Remember to:
-- 1. Backup your database before running
-- 2. Test on development database first
-- 3. Run in phases as features are implemented
-- 4. Verify all indexes are created
-- 5. Check foreign key constraints
-- ============================================

