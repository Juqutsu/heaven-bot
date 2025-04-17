const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { createInfraction, canModerate } = require('../utils/moderation');
const { updateCommandStats } = require('../utils/statistics');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Kick a user from the server')
    .addUserOption(option => 
      option
        .setName('user')
        .setDescription('The user to kick')
        .setRequired(true))
    .addStringOption(option => 
      option
        .setName('reason')
        .setDescription('The reason for kicking')
        .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),
  
  async execute(interaction) {
    // Check if the user has permission to kick
    if (!interaction.member.permissions.has(PermissionFlagsBits.KickMembers)) {
      return interaction.reply({ 
        content: 'You do not have permission to use this command.',
        ephemeral: true 
      });
    }
    
    await interaction.deferReply();
    
    try {
      // Update command stats
      updateCommandStats(interaction.user.id, 'kick');
      
      // Get target user
      const targetUser = interaction.options.getUser('user');
      const reason = interaction.options.getString('reason');
      
      // Cannot kick bots
      if (targetUser.bot) {
        return interaction.editReply('You cannot kick bot users.');
      }
      
      // Cannot kick yourself
      if (targetUser.id === interaction.user.id) {
        return interaction.editReply('You cannot kick yourself.');
      }
      
      // Get guild member
      const targetMember = interaction.guild.members.cache.get(targetUser.id) || 
        await interaction.guild.members.fetch(targetUser.id).catch(() => null);
      
      if (!targetMember) {
        return interaction.editReply('User not found in this server.');
      }
      
      // Check if target is moderator
      if (canModerate(targetMember)) {
        return interaction.editReply('You cannot kick other moderators.');
      }
      
      // Check if the bot can kick the user
      if (!targetMember.kickable) {
        return interaction.editReply('I cannot kick this user. Check that my role is above theirs.');
      }
      
      // Create kick infraction before kicking
      const infraction = await createInfraction(
        targetUser.id,
        'kick',
        reason,
        interaction.user.id,
        null,
        interaction.client
      );
      
      // Kick the user
      await targetMember.kick(reason);
      
      interaction.editReply(`Successfully kicked ${targetUser.tag} for: ${reason}`);
    } catch (error) {
      console.error('Error executing kick command:', error);
      interaction.editReply('There was an error executing the kick command.');
    }
  },
}; 