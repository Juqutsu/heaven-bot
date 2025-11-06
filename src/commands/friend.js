const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const {
  sendFriendRequest,
  acceptFriendRequest,
  removeFriend,
  getFriends,
  getPendingRequests,
  getSentRequests
} = require('../utils/friends');
const { getUserData } = require('../utils/database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('friend')
    .setDescription('Manage your friends')
    .addSubcommand(subcommand =>
      subcommand
        .setName('add')
        .setDescription('Send a friend request')
        .addUserOption(option =>
          option.setName('user')
            .setDescription('User to friend')
            .setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('accept')
        .setDescription('Accept a friend request')
        .addUserOption(option =>
          option.setName('user')
            .setDescription('User who sent the request')
            .setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('remove')
        .setDescription('Remove a friend')
        .addUserOption(option =>
          option.setName('user')
            .setDescription('User to remove')
            .setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('list')
        .setDescription('List your friends'))
    .addSubcommand(subcommand =>
      subcommand
        .setName('requests')
        .setDescription('View pending friend requests')),
  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'add') {
      const user = interaction.options.getUser('user');
      if (user.bot) {
        return interaction.reply({ content: 'You cannot friend bots.', ephemeral: true });
      }
      if (user.id === interaction.user.id) {
        return interaction.reply({ content: 'You cannot friend yourself.', ephemeral: true });
      }

      const result = await sendFriendRequest(interaction.user.id, user.id);
      if (!result.success) {
        return interaction.reply({ content: result.message, ephemeral: true });
      }

      const embed = new EmbedBuilder()
        .setColor(0x3498DB)
        .setTitle('✅ Friend Request Sent')
        .setDescription(`Friend request sent to ${user.toString()}`)
        .setTimestamp();

      await interaction.reply({ embeds: [embed], ephemeral: true });
    } else if (subcommand === 'accept') {
      const user = interaction.options.getUser('user');
      const result = await acceptFriendRequest(interaction.user.id, user.id);

      if (!result.success) {
        return interaction.reply({ content: result.message, ephemeral: true });
      }

      const embed = new EmbedBuilder()
        .setColor(0x2ECC71)
        .setTitle('✅ Friend Request Accepted')
        .setDescription(`You are now friends with ${user.toString()}!`)
        .setTimestamp();

      await interaction.reply({ embeds: [embed], ephemeral: true });
    } else if (subcommand === 'remove') {
      const user = interaction.options.getUser('user');
      const result = await removeFriend(interaction.user.id, user.id);

      if (!result.success) {
        return interaction.reply({ content: result.message, ephemeral: true });
      }

      const embed = new EmbedBuilder()
        .setColor(0xE74C3C)
        .setTitle('❌ Friend Removed')
        .setDescription(`Removed ${user.toString()} from your friends list`)
        .setTimestamp();

      await interaction.reply({ embeds: [embed], ephemeral: true });
    } else if (subcommand === 'list') {
      const friends = await getFriends(interaction.user.id);

      if (friends.length === 0) {
        return interaction.reply({
          content: 'You have no friends. Use `/friend add` to send friend requests!',
          ephemeral: true
        });
      }

      const embed = new EmbedBuilder()
        .setColor(0x3498DB)
        .setAuthor({ name: interaction.user.username, iconURL: interaction.user.displayAvatarURL() })
        .setTitle('👥 Your Friends')
        .setTimestamp();

      let friendsList = '';
      for (const friendId of friends.slice(0, 20)) {
        friendsList += `<@${friendId}>\n`;
      }

      if (friends.length > 20) {
        friendsList += `\n*...and ${friends.length - 20} more*`;
      }

      embed.setDescription(friendsList);
      embed.setFooter({ text: `Total: ${friends.length} friends` });

      await interaction.reply({ embeds: [embed], ephemeral: true });
    } else if (subcommand === 'requests') {
      const pending = await getPendingRequests(interaction.user.id);
      const sent = await getSentRequests(interaction.user.id);

      if (pending.length === 0 && sent.length === 0) {
        return interaction.reply({
          content: 'You have no pending friend requests.',
          ephemeral: true
        });
      }

      const embed = new EmbedBuilder()
        .setColor(0x3498DB)
        .setAuthor({ name: interaction.user.username, iconURL: interaction.user.displayAvatarURL() })
        .setTitle('📬 Friend Requests')
        .setTimestamp();

      if (pending.length > 0) {
        let pendingList = '';
        for (const req of pending.slice(0, 10)) {
          pendingList += `<@${req.friendId}> - <t:${req.createdAt}:R>\n`;
        }
        embed.addFields({
          name: `📥 Received (${pending.length})`,
          value: pendingList || 'None',
          inline: false
        });
      }

      if (sent.length > 0) {
        let sentList = '';
        for (const req of sent.slice(0, 10)) {
          sentList += `<@${req.friendId}> - <t:${req.createdAt}:R>\n`;
        }
        embed.addFields({
          name: `📤 Sent (${sent.length})`,
          value: sentList || 'None',
          inline: false
        });
      }

      await interaction.reply({ embeds: [embed], ephemeral: true });
    }
  },
};

