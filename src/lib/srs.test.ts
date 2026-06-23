import assert from 'node:assert/strict';
import { calcNextReview, getDueWords } from './srs';
import type { Word } from '../types';

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
