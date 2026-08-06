import { describe, it, expect, beforeEach } from 'vitest';
import {
  requestCancelBatch,
  getTaskResults,
  getFailedTaskWordIds,
  clearTaskResults,
  getSnapshot,
  isBatchRunning,
  BATCH_AI_LIMIT,
} from './batchAiStore';
import type { TaskResult } from './batchAiStore';

describe('batchAiStore — cancel & task tracking', () => {
  beforeEach(() => {
    clearTaskResults();
  });

  describe('getSnapshot & isBatchRunning', () => {
    it('has all state fields defined', () => {
      const snapshot = getSnapshot();
      expect(snapshot.runningType).toBeNull();
      expect(snapshot.autoRunning).toBe(false);
      expect(snapshot.current).toBe(0);
      expect(snapshot.total).toBe(0);
      expect(snapshot.processingWordId).toBeNull();
      expect(snapshot.processingMap).toEqual({});
      expect(snapshot.notification).toBeNull();
      // cancelRequested may be true if a previous test called requestCancelBatch
      expect(typeof snapshot.cancelRequested).toBe('boolean');
      expect(snapshot.taskResults).toEqual({});
    });

    it('isBatchRunning returns false initially', () => {
      expect(isBatchRunning()).toBe(false);
    });
  });

  describe('requestCancelBatch', () => {
    it('sets cancelRequested to true', () => {
      requestCancelBatch();
      expect(getSnapshot().cancelRequested).toBe(true);
    });
  });

  describe('getTaskResults', () => {
    it('returns empty array when no results', () => {
      expect(getTaskResults()).toEqual([]);
    });

    it('returns array type', () => {
      const results = getTaskResults();
      expect(Array.isArray(results)).toBe(true);
    });
  });

  describe('getFailedTaskWordIds', () => {
    it('returns empty array initially', () => {
      expect(getFailedTaskWordIds()).toEqual([]);
    });
  });

  describe('clearTaskResults', () => {
    it('clears the task results map', () => {
      clearTaskResults();
      expect(getTaskResults()).toEqual([]);
    });
  });

  describe('BATCH_AI_LIMIT', () => {
    it('is 10', () => {
      expect(BATCH_AI_LIMIT).toBe(10);
    });
  });
});
