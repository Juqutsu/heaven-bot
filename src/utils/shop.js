/**
 * Shop utility functions
 * @module shop
 */

const { getDatabase } = require('./database');
const { getUserBalance, spendCoins } = require('./economy');
const logger = require('./logger');

/**
 * Get all shop items, optionally filtered by category
 * @param {string|null} category - Category filter (optional)
 * @returns {Promise<Array>} Shop items
 */
async function getShopItems(category = null) {
  const db = getDatabase();
  let query = 'SELECT * FROM shop_items WHERE available = 1';
  const params = [];

  if (category) {
    query += ' AND category = ?';
    params.push(category);
  }

  query += ' ORDER BY category, price ASC';

  const rows = db.prepare(query).all(...params);
  return rows.map(row => ({
    itemId: row.item_id,
    name: row.name,
    description: row.description,
    category: row.category,
    price: row.price,
    currencyType: row.currency_type,
    stock: row.stock,
    maxPurchases: row.max_purchases,
    durationHours: row.duration_hours,
    effectData: row.effect_data ? JSON.parse(row.effect_data) : null,
    icon: row.icon,
    rarity: row.rarity
  }));
}

/**
 * Get shop item by ID
 * @param {string} itemId - Item ID
 * @returns {Promise<Object|null>} Shop item or null
 */
async function getShopItem(itemId) {
  const db = getDatabase();
  const row = db.prepare('SELECT * FROM shop_items WHERE item_id = ? AND available = 1').get(itemId);

  if (!row) {
    return null;
  }

  return {
    itemId: row.item_id,
    name: row.name,
    description: row.description,
    category: row.category,
    price: row.price,
    currencyType: row.currency_type,
    stock: row.stock,
    maxPurchases: row.max_purchases,
    durationHours: row.duration_hours,
    effectData: row.effect_data ? JSON.parse(row.effect_data) : null,
    icon: row.icon,
    rarity: row.rarity
  };
}

/**
 * Get shop categories
 * @returns {Promise<Array>} Shop categories
 */
async function getShopCategories() {
  const db = getDatabase();
  const rows = db.prepare('SELECT * FROM shop_categories ORDER BY display_order ASC').all();
  return rows.map(row => ({
    categoryId: row.category_id,
    name: row.name,
    description: row.description,
    icon: row.icon,
    displayOrder: row.display_order
  }));
}

/**
 * Check if user can purchase an item
 * @param {string} userId - User ID
 * @param {string} itemId - Item ID
 * @returns {Promise<Object>} Validation result { canPurchase: boolean, reason: string }
 */
async function canPurchaseItem(userId, itemId) {
  const item = await getShopItem(itemId);
  if (!item) {
    return { canPurchase: false, reason: 'Item not found or not available' };
  }

  // Check balance
  const balance = getUserBalance(userId);
  if (balance < item.price) {
    return { canPurchase: false, reason: 'Insufficient coins' };
  }

  // Check stock
  if (item.stock !== null && item.stock <= 0) {
    return { canPurchase: false, reason: 'Item out of stock' };
  }

  // Check max purchases per user
  if (item.maxPurchases !== null) {
    const db = getDatabase();
    const purchaseCount = db.prepare(`
      SELECT COUNT(*) as count FROM user_inventory
      WHERE user_id = ? AND item_id = ?
    `).get(userId, itemId);
    if (purchaseCount.count >= item.maxPurchases) {
      return { canPurchase: false, reason: 'Maximum purchases reached for this item' };
    }
  }

  return { canPurchase: true, reason: null };
}

/**
 * Purchase an item
 * @param {string} userId - User ID
 * @param {string} itemId - Item ID
 * @param {number} quantity - Quantity to purchase (default: 1)
 * @returns {Promise<Object>} Purchase result { success: boolean, message: string, inventoryId: string|null }
 */
async function purchaseItem(userId, itemId, quantity = 1) {
  try {
    // Validate purchase
    const validation = await canPurchaseItem(userId, itemId);
    if (!validation.canPurchase) {
      return { success: false, message: validation.reason, inventoryId: null };
    }

    const item = await getShopItem(itemId);
    if (!item) {
      return { success: false, message: 'Item not found', inventoryId: null };
    }

    const totalCost = item.price * quantity;

    // Check balance again
    const balance = getUserBalance(userId);
    if (balance < totalCost) {
      return { success: false, message: 'Insufficient coins', inventoryId: null };
    }

    // Spend coins
    const spent = await spendCoins(userId, totalCost, 'purchase', {
      description: `Purchased ${quantity}x ${item.name}`
    });

    if (!spent) {
      return { success: false, message: 'Failed to process payment', inventoryId: null };
    }

    // Add to inventory
    const db = getDatabase();
    const now = Math.floor(Date.now() / 1000);
    let expiresAt = null;

    if (item.durationHours !== null) {
      expiresAt = now + (item.durationHours * 3600);
    }

    const inventoryIds = [];
    const insertInventory = db.prepare(`
      INSERT INTO user_inventory (inventory_id, user_id, item_id, quantity, purchased_at, expires_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    for (let i = 0; i < quantity; i++) {
      const inventoryId = `inv_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
      insertInventory.run(inventoryId, userId, itemId, 1, now, expiresAt);
      inventoryIds.push(inventoryId);
    }

    // Update stock if applicable
    if (item.stock !== null) {
      const now = Math.floor(Date.now() / 1000);
      db.prepare('UPDATE shop_items SET stock = stock - ?, updated_at = ? WHERE item_id = ?')
        .run(quantity, now, itemId);
    }

    return {
      success: true,
      message: `Successfully purchased ${quantity}x ${item.name}`,
      inventoryIds
    };
  } catch (error) {
    logger.error('Error purchasing item:', error);
    return { success: false, message: 'An error occurred while purchasing the item', inventoryId: null };
  }
}

module.exports = {
  getShopItems,
  getShopItem,
  getShopCategories,
  canPurchaseItem,
  purchaseItem
};

