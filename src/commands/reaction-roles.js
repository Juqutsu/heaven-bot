const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ChannelType } = require('discord.js');
const { addReactionRoleMapping, removeReactionRoleMapping, getReactionRoleMappingsForMessage } = require('../utils/database');
const logger = require('../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('reaction-roles')
    .setDescription('Create and manage reaction roles')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles | PermissionFlagsBits.ManageGuild)
    .addSubcommand(sub =>
      sub
        .setName('create')
        .setDescription('Create a reaction role message')
        .addChannelOption(opt =>
          opt.setName('channel')
            .setDescription('Channel to post in')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true))
        .addStringOption(opt =>
          opt.setName('description')
            .setDescription('Description text for the message')
            .setRequired(true))
    )
    .addSubcommand(sub =>
      sub
        .setName('add')
        .setDescription('Map an emoji to a role for a message')
        .addStringOption(opt => opt.setName('message_id').setDescription('Target message id').setRequired(true))
        .addStringOption(opt => opt.setName('emoji').setDescription('Emoji (e.g., 😀 or :custom:)').setRequired(true))
        .addRoleOption(opt => opt.setName('role').setDescription('Role to assign').setRequired(true))
    )
    .addSubcommand(sub =>
      sub
        .setName('remove')
        .setDescription('Remove a mapped emoji from a message')
        .addStringOption(opt => opt.setName('message_id').setDescription('Target message id').setRequired(true))
        .addStringOption(opt => opt.setName('emoji').setDescription('Emoji').setRequired(true))
    )
    .addSubcommand(sub =>
      sub
        .setName('list')
        .setDescription('List mappings for a message')
        .addStringOption(opt => opt.setName('message_id').setDescription('Target message id').setRequired(true))
    ),

  async execute(interaction) {
    if (!interaction.inGuild()) {
      await interaction.reply({ content: 'Use this in a server.', ephemeral: true });
      return;
    }

    const sub = interaction.options.getSubcommand();

    try {
      if (sub === 'create') {
        const channel = interaction.options.getChannel('channel');
        const description = interaction.options.getString('description');
        const embed = new EmbedBuilder()
          .setColor(0x5865F2)
          .setTitle('Reaction Roles')
          .setDescription(description)
          .setTimestamp();
        const message = await channel.send({ embeds: [embed] });
        await interaction.reply({ content: `Reaction role message created with id: ${message.id}`, ephemeral: true });
      } else if (sub === 'add') {
        const messageId = interaction.options.getString('message_id');
        const emoji = interaction.options.getString('emoji');
        const role = interaction.options.getRole('role');
        await addReactionRoleMapping(interaction.guild.id, messageId, emoji, role.id);

        // Try react to the message for convenience
        try {
          const channel = interaction.channel;
          const msg = await channel.messages.fetch(messageId).catch(() => null);
          if (msg) await msg.react(emoji).catch(() => {});
        } catch (_) {}

        await interaction.reply({ content: `Mapped ${emoji} -> @${role.name} on message ${messageId}.`, ephemeral: true });
      } else if (sub === 'remove') {
        const messageId = interaction.options.getString('message_id');
        const emoji = interaction.options.getString('emoji');
        await removeReactionRoleMapping(interaction.guild.id, messageId, emoji);
        await interaction.reply({ content: `Removed mapping for ${emoji} on message ${messageId}.`, ephemeral: true });
      } else if (sub === 'list') {
        const messageId = interaction.options.getString('message_id');
        const mappings = await getReactionRoleMappingsForMessage(interaction.guild.id, messageId);
        if (mappings.length === 0) {
          await interaction.reply({ content: 'No mappings found.', ephemeral: true });
          return;
        }
        const lines = await Promise.all(mappings.map(async m => {
          const role = await interaction.guild.roles.fetch(m.roleId).catch(() => null);
          return `${m.emoji} -> ${role ? '@' + role.name : '`deleted role`'} (${m.roleId})`;
        }));
        await interaction.reply({ content: `Mappings for ${messageId}:
${lines.join('\n')}`, ephemeral: true });
      }
    } catch (error) {
      logger.error('Error handling /reaction-roles command:', error);
      const alreadyReplied = interaction.deferred || interaction.replied;
      if (alreadyReplied) {
        await interaction.editReply({ content: 'There was an error. Please try again later.' });
      } else {
        await interaction.reply({ content: 'There was an error. Please try again later.', ephemeral: true });
      }
    }
  }
};


