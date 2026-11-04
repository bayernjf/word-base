-- =====================================================
-- Migration 023: Lock down quota table writes
-- File: 023_quota_rls_lockdown.sql
-- Date: 2026-11-03
-- Run: Supabase SQL Editor, execute once
-- =====================================================
-- Note: Previously every quota table allowed users to
--       INSERT/UPDATE their own rows, so anyone with an
--       access token could reset call_count via PostgREST
--       and bypass the daily AI cost limits.
--       This migration:
--         1. Drops all user INSERT/UPDATE policies on the
--            four quota tables (SELECT stays).
--         2. Revokes table-level INSERT/UPDATE/DELETE
--            from anon/authenticated (defense in depth).
--         3. Adds SECURITY DEFINER atomic increment RPCs,
--            executable only by service_role.
--       API writes now go through supabaseAdmin.rpc(...).
-- =====================================================

-- =============================================
-- 1. Drop user-writable RLS policies (keep SELECT policies)
-- =============================================
DROP POLICY IF EXISTS "Users can upsert their own ai call quota" ON ai_call_quota;
DROP POLICY IF EXISTS "Users can update their own ai call quota" ON ai_call_quota;

DROP POLICY IF EXISTS "Users can upsert their own practice quota" ON practice_generation_quota;
DROP POLICY IF EXISTS "Users can update their own practice quota" ON practice_generation_quota;

DROP POLICY IF EXISTS "Users can upsert their own quota" ON story_generation_quota;
DROP POLICY IF EXISTS "Users can update their own quota" ON story_generation_quota;

DROP POLICY IF EXISTS "Users can upsert their own feedback quota" ON feedback_quota;
DROP POLICY IF EXISTS "Users can update their own feedback quota" ON feedback_quota;

-- =============================================
-- 2. Defense in depth: revoke table-level write grants
--    (RLS already denies, this blocks even policy mistakes)
-- =============================================
REVOKE INSERT, UPDATE, DELETE ON ai_call_quota FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON practice_generation_quota FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON story_generation_quota FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON feedback_quota FROM anon, authenticated;

-- =============================================
-- 3. Atomic increment RPCs (service_role only)
--    Upsert + increment in a single statement, avoiding
--    read-then-write races between concurrent requests.
-- =============================================
CREATE OR REPLACE FUNCTION increment_ai_call_quota(p_user_id UUID, p_quota_date DATE)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_count INTEGER;
BEGIN
  INSERT INTO ai_call_quota (user_id, quota_date, call_count)
  VALUES (p_user_id, p_quota_date, 1)
  ON CONFLICT (user_id, quota_date)
  DO UPDATE SET call_count = ai_call_quota.call_count + 1
  RETURNING call_count INTO new_count;
  RETURN new_count;
END;
$$;

CREATE OR REPLACE FUNCTION increment_story_generation_quota(p_user_id UUID, p_quota_date DATE)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_count INTEGER;
BEGIN
  INSERT INTO story_generation_quota (user_id, quota_date, generated_count)
  VALUES (p_user_id, p_quota_date, 1)
  ON CONFLICT (user_id, quota_date)
  DO UPDATE SET generated_count = story_generation_quota.generated_count + 1
  RETURNING generated_count INTO new_count;
  RETURN new_count;
END;
$$;

CREATE OR REPLACE FUNCTION increment_practice_generation_quota(p_user_id UUID, p_quota_date DATE)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_count INTEGER;
BEGIN
  INSERT INTO practice_generation_quota (user_id, quota_date, generated_count)
  VALUES (p_user_id, p_quota_date, 1)
  ON CONFLICT (user_id, quota_date)
  DO UPDATE SET generated_count = practice_generation_quota.generated_count + 1
  RETURNING generated_count INTO new_count;
  RETURN new_count;
END;
$$;

CREATE OR REPLACE FUNCTION increment_feedback_quota(p_user_id UUID, p_quota_date DATE)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_count INTEGER;
BEGIN
  INSERT INTO feedback_quota (user_id, quota_date, count)
  VALUES (p_user_id, p_quota_date, 1)
  ON CONFLICT (user_id, quota_date)
  DO UPDATE SET count = feedback_quota.count + 1
  RETURNING count INTO new_count;
  RETURN new_count;
END;
$$;

-- Default EXECUTE grant goes to PUBLIC; revoke it and allow only service_role
REVOKE EXECUTE ON FUNCTION increment_ai_call_quota(UUID, DATE) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION increment_story_generation_quota(UUID, DATE) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION increment_practice_generation_quota(UUID, DATE) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION increment_feedback_quota(UUID, DATE) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION increment_ai_call_quota(UUID, DATE) TO service_role;
GRANT EXECUTE ON FUNCTION increment_story_generation_quota(UUID, DATE) TO service_role;
GRANT EXECUTE ON FUNCTION increment_practice_generation_quota(UUID, DATE) TO service_role;
GRANT EXECUTE ON FUNCTION increment_feedback_quota(UUID, DATE) TO service_role;
