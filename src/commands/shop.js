const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, MessageFlags } = require('discord.js');
const { getShopItems, getShopCategories } = require('../utils/shop');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('shop')
    .setDescription('Browse the shop')
    .addStringOption(option =>
      option.setName('category')
        .setDescription('Filter by category')
        .setRequired(false)
        .addChoices(
          { name: 'XP Boosts', value: 'xp_boost' },
          { name: 'Rank Card Themes', value: 'rank_card_theme' },
          { name: 'Temporary Roles', value: 'temporary_role' },
          { name: 'Badges', value: 'badge' },
          { name: 'Titles', value: 'title' }
        )),
  async execute(interaction) {
    const category = interaction.options.getString('category');
    const items = await getShopItems(category);

    if (items.length === 0) {
      return interaction.reply({
        content: category ? `No items available in the ${category} category.` : 'No items available in the shop.',
        flags: MessageFlags.Ephemeral
      });
    }

    // Group items by category
    const itemsByCategory = {};
    for (const item of items) {
      if (!itemsByCategory[item.category]) {
        itemsByCategory[item.category] = [];
      }
      itemsByCategory[item.category].push(item);
    }

    // Create embed
    const embed = new EmbedBuilder()
      .setColor(0x3498DB)
      .setTitle('🛒 Shop')
      .setDescription(category ? `Items in ${category} category` : 'Browse available items')
      .setTimestamp();

    // Add fields for each category
    for (const [cat, catItems] of Object.entries(itemsByCategory)) {
      let fieldValue = '';
      for (const item of catItems.slice(0, 10)) { // Limit to 10 items per category
        const duration = item.durationHours ? ` (${item.durationHours}h)` : '';
        const stock = item.stock !== null ? ` [${item.stock} left]` : '';
        fieldValue += `${item.icon || '•'} **${item.name}** - ${item.price.toLocaleString()} coins${duration}${stock}\n`;
      }
      if (catItems.length > 10) {
        fieldValue += `*...and ${catItems.length - 10} more*`;
      }
      embed.addFields({
        name: `${cat.charAt(0).toUpperCase() + cat.slice(1).replace(/_/g, ' ')}`,
        value: fieldValue || 'No items',
        inline: false
      });
    }

    embed.setFooter({ text: 'Use /buy <item_id> to purchase an item' });

    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  },
};

