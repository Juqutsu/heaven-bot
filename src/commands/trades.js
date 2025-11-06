const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getPendingTrades } = require('../utils/trading');
const { getUserInventory } = require('../utils/inventory');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('trades')
    .setDescription('View your pending trades'),
  async execute(interaction) {
    const pendingTrades = await getPendingTrades(interaction.user.id);

    if (pendingTrades.length === 0) {
      return interaction.reply({
        content: 'You have no pending trades. Use `/trade create` to create a new trade offer.',
        ephemeral: true
      });
    }

    const embed = new EmbedBuilder()
      .setColor(0x3498DB)
      .setAuthor({ name: interaction.user.username, iconURL: interaction.user.displayAvatarURL() })
      .setTitle('📋 Your Pending Trades')
      .setTimestamp();

    for (const trade of pendingTrades.slice(0, 10)) {
      const now = Math.floor(Date.now() / 1000);
      const expiresIn = Math.floor((trade.expiresAt - now) / 3600);
      const type = trade.isInitiator ? 'Sent' : 'Received';

      let fieldValue = `**Type:** ${type}\n`;
      fieldValue += `**Trade ID:** \`${trade.tradeId.slice(-8)}\`\n`;
      fieldValue += `**Expires:** ${expiresIn}h\n`;

      // Get item names
      const initiatorInventory = await getUserInventory(trade.initiatorId, false);
      const recipientInventory = await getUserInventory(trade.recipientId, false);

      let initiatorOffer = '';
      if (trade.initiatorItems.length > 0) {
        initiatorOffer += `${trade.initiatorItems.length} item(s)`;
      }
      if (trade.initiatorCoins > 0) {
        if (initiatorOffer) initiatorOffer += ', ';
        initiatorOffer += `${trade.initiatorCoins.toLocaleString()} coins`;
      }
      if (!initiatorOffer) {
        initiatorOffer = 'None';
      }

      let recipientOffer = '';
      if (trade.recipientItems.length > 0) {
        recipientOffer += `${trade.recipientItems.length} item(s)`;
      }
      if (trade.recipientCoins > 0) {
        if (recipientOffer) recipientOffer += ', ';
        recipientOffer += `${trade.recipientCoins.toLocaleString()} coins`;
      }
      if (!recipientOffer) {
        recipientOffer = 'None';
      }

      fieldValue += `**You ${trade.isInitiator ? 'Offer' : 'Receive'}:** ${initiatorOffer}\n`;
      fieldValue += `**They ${trade.isInitiator ? 'Receive' : 'Offer'}:** ${recipientOffer}`;

      embed.addFields({
        name: `${type} Trade`,
        value: fieldValue,
        inline: false
      });
    }

    if (pendingTrades.length > 10) {
      embed.setFooter({ text: `Showing 10 of ${pendingTrades.length} trades. Use /trade view <trade_id> for details.` });
    } else {
      embed.setFooter({ text: 'Use /trade view <trade_id> to view details' });
    }

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};

