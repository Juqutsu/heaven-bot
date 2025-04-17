const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { createInfraction, canModerate } = require('../utils/moderation');
const { updateCommandStats } = require('../utils/statistics');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Ban a user from the server')
    .addUserOption(option => 
      option
        .setName('user')
        .setDescription('The user to ban')
        .setRequired(true))
    .addStringOption(option => 
      option
        .setName('reason')
        .setDescription('The reason for banning')
        .setRequired(true))
    .addStringOption(option => 
      option
        .setName('duration')
        .setDescription('Duration of the ban (e.g. 1h, 1d, 7d) - leave empty for permanent')
        .setRequired(false))
    .addIntegerOption(option =>
      option
        .setName('delete_days')
        .setDescription('Number of days of messages to delete (0-7)')
        .setMinValue(0)
        .setMaxValue(7)
        .setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
  
  async execute(interaction) {
    // Check if the user has permission to ban
    if (!interaction.member.permissions.has(PermissionFlagsBits.BanMembers)) {
      return interaction.reply({ 
        content: 'You do not have permission to use this command.',
        ephemeral: true 
      });
    }
    
    await interaction.deferReply();
    
    try {
      // Update command stats
      updateCommandStats(interaction.user.id, 'ban');
      
      // Get parameters
      const targetUser = interaction.options.getUser('user');
      const reason = interaction.options.getString('reason');
      const durationString = interaction.options.getString('duration');
      const deleteDays = interaction.options.getInteger('delete_days') || 0;
      
      // Parse duration if provided
      let duration = null;
      let durationText = 'permanently';
      
      if (durationString) {
        duration = parseDuration(durationString);
        if (!duration) {
          return interaction.editReply('Invalid duration format. Please use formats like 1h, 1d, 7d, etc.');
        }
        durationText = `for ${formatDuration(duration)}`;
      }
      
      // Cannot ban bots
      if (targetUser.bot) {
        return interaction.editReply('You cannot ban bot users.');
      }
      
      // Cannot ban yourself
      if (targetUser.id === interaction.user.id) {
        return interaction.editReply('You cannot ban yourself.');
      }
      
      // Get guild member
      const targetMember = interaction.guild.members.cache.get(targetUser.id) || 
        await interaction.guild.members.fetch(targetUser.id).catch(() => null);
      
      // Additional checks if user is in the server
      if (targetMember) {
        // Check if target is moderator
        if (canModerate(targetMember)) {
          return interaction.editReply('You cannot ban other moderators.');
        }
        
        // Check if the bot can ban the user
        if (!targetMember.bannable) {
          return interaction.editReply('I cannot ban this user. Check that my role is above theirs.');
        }
      }
      
      // Create ban infraction before banning
      const infraction = await createInfraction(
        targetUser.id,
        'ban',
        reason,
        interaction.user.id,
        duration,
        interaction.client
      );
      
      // Ban the user
      await interaction.guild.members.ban(targetUser.id, { 
        deleteMessageDays: deleteDays,
        reason: reason
      });
      
      // If it's a temporary ban, schedule an unban
      if (duration) {
        // Set timeout to unban
        setTimeout(async () => {
          try {
            // Check if the ban is still active in our database
            const { updateInfractionStatus, getInfractionById } = require('../utils/moderation');
            const infractionData = getInfractionById(infraction.id);
            
            if (infractionData && infractionData.infraction.active) {
              // Unban the user
              await interaction.guild.members.unban(targetUser.id, 'Temporary ban expired');
              
              // Update infraction status
              updateInfractionStatus(infraction.id, false);
              
              // Log the unban
              const logUnban = await createInfraction(
                targetUser.id,
                'unban',
                'Temporary ban expired',
                interaction.client.user.id,
                null,
                interaction.client
              );
            }
          } catch (error) {
            console.error('Error processing temporary ban expiration:', error);
          }
        }, duration);
      }
      
      interaction.editReply(`Successfully banned ${targetUser.tag} ${durationText} for: ${reason}`);
    } catch (error) {
      console.error('Error executing ban command:', error);
      interaction.editReply('There was an error executing the ban command.');
    }
  },
};

/**
 * Parse duration string into milliseconds
 * @param {string} durationString - Duration string (e.g. 1h, 1d, 7d)
 * @returns {number|null} Duration in milliseconds or null if invalid
 */
function parseDuration(durationString) {
  const regex = /^(\d+)([smhdw])$/;
  const match = durationString.match(regex);
  
  if (!match) return null;
  
  const value = parseInt(match[1], 10);
  const unit = match[2];
  
  if (value <= 0) return null;
  
  // Convert to milliseconds
  switch (unit) {
    case 's': return value * 1000; // seconds
    case 'm': return value * 60 * 1000; // minutes
    case 'h': return value * 60 * 60 * 1000; // hours
    case 'd': return value * 24 * 60 * 60 * 1000; // days
    case 'w': return value * 7 * 24 * 60 * 60 * 1000; // weeks
    default: return null;
  }
}

/**
 * Format duration in milliseconds to human-readable string
 * @param {number} duration - Duration in milliseconds
 * @returns {string} Formatted duration
 */
function formatDuration(duration) {
  const seconds = Math.floor(duration / 1000);
  
  if (seconds < 60) {
    return `${seconds} second${seconds === 1 ? '' : 's'}`;
  }
  
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes} minute${minutes === 1 ? '' : 's'}`;
  }
  
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours} hour${hours === 1 ? '' : 's'}`;
  }
  
  const days = Math.floor(hours / 24);
  if (days < 7) {
    return `${days} day${days === 1 ? '' : 's'}`;
  }
  
  const weeks = Math.floor(days / 7);
  return `${weeks} week${weeks === 1 ? '' : 's'}`;
} 