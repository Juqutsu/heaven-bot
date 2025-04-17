const { Events } = require('discord.js');
const { updateVoiceXp, checkRoleRewards, checkPrestige } = require('../utils/leveling');
const { updateVoiceStats } = require('../utils/statistics');
const { getUserData, saveUserData } = require('../utils/database');

// Cache for voice sessions
const voiceSessionCache = new Map();

module.exports = {
  name: Events.VoiceStateUpdate,
  async execute(oldState, newState) {
    try {
      // Validate states
      if (!oldState || !newState) return;
      
      // Ignore bots
      if (!newState.member || !newState.member.user || newState.member.user.bot) return;
      
      const userId = newState.member.user.id;
      
      // User joined a voice channel
      if (!oldState.channelId && newState.channelId) {
        try {
          // Store join timestamp
          const timestamp = Date.now();
          const userData = getUserData(userId);
          userData.voiceJoinTimestamp = timestamp;
          saveUserData(userId, userData);
          
          // Add to cache
          voiceSessionCache.set(userId, {
            channelId: newState.channelId,
            joinTime: timestamp,
            lastUpdate: timestamp
          });
        } catch (joinError) {
          console.error('Error handling voice join:', joinError);
        }
      }
      
      // User left a voice channel
      else if (oldState.channelId && !newState.channelId) {
        try {
          // Get voice session data
          const sessionData = voiceSessionCache.get(userId);
          if (!sessionData) return;
          
          // Calculate time spent in voice
          const leaveTime = Date.now();
          const minutesInVoice = Math.floor((leaveTime - sessionData.joinTime) / 60000);
          
          if (minutesInVoice > 0) {
            try {
              // Update voice statistics
              updateVoiceStats(userId, minutesInVoice);
            } catch (statsError) {
              console.error('Error updating voice statistics:', statsError);
            }
            
            // Check if user was AFK
            const wasAFK = oldState.guild && oldState.guild.afkChannelId ? 
              oldState.channelId === oldState.guild.afkChannelId : false;
            
            try {
              // Award XP for voice time
              const levelUpInfo = await updateVoiceXp(userId, minutesInVoice, wasAFK, newState.client);
              
              // Handle level up
              if (levelUpInfo && newState.member) {
                try {
                  // Check for role rewards
                  await checkRoleRewards(newState.member, levelUpInfo.newLevel);
                } catch (roleError) {
                  console.error('Error checking role rewards:', roleError);
                }
                
                try {
                  // Check for prestige
                  await checkPrestige(newState.member, levelUpInfo.newLevel);
                } catch (prestigeError) {
                  console.error('Error checking prestige:', prestigeError);
                }
                
                // We don't send a notification here to avoid spamming
                // Users can check their rank with the rank command
              }
            } catch (xpError) {
              console.error('Error handling voice XP:', xpError);
            }
          }
          
          // Remove from cache
          voiceSessionCache.delete(userId);
        } catch (leaveError) {
          console.error('Error handling voice leave:', leaveError);
          // Try to clean up cache anyway
          voiceSessionCache.delete(userId);
        }
      }
      
      // User moved between voice channels
      else if (oldState.channelId !== newState.channelId) {
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
              updateVoiceStats(userId, minutesInVoice);
              
              // Award XP for voice time
              const levelUpInfo = await updateVoiceXp(userId, minutesInVoice, wasAFK, newState.client);
              
              // Handle level up
              if (levelUpInfo && newState.member) {
                try {
                  // Check for role rewards
                  await checkRoleRewards(newState.member, levelUpInfo.newLevel);
                } catch (roleError) {
                  console.error('Error checking role rewards on move:', roleError);
                }
                
                try {
                  // Check for prestige
                  await checkPrestige(newState.member, levelUpInfo.newLevel);
                } catch (prestigeError) {
                  console.error('Error checking prestige on move:', prestigeError);
                }
              }
            } catch (moveXpError) {
              console.error('Error handling voice move XP:', moveXpError);
            }
          }
          
          // Update session data
          sessionData.channelId = newState.channelId;
          sessionData.lastUpdate = moveTime;
          voiceSessionCache.set(userId, sessionData);
        } catch (moveError) {
          console.error('Error handling voice move:', moveError);
        }
      }
      
      // User muted/unmuted/deafened/undeafened but stayed in the same channel
      // We don't handle these events for XP purposes
    } catch (error) {
      console.error('Error handling voice state update:', error);
    }
  },
  
  /**
   * Process all active voice sessions for periodic XP updates
   * This should be called via a timer (e.g. every 5 minutes)
   */
  async processActiveVoiceSessions(client) {
    try {
      if (!client || !client.guilds) {
        console.error('Invalid client for processing voice sessions');
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
                console.warn('No guild found for voice session processing');
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
                updateVoiceStats(userId, minutesSinceUpdate);
              } catch (statsError) {
                console.error(`Error updating voice statistics for ${userId}:`, statsError);
              }
              
              try {
                // Award XP for voice time
                const levelUpInfo = await updateVoiceXp(userId, minutesSinceUpdate, isAFK, client);
                
                // Handle level up
                if (levelUpInfo) {
                  try {
                    // Check for role rewards
                    await checkRoleRewards(member, levelUpInfo.newLevel);
                  } catch (roleError) {
                    console.error(`Error checking role rewards for ${userId}:`, roleError);
                  }
                  
                  try {
                    // Check for prestige
                    await checkPrestige(member, levelUpInfo.newLevel);
                  } catch (prestigeError) {
                    console.error(`Error checking prestige for ${userId}:`, prestigeError);
                  }
                }
              } catch (xpError) {
                console.error(`Error processing voice XP for ${userId}:`, xpError);
              }
              
              // Update session data
              sessionData.lastUpdate = now;
              voiceSessionCache.set(userId, sessionData);
            } catch (memberError) {
              console.error(`Error processing member ${userId}:`, memberError);
            }
          }
        } catch (sessionError) {
          console.error(`Error processing voice session for ${userId}:`, sessionError);
        }
      }
    } catch (error) {
      console.error('Error in processActiveVoiceSessions:', error);
    }
  }
}; 