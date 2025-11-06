const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getUserRankCardSettings, saveUserRankCardSettings } = require('../utils/database');
const { updateCommandStats } = require('../utils/statistics');
const logger = require('../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rank-card')
    .setDescription('Customize your rank card appearance')
    .addSubcommand(subcommand =>
      subcommand
        .setName('view')
        .setDescription('View your current rank card settings'))
    .addSubcommand(subcommand =>
      subcommand
        .setName('set-color')
        .setDescription('Set a custom color for your rank card')
        .addStringOption(option =>
          option
            .setName('type')
            .setDescription('Color type to set')
            .setRequired(true)
            .addChoices(
              { name: 'Primary Color', value: 'primary' },
              { name: 'Background Color', value: 'background' }
            ))
        .addStringOption(option =>
          option
            .setName('color')
            .setDescription('Hex color code (e.g., #5865F2)')
            .setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('reset')
        .setDescription('Reset your rank card to default colors')),
  
  async execute(interaction) {
    await interaction.deferReply();
    
    try {
      // Update command stats
      await updateCommandStats(interaction.user.id, 'rank-card');
      
      const subcommand = interaction.options.getSubcommand();
      
      if (subcommand === 'view') {
        const settings = await getUserRankCardSettings(interaction.user.id);
        
        const embed = new EmbedBuilder()
          .setColor(0x5865F2)
          .setTitle('Rank Card Settings')
          .setDescription('Your current rank card customization settings')
          .addFields(
            { name: 'Primary Color', value: settings.primaryColor || 'Default (Prestige/Blue)', inline: true },
            { name: 'Background Color', value: settings.backgroundColor || 'Default (Dark Gray)', inline: true }
          )
          .setTimestamp();
        
        await interaction.editReply({ embeds: [embed] });
      } else if (subcommand === 'set-color') {
        const type = interaction.options.getString('type');
        const color = interaction.options.getString('color');
        
        // Validate hex color
        const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
        if (!hexRegex.test(color)) {
          await interaction.editReply('Invalid hex color format. Please use format like #5865F2 or #FFF');
          return;
        }
        
        const settings = await getUserRankCardSettings(interaction.user.id);
        
        if (type === 'primary') {
          settings.primaryColor = color;
        } else if (type === 'background') {
          settings.backgroundColor = color;
        }
        
        await saveUserRankCardSettings(interaction.user.id, settings);
        
        const embed = new EmbedBuilder()
          .setColor(0x00FF00)
          .setTitle('✅ Rank Card Updated')
          .setDescription(`Your rank card ${type} color has been set to ${color}`)
          .setTimestamp();
        
        await interaction.editReply({ embeds: [embed] });
      } else if (subcommand === 'reset') {
        await saveUserRankCardSettings(interaction.user.id, {
          primaryColor: null,
          backgroundColor: null
        });
        
        const embed = new EmbedBuilder()
          .setColor(0x00FF00)
          .setTitle('✅ Rank Card Reset')
          .setDescription('Your rank card has been reset to default colors')
          .setTimestamp();
        
        await interaction.editReply({ embeds: [embed] });
      }
    } catch (error) {
      logger.error('Error managing rank card settings:', error);
      await interaction.editReply('There was an error managing your rank card settings. Please try again later.');
    }
  },
};

