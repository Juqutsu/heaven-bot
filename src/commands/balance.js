const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { getUserBalance } = require('../utils/economy');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('balance')
    .setDescription('Check your coin balance'),
  async execute(interaction) {
    const userId = interaction.user.id;
    const coins = getUserBalance(userId);
    const embed = new EmbedBuilder()
      .setColor(0xF1C40F)
      .setAuthor({ name: interaction.user.username, iconURL: interaction.user.displayAvatarURL() })
      .setTitle('Your Balance')
      .setDescription(`You have **${coins.toLocaleString()}** coins.`);
    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  },
};


