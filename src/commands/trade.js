const { SlashCommandBuilder, EmbedBuilder, UserSelectMenuBuilder, ActionRowBuilder } = require('discord.js');
const { createTrade, getTrade, acceptTrade, rejectTrade, cancelTrade, getPendingTrades } = require('../utils/trading');
const { getUserInventory } = require('../utils/inventory');
const { getUserBalance } = require('../utils/economy');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('trade')
    .setDescription('Manage trades')
    .addSubcommand(subcommand =>
      subcommand
        .setName('create')
        .setDescription('Create a new trade offer')
        .addUserOption(option =>
          option.setName('user')
            .setDescription('User to trade with')
            .setRequired(true))
        .addStringOption(option =>
          option.setName('your_items')
            .setDescription('Your items (inventory IDs, comma-separated)')
            .setRequired(false))
        .addIntegerOption(option =>
          option.setName('your_coins')
            .setDescription('Your coins to trade')
            .setRequired(false)
            .setMinValue(0))
        .addStringOption(option =>
          option.setName('their_items')
            .setDescription('Their items (inventory IDs, comma-separated)')
            .setRequired(false))
        .addIntegerOption(option =>
          option.setName('their_coins')
            .setDescription('Their coins to trade')
            .setRequired(false)
            .setMinValue(0)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('accept')
        .setDescription('Accept a trade offer')
        .addStringOption(option =>
          option.setName('trade_id')
            .setDescription('Trade ID to accept')
            .setRequired(true)
            .setAutocomplete(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('reject')
        .setDescription('Reject a trade offer')
        .addStringOption(option =>
          option.setName('trade_id')
            .setDescription('Trade ID to reject')
            .setRequired(true)
            .setAutocomplete(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('cancel')
        .setDescription('Cancel your trade offer')
        .addStringOption(option =>
          option.setName('trade_id')
            .setDescription('Trade ID to cancel')
            .setRequired(true)
            .setAutocomplete(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('view')
        .setDescription('View a trade offer')
        .addStringOption(option =>
          option.setName('trade_id')
            .setDescription('Trade ID to view')
            .setRequired(true)
            .setAutocomplete(true))),
  async autocomplete(interaction) {
    const focusedValue = interaction.options.getFocused();
    const pendingTrades = await getPendingTrades(interaction.user.id);

    const filtered = pendingTrades
      .filter(trade => trade.tradeId.includes(focusedValue))
      .slice(0, 25);

    await interaction.respond(
      filtered.map(trade => ({
        name: `Trade ${trade.tradeId.slice(-8)} - ${trade.isInitiator ? 'Your offer' : 'Received'}`,
        value: trade.tradeId
      }))
    );
  },
  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'create') {
      const recipient = interaction.options.getUser('user');
      if (recipient.bot) {
        return interaction.reply({ content: 'You cannot trade with bots.', ephemeral: true });
      }
      if (recipient.id === interaction.user.id) {
        return interaction.reply({ content: 'You cannot trade with yourself.', ephemeral: true });
      }

      const yourItemsStr = interaction.options.getString('your_items');
      const yourCoins = interaction.options.getInteger('your_coins') || 0;
      const theirItemsStr = interaction.options.getString('their_items');
      const theirCoins = interaction.options.getInteger('their_coins') || 0;

      if (!yourItemsStr && yourCoins === 0 && !theirItemsStr && theirCoins === 0) {
        return interaction.reply({ content: 'You must offer at least one item or coin.', ephemeral: true });
      }

      // Parse items
      const yourItems = [];
      if (yourItemsStr) {
        const inventoryIds = yourItemsStr.split(',').map(id => id.trim());
        const inventory = await getUserInventory(interaction.user.id, false);
        for (const invId of inventoryIds) {
          const item = inventory.find(i => i.inventoryId === invId);
          if (item && !item.isExpired) {
            yourItems.push({ inventoryId: invId, quantity: 1 });
          }
        }
      }

      const theirItems = [];
      if (theirItemsStr) {
        const inventoryIds = theirItemsStr.split(',').map(id => id.trim());
        // We don't validate recipient items here - they'll be validated on acceptance
        for (const invId of inventoryIds) {
          theirItems.push({ inventoryId: invId, quantity: 1 });
        }
      }

      const result = await createTrade(
        interaction.user.id,
        recipient.id,
        yourItems,
        theirItems,
        yourCoins,
        theirCoins
      );

      if (!result.success) {
        return interaction.reply({ content: result.message, ephemeral: true });
      }

      const embed = new EmbedBuilder()
        .setColor(0x3498DB)
        .setTitle('✅ Trade Offer Created')
        .setDescription(`Trade offer sent to ${recipient.toString()}`)
        .addFields(
          { name: 'Trade ID', value: result.tradeId, inline: true },
          { name: 'Expires In', value: '24 hours', inline: true }
        )
        .setTimestamp();

      if (yourItems.length > 0 || yourCoins > 0) {
        let yourOffer = '';
        if (yourItems.length > 0) {
          yourOffer += `Items: ${yourItems.length}\n`;
        }
        if (yourCoins > 0) {
          yourOffer += `Coins: ${yourCoins.toLocaleString()}`;
        }
        embed.addFields({ name: 'Your Offer', value: yourOffer || 'None', inline: false });
      }

      if (theirItems.length > 0 || theirCoins > 0) {
        let theirOffer = '';
        if (theirItems.length > 0) {
          theirOffer += `Items: ${theirItems.length}\n`;
        }
        if (theirCoins > 0) {
          theirOffer += `Coins: ${theirCoins.toLocaleString()}`;
        }
        embed.addFields({ name: 'Expected From Them', value: theirOffer || 'None', inline: false });
      }

      embed.setFooter({ text: 'Use /trade view <trade_id> to view details' });

      await interaction.reply({ embeds: [embed], ephemeral: true });
    } else if (subcommand === 'accept') {
      const tradeId = interaction.options.getString('trade_id');
      const result = await acceptTrade(tradeId, interaction.user.id);

      if (!result.success) {
        return interaction.reply({ content: result.message, ephemeral: true });
      }

      const embed = new EmbedBuilder()
        .setColor(0x2ECC71)
        .setTitle('✅ Trade Accepted')
        .setDescription('Trade completed successfully!')
        .setTimestamp();

      await interaction.reply({ embeds: [embed], ephemeral: true });
    } else if (subcommand === 'reject') {
      const tradeId = interaction.options.getString('trade_id');
      const result = await rejectTrade(tradeId, interaction.user.id);

      if (!result.success) {
        return interaction.reply({ content: result.message, ephemeral: true });
      }

      const embed = new EmbedBuilder()
        .setColor(0xE74C3C)
        .setTitle('❌ Trade Rejected')
        .setDescription('Trade offer has been rejected.')
        .setTimestamp();

      await interaction.reply({ embeds: [embed], ephemeral: true });
    } else if (subcommand === 'cancel') {
      const tradeId = interaction.options.getString('trade_id');
      const result = await cancelTrade(tradeId, interaction.user.id);

      if (!result.success) {
        return interaction.reply({ content: result.message, ephemeral: true });
      }

      const embed = new EmbedBuilder()
        .setColor(0x95A5A6)
        .setTitle('🚫 Trade Cancelled')
        .setDescription('Trade offer has been cancelled.')
        .setTimestamp();

      await interaction.reply({ embeds: [embed], ephemeral: true });
    } else if (subcommand === 'view') {
      const tradeId = interaction.options.getString('trade_id');
      const trade = await getTrade(tradeId);

      if (!trade) {
        return interaction.reply({ content: 'Trade not found.', ephemeral: true });
      }

      const isInitiator = trade.initiatorId === interaction.user.id;
      const isRecipient = trade.recipientId === interaction.user.id;

      if (!isInitiator && !isRecipient) {
        return interaction.reply({ content: 'You are not part of this trade.', ephemeral: true });
      }

      const embed = new EmbedBuilder()
        .setColor(0x3498DB)
        .setTitle('📋 Trade Details')
        .addFields(
          { name: 'Trade ID', value: trade.tradeId, inline: true },
          { name: 'Status', value: trade.status, inline: true },
          { name: 'Created', value: `<t:${trade.createdAt}:R>`, inline: true }
        )
        .setTimestamp();

      if (trade.status === 'pending') {
        embed.addFields({ name: 'Expires', value: `<t:${trade.expiresAt}:R>`, inline: true });
      }

      // Get item names
      const initiatorInventory = await getUserInventory(trade.initiatorId, false);
      const recipientInventory = await getUserInventory(trade.recipientId, false);

      let initiatorOffer = '';
      if (trade.initiatorItems.length > 0) {
        for (const item of trade.initiatorItems) {
          const invItem = initiatorInventory.find(i => i.inventoryId === item.inventoryId);
          initiatorOffer += `${invItem ? invItem.name : 'Unknown'} x${item.quantity}\n`;
        }
      }
      if (trade.initiatorCoins > 0) {
        initiatorOffer += `${trade.initiatorCoins.toLocaleString()} coins`;
      }
      if (!initiatorOffer) {
        initiatorOffer = 'None';
      }

      let recipientOffer = '';
      if (trade.recipientItems.length > 0) {
        for (const item of trade.recipientItems) {
          const invItem = recipientInventory.find(i => i.inventoryId === item.inventoryId);
          recipientOffer += `${invItem ? invItem.name : 'Unknown'} x${item.quantity}\n`;
        }
      }
      if (trade.recipientCoins > 0) {
        recipientOffer += `${trade.recipientCoins.toLocaleString()} coins`;
      }
      if (!recipientOffer) {
        recipientOffer = 'None';
      }

      embed.addFields(
        { name: isInitiator ? 'Your Offer' : 'Initiator Offer', value: initiatorOffer, inline: false },
        { name: isRecipient ? 'Your Offer' : 'Recipient Offer', value: recipientOffer, inline: false }
      );

      if (isRecipient && trade.status === 'pending') {
        embed.setFooter({ text: 'Use /trade accept or /trade reject to respond' });
      }

      await interaction.reply({ embeds: [embed], ephemeral: true });
    }
  },
};

