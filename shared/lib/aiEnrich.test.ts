import { describe, it, expect } from 'vitest';
import { buildAiEnrichmentPrompt, parseAiEnrichmentResponse } from './aiEnrich';

describe('buildAiEnrichmentPrompt', () => {
  it('includes the word and non-empty contexts, without leaking metadata', () => {
    const prompt = buildAiEnrichmentPrompt({
      word: 'leverage',
      translation: '利用',
      contexts: [
        { context: 'We can leverage existing data.', translation: '我们可以利用现有数据。', timeAdded: 1 },
        { context: '   ', translation: '', timeAdded: 2 },
      ],
    });

    expect(prompt).toMatch(/leverage/);
    expect(prompt).toMatch(/We can leverage existing data\./);
    expect(prompt).not.toMatch(/timeAdded/);
  });
});

describe('parseAiEnrichmentResponse', () => {
  it('parses fenced JSON and filters out invalid entries', () => {
    const parsed = parseAiEnrichmentResponse(`\`\`\`json
{
  "definition": "Use something to maximum advantage.",
  "translation": "利用；发挥作用",
  "synonyms": ["use", "harness", 42, ""],
  "examples": [
    {"en": "Teams leverage shared tools.", "zh": "团队利用共享工具。"},
    {"en": "", "zh": "无效"}
  ],
  "usageHistory": [
    {"context": "A strategy memo", "translation": "战略备忘录", "source": "AI"}
  ],
  "memoryTip": "Think of a lever."
}
\`\`\``);

    expect(parsed.definition).toBe('Use something to maximum advantage.');
    expect(parsed.translation).toBe('利用；发挥作用');
    expect(parsed.synonyms).toEqual(['use', 'harness']);
    expect(parsed.examples).toEqual([{ en: 'Teams leverage shared tools.', zh: '团队利用共享工具。' }]);
    expect(parsed.usageHistory).toEqual([
      { context: 'A strategy memo', translation: '战略备忘录', source: 'AI' },
    ]);
    expect(parsed.memoryTip).toBe('Think of a lever.');
  });

  it('throws on non-JSON responses', () => {
    expect(() => parseAiEnrichmentResponse('not json')).toThrow(/invalid_ai_enrichment_json/);
  });
});
