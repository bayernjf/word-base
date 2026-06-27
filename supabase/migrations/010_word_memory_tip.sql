-- AI 丰富生成的记忆技巧：在 words 表存储单词记忆提示
ALTER TABLE words ADD COLUMN IF NOT EXISTS memory_tip TEXT DEFAULT '';
