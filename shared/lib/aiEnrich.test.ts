import assert from 'node:assert/strict';
import { buildAiEnrichmentPrompt, parseAiEnrichmentResponse } from './aiEnrich';

{
  const prompt = buildAiEnrichmentPrompt({
    word: 'leverage',
    translation: '利用',
    contexts: [
      { context: 'We can leverage existing data.', translation: '我们可以利用现有数据。', timeAdded: 1 },
      { context: '   ', translation: '', timeAdded: 2 },
    ],
  });

  assert.match(prompt, /leverage/);
  assert.match(prompt, /We can leverage existing data\./);
  assert.doesNotMatch(prompt, /timeAdded/);
}

{
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

  assert.equal(parsed.definition, 'Use something to maximum advantage.');
  assert.equal(parsed.translation, '利用；发挥作用');
  assert.deepEqual(parsed.synonyms, ['use', 'harness']);
  assert.deepEqual(parsed.examples, [{ en: 'Teams leverage shared tools.', zh: '团队利用共享工具。' }]);
  assert.deepEqual(parsed.usageHistory, [
    { context: 'A strategy memo', translation: '战略备忘录', source: 'AI' },
  ]);
  assert.equal(parsed.memoryTip, 'Think of a lever.');
}

{
  assert.throws(() => parseAiEnrichmentResponse('not json'), /invalid_ai_enrichment_json/);
}
