const { checkItemExpiration } = require('../utils/inventory');
const logger = require('../utils/logger');

/**
 * Start the item expiration scheduler
 * Checks for expired items every hour
 */
function startItemExpirationScheduler() {
  const TICK_MS = 60 * 60 * 1000; // Check every hour

  setInterval(async () => {
    try {
      const removed = await checkItemExpiration();
      if (removed > 0) {
        logger.info(`Removed ${removed} expired items from inventory`);
      }
    } catch (error) {
      logger.error('Error checking item expiration:', error);
    }
  }, TICK_MS);

  logger.info('Item expiration scheduler started');
}

module.exports = { startItemExpirationScheduler };

