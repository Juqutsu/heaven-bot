// Discord presence forwarder for the .de website.
//
// Streams PRESENCE_UPDATE events from this bot to the .de backend so live
// status appears on public profiles.
//
// Requires Node 18+ (uses globalThis.fetch) and the GuildPresences +
// GuildMembers privileged intents to be enabled in the Discord developer
// portal AND requested in the Client constructor.

const logger = require('./logger');

const RECENT_DEDUPE_MS = 1500;
const recent = new Map(); // discord_user_id → last-pushed ms

function shapePresence(presence) {
  if (!presence?.userId) return null;
  return {
    discord_user_id: presence.userId,
    status: typeof presence.status === 'string' ? presence.status : 'offline',
    activities: Array.isArray(presence.activities)
      ? presence.activities.map((a) => ({
          type: typeof a?.type === 'number' ? a.type : 0,
          name: typeof a?.name === 'string' ? a.name : '',
          details: typeof a?.details === 'string' ? a.details : null,
          state: typeof a?.state === 'string' ? a.state : null,
          application_id: typeof a?.applicationId === 'string' ? a.applicationId : null,
        }))
      : [],
    updated_at: Date.now(),
  };
}

async function pushOne(deUrl, secret, payload) {
  if (!payload) return;
  const last = recent.get(payload.discord_user_id) || 0;
  if (Date.now() - last < RECENT_DEDUPE_MS) return;
  recent.set(payload.discord_user_id, Date.now());

  try {
    await fetch(`${deUrl.replace(/\/+$/, '')}/api/internal/discord/presence`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Bot-Secret': secret,
      },
      body: JSON.stringify(payload),
    });
  } catch {
    // Soft-fail; .de will be refilled by the next event.
  }
}

/**
 * Attach PRESENCE_UPDATE listeners to a discord.js Client.
 *
 * @param {import("discord.js").Client} client
 * @param {{ deUrl: string, secret: string }} opts
 */
function attachDiscordPresenceForwarder(client, opts) {
  const { deUrl, secret } = opts || {};
  if (!deUrl || !secret) {
    logger.warn('[de-presence] disabled: missing DE_INTERNAL_URL or DE_INTERNAL_SECRET');
    return;
  }

  client.on('presenceUpdate', (_oldPresence, newPresence) => {
    pushOne(deUrl, secret, shapePresence(newPresence));
  });

  // On READY, push a snapshot of every cached presence so .de has a warm
  // cache without waiting for the next presence change.
  client.once('ready', () => {
    let pushed = 0;
    for (const guild of client.guilds.cache.values()) {
      for (const presence of guild.presences.cache.values()) {
        pushOne(deUrl, secret, shapePresence(presence));
        pushed++;
      }
    }
    logger.info(`[de-presence] READY snapshot: pushed ${pushed} presences`);
  });
}

module.exports = { attachDiscordPresenceForwarder };
