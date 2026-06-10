-- =============================================
-- 同步单词本唯一性约束与原子切换函数
-- =============================================

-- 先修复历史上可能存在的多个同步单词本
WITH ranked_sync_books AS (
  SELECT
    id,
    user_id,
    ROW_NUMBER() OVER (
      PARTITION BY user_id
      ORDER BY
        CASE WHEN name = '默认' THEN 1 ELSE 0 END ASC,
        COALESCE(updated_at, created_at) DESC,
        created_at ASC
    ) AS rn
  FROM vocabulary_books
  WHERE is_deleted = FALSE
    AND is_sync = TRUE
)
UPDATE vocabulary_books AS target
SET
  is_sync = FALSE,
  updated_at = NOW()
FROM ranked_sync_books AS ranked
WHERE target.id = ranked.id
  AND ranked.rn > 1;

-- 保证每个用户最多只有一个同步单词本
CREATE UNIQUE INDEX IF NOT EXISTS idx_vocabulary_books_single_sync_per_user
  ON vocabulary_books(user_id)
  WHERE is_deleted = FALSE AND is_sync = TRUE;

-- 原子设置同步单词本，避免前端两次 update 产生空窗期
CREATE OR REPLACE FUNCTION public.set_sync_book(p_book_id UUID)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  name TEXT,
  description TEXT,
  word_count INTEGER,
  icon TEXT,
  is_sync BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
) AS $$
DECLARE
  v_user_id UUID;
BEGIN
  SELECT vocabulary_books.user_id
  INTO v_user_id
  FROM vocabulary_books
  WHERE vocabulary_books.id = p_book_id
    AND vocabulary_books.is_deleted = FALSE;

  IF v_user_id IS NULL OR v_user_id <> auth.uid() THEN
    RAISE EXCEPTION 'book_not_found_or_forbidden';
  END IF;

  PERFORM 1
  FROM vocabulary_books
  WHERE vocabulary_books.user_id = v_user_id
    AND vocabulary_books.is_deleted = FALSE
  FOR UPDATE;

  UPDATE vocabulary_books
  SET
    is_sync = FALSE,
    updated_at = NOW()
  WHERE vocabulary_books.user_id = v_user_id
    AND vocabulary_books.is_sync = TRUE
    AND vocabulary_books.is_deleted = FALSE;

  UPDATE vocabulary_books
  SET
    is_sync = TRUE,
    updated_at = NOW()
  WHERE vocabulary_books.id = p_book_id
    AND vocabulary_books.user_id = v_user_id
    AND vocabulary_books.is_deleted = FALSE;

  RETURN QUERY
  SELECT
    vocabulary_books.id,
    vocabulary_books.user_id,
    vocabulary_books.name,
    vocabulary_books.description,
    vocabulary_books.word_count,
    vocabulary_books.icon,
    vocabulary_books.is_sync,
    vocabulary_books.created_at,
    vocabulary_books.updated_at
  FROM vocabulary_books
  WHERE vocabulary_books.user_id = v_user_id
    AND vocabulary_books.is_deleted = FALSE
  ORDER BY vocabulary_books.is_sync DESC, vocabulary_books.created_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.set_sync_book(UUID) TO authenticated;
