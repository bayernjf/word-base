-- =====================================================
-- Migration 008: Re-add openai-compatible provider option
-- File: 008_ai_provider_openai_compatible.sql
-- Date: 2026-06-24 00:16
-- Run: Supabase SQL Editor, execute once
-- =====================================================
-- Note: Relaxes the provider CHECK constraint again to include
--       'openai-compatible' alongside the other providers.
-- -----------------------------------------------------
ALTER TABLE ai_provider_configs
  DROP CONSTRAINT IF EXISTS ai_provider_configs_provider_check;

ALTER TABLE ai_provider_configs
  ADD CONSTRAINT ai_provider_configs_provider_check
  CHECK (provider IN ('openai', 'anthropic', 'gemini', 'openai-compatible'));
