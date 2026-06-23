import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AppLanguage, ThemeType, AIModel } from './types';
import { initialStories, listeningQuizzes, mockDefaultModels } from './mockData';
import { getThemeClasses } from './components/ThemeStyles';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { SettingsLayout } from './components/SettingsLayout';
import {
  WelcomeLoginView,
  DashboardView,
  VocabularyListView,
  WordDetailView,
  MyListsView,
  StudyScenarioView,
  PracticeMainView,
  ListeningPracticeView,
  SpeakingPracticeView,
  ReadingPracticeView,
  WritingPracticeView,
  AccountSettingsView,
  AppearanceSettingsView,
  AIModelsView,
  AddNewModelView,
  SyncStorageView,
} from './components/views';
import { useSupabase } from './context/SupabaseContext';
import { useVocabularyBooks, useWords } from './hooks/useVocabulary';
import { profileApi, supabase } from './lib/supabase';

interface ProfileRow {
  id: string;
  display_name?: string | null;
  avatar_url?: string | null;
  created_at?: string | null;
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
  if (typeof window !== 'undefined') {
    localStorage.setItem('wordbase-selected-book', bookId);
  }
}

function clearPersistedSelectedBookId() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('wordbase-selected-book');
  }
}

export default function AppSupabase() {
  const { user, isLoading: authLoading, signIn, signOut, resetPassword } = useSupabase();
  const { books, isLoading: booksLoading, loadBooks, createBook, updateBook, deleteBook, setSyncBook } =
    useVocabularyBooks();
  const [selectedBookId, setSelectedBookId] = useState<string>('');
  const { words, addWord, deleteWords, moveWords, updateWord } = useWords(selectedBookId);

  const [theme, setTheme] = useState<ThemeType>('glass');
  const [language, setLanguage] = useState<AppLanguage>(() => {
    if (typeof window === 'undefined') {
      return 'zh';
    }

    try {
      const savedLanguage = localStorage.getItem('wordbase_language');
      return savedLanguage === 'en' ? 'en' : 'zh';
    } catch {
      return 'zh';
    }
  });
  const [activeView, setActiveView] = useState<string>(() => {
    if (typeof window === 'undefined') return 'welcome';
    try {
      const saved = localStorage.getItem('wordbase_activeView');
      return saved || 'welcome';
    } catch {
      return 'welcome';
    }
  });
  const [isCompactMode, setIsCompactMode] = useState<boolean>(false);
  const [isSmallTypography, setIsSmallTypography] = useState<boolean>(false);
  const [selectedWordId, setSelectedWordId] = useState<string>('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [models, setModels] = useState<AIModel[]>(mockDefaultModels);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const syncServerBaseUrl =
    import.meta.env.VITE_SYNC_SERVER_URL ||
    (typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.hostname}:3001` : 'http://localhost:3001');

  const themeStyles = getThemeClasses(theme, isSmallTypography);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      localStorage.setItem('wordbase_language', language);
    } catch {
      // ignore
    }
  }, [language]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem('wordbase_activeView', activeView);
    } catch {
      // ignore
    }
  }, [activeView]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.body.classList.remove('theme-glass', 'theme-natural');
    document.body.classList.add(`theme-${theme}`);
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

  // 仅在真正的登录/登出状态转换时切换视图，token 刷新不触发
  const prevUserIdRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    const prevId = prevUserIdRef.current;
    const currId = user?.id;
    prevUserIdRef.current = currId;

    // 真正登录：之前没有 user，现在有了
    if (!prevId && currId) {
      const saved = (() => {
        try { return localStorage.getItem('wordbase_activeView'); } catch { return null; }
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

    const savedBookId = typeof window !== 'undefined' ? localStorage.getItem('wordbase-selected-book') : null;
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

  const handleSignIn = async (email: string, password: string, _remember: boolean) => {
    setAuthError(null);
    const { error } = await signIn(email, password);
    if (error) {
      setAuthError(error.message);
      return false;
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
      return true;
    } catch (error) {
      console.error('Error updating profile:', error);
      return false;
    }
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

  const handleToggleModel = (modelId: string) => {
    setModels((prev) => prev.map((model) => (model.id === modelId ? { ...model, isActive: !model.isActive } : model)));
  };

  const handleAddCustomModel = (newModel: Omit<AIModel, 'id' | 'isActive'>) => {
    setModels((prev) => [
      ...prev,
      {
        ...newModel,
        id: `engine-${Date.now()}`,
        isActive: false,
      },
    ]);
  };

  const handleAddWord = async (wordData: Parameters<typeof addWord>[0]) => {
    const saved = await addWord(wordData);
    if (saved) {
      setSelectedWordId(saved.id);
      await loadBooks();
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

  const handleCreateBook = async (bookData: Parameters<typeof createBook>[0]) => {
    const created = await createBook(bookData);
    if (created) {
      setSelectedBookId(created.id);
      if (typeof window !== 'undefined') {
        localStorage.setItem('wordbase-selected-book', created.id);
      }
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

  const renderMainView = () => {
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
        />
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
        return <StudyScenarioView themeStyles={themeStyles} stories={initialStories} words={words} />;
      case 'practice':
        return <PracticeMainView themeStyles={themeStyles} language={language} onNavigate={setActiveView} />;
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
      case 'settings-account':
      case 'settings-appearance':
      case 'settings-aimodels':
      case 'settings-addmodel':
      case 'settings-sync':
        return (
          <SettingsLayout
            themeStyles={themeStyles}
            language={language}
            activeSettingsTab={activeView === 'settings-addmodel' ? 'settings-aimodels' : activeView}
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
                onThemeChange={setTheme}
                isCompactMode={isCompactMode}
                onCompactToggle={() => setIsCompactMode(!isCompactMode)}
                isSmallTypography={isSmallTypography}
                onTypographyToggle={() => setIsSmallTypography(!isSmallTypography)}
              />
            )}
            {activeView === 'settings-aimodels' && (
              <AIModelsView
                themeStyles={themeStyles}
                language={language}
                onNavigate={setActiveView}
                models={models}
                onToggleModel={handleToggleModel}
              />
            )}
            {activeView === 'settings-addmodel' && (
              <AddNewModelView
                themeStyles={themeStyles}
                language={language}
                onNavigate={setActiveView}
                onSaveModel={handleAddCustomModel}
              />
            )}
            {activeView === 'settings-sync' && <SyncStorageView themeStyles={themeStyles} language={language} />}
          </SettingsLayout>
        );
      default:
        return <DashboardView themeStyles={themeStyles} language={language} onNavigate={setActiveView} books={books} words={words} user={currentUser} />;
    }
  };

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
        onThemeChange={setTheme}
        themeStyles={themeStyles}
        isLoggedIn={!!user}
        onNavigate={setActiveView}
        onLogout={handleSignOut}
        activeView={activeView}
        user={currentUser}
      />

      <main className={`flex-grow w-full max-w-7xl mx-auto ${isCompactMode ? 'p-3 my-4' : 'px-6 py-8 my-6'}`}>
        {!user ? (
          <AnimatePresence mode="wait">
            <motion.div
              key="auth"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
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
                  {renderMainView()}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
