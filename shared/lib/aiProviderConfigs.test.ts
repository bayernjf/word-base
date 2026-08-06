import { describe, it, expect } from 'vitest';
import { buildApiKeyHint, normalizeAiProviderConfig } from './aiProviderConfigs';

describe('buildApiKeyHint', () => {
  it('masks the key keeping only the last 4 characters', () => {
    expect(buildApiKeyHint('sk-abc123456789')).toBe('••••6789');
    expect(buildApiKeyHint('tiny')).toBe('••••tiny');
    expect(buildApiKeyHint('')).toBe('');
  });
});

describe('normalizeAiProviderConfig', () => {
  it('keeps valid fields and never exposes the raw api key', () => {
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

    expect(config).toEqual({
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
  });

  it('falls back to openai defaults for unknown provider and empty fields', () => {
    const config = normalizeAiProviderConfig({
      id: 'cfg-2',
      name: '',
      provider: 'unknown',
      model: '',
      isActive: false,
    });

    expect(config.name).toBe('AI Provider');
    expect(config.provider).toBe('openai');
    expect(config.model).toBe('gpt-5.5');
  });

  it('applies anthropic default model', () => {
    const config = normalizeAiProviderConfig({
      id: 'cfg-3',
      name: 'Claude',
      provider: 'anthropic',
      model: '',
      isActive: false,
    });

    expect(config.provider).toBe('anthropic');
    expect(config.model).toBe('claude-fable-5');
  });

  it('applies gemini default model', () => {
    const config = normalizeAiProviderConfig({
      id: 'cfg-4',
      name: 'Google',
      provider: 'gemini',
      model: '',
      isActive: false,
    });

    expect(config.provider).toBe('gemini');
    expect(config.model).toBe('gemini-2.5-flash');
  });
});
