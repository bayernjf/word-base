import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { createLogger } from './lib/logger';
import { AppLanguage, ThemeType, Word } from './types';
import { getPlatform } from './platform';

const logger = createLogger('AppSupabase');
import { listeningQuizzes } from './mockData';
import { getThemeClasses } from './components/ThemeStyles';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { MobileTabBar } from './components/MobileTabBar';
import { SettingsLayout } from './components/SettingsLayout';
import {
  WelcomeLoginView,
  DashboardView,
  VocabularyListView,
  WordDetailView,
  MyListsView,
  StudyScenarioView,
  PracticeMainView,
  ReviewView,
  ListeningPracticeView,
  SpeakingPracticeView,
  ReadingPracticeView,
  WritingPracticeView,
  AccountSettingsView,
  AppearanceSettingsView,
  AutoAiSettingsView,
  AIModelsView,
  AddNewModelView,
  SyncStorageView,
} from './components/views';
import { useSupabase } from './context/SupabaseContext';
import { useVocabularyBooks, useWords } from './hooks/useVocabulary';
import { useStories } from './hooks/useStories';
import { useIsMobile } from './hooks/useIsMobile';
import { profileApi, supabase } from './lib/supabase';
import { createTranslator } from './i18n';
import { enqueueAutoAi, type BatchAiType } from './lib/batchAiStore';
import {
  AiProviderConfig,
  AiProviderInput,
  createAiProviderConfig,
  deleteAiProviderConfig,
  listAiProviderConfigs,
  updateAiProviderConfig,
  testAiProviderConfig,
  type AiProviderTestInput,
} from './lib/aiProviderConfigs';

interface ProfileRow {
  id: string;
  display_name?: string | null;
  avatar_url?: string | null;
  created_at?: string | null;
  theme_preference?: string | null;
  auto_enrich?: boolean | null;
  auto_explain?: boolean | null;
}

function toTimestamp(value?: string | null): number {
  if (!value) return Date.now();
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? Date.now() : parsed;
}

function parseAvatarIndex(avatarValue?: string | null): number {
  if (!avatarValue) return 0;
  const matched = String(avatarValue).match(/\d+/);
  const parsed = matched ? Number(matched[0]) : 0;
  return Number.isFinite(parsed) ? parsed : 0;
}

function selectPreferredSyncBook(books: Array<{ id: string; name: string; isSync: boolean; updatedAt: number; createdAt: number }>) {
  return [...books]
    .filter((book) => book.isSync)
    .sort((left, right) => {
      const leftIsDefault = left.name === '默认';
      const rightIsDefault = right.name === '默认';
      if (leftIsDefault !== rightIsDefault) {
        return leftIsDefault ? 1 : -1;
      }

      return (right.updatedAt || right.createdAt || 0) - (left.updatedAt || left.createdAt || 0);
    })[0] || null;
}

function persistSelectedBookId(bookId: string) {
  void getPlatform().kv.set('wordbase-selected-book', bookId);
}

function clearPersistedSelectedBookId() {
  void getPlatform().kv.remove('wordbase-selected-book');
}

export default function AppSupabase() {
  const { user, session, isLoading: authLoading, signIn, signOut, resetPassword } = useSupabase();
  const { books, isLoading: booksLoading, loadBooks, createBook, updateBook, deleteBook, setSyncBook } =
    useVocabularyBooks();
  const [selectedBookId, setSelectedBookId] = useState<string>('');
  const { words, addWord, deleteWords, moveWords, updateWord } = useWords(selectedBookId);
  const { stories, isGenerating: isGeneratingStory, generateStory, deleteStory } = useStories();

  const [theme, setTheme] = useState<ThemeType>(() => {
    try {
      const savedTheme = getPlatform().kv.getSync('wordbase_theme');
      return savedTheme === 'natural' ? 'natural' : 'glass';
    } catch {
      return 'glass';
    }
  });
  const [language, setLanguage] = useState<AppLanguage>(() => {
    try {
      const savedLanguage = getPlatform().kv.getSync('wordbase_language');
      return savedLanguage === 'en' ? 'en' : 'zh';
    } catch {
      return 'zh';
    }
  });
  const [activeView, setActiveView] = useState<string>(() => {
    try {
      const saved = getPlatform().kv.getSync('wordbase_activeView');
      return saved || 'welcome';
    } catch {
      return 'welcome';
    }
  });
  const [isCompactMode, setIsCompactMode] = useState<boolean>(false);
  const [isSmallTypography, setIsSmallTypography] = useState<boolean>(false);
  const [selectedWordId, setSelectedWordId] = useState<string>('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [models, setModels] = useState<AiProviderConfig[]>([]);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [autoEnrich, setAutoEnrich] = useState<boolean>(false);
  const [autoExplain, setAutoExplain] = useState<boolean>(false);
  const syncServerBaseUrl = (() => {
    if (import.meta.env.NEXT_PUBLIC_SYNC_SERVER_URL || import.meta.env.VITE_SYNC_SERVER_URL) {
      return (import.meta.env.NEXT_PUBLIC_SYNC_SERVER_URL || import.meta.env.VITE_SYNC_SERVER_URL) as string;
    }
    if (typeof window === 'undefined') {
      // SSR 时返回空字符串，由上层处理
      return '';
    }
    // 非标准 web 协议（tauri: / capacitor: / file:）时 window.location 不能直接用，
    // 回退到 localhost；生产环境应通过 VITE_SYNC_SERVER_URL 显式注入。
    const { protocol, hostname } = window.location;
    if (protocol !== 'http:' && protocol !== 'https:') {
      return 'http://localhost:3001';
    }
    return `${protocol}//${hostname}:3001`;
  })();

  const themeStyles = getThemeClasses(theme, isSmallTypography);
  const isMobile = useIsMobile();

  useEffect(() => {
    void getPlatform().kv.set('wordbase_language', language);
  }, [language]);

  useEffect(() => {
    void getPlatform().kv.set('wordbase_activeView', activeView);
  }, [activeView]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.body.classList.remove('theme-glass', 'theme-natural');
    document.body.classList.add(`theme-${theme}`);
  }, [theme]);

  useEffect(() => {
    void getPlatform().kv.set('wordbase_theme', theme);
  }, [theme]);

  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      if (!user) {
        setProfile(null);
        return;
      }

      try {
        const data = (await profileApi.getProfile(user.id)) as ProfileRow;
        if (!cancelled) {
          setProfile(data);
          if (data?.theme_preference === 'natural' || data?.theme_preference === 'glass') {
            setTheme(data.theme_preference);
          }
          setAutoEnrich(!!data?.auto_enrich);
          setAutoExplain(!!data?.auto_explain);
        }
      } catch {
        if (!cancelled) {
          setProfile(null);
        }
      }
    }

    void loadProfile();

    return () => {
      cancelled = true;
    };
  }, [user]);

  // 扩展跳转注册：URL 带 ?auth=register 且当前已登录时，自动登出以显示注册页（仅执行一次）
  const forcedRegisterLogoutRef = useRef(false);
  useEffect(() => {
    if (forcedRegisterLogoutRef.current) return;
    if (typeof window === 'undefined') return;
    let isRegisterIntent = false;
    try {
      isRegisterIntent = new URLSearchParams(window.location.search).get('auth') === 'register';
    } catch {
      isRegisterIntent = false;
    }
    if (isRegisterIntent && user) {
      forcedRegisterLogoutRef.current = true;
      void signOut();
    }
  }, [user, signOut]);

  // 仅在真正的登录/登出状态转换时切换视图，token 刷新不触发
  const prevUserIdRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    const prevId = prevUserIdRef.current;
    const currId = user?.id;
    prevUserIdRef.current = currId;

    // 真正登录：之前没有 user，现在有了
    if (!prevId && currId) {
      logger.info('user signed in', { userId: currId });
      const saved = (() => {
        try { return getPlatform().kv.getSync('wordbase_activeView'); } catch { return null; }
      })();
      if (saved && saved !== 'welcome') {
        setActiveView(saved);
      } else {
        setActiveView('dashboard');
      }
      return;
    }
    // 真正登出：之前有 user，现在没了
    if (prevId && !currId) {
      logger.info('user signed out');
      setSelectedBookId('');
      setSelectedWordId('');
      setActiveView('welcome');
    }
  }, [user]);

  // 首次登录时自动创建默认单词本
  useEffect(() => {
    if (user && !booksLoading && books.length === 0) {
      void createBook({
        name: '默认',
        description: '默认单词本',
        icon: 'BookOpen',
        isSync: true,
      });
    }
  }, [user, books, booksLoading, createBook]);

  useEffect(() => {
    if (books.length === 0) {
      setSelectedBookId('');
      clearPersistedSelectedBookId();
      return;
    }

    if (selectedBookId && books.some((book) => book.id === selectedBookId)) {
      return;
    }

    const savedBookId = getPlatform().kv.getSync('wordbase-selected-book');
    const rememberedBook = savedBookId ? books.find((book) => book.id === savedBookId) : null;
    const syncBook = selectPreferredSyncBook(books);
    const nextBookId = rememberedBook?.id || syncBook?.id || books[0].id;

    if (nextBookId && nextBookId !== selectedBookId) {
      setSelectedBookId(nextBookId);
    }
  }, [books, selectedBookId]);

  useEffect(() => {
    if (words.length > 0 && !selectedWordId) {
      setSelectedWordId(words[0].id);
    } else if (words.length > 0 && !words.some((word) => word.id === selectedWordId)) {
      setSelectedWordId(words[0].id);
    } else if (words.length === 0) {
      setSelectedWordId('');
    }
  }, [words, selectedWordId]);

  const currentUser = useMemo(() => {
    if (!user) return null;
    return {
      id: user.id,
      email: user.email || '',
      nickname: profile?.display_name || user.user_metadata?.display_name || user.email?.split('@')[0] || 'User',
      avatar: parseAvatarIndex(profile?.avatar_url),
      createdAt: toTimestamp(profile?.created_at || user.created_at),
    };
  }, [user, profile]);

  const loadAiProviders = useCallback(async () => {
    const accessToken = session?.access_token;
    if (!accessToken) {
      setModels([]);
      return;
    }

    try {
      logger.debug('loadAiProviders started');
      const providers = await listAiProviderConfigs(accessToken);
      setModels(providers);
      logger.info(`loadAiProviders success, count=${providers.length}`);
    } catch (error) {
      logger.error('Error loading AI providers:', error);
      setModels([]);
    }
  }, [session?.access_token]);

  useEffect(() => {
    void loadAiProviders();
  }, [loadAiProviders]);

  const handleSignIn = async (email: string, password: string, remember: boolean) => {
    setAuthError(null);
    const { error } = await signIn(email, password, remember);
    if (error) {
      setAuthError(error.message);
      return false;
    }
    if (remember) {
      await getPlatform().kv.set('wordbase_remember_email', email);
    } else {
      await getPlatform().kv.remove('wordbase_remember_email');
    }
    return true;
  };

  const handleRequestPasswordReset = async (email: string) => {
    setAuthError(null);
    const { error } = await resetPassword(email);
    if (error) {
      return { ok: false, error: error.message };
    }
    return { ok: true };
  };

  const handleSignUp = async (email: string, password: string, nickname?: string) => {
    setAuthError(null);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: nickname?.trim() || email.split('@')[0],
        },
      },
    });

    if (error) {
      setAuthError(error.message);
      return false;
    }
    return true;
  };

  const handleSignOut = async () => {
    await signOut();
  };

  const handleUpdateProfile = async (data: { nickname?: string; avatar?: number }) => {
    if (!user) return false;
    logger.debug('handleUpdateProfile', { nickname: data.nickname, avatar: data.avatar });

    try {
      const payload = {
        id: user.id,
        display_name:
          data.nickname !== undefined
            ? data.nickname
            : profile?.display_name || user.user_metadata?.display_name || user.email?.split('@')[0] || '',
        avatar_url:
          data.avatar !== undefined
            ? `avatar:${data.avatar}`
            : profile?.avatar_url || `avatar:${parseAvatarIndex(profile?.avatar_url)}`,
      };

      const { data: profileRow, error } = await supabase.from('profiles').upsert(payload).select().single();
      if (error) throw error;

      setProfile(profileRow as ProfileRow);
      logger.info('handleUpdateProfile success');
      return true;
    } catch (error) {
      logger.error('Error updating profile:', error);
      return false;
    }
  };

  const handleThemeChange = (nextTheme: ThemeType) => {
    setTheme(nextTheme);
    if (!user) return;
    logger.debug('handleThemeChange', { theme: nextTheme });
    void (async () => {
      try {
        await profileApi.updateProfile(user.id, { theme_preference: nextTheme });
        setProfile((prev) => (prev ? { ...prev, theme_preference: nextTheme } : prev));
        logger.info('handleThemeChange success');
      } catch (error) {
        logger.error('Error updating theme preference:', error);
      }
    })();
  };

  const handleChangePassword = async (oldPassword: string, newPassword: string) => {
    if (!user?.email) {
      return { ok: false, error: '未登录' };
    }

    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: oldPassword,
    });

    if (verifyError) {
      return { ok: false, error: '当前密码不正确' };
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      return { ok: false, error: error.message };
    }

    return { ok: true };
  };

  const handleDeleteAccount = async () => {
    if (!user) {
      return { ok: false, error: '未登录' };
    }

    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;
    if (!accessToken) {
      return { ok: false, error: '登录状态已失效，请重新登录后再试' };
    }

    try {
      const response = await fetch(`${syncServerBaseUrl}/api/v1/auth/delete-account`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        const errorMap: Record<string, string> = {
          service_role_key_required: '后端未配置 Supabase service role key，暂时无法注销账号。',
          Unauthorized: '登录状态已失效，请重新登录后再试',
        };
        return {
          ok: false,
          error: errorMap[payload?.error] || payload?.error || '注销失败，请稍后重试',
        };
      }

      await signOut();
      return { ok: true };
    } catch {
      return { ok: false, error: '无法连接 3001 服务，请先启动后端服务后再试' };
    }
  };

  const handleToggleModel = async (modelId: string) => {
    const accessToken = session?.access_token;
    if (!accessToken) return;

    const current = models.find((model) => model.id === modelId);
    logger.debug('handleToggleModel', { modelId, currentActive: current?.isActive });
    try {
      const updated = await updateAiProviderConfig(modelId, { isActive: !current?.isActive }, accessToken);
      setModels((prev) => prev.map((model) => {
        if (updated.isActive && model.id !== updated.id) {
          return { ...model, isActive: false };
        }
        return model.id === updated.id ? updated : model;
      }));
      logger.info('handleToggleModel success', { modelId, isActive: updated.isActive });
    } catch (error) {
      logger.error('Error toggling AI provider:', error);
    }
  };

  const handleAddCustomModel = async (newModel: AiProviderInput) => {
    const accessToken = session?.access_token;
    if (!accessToken) return;

    logger.debug('handleAddCustomModel', { provider: newModel.provider });
    try {
      const created = await createAiProviderConfig(
        {
          ...newModel,
          isActive: models.length === 0,
        },
        accessToken
      );
      setModels((prev) => {
        const next = created.isActive ? prev.map((model) => ({ ...model, isActive: false })) : prev;
        return [...next, created];
      });
      logger.info('handleAddCustomModel success', { id: created.id, provider: created.provider });
    } catch (error) {
      logger.error('Error adding AI provider:', error);
      throw error;
    }
  };

  const handleTestModelConnection = async (input: AiProviderTestInput): Promise<boolean> => {
    const accessToken = session?.access_token;
    if (!accessToken) throw new Error('not_authenticated');
    logger.debug('handleTestModelConnection', { provider: input.provider, model: input.model });
    return testAiProviderConfig(input, accessToken);
  };

  const handleUpdateCustomModel = async (modelId: string, updates: AiProviderInput) => {
    const accessToken = session?.access_token;
    if (!accessToken) return;

    logger.debug('handleUpdateCustomModel', { modelId, provider: updates.provider });
    try {
      const updated = await updateAiProviderConfig(modelId, updates, accessToken);
      setModels((prev) => prev.map((model) => {
        if (updated.isActive && model.id !== updated.id) {
          return { ...model, isActive: false };
        }
        return model.id === updated.id ? updated : model;
      }));
      logger.info('handleUpdateCustomModel success', { modelId });
    } catch (error) {
      logger.error('Error updating AI provider:', error);
      throw error;
    }
  };

  const handleDeleteModel = async (modelId: string) => {
    const accessToken = session?.access_token;
    if (!accessToken) return;

    logger.debug('handleDeleteModel', { modelId });
    try {
      await deleteAiProviderConfig(modelId, accessToken);
      setModels((prev) => prev.filter((model) => model.id !== modelId));
      logger.info('handleDeleteModel success', { modelId });
    } catch (error) {
      logger.error('Error deleting AI provider:', error);
      throw error;
    }
  };

  const handleAddWord = async (wordData: Parameters<typeof addWord>[0]) => {
    logger.debug('handleAddWord', { word: wordData.word, bookId: wordData.bookId });
    const saved = await addWord(wordData);
    if (saved) {
      setSelectedWordId(saved.id);
      await loadBooks();
      logger.info('handleAddWord success', { id: saved.id });
    }
  };

  const handleDeleteWords = async (wordIds: string[]) => {
    await deleteWords(wordIds);
    await loadBooks();
  };

  const handleMoveWords = async (wordIds: string[], targetBookId: string) => {
    const result = await moveWords(wordIds, targetBookId);
    if (result.success) {
      await loadBooks();
    }
    return result;
  };

  // ============ 自动 AI 分析 ============
  const hasActiveModel = models.some((model) => model.isActive);

  // 切换开关：需有激活模型才能开启；持久化到 profile（跨设备）
  const persistAutoFlag = async (field: 'auto_enrich' | 'auto_explain', value: boolean) => {
    const accessToken = session?.access_token;
    if (!user || !accessToken) return;
    try {
      await profileApi.updateProfile(user.id, { [field]: value });
      setProfile((prev) => (prev ? { ...prev, [field]: value } : prev));
    } catch (error) {
      logger.error('persistAutoFlag failed', { field, value, error });
    }
  };

  const handleToggleAutoEnrich = () => {
    if (!autoEnrich && !hasActiveModel) return; // 无激活模型不允许开启
    const next = !autoEnrich;
    // 开启瞬间记录基线，避免对存量老词触发
    if (next) autoAiBaselineRef.current = null;
    setAutoEnrich(next);
    void persistAutoFlag('auto_enrich', next);
  };

  const handleToggleAutoExplain = () => {
    if (!autoExplain && !hasActiveModel) return;
    const next = !autoExplain;
    if (next) autoAiBaselineRef.current = null;
    setAutoExplain(next);
    void persistAutoFlag('auto_explain', next);
  };

  // 基线：开关开启后第一次扫描时记录当时单词本里已存在的词 id，之后只处理新词
  const autoAiBaselineRef = useRef<Set<string> | null>(null);

  const needsEnrich = (word: Word) => !word.definition && !word.memoryTip && !(word.examples && word.examples.length > 0);
  const needsExplain = (word: Word) => !word.deepExplanation;

  // loadWords 后扫描当前单词本：对基线之后新出现且缺分析的词，按开关入队
  useEffect(() => {
    if (!autoEnrich && !autoExplain) {
      autoAiBaselineRef.current = null;
      return;
    }
    if (!hasActiveModel) return;
    const accessToken = session?.access_token;
    if (!accessToken) return;

    // 首次（或开关刚开启）建立基线：记录当前全部词 id，本轮不处理
    if (autoAiBaselineRef.current === null) {
      autoAiBaselineRef.current = new Set(words.map((w) => w.id));
      return;
    }

    const baseline = autoAiBaselineRef.current;
    const t = createTranslator(language);
    const messages = {
      progress: (current: number, total: number, type: BatchAiType) =>
        type === 'enrich'
          ? t('vocab.autoEnriching', { current, total })
          : t('vocab.autoExplaining', { current, total }),
      complete: (success: number, fail: number) => t('vocab.autoComplete', { success, fail }),
      allFailed: t('vocab.batchAllFailed'),
    };

    for (const word of words) {
      if (baseline.has(word.id)) continue; // 存量老词，跳过
      if (autoEnrich && needsEnrich(word)) {
        enqueueAutoAi(word, 'enrich', { accessToken, onUpdateWord: (id, updates) => updateWord(id, updates), messages });
      }
      if (autoExplain && needsExplain(word)) {
        enqueueAutoAi(word, 'explain', { accessToken, onUpdateWord: (id, updates) => updateWord(id, updates), messages });
      }
      baseline.add(word.id); // 标记已知，避免重复入队
    }
  }, [words, autoEnrich, autoExplain, hasActiveModel, session?.access_token, language, updateWord]);

  const handleCreateBook = async (bookData: Parameters<typeof createBook>[0]) => {
    const created = await createBook(bookData);
    if (created) {
      setSelectedBookId(created.id);
      void getPlatform().kv.set('wordbase-selected-book', created.id);
    }
  };

  const handleDeleteBooks = async (bookIds: string[]) => {
    // 检查是否正在删除同步单词本
    const deletingSyncBook = books.find((b) => bookIds.includes(b.id) && b.isSync);
    const remaining = books.filter((b) => !bookIds.includes(b.id));

    await Promise.all(bookIds.map((bookId) => deleteBook(bookId)));

    // 如果删除了同步单词本且还有剩余单词本，将第一个设为同步
    if (deletingSyncBook && remaining.length > 0) {
      await setSyncBook(remaining[0].id);
    }

    await loadBooks();
    if (bookIds.includes(selectedBookId)) {
      setSelectedBookId('');
      setActiveView('mylists');
    }
  };

  const handleUpdateBook = async (bookId: string, updates: { name?: string; description?: string; icon?: string }) => {
    const updated = await updateBook(bookId, updates);
    if (updated) {
      await loadBooks();
      return true;
    }
    return false;
  };

  const handleSetSyncBook = async (bookId: string) => {
    const previousBookId = selectedBookId;
    setSelectedBookId(bookId);
    persistSelectedBookId(bookId);

    const ok = await setSyncBook(bookId);
    if (!ok) {
      if (previousBookId) {
        setSelectedBookId(previousBookId);
        persistSelectedBookId(previousBookId);
      } else {
        setSelectedBookId('');
        clearPersistedSelectedBookId();
      }
    }

    return ok;
  };

  const activeWordCard = words.find((wordItem) => wordItem.id === selectedWordId) || words[0];

  // 提取为独立组件避免每次 render 重建
  const MainContentView = useMemo(() => {
    const ContentView: React.FC = () => {
      if (!user) {
        return (
          <WelcomeLoginView
            themeStyles={themeStyles}
            language={language}
            onLogin={handleSignIn}
            onRegister={handleSignUp}
            onRequestPasswordReset={handleRequestPasswordReset}
            authError={authError}
            setAuthError={setAuthError}
          />
        );
      }

      const navigateToBook = activeView.startsWith('vocabulary-');
      const bookIdFromNavigation = navigateToBook ? activeView.slice('vocabulary-'.length) : null;
      const finalSelectedBookId = bookIdFromNavigation || selectedBookId;

      if (navigateToBook && bookIdFromNavigation && bookIdFromNavigation !== selectedBookId) {
        setSelectedBookId(bookIdFromNavigation);
        persistSelectedBookId(bookIdFromNavigation);
      }

      if (activeView === 'vocabulary' || navigateToBook) {
        return (
          <VocabularyListView
            themeStyles={themeStyles}
            language={language}
            onNavigate={setActiveView}
            words={words}
            books={books}
            onSelectWord={setSelectedWordId}
            onAddWord={handleAddWord}
            initialSelectedBookId={finalSelectedBookId}
            onBookChange={(id) => {
              setSelectedBookId(id);
              persistSelectedBookId(id);
              setActiveView(`vocabulary-${id}`);
            }}
            onDeleteWords={handleDeleteWords}
            onMoveWords={handleMoveWords}
            onUpdateWord={(id, updates) => updateWord(id, updates)}
          />
        );
      }

      if (activeView.startsWith('settings-editmodel-')) {
        const modelId = activeView.slice('settings-editmodel-'.length);
        const modelToEdit = models.find((modelItem) => modelItem.id === modelId) || null;

        return (
          <SettingsLayout
            themeStyles={themeStyles}
            language={language}
            activeSettingsTab="settings-aimodels"
            activeView={activeView}
            onNavigateSettings={setActiveView}
          >
            <AddNewModelView
              themeStyles={themeStyles}
              language={language}
              onNavigate={setActiveView}
              onSaveModel={(updates) => handleUpdateCustomModel(modelId, updates)}
              initialModel={modelToEdit}
            />
          </SettingsLayout>
        );
      }

      switch (activeView) {
        case 'dashboard':
          return <DashboardView themeStyles={themeStyles} language={language} onNavigate={setActiveView} books={books} words={words} user={currentUser} />;
        case 'worddetail':
          return (
            <WordDetailView
              themeStyles={themeStyles}
              language={language}
              onNavigate={setActiveView}
              word={activeWordCard}
              onUpdateFamiliarity={(id, level) => {
                void updateWord(id, { familiarity: level, timeUpdated: Date.now(), dateUpdated: Date.now() });
              }}
              onUpdateContexts={(id, contexts) => updateWord(id, { contexts, timeUpdated: Date.now(), dateUpdated: Date.now() })}
              onUpdateWord={(id, updates) => updateWord(id, updates)}
              aiProviders={models}
            />
          );
        case 'mylists':
          return (
            <MyListsView
              themeStyles={themeStyles}
              language={language}
              onNavigate={setActiveView}
              books={books}
              onCreateBook={handleCreateBook}
              onSetSyncBook={handleSetSyncBook}
              onDeleteBooks={handleDeleteBooks}
              onUpdateBook={handleUpdateBook}
            />
          );
        case 'stories':
          return <StudyScenarioView
            themeStyles={themeStyles}
            language={language}
            stories={stories}
            words={words}
            isGenerating={isGeneratingStory}
            hasActiveModel={hasActiveModel}
            accessToken={session?.access_token}
            onGenerateStory={generateStory}
            onDeleteStory={deleteStory}
          />;
        case 'practice':
          return <PracticeMainView themeStyles={themeStyles} language={language} onNavigate={setActiveView} words={words} />;
        case 'practice-review':
          return (
            <ReviewView
              themeStyles={themeStyles}
              language={language}
              words={words}
              onNavigate={setActiveView}
              onReviewWord={(id, updates) => updateWord(id, updates)}
            />
          );
        case 'practice-listening':
          return <ListeningPracticeView themeStyles={themeStyles} language={language} onNavigate={setActiveView} quizzes={listeningQuizzes} />;
        case 'practice-speaking':
          return <SpeakingPracticeView themeStyles={themeStyles} language={language} onNavigate={setActiveView} />;
        case 'practice-reading':
          return <ReadingPracticeView themeStyles={themeStyles} language={language} onNavigate={setActiveView} />;
        case 'practice-writing':
          return <WritingPracticeView themeStyles={themeStyles} language={language} onNavigate={setActiveView} />;
        case 'profile':
          return (
            <AccountSettingsView
              themeStyles={themeStyles}
              language={language}
              user={currentUser}
              onUpdateProfile={handleUpdateProfile}
              onChangePassword={handleChangePassword}
              onDeleteAccount={handleDeleteAccount}
            />
          );
        case 'settings-list':
          return (
            <SettingsLayout
              themeStyles={themeStyles}
              language={language}
              activeSettingsTab="settings-list"
              activeView={activeView}
              onNavigateSettings={setActiveView}
            />
          );
        case 'settings-account':
        case 'settings-appearance':
        case 'settings-aimodels':
        case 'settings-autoai':
        case 'settings-addmodel':
        case 'settings-sync':
          return (
            <SettingsLayout
              themeStyles={themeStyles}
              language={language}
              activeSettingsTab={activeView === 'settings-addmodel' ? 'settings-aimodels' : activeView}
              activeView={activeView}
              onNavigateSettings={setActiveView}
            >
              {activeView === 'settings-account' && (
                <AccountSettingsView
                  themeStyles={themeStyles}
                  language={language}
                  user={currentUser}
                  onUpdateProfile={handleUpdateProfile}
                  onChangePassword={handleChangePassword}
                  onDeleteAccount={handleDeleteAccount}
                />
              )}
              {activeView === 'settings-appearance' && (
                <AppearanceSettingsView
                  themeStyles={themeStyles}
                  language={language}
                  activeTheme={theme}
                  onThemeChange={handleThemeChange}
                  isCompactMode={isCompactMode}
                  onCompactToggle={() => setIsCompactMode(!isCompactMode)}
                  isSmallTypography={isSmallTypography}
                  onTypographyToggle={() => setIsSmallTypography(!isSmallTypography)}
                />
              )}
              {activeView === 'settings-autoai' && (
                <AutoAiSettingsView
                  themeStyles={themeStyles}
                  language={language}
                  autoEnrich={autoEnrich}
                  autoExplain={autoExplain}
                  onAutoEnrichToggle={handleToggleAutoEnrich}
                  onAutoExplainToggle={handleToggleAutoExplain}
                  hasActiveModel={hasActiveModel}
                />
              )}
              {activeView === 'settings-aimodels' && (
                <AIModelsView
                  themeStyles={themeStyles}
                  language={language}
                  onNavigate={setActiveView}
                  models={models}
                  onToggleModel={handleToggleModel}
                  onEditModel={(modelId) => setActiveView(`settings-editmodel-${modelId}`)}
                  onDeleteModel={handleDeleteModel}
                />
              )}
              {activeView === 'settings-addmodel' && (
                <AddNewModelView
                  themeStyles={themeStyles}
                  language={language}
                  onNavigate={setActiveView}
                  onSaveModel={handleAddCustomModel}
                  onTestConnection={handleTestModelConnection}
                />
              )}
              {activeView === 'settings-sync' && <SyncStorageView themeStyles={themeStyles} language={language} />}
            </SettingsLayout>
          );
        default:
          return <DashboardView themeStyles={themeStyles} language={language} onNavigate={setActiveView} books={books} words={words} user={currentUser} />;
      }
    };
    return ContentView;
  }, [user, activeView, words, books, models, stories, session, theme, language, themeStyles, currentUser, autoEnrich, autoExplain, hasActiveModel, isCompactMode, isSmallTypography, selectedBookId, selectedWordId, isGeneratingStory, handleSignIn, handleSignUp, handleRequestPasswordReset, authError, setActiveView, setSelectedBookId, persistSelectedBookId, handleAddWord, handleDeleteWords, handleMoveWords, updateWord, handleUpdateCustomModel, handleCreateBook, handleSetSyncBook, handleDeleteBooks, handleUpdateBook, generateStory, deleteStory, handleUpdateProfile, handleChangePassword, handleDeleteAccount, handleToggleModel, handleDeleteModel, handleAddCustomModel, handleTestModelConnection, handleThemeChange, setIsCompactMode, setIsSmallTypography, handleToggleAutoEnrich, handleToggleAutoExplain, activeWordCard]);

  if (authLoading) {
    return (
      <div
        className={themeStyles.bodyBg}
        style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        <div className="text-white">加载中...</div>
      </div>
    );
  }

  return (
    <div
      className={`${themeStyles.bodyBg} flex flex-col justify-between transition-colors duration-500`}
      style={
        theme === 'glass'
          ? {
              backgroundImage:
                'radial-gradient(at 0% 0%, rgba(99, 102, 241, 0.4) 0px, transparent 50%), radial-gradient(at 100% 0%, rgba(232, 121, 249, 0.4) 0px, transparent 50%), radial-gradient(at 50% 100%, rgba(30, 41, 59, 1) 0px, transparent 80%)',
              backgroundColor: '#0f172a',
            }
          : undefined
      }
    >
      {themeStyles.glowEffect && <div className={themeStyles.glowEffect} />}

      <Navbar
        theme={theme}
        language={language}
        onLanguageChange={setLanguage}
        onThemeChange={handleThemeChange}
        themeStyles={themeStyles}
        isLoggedIn={!!user}
        onNavigate={setActiveView}
        onLogout={handleSignOut}
        activeView={activeView}
        user={currentUser}
        isMobile={isMobile}
      />

      <main className={`flex-grow w-full ${isMobile ? 'px-4 py-4 pb-24' : 'max-w-7xl mx-auto ' + (isCompactMode ? 'p-3 my-4' : 'px-6 py-8 my-6')}`}>
        {!user ? (
          <AnimatePresence mode="wait">
            <motion.div
              key="auth"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35 }}
            >
              <WelcomeLoginView
                themeStyles={themeStyles}
                language={language}
                onLogin={handleSignIn}
                onRegister={handleSignUp}
                onRequestPasswordReset={handleRequestPasswordReset}
                authError={authError}
                setAuthError={setAuthError}
              />
            </motion.div>
          </AnimatePresence>
        ) : isMobile ? (
          <AnimatePresence mode="wait">
            <motion.div
              key={activeView}
              initial={{ opacity: 0, scale: 0.99, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              <MainContentView />
            </motion.div>
          </AnimatePresence>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            <div className="lg:col-span-1">
              <Sidebar
                activeView={activeView}
                onNavigate={setActiveView}
                themeStyles={themeStyles}
                language={language}
                user={currentUser}
              />
            </div>
            <div className="lg:col-span-3">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeView}
                  initial={{ opacity: 0, scale: 0.99, y: 8 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.25 }}
                  className="h-full"
                >
                  <MainContentView />
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        )}
      </main>

      {user && isMobile && (
        <MobileTabBar
          activeView={activeView}
          onNavigate={setActiveView}
          themeStyles={themeStyles}
          language={language}
        />
      )}
    </div>
  );
}
