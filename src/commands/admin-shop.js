const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { getDatabase } = require('../utils/database');
const { getShopItem, getShopItems } = require('../utils/shop');
const { isAdmin } = require('../utils/admin');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('admin-shop')
    .setDescription('Admin: Manage shop items')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(subcommand =>
      subcommand
        .setName('add')
        .setDescription('Add a new shop item')
        .addStringOption(option =>
          option.setName('item_id')
            .setDescription('Item ID (unique identifier)')
            .setRequired(true))
        .addStringOption(option =>
          option.setName('name')
            .setDescription('Item name')
            .setRequired(true))
        .addStringOption(option =>
          option.setName('description')
            .setDescription('Item description')
            .setRequired(true))
        .addStringOption(option =>
          option.setName('category')
            .setDescription('Item category')
            .setRequired(true)
            .addChoices(
              { name: 'XP Boost', value: 'xp_boost' },
              { name: 'Rank Card Theme', value: 'rank_card_theme' },
              { name: 'Temporary Role', value: 'temporary_role' },
              { name: 'Badge', value: 'badge' },
              { name: 'Title', value: 'title' }
            ))
        .addIntegerOption(option =>
          option.setName('price')
            .setDescription('Item price in coins')
            .setRequired(true)
            .setMinValue(0))
        .addIntegerOption(option =>
          option.setName('duration_hours')
            .setDescription('Duration in hours (0 for permanent)')
            .setRequired(false)
            .setMinValue(0))
        .addStringOption(option =>
          option.setName('icon')
            .setDescription('Item icon/emoji')
            .setRequired(false))
        .addStringOption(option =>
          option.setName('rarity')
            .setDescription('Item rarity')
            .setRequired(false)
            .addChoices(
              { name: 'Common', value: 'common' },
              { name: 'Rare', value: 'rare' },
              { name: 'Epic', value: 'epic' },
              { name: 'Legendary', value: 'legendary' }
            )))
    .addSubcommand(subcommand =>
      subcommand
        .setName('modify')
        .setDescription('Modify an existing shop item')
        .addStringOption(option =>
          option.setName('item_id')
            .setDescription('Item ID to modify')
            .setRequired(true)
            .setAutocomplete(true))
        .addStringOption(option =>
          option.setName('name')
            .setDescription('New item name')
            .setRequired(false))
        .addStringOption(option =>
          option.setName('description')
            .setDescription('New item description')
            .setRequired(false))
        .addIntegerOption(option =>
          option.setName('price')
            .setDescription('New item price')
            .setRequired(false)
            .setMinValue(0))
        .addIntegerOption(option =>
          option.setName('stock')
            .setDescription('New stock amount (leave empty for unlimited)')
            .setRequired(false)
            .setMinValue(0))
        .addBooleanOption(option =>
          option.setName('available')
            .setDescription('Item availability')
            .setRequired(false)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('delete')
        .setDescription('Delete a shop item')
        .addStringOption(option =>
          option.setName('item_id')
            .setDescription('Item ID to delete')
            .setRequired(true)
            .setAutocomplete(true))),
  async autocomplete(interaction) {
    const focusedValue = interaction.options.getFocused();
    const items = await getShopItems();

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
    // Check admin permissions
    if (!isAdmin(interaction.member)) {
      return interaction.reply({
        content: 'You do not have permission to use this command.',
        ephemeral: true
      });
    }

    const subcommand = interaction.options.getSubcommand();
    const db = getDatabase();

    if (subcommand === 'add') {
      const itemId = interaction.options.getString('item_id');
      const name = interaction.options.getString('name');
      const description = interaction.options.getString('description');
      const category = interaction.options.getString('category');
      const price = interaction.options.getInteger('price');
      const durationHours = interaction.options.getInteger('duration_hours') || null;
      const icon = interaction.options.getString('icon') || null;
      const rarity = interaction.options.getString('rarity') || 'common';

      // Check if item already exists
      const existing = await getShopItem(itemId);
      if (existing) {
        return interaction.reply({
          content: `Item with ID "${itemId}" already exists.`,
          ephemeral: true
        });
      }

      // Create item
      db.prepare(`
        INSERT INTO shop_items (
          item_id, name, description, category, price, duration_hours,
          icon, rarity, available, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, strftime('%s', 'now'), strftime('%s', 'now'))
      `).run(itemId, name, description, category, price, durationHours, icon, rarity);

      const embed = new EmbedBuilder()
        .setColor(0x2ECC71)
        .setTitle('✅ Item Added')
        .setDescription(`Successfully added item **${name}** to the shop`)
        .addFields(
          { name: 'Item ID', value: itemId, inline: true },
          { name: 'Category', value: category, inline: true },
          { name: 'Price', value: `${price.toLocaleString()} coins`, inline: true }
        )
        .setTimestamp();

      if (durationHours) {
        embed.addFields({ name: 'Duration', value: `${durationHours} hours`, inline: true });
      }

      await interaction.reply({ embeds: [embed], ephemeral: true });
    } else if (subcommand === 'modify') {
      const itemId = interaction.options.getString('item_id');
      const item = await getShopItem(itemId);

      if (!item) {
        return interaction.reply({
          content: 'Item not found.',
          ephemeral: true
        });
      }

      const updates = [];
      const values = [];

      const name = interaction.options.getString('name');
      if (name) {
        updates.push('name = ?');
        values.push(name);
      }

      const description = interaction.options.getString('description');
      if (description) {
        updates.push('description = ?');
        values.push(description);
      }

      const price = interaction.options.getInteger('price');
      if (price !== null) {
        updates.push('price = ?');
        values.push(price);
      }

      const stock = interaction.options.getInteger('stock');
      if (stock !== null) {
        updates.push('stock = ?');
        values.push(stock);
      }

      const available = interaction.options.getBoolean('available');
      if (available !== null) {
        updates.push('available = ?');
        values.push(available ? 1 : 0);
      }

      if (updates.length === 0) {
        return interaction.reply({
          content: 'No fields to update.',
          ephemeral: true
        });
      }

      updates.push('updated_at = strftime(\'%s\', \'now\')');
      values.push(itemId);

      db.prepare(`
        UPDATE shop_items
        SET ${updates.join(', ')}
        WHERE item_id = ?
      `).run(...values);

      const embed = new EmbedBuilder()
        .setColor(0x3498DB)
        .setTitle('⚙️ Item Modified')
        .setDescription(`Successfully modified item **${item.name}**`)
        .setTimestamp();

      await interaction.reply({ embeds: [embed], ephemeral: true });
    } else if (subcommand === 'delete') {
      const itemId = interaction.options.getString('item_id');
      const item = await getShopItem(itemId);

      if (!item) {
        return interaction.reply({
          content: 'Item not found.',
          ephemeral: true
        });
      }

      // Delete item (set available to 0 instead of actually deleting)
      db.prepare('UPDATE shop_items SET available = 0, updated_at = strftime(\'%s\', \'now\') WHERE item_id = ?').run(itemId);

      const embed = new EmbedBuilder()
        .setColor(0xE74C3C)
        .setTitle('🗑️ Item Deleted')
        .setDescription(`Item **${item.name}** has been removed from the shop`)
        .setTimestamp();

      await interaction.reply({ embeds: [embed], ephemeral: true });
    }
  },
};

