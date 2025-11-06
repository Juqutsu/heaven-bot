/**
 * Input validation and sanitization utilities
 * @module validation
 */

/**
 * Sanitize a string by removing potentially dangerous characters
 * @param {string} input - Input string to sanitize
 * @param {number} maxLength - Maximum length (default: 1000)
 * @returns {string} Sanitized string
 */
function sanitizeString(input, maxLength = 1000) {
  if (typeof input !== 'string') {
    return '';
  }

  // Remove null bytes and control characters (except newlines and tabs)
  let sanitized = input.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '');

  // Trim whitespace
  sanitized = sanitized.trim();

  // Limit length
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }

  return sanitized;
}

/**
 * Validate and sanitize user ID
 * @param {string} userId - User ID to validate
 * @returns {string|null} Validated user ID or null if invalid
 */
function validateUserId(userId) {
  if (typeof userId !== 'string') {
    return null;
  }

  // Discord user IDs are 17-19 digit numbers
  if (!/^\d{17,19}$/.test(userId)) {
    return null;
  }

  return userId;
}

/**
 * Validate and sanitize channel ID
 * @param {string} channelId - Channel ID to validate
 * @returns {string|null} Validated channel ID or null if invalid
 */
function validateChannelId(channelId) {
  if (typeof channelId !== 'string') {
    return null;
  }

  // Discord channel IDs are 17-19 digit numbers
  if (!/^\d{17,19}$/.test(channelId)) {
    return null;
  }

  return channelId;
}

/**
 * Validate and sanitize role ID
 * @param {string} roleId - Role ID to validate
 * @returns {string|null} Validated role ID or null if invalid
 */
function validateRoleId(roleId) {
  if (typeof roleId !== 'string') {
    return null;
  }

  // Discord role IDs are 17-19 digit numbers
  if (!/^\d{17,19}$/.test(roleId)) {
    return null;
  }

  return roleId;
}

/**
 * Validate integer within range
 * @param {number} value - Value to validate
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number|null} Validated number or null if invalid
 */
function validateInteger(value, min = Number.MIN_SAFE_INTEGER, max = Number.MAX_SAFE_INTEGER) {
  if (typeof value !== 'number' || !Number.isInteger(value)) {
    return null;
  }

  if (value < min || value > max) {
    return null;
  }

  return value;
}

/**
 * Validate hex color code
 * @param {string} color - Color code to validate
 * @returns {string|null} Validated color code or null if invalid
 */
function validateHexColor(color) {
  if (typeof color !== 'string') {
    return null;
  }

  // Must be # followed by 6 hex digits
  if (!/^#[0-9A-Fa-f]{6}$/.test(color)) {
    return null;
  }

  return color.toUpperCase();
}

/**
 * Validate path to prevent directory traversal
 * @param {string} filePath - File path to validate
 * @param {string} baseDir - Base directory to restrict to
 * @returns {string|null} Validated path or null if invalid
 */
function validatePath(filePath, baseDir) {
  const path = require('node:path');
  
  if (typeof filePath !== 'string') {
    return null;
  }

  // Resolve to absolute path
  const resolvedPath = path.resolve(baseDir, filePath);
  const resolvedBase = path.resolve(baseDir);

  // Check if resolved path is within base directory
  if (!resolvedPath.startsWith(resolvedBase)) {
    return null;
  }

  // Check for directory traversal attempts
  if (filePath.includes('..') || filePath.includes('~')) {
    return null;
  }

  return resolvedPath;
}

/**
 * Validate bug report content
 * @param {string} title - Bug title
 * @param {string} description - Bug description
 * @param {string} steps - Steps to reproduce
 * @returns {Object} Validation result with isValid and sanitized fields
 */
function validateBugReport(title, description, steps) {
  const sanitizedTitle = sanitizeString(title || '', 100);
  const sanitizedDescription = sanitizeString(description || '', 1000);
  const sanitizedSteps = sanitizeString(steps || '', 1000);

  const isValid = 
    sanitizedTitle.length >= 5 &&
    sanitizedTitle.length <= 100 &&
    sanitizedDescription.length >= 10 &&
    sanitizedDescription.length <= 1000 &&
    sanitizedSteps.length <= 1000;

  return {
    isValid,
    title: sanitizedTitle,
    description: sanitizedDescription,
    steps: sanitizedSteps
  };
}

module.exports = {
  sanitizeString,
  validateUserId,
  validateChannelId,
  validateRoleId,
  validateInteger,
  validateHexColor,
  validatePath,
  validateBugReport
};

