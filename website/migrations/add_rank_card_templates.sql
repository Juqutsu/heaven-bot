-- Migration: Add rank_card_templates table for template library
-- This migration adds support for rank card templates

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
);

CREATE INDEX IF NOT EXISTS idx_rank_card_templates_public ON rank_card_templates(is_public);
CREATE INDEX IF NOT EXISTS idx_rank_card_templates_usage ON rank_card_templates(usage_count DESC);
CREATE INDEX IF NOT EXISTS idx_rank_card_templates_created ON rank_card_templates(created_at DESC);

