const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { getCurrencySettings, earnCoins } = require('../utils/economy');
const { getDatabase } = require('../utils/database');

const ONE_DAY = 24 * 60 * 60; // seconds

module.exports = {
  data: new SlashCommandBuilder()
    .setName('daily')
    .setDescription('Claim your daily coin bonus'),
  async execute(interaction) {
    const userId = interaction.user.id;
    const db = getDatabase();
    const nowSec = Math.floor(Date.now() / 1000);

    // Check last daily claim via transactions
    const last = db.prepare(`
      SELECT created_at FROM currency_transactions
      WHERE user_id = ? AND source = 'daily'
      ORDER BY created_at DESC LIMIT 1
    `).get(userId);

    if (last && (nowSec - last.created_at) < ONE_DAY) {
      const remaining = ONE_DAY - (nowSec - last.created_at);
      const hours = Math.floor(remaining / 3600);
      const minutes = Math.floor((remaining % 3600) / 60);
      const seconds = remaining % 60;
      return interaction.reply({
        content: `You have already claimed your daily bonus. Try again in ${hours}h ${minutes}m ${seconds}s.`,
        flags: MessageFlags.Ephemeral
      });
    }

    const settings = await getCurrencySettings();
    const amount = Math.max(0, settings.dailyBonus || 50);
    const awarded = await earnCoins(userId, amount, 'daily');

    const embed = new EmbedBuilder()
      .setColor(0x2ECC71)
      .setTitle('Daily Bonus Claimed!')
      .setDescription(`You received **${awarded.toLocaleString()}** coins.`)
      .setTimestamp();

    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  },
};


