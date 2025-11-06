const { expireOldTrades } = require('../utils/trading');
const logger = require('../utils/logger');

/**
 * Start the trade expiration scheduler
 * Checks for expired trades every hour
 */
function startTradeExpirationScheduler() {
  const TICK_MS = 60 * 60 * 1000; // Check every hour

  setInterval(async () => {
    try {
      const expired = await expireOldTrades();
      if (expired > 0) {
        logger.info(`Expired ${expired} trade offers`);
      }
    } catch (error) {
      logger.error('Error expiring trades:', error);
    }
  }, TICK_MS);

  logger.info('Trade expiration scheduler started');
}

module.exports = { startTradeExpirationScheduler };

