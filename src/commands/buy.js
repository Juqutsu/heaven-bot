const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { getShopItem, purchaseItem } = require('../utils/shop');
const { getUserBalance } = require('../utils/economy');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('buy')
    .setDescription('Purchase an item from the shop')
    .addStringOption(option =>
      option.setName('item')
        .setDescription('Item ID to purchase')
        .setRequired(true)
        .setAutocomplete(true))
    .addIntegerOption(option =>
      option.setName('quantity')
        .setDescription('Quantity to purchase (default: 1)')
        .setRequired(false)
        .setMinValue(1)
        .setMaxValue(10)),
  async autocomplete(interaction) {
    const focusedValue = interaction.options.getFocused();
    const { getShopItems } = require('../utils/shop');
    const items = await getShopItems();

    // Filter items based on user input
    const filtered = items
      .filter(item => item.name.toLowerCase().includes(focusedValue.toLowerCase()) || item.itemId.includes(focusedValue))
      .slice(0, 25);

    await interaction.respond(
      filtered.map(item => ({
        name: `${item.icon || ''} ${item.name} - ${item.price.toLocaleString()} coins`,
        value: item.itemId
      }))
    );
  },
  async execute(interaction) {
    const itemId = interaction.options.getString('item');
    const quantity = interaction.options.getInteger('quantity') || 1;

    // Get item info
    const item = await getShopItem(itemId);
    if (!item) {
      return interaction.reply({
        content: 'Item not found or not available.',
        flags: MessageFlags.Ephemeral
      });
    }

    // Check balance
    const balance = getUserBalance(interaction.user.id);
    const totalCost = item.price * quantity;

    if (balance < totalCost) {
      return interaction.reply({
        content: `Insufficient coins! You need ${totalCost.toLocaleString()} coins but only have ${balance.toLocaleString()}.`,
        flags: MessageFlags.Ephemeral
      });
    }

    // Purchase item
    const result = await purchaseItem(interaction.user.id, itemId, quantity);

    if (!result.success) {
      return interaction.reply({
        content: result.message,
        flags: MessageFlags.Ephemeral
      });
    }

    // Success embed
    const embed = new EmbedBuilder()
      .setColor(0x2ECC71)
      .setTitle('✅ Purchase Successful!')
      .setDescription(`You purchased **${quantity}x ${item.name}** for **${totalCost.toLocaleString()}** coins.`)
      .addFields(
        { name: 'Remaining Balance', value: `${(balance - totalCost).toLocaleString()} coins`, inline: true },
        { name: 'Item Category', value: item.category.replace(/_/g, ' '), inline: true }
      )
      .setTimestamp();

    if (item.durationHours) {
      embed.addFields({ name: 'Duration', value: `${item.durationHours} hours`, inline: true });
    }

    embed.setFooter({ text: 'Use /inventory to view your items, /use to activate them' });

    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  },
};

