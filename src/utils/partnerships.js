/**
 * Partnership/Marriage system utility functions
 * @module partnerships
 */

const { getDatabase } = require('./database');
const logger = require('./logger');

/**
 * Propose partnership/marriage
 * @param {string} proposerId - User ID proposing
 * @param {string} partnerId - User ID being proposed to
 * @returns {Promise<Object>} Result { success: boolean, message: string, partnershipId: string|null }
 */
async function proposePartnership(proposerId, partnerId) {
  try {
    if (proposerId === partnerId) {
      return { success: false, message: 'You cannot propose to yourself', partnershipId: null };
    }

    const db = getDatabase();
    const now = Math.floor(Date.now() / 1000);

    // Check if either user is already in a partnership
    const existing1 = db.prepare(`
      SELECT * FROM partnerships
      WHERE (user1_id = ? OR user2_id = ?) AND status IN ('engaged', 'married')
    `).get(proposerId, proposerId);

    if (existing1) {
      return { success: false, message: 'You are already in a partnership', partnershipId: null };
    }

    const existing2 = db.prepare(`
      SELECT * FROM partnerships
      WHERE (user1_id = ? OR user2_id = ?) AND status IN ('engaged', 'married')
    `).get(partnerId, partnerId);

    if (existing2) {
      return { success: false, message: 'This user is already in a partnership', partnershipId: null };
    }

    // Create partnership proposal
    const partnershipId = `part_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    db.prepare(`
      INSERT INTO partnerships (
        partnership_id, user1_id, user2_id, status, proposed_by, proposed_at
      ) VALUES (?, ?, ?, 'engaged', ?, ?)
    `).run(partnershipId, proposerId, partnerId, proposerId, now);

    return { success: true, message: 'Partnership proposal sent', partnershipId };
  } catch (error) {
    logger.error('Error proposing partnership:', error);
    return { success: false, message: 'An error occurred while proposing partnership', partnershipId: null };
  }
}

/**
 * Accept partnership proposal
 * @param {string} userId - User ID accepting
 * @returns {Promise<Object>} Result { success: boolean, message: string }
 */
async function acceptPartnership(userId) {
  try {
    const db = getDatabase();
    const now = Math.floor(Date.now() / 1000);

    // Find pending proposal
    const proposal = db.prepare(`
      SELECT * FROM partnerships
      WHERE (user1_id = ? OR user2_id = ?) AND status = 'engaged'
      ORDER BY proposed_at DESC
      LIMIT 1
    `).get(userId, userId);

    if (!proposal) {
      return { success: false, message: 'No pending partnership proposal found' };
    }

    if (proposal.proposed_by === userId) {
      return { success: false, message: 'You cannot accept your own proposal' };
    }

    // Accept partnership
    db.prepare(`
      UPDATE partnerships
      SET status = 'married', married_at = ?, shared_xp_bonus = 0.1
      WHERE partnership_id = ?
    `).run(now, proposal.partnership_id);

    // Log event
    const eventId = `event_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    db.prepare(`
      INSERT INTO partnership_events (event_id, partnership_id, event_type, event_data, created_at)
      VALUES (?, ?, 'married', ?, ?)
    `).run(eventId, proposal.partnership_id, JSON.stringify({ marriedAt: now }), now);

    return { success: true, message: 'Partnership accepted! You are now married!' };
  } catch (error) {
    logger.error('Error accepting partnership:', error);
    return { success: false, message: 'An error occurred while accepting partnership' };
  }
}

/**
 * Divorce/end partnership
 * @param {string} userId - User ID requesting divorce
 * @returns {Promise<Object>} Result { success: boolean, message: string }
 */
async function divorcePartnership(userId) {
  try {
    const db = getDatabase();
    const now = Math.floor(Date.now() / 1000);

    // Find active partnership
    const partnership = db.prepare(`
      SELECT * FROM partnerships
      WHERE (user1_id = ? OR user2_id = ?) AND status = 'married'
      LIMIT 1
    `).get(userId, userId);

    if (!partnership) {
      return { success: false, message: 'You are not in a partnership' };
    }

    // End partnership
    db.prepare(`
      UPDATE partnerships
      SET status = 'divorced', divorced_at = ?
      WHERE partnership_id = ?
    `).run(now, partnership.partnership_id);

    // Log event
    const eventId = `event_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    db.prepare(`
      INSERT INTO partnership_events (event_id, partnership_id, event_type, event_data, created_at)
      VALUES (?, ?, 'divorced', ?, ?)
    `).run(eventId, partnership.partnership_id, JSON.stringify({ divorcedAt: now, initiatedBy: userId }), now);

    return { success: true, message: 'Partnership ended' };
  } catch (error) {
    logger.error('Error divorcing partnership:', error);
    return { success: false, message: 'An error occurred while ending partnership' };
  }
}

/**
 * Get user's partnership
 * @param {string} userId - User ID
 * @returns {Promise<Object|null>} Partnership data or null
 */
async function getPartnership(userId) {
  const db = getDatabase();
  const row = db.prepare(`
    SELECT * FROM partnerships
    WHERE (user1_id = ? OR user2_id = ?) AND status IN ('engaged', 'married')
    LIMIT 1
  `).get(userId, userId);

  if (!row) {
    return null;
  }

  return {
    partnershipId: row.partnership_id,
    user1Id: row.user1_id,
    user2Id: row.user2_id,
    status: row.status,
    proposedBy: row.proposed_by,
    proposedAt: row.proposed_at,
    marriedAt: row.married_at,
    divorcedAt: row.divorced_at,
    sharedCoins: row.shared_coins,
    sharedXpBonus: row.shared_xp_bonus
  };
}

/**
 * Contribute coins to shared pool
 * @param {string} userId - User ID
 * @param {number} amount - Amount to contribute
 * @returns {Promise<Object>} Result { success: boolean, message: string }
 */
async function contributeCoins(userId, amount) {
  try {
    const partnership = await getPartnership(userId);
    if (!partnership || partnership.status !== 'married') {
      return { success: false, message: 'You are not in an active partnership' };
    }

    const { getUserBalance, spendCoins } = require('./economy');
    const balance = getUserBalance(userId);
    if (balance < amount) {
      return { success: false, message: 'Insufficient coins' };
    }

    const spent = await spendCoins(userId, amount, 'partnership', {
      description: 'Contributed to shared pool'
    });

    if (!spent) {
      return { success: false, message: 'Failed to contribute coins' };
    }

    const db = getDatabase();
    db.prepare(`
      UPDATE partnerships
      SET shared_coins = shared_coins + ?
      WHERE partnership_id = ?
    `).run(amount, partnership.partnershipId);

    return { success: true, message: `Contributed ${amount.toLocaleString()} coins to shared pool` };
  } catch (error) {
    logger.error('Error contributing coins:', error);
    return { success: false, message: 'An error occurred while contributing coins' };
  }
}

module.exports = {
  proposePartnership,
  acceptPartnership,
  divorcePartnership,
  getPartnership,
  contributeCoins
};

