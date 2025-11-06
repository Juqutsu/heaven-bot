const { Events } = require('discord.js');
const { getGuildSettings } = require('../utils/database');
const logger = require('../utils/logger');

module.exports = {
  name: Events.GuildMemberRemove,
  async execute(member) {
    try {
      const guild = member.guild;
      const settings = await getGuildSettings(guild.id);
      if (!settings.goodbyeChannelId || !settings.goodbyeMessage) return;

      const channel = guild.channels.cache.get(settings.goodbyeChannelId);
      if (!channel) return;

      const template = settings.goodbyeMessage;
      const rendered = (template || '')
        .replaceAll('{user}', member.user?.username || member.displayName || 'User')
        .replaceAll('{tag}', member.user?.tag || member.displayName || 'User')
        .replaceAll('{mention}', `<@${member.id}>`)
        .replaceAll('{server}', guild.name)
        .replaceAll('{memberCount}', `${guild.memberCount}`);

      await channel.send({ content: rendered });
    } catch (error) {
      logger.error('Error sending goodbye message:', error);
    }
  }
};


