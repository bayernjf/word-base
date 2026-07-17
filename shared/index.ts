export { default as AppSupabase } from './AppSupabase.tsx';
export { SupabaseProvider, useSupabase } from './context/SupabaseContext.tsx';
export { useVocabularyBooks, useWords } from './hooks/useVocabulary.ts';
export { useStories } from './hooks/useStories.ts';
export { profileApi, supabase } from './lib/supabase.ts';
export { createLogger } from './lib/logger.ts';
export { enqueueAutoAi } from './lib/batchAiStore.ts';
export type { BatchAiType } from './lib/batchAiStore.ts';
export { createTranslator } from './i18n/index.ts';
export { AVATARS } from './avatars.ts';
export { getThemeClasses } from './components/ThemeStyles.ts';
export { Navbar } from './components/Navbar.tsx';
export { Sidebar } from './components/Sidebar.tsx';
export { SettingsLayout } from './components/SettingsLayout.tsx';
export type { AppLanguage, ThemeType, Word, VocabularyBook, Story, PracticeQuiz, AIModel, WordContext } from './types.ts';
export type { LocaleDict } from './i18n/index.ts';
export { en } from './i18n/en.ts';
export { zh } from './i18n/zh.ts';
export { listeningQuizzes } from './mockData.ts';
export { setPlatform, getPlatform, hasPlatform } from './platform.ts';
export type { PlatformAPI, SpeakOptions } from './platform.ts';

// Primitive UI system
export {
  setPrimitives,
  usePrimitives,
  usePrimitiveTheme,
  PrimitiveThemeProvider,
} from './primitives/index';
export type {
  PrimitiveComponents,
  ViewProps,
  TextProps,
  ButtonProps,
  InputProps,
  TextAreaProps,
  BadgeProps,
  DividerProps,
  ScrollViewProps,
  ImageProps,
  LayoutStyle,
  TextStyle,
  ThemeContextValue,
  ThemeProviderProps,
} from './primitives/types';

// Design Tokens
export {
  getColorTokens,
  spacing,
  radius,
  fontSize,
  fontWeight,
  layoutTokens,
} from './tokens/index';
export type { ColorTokens } from './tokens/index';
