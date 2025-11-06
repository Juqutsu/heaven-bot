/**
 * Notification system utilities
 * @module notifications
 */

const { EmbedBuilder } = require('discord.js');
const { getUserNotificationSettings } = require('./database');
const logger = require('./logger');

/**
 * Send DM notification to user
 * @param {Object} user - Discord user object
 * @param {Object} embed - Embed to send
 * @returns {Promise<boolean>} Whether notification was sent
 */
async function sendDMNotification(user, embed) {
  try {
    await user.send({ embeds: [embed] });
    return true;
  } catch (error) {
    // User may have DMs disabled
    logger.debug(`Could not send DM to ${user.id}:`, error.message);
    return false;
  }
}

/**
 * Send level up notification
 * @param {Object} user - Discord user object
 * @param {Object} levelUpInfo - Level up information
 * @param {Array} roleRewards - Role rewards unlocked
 * @param {Object} prestigeInfo - Prestige information (optional)
 * @returns {Promise<boolean>} Whether notification was sent
 */
async function sendLevelUpNotification(user, levelUpInfo, roleRewards = [], prestigeInfo = null) {
  const settings = await getUserNotificationSettings(user.id);
  
  if (!settings.levelUpDm) {
    return false;
  }
  
  const embed = new EmbedBuilder()
    .setColor(0x3498DB)
    .setTitle('🎉 Level Up!')
    .setDescription(`Congratulations, you've reached level **${levelUpInfo.newLevel}**!`)
    .addFields(
      { name: 'XP', value: `${levelUpInfo.xp.toLocaleString()} / ${levelUpInfo.requiredXp.toLocaleString()}`, inline: true }
    )
    .setTimestamp();
  
  if (roleRewards.length > 0) {
    embed.addFields({
      name: '🏆 Unlocked Roles',
      value: roleRewards.map(id => `<@&${id}>`).join(', '),
      inline: true
    });
  }
  
  if (prestigeInfo) {
    embed.addFields({
      name: '⭐ Prestige Unlocked',
      value: `**${prestigeInfo.prestigeName}** Prestige!\n+${(prestigeInfo.xpBoost * 100).toFixed(0)}% XP Boost`,
      inline: false
    });
  }
  
  return await sendDMNotification(user, embed);
}

/**
 * Send achievement unlock notification
 * @param {Object} user - Discord user object
 * @param {Object} achievement - Achievement data
 * @returns {Promise<boolean>} Whether notification was sent
 */
async function sendAchievementNotification(user, achievement) {
  const settings = await getUserNotificationSettings(user.id);
  
  if (!settings.achievementDm) {
    return false;
  }
  
  const embed = new EmbedBuilder()
    .setColor(0xFFD700)
    .setTitle(`${achievement.icon} Achievement Unlocked!`)
    .setDescription(`**${achievement.name}**\n${achievement.description}`)
    .setTimestamp();
  
  if (achievement.rewardXp > 0) {
    embed.addFields({
      name: 'Reward',
      value: `+${achievement.rewardXp.toLocaleString()} XP`,
      inline: true
    });
  }
  
  return await sendDMNotification(user, embed);
}

/**
 * Send challenge completion notification
 * @param {Object} user - Discord user object
 * @param {Object} challenge - Challenge data
 * @returns {Promise<boolean>} Whether notification was sent
 */
async function sendChallengeCompleteNotification(user, challenge) {
  const settings = await getUserNotificationSettings(user.id);
  
  if (!settings.challengeCompleteDm) {
    return false;
  }
  
  const embed = new EmbedBuilder()
    .setColor(0x00FF00)
    .setTitle('✅ Challenge Completed!')
    .setDescription(`**${challenge.name}**\n${challenge.description}`)
    .setTimestamp();
  
  if (challenge.rewardXp > 0) {
    embed.addFields({
      name: 'Reward',
      value: `+${challenge.rewardXp.toLocaleString()} XP`,
      inline: true
    });
  }
  
  return await sendDMNotification(user, embed);
}

module.exports = {
  sendDMNotification,
  sendLevelUpNotification,
  sendAchievementNotification,
  sendChallengeCompleteNotification
};

