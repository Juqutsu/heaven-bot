const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { BUGS_CHANNEL_ID } = require('../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('bug-stats')
    .setDescription('Show statistics about bug reports')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  
  async execute(interaction) {
    try {
      // Get the bug reports channel ID from config
      const bugsChannelId = BUGS_CHANNEL_ID;
      
      if (!bugsChannelId) {
        await interaction.reply({ 
          content: 'Error: The bug reports channel has not been configured. Use `/set-bug-channel` to set it up.',
          ephemeral: true 
        });
        return;
      }
      
      // Get the bug reports channel
      const bugsChannel = await interaction.client.channels.fetch(bugsChannelId);
      
      if (!bugsChannel) {
        await interaction.reply({ 
          content: 'Error: Could not find the bug reports channel. Use `/set-bug-channel` to set it up properly.',
          ephemeral: true 
        });
        return;
      }
      
      await interaction.deferReply({ ephemeral: true });
      
      // Initialize counters
      let totalBugs = 0;
      let underReview = 0;
      let inProgress = 0;
      let fixed = 0;
      let invalid = 0;
      let wontFix = 0;
      
      // Fetch the last 100 messages in the bug channel
      const messages = await bugsChannel.messages.fetch({ limit: 100 });
      
      // Filter to get only bug report embeds
      messages.forEach(message => {
        if (message.embeds.length > 0) {
          const embed = message.embeds[0];
          if (embed.title && embed.title.startsWith('Bug Report:')) {
            totalBugs++;
            
            // Check status field
            const statusField = embed.fields.find(field => field.name === 'Status');
            if (statusField) {
              if (statusField.value.includes('Under Review')) underReview++;
              else if (statusField.value.includes('In Progress')) inProgress++;
              else if (statusField.value.includes('Fixed')) fixed++;
              else if (statusField.value.includes('Invalid')) invalid++;
              else if (statusField.value.includes('Won\'t Fix')) wontFix++;
            }
          }
        }
      });
      
      // Create statistics embed
      const statsEmbed = new EmbedBuilder()
        .setColor(0x3498DB)
        .setTitle('Bug Report Statistics')
        .setDescription(`Statistics for the last ${totalBugs} bug reports:`)
        .addFields(
          { name: 'Total Bug Reports', value: totalBugs.toString(), inline: true },
          { name: 'Under Review', value: `${underReview} (${percentage(underReview, totalBugs)}%)`, inline: true },
          { name: 'In Progress', value: `${inProgress} (${percentage(inProgress, totalBugs)}%)`, inline: true },
          { name: 'Fixed', value: `${fixed} (${percentage(fixed, totalBugs)}%)`, inline: true },
          { name: 'Invalid', value: `${invalid} (${percentage(invalid, totalBugs)}%)`, inline: true },
          { name: 'Won\'t Fix', value: `${wontFix} (${percentage(wontFix, totalBugs)}%)`, inline: true }
        )
        .setFooter({ text: 'Note: Only includes the last 100 bug reports in the channel' })
        .setTimestamp();
      
      await interaction.editReply({ embeds: [statsEmbed] });
    } catch (error) {
      console.error('Error generating bug statistics:', error);
      await interaction.reply({ 
        content: 'There was an error while generating bug statistics. Please try again later.',
        ephemeral: true 
      });
    }
  }
};

// Helper function to calculate percentage
function percentage(part, total) {
  if (total === 0) return 0;
  return Math.round((part / total) * 100);
} 