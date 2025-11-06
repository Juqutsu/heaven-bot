/**
 * Migration script to add user_preferences table
 * Run with: node migrations/add_user_preferences.js
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
  
  // Check if table already exists
  const tableInfo = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='user_preferences'").get();
  
  if (tableInfo) {
    console.log('✓ Table user_preferences already exists. Migration not needed.');
  } else {
    console.log('Creating user_preferences table...');
    
    // Create the table
    db.prepare(`
      CREATE TABLE IF NOT EXISTS user_preferences (
        user_id TEXT PRIMARY KEY,
        theme TEXT DEFAULT 'dark',
        profile_bio TEXT,
        profile_banner_url TEXT,
        color_scheme TEXT,
        display_preferences TEXT,
        updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
        FOREIGN KEY (user_id) REFERENCES users(user_id)
      )
    `).run();
    
    console.log('✓ Migration completed successfully!');
    console.log('  Created user_preferences table');
  }
  
  db.close();
  process.exit(0);
} catch (error) {
  console.error('✗ Migration failed:', error.message);
  process.exit(1);
}

