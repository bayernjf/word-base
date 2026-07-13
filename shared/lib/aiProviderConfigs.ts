import { getApiBaseUrl } from './apiBase';

export type AiProvider = 'openai' | 'anthropic' | 'gemini' | 'openai-compatible';

export interface AiProviderConfig {
  id: string;
  name: string;
  provider: AiProvider;
  model: string;
  endpoint?: string;
  apiKeyHint: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface AiProviderInput {
  name: string;
  provider: AiProvider;
  model: string;
  endpoint?: string;
  apiKey?: string;
  isActive?: boolean;
}

const DEFAULT_MODEL_BY_PROVIDER: Record<AiProvider, string> = {
  openai: 'gpt-5.5',
  anthropic: 'claude-fable-5',
  gemini: 'gemini-2.5-flash',
  'openai-compatible': 'gpt-4o-mini',
};

export function buildApiKeyHint(apiKey: string): string {
  const trimmed = String(apiKey || '').trim();
  if (!trimmed) return '';
  return `••••${trimmed.slice(-4)}`;
}

export function normalizeAiProviderConfig(raw: Record<string, unknown>): AiProviderConfig {
  const provider = normalizeProvider(raw.provider);

  return {
    id: readString(raw.id),
    name: readString(raw.name) || 'AI Provider',
    provider,
    model: readString(raw.model) || DEFAULT_MODEL_BY_PROVIDER[provider],
    endpoint: readString(raw.endpoint) || undefined,
    apiKeyHint: readString(raw.apiKeyHint) || readString(raw.api_key_hint),
    isActive: Boolean(raw.isActive ?? raw.is_active),
    createdAt: readString(raw.createdAt) || readString(raw.created_at) || undefined,
    updatedAt: readString(raw.updatedAt) || readString(raw.updated_at) || undefined,
  };
}

export async function listAiProviderConfigs(accessToken: string): Promise<AiProviderConfig[]> {
  const data = await requestAiProviderApi('/api/v1/ai/providers', accessToken);
  return Array.isArray(data?.configs) ? data.configs.map(normalizeAiProviderConfig) : [];
}

export async function createAiProviderConfig(input: AiProviderInput, accessToken: string): Promise<AiProviderConfig> {
  const data = await requestAiProviderApi('/api/v1/ai/providers', accessToken, {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return normalizeAiProviderConfig(data?.config || {});
}

export async function updateAiProviderConfig(
  id: string,
  input: Partial<AiProviderInput>,
  accessToken: string
): Promise<AiProviderConfig> {
  const data = await requestAiProviderApi(`/api/v1/ai/providers/${encodeURIComponent(id)}`, accessToken, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
  return normalizeAiProviderConfig(data?.config || {});
}

export async function deleteAiProviderConfig(id: string, accessToken: string): Promise<void> {
  await requestAiProviderApi(`/api/v1/ai/providers/${encodeURIComponent(id)}`, accessToken, {
    method: 'DELETE',
  });
}

export interface AiProviderTestInput {
  provider: AiProvider;
  model: string;
  endpoint?: string;
  apiKey?: string;
  id?: string;
}

export async function testAiProviderConfig(input: AiProviderTestInput, accessToken: string): Promise<boolean> {
  const data = await requestAiProviderApi('/api/v1/ai/providers/test', accessToken, {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return Boolean(data?.ok);
}

function normalizeProvider(value: unknown): AiProvider {
  if (value === 'anthropic') return 'anthropic';
  if (value === 'gemini') return 'gemini';
  if (value === 'openai-compatible') return 'openai-compatible';
  return 'openai';
}

function readString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

async function requestAiProviderApi(path: string, accessToken: string, init: RequestInit = {}) {
  const url = getApiBaseUrl() + path;
  const response = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      ...(init.headers || {}),
    },
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(String(data?.error || 'ai_provider_request_failed'));
  }

  return data;
}
