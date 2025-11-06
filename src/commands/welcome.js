const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { getGuildSettings, saveGuildSettings } = require('../utils/database');
const logger = require('../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('welcome')
    .setDescription('Configure welcome/goodbye messages for this server')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand(sub =>
      sub
        .setName('set-channel')
        .setDescription('Set the channel for welcome/goodbye messages')
        .addChannelOption(opt =>
          opt.setName('channel')
            .setDescription('Target text channel')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true))
    )
    .addSubcommand(sub =>
      sub
        .setName('set-message')
        .setDescription('Set the welcome or goodbye message template')
        .addStringOption(opt =>
          opt.setName('type')
            .setDescription('Message type')
            .addChoices(
              { name: 'welcome', value: 'welcome' },
              { name: 'goodbye', value: 'goodbye' }
            )
            .setRequired(true))
        .addStringOption(opt =>
          opt.setName('text')
            .setDescription('Template text (supports {user}, {tag}, {mention}, {server}, {memberCount})')
            .setRequired(true))
    )
    .addSubcommand(sub =>
      sub
        .setName('preview')
        .setDescription('Preview the configured message')
        .addStringOption(opt =>
          opt.setName('type')
            .setDescription('Message type')
            .addChoices(
              { name: 'welcome', value: 'welcome' },
              { name: 'goodbye', value: 'goodbye' }
            )
            .setRequired(true))
    ),

  async execute(interaction) {
    if (!interaction.inGuild()) {
      await interaction.reply({ content: 'This command can only be used in a server.', ephemeral: true });
      return;
    }

    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;
    const settings = await getGuildSettings(guildId);

    try {
      if (sub === 'set-channel') {
        const channel = interaction.options.getChannel('channel');
        if (!channel || channel.type !== ChannelType.GuildText) {
          await interaction.reply({ content: 'Please select a text channel.', ephemeral: true });
          return;
        }
        await saveGuildSettings(guildId, {
          ...settings,
          welcomeChannelId: channel.id,
          goodbyeChannelId: channel.id
        });
        await interaction.reply({ content: `Channel set to <#${channel.id}> for welcome/goodbye messages.`, ephemeral: true });
      } else if (sub === 'set-message') {
        const type = interaction.options.getString('type');
        const text = interaction.options.getString('text');

        const newSettings = { ...settings };
        if (type === 'welcome') newSettings.welcomeMessage = text;
        if (type === 'goodbye') newSettings.goodbyeMessage = text;

        await saveGuildSettings(guildId, newSettings);
        await interaction.reply({ content: `${type === 'welcome' ? 'Welcome' : 'Goodbye'} message updated.`, ephemeral: true });
      } else if (sub === 'preview') {
        const type = interaction.options.getString('type');
        const channelId = settings.welcomeChannelId || settings.goodbyeChannelId;
        const messageTemplate = type === 'welcome' ? settings.welcomeMessage : settings.goodbyeMessage;

        if (!channelId || !messageTemplate) {
          await interaction.reply({ content: 'Please configure a channel and message first.', ephemeral: true });
          return;
        }

        // Simple inline render without templates util (added later)
        const rendered = (messageTemplate || '')
          .replaceAll('{user}', interaction.user.username)
          .replaceAll('{tag}', interaction.user.tag || `${interaction.user.username}#${interaction.user.discriminator}`)
          .replaceAll('{mention}', `<@${interaction.user.id}>`)
          .replaceAll('{server}', interaction.guild.name)
          .replaceAll('{memberCount}', `${interaction.guild.memberCount}`);

        await interaction.reply({ content: `Preview in <#${channelId}>: ${rendered}`, ephemeral: true });
      }
    } catch (error) {
      logger.error('Error handling /welcome command:', error);
      const alreadyReplied = interaction.replied || interaction.deferred;
      if (alreadyReplied) {
        await interaction.editReply({ content: 'There was an error. Please try again later.' });
      } else {
        await interaction.reply({ content: 'There was an error. Please try again later.', ephemeral: true });
      }
    }
  }
};


