const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getUserAchievements, getAllAchievements } = require('../utils/database');
const { getUserAchievementProgress } = require('../utils/achievements');
const { getUserStatistics } = require('../utils/database');
const { getUserData } = require('../utils/database');
const { getUserStreak } = require('../utils/database');
const { updateCommandStats } = require('../utils/statistics');
const logger = require('../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('achievements')
    .setDescription('View your achievements or another user\'s achievements')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('The user to show achievements for (defaults to yourself)')
        .setRequired(false)),
  
  async execute(interaction) {
    await interaction.deferReply();
    
    try {
      // Update command stats
      await updateCommandStats(interaction.user.id, 'achievements');
      
      // Get target user
      const targetUser = interaction.options.getUser('user') || interaction.user;
      
      // Get user data
      const [userData, stats, streak] = await Promise.all([
        getUserData(targetUser.id),
        getUserStatistics(targetUser.id),
        getUserStreak(targetUser.id)
      ]);
      
      // Get achievement progress
      const progress = await getUserAchievementProgress(targetUser.id, {
        messages: stats.messages.total || 0,
        voice: Math.floor((stats.voice.totalMinutes || 0) / 60),
        level: userData.level,
        streak: streak.currentStreak
      });
      
      // Create embed
      const embed = new EmbedBuilder()
        .setColor(0xFFD700)
        .setTitle(`${targetUser.username}'s Achievements`)
        .setThumbnail(targetUser.displayAvatarURL())
        .setTimestamp();
      
      // Add unlocked achievements
      if (progress.unlocked.length > 0) {
        const unlockedList = progress.unlocked.slice(0, 10).map(achievement => {
          return `${achievement.icon} **${achievement.name}** - ${achievement.description}`;
        }).join('\n');
        
        embed.addFields({
          name: `Unlocked (${progress.unlocked.length})`,
          value: unlockedList || 'No achievements unlocked yet.',
          inline: false
        });
      } else {
        embed.addFields({
          name: 'Unlocked (0)',
          value: 'No achievements unlocked yet.',
          inline: false
        });
      }
      
      // Add locked achievements (show progress)
      if (progress.locked.length > 0) {
        const lockedList = progress.locked.slice(0, 5).map(achievement => {
          const percent = Math.min(100, Math.round((achievement.progress / achievement.maxProgress) * 100));
          return `🔒 **${achievement.name}** - ${achievement.progress}/${achievement.maxProgress} (${percent}%)`;
        }).join('\n');
        
        embed.addFields({
          name: `In Progress (${progress.locked.length})`,
          value: lockedList || 'No achievements in progress.',
          inline: false
        });
      }
      
      // Add stats summary
      embed.addFields({
        name: 'Summary',
        value: `**Total Achievements:** ${progress.unlocked.length}/${progress.unlocked.length + progress.locked.length}\n**Completion:** ${Math.round((progress.unlocked.length / (progress.unlocked.length + progress.locked.length)) * 100)}%`,
        inline: true
      });
      
      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      logger.error('Error showing achievements:', error);
      await interaction.editReply('There was an error showing achievements. Please try again later.');
    }
  },
};

