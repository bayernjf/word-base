-- =============================================
-- Supabase 数据库初始化脚本
-- =============================================

-- 用户资料表（存储头像、昵称等）
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  avatar_url TEXT,
  display_name TEXT,
  bio TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- 商业化字段
  is_premium BOOLEAN DEFAULT FALSE,
  premium_expires_at TIMESTAMP WITH TIME ZONE,
  total_words INTEGER DEFAULT 0,
  total_books INTEGER DEFAULT 0
);

-- 单词本表
CREATE TABLE IF NOT EXISTS vocabulary_books (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  word_count INTEGER DEFAULT 0,
  icon TEXT DEFAULT 'BookOpen',
  is_sync BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  sync_version INTEGER DEFAULT 1,
  is_deleted BOOLEAN DEFAULT FALSE,
  UNIQUE (user_id, name)
);

-- 单词表
CREATE TABLE IF NOT EXISTS words (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  word TEXT NOT NULL,
  frequency INTEGER DEFAULT 1,
  translation TEXT DEFAULT '',
  time_added TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  time_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  contexts JSONB DEFAULT '[]',
  phonetic TEXT DEFAULT '',
  part_of_speech TEXT DEFAULT 'noun',
  definition TEXT DEFAULT '',
  chinese_translation TEXT DEFAULT '',
  synonyms JSONB DEFAULT '[]',
  examples JSONB DEFAULT '[]',
  usage_history JSONB DEFAULT '[]',
  level TEXT DEFAULT 'B2',
  familiarity INTEGER DEFAULT 0,
  book_id UUID NOT NULL REFERENCES vocabulary_books(id) ON DELETE CASCADE,
  meta JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  sync_version INTEGER DEFAULT 1,
  is_deleted BOOLEAN DEFAULT FALSE,
  UNIQUE (user_id, word, book_id)
);

-- 同步变更日志表
CREATE TABLE IF NOT EXISTS sync_changelogs (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL, -- 'book' or 'word'
  entity_id UUID NOT NULL,
  action TEXT NOT NULL, -- 'create', 'update', 'delete'
  sync_version INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_vocabulary_books_user_id ON vocabulary_books(user_id);
CREATE INDEX IF NOT EXISTS idx_words_user_id ON words(user_id);
CREATE INDEX IF NOT EXISTS idx_words_book_id ON words(book_id);
CREATE INDEX IF NOT EXISTS idx_sync_changelogs_user_id ON sync_changelogs(user_id);
CREATE INDEX IF NOT EXISTS idx_sync_changelogs_version ON sync_changelogs(user_id, sync_version);

-- =============================================
-- 自动更新时间戳函数
-- =============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- =============================================
-- 用户资料表更新时间戳触发器
-- =============================================
CREATE TRIGGER update_profiles_updated_at 
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- 单词本表更新时间戳触发器
-- =============================================
CREATE TRIGGER update_vocabulary_books_updated_at 
  BEFORE UPDATE ON vocabulary_books
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- 单词表更新时间戳触发器
-- =============================================
CREATE TRIGGER update_words_updated_at 
  BEFORE UPDATE ON words
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- 自动创建 sync_version 函数
-- =============================================
CREATE OR REPLACE FUNCTION get_next_sync_version(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_next_version INTEGER;
BEGIN
  SELECT COALESCE(MAX(sync_version), 0) + 1 
  INTO v_next_version 
  FROM sync_changelogs 
  WHERE user_id = p_user_id;
  
  RETURN v_next_version;
END;
$$ LANGUAGE plpgsql;
