import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  initialVocabularyBooks, initialWords, initialStories, listeningQuizzes, mockDefaultModels 
} from './mockData';
import { ThemeType, Word, VocabularyBook, AIModel } from './types';
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
  SyncStorageView
} from './components/Views';

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: { id: string; email: string; nickname?: string; avatar?: number; createdAt: number } | null;
}

export default function App() {
  const [theme, setTheme] = useState<ThemeType>('glass');
  const [activeView, setActiveView] = useState<string>(() => {
    try {
      const auth = localStorage.getItem('wordbase_auth');
      if (auth) {
        const parsed = JSON.parse(auth);
        return !!(parsed?.accessToken && parsed?.refreshToken && parsed?.user) ? 'dashboard' : 'welcome';
      }
    } catch {
      // ignore
    }
    return 'welcome';
  });
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    try {
      const auth = localStorage.getItem('wordbase_auth');
      if (auth) {
        const parsed = JSON.parse(auth);
        return !!(parsed?.accessToken && parsed?.refreshToken && parsed?.user);
      }
    } catch {
      // ignore
    }
    return false;
  });
  const [isCompactMode, setIsCompactMode] = useState<boolean>(false);
  const [isSmallTypography, setIsSmallTypography] = useState<boolean>(false);
  const [words, setWords] = useState<Word[]>(initialWords);
  const [books, setBooks] = useState<VocabularyBook[]>(initialVocabularyBooks);
  const [models, setModels] = useState<AIModel[]>(mockDefaultModels);
  const [selectedWordId, setSelectedWordId] = useState<string>('w1');
  const [auth, setAuth] = useState<AuthState>(() => {
    try {
      const auth = localStorage.getItem('wordbase_auth');
      if (auth) {
        return JSON.parse(auth);
      }
    } catch {
      // ignore
    }
    return { accessToken: null, refreshToken: null, user: null };
  });
  const [authError, setAuthError] = useState<string | null>(null);

  const themeStyles = getThemeClasses(theme, isSmallTypography);

  useEffect(() => {
    if (isLoggedIn && auth.accessToken) {
      loadWords(auth.accessToken);
      loadBooks(auth.accessToken);
    }
  }, [isLoggedIn, auth.accessToken]);

  const saveAuth = (newAuth: AuthState) => {
    setAuth(newAuth);
    try {
      localStorage.setItem('wordbase_auth', JSON.stringify(newAuth));
    } catch {
      // ignore
    }
  };

  const refreshAccessToken = async (): Promise<string | null> => {
    if (!auth.refreshToken) {
      return null;
    }
    try {
      const res = await fetch('/api/v1/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: auth.refreshToken })
      });
      if (!res.ok) {
        throw new Error('refresh_failed');
      }
      const data = await res.json();
      if (!data.accessToken || !data.refreshToken) {
        throw new Error('invalid_refresh_response');
      }
      const newAuth: AuthState = {
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        user: data.user || auth.user
      };
      saveAuth(newAuth);
      return data.accessToken;
    } catch {
      saveAuth({ accessToken: null, refreshToken: null, user: null });
      setIsLoggedIn(false);
      setActiveView('welcome');
      return null;
    }
  };

  const loadWords = async (token: string) => {
    try {
      let res = await fetch('/api/v1/words', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.status === 401) {
        const newToken = await refreshAccessToken();
        if (newToken) {
          res = await fetch('/api/v1/words', {
            headers: { Authorization: `Bearer ${newToken}` }
          });
        } else {
          return;
        }
      }
      if (!res.ok) {
        return;
      }
      const data = await res.json();
      if (Array.isArray(data?.words)) {
        setWords(data.words);
      }
    } catch {
      return;
    }
  };

  const loadBooks = async (token: string) => {
    try {
      let res = await fetch('/api/v1/books', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.status === 401) {
        const newToken = await refreshAccessToken();
        if (newToken) {
          res = await fetch('/api/v1/books', {
            headers: { Authorization: `Bearer ${newToken}` }
          });
        } else {
          return;
        }
      }
      if (!res.ok) {
        return;
      }
      const data = await res.json();
      if (Array.isArray(data?.books)) {
        setBooks(data.books);
      }
    } catch {
      return;
    }
  };

  const sendVerificationCode = async (email: string, type: 'register' | 'reset'): Promise<{ ok: boolean; error?: string }> => {
    try {
      const res = await fetch('/api/v1/auth/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, type })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        return { ok: false, error: data?.error || 'send_code_failed' };
      }
      return { ok: true };
    } catch {
      return { ok: false, error: 'network_error' };
    }
  };

  const handleRegister = async (email: string, password: string, code: string, nickname?: string): Promise<boolean> => {
    setAuthError(null);
    try {
      const res = await fetch('/api/v1/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, code, nickname })
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setAuthError(data?.error || 'registration_failed');
        return false;
      }
      const data = await res.json();
      const newAuth: AuthState = {
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        user: data.user
      };
      saveAuth(newAuth);
      setIsLoggedIn(true);
      setActiveView('dashboard');
      await loadWords(data.accessToken);
      await loadBooks(data.accessToken);
      return true;
    } catch {
      setAuthError('network_error');
      return false;
    }
  };

  const handleLogin = async (email: string, password: string, remember: boolean): Promise<boolean> => {
    setAuthError(null);
    try {
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, remember })
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setAuthError(data?.error || 'login_failed');
        return false;
      }
      const data = await res.json();
      const newAuth: AuthState = {
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        user: data.user
      };
      saveAuth(newAuth);
      setIsLoggedIn(true);
      setActiveView('dashboard');
      await loadWords(data.accessToken);
      await loadBooks(data.accessToken);
      return true;
    } catch {
      setAuthError('network_error');
      return false;
    }
  };

  const handleResetPasswordVerify = async (email: string, code: string): Promise<{ ok: boolean; resetToken?: string; error?: string }> => {
    try {
      const res = await fetch('/api/v1/auth/reset-password-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        return { ok: false, error: data?.error || 'verify_failed' };
      }
      return { ok: true, resetToken: data.resetToken };
    } catch {
      return { ok: false, error: 'network_error' };
    }
  };

  const handleResetPassword = async (resetToken: string, newPassword: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/v1/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resetToken, newPassword })
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setAuthError(data?.error || 'reset_failed');
        return false;
      }
      const data = await res.json();
      const newAuth: AuthState = {
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        user: data.user
      };
      saveAuth(newAuth);
      setIsLoggedIn(true);
      setActiveView('profile');
      await loadWords(data.accessToken);
      await loadBooks(data.accessToken);
      return true;
    } catch {
      setAuthError('network_error');
      return false;
    }
  };

  const handleUpdateProfile = async (data: { nickname?: string; avatar?: number }): Promise<boolean> => {
    try {
      let token = auth.accessToken;
      if (!token) {
        throw new Error('not_logged_in');
      }
      let res = await fetch('/api/v1/user', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(data)
      });
      if (res.status === 401) {
        const newToken = await refreshAccessToken();
        if (newToken) {
          res = await fetch('/api/v1/user', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${newToken}` },
            body: JSON.stringify(data)
          });
        } else {
          throw new Error('token_refresh_failed');
        }
      }
      if (!res.ok) {
        throw new Error('request_failed');
      }
      const result = await res.json();
      if (result.user) {
        const newAuth: AuthState = {
          ...auth,
          user: result.user
        };
        saveAuth(newAuth);
      }
      return true;
    } catch {
      return false;
    }
  };

  const getAvatars = async (): Promise<string[]> => {
    try {
      const res = await fetch('/api/v1/avatars');
      if (!res.ok) {
        return [];
      }
      const data = await res.json();
      return data.avatars || [];
    } catch {
      return [];
    }
  };

  const handleChangePassword = async (oldPassword: string, newPassword: string): Promise<{ ok: boolean; error?: string }> => {
    try {
      let token = auth.accessToken;
      if (!token) {
        throw new Error('not_logged_in');
      }
      let res = await fetch('/api/v1/user/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ oldPassword, newPassword })
      });
      if (res.status === 401) {
        const newToken = await refreshAccessToken();
        if (newToken) {
          res = await fetch('/api/v1/user/change-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${newToken}` },
            body: JSON.stringify({ oldPassword, newPassword })
          });
        } else {
          throw new Error('token_refresh_failed');
        }
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        return { ok: false, error: data?.error || 'change_failed' };
      }
      return { ok: true };
    } catch {
      return { ok: false, error: 'network_error' };
    }
  };

  // 正常的退出登录
  const handleLogout = async () => {
    try {
      if (auth.accessToken) {
        await fetch('/api/v1/auth/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${auth.accessToken}` }
        }).catch(() => {});
      }
    } catch {
      // ignore
    }
    // Clear localStorage
    localStorage.removeItem('wordbase_auth');
    localStorage.removeItem('wordbase-selected-book');
    // Reset state
    setAuth({ accessToken: null, refreshToken: null, user: null });
    setIsLoggedIn(false);
    setActiveView('welcome');
    setWords(initialWords);
    setBooks(initialVocabularyBooks);
    setModels(mockDefaultModels);
    setSelectedWordId('w1');
    setSelectedBookId('default');
  };

  // 注销账号（删除所有数据）
  const handleDeleteAccount = async () => {
    try {
      if (auth.accessToken) {
        await fetch('/api/v1/auth/delete-account', {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${auth.accessToken}` }
        }).catch(() => {});
      }
    } catch {
      // ignore
    }
    // Clear localStorage
    localStorage.removeItem('wordbase_auth');
    localStorage.removeItem('wordbase-selected-book');
    // Reset state
    setAuth({ accessToken: null, refreshToken: null, user: null });
    setIsLoggedIn(false);
    setActiveView('welcome');
    setWords(initialWords);
    setBooks(initialVocabularyBooks);
    setModels(mockDefaultModels);
    setSelectedWordId('w1');
    setSelectedBookId('default');
  };

  useEffect(() => {
    if (isLoggedIn && auth.accessToken) {
      loadWords(auth.accessToken);
    }
  }, [isLoggedIn, auth.accessToken]);

  useEffect(() => {
    setBooks(prev => prev.map(b => {
      const count = words.filter(w => w.bookId === b.id).length;
      return { ...b, wordCount: count };
    }));
  }, [words]);

  useEffect(() => {
    if (words.length === 0) {
      return;
    }
    const exists = words.some(w => w.id === selectedWordId);
    if (!exists) {
      setSelectedWordId(words[0].id);
    }
  }, [words, selectedWordId]);

  const handleToggleModel = (modelId: string) => {
    setModels(prev => prev.map(m => {
      if (m.id === modelId) {
        return { ...m, isActive: !m.isActive };
      }
      return m;
    }));
  };

  const handleAddCustomModel = (newModel: Omit<AIModel, 'id' | 'isActive'>) => {
    const id = `engine-${Date.now()}`;
    const modelItem: AIModel = {
      ...newModel,
      id,
      isActive: false
    };
    setModels(prev => [...prev, modelItem]);
  };

  const handleAddWord = async (newWordData: Omit<Word, 'id'>) => {
    try {
      let token = auth.accessToken;
      if (!token) {
        throw new Error('not_logged_in');
      }
      let res = await fetch('/api/v1/words', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(newWordData)
      });
      if (res.status === 401) {
        const newToken = await refreshAccessToken();
        if (newToken) {
          res = await fetch('/api/v1/words', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${newToken}` },
            body: JSON.stringify(newWordData)
          });
        } else {
          throw new Error('token_refresh_failed');
        }
      }
      if (!res.ok) {
        throw new Error('request_failed');
      }
      const data = await res.json();
      const savedWord = data?.word as Word | undefined;
      const duplicate = Boolean(data?.duplicate);
      if (savedWord && !duplicate) {
        setWords(prev => [savedWord, ...prev]);
      }
      if (savedWord && duplicate) {
        setWords(prev => {
          const exists = prev.some(w => w.id === savedWord.id);
          return exists ? prev : [savedWord, ...prev];
        });
      }
      return;
    } catch {
      const wordId = `word-${Date.now()}`;
      const item: Word = {
        ...newWordData,
        id: wordId
      };
      setWords(prev => [item, ...prev]);
    }
  };

  const handleCreateBook = async (bookData: Omit<VocabularyBook, 'id' | 'wordCount' | 'userId' | 'createdAt' | 'updatedAt'>) => {
    try {
      let token = auth.accessToken;
      if (!token) {
        throw new Error('not_logged_in');
      }
      let res = await fetch('/api/v1/books', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(bookData)
      });
      if (res.status === 401) {
        const newToken = await refreshAccessToken();
        if (newToken) {
          res = await fetch('/api/v1/books', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${newToken}` },
            body: JSON.stringify(bookData)
          });
        } else {
          return;
        }
      }
      if (!res.ok) {
        return;
      }
      const data = await res.json();
      if (data.book) {
        setBooks(prev => [...prev, data.book]);
      }
    } catch {
      // Fallback to local creation
      const newBook: VocabularyBook = {
        ...bookData,
        id: `book-${Date.now()}`,
        userId: '',
        wordCount: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        isSync: false
      };
      setBooks(prev => [...prev, newBook]);
    }
  };

  const handleSetSyncBook = async (bookId: string) => {
    try {
      if (auth.accessToken) {
        const response = await fetch(`/api/v1/books/${bookId}/set-sync`, {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${auth.accessToken}` }
        });
        const data = await response.json();
        if (data.ok && data.books) {
          setBooks(data.books);
        }
      }
    } catch (e) {
      // 网络错误时，回退到本地更新
      setBooks(prev => {
        const newBooks = prev.map(b => ({
          ...b,
          isSync: b.id === bookId
        }));
        const syncBook = newBooks.find(b => b.id === bookId);
        const otherBooks = newBooks.filter(b => b.id !== bookId);
        if (syncBook) {
          return [syncBook, ...otherBooks];
        }
        return newBooks;
      });
    }
  };

  const handleDeleteBooks = async (bookIds: string[]) => {
    try {
      if (auth.accessToken) {
        await fetch('/api/v1/books/batch-delete', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            Authorization: `Bearer ${auth.accessToken}` 
          },
          body: JSON.stringify({ bookIds })
        });
        // 更新本地状态
        setBooks(prev => prev.filter(b => !bookIds.includes(b.id)));
        setWords(prev => prev.filter(w => !bookIds.includes(w.bookId)));
      }
    } catch (e) {
      // 网络错误时，回退到本地更新
      setBooks(prev => prev.filter(b => !bookIds.includes(b.id)));
      setWords(prev => prev.filter(w => !bookIds.includes(w.bookId)));
    }
  };

  const handleUpdateFamiliarity = (wordId: string, levelValue: number) => {
    setWords(prev => prev.map(w => {
      if (w.id === wordId) {
        return { ...w, familiarity: levelValue };
      }
      return w;
    }));
  };

  const handleDeleteWords = (wordIds: string[]) => {
    setWords(prev => prev.filter(w => !wordIds.includes(w.id)));
  };

  const handleMoveWords = (wordIds: string[], targetBookId: string) => {
    setWords(prev => prev.map(w => {
      if (wordIds.includes(w.id)) {
        return { ...w, bookId: targetBookId };
      }
      return w;
    }));
  };

  // Find currently active word card
  const activeWordCard = words.find(w => w.id === selectedWordId) || words[0];
  
  // State to track the selected book ID
  const [selectedBookId, setSelectedBookId] = useState<string>('');

  // 当 books 加载完成或 auth 变化时，设置默认选中的单词本
  useEffect(() => {
    if (books.length > 0) {
      // 优先选中同步的单词本
      const syncBook = books.find(b => b.isSync);
      if (syncBook) {
        setSelectedBookId(syncBook.id);
        return;
      }
      // 否则选中第一个
      setSelectedBookId(books[0].id);
    }
  }, [books]);

  // Router dispatcher
  const renderMainView = () => {
    if (!isLoggedIn) {
      return (
        <WelcomeLoginView 
          themeStyles={themeStyles} 
          onLogin={handleLogin}
          onRegister={handleRegister}
          onSendCode={sendVerificationCode}
          onResetPasswordVerify={handleResetPasswordVerify}
          onResetPassword={handleResetPassword}
          authError={authError}
          setAuthError={setAuthError}
        />
      );
    }

    // Extract book ID from activeView if it's a special format
    const navigateToBook = activeView.startsWith('vocabulary-');
    const bookIdFromNavigation = navigateToBook ? activeView.slice('vocabulary-'.length) : null;
    const finalSelectedBookId = bookIdFromNavigation || selectedBookId;

    // Update state and localStorage if we're navigating to a specific book
    if (navigateToBook && bookIdFromNavigation && bookIdFromNavigation !== selectedBookId) {
      setSelectedBookId(bookIdFromNavigation);
      localStorage.setItem('wordbase-selected-book', bookIdFromNavigation);
    }

    // Vocabulary view (including specific book)
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
            localStorage.setItem('wordbase-selected-book', id);
            setActiveView(`vocabulary-${id}`);
          }}
          onDeleteWords={handleDeleteWords}
          onMoveWords={handleMoveWords}
        />
      );
    }

    // Other views
    switch (activeView) {
      case 'dashboard':
        return (
          <DashboardView 
            themeStyles={themeStyles} 
            onNavigate={setActiveView} 
            books={books}
            words={words}
          />
        );
      case 'worddetail':
        return (
          <WordDetailView
            themeStyles={themeStyles}
            onNavigate={setActiveView}
            word={activeWordCard}
            onUpdateFamiliarity={handleUpdateFamiliarity}
          />
        );
      case 'mylists':
        return (
          <MyListsView 
            themeStyles={themeStyles} 
            onNavigate={(view) => {
              if (view.startsWith('vocabulary-')) {
                setActiveView(view);
              } else {
                setActiveView(view);
              }
            }}
            books={books}
            onCreateBook={handleCreateBook}
            onSetSyncBook={handleSetSyncBook}
            onDeleteBooks={handleDeleteBooks}
          />
        );
      case 'stories':
        return (
          <StudyScenarioView 
            themeStyles={themeStyles} 
            stories={initialStories} 
            words={words}
          />
        );
      case 'practice':
        return (
          <PracticeMainView 
            themeStyles={themeStyles} 
            onNavigate={setActiveView} 
          />
        );
      case 'practice-listening':
        return (
          <ListeningPracticeView 
            themeStyles={themeStyles} 
            onNavigate={setActiveView} 
            quizzes={listeningQuizzes}
          />
        );
      case 'practice-speaking':
        return (
          <SpeakingPracticeView 
            themeStyles={themeStyles} 
            onNavigate={setActiveView} 
          />
        );
      case 'practice-reading':
        return (
          <ReadingPracticeView 
            themeStyles={themeStyles} 
            onNavigate={setActiveView} 
          />
        );
      case 'practice-writing':
        return (
          <WritingPracticeView 
            themeStyles={themeStyles} 
            onNavigate={setActiveView} 
          />
        );
      case 'profile':
        return (
          <div className={`${themeStyles.card} p-6`}>
            <div className="flex items-center justify-between mb-6">
              <h2 className={`text-2xl font-bold ${themeStyles.textPrimary}`}>个人中心</h2>
              <button 
                onClick={() => setActiveView('dashboard')}
                className={`${themeStyles.btnSecondary} px-4 py-2 text-sm`}
              >
                返回
              </button>
            </div>
            
            <div className="space-y-8">
              {/* 头像 */}
              <div>
                <h3 className={`text-lg font-semibold ${themeStyles.textPrimary} mb-4`}>头像</h3>
                <ProfileAvatarSelect 
                  themeStyles={themeStyles}
                  currentAvatar={auth.user?.avatar || 0}
                  onUpdate={handleUpdateProfile}
                  getAvatars={getAvatars}
                />
              </div>
              
              {/* 个人信息 */}
              <div>
                <h3 className={`text-lg font-semibold ${themeStyles.textPrimary} mb-4`}>基本信息</h3>
                <div className="space-y-4">
                  <div className={`p-4 rounded-lg ${themeStyles.secondaryBg}`}>
                    <label className="block text-sm font-medium text-neutral-500 mb-2">邮箱</label>
                    <div className={themeStyles.textPrimary}>{auth.user?.email}</div>
                  </div>
                  <div className={`p-4 rounded-lg ${themeStyles.secondaryBg}`}>
                    <label className="block text-sm font-medium text-neutral-500 mb-2">昵称</label>
                    <ProfileNicknameEdit 
                      themeStyles={themeStyles}
                      currentNickname={auth.user?.nickname || auth.user?.email?.split('@')[0] || ''}
                      onUpdate={handleUpdateProfile}
                    />
                  </div>
                </div>
              </div>

              {/* 修改密码 */}
              <div>
                <h3 className={`text-lg font-semibold ${themeStyles.textPrimary} mb-4`}>修改密码</h3>
                <ProfilePasswordChange 
                  themeStyles={themeStyles}
                  onChangePassword={handleChangePassword}
                />
              </div>
            </div>
          </div>
        );
      
      // Settings Sub-screens Grouping
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
                user={auth.user}
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
        return (
          <DashboardView 
            themeStyles={themeStyles} 
            onNavigate={setActiveView} 
            books={books}
            words={words}
          />
        );
    }
  };

  return (
    <div 
      className={`${themeStyles.bodyBg} flex flex-col justify-between transition-colors duration-500`}
      style={theme === 'glass' ? {
        backgroundImage: 'radial-gradient(at 0% 0%, rgba(99, 102, 241, 0.4) 0px, transparent 50%), radial-gradient(at 100% 0%, rgba(232, 121, 249, 0.4) 0px, transparent 50%), radial-gradient(at 50% 100%, rgba(30, 41, 59, 1) 0px, transparent 80%)',
        backgroundColor: '#0f172a'
      } : undefined}
    >
      {/* Decorative gradient glow effect (for glassmorphism theme) */}
      {themeStyles.glowEffect && <div className={themeStyles.glowEffect} />}

      {/* Global Navbar */}
      <Navbar 
        theme={theme} 
        onThemeChange={setTheme} 
        themeStyles={themeStyles} 
        isLoggedIn={isLoggedIn}
        onNavigate={setActiveView}
        onLogout={handleLogout}
        activeView={activeView}
        user={auth.user}
      />

      {/* Main Workspace Frame */}
      <main className={`flex-grow w-full max-w-7xl mx-auto ${isCompactMode ? 'p-3 my-4' : 'px-6 py-8 my-6'}`}>
        {!isLoggedIn || activeView === 'welcome' ? (
          /* Plain center layout when not authenticated */
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
                onLogin={handleLogin}
                onRegister={handleRegister}
                onSendCode={sendVerificationCode}
                onResetPasswordVerify={handleResetPasswordVerify}
                onResetPassword={handleResetPassword}
                authError={authError}
                setAuthError={setAuthError}
              />
            </motion.div>
          </AnimatePresence>
        ) : (
          /* Sidebar + Main Grid Split when authenticated */
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Nav Side Rail */}
            <div className="lg:col-span-1">
              <Sidebar 
                activeView={activeView} 
                onNavigate={setActiveView} 
                themeStyles={themeStyles} 
                user={auth.user}
              />
            </div>

            {/* Stage content layout */}
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

      {/* Visual Workspace footer signature */}
      <footer className="w-full border-t border-neutral-200 dark:border-white/5 py-4 text-center text-[10px] font-mono text-neutral-400 mt-12 bg-black/5 dark:bg-white/5">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>WordScene AI Standard Curriculum • Licensed to Learner Pro 2026</span>
          <div className="flex space-x-3">
            <button onClick={() => setActiveView('dashboard')} className="hover:underline">Dashboard</button>
            <span>•</span>
            <button onClick={() => setActiveView('settings-appearance')} className="hover:underline">Visuals Canvas</button>
          </div>
        </div>
      </footer>
    </div>
  );
}

// 个人中心子组件
function ProfileNicknameEdit({ 
  themeStyles, 
  currentNickname, 
  onUpdate 
}: { 
  themeStyles: any;
  currentNickname: string;
  onUpdate: (data: { nickname?: string; avatar?: number }) => Promise<boolean>;
}) {
  const [nickname, setNickname] = useState(currentNickname);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const handleSave = async () => {
    if (!nickname.trim()) return;
    setIsLoading(true);
    setMessage(null);
    try {
      const success = await onUpdate({ nickname: nickname.trim() });
      if (success) {
        setMessage({ text: '更新成功！', type: 'success' });
        setIsEditing(false);
      } else {
        setMessage({ text: '更新失败', type: 'error' });
      }
    } catch {
      setMessage({ text: '更新失败', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      {message && (
        <div className={`mb-4 p-3 rounded-lg text-sm ${message.type === 'success' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'}`}>
          {message.text}
        </div>
      )}
      {isEditing ? (
        <div className="flex gap-3">
          <input 
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            className={`flex-1 px-3 py-2 bg-white dark:bg-zinc-800 border border-neutral-300 dark:border-white/10 rounded-lg ${themeStyles.textPrimary}`}
            autoFocus
          />
          <button 
            onClick={handleSave}
            disabled={isLoading}
            className={`${themeStyles.btnPrimary} px-4 py-2 text-sm`}
          >
            {isLoading ? '保存中...' : '保存'}
          </button>
          <button 
            onClick={() => { setIsEditing(false); setNickname(currentNickname); }}
            className={`${themeStyles.btnSecondary} px-4 py-2 text-sm`}
          >
            取消
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <span className={themeStyles.textPrimary}>{nickname}</span>
          <button 
            onClick={() => setIsEditing(true)}
            className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            编辑
          </button>
        </div>
      )}
    </div>
  );
}

function ProfilePasswordChange({
  themeStyles,
  onChangePassword
}: {
  themeStyles: any;
  onChangePassword: (oldPassword: string, newPassword: string) => Promise<{ ok: boolean; error?: string }>;
}) {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setMessage({ text: '两次输入的密码不一致', type: 'error' });
      return;
    }
    if (newPassword.length < 6) {
      setMessage({ text: '密码至少需要6个字符', type: 'error' });
      return;
    }
    setIsLoading(true);
    setMessage(null);
    try {
      const result = await onChangePassword(oldPassword, newPassword);
      if (result.ok) {
        setMessage({ text: '密码修改成功！', type: 'success' });
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setMessage({ text: result.error || '修改失败', type: 'error' });
      }
    } catch {
      setMessage({ text: '修改失败', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={`space-y-4 p-6 rounded-lg ${themeStyles.card}`}>
      {message && (
        <div className={`p-3 rounded-lg text-sm ${message.type === 'success' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'}`}>
          {message.text}
        </div>
      )}
      <div>
        <label className={`block text-sm font-medium mb-2 ${themeStyles.textPrimary}`}>当前密码</label>
        <input 
          type="password"
          value={oldPassword}
          onChange={(e) => setOldPassword(e.target.value)}
          className={`w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-neutral-300 dark:border-white/10 rounded-lg ${themeStyles.textPrimary}`}
          required
        />
      </div>
      <div>
        <label className={`block text-sm font-medium mb-2 ${themeStyles.textPrimary}`}>新密码</label>
        <input 
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className={`w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-neutral-300 dark:border-white/10 rounded-lg ${themeStyles.textPrimary}`}
          required
          minLength={6}
        />
      </div>
      <div>
        <label className={`block text-sm font-medium mb-2 ${themeStyles.textPrimary}`}>确认新密码</label>
        <input 
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className={`w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-neutral-300 dark:border-white/10 rounded-lg ${themeStyles.textPrimary}`}
          required
          minLength={6}
        />
      </div>
      <button 
        type="submit"
        disabled={isLoading}
        className={`w-full ${themeStyles.btnPrimary} py-2.5 mt-2`}
      >
        {isLoading ? '修改中...' : '修改密码'}
      </button>
    </form>
  );
}

function ProfileAvatarSelect({
  themeStyles,
  currentAvatar,
  onUpdate,
  getAvatars
}: {
  themeStyles: any;
  currentAvatar: number;
  onUpdate: (data: { nickname?: string; avatar?: number }) => Promise<boolean>;
  getAvatars: () => Promise<string[]>;
}) {
  const [avatars, setAvatars] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    const loadAvatars = async () => {
      const avatarsList = await getAvatars();
      setAvatars(avatarsList);
    };
    loadAvatars();
  }, []);

  const handleSelectAvatar = async (index: number) => {
    setIsLoading(true);
    setMessage(null);
    try {
      const success = await onUpdate({ avatar: index });
      if (success) {
        setMessage({ text: '头像更新成功！', type: 'success' });
      } else {
        setMessage({ text: '更新失败', type: 'error' });
      }
    } catch {
      setMessage({ text: '更新失败', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      {message && (
        <div className={`mb-4 p-3 rounded-lg text-sm ${message.type === 'success' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'}`}>
          {message.text}
        </div>
      )}
      <div className="grid grid-cols-5 gap-3">
        {avatars.map((avatar, index) => (
          <button
            key={index}
            onClick={() => handleSelectAvatar(index)}
            disabled={isLoading}
            className={`p-2 rounded-lg border-2 transition-all ${
              currentAvatar === index
                ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30'
                : 'border-neutral-200 dark:border-white/10 hover:border-indigo-300 dark:hover:border-indigo-600'
            }`}
          >
            <div
              dangerouslySetInnerHTML={{ __html: avatar }}
              className="w-16 h-16 mx-auto"
            />
          </button>
        ))}
      </div>
    </div>
  );
}
