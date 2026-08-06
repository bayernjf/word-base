import { describe, it, expect } from 'vitest';
import { calcNextReview, getDueWords, calcEncounterFamiliarity, mergeEncounterFamiliarity } from './srs';
import type { ReviewQuality } from './srs';
import type { Word, WordContext } from '../types';

const now = Date.UTC(2026, 0, 1, 9, 0, 0);
const DAY = 24 * 60 * 60 * 1000;

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
  return Math.round((timestamp - now) / DAY);
}

function ctx(timeAdded: number): WordContext {
  return { context: 'c', translation: '', timeAdded };
}

describe('calcNextReview', () => {
  it('first successful review schedules 1 day later and bumps ease', () => {
    const result = calcNextReview(makeWord(), 5, now);

    expect(result.reviewCount).toBe(1);
    expect(result.intervalDays).toBe(1);
    expect(result.easeFactor).toBe(2.6);
    expect(result.familiarity).toBe(100);
    expect(daysAfter(result.nextReviewAt)).toBe(1);
  });

  it('second successful review uses fixed 6-day interval', () => {
    const result = calcNextReview(makeWord({ reviewCount: 1, intervalDays: 1 }), 4, now);

    expect(result.reviewCount).toBe(2);
    expect(result.intervalDays).toBe(6);
    expect(daysAfter(result.nextReviewAt)).toBe(6);
  });

  it('later reviews multiply interval by ease factor', () => {
    const result = calcNextReview(
      makeWord({ reviewCount: 2, intervalDays: 6, easeFactor: 2.5, familiarity: 80 }),
      4,
      now
    );

    expect(result.reviewCount).toBe(3);
    expect(result.intervalDays).toBe(15);
    expect(result.easeFactor).toBe(2.5);
    expect(result.familiarity).toBe(80);
    expect(daysAfter(result.nextReviewAt)).toBe(15);
  });

  it('failed review (quality < 3) resets progress and keeps word due now', () => {
    const result = calcNextReview(
      makeWord({ reviewCount: 4, intervalDays: 12, easeFactor: 1.4, familiarity: 90, nextReviewAt: now - 1000 }),
      2,
      now
    );

    expect(result.reviewCount).toBe(0);
    expect(result.intervalDays).toBe(0);
    expect(result.easeFactor).toBe(1.3);
    expect(result.familiarity).toBe(40);
    expect(result.nextReviewAt).toBe(now);
  });

  it('ease factor never drops below the 1.3 floor even after repeated failures', () => {
    let word = makeWord({ easeFactor: 1.3 });
    for (let i = 0; i < 5; i += 1) {
      const result = calcNextReview(word, 0, now);
      expect(result.easeFactor).toBeGreaterThanOrEqual(1.3);
      word = makeWord({ easeFactor: result.easeFactor });
    }
  });

  it('normalizes missing or invalid ease factor to the 2.5 default', () => {
    const fromUndefined = calcNextReview(makeWord({ easeFactor: undefined }), 4, now);
    const fromNaN = calcNextReview(makeWord({ easeFactor: Number.NaN }), 4, now);

    // quality 4 keeps ease unchanged: 2.5 + (0.1 - 1 * (0.08 + 0.02)) = 2.5
    expect(fromUndefined.easeFactor).toBe(2.5);
    expect(fromNaN.easeFactor).toBe(2.5);
  });

  it('maps every quality grade to familiarity = quality * 20', () => {
    for (let quality = 0; quality <= 5; quality += 1) {
      const result = calcNextReview(makeWord(), quality as ReviewQuality, now);
      expect(result.familiarity).toBe(quality * 20);
    }
  });

  it('treats negative reviewCount as zero and keeps interval at least 1 day', () => {
    const result = calcNextReview(makeWord({ reviewCount: -3, intervalDays: 0 }), 3, now);

    expect(result.reviewCount).toBe(1);
    expect(result.intervalDays).toBe(1);
  });

  it('stamps timeUpdated and dateUpdated with the review time', () => {
    const result = calcNextReview(makeWord(), 5, now);

    expect(result.timeUpdated).toBe(now);
    expect(result.dateUpdated).toBe(now);
  });
});

describe('getDueWords', () => {
  it('returns words due now or earlier, falling back to timeAdded when nextReviewAt missing', () => {
    const due = getDueWords(
      [
        makeWord({ id: 'later', nextReviewAt: now + 1 }),
        makeWord({ id: 'missing-date', nextReviewAt: undefined, timeAdded: now - 10 }),
        makeWord({ id: 'due', nextReviewAt: now - 1 }),
      ],
      now
    );

    expect(due.map((word) => word.id)).toEqual(['missing-date', 'due']);
  });

  it('treats words with no dates at all as due immediately', () => {
    const due = getDueWords(
      [makeWord({ id: 'no-dates', nextReviewAt: undefined, timeAdded: undefined, dateAdded: undefined })],
      now
    );

    expect(due.map((word) => word.id)).toEqual(['no-dates']);
  });

  it('returns empty list when nothing is due', () => {
    expect(getDueWords([makeWord({ nextReviewAt: now + DAY })], now)).toEqual([]);
  });
});

describe('calcEncounterFamiliarity', () => {
  it('returns 0 for missing or empty contexts', () => {
    expect(calcEncounterFamiliarity([])).toBe(0);
    expect(calcEncounterFamiliarity(undefined)).toBe(0);
  });

  it('grows with encounter count but never exceeds the 60 cap', () => {
    const once = calcEncounterFamiliarity([ctx(now)]);
    const many = calcEncounterFamiliarity(Array.from({ length: 8 }, (_, i) => ctx(now + i)));
    const extreme = calcEncounterFamiliarity(Array.from({ length: 100 }, (_, i) => ctx(now + i * DAY)));

    expect(once).toBeGreaterThan(0);
    expect(many).toBeGreaterThan(once);
    expect(many).toBeLessThanOrEqual(60);
    expect(extreme).toBeLessThanOrEqual(60);
  });

  it('rewards spaced encounters over same-day encounters (spacing effect)', () => {
    const sameDay = calcEncounterFamiliarity([ctx(now), ctx(now + 1000), ctx(now + 2000)]);
    const spread = calcEncounterFamiliarity([ctx(now), ctx(now + 10 * DAY), ctx(now + 25 * DAY)]);

    expect(spread).toBeGreaterThan(sameDay);
  });

  it('caps the span bonus at 30 days', () => {
    const spread30 = calcEncounterFamiliarity([ctx(now), ctx(now + 30 * DAY)]);
    const spread300 = calcEncounterFamiliarity([ctx(now), ctx(now + 300 * DAY)]);

    expect(spread300).toBe(spread30);
  });

  it('falls back to context count when timestamps are missing', () => {
    const noTimestamps = calcEncounterFamiliarity([
      { context: 'a', translation: '' } as WordContext,
      { context: 'b', translation: '' } as WordContext,
    ]);

    expect(noTimestamps).toBeGreaterThan(0);
    expect(noTimestamps).toBeLessThanOrEqual(60);
  });
});

describe('mergeEncounterFamiliarity', () => {
  it('never lowers an existing higher familiarity', () => {
    expect(mergeEncounterFamiliarity(90, [ctx(now), ctx(now + DAY)])).toBe(90);
  });

  it('lifts zero familiarity to the encounter baseline', () => {
    expect(mergeEncounterFamiliarity(0, [ctx(now), ctx(now + DAY)])).toBeGreaterThan(0);
  });

  it('clamps out-of-range current familiarity into [0, 100]', () => {
    expect(mergeEncounterFamiliarity(150, [])).toBe(100);
    expect(mergeEncounterFamiliarity(-20, [])).toBe(0);
    expect(mergeEncounterFamiliarity(undefined, [])).toBe(0);
  });
});
