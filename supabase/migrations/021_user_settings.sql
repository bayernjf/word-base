-- =====================================================
-- Migration 021: Add user settings table
-- File: 021_user_settings.sql
-- Date: 2026-07-30 03:12
-- Run: Supabase SQL Editor, execute once
-- =====================================================
-- Note: Generic JSONB settings row per user for extension
--       settings sync, with RLS owner access.
-- -----------------------------------------------------
-- 021: user_settings table for extension settings sync
CREATE TABLE IF NOT EXISTS user_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  settings_json JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users manage own settings"
  ON user_settings FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
