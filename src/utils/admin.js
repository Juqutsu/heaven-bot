/**
 * Admin utility functions
 * @module admin
 */

const { PermissionFlagsBits } = require('discord.js');

/**
 * Check if a member has admin permissions
 * @param {Object} member - Discord guild member
 * @returns {boolean} True if member is admin
 */
function isAdmin(member) {
  if (!member) {
    return false;
  }

  // Check for Administrator permission
  if (member.permissions.has(PermissionFlagsBits.Administrator)) {
    return true;
  }

  // Check for ManageGuild permission (for moderators)
  if (member.permissions.has(PermissionFlagsBits.ManageGuild)) {
    return true;
  }

  // Check for admin IDs from environment (optional)
  const adminIds = process.env.ADMIN_IDS;
  if (adminIds) {
    const adminIdList = adminIds.split(',').map(id => id.trim());
    if (adminIdList.includes(member.id)) {
      return true;
    }
  }

  return false;
}

module.exports = { isAdmin };

