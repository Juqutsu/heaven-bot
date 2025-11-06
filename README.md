# Heaven Bot

A Discord bot for Lost Heaven server built with Discord.js v14. Features include leveling system, prestige tiers, rank cards, bug reporting, and comprehensive statistics tracking.

## Features

- **Leveling System**: XP-based leveling with text and voice chat rewards
- **Prestige Tiers**: Multiple prestige levels with XP boosts
- **Rank Cards**: Beautiful rank card images with user avatars
- **Leaderboards**: Server-wide leaderboards sorted by prestige, level, and XP
- **Statistics Tracking**: Detailed statistics for messages, voice time, and commands
- **Bug Reporting**: Built-in bug report system with status tracking
- **SQLite Database**: Fast and reliable SQLite database for data storage
- **Caching**: Intelligent caching system for improved performance
- **Structured Logging**: Winston-based logging with file rotation

## Setup

### Prerequisites

- Node.js 16.9.0 or higher
- npm or yarn
- A Discord bot application (create one at [Discord Developer Portal](https://discord.com/developers/applications))
- **Windows users**: Visual Studio Build Tools with "Desktop development with C++" workload (required for `better-sqlite3`)

### Installation

1. Clone this repository:
   ```bash
   git clone https://github.com/Juqutsu/heaven-bot.git
   cd heaven-bot
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables:
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and add your bot's credentials:
   ```env
   TOKEN=your_bot_token_here
   CLIENT_ID=your_client_id_here
   SERVER_ID=your_server_id_here
   BUGS_CHANNEL_ID=your_bug_channel_id_here  # Optional
   ```

4. Run database migration (if migrating from JSON files):
   ```bash
   node src/utils/migrate-json-to-sqlite.js
   ```

5. Start the bot:
   ```bash
   npm start
   ```

   For development with auto-restart:
   ```bash
   npm run dev
   ```

## Database Setup

The bot uses SQLite for data storage. The database file is located at `data/heaven.db`.

### Initial Setup

The database is automatically initialized on first startup. If you have existing JSON data files, run the migration script:

```bash
node src/utils/migrate-json-to-sqlite.js
```

This will:
- Create a backup of existing database (if any)
- Convert JSON files to SQLite format
- Preserve all existing data

### Database Backup

Backups are automatically created before migrations. Manual backups can be created using:

```javascript
const { createBackup } = require('./src/utils/backup');
await createBackup();
```

Backups are stored in `data/backups/` directory.

## Development

### Code Quality

- **Linting**: Run ESLint to check code quality
  ```bash
  npm run lint
  npm run lint:fix  # Auto-fix issues
  ```

- **Formatting**: Format code with Prettier
  ```bash
  npm run format
  npm run format:check  # Check formatting
  ```

### Project Structure

```
heaven-bot/
├── src/
│   ├── bot.js              # Main bot file
│   ├── config.js           # Configuration and validation
│   ├── commands/           # Slash command handlers
│   ├── events/             # Event handlers
│   └── utils/              # Utility functions
│       ├── database.js     # Database operations
│       ├── db-schema.js    # Database schema
│       ├── leveling.js     # Leveling system logic
│       ├── statistics.js   # Statistics tracking
│       ├── cache.js        # Caching layer
│       ├── validation.js   # Input validation
│       ├── rateLimiter.js  # Rate limiting
│       ├── logger.js       # Logging utility
│       ├── backup.js       # Database backup
│       └── deployCommands.js  # Command deployment
├── data/                   # Data directory
│   ├── heaven.db          # SQLite database
│   └── backups/           # Database backups
├── logs/                   # Log files
├── .env                    # Environment variables (not in git)
└── package.json
```

## Commands

- `/rank [user]` - Show rank card for yourself or another user
- `/leaderboard [limit]` - Show server leaderboard (default: 10, max: 25)
- `/stats [user] [days]` - Show activity statistics
- `/ranks` - Manage rank system settings (Admin only)
- `/prestige` - Manage prestige system settings (Admin only)
- `/bug` - Report a bug to the development team
- `/bug-stats` - Show bug report statistics (Admin only)
- `/set-bug-channel [channel]` - Set bug report channel (Admin only)
- `/ping` - Check bot latency
- `/help` - Show help information

## Configuration

### Rank Settings

Configure rank system via `/ranks settings`:
- Text XP: Base XP awarded per message
- Text Cooldown: Cooldown between XP awards (seconds)
- Voice XP: XP per minute in voice chat
- AFK Disabled: Whether to disable XP for AFK users
- XP Formula: `baseXp × (level ^ exponent)`

### Prestige Settings

Configure prestige tiers via `/prestige set`:
- Name: Prestige tier name
- Required Level: Level required to achieve prestige
- Color: Hex color code for rank cards
- Role: Discord role to assign
- XP Boost: Percentage boost to XP (as decimal, e.g., 0.05 for 5%)

## Migration Guide

### From JSON to SQLite

If you're upgrading from the JSON-based storage system:

1. **Backup your data**: Copy the `data/` directory to a safe location

2. **Run migration**:
   ```bash
   node src/utils/migrate-json-to-sqlite.js
   ```

3. **Verify migration**: Check that all data was migrated correctly

4. **Test the bot**: Start the bot and verify all features work

5. **Keep JSON files as backup**: The migration script preserves original JSON files

### Rollback

If you need to rollback to JSON files:

1. Stop the bot
2. Delete `data/heaven.db`
3. Restore your JSON files to `data/` directory
4. The bot will use JSON files if no database exists (legacy mode)

## Logging

Logs are stored in the `logs/` directory:
- `combined.log` - All logs
- `error.log` - Error logs only
- `exceptions.log` - Uncaught exceptions
- `rejections.log` - Unhandled promise rejections

Log files are automatically rotated when they reach 10MB, keeping the last 5 files.

## Troubleshooting

### Installation fails on Windows (better-sqlite3)

If you see an error about missing Visual Studio or C++ build tools:

1. **Install Visual Studio Build Tools**:
   - Open Visual Studio Installer
   - Click "Modify" on Visual Studio 2022 Community
   - Check "Desktop development with C++" workload
   - Click "Modify" to install

   OR

   - Download Build Tools from: https://visualstudio.microsoft.com/downloads/#build-tools-for-visual-studio-2022
   - Install with "Desktop development with C++" workload

2. **Restart your terminal** after installation

3. **Run npm install again**:
   ```bash
   npm install
   ```

### Bot won't start

1. Check that all required environment variables are set in `.env`
2. Verify your bot token is correct
3. Check logs in `logs/error.log`
4. Ensure Node.js version is 16.9.0 or higher

### Database errors

1. Check that the `data/` directory exists and is writable
2. Verify database file permissions
3. Check logs for specific error messages
4. Try restoring from backup if available

### Commands not appearing

1. Run `npm run deploy` to manually deploy commands
2. Check that bot has proper permissions in server
3. Verify `CLIENT_ID` and `SERVER_ID` are correct

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run linting and formatting: `npm run lint && npm run format`
5. Submit a pull request

## License

ISC

## Author

Juqutsu | Lukas
