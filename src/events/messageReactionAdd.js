const { Events } = require('discord.js');
const { getReactionRoleMappingsForMessage, getGiveawayByMessageId, addGiveawayEntry } = require('../utils/database');
const logger = require('../utils/logger');

module.exports = {
  name: Events.MessageReactionAdd,
  async execute(reaction, user) {
    try {
      // Handle partials
      if (reaction.partial) {
        try { await reaction.fetch(); } catch { return; }
      }
      if (user.bot) return;
      const message = reaction.message;
      if (!message.guild) return;

      const guildId = message.guild.id;
      const messageId = message.id;

      // Reaction Roles
      const mappings = await getReactionRoleMappingsForMessage(guildId, messageId);
      if (mappings.length > 0) {
        const match = mappings.find(m => m.emoji === (reaction.emoji.id ? reaction.emoji.id : reaction.emoji.name));
        if (match) {
          try {
            const member = await message.guild.members.fetch(user.id).catch(() => null);
            if (member && !member.roles.cache.has(match.roleId)) {
              await member.roles.add(match.roleId).catch(() => {});
            }
          } catch (err) {
            logger.error('Error assigning reaction role:', err);
          }
        }
      }

      // Giveaway entry (🎉)
      if (reaction.emoji.name === '🎉') {
        const giveaway = await getGiveawayByMessageId(messageId);
        if (giveaway && giveaway.status === 'running') {
          await addGiveawayEntry(giveaway.giveaway_id, user.id);
        }
      }
    } catch (error) {
      logger.error('Error in MessageReactionAdd handler:', error);
    }
  }
};


