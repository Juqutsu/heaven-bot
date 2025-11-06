const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getUserReputation, getReputationLeaderboard, getReputationHistory } = require('../utils/reputation');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('reputation')
    .setDescription('View reputation information')
    .addSubcommand(subcommand =>
      subcommand
        .setName('user')
        .setDescription('View a user\'s reputation')
        .addUserOption(option =>
          option.setName('user')
            .setDescription('User to view reputation for')
            .setRequired(false)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('leaderboard')
        .setDescription('View reputation leaderboard')
        .addIntegerOption(option =>
          option.setName('limit')
            .setDescription('Number of users to show (default: 10)')
            .setRequired(false)
            .setMinValue(1)
            .setMaxValue(25)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('history')
        .setDescription('View your reputation history')
        .addIntegerOption(option =>
          option.setName('limit')
            .setDescription('Number of transactions to show (default: 10)')
            .setRequired(false)
            .setMinValue(1)
            .setMaxValue(25))),
  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'user') {
      const user = interaction.options.getUser('user') || interaction.user;
      const reputation = await getUserReputation(user.id);

      const embed = new EmbedBuilder()
        .setColor(0x3498DB)
        .setAuthor({ name: user.username, iconURL: user.displayAvatarURL() })
        .setTitle('⭐ Reputation')
        .setDescription(`${user.toString()} has **${reputation}** reputation points`)
        .setTimestamp();

      await interaction.reply({ embeds: [embed], ephemeral: true });
    } else if (subcommand === 'leaderboard') {
      const limit = interaction.options.getInteger('limit') || 10;
      const leaderboard = await getReputationLeaderboard(limit);

      if (leaderboard.length === 0) {
        return interaction.reply({
          content: 'No users with reputation found.',
          ephemeral: true
        });
      }

      const embed = new EmbedBuilder()
        .setColor(0xF1C40F)
        .setTitle('⭐ Reputation Leaderboard')
        .setTimestamp();

      let leaderboardText = '';
      for (let i = 0; i < leaderboard.length; i++) {
        const entry = leaderboard[i];
        const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '•';
        leaderboardText += `${medal} <@${entry.userId}> - **${entry.reputation}** reputation\n`;
      }

      embed.setDescription(leaderboardText);
      embed.setFooter({ text: `Top ${leaderboard.length} users` });

      await interaction.reply({ embeds: [embed] });
    } else if (subcommand === 'history') {
      const limit = interaction.options.getInteger('limit') || 10;
      const history = await getReputationHistory(interaction.user.id, limit);

      if (history.length === 0) {
        return interaction.reply({
          content: 'You have no reputation history.',
          ephemeral: true
        });
      }

      const embed = new EmbedBuilder()
        .setColor(0x3498DB)
        .setAuthor({ name: interaction.user.username, iconURL: interaction.user.displayAvatarURL() })
        .setTitle('📜 Reputation History')
        .setTimestamp();

      let historyText = '';
      for (const transaction of history) {
        const sign = transaction.amount > 0 ? '+' : '';
        const emoji = transaction.amount > 0 ? '⬆️' : '⬇️';
        historyText += `${emoji} ${sign}${transaction.amount} <t:${transaction.createdAt}:R>\n`;
        if (transaction.reason) {
          historyText += `   *${transaction.reason}*\n`;
        }
      }

      embed.setDescription(historyText);
      embed.setFooter({ text: `Last ${history.length} transactions` });

      await interaction.reply({ embeds: [embed], ephemeral: true });
    }
  },
};

