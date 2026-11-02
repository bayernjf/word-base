import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { rollbackWordRows } from './useVocabulary';

// moveWords 失败回滚的回归测试（评审 P1-4）。
// 旧实现：回滚时查行"当前"的 book_id（移动后已是目标值）再 upsert 回去
// —— 无操作；且 onConflict 'id,user_id' 依赖不存在的唯一约束，语句必报错。
// 新实现：按变更前快照逐行 update 恢复。

type Row = Record<string, unknown>;

function makeSnapshot(overrides: Row = {}): Row {
  return {
    id: 'w-1',
    user_id: 'owner-1',
    word: 'apple',
    frequency: 2,
    translation: '苹果',
    time_added: '2026-01-01T00:00:00.000Z',
    time_updated: '2026-01-02T00:00:00.000Z',
    contexts: [{ context: 'an apple', translation: '一个苹果', timeAdded: 1 }],
    phonetic: '',
    part_of_speech: 'n.',
    definition: '',
    chinese_translation: '苹果',
    synonyms: [],
    examples: [],
    usage_history: [],
    memory_tip: '',
    deep_explanation: null,
    sense_groups: null,
    level: 'B2',
    familiarity: 0,
    next_review_at: '2026-01-01T00:00:00.000Z',
    review_count: 0,
    ease_factor: 2.5,
    interval_days: 0,
    source_language: 'en',
    book_id: 'book-A',
    meta: {},
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

interface UpdateCall {
  payload: Row;
  filters: Row;
}

function makeFakeClient(failOnIds: string[] = []) {
  const updates: UpdateCall[] = [];
  const client = {
    from(table: string) {
      expect(table).toBe('words');
      return {
        update(payload: Row) {
          const call: UpdateCall = { payload, filters: {} };
          updates.push(call);
          const builder = {
            eq(col: string, val: unknown) {
              call.filters[col] = val;
              return builder;
            },
            then(
              resolve: (v: { error: { message: string } | null }) => unknown,
            ) {
              const error = failOnIds.includes(String(call.filters.id))
                ? { message: 'boom' }
                : null;
              return Promise.resolve({ error }).then(resolve);
            },
          };
          return builder;
        },
      };
    },
  };
  return { client: client as never, updates };
}

describe('rollbackWordRows', () => {
  it('restores the ORIGINAL book_id from the snapshot, not the current value', async () => {
    const { client, updates } = makeFakeClient();
    const result = await rollbackWordRows(client, 'owner-1', [
      makeSnapshot() as never,
    ]);
    expect(result).toEqual({ restored: 1, failed: 0 });
    expect(updates).toHaveLength(1);
    // 核心回归点：写回的是快照里的原 book_id
    expect(updates[0].payload.book_id).toBe('book-A');
    expect(updates[0].filters).toEqual({ id: 'w-1', user_id: 'owner-1' });
  });

  it('never writes identity columns back (id / user_id stripped)', async () => {
    const { client, updates } = makeFakeClient();
    await rollbackWordRows(client, 'owner-1', [makeSnapshot() as never]);
    expect(updates[0].payload).not.toHaveProperty('id');
    expect(updates[0].payload).not.toHaveProperty('user_id');
  });

  it('restores pre-merge content (contexts) of a merged target row', async () => {
    const originalContexts = [
      { context: 'old ctx', translation: '旧语境', timeAdded: 1 },
    ];
    const { client, updates } = makeFakeClient();
    await rollbackWordRows(client, 'owner-1', [
      makeSnapshot({ id: 'target-1', contexts: originalContexts }) as never,
    ]);
    expect(updates[0].payload.contexts).toEqual(originalContexts);
  });

  it('continues past a failing row and reports both counts', async () => {
    const { client } = makeFakeClient(['w-bad']);
    const result = await rollbackWordRows(client, 'owner-1', [
      makeSnapshot({ id: 'w-bad' }) as never,
      makeSnapshot({ id: 'w-good' }) as never,
    ]);
    expect(result).toEqual({ restored: 1, failed: 1 });
  });
});

describe('moveWords rollback wiring (static guard)', () => {
  const source = readFileSync(join(__dirname, 'useVocabulary.ts'), 'utf-8');

  it('rolls back from pre-change snapshots via rollbackWordRows', () => {
    expect(source).toContain('rollbackWordRows(');
    expect(source).toContain('changedSnapshots.push');
  });

  it('no longer uses the invalid id,user_id upsert constraint', () => {
    expect(source).not.toContain("onConflict: 'id,user_id'");
  });
});
