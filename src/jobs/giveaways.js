const { getActiveGiveaways, getGiveawayEntries, updateGiveawayStatus } = require('../utils/database');
const logger = require('../utils/logger');

function pickWinners(entries, count) {
  const pool = [...new Set(entries)];
  const winners = [];
  count = Math.min(count, pool.length);
  while (winners.length < count) {
    const i = Math.floor(Math.random() * pool.length);
    winners.push(pool.splice(i, 1)[0]);
  }
  return winners;
}

async function concludeGiveaway(client, giveaway) {
  try {
    const channel = await client.channels.fetch(giveaway.channel_id).catch(() => null);
    if (!channel) {
      await updateGiveawayStatus(giveaway.giveaway_id, 'ended');
      return;
    }
    const message = await channel.messages.fetch(giveaway.message_id).catch(() => null);
    const entries = await getGiveawayEntries(giveaway.giveaway_id);
    const winners = pickWinners(entries, giveaway.winner_count);
    const mention = winners.length > 0 ? winners.map(id => `<@${id}>`).join(', ') : 'No valid entries';

    if (message) {
      await message.reply(`🎉 Giveaway ended! Winners for "${giveaway.prize}": ${mention}`);
    } else {
      await channel.send(`🎉 Giveaway ended! Winners for "${giveaway.prize}": ${mention}`);
    }

    await updateGiveawayStatus(giveaway.giveaway_id, 'ended');
  } catch (error) {
    logger.error('Error concluding giveaway:', error);
  }
}

function startGiveawayScheduler(client) {
  const TICK_MS = 15 * 1000; // check every 15s
  setInterval(async () => {
    try {
      const now = Math.floor(Date.now() / 1000);
      const running = await getActiveGiveaways();
      for (const gw of running) {
        if (gw.status !== 'running') continue;
        if (gw.end_time <= now) {
          await concludeGiveaway(client, gw);
        }
      }
    } catch (error) {
      logger.error('Giveaway scheduler error:', error);
    }
  }, TICK_MS);
}

module.exports = { startGiveawayScheduler };


