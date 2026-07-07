import assert from 'node:assert/strict';
import { buildApiKeyHint, normalizeAiProviderConfig } from './aiProviderConfigs';

{
  assert.equal(buildApiKeyHint('sk-abc123456789'), '••••6789');
  assert.equal(buildApiKeyHint('tiny'), '••••tiny');
  assert.equal(buildApiKeyHint(''), '');
}

{
  const config = normalizeAiProviderConfig({
    id: 'cfg-1',
    name: 'My Gateway',
    provider: 'openai-compatible',
    model: 'gpt-4o-mini',
    endpoint: 'https://api.example.com/v1',
    apiKeyHint: '••••1234',
    apiKey: 'sk-should-not-leak',
    isActive: true,
  });

  assert.deepEqual(config, {
    id: 'cfg-1',
    name: 'My Gateway',
    provider: 'openai-compatible',
    model: 'gpt-4o-mini',
    endpoint: 'https://api.example.com/v1',
    apiKeyHint: '••••1234',
    isActive: true,
    createdAt: undefined,
    updatedAt: undefined,
  });
}

{
  const config = normalizeAiProviderConfig({
    id: 'cfg-2',
    name: '',
    provider: 'unknown',
    model: '',
    isActive: false,
  });

  assert.equal(config.name, 'AI Provider');
  assert.equal(config.provider, 'openai');
  assert.equal(config.model, 'gpt-5.5');
}

{
  const config = normalizeAiProviderConfig({
    id: 'cfg-3',
    name: 'Claude',
    provider: 'anthropic',
    model: '',
    isActive: false,
  });

  assert.equal(config.provider, 'anthropic');
  assert.equal(config.model, 'claude-fable-5');
}

{
  const config = normalizeAiProviderConfig({
    id: 'cfg-4',
    name: 'Google',
    provider: 'gemini',
    model: '',
    isActive: false,
  });

  assert.equal(config.provider, 'gemini');
  assert.equal(config.model, 'gemini-2.5-flash');
}
