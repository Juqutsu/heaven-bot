const { Events } = require('discord.js');

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction) {
    // Handle slash commands
    if (interaction.isChatInputCommand()) {
      const command = interaction.client.commands.get(interaction.commandName);

      if (!command) {
        console.error(`No command matching ${interaction.commandName} was found.`);
        return;
      }

      try {
        await command.execute(interaction);
      } catch (error) {
        console.error(error);
        
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true });
        } else {
          await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
        }
      }
    }
    // Handle modal submissions
    else if (interaction.isModalSubmit()) {
      // Handle bug report modal submissions
      if (interaction.customId === 'bugReportModal') {
        try {
          const bugCommand = interaction.client.commands.get('bug');
          if (bugCommand && bugCommand.modalSubmit) {
            await bugCommand.modalSubmit(interaction);
          }
        } catch (error) {
          console.error('Error processing modal submission:', error);
          if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ content: 'There was an error while processing your submission!', ephemeral: true });
          }
        }
      }
    }
    // Handle button interactions
    else if (interaction.isButton()) {
      try {
        // Check if it's a bug report button
        if (interaction.customId.startsWith('bug_')) {
          const bugCommand = interaction.client.commands.get('bug');
          if (bugCommand && bugCommand.buttonInteract) {
            await bugCommand.buttonInteract(interaction);
          }
        }
      } catch (error) {
        console.error('Error processing button interaction:', error);
        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({ content: 'There was an error while processing your interaction!', ephemeral: true });
        }
      }
    }
  },
}; 