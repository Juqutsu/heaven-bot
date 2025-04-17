const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { getUserInfractions, countUserInfractions, canModerate } = require('../utils/moderation');
const { updateCommandStats } = require('../utils/statistics');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('infractions')
    .setDescription('View a user\'s infractions')
    .addUserOption(option => 
      option
        .setName('user')
        .setDescription('The user to get infractions for')
        .setRequired(true))
    .addStringOption(option =>
      option
        .setName('type')
        .setDescription('Filter by infraction type')
        .setRequired(false)
        .addChoices(
          { name: 'All', value: 'all' },
          { name: 'Warnings', value: 'warn' },
          { name: 'Mutes', value: 'mute' },
          { name: 'Kicks', value: 'kick' },
          { name: 'Bans', value: 'ban' }
        ))
    .addBooleanOption(option =>
      option
        .setName('active_only')
        .setDescription('Show only active infractions')
        .setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
  
  async execute(interaction) {
    // Check if the user has permission
    if (!canModerate(interaction.member)) {
      return interaction.reply({ 
        content: 'You do not have permission to use this command.',
        ephemeral: true 
      });
    }
    
    await interaction.deferReply();
    
    try {
      // Update command stats
      updateCommandStats(interaction.user.id, 'infractions');
      
      // Get parameters
      const targetUser = interaction.options.getUser('user');
      const filterType = interaction.options.getString('type') || 'all';
      const activeOnly = interaction.options.getBoolean('active_only') || false;
      
      // Get infractions
      let infractions = getUserInfractions(targetUser.id);
      
      // Filter infractions if needed
      if (filterType !== 'all') {
        infractions = infractions.filter(inf => inf.type === filterType);
      }
      
      if (activeOnly) {
        infractions = infractions.filter(inf => inf.active);
      }
      
      // Sort by timestamp descending (newest first)
      infractions.sort((a, b) => b.timestamp - a.timestamp);
      
      // Get counts
      const counts = countUserInfractions(targetUser.id);
      
      if (infractions.length === 0) {
        if (filterType !== 'all' || activeOnly) {
          return interaction.editReply(`${targetUser.tag} has no ${activeOnly ? 'active ' : ''}${filterType !== 'all' ? filterType : 'infractions'}.`);
        } else {
          return interaction.editReply(`${targetUser.tag} has no infraction history.`);
        }
      }
      
      // Create summary embed
      const summaryEmbed = new EmbedBuilder()
        .setColor('#5865F2')
        .setTitle(`Infraction History: ${targetUser.tag}`)
        .setThumbnail(targetUser.displayAvatarURL())
        .setDescription(`**User ID:** ${targetUser.id}`)
        .addFields(
          { name: 'Total Infractions', value: counts.total.toString(), inline: true },
          { name: 'Warnings', value: counts.warn.toString(), inline: true },
          { name: 'Mutes', value: counts.mute.toString(), inline: true },
          { name: 'Kicks', value: counts.kick.toString(), inline: true },
          { name: 'Bans', value: counts.ban.toString(), inline: true },
          { name: 'Active Infractions', value: counts.active.toString(), inline: true }
        )
        .setFooter({ text: `Showing ${infractions.length} ${activeOnly ? 'active ' : ''}${filterType !== 'all' ? filterType : 'infractions'}` })
        .setTimestamp();
      
      // Create infractions embed
      const infractionEmbeds = [];
      
      // Add summary embed first
      infractionEmbeds.push(summaryEmbed);
      
      // Split infractions into chunks of 10 for multiple pages if needed
      const chunkSize = 10;
      for (let i = 0; i < infractions.length; i += chunkSize) {
        const chunk = infractions.slice(i, i + chunkSize);
        
        const embed = new EmbedBuilder()
          .setColor('#5865F2')
          .setTitle(`Infractions for ${targetUser.tag} (Page ${i/chunkSize + 1})`)
          .setTimestamp();
        
        // Add each infraction to the embed
        for (const infraction of chunk) {
          const date = new Date(infraction.timestamp).toLocaleString();
          const status = infraction.active ? '🔴 Active' : '⚪ Inactive';
          const expiryText = infraction.expiresAt 
            ? `Expires: ${new Date(infraction.expiresAt).toLocaleString()}`
            : '';
          
          embed.addFields({
            name: `${capitalize(infraction.type)} - ${date} - ${status}`,
            value: `**ID:** ${infraction.id}\n**Reason:** ${infraction.reason}\n**Moderator:** <@${infraction.moderatorId}>\n${expiryText}`
          });
        }
        
        infractionEmbeds.push(embed);
      }
      
      // Send embeds
      await interaction.editReply({ embeds: [infractionEmbeds[0]] });
      
      // Send additional embeds if needed
      for (let i = 1; i < infractionEmbeds.length; i++) {
        await interaction.followUp({ embeds: [infractionEmbeds[i]] });
      }
      
    } catch (error) {
      console.error('Error executing infractions command:', error);
      interaction.editReply('There was an error executing the infractions command.');
    }
  },
};

/**
 * Capitalize the first letter of a string
 * @param {string} string - String to capitalize
 * @returns {string} Capitalized string
 */
function capitalize(string) {
  return string.charAt(0).toUpperCase() + string.slice(1).toLowerCase();
} 