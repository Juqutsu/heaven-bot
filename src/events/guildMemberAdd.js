const { Events } = require('discord.js');
const { getGuildSettings } = require('../utils/database');
const logger = require('../utils/logger');

module.exports = {
  name: Events.GuildMemberAdd,
  async execute(member) {
    try {
      const guild = member.guild;
      const settings = await getGuildSettings(guild.id);
      if (!settings.welcomeChannelId || !settings.welcomeMessage) return;

      const channel = guild.channels.cache.get(settings.welcomeChannelId);
      if (!channel) return;

      const template = settings.welcomeMessage;
      const rendered = (template || '')
        .replaceAll('{user}', member.user.username)
        .replaceAll('{tag}', member.user.tag || `${member.user.username}#${member.user.discriminator}`)
        .replaceAll('{mention}', `<@${member.id}>`)
        .replaceAll('{server}', guild.name)
        .replaceAll('{memberCount}', `${guild.memberCount}`);

      await channel.send({ content: rendered });
    } catch (error) {
      logger.error('Error sending welcome message:', error);
    }
  }
};


