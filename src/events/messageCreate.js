const { Events, EmbedBuilder } = require('discord.js');
const { awardMessageXp, checkRoleRewards, checkPrestige } = require('../utils/leveling');
const { updateMessageStats } = require('../utils/statistics');
const { initializeDatabase } = require('../utils/database');

// Initialize database on first load
try {
  initializeDatabase();
} catch (error) {
  console.error('Error initializing database:', error);
}

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
        updateMessageStats(message.author.id);
      } catch (statsError) {
        console.error('Error updating message statistics:', statsError);
      }
      
      // Award XP for the message
      let levelUpInfo = null;
      try {
        levelUpInfo = await awardMessageXp(message.author.id, message.client);
      } catch (xpError) {
        console.error('Error awarding message XP:', xpError);
        return;
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
            console.error('Error checking role rewards:', roleError);
          }
          
          // Check for prestige
          let prestigeInfo = null;
          try {
            prestigeInfo = await checkPrestige(member, levelUpInfo.newLevel);
          } catch (prestigeError) {
            console.error('Error checking prestige:', prestigeError);
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
          
          // Send level up message
          try {
            await message.channel.send({ embeds: [embed] });
          } catch (sendError) {
            console.error('Error sending level up message:', sendError);
          }
        } catch (levelUpError) {
          console.error('Error handling level up:', levelUpError);
        }
      }
    } catch (error) {
      console.error('Error processing message for XP:', error);
    }
  },
}; 