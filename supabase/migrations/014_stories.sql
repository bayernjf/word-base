-- =============================================
-- 智能句景（AI 故事精读）表
-- 设计目标：低频生成、单条偏大；存储不是瓶颈，重点在 user_id 隔离 + 索引 + 限流
-- =============================================

CREATE TABLE IF NOT EXISTS stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT '',
  difficulty TEXT NOT NULL DEFAULT 'B2',
  content_en TEXT NOT NULL DEFAULT '',
  content_zh TEXT NOT NULL DEFAULT '',
  -- 结构化分句：[{ en, zh, words: [] }]
  sentences JSONB NOT NULL DEFAULT '[]',
  -- 文中高亮的目标词
  highlighted_words JSONB NOT NULL DEFAULT '[]',
  grammar_insight TEXT NOT NULL DEFAULT '',
  -- 生成该文章时用到的生词（与生词本打通，可空）
  source_word_ids JSONB NOT NULL DEFAULT '[]',
  -- 公共可复用：相同主题/难度可被其他用户复用的文章标记（不含隐私）
  is_public BOOLEAN NOT NULL DEFAULT FALSE,
  -- 冷数据归档用：最近一次阅读时间
  last_read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  sync_version INTEGER DEFAULT 1,
  is_deleted BOOLEAN DEFAULT FALSE
);

-- 列表查询：按用户 + 时间倒序（用户故事库主查询路径）
CREATE INDEX IF NOT EXISTS idx_stories_user_created
  ON stories (user_id, created_at DESC)
  WHERE is_deleted = FALSE;

-- 冷数据归档扫描：按最近阅读时间
CREATE INDEX IF NOT EXISTS idx_stories_last_read
  ON stories (last_read_at);

-- 公共文章复用查询：按主题 + 难度命中已生成文章
CREATE INDEX IF NOT EXISTS idx_stories_public_lookup
  ON stories (category, difficulty)
  WHERE is_public = TRUE AND is_deleted = FALSE;

-- =============================================
-- 每日生成限流：记录每个用户每天生成文章数（控 AI 成本与存储）
-- =============================================
CREATE TABLE IF NOT EXISTS story_generation_quota (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quota_date DATE NOT NULL DEFAULT CURRENT_DATE,
  generated_count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, quota_date)
);

-- =============================================
-- 行级安全策略（RLS）：用户仅能访问自己的文章，外加可读公共文章
-- =============================================
ALTER TABLE stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_generation_quota ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own or public stories"
  ON stories FOR SELECT
  USING (auth.uid() = user_id OR is_public = TRUE);

CREATE POLICY "Users can create their own stories"
  ON stories FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own stories"
  ON stories FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own stories"
  ON stories FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own quota"
  ON story_generation_quota FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can upsert their own quota"
  ON story_generation_quota FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own quota"
  ON story_generation_quota FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
