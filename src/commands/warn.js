const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { createInfraction, canModerate } = require('../utils/moderation');
const { updateCommandStats } = require('../utils/statistics');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Warn a user')
    .addUserOption(option => 
      option
        .setName('user')
        .setDescription('The user to warn')
        .setRequired(true))
    .addStringOption(option => 
      option
        .setName('reason')
        .setDescription('The reason for the warning')
        .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
  
  async execute(interaction) {
    // Check if the user has permission to warn
    if (!canModerate(interaction.member)) {
      return interaction.reply({ 
        content: 'You do not have permission to use this command.',
        ephemeral: true 
      });
    }
    
    await interaction.deferReply();
    
    try {
      // Update command stats
      updateCommandStats(interaction.user.id, 'warn');
      
      // Get target user
      const targetUser = interaction.options.getUser('user');
      const reason = interaction.options.getString('reason');
      
      // Cannot warn bots
      if (targetUser.bot) {
        return interaction.editReply('You cannot warn bot users.');
      }
      
      // Cannot warn yourself
      if (targetUser.id === interaction.user.id) {
        return interaction.editReply('You cannot warn yourself.');
      }
      
      // Check if target is moderator
      const targetMember = interaction.guild.members.cache.get(targetUser.id) || 
        await interaction.guild.members.fetch(targetUser.id).catch(() => null);
        
      if (targetMember && canModerate(targetMember)) {
        return interaction.editReply('You cannot warn other moderators.');
      }
      
      // Create warning infraction
      const infraction = await createInfraction(
        targetUser.id,
        'warn',
        reason,
        interaction.user.id,
        null,
        interaction.client
      );
      
      interaction.editReply(`Successfully warned ${targetUser.tag} for: ${reason}`);
    } catch (error) {
      console.error('Error executing warn command:', error);
      interaction.editReply('There was an error executing the warn command.');
    }
  },
}; 