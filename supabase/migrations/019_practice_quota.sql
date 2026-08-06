-- =============================================
-- 练习中心每日生成限流
-- 与 story_generation_quota 同构，控 AI 成本
-- =============================================

CREATE TABLE IF NOT EXISTS practice_generation_quota (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quota_date DATE NOT NULL DEFAULT CURRENT_DATE,
  generated_count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, quota_date)
);

ALTER TABLE practice_generation_quota ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own practice quota"
  ON practice_generation_quota FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can upsert their own practice quota"
  ON practice_generation_quota FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own practice quota"
  ON practice_generation_quota FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
