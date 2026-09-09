-- =====================================================
-- Migration 022: Add source language to words
-- File: 022_word_source_language.sql
-- Date: 2026-08-05 06:05
-- Run: Supabase SQL Editor, execute once
-- =====================================================
-- Note: Adds source_language (ISO 639-1, default 'en') to
--       support multi-language word collection.
-- -----------------------------------------------------
-- 022: add source_language to words table
-- Supports multi-language word collection (en/ja/de/fr/ko/...)

ALTER TABLE words
ADD COLUMN IF NOT EXISTS source_language TEXT DEFAULT 'en';

COMMENT ON COLUMN words.source_language IS 'ISO 639-1 language code of the word source (en/ja/de/fr/ko etc.)';
