-- =============================================
-- 新用户注册时自动创建默认同步单词本
-- =============================================
-- 修改 handle_new_user 触发器，在创建用户资料的同时创建默认单词本

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_book_id UUID;
BEGIN
  -- 创建用户资料
  INSERT INTO public.profiles (id, display_name, created_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email),
    NOW()
  );

  -- 创建默认同步单词本
  v_book_id := gen_random_uuid();
  INSERT INTO public.vocabulary_books (
    id, user_id, name, description, word_count, icon, is_sync, is_deleted, sync_version, created_at, updated_at
  ) VALUES (
    v_book_id,
    NEW.id,
    '默认',
    '用于存放单词的默认单词本',
    0,
    'BookOpen',
    TRUE,
    FALSE,
    1,
    NOW(),
    NOW()
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;