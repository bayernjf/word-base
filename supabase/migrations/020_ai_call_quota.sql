-- =============================================
-- AI 轻量端点（enrich/explain/sense-cluster/translate/tutor-chat）每日调用配额
-- 与 story/practice 配额同构，作为跨实例的硬上限，控 AI 成本
-- =============================================

CREATE TABLE IF NOT EXISTS ai_call_quota (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quota_date DATE NOT NULL DEFAULT CURRENT_DATE,
  call_count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, quota_date)
);

ALTER TABLE ai_call_quota ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own ai call quota"
  ON ai_call_quota FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can upsert their own ai call quota"
  ON ai_call_quota FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own ai call quota"
  ON ai_call_quota FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
