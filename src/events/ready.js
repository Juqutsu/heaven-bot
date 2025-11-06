const { Events } = require('discord.js');
const logger = require('../utils/logger');

module.exports = {
  name: Events.ClientReady,
  once: true,
  execute(client) {
    logger.info(`Ready! Logged in as ${client.user.tag}`);
    
    // Log information about loaded commands
    const commandCount = client.commands.size;
    logger.info(`Bot is ready with ${commandCount} commands loaded:`);
    
    // List all commands that were loaded
    client.commands.forEach((command, name) => {
      logger.info(`- /${name}: ${command.data.description}`);
    });
    
    // Set bot status
    client.user.setActivity('/help', { type: 'LISTENING' });

    // Start giveaway scheduler
    try {
      const { startGiveawayScheduler } = require('../jobs/giveaways');
      startGiveawayScheduler(client);
    } catch (err) {
      logger.error('Failed to start giveaway scheduler:', err);
    }
  },
}; 