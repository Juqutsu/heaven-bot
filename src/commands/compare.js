const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getUserData, getUserStatistics, getUserAchievements, getUserStreak } = require('../utils/database');
const { updateCommandStats } = require('../utils/statistics');
const logger = require('../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('compare')
    .setDescription('Compare stats between two users')
    .addUserOption(option =>
      option
        .setName('user1')
        .setDescription('First user to compare')
        .setRequired(true))
    .addUserOption(option =>
      option
        .setName('user2')
        .setDescription('Second user to compare')
        .setRequired(true)),
  
  async execute(interaction) {
    await interaction.deferReply();
    
    try {
      // Update command stats
      await updateCommandStats(interaction.user.id, 'compare');
      
      const user1 = interaction.options.getUser('user1');
      const user2 = interaction.options.getUser('user2');
      
      if (user1.id === user2.id) {
        await interaction.editReply('You cannot compare a user with themselves!');
        return;
      }
      
      // Get data for both users
      const [user1Data, user1Stats, user1Achievements, user1Streak] = await Promise.all([
        getUserData(user1.id),
        getUserStatistics(user1.id),
        getUserAchievements(user1.id),
        getUserStreak(user1.id)
      ]);
      
      const [user2Data, user2Stats, user2Achievements, user2Streak] = await Promise.all([
        getUserData(user2.id),
        getUserStatistics(user2.id),
        getUserAchievements(user2.id),
        getUserStreak(user2.id)
      ]);
      
      // Helper function to determine winner
      const getWinner = (val1, val2) => {
        if (val1 > val2) return '1️⃣';
        if (val2 > val1) return '2️⃣';
        return '🤝';
      };
      
      // Create embed
      const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle('User Comparison')
        .setTimestamp();
      
      // Level comparison
      const levelWinner = getWinner(user1Data.level, user2Data.level);
      embed.addFields({
        name: 'Level',
        value: `${levelWinner} **${user1.username}**: ${user1Data.level}\n${levelWinner === '1️⃣' ? '2️⃣' : levelWinner === '2️⃣' ? '1️⃣' : '🤝'} **${user2.username}**: ${user2Data.level}`,
        inline: true
      });
      
      // XP comparison
      const xpWinner = getWinner(user1Data.xp, user2Data.xp);
      embed.addFields({
        name: 'Total XP',
        value: `${xpWinner} **${user1.username}**: ${user1Data.xp.toLocaleString()}\n${xpWinner === '1️⃣' ? '2️⃣' : xpWinner === '2️⃣' ? '1️⃣' : '🤝'} **${user2.username}**: ${user2Data.xp.toLocaleString()}`,
        inline: true
      });
      
      // Prestige comparison
      const prestigeWinner = getWinner(user1Data.prestige, user2Data.prestige);
      embed.addFields({
        name: 'Prestige',
        value: `${prestigeWinner} **${user1.username}**: ${user1Data.prestige}\n${prestigeWinner === '1️⃣' ? '2️⃣' : prestigeWinner === '2️⃣' ? '1️⃣' : '🤝'} **${user2.username}**: ${user2Data.prestige}`,
        inline: true
      });
      
      // Messages comparison
      const messages1 = user1Stats.messages.total || 0;
      const messages2 = user2Stats.messages.total || 0;
      const messagesWinner = getWinner(messages1, messages2);
      embed.addFields({
        name: 'Messages',
        value: `${messagesWinner} **${user1.username}**: ${messages1.toLocaleString()}\n${messagesWinner === '1️⃣' ? '2️⃣' : messagesWinner === '2️⃣' ? '1️⃣' : '🤝'} **${user2.username}**: ${messages2.toLocaleString()}`,
        inline: true
      });
      
      // Voice time comparison
      const voice1 = Math.floor((user1Stats.voice.totalMinutes || 0) / 60);
      const voice2 = Math.floor((user2Stats.voice.totalMinutes || 0) / 60);
      const voiceWinner = getWinner(voice1, voice2);
      embed.addFields({
        name: 'Voice Time (hours)',
        value: `${voiceWinner} **${user1.username}**: ${voice1}h\n${voiceWinner === '1️⃣' ? '2️⃣' : voiceWinner === '2️⃣' ? '1️⃣' : '🤝'} **${user2.username}**: ${voice2}h`,
        inline: true
      });
      
      // Achievements comparison
      const achievementsWinner = getWinner(user1Achievements.length, user2Achievements.length);
      embed.addFields({
        name: 'Achievements',
        value: `${achievementsWinner} **${user1.username}**: ${user1Achievements.length}\n${achievementsWinner === '1️⃣' ? '2️⃣' : achievementsWinner === '2️⃣' ? '1️⃣' : '🤝'} **${user2.username}**: ${user2Achievements.length}`,
        inline: true
      });
      
      // Streak comparison
      const streakWinner = getWinner(user1Streak.currentStreak, user2Streak.currentStreak);
      embed.addFields({
        name: 'Current Streak',
        value: `${streakWinner} **${user1.username}**: ${user1Streak.currentStreak} days\n${streakWinner === '1️⃣' ? '2️⃣' : streakWinner === '2️⃣' ? '1️⃣' : '🤝'} **${user2.username}**: ${user2Streak.currentStreak} days`,
        inline: true
      });
      
      // Set thumbnails
      embed.setThumbnail(user1.displayAvatarURL());
      embed.setFooter({ text: `Comparing ${user1.username} vs ${user2.username}`, iconURL: user2.displayAvatarURL() });
      
      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      logger.error('Error comparing users:', error);
      await interaction.editReply('There was an error comparing users. Please try again later.');
    }
  },
};

