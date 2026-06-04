import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, Square, Volume2, ArrowLeft, Plus, Search, ChevronRight, Check, AlertCircle, Sparkles, 
  Trash2, BookOpen, Clock, Award, Star, Mic, Send, RefreshCw, Upload, CheckCircle2, Lock, Eye, 
  ChevronDown, Settings, Database, Code, Sliders, Smartphone, Activity, BarChart3, HelpCircle, FileText
} from 'lucide-react';
import { Word, VocabularyBook, Story, ChatMessage, PracticeQuiz, AIModel, ThemeType } from '../types';
import { ThemeClasses } from './ThemeStyles';

// ==========================================
// 1. WELCOME / LOGIN VIEW (Page 1)
// ==========================================
interface LoginProps {
  themeStyles: ThemeClasses;
  onLogin: (email: string, password: string) => Promise<boolean>;
  onRegister: (email: string, password: string) => Promise<boolean>;
  authError?: string | null;
}

export const WelcomeLoginView: React.FC<LoginProps> = ({ themeStyles, onLogin, onRegister, authError }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      if (isRegister) {
        await onRegister(email, password);
      } else {
        await onLogin(email, password);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-4">
      <div className={`w-full max-w-md ${themeStyles.card}`}>
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-3 bg-indigo-500/10 rounded-2xl mb-3 text-indigo-600">
            <Sparkles className="w-8 h-8" />
          </div>
          <h2 className={`text-2xl font-bold ${themeStyles.textPrimary}`}>
            WordScene AI
          </h2>
          <p className={`text-sm mt-1 ${themeStyles.textSecondary}`}>
            {isRegister ? 'Begin your contextual fluency journey' : 'Contextual language learning workspace'}
          </p>
        </div>

        {isForgotPassword ? (
          <div>
            <h3 className={`text-lg font-semibold mb-3 ${themeStyles.textPrimary}`}>Reset Password</h3>
            <p className={`text-xs mb-4 ${themeStyles.textSecondary}`}>
              Enter your email to receive a password recovery link.
            </p>
            <form onSubmit={(e) => { e.preventDefault(); setIsForgotPassword(false); }} className="space-y-4">
              <div>
                <label className="block text-xs font-medium mb-1 uppercase tracking-wider">Email Address</label>
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-black/5 dark:bg-white/5 border border-neutral-300 dark:border-white/10 rounded-xl text-sm focus:outline-hidden focus:border-indigo-500" 
                  required
                />
              </div>
              <button type="submit" className={`w-full ${themeStyles.btnPrimary} py-2.5`}>
                Send Recovery Instructions
              </button>
              <button 
                type="button" 
                onClick={() => setIsForgotPassword(false)} 
                className="w-full text-center text-xs underline mt-2 block"
              >
                Back to Sign In
              </button>
            </form>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium mb-1 uppercase tracking-wider">Email Address</label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 bg-black/5 dark:bg-white/5 border border-neutral-300 dark:border-white/10 rounded-xl text-sm focus:outline-hidden focus:border-indigo-500" 
                required
              />
            </div>
            
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-xs font-medium uppercase tracking-wider">Password</label>
                <button 
                  type="button" 
                  onClick={() => setIsForgotPassword(true)}
                  className="text-xs hover:underline"
                >
                  Forgot?
                </button>
              </div>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 bg-black/5 dark:bg-white/5 border border-neutral-300 dark:border-white/10 rounded-xl text-sm focus:outline-hidden focus:border-indigo-500" 
                required
              />
            </div>

            {!isRegister && (
              <div className="flex items-center space-x-2">
                <input 
                  type="checkbox" 
                  id="remember" 
                  checked={rememberMe} 
                  onChange={() => setRememberMe(!rememberMe)}
                  className="rounded border-neutral-300Accent focus:ring-0 cursor-pointer"
                />
                <label htmlFor="remember" className={`text-xs select-none cursor-pointer ${themeStyles.textSecondary}`}>
                  Remember this device for 30 days
                </label>
              </div>
            )}

            {authError && (
              <div className="flex items-center space-x-2 p-2 bg-red-500/10 border border-red-500/30 rounded-lg text-red-500 text-xs">
                <AlertCircle className="w-4 h-4" />
                <span>{authError}</span>
              </div>
            )}
            <button type="submit" className={`w-full ${themeStyles.btnPrimary} py-2.5 flex items-center justify-center space-x-2`} disabled={isLoading}>
              {isLoading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <span>{isRegister ? 'Create Free Account' : 'Sign In'}</span>
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>

            <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t border-neutral-300 dark:border-white/10"></div>
              <span className="flex-shrink mx-4 text-[10px] text-neutral-400 uppercase tracking-widest">Or Continue With</span>
              <div className="flex-grow border-t border-neutral-300 dark:border-white/10"></div>
            </div>

            <div className="grid grid-cols-2 gap-3 font-mono text-xs">
              <button disabled
                type="button" 
                onClick={onLogin}
                className="flex items-center justify-center space-x-1.5 py-2 border border-neutral-300 dark:border-white/10 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
              >
                <span>Google</span>
              </button>
              <button disabled
                type="button" 
                onClick={onLogin}
                className="flex items-center justify-center space-x-1.5 py-2 border border-neutral-300 dark:border-white/10 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
              >
                <span>Apple</span>
              </button>
            </div>

            <div className="text-center pt-2">
              <button 
                type="button" 
                onClick={() => setIsRegister(!isRegister)}
                className="text-xs text-indigo-650 dark:text-indigo-400 font-medium hover:underline"
              >
                {isRegister ? 'Already have an account? Sign In' : "Don't have an account? Create an account"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};


// ==========================================
// 2. DASHBOARD VIEW (Page 2)
// ==========================================
interface DashboardProps {
  themeStyles: ThemeClasses;
  onNavigate: (view: string) => void;
  books: VocabularyBook[];
  words: Word[];
}

export const DashboardView: React.FC<DashboardProps> = ({ themeStyles, onNavigate, books, words }) => {
  const knownPercent = 65; // Simulated goal metric
  
  return (
    <div className="space-y-6">
      {/* Top Welcome Title Grid */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-linear-to-r from-indigo-500/10 to-purple-500/5 p-6 rounded-2xl border border-indigo-500/20">
        <div>
          <h2 className={`text-2xl font-bold tracking-tight ${themeStyles.textPrimary}`}>
            Welcome back, Learner! ✨
          </h2>
          <p className={`text-sm mt-1 ${themeStyles.textSecondary}`}>
            You are on a <span className="font-semibold text-emerald-600 dark:text-emerald-400">5-day streak</span>. Your intermediate vocabulary usage is active.
          </p>
        </div>
        <button 
          onClick={() => onNavigate('practice')}
          className={`${themeStyles.btnPrimary} flex items-center justify-center space-x-2 py-3 px-5`}
        >
          <Sparkles className="w-4 h-4 fill-white/20" />
          <span>Quick Start Study</span>
        </button>
      </div>

      {/* Grid: Daily Goal & Weekly Activity */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Daily Goal card (Progress circle) */}
        <div className={`${themeStyles.card} flex flex-col items-center justify-center py-8 text-center`}>
          <h3 className={`text-sm font-semibold uppercase tracking-wider mb-4 ${themeStyles.textPrimary}`}>
            Daily Goal Progress
          </h3>
          <div className="relative w-32 h-32 flex items-center justify-center">
            {/* SVG Progress Circle */}
            <svg className="w-full h-full transform -rotate-90">
              <circle 
                cx="64" cy="64" r="50" 
                className="stroke-neutral-250 dark:stroke-white/10" 
                strokeWidth="8" fill="transparent" 
              />
              <circle 
                cx="64" cy="64" r="50" 
                className="stroke-indigo-600 dark:stroke-indigo-400" 
                strokeWidth="8" fill="transparent" 
                strokeDasharray={2 * Math.PI * 50}
                strokeDashoffset={2 * Math.PI * 50 * (1 - knownPercent / 100)}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-2xl font-bold ${themeStyles.textPrimary}`}>
                {knownPercent}%
              </span>
              <span className="text-[10px] text-neutral-400 font-mono">13 / 20 Words</span>
            </div>
          </div>
          <p className={`text-xs mt-4 ${themeStyles.textSecondary} max-w-[200px]`}>
            7 more words to complete today's Business expansion goal.
          </p>
        </div>

        {/* Weekly Activity mini-dashboard bar chart */}
        <div className={`${themeStyles.card} md:col-span-2 flex flex-col justify-between`}>
          <div className="flex justify-between items-start mb-2">
            <div>
              <h3 className={`text-sm font-semibold uppercase tracking-wider ${themeStyles.textPrimary}`}>
                Weekly Study Minutes
              </h3>
              <p className={`text-xs ${themeStyles.textSecondary}`}>Activity breakdown by skills</p>
            </div>
            <span className="text-xs font-mono bg-indigo-500/10 px-2 py-1 rounded-md text-indigo-600 dark:text-indigo-400 font-bold">
              185 min total
            </span>
          </div>

          <div className="flex items-end justify-between h-36 pt-6 px-2">
            {[
              { day: 'Mon', mins: 45, items: 'Read 2 articles' },
              { day: 'Tue', mins: 20, items: 'Vocab expand' },
              { day: 'Wed', mins: 55, items: 'Speaking exercise' },
              { day: 'Thu', mins: 15, items: 'Listening quiz' },
              { day: 'Fri', mins: 30, items: 'Writing essay' },
              { day: 'Sat', mins: 0, items: 'Rest' },
              { day: 'Sun', mins: 20, items: 'Review session' }
            ].map((activity, idx) => (
              <div key={idx} className="flex flex-col items-center flex-1 group relative cursor-pointer">
                <div className="text-[10px] font-mono tracking-tighter opacity-0 group-hover:opacity-100 absolute -top-8 bg-neutral-800 text-white px-2 py-1 rounded-md whitespace-nowrap transition-opacity pointer-events-none z-10">
                  {activity.mins} min: {activity.items}
                </div>
                <div className="w-6 bg-slate-200 dark:bg-white/10 rounded-t-xs h-full flex items-end">
                  <div 
                    className="w-full bg-linear-to-t from-indigo-500 to-indigo-600 dark:from-indigo-400 dark:to-indigo-500 rounded-t-xs transition-all duration-500"
                    style={{ height: `${activity.mins > 0 ? (activity.mins / 60) * 100 : 4}%` }}
                  />
                </div>
                <span className="text-[10px] uppercase font-mono mt-2 text-neutral-400">{activity.day}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Grid: My Word lists */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className={`text-lg font-bold tracking-tight ${themeStyles.textPrimary}`}>
            My Active Vocabulary Books
          </h3>
          <button 
            onClick={() => onNavigate('mylists')} 
            className="text-xs font-medium text-indigo-650 dark:text-indigo-400 hover:underline flex items-center space-x-1 cursor-pointer"
          >
            <span>Manage All Bookbooks</span>
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {books.map((book) => (
            <div key={book.id} className={`${themeStyles.card} flex flex-col justify-between hover:scale-[1.01] transition-transform`}>
              <div>
                <span className={`${themeStyles.badgeClass} mb-2 inline-block`}>{book.level || 'B2'}</span>
                <h4 className={`text-sm font-bold ${themeStyles.textPrimary}`}>{book.name}</h4>
                <p className={`text-xs mt-1 ${themeStyles.textSecondary}`}>{book.description}</p>
              </div>
              <div className="mt-4 pt-3 border-t border-neutral-200 dark:border-white/10">
                <div className="flex justify-between text-[10px] font-mono mb-1">
                  <span>Progress</span>
                  <span>{book.progress}%</span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-white/10 rounded-xs h-1.5 overflow-hidden">
                  <div className="bg-indigo-650 dark:bg-indigo-400 h-full" style={{ width: `${book.progress}%` }} />
                </div>
                <button 
                  onClick={() => onNavigate('vocabulary')} 
                  className="w-full text-center text-xs mt-3 font-medium bg-indigo-550/10 hover:bg-indigo-550/20 py-1.5 rounded-lg text-indigo-600 dark:text-indigo-450 transition-colors"
                >
                  Open Study Desk
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};


// ==========================================
// 3. VOCABULARY LIST VIEW (Page 3)
// ==========================================
interface VocabularyProps {
  themeStyles: ThemeClasses;
  onNavigate: (view: string) => void;
  words: Word[];
  books: VocabularyBook[];
  onSelectWord: (wordId: string) => void;
  onAddWord: (word: Omit<Word, 'id'>) => void;
}

export const VocabularyListView: React.FC<VocabularyProps> = ({ 
  themeStyles, onNavigate, words, books, onSelectWord, onAddWord 
}) => {
  const [selectedBookId, setSelectedBookId] = useState('biz-eng');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newWord, setNewWord] = useState({
    word: '',
    phonetic: '',
    partOfSpeech: 'noun',
    definition: '',
    chineseTranslation: '',
    synonymsString: '',
    exampleEn: '',
    exampleZh: ''
  });

  const filteredWords = words
    .filter(w => w.bookId === selectedBookId)
    .filter(w => w.word.toLowerCase().includes(searchQuery.toLowerCase()) || 
                 w.definition.toLowerCase().includes(searchQuery.toLowerCase()) ||
                 w.chineseTranslation.includes(searchQuery));

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    onAddWord({
      word: newWord.word,
      phonetic: newWord.phonetic || '/.../',
      partOfSpeech: newWord.partOfSpeech,
      definition: newWord.definition,
      chineseTranslation: newWord.chineseTranslation,
      synonyms: newWord.synonymsString ? newWord.synonymsString.split(',').map(s => s.trim()) : [],
      examples: [{ en: newWord.exampleEn, zh: newWord.exampleZh }],
      usageHistory: [],
      level: 'B2',
      familiarity: 10,
      bookId: selectedBookId
    });
    
    // reset form
    setNewWord({
      word: '', phonetic: '', partOfSpeech: 'noun', definition: '', chineseTranslation: '', synonymsString: '', exampleEn: '', exampleZh: ''
    });
    setShowAddModal(false);
  };

  return (
    <div className="space-y-6 relative">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className={`text-xl font-bold tracking-tight ${themeStyles.textPrimary}`}>
            My Personal Wordbook
          </h2>
          <p className={`text-xs ${themeStyles.textSecondary}`}>
            Practice, review, and filter vocabulary from customized sets.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {/* Book switcher dropdown */}
          <div className="relative">
            <select 
              value={selectedBookId}
              onChange={(e) => setSelectedBookId(e.target.value)}
              className="px-3 py-2 bg-slate-100 dark:bg-white/10 border border-neutral-300 dark:border-white/15 rounded-xl text-xs pr-8 font-medium focus:outline-hidden text-neutral-800 dark:text-neutral-100 cursor-pointer"
            >
              {books.map(b => (
                <option key={b.id} value={b.id} className="text-black bg-stone-100">{b.name}</option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-3 text-neutral-400 pointer-events-none" />
          </div>

          <button 
            onClick={() => setShowAddModal(true)}
            className={`${themeStyles.btnPrimary} flex items-center space-x-1.5 py-2 text-xs font-semibold`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Word</span>
          </button>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="flex items-center space-x-2 bg-slate-100 dark:bg-white/5 border border-neutral-200 dark:border-white/5 px-3 py-2 rounded-xl">
        <Search className="w-4 h-4 text-neutral-400" />
        <input 
          type="text" 
          placeholder="Search word name, definition, or translation..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-transparent border-0 text-xs focus:ring-0 focus:outline-hidden"
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery('')} className="text-xs text-neutral-400 hover:text-indigo-650">Clear</button>
        )}
      </div>

      {/* Table Card */}
      <div className={`${themeStyles.card} overflow-x-auto`}>
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-neutral-200 dark:border-white/10 text-neutral-400 font-mono uppercase tracking-widest text-[10px]">
              <th className="py-3 px-4">Word</th>
              <th className="py-3 px-4">Lexical Unit</th>
              <th className="py-3 px-4">Core Definition & Translation</th>
              <th className="py-3 px-4">Confidence</th>
              <th className="py-3 px-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredWords.length > 0 ? (
              filteredWords.map(w => (
                <tr key={w.id} className="border-b border-neutral-100 dark:border-white/5 hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                  <td className="py-3.5 px-4">
                    <button 
                      onClick={() => { onSelectWord(w.id); onNavigate('worddetail'); }}
                      className={`font-semibold text-sm text-left hover:underline block ${themeStyles.accentText}`}
                    >
                      {w.word}
                    </button>
                    <span className="text-[10px] font-mono text-neutral-400 block">{w.phonetic}</span>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-neutral-400 italic">
                    {w.partOfSpeech}
                  </td>
                  <td className="py-3.5 px-4 max-w-sm">
                    <div className={`font-medium line-clamp-1 ${themeStyles.textPrimary}`}>{w.definition}</div>
                    <div className="text-neutral-400 text-[11px] mt-0.5">{w.chineseTranslation}</div>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex items-center space-x-2">
                      <div className="w-16 bg-slate-200 dark:bg-white/10 h-2 rounded-xs overflow-hidden">
                        <div 
                          className={`h-full ${w.familiarity > 75 ? 'bg-emerald-500' : w.familiarity > 40 ? 'bg-amber-400' : 'bg-rose-400'}`} 
                          style={{ width: `${w.familiarity}%` }}
                        />
                      </div>
                      <span className="font-mono text-[10px]">{w.familiarity}%</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button 
                      onClick={() => { onSelectWord(w.id); onNavigate('worddetail'); }}
                      className="text-xs text-indigo-650 dark:text-indigo-400 font-medium hover:underline inline-flex items-center"
                    >
                      <span>Study Card</span>
                      <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="text-center py-8 text-neutral-400">
                  No words matches your search parameters in this bookbook.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add word modal overlays */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className={`w-full max-w-xl ${themeStyles.card} shadow-2xl relative max-h-[90vh] overflow-y-auto`}>
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-neutral-200 dark:border-white/10">
              <h3 className={`text-lg font-bold ${themeStyles.textPrimary}`}>Add Word to book</h3>
              <button 
                onClick={() => setShowAddModal(false)}
                className="text-xs bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 p-1.5 rounded-lg"
              >
                Cancel
              </button>
            </div>
            
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-1">Word Spelling *</label>
                  <input 
                    type="text" 
                    value={newWord.word}
                    onChange={(e) => setNewWord({...newWord, word: e.target.value})}
                    placeholder="e.g., pivot"
                    className="w-full px-3 py-2 bg-black/5 dark:bg-white/5 border border-neutral-300 dark:border-white/10 rounded-xl text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-1">IPA Phonetics</label>
                  <input 
                    type="text" 
                    value={newWord.phonetic}
                    onChange={(e) => setNewWord({...newWord, phonetic: e.target.value})}
                    placeholder="/ˈpɪvət/"
                    className="w-full px-3 py-2 bg-black/5 dark:bg-white/5 border border-neutral-300 dark:border-white/10 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-1">Part of Speech *</label>
                  <select 
                    value={newWord.partOfSpeech}
                    onChange={(e) => setNewWord({...newWord, partOfSpeech: e.target.value})}
                    className="w-full px-3 py-2 bg-white dark:bg-stone-800 border border-neutral-300 dark:border-white/10 rounded-xl text-xs"
                  >
                    <option value="noun">noun</option>
                    <option value="verb">verb</option>
                    <option value="adjective">adjective</option>
                    <option value="adverb">adverb</option>
                    <option value="phrase">phrase</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-1">Synonyms (Comma sep)</label>
                  <input 
                    type="text" 
                    value={newWord.synonymsString}
                    onChange={(e) => setNewWord({...newWord, synonymsString: e.target.value})}
                    placeholder="reorient, veer, strategy cycle"
                    className="w-full px-3 py-2 bg-black/5 dark:bg-white/5 border border-neutral-300 dark:border-white/10 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1">Definition (English) *</label>
                <textarea 
                  value={newWord.definition}
                  onChange={(e) => setNewWord({...newWord, definition: e.target.value})}
                  placeholder="Define the word in conversational language."
                  rows={2}
                  className="w-full px-3 py-2 bg-black/5 dark:bg-white/5 border border-neutral-300 dark:border-white/10 rounded-xl text-xs"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1">Chinese Translation *</label>
                <input 
                  type="text" 
                  value={newWord.chineseTranslation}
                  onChange={(e) => setNewWord({...newWord, chineseTranslation: e.target.value})}
                  placeholder="中文释义"
                  className="w-full px-3 py-2 bg-black/5 dark:bg-white/5 border border-neutral-300 dark:border-white/10 rounded-xl text-xs"
                  required
                />
              </div>

              <div className="space-y-2 border-t border-neutral-200 dark:border-white/5 pt-2">
                <span className="block text-xs font-bold uppercase tracking-wider text-neutral-400">Context Example sentence</span>
                <input 
                  type="text" 
                  value={newWord.exampleEn}
                  onChange={(e) => setNewWord({...newWord, exampleEn: e.target.value})}
                  placeholder="English sentence"
                  className="w-full px-3 py-2 bg-black/5 dark:bg-white/5 border border-neutral-300 dark:border-white/10 rounded-xl text-xs"
                />
                <input 
                  type="text" 
                  value={newWord.exampleZh}
                  onChange={(e) => setNewWord({...newWord, exampleZh: e.target.value})}
                  placeholder="中文翻译"
                  className="w-full px-3 py-2 bg-black/5 dark:bg-white/5 border border-neutral-300 dark:border-white/10 rounded-xl text-xs"
                />
              </div>

              <button type="submit" className={`w-full ${themeStyles.btnPrimary} py-2 text-xs font-bold`}>
                Insert Into Selected book
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};


// ==========================================
// 4. WORD DETAIL VIEW (Page 4)
// ==========================================
interface WordDetailProps {
  themeStyles: ThemeClasses;
  onNavigate: (view: string) => void;
  word: Word | undefined;
  onUpdateFamiliarity: (wordId: string, level: number) => void;
}

export const WordDetailView: React.FC<WordDetailProps> = ({ 
  themeStyles, onNavigate, word, onUpdateFamiliarity 
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [showChineseExample, setShowChineseExample] = useState<Record<number, boolean>>({});

  if (!word) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-8 h-8 text-neutral-400 mx-auto mb-2" />
        <p className="text-sm">No word card active.</p>
        <button onClick={() => onNavigate('vocabulary')} className="mt-4 text-xs hover:underline text-indigo-650">
          Return to Vocabulary
        </button>
      </div>
    );
  }

  const handleSpeech = () => {
    setIsPlaying(true);
    const utterance = new SpeechSynthesisUtterance(word.word);
    utterance.lang = 'en-US';
    utterance.onend = () => setIsPlaying(false);
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="space-y-6">
      <button 
        onClick={() => onNavigate('vocabulary')}
        className="inline-flex items-center space-x-1 text-xs font-medium hover:underline text-neutral-500 cursor-pointer"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Back to Wordbook</span>
      </button>

      {/* Hero card */}
      <div className={`${themeStyles.card}`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral-200 dark:border-white/10 pb-6 mb-6">
          <div className="flex items-center space-x-3.5">
            <div>
              <div className="flex items-center space-x-2.5">
                <h2 className={`text-3xl font-extrabold tracking-tight ${themeStyles.textPrimary}`}>
                  {word.word}
                </h2>
                <span className="bg-indigo-500/10 px-2 py-0.5 text-indigo-600 dark:text-indigo-400 text-xs font-mono rounded-md uppercase font-semibold">
                  {word.partOfSpeech}
                </span>
                <span className="bg-slate-100 dark:bg-white/10 px-2 py-0.5 text-neutral-500 text-xs font-mono rounded-md">
                  {word.level}
                </span>
              </div>
              <p className="text-sm text-neutral-400 font-mono mt-1 flex items-center space-x-2">
                <span>{word.phonetic}</span>
                <button 
                  onClick={handleSpeech}
                  disabled={isPlaying}
                  className="p-1 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full text-indigo-600 dark:text-indigo-400 transition-colors cursor-pointer"
                >
                  <Volume2 className={`w-4 h-4 ${isPlaying ? 'animate-bounce' : ''}`} />
                </button>
              </p>
            </div>
          </div>

          <div className="flex flex-col items-end">
            <span className="text-[10px] text-neutral-400 font-mono uppercase tracking-wider mb-1">Word Confidence</span>
            <div className="flex items-center space-x-2">
              <input 
                type="range" 
                min="0" 
                max="100" 
                value={word.familiarity}
                onChange={(e) => onUpdateFamiliarity(word.id, Number(e.target.value))}
                className="w-32 accent-indigo-650 cursor-pointer"
              />
              <span className="font-mono text-xs font-bold">{word.familiarity}%</span>
            </div>
          </div>
        </div>

        {/* Translation card */}
        <div className="space-y-4">
          <div>
            <span className="text-[10px] font-mono uppercase text-neutral-400 tracking-wider">Definition</span>
            <p className={`text-base mt-0.5 font-medium ${themeStyles.textPrimary}`}>
              {word.definition}
            </p>
          </div>
          <div>
            <span className="text-[10px] font-mono uppercase text-neutral-400 tracking-wider">中文释义</span>
            <p className="text-base text-indigo-650 dark:text-indigo-400 font-semibold mt-0.5">
              {word.chineseTranslation}
            </p>
          </div>

          {word.synonyms.length > 0 && (
            <div>
              <span className="text-[10px] font-mono uppercase text-neutral-400 tracking-wider block mb-1">Synonyms / Thesaurus</span>
              <div className="flex flex-wrap gap-1.5">
                {word.synonyms.map((s, i) => (
                  <span key={i} className="bg-slate-100 dark:bg-white/5 border border-neutral-300 dark:border-white/10 text-xs px-2.5 py-0.5 rounded-full">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Examples section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className={`${themeStyles.card}`}>
          <h3 className={`text-sm font-semibold uppercase tracking-wider mb-3 ${themeStyles.textPrimary}`}>
            Practice Examples
          </h3>
          <div className="space-y-4">
            {word.examples.map((ex, i) => (
              <div key={i} className="p-3 bg-linear-to-r from-indigo-500/5 to-purple-500/5 rounded-xl border border-dotted border-indigo-500/20">
                <p className="text-xs font-medium italic">{ex.en}</p>
                {showChineseExample[i] ? (
                  <p className="text-[11px] text-indigo-600/80 dark:text-indigo-400/80 mt-1">{ex.zh}</p>
                ) : (
                  <button 
                    onClick={() => setShowChineseExample({...showChineseExample, [i]: true})} 
                    className="text-[9px] font-mono uppercase text-neutral-400 hover:text-indigo-600 mt-2 block"
                  >
                    Reveal Translation
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Real context / publication history */}
        <div className={`${themeStyles.card}`}>
          <h3 className={`text-sm font-semibold uppercase tracking-wider mb-3 ${themeStyles.textPrimary}`}>
            Real Publication Context
          </h3>
          <div className="space-y-4 font-serif">
            {word.usageHistory && word.usageHistory.length > 0 ? (
              word.usageHistory.map((hist, i) => (
                <div key={i} className="border-l-2 border-indigo-400 pl-3">
                  <p className="text-xs italic leading-relaxed">"{hist.context}"</p>
                  <p className="text-[10px] font-sans font-mono mt-1 text-neutral-400">— Source: {hist.source}</p>
                </div>
              ))
            ) : (
              <p className="text-xs text-neutral-400 font-sans italic">
                No archived corporate logs context active currently for this word card.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};


// ==========================================
// 5. MY LISTING PAGE (Page 5)
// ==========================================
interface MyListsProps {
  themeStyles: ThemeClasses;
  onNavigate: (view: string) => void;
  books: VocabularyBook[];
  onCreateBook: (book: Omit<VocabularyBook, 'id' | 'wordCount' | 'progress'>) => void;
}

export const MyListsView: React.FC<MyListsProps> = ({ themeStyles, onNavigate, books, onCreateBook }) => {
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [level, setLevel] = useState('B2');

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    onCreateBook({
      name: `${name} (${level})`,
      description: desc,
      icon: 'BookOpen'
    });
    setName('');
    setDesc('');
    setShowCreate(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className={`text-xl font-bold tracking-tight ${themeStyles.textPrimary}`}>Vocabulary Management</h2>
          <p className="text-xs text-neutral-400">Assemble word books, filter sets, and custom curriculum.</p>
        </div>
        <button 
          onClick={() => setShowCreate(!showCreate)} 
          className={`${themeStyles.btnPrimary} flex items-center space-x-1.5 py-2 text-xs font-semibold`}
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Wordbook</span>
        </button>
      </div>

      {showCreate && (
        <form onSubmit={handleCreate} className={`${themeStyles.card} space-y-4 max-w-xl`}>
          <h3 className="font-bold text-sm">Assemble New Word List</h3>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1">Book Name</label>
            <input 
              type="text" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Marketing Masterclass, Medical Terminology"
              className="w-full px-3 py-2 bg-black/5 dark:bg-white/5 border border-neutral-300 dark:border-white/10 rounded-xl text-xs"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1">Focus Difficulty Tier</label>
              <select 
                value={level} 
                onChange={(e) => setLevel(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-neutral-300 dark:border-white/10 rounded-xl text-xs"
              >
                <option value="A1">Elementary (A1-A2)</option>
                <option value="B1">Pre-Intermediate (B1)</option>
                <option value="B2">Intermediate (B2)</option>
                <option value="C1">Advanced (C1)</option>
                <option value="C2">Expert Fluent (C2)</option>
              </select>
            </div>
            <div>
              <span className="block text-xs font-semibold uppercase tracking-wider mb-1">Methodology</span>
              <span className="text-[10px] text-neutral-400 bg-neutral-200 dark:bg-white/10 p-2 rounded-lg block">Spacing intervals AI Tutor generated</span>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1">Short Description</label>
            <input 
              type="text" 
              value={desc}
              required
              onChange={(e) => setDesc(e.target.value)}
              placeholder="Aim or core target area details..."
              className="w-full px-3 py-2 bg-black/5 dark:bg-white/5 border border-neutral-300 dark:border-white/10 rounded-xl text-xs"
            />
          </div>
          <div className="flex gap-2">
            <button type="submit" className={`${themeStyles.btnPrimary} py-2 text-xs font-bold flex-1`}>
              Assemble Spacing Book
            </button>
            <button type="button" onClick={() => setShowCreate(false)} className={`${themeStyles.btnSecondary} py-2 text-xs flex-1`}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Wordbooks Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {books.map(b => (
          <div key={b.id} className={`${themeStyles.card} flex flex-col justify-between hover:scale-[1.01] transition-transform`}>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="p-2 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-xl">
                  <BookOpen className="w-4 h-4" />
                </span>
                <span className="font-mono text-[10px] tracking-widest text-neutral-400 uppercase">
                  {b.wordCount} words loaded
                </span>
              </div>
              <h3 className={`font-bold text-sm ${themeStyles.textPrimary}`}>{b.name}</h3>
              <p className={`text-xs mt-1 leading-relaxed ${themeStyles.textSecondary}`}>{b.description}</p>
            </div>
            
            <div className="mt-4 pt-3 border-t border-neutral-200 dark:border-white/10 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-neutral-400">Confidence Rate</span>
                <span className="font-mono font-semibold">{b.progress}%</span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-white/10 h-1.5 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500" style={{ width: `${b.progress}%` }} />
              </div>
              <button 
                onClick={() => onNavigate('vocabulary')}
                className="w-full bg-indigo-600 text-white dark:bg-indigo-500/20 py-2 rounded-xl text-xs font-semibold hover:bg-indigo-700 dark:hover:bg-indigo-500/30 transition-colors"
              >
                Access Workbook
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};


// ==========================================
// 6. STUDY SCENARIO / AI STORIES (Page 6)
// ==========================================
interface StudyScenarioProps {
  themeStyles: ThemeClasses;
  stories: Story[];
  words: Word[];
}

export const StudyScenarioView: React.FC<StudyScenarioProps> = ({ themeStyles, stories, words }) => {
  const [selectedWord, setSelectedWord] = useState<Word | null>(null);
  const [chats, setChats] = useState<ChatMessage[]>([
    { id: '1', sender: 'ai', text: 'Hello! I am your WordScene English Tutor. Click on any highlighted word in the story to view translations, synonyms, or grammar structure. Or feel free to query me about idioms in this passage!', timestamp: '09:05 AM' }
  ]);
  const [message, setMessage] = useState('');
  const [showChinese, setShowChinese] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  const activeStory = stories[0];

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chats]);

  const handleWordClick = (wordSpelling: string) => {
    const cleanWord = wordSpelling.replace(/[,.()]/g, '').toLowerCase();
    const match = words.find(w => w.word.toLowerCase() === cleanWord);
    if (match) {
      setSelectedWord(match);
      // Auto tutor comment
      setChats(prev => [
        ...prev,
        {
          id: String(Date.now()),
          sender: 'ai',
          text: `🔍 Loaded vocabulary profile for "${match.word}": It means "${match.chineseTranslation}" (${match.partOfSpeech}). Core concept: ${match.definition}. Here is a synonym: ${match.synonyms[0] || 'N/A'}.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } else {
      // simulated translate tooltip
      setSelectedWord({
        id: 'temp',
        word: cleanWord,
        phonetic: '/.../',
        partOfSpeech: 'lexical unit',
        definition: 'Interactive word clicked from scene context.',
        chineseTranslation: '上下文交互式点击词汇',
        synonyms: [],
        examples: [],
        usageHistory: [],
        level: 'B2',
        familiarity: 50,
        bookId: ''
      });
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    const userMsg: ChatMessage = {
      id: String(Date.now()),
      sender: 'user',
      text: message,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    
    setChats(prev => [...prev, userMsg]);
    setMessage('');

    // Responsive AI tutor simulator
    setTimeout(() => {
      let replyText = `That is an excellent point! In Business contexts, we generally prefer integrating nouns with action verbs of motion. Is there a specific sentence in "${activeStory.title}" that you want me to breakdown grammatically?`;
      if (message.toLowerCase().includes('pivot')) {
        replyText = `"Pivot" in startup culture is typically used as a verb indicating a rapid directional adjustment. However, we also use it as a noun: e.g. "We executed a structural pivot last winter".`;
      } else if (message.toLowerCase().includes('negotiate')) {
        replyText = `Excellent! "Negotiate" derives from Latin roots meaning "un-leisure" (work/business). Pro-tip: negotiate is always accompanied by with/for: "negotiate with clients for better terms".`;
      } else if (message.toLowerCase().includes('leverage')) {
        replyText = `While engineering circles use "leverage" mechanically, in corporative strategies it carries high persuasion weight as an optimizer verb, meaning maximizing existing investments!`;
      }
      
      setChats(prev => [
        ...prev,
        {
          id: String(Date.now() + 1),
          sender: 'ai',
          text: replyText,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    }, 1000);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Narrative block */}
      <div className="lg:col-span-2 space-y-6">
        <div className={`${themeStyles.card} relative overflow-hidden`}>
          <div className="absolute top-0 right-0 p-3 bg-indigo-500/10 text-indigo-600 rounded-bl-xl text-[10px] font-mono tracking-widest uppercase">
            AI STORY STUDY
          </div>
          
          <h2 className={`text-xl font-extrabold pr-20 ${themeStyles.textPrimary}`}>
            {activeStory.title}
          </h2>
          <p className="text-xs text-neutral-400 mt-1 flex items-center space-x-2">
            <span>Category: {activeStory.category}</span>
            <span>•</span>
            <span className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded text-[10px] uppercase font-bold">{activeStory.difficulty}</span>
          </p>

          <div className="mt-6 p-4 rounded-xl relative leading-relaxed font-serif text-sm border border-neutral-300/40 bg-zinc-500/5 select-text shadow-inner">
            <p className="inline">
              {activeStory.contentEn.split(' ').map((word, i) => {
                const norm = word.replace(/[,.()]/g, '').toLowerCase();
                const isHighlight = activeStory.highlightedWords.includes(norm);
                return (
                  <span 
                    key={i} 
                    onClick={() => handleWordClick(word)}
                    className={`${isHighlight ? `${themeStyles.accentText} cursor-pointer hover:underline font-semibold bg-indigo-500/10 px-1 py-0.5 rounded-sm inline-block mx-0.5` : 'hover:bg-slate-200/50 dark:hover:bg-white/5 cursor-pointer rounded-xs px-0.5 inline-block'}`}
                  >
                    {word}{' '}
                  </span>
                );
              })}
            </p>

            {/* Translation block */}
            <div className="mt-6 pt-4 border-t border-neutral-300/40">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[10px] font-mono uppercase text-neutral-400 tracking-wider">
                  Full Passage Translation
                </span>
                <button 
                  onClick={() => setShowChinese(!showChinese)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white dark:bg-indigo-500/15 py-1 px-3 text-[10px] font-bold uppercase rounded-md transition-all cursor-pointer"
                >
                  {showChinese ? 'Hide Chinese Translation' : 'Reveal Chinese Translation'}
                </button>
              </div>

              {showChinese && (
                <p className="text-xs font-sans text-neutral-600 leading-relaxed transition-opacity animate-fade-in">
                  {activeStory.contentZh}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Selected Dictionary Glossary Popups */}
        {selectedWord && (
          <div className={`${themeStyles.card} border-l-4 border-indigo-500 transition-transform`}>
            <div className="flex justify-between items-start mb-2">
              <div>
                <h3 className="text-lg font-bold flex items-center space-x-2">
                  <span>{selectedWord.word}</span>
                  <span className="bg-slate-100 dark:bg-white/10 px-2 py-0.5 text-[10px] rounded uppercase font-bold">{selectedWord.partOfSpeech}</span>
                </h3>
                <p className="text-xs text-neutral-400 font-mono">{selectedWord.phonetic}</p>
              </div>
              <button 
                onClick={() => setSelectedWord(null)}
                className="text-xs bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 p-1 rounded-sm"
              >
                Close
              </button>
            </div>
            
            <p className="text-xs mt-2"><strong className="text-neutral-500 uppercase tracking-widest text-[9px] block">Definition:</strong> {selectedWord.definition}</p>
            <p className="text-xs font-semibold text-indigo-650 dark:text-indigo-400 mt-1"><strong className="text-neutral-500 uppercase tracking-widest text-[9px] block">Translation:</strong> {selectedWord.chineseTranslation}</p>
            {selectedWord.synonyms.length > 0 && (
              <p className="text-xs mt-1"><strong>Synonyms:</strong> {selectedWord.synonyms.join(', ')}</p>
            )}
          </div>
        )}

        {/* Grammar Insight Card */}
        <div className={`${themeStyles.card}`}>
          <div className="flex items-center space-x-2 mb-2 text-indigo-600 dark:text-indigo-400">
            <Award className="w-5 h-5" />
            <h3 className={`text-sm font-semibold uppercase tracking-wider ${themeStyles.textPrimary}`}>
              Interactive Grammar Insight
            </h3>
          </div>
          <p className="text-xs leading-relaxed text-neutral-600">
            {activeStory.grammarInsight}
          </p>
        </div>
      </div>

      {/* Tutor Panel chat sidebar */}
      <div className={`${themeStyles.card} flex flex-col h-[550px] justify-between`}>
        <div className="flex items-center space-x-2 border-b border-slate-200 dark:border-white/10 pb-3 mb-2">
          <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <div>
            <h4 className={`text-sm font-bold ${themeStyles.textPrimary}`}>Tutor AI Chat Panel</h4>
            <span className="text-[10px] font-mono text-emerald-500 flex items-center space-x-1">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
              <span>AI Agent Online</span>
            </span>
          </div>
        </div>

        {/* Messaging Box Area */}
        <div className="flex-1 overflow-y-auto space-y-3 px-1 pr-2 scrollbar-thin scrollbar-thumb-rounded">
          {chats.map(c => (
            <div 
              key={c.id} 
              className={`max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed font-sans ${c.sender === 'user' ? 'bg-indigo-600 text-white rounded-br-none ml-auto' : 'bg-slate-100 dark:bg-white/5 rounded-bl-none border border-neutral-300/30'}`}
            >
              <p>{c.text}</p>
              <span className={`text-[8px] font-mono mt-1 block text-right ${c.sender === 'user' ? 'text-white/75' : 'text-neutral-400'}`}>
                {c.timestamp}
              </span>
            </div>
          ))}
          <div ref={chatBottomRef} />
        </div>

        {/* Footer Chat Submit form */}
        <form onSubmit={handleSendMessage} className="mt-3 pt-2 border-t border-slate-200 dark:border-white/10 flex items-center space-x-2">
          <input 
            type="text" 
            placeholder="Query about pivot, definitions..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="flex-1 px-3 py-2 bg-slate-100 dark:bg-white/5 border border-neutral-300 dark:border-white/10 rounded-xl text-xs focus:ring-0 focus:outline-hidden"
          />
          <button 
            type="submit" 
            className="p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-all cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
};


// ==========================================
// 7. PRACTICE SKILLS MAIN (Page 7)
// ==========================================
interface PracticeMainProps {
  themeStyles: ThemeClasses;
  onNavigate: (view: string) => void;
}

export const PracticeMainView: React.FC<PracticeMainProps> = ({ themeStyles, onNavigate }) => {
  const cards = [
    { id: 'listening', title: 'Listening Skills (听说听写)', icon: 'Volume2', count: '12 tasks', progress: 40, desc: 'Interactive audio transcripts, quizzes, speed selection checks.' },
    { id: 'speaking', title: 'Speaking Skills (口语表达)', icon: 'Mic', count: '8 dialogues', progress: 15, desc: 'Waveform pronunciation checkpoints, speech speed simulation models.' },
    { id: 'reading', title: 'Reading Comprehension (深度阅读)', icon: 'BookOpen', count: '6 passages', progress: 80, desc: 'Smart translated click glossaries, vocabulary highlighting.' },
    { id: 'writing', title: 'Writing Evaluation (创意和作文)', icon: 'FileText', count: '10 prompts', progress: 25, desc: 'Rich editor workspace with advanced grammar suggestions evaluation.' }
  ];

  return (
    <div className="space-y-6">
      <div className="text-center max-w-xl mx-auto space-y-2">
        <h2 className={`text-2xl font-bold tracking-tight ${themeStyles.textPrimary}`}>Practice Skills Workspace</h2>
        <p className={`text-sm ${themeStyles.textSecondary}`}>
          Interact with four-dimensional training scenarios, certified grading frameworks, and custom feedback logs.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
        {cards.map(card => (
          <div key={card.id} className={`${themeStyles.card} flex flex-col justify-between hover:scale-[1.01] transition-transform`}>
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="p-3 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-2xl">
                  {card.id === 'listening' ? <Volume2 className="w-6 h-6" /> :
                   card.id === 'speaking' ? <Mic className="w-6 h-6" /> :
                   card.id === 'reading' ? <BookOpen className="w-6 h-6" /> :
                   <FileText className="w-6 h-6" />}
                </span>
                <span className="font-mono text-xs text-neutral-400 uppercase">{card.count}</span>
              </div>
              
              <h3 className={`text-base font-bold mb-1.5 ${themeStyles.textPrimary}`}>{card.title}</h3>
              <p className={`text-xs ${themeStyles.textSecondary}`}>{card.desc}</p>
            </div>

            <div className="mt-6 pt-4 border-t border-neutral-200 dark:border-white/10 space-y-2">
              <div className="flex justify-between text-[10px] font-mono">
                <span>Task Complete progress</span>
                <span>{card.progress}%</span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-white/10 h-1.5 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-600" style={{ width: `${card.progress}%` }} />
              </div>
              
              <button 
                onClick={() => onNavigate(`practice-${card.id}`)}
                className="w-full text-center text-xs mt-3 ${themeStyles.btnPrimary} bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 rounded-xl transition-transform cursor-pointer"
              >
                Launch Skill Room
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};


// ==========================================
// 8. LISTENING PRACTICE PAGE (Page 8)
// ==========================================
interface ListeningPracticeProps {
  themeStyles: ThemeClasses;
  onNavigate: (view: string) => void;
  quizzes: PracticeQuiz[];
}

export const ListeningPracticeView: React.FC<ListeningPracticeProps> = ({ themeStyles, onNavigate, quizzes }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [revealedExplanations, setRevealedExplanations] = useState<Record<number, boolean>>({});

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isPlaying) {
      timerRef.current = setInterval(() => {
        setProgress(p => {
          if (p >= 100) {
            setIsPlaying(false);
            clearInterval(timerRef.current!);
            return 100;
          }
          return p + 1.5 * speed;
        });
      }, 300);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isPlaying, speed]);

  const handleSeek = (index: number) => {
    // simulated tape jump
    setProgress(index * 25);
    setIsPlaying(true);
  };

  const currentSeconds = Math.floor((progress / 100) * 88); 
  const totalSeconds = 88;

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="space-y-6">
      <button 
        onClick={() => onNavigate('practice')}
        className="inline-flex items-center space-x-1 text-xs font-medium hover:underline text-neutral-500 cursor-pointer"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Back to Practice</span>
      </button>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Playback center */}
        <div className="md:col-span-2 space-y-5">
          <div className={`${themeStyles.card} space-y-4`}>
            <div className="flex justify-between items-start">
              <div>
                <span className={`${themeStyles.badgeClass} mb-2`}>BUSINESS ENGLISH - LEVEL C1</span>
                <h3 className={`text-lg font-bold ${themeStyles.textPrimary}`}>The Synergy Strategy Loop (听说课)</h3>
              </div>
              <span className="text-xs font-mono text-neutral-400">Duration: 01:28</span>
            </div>

            {/* Audio tape visualizer simulation */}
            <div className="h-16 bg-black/10 dark:bg-white/5 rounded-xl border border-neutral-200 dark:border-white/5 flex items-center justify-between px-6 overflow-hidden">
              <div className="flex items-center space-x-0.5 w-full">
                {Array.from({ length: 45 }).map((_, i) => {
                  const animatedHeight = isPlaying ? Math.sin((progress + i) * 0.4) * 24 + 28 : Math.abs(Math.sin(i * 12)) * 10 + 6;
                  return (
                    <div 
                      key={i} 
                      className={`flex-1 rounded-sm transition-all duration-300 ${i / 45 * 100 <= progress ? 'bg-indigo-600 dark:bg-indigo-400' : 'bg-slate-300 dark:bg-white/10'}`}
                      style={{ height: `${animatedHeight}px` }}
                    />
                  );
                })}
              </div>
            </div>

            {/* Simulated audio commands bar */}
            <div className="flex items-center justify-between gap-4 bg-slate-50 dark:bg-white/5 p-3 rounded-xl border border-slate-200 dark:border-white/5">
              <div className="flex items-center space-x-3">
                <button 
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="p-3 bg-indigo-650 text-white rounded-full hover:bg-indigo-700 hover:scale-105 active:scale-95 transition-all text-center cursor-pointer"
                >
                  {isPlaying ? <Square className="w-4 h-4 fill-white" /> : <Play className="w-4 h-4 fill-white" />}
                </button>
                <div className="text-xs font-mono">
                  <span>{formatTime(currentSeconds)}</span>
                  <span className="text-neutral-400"> / {formatTime(totalSeconds)}</span>
                </div>
              </div>

              {/* Speed rate chooser */}
              <div className="flex items-center space-x-1.5 font-mono text-xs">
                <span className="text-[10px] text-neutral-400 uppercase">Speed:</span>
                {[0.8, 1.0, 1.25, 1.5].map(s => (
                  <button 
                    key={s} 
                    onClick={() => setSpeed(s)}
                    className={`px-2 py-0.5 rounded-sm font-semibold transition-colors ${speed === s ? 'bg-indigo-600 text-white' : 'hover:bg-slate-200 dark:hover:bg-white/5'}`}
                  >
                    {s}x
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Interactive timed transcripts */}
          <div className={`${themeStyles.card}`}>
            <h3 className={`text-sm font-semibold uppercase tracking-wider mb-3 ${themeStyles.textPrimary}`}>
              Interactive Timed Transcript
            </h3>
            <div className="space-y-4 text-sm leading-relaxed">
              {[
                { time: '0:00', text: 'Good morning corporate listeners, in today’s review segment we explore synergy.', progressLimit: 0 },
                { time: '0:22', text: 'To synergize means to integrate departments, overcoming traditional division blocks.', progressLimit: 25 },
                { time: '0:45', text: 'Often team members raise logical concern over personal bandwidth limits.', progressLimit: 50 },
                { time: '1:08', text: 'Therefore executing strategic pivot moves ensures agile, collaborative workflows.', progressLimit: 75 }
              ].map((para, i) => {
                const isActive = progress >= para.progressLimit && progress < para.progressLimit + 25;
                return (
                  <div 
                    key={i} 
                    onClick={() => handleSeek(i)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer ${isActive ? 'bg-indigo-500/10 border-indigo-500/30 font-semibold' : 'border-transparent hover:bg-slate-100 dark:hover:bg-white/5'}`}
                  >
                    <span className="text-[10px] font-mono text-neutral-400 block mb-0.5">{para.time}</span>
                    <p>{para.text}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Quizzes Sidebar checks */}
        <div className="space-y-4">
          <div className={`${themeStyles.card}`}>
            <h4 className="text-sm font-bold uppercase tracking-wider mb-4 border-b border-neutral-200 dark:border-white/15 pb-2">
              Comprehension Quizzes
            </h4>
            
            {quizzes.map((q, qidx) => (
              <div key={qidx} className="space-y-3 pb-4 mb-4 border-b border-dotted border-neutral-200 dark:border-white/5 last:border-0 last:pb-0">
                <p className="text-xs font-semibold leading-relaxed">{qidx + 1}. {q.question}</p>
                
                <div className="space-y-1.5">
                  {q.options.map((opt, oidx) => {
                    const isSelected = selectedAnswers[qidx] === oidx;
                    const isCorrect = oidx === q.correctIndex;
                    const hasAnswered = selectedAnswers[qidx] !== undefined;
                    
                    let btnStyle = 'bg-slate-100 dark:bg-white/5 border border-transparent';
                    if (isSelected) {
                      btnStyle = isCorrect ? 'bg-emerald-500/20 border-emerald-500 text-emerald-800 dark:text-emerald-300 font-medium' : 'bg-rose-500/20 border-rose-500 text-rose-800 dark:text-rose-300';
                    } else if (hasAnswered && isCorrect) {
                      btnStyle = 'bg-emerald-500/10 border-emerald-400 text-emerald-700 dark:text-emerald-300';
                    }

                    return (
                      <button 
                        key={oidx}
                        disabled={hasAnswered}
                        onClick={() => setSelectedAnswers({...selectedAnswers, [qidx]: oidx})}
                        className={`w-full text-left p-2 rounded-xl text-[11px] leading-relaxed transition-all uppercase font-medium select-none ${btnStyle} cursor-pointer`}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>

                {selectedAnswers[qidx] !== undefined && (
                  <div className="pt-2">
                    <button 
                      onClick={() => setRevealedExplanations({...revealedExplanations, [qidx]: !revealedExplanations[qidx]})}
                      className="text-[10px] font-mono text-indigo-650 dark:text-indigo-400 hover:underline flex items-center space-x-1"
                    >
                      <HelpCircle className="w-3 h-3" />
                      <span>{revealedExplanations[qidx] ? 'Hide Explanation' : 'View Explanation'}</span>
                    </button>
                    {revealedExplanations[qidx] && (
                      <p className="text-[10px] text-neutral-400 leading-normal mt-1 p-2 bg-black/10 dark:bg-white/5 rounded-md">
                        {q.explanation}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};


// ==========================================
// 9. SPEAKING PRACTICE VIEW (Page 9)
// ==========================================
interface SpeakingPracticeProps {
  themeStyles: ThemeClasses;
  onNavigate: (view: string) => void;
}

export const SpeakingPracticeView: React.FC<SpeakingPracticeProps> = ({ themeStyles, onNavigate }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [activeTab, setActiveTab] = useState<'speak1' | 'speak2'>('speak1');
  const [recordingSuccess, setRecordingSuccess] = useState(false);
  const [gradeResult, setGradeResult] = useState<{ score: number; text: string; details: string } | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const practiceItems = {
    speak1: {
      title: 'Coffee Shop: Ordering details',
      prompt: "I'd like a medium vanilla latte with soy milk, and a butter croissant please.",
      tip: "Pronouncing the initial word 'latte' with correct flat 'a' sounds, and stressing the second syllable is essential."
    },
    speak2: {
      title: 'Business Negotiation: Counter-Proposal',
      prompt: 'While we value this collaboration, we need to negotiate a structural pivot on pricing models.',
      tip: 'Remember the sliding tone transition on "While we value". Sound collaborative but objective.'
    }
  };

  const handleStartRecord = () => {
    setIsRecording(true);
    setGradeResult(null);
    setRecordingSuccess(false);

    // simulated tape record bounds
    timerRef.current = setTimeout(() => {
      handleStopRecord();
    }, 6000);
  };

  const handleStopRecord = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setIsRecording(false);
    setRecordingSuccess(true);
    
    // simulated accuracy parser AI grader
    setTimeout(() => {
      const activePrompt = practiceItems[activeTab];
      const matchWord = activePrompt.prompt.includes('latte') ? 'vanilla latte' : 'negotiate';
      setGradeResult({
        score: Math.floor(Math.random() * 12) + 85,
        text: 'Fluent & Authentic accent',
        details: `Your pacing aligns naturally. Perfect pronunciation on "${matchWord}". Minor breathing check in between required.`
      });
    }, 1000);
  };

  const speakTextRef = () => {
    const speech = new SpeechSynthesisUtterance(practiceItems[activeTab].prompt);
    speech.lang = 'en-US';
    window.speechSynthesis.speak(speech);
  };

  return (
    <div className="space-y-6">
      <button 
        onClick={() => onNavigate('practice')}
        className="inline-flex items-center space-x-1 text-xs font-medium hover:underline text-neutral-500 cursor-pointer"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Back to Practice</span>
      </button>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Workspace */}
        <div className="md:col-span-2 space-y-6">
          <div className={`${themeStyles.card} space-y-5`}>
            <div className="flex justify-between items-center border-b border-neutral-200 dark:border-white/10 pb-4">
              <div>
                <span className={`${themeStyles.badgeClass} mb-1 inline-block`}>AI SPEAKING LAB</span>
                <h3 className={`text-lg font-bold ${themeStyles.textPrimary}`}>Coffee Shop Conversational</h3>
              </div>
              
              <div className="flex space-x-2">
                <button 
                  onClick={() => { setActiveTab('speak1'); setGradeResult(null); }}
                  className={`px-3 py-1 text-xs border rounded-lg transition-all cursor-pointer ${activeTab === 'speak1' ? 'bg-indigo-600 text-white' : 'hover:bg-slate-100 dark:hover:bg-white/5'}`}
                >
                  Scenario 1
                </button>
                <button 
                  onClick={() => { setActiveTab('speak2'); setGradeResult(null); }}
                  className={`px-3 py-1 text-xs border rounded-lg transition-all cursor-pointer ${activeTab === 'speak2' ? 'bg-indigo-600 text-white' : 'hover:bg-slate-100 dark:hover:bg-white/5'}`}
                >
                  Scenario 2
                </button>
              </div>
            </div>

            {/* Speaking prompt */}
            <div className="bg-slate-100 dark:bg-white/5 p-5 rounded-2xl border border-neutral-300/30 relative shadow-inner">
              <span className="absolute top-2 right-2 text-[9px] font-mono uppercase text-neutral-400">Oral Prompt</span>
              <p className="text-base font-serif font-semibold italic text-slate-800 dark:text-neutral-100 leading-relaxed pr-10">
                "{practiceItems[activeTab].prompt}"
              </p>
              
              <button 
                onClick={speakTextRef}
                className="mt-4 flex items-center space-x-1.5 text-xs text-indigo-650 hover:underline cursor-pointer"
              >
                <Volume2 className="w-4 h-4" />
                <span>Listen Native Pronunciation Exemplar</span>
              </button>
            </div>

            {/* Mic button checks */}
            <div className="flex flex-col items-center justify-center py-6 space-y-4">
              <button 
                onClick={isRecording ? handleStopRecord : handleStartRecord}
                className={`w-20 h-20 rounded-full flex items-center justify-center transition-all ${isRecording ? 'bg-rose-500 animate-pulse text-white scale-105 hover:bg-rose-600' : 'bg-indigo-600 hover:bg-indigo-700 text-white'}`}
              >
                {isRecording ? <Square className="w-6 h-6 fill-white" /> : <Mic className="w-6 h-6" />}
              </button>
              <div className="text-center font-mono">
                {isRecording ? (
                  <span className="text-xs text-rose-500 font-semibold uppercase tracking-wider animate-pulse flex items-center space-x-1 justify-center">
                    <span className="w-2 h-2 bg-rose-500 rounded-full inline-block animate-ping mr-1" />
                    Recording mic audio (click center to stop)...
                  </span>
                ) : (
                  <span className="text-xs text-neutral-400">Click to record, maximum 6 seconds recording</span>
                )}
              </div>

              {/* Recording visual spectrum */}
              {isRecording && (
                <div className="flex items-center space-x-1.5 h-6">
                  {Array.from({ length: 15 }).map((_, i) => (
                    <div 
                      key={i} 
                      className="w-1 bg-rose-400 rounded-full animate-bounce" 
                      style={{ 
                        height: `${Math.random() * 18 + 4}px`, 
                        animationDelay: `${i * 0.05}s`,
                        animationDuration: `${Math.random() * 0.4 + 0.3}s` 
                      }} 
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* AI feedback Panel */}
        <div className="space-y-4">
          <div className={`${themeStyles.card}`}>
            <h4 className="text-sm font-bold uppercase tracking-wider mb-3 border-b border-neutral-100 dark:border-white/10 pb-2">
              Oral Tips & Insights
            </h4>
            <p className="text-xs leading-relaxed text-neutral-500 mb-4 font-sans">
              {practiceItems[activeTab].tip}
            </p>

            {gradeResult ? (
              <div className="bg-emerald-550/10 border border-emerald-550/20 p-4 rounded-xl space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-emerald-600">Oral Fluency Grade</span>
                  <span className="text-xl font-mono font-extrabold text-emerald-600">{gradeResult.score}%</span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-white/10 h-1.5 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500" style={{ width: `${gradeResult.score}%` }} />
                </div>
                <p className="text-xs font-semibold">{gradeResult.text}</p>
                <p className="text-[11px] text-neutral-400 leading-normal">{gradeResult.details}</p>
              </div>
            ) : recordingSuccess ? (
              <div className="flex items-center justify-center p-6 space-x-2 text-neutral-400 text-xs">
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>AI evaluating your accent and pacing...</span>
              </div>
            ) : (
              <div className="text-center py-8 text-neutral-400 text-xs italic">
                Awaiting recording data inputs. Click the Microphone to begin.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};


// ==========================================
// 10. READING PRACTICE VIEW (Page 10)
// ==========================================
interface ReadingPracticeProps {
  themeStyles: ThemeClasses;
  onNavigate: (view: string) => void;
}

export const ReadingPracticeView: React.FC<ReadingPracticeProps> = ({ themeStyles, onNavigate }) => {
  const [selectedWordDesc, setSelectedWordDesc] = useState<{ en: string; zh: string; text: string } | null>(null);
  const [quizAnswer, setQuizAnswer] = useState<number | null>(null);

  const article = {
    title: 'The Rise of Smart Cities (智慧城市的崛起)',
    difficulty: 'Upper-Intermediate B2',
    category: 'Technology & Urbanism',
    content: "Urban administrators around the world must negotiate strict budgets to implement digital grids. To make this change successful, they should leverage cloud metrics to automate resources. The ultimate challenge centers on mental bandwidth limits when planning a pivot from legacy concrete transport nodes to collaborative IoT channels.",
    highlighted: {
      negotiate: { translation: '妥协谈判，协商处理', desc: 'Manage or handle complex budgets under constraints.' },
      leverage: { translation: '杠杆作用，充分利用', desc: 'Capitalize on technical databases or metrics.' },
      bandwidth: { translation: '精力，时间裕量', desc: 'The mental and structural allocation limit of administrators.' },
      pivot: { translation: '战略转型，调头转变', desc: 'Execute a fast shift from old paradigms to digital ecosystems.' }
    }
  };

  const handleWordClick = (word: string) => {
    // clean word
    const cleaned = word.toLowerCase().replace(/[,.()]/g, '');
    const lookup = article.highlighted[cleaned as keyof typeof article.highlighted];
    if (lookup) {
      setSelectedWordDesc({
        text: cleaned,
        en: lookup.desc,
        zh: lookup.translation
      });
    } else {
      setSelectedWordDesc({
        text: cleaned,
        en: 'Glossary context is ready. Interactive reading word.',
        zh: '普通阅读辅助词汇'
      });
    }
  };

  return (
    <div className="space-y-6">
      <button 
        onClick={() => onNavigate('practice')}
        className="inline-flex items-center space-x-1 text-xs font-medium hover:underline text-neutral-500 cursor-pointer"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Back to Practice</span>
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Passages container */}
        <div className="lg:col-span-2 space-y-6">
          <div className={`${themeStyles.card} relative overflow-hidden`}>
            <div className="absolute top-0 right-0 p-3 bg-teal-550/10 text-emerald-800 rounded-bl-xl text-[10px] font-mono tracking-widest uppercase font-bold">
              Reading Section
            </div>

            <h2 className={`text-xl font-bold pr-20 ${themeStyles.textPrimary}`}>{article.title}</h2>
            <p className="text-xs text-neutral-400 mt-1 flex items-center space-x-2">
              <span>Category: {article.category}</span>
              <span>•</span>
              <span className="bg-amber-100 text-amber-800 border border-amber-250 px-1.5 py-0.5 rounded text-[10px] uppercase font-bold">{article.difficulty}</span>
            </p>

            {/* Paragraph markup */}
            <div className="mt-6 p-4 rounded-xl leading-relaxed font-serif text-sm border bg-stone-500/5 select-text shadow-xs">
              <p className="inline leading-loose">
                {article.content.split(' ').map((word, i) => {
                  const norm = word.toLowerCase().replace(/[,.()]/g, '');
                  const isHighlight = norm in article.highlighted;
                  return (
                    <span 
                      key={i} 
                      onClick={() => handleWordClick(word)}
                      className={`${isHighlight ? 'text-indigo-650 cursor-pointer hover:underline font-bold bg-indigo-500/10 px-1 px-1 py-0.5 rounded-sm inline-block mx-0.5' : 'hover:bg-slate-200/50 cursor-pointer px-0.5 inline-block rounded-xs'}`}
                    >
                      {word}{' '}
                    </span>
                  );
                })}
              </p>
            </div>
          </div>

          {/* Quick Glossary Translate Drawer pop */}
          {selectedWordDesc && (
            <div className={`${themeStyles.card} border-l-4 border-indigo-600 transition-all`}>
              <div className="flex justify-between items-center mb-1">
                <span className="font-mono text-xs font-bold uppercase text-neutral-400">Context Glossary</span>
                <button 
                  onClick={() => setSelectedWordDesc(null)}
                  className="text-xs hover:bg-slate-100 dark:hover:bg-white/5 p-1 rounded-sm"
                >
                  Close
                </button>
              </div>
              <h4 className="text-base font-bold capitalize mb-1">{selectedWordDesc.text}</h4>
              <p className="text-xs text-neutral-600 font-sans">{selectedWordDesc.en}</p>
              <p className="text-xs font-semibold text-indigo-650 dark:text-indigo-400 mt-1">{selectedWordDesc.zh}</p>
            </div>
          )}
        </div>

        {/* Quizzes and checklist side block */}
        <div className="space-y-4">
          <div className={`${themeStyles.card}`}>
            <h4 className="text-sm font-bold uppercase tracking-wider mb-3 border-b border-neutral-100 dark:border-white/10 pb-2">
              Comprehension check
            </h4>
            <p className="text-xs font-semibold mb-3">Which challenges do administrators center most on during their transition planning?</p>
            
            <div className="space-y-2 text-xs">
              {[
                { o: 'Securing heavy concrete supplies', idx: 0 },
                { o: 'Budget limitations of smart devices', idx: 1 },
                { o: 'Mental bandwidth when planning pivots', idx: 2 },
                { o: 'Hiring more digital security planners', idx: 3 }
              ].map(opt => (
                <button
                  key={opt.idx}
                  onClick={() => setQuizAnswer(opt.idx)}
                  className={`w-full text-left p-2.5 rounded-xl border font-medium ${quizAnswer === opt.idx ? (opt.idx === 2 ? 'bg-emerald-500/15 border-emerald-500 text-emerald-800' : 'bg-rose-500/15 border-rose-500 text-rose-800') : 'hover:bg-slate-100 dark:hover:bg-white/5 border-neutral-200'}`}
                >
                  {opt.o}
                </button>
              ))}
            </div>

            {quizAnswer !== null && (
              <div className="pt-3 animate-fade-in text-[10px] leading-relaxed">
                {quizAnswer === 2 ? (
                  <p className="text-emerald-700 font-semibold">✓ Correct! The text points specifically to 'mental bandwidth limits when planning pivot strategies.'</p>
                ) : (
                  <p className="text-rose-700 font-semibold">✗ Incorrect. Hint: look at the final sentence regarding legacy transportation adjustments.</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};


// ==========================================
// 11. WRITING PRACTICE VIEW (Page 11)
// ==========================================
interface WritingPracticeProps {
  themeStyles: ThemeClasses;
  onNavigate: (view: string) => void;
}

export const WritingPracticeView: React.FC<WritingPracticeProps> = ({ themeStyles, onNavigate }) => {
  const [text, setText] = useState('We need to expand our leverage metrics. Actually, we must do more negotiation to ensure department synergize properly.');
  const [feedback, setFeedback] = useState<Array<{ type: string; en: string; zh: string; suggest: string; range: string }>>([]);
  const [isEvaluating, setIsEvaluating] = useState(false);

  const handleEvaluate = () => {
    setIsEvaluating(true);
    setFeedback([]);
    
    setTimeout(() => {
      setIsEvaluating(false);
      setFeedback([
        { 
          type: 'grammar', 
          en: 'department synergize', 
          suggest: 'departments synergize (or department synergizes)', 
          zh: '主谓不一致，department为单数，其对应的动词应为单数形式，或者改为复数形式。',
          range: 'synergize properly'
        },
        { 
          type: 'vocabulary', 
          en: 'do more negotiation', 
          suggest: 'negotiate further / engage in negotiations', 
          zh: '书面表达优化，建议使用正式的短语“engage in negotiations”来替换口语化的“do more negotiation”。', 
          range: 'do more negotiation' 
        },
        { 
          type: 'style', 
          en: 'Actually', 
          suggest: 'Furthermore / Consequently', 
          zh: '过度关联词较薄弱，商业写作中应尽量规避“Actually”，使用“Furthermore”更具学术和严谨性。', 
          range: 'Actually' 
        }
      ]);
    }, 1500);
  };

  return (
    <div className="space-y-6">
      <button 
        onClick={() => onNavigate('practice')}
        className="inline-flex items-center space-x-1 text-xs font-medium hover:underline text-neutral-500 cursor-pointer"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Back to Practice</span>
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Editor Main block */}
        <div className="lg:col-span-2 space-y-4">
          <div className={`${themeStyles.card} space-y-4`}>
            <div>
              <span className={`${themeStyles.badgeClass} mb-2`}>BUSINESS ESSAY WRITING</span>
              <h3 className={`text-lg font-bold ${themeStyles.textPrimary}`}>Leader Strategy: Personal Retrospective</h3>
              <p className={`text-xs ${themeStyles.textSecondary}`}>
                Prompt: Write a 100-word corporate brief detailing how you manage strategic pivots and resolve team bandwidth struggles. Use keywords: 'negotiate', 'leverage', or 'synergize' where appropriate.
              </p>
            </div>

            <textarea 
              rows={12}
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="w-full p-4 bg-slate-50 dark:bg-white/5 border border-neutral-300 dark:border-white/10 rounded-2xl text-xs font-mono leading-relaxed focus:outline-hidden focus:border-indigo-500 resize-none shadow-inner"
              placeholder="Start drafting your report content..."
            />

            <div className="flex justify-between items-center text-xs">
              <span className="text-neutral-400 font-mono">
                {text.length} characters / {text.split(/\s+/).filter(Boolean).length} words
              </span>
              
              <button 
                onClick={handleEvaluate}
                disabled={isEvaluating}
                className={`${themeStyles.btnPrimary} text-xs font-semibold px-4 py-2 flex items-center space-x-1.5`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{isEvaluating ? 'AI checking grammar...' : 'Submit AI Writing evaluation'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Feedback results panel */}
        <div className="space-y-4">
          <div className={`${themeStyles.card}`}>
            <h4 className="text-sm font-bold uppercase tracking-wider mb-3 border-b border-neutral-100 dark:border-white/10 pb-2">
              AI Evaluation Feedback
            </h4>
            
            {isEvaluating ? (
              <div className="text-center py-12 space-y-2 text-xs">
                <RefreshCw className="w-6 h-6 animate-spin text-indigo-650 mx-auto" />
                <p className="text-neutral-400">Reviewing grammar structures, spelling accuracies, and word selection suitability...</p>
              </div>
            ) : feedback.length > 0 ? (
              <div className="space-y-4">
                <div className="bg-indigo-50 dark:bg-white/5 p-3 rounded-xl border border-indigo-150 flex items-center justify-between text-xs text-indigo-700 dark:text-indigo-300 font-bold">
                  <span>Draft score estimate</span>
                  <span>74% B2</span>
                </div>

                <div className="space-y-3">
                  {feedback.map((f, i) => (
                    <div key={i} className="p-3 bg-linear-to-r from-red-500/5 to-amber-500/5 border border-amber-500/20 rounded-xl space-y-1.5 leading-normal text-xs shadow-inner">
                      <div className="flex items-center justify-between">
                        <span className={`px-1.5 py-0.5 text-[8px] font-mono rounded-md uppercase font-black ${f.type === 'grammar' ? 'bg-rose-500 text-white' : f.type === 'vocabulary' ? 'bg-amber-500 text-black' : 'bg-indigo-600 text-white'}`}>
                          {f.type}
                        </span>
                        <span className="text-[10px] font-mono text-neutral-400">"{f.en}"</span>
                      </div>
                      
                      <p className="font-semibold text-rose-700 dark:text-rose-300">💡 Suggestion: {f.suggest}</p>
                      <p className="text-[10px] text-neutral-500 leading-normal">{f.zh}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-neutral-400 text-xs italic leading-normal">
                No active grammar reviews. Type or edit your essay brief and click 'Submit AI Writing evaluation'.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};


// ==========================================
// 12. ACCOUNT SETTINGS VIEW (Page 12)
// ==========================================
interface AccountSettingsProps {
  themeStyles: ThemeClasses;
}

export const AccountSettingsView: React.FC<AccountSettingsProps> = ({ themeStyles }) => {
  const [name, setName] = useState('Learner Pro 2026');
  const [email, setEmail] = useState('learner@wordscene.ai');
  const [showPass, setShowPass] = useState(false);

  return (
    <div className="space-y-6 max-w-xl">
      <div className="border-b border-neutral-200 dark:border-white/10 pb-4">
        <h3 className={`text-lg font-bold ${themeStyles.textPrimary}`}>Account Profile settings</h3>
        <p className="text-xs text-neutral-400">Configure personal account metadata, profile image and subscriptions.</p>
      </div>

      <div className="space-y-5">
        {/* Avatars */}
        <div className="flex items-center space-x-4">
          <div className="relative group cursor-pointer w-16 h-16 rounded-full overflow-hidden bg-indigo-600 flex items-center justify-center font-bold text-white text-lg">
            <span>LP</span>
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-[10px] uppercase font-mono transition-opacity">
              Upload
            </div>
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider mb-1">Interactive User Avatar</h4>
            <p className="text-[10px] text-neutral-400">Requires JPG / PNG up to 2MB storage allocation.</p>
          </div>
        </div>

        {/* Inputs */}
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1">Username Display</label>
            <input 
              type="text" 
              value={name} 
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 bg-black/5 dark:bg-white/5 border border-neutral-300 dark:border-white/10 rounded-xl text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1">Email Registration</label>
            <input 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 bg-black/5 dark:bg-white/5 border border-neutral-300 dark:border-white/10 rounded-xl text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1">Reset Account Security Password</label>
            <div className="relative">
              <input 
                type={showPass ? 'text' : 'password'} 
                value="secretPasswd2026" 
                readOnly
                className="w-full px-3 py-2 bg-black/5 dark:bg-white/5 border border-neutral-300 dark:border-white/10 rounded-xl text-xs pr-10"
              />
              <button 
                type="button" 
                onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-2.5 text-neutral-400 hover:text-indigo-650"
              >
                <Eye className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Subscriptions badge */}
        <div className="p-4 bg-linear-to-r from-yellow-500/10 to-amber-500/10 rounded-2xl border border-amber-500/30">
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs font-extrabold text-amber-800">Premium Pro Subscription Active</span>
            <span className="bg-amber-100 text-amber-800 text-[9px] font-mono uppercase px-2 py-0.5 rounded font-bold">ACTIVE</span>
          </div>
          <p className="text-[11px] text-neutral-500 leading-normal">
            Your custom spaced learning books, cloud storage backups and real AI pronunciations are active until Jan 2027.
          </p>
        </div>
      </div>
    </div>
  );
};


// ==========================================
// 13. APPEARANCE SETTINGS VIEW (Page 13)
// ==========================================
interface AppearanceSettingsProps {
  themeStyles: ThemeClasses;
  activeTheme: ThemeType;
  onThemeChange: (theme: ThemeType) => void;
  isCompactMode: boolean;
  onCompactToggle: () => void;
  isSmallTypography: boolean;
  onTypographyToggle: () => void;
}

export const AppearanceSettingsView: React.FC<AppearanceSettingsProps> = ({ 
  themeStyles, activeTheme, onThemeChange, isCompactMode, onCompactToggle, isSmallTypography, onTypographyToggle 
}) => {
  return (
    <div className="space-y-6 max-w-xl">
      <div className="border-b border-neutral-200 dark:border-white/10 pb-4">
        <h3 className={`text-lg font-bold ${themeStyles.textPrimary}`}>Appearance settings</h3>
        <p className="text-xs text-neutral-400">Configure visual themes, layout compact controls and font scales.</p>
      </div>

      <div className="space-y-6 text-xs">
        {/* Theme select radios */}
        <div>
          <span className="block text-xs font-extrabold uppercase tracking-widest mb-3 text-neutral-400">
            UI Theme Palette Selection
          </span>
          
          <div className="grid grid-cols-2 gap-3">
            {[
              { id: 'glass', label: 'iOS26 玻璃风格', color: 'bg-blue-500', desc: 'Frosted translucency, colorful glows, dark backdrops' },
              { id: 'natural', label: '清新自然风格', color: 'bg-emerald-700', desc: 'Earthy oatmeal and warm moss sage sage accents' }
            ].map(thm => (
              <button 
                key={thm.id}
                type="button"
                onClick={() => onThemeChange(thm.id as ThemeType)}
                className={`p-3.5 border text-left rounded-2xl flex flex-col justify-between transition-all hover:scale-[1.01] ${activeTheme === thm.id ? 'border-indigo-600 bg-linear-to-tr from-indigo-500/5 to-indigo-500/10' : 'hover:bg-slate-100 dark:hover:bg-white/5 border-neutral-200 dark:border-white/10'} cursor-pointer`}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <span className="font-bold flex items-center space-x-2">
                    <span className={`w-3 h-3 rounded-full ${thm.color}`} />
                    <span>{thm.label}</span>
                  </span>
                  
                  {activeTheme === thm.id && (
                    <span className="p-0.5 bg-indigo-600 text-white rounded-full">
                      <Check className="w-2.5 h-2.5" />
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-neutral-400 leading-normal">{thm.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Toggles */}
        <div className="space-y-4 pt-4 border-t border-neutral-200 dark:border-white/10">
          <span className="block text-xs font-extrabold uppercase tracking-widest text-neutral-400">
            Typography Size Slider & Densities
          </span>

          {/* Typography slider simulate */}
          <div className="flex justify-between items-center py-2 bg-slate-100 dark:bg-white/5 px-4 rounded-xl">
            <div>
              <span className="font-bold block">Small Font Scales</span>
              <span className="text-[10px] text-neutral-400">Reduce structural lines font heights to 14px</span>
            </div>
            <input 
              type="checkbox" 
              checked={isSmallTypography}
              onChange={onTypographyToggle}
              className="rounded cursor-pointer accent-indigo-650"
            />
          </div>

          <div className="flex justify-between items-center py-2 bg-slate-100 dark:bg-white/5 px-4 rounded-xl">
            <div>
              <span className="font-bold block">Layout Compact Mode</span>
              <span className="text-[10px] text-neutral-400">Minimize section margins padding grids</span>
            </div>
            <input 
              type="checkbox" 
              checked={isCompactMode}
              onChange={onCompactToggle}
              className="rounded cursor-pointer accent-indigo-650"
            />
          </div>
        </div>
      </div>
    </div>
  );
};


// ==========================================
// 14. AI MODELS VIEW (Page 14)
// ==========================================
interface AIModelsProps {
  themeStyles: ThemeClasses;
  onNavigate: (view: string) => void;
  models: AIModel[];
  onToggleModel: (modelId: string) => void;
}

export const AIModelsView: React.FC<AIModelsProps> = ({ themeStyles, onNavigate, models, onToggleModel }) => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center border-b border-neutral-200 dark:border-white/10 pb-4">
        <div>
          <h3 className={`text-lg font-bold ${themeStyles.textPrimary}`}>Selected LLM Providers</h3>
          <p className="text-xs text-neutral-400">Switch providers between ChatGPT, Claude and Gemini.</p>
        </div>
        <button 
          onClick={() => onNavigate('settings-addmodel')}
          className={`${themeStyles.btnPrimary} text-xs font-semibold py-1.5 px-3`}
        >
          Add custom API Engine
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {models.map(m => (
          <div key={m.id} className={`${themeStyles.card} flex flex-col justify-between`}>
            <div>
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h4 className="text-sm font-bold">{m.name}</h4>
                  <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-widest">{m.provider}</span>
                </div>
                
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-mono uppercase font-black tracking-wider ${m.isActive ? 'bg-emerald-500/20 text-emerald-600 border border-emerald-500/20' : 'bg-neutral-200 dark:bg-white/5 text-neutral-400'}`}>
                  {m.isActive ? 'Active Engine' : 'Offline'}
                </span>
              </div>
              
              <div className="mt-4 pt-3 border-t border-neutral-200 dark:border-white/5 space-y-2">
                <div className="flex justify-between text-[11px]">
                  <span className="text-neutral-400">Primary purpose</span>
                  <span className="font-semibold text-right">{m.purpose}</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-neutral-400">Client credentials API Key</span>
                  <span className="font-mono">{m.apiKey}</span>
                </div>
              </div>
            </div>

            <div className="mt-6">
              <button 
                onClick={() => onToggleModel(m.id)}
                className={`w-full py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${m.isActive ? 'bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-neutral-500' : 'bg-indigo-600 hover:bg-indigo-700 text-white'}`}
              >
                {m.isActive ? 'Suspend Engine' : 'Activate to Primary'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};


// ==========================================
// 15. ADD NEW MODEL VIEW (Page 15)
// ==========================================
interface AddNewModelProps {
  themeStyles: ThemeClasses;
  onNavigate: (view: string) => void;
  onSaveModel: (model: Omit<AIModel, 'id' | 'isActive'>) => void;
}

export const AddNewModelView: React.FC<AddNewModelProps> = ({ themeStyles, onNavigate, onSaveModel }) => {
  const [name, setName] = useState('');
  const [provider, setProvider] = useState('OpenAI');
  const [apiKey, setApiKey] = useState('');
  const [purpose, setPurpose] = useState('Vocabulary scenarios generation');
  const [endpoint, setEndpoint] = useState('');

  const submitForm = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveModel({
      name,
      provider,
      apiKey: apiKey ? `sk-••••${apiKey.slice(-4)}` : 'sk-notset',
      purpose,
      endpoint
    });
    onNavigate('settings-aimodels');
  };

  return (
    <div className="space-y-6 max-w-xl">
      <div className="flex items-center space-x-2 border-b border-neutral-200 dark:border-white/10 pb-4">
        <button 
          onClick={() => onNavigate('settings-aimodels')}
          className="p-1 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg text-neutral-400 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h3 className={`text-lg font-bold ${themeStyles.textPrimary}`}>Install Custom AI Engine credentials</h3>
          <p className="text-xs text-neutral-400">Configure customized LLM endpoints or third-party gateways.</p>
        </div>
      </div>

      <form onSubmit={submitForm} className="space-y-4 text-xs">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider mb-1">Custom Engine Name *</label>
          <input 
            type="text" 
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Llama-3.3 Client Host"
            className="w-full px-3 py-2 bg-black/5 dark:bg-white/5 border border-neutral-300 dark:border-white/10 rounded-xl text-xs"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1">Core Provider Module</label>
            <select 
              value={provider} 
              onChange={(e) => setProvider(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-stone-850 border border-neutral-300 dark:border-white/10 rounded-xl text-xs"
            >
              <option value="OpenAI">OpenAI Compatible Gateway</option>
              <option value="Anthropic">Anthropic API SDK</option>
              <option value="Google GenAI">Google GenAI Client</option>
              <option value="DeepSeek">DeepSeek API Key Node</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1">Custom Endpoint Target</label>
            <input 
              type="text" 
              value={endpoint}
              onChange={(e) => setEndpoint(e.target.value)}
              placeholder="https://api.gateway.net/v1"
              className="w-full px-3 py-2 bg-black/5 dark:bg-white/5 border border-neutral-300 dark:border-white/10 rounded-xl text-xs"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider mb-1">Provider Personal Secret API Key *</label>
          <input 
            type="password" 
            required
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Introduce credentials to connect..."
            className="w-full px-3 py-2 bg-black/5 dark:bg-white/5 border border-neutral-300 dark:border-white/10 rounded-xl text-xs"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider mb-1">Curriculum Task Purpose assignment</label>
          <input 
            type="text" 
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            className="w-full px-3 py-2 bg-black/5 dark:bg-white/5 border border-neutral-300 dark:border-white/10 rounded-xl text-xs"
          />
        </div>

        <div className="flex gap-2 pt-4">
          <button type="submit" className={`${themeStyles.btnPrimary} py-2 font-bold flex-1`}>
            Verify and Save Provider
          </button>
          <button 
            type="button" 
            onClick={() => onNavigate('settings-aimodels')} 
            className="bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-neutral-400 py-2 border border-neutral-200 dark:border-white/10 rounded-xl font-bold flex-1 cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};


// ==========================================
// 16. SYNC & STORAGE VIEW (Page 16)
// ==========================================
interface SyncStorageProps {
  themeStyles: ThemeClasses;
}

export const SyncStorageView: React.FC<SyncStorageProps> = ({ themeStyles }) => {
  const [cloudSync, setCloudSync] = useState(true);
  const [extensionStatus, setExtensionStatus] = useState('Enabled');
  const [copied, setCopied] = useState(false);
  const [pairingCode, setPairingCode] = useState('');
  const [pairingExpiresAt, setPairingExpiresAt] = useState<number | null>(null);
  const [pairingError, setPairingError] = useState('');

  const getToken = () => {
    try {
      return localStorage.getItem('wordbase_token') || '';
    } catch {
      return '';
    }
  };

  const loadPairingCode = async (forceNew: boolean) => {
    let token = getToken();
    if (!token) {
      try {
        const res = await fetch('/api/v1/session/bootstrap', { method: 'POST' });
        if (res.ok) {
          const data = await res.json();
          const next = typeof data?.token === 'string' ? data.token : '';
          if (next) {
            localStorage.setItem('wordbase_token', next);
            token = next;
          }
        }
      } catch {
        token = '';
      }
    }
    if (!token) {
      setPairingError('No token');
      return;
    }
    try {
      setPairingError('');
      const res = await fetch(forceNew ? '/api/v1/pairing/new' : '/api/v1/pairing/code', {
        method: forceNew ? 'POST' : 'GET',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (!res.ok) {
        setPairingError(`HTTP ${res.status}`);
        return;
      }
      const data = await res.json();
      const code = typeof data?.code === 'string' ? data.code : '';
      const expiresAt = Number.isFinite(data?.expiresAt) ? Number(data.expiresAt) : null;
      setPairingCode(code);
      setPairingExpiresAt(expiresAt);
    } catch (error) {
      setPairingError(error instanceof Error ? error.message : String(error));
    }
  };

  const handleCopy = () => {
    if (!pairingCode) {
      return;
    }
    navigator.clipboard.writeText(pairingCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    loadPairingCode(false);
  }, []);

  return (
    <div className="space-y-6 max-w-xl">
      <div className="border-b border-neutral-200 dark:border-white/10 pb-4">
        <h3 className={`text-lg font-bold ${themeStyles.textPrimary}`}>Cloud Synchronizing & Safe backups</h3>
        <p className="text-xs text-neutral-400">Sync dictionary spacing databases across chrome browser units.</p>
      </div>

      <div className="space-y-5 text-xs">
        {/* Sync status element */}
        <div className="flex justify-between items-center py-3 bg-zinc-500/5 px-4 rounded-xl border border-neutral-300/30">
          <div>
            <span className="font-bold block">Spaced Intervals Cloud Syncing</span>
            <span className="text-[10px] text-neutral-400">Enable safe updates interval counters</span>
          </div>
          <input 
            type="checkbox" 
            checked={cloudSync}
            onChange={() => setCloudSync(!cloudSync)}
            className="rounded cursor-pointer accent-indigo-650"
          />
        </div>

        {/* Extensions details */}
        <div className={`${themeStyles.card} space-y-3 p-4`}>
          <div className="flex justify-between items-start">
            <div>
              <h4 className="font-bold text-sm">Chrome browser extension pairing</h4>
              <p className="text-[11px] text-neutral-400 mt-0.5">Automate click translate overlays while scanning news.</p>
            </div>
            <span className="bg-emerald-550/15 text-emerald-600 px-2 py-0.5 rounded text-[9px] font-mono tracking-wider font-extrabold uppercase">
              {extensionStatus}
            </span>
          </div>

          <div className="pt-2">
            <span className="block text-[10px] font-mono uppercase text-neutral-400 mb-1">Your Pairing Code</span>
            <div className="flex space-x-1.5 items-center">
              <input 
                type="text" 
                readOnly 
                value={pairingCode || (pairingError ? `Error: ${pairingError}` : '')}
                className="bg-black/5 dark:bg-white/5 border border-neutral-300 dark:border-white/10 px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex-1"
              />
              <button 
                onClick={handleCopy}
                className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-semibold font-sans hover:bg-indigo-700 cursor-pointer"
              >
                {copied ? 'Copied!' : 'Copy Code'}
              </button>
              <button
                onClick={() => loadPairingCode(true)}
                className="px-3 py-1.5 bg-slate-200 dark:bg-white/10 text-neutral-600 dark:text-neutral-300 rounded-lg text-xs font-semibold font-sans hover:bg-slate-300 dark:hover:bg-white/15 cursor-pointer"
              >
                Refresh
              </button>
            </div>
            {pairingExpiresAt ? (
              <div className="text-[10px] text-neutral-400 mt-2 font-mono">
                Expires: {new Date(pairingExpiresAt).toLocaleString()}
              </div>
            ) : null}
          </div>
        </div>

        {/* Cache bounds storage bar */}
        <div className="space-y-1 bg-slate-100 dark:bg-white/5 p-4 rounded-xl border border-neutral-200 dark:border-white/10">
          <div className="flex justify-between uppercase font-mono text-[9px] text-neutral-400 font-bold">
            <span>Cache storage allocate</span>
            <span>2.8 MB / 10 MB maximum</span>
          </div>
          <div className="w-full bg-slate-200 dark:bg-white/10 h-1.5 rounded-full overflow-hidden">
            <div className="h-full bg-indigo-600" style={{ width: '28%' }} />
          </div>
        </div>

        {/* Dynamic backup data operations */}
        <div className="grid grid-cols-2 gap-3 pt-3">
          <button className="flex items-center justify-center space-x-1.5 py-2.5 border border-neutral-300 dark:border-white/10 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer font-bold">
            <Upload className="w-4 h-4 text-neutral-400" />
            <span>Export Dictionary JSON</span>
          </button>
          
          <button className="flex items-center justify-center space-x-1.5 py-2.5 border border-neutral-300 dark:border-white/10 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer font-bold">
            <Database className="w-4 h-4 text-neutral-400" />
            <span>Import Sync Backup</span>
          </button>
        </div>
      </div>
    </div>
  );
};
