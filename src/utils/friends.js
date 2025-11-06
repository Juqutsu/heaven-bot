/**
 * Friend system utility functions
 * @module friends
 */

const { getDatabase } = require('./database');
const logger = require('./logger');

/**
 * Send a friend request
 * @param {string} userId - User ID sending request
 * @param {string} friendId - User ID to friend
 * @returns {Promise<Object>} Result { success: boolean, message: string }
 */
async function sendFriendRequest(userId, friendId) {
  try {
    if (userId === friendId) {
      return { success: false, message: 'You cannot friend yourself' };
    }

    const db = getDatabase();
    const now = Math.floor(Date.now() / 1000);

    // Check if friendship already exists
    const existing = db.prepare(`
      SELECT * FROM friendships
      WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)
    `).get(userId, friendId, friendId, userId);

    if (existing) {
      if (existing.status === 'accepted') {
        return { success: false, message: 'You are already friends with this user' };
      }
      if (existing.status === 'pending') {
        if (existing.requested_by === userId) {
          return { success: false, message: 'You already have a pending friend request to this user' };
        } else {
          // Auto-accept if they sent you a request
          return await acceptFriendRequest(friendId, userId);
        }
      }
      if (existing.status === 'blocked') {
        return { success: false, message: 'This user is blocked' };
      }
    }

    // Create friend request (bidirectional)
    db.prepare(`
      INSERT INTO friendships (user_id, friend_id, status, requested_by, created_at)
      VALUES (?, ?, 'pending', ?, ?)
    `).run(userId, friendId, userId, now);

    db.prepare(`
      INSERT INTO friendships (user_id, friend_id, status, requested_by, created_at)
      VALUES (?, ?, 'pending', ?, ?)
    `).run(friendId, userId, userId, now);

    return { success: true, message: 'Friend request sent' };
  } catch (error) {
    logger.error('Error sending friend request:', error);
    return { success: false, message: 'An error occurred while sending friend request' };
  }
}

/**
 * Accept a friend request
 * @param {string} userId - User ID accepting request
 * @param {string} friendId - User ID who sent request
 * @returns {Promise<Object>} Result { success: boolean, message: string }
 */
async function acceptFriendRequest(userId, friendId) {
  try {
    const db = getDatabase();
    const now = Math.floor(Date.now() / 1000);

    // Check if request exists
    const request = db.prepare(`
      SELECT * FROM friendships
      WHERE user_id = ? AND friend_id = ? AND status = 'pending'
    `).get(userId, friendId);

    if (!request) {
      return { success: false, message: 'No pending friend request found' };
    }

    // Accept both sides
    db.prepare(`
      UPDATE friendships
      SET status = 'accepted', accepted_at = ?
      WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)
    `).run(now, userId, friendId, friendId, userId);

    return { success: true, message: 'Friend request accepted' };
  } catch (error) {
    logger.error('Error accepting friend request:', error);
    return { success: false, message: 'An error occurred while accepting friend request' };
  }
}

/**
 * Remove a friend
 * @param {string} userId - User ID removing friend
 * @param {string} friendId - User ID to remove
 * @returns {Promise<Object>} Result { success: boolean, message: string }
 */
async function removeFriend(userId, friendId) {
  try {
    const db = getDatabase();

    // Remove both sides
    db.prepare(`
      DELETE FROM friendships
      WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)
    `).run(userId, friendId, friendId, userId);

    return { success: true, message: 'Friend removed' };
  } catch (error) {
    logger.error('Error removing friend:', error);
    return { success: false, message: 'An error occurred while removing friend' };
  }
}

/**
 * Get user's friends
 * @param {string} userId - User ID
 * @returns {Promise<Array>} List of friend user IDs
 */
async function getFriends(userId) {
  const db = getDatabase();
  const rows = db.prepare(`
    SELECT friend_id FROM friendships
    WHERE user_id = ? AND status = 'accepted'
    ORDER BY accepted_at DESC
  `).all(userId);

  return rows.map(row => row.friend_id);
}

/**
 * Get pending friend requests
 * @param {string} userId - User ID
 * @returns {Promise<Array>} List of pending requests
 */
async function getPendingRequests(userId) {
  const db = getDatabase();
  const rows = db.prepare(`
    SELECT friend_id, requested_by, created_at FROM friendships
    WHERE user_id = ? AND status = 'pending' AND requested_by != ?
    ORDER BY created_at DESC
  `).all(userId, userId);

  return rows.map(row => ({
    friendId: row.friend_id,
    requestedBy: row.requested_by,
    createdAt: row.created_at
  }));
}

/**
 * Get sent friend requests
 * @param {string} userId - User ID
 * @returns {Promise<Array>} List of sent requests
 */
async function getSentRequests(userId) {
  const db = getDatabase();
  const rows = db.prepare(`
    SELECT friend_id, created_at FROM friendships
    WHERE user_id = ? AND status = 'pending' AND requested_by = ?
    ORDER BY created_at DESC
  `).all(userId, userId);

  return rows.map(row => ({
    friendId: row.friend_id,
    createdAt: row.created_at
  }));
}

/**
 * Check if two users are friends
 * @param {string} userId1 - First user ID
 * @param {string} userId2 - Second user ID
 * @returns {Promise<boolean>} True if friends
 */
async function areFriends(userId1, userId2) {
  const db = getDatabase();
  const row = db.prepare(`
    SELECT 1 FROM friendships
    WHERE user_id = ? AND friend_id = ? AND status = 'accepted'
  `).get(userId1, userId2);

  return !!row;
}

module.exports = {
  sendFriendRequest,
  acceptFriendRequest,
  removeFriend,
  getFriends,
  getPendingRequests,
  getSentRequests,
  areFriends
};

