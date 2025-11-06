const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getAllUsers, getDatabase } = require('../utils/database');
const { updateCommandStats } = require('../utils/statistics');
const logger = require('../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('server-stats')
    .setDescription('View server-wide statistics'),
  
  async execute(interaction) {
    await interaction.deferReply();
    
    try {
      // Update command stats
      await updateCommandStats(interaction.user.id, 'server-stats');
      
      const database = getDatabase();
      
      // Get all users
      const allUsers = await getAllUsers();
      const userIds = Object.keys(allUsers);
      
      if (userIds.length === 0) {
        await interaction.editReply('No users found in the database.');
        return;
      }
      
      // Calculate aggregate stats
      let totalXp = 0;
      let totalLevel = 0;
      let totalPrestige = 0;
      let totalMessages = 0;
      let totalVoiceMinutes = 0;
      let maxLevel = 0;
      let maxXp = 0;
      let topUser = null;
      
      for (const userId of userIds) {
        const userData = allUsers[userId];
        totalXp += userData.xp;
        totalLevel += userData.level;
        totalPrestige += userData.prestige;
        
        if (userData.level > maxLevel) {
          maxLevel = userData.level;
        }
        
        if (userData.xp > maxXp) {
          maxXp = userData.xp;
          topUser = userId;
        }
        
        // Get statistics
        const stats = database.prepare(`
          SELECT value FROM statistics 
          WHERE user_id = ? AND stat_type = ? AND period_type = ? AND period_key = ?
        `).get(userId, 'messages', 'total', 'total');
        
        if (stats) {
          totalMessages += stats.value;
        }
        
        const voiceStats = database.prepare(`
          SELECT value FROM statistics 
          WHERE user_id = ? AND stat_type = ? AND period_type = ? AND period_key = ?
        `).get(userId, 'voice', 'total', 'total');
        
        if (voiceStats) {
          totalVoiceMinutes += voiceStats.value;
        }
      }
      
      const avgLevel = Math.round(totalLevel / userIds.length);
      const avgXp = Math.round(totalXp / userIds.length);
      const totalVoiceHours = Math.floor(totalVoiceMinutes / 60);
      
      // Get top users
      const topUsers = database.prepare(`
        SELECT user_id, xp, level, prestige 
        FROM users 
        ORDER BY prestige DESC, level DESC, xp DESC 
        LIMIT 5
      `).all();
      
      // Create embed
      const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle('📊 Server Statistics')
        .setThumbnail(interaction.guild.iconURL())
        .setTimestamp();
      
      // Overall stats
      embed.addFields({
        name: 'Overall Statistics',
        value: `**Total Users:** ${userIds.length}\n**Total XP:** ${totalXp.toLocaleString()}\n**Total Messages:** ${totalMessages.toLocaleString()}\n**Total Voice Time:** ${totalVoiceHours}h ${totalVoiceMinutes % 60}m`,
        inline: true
      });
      
      embed.addFields({
        name: 'Averages',
        value: `**Average Level:** ${avgLevel}\n**Average XP:** ${avgXp.toLocaleString()}\n**Highest Level:** ${maxLevel}\n**Highest XP:** ${maxXp.toLocaleString()}`,
        inline: true
      });
      
      // Top users
      let topUsersList = '';
      for (let i = 0; i < topUsers.length; i++) {
        const user = topUsers[i];
        try {
          const discordUser = await interaction.client.users.fetch(user.user_id);
          const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
          topUsersList += `${medal} ${discordUser.username} - Level ${user.level} (${user.xp.toLocaleString()} XP)\n`;
        } catch (error) {
          // User not found, skip
        }
      }
      
      if (topUsersList) {
        embed.addFields({
          name: 'Top 5 Users',
          value: topUsersList,
          inline: false
        });
      }
      
      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      logger.error('Error showing server stats:', error);
      await interaction.editReply('There was an error showing server statistics. Please try again later.');
    }
  },
};

