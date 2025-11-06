/**
 * Trading utility functions
 * @module trading
 */

const { getDatabase } = require('./database');
const { getUserBalance, transferCoins, spendCoins, earnCoins } = require('./economy');
const { getUserInventory } = require('./inventory');
const logger = require('./logger');

const TRADE_EXPIRATION_HOURS = 24;

/**
 * Create a new trade offer
 * @param {string} initiatorId - User ID of trade initiator
 * @param {string} recipientId - User ID of trade recipient
 * @param {Array} initiatorItems - Array of {inventoryId, quantity}
 * @param {Array} recipientItems - Array of {inventoryId, quantity} (expected from recipient)
 * @param {number} initiatorCoins - Coins from initiator
 * @param {number} recipientCoins - Coins from recipient (expected)
 * @returns {Promise<Object>} Trade creation result { success: boolean, tradeId: string|null, message: string }
 */
async function createTrade(initiatorId, recipientId, initiatorItems, recipientItems, initiatorCoins = 0, recipientCoins = 0) {
  try {
    const db = getDatabase();
    const now = Math.floor(Date.now() / 1000);
    const expiresAt = now + (TRADE_EXPIRATION_HOURS * 3600);

    // Validate initiator has items and coins
    const initiatorInventory = await getUserInventory(initiatorId, false);
    const initiatorBalance = getUserBalance(initiatorId);

    // Check initiator items
    for (const item of initiatorItems) {
      const invItem = initiatorInventory.find(i => i.inventoryId === item.inventoryId);
      if (!invItem) {
        return { success: false, tradeId: null, message: 'You don\'t have one or more of the items you\'re trying to trade' };
      }
      if (invItem.quantity < item.quantity) {
        return { success: false, tradeId: null, message: `You don't have enough of ${invItem.name} (have ${invItem.quantity}, need ${item.quantity})` };
      }
      if (invItem.isExpired) {
        return { success: false, tradeId: null, message: `One or more of your items has expired` };
      }
    }

    // Check initiator coins
    if (initiatorCoins > initiatorBalance) {
      return { success: false, tradeId: null, message: 'Insufficient coins' };
    }

    // Validate recipient exists (basic check - they should be a user in the system)
    const recipientInventory = await getUserInventory(recipientId, false);
    // Note: We don't validate recipient items/coins here since they haven't accepted yet

    // Create trade
    const tradeId = `trade_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    db.prepare(`
      INSERT INTO trade_offers (
        trade_id, initiator_id, recipient_id,
        initiator_items, recipient_items,
        initiator_coins, recipient_coins,
        status, created_at, expires_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)
    `).run(
      tradeId,
      initiatorId,
      recipientId,
      JSON.stringify(initiatorItems),
      JSON.stringify(recipientItems),
      initiatorCoins,
      recipientCoins,
      now,
      expiresAt
    );

    return { success: true, tradeId, message: 'Trade offer created successfully' };
  } catch (error) {
    logger.error('Error creating trade:', error);
    return { success: false, tradeId: null, message: 'An error occurred while creating the trade' };
  }
}

/**
 * Get trade by ID
 * @param {string} tradeId - Trade ID
 * @returns {Promise<Object|null>} Trade data or null
 */
async function getTrade(tradeId) {
  const db = getDatabase();
  const row = db.prepare('SELECT * FROM trade_offers WHERE trade_id = ?').get(tradeId);

  if (!row) {
    return null;
  }

  return {
    tradeId: row.trade_id,
    initiatorId: row.initiator_id,
    recipientId: row.recipient_id,
    initiatorItems: JSON.parse(row.initiator_items),
    recipientItems: JSON.parse(row.recipient_items),
    initiatorCoins: row.initiator_coins,
    recipientCoins: row.recipient_coins,
    status: row.status,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    completedAt: row.completed_at
  };
}

/**
 * Get pending trades for a user
 * @param {string} userId - User ID
 * @returns {Promise<Array>} Pending trades
 */
async function getPendingTrades(userId) {
  const db = getDatabase();
  const now = Math.floor(Date.now() / 1000);

  const rows = db.prepare(`
    SELECT * FROM trade_offers
    WHERE (initiator_id = ? OR recipient_id = ?)
    AND status = 'pending'
    AND expires_at > ?
    ORDER BY created_at DESC
  `).all(userId, userId, now);

  return rows.map(row => ({
    tradeId: row.trade_id,
    initiatorId: row.initiator_id,
    recipientId: row.recipient_id,
    initiatorItems: JSON.parse(row.initiator_items),
    recipientItems: JSON.parse(row.recipient_items),
    initiatorCoins: row.initiator_coins,
    recipientCoins: row.recipient_coins,
    status: row.status,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    isInitiator: row.initiator_id === userId
  }));
}

/**
 * Validate trade before execution
 * @param {string} tradeId - Trade ID
 * @returns {Promise<Object>} Validation result { valid: boolean, message: string }
 */
async function validateTrade(tradeId) {
  const trade = await getTrade(tradeId);
  if (!trade) {
    return { valid: false, message: 'Trade not found' };
  }

  if (trade.status !== 'pending') {
    return { valid: false, message: 'Trade is not pending' };
  }

  const now = Math.floor(Date.now() / 1000);
  if (trade.expiresAt <= now) {
    return { valid: false, message: 'Trade has expired' };
  }

  // Validate initiator has items and coins
  const initiatorInventory = await getUserInventory(trade.initiatorId, false);
  const initiatorBalance = getUserBalance(trade.initiatorId);

  for (const item of trade.initiatorItems) {
    const invItem = initiatorInventory.find(i => i.inventoryId === item.inventoryId);
    if (!invItem || invItem.quantity < item.quantity || invItem.isExpired) {
      return { valid: false, message: 'Initiator no longer has the required items' };
    }
  }

  if (trade.initiatorCoins > initiatorBalance) {
    return { valid: false, message: 'Initiator no longer has sufficient coins' };
  }

  // Validate recipient has items and coins
  const recipientInventory = await getUserInventory(trade.recipientId, false);
  const recipientBalance = getUserBalance(trade.recipientId);

  for (const item of trade.recipientItems) {
    const invItem = recipientInventory.find(i => i.inventoryId === item.inventoryId);
    if (!invItem || invItem.quantity < item.quantity || invItem.isExpired) {
      return { valid: false, message: 'Recipient no longer has the required items' };
    }
  }

  if (trade.recipientCoins > recipientBalance) {
    return { valid: false, message: 'Recipient no longer has sufficient coins' };
  }

  return { valid: true, message: null };
}

/**
 * Execute trade (transfer items and coins)
 * @param {string} tradeId - Trade ID
 * @returns {Promise<Object>} Execution result { success: boolean, message: string }
 */
async function executeTrade(tradeId) {
  try {
    const validation = await validateTrade(tradeId);
    if (!validation.valid) {
      return { success: false, message: validation.message };
    }

    const trade = await getTrade(tradeId);
    if (!trade) {
      return { success: false, message: 'Trade not found' };
    }

    const db = getDatabase();
    const now = Math.floor(Date.now() / 1000);

    // Execute trade in transaction
    db.transaction(() => {
      // Transfer coins
      if (trade.initiatorCoins > 0) {
        transferCoins(trade.initiatorId, trade.recipientId, trade.initiatorCoins, {
          source: 'trade',
          description: `Trade ${tradeId}`
        });
      }

      if (trade.recipientCoins > 0) {
        transferCoins(trade.recipientId, trade.initiatorId, trade.recipientCoins, {
          source: 'trade',
          description: `Trade ${tradeId}`
        });
      }

      // Transfer items (update inventory ownership)
      for (const item of trade.initiatorItems) {
        db.prepare('UPDATE user_inventory SET user_id = ? WHERE inventory_id = ?')
          .run(trade.recipientId, item.inventoryId);
      }

      for (const item of trade.recipientItems) {
        db.prepare('UPDATE user_inventory SET user_id = ? WHERE inventory_id = ?')
          .run(trade.initiatorId, item.inventoryId);
      }

      // Update trade status
      db.prepare(`
        UPDATE trade_offers
        SET status = 'accepted', completed_at = ?
        WHERE trade_id = ?
      `).run(now, tradeId);

      // Move to trade history
      db.prepare(`
        INSERT INTO trade_history (
          trade_id, initiator_id, recipient_id,
          initiator_items, recipient_items,
          initiator_coins, recipient_coins,
          completed_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        tradeId,
        trade.initiatorId,
        trade.recipientId,
        JSON.stringify(trade.initiatorItems),
        JSON.stringify(trade.recipientItems),
        trade.initiatorCoins,
        trade.recipientCoins,
        now
      );

      // Delete from trade offers
      db.prepare('DELETE FROM trade_offers WHERE trade_id = ?').run(tradeId);
    })();

    return { success: true, message: 'Trade completed successfully' };
  } catch (error) {
    logger.error('Error executing trade:', error);
    return { success: false, message: 'An error occurred while executing the trade' };
  }
}

/**
 * Accept a trade offer
 * @param {string} tradeId - Trade ID
 * @param {string} userId - User ID accepting the trade
 * @returns {Promise<Object>} Acceptance result { success: boolean, message: string }
 */
async function acceptTrade(tradeId, userId) {
  const trade = await getTrade(tradeId);
  if (!trade) {
    return { success: false, message: 'Trade not found' };
  }

  if (trade.recipientId !== userId) {
    return { success: false, message: 'You are not the recipient of this trade' };
  }

  return await executeTrade(tradeId);
}

/**
 * Reject a trade offer
 * @param {string} tradeId - Trade ID
 * @param {string} userId - User ID rejecting the trade
 * @returns {Promise<Object>} Rejection result { success: boolean, message: string }
 */
async function rejectTrade(tradeId, userId) {
  const trade = await getTrade(tradeId);
  if (!trade) {
    return { success: false, message: 'Trade not found' };
  }

  if (trade.recipientId !== userId) {
    return { success: false, message: 'You are not the recipient of this trade' };
  }

  const db = getDatabase();
  db.prepare('UPDATE trade_offers SET status = \'rejected\' WHERE trade_id = ?').run(tradeId);

  return { success: true, message: 'Trade rejected' };
}

/**
 * Cancel a trade offer
 * @param {string} tradeId - Trade ID
 * @param {string} userId - User ID canceling the trade
 * @returns {Promise<Object>} Cancellation result { success: boolean, message: string }
 */
async function cancelTrade(tradeId, userId) {
  const trade = await getTrade(tradeId);
  if (!trade) {
    return { success: false, message: 'Trade not found' };
  }

  if (trade.initiatorId !== userId) {
    return { success: false, message: 'Only the initiator can cancel this trade' };
  }

  const db = getDatabase();
  db.prepare('UPDATE trade_offers SET status = \'cancelled\' WHERE trade_id = ?').run(tradeId);

  return { success: true, message: 'Trade cancelled' };
}

/**
 * Check and expire old trades
 * @returns {Promise<number>} Number of expired trades
 */
async function expireOldTrades() {
  try {
    const db = getDatabase();
    const now = Math.floor(Date.now() / 1000);

    const result = db.prepare(`
      UPDATE trade_offers
      SET status = 'expired'
      WHERE status = 'pending' AND expires_at <= ?
    `).run(now);

    return result.changes;
  } catch (error) {
    logger.error('Error expiring trades:', error);
    return 0;
  }
}

module.exports = {
  createTrade,
  getTrade,
  getPendingTrades,
  validateTrade,
  executeTrade,
  acceptTrade,
  rejectTrade,
  cancelTrade,
  expireOldTrades
};

