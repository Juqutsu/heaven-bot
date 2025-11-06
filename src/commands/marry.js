const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { proposePartnership, acceptPartnership, divorcePartnership, getPartnership, contributeCoins } = require('../utils/partnerships');
const { getUserBalance } = require('../utils/economy');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('marry')
    .setDescription('Propose partnership/marriage to a user')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('User to propose to')
        .setRequired(true)),
  async execute(interaction) {
    const user = interaction.options.getUser('user');
    if (user.bot) {
      return interaction.reply({ content: 'You cannot propose to bots.', ephemeral: true });
    }
    if (user.id === interaction.user.id) {
      return interaction.reply({ content: 'You cannot propose to yourself.', ephemeral: true });
    }

    const result = await proposePartnership(interaction.user.id, user.id);
    if (!result.success) {
      return interaction.reply({ content: result.message, ephemeral: true });
    }

    const embed = new EmbedBuilder()
      .setColor(0xF1C40F)
      .setTitle('💍 Partnership Proposal')
      .setDescription(`${interaction.user.toString()} has proposed to ${user.toString()}!`)
      .addFields(
        { name: 'Status', value: 'Engaged', inline: true },
        { name: 'Next Step', value: `${user.toString()} can use \`/marry accept\` to accept`, inline: false }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};

