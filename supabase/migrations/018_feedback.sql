-- =============================================
-- 意见反馈系统
-- 设计参考 soft-desk 项目的 Feedback-Schema，针对 word-base 多端学习 App 增强：
--   1. 强制登录（user_id NOT NULL），不支持匿名反馈
--   2. 新增 content_error 分类（单词释义/发音/例句等内容错误）
--   3. 新增 admin_reply + replied_at（管理端回复字段）
--   4. 保留 feedback_logs 诊断日志附件表（三端前端 logger 缓冲区 + 桌面端主进程日志）
--   5. 用户只能 INSERT/SELECT 自己的数据，不能 UPDATE/DELETE（防篡改状态）
--   6. 状态流转和回复由管理端通过 service role 在 Supabase Dashboard 处理
-- 对应前端单一来源：shared/lib/feedback.ts；修改枚举时必须同步本文件 CHECK 约束。
-- =============================================

CREATE TABLE IF NOT EXISTS feedbacks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category        TEXT NOT NULL CHECK (category IN ('bug','feature','content_error','question','other')),
  title           TEXT NOT NULL CHECK (length(title) BETWEEN 1 AND 100),
  content         TEXT NOT NULL CHECK (length(content) BETWEEN 1 AND 5000),
  contact         TEXT CHECK (contact IS NULL OR length(contact) <= 200),
  app_version     TEXT NOT NULL,
  platform        TEXT NOT NULL,
  os_version      TEXT,
  device_model    TEXT,
  status          TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','processing','resolved','closed')),
  admin_reply     TEXT,
  replied_at      TIMESTAMP WITH TIME ZONE,
  created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS feedback_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feedback_id     UUID NOT NULL REFERENCES feedbacks(id) ON DELETE CASCADE,
  content         TEXT NOT NULL,
  line_count      INTEGER NOT NULL DEFAULT 0,
  started_at      TIMESTAMP WITH TIME ZONE,
  ended_at        TIMESTAMP WITH TIME ZONE,
  truncated       BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- =============================================
-- 每日提交限流：登录用户 10 条/天
-- =============================================
CREATE TABLE IF NOT EXISTS feedback_quota (
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quota_date      DATE NOT NULL DEFAULT CURRENT_DATE,
  count           INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, quota_date)
);

-- =============================================
-- 索引
-- =============================================
CREATE INDEX IF NOT EXISTS idx_feedbacks_user_id     ON feedbacks (user_id);
CREATE INDEX IF NOT EXISTS idx_feedbacks_status      ON feedbacks (status);
CREATE INDEX IF NOT EXISTS idx_feedbacks_created_at  ON feedbacks (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedback_logs_feedback_id ON feedback_logs (feedback_id);

-- =============================================
-- 触发器：自动维护 feedbacks.updated_at
-- =============================================
CREATE OR REPLACE FUNCTION update_feedbacks_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_feedbacks_updated_at ON feedbacks;
CREATE TRIGGER trg_feedbacks_updated_at
  BEFORE UPDATE ON feedbacks
  FOR EACH ROW EXECUTE FUNCTION update_feedbacks_updated_at();

-- =============================================
-- 行级安全策略（RLS）
-- feedbacks：用户只能 INSERT/SELECT 自己的；不能 UPDATE/DELETE（状态变更权在管理端）
-- =============================================
ALTER TABLE feedbacks ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_quota ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own feedbacks"
  ON feedbacks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own feedbacks"
  ON feedbacks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own feedback logs"
  ON feedback_logs FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM feedbacks
    WHERE feedbacks.id = feedback_logs.feedback_id
      AND feedbacks.user_id = auth.uid()
  ));

CREATE POLICY "Users can create their own feedback logs"
  ON feedback_logs FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM feedbacks
    WHERE feedbacks.id = feedback_logs.feedback_id
      AND feedbacks.user_id = auth.uid()
  ));

CREATE POLICY "Users can view their own feedback quota"
  ON feedback_quota FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can upsert their own feedback quota"
  ON feedback_quota FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own feedback quota"
  ON feedback_quota FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
