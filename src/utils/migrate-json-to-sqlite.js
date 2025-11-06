/**
 * Migration script to convert JSON files to SQLite database
 * @module migrate-json-to-sqlite
 */

const Database = require('better-sqlite3');
const fs = require('node:fs');
const path = require('node:path');
const { initializeSchema } = require('./db-schema');
const { backupBeforeMigration } = require('./backup');

const DB_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DB_DIR, 'heaven.db');
const USERS_FILE = path.join(DB_DIR, 'users.json');
const RANKS_FILE = path.join(DB_DIR, 'ranks.json');
const PRESTIGES_FILE = path.join(DB_DIR, 'prestiges.json');
const STATISTICS_FILE = path.join(DB_DIR, 'statistics.json');


/**
 * Migrate users from JSON to SQLite
 * @param {import('better-sqlite3').Database} db - Database instance
 */
function migrateUsers(db) {
  if (!fs.existsSync(USERS_FILE)) {
    console.log('No users.json file found, skipping users migration');
    return 0;
  }

  const usersData = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
  const insert = db.prepare(`
    INSERT OR REPLACE INTO users 
    (user_id, xp, level, prestige, last_message_timestamp, voice_join_timestamp, total_text_xp, total_voice_xp)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertMany = db.transaction((users) => {
    let count = 0;
    for (const [userId, userData] of Object.entries(users)) {
      insert.run(
        userId,
        userData.xp || 0,
        userData.level || 1,
        userData.prestige || 0,
        userData.lastMessageTimestamp || 0,
        userData.voiceJoinTimestamp || 0,
        userData.totalTextXp || 0,
        userData.totalVoiceXp || 0
      );
      count++;
    }
    return count;
  });

  const count = insertMany(usersData);
  console.log(`Migrated ${count} users`);
  return count;
}

/**
 * Migrate ranks from JSON to SQLite
 * @param {import('better-sqlite3').Database} db - Database instance
 */
function migrateRanks(db) {
  if (!fs.existsSync(RANKS_FILE)) {
    console.log('No ranks.json file found, skipping ranks migration');
    return 0;
  }

  const ranksData = JSON.parse(fs.readFileSync(RANKS_FILE, 'utf8'));
  let count = 0;

  // Migrate rank settings
  if (ranksData.textXp || ranksData.voiceXp || ranksData.formula) {
    const now = Math.floor(Date.now() / 1000);
    const insertSetting = db.prepare('INSERT OR REPLACE INTO rank_settings (key, value, updated_at) VALUES (?, ?, ?)');
    
    if (ranksData.textXp) {
      insertSetting.run('textXp', JSON.stringify(ranksData.textXp), now);
      count++;
    }
    if (ranksData.voiceXp) {
      insertSetting.run('voiceXp', JSON.stringify(ranksData.voiceXp), now);
      count++;
    }
    if (ranksData.formula) {
      insertSetting.run('formula', JSON.stringify(ranksData.formula), now);
      count++;
    }
    console.log(`Migrated rank settings`);
  }

  // Migrate level-based roles
  if (ranksData.roles) {
    const now = Math.floor(Date.now() / 1000);
    const insertRole = db.prepare('INSERT OR REPLACE INTO ranks (level, role_id, updated_at) VALUES (?, ?, ?)');
    const insertMany = db.transaction((roles) => {
      let roleCount = 0;
      for (const [level, roleId] of Object.entries(roles)) {
        if (roleId) {
          insertRole.run(parseInt(level), roleId, now);
          roleCount++;
        }
      }
      return roleCount;
    });

    const roleCount = insertMany(ranksData.roles);
    console.log(`Migrated ${roleCount} rank roles`);
    count += roleCount;
  }

  return count;
}

/**
 * Migrate prestiges from JSON to SQLite
 * @param {import('better-sqlite3').Database} db - Database instance
 */
function migratePrestiges(db) {
  if (!fs.existsSync(PRESTIGES_FILE)) {
    console.log('No prestiges.json file found, skipping prestiges migration');
    return 0;
  }

  const prestigesData = JSON.parse(fs.readFileSync(PRESTIGES_FILE, 'utf8'));
  
  if (!prestigesData.prestiges) {
    console.log('No prestiges data found in file');
    return 0;
  }

  const insert = db.prepare(`
    INSERT OR REPLACE INTO prestiges 
    (prestige_level, name, required_level, color, role_id, xp_boost, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const insertMany = db.transaction((prestiges) => {
    let count = 0;
    const now = Math.floor(Date.now() / 1000);
    for (const [level, config] of Object.entries(prestiges)) {
      insert.run(
        parseInt(level),
        config.name,
        config.requiredLevel,
        config.color,
        config.roleId || null,
        config.xpBoost,
        now
      );
      count++;
    }
    return count;
  });

  const count = insertMany(prestigesData.prestiges);
  console.log(`Migrated ${count} prestige tiers`);
  return count;
}

/**
 * Migrate statistics from JSON to SQLite
 * @param {import('better-sqlite3').Database} db - Database instance
 */
function migrateStatistics(db) {
  if (!fs.existsSync(STATISTICS_FILE)) {
    console.log('No statistics.json file found, skipping statistics migration');
    return 0;
  }

  const statsData = JSON.parse(fs.readFileSync(STATISTICS_FILE, 'utf8'));
  const now = Math.floor(Date.now() / 1000);
  const insert = db.prepare(`
    INSERT OR REPLACE INTO statistics (user_id, stat_type, period_type, period_key, value, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const insertMany = db.transaction((stats) => {
    let count = 0;
    const now = Math.floor(Date.now() / 1000);
    for (const [userId, userStats] of Object.entries(stats)) {
      // Messages
      if (userStats.messages) {
        insert.run(userId, 'messages', 'total', 'total', userStats.messages.total || 0, now);
        count++;
        for (const [key, value] of Object.entries(userStats.messages.daily || {})) {
          insert.run(userId, 'messages', 'daily', key, value, now);
          count++;
        }
        for (const [key, value] of Object.entries(userStats.messages.weekly || {})) {
          insert.run(userId, 'messages', 'weekly', key, value, now);
          count++;
        }
        for (const [key, value] of Object.entries(userStats.messages.monthly || {})) {
          insert.run(userId, 'messages', 'monthly', key, value, now);
          count++;
        }
      }

      // Voice
      if (userStats.voice) {
        insert.run(userId, 'voice', 'total', 'total', userStats.voice.totalMinutes || 0, now);
        count++;
        for (const [key, value] of Object.entries(userStats.voice.daily || {})) {
          insert.run(userId, 'voice', 'daily', key, value, now);
          count++;
        }
        for (const [key, value] of Object.entries(userStats.voice.weekly || {})) {
          insert.run(userId, 'voice', 'weekly', key, value, now);
          count++;
        }
        for (const [key, value] of Object.entries(userStats.voice.monthly || {})) {
          insert.run(userId, 'voice', 'monthly', key, value, now);
          count++;
        }
      }

      // Commands
      if (userStats.commands) {
        insert.run(userId, 'commands', 'total', 'total', userStats.commands.total || 0, now);
        count++;
        for (const [key, value] of Object.entries(userStats.commands.types || {})) {
          insert.run(userId, 'commands', 'type', key, value, now);
          count++;
        }
      }
    }
    return count;
  });

  const count = insertMany(statsData);
  console.log(`Migrated statistics for ${Object.keys(statsData).length} users (${count} stat entries)`);
  return count;
}

/**
 * Run the migration
 */
async function runMigration() {
  console.log('Starting migration from JSON to SQLite...');
  
  try {
    // Backup existing database before migration (if it exists)
    const backupPath = await backupBeforeMigration();
    if (backupPath) {
      console.log(`Backup created: ${backupPath}`);
    } else {
      console.log('No existing database to backup (this is expected for first-time migration)');
    }

    // Create or open database
    const db = new Database(DB_FILE);
    db.pragma('journal_mode = WAL');

    // Initialize schema
    console.log('Initializing database schema...');
    initializeSchema(db);

    // Migrate data
    console.log('\nMigrating data...');
    const userCount = migrateUsers(db);
    const rankCount = migrateRanks(db);
    const prestigeCount = migratePrestiges(db);
    const statCount = migrateStatistics(db);

    // Close database
    db.close();

    console.log('\nMigration completed successfully!');
    console.log(`Summary:`);
    console.log(`  - Users: ${userCount}`);
    console.log(`  - Ranks: ${rankCount}`);
    console.log(`  - Prestiges: ${prestigeCount}`);
    console.log(`  - Statistics: ${statCount} entries`);
    console.log(`\nDatabase created at: ${DB_FILE}`);
    console.log('\nNote: Original JSON files are preserved. You can delete them after verifying the migration.');

  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

// Run migration if called directly
if (require.main === module) {
  runMigration();
}

module.exports = { runMigration };

