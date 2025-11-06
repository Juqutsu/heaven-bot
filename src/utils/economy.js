/**
 * Economy utility: coins, settings, and transactions
 */

const { getDatabase } = require('./database');
const { settingsCache, userCache } = require('./cache');
const logger = require('./logger');

const CURRENCY_SETTINGS_CACHE_KEY = 'currency_settings';

async function getCurrencySettings() {
  const cached = settingsCache.get(CURRENCY_SETTINGS_CACHE_KEY);
  if (cached) return cached;

  const db = getDatabase();
  const rows = db.prepare('SELECT key, value FROM currency_settings').all();
  const settings = {};
  for (const row of rows) {
    try {
      settings[row.key] = JSON.parse(row.value);
    } catch (e) {
      settings[row.key] = row.value;
    }
  }
  // Defaults if missing
  if (!settings.messageCoins) settings.messageCoins = { min: 1, max: 3, cooldown: 60 };
  if (!settings.voiceCoinsPerMinute) settings.voiceCoinsPerMinute = 2;
  if (!settings.voiceMaxMinutes) settings.voiceMaxMinutes = 60;
  if (!settings.dailyBonus) settings.dailyBonus = 50;

  settingsCache.set(CURRENCY_SETTINGS_CACHE_KEY, settings, 10 * 60 * 1000);
  return settings;
}

async function saveCurrencySettings(settings) {
  const db = getDatabase();
  const now = Math.floor(Date.now() / 1000);
  const insert = db.prepare('INSERT OR REPLACE INTO currency_settings (key, value, updated_at) VALUES (?, ?, ?)');
  const tx = db.transaction((obj) => {
    for (const [key, value] of Object.entries(obj)) {
      insert.run(key, JSON.stringify(value), now);
    }
  });
  tx(settings);
  settingsCache.delete(CURRENCY_SETTINGS_CACHE_KEY);
}

function getUserBalance(userId) {
  const db = getDatabase();
  const row = db.prepare('SELECT coins FROM users WHERE user_id = ?').get(userId);
  if (row) return row.coins || 0;
  return 0;
}

function setUserBalance(userId, coins) {
  const db = getDatabase();
  const now = Math.floor(Date.now() / 1000);
  db.prepare(`
    INSERT INTO users (user_id, coins, updated_at)
    VALUES (?, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET
      coins = excluded.coins,
      updated_at = excluded.updated_at
  `).run(userId, Math.max(0, Math.floor(coins)), now);
}

function logTransaction(userId, amount, type, source, description = null) {
  const db = getDatabase();
  // Ensure user exists in users table (for foreign key constraint)
  db.prepare(`
    INSERT OR IGNORE INTO users (user_id, xp, level, prestige, coins, last_message_timestamp, voice_join_timestamp, total_text_xp, total_voice_xp)
    VALUES (?, 0, 1, 0, 0, 0, 0, 0, 0)
  `).run(userId);
  
  const id = `txn_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  db.prepare(`
    INSERT INTO currency_transactions (transaction_id, user_id, amount, type, source, description)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, userId, amount, type, source, description);
  return id;
}

async function earnCoins(userId, amount, source, options = {}) {
  try {
    const db = getDatabase();
    const delta = Math.max(0, Math.floor(amount || 0));
    if (delta <= 0) return 0;
    const now = Math.floor(Date.now() / 1000);
    
    // Ensure user exists
    db.prepare(`
      INSERT OR IGNORE INTO users (user_id, xp, level, prestige, coins, last_message_timestamp, voice_join_timestamp, total_text_xp, total_voice_xp)
      VALUES (?, 0, 1, 0, 0, 0, 0, 0, 0)
    `).run(userId);
    
    db.prepare('UPDATE users SET coins = coins + ?, updated_at = ? WHERE user_id = ?')
      .run(delta, now, userId);
    logTransaction(userId, delta, 'earn', source, options.description || null);
    return delta;
  } catch (e) {
    logger.error('earnCoins error:', e);
    return 0;
  }
}

async function spendCoins(userId, amount, source, options = {}) {
  const db = getDatabase();
  const cost = Math.max(0, Math.floor(amount || 0));
  if (cost <= 0) return true;
  
  // Ensure user exists
  db.prepare(`
    INSERT OR IGNORE INTO users (user_id, xp, level, prestige, coins, last_message_timestamp, voice_join_timestamp, total_text_xp, total_voice_xp)
    VALUES (?, 0, 1, 0, 0, 0, 0, 0, 0)
  `).run(userId);
  
  const current = getUserBalance(userId);
  if (current < cost) return false;
  const now = Math.floor(Date.now() / 1000);
  db.prepare('UPDATE users SET coins = coins - ?, updated_at = ? WHERE user_id = ?')
    .run(cost, now, userId);
  logTransaction(userId, -cost, 'spend', source, options.description || null);
  return true;
}

async function transferCoins(fromUserId, toUserId, amount, options = {}) {
  const db = getDatabase();
  const value = Math.max(0, Math.floor(amount || 0));
  if (value <= 0) return false;
  
  // Ensure both users exist
  db.prepare(`
    INSERT OR IGNORE INTO users (user_id, xp, level, prestige, coins, last_message_timestamp, voice_join_timestamp, total_text_xp, total_voice_xp)
    VALUES (?, 0, 1, 0, 0, 0, 0, 0, 0)
  `).run(fromUserId);
  db.prepare(`
    INSERT OR IGNORE INTO users (user_id, xp, level, prestige, coins, last_message_timestamp, voice_join_timestamp, total_text_xp, total_voice_xp)
    VALUES (?, 0, 1, 0, 0, 0, 0, 0, 0)
  `).run(toUserId);
  
  const current = getUserBalance(fromUserId);
  if (current < value) return false;
  const now = Math.floor(Date.now() / 1000);
  const tx = db.transaction(() => {
    db.prepare('UPDATE users SET coins = coins - ?, updated_at = ? WHERE user_id = ?')
      .run(value, now, fromUserId);
    db.prepare('UPDATE users SET coins = coins + ?, updated_at = ? WHERE user_id = ?')
      .run(value, now, toUserId);
  });
  tx();
  logTransaction(fromUserId, -value, 'transfer_out', options.source || 'transfer', options.description || null);
  logTransaction(toUserId, value, 'transfer_in', options.source || 'transfer', options.description || null);
  return true;
}

// Message coin cooldown cache
function getMessageCooldownKey(userId) {
  return `msg_coins_cd_${userId}`;
}

function isOnMessageCooldown(userId) {
  return userCache.has(getMessageCooldownKey(userId));
}

function setMessageCooldown(userId, seconds) {
  userCache.set(getMessageCooldownKey(userId), true, seconds * 1000);
}

module.exports = {
  getCurrencySettings,
  saveCurrencySettings,
  getUserBalance,
  setUserBalance,
  earnCoins,
  spendCoins,
  transferCoins,
  logTransaction,
  isOnMessageCooldown,
  setMessageCooldown
};


