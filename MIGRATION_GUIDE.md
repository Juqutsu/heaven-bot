# Migration Guide: JSON to SQLite

This guide explains how to migrate from the JSON-based storage system to SQLite.

## Overview

The bot has been upgraded to use SQLite for better performance, reliability, and scalability. This migration guide will help you transition from JSON files to the new database system.

## Pre-Migration Checklist

- [ ] Backup your entire `data/` directory
- [ ] Ensure bot is stopped
- [ ] Verify you have Node.js 16.9.0 or higher
- [ ] Install dependencies: `npm install`

## Migration Steps

### Step 1: Backup Existing Data

Before migration, create a backup of your data directory:

```bash
cp -r data data_backup
```

### Step 2: Run Migration Script

Execute the migration script:

```bash
node src/utils/migrate-json-to-sqlite.js
```

The script will:
1. Create a backup of existing database (if any)
2. Initialize SQLite database schema
3. Migrate data from JSON files:
   - `users.json` → `users` table
   - `ranks.json` → `ranks` and `rank_settings` tables
   - `prestiges.json` → `prestiges` table
   - `statistics.json` → `statistics` table
4. Display migration summary

### Step 3: Verify Migration

After migration, verify the data:

1. Check migration output for any errors
2. Review the summary showing counts of migrated records
3. Start the bot and test key features:
   - Check user ranks with `/rank`
   - View leaderboard with `/leaderboard`
   - Verify statistics with `/stats`

### Step 4: Test Bot Functionality

Test the following to ensure everything works:

- [ ] User XP and leveling
- [ ] Voice XP tracking
- [ ] Prestige system
- [ ] Rank cards
- [ ] Leaderboard
- [ ] Statistics
- [ ] Commands

## Post-Migration

### Keep JSON Files

The migration script preserves your original JSON files. Keep them as a backup for at least a few days after migration.

### Database Location

The SQLite database is located at:
```
data/heaven.db
```

### Database Backups

Backups are automatically created before migrations and stored in:
```
data/backups/
```

You can create manual backups using the backup utility (see README.md).

## Rollback Procedure

If you need to rollback to JSON files:

1. **Stop the bot**

2. **Remove SQLite database**:
   ```bash
   rm data/heaven.db
   ```

3. **Restore JSON files** (if you deleted them):
   ```bash
   cp -r data_backup/* data/
   ```

4. **Note**: The current codebase requires SQLite. To rollback, you would need to use an older version of the code that supports JSON files.

## Troubleshooting

### Migration Fails

If migration fails:

1. Check error messages in console output
2. Verify JSON files are valid JSON
3. Check file permissions on `data/` directory
4. Ensure you have write permissions

### Data Missing After Migration

1. Check migration output for warnings
2. Verify JSON files were read correctly
3. Check database directly:
   ```bash
   sqlite3 data/heaven.db "SELECT COUNT(*) FROM users;"
   ```

### Performance Issues

If you experience performance issues:

1. Check database file size
2. Verify indexes are created (they should be automatic)
3. Check logs for database errors
4. Consider running `VACUUM` on the database:
   ```bash
   sqlite3 data/heaven.db "VACUUM;"
   ```

## Database Schema

The SQLite database contains the following tables:

- **users**: User XP, level, prestige, and timestamps
- **ranks**: Level-based role rewards
- **rank_settings**: Global rank configuration
- **prestiges**: Prestige tier configuration
- **statistics**: User statistics (messages, voice, commands)
- **voice_sessions**: Active voice channel sessions

## Support

If you encounter issues during migration:

1. Check the logs in `logs/` directory
2. Review error messages carefully
3. Ensure all prerequisites are met
4. Create an issue on GitHub with:
   - Error messages
   - Migration output
   - Your Node.js version
   - Operating system

## Next Steps

After successful migration:

1. Test all bot features
2. Monitor logs for any issues
3. Consider setting up automated backups
4. Update your deployment scripts if needed

