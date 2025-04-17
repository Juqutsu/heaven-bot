const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { createInfraction, updateInfractionStatus, getInfractionById } = require('../utils/moderation');
const { updateCommandStats } = require('../utils/statistics');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unban')
    .setDescription('Unban a user from the server')
    .addStringOption(option => 
      option
        .setName('user_id')
        .setDescription('The user ID to unban')
        .setRequired(true))
    .addStringOption(option => 
      option
        .setName('reason')
        .setDescription('The reason for unbanning')
        .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
  
  async execute(interaction) {
    // Check if the user has permission to unban
    if (!interaction.member.permissions.has(PermissionFlagsBits.BanMembers)) {
      return interaction.reply({ 
        content: 'You do not have permission to use this command.',
        ephemeral: true 
      });
    }
    
    await interaction.deferReply();
    
    try {
      // Update command stats
      updateCommandStats(interaction.user.id, 'unban');
      
      // Get parameters
      const userId = interaction.options.getString('user_id');
      const reason = interaction.options.getString('reason');
      
      // Validate that the user ID is valid
      if (!/^\d{17,19}$/.test(userId)) {
        return interaction.editReply('Invalid user ID format. User IDs are typically 17-19 digits long.');
      }
      
      // Check if the user is actually banned
      const banList = await interaction.guild.bans.fetch();
      const ban = banList.get(userId);
      
      if (!ban) {
        return interaction.editReply('This user is not banned.');
      }
      
      // Unban the user
      await interaction.guild.members.unban(userId, reason);
      
      // Create unban infraction
      const infraction = await createInfraction(
        userId,
        'unban',
        reason,
        interaction.user.id,
        null,
        interaction.client
      );
      
      // Find any active ban infractions for this user and mark them as inactive
      const allData = require('../utils/moderation').getModerationData();
      if (allData.infractions[userId]) {
        const userInfractions = allData.infractions[userId];
        for (const inf of userInfractions) {
          if (inf.type === 'ban' && inf.active) {
            // Mark this ban as inactive
            updateInfractionStatus(inf.id, false);
          }
        }
      }
      
      const user = ban.user || { tag: userId };
      interaction.editReply(`Successfully unbanned ${user.tag} for: ${reason}`);
    } catch (error) {
      console.error('Error executing unban command:', error);
      interaction.editReply('There was an error executing the unban command.');
    }
  },
}; 