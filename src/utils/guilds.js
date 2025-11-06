/**
 * Guild/Clan system utility functions
 * @module guilds
 */

const { getDatabase } = require('./database');
const logger = require('./logger');

const MAX_GUILD_NAME_LENGTH = 50;
const MAX_GUILD_DESCRIPTION_LENGTH = 200;
const DEFAULT_MAX_MEMBERS = 50;

/**
 * Create a new guild
 * @param {string} leaderId - User ID of guild leader
 * @param {string} name - Guild name
 * @param {string} description - Guild description (optional)
 * @returns {Promise<Object>} Result { success: boolean, message: string, guildId: string|null }
 */
async function createGuild(leaderId, name, description = null) {
  try {
    if (!name || name.trim().length === 0) {
      return { success: false, message: 'Guild name cannot be empty', guildId: null };
    }

    if (name.length > MAX_GUILD_NAME_LENGTH) {
      return { success: false, message: `Guild name must be ${MAX_GUILD_NAME_LENGTH} characters or less`, guildId: null };
    }

    if (description && description.length > MAX_GUILD_DESCRIPTION_LENGTH) {
      return { success: false, message: `Guild description must be ${MAX_GUILD_DESCRIPTION_LENGTH} characters or less`, guildId: null };
    }

    const db = getDatabase();

    // Check if user is already in a guild
    const existing = db.prepare(`
      SELECT * FROM guild_members WHERE user_id = ?
    `).get(leaderId);

    if (existing) {
      return { success: false, message: 'You are already in a guild', guildId: null };
    }

    // Check if guild name already exists
    const nameExists = db.prepare(`
      SELECT 1 FROM guilds WHERE LOWER(name) = LOWER(?)
    `).get(name.trim());

    if (nameExists) {
      return { success: false, message: 'A guild with this name already exists', guildId: null };
    }

    // Create guild
    const guildId = `guild_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    const now = Math.floor(Date.now() / 1000);

    db.prepare(`
      INSERT INTO guilds (
        guild_id, name, description, leader_id, created_at, level, experience, coins, max_members
      ) VALUES (?, ?, ?, ?, ?, 1, 0, 0, ?)
    `).run(guildId, name.trim(), description ? description.trim() : null, leaderId, now, DEFAULT_MAX_MEMBERS);

    // Add leader as member
    db.prepare(`
      INSERT INTO guild_members (guild_id, user_id, role, joined_at)
      VALUES (?, ?, 'leader', ?)
    `).run(guildId, leaderId, now);

    return { success: true, message: 'Guild created successfully', guildId };
  } catch (error) {
    logger.error('Error creating guild:', error);
    return { success: false, message: 'An error occurred while creating guild', guildId: null };
  }
}

/**
 * Join a guild
 * @param {string} userId - User ID joining
 * @param {string} guildId - Guild ID
 * @returns {Promise<Object>} Result { success: boolean, message: string }
 */
async function joinGuild(userId, guildId) {
  try {
    const db = getDatabase();

    // Check if user is already in a guild
    const existing = db.prepare(`
      SELECT * FROM guild_members WHERE user_id = ?
    `).get(userId);

    if (existing) {
      return { success: false, message: 'You are already in a guild' };
    }

    // Check if guild exists and has space
    const guild = db.prepare('SELECT * FROM guilds WHERE guild_id = ?').get(guildId);
    if (!guild) {
      return { success: false, message: 'Guild not found' };
    }

    const memberCount = db.prepare(`
      SELECT COUNT(*) as count FROM guild_members WHERE guild_id = ?
    `).get(guildId);

    if (memberCount.count >= guild.max_members) {
      return { success: false, message: 'Guild is full' };
    }

    // Add member
    const now = Math.floor(Date.now() / 1000);
    db.prepare(`
      INSERT INTO guild_members (guild_id, user_id, role, joined_at)
      VALUES (?, ?, 'member', ?)
    `).run(guildId, userId, now);

    return { success: true, message: 'Joined guild successfully' };
  } catch (error) {
    logger.error('Error joining guild:', error);
    return { success: false, message: 'An error occurred while joining guild' };
  }
}

/**
 * Leave a guild
 * @param {string} userId - User ID leaving
 * @returns {Promise<Object>} Result { success: boolean, message: string }
 */
async function leaveGuild(userId) {
  try {
    const db = getDatabase();

    // Check if user is in a guild
    const membership = db.prepare(`
      SELECT * FROM guild_members WHERE user_id = ?
    `).get(userId);

    if (!membership) {
      return { success: false, message: 'You are not in a guild' };
    }

    // Check if user is leader
    if (membership.role === 'leader') {
      // Check if there are other members
      const memberCount = db.prepare(`
        SELECT COUNT(*) as count FROM guild_members WHERE guild_id = ?
      `).get(membership.guild_id);

      if (memberCount.count > 1) {
        return { success: false, message: 'Guild leader cannot leave. Transfer leadership or disband the guild first' };
      }

      // Delete guild if only leader
      db.prepare('DELETE FROM guilds WHERE guild_id = ?').run(membership.guild_id);
    }

    // Remove member
    db.prepare('DELETE FROM guild_members WHERE guild_id = ? AND user_id = ?').run(membership.guild_id, userId);

    return { success: true, message: 'Left guild successfully' };
  } catch (error) {
    logger.error('Error leaving guild:', error);
    return { success: false, message: 'An error occurred while leaving guild' };
  }
}

/**
 * Get guild information
 * @param {string} guildId - Guild ID
 * @returns {Promise<Object|null>} Guild data or null
 */
async function getGuild(guildId) {
  const db = getDatabase();
  const row = db.prepare('SELECT * FROM guilds WHERE guild_id = ?').get(guildId);

  if (!row) {
    return null;
  }

  const memberCount = db.prepare(`
    SELECT COUNT(*) as count FROM guild_members WHERE guild_id = ?
  `).get(guildId);

  return {
    guildId: row.guild_id,
    name: row.name,
    description: row.description,
    icon: row.icon,
    leaderId: row.leader_id,
    createdAt: row.created_at,
    level: row.level,
    experience: row.experience,
    coins: row.coins,
    maxMembers: row.max_members,
    memberCount: memberCount.count,
    settings: row.settings ? JSON.parse(row.settings) : null
  };
}

/**
 * Get user's guild
 * @param {string} userId - User ID
 * @returns {Promise<Object|null>} Guild data or null
 */
async function getUserGuild(userId) {
  const db = getDatabase();
  const membership = db.prepare(`
    SELECT guild_id FROM guild_members WHERE user_id = ?
  `).get(userId);

  if (!membership) {
    return null;
  }

  return await getGuild(membership.guild_id);
}

/**
 * Get guild members
 * @param {string} guildId - Guild ID
 * @returns {Promise<Array>} List of members
 */
async function getGuildMembers(guildId) {
  const db = getDatabase();
  const rows = db.prepare(`
    SELECT * FROM guild_members
    WHERE guild_id = ?
    ORDER BY
      CASE role
        WHEN 'leader' THEN 1
        WHEN 'officer' THEN 2
        WHEN 'member' THEN 3
      END,
      joined_at ASC
  `).all(guildId);

  return rows.map(row => ({
    userId: row.user_id,
    role: row.role,
    joinedAt: row.joined_at,
    contributionXp: row.contribution_xp,
    contributionCoins: row.contribution_coins
  }));
}

/**
 * Contribute XP/coins to guild
 * @param {string} userId - User ID
 * @param {number} xp - XP to contribute
 * @param {number} coins - Coins to contribute
 * @returns {Promise<Object>} Result { success: boolean, message: string }
 */
async function contributeToGuild(userId, xp = 0, coins = 0) {
  try {
    const guild = await getUserGuild(userId);
    if (!guild) {
      return { success: false, message: 'You are not in a guild' };
    }

    const db = getDatabase();

    // Update member contributions
    if (xp > 0 || coins > 0) {
      db.prepare(`
        UPDATE guild_members
        SET contribution_xp = contribution_xp + ?,
            contribution_coins = contribution_coins + ?
        WHERE guild_id = ? AND user_id = ?
      `).run(xp, coins, guild.guildId, userId);
    }

    // Update guild totals
    if (xp > 0) {
      db.prepare(`
        UPDATE guilds
        SET experience = experience + ?
        WHERE guild_id = ?
      `).run(xp, guild.guildId);
    }

    if (coins > 0) {
      db.prepare(`
        UPDATE guilds
        SET coins = coins + ?
        WHERE guild_id = ?
      `).run(coins, guild.guildId);
    }

    return { success: true, message: 'Contribution recorded' };
  } catch (error) {
    logger.error('Error contributing to guild:', error);
    return { success: false, message: 'An error occurred while contributing' };
  }
}

/**
 * Get guild leaderboard
 * @param {string} periodType - Period type ('daily', 'weekly', 'monthly', 'all_time')
 * @param {number} limit - Number of guilds to return
 * @returns {Promise<Array>} Leaderboard entries
 */
async function getGuildLeaderboard(periodType = 'all_time', limit = 10) {
  const db = getDatabase();
  const periodKey = periodType === 'all_time' ? 'all_time' : Math.floor(Date.now() / 1000).toString();

  const rows = db.prepare(`
    SELECT g.*, gl.total_xp, gl.total_coins, gl.member_count, gl.rank
    FROM guilds g
    LEFT JOIN guild_leaderboards gl ON g.guild_id = gl.guild_id AND gl.period_type = ? AND gl.period_key = ?
    ORDER BY gl.total_xp DESC, gl.total_coins DESC
    LIMIT ?
  `).all(periodType, periodKey, limit);

  return rows.map(row => ({
    guildId: row.guild_id,
    name: row.name,
    level: row.level,
    experience: row.experience || 0,
    coins: row.coins || 0,
    memberCount: row.member_count || 0,
    rank: row.rank
  }));
}

module.exports = {
  createGuild,
  joinGuild,
  leaveGuild,
  getGuild,
  getUserGuild,
  getGuildMembers,
  contributeToGuild,
  getGuildLeaderboard
};

