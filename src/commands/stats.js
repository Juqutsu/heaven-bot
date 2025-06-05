const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getRecentStats } = require('../utils/statistics');
const { getUserData } = require('../utils/database');
const { updateCommandStats } = require('../utils/statistics');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('stats')
    .setDescription('Shows your activity statistics')
    .addUserOption(option => 
      option
        .setName('user')
        .setDescription('The user to show statistics for (defaults to yourself)')
        .setRequired(false))
    .addIntegerOption(option =>
      option
        .setName('days')
        .setDescription('Number of days to show (default: 7, max: 30)')
        .setMinValue(1)
        .setMaxValue(30)
        .setRequired(false)),
  
  async execute(interaction) {
    await interaction.deferReply();
    
    try {
      // Update command stats
      updateCommandStats(interaction.user.id, 'stats');
      
      // Get target user
      const targetUser = interaction.options.getUser('user') || interaction.user;
      const days = interaction.options.getInteger('days') || 7;
      
      // Get stats
      const recentStats = getRecentStats(targetUser.id, days);
      const userData = getUserData(targetUser.id);
      
      // Create embed
      const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle(`📊 Activity Statistics for ${targetUser.username}`)
        .setDescription(`Statistics for the last ${days} days`)
        .addFields(
          { name: 'Level', value: `${userData.level}`, inline: true },
          { name: 'Total XP', value: `${userData.xp.toLocaleString()}`, inline: true },
          { name: 'Prestige', value: `${userData.prestige || 0}`, inline: true },
          { name: 'Messages Sent', value: `${recentStats.messages.total.toLocaleString()}`, inline: true },
          { name: 'Voice Time', value: `${formatMinutes(recentStats.voice.totalMinutes)}`, inline: true },
          { name: '\u200B', value: '\u200B', inline: true }
        )
        .setTimestamp();
      
      // Add XP breakdown
      const totalXp = userData.xp;
      const textPercent = totalXp > 0 ? Math.round(userData.totalTextXp / totalXp * 100) : 0;
      const voicePercent = totalXp > 0 ? Math.round(userData.totalVoiceXp / totalXp * 100) : 0;

      embed.addFields({
        name: 'XP Breakdown',
        value: `Text XP: ${userData.totalTextXp.toLocaleString()} (${textPercent}%)\nVoice XP: ${userData.totalVoiceXp.toLocaleString()} (${voicePercent}%)`,
        inline: false
      });
      
      // Add daily activity section if there are stats
      if (recentStats.messages.total > 0 || recentStats.voice.totalMinutes > 0) {
        const dailyActivity = formatDailyActivity(recentStats, days);
        
        embed.addFields({
          name: 'Daily Activity',
          value: dailyActivity,
          inline: false
        });
      }
      
      // Send stats
      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error('Error generating statistics:', error);
      await interaction.editReply('There was an error generating the statistics. Please try again later.');
    }
  },
};

/**
 * Format minutes into a readable time string
 * @param {number} minutes - Total minutes
 * @returns {string} Formatted time string
 */
function formatMinutes(minutes) {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (hours < 24) {
    return `${hours}h ${remainingMinutes}m`;
  }
  
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  
  return `${days}d ${remainingHours}h ${remainingMinutes}m`;
}

/**
 * Format daily activity into a readable string
 * @param {Object} recentStats - Recent statistics
 * @param {number} days - Number of days to show
 * @returns {string} Formatted daily activity
 */
function formatDailyActivity(recentStats, days) {
  const today = new Date();
  let result = '';
  
  // Get date objects for the requested days
  const dateObjects = [];
  for (let i = 0; i < days; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    dateObjects.push(date);
  }
  
  // Sort dates in ascending order (oldest first)
  dateObjects.sort((a, b) => a - b);
  
  // Format each day's activity
  for (const date of dateObjects) {
    const dateString = formatDate(date);
    const dayName = new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(date);
    const messages = recentStats.messages.daily[dateString] || 0;
    const voiceMinutes = recentStats.voice.daily[dateString] || 0;
    
    // Skip days with no activity
    if (messages === 0 && voiceMinutes === 0) continue;
    
    result += `**${dayName} ${date.getMonth() + 1}/${date.getDate()}**: `;
    
    if (messages > 0) {
      result += `${messages} msgs`;
    }
    
    if (voiceMinutes > 0) {
      if (messages > 0) result += ', ';
      result += `${formatMinutes(voiceMinutes)} voice`;
    }
    
    result += '\n';
  }
  
  return result.length > 0 ? result : 'No activity in this period.';
}

/**
 * Format a date as YYYY-MM-DD
 * @param {Date} date - Date to format
 * @returns {string} Formatted date
 */
function formatDate(date) {
  return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
} 