const dotenv = require('dotenv');
dotenv.config();

/**
 * Validate and require an environment variable
 * @param {string} name - Environment variable name
 * @param {string} description - Description of the variable (for error messages)
 * @returns {string} Environment variable value
 */
function requireEnv(name, description = null) {
  const value = process.env[name];
  if (!value || value.trim() === '') {
    const desc = description ? ` (${description})` : '';
    throw new Error(`Missing required environment variable: ${name}${desc}\n` +
                   `Please add ${name} to your .env file.`);
  }
  return value.trim();
}

/**
 * Validate Discord ID format
 * @param {string} id - ID to validate
 * @param {string} name - Name of the ID (for error messages)
 * @returns {string} Validated ID
 */
function validateDiscordId(id, name) {
  // Discord IDs are 17-19 digit numbers
  if (!/^\d{17,19}$/.test(id)) {
    throw new Error(`Invalid ${name} format. Discord IDs must be 17-19 digit numbers.\n` +
                   `Received: ${id}`);
  }
  return id;
}

/**
 * Validate all configuration values
 */
function validateConfig() {
  const errors = [];

  try {
    const token = requireEnv('TOKEN', 'Discord bot token');
    if (token.length < 50) {
      errors.push('TOKEN appears to be invalid (too short). Discord bot tokens are typically 59+ characters.');
    }
  } catch (error) {
    errors.push(error.message);
  }

  try {
    const clientId = requireEnv('CLIENT_ID', 'Discord application client ID');
    validateDiscordId(clientId, 'CLIENT_ID');
  } catch (error) {
    errors.push(error.message);
  }

  try {
    const serverId = requireEnv('SERVER_ID', 'Discord server/guild ID');
    validateDiscordId(serverId, 'SERVER_ID');
  } catch (error) {
    errors.push(error.message);
  }

  // Optional: Validate BUGS_CHANNEL_ID if provided
  const bugsChannelId = process.env.BUGS_CHANNEL_ID;
  if (bugsChannelId && bugsChannelId.trim() !== '') {
    try {
      validateDiscordId(bugsChannelId.trim(), 'BUGS_CHANNEL_ID');
    } catch (error) {
      errors.push(`BUGS_CHANNEL_ID: ${error.message}`);
    }
  }

  if (errors.length > 0) {
    console.error('\n❌ Configuration Validation Errors:\n');
    errors.forEach((error, index) => {
      console.error(`${index + 1}. ${error}`);
    });
    console.error('\nPlease fix these errors and restart the bot.\n');
    throw new Error('Configuration validation failed');
  }
}

// Validate configuration on load
try {
  validateConfig();
} catch (error) {
  // Error already logged by validateConfig
  process.exit(1);
}

module.exports = {
  TOKEN: requireEnv('TOKEN', 'Discord bot token'),
  CLIENT_ID: requireEnv('CLIENT_ID', 'Discord application client ID'),
  SERVER_ID: requireEnv('SERVER_ID', 'Discord server/guild ID'),
  get BUGS_CHANNEL_ID() {
    const value = process.env.BUGS_CHANNEL_ID;
    if (value && value.trim() !== '') {
      try {
        return validateDiscordId(value.trim(), 'BUGS_CHANNEL_ID');
      } catch (error) {
        console.warn(`Warning: Invalid BUGS_CHANNEL_ID: ${error.message}`);
        return null;
      }
    }
    return null;
  }
};
