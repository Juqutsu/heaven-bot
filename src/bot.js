const { Client, Collection, GatewayIntentBits } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');
require('dotenv').config();
const { deployCommands } = require('./utils/deployCommands');

// Create a new client instance
const client = new Client({ 
  intents: [
    GatewayIntentBits.Guilds,
  ] 
});

// Create a collection for commands
client.commands = new Collection();

// Load event handlers
const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
  const filePath = path.join(eventsPath, file);
  const event = require(filePath);
  if (event.once) {
    client.once(event.name, (...args) => event.execute(...args));
  } else {
    client.on(event.name, (...args) => event.execute(...args));
  }
}

// Load commands
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);
  // Set a new item in the Collection with the key as the command name and the value as the exported module
  if ('data' in command && 'execute' in command) {
    client.commands.set(command.data.name, command);
  } else {
    console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
  }
}

// Deploy commands when bot starts
const { TOKEN, CLIENT_ID, SERVER_ID } = process.env;
if (!TOKEN || !CLIENT_ID || !SERVER_ID) {
  console.error('Missing required environment variables (TOKEN, CLIENT_ID, SERVER_ID)');
  process.exit(1);
}

(async () => {
  try {
    // Deploy commands before bot login
    const deployResult = await deployCommands(TOKEN, CLIENT_ID, SERVER_ID);
    if (!deployResult.success) {
      console.error('Failed to deploy commands:', deployResult.error);
    }
    
    // Log in to Discord with the client's token
    await client.login(TOKEN);
  } catch (error) {
    console.error('Error during startup:', error);
    process.exit(1);
  }
})();
