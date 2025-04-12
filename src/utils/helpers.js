/**
 * Formats a date into a human-readable string
 * @param {Date} date - The date to format
 * @returns {string} - Formatted date string
 */
function formatDate(date) {
  return new Date(date).toLocaleString();
}

/**
 * Capitalizes the first letter of a string
 * @param {string} string - The string to capitalize
 * @returns {string} - Capitalized string
 */
function capitalize(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

/**
 * Checks if a user has a specific permission
 * @param {import('discord.js').GuildMember} member - The guild member to check
 * @param {string} permission - The permission to check for
 * @returns {boolean} - Whether the user has the permission
 */
function hasPermission(member, permission) {
  return member.permissions.has(permission);
}

module.exports = {
  formatDate,
  capitalize,
  hasPermission
}; 