import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ThemeType, AIModel } from './types';
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
} from './components/Views';
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

export default function AppSupabase() {
  const { user, isLoading: authLoading, signIn, signOut, resetPassword } = useSupabase();
  const { books, isLoading: booksLoading, loadBooks, createBook, updateBook, deleteBook, setSyncBook } =
    useVocabularyBooks();
  const [selectedBookId, setSelectedBookId] = useState<string>('');
  const { words, addWord, deleteWords, moveWords, updateWord } = useWords(selectedBookId);

  const [theme, setTheme] = useState<ThemeType>('glass');
  const [activeView, setActiveView] = useState<string>('welcome');
  const [isCompactMode, setIsCompactMode] = useState<boolean>(false);
  const [isSmallTypography, setIsSmallTypography] = useState<boolean>(false);
  const [selectedWordId, setSelectedWordId] = useState<string>('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [models, setModels] = useState<AIModel[]>(mockDefaultModels);
  const [profile, setProfile] = useState<ProfileRow | null>(null);

  const themeStyles = getThemeClasses(theme, isSmallTypography);

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

  useEffect(() => {
    if (user && !booksLoading && books.length === 0) {
      void createBook({
        name: '默认',
        description: '默认单词本',
        icon: 'BookOpen',
        isSync: true,
      });
    }

    if (user) {
      setActiveView('dashboard');
    } else {
      setSelectedBookId('');
      setSelectedWordId('');
      setActiveView('welcome');
    }
  }, [user, books, booksLoading, createBook]);

  useEffect(() => {
    if (books.length > 0) {
      const savedBookId = typeof window !== 'undefined' ? localStorage.getItem('wordbase-selected-book') : null;
      const rememberedBook = savedBookId ? books.find((book) => book.id === savedBookId) : null;
      const syncBook = books.find((book) => book.isSync);

      if (rememberedBook) {
        setSelectedBookId(rememberedBook.id);
        return;
      }

      if (syncBook) {
        setSelectedBookId(syncBook.id);
      } else {
        setSelectedBookId(books[0].id);
      }
    } else {
      setSelectedBookId('');
    }
  }, [books]);

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

  const handleSendCode = async (email: string, type: 'register' | 'reset') => {
    setAuthError(null);
    if (type === 'reset') {
      const { error } = await resetPassword(email);
      if (error) {
        return { ok: false, error: error.message };
      }
    }
    return { ok: true };
  };

  const handleSignUp = async (email: string, password: string, _code: string, nickname?: string) => {
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

  const handleResetPasswordVerify = async () => {
    return {
      ok: false,
      error: '已发送重置邮件，请点击邮件中的恢复链接完成密码重置。',
    };
  };

  const handleResetPassword = async () => {
    setAuthError('请通过邮箱中的恢复链接重置密码。');
    return false;
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
    if (!user) return;

    const now = new Date().toISOString();
    await Promise.allSettled([
      supabase.from('words').update({ is_deleted: true, updated_at: now }).eq('user_id', user.id),
      supabase
        .from('vocabulary_books')
        .update({ is_deleted: true, is_sync: false, updated_at: now })
        .eq('user_id', user.id),
      supabase.from('profiles').update({ display_name: '[deleted]', avatar_url: 'avatar:0' }).eq('id', user.id),
    ]);

    await signOut();
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
    const moved = await moveWords(wordIds, targetBookId);
    if (moved) {
      await loadBooks();
    }
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
    await Promise.all(bookIds.map((bookId) => deleteBook(bookId)));
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
    const ok = await setSyncBook(bookId);
    if (ok) {
      setSelectedBookId(bookId);
      if (typeof window !== 'undefined') {
        localStorage.setItem('wordbase-selected-book', bookId);
      }
    }
  };

  const activeWordCard = words.find((wordItem) => wordItem.id === selectedWordId) || words[0];

  const renderMainView = () => {
    if (!user) {
      return (
        <WelcomeLoginView
          themeStyles={themeStyles}
          onLogin={handleSignIn}
          onRegister={handleSignUp}
          onSendCode={handleSendCode}
          onResetPasswordVerify={handleResetPasswordVerify}
          onResetPassword={handleResetPassword}
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
      if (typeof window !== 'undefined') {
        localStorage.setItem('wordbase-selected-book', bookIdFromNavigation);
      }
    }

    if (activeView === 'vocabulary' || navigateToBook) {
      return (
        <VocabularyListView
          themeStyles={themeStyles}
          onNavigate={setActiveView}
          words={words}
          books={books}
          onSelectWord={setSelectedWordId}
          onAddWord={handleAddWord}
          initialSelectedBookId={finalSelectedBookId}
          onBookChange={(id) => {
            setSelectedBookId(id);
            if (typeof window !== 'undefined') {
              localStorage.setItem('wordbase-selected-book', id);
            }
            setActiveView(`vocabulary-${id}`);
          }}
          onDeleteWords={handleDeleteWords}
          onMoveWords={handleMoveWords}
        />
      );
    }

    switch (activeView) {
      case 'dashboard':
        return <DashboardView themeStyles={themeStyles} onNavigate={setActiveView} books={books} words={words} />;
      case 'worddetail':
        return (
          <WordDetailView
            themeStyles={themeStyles}
            onNavigate={setActiveView}
            word={activeWordCard}
            onUpdateFamiliarity={(id, level) => {
              void updateWord(id, { familiarity: level, timeUpdated: Date.now(), dateUpdated: Date.now() });
            }}
          />
        );
      case 'mylists':
        return (
          <MyListsView
            themeStyles={themeStyles}
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
        return <PracticeMainView themeStyles={themeStyles} onNavigate={setActiveView} />;
      case 'practice-listening':
        return <ListeningPracticeView themeStyles={themeStyles} onNavigate={setActiveView} quizzes={listeningQuizzes} />;
      case 'practice-speaking':
        return <SpeakingPracticeView themeStyles={themeStyles} onNavigate={setActiveView} />;
      case 'practice-reading':
        return <ReadingPracticeView themeStyles={themeStyles} onNavigate={setActiveView} />;
      case 'practice-writing':
        return <WritingPracticeView themeStyles={themeStyles} onNavigate={setActiveView} />;
      case 'profile':
        return (
          <AccountSettingsView
            themeStyles={themeStyles}
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
            activeSettingsTab={activeView === 'settings-addmodel' ? 'settings-aimodels' : activeView}
            onNavigateSettings={setActiveView}
          >
            {activeView === 'settings-account' && (
              <AccountSettingsView
                themeStyles={themeStyles}
                user={currentUser}
                onUpdateProfile={handleUpdateProfile}
                onChangePassword={handleChangePassword}
                onDeleteAccount={handleDeleteAccount}
              />
            )}
            {activeView === 'settings-appearance' && (
              <AppearanceSettingsView
                themeStyles={themeStyles}
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
                onNavigate={setActiveView}
                models={models}
                onToggleModel={handleToggleModel}
              />
            )}
            {activeView === 'settings-addmodel' && (
              <AddNewModelView
                themeStyles={themeStyles}
                onNavigate={setActiveView}
                onSaveModel={handleAddCustomModel}
              />
            )}
            {activeView === 'settings-sync' && <SyncStorageView themeStyles={themeStyles} />}
          </SettingsLayout>
        );
      default:
        return <DashboardView themeStyles={themeStyles} onNavigate={setActiveView} books={books} words={words} />;
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
                onLogin={handleSignIn}
                onRegister={handleSignUp}
                onSendCode={handleSendCode}
                onResetPasswordVerify={handleResetPasswordVerify}
                onResetPassword={handleResetPassword}
                authError={authError}
                setAuthError={setAuthError}
              />
            </motion.div>
          </AnimatePresence>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            <div className="lg:col-span-1">
              <Sidebar activeView={activeView} onNavigate={setActiveView} themeStyles={themeStyles} user={currentUser} />
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
