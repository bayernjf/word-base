-- =====================================================
-- Migration 007: Support OpenAI and Anthropic providers
-- File: 007_ai_provider_openai_anthropic.sql
-- Date: 2026-06-24 00:16
-- Run: Supabase SQL Editor, execute once
-- =====================================================
-- Note: Rewrites the provider CHECK constraint: migrates
--       'openai-compatible' rows to 'openai' and allows
--       'openai', 'anthropic' and 'gemini'.
-- -----------------------------------------------------
ALTER TABLE ai_provider_configs
  DROP CONSTRAINT IF EXISTS ai_provider_configs_provider_check;

UPDATE ai_provider_configs
SET provider = 'openai'
WHERE provider = 'openai-compatible';

ALTER TABLE ai_provider_configs
  ADD CONSTRAINT ai_provider_configs_provider_check
  CHECK (provider IN ('openai', 'anthropic', 'gemini'));
