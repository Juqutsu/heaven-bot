# Feature Planning Document

## Overview
This document outlines the planning for new features to be added to the Heaven Discord bot, including Economy & Shop System, Social & Community features, and enhanced Gamification.

---

## 1. Economy & Shop System

### 1.1 Currency System

#### Database Schema
```sql
-- Add coins column to users table
ALTER TABLE users ADD COLUMN coins INTEGER NOT NULL DEFAULT 0;

-- Currency transactions log (for audit trail)
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
```

#### Implementation Details
- **Earning Sources:**
  - Messages: 1-3 coins per message (with cooldown)
  - Voice: 2 coins per minute (max 60 minutes per session)
  - Achievements: 10-100 coins per achievement (based on rarity)
  - Daily login bonus: 50 coins
  - Quest completion: Variable based on quest difficulty
  - Lottery winnings: Variable

- **Files to Create/Modify:**
  - `src/utils/economy.js` - Core economy functions
  - `src/events/messageCreate.js` - Add coin earning on messages
  - `src/events/voiceStateUpdate.js` - Add coin earning on voice
  - `src/utils/achievements.js` - Add coin rewards
  - `src/commands/balance.js` - Check user balance
  - `src/commands/daily.js` - Daily coin bonus

#### Default Currency Settings
```javascript
{
  messageCoins: { min: 1, max: 3, cooldown: 60 },
  voiceCoinsPerMinute: 2,
  voiceMaxMinutes: 60,
  achievementCoins: {
    common: 10,
    rare: 25,
    epic: 50,
    legendary: 100
  },
  dailyBonus: 50,
  streakBonus: { enabled: true, multiplier: 0.1 } // 10% bonus per streak day
}
```

---

### 1.2 Shop System

#### Database Schema
```sql
-- Shop items table
CREATE TABLE IF NOT EXISTS shop_items (
    item_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL, -- 'xp_boost', 'rank_card_theme', 'temporary_role', 'badge', 'title', 'consumable'
    price INTEGER NOT NULL,
    currency_type TEXT NOT NULL DEFAULT 'coins', -- 'coins' or 'xp' (for future)
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
    is_active INTEGER NOT NULL DEFAULT 0, -- boolean: 0 or 1 (for items that can be activated)
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
```

#### Item Types & Effects

1. **XP Boosts**
   - Effect: Multiplier (e.g., 1.5x, 2x)
   - Duration: 1 hour, 6 hours, 24 hours, 7 days
   - Effect data: `{ multiplier: 1.5, duration: 3600 }`

2. **Rank Card Themes**
   - Effect: Visual customization
   - Duration: Permanent (one-time purchase)
   - Effect data: `{ themeId: "dark_theme", colors: {...} }`

3. **Temporary Roles**
   - Effect: Discord role assignment
   - Duration: 24 hours, 7 days, 30 days
   - Effect data: `{ roleId: "...", duration: 86400 }`

4. **Badges**
   - Effect: Display on profile/rank card
   - Duration: Permanent
   - Effect data: `{ badgeId: "vip", icon: "⭐" }`

5. **Titles**
   - Effect: Customizable title on rank card
   - Duration: Permanent
   - Effect data: `{ title: "Custom Title" }`

#### Files to Create/Modify:
- `src/utils/shop.js` - Shop management functions
- `src/utils/inventory.js` - Inventory management
- `src/commands/shop.js` - Browse and view shop
- `src/commands/buy.js` - Purchase items
- `src/commands/inventory.js` - View user inventory
- `src/commands/use.js` - Activate consumable items
- `src/jobs/itemExpiration.js` - Handle item expiration

#### Default Shop Items
```javascript
[
  {
    itemId: 'xp_boost_1h',
    name: 'XP Boost (1 Hour)',
    description: '1.5x XP multiplier for 1 hour',
    category: 'xp_boost',
    price: 100,
    durationHours: 1,
    effectData: { multiplier: 1.5 }
  },
  {
    itemId: 'xp_boost_24h',
    name: 'XP Boost (24 Hours)',
    description: '2x XP multiplier for 24 hours',
    category: 'xp_boost',
    price: 2000,
    durationHours: 24,
    effectData: { multiplier: 2.0 }
  },
  // ... more items
]
```

---

### 1.3 Inventory System

#### Features
- Track all purchased items
- Handle item expiration
- Support stackable items (consumables)
- Support unique items (themes, badges)
- Item activation/deactivation

#### Implementation
- Already covered in Shop System schema
- Functions in `src/utils/inventory.js`:
  - `getUserInventory(userId)`
  - `addItemToInventory(userId, itemId, quantity)`
  - `removeItemFromInventory(userId, itemId, quantity)`
  - `activateItem(userId, itemId)`
  - `deactivateItem(userId, itemId)`
  - `getActiveItems(userId)`
  - `checkItemExpiration()`

---

### 1.4 Trading System

#### Database Schema
```sql
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
```

#### Features
- Create trade offers between users
- Trade items and/or coins
- Trade expiration (24 hours default)
- Trade confirmation system
- Trade history

#### Files to Create:
- `src/utils/trading.js` - Trading logic
- `src/commands/trade.js` - Create/accept/reject trades
- `src/commands/trades.js` - View pending trades
- `src/jobs/tradeExpiration.js` - Handle expired trades

#### Trade Flow
1. User A creates trade offer: `/trade @userB item:xp_boost_1h coins:50`
2. User B receives notification
3. User B can accept/reject: `/trade accept <trade_id>` or `/trade reject <trade_id>`
4. On acceptance:
   - Validate both users have items/coins
   - Transfer items/coins
   - Log to trade history
   - Delete trade offer

---

## 2. Social & Community

### 2.1 Reputation System

#### Database Schema
```sql
-- User reputation
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
```

#### Features
- Give/take reputation points (+1 or -1)
- Cooldown: 24 hours per user pair
- Daily limit: 5 reputation points given per day
- Reputation leaderboard
- Reputation rewards (unlock at certain thresholds)

#### Files to Create:
- `src/utils/reputation.js` - Reputation management
- `src/commands/rep.js` - Give/take reputation
- `src/commands/reputation.js` - View user reputation
- `src/commands/reputation-leaderboard.js` - Reputation leaderboard

#### Reputation Rewards
```javascript
{
  10: { reward: 'badge', badgeId: 'respected' },
  50: { reward: 'title', title: 'Respected Member' },
  100: { reward: 'coins', amount: 500 },
  500: { reward: 'badge', badgeId: 'legendary' }
}
```

---

### 2.2 Guild/Clan System

#### Database Schema
```sql
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
```

#### Features
- Create/join/leave guilds
- Guild levels and experience
- Guild leaderboards (XP, coins, member count)
- Guild roles (leader, officer, member)
- Guild contributions (XP/coins contribute to guild)
- Guild wars/competitions (future)

#### Files to Create:
- `src/utils/guilds.js` - Guild management
- `src/commands/guild.js` - Guild commands (create, join, leave, info)
- `src/commands/guild-leaderboard.js` - Guild leaderboard
- `src/commands/guild-settings.js` - Guild settings (leader only)
- `src/jobs/guildLeaderboard.js` - Update guild leaderboards

#### Guild Contribution System
- Members can contribute XP/coins to guild
- Guild gains experience from contributions
- Guild levels unlock benefits (max members, custom icon, etc.)

---

### 2.3 Friend System

#### Database Schema
```sql
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

-- Friend activity feed (optional, for future)
CREATE TABLE IF NOT EXISTS friend_activity (
    activity_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    activity_type TEXT NOT NULL, -- 'level_up', 'achievement', 'purchase', etc.
    activity_data TEXT, -- JSON string
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);
```

#### Features
- Send friend requests
- Accept/reject friend requests
- View friends list
- See friends' stats
- Block users
- Friend activity feed (optional)

#### Files to Create:
- `src/utils/friends.js` - Friend management
- `src/commands/friend.js` - Friend commands (add, remove, list, stats)
- `src/commands/friends.js` - View friends list with stats

---

### 2.4 Marriage/Partnership System

#### Database Schema
```sql
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
```

#### Features
- Propose partnership/marriage
- Accept/reject proposal
- Shared coin pool
- XP bonus when both partners are active
- Anniversary celebrations
- Divorce system

#### Files to Create:
- `src/utils/partnerships.js` - Partnership management
- `src/commands/marry.js` - Propose/accept marriage
- `src/commands/divorce.js` - End partnership
- `src/commands/partnership.js` - View partnership info
- `src/jobs/partnershipAnniversaries.js` - Handle anniversaries

#### Partnership Bonuses
- **Shared Coins Pool**: Both partners can contribute/withdraw
- **XP Bonus**: 10% XP bonus when both are active in same guild
- **Anniversary Rewards**: Special rewards on monthly anniversaries
- **Couple Badge**: Display on rank cards

---

## 3. Gamification

### 3.1 Quests System

#### Database Schema
```sql
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

-- Quest step definitions (embedded in quests.steps JSON)
-- Example structure:
-- [
--   { step: 1, type: 'send_messages', target: 10, description: 'Send 10 messages' },
--   { step: 2, type: 'earn_xp', target: 500, description: 'Earn 500 XP' },
--   { step: 3, type: 'spend_coins', target: 100, description: 'Spend 100 coins' }
-- ]
```

#### Quest Types

1. **Daily Quests**
   - Reset every 24 hours
   - Simple objectives (send messages, earn XP, etc.)
   - Small rewards

2. **Weekly Quests**
   - Reset every week
   - More complex objectives
   - Better rewards

3. **Story Quests**
   - Multi-step narrative quests
   - Unlock sequentially
   - Large rewards

4. **Event Quests**
   - Seasonal/holiday themed
   - Limited time availability
   - Unique rewards

#### Files to Create:
- `src/utils/quests.js` - Quest management
- `src/commands/quest.js` - View/start quests
- `src/commands/quests.js` - List available quests
- `src/commands/quest-progress.js` - View quest progress
- `src/jobs/questReset.js` - Reset daily/weekly quests
- Modify: `src/events/messageCreate.js` - Update quest progress
- Modify: `src/utils/leveling.js` - Update quest progress on XP gain

#### Example Quest
```javascript
{
  questId: 'daily_messenger',
  name: 'Daily Messenger',
  description: 'Complete daily messaging objectives',
  type: 'daily',
  difficulty: 'easy',
  steps: [
    { step: 1, type: 'send_messages', target: 20, description: 'Send 20 messages' },
    { step: 2, type: 'earn_xp', target: 200, description: 'Earn 200 XP' }
  ],
  rewardCoins: 50,
  rewardXp: 100,
  repeatable: true
}
```

---

### 3.2 Badges/Medals System

#### Database Schema
```sql
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
```

#### Features
- Collectible badges separate from achievements
- Badge categories (achievement, event, purchase, special)
- Rarity system
- Display badges on rank card/profile
- Badge showcase command

#### Files to Create:
- `src/utils/badges.js` - Badge management
- `src/commands/badges.js` - View user badges
- `src/commands/badge-showcase.js` - Showcase badges
- Modify: `src/utils/rankCard.js` - Display badges on rank card

#### Badge Categories
- **Achievement Badges**: Unlocked by completing achievements
- **Event Badges**: Seasonal/holiday events
- **Purchase Badges**: Bought from shop
- **Special Badges**: Admin-granted, milestones, etc.

---

### 3.3 Titles System

#### Database Schema
```sql
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

-- Active user title
ALTER TABLE users ADD COLUMN active_title_id TEXT;
```

#### Features
- Unlockable titles
- Custom titles (purchased or admin-granted)
- Display on rank card
- Title colors
- Title showcase

#### Files to Create:
- `src/utils/titles.js` - Title management
- `src/commands/title.js` - Set active title
- `src/commands/titles.js` - View available titles
- Modify: `src/utils/rankCard.js` - Display title on rank card

#### Title Examples
- Default: "Member", "Active User"
- Achievement: "Level Master", "Voice Legend"
- Purchase: "VIP", "Elite"
- Custom: User-created titles (premium feature)

---

### 3.4 Seasonal Events

#### Database Schema
```sql
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
```

#### Features
- Seasonal/holiday events (Christmas, Halloween, etc.)
- Event-specific quests
- Event-exclusive rewards (badges, titles, items)
- Event leaderboards
- Event shop (temporary items)

#### Files to Create:
- `src/utils/events.js` - Event management
- `src/commands/event.js` - View current events
- `src/commands/event-progress.js` - View event progress
- `src/jobs/eventManager.js` - Handle event start/end

#### Example Event: Christmas 2024
```javascript
{
  eventId: 'christmas_2024',
  name: 'Christmas Celebration 2024',
  description: 'Spread holiday cheer and earn festive rewards!',
  type: 'holiday',
  startDate: 1733011200, // Dec 1, 2024
  endDate: 1735689600, // Dec 31, 2024
  rewards: [
    { rewardId: 'santa_badge', type: 'badge', condition: { quests_completed: 5 } },
    { rewardId: 'snowflake_title', type: 'title', condition: { messages: 100 } }
  ]
}
```

---

### 3.5 Lottery/Raffle System

#### Database Schema
```sql
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
```

#### Features
- Periodic lottery draws (daily, weekly, monthly)
- Purchase tickets with coins
- Prize pool accumulation
- Multiple winners support
- Lottery history

#### Files to Create:
- `src/utils/lottery.js` - Lottery management
- `src/commands/lottery.js` - View current lottery
- `src/commands/lottery-buy.js` - Purchase tickets
- `src/commands/lottery-tickets.js` - View user tickets
- `src/jobs/lotteryDraw.js` - Handle lottery draws

#### Lottery Types
1. **Daily Lottery**: Small prize pool, 1 ticket per user
2. **Weekly Lottery**: Medium prize pool, 10 tickets per user
3. **Monthly Lottery**: Large prize pool, 50 tickets per user
4. **Special Event Lottery**: Event-specific, unique prizes

---

## 4. Implementation Phases

### Phase 1: Economy Foundation (Week 1-2)
- [ ] Currency system implementation
- [ ] Coin earning from messages/voice
- [ ] Balance command
- [ ] Daily bonus command
- [ ] Database schema updates

### Phase 2: Shop System (Week 2-3)
- [ ] Shop items database
- [ ] Shop browsing command
- [ ] Purchase system
- [ ] Inventory system
- [ ] Item activation/expiration

### Phase 3: Trading (Week 3-4)
- [ ] Trading system
- [ ] Trade commands
- [ ] Trade validation
- [ ] Trade history

### Phase 4: Social Features (Week 4-5)
- [ ] Reputation system
- [ ] Friend system
- [ ] Partnership system
- [ ] Social commands

### Phase 5: Guild System (Week 5-6)
- [ ] Guild creation/management
- [ ] Guild leaderboards
- [ ] Guild contributions
- [ ] Guild commands

### Phase 6: Gamification (Week 6-8)
- [ ] Quest system
- [ ] Badges system
- [ ] Titles system
- [ ] Seasonal events framework
- [ ] Lottery system

### Phase 7: Integration & Polish (Week 8-9)
- [ ] Integrate all systems
- [ ] Update rank cards with new features
- [ ] Testing
- [ ] Documentation
- [ ] Performance optimization

---

## 5. Database Migration Strategy

### Migration Script
Create `src/utils/migrate-economy-features.js` to:
1. Add new columns to existing tables
2. Create new tables
3. Migrate existing data if needed
4. Set default values
5. Create indexes

### Backup Strategy
- Backup database before migration
- Test migration on development database
- Rollback plan if migration fails

---

## 6. File Structure

```
src/
├── commands/
│   ├── economy/
│   │   ├── balance.js
│   │   ├── daily.js
│   │   ├── shop.js
│   │   ├── buy.js
│   │   ├── inventory.js
│   │   ├── use.js
│   │   ├── trade.js
│   │   └── trades.js
│   ├── social/
│   │   ├── rep.js
│   │   ├── reputation.js
│   │   ├── friend.js
│   │   ├── friends.js
│   │   ├── marry.js
│   │   ├── divorce.js
│   │   ├── partnership.js
│   │   ├── guild.js
│   │   └── guild-leaderboard.js
│   └── gamification/
│       ├── quest.js
│       ├── quests.js
│       ├── quest-progress.js
│       ├── badges.js
│       ├── badge-showcase.js
│       ├── title.js
│       ├── titles.js
│       ├── event.js
│       ├── event-progress.js
│       ├── lottery.js
│       ├── lottery-buy.js
│       └── lottery-tickets.js
├── utils/
│   ├── economy.js
│   ├── shop.js
│   ├── inventory.js
│   ├── trading.js
│   ├── reputation.js
│   ├── friends.js
│   ├── partnerships.js
│   ├── guilds.js
│   ├── quests.js
│   ├── badges.js
│   ├── titles.js
│   ├── events.js
│   └── lottery.js
├── jobs/
│   ├── itemExpiration.js
│   ├── tradeExpiration.js
│   ├── questReset.js
│   ├── guildLeaderboard.js
│   ├── partnershipAnniversaries.js
│   ├── eventManager.js
│   └── lotteryDraw.js
└── events/
    └── (modify existing events to integrate new features)
```

---

## 7. Technical Considerations

### Performance
- Use database indexes for frequently queried fields
- Cache frequently accessed data (user balances, shop items)
- Batch database operations where possible
- Use transactions for multi-step operations (trades, purchases)

### Security
- Validate all user inputs
- Prevent duplicate transactions
- Rate limiting on coin earning
- Cooldowns on reputation/trades
- Admin-only commands for shop management

### Scalability
- Design for multiple guilds
- Efficient database queries
- Consider pagination for large lists (inventory, friends, etc.)
- Background jobs for periodic tasks

### User Experience
- Clear error messages
- Progress indicators for long operations
- Confirmation dialogs for important actions (trades, purchases)
- Rich embeds for displaying information
- Helpful command descriptions

---

## 8. Testing Strategy

### Unit Tests
- Test economy functions (earn, spend, transfer)
- Test shop purchase logic
- Test trading validation
- Test quest progress tracking

### Integration Tests
- Test full purchase flow
- Test trade completion
- Test quest completion
- Test guild creation/joining

### Manual Testing
- Test all commands
- Test edge cases (insufficient funds, expired items, etc.)
- Test concurrent operations
- Test error handling

---

## 9. Configuration Files

### Economy Settings
`src/config/economy.js`:
```javascript
module.exports = {
  currency: {
    messageCoins: { min: 1, max: 3, cooldown: 60 },
    voiceCoinsPerMinute: 2,
    voiceMaxMinutes: 60,
    // ... more settings
  },
  shop: {
    categories: [...],
    defaultItems: [...]
  }
};
```

### Social Settings
`src/config/social.js`:
```javascript
module.exports = {
  reputation: {
    cooldown: 86400, // 24 hours
    dailyLimit: 5,
    rewards: {...}
  },
  partnerships: {
    xpBonus: 0.1,
    sharedCoinsEnabled: true
  }
};
```

---

## 10. Documentation

### User Documentation
- Command reference
- Feature guides
- FAQ

### Developer Documentation
- API documentation
- Database schema
- Contribution guidelines

---

## Next Steps

1. Review and approve this plan
2. Set up development branch
3. Begin Phase 1 implementation
4. Create database migration script
5. Start with currency system
6. Iterate and test each phase

---

**Last Updated**: 2024-01-XX
**Status**: Planning Phase
**Estimated Completion**: 8-9 weeks

