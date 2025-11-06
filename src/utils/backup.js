/**
 * Database backup utility
 * @module backup
 */

const fs = require('node:fs');
const path = require('node:path');
const { getDatabase } = require('./database');
const logger = require('./logger');

const DB_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DB_DIR, 'heaven.db');
const BACKUP_DIR = path.join(DB_DIR, 'backups');

/**
 * Ensure backup directory exists
 */
function ensureBackupDir() {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
}

/**
 * Create a backup of the database
 * @param {string} prefix - Prefix for backup filename (optional)
 * @returns {Promise<string>} Path to backup file
 */
async function createBackup(prefix = 'backup') {
  try {
    ensureBackupDir();

    if (!fs.existsSync(DB_FILE)) {
      throw new Error('Database file does not exist');
    }

    // Generate backup filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFilename = `${prefix}_${timestamp}.db`;
    const backupPath = path.join(BACKUP_DIR, backupFilename);

    // Copy database file
    fs.copyFileSync(DB_FILE, backupPath);

    logger.info(`Database backup created: ${backupPath}`);
    return backupPath;
  } catch (error) {
    logger.error('Error creating database backup:', error);
    throw error;
  }
}

/**
 * Create a backup before migration
 * @returns {Promise<string|null>} Path to backup file or null if failed/doesn't exist
 */
async function backupBeforeMigration() {
  try {
    // Check if database exists before trying to backup
    if (!fs.existsSync(DB_FILE)) {
      return null;
    }
    return await createBackup('migration');
  } catch (error) {
    logger.error('Failed to create backup before migration:', error);
    return null;
  }
}

/**
 * List all backups
 * @returns {Array<Object>} Array of backup info objects
 */
function listBackups() {
  ensureBackupDir();

  if (!fs.existsSync(BACKUP_DIR)) {
    return [];
  }

  const files = fs.readdirSync(BACKUP_DIR)
    .filter(file => file.endsWith('.db'))
    .map(file => {
      const filePath = path.join(BACKUP_DIR, file);
      const stats = fs.statSync(filePath);
      return {
        filename: file,
        path: filePath,
        size: stats.size,
        created: stats.birthtime
      };
    })
    .sort((a, b) => b.created - a.created); // Newest first

  return files;
}

/**
 * Clean up old backups (keep only last N backups)
 * @param {number} keepCount - Number of backups to keep (default: 10)
 */
function cleanupOldBackups(keepCount = 10) {
  try {
    const backups = listBackups();

    if (backups.length <= keepCount) {
      return;
    }

    // Delete oldest backups
    const toDelete = backups.slice(keepCount);
    for (const backup of toDelete) {
      fs.unlinkSync(backup.path);
      logger.info(`Deleted old backup: ${backup.filename}`);
    }
  } catch (error) {
    logger.error('Error cleaning up old backups:', error);
  }
}

/**
 * Restore database from backup
 * @param {string} backupPath - Path to backup file
 * @returns {Promise<void>}
 */
async function restoreBackup(backupPath) {
  try {
    if (!fs.existsSync(backupPath)) {
      throw new Error(`Backup file does not exist: ${backupPath}`);
    }

    // Close existing database connection
    const { closeDatabase } = require('./database');
    closeDatabase();

    // Create backup of current database before restore
    if (fs.existsSync(DB_FILE)) {
      await createBackup('pre-restore');
    }

    // Copy backup file to database location
    fs.copyFileSync(backupPath, DB_FILE);

    logger.info(`Database restored from backup: ${backupPath}`);
  } catch (error) {
    logger.error('Error restoring database backup:', error);
    throw error;
  }
}

module.exports = {
  createBackup,
  backupBeforeMigration,
  listBackups,
  cleanupOldBackups,
  restoreBackup
};

