const { Events } = require('discord.js');

module.exports = {
  name: Events.ClientReady,
  once: true,
  execute(client) {
    console.log(`Ready! Logged in as ${client.user.tag}`);
    
    // Log information about loaded commands
    const commandCount = client.commands.size;
    console.log(`Bot is ready with ${commandCount} commands loaded:`);
    
    // List all commands that were loaded
    client.commands.forEach((command, name) => {
      console.log(`- /${name}: ${command.data.description}`);
    });
    
    // Set bot status
    client.user.setActivity('/help', { type: 'LISTENING' });
  },
}; 