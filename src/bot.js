const { Client, Collection, GatewayIntentBits, Events, Partials } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');
const { TOKEN, CLIENT_ID, SERVER_ID, DE_INTERNAL_URL, DE_INTERNAL_SECRET } = require('./config');
const { deployCommands } = require('./utils/deployCommands');
const { attachDiscordPresenceForwarder } = require('./utils/discordPresenceForwarder');
const logger = require('./utils/logger');

// Create a new client instance
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildMembers,    // privileged — required for presence partial resolution
    GatewayIntentBits.GuildPresences   // privileged — required for PRESENCE_UPDATE forwarding
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction, Partials.GuildMember, Partials.User]
});

// Forward Discord presence updates to the .de website backend.
// Disables itself with a logged warning if either env var is missing.
attachDiscordPresenceForwarder(client, {
  deUrl: DE_INTERNAL_URL,
  secret: DE_INTERNAL_SECRET,
});

// Create a collection for commands
client.commands = new Collection();

// Global error handler
process.on('uncaughtException', err => {
  logger.error('Uncaught Exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', { promise, reason });
});

// Set up Discord.js error handling
client.on(Events.Error, error => {
  logger.error('Discord client error:', error);
});

client.on(Events.Debug, info => {
  logger.debug('Discord debug:', info);
});

client.on(Events.Warn, warning => {
  logger.warn('Discord warning:', warning);
});

// Load event handlers
const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
  const filePath = path.join(eventsPath, file);
  try {
    const event = require(filePath);
    if (event.once) {
      client.once(event.name, (...args) => {
        try {
          event.execute(...args);
        } catch (error) {
          logger.error(`Error in once event ${event.name}:`, error);
        }
      });
    } else {
      client.on(event.name, (...args) => {
        try {
          event.execute(...args);
        } catch (error) {
          logger.error(`Error in event ${event.name}:`, error);
        }
      });
    }
    logger.info(`Loaded event: ${event.name}`);
  } catch (error) {
    logger.error(`Error loading event file ${file}:`, error);
  }
}

// Load commands
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  try {
    const command = require(filePath);
    // Set a new item in the Collection with the key as the command name and the value as the exported module
    if ('data' in command && 'execute' in command) {
      client.commands.set(command.data.name, command);
      logger.info(`Loaded command: ${command.data.name}`);
    } else {
      logger.warn(`The command at ${filePath} is missing a required "data" or "execute" property.`);
    }
  } catch (error) {
    logger.error(`Error loading command file ${file}:`, error);
  }
}

// Deploy commands when bot starts

(async () => {
  try {
    // Deploy commands before bot login
    logger.info('Deploying commands...');
    const deployResult = await deployCommands(TOKEN, CLIENT_ID, SERVER_ID);
    if (!deployResult.success) {
      logger.error('Failed to deploy commands:', deployResult.error);
    } else {
      logger.info(`Successfully deployed ${deployResult.count} commands`);
    }
    
    // Initialize database
    logger.info('Initializing database...');
    const { initializeDatabase } = require('./utils/database');
    await initializeDatabase();
    logger.info('Database initialized');
    
    // Log in to Discord with the client's token
    logger.info('Logging in to Discord...');
    await client.login(TOKEN);
    logger.info('Bot logged in successfully');
    
    // Set up voice XP timer
    const voiceStateHandler = require('./events/voiceStateUpdate');
    setInterval(async () => {
      try {
        await voiceStateHandler.processActiveVoiceSessions(client);
      } catch (error) {
        logger.error('Error processing voice sessions:', error);
      }
    }, 5 * 60 * 1000); // Process every 5 minutes

    // Set up item expiration scheduler
    const { startItemExpirationScheduler } = require('./jobs/itemExpiration');
    startItemExpirationScheduler();

    // Set up trade expiration scheduler
    const { startTradeExpirationScheduler } = require('./jobs/tradeExpiration');
    startTradeExpirationScheduler();
  } catch (error) {
    logger.error('Error during startup:', error);
    process.exit(1);
  }
})();
