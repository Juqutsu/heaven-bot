const { Events } = require('discord.js');

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction) {
    try {
      // Validate interaction
      if (!interaction || !interaction.client) {
        console.error('Invalid interaction received');
        return;
      }
      
      // Handle slash commands
      if (interaction.isChatInputCommand()) {
        try {
          const command = interaction.client.commands.get(interaction.commandName);

          if (!command) {
            console.error(`No command matching ${interaction.commandName} was found.`);
            return;
          }

          try {
            await command.execute(interaction);
          } catch (error) {
            console.error(`Error executing command ${interaction.commandName}:`, error);
            
            try {
              if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true })
                  .catch(err => console.error('Failed to send followUp error message:', err));
              } else {
                await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true })
                  .catch(err => console.error('Failed to send reply error message:', err));
              }
            } catch (replyError) {
              console.error('Failed to handle command error response:', replyError);
            }
          }
        } catch (commandError) {
          console.error('Error processing command interaction:', commandError);
        }
      }
      // Handle modal submissions
      else if (interaction.isModalSubmit()) {
        try {
          // Handle bug report modal submissions
          if (interaction.customId === 'bugReportModal') {
            try {
              const bugCommand = interaction.client.commands.get('bug');
              if (bugCommand && bugCommand.modalSubmit) {
                await bugCommand.modalSubmit(interaction);
              }
            } catch (error) {
              console.error('Error processing bug report modal submission:', error);
              try {
                if (!interaction.replied && !interaction.deferred) {
                  await interaction.reply({ content: 'There was an error while processing your submission!', ephemeral: true })
                    .catch(err => console.error('Failed to send modal error message:', err));
                }
              } catch (replyError) {
                console.error('Failed to handle modal error response:', replyError);
              }
            }
          }
        } catch (modalError) {
          console.error('Error handling modal submission:', modalError);
        }
      }
      // Handle button interactions
      else if (interaction.isButton()) {
        try {
          // Check if it's a bug report button
          if (interaction.customId && interaction.customId.startsWith('bug_')) {
            try {
              const bugCommand = interaction.client.commands.get('bug');
              if (bugCommand && bugCommand.buttonInteract) {
                await bugCommand.buttonInteract(interaction);
              }
            } catch (error) {
              console.error('Error processing bug report button interaction:', error);
              try {
                if (!interaction.replied && !interaction.deferred) {
                  await interaction.reply({ content: 'There was an error while processing your interaction!', ephemeral: true })
                    .catch(err => console.error('Failed to send button error message:', err));
                }
              } catch (replyError) {
                console.error('Failed to handle button error response:', replyError);
              }
            }
          }
        } catch (buttonError) {
          console.error('Error handling button interaction:', buttonError);
        }
      }
    } catch (error) {
      console.error('Unhandled error in interaction event handler:', error);
    }
  },
}; 