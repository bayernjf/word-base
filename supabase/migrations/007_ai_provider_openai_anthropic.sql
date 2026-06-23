ALTER TABLE ai_provider_configs
  DROP CONSTRAINT IF EXISTS ai_provider_configs_provider_check;

UPDATE ai_provider_configs
SET provider = 'openai'
WHERE provider = 'openai-compatible';

ALTER TABLE ai_provider_configs
  ADD CONSTRAINT ai_provider_configs_provider_check
  CHECK (provider IN ('openai', 'anthropic', 'gemini'));
