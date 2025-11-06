const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const {
  createGuild,
  joinGuild,
  leaveGuild,
  getGuild,
  getUserGuild,
  getGuildMembers,
  getGuildLeaderboard
} = require('../utils/guilds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('guild')
    .setDescription('Manage guilds/clans')
    .addSubcommand(subcommand =>
      subcommand
        .setName('create')
        .setDescription('Create a new guild')
        .addStringOption(option =>
          option.setName('name')
            .setDescription('Guild name')
            .setRequired(true)
            .setMaxLength(50))
        .addStringOption(option =>
          option.setName('description')
            .setDescription('Guild description')
            .setRequired(false)
            .setMaxLength(200)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('join')
        .setDescription('Join a guild')
        .addStringOption(option =>
          option.setName('guild_id')
            .setDescription('Guild ID to join')
            .setRequired(true)
            .setAutocomplete(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('leave')
        .setDescription('Leave your current guild'))
    .addSubcommand(subcommand =>
      subcommand
        .setName('info')
        .setDescription('View guild information')
        .addStringOption(option =>
          option.setName('guild_id')
            .setDescription('Guild ID (leave empty for your guild)')
            .setRequired(false)
            .setAutocomplete(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('members')
        .setDescription('View guild members'))
    .addSubcommand(subcommand =>
      subcommand
        .setName('leaderboard')
        .setDescription('View guild leaderboard')
        .addIntegerOption(option =>
          option.setName('limit')
            .setDescription('Number of guilds to show (default: 10)')
            .setRequired(false)
            .setMinValue(1)
            .setMaxValue(25))),
  async autocomplete(interaction) {
    const focusedValue = interaction.options.getFocused();
    // For now, return empty - can be enhanced with guild search
    await interaction.respond([]);
  },
  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'create') {
      const name = interaction.options.getString('name');
      const description = interaction.options.getString('description');

      const result = await createGuild(interaction.user.id, name, description);
      if (!result.success) {
        return interaction.reply({ content: result.message, ephemeral: true });
      }

      const embed = new EmbedBuilder()
        .setColor(0x2ECC71)
        .setTitle('✅ Guild Created')
        .setDescription(`Guild **${name}** has been created!`)
        .addFields(
          { name: 'Guild ID', value: result.guildId, inline: true },
          { name: 'Leader', value: interaction.user.toString(), inline: true }
        )
        .setTimestamp();

      if (description) {
        embed.addFields({ name: 'Description', value: description, inline: false });
      }

      await interaction.reply({ embeds: [embed], ephemeral: true });
    } else if (subcommand === 'join') {
      const guildId = interaction.options.getString('guild_id');
      const result = await joinGuild(interaction.user.id, guildId);

      if (!result.success) {
        return interaction.reply({ content: result.message, ephemeral: true });
      }

      const guild = await getGuild(guildId);
      const embed = new EmbedBuilder()
        .setColor(0x3498DB)
        .setTitle('✅ Joined Guild')
        .setDescription(`You joined **${guild.name}**!`)
        .setTimestamp();

      await interaction.reply({ embeds: [embed], ephemeral: true });
    } else if (subcommand === 'leave') {
      const result = await leaveGuild(interaction.user.id);
      if (!result.success) {
        return interaction.reply({ content: result.message, ephemeral: true });
      }

      const embed = new EmbedBuilder()
        .setColor(0xE74C3C)
        .setTitle('👋 Left Guild')
        .setDescription('You have left the guild.')
        .setTimestamp();

      await interaction.reply({ embeds: [embed], ephemeral: true });
    } else if (subcommand === 'info') {
      const guildId = interaction.options.getString('guild_id');
      let guild;

      if (guildId) {
        guild = await getGuild(guildId);
      } else {
        guild = await getUserGuild(interaction.user.id);
      }

      if (!guild) {
        return interaction.reply({
          content: guildId ? 'Guild not found.' : 'You are not in a guild.',
          ephemeral: true
        });
      }

      const embed = new EmbedBuilder()
        .setColor(0x3498DB)
        .setTitle(`🏰 ${guild.name}`)
        .setTimestamp();

      if (guild.description) {
        embed.setDescription(guild.description);
      }

      embed.addFields(
        { name: 'Level', value: `${guild.level}`, inline: true },
        { name: 'Experience', value: `${guild.experience.toLocaleString()}`, inline: true },
        { name: 'Coins', value: `${guild.coins.toLocaleString()}`, inline: true },
        { name: 'Members', value: `${guild.memberCount}/${guild.maxMembers}`, inline: true },
        { name: 'Leader', value: `<@${guild.leaderId}>`, inline: true }
      );

      await interaction.reply({ embeds: [embed] });
    } else if (subcommand === 'members') {
      const guild = await getUserGuild(interaction.user.id);
      if (!guild) {
        return interaction.reply({
          content: 'You are not in a guild.',
          ephemeral: true
        });
      }

      const members = await getGuildMembers(guild.guildId);

      const embed = new EmbedBuilder()
        .setColor(0x3498DB)
        .setTitle(`👥 ${guild.name} Members`)
        .setTimestamp();

      let membersList = '';
      for (const member of members.slice(0, 20)) {
        const roleEmoji = member.role === 'leader' ? '👑' : member.role === 'officer' ? '⭐' : '•';
        membersList += `${roleEmoji} <@${member.userId}> (${member.role})\n`;
      }

      if (members.length > 20) {
        membersList += `\n*...and ${members.length - 20} more*`;
      }

      embed.setDescription(membersList);
      embed.setFooter({ text: `Total: ${members.length} members` });

      await interaction.reply({ embeds: [embed] });
    } else if (subcommand === 'leaderboard') {
      const limit = interaction.options.getInteger('limit') || 10;
      const leaderboard = await getGuildLeaderboard('all_time', limit);

      if (leaderboard.length === 0) {
        return interaction.reply({
          content: 'No guilds found.',
          ephemeral: true
        });
      }

      const embed = new EmbedBuilder()
        .setColor(0xF1C40F)
        .setTitle('🏆 Guild Leaderboard')
        .setTimestamp();

      let leaderboardText = '';
      for (let i = 0; i < leaderboard.length; i++) {
        const guild = leaderboard[i];
        const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '•';
        leaderboardText += `${medal} **${guild.name}** - Level ${guild.level} - ${guild.experience.toLocaleString()} XP\n`;
      }

      embed.setDescription(leaderboardText);
      embed.setFooter({ text: `Top ${leaderboard.length} guilds` });

      await interaction.reply({ embeds: [embed] });
    }
  },
};

