const { SlashCommandBuilder, ChannelType, PermissionFlagsBits } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');
require('../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('set-bug-channel')
    .setDescription('Set the channel where bug reports will be sent')
    .addChannelOption(option =>
      option.setName('channel')
        .setDescription('The channel to send bug reports to')
        .setRequired(true)
        .addChannelTypes(ChannelType.GuildText))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  
  async execute(interaction) {
    try {
      const channel = interaction.options.getChannel('channel');

      // Prevent unnecessary writes if the channel is already set
      if (process.env.BUGS_CHANNEL_ID === channel.id) {
        await interaction.reply({
          content: 'This channel is already configured for bug reports.',
          ephemeral: true
        });
        return;
      }
      
      // Check channel permissions
      const botMember = interaction.guild.members.cache.get(interaction.client.user.id);
      
      if (!channel.permissionsFor(botMember).has(['ViewChannel', 'SendMessages', 'EmbedLinks'])) {
        await interaction.reply({
          content: 'I don\'t have permission to send messages in that channel. Please give me the required permissions.',
          ephemeral: true
        });
        return;
      }
      
      // Update the .env file with the new channel ID
      const envFilePath = path.resolve(process.cwd(), '.env');
      let envFileContent = fs.readFileSync(envFilePath, 'utf8');
      
      // Replace or add the BUGS_CHANNEL_ID
      if (envFileContent.includes('BUGS_CHANNEL_ID=')) {
        envFileContent = envFileContent.replace(
          /BUGS_CHANNEL_ID=.*/,
          `BUGS_CHANNEL_ID=${channel.id}`
        );
      } else {
        // If the variable doesn't exist yet, add it after the BOT RELEVANT section
        envFileContent = envFileContent.replace(
          /# BOT RELEVANT\s+/,
          `# BOT RELEVANT\n\nBUGS_CHANNEL_ID=${channel.id}\n`
        );
      }
      
      // Write the updated content back to the .env file
      fs.writeFileSync(envFilePath, envFileContent);
      
      // Update the environment variable in the current process
      process.env.BUGS_CHANNEL_ID = channel.id;
      
      await interaction.reply({
        content: `Successfully set <#${channel.id}> as the bug report channel!`,
        ephemeral: true
      });
      
      // Send a test message to the channel
      await channel.send({
        content: '✅ This channel has been set as the bug reports channel. Bug reports will appear here.'
      });
      
    } catch (error) {
      console.error('Error setting bug channel:', error);
      await interaction.reply({
        content: 'There was an error while setting the bug report channel. Please try again later.',
        ephemeral: true
      });
    }
  }
}; 