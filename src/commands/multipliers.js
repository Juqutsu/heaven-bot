const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { getAllMultipliers, createMultiplier, removeMultiplier, getActiveMultipliers } = require('../utils/database');
const { updateCommandStats } = require('../utils/statistics');
const logger = require('../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('multipliers')
    .setDescription('Manage XP multipliers (Admin only)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(subcommand =>
      subcommand
        .setName('list')
        .setDescription('List all active multipliers'))
    .addSubcommand(subcommand =>
      subcommand
        .setName('add')
        .setDescription('Add a new XP multiplier')
        .addStringOption(option =>
          option
            .setName('name')
            .setDescription('Multiplier name')
            .setRequired(true))
        .addNumberOption(option =>
          option
            .setName('value')
            .setDescription('Multiplier value (e.g., 1.5 for 50% boost)')
            .setRequired(true)
            .setMinValue(1.0))
        .addStringOption(option =>
          option
            .setName('scope')
            .setDescription('Multiplier scope')
            .setRequired(true)
            .addChoices(
              { name: 'Global', value: 'global' },
              { name: 'User', value: 'user' },
              { name: 'Role', value: 'role' }
            ))
        .addIntegerOption(option =>
          option
            .setName('duration')
            .setDescription('Duration in hours')
            .setRequired(true)
            .setMinValue(1))
        .addStringOption(option =>
          option
            .setName('scope-id')
            .setDescription('User ID or Role ID (required for user/role scope)')
            .setRequired(false))
        .addStringOption(option =>
          option
            .setName('description')
            .setDescription('Multiplier description')
            .setRequired(false)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('remove')
        .setDescription('Remove an XP multiplier')
        .addStringOption(option =>
          option
            .setName('id')
            .setDescription('Multiplier ID to remove')
            .setRequired(true))),
  
  async execute(interaction) {
    await interaction.deferReply();
    
    try {
      // Update command stats
      await updateCommandStats(interaction.user.id, 'multipliers');
      
      const subcommand = interaction.options.getSubcommand();
      
      if (subcommand === 'list') {
        const multipliers = await getAllMultipliers();
        const now = Math.floor(Date.now() / 1000);
        
        const active = multipliers.filter(m => m.startTime <= now && m.endTime >= now);
        const upcoming = multipliers.filter(m => m.startTime > now);
        const expired = multipliers.filter(m => m.endTime < now);
        
        const embed = new EmbedBuilder()
          .setColor(0x5865F2)
          .setTitle('XP Multipliers')
          .setTimestamp();
        
        if (active.length > 0) {
          const activeList = active.map(m => {
            const percentage = Math.round((m.multiplierValue - 1) * 100);
            const scopeText = m.scope === 'global' ? 'Global' : m.scope === 'user' ? `User: <@${m.scopeId}>` : `Role: <@&${m.scopeId}>`;
            return `**${m.name}** - +${percentage}% XP (${scopeText})`;
          }).join('\n');
          embed.addFields({ name: '🟢 Active', value: activeList, inline: false });
        }
        
        if (upcoming.length > 0) {
          const upcomingList = upcoming.map(m => {
            const percentage = Math.round((m.multiplierValue - 1) * 100);
            return `**${m.name}** - +${percentage}% XP (starts <t:${m.startTime}:R>)`;
          }).join('\n');
          embed.addFields({ name: '⏳ Upcoming', value: upcomingList, inline: false });
        }
        
        if (expired.length > 0) {
          const expiredList = expired.slice(0, 5).map(m => {
            const percentage = Math.round((m.multiplierValue - 1) * 100);
            return `**${m.name}** - +${percentage}% XP (ended <t:${m.endTime}:R>)`;
          }).join('\n');
          embed.addFields({ name: '🔴 Expired', value: expiredList, inline: false });
        }
        
        if (active.length === 0 && upcoming.length === 0 && expired.length === 0) {
          embed.setDescription('No multipliers found.');
        }
        
        await interaction.editReply({ embeds: [embed] });
      } else if (subcommand === 'add') {
        const name = interaction.options.getString('name');
        const value = interaction.options.getNumber('value');
        const scope = interaction.options.getString('scope');
        const scopeId = interaction.options.getString('scope-id');
        const duration = interaction.options.getInteger('duration');
        const description = interaction.options.getString('description');
        
        // Validate scope
        if ((scope === 'user' || scope === 'role') && !scopeId) {
          await interaction.editReply('Scope ID is required for user or role multipliers.');
          return;
        }
        
        const now = Math.floor(Date.now() / 1000);
        const endTime = now + (duration * 3600);
        
        const multiplierId = await createMultiplier({
          name,
          description,
          multiplierValue: value,
          startTime: now,
          endTime,
          scope,
          scopeId: scope === 'global' ? null : scopeId
        });
        
        const percentage = Math.round((value - 1) * 100);
        const embed = new EmbedBuilder()
          .setColor(0x00FF00)
          .setTitle('✅ Multiplier Created')
          .setDescription(`**${name}** - +${percentage}% XP\nDuration: ${duration} hours\nID: \`${multiplierId}\``)
          .setTimestamp();
        
        await interaction.editReply({ embeds: [embed] });
      } else if (subcommand === 'remove') {
        const multiplierId = interaction.options.getString('id');
        
        await removeMultiplier(multiplierId);
        
        const embed = new EmbedBuilder()
          .setColor(0x00FF00)
          .setTitle('✅ Multiplier Removed')
          .setDescription(`Multiplier \`${multiplierId}\` has been removed.`)
          .setTimestamp();
        
        await interaction.editReply({ embeds: [embed] });
      }
    } catch (error) {
      logger.error('Error managing multipliers:', error);
      await interaction.editReply('There was an error managing multipliers. Please try again later.');
    }
  },
};

