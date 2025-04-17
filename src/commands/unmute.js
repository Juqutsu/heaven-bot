const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { createInfraction, updateInfractionStatus, getModerationSettings } = require('../utils/moderation');
const { updateCommandStats } = require('../utils/statistics');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unmute')
    .setDescription('Unmute a user')
    .addUserOption(option => 
      option
        .setName('user')
        .setDescription('The user to unmute')
        .setRequired(true))
    .addStringOption(option => 
      option
        .setName('reason')
        .setDescription('The reason for unmuting')
        .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
  
  async execute(interaction) {
    // Check if the user has permission to unmute
    if (!interaction.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
      return interaction.reply({ 
        content: 'You do not have permission to use this command.',
        ephemeral: true 
      });
    }
    
    await interaction.deferReply();
    
    try {
      // Update command stats
      updateCommandStats(interaction.user.id, 'unmute');
      
      // Get target user
      const targetUser = interaction.options.getUser('user');
      const reason = interaction.options.getString('reason');
      
      // Get guild member
      const targetMember = interaction.guild.members.cache.get(targetUser.id) || 
        await interaction.guild.members.fetch(targetUser.id).catch(() => null);
      
      if (!targetMember) {
        return interaction.editReply('User not found in this server.');
      }
      
      // Get mute role ID from settings
      const { autoMuteRole } = getModerationSettings();
      
      // Check if mute role is set up
      if (!autoMuteRole) {
        return interaction.editReply('Mute role is not set up. Please use the /modsettings command to set it up.');
      }
      
      // Check if the user has the mute role
      if (!targetMember.roles.cache.has(autoMuteRole)) {
        return interaction.editReply('This user is not muted.');
      }
      
      // Remove mute role
      await targetMember.roles.remove(autoMuteRole, reason);
      
      // Create unmute infraction
      const infraction = await createInfraction(
        targetUser.id,
        'unmute',
        reason,
        interaction.user.id,
        null,
        interaction.client
      );
      
      // Find any active mute infractions and mark them as inactive
      const allData = require('../utils/moderation').getModerationData();
      if (allData.infractions[targetUser.id]) {
        const userInfractions = allData.infractions[targetUser.id];
        for (const inf of userInfractions) {
          if (inf.type === 'mute' && inf.active) {
            // Mark this mute as inactive
            updateInfractionStatus(inf.id, false);
          }
        }
      }
      
      interaction.editReply(`Successfully unmuted ${targetUser.tag} for: ${reason}`);
    } catch (error) {
      console.error('Error executing unmute command:', error);
      interaction.editReply('There was an error executing the unmute command.');
    }
  },
}; 