/**
 * Rate limiting utility for commands
 * @module rateLimiter
 */

class RateLimiter {
  constructor() {
    // Map of user ID -> command name -> last used timestamp
    this.commandCooldowns = new Map();
    
    // Default cooldowns in milliseconds
    this.defaultCooldowns = {
      rank: 5000, // 5 seconds
      leaderboard: 10000, // 10 seconds
      stats: 5000, // 5 seconds
      bug: 60000, // 1 minute
      'bug-stats': 30000, // 30 seconds
      ping: 2000, // 2 seconds
      help: 3000, // 3 seconds
      ranks: 5000, // 5 seconds
      prestige: 5000 // 5 seconds
    };
  }

  /**
   * Check if a user can use a command (rate limit check)
   * @param {string} userId - User ID
   * @param {string} commandName - Command name
   * @param {number} cooldownMs - Cooldown in milliseconds (optional, uses default if not provided)
   * @returns {Object} Result with allowed boolean and remainingMs
   */
  checkRateLimit(userId, commandName, cooldownMs = null) {
    const cooldown = cooldownMs || this.defaultCooldowns[commandName] || 5000;
    const now = Date.now();

    // Get user's command cooldowns
    if (!this.commandCooldowns.has(userId)) {
      this.commandCooldowns.set(userId, new Map());
    }

    const userCooldowns = this.commandCooldowns.get(userId);
    const lastUsed = userCooldowns.get(commandName);

    if (!lastUsed) {
      // First time using this command, allow it
      userCooldowns.set(commandName, now);
      return { allowed: true, remainingMs: 0 };
    }

    const timeSinceLastUse = now - lastUsed;

    if (timeSinceLastUse >= cooldown) {
      // Cooldown has passed, allow it
      userCooldowns.set(commandName, now);
      return { allowed: true, remainingMs: 0 };
    }

    // Still on cooldown
    const remainingMs = cooldown - timeSinceLastUse;
    return { allowed: false, remainingMs };
  }

  /**
   * Reset cooldown for a user and command
   * @param {string} userId - User ID
   * @param {string} commandName - Command name
   */
  resetCooldown(userId, commandName) {
    if (this.commandCooldowns.has(userId)) {
      this.commandCooldowns.get(userId).delete(commandName);
    }
  }

  /**
   * Clean up old cooldown entries (call periodically)
   */
  cleanup() {
    const now = Date.now();
    const maxAge = 3600000; // 1 hour

    for (const [userId, userCooldowns] of this.commandCooldowns.entries()) {
      for (const [commandName, lastUsed] of userCooldowns.entries()) {
        if (now - lastUsed > maxAge) {
          userCooldowns.delete(commandName);
        }
      }

      // Remove user entry if no cooldowns left
      if (userCooldowns.size === 0) {
        this.commandCooldowns.delete(userId);
      }
    }
  }
}

// Create singleton instance
const rateLimiter = new RateLimiter();

// Cleanup old entries every 30 minutes
setInterval(() => {
  rateLimiter.cleanup();
}, 30 * 60 * 1000);

module.exports = rateLimiter;

