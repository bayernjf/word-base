CREATE TABLE IF NOT EXISTS ai_provider_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  provider TEXT NOT NULL CHECK (provider IN ('gemini', 'openai-compatible')),
  model TEXT NOT NULL,
  endpoint TEXT,
  encrypted_api_key TEXT NOT NULL,
  api_key_hint TEXT NOT NULL DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_provider_configs_user_id
  ON ai_provider_configs(user_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_ai_provider_configs_one_active
  ON ai_provider_configs(user_id)
  WHERE is_active = TRUE;

ALTER TABLE ai_provider_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own AI provider configs"
  ON ai_provider_configs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own AI provider configs"
  ON ai_provider_configs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own AI provider configs"
  ON ai_provider_configs FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own AI provider configs"
  ON ai_provider_configs FOR DELETE
  USING (auth.uid() = user_id);
