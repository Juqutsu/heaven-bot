/**
 * Migration script to add rank_card_templates table
 * Run with: node migrations/add_rank_card_templates.js
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
  const tableInfo = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='rank_card_templates'").get();
  
  if (tableInfo) {
    console.log('✓ Table rank_card_templates already exists. Migration not needed.');
  } else {
    console.log('Creating rank_card_templates table...');
    
    // Create the table
    db.prepare(`
      CREATE TABLE IF NOT EXISTS rank_card_templates (
        template_id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        settings_json TEXT NOT NULL,
        created_by TEXT,
        is_public INTEGER DEFAULT 0,
        usage_count INTEGER DEFAULT 0,
        created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
        FOREIGN KEY (created_by) REFERENCES users(user_id)
      )
    `).run();
    
    // Create indexes
    db.prepare(`
      CREATE INDEX IF NOT EXISTS idx_rank_card_templates_public ON rank_card_templates(is_public)
    `).run();
    
    db.prepare(`
      CREATE INDEX IF NOT EXISTS idx_rank_card_templates_usage ON rank_card_templates(usage_count DESC)
    `).run();
    
    db.prepare(`
      CREATE INDEX IF NOT EXISTS idx_rank_card_templates_created ON rank_card_templates(created_at DESC)
    `).run();
    
    console.log('✓ Migration completed successfully!');
    console.log('  Created rank_card_templates table');
  }
  
  db.close();
  process.exit(0);
} catch (error) {
  console.error('✗ Migration failed:', error.message);
  process.exit(1);
}

