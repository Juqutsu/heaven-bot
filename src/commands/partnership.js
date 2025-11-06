const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getPartnership, acceptPartnership, contributeCoins } = require('../utils/partnerships');
const { getUserBalance } = require('../utils/economy');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('partnership')
    .setDescription('Manage your partnership')
    .addSubcommand(subcommand =>
      subcommand
        .setName('accept')
        .setDescription('Accept a partnership proposal'))
    .addSubcommand(subcommand =>
      subcommand
        .setName('info')
        .setDescription('View your partnership information'))
    .addSubcommand(subcommand =>
      subcommand
        .setName('contribute')
        .setDescription('Contribute coins to shared pool')
        .addIntegerOption(option =>
          option.setName('amount')
            .setDescription('Amount of coins to contribute')
            .setRequired(true)
            .setMinValue(1))),
  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'accept') {
      const result = await acceptPartnership(interaction.user.id);
      if (!result.success) {
        return interaction.reply({ content: result.message, ephemeral: true });
      }

      const partnership = await getPartnership(interaction.user.id);
      const partnerId = partnership.user1Id === interaction.user.id ? partnership.user2Id : partnership.user1Id;

      const embed = new EmbedBuilder()
        .setColor(0x2ECC71)
        .setTitle('💒 Partnership Accepted!')
        .setDescription(`${interaction.user.toString()} and <@${partnerId}> are now married!`)
        .addFields(
          { name: 'Benefits', value: '• 10% XP bonus when both active\n• Shared coin pool', inline: false }
        )
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } else if (subcommand === 'info') {
      const partnership = await getPartnership(interaction.user.id);
      if (!partnership) {
        return interaction.reply({
          content: 'You are not in a partnership. Use `/marry` to propose to someone!',
          ephemeral: true
        });
      }

      const partnerId = partnership.user1Id === interaction.user.id ? partnership.user2Id : partnership.user1Id;
      const isProposer = partnership.proposedBy === interaction.user.id;

      const embed = new EmbedBuilder()
        .setColor(partnership.status === 'married' ? 0x2ECC71 : 0xF1C40F)
        .setTitle(partnership.status === 'married' ? '💒 Partnership' : '💍 Engagement')
        .setDescription(`Partnership between ${interaction.user.toString()} and <@${partnerId}>`)
        .addFields(
          { name: 'Status', value: partnership.status === 'married' ? 'Married' : 'Engaged', inline: true },
          { name: 'Proposed By', value: isProposer ? 'You' : `<@${partnership.proposedBy}>`, inline: true }
        )
        .setTimestamp();

      if (partnership.status === 'married') {
        const daysMarried = Math.floor((Math.floor(Date.now() / 1000) - partnership.marriedAt) / 86400);
        embed.addFields(
          { name: 'Days Married', value: `${daysMarried}`, inline: true },
          { name: 'Shared Coins', value: `${partnership.sharedCoins.toLocaleString()}`, inline: true },
          { name: 'XP Bonus', value: `${Math.floor(partnership.sharedXpBonus * 100)}%`, inline: true }
        );
      }

      await interaction.reply({ embeds: [embed], ephemeral: true });
    } else if (subcommand === 'contribute') {
      const amount = interaction.options.getInteger('amount');
      const balance = getUserBalance(interaction.user.id);

      if (balance < amount) {
        return interaction.reply({
          content: `Insufficient coins! You have ${balance.toLocaleString()} coins.`,
          ephemeral: true
        });
      }

      const result = await contributeCoins(interaction.user.id, amount);
      if (!result.success) {
        return interaction.reply({ content: result.message, ephemeral: true });
      }

      const partnership = await getPartnership(interaction.user.id);
      const embed = new EmbedBuilder()
        .setColor(0x2ECC71)
        .setTitle('✅ Coins Contributed')
        .setDescription(`Contributed **${amount.toLocaleString()}** coins to shared pool`)
        .addFields(
          { name: 'Total Shared Coins', value: `${partnership.sharedCoins.toLocaleString()}`, inline: true }
        )
        .setTimestamp();

      await interaction.reply({ embeds: [embed], ephemeral: true });
    }
  },
};

