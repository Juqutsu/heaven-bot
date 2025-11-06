# Feature Plan Summary

Quick reference for planned features implementation.

## 📊 Overview

| Category | Features | Priority | Estimated Time |
|----------|----------|----------|----------------|
| Economy | Currency, Shop, Inventory, Trading | High | 3-4 weeks |
| Social | Reputation, Friends, Partnerships, Guilds | Medium | 2-3 weeks |
| Gamification | Quests, Badges, Titles, Events, Lottery | Medium | 2-3 weeks |

---

## 💰 Economy & Shop System

### Currency System
- **Earning Sources**: Messages (1-3 coins), Voice (2/min), Achievements (10-100), Daily (50), Quests, Lottery
- **Database**: Add `coins` column to `users` table
- **Files**: `src/utils/economy.js`, `src/commands/balance.js`, `src/commands/daily.js`
- **Integration**: Modify `messageCreate.js` and `voiceStateUpdate.js`

### Shop System
- **Item Types**: XP Boosts, Rank Card Themes, Temporary Roles, Badges, Titles
- **Database**: `shop_items`, `user_inventory`, `active_user_items` tables
- **Files**: `src/utils/shop.js`, `src/utils/inventory.js`, `src/commands/shop.js`, `src/commands/buy.js`
- **Jobs**: `src/jobs/itemExpiration.js` for handling expiring items

### Trading System
- **Features**: Trade items/coins between users, 24h expiration, confirmation system
- **Database**: `trade_offers`, `trade_history` tables
- **Files**: `src/utils/trading.js`, `src/commands/trade.js`
- **Jobs**: `src/jobs/tradeExpiration.js`

---

## 👥 Social & Community

### Reputation System
- **Features**: Give/take rep (+1/-1), 24h cooldown per user pair, daily limit (5)
- **Database**: Add `reputation` to `users`, `reputation_transactions`, `reputation_cooldowns`
- **Files**: `src/utils/reputation.js`, `src/commands/rep.js`

### Guild/Clan System
- **Features**: Create/join/leave, levels, leaderboards, contributions
- **Database**: `guilds`, `guild_members`, `guild_leaderboards`
- **Files**: `src/utils/guilds.js`, `src/commands/guild.js`, `src/commands/guild-leaderboard.js`

### Friend System
- **Features**: Friend requests, friends list, view stats, block users
- **Database**: `friendships`, `friend_activity` (optional)
- **Files**: `src/utils/friends.js`, `src/commands/friend.js`

### Marriage/Partnership
- **Features**: Propose/accept, shared coins, XP bonus (10%), anniversaries
- **Database**: `partnerships`, `partnership_events`
- **Files**: `src/utils/partnerships.js`, `src/commands/marry.js`, `src/commands/divorce.js`

---

## 🎮 Gamification

### Quests System
- **Types**: Daily, Weekly, Story, Event
- **Features**: Multi-step quests, progress tracking, rewards
- **Database**: `quests`, `user_quests`
- **Files**: `src/utils/quests.js`, `src/commands/quest.js`, `src/jobs/questReset.js`

### Badges/Medals
- **Categories**: Achievement, Event, Purchase, Special
- **Features**: Collectibles, display on rank card, rarity system
- **Database**: `badges`, `user_badges`, `user_badge_display`
- **Files**: `src/utils/badges.js`, `src/commands/badges.js`

### Titles
- **Types**: Default, Purchase, Achievement, Event, Custom
- **Features**: Display on rank card, colors, customization
- **Database**: `titles`, `user_titles`, add `active_title_id` to `users`
- **Files**: `src/utils/titles.js`, `src/commands/title.js`

### Seasonal Events
- **Features**: Holiday events, exclusive rewards, event quests, leaderboards
- **Database**: `events`, `event_participation`, `event_rewards`
- **Files**: `src/utils/events.js`, `src/commands/event.js`, `src/jobs/eventManager.js`

### Lottery/Raffle
- **Types**: Daily, Weekly, Monthly, Special Event
- **Features**: Ticket purchase, prize pools, multiple winners
- **Database**: `lotteries`, `lottery_tickets`, `lottery_winners`
- **Files**: `src/utils/lottery.js`, `src/commands/lottery.js`, `src/jobs/lotteryDraw.js`

---

## 📁 New File Structure

```
src/
├── commands/
│   ├── economy/        (balance, daily, shop, buy, inventory, use, trade)
│   ├── social/         (rep, reputation, friend, friends, marry, divorce, guild)
│   └── gamification/   (quest, quests, badges, title, titles, event, lottery)
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
└── jobs/
    ├── itemExpiration.js
    ├── tradeExpiration.js
    ├── questReset.js
    ├── guildLeaderboard.js
    ├── partnershipAnniversaries.js
    ├── eventManager.js
    └── lotteryDraw.js
```

---

## 🗄️ Database Schema Additions

### New Tables (15)
1. `currency_transactions` - Transaction log
2. `currency_settings` - Currency config
3. `shop_items` - Shop catalog
4. `user_inventory` - User items
5. `active_user_items` - Active items
6. `shop_categories` - Shop categories
7. `trade_offers` - Trade offers
8. `trade_history` - Trade history
9. `reputation_transactions` - Rep transactions
10. `reputation_cooldowns` - Rep cooldowns
11. `guilds` - Guilds/clans
12. `guild_members` - Guild membership
13. `guild_leaderboards` - Guild leaderboards
14. `friendships` - Friends
15. `partnerships` - Marriages/partnerships
16. `quests` - Quest definitions
17. `user_quests` - User quest progress
18. `badges` - Badge definitions
19. `user_badges` - User badges
20. `user_badge_display` - Badge display settings
21. `titles` - Title definitions
22. `user_titles` - User titles
23. `events` - Event definitions
24. `event_participation` - Event progress
25. `event_rewards` - Event rewards
26. `lotteries` - Lottery draws
27. `lottery_tickets` - Lottery tickets
28. `lottery_winners` - Lottery winners

### Modified Tables
- `users` - Add `coins`, `reputation`, `active_title_id` columns

---

## ⚡ Quick Implementation Checklist

### Phase 1: Economy Foundation
- [ ] Add `coins` column to users table
- [ ] Create `currency_transactions` table
- [ ] Create `currency_settings` table
- [ ] Implement `economy.js` utility
- [ ] Add coin earning to messages
- [ ] Add coin earning to voice
- [ ] Create `balance` command
- [ ] Create `daily` command

### Phase 2: Shop System
- [ ] Create shop tables (`shop_items`, `user_inventory`, `active_user_items`)
- [ ] Implement `shop.js` utility
- [ ] Implement `inventory.js` utility
- [ ] Create `shop` command
- [ ] Create `buy` command
- [ ] Create `inventory` command
- [ ] Create `use` command
- [ ] Create `itemExpiration` job

### Phase 3: Trading
- [ ] Create trade tables
- [ ] Implement `trading.js` utility
- [ ] Create `trade` command
- [ ] Create `trades` command
- [ ] Create `tradeExpiration` job

### Phase 4: Social Features
- [ ] Add `reputation` to users table
- [ ] Create reputation tables
- [ ] Implement `reputation.js` utility
- [ ] Create `rep` command
- [ ] Create friendship tables
- [ ] Implement `friends.js` utility
- [ ] Create `friend` command
- [ ] Create partnership tables
- [ ] Implement `partnerships.js` utility
- [ ] Create `marry` and `divorce` commands

### Phase 5: Guild System
- [ ] Create guild tables
- [ ] Implement `guilds.js` utility
- [ ] Create `guild` command
- [ ] Create `guild-leaderboard` command
- [ ] Create `guildLeaderboard` job

### Phase 6: Gamification
- [ ] Create quest tables
- [ ] Implement `quests.js` utility
- [ ] Create quest commands
- [ ] Create `questReset` job
- [ ] Create badge tables
- [ ] Implement `badges.js` utility
- [ ] Create badge commands
- [ ] Create title tables
- [ ] Implement `titles.js` utility
- [ ] Create title commands
- [ ] Create event tables
- [ ] Implement `events.js` utility
- [ ] Create event commands
- [ ] Create `eventManager` job
- [ ] Create lottery tables
- [ ] Implement `lottery.js` utility
- [ ] Create lottery commands
- [ ] Create `lotteryDraw` job

### Phase 7: Integration
- [ ] Update rank card to show badges/titles
- [ ] Integrate all systems
- [ ] Testing
- [ ] Documentation
- [ ] Performance optimization

---

## 🔧 Key Utilities to Create

1. **economy.js** - Core economy functions (earn, spend, transfer, getBalance)
2. **shop.js** - Shop management (getItems, purchase, validatePurchase)
3. **inventory.js** - Inventory management (getInventory, addItem, removeItem, activateItem)
4. **trading.js** - Trading logic (createTrade, acceptTrade, validateTrade)
5. **reputation.js** - Reputation management (giveRep, takeRep, getReputation)
6. **friends.js** - Friend management (addFriend, removeFriend, getFriends)
7. **partnerships.js** - Partnership management (propose, accept, divorce)
8. **guilds.js** - Guild management (createGuild, joinGuild, contribute)
9. **quests.js** - Quest management (getQuests, updateProgress, completeQuest)
10. **badges.js** - Badge management (unlockBadge, getBadges, setDisplay)
11. **titles.js** - Title management (unlockTitle, setActiveTitle)
12. **events.js** - Event management (getActiveEvents, updateProgress)
13. **lottery.js** - Lottery management (createLottery, buyTickets, drawWinners)

---

## 📝 Notes

- All new features should integrate with existing systems (XP, achievements, etc.)
- Use existing database patterns (better-sqlite3, prepared statements)
- Follow existing code style and structure
- Add proper error handling and validation
- Include rate limiting and cooldowns where appropriate
- Update help command with new commands
- Consider backward compatibility

---

**See FEATURE_PLAN.md for detailed specifications.**

