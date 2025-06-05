const { Client, Collection, GatewayIntentBits, Events } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');
const { TOKEN, CLIENT_ID, SERVER_ID } = require('./config');
const { deployCommands } = require('./utils/deployCommands');

// Create a new client instance
const client = new Client({ 
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates
  ] 
});

// Create a collection for commands
client.commands = new Collection();

// Global error handler
process.on('uncaughtException', err => {
  console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Set up Discord.js error handling
client.on(Events.Error, error => {
  console.error('Discord client error:', error);
});

client.on(Events.Debug, info => {
  // Uncomment for debugging
  // console.log('Debug:', info);
});

client.on(Events.Warn, warning => {
  console.warn('Warning:', warning);
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
          console.error(`Error in once event ${event.name}:`, error);
        }
      });
    } else {
      client.on(event.name, (...args) => {
        try {
          event.execute(...args);
        } catch (error) {
          console.error(`Error in event ${event.name}:`, error);
        }
      });
    }
    console.log(`Loaded event: ${event.name}`);
  } catch (error) {
    console.error(`Error loading event file ${file}:`, error);
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
      console.log(`Loaded command: ${command.data.name}`);
    } else {
      console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
    }
  } catch (error) {
    console.error(`Error loading command file ${file}:`, error);
  }
}

// Deploy commands when bot starts

(async () => {
  try {
    // Deploy commands before bot login
    const deployResult = await deployCommands(TOKEN, CLIENT_ID, SERVER_ID);
    if (!deployResult.success) {
      console.error('Failed to deploy commands:', deployResult.error);
    }
    
    // Log in to Discord with the client's token
    await client.login(TOKEN);
    
    // Set up voice XP timer
    const voiceStateHandler = require('./events/voiceStateUpdate');
    setInterval(() => {
      try {
        voiceStateHandler.processActiveVoiceSessions(client);
      } catch (error) {
        console.error('Error processing voice sessions:', error);
      }
    }, 5 * 60 * 1000); // Process every 5 minutes
  } catch (error) {
    console.error('Error during startup:', error);
    process.exit(1);
  }
})();
