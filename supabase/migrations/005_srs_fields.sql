-- =====================================================
-- Migration 005: Add SRS review fields to words
-- File: 005_srs_fields.sql
-- Date: 2026-06-24 00:15
-- Run: Supabase SQL Editor, execute once
-- =====================================================
-- Note: Adds spaced-repetition scheduling columns and an index
--       for the review queue (next_review_at per user).
-- -----------------------------------------------------
ALTER TABLE words ADD COLUMN IF NOT EXISTS next_review_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE words ADD COLUMN IF NOT EXISTS review_count INTEGER DEFAULT 0;
ALTER TABLE words ADD COLUMN IF NOT EXISTS ease_factor REAL DEFAULT 2.5;
ALTER TABLE words ADD COLUMN IF NOT EXISTS interval_days INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_words_next_review
  ON words(user_id, next_review_at)
  WHERE is_deleted = FALSE;
