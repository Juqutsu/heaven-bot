import Database from 'better-sqlite3';
import path from 'path';

let db: Database.Database | null = null;

/**
 * Get database connection
 * Connects to the existing SQLite database at ../data/heaven.db
 */
export function getDatabase(): Database.Database {
  if (db) {
    return db;
  }

  try {
    // Get database path - relative to website directory
    const dbPath = process.env.DATABASE_PATH 
      ? path.resolve(process.env.DATABASE_PATH)
      : path.resolve(process.cwd(), '..', 'data', 'heaven.db');
    
    // Create database connection
    // Note: Writable connection needed for rank card settings updates
    db = new Database(dbPath);

    // Enable WAL mode for better concurrent read performance
    db.pragma('journal_mode = WAL');
    
    return db;
  } catch (error) {
    console.error('Error connecting to database:', error);
    throw new Error('Failed to connect to database');
  }
}

/**
 * Close database connection
 */
export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}

