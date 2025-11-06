const { Events, EmbedBuilder } = require('discord.js');
const { awardMessageXp, checkRoleRewards, checkPrestige } = require('../utils/leveling');
const { updateMessageStats } = require('../utils/statistics');
const { initializeDatabase } = require('../utils/database');
const { sendLevelUpNotification, sendAchievementNotification } = require('../utils/notifications');
const logger = require('../utils/logger');

// Initialize database on first load
(async () => {
  try {
    await initializeDatabase();
  } catch (error) {
    logger.error('Error initializing database:', error);
  }
})();

module.exports = {
  name: Events.MessageCreate,
  async execute(message) {
    try {
      // Ignore messages from bots and non-guild messages
      if (!message || !message.author || message.author.bot || !message.guild) return;
      
      // Make sure we can respond to the message
      if (!message.guild.available) return;
      
      // Check if message channel exists and is text-based
      if (!message.channel || !message.channel.isTextBased()) return;

      // Update message statistics
      try {
        await updateMessageStats(message.author.id);
      } catch (statsError) {
        logger.error('Error updating message statistics:', statsError);
      }
      
      // Get guild member for multipliers
      const member = message.member || await message.guild.members.fetch(message.author.id).catch(() => null);
      
      // Award XP for the message
      let levelUpInfo = null;
      try {
        levelUpInfo = await awardMessageXp(message.author.id, message.client, member);
      } catch (xpError) {
        logger.error('Error awarding message XP:', xpError);
        return;
      }
      
      // Check for achievement unlocks (from level up info)
      if (levelUpInfo && levelUpInfo.achievements && levelUpInfo.achievements.length > 0 && member) {
        for (const achievement of levelUpInfo.achievements) {
          try {
            await sendAchievementNotification(message.author, achievement);
          } catch (achievementError) {
            logger.error('Error sending achievement notification:', achievementError);
          }
        }
      }
      
      // Check if user leveled up
      if (levelUpInfo) {
        try {
          // Get guild member
          const member = message.member || await message.guild.members.fetch(message.author.id).catch(() => null);
          
          if (!member) return;
          
          // Check for role rewards
          let roleRewards = [];
          try {
            roleRewards = await checkRoleRewards(member, levelUpInfo.newLevel);
          } catch (roleError) {
            logger.error('Error checking role rewards:', roleError);
          }
          
          // Check for prestige
          let prestigeInfo = null;
          try {
            prestigeInfo = await checkPrestige(member, levelUpInfo.newLevel);
          } catch (prestigeError) {
            logger.error('Error checking prestige:', prestigeError);
          }
          
          // Create level up embed
          const embed = new EmbedBuilder()
            .setColor(0x3498DB)
            .setAuthor({ 
              name: message.author.username, 
              iconURL: message.author.displayAvatarURL() 
            })
            .setTitle('🎉 Level Up!')
            .setDescription(`Congratulations, you've reached level **${levelUpInfo.newLevel}**!`)
            .addFields(
              { name: 'XP', value: `${levelUpInfo.xp.toLocaleString()} / ${levelUpInfo.requiredXp.toLocaleString()}`, inline: true }
            )
            .setTimestamp();
          
          // Add role rewards info if any
          if (roleRewards && roleRewards.length > 0) {
            embed.addFields({
              name: '🏆 Unlocked Roles', 
              value: roleRewards.map(id => `<@&${id}>`).join(', '),
              inline: true
            });
          }
          
          // Add prestige info if achieved
          if (prestigeInfo) {
            const embedColor = prestigeInfo.color || 0x3498DB;
            embed.setColor(embedColor);
            embed.addFields({
              name: '⭐ New Prestige', 
              value: `You've achieved **${prestigeInfo.prestigeName} Prestige**!\nXP Boost: +${Math.floor(prestigeInfo.xpBoost * 100)}%`,
              inline: false
            });
          }
          
          // Add achievements if any
          if (levelUpInfo.achievements && levelUpInfo.achievements.length > 0) {
            const achievementsList = levelUpInfo.achievements.map(a => `${a.icon} **${a.name}**`).join(', ');
            embed.addFields({
              name: '🏆 Achievements Unlocked',
              value: achievementsList,
              inline: false
            });
          }
          
          // Send level up message
          try {
            await message.channel.send({ embeds: [embed] });
          } catch (sendError) {
            logger.error('Error sending level up message:', sendError);
          }
          
          // Send DM notification if enabled
          try {
            await sendLevelUpNotification(message.author, levelUpInfo, roleRewards, prestigeInfo);
          } catch (dmError) {
            // User may have DMs disabled, ignore
          }
        } catch (levelUpError) {
          logger.error('Error handling level up:', levelUpError);
        }
      }
    } catch (error) {
      logger.error('Error processing message for XP:', error);
    }
  },
}; 