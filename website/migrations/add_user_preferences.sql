-- Migration: Add user_preferences table for theme and profile customization
-- This migration adds support for user preferences including themes

CREATE TABLE IF NOT EXISTS user_preferences (
    user_id TEXT PRIMARY KEY,
    theme TEXT DEFAULT 'dark',
    profile_bio TEXT,
    profile_banner_url TEXT,
    color_scheme TEXT,
    display_preferences TEXT, -- JSON
    updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

