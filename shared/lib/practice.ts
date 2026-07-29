import type { PracticeQuiz } from '../types';
import { apiUrl } from './apiBase';

// =============================================
// 类型定义
// =============================================

export type PracticeType = 'reading' | 'listening' | 'writing' | 'speaking';
export type PracticeDifficulty = 'B1' | 'B2' | 'C1';

export interface PracticeGenerateRequest {
  type: PracticeType;
  words: string[];
  difficulty?: PracticeDifficulty;
  providerId?: string;
}

export interface PracticeEvaluateRequest {
  type: PracticeType;
  prompt?: string;
  userText?: string;
  transcription?: string;
  originalPrompt?: string;
  providerId?: string;
}

/** 阅读理解练习内容 */
export interface ReadingContent {
  article: {
    title: string;
    content: string;
    category: string;
    difficulty: string;
  };
  highlighted: Record<string, { translation: string; definition: string }>;
  quizzes: PracticeQuiz[];
}

/** 听力练习内容 */
export interface ListeningContent {
  passage: string;
  transcript: Array<{ time: string; text: string }>;
  quizzes: PracticeQuiz[];
  duration: string;
}

/** 写作提示 */
export interface WritingPrompt {
  prompt: string;
  minWords: number;
  suggestedWords: string[];
}

/** 写作评估反馈 */
export interface WritingFeedback {
  score: number;
  level: string;
  feedback: Array<{
    type: 'grammar' | 'vocabulary' | 'style';
    issue: string;
    suggestion: string;
    explanation: string;
  }>;
}

/** 口语场景 */
export interface SpeakingScenario {
  title: string;
  prompt: string;
  tip: string;
}

/** 口语评估结果 */
export interface SpeakingEvaluation {
  score: number;
  fluency: string;
  accuracy: string;
  issues: Array<{
    word: string;
    expected: string;
    actual: string;
    suggestion: string;
  }>;
}

export interface PracticeGenerateResponse {
  reading?: ReadingContent;
  listening?: ListeningContent;
  writing?: WritingPrompt;
  speaking?: SpeakingScenario;
  remaining?: number;
}

export interface PracticeEvaluateResponse {
  writing?: WritingFeedback;
  speaking?: SpeakingEvaluation;
}

// =============================================
// API 客户端
// =============================================

/**
 * 生成练习内容（阅读/听力/写作提示/口语场景）
 * 复用用户已配置的 AI Provider，内容基于用户生词本中的词汇。
 */
export async function requestPracticeGenerate(
  input: PracticeGenerateRequest,
  accessToken: string
): Promise<PracticeGenerateResponse> {
  console.debug('[practice] requestPracticeGenerate', { type: input.type, wordCount: input.words.length });
  const response = await fetch(apiUrl('/api/v1/ai/practice/generate'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(input),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(String(data?.error || 'practice_generate_failed'));
  }
  return data as PracticeGenerateResponse;
}

/**
 * 评估练习提交（写作批改/口语评分）
 */
export async function requestPracticeEvaluate(
  input: PracticeEvaluateRequest,
  accessToken: string
): Promise<PracticeEvaluateResponse> {
  console.debug('[practice] requestPracticeEvaluate', { type: input.type });
  const response = await fetch(apiUrl('/api/v1/ai/practice/evaluate'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(input),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(String(data?.error || 'practice_evaluate_failed'));
  }
  return data as PracticeEvaluateResponse;
}

// =============================================
// 内容缓存（5 分钟 TTL，与 aiEnrich 一致）
// =============================================

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

const CACHE_TTL = 5 * 60 * 1000; // 5 分钟
const generateCache = new Map<string, CacheEntry<PracticeGenerateResponse>>();

function buildCacheKey(input: PracticeGenerateRequest): string {
  return `${input.type}:${input.difficulty || 'B2'}:${[...input.words].sort().join(',')}`;
}

/**
 * 带缓存的练习内容生成。
 * 如果相同参数的内容在 5 分钟内已生成过，直接返回缓存。
 */
export async function fetchPracticeContent(
  input: PracticeGenerateRequest,
  accessToken: string
): Promise<PracticeGenerateResponse> {
  const key = buildCacheKey(input);
  const cached = generateCache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    console.debug('[practice] cache hit', { type: input.type });
    return cached.value;
  }

  const result = await requestPracticeGenerate(input, accessToken);
  generateCache.set(key, { value: result, expiresAt: Date.now() + CACHE_TTL });
  return result;
}

/** 清除练习内容缓存 */
export function clearPracticeCache(): void {
  generateCache.clear();
}
