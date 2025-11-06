const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getActiveChallenges, getUserChallengeProgress } = require('../utils/database');
const { getUserChallenges } = require('../utils/challenges');
const { updateCommandStats } = require('../utils/statistics');
const logger = require('../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('challenges')
    .setDescription('View active daily and weekly challenges'),
  
  async execute(interaction) {
    await interaction.deferReply();
    
    try {
      // Update command stats
      await updateCommandStats(interaction.user.id, 'challenges');
      
      // Get user challenges
      const userChallenges = await getUserChallenges(interaction.user.id);
      
      // Separate daily and weekly
      const dailyChallenges = userChallenges.filter(c => c.type === 'daily');
      const weeklyChallenges = userChallenges.filter(c => c.type === 'weekly');
      
      // Create embed
      const embed = new EmbedBuilder()
        .setColor(0x00FF00)
        .setTitle('Active Challenges')
        .setTimestamp();
      
      // Add daily challenges
      if (dailyChallenges.length > 0) {
        const dailyList = dailyChallenges.map(challenge => {
          const percent = Math.min(100, Math.round((challenge.progress / challenge.requirementValue) * 100));
          const status = challenge.completed ? '✅' : '⏳';
          return `${status} **${challenge.name}**\n${challenge.description}\nProgress: ${challenge.progress}/${challenge.requirementValue} (${percent}%)\nReward: +${challenge.rewardXp} XP`;
        }).join('\n\n');
        
        embed.addFields({
          name: '📅 Daily Challenges',
          value: dailyList,
          inline: false
        });
      } else {
        embed.addFields({
          name: '📅 Daily Challenges',
          value: 'No daily challenges available.',
          inline: false
        });
      }
      
      // Add weekly challenges
      if (weeklyChallenges.length > 0) {
        const weeklyList = weeklyChallenges.map(challenge => {
          const percent = Math.min(100, Math.round((challenge.progress / challenge.requirementValue) * 100));
          const status = challenge.completed ? '✅' : '⏳';
          return `${status} **${challenge.name}**\n${challenge.description}\nProgress: ${challenge.progress}/${challenge.requirementValue} (${percent}%)\nReward: +${challenge.rewardXp} XP`;
        }).join('\n\n');
        
        embed.addFields({
          name: '📆 Weekly Challenges',
          value: weeklyList,
          inline: false
        });
      } else {
        embed.addFields({
          name: '📆 Weekly Challenges',
          value: 'No weekly challenges available.',
          inline: false
        });
      }
      
      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      logger.error('Error showing challenges:', error);
      await interaction.editReply('There was an error showing challenges. Please try again later.');
    }
  },
};

