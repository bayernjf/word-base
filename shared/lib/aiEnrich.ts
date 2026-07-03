import type { Word, WordContext } from '../types';
import type { SenseGroups, Story, ChatMessage } from '../types';
import { apiUrl } from './apiBase';

export interface AiEnrichmentRequest {
  word: string;
  translation?: string;
  contexts?: WordContext[];
  wordId?: string;
}

export interface AiEnrichment {
  definition: string;
  translation: string;
  synonyms: string[];
  examples: Array<{ en: string; zh: string }>;
  usageHistory: Array<{ context: string; translation: string; source: string }>;
  memoryTip?: string;
}

export function buildAiEnrichmentPrompt(input: AiEnrichmentRequest): string {
  const contexts = (input.contexts || [])
    .map((item) => item.context?.trim())
    .filter(Boolean)
    .slice(0, 5);

  return [
    'Generate vocabulary enrichment as strict JSON only.',
    'Schema: {"definition":"...","translation":"...","synonyms":["..."],"examples":[{"en":"...","zh":"..."}],"usageHistory":[{"context":"...","translation":"...","source":"AI"}],"memoryTip":"..."}',
    `Word: ${input.word.trim()}`,
    `Current translation: ${input.translation || ''}`,
    `Contexts: ${JSON.stringify(contexts)}`,
    'Rules: "definition" must be an English explanation of the word meaning (English-English style); "translation" must be the Chinese translation; examples must be natural English with Chinese translations; synonyms must be English; memoryTip must be in Chinese; do not include markdown.',
  ].join('\n');
}

export function parseAiEnrichmentResponse(raw: string): AiEnrichment {
  const jsonText = extractJsonText(raw);
  let parsed: unknown;

  try {
    parsed = JSON.parse(jsonText);
  } catch {
    throw new Error('invalid_ai_enrichment_json');
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('invalid_ai_enrichment_json');
  }

  const value = parsed as Record<string, unknown>;
  return {
    definition: readString(value.definition),
    translation: readString(value.translation),
    synonyms: readStringArray(value.synonyms).slice(0, 8),
    examples: readExamples(value.examples).slice(0, 5),
    usageHistory: readUsageHistory(value.usageHistory).slice(0, 5),
    memoryTip: readString(value.memoryTip) || undefined,
  };
}

export async function requestAiEnrichment(input: AiEnrichmentRequest, accessToken: string): Promise<AiEnrichment> {
  console.debug('[aiEnrich] requestAiEnrichment', { word: input.word, wordId: input.wordId });
  const response = await fetch(apiUrl('/api/v1/ai/enrich'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(input),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(String(data?.error || 'ai_enrich_failed'));
  }

  console.debug('[aiEnrich] requestAiEnrichment success', { word: input.word });
  return normalizeEnrichment(data?.enrichment);
}

export interface DeepExplanation {
  contextInsights: Array<{ context: string; insight: string }>;
  synonymComparison: string;
  memoryHook: string;
  generatedAt?: number;
}

export function parseDeepExplanationResponse(raw: string): DeepExplanation {
  const jsonText = extractJsonText(raw);
  let parsed: unknown;

  try {
    parsed = JSON.parse(jsonText);
  } catch {
    throw new Error('invalid_ai_enrichment_json');
  }

  return normalizeDeepExplanation(parsed);
}

export async function requestDeepExplanation(
  input: AiEnrichmentRequest,
  accessToken: string
): Promise<DeepExplanation> {
  console.debug('[aiEnrich] requestDeepExplanation', { word: input.word, wordId: input.wordId });
  const response = await fetch(apiUrl('/api/v1/ai/explain'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(input),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(String(data?.error || 'ai_explain_failed'));
  }

  console.debug('[aiEnrich] requestDeepExplanation success', { word: input.word });
  return normalizeDeepExplanation(data?.deepExplanation);
}

function normalizeDeepExplanation(value: unknown): DeepExplanation {
  if (!value || typeof value !== 'object') {
    throw new Error('invalid_ai_enrichment_json');
  }

  const record = value as Record<string, unknown>;
  const contextInsights = (Array.isArray(record.contextInsights) ? record.contextInsights : [])
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const row = item as Record<string, unknown>;
      const context = readString(row.context);
      const insight = readString(row.insight);
      return context && insight ? { context, insight } : null;
    })
    .filter((item): item is { context: string; insight: string } => Boolean(item))
    .slice(0, 5);

  const generatedAt = typeof record.generatedAt === 'number' ? record.generatedAt : undefined;

  return {
    contextInsights,
    synonymComparison: readString(record.synonymComparison),
    memoryHook: readString(record.memoryHook),
    generatedAt,
  };
}

export function enrichmentToWordUpdates(enrichment: AiEnrichment): Partial<Word> {
  const now = Date.now();
  return {
    definition: enrichment.definition,
    translation: enrichment.translation,
    chineseTranslation: enrichment.translation,
    synonyms: enrichment.synonyms,
    examples: enrichment.examples,
    usageHistory: enrichment.usageHistory,
    memoryTip: enrichment.memoryTip,
    timeUpdated: now,
    dateUpdated: now,
  };
}

export function parseSenseGroupsResponse(raw: string): SenseGroups {
  const jsonText = extractJsonText(raw);
  let parsed: unknown;

  try {
    parsed = JSON.parse(jsonText);
  } catch {
    throw new Error('invalid_ai_enrichment_json');
  }

  return normalizeSenseGroups(parsed);
}

export async function requestSenseClusters(
  input: AiEnrichmentRequest,
  accessToken: string
): Promise<SenseGroups> {
  console.debug('[aiEnrich] requestSenseClusters', { word: input.word, wordId: input.wordId });
  const response = await fetch(apiUrl('/api/v1/ai/sense-cluster'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(input),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(String(data?.error || 'ai_sense_cluster_failed'));
  }

  console.debug('[aiEnrich] requestSenseClusters success', { word: input.word });
  return normalizeSenseGroups(data?.senseGroups);
}

function normalizeSenseGroups(value: unknown): SenseGroups {
  if (!value || typeof value !== 'object') {
    throw new Error('invalid_ai_enrichment_json');
  }

  const record = value as Record<string, unknown>;
  const groups = (Array.isArray(record.groups) ? record.groups : [])
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const row = item as Record<string, unknown>;
      const sense = readString(row.sense);
      const contexts = readStringArray(row.contexts);
      if (!sense) return null;
      return {
        sense,
        translation: readString(row.translation),
        definition: readString(row.definition),
        contexts,
      };
    })
    .filter((item): item is SenseGroups['groups'][number] => Boolean(item))
    .slice(0, 8);

  const generatedAt = typeof record.generatedAt === 'number' ? record.generatedAt : Date.now();

  return { groups, generatedAt };
}

export async function requestAiTranslate(
  text: string,
  targetLanguage: string,
  accessToken: string,
  providerId?: string
): Promise<string> {
  console.debug('[aiEnrich] requestAiTranslate', { textLength: text.length, targetLanguage, providerId });
  const response = await fetch(apiUrl('/api/v1/ai/translate'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ text, targetLanguage, providerId }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(String(data?.error || 'ai_translate_failed'));
  }
  const raw = String(data?.translatedText || '').trim();
  // 某些模型会返回 JSON 格式如 {"translation":"xxx"}，提取纯文本
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.translation === 'string') {
      return parsed.translation.trim();
    }
  } catch {
    // 不是 JSON，直接返回原文
  }
  console.debug('[aiEnrich] requestAiTranslate success', { resultLength: raw.length });
  return raw;
}

function normalizeEnrichment(value: unknown): AiEnrichment {
  if (!value || typeof value !== 'object') {
    throw new Error('invalid_ai_enrichment_json');
  }

  return parseAiEnrichmentResponse(JSON.stringify(value));
}

function extractJsonText(raw: string): string {
  const text = String(raw || '').trim();
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) return fenced[1].trim();

  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start >= 0 && end > start) {
    return text.slice(start, end + 1);
  }

  return text;
}

function readString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function readStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map(readString).filter(Boolean);
}

function readExamples(value: unknown): AiEnrichment['examples'] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const record = item as Record<string, unknown>;
      const en = readString(record.en);
      const zh = readString(record.zh);
      return en && zh ? { en, zh } : null;
    })
    .filter((item): item is { en: string; zh: string } => Boolean(item));
}

function readUsageHistory(value: unknown): AiEnrichment['usageHistory'] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const record = item as Record<string, unknown>;
      const context = readString(record.context);
      const translation = readString(record.translation);
      const source = readString(record.source) || 'AI';
      return context && translation ? { context, translation, source } : null;
    })
    .filter((item): item is { context: string; translation: string; source: string } => Boolean(item));
}

export interface StoryGenerateRequest {
  topic?: string;
  difficulty?: string;
  words?: string[];
  sourceWordIds?: string[];
}

// 生成的故事（未持久化前的形态，与 Story 对齐但 id/createdAt 由后端返回）
export type GeneratedStory = Story & { createdAt?: string };

export async function requestStoryGenerate(
  input: StoryGenerateRequest,
  accessToken: string
): Promise<{ story: GeneratedStory; remaining: number }> {
  console.debug('[aiEnrich] requestStoryGenerate', { topic: input.topic, words: input.words?.length });
  const response = await fetch(apiUrl('/api/v1/ai/story-generate'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(input),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(String(data?.error || 'ai_story_generate_failed'));
  }
  return { story: data.story as GeneratedStory, remaining: Number(data?.remaining ?? 0) };
}

export async function requestTutorChat(
  input: { story?: Pick<Story, 'title' | 'contentEn'>; history?: ChatMessage[]; message: string },
  accessToken: string
): Promise<string> {
  console.debug('[aiEnrich] requestTutorChat', { messageLength: input.message.length });
  const response = await fetch(apiUrl('/api/v1/ai/tutor-chat'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(input),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(String(data?.error || 'ai_tutor_chat_failed'));
  }
  return String(data?.reply || '').trim();
}
