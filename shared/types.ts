export type ThemeType = 'glass' | 'natural';
export type AppLanguage = 'zh' | 'en';

export interface WordContext {
  context: string;
  timeAdded: number;
  sourceLink?: string;
  sourceRange?: {
    startXPath: string;
    startOffset: number;
    endXPath: string;
    endOffset: number;
  };
  translation: string;
  addedDate?: number;
}

// AI 多语境义项分离：把同一个词在不同语境里的不同含义聚类成组
export interface SenseGroup {
  sense: string; // 简短英文义项标签
  translation: string; // 该义项的中文翻译
  definition: string; // 该义项的英文释义
  contexts: string[]; // 归属该义项的用户原句
}

export interface SenseGroups {
  groups: SenseGroup[];
  generatedAt?: number;
}

export interface Word {
  id: string;
  word: string;
  frequency?: number;
  translation?: string;
  timeAdded?: number;
  timeUpdated?: number;
  contexts?: WordContext[];
  dateAdded?: number;
  dateUpdated?: number;
  phonetic?: string;
  partOfSpeech?: string;
  definition?: string;
  chineseTranslation?: string;
  synonyms?: string[];
  examples?: Array<{
    en: string;
    zh: string;
  }>;
  usageHistory?: Array<{
    context: string;
    translation: string;
    source: string;
  }>;
  memoryTip?: string;
  deepExplanation?: {
    contextInsights: Array<{ context: string; insight: string }>;
    synonymComparison: string;
    memoryHook: string;
    generatedAt?: number;
  };
  senseGroups?: SenseGroups;
  level?: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
  familiarity?: number; // 0 to 100
  nextReviewAt?: number;
  reviewCount?: number;
  easeFactor?: number;
  intervalDays?: number;
  bookId: string;
  meta?: {
    sourceUrl?: string;
    sourceTitle?: string;
    createdAt?: number;
  };
}

export interface VocabularyBook {
  id: string;
  userId: string;
  name: string;
  description?: string;
  wordCount: number;
  icon?: string;
  createdAt: number;
  updatedAt: number;
  isSync: boolean;
}

export interface MoveWordsResult {
  success: boolean;
  movedCount: number;
  duplicateCount: number;
}

export interface ChatMessage {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  timestamp: string;
}

export interface Story {
  id: string;
  title: string;
  category: string;
  difficulty: string;
  contentEn: string;
  contentZh: string;
  sentences: Array<{
    en: string;
    zh: string;
    words: string[];
  }>;
  highlightedWords: string[];
  grammarInsight: string;
}

export interface PracticeQuiz {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface PracticeScenario {
  id: string;
  title: string;
  description: string;
  level: string;
  duration: string;
}

export interface AIModel {
  id: string;
  name: string;
  provider: string;
  apiKey: string;
  purpose: string;
  isActive: boolean;
  endpoint?: string;
}
