# Heaven Bot Website

A modern Next.js website for the Heaven Discord bot, featuring leaderboards, statistics, and user profiles.

## Features

- **Public Pages**: Home, Leaderboard, and Server Statistics
- **Authenticated Pages**: User profile with personal stats and achievements
- **Discord OAuth**: Sign in with Discord to view your profile
- **Real-time Data**: Connects to the bot's SQLite database
- **Modern UI**: Dark theme matching Discord's aesthetic

## Setup

### Prerequisites

- Node.js 18+ and npm
- Access to the Heaven bot's SQLite database (`../data/heaven.db`)
- Discord OAuth application (for authentication)

### Installation

1. Install dependencies:
```bash
npm install
```

2. Create a `.env.local` file (copy from `.env.example`):
```bash
cp .env.example .env.local
```

3. Configure environment variables in `.env.local`:
   - `NEXTAUTH_URL`: Your website URL (e.g., `http://localhost:3000`)
   - `NEXTAUTH_SECRET`: Generate with `openssl rand -base64 32`
   - `DISCORD_CLIENT_ID`: Your Discord OAuth client ID
   - `DISCORD_CLIENT_SECRET`: Your Discord OAuth client secret
   - `DATABASE_PATH`: Path to the SQLite database (defaults to `../data/heaven.db`)

### Discord OAuth Setup

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a new application or select an existing one
3. Go to OAuth2 section
4. Add redirect URI: `http://localhost:3000/api/auth/callback/discord` (or your production URL)
5. Copy Client ID and Client Secret to `.env.local`

### Development

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build

Build for production:

```bash
npm run build
npm start
```

## Project Structure

```
website/
├── app/
│   ├── api/              # API routes
│   │   ├── auth/         # NextAuth routes
│   │   ├── leaderboard/  # Leaderboard API
│   │   ├── stats/        # Server stats API
│   │   └── user/         # User profile API
│   ├── leaderboard/      # Leaderboard page
│   ├── stats/            # Statistics page
│   ├── profile/          # User profile page
│   └── page.tsx          # Home page
├── components/           # React components
├── lib/                  # Utilities
│   ├── auth.ts           # NextAuth configuration
│   ├── database.ts       # Database connection
│   └── utils.ts          # Helper functions
└── package.json
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXTAUTH_URL` | Website URL | Yes |
| `NEXTAUTH_SECRET` | Secret for session encryption | Yes |
| `DISCORD_CLIENT_ID` | Discord OAuth client ID | Yes |
| `DISCORD_CLIENT_SECRET` | Discord OAuth client secret | Yes |
| `DATABASE_PATH` | Path to SQLite database | No (defaults to `../data/heaven.db`) |

## License

ISC
