const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { getUserInventory, activateItem } = require('../utils/inventory');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('use')
    .setDescription('Activate an item from your inventory')
    .addStringOption(option =>
      option.setName('item')
        .setDescription('Item ID or inventory ID to activate')
        .setRequired(true)
        .setAutocomplete(true)),
  async autocomplete(interaction) {
    const focusedValue = interaction.options.getFocused();
    const inventory = await getUserInventory(interaction.user.id, false);

    // Filter items based on user input
    const filtered = inventory
      .filter(item => {
        const search = focusedValue.toLowerCase();
        return item.name.toLowerCase().includes(search) ||
               item.itemId.toLowerCase().includes(search) ||
               item.inventoryId.toLowerCase().includes(search);
      })
      .slice(0, 25);

    await interaction.respond(
      filtered.map(item => ({
        name: `${item.icon || ''} ${item.name}${item.isExpired ? ' (Expired)' : ''}`,
        value: item.inventoryId
      }))
    );
  },
  async execute(interaction) {
    const itemIdentifier = interaction.options.getString('item');

    // Get user inventory
    const inventory = await getUserInventory(interaction.user.id, false);

    // Find item by inventory ID or item ID
    let inventoryItem = inventory.find(item => item.inventoryId === itemIdentifier);
    if (!inventoryItem) {
      inventoryItem = inventory.find(item => item.itemId === itemIdentifier);
    }

    if (!inventoryItem) {
      return interaction.reply({
        content: 'Item not found in your inventory.',
        flags: MessageFlags.Ephemeral
      });
    }

    if (inventoryItem.isExpired) {
      return interaction.reply({
        content: 'This item has expired and cannot be activated.',
        flags: MessageFlags.Ephemeral
      });
    }

    // Activate item
    const result = await activateItem(interaction.user.id, inventoryItem.inventoryId);

    if (!result.success) {
      return interaction.reply({
        content: result.message,
        flags: MessageFlags.Ephemeral
      });
    }

    // Success embed
    const embed = new EmbedBuilder()
      .setColor(0x2ECC71)
      .setTitle('✅ Item Activated!')
      .setDescription(`**${inventoryItem.name}** has been activated.`)
      .setTimestamp();

    if (inventoryItem.durationHours) {
      embed.addFields({
        name: 'Duration',
        value: `${inventoryItem.durationHours} hours`,
        inline: true
      });
    }

    if (inventoryItem.category === 'xp_boost' && inventoryItem.metadata && inventoryItem.metadata.multiplier) {
      embed.addFields({
        name: 'XP Boost',
        value: `${inventoryItem.metadata.multiplier}x multiplier`,
        inline: true
      });
    }

    embed.setFooter({ text: 'Check /inventory to see your active items' });

    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  },
};

