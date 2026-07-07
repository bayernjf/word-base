import type { Word, WordContext } from '../types';

const DAY_MS = 24 * 60 * 60 * 1000;
const MIN_EASE_FACTOR = 1.3;
const DEFAULT_EASE_FACTOR = 2.5;

// 被动遇见熟悉度上限：在真实语境反复遇见只建立「地板分」，60~100 留给主动复习
const ENCOUNTER_FAMILIARITY_CAP = 60;

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

/**
 * 根据遇见历史计算「被动熟悉度」基线（0 ~ ENCOUNTER_FAMILIARITY_CAP）。
 * 两个信号：
 * - 遇见次数：边际递减（第 1 次贡献最大，后续越来越小）
 * - 时间跨度：分散遇见比集中遇见记忆更牢（间隔效应），跨度越大加成越高
 */
export function calcEncounterFamiliarity(contexts: WordContext[] | undefined): number {
  const list = contexts || [];
  if (list.length === 0) return 0;

  const times = list
    .map((ctx) => ctx.timeAdded || ctx.addedDate || 0)
    .filter((value) => value > 0)
    .sort((a, b) => a - b);

  // 遇见次数：优先用带时间戳的条数；若条目都缺时间戳，退化为用语境总条数（仍按次数计分）
  const count = times.length > 0 ? times.length : list.length;
  if (count === 0) return 0;

  // 次数分：对数递减，遇见越多越接近上限的 80%
  const countScore = (Math.log2(count + 1) / Math.log2(9)) * (ENCOUNTER_FAMILIARITY_CAP * 0.8);

  // 跨度分：遇见时间跨度越大，间隔效应越强，最多贡献上限的 20%（缺时间戳时为 0）
  const spanDays = times.length > 1 ? (times[times.length - 1] - times[0]) / DAY_MS : 0;
  const spanScore = (Math.min(spanDays, 30) / 30) * (ENCOUNTER_FAMILIARITY_CAP * 0.2);

  return Math.round(Math.min(ENCOUNTER_FAMILIARITY_CAP, countScore + spanScore));
}

/**
 * 融合被动遇见与已有（含主动复习）的熟悉度：取较大值，
 * 保证主动复习累积的高分永远不会被新的遇见拉低。
 */
export function mergeEncounterFamiliarity(currentFamiliarity: number | undefined, contexts: WordContext[] | undefined): number {
  const current = Math.max(0, Math.min(100, currentFamiliarity ?? 0));
  return Math.max(current, calcEncounterFamiliarity(contexts));
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
