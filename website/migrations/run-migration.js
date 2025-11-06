/**
 * Migration script to add settings_json column to user_rank_card_settings table
 * Run with: node migrations/run-migration.js
 */

const Database = require('better-sqlite3');
const path = require('path');

// Get database path
const dbPath = process.env.DATABASE_PATH
  ? path.resolve(process.env.DATABASE_PATH)
  : path.resolve(process.cwd(), '..', 'data', 'heaven.db');

console.log('Connecting to database:', dbPath);

try {
  const db = new Database(dbPath);
  
  // Check if column already exists
  const tableInfo = db.prepare("PRAGMA table_info(user_rank_card_settings)").all();
  const hasSettingsJson = tableInfo.some(col => col.name === 'settings_json');
  
  if (hasSettingsJson) {
    console.log('✓ Column settings_json already exists. Migration not needed.');
  } else {
    console.log('Adding settings_json column...');
    
    // Add the column
    db.prepare(`
      ALTER TABLE user_rank_card_settings 
      ADD COLUMN settings_json TEXT
    `).run();
    
    console.log('✓ Migration completed successfully!');
    console.log('  Added settings_json column to user_rank_card_settings table');
  }
  
  db.close();
  process.exit(0);
} catch (error) {
  console.error('✗ Migration failed:', error.message);
  process.exit(1);
}

