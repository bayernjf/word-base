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

export default function App() {
  const [theme, setTheme] = useState<ThemeType>('glass');
  const [activeView, setActiveView] = useState<string>('dashboard');
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(true); // start logged in for immediate preview fidelity
  const [isCompactMode, setIsCompactMode] = useState<boolean>(false);
  const [isSmallTypography, setIsSmallTypography] = useState<boolean>(false);
  const [words, setWords] = useState<Word[]>(initialWords);
  const [books, setBooks] = useState<VocabularyBook[]>(initialVocabularyBooks);
  const [models, setModels] = useState<AIModel[]>(mockDefaultModels);
  const [selectedWordId, setSelectedWordId] = useState<string>('w1');
  const [apiToken, setApiToken] = useState<string>(() => {
    try {
      return localStorage.getItem('wordbase_token') || '';
    } catch {
      return '';
    }
  });

  const themeStyles = getThemeClasses(theme, isSmallTypography);

  useEffect(() => {
    const ensureToken = async () => {
      if (apiToken) {
        return apiToken;
      }
      try {
        const res = await fetch('/api/v1/session/bootstrap', { method: 'POST' });
        if (!res.ok) throw new Error('bootstrap_failed');
        const data = await res.json();
        const token = typeof data?.token === 'string' ? data.token : '';
        if (!token) throw new Error('bootstrap_failed');
        localStorage.setItem('wordbase_token', token);
        setApiToken(token);
        return token;
      } catch {
        return '';
      }
    };

    const loadWords = async () => {
      const token = await ensureToken();
      if (!token) {
        return;
      }
      try {
        const res = await fetch('/api/v1/words', {
          headers: { Authorization: `Bearer ${token}` }
        });
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

    loadWords();
  }, [apiToken]);

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
      // If setting static primary active model, could optionally deactivate others
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
      let token = apiToken || '';
      if (!token) {
        const bootstrap = await fetch('/api/v1/session/bootstrap', { method: 'POST' });
        if (bootstrap.ok) {
          const data = await bootstrap.json();
          const next = typeof data?.token === 'string' ? data.token : '';
          if (next) {
            localStorage.setItem('wordbase_token', next);
            setApiToken(next);
            token = next;
          }
        }
      }
      if (!token) {
        throw new Error('bootstrap_failed');
      }
      const res = await fetch('/api/v1/words', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(newWordData)
      });
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

  const handleCreateBook = (bookData: Omit<VocabularyBook, 'id' | 'wordCount' | 'progress'>) => {
    const bId = `book-${Date.now()}`;
    const item: VocabularyBook = {
      ...bookData,
      id: bId,
      wordCount: 0,
      progress: 0
    };
    setBooks(prev => [...prev, item]);
  };

  const handleUpdateFamiliarity = (wordId: string, levelValue: number) => {
    setWords(prev => prev.map(w => {
      if (w.id === wordId) {
        return { ...w, familiarity: levelValue };
      }
      return w;
    }));
  };

  // Find currently active word card
  const activeWordCard = words.find(w => w.id === selectedWordId) || words[0];

  // Router dispatcher
  const renderMainView = () => {
    if (!isLoggedIn) {
      return (
        <WelcomeLoginView 
          themeStyles={themeStyles} 
          onLogin={() => { setIsLoggedIn(true); setActiveView('dashboard'); }} 
        />
      );
    }

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
      case 'vocabulary':
        return (
          <VocabularyListView 
            themeStyles={themeStyles} 
            onNavigate={setActiveView} 
            words={words}
            books={books}
            onSelectWord={setSelectedWordId}
            onAddWord={handleAddWord}
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
            onNavigate={setActiveView} 
            books={books}
            onCreateBook={handleCreateBook}
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
            {activeView === 'settings-account' && <AccountSettingsView themeStyles={themeStyles} />}
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
        onLogout={() => { setIsLoggedIn(false); setActiveView('welcome'); }}
        activeView={activeView}
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
                onLogin={() => { setIsLoggedIn(true); setActiveView('dashboard'); }} 
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
