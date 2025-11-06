/**
 * Reputation utility functions
 * @module reputation
 */

const { getDatabase } = require('./database');
const logger = require('./logger');

const REPUTATION_COOLDOWN = 24 * 60 * 60; // 24 hours in seconds
const DAILY_REP_LIMIT = 5;

/**
 * Get user reputation
 * @param {string} userId - User ID
 * @returns {Promise<number>} User reputation
 */
async function getUserReputation(userId) {
  const db = getDatabase();
  const row = db.prepare('SELECT reputation FROM users WHERE user_id = ?').get(userId);
  return row ? (row.reputation || 0) : 0;
}

/**
 * Check if user can give reputation to another user
 * @param {string} giverId - User ID giving reputation
 * @param {string} receiverId - User ID receiving reputation
 * @returns {Promise<Object>} Validation result { canGive: boolean, reason: string }
 */
async function canGiveReputation(giverId, receiverId) {
  if (giverId === receiverId) {
    return { canGive: false, reason: 'You cannot give reputation to yourself' };
  }

  const db = getDatabase();
  const now = Math.floor(Date.now() / 1000);

  // Check cooldown
  const cooldown = db.prepare(`
    SELECT last_given_at FROM reputation_cooldowns
    WHERE giver_id = ? AND receiver_id = ?
  `).get(giverId, receiverId);

  if (cooldown && (now - cooldown.last_given_at) < REPUTATION_COOLDOWN) {
    const remaining = REPUTATION_COOLDOWN - (now - cooldown.last_given_at);
    const hours = Math.floor(remaining / 3600);
    const minutes = Math.floor((remaining % 3600) / 60);
    return { canGive: false, reason: `You can give reputation to this user again in ${hours}h ${minutes}m` };
  }

  // Check daily limit
  const today = Math.floor(now / 86400) * 86400; // Start of day
  const todayRep = db.prepare(`
    SELECT COUNT(*) as count FROM reputation_transactions
    WHERE giver_id = ? AND created_at >= ?
  `).get(giverId, today);

  if (todayRep.count >= DAILY_REP_LIMIT) {
    return { canGive: false, reason: `You have reached your daily reputation limit (${DAILY_REP_LIMIT})` };
  }

  return { canGive: true, reason: null };
}

/**
 * Give reputation to a user
 * @param {string} giverId - User ID giving reputation
 * @param {string} receiverId - User ID receiving reputation
 * @param {number} amount - Amount (+1 or -1)
 * @param {string} reason - Reason (optional)
 * @returns {Promise<Object>} Result { success: boolean, message: string, newReputation: number }
 */
async function giveReputation(giverId, receiverId, amount, reason = null) {
  try {
    // Validate amount
    if (amount !== 1 && amount !== -1) {
      return { success: false, message: 'Reputation amount must be +1 or -1', newReputation: 0 };
    }

    // Check if can give
    const validation = await canGiveReputation(giverId, receiverId);
    if (!validation.canGive) {
      return { success: false, message: validation.reason, newReputation: 0 };
    }

    const db = getDatabase();
    const now = Math.floor(Date.now() / 1000);

    // Update reputation
    db.prepare('UPDATE users SET reputation = reputation + ?, updated_at = ? WHERE user_id = ?')
      .run(amount, now, receiverId);

    // Log transaction
    const transactionId = `rep_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    db.prepare(`
      INSERT INTO reputation_transactions (transaction_id, giver_id, receiver_id, amount, reason, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(transactionId, giverId, receiverId, amount, reason, now);

    // Update cooldown
    db.prepare(`
      INSERT INTO reputation_cooldowns (giver_id, receiver_id, last_given_at)
      VALUES (?, ?, ?)
      ON CONFLICT(giver_id, receiver_id) DO UPDATE SET last_given_at = excluded.last_given_at
    `).run(giverId, receiverId, now);

    // Get new reputation
    const newReputation = await getUserReputation(receiverId);

    return {
      success: true,
      message: amount > 0 ? 'Reputation given successfully' : 'Reputation taken successfully',
      newReputation
    };
  } catch (error) {
    logger.error('Error giving reputation:', error);
    return { success: false, message: 'An error occurred while giving reputation', newReputation: 0 };
  }
}

/**
 * Get reputation leaderboard
 * @param {number} limit - Number of users to return (default: 10)
 * @returns {Promise<Array>} Leaderboard entries
 */
async function getReputationLeaderboard(limit = 10) {
  const db = getDatabase();
  const rows = db.prepare(`
    SELECT user_id, reputation
    FROM users
    WHERE reputation > 0
    ORDER BY reputation DESC
    LIMIT ?
  `).all(limit);

  return rows.map(row => ({
    userId: row.user_id,
    reputation: row.reputation
  }));
}

/**
 * Get reputation history for a user
 * @param {string} userId - User ID
 * @param {number} limit - Number of transactions to return (default: 10)
 * @returns {Promise<Array>} Reputation transactions
 */
async function getReputationHistory(userId, limit = 10) {
  const db = getDatabase();
  const rows = db.prepare(`
    SELECT * FROM reputation_transactions
    WHERE receiver_id = ?
    ORDER BY created_at DESC
    LIMIT ?
  `).all(userId, limit);

  return rows.map(row => ({
    transactionId: row.transaction_id,
    giverId: row.giver_id,
    receiverId: row.receiver_id,
    amount: row.amount,
    reason: row.reason,
    createdAt: row.created_at
  }));
}

module.exports = {
  getUserReputation,
  canGiveReputation,
  giveReputation,
  getReputationLeaderboard,
  getReputationHistory
};

