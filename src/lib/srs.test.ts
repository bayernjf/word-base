import assert from 'node:assert/strict';
import { calcNextReview, getDueWords, calcEncounterFamiliarity, mergeEncounterFamiliarity } from './srs';
import type { Word, WordContext } from '../types';

const now = Date.UTC(2026, 0, 1, 9, 0, 0);

function makeWord(overrides: Partial<Word> = {}): Word {
  return {
    id: 'word-1',
    word: 'leverage',
    translation: '利用',
    bookId: 'book-1',
    familiarity: 0,
    reviewCount: 0,
    easeFactor: 2.5,
    intervalDays: 0,
    nextReviewAt: now,
    ...overrides,
  };
}

function daysAfter(timestamp: number) {
  return Math.round((timestamp - now) / (24 * 60 * 60 * 1000));
}

{
  const result = calcNextReview(makeWord(), 5, now);

  assert.equal(result.reviewCount, 1);
  assert.equal(result.intervalDays, 1);
  assert.equal(result.easeFactor, 2.6);
  assert.equal(result.familiarity, 100);
  assert.equal(daysAfter(result.nextReviewAt), 1);
}

{
  const result = calcNextReview(
    makeWord({
      reviewCount: 2,
      intervalDays: 6,
      easeFactor: 2.5,
      familiarity: 80,
    }),
    4,
    now
  );

  assert.equal(result.reviewCount, 3);
  assert.equal(result.intervalDays, 15);
  assert.equal(result.easeFactor, 2.5);
  assert.equal(result.familiarity, 80);
  assert.equal(daysAfter(result.nextReviewAt), 15);
}

{
  const result = calcNextReview(
    makeWord({
      reviewCount: 4,
      intervalDays: 12,
      easeFactor: 1.4,
      familiarity: 90,
      nextReviewAt: now - 1000,
    }),
    2,
    now
  );

  assert.equal(result.reviewCount, 0);
  assert.equal(result.intervalDays, 0);
  assert.equal(result.easeFactor, 1.3);
  assert.equal(result.familiarity, 40);
  assert.equal(result.nextReviewAt, now);
}

{
  const due = getDueWords(
    [
      makeWord({ id: 'later', nextReviewAt: now + 1 }),
      makeWord({ id: 'missing-date', nextReviewAt: undefined, timeAdded: now - 10 }),
      makeWord({ id: 'due', nextReviewAt: now - 1 }),
    ],
    now
  );

  assert.deepEqual(
    due.map((word) => word.id),
    ['missing-date', 'due']
  );
}

const DAY = 24 * 60 * 60 * 1000;
function ctx(timeAdded: number): WordContext {
  return { context: 'c', translation: '', timeAdded };
}

{
  // 无语境 → 0 分
  assert.equal(calcEncounterFamiliarity([]), 0);
  assert.equal(calcEncounterFamiliarity(undefined), 0);
}

{
  // 遇见次数越多分越高，但封顶不超过 60
  const once = calcEncounterFamiliarity([ctx(now)]);
  const many = calcEncounterFamiliarity(Array.from({ length: 8 }, (_, i) => ctx(now + i)));
  assert.ok(once > 0);
  assert.ok(many > once);
  assert.ok(many <= 60);
}

{
  // 相同次数下，时间跨度更大（间隔效应）分更高
  const sameDay = calcEncounterFamiliarity([ctx(now), ctx(now + 1000), ctx(now + 2000)]);
  const spread = calcEncounterFamiliarity([ctx(now), ctx(now + 10 * DAY), ctx(now + 25 * DAY)]);
  assert.ok(spread > sameDay);
}

{
  // 主动复习的高分不被遇见基线拉低，取较大值
  assert.equal(mergeEncounterFamiliarity(90, [ctx(now), ctx(now + DAY)]), 90);
  // 已有为 0 时，用遇见基线抬升
  assert.ok(mergeEncounterFamiliarity(0, [ctx(now), ctx(now + DAY)]) > 0);
}
