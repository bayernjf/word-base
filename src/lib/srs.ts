import type { Word } from '../types';

const DAY_MS = 24 * 60 * 60 * 1000;
const MIN_EASE_FACTOR = 1.3;
const DEFAULT_EASE_FACTOR = 2.5;

export type ReviewQuality = 0 | 1 | 2 | 3 | 4 | 5;

export interface SrsReviewUpdate {
  familiarity: number;
  nextReviewAt: number;
  reviewCount: number;
  easeFactor: number;
  intervalDays: number;
  timeUpdated: number;
  dateUpdated: number;
}

export function calcNextReview(word: Word, quality: ReviewQuality, reviewedAt = Date.now()): SrsReviewUpdate {
  const currentEase = normalizeEaseFactor(word.easeFactor);
  const nextEase = Math.max(MIN_EASE_FACTOR, roundToTwo(currentEase + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))));
  const familiarity = qualityToFamiliarity(quality);

  if (quality < 3) {
    return {
      familiarity,
      nextReviewAt: reviewedAt,
      reviewCount: 0,
      easeFactor: nextEase,
      intervalDays: 0,
      timeUpdated: reviewedAt,
      dateUpdated: reviewedAt,
    };
  }

  const reviewCount = Math.max(0, word.reviewCount ?? 0) + 1;
  const intervalDays = calcIntervalDays(reviewCount, word.intervalDays ?? 0, nextEase);

  return {
    familiarity,
    nextReviewAt: reviewedAt + intervalDays * DAY_MS,
    reviewCount,
    easeFactor: nextEase,
    intervalDays,
    timeUpdated: reviewedAt,
    dateUpdated: reviewedAt,
  };
}

export function getDueWords(words: Word[], now = Date.now()): Word[] {
  return words.filter((word) => {
    const nextReviewAt = word.nextReviewAt ?? word.timeAdded ?? word.dateAdded ?? 0;
    return nextReviewAt <= now;
  });
}

function calcIntervalDays(reviewCount: number, currentIntervalDays: number, easeFactor: number): number {
  if (reviewCount <= 1) return 1;
  if (reviewCount === 2) return 6;

  const baseInterval = Math.max(1, currentIntervalDays);
  return Math.max(1, Math.round(baseInterval * easeFactor));
}

function normalizeEaseFactor(value: number | undefined): number {
  if (!Number.isFinite(value)) {
    return DEFAULT_EASE_FACTOR;
  }
  return Math.max(MIN_EASE_FACTOR, value as number);
}

function qualityToFamiliarity(quality: ReviewQuality): number {
  return Math.max(0, Math.min(100, quality * 20));
}

function roundToTwo(value: number): number {
  return Math.round(value * 100) / 100;
}
