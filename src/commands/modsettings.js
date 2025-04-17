const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { getModerationSettings, updateModerationSettings } = require('../utils/moderation');
const { updateCommandStats } = require('../utils/statistics');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('modsettings')
    .setDescription('Configure moderation settings')
    .addSubcommand(subcommand =>
      subcommand
        .setName('view')
        .setDescription('View current moderation settings'))
    .addSubcommand(subcommand =>
      subcommand
        .setName('set_log_channel')
        .setDescription('Set the channel for moderation logs')
        .addChannelOption(option =>
          option
            .setName('channel')
            .setDescription('The channel to log moderation actions')
            .setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('set_mute_role')
        .setDescription('Set the role to use for muted users')
        .addRoleOption(option =>
          option
            .setName('role')
            .setDescription('The role to assign to muted users')
            .setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('toggle_dm_notifications')
        .setDescription('Toggle whether users receive DMs about moderation actions against them'))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  
  async execute(interaction) {
    // Check if the user has permission
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ 
        content: 'You do not have permission to use this command. It requires Administrator permission.',
        ephemeral: true 
      });
    }
    
    await interaction.deferReply();
    
    try {
      // Update command stats
      updateCommandStats(interaction.user.id, 'modsettings');
      
      const subcommand = interaction.options.getSubcommand();
      const settings = getModerationSettings();
      
      switch (subcommand) {
        case 'view':
          // Display current settings
          const embed = new EmbedBuilder()
            .setColor('#5865F2')
            .setTitle('Moderation Settings')
            .addFields(
              { 
                name: 'Log Channel', 
                value: settings.logChannelId ? `<#${settings.logChannelId}>` : 'Not set'
              },
              {
                name: 'Mute Role',
                value: settings.autoMuteRole ? `<@&${settings.autoMuteRole}>` : 'Not set'
              },
              {
                name: 'DM Notifications',
                value: settings.dmNotifications ? 'Enabled' : 'Disabled'
              }
            )
            .setTimestamp();
          
          await interaction.editReply({ embeds: [embed] });
          break;
          
        case 'set_log_channel':
          // Set log channel
          const channel = interaction.options.getChannel('channel');
          
          // Verify it's a text channel
          if (!channel.isTextBased()) {
            return interaction.editReply('The log channel must be a text channel.');
          }
          
          // Verify bot has permissions to send messages there
          const permissions = channel.permissionsFor(interaction.guild.members.me);
          if (!permissions || !permissions.has('SendMessages') || !permissions.has('EmbedLinks')) {
            return interaction.editReply('I need permissions to send messages and embeds in the log channel.');
          }
          
          // Update settings
          updateModerationSettings({ logChannelId: channel.id });
          
          await interaction.editReply(`Moderation logs will now be sent to ${channel}.`);
          break;
          
        case 'set_mute_role':
          // Set mute role
          const role = interaction.options.getRole('role');
          
          // Verify the bot can manage this role
          if (role.managed) {
            return interaction.editReply('This role is managed by an integration and cannot be assigned manually.');
          }
          
          // Verify the role is lower than the bot's highest role
          const botHighestRole = interaction.guild.members.me.roles.highest;
          if (role.position >= botHighestRole.position) {
            return interaction.editReply('This role is higher than or equal to my highest role. I cannot assign it.');
          }
          
          // Update settings
          updateModerationSettings({ autoMuteRole: role.id });
          
          await interaction.editReply(`The mute role has been set to ${role.name}.`);
          break;
          
        case 'toggle_dm_notifications':
          // Toggle DM notifications
          const newValue = !settings.dmNotifications;
          updateModerationSettings({ dmNotifications: newValue });
          
          await interaction.editReply(`DM notifications for moderation actions have been ${newValue ? 'enabled' : 'disabled'}.`);
          break;
          
        default:
          await interaction.editReply('Unknown subcommand.');
      }
    } catch (error) {
      console.error('Error executing modsettings command:', error);
      interaction.editReply('There was an error executing the modsettings command.');
    }
  },
}; 