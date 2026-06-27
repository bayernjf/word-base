-- AI 深度解释：结合用户保存的语境，单独存储个性化用法讲解（不覆盖基础丰富字段）
-- 结构：{ "contextInsights": [{ "context": "...", "insight": "..." }], "synonymComparison": "...", "memoryHook": "...", "generatedAt": 1700000000000 }
ALTER TABLE words ADD COLUMN IF NOT EXISTS deep_explanation JSONB DEFAULT NULL;
