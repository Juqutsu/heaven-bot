const { Events } = require('discord.js');
const { getReactionRoleMappingsForMessage } = require('../utils/database');
const logger = require('../utils/logger');

module.exports = {
  name: Events.MessageReactionRemove,
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

      // Reaction Roles (remove role)
      const mappings = await getReactionRoleMappingsForMessage(guildId, messageId);
      if (mappings.length > 0) {
        const match = mappings.find(m => m.emoji === (reaction.emoji.id ? reaction.emoji.id : reaction.emoji.name));
        if (match) {
          try {
            const member = await message.guild.members.fetch(user.id).catch(() => null);
            if (member && member.roles.cache.has(match.roleId)) {
              await member.roles.remove(match.roleId).catch(() => {});
            }
          } catch (err) {
            logger.error('Error removing reaction role:', err);
          }
        }
      }
    } catch (error) {
      logger.error('Error in MessageReactionRemove handler:', error);
    }
  }
};


