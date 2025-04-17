const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getLeaderboard } = require('../utils/leveling');
const { getPrestigeSettings } = require('../utils/database');
const { updateCommandStats } = require('../utils/statistics');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('Shows the server rank leaderboard')
    .addIntegerOption(option => 
      option
        .setName('limit')
        .setDescription('Number of users to show (default: 10, max: 25)')
        .setMinValue(5)
        .setMaxValue(25)
        .setRequired(false)),
  
  async execute(interaction) {
    await interaction.deferReply();
    
    try {
      // Update command stats
      updateCommandStats(interaction.user.id, 'leaderboard');
      
      // Get limit
      const limit = interaction.options.getInteger('limit') || 10;
      
      // Get leaderboard data
      const leaderboardData = getLeaderboard(limit);
      
      // Get prestige settings for colors
      const prestigeSettings = getPrestigeSettings();
      
      // Create embed
      const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle('📊 Rank Leaderboard')
        .setDescription(`Top ${limit} users by rank`)
        .setTimestamp();
      
      // No users found
      if (leaderboardData.length === 0) {
        embed.setDescription('No users found in the leaderboard yet.');
        await interaction.editReply({ embeds: [embed] });
        return;
      }
      
      // Get user data and add to embed
      let position = 1;
      let description = '';
      
      for (const data of leaderboardData) {
        try {
          // Get user
          const user = await interaction.client.users.fetch(data.userId).catch(() => null);
          const displayName = user ? user.username : 'Unknown User';
          
          // Get prestige info
          let prestigeDisplay = '';
          if (data.prestige > 0) {
            const prestige = prestigeSettings.prestiges[data.prestige];
            if (prestige) {
              prestigeDisplay = ` ★ ${prestige.name}`;
            }
          }
          
          // Medal for top 3
          let medal = '';
          if (position === 1) medal = '🥇';
          else if (position === 2) medal = '🥈';
          else if (position === 3) medal = '🥉';
          
          // Add to description
          description += `${medal} **#${position}.** ${displayName} - Level ${data.level}${prestigeDisplay} (${data.xp.toLocaleString()} XP)\n`;
          
          position++;
        } catch (error) {
          console.error(`Error processing leaderboard entry for ${data.userId}:`, error);
        }
      }
      
      embed.setDescription(description);
      
      // Send leaderboard
      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error('Error generating leaderboard:', error);
      await interaction.editReply('There was an error generating the leaderboard. Please try again later.');
    }
  },
}; 