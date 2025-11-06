/**
 * Inventory utility functions
 * @module inventory
 */

const { getDatabase } = require('./database');
const logger = require('./logger');

/**
 * Get user inventory
 * @param {string} userId - User ID
 * @param {boolean} includeExpired - Include expired items (default: false)
 * @returns {Promise<Array>} User inventory items
 */
async function getUserInventory(userId, includeExpired = false) {
  const db = getDatabase();
  const now = Math.floor(Date.now() / 1000);

  let query = `
    SELECT ui.*, si.name, si.description, si.category, si.icon, si.rarity, si.duration_hours
    FROM user_inventory ui
    INNER JOIN shop_items si ON ui.item_id = si.item_id
    WHERE ui.user_id = ?
  `;

  if (!includeExpired) {
    query += ' AND (ui.expires_at IS NULL OR ui.expires_at > ?)';
  }

  query += ' ORDER BY ui.purchased_at DESC';

  const params = includeExpired ? [userId] : [userId, now];
  const rows = db.prepare(query).all(...params);

  return rows.map(row => ({
    inventoryId: row.inventory_id,
    itemId: row.item_id,
    name: row.name,
    description: row.description,
    category: row.category,
    quantity: row.quantity,
    purchasedAt: row.purchased_at,
    expiresAt: row.expires_at,
    isActive: row.is_active === 1,
    metadata: row.metadata ? JSON.parse(row.metadata) : null,
    icon: row.icon,
    rarity: row.rarity,
    durationHours: row.duration_hours,
    isExpired: row.expires_at !== null && row.expires_at <= now
  }));
}

/**
 * Get active items for a user
 * @param {string} userId - User ID
 * @returns {Promise<Array>} Active items
 */
async function getActiveItems(userId) {
  const db = getDatabase();
  const now = Math.floor(Date.now() / 1000);

  const rows = db.prepare(`
    SELECT aui.*, si.name, si.description, si.category, si.icon, si.rarity
    FROM active_user_items aui
    INNER JOIN shop_items si ON aui.item_id = si.item_id
    WHERE aui.user_id = ? AND aui.expires_at > ?
    ORDER BY aui.activated_at DESC
  `).all(userId, now);

  return rows.map(row => ({
    itemId: row.item_id,
    name: row.name,
    description: row.description,
    category: row.category,
    activatedAt: row.activated_at,
    expiresAt: row.expires_at,
    metadata: row.metadata ? JSON.parse(row.metadata) : null,
    icon: row.icon,
    rarity: row.rarity
  }));
}

/**
 * Activate an item from inventory
 * @param {string} userId - User ID
 * @param {string} inventoryId - Inventory ID
 * @returns {Promise<Object>} Activation result { success: boolean, message: string }
 */
async function activateItem(userId, inventoryId) {
  try {
    const db = getDatabase();
    const now = Math.floor(Date.now() / 1000);

    // Get inventory item
    const inventoryItem = db.prepare(`
      SELECT ui.*, si.duration_hours, si.effect_data
      FROM user_inventory ui
      INNER JOIN shop_items si ON ui.item_id = si.item_id
      WHERE ui.inventory_id = ? AND ui.user_id = ?
    `).get(inventoryId, userId);

    if (!inventoryItem) {
      return { success: false, message: 'Item not found in your inventory' };
    }

    // Check if expired
    if (inventoryItem.expires_at !== null && inventoryItem.expires_at <= now) {
      return { success: false, message: 'This item has expired' };
    }

    // Check if already active
    const activeItem = db.prepare(`
      SELECT * FROM active_user_items
      WHERE user_id = ? AND item_id = ? AND expires_at > ?
    `).get(userId, inventoryItem.item_id, now);

    if (activeItem) {
      return { success: false, message: 'You already have this item active' };
    }

    // Calculate expiration
    let expiresAt = now;
    if (inventoryItem.duration_hours !== null) {
      expiresAt = now + (inventoryItem.duration_hours * 3600);
    } else {
      // Permanent items don't expire
      expiresAt = now + (365 * 24 * 60 * 60); // 1 year as placeholder
    }

    // Activate item
    db.prepare(`
      INSERT INTO active_user_items (user_id, item_id, activated_at, expires_at, metadata)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      userId,
      inventoryItem.item_id,
      now,
      expiresAt,
      inventoryItem.effect_data || null
    );

    // Remove from inventory (consumable)
    db.prepare('DELETE FROM user_inventory WHERE inventory_id = ?').run(inventoryId);

    return { success: true, message: 'Item activated successfully' };
  } catch (error) {
    logger.error('Error activating item:', error);
    return { success: false, message: 'An error occurred while activating the item' };
  }
}

/**
 * Check and remove expired items
 * @returns {Promise<number>} Number of expired items removed
 */
async function checkItemExpiration() {
  try {
    const db = getDatabase();
    const now = Math.floor(Date.now() / 1000);

    // Remove expired inventory items
    const expiredInventory = db.prepare(`
      DELETE FROM user_inventory
      WHERE expires_at IS NOT NULL AND expires_at <= ?
    `).run(now);

    // Remove expired active items
    const expiredActive = db.prepare(`
      DELETE FROM active_user_items
      WHERE expires_at <= ?
    `).run(now);

    return expiredInventory.changes + expiredActive.changes;
  } catch (error) {
    logger.error('Error checking item expiration:', error);
    return 0;
  }
}

/**
 * Get user's active XP boost multiplier
 * @param {string} userId - User ID
 * @returns {Promise<number>} XP boost multiplier (1.0 = no boost)
 */
async function getActiveXpBoost(userId) {
  try {
    const activeItems = await getActiveItems(userId);
    let multiplier = 1.0;

    for (const item of activeItems) {
      if (item.category === 'xp_boost' && item.metadata && item.metadata.multiplier) {
        multiplier = Math.max(multiplier, item.metadata.multiplier);
      }
    }

    return multiplier;
  } catch (error) {
    logger.error('Error getting active XP boost:', error);
    return 1.0;
  }
}

module.exports = {
  getUserInventory,
  getActiveItems,
  activateItem,
  checkItemExpiration,
  getActiveXpBoost
};

