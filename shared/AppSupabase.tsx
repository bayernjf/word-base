import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { createLogger } from './lib/logger';
import { AppLanguage, ThemeType } from './types';
import { getPlatform } from './platform';

const logger = createLogger('AppSupabase');
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
  AboutSettingsView,
  PrivacyPolicyView,
  FeedbackSettingsView,
  AnnouncementsView,
} from './components/views';
import { useSupabase } from './context/SupabaseContext';
import { useAnnouncements } from './context/AnnouncementContext';
import { AnnouncementBanner } from './components/announcement/AnnouncementBanner';
import { AnnouncementModal } from './components/announcement/AnnouncementModal';
import { useVocabularyBooks, useWords } from './hooks/useVocabulary';
import { useStories } from './hooks/useStories';
import { useIsMobile } from './hooks/useIsMobile';
import { useAutoUpdateCheck } from './hooks/useAutoUpdateCheck';
import { profileApi, supabase } from './lib/supabase';
import { useAiModels } from './hooks/useAiModels';
import { useProfile } from './hooks/useProfile';
import { useAutoAi } from './hooks/useAutoAi';
import { useBookActions } from './hooks/useBookActions';
import { AnalyticsConsentBanner } from './components/AnalyticsConsentBanner';
import { trackEvent, trackPageView } from './lib/analytics';

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
  const { profile, setProfile, currentUser, handleUpdateProfile, handleChangePassword, handleDeleteAccount } =
    useProfile(user, signOut);

  const themeStyles = getThemeClasses(theme, isSmallTypography);
  const isMobile = useIsMobile();

  // ============ AI 模型管理 ============
  const {
    models, hasActiveModel,
    handleToggleModel, handleAddCustomModel, handleTestModelConnection,
    handleUpdateCustomModel, handleDeleteModel,
  } = useAiModels(session?.access_token);

  // 全局后台自动更新检查（桌面端轮询 + 移动端启动检查）
  useAutoUpdateCheck();

  // ============ 公告系统 ============
  const { announcements, dismissBanner, markRead, unreadCount } = useAnnouncements();
  const [dismissedModalIds, setDismissedModalIds] = useState<Set<string>>(new Set());
  const activeBanner = announcements.find(
    (a) => a.severity === 'warning' && !a.read && !a.dismissed
  );
  const activeModal = announcements.find(
    (a) => a.severity === 'critical' && !a.read && !dismissedModalIds.has(a.id)
  );
  const handleModalClose = () => {
    if (!activeModal) return;
    const id = activeModal.id;
    setDismissedModalIds((prev) => new Set(prev).add(id));
    void markRead(id);
  };
  const handleBannerDismiss = (id: string) => {
    void dismissBanner(id);
  };

  useEffect(() => {
    void getPlatform().kv.set('wordbase_language', language);
  }, [language]);

  useEffect(() => {
    void getPlatform().kv.set('wordbase_activeView', activeView);
    const pageName = activeView
      .replace(/^vocabulary-.+$/, 'vocabulary')
      .replace(/^settings-editmodel-.+$/, 'settings-editmodel');
    trackPageView(`WordBase - ${pageName}`);
  }, [activeView]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.body.classList.remove('theme-glass', 'theme-natural');
    document.body.classList.add(`theme-${theme}`);
  }, [theme]);

  useEffect(() => {
    void getPlatform().kv.set('wordbase_theme', theme);
  }, [theme]);

  // 从 profile 同步主题偏好（profile 加载/切换用户时）
  useEffect(() => {
    if (profile?.theme_preference === 'natural' || profile?.theme_preference === 'glass') {
      setTheme(profile.theme_preference);
    }
  }, [profile?.theme_preference]);

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

  // 首次登录时自动创建默认单词本（仅当没有任何同步单词本时）
  useEffect(() => {
    if (!user || booksLoading) return;
    const hasSyncBook = books.some((book) => book.isSync);
    if (!hasSyncBook && books.length === 0) {
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
      void getPlatform().kv.remove('wordbase-selected-book');
      return;
    }

    if (selectedBookId && books.some((book) => book.id === selectedBookId)) {
      return;
    }

    const savedBookId = getPlatform().kv.getSync('wordbase-selected-book');
    const rememberedBook = savedBookId ? books.find((book) => book.id === savedBookId) : null;
    const syncBook = [...books]
      .filter((book) => book.isSync)
      .sort((left, right) => {
        const leftIsDefault = left.name === '默认';
        const rightIsDefault = right.name === '默认';
        if (leftIsDefault !== rightIsDefault) return leftIsDefault ? 1 : -1;
        return (right.updatedAt || right.createdAt || 0) - (left.updatedAt || left.createdAt || 0);
      })[0] || null;

    // 优先选同步单词本：插件添加的单词始终写入同步单词本，
    // 如果记住了非同步单词本，用户会误以为新单词没同步成功
    let nextBookId: string;
    if (rememberedBook && (!syncBook || rememberedBook.id === syncBook.id)) {
      // 记住的就是同步单词本（或没有同步单词本），直接用记住的
      nextBookId = rememberedBook.id;
    } else if (syncBook) {
      // 记住的不是同步单词本，或没记住——优先同步单词本
      nextBookId = syncBook.id;
    } else {
      nextBookId = books[0].id;
    }

    if (nextBookId && nextBookId !== selectedBookId) {
      setSelectedBookId(nextBookId);
      // 如果纠正了记住的单词本（切换到同步单词本），持久化修正
      if (!rememberedBook || rememberedBook.id !== nextBookId) {
        void getPlatform().kv.set('wordbase-selected-book', nextBookId);
      }
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
    trackEvent('login', { method: 'password', remember_me: remember });
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
    trackEvent('sign_up', { method: 'email' });
    return true;
  };

  const handleSignOut = async () => {
    trackEvent('logout');
    await signOut();
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

  // ============ 自动 AI 分析 ============
  const { autoEnrich, autoExplain, handleToggleAutoEnrich, handleToggleAutoExplain } = useAutoAi(
    user, session?.access_token, words, hasActiveModel, updateWord, language, profile, setProfile,
  );

  // ============ 书本 / 单词操作 ============
  const {
    handleAddWord, handleDeleteWords, handleMoveWords,
    handleCreateBook, handleDeleteBooks, handleUpdateBook, handleSetSyncBook,
  } = useBookActions(
    books, selectedBookId, setSelectedBookId, setActiveView, setSelectedWordId,
    loadBooks, addWord, deleteWords, moveWords, createBook, deleteBook, updateBook, setSyncBook,
  );

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
        void getPlatform().kv.set('wordbase-selected-book', bookIdFromNavigation);
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
              void getPlatform().kv.set('wordbase-selected-book', id);
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
              onTestConnection={handleTestModelConnection}
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
          return <PracticeMainView themeStyles={themeStyles} language={language} onNavigate={setActiveView} words={words} hasActiveModel={hasActiveModel} />;
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
          return <ListeningPracticeView themeStyles={themeStyles} language={language} onNavigate={setActiveView} words={words} accessToken={session?.access_token} />;
        case 'practice-speaking':
          return <SpeakingPracticeView themeStyles={themeStyles} language={language} onNavigate={setActiveView} words={words} accessToken={session?.access_token} />;
        case 'practice-reading':
          return <ReadingPracticeView themeStyles={themeStyles} language={language} onNavigate={setActiveView} words={words} accessToken={session?.access_token} />;
        case 'practice-writing':
          return <WritingPracticeView themeStyles={themeStyles} language={language} onNavigate={setActiveView} words={words} accessToken={session?.access_token} />;
        case 'announcements':
          return <AnnouncementsView themeStyles={themeStyles} language={language} onNavigate={setActiveView} />;
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
        case 'settings-about':
        case 'settings-addmodel':
        case 'settings-sync':
        case 'settings-feedback':
        case 'settings-privacy':
          return (
            <SettingsLayout
              themeStyles={themeStyles}
              language={language}
              activeSettingsTab={activeView === 'settings-addmodel' ? 'settings-aimodels' : activeView === 'settings-privacy' ? 'settings-about' : activeView}
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
              {activeView === 'settings-feedback' && (
                <FeedbackSettingsView
                  themeStyles={themeStyles}
                  language={language}
                  userId={currentUser?.id ?? null}
                  accessToken={session?.access_token ?? null}
                  onSignInClick={() => setActiveView('login')}
                />
              )}
              {activeView === 'settings-about' && (
                <AboutSettingsView
                  themeStyles={themeStyles}
                  language={language}
                  onPrivacyPolicyClick={() => setActiveView('settings-privacy')}
                />
              )}
              {activeView === 'settings-privacy' && (
                <PrivacyPolicyView
                  themeStyles={themeStyles}
                  language={language}
                  onBack={() => setActiveView('settings-about')}
                />
              )}
            </SettingsLayout>
          );
        default:
          return <DashboardView themeStyles={themeStyles} language={language} onNavigate={setActiveView} books={books} words={words} user={currentUser} />;
      }
    };
    return ContentView;
  }, [user, activeView, words, books, models, stories, session, theme, language, themeStyles, currentUser, autoEnrich, autoExplain, hasActiveModel, isCompactMode, isSmallTypography, selectedBookId, selectedWordId, isGeneratingStory, handleSignIn, handleSignUp, handleRequestPasswordReset, authError, setActiveView, handleAddWord, handleDeleteWords, handleMoveWords, updateWord, handleUpdateCustomModel, handleCreateBook, handleSetSyncBook, handleDeleteBooks, handleUpdateBook, generateStory, deleteStory, handleUpdateProfile, handleChangePassword, handleDeleteAccount, handleToggleModel, handleDeleteModel, handleAddCustomModel, handleTestModelConnection, handleThemeChange, handleToggleAutoEnrich, handleToggleAutoExplain, activeWordCard]);

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
      data-clarity-mask="True"
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
        announcementUnreadCount={unreadCount}
      />

      {user && activeBanner && (
        <AnnouncementBanner
          announcement={activeBanner}
          theme={theme}
          language={language}
          onDismiss={handleBannerDismiss}
          onOpenList={() => setActiveView('announcements')}
        />
      )}

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
                announcementUnreadCount={unreadCount}
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

      {user && activeModal && (
        <AnnouncementModal
          announcement={activeModal}
          theme={theme}
          language={language}
          onClose={handleModalClose}
        />
      )}
      {getPlatform().getPlatform() === 'web' && <AnalyticsConsentBanner />}
    </div>
  );
}
