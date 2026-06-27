import type { Word } from '../types';
import {
  requestAiEnrichment,
  requestDeepExplanation,
  enrichmentToWordUpdates,
} from './aiEnrich';
import { createLogger } from './logger';

const logger = createLogger('batchAiStore');

export const BATCH_AI_LIMIT = 10;

export type BatchAiType = 'enrich' | 'explain';

export interface BatchAiNotification {
  message: string;
  highlight?: string;
}

export interface BatchAiState {
  // 当前正在运行的批量任务类型；null 表示空闲
  runningType: BatchAiType | null;
  // 自动分析队列是否正在运行
  autoRunning: boolean;
  // 进度
  current: number;
  total: number;
  // 当前正在处理的单词 id（供详情页显示进行中）
  processingWordId: string | null;
  // 正在被本次批量任务处理的全部单词 id 及其类型
  processingMap: Record<string, BatchAiType>;
  // 顶部通知
  notification: BatchAiNotification | null;
}

type Listener = () => void;

interface RunDeps {
  words: Word[];
  accessToken: string;
  onUpdateWord: (wordId: string, updates: Partial<Word>) => Promise<Word | null> | void;
  // 翻译函数：由组件注入，保证文案与 i18n 一致
  messages: {
    limitHit: string;
    selectedFirstN: string;
    progress: (current: number, total: number) => string;
    complete: (success: number, fail: number) => string;
    allFailed: string;
  };
  // 截断到前 N 个时回调，让组件同步勾选状态
  onTruncate?: (keptWordIds: string[]) => void;
}

const initialState: BatchAiState = {
  runningType: null,
  autoRunning: false,
  current: 0,
  total: 0,
  processingWordId: null,
  processingMap: {},
  notification: null,
};

let state: BatchAiState = initialState;
const listeners = new Set<Listener>();
let notificationTimer: ReturnType<typeof setTimeout> | null = null;

function emit() {
  for (const listener of listeners) listener();
}

function setState(patch: Partial<BatchAiState>) {
  state = { ...state, ...patch };
  emit();
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getSnapshot(): BatchAiState {
  return state;
}

export function isBatchRunning(): boolean {
  return state.runningType !== null;
}

// 某个单词此刻是否正在被批量任务处理（详情页用）
export function getWordBatchProcessing(
  wordId: string | undefined,
  type: BatchAiType
): boolean {
  if (!wordId) return false;
  return state.processingMap[wordId] === type;
}

function clearNotificationLater(duration: number) {
  if (notificationTimer) clearTimeout(notificationTimer);
  notificationTimer = setTimeout(() => {
    setState({ notification: null });
    notificationTimer = null;
  }, duration);
}

/**
 * 启动批量 AI 任务。执行循环脱离 React 组件生命周期，
 * 即使触发组件卸载（切换路由），任务仍继续，状态保存在本 store。
 */
export async function startBatchAi(type: BatchAiType, deps: RunDeps): Promise<void> {
  if (state.runningType) {
    logger.warn('startBatchAi ignored: already running', { runningType: state.runningType });
    return;
  }

  const { words, accessToken, onUpdateWord, messages, onTruncate } = deps;

  // 收集待处理单词（已由调用方过滤为选中项）
  let targetWords = words;
  if (targetWords.length > BATCH_AI_LIMIT) {
    targetWords = targetWords.slice(0, BATCH_AI_LIMIT);
    onTruncate?.(targetWords.map((w) => w.id));
    if (notificationTimer) {
      clearTimeout(notificationTimer);
      notificationTimer = null;
    }
    setState({
      notification: { message: messages.limitHit, highlight: messages.selectedFirstN },
    });
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }

  if (targetWords.length === 0) return;

  const processingMap: Record<string, BatchAiType> = {};
  for (const w of targetWords) processingMap[w.id] = type;

  if (notificationTimer) {
    clearTimeout(notificationTimer);
    notificationTimer = null;
  }

  setState({
    runningType: type,
    current: 1,
    total: targetWords.length,
    processingWordId: targetWords[0]?.id ?? null,
    processingMap,
    notification: { message: messages.progress(1, targetWords.length) },
  });

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < targetWords.length; i++) {
    const word = targetWords[i];
    setState({
      current: i + 1,
      processingWordId: word.id,
      notification: { message: messages.progress(i + 1, targetWords.length) },
    });

    try {
      if (type === 'enrich') {
        const enrichment = await requestAiEnrichment(
          {
            wordId: word.id,
            word: word.word,
            translation: word.translation || word.chineseTranslation || word.definition || '',
            contexts: word.contexts || [],
          },
          accessToken
        );
        await onUpdateWord(word.id, enrichmentToWordUpdates(enrichment));
      } else {
        const deepExplanation = await requestDeepExplanation(
          {
            wordId: word.id,
            word: word.word,
            translation: word.translation || word.chineseTranslation || word.definition || '',
            contexts: word.contexts || [],
          },
          accessToken
        );
        await onUpdateWord(word.id, { deepExplanation });
      }
      successCount++;
    } catch (err) {
      logger.error(`Batch ${type} failed for word:`, word.word, err);
      failCount++;
    } finally {
      // 处理完一个就从 processingMap 移除该词
      const nextMap = { ...state.processingMap };
      delete nextMap[word.id];
      setState({ processingMap: nextMap });
    }
  }

  setState({
    runningType: null,
    processingWordId: null,
    notification: { message: successCount === 0 && failCount > 0 ? messages.allFailed : messages.complete(successCount, failCount) },
  });
  clearNotificationLater(5000);
}

// ============ 自动 AI 分析队列 ============
// 新词加入单词本时按开关自动生成释义 / 深入理解。
// 与批量任务共用 processingMap（详情页按钮据此显示进行中）；
// 串行执行，避免连续加词打爆 API。任务脱离组件生命周期。

interface AutoAiTask {
  word: Word;
  type: BatchAiType;
}

interface AutoRunDeps {
  accessToken: string;
  onUpdateWord: (wordId: string, updates: Partial<Word>) => Promise<Word | null> | void;
  messages: {
    progress: (current: number, total: number, type: BatchAiType) => string;
    complete: (success: number, fail: number) => string;
    allFailed: string;
  };
}

const autoQueue: AutoAiTask[] = [];
let autoRunning = false;
let autoDeps: AutoRunDeps | null = null;
let autoTotal = 0;
let autoDone = 0;
let autoSuccess = 0;
let autoFail = 0;

// 已入队/已处理过的 "wordId:type"，避免同一词同一类型重复入队
const autoSeen = new Set<string>();

function autoKey(wordId: string, type: BatchAiType): string {
  return `${wordId}:${type}`;
}

/**
 * 把一个自动分析任务加入队列。deps 每次刷新（accessToken 可能变化）。
 * 返回 false 表示被去重忽略。
 */
export function enqueueAutoAi(word: Word, type: BatchAiType, deps: AutoRunDeps): boolean {
  const key = autoKey(word.id, type);
  if (autoSeen.has(key)) return false;
  autoSeen.add(key);
  autoQueue.push({ word, type });
  autoDeps = deps;
  autoTotal += 1;
  void runAutoQueue();
  return true;
}

async function runAutoQueue(): Promise<void> {
  if (autoRunning) return;
  autoRunning = true;
  setState({ autoRunning: true });

  while (autoQueue.length > 0) {
    const task = autoQueue.shift()!;
    const deps = autoDeps!;
    autoDone += 1;

    // 登记到 processingMap，供详情页按钮显示进行中
    setState({
      processingWordId: task.word.id,
      processingMap: { ...state.processingMap, [task.word.id]: task.type },
      notification: { message: deps.messages.progress(autoDone, autoTotal, task.type) },
    });

    try {
      if (task.type === 'enrich') {
        const enrichment = await requestAiEnrichment(
          {
            wordId: task.word.id,
            word: task.word.word,
            translation: task.word.translation || task.word.chineseTranslation || task.word.definition || '',
            contexts: task.word.contexts || [],
          },
          deps.accessToken
        );
        await deps.onUpdateWord(task.word.id, enrichmentToWordUpdates(enrichment));
      } else {
        const deepExplanation = await requestDeepExplanation(
          {
            wordId: task.word.id,
            word: task.word.word,
            translation: task.word.translation || task.word.chineseTranslation || task.word.definition || '',
            contexts: task.word.contexts || [],
          },
          deps.accessToken
        );
        await deps.onUpdateWord(task.word.id, { deepExplanation });
      }
      autoSuccess += 1;
    } catch (err) {
      logger.error(`Auto ${task.type} failed for word:`, task.word.word, err);
      autoFail += 1;
    } finally {
      const nextMap = { ...state.processingMap };
      delete nextMap[task.word.id];
      setState({ processingMap: nextMap });
    }
  }

  // 队列清空：显示完成统计并重置计数
  const deps = autoDeps;
  const success = autoSuccess;
  const fail = autoFail;
  autoRunning = false;
  autoTotal = 0;
  autoDone = 0;
  autoSuccess = 0;
  autoFail = 0;
  setState({ processingWordId: null, autoRunning: false });
  if (deps && (success > 0 || fail > 0)) {
    setState({ notification: { message: success === 0 && fail > 0 ? deps.messages.allFailed : deps.messages.complete(success, fail) } });
    clearNotificationLater(5000);
  }
}
