-- =============================================
-- Supabase 安全策略 (RLS)
-- =============================================

-- 启用行级安全策略
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE vocabulary_books ENABLE ROW LEVEL SECURITY;
ALTER TABLE words ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_changelogs ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 用户资料表策略
-- =============================================
CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can create their own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- =============================================
-- 自动创建用户资料函数
-- =============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, created_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email),
    NOW()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 创建触发器
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- 单词本表策略
-- =============================================
CREATE POLICY "Users can view their own books"
  ON vocabulary_books FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own books"
  ON vocabulary_books FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own books"
  ON vocabulary_books FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own books"
  ON vocabulary_books FOR DELETE
  USING (auth.uid() = user_id);

-- =============================================
-- 单词表策略
-- =============================================
CREATE POLICY "Users can view their own words"
  ON words FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own words"
  ON words FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own words"
  ON words FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own words"
  ON words FOR DELETE
  USING (auth.uid() = user_id);

-- =============================================
-- 同步变更日志策略
-- =============================================
CREATE POLICY "Users can view their own sync logs"
  ON sync_changelogs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own sync logs"
  ON sync_changelogs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- =============================================
-- 实时发布函数
-- =============================================
-- 当单词或单词本变更时自动发布到 Supabase 实时频道
CREATE OR REPLACE FUNCTION public.notify_word_changes()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM pg_notify('word_changes', json_build_object(
      'action', 'create',
      'entity_type', 'word',
      'entity_id', NEW.id,
      'user_id', NEW.user_id
    )::text);
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM pg_notify('word_changes', json_build_object(
      'action', 'update',
      'entity_type', 'word',
      'entity_id', NEW.id,
      'user_id', NEW.user_id
    )::text);
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM pg_notify('word_changes', json_build_object(
      'action', 'delete',
      'entity_type', 'word',
      'entity_id', OLD.id,
      'user_id', OLD.user_id
    )::text);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.notify_book_changes()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM pg_notify('book_changes', json_build_object(
      'action', 'create',
      'entity_type', 'book',
      'entity_id', NEW.id,
      'user_id', NEW.user_id
    )::text);
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM pg_notify('book_changes', json_build_object(
      'action', 'update',
      'entity_type', 'book',
      'entity_id', NEW.id,
      'user_id', NEW.user_id
    )::text);
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM pg_notify('book_changes', json_build_object(
      'action', 'delete',
      'entity_type', 'book',
      'entity_id', OLD.id,
      'user_id', OLD.user_id
    )::text);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- 创建触发器
-- =============================================
CREATE TRIGGER trigger_word_changes
  AFTER INSERT OR UPDATE OR DELETE
  ON words
  FOR EACH ROW EXECUTE FUNCTION notify_word_changes();

CREATE TRIGGER trigger_book_changes
  AFTER INSERT OR UPDATE OR DELETE
  ON vocabulary_books
  FOR EACH ROW EXECUTE FUNCTION notify_book_changes();
