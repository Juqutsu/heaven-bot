const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { getUserInventory, getActiveItems } = require('../utils/inventory');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('inventory')
    .setDescription('View your inventory')
    .addBooleanOption(option =>
      option.setName('show_expired')
        .setDescription('Show expired items')
        .setRequired(false)),
  async execute(interaction) {
    const showExpired = interaction.options.getBoolean('show_expired') || false;
    const inventory = await getUserInventory(interaction.user.id, showExpired);
    const activeItems = await getActiveItems(interaction.user.id);

    if (inventory.length === 0 && activeItems.length === 0) {
      return interaction.reply({
        content: 'Your inventory is empty. Use `/shop` to browse available items!',
        flags: MessageFlags.Ephemeral
      });
    }

    const embed = new EmbedBuilder()
      .setColor(0x3498DB)
      .setAuthor({ name: interaction.user.username, iconURL: interaction.user.displayAvatarURL() })
      .setTitle('📦 Your Inventory')
      .setTimestamp();

    // Active items
    if (activeItems.length > 0) {
      let activeValue = '';
      for (const item of activeItems) {
        const expiresIn = Math.floor((item.expiresAt - Math.floor(Date.now() / 1000)) / 3600);
        activeValue += `${item.icon || '•'} **${item.name}** - Expires in ${expiresIn}h\n`;
      }
      embed.addFields({
        name: '✨ Active Items',
        value: activeValue,
        inline: false
      });
    }

    // Inventory items
    if (inventory.length > 0) {
      // Group by category
      const itemsByCategory = {};
      for (const item of inventory) {
        if (!itemsByCategory[item.category]) {
          itemsByCategory[item.category] = [];
        }
        itemsByCategory[item.category].push(item);
      }

      for (const [category, items] of Object.entries(itemsByCategory)) {
        let fieldValue = '';
        for (const item of items.slice(0, 10)) {
          const expired = item.isExpired ? ' ⏰ *Expired*' : '';
          const expires = item.expiresAt && !item.isExpired
            ? ` (Expires in ${Math.floor((item.expiresAt - Math.floor(Date.now() / 1000)) / 3600)}h)`
            : '';
          fieldValue += `${item.icon || '•'} **${item.name}** x${item.quantity}${expires}${expired}\n`;
        }
        if (items.length > 10) {
          fieldValue += `*...and ${items.length - 10} more*`;
        }
        embed.addFields({
          name: `${category.charAt(0).toUpperCase() + category.slice(1).replace(/_/g, ' ')}`,
          value: fieldValue || 'No items',
          inline: false
        });
      }
    }

    embed.setFooter({ text: 'Use /use <inventory_id> to activate items' });

    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  },
};

