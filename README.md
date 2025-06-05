# Heaven Bot

A Discord bot for Lost Heaven server built with Discord.js v14.

## Setup

1. Clone this repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure the `.env` file with your bot's credentials:
   ```
   CLIENT_ID=your_bot_client_id
   SERVER_ID=your_server_id
   TOKEN=your_bot_token
   # Optional: channel for bug reports
   BUGS_CHANNEL_ID=bug_reports_channel_id
   ```
4. Start the bot:
   ```bash
   npm start
   ```
   The bot validates required environment variables on startup via `src/config.js`.

## Features

- **Auto-deploy commands:** Commands are automatically deployed when the bot starts
- **Help command:** Use `/help` to see all available commands
- **Command handling:** Simple structure for adding new commands

## Development

For development with auto-restart on file changes:
```bash
npm run dev
```

## Structure

- `src/bot.js` - Main bot file that initializes the client and loads events/commands
- `src/commands/` - Contains all command files
- `src/events/` - Contains event handlers
- `src/utils/` - Contains utility functions
  - `deployCommands.js` - Handles automatic command deployment

## Adding Commands

1. Create a new file in the `src/commands/` directory
2. Use the following template:
   ```js
   const { SlashCommandBuilder } = require('discord.js');

   module.exports = {
     data: new SlashCommandBuilder()
       .setName('command-name')
       .setDescription('Command description'),
     async execute(interaction) {
       // Command logic here
     },
   };
   ```
3. Restart the bot - commands will be automatically deployed
