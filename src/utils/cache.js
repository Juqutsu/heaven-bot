/**
 * Simple TTL-based cache implementation
 * @module cache
 */

class Cache {
  constructor() {
    this.cache = new Map();
    this.timers = new Map();
  }

  /**
   * Set a value in the cache with TTL
   * @param {string} key - Cache key
   * @param {*} value - Value to cache
   * @param {number} ttl - Time to live in milliseconds
   */
  set(key, value, ttl = 300000) { // Default 5 minutes
    // Clear existing timer if any
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key));
    }

    // Set the value
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttl
    });

    // Set timer to auto-delete
    const timer = setTimeout(() => {
      this.delete(key);
    }, ttl);
    this.timers.set(key, timer);
  }

  /**
   * Get a value from the cache
   * @param {string} key - Cache key
   * @returns {*|null} Cached value or null if not found/expired
   */
  get(key) {
    const item = this.cache.get(key);
    if (!item) {
      return null;
    }

    // Check if expired
    if (Date.now() > item.expiresAt) {
      this.delete(key);
      return null;
    }

    return item.value;
  }

  /**
   * Delete a value from the cache
   * @param {string} key - Cache key
   */
  delete(key) {
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key));
      this.timers.delete(key);
    }
    this.cache.delete(key);
  }

  /**
   * Check if a key exists in cache
   * @param {string} key - Cache key
   * @returns {boolean} True if key exists and is not expired
   */
  has(key) {
    const item = this.cache.get(key);
    if (!item) {
      return false;
    }

    if (Date.now() > item.expiresAt) {
      this.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Clear all cache entries
   */
  clear() {
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    this.timers.clear();
    this.cache.clear();
  }

  /**
   * Get cache size
   * @returns {number} Number of entries in cache
   */
  size() {
    return this.cache.size;
  }

  /**
   * Clean up expired entries
   */
  cleanup() {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiresAt) {
        this.delete(key);
      }
    }
  }
}

// Create singleton instances for different cache types
const userCache = new Cache();
const settingsCache = new Cache();

// Cleanup expired entries every 5 minutes
setInterval(() => {
  userCache.cleanup();
  settingsCache.cleanup();
}, 5 * 60 * 1000);

module.exports = {
  userCache,
  settingsCache
};

