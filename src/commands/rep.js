const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { giveReputation, getUserReputation } = require('../utils/reputation');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rep')
    .setDescription('Give or take reputation from a user')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('User to give/take reputation from')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('action')
        .setDescription('Give or take reputation')
        .setRequired(true)
        .addChoices(
          { name: 'Give (+1)', value: 'give' },
          { name: 'Take (-1)', value: 'take' }
        ))
    .addStringOption(option =>
      option.setName('reason')
        .setDescription('Reason for reputation change')
        .setRequired(false)),
  async execute(interaction) {
    const user = interaction.options.getUser('user');
    const action = interaction.options.getString('action');
    const reason = interaction.options.getString('reason');

    if (user.bot) {
      return interaction.reply({
        content: 'You cannot give reputation to bots.',
        ephemeral: true
      });
    }

    if (user.id === interaction.user.id) {
      return interaction.reply({
        content: 'You cannot give reputation to yourself.',
        ephemeral: true
      });
    }

    const amount = action === 'give' ? 1 : -1;
    const result = await giveReputation(interaction.user.id, user.id, amount, reason);

    if (!result.success) {
      return interaction.reply({
        content: result.message,
        ephemeral: true
      });
    }

    const embed = new EmbedBuilder()
      .setColor(amount > 0 ? 0x2ECC71 : 0xE74C3C)
      .setTitle(amount > 0 ? '✅ Reputation Given' : '❌ Reputation Taken')
      .setDescription(`${amount > 0 ? 'Gave' : 'Took'} **${Math.abs(amount)}** reputation ${amount > 0 ? 'to' : 'from'} ${user.toString()}`)
      .addFields(
        { name: 'New Reputation', value: `${result.newReputation}`, inline: true },
        { name: 'Action', value: amount > 0 ? 'Given' : 'Taken', inline: true }
      )
      .setTimestamp();

    if (reason) {
      embed.addFields({ name: 'Reason', value: reason, inline: false });
    }

    embed.setFooter({ text: 'You can give reputation once per 24 hours per user' });

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};

