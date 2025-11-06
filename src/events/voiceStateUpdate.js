const { Events } = require('discord.js');
const { updateVoiceXp, checkRoleRewards, checkPrestige } = require('../utils/leveling');
const { updateVoiceStats } = require('../utils/statistics');
const { getUserData, saveUserData } = require('../utils/database');
const logger = require('../utils/logger');
const { getCurrencySettings, earnCoins } = require('../utils/economy');

// Cache for voice sessions
const voiceSessionCache = new Map();

module.exports = {
  name: Events.VoiceStateUpdate,
  async execute(oldState, newState) {
    try {
      // Validate states
      if (!oldState || !newState) {
        return;
      }

      // Ignore bots
      if (!newState.member || !newState.member.user || newState.member.user.bot) {
        return;
      }
      
      const userId = newState.member.user.id;
      
      // User joined a voice channel
      if (!oldState.channelId && newState.channelId) {
        try {
          // Store join timestamp
          const timestamp = Date.now();
          const userData = await getUserData(userId);
          userData.voiceJoinTimestamp = timestamp;
          await saveUserData(userId, userData);

          // Add to cache
          voiceSessionCache.set(userId, {
            channelId: newState.channelId,
            joinTime: timestamp,
            lastUpdate: timestamp
          });
        } catch (joinError) {
          logger.error('Error handling voice join:', joinError);
        }
      } else if (oldState.channelId && !newState.channelId) {
        try {
          // Get voice session data
          const sessionData = voiceSessionCache.get(userId);
          if (!sessionData) {
            return;
          }
          
          // Calculate time spent in voice
          const leaveTime = Date.now();
          const minutesInVoice = Math.floor((leaveTime - sessionData.joinTime) / 60000);
          
          if (minutesInVoice > 0) {
            try {
              // Update voice statistics
              await updateVoiceStats(userId, minutesInVoice);
            } catch (statsError) {
              logger.error('Error updating voice statistics:', statsError);
            }
            
            // Check if user was AFK
            const wasAFK = oldState.guild && oldState.guild.afkChannelId ? 
              oldState.channelId === oldState.guild.afkChannelId : false;
            
            try {
              // Award XP for voice time
              const levelUpInfo = await updateVoiceXp(userId, minutesInVoice, wasAFK, newState.client, newState.member);
              // Award coins for voice time (if not AFK)
              try {
                const settings = await getCurrencySettings();
                const perMinute = Math.max(0, settings.voiceCoinsPerMinute || 0);
                const maxMinutes = Math.max(0, settings.voiceMaxMinutes || 60);
                if (!wasAFK && perMinute > 0) {
                  const eligibleMinutes = Math.min(minutesInVoice, maxMinutes);
                  const coinsToAward = eligibleMinutes * perMinute;
                  if (coinsToAward > 0) {
                    await earnCoins(userId, coinsToAward, 'voice');
                  }
                }
              } catch (coinErr) {
                logger.error('Error awarding voice coins:', coinErr);
              }
              
              // Handle level up
              if (levelUpInfo && newState.member) {
                try {
                  // Check for role rewards
                  const roleRewards = await checkRoleRewards(newState.member, levelUpInfo.newLevel);
                  
                  // Check for prestige
                  const prestigeInfo = await checkPrestige(newState.member, levelUpInfo.newLevel);
                  
                  // Send DM notification if enabled
                  const { sendLevelUpNotification } = require('../utils/notifications');
                  try {
                    await sendLevelUpNotification(newState.member.user, levelUpInfo, roleRewards, prestigeInfo);
                  } catch (dmError) {
                    // User may have DMs disabled, ignore
                  }
                  
                  // Check for achievement unlocks
                  if (levelUpInfo.achievements && levelUpInfo.achievements.length > 0) {
                    const { sendAchievementNotification } = require('../utils/notifications');
                    for (const achievement of levelUpInfo.achievements) {
                      try {
                        await sendAchievementNotification(newState.member.user, achievement);
                      } catch (achievementError) {
                        logger.error('Error sending achievement notification:', achievementError);
                      }
                    }
                  }
                } catch (roleError) {
                  logger.error('Error checking role rewards:', roleError);
                }
              }
            } catch (xpError) {
              logger.error('Error handling voice XP:', xpError);
            }
          }
          
          // Remove from cache
          voiceSessionCache.delete(userId);
        } catch (leaveError) {
          logger.error('Error handling voice leave:', leaveError);
          // Try to clean up cache anyway
          voiceSessionCache.delete(userId);
        }
      } else if (oldState.channelId !== newState.channelId) {
        try {
          // Get voice session data
          const sessionData = voiceSessionCache.get(userId);
          if (!sessionData) {
            // If no session data, create new entry
            voiceSessionCache.set(userId, {
              channelId: newState.channelId,
              joinTime: Date.now(),
              lastUpdate: Date.now()
            });
            return;
          }
          
          // Calculate time spent in previous channel
          const moveTime = Date.now();
          const minutesInVoice = Math.floor((moveTime - sessionData.lastUpdate) / 60000);
          
          if (minutesInVoice > 0) {
            try {
              // Was the user in AFK channel?
              const wasAFK = oldState.guild && oldState.guild.afkChannelId ? 
                oldState.channelId === oldState.guild.afkChannelId : false;
              
              // Update voice statistics
              await updateVoiceStats(userId, minutesInVoice);
              
              // Award XP for voice time
              const levelUpInfo = await updateVoiceXp(userId, minutesInVoice, wasAFK, newState.client, newState.member);
              // Award coins for voice time (if not AFK)
              try {
                const settings = await getCurrencySettings();
                const perMinute = Math.max(0, settings.voiceCoinsPerMinute || 0);
                const maxMinutes = Math.max(0, settings.voiceMaxMinutes || 60);
                if (!wasAFK && perMinute > 0) {
                  const eligibleMinutes = Math.min(minutesInVoice, maxMinutes);
                  const coinsToAward = eligibleMinutes * perMinute;
                  if (coinsToAward > 0) {
                    await earnCoins(userId, coinsToAward, 'voice');
                  }
                }
              } catch (coinErr) {
                logger.error('Error awarding voice coins on move:', coinErr);
              }
              
              // Handle level up
              if (levelUpInfo && newState.member) {
                try {
                  // Check for role rewards
                  const roleRewards = await checkRoleRewards(newState.member, levelUpInfo.newLevel);
                  
                  // Check for prestige
                  const prestigeInfo = await checkPrestige(newState.member, levelUpInfo.newLevel);
                  
                  // Send DM notification if enabled
                  const { sendLevelUpNotification } = require('../utils/notifications');
                  try {
                    await sendLevelUpNotification(newState.member.user, levelUpInfo, roleRewards, prestigeInfo);
                  } catch (dmError) {
                    // User may have DMs disabled, ignore
                  }
                  
                  // Check for achievement unlocks
                  if (levelUpInfo.achievements && levelUpInfo.achievements.length > 0) {
                    const { sendAchievementNotification } = require('../utils/notifications');
                    for (const achievement of levelUpInfo.achievements) {
                      try {
                        await sendAchievementNotification(newState.member.user, achievement);
                      } catch (achievementError) {
                        logger.error('Error sending achievement notification:', achievementError);
                      }
                    }
                  }
                } catch (roleError) {
                  logger.error('Error checking role rewards on move:', roleError);
                }
              }
            } catch (moveXpError) {
              logger.error('Error handling voice move XP:', moveXpError);
            }
          }
          
          // Update session data
          sessionData.channelId = newState.channelId;
          sessionData.lastUpdate = moveTime;
          voiceSessionCache.set(userId, sessionData);
        } catch (moveError) {
          logger.error('Error handling voice move:', moveError);
        }
      }
      
      // User muted/unmuted/deafened/undeafened but stayed in the same channel
      // We don't handle these events for XP purposes
    } catch (error) {
      logger.error('Error handling voice state update:', error);
    }
  },
  
  /**
   * Process all active voice sessions for periodic XP updates
   * This should be called via a timer (e.g. every 5 minutes)
   */
  async processActiveVoiceSessions(client) {
    try {
      if (!client || !client.guilds) {
        logger.error('Invalid client for processing voice sessions');
        return;
      }
    
      const now = Date.now();
      
      for (const [userId, sessionData] of voiceSessionCache.entries()) {
        try {
          const minutesSinceUpdate = Math.floor((now - sessionData.lastUpdate) / 60000);
          
          if (minutesSinceUpdate >= 5) { // Update every 5 minutes
            try {
              // Get guild
              const guild = client.guilds.cache.size > 0 ? 
                client.guilds.cache.first() : null;
                
              if (!guild) {
                logger.warn('No guild found for voice session processing');
                continue;
              }
              
              // Get guild member
              const member = await guild.members.fetch(userId).catch(() => null);
              if (!member) {
                // User is no longer in the guild, clean up cache
                voiceSessionCache.delete(userId);
                continue;
              }
              
              // Get voice state
              const voiceState = member.voice;
              if (!voiceState || !voiceState.channelId) {
                // User is no longer in voice, clean up cache
                voiceSessionCache.delete(userId);
                continue;
              }
              
              // Check if user is AFK
              const isAFK = guild.afkChannelId ? 
                voiceState.channelId === guild.afkChannelId : false;
              
              try {
                // Update voice statistics
                await updateVoiceStats(userId, minutesSinceUpdate);
              } catch (statsError) {
                logger.error(`Error updating voice statistics for ${userId}:`, statsError);
              }
              
              try {
                // Award XP for voice time
                const levelUpInfo = await updateVoiceXp(userId, minutesSinceUpdate, isAFK, client, member);
                // Award coins for voice time (if not AFK)
                try {
                  const settings = await getCurrencySettings();
                  const perMinute = Math.max(0, settings.voiceCoinsPerMinute || 0);
                  const maxMinutes = Math.max(0, settings.voiceMaxMinutes || 60);
                  if (!isAFK && perMinute > 0) {
                    const eligibleMinutes = Math.min(minutesSinceUpdate, maxMinutes);
                    const coinsToAward = eligibleMinutes * perMinute;
                    if (coinsToAward > 0) {
                      await earnCoins(userId, coinsToAward, 'voice');
                    }
                  }
                } catch (coinErr) {
                  logger.error(`Error awarding voice coins for ${userId}:`, coinErr);
                }
                
                // Handle level up
                if (levelUpInfo) {
                  try {
                    // Check for role rewards
                    const roleRewards = await checkRoleRewards(member, levelUpInfo.newLevel);
                    
                    // Check for prestige
                    const prestigeInfo = await checkPrestige(member, levelUpInfo.newLevel);
                    
                    // Send DM notification if enabled
                    const { sendLevelUpNotification } = require('../utils/notifications');
                    try {
                      await sendLevelUpNotification(member.user, levelUpInfo, roleRewards, prestigeInfo);
                    } catch (dmError) {
                      // User may have DMs disabled, ignore
                    }
                    
                    // Check for achievement unlocks
                    if (levelUpInfo.achievements && levelUpInfo.achievements.length > 0) {
                      const { sendAchievementNotification } = require('../utils/notifications');
                      for (const achievement of levelUpInfo.achievements) {
                        try {
                          await sendAchievementNotification(member.user, achievement);
                        } catch (achievementError) {
                          logger.error('Error sending achievement notification:', achievementError);
                        }
                      }
                    }
                  } catch (roleError) {
                    logger.error(`Error checking role rewards for ${userId}:`, roleError);
                  }
                }
              } catch (xpError) {
                logger.error(`Error processing voice XP for ${userId}:`, xpError);
              }
              
              // Update session data
              sessionData.lastUpdate = now;
              voiceSessionCache.set(userId, sessionData);
            } catch (memberError) {
              logger.error(`Error processing member ${userId}:`, memberError);
            }
          }
        } catch (sessionError) {
          logger.error(`Error processing voice session for ${userId}:`, sessionError);
        }
      }
    } catch (error) {
      logger.error('Error in processActiveVoiceSessions:', error);
    }
  }
}; 