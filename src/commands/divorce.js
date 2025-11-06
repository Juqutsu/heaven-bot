const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { divorcePartnership, getPartnership } = require('../utils/partnerships');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('divorce')
    .setDescription('End your partnership/marriage'),
  async execute(interaction) {
    const partnership = await getPartnership(interaction.user.id);
    if (!partnership) {
      return interaction.reply({
        content: 'You are not in a partnership.',
        ephemeral: true
      });
    }

    if (partnership.status !== 'married') {
      return interaction.reply({
        content: 'You can only divorce if you are married. Use `/marry cancel` to cancel an engagement.',
        ephemeral: true
      });
    }

    const result = await divorcePartnership(interaction.user.id);
    if (!result.success) {
      return interaction.reply({ content: result.message, ephemeral: true });
    }

    const partnerId = partnership.user1Id === interaction.user.id ? partnership.user2Id : partnership.user1Id;

    const embed = new EmbedBuilder()
      .setColor(0x95A5A6)
      .setTitle('💔 Partnership Ended')
      .setDescription(`The partnership between ${interaction.user.toString()} and <@${partnerId}> has ended.`)
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};

