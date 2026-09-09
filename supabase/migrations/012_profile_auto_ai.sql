-- =====================================================
-- Migration 012: Add auto-AI toggles to profiles
-- File: 012_profile_auto_ai.sql
-- Date: 2026-06-26 20:03
-- Run: Supabase SQL Editor, execute once
-- =====================================================
-- Note: Persists per-user toggles (auto_enrich, auto_explain)
--       controlling whether new words are automatically
--       enriched and explained.
-- -----------------------------------------------------
-- 自动 AI 分析开关：新词加入单词本时是否自动生成释义 / 自动深入理解
-- 跨设备持久化，存储在 profiles 表
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS auto_enrich BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS auto_explain BOOLEAN DEFAULT false;
