const { REST, Routes } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');
const { validatePath } = require('./validation');
const logger = require('./logger');

/**
 * Deploy commands to Discord
 * @param {string} token - Bot token
 * @param {string} clientId - Client ID
 * @param {string} guildId - Guild ID
 * @returns {Promise<Object>} - Deployment result
 */
async function deployCommands(token, clientId, guildId) {
  const commands = [];
  // Grab all the command files from the commands directory
  const commandsPath = path.join(__dirname, '..', 'commands');
  
  // Validate path to prevent directory traversal
  const validatedPath = validatePath(commandsPath, path.join(__dirname, '..'));
  if (!validatedPath) {
    throw new Error('Invalid commands directory path');
  }
  
  const commandFiles = fs.readdirSync(validatedPath).filter(file => file.endsWith('.js'));

  // Grab the SlashCommandBuilder#toJSON() output of each command's data for deployment
  for (const file of commandFiles) {
    const filePath = path.join(validatedPath, file);
    
    // Validate file path
    const validatedFilePath = validatePath(filePath, validatedPath);
    if (!validatedFilePath) {
      logger.warn(`Skipping invalid file path: ${file}`);
      continue;
    }
    
    const command = require(validatedFilePath);
    
    if ('data' in command && 'execute' in command) {
      commands.push(command.data.toJSON());
    } else {
      logger.warn(`The command at ${filePath} is missing a required "data" or "execute" property.`);
    }
  }

  // Construct and prepare an instance of the REST module
  const rest = new REST({ version: '10' }).setToken(token);

  try {
    logger.info(`Started refreshing ${commands.length} application (/) commands.`);

    // The put method is used to fully refresh all commands with the current set
    const data = await rest.put(
      Routes.applicationGuildCommands(clientId, guildId),
      { body: commands },
    );

    logger.info(`Successfully reloaded ${data.length} application (/) commands.`);
    return { success: true, count: data.length };
  } catch (error) {
    logger.error('Error deploying commands:', error);
    return { success: false, error };
  }
}

module.exports = { deployCommands }; 