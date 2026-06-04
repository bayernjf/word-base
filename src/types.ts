export type ThemeType = 'original' | 'minimalist' | 'glass' | 'natural';

export interface Word {
  id: string;
  word: string;
  phonetic: string;
  partOfSpeech: string;
  definition: string;
  chineseTranslation: string;
  synonyms: string[];
  examples: Array<{
    en: string;
    zh: string;
  }>;
  usageHistory: Array<{
    context: string;
    translation: string;
    source: string;
  }>;
  level: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
  familiarity: number; // 0 to 100
  bookId: string;
}

export interface VocabularyBook {
  id: string;
  name: string;
  description: string;
  wordCount: number;
  icon: string;
  progress: number;
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
