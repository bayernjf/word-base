import type { Word, WordContext } from '../types';

export interface AiEnrichmentRequest {
  word: string;
  translation?: string;
  contexts?: WordContext[];
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
    'Rules: examples must be natural English with Chinese translations; synonyms must be English; do not include markdown.',
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
  const response = await fetch('/api/v1/ai/enrich', {
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

  return normalizeEnrichment(data?.enrichment);
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
    timeUpdated: now,
    dateUpdated: now,
  };
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
