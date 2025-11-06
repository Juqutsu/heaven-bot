const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ChannelType } = require('discord.js');
const { createGiveaway, setGiveawayMessageId, getGiveawayByMessageId, updateGiveawayStatus, getGiveawayEntries } = require('../utils/database');
const logger = require('../utils/logger');

function parseDuration(input) {
  // Supports 1h30m, 2d, 45m, 10s
  const regex = /(\d+)\s*(d|h|m|s)/gi;
  let match;
  let seconds = 0;
  while ((match = regex.exec(input))) {
    const val = parseInt(match[1], 10);
    const unit = match[2].toLowerCase();
    if (unit === 'd') seconds += val * 86400;
    if (unit === 'h') seconds += val * 3600;
    if (unit === 'm') seconds += val * 60;
    if (unit === 's') seconds += val;
  }
  return seconds;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('giveaway')
    .setDescription('Start and manage giveaways')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand(sub =>
      sub
        .setName('start')
        .setDescription('Start a giveaway')
        .addChannelOption(opt =>
          opt.setName('channel')
            .setDescription('Channel to post the giveaway')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true))
        .addStringOption(opt =>
          opt.setName('duration')
            .setDescription('Duration (e.g., 1h30m, 2d)')
            .setRequired(true))
        .addIntegerOption(opt =>
          opt.setName('winners')
            .setDescription('Number of winners')
            .setMinValue(1)
            .setMaxValue(20)
            .setRequired(true))
        .addStringOption(opt =>
          opt.setName('prize')
            .setDescription('Prize description')
            .setRequired(true))
    )
    .addSubcommand(sub =>
      sub
        .setName('end')
        .setDescription('End a running giveaway')
        .addStringOption(opt => opt.setName('message_id').setDescription('Giveaway message id').setRequired(true))
    )
    .addSubcommand(sub =>
      sub
        .setName('reroll')
        .setDescription('Reroll winners for a finished giveaway')
        .addStringOption(opt => opt.setName('message_id').setDescription('Giveaway message id').setRequired(true))
    )
    .addSubcommand(sub =>
      sub
        .setName('cancel')
        .setDescription('Cancel a giveaway')
        .addStringOption(opt => opt.setName('message_id').setDescription('Giveaway message id').setRequired(true))
    ),

  async execute(interaction) {
    if (!interaction.inGuild()) {
      await interaction.reply({ content: 'Use this in a server.', ephemeral: true });
      return;
    }

    const sub = interaction.options.getSubcommand();
    try {
      if (sub === 'start') {
        await interaction.deferReply({ ephemeral: true });
        const channel = interaction.options.getChannel('channel');
        const duration = interaction.options.getString('duration');
        const winners = interaction.options.getInteger('winners');
        const prize = interaction.options.getString('prize');
        const seconds = parseDuration(duration);
        if (!seconds || seconds < 5) {
          await interaction.editReply('Invalid duration. Use formats like 1h30m, 2d, 45m.');
          return;
        }
        const endTime = Math.floor(Date.now() / 1000) + seconds;

        const embed = new EmbedBuilder()
          .setColor(0x57F287)
          .setTitle('🎉 Giveaway')
          .addFields(
            { name: 'Prize', value: prize },
            { name: 'Winners', value: `${winners}`, inline: true },
            { name: 'Ends', value: `<t:${endTime}:R>`, inline: true }
          )
          .setFooter({ text: `Started by ${interaction.user.tag}` })
          .setTimestamp();

        // Create DB record without messageId
        const giveawayId = await createGiveaway({
          guildId: interaction.guild.id,
          channelId: channel.id,
          prize,
          winnerCount: winners,
          endTime,
          createdBy: interaction.user.id
        });

        const message = await channel.send({ embeds: [embed] });
        await message.react('🎉').catch(() => {});
        await setGiveawayMessageId(giveawayId, message.id);
        await interaction.editReply(`Giveaway started in <#${channel.id}> (message id: ${message.id}).`);
      } else if (sub === 'end') {
        await interaction.deferReply({ ephemeral: true });
        const messageId = interaction.options.getString('message_id');
        const giveaway = await getGiveawayByMessageId(messageId);
        if (!giveaway) {
          await interaction.editReply('Giveaway not found.');
          return;
        }
        await updateGiveawayStatus(giveaway.giveaway_id, 'ended');
        await interaction.editReply('Giveaway ended. Winners will be drawn by the scheduler shortly.');
      } else if (sub === 'cancel') {
        await interaction.deferReply({ ephemeral: true });
        const messageId = interaction.options.getString('message_id');
        const giveaway = await getGiveawayByMessageId(messageId);
        if (!giveaway) {
          await interaction.editReply('Giveaway not found.');
          return;
        }
        await updateGiveawayStatus(giveaway.giveaway_id, 'canceled');
        await interaction.editReply('Giveaway canceled.');
      } else if (sub === 'reroll') {
        await interaction.deferReply({ ephemeral: true });
        const messageId = interaction.options.getString('message_id');
        const giveaway = await getGiveawayByMessageId(messageId);
        if (!giveaway) {
          await interaction.editReply('Giveaway not found.');
          return;
        }
        const entries = await getGiveawayEntries(giveaway.giveaway_id);
        if (entries.length === 0) {
          await interaction.editReply('No entries to reroll.');
          return;
        }
        // Pick winners locally for immediate feedback, scheduler will formalize
        const unique = [...new Set(entries)];
        const winners = [];
        const count = Math.min(giveaway.winner_count, unique.length);
        while (winners.length < count) {
          const i = Math.floor(Math.random() * unique.length);
          const pick = unique.splice(i, 1)[0];
          winners.push(pick);
        }
        await interaction.editReply(`Rerolled winners: ${winners.map(id => `<@${id}>`).join(', ')}`);
      }
    } catch (error) {
      logger.error('Error handling /giveaway command:', error);
      const already = interaction.deferred || interaction.replied;
      if (already) {
        await interaction.editReply('There was an error.');
      } else {
        await interaction.reply({ content: 'There was an error.', ephemeral: true });
      }
    }
  }
};


