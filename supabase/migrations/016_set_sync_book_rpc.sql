-- =============================================
-- set_sync_book RPC：原子化设置同步单词本
-- 取消所有其他单词本的 is_sync，设置目标单词本为 is_sync
-- =============================================

-- 先删除旧函数（可能返回类型不同）
DROP FUNCTION IF EXISTS set_sync_book(UUID);

CREATE FUNCTION set_sync_book(p_book_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 验证书属于当前用户且未删除
  IF NOT EXISTS (
    SELECT 1 FROM vocabulary_books
    WHERE id = p_book_id
      AND user_id = auth.uid()
      AND is_deleted = false
  ) THEN
    RAISE EXCEPTION 'set_sync_book_target_not_found';
  END IF;

  -- 清除当前用户所有单词本的 is_sync
  UPDATE vocabulary_books
  SET is_sync = false, updated_at = NOW()
  WHERE user_id = auth.uid()
    AND is_deleted = false
    AND is_sync = true;

  -- 设置目标单词本为 is_sync
  UPDATE vocabulary_books
  SET is_sync = true, updated_at = NOW()
  WHERE id = p_book_id
    AND user_id = auth.uid();
END;
$$;

-- 授予认证用户执行权限
GRANT EXECUTE ON FUNCTION set_sync_book(UUID) TO authenticated;
