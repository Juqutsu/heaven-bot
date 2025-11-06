-- Migration: Add settings_json column to user_rank_card_settings table
-- This migration extends the rank card settings to support advanced customization

-- Add settings_json column if it doesn't exist
-- Note: SQLite doesn't support IF NOT EXISTS for ALTER TABLE ADD COLUMN
-- This should be run manually or through a migration tool

ALTER TABLE user_rank_card_settings ADD COLUMN settings_json TEXT;

-- The column will store JSON with all customization settings:
-- - Element positions (X/Y for each element)
-- - Element sizes (avatar size, font sizes, progress bar dimensions)
-- - Colors (individual colors for each element)
-- - Visibility toggles (show/hide each element)
-- - Visual effects (shadows, borders, gradients)
-- - Layout presets
-- - Text alignment
-- - Orientation (horizontal/vertical)

