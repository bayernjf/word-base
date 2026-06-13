import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, Square, Volume2, ArrowLeft, Plus, Search, ChevronRight, Check, AlertCircle, Sparkles, 
  Trash2, BookOpen, Clock, Award, Star, Mic, Send, RefreshCw, Upload, CheckCircle2, Lock, Eye, 
  ChevronDown, Settings, Database, Code, Sliders, Smartphone, Activity, BarChart3, HelpCircle, FileText,
  Globe, Languages, Save
} from 'lucide-react';
import { AppLanguage, MoveWordsResult, Word, VocabularyBook, Story, ChatMessage, PracticeQuiz, AIModel, ThemeType } from '../types';
import { ThemeClasses } from './ThemeStyles';

// 辅助函数：获取单词的frequency值
function getFrequency(word: Word): number {
  return (word.contexts?.length) ?? (word.frequency ?? 0);
}

// 辅助函数：获取单词的frequency显示值（用于进度条，限制在0-100）
function getDisplayFrequency(word: Word): number {
  const freq = getFrequency(word);
  return Math.min(freq, 100);
}

// 辅助函数：格式化日期时间为 YYYY/M/D H:MM:SS 格式
function formatDateTime(timestamp: number): string {
  const date = new Date(timestamp);
  if (isNaN(date.getTime())) return '-';
  
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const seconds = date.getSeconds().toString().padStart(2, '0');
  
  return `${year}/${month}/${day} ${hours}:${minutes}:${seconds}`;
}

// 辅助函数：只格式化日期为 YYYY/M/D 格式
function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  if (isNaN(date.getTime())) return '-';
  
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  
  return `${year}/${month}/${day}`;
}

// ==========================================
// 1. WELCOME / LOGIN VIEW (Page 1)
// ==========================================
interface LoginProps {
  themeStyles: ThemeClasses;
  language: AppLanguage;
  onLogin: (email: string, password: string, remember: boolean) => Promise<boolean>;
  onRegister: (email: string, password: string, nickname?: string) => Promise<boolean>;
  onRequestPasswordReset: (email: string) => Promise<{ ok: boolean; error?: string }>;
  authError?: string | null;
  setAuthError?: (error: string | null) => void;
}

type AuthStep = 'login' | 'register' | 'forgot-email';

export const WelcomeLoginView: React.FC<LoginProps> = ({ 
  themeStyles, 
  language,
  onLogin, 
  onRegister, 
  onRequestPasswordReset, 
  authError, 
  setAuthError 
}) => {
  const [step, setStep] = useState<AuthStep>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const copy = {
    registerSubtitle: language === 'zh' ? '开启你的语境流利度之旅' : 'Begin your contextual fluency journey',
    forgotSubtitle: language === 'zh' ? '重置你的密码' : 'Reset your password',
    loginSubtitle: language === 'zh' ? '语境化语言学习工作台' : 'Contextual language learning workspace',
    email: language === 'zh' ? '邮箱地址' : 'Email Address',
    password: language === 'zh' ? '密码' : 'Password',
    nickname: language === 'zh' ? '昵称（可选）' : 'Nickname (Optional)',
    confirmPassword: language === 'zh' ? '确认密码' : 'Confirm Password',
    rememberMe: language === 'zh' ? '在此设备记住 7 天' : 'Remember this device for 7 days',
    signIn: language === 'zh' ? '登录' : 'Sign In',
    forgotPassword: language === 'zh' ? '忘记密码？' : 'Forgot Password?',
    createAccount: language === 'zh' ? '还没有账号？创建一个' : "Don't have an account? Create an account",
    createFreeAccount: language === 'zh' ? '创建免费账号' : 'Create Free Account',
    alreadyHaveAccount: language === 'zh' ? '已有账号？去登录' : 'Already have an account? Sign In',
    resetPassword: language === 'zh' ? '重置密码' : 'Reset Password',
    resetHint: language === 'zh' ? '输入你的邮箱，我们会发送恢复链接以重置密码。' : "Enter your email and we'll send you a recovery link to reset your password.",
    sendRecoveryEmail: language === 'zh' ? '发送恢复邮件' : 'Send Recovery Email',
    backToSignIn: language === 'zh' ? '返回登录' : 'Back to Sign In',
    passwordMismatch: language === 'zh' ? '两次输入的密码不一致' : 'Passwords do not match',
    passwordTooShort: language === 'zh' ? '密码至少需要6个字符' : 'Password must be at least 6 characters',
    enterEmail: language === 'zh' ? '请输入邮箱地址' : 'Please enter your email address',
    recoverySent: language === 'zh' ? '恢复邮件已发送，请检查邮箱并点击邮件中的恢复链接完成密码重置。' : 'Recovery email sent. Please check your inbox and follow the recovery link to reset your password.',
    sendFailed: language === 'zh' ? '发送失败' : 'Failed to send',
  };

  const clearMessages = () => {
    setAuthError?.(null);
    setMessage(null);
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    setIsLoading(true);
    try {
      await onLogin(email, password, rememberMe);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    if (password !== confirmPassword) {
      setMessage({ text: copy.passwordMismatch, type: 'error' });
      return;
    }
    if (password.length < 6) {
      setMessage({ text: copy.passwordTooShort, type: 'error' });
      return;
    }
    setIsLoading(true);
    try {
      await onRegister(email, password, nickname);
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    if (!email) {
      setMessage({ text: copy.enterEmail, type: 'error' });
      return;
    }
    setIsLoading(true);
    try {
      const result = await onRequestPasswordReset(email);
      if (result.ok) {
        setMessage({ text: copy.recoverySent, type: 'success' });
      } else {
        setMessage({ text: result.error || copy.sendFailed, type: 'error' });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const resetToLogin = () => {
    setStep('login');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setNickname('');
    clearMessages();
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-4">
      <div className={`w-full max-w-md ${themeStyles.card}`}>
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-3 bg-indigo-500/10 rounded-2xl mb-3 text-indigo-600">
            <Sparkles className="w-8 h-8" />
          </div>
          <h2 className={`text-2xl font-bold ${themeStyles.textPrimary}`}>
            WordBase
          </h2>
          <p className={`text-sm mt-1 ${themeStyles.textSecondary}`}>
            {step === 'register' ? copy.registerSubtitle : 
             step.startsWith('forgot') ? copy.forgotSubtitle :
             copy.loginSubtitle}
          </p>
        </div>

        {(message || authError) && (
          <div className={`mb-4 p-3 rounded-lg text-sm ${
            (message?.type === 'success' || !authError) ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 
            'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
          }`}>
            <div className="flex items-center space-x-2">
              {message?.type === 'error' || authError ? <AlertCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
              <span>{message?.text || authError}</span>
            </div>
          </div>
        )}

        {/* Login Step */}
        {step === 'login' && (
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium mb-1 uppercase tracking-wider">{copy.email}</label>
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
                <label className="block text-xs font-medium uppercase tracking-wider">{copy.password}</label>
              </div>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 bg-black/5 dark:bg-white/5 border border-neutral-300 dark:border-white/10 rounded-xl text-sm focus:outline-hidden focus:border-indigo-500" 
                required
              />
            </div>

            <div className="flex items-center space-x-2">
              <input 
                type="checkbox" 
                id="remember" 
                checked={rememberMe} 
                onChange={() => setRememberMe(!rememberMe)}
                className="rounded border-neutral-300Accent focus:ring-0 cursor-pointer"
              />
              <label htmlFor="remember" className={`text-xs select-none cursor-pointer ${themeStyles.textSecondary}`}>
                {copy.rememberMe}
              </label>
            </div>

            <button type="submit" className={`w-full ${themeStyles.btnPrimary} py-2.5 flex items-center justify-center space-x-2`} disabled={isLoading}>
              {isLoading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <span>{copy.signIn}</span>
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>

            <div className="text-center pt-2">
              <button 
                  type="button" 
                  onClick={() => { clearMessages(); setStep('forgot-email'); }}
                  className="text-xs text-indigo-650 dark:text-indigo-400 font-medium hover:underline"
                >
                  {copy.forgotPassword}
              </button><br></br>
              <button 
                type="button" 
                onClick={() => { clearMessages(); setStep('register'); }}
                className="text-xs text-indigo-650 dark:text-indigo-400 font-medium hover:underline"
              >
                {copy.createAccount}
              </button>
            </div>
          </form>
        )}

        {/* Register Step */}
        {step === 'register' && (
          <form onSubmit={handleRegisterSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium mb-1 uppercase tracking-wider">{copy.email}</label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 bg-black/5 dark:bg-white/5 border border-neutral-300 dark:border-white/10 rounded-xl text-sm focus:outline-hidden focus:border-indigo-500" 
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1 uppercase tracking-wider">{copy.nickname}</label>
              <input 
                type="text" 
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                className="w-full px-3 py-2 bg-black/5 dark:bg-white/5 border border-neutral-300 dark:border-white/10 rounded-xl text-sm focus:outline-hidden focus:border-indigo-500" 
              />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1 uppercase tracking-wider">{copy.password}</label>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 bg-black/5 dark:bg-white/5 border border-neutral-300 dark:border-white/10 rounded-xl text-sm focus:outline-hidden focus:border-indigo-500" 
                required
                minLength={6}
              />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1 uppercase tracking-wider">{copy.confirmPassword}</label>
              <input 
                type="password" 
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2 bg-black/5 dark:bg-white/5 border border-neutral-300 dark:border-white/10 rounded-xl text-sm focus:outline-hidden focus:border-indigo-500" 
                required
                minLength={6}
              />
            </div>

            <button type="submit" className={`w-full ${themeStyles.btnPrimary} py-2.5 flex items-center justify-center space-x-2`} disabled={isLoading}>
              {isLoading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <span>{copy.createFreeAccount}</span>
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>

            <div className="text-center pt-2">
              <button 
                type="button" 
                onClick={() => resetToLogin()}
                className="text-xs text-indigo-650 dark:text-indigo-400 font-medium hover:underline"
              >
                {copy.alreadyHaveAccount}
              </button>
            </div>
          </form>
        )}

        {/* Forgot Password - Email Step */}
        {step === 'forgot-email' && (
          <form onSubmit={handleForgotEmailSubmit} className="space-y-4">
            <div>
              <h3 className={`text-lg font-semibold mb-3 ${themeStyles.textPrimary}`}>{copy.resetPassword}</h3>
              <p className={`text-xs mb-4 ${themeStyles.textSecondary}`}>
                {copy.resetHint}
              </p>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1 uppercase tracking-wider">{copy.email}</label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 bg-black/5 dark:bg-white/5 border border-neutral-300 dark:border-white/10 rounded-xl text-sm focus:outline-hidden focus:border-indigo-500" 
                required
              />
            </div>
            <button type="submit" className={`w-full ${themeStyles.btnPrimary} py-2.5`} disabled={isLoading}>
              {isLoading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : copy.sendRecoveryEmail}
            </button>
            <button 
              type="button" 
              onClick={resetToLogin}
              className="w-full text-center text-xs underline mt-2 block"
            >
              {copy.backToSignIn}
            </button>
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
  language: AppLanguage;
  onNavigate: (view: string) => void;
  books: VocabularyBook[];
  words: Word[];
}

export const DashboardView: React.FC<DashboardProps> = ({ themeStyles, language, onNavigate, books, words, user }) => {
  const knownPercent = 65; // Simulated goal metric
  const displayName = user?.nickname || user?.email?.split('@')[0] || (language === 'zh' ? '学习者' : 'Learner');
  const copy = {
    welcome: language === 'zh' ? '欢迎回来' : 'Welcome back',
    streakPrefix: language === 'zh' ? '你已连续学习' : 'You are on a',
    streak: language === 'zh' ? '5 天打卡' : '5-day streak',
    streakSuffix: language === 'zh' ? '，中级词汇练习状态活跃。' : 'Your intermediate vocabulary usage is active.',
    quickStart: language === 'zh' ? '快速开始' : 'Quick Start',
    dailyGoal: language === 'zh' ? '每日目标进度' : 'Daily Goal Progress',
    goalStats: language === 'zh' ? '13 / 20 个单词' : '13 / 20 Words',
    goalHint: language === 'zh' ? '再掌握 7 个单词即可完成今天的商务拓展目标。' : "7 more words to complete today's Business expansion goal.",
    booksTitle: language === 'zh' ? '我的活跃词书' : 'My Active Vocabulary Books',
    manageBooks: language === 'zh' ? '管理全部词书' : 'Manage All Wordbooks',
    wordsCount: (count: number) => language === 'zh' ? `${count} 个单词` : `${count} words`,
  };
  
  return (
    <div className="space-y-6">
      {/* Top Welcome Title Grid */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-linear-to-r from-indigo-500/10 to-purple-500/5 p-6 rounded-2xl border border-indigo-500/20">
        <div>
          <h2 className={`text-2xl font-bold tracking-tight ${themeStyles.textPrimary}`}>
            {copy.welcome}，{displayName}！✨
          </h2>
          {/* Streak info - Hidden */}
          {false && (
          <p className={`text-sm mt-1 ${themeStyles.textSecondary}`}>
            {copy.streakPrefix} <span className="font-semibold text-emerald-600 dark:text-emerald-400">{copy.streak}</span>{language === 'zh' ? copy.streakSuffix : `. ${copy.streakSuffix}`}
          </p>
          )}
        </div>
        <button 
          onClick={() => onNavigate('vocabulary')}
          className={`${themeStyles.btnPrimary} flex items-center justify-center space-x-2 py-3 px-5`}
        >
          <Sparkles className="w-4 h-4 fill-white/20" />
          <span>{copy.quickStart}</span>
        </button>
      </div>


      {/* Grid: My Word lists */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className={`text-lg font-bold tracking-tight ${themeStyles.textPrimary}`}>
            {copy.booksTitle}
          </h3>
          <button 
            onClick={() => onNavigate('mylists')} 
            className="text-xs font-medium text-indigo-650 dark:text-indigo-400 hover:underline flex items-center space-x-1 cursor-pointer"
          >
            <span>{copy.manageBooks}</span>
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {books.map((book) => (
            <div 
              key={book.id} 
              className={`${themeStyles.card} hover:scale-[1.01] transition-transform cursor-pointer`}
              onClick={() => onNavigate(`vocabulary-${book.id}`)}
            >
              <div className="flex items-center">
                <span className="p-2 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-xl">
                  <BookOpen className="w-4 h-4" />
                </span>
                <div className="ml-3">
                  <h4 className={`font-bold text-sm ${themeStyles.textPrimary}`}>{book.name}</h4>
                  <p className={`text-xs mt-1 ${themeStyles.textSecondary}`}>{copy.wordsCount(book.wordCount)}</p>
                </div>
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
  language: AppLanguage;
  onNavigate: (view: string) => void;
  words: Word[];
  books: VocabularyBook[];
  onSelectWord: (wordId: string) => void;
  onAddWord: (word: Omit<Word, 'id'>) => void;
  initialSelectedBookId?: string;
  onBookChange?: (bookId: string) => void;
  onDeleteWords?: (wordIds: string[]) => void;
  onMoveWords?: (wordIds: string[], targetBookId: string) => Promise<MoveWordsResult>;
}

interface VocabularyNotification {
  message: string;
  highlight?: string;
}

export const VocabularyListView: React.FC<VocabularyProps> = ({ 
  themeStyles, language, onNavigate, words, books, onSelectWord, onAddWord,
  initialSelectedBookId = 'biz-eng', onBookChange, onDeleteWords, onMoveWords
}) => {
  const [selectedBookId, setSelectedBookId] = useState(initialSelectedBookId);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [selectedWordIds, setSelectedWordIds] = useState<string[]>([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [showMoveConfirmModal, setShowMoveConfirmModal] = useState(false);
  const [targetBookId, setTargetBookId] = useState<string | null>(null);
  const [notification, setNotification] = useState<VocabularyNotification | null>(null);
  const copy = {
    title: language === 'zh' ? '我的单词表' : 'My Personal Wordbook',
    subtitle: language === 'zh' ? '从自定义词书中练习、复习并筛选词汇。' : 'Practice, review, and filter vocabulary from customized sets.',
    searchPlaceholder: language === 'zh' ? '搜索单词、释义或翻译...' : 'Search word name, definition, or translation...',
    clear: language === 'zh' ? '清空' : 'Clear',
    selected: language === 'zh' ? `已选择 ${selectedWordIds.length} 个单词` : `${selectedWordIds.length} words selected`,
    move: language === 'zh' ? '移动' : 'Move',
    delete: language === 'zh' ? '删除' : 'Delete',
    cancelSelection: language === 'zh' ? '取消选择' : 'Clear Selection',
    targetBook: language === 'zh' ? '目标单词本' : 'target wordbook',
    moveFailed: language === 'zh' ? '单词移动失败，请重试' : 'Failed to move words, please try again.',
    movedMany: (count: number) => language === 'zh' ? `已移动 ${count} 个单词到` : `Moved ${count} words to`,
    movedOne: language === 'zh' ? '单词已成功移动到' : 'Word moved successfully to',
    duplicatesMany: (count: number) => language === 'zh' ? `${count} 个单词已存在于` : `${count} words already exist in`,
    duplicatesOne: language === 'zh' ? '单词已存在于' : 'Word already exists in',
    duplicateSuffix: (count: number) => language === 'zh' ? `，${count} 个单词已存在` : `, ${count} already existed`,
    word: language === 'zh' ? '单词' : 'Word',
    frequency: language === 'zh' ? '频次' : 'Frequency',
    translation: language === 'zh' ? '翻译' : 'Translation',
    timeAdded: language === 'zh' ? '添加时间' : 'Time Added',
    action: language === 'zh' ? '操作' : 'Action',
    addedTimes: (count: number) => language === 'zh' ? `已添加 ${count} 次` : `Added ${count} times`,
    view: language === 'zh' ? '查看' : 'View',
    empty: language === 'zh' ? '当前词书中没有匹配搜索条件的单词。' : 'No words match your search parameters in this wordbook.',
    showing: (start: number, end: number, total: number) => language === 'zh' ? `显示 ${start}-${end} / 共 ${total}` : `Showing ${start}-${end} of ${total}`,
    show: language === 'zh' ? '每页' : 'Show',
    items: language === 'zh' ? '条' : 'items',
    previous: language === 'zh' ? '上一页' : 'Previous',
    next: language === 'zh' ? '下一页' : 'Next',
    deleteTitle: language === 'zh' ? '确认删除？' : 'Confirm deletion?',
    deleteDesc: (count: number) => language === 'zh' ? `确定要删除选中的 ${count} 个单词吗？此操作无法撤销。` : `Are you sure you want to delete ${count} selected words? This action cannot be undone.`,
    cancel: language === 'zh' ? '取消' : 'Cancel',
    confirmDelete: language === 'zh' ? '确认删除' : 'Delete',
    selectTarget: language === 'zh' ? '选择目标单词本' : 'Choose target wordbook',
    moveDesc: (count: number) => language === 'zh' ? `请选择要将 ${count} 个单词移动到哪个单词本：` : `Choose which wordbook to move ${count} words into:`,
    current: language === 'zh' ? '当前' : 'Current',
    wordsCount: (count: number) => language === 'zh' ? `${count} 个单词` : `${count} words`,
    nextStep: language === 'zh' ? '下一步' : 'Next',
    confirmMoveTitle: language === 'zh' ? '确认移动？' : 'Confirm move?',
    confirmMoveDescPrefix: language === 'zh' ? `确定要将 ${selectedWordIds.length} 个单词移动到` : `Are you sure you want to move ${selectedWordIds.length} words to`,
    confirmMoveDescSuffix: language === 'zh' ? '吗？' : '?',
    back: language === 'zh' ? '返回' : 'Back',
    confirmMove: language === 'zh' ? '确认移动' : 'Confirm Move',
  };

  // Update local state if initial prop changes
  useEffect(() => {
    setSelectedBookId(initialSelectedBookId);
    setCurrentPage(1); // 切换单词本时回到第一页
    setSelectedWordIds([]); // 切换单词本时清空选择
  }, [initialSelectedBookId]);

  // 当搜索或每页条数变化时回到第一页
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, itemsPerPage]);

  const filteredWords = words
    .filter(w => w.bookId === selectedBookId)
    .filter(w => w.word.toLowerCase().includes(searchQuery.toLowerCase()) || 
                 (w.translation && w.translation.toLowerCase().includes(searchQuery.toLowerCase())) ||
                 (w.definition && w.definition.toLowerCase().includes(searchQuery.toLowerCase())) ||
                 (w.chineseTranslation && w.chineseTranslation.includes(searchQuery)));

  // 计算当前单词本中最大context数量N
  const currentBookWords = words.filter(w => w.bookId === selectedBookId);
  const maxContextCount = currentBookWords.reduce((max, word) => {
    const count = getFrequency(word);
    return count > max ? count : max;
  }, 1); // 至少为1，避免除以0

  // 计算单词的进度百分比
  const getProgressPercent = (word: Word): number => {
    const count = getFrequency(word);
    if (count <= 1) return 1;
    const percent = (count / maxContextCount) * 100;
    return Math.min(Math.max(percent, 1), 100); // 限制在1-100之间
  };

  // 计算进度条颜色（从浅绿→橙黄→酒红）
  const getProgressColor = (percent: number) => {
    // 1%: 浅绿色 (light green) - #90EE90
    // 50%: 橙黄色 (orange-yellow) - #FFB600
    // 100%: 酒红色 (wine red) - #722F37
    
    const r1 = 144, g1 = 238, b1 = 144; // 浅绿
    const r2 = 255, g2 = 182, b2 = 0;    // 橙黄
    const r3 = 114, g3 = 47, b3 = 55;    // 酒红
    
    let r, g, b;
    
    if (percent <= 50) {
      // 从浅绿到橙黄
      const t = percent / 50;
      r = Math.round(r1 + (r2 - r1) * t);
      g = Math.round(g1 + (g2 - g1) * t);
      b = Math.round(b1 + (b2 - b1) * t);
    } else {
      // 从橙黄到酒红
      const t = (percent - 50) / 50;
      r = Math.round(r2 + (r3 - r2) * t);
      g = Math.round(g2 + (g3 - g2) * t);
      b = Math.round(b2 + (b3 - b2) * t);
    }
    
    return `rgb(${r}, ${g}, ${b})`;
  };

  // 计算分页
  const totalPages = Math.ceil(filteredWords.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedWords = filteredWords.slice(startIndex, endIndex);

  useEffect(() => {
    const nextTotalPages = Math.max(1, Math.ceil(filteredWords.length / itemsPerPage));
    if (currentPage > nextTotalPages) {
      setCurrentPage(nextTotalPages);
    }
  }, [filteredWords.length, itemsPerPage, currentPage]);

  useEffect(() => {
    const availableWordIds = new Set(filteredWords.map((word) => word.id));
    setSelectedWordIds((prev) => prev.filter((id) => availableWordIds.has(id)));
  }, [filteredWords]);

  // 全选/取消全选
  const toggleSelectAll = () => {
    if (selectedWordIds.length === paginatedWords.length) {
      setSelectedWordIds([]);
    } else {
      setSelectedWordIds(paginatedWords.map(w => w.id));
    }
  };

  // 切换单个选择
  const toggleSelectWord = (wordId: string) => {
    setSelectedWordIds(prev => 
      prev.includes(wordId) 
        ? prev.filter(id => id !== wordId) 
        : [...prev, wordId]
    );
  };

  // 取消选择
  const clearSelection = () => {
    setSelectedWordIds([]);
  };

  // 删除操作
  const handleDelete = () => {
    onDeleteWords?.(selectedWordIds);
    setShowDeleteModal(false);
    clearSelection();
  };

  // 移动操作
  const handleMove = async () => {
    if (targetBookId && onMoveWords) {
      const targetBookName = books.find((book) => book.id === targetBookId)?.name || copy.targetBook;
      const result = await onMoveWords(selectedWordIds, targetBookId);

      if (result.success) {
        if (result.movedCount > 0 && result.duplicateCount > 0) {
          setNotification({
            message: copy.movedMany(result.movedCount),
            highlight: `${targetBookName}${copy.duplicateSuffix(result.duplicateCount)}`,
          });
        } else if (result.duplicateCount > 0) {
          setNotification({
            message: result.duplicateCount === 1 ? copy.duplicatesOne : copy.duplicatesMany(result.duplicateCount),
            highlight: targetBookName,
          });
        } else {
          setNotification({
            message: result.movedCount === 1 ? copy.movedOne : copy.movedMany(result.movedCount),
            highlight: targetBookName,
          });
        }

        setShowMoveModal(false);
        setShowMoveConfirmModal(false);
        setTargetBookId(null);
        clearSelection();
      } else {
        setShowMoveConfirmModal(false);
        setNotification({ message: copy.moveFailed });
      }

      setTimeout(() => setNotification(null), 3000);
    }
  };

  const handleBookChange = (bookId: string) => {
    setSelectedBookId(bookId);
    onBookChange?.(bookId);
  };

  return (
    <div className="space-y-6 relative">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className={`text-xl font-bold tracking-tight ${themeStyles.textPrimary}`}>
            {copy.title}
          </h2>
          <p className={`text-xs ${themeStyles.textSecondary}`}>
            {copy.subtitle}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {/* Book switcher dropdown */}
          <div className="relative">
            <select 
              value={selectedBookId}
              onChange={(e) => handleBookChange(e.target.value)}
              className="px-3 py-2 bg-slate-100 dark:bg-white/10 border border-neutral-300 dark:border-white/15 rounded-xl text-xs pr-8 font-medium focus:outline-hidden text-neutral-800 dark:text-neutral-100 cursor-pointer appearance-none"
            >
              {books.map(b => (
                <option key={b.id} value={b.id} className="text-black bg-stone-100">{b.name}</option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-3 text-neutral-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="flex items-center space-x-2 bg-slate-100 dark:bg-white/5 border border-neutral-200 dark:border-white/5 px-3 py-2 rounded-xl">
        <Search className="w-4 h-4 text-neutral-400" />
        <input 
          type="text" 
          placeholder={copy.searchPlaceholder}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-transparent border-0 text-xs focus:ring-0 focus:outline-hidden"
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery('')} className="text-xs text-neutral-400 hover:text-indigo-650">{copy.clear}</button>
        )}
      </div>

      {/* 操作栏 */}
      {selectedWordIds.length > 0 && (
        <div className="flex items-center justify-between bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 px-4 py-3 rounded-xl">
          <span className="text-xs text-indigo-700 dark:text-indigo-300 font-medium">
            {copy.selected}
          </span>
          <div className="flex gap-2">
            <button 
              onClick={() => setShowMoveModal(true)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg border border-indigo-600 text-indigo-600 dark:text-indigo-300 dark:border-indigo-500 hover:bg-indigo-100 dark:hover:bg-indigo-900/30`}
            >
              {copy.move}
            </button>
            <button 
              onClick={() => setShowDeleteModal(true)}
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-red-600 text-red-600 dark:text-red-400 dark:border-red-500 hover:bg-red-50 dark:hover:bg-red-900/30"
            >
              {copy.delete}
            </button>
            <button 
              onClick={clearSelection}
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-neutral-300 dark:border-white/15 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-white/10"
            >
              {copy.cancelSelection}
            </button>
          </div>
        </div>
      )}

      {notification && (
        <div className="px-4 py-3 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-900/20 text-sm text-indigo-700 dark:text-indigo-300">
          <span>{notification.message}</span>
          {notification.highlight && (
            <span className="ml-1 inline-flex items-center rounded-md bg-indigo-600/10 px-2 py-0.5 font-semibold text-indigo-700 dark:text-indigo-200 ring-1 ring-indigo-500/20">
              {notification.highlight}
            </span>
          )}
        </div>
      )}

      {/* Table Card */}
      <div className={`${themeStyles.card} overflow-hidden`}>
        {/* 表格容器添加滚动 */}
        <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 bg-inherit">
              <tr className="border-b border-neutral-200 dark:border-white/10 text-neutral-400 font-mono uppercase tracking-widest text-[10px]">
                <th className="py-3 px-4 w-10">
                  <input
                    type="checkbox"
                    checked={paginatedWords.length > 0 && selectedWordIds.length === paginatedWords.length}
                    onChange={toggleSelectAll}
                    className="w-3.5 h-3.5"
                  />
                </th>
                <th className="py-3 px-4">{copy.word}</th>
                <th className="py-3 px-4">{copy.frequency}</th>
                <th className="py-3 px-4">{copy.translation}</th>
                <th className="py-3 px-4">{copy.timeAdded}</th>
                <th className="py-3 px-4 text-right">{copy.action}</th>
              </tr>
            </thead>
            <tbody>
              {paginatedWords.length > 0 ? (
                paginatedWords.map(w => (
                  <tr key={w.id} className="border-b border-neutral-100 dark:border-white/5 hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                    <td className="py-3.5 px-4">
                      <input
                        type="checkbox"
                        checked={selectedWordIds.includes(w.id)}
                        onChange={() => toggleSelectWord(w.id)}
                        className="w-3.5 h-3.5"
                      />
                    </td>
                    <td className="py-3.5 px-4 cursor-pointer" onClick={() => { onSelectWord(w.id); onNavigate('worddetail'); }}>
                      <button 
                        className={`font-semibold text-sm text-left hover:underline block ${themeStyles.accentText}`}
                      >
                        {w.word}
                      </button>
                    </td>
                    <td className="py-3.5 px-4">
                      <div 
                        className="flex items-center space-x-2 cursor-help" 
                        title={copy.addedTimes(getFrequency(w))}
                      >
                        <div className="w-16 bg-slate-200 dark:bg-white/10 h-2 rounded-xs overflow-hidden">
                          <div 
                            className="h-full"
                            style={{ 
                              width: `${getProgressPercent(w)}%`,
                              backgroundColor: getProgressColor(getProgressPercent(w))
                            }}
                          />
                        </div>
                        <span className="font-mono text-[10px]">{getFrequency(w)}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className={`font-medium ${themeStyles.textPrimary}`}>{w.translation || w.chineseTranslation}</div>
                    </td>
                    <td className="py-3.5 px-4 text-neutral-500">
                      {(() => {
                        const dateVal = w.timeAdded ?? w.dateAdded ?? w.meta?.createdAt;
                        if (dateVal === undefined) return '-';
                        return formatDateTime(dateVal);
                      })()}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button 
                        onClick={() => { onSelectWord(w.id); onNavigate('worddetail'); }}
                        className="text-xs text-indigo-650 dark:text-indigo-400 font-medium hover:underline inline-flex items-center"
                      >
                        <span>{copy.view}</span>
                        <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-neutral-400">
                    {copy.empty}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* 分页控件 */}
        {filteredWords.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-neutral-200 dark:border-white/10">
            {/* 显示统计信息 */}
            <div className="text-xs text-neutral-500">
              {copy.showing(startIndex + 1, Math.min(endIndex, filteredWords.length), filteredWords.length)}
            </div>

            <div className="flex items-center gap-4">
              {/* 每页显示条数选择 */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-neutral-500">{copy.show}</span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => setItemsPerPage(Number(e.target.value))}
                  className="px-2 py-1 bg-slate-100 dark:bg-white/10 border border-neutral-300 dark:border-white/15 rounded-lg text-xs cursor-pointer"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
                <span className="text-xs text-neutral-500">{copy.items}</span>
              </div>

              {/* 页码导航 */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-2 py-1 text-xs rounded-lg border border-neutral-300 dark:border-white/15 hover:bg-slate-100 dark:hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {copy.previous}
                </button>
                
                <div className="flex items-center gap-1">
                  {/* 第1页 */}
                  <button
                    key={1}
                    onClick={() => setCurrentPage(1)}
                    className={`px-2 py-1 text-xs rounded-lg border ${
                      currentPage === 1
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'border-neutral-300 dark:border-white/15 hover:bg-slate-100 dark:hover:bg-white/10'
                    }`}
                  >
                    {1}
                  </button>
                  
                  {/* 左边省略号 */}
                  {totalPages > 7 && currentPage > 4 && (
                    <span className="text-xs text-neutral-400 px-1">...</span>
                  )}

                  {/* 中间页码 */}
                  {(() => {
                    // 计算要显示的中间页码
                    const pages = [];
                    
                    if (totalPages <= 7) {
                      // 页数少，直接显示所有
                      for (let i = 2; i < totalPages; i++) {
                        pages.push(i);
                      }
                    } else {
                      // 页数多，显示中间5个
                      let start = Math.max(2, currentPage - 2);
                      let end = Math.min(totalPages - 1, currentPage + 2);
                      
                      // 确保始终有5个中间页码
                      if (end - start + 1 < 5) {
                        if (currentPage <= 4) {
                          end = Math.min(totalPages - 1, 6);
                        } else if (currentPage >= totalPages - 3) {
                          start = Math.max(2, totalPages - 5);
                        }
                      }
                      
                      for (let i = start; i <= end; i++) {
                        pages.push(i);
                      }
                    }
                    
                    return pages.map(page => (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`px-2 py-1 text-xs rounded-lg border ${
                          currentPage === page
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : 'border-neutral-300 dark:border-white/15 hover:bg-slate-100 dark:hover:bg-white/10'
                        }`}
                      >
                        {page}
                      </button>
                    ));
                  })()}
                  
                  {/* 右边省略号 */}
                  {totalPages > 7 && currentPage < totalPages - 3 && (
                    <span className="text-xs text-neutral-400 px-1">...</span>
                  )}
                  
                  {/* 最后一页 */}
                  {totalPages > 1 && (
                    <button
                      key={totalPages}
                      onClick={() => setCurrentPage(totalPages)}
                      className={`px-2 py-1 text-xs rounded-lg border ${
                        currentPage === totalPages
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'border-neutral-300 dark:border-white/15 hover:bg-slate-100 dark:hover:bg-white/10'
                      }`}
                    >
                      {totalPages}
                    </button>
                  )}
                </div>

                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-2 py-1 text-xs rounded-lg border border-neutral-300 dark:border-white/15 hover:bg-slate-100 dark:hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {copy.next}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 删除确认弹窗 */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className={`${themeStyles.card} p-6 max-w-sm w-full mx-4`}>
            <h3 className="text-base font-bold mb-4">{copy.deleteTitle}</h3>
            <p className="text-sm text-neutral-600 dark:text-neutral-300 mb-6">
              {copy.deleteDesc(selectedWordIds.length)}
            </p>
            <div className="flex gap-2">
              <button 
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className={`flex-1 ${themeStyles.btnSecondary} py-2 text-sm font-semibold`}
              >
                {copy.cancel}
              </button>
              <button 
                type="button"
                onClick={handleDelete}
                className="px-4 py-2 text-xs font-semibold bg-red-600 text-white rounded-xl hover:bg-red-700"
              >
                {copy.confirmDelete}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 移动单词 - 选择单词本弹窗 */}
      {showMoveModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className={`${themeStyles.card} p-6 max-w-md w-full mx-4`}>
            <h3 className="text-base font-bold mb-4">{copy.selectTarget}</h3>
            <p className="text-sm text-neutral-600 dark:text-neutral-300 mb-4">
              {copy.moveDesc(selectedWordIds.length)}
            </p>
            <div className="space-y-2 mb-6 max-h-60 overflow-y-auto">
              {books.map(book => {
                const isCurrentBook = book.id === selectedBookId;
                const isSelected = targetBookId === book.id;
                return (
                  <button
                    key={book.id}
                    type="button"
                    disabled={isCurrentBook}
                    onClick={() => setTargetBookId(book.id)}
                    className={`w-full text-left px-4 py-3 rounded-xl border transition-all ${
                      isCurrentBook 
                        ? 'bg-neutral-100 dark:bg-white/5 border-neutral-200 dark:border-white/10 text-neutral-400 cursor-not-allowed' 
                        : isSelected 
                          ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-500 text-indigo-700 dark:text-indigo-300' 
                          : 'hover:bg-neutral-100 dark:hover:bg-white/5 border-neutral-200 dark:border-white/10'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-sm">{book.name}</div>
                        <div className="text-xs text-neutral-400">{copy.wordsCount(book.wordCount)}</div>
                      </div>
                      {isCurrentBook && <span className="text-xs">{copy.current}</span>}
                      {isSelected && <CheckCircle2 className="w-5 h-5 text-indigo-600" />}
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="flex gap-2">
              <button 
                type="button"
                onClick={() => {
                  setShowMoveModal(false);
                  setTargetBookId(null);
                }}
                className={`flex-1 ${themeStyles.btnSecondary} py-2 text-sm font-semibold`}
              >
                {copy.cancel}
              </button>
              <button 
                type="button"
                disabled={!targetBookId}
                onClick={() => {
                  setShowMoveModal(false);
                  setShowMoveConfirmModal(true);
                }}
                className={`px-4 py-2 text-xs font-semibold rounded-xl ${
                  targetBookId 
                    ? 'bg-indigo-600 text-white hover:bg-indigo-700' 
                    : 'bg-neutral-300 text-neutral-500 cursor-not-allowed'
                }`}
              >
                {copy.nextStep}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 移动单词 - 确认弹窗 */}
      {showMoveConfirmModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className={`${themeStyles.card} p-6 max-w-sm w-full mx-4`}>
            <h3 className="text-base font-bold mb-4">{copy.confirmMoveTitle}</h3>
            <p className="text-sm text-neutral-600 dark:text-neutral-300 mb-6">
              {copy.confirmMoveDescPrefix}
              <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                {' '}{books.find(b => b.id === targetBookId)?.name}
              </span>
              {copy.confirmMoveDescSuffix}
            </p>
            <div className="flex gap-2">
              <button 
                type="button"
                onClick={() => setShowMoveConfirmModal(false)}
                className={`flex-1 ${themeStyles.btnSecondary} py-2 text-sm font-semibold`}
              >
                {copy.back}
              </button>
              <button 
                type="button"
                onClick={handleMove}
                className="px-4 py-2 text-xs font-semibold bg-indigo-600 text-white rounded-xl hover:bg-indigo-700"
              >
                {copy.confirmMove}
              </button>
            </div>
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
  language: AppLanguage;
  onNavigate: (view: string) => void;
  word: Word | undefined;
  onUpdateFamiliarity: (wordId: string, level: number) => void;
}

export const WordDetailView: React.FC<WordDetailProps> = ({ 
  themeStyles, language, onNavigate, word, onUpdateFamiliarity 
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [showChineseExample, setShowChineseExample] = useState<Record<number, boolean>>({});
  const [isDragging, setIsDragging] = useState(false);
  const [topHeight, setTopHeight] = useState(50); // 百分比
  const [translateDropdownOpen, setTranslateDropdownOpen] = useState(false);
  const [selectedTranslateLang, setSelectedTranslateLang] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const copy = {
    noWord: language === 'zh' ? '当前没有激活的单词卡片。' : 'No word card active.',
    returnToVocab: language === 'zh' ? '返回单词表' : 'Return to Vocabulary',
    backToWordbook: language === 'zh' ? '返回词书' : 'Back to Wordbook',
    confidence: language === 'zh' ? '掌握度' : 'Word Confidence',
    frequency: language === 'zh' ? '频次' : 'Frequency',
    definition: language === 'zh' ? '释义' : 'Definition',
    translation: language === 'zh' ? '翻译' : 'Translation',
    synonyms: language === 'zh' ? '同义词' : 'Synonyms / Thesaurus',
    contexts: language === 'zh' ? '语境' : 'Contexts',
    context: language === 'zh' ? '上下文' : 'Context',
    timeAdded: language === 'zh' ? '添加时间' : 'Time Added',
    sourceLink: language === 'zh' ? '来源链接' : 'Source Link',
    source: language === 'zh' ? '来源' : 'Source',
    noContexts: language === 'zh' ? '当前单词暂无语境示例。' : 'No contexts available for this word.',
  };

  if (!word) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-8 h-8 text-neutral-400 mx-auto mb-2" />
        <p className="text-sm">{copy.noWord}</p>
        <button onClick={() => onNavigate('vocabulary')} className="mt-4 text-xs hover:underline text-indigo-650">
          {copy.returnToVocab}
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

  const handleMouseDown = () => {
    setIsDragging(true);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const totalHeight = rect.height;
      const newTopHeight = ((e.clientY - rect.top) / totalHeight) * 100;
      // 限制在 20% 到 80% 之间
      const clampedHeight = Math.max(20, Math.min(80, newTopHeight));
      setTopHeight(clampedHeight);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  return (
    <div className="space-y-4">
      <button 
        onClick={() => onNavigate('vocabulary')}
        className="inline-flex items-center space-x-1 text-xs font-medium hover:underline text-neutral-500 cursor-pointer"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>{copy.backToWordbook}</span>
      </button>

      {/* 主容器，包含两部分和分隔条 */}
      <div 
        ref={containerRef}
        className="flex flex-col h-[calc(100vh-200px)] min-h-[500px]"
      >
        {/* 上面部分：字典翻译 */}
        <div 
          className={`${themeStyles.card} overflow-y-auto`}
          style={{ height: `${topHeight}%` }}
        >
          <div className="p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral-200 dark:border-white/10 pb-6 mb-6">
              <div className="flex items-center space-x-3.5">
                <div>
                  <div className="flex items-center space-x-2.5">
                    <h2 className={`text-3xl font-extrabold tracking-tight ${themeStyles.textPrimary}`}>
                      {word.word}
                    </h2>
                    {word.partOfSpeech && (
                      <span className="bg-indigo-500/10 px-2 py-0.5 text-indigo-600 dark:text-indigo-400 text-xs font-mono rounded-md uppercase font-semibold">
                        {word.partOfSpeech}
                      </span>
                    )}
                    {word.level && (
                      <span className="bg-slate-100 dark:bg-white/10 px-2 py-0.5 text-neutral-500 text-xs font-mono rounded-md">
                        {word.level}
                      </span>
                    )}
                  </div>
                  {word.phonetic && (
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
                  )}
                </div>
              </div>

              <div className="flex flex-col items-end space-y-3">
                {word.familiarity !== undefined && (
                  <>
                    <span className="text-[10px] text-neutral-400 font-mono uppercase tracking-wider">{copy.confidence}</span>
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
                  </>
                )}
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] text-neutral-400 font-mono uppercase tracking-wider">{copy.frequency}</span>
                    <span className="font-mono text-xs font-bold text-indigo-600">{getFrequency(word)}</span>
                  </div>
              </div>
            </div>

            <div className="space-y-4">
              {word.definition && (
                <div>
                  <span className="text-[10px] font-mono uppercase text-neutral-400 tracking-wider">{copy.definition}</span>
                  <p className={`text-base mt-0.5 font-medium ${themeStyles.textPrimary}`}>
                    {word.definition}
                  </p>
                </div>
              )}
              <div>
                <span className="text-[10px] font-mono uppercase text-neutral-400 tracking-wider">{copy.translation}</span>
                <p className="text-base text-indigo-650 dark:text-indigo-400 font-semibold mt-0.5">
                  {word.translation || word.chineseTranslation}
                </p>
              </div>

              {word.synonyms && word.synonyms.length > 0 && (
                <div>
                  <span className="text-[10px] font-mono uppercase text-neutral-400 tracking-wider block mb-1">{copy.synonyms}</span>
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
        </div>

        {/* 可拖动的分隔条 */}
        <div 
          className={`h-2 cursor-row-resize flex items-center justify-center border-t border-b ${
            isDragging 
              ? 'border-indigo-500 bg-indigo-100 dark:bg-indigo-900/30' 
              : 'border-neutral-200 dark:border-white/10 hover:border-indigo-300 dark:hover:border-indigo-700'
          } transition-colors`}
          onMouseDown={handleMouseDown}
        >
          <div className="flex gap-1">
            <div className={`w-8 h-1 rounded-full ${isDragging ? 'bg-indigo-500' : 'bg-neutral-300 dark:bg-white/20'}`} />
            <div className={`w-8 h-1 rounded-full ${isDragging ? 'bg-indigo-500' : 'bg-neutral-300 dark:bg-white/20'}`} />
            <div className={`w-8 h-1 rounded-full ${isDragging ? 'bg-indigo-500' : 'bg-neutral-300 dark:bg-white/20'}`} />
          </div>
        </div>

        {/* 下面部分：上下文列表 */}
        <div 
          className={`${themeStyles.card} overflow-y-auto`}
          style={{ height: `${100 - topHeight}%` }}
        >
          <div className="p-6">
            {/* Usage History 风格标题 */}
            <div className="flex justify-between items-start mb-4">
              <div className="flex flex-col">
                <h3 className={`text-lg font-semibold uppercase tracking-wider ${themeStyles.textPrimary}`}>
                  {copy.contexts}
                </h3>
                <p className={`text-xs mt-0.5 ${themeStyles.textSecondary}`}>
                  {language === 'zh' ? '详细记录你遇到该单词的上下文。' : 'Detailed contexts where you encountered this word.'}
                </p>
              </div>
              {/* Translate to... 下拉栏 */}
              <div className="relative">
                <button
                  onClick={() => setTranslateDropdownOpen(!translateDropdownOpen)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all active:scale-95 ${
                    themeStyles.card
                  } ${themeStyles.textPrimary} hover:bg-indigo-500/10`}
                >
                  <Globe className="w-4 h-4" />
                  <span className="text-xs font-medium">
                    {selectedTranslateLang
                      ? (language === 'zh'
                          ? `翻译到${selectedTranslateLang}`
                          : `Translate to ${selectedTranslateLang}`)
                      : (language === 'zh' ? '翻译到...' : 'Translate to...')}
                  </span>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${translateDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
                {translateDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-48 rounded-xl shadow-xl z-50 overflow-hidden border border-neutral-200 dark:border-white/10 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl">
                    <div className="p-2 flex flex-col gap-1">
                      {(() => {
                        const allLangs = [
                          { key: 'Chinese', label: language === 'zh' ? '中文' : 'Chinese' },
                          { key: 'Japanese', label: language === 'zh' ? '日语' : 'Japanese' },
                          { key: 'German', label: language === 'zh' ? '德语' : 'German' },
                        ];
                        // 把选中的语言排到最前面
                        const sorted = selectedTranslateLang
                          ? [
                              ...allLangs.filter((l) => l.key === selectedTranslateLang),
                              ...allLangs.filter((l) => l.key !== selectedTranslateLang),
                            ]
                          : allLangs;
                        return sorted.map((lang) => {
                          const isSelected = lang.key === selectedTranslateLang;
                          return (
                            <button
                              key={lang.key}
                              onClick={() => {
                                setSelectedTranslateLang(lang.key);
                                setTranslateDropdownOpen(false);
                              }}
                              className={`w-full px-3 py-2 rounded-lg text-xs text-left transition-colors active:scale-95 ${
                                isSelected
                                  ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-semibold'
                                  : `${themeStyles.textPrimary} hover:bg-indigo-500/10`
                              }`}
                            >
                              {lang.label}
                            </button>
                          );
                        });
                      })()}
                    </div>
                  </div>
                )}
              </div>
            </div>
            {word.contexts && word.contexts.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="border-b border-neutral-200 dark:border-white/10">
                    <tr className="text-neutral-400 font-mono uppercase tracking-wider text-xs">
                      <th className="py-3 px-4">#</th>
                      <th className="py-3 px-4">{copy.context}</th>
                      <th className="py-3 px-4">{copy.timeAdded}</th>
                      <th className="py-3 px-4">{copy.sourceLink}</th>
                      <th className="py-3 px-4">{copy.translation}</th>
                      <th className="py-3 px-4 text-center">{language === 'zh' ? '翻译操作' : 'Translation Actions'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {word.contexts.map((ctx, i) => (
                      <tr 
                        key={i} 
                        className="border-b border-neutral-100 dark:border-white/5 hover:bg-black/5 dark:hover:bg-white/5"
                      >
                        <td className="py-4 px-4 text-neutral-500 font-mono text-xs">{i + 1}</td>
                        <td className="py-4 px-4">
                          <p className={`text-sm ${themeStyles.textPrimary}`}>{ctx.context}</p>
                        </td>
                        <td className="py-4 px-4 text-neutral-500 text-xs">
                          {(() => {
                            const dateVal = ctx.timeAdded ?? ctx.addedDate;
                            if (dateVal === undefined) return '-';
                            return formatDateTime(dateVal);
                          })()}
                        </td>
                        <td className="py-4 px-4">
                          {ctx.sourceLink ? (
                            <a 
                              href={ctx.sourceLink} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                            >
                              {copy.source}
                            </a>
                          ) : (
                            <span className="text-neutral-400 text-xs">-</span>
                          )}
                        </td>
                        <td className="py-4 px-4">
                          <p className="text-sm text-indigo-650 dark:text-indigo-400">{ctx.translation}</p>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2">
                            <button
                              className="p-1.5 text-neutral-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-all duration-200 active:scale-90"
                              title={language === 'zh' ? '翻译到其他语言' : 'Translate to'}
                            >
                              <Languages className="w-4 h-4" />
                            </button>
                            <button
                              className="p-1.5 text-neutral-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-all duration-200 active:scale-90"
                              title={language === 'zh' ? '保存翻译' : 'Save'}
                            >
                              <Save className="w-4 h-4" />
                            </button>
                            <button
                              className="p-1.5 text-neutral-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all duration-200 active:scale-90"
                              title={language === 'zh' ? '删除' : 'Delete'}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12">
                <AlertCircle className="w-8 h-8 text-neutral-400 mx-auto mb-2" />
                <p className="text-sm text-neutral-500">{copy.noContexts}</p>
              </div>
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
  language: AppLanguage;
  onNavigate: (view: string) => void;
  books: VocabularyBook[];
  onCreateBook: (book: { name: string; description?: string; icon?: string; isSync: boolean }) => void;
  onSetSyncBook: (bookId: string) => Promise<boolean>;
  onDeleteBooks: (bookIds: string[]) => void;
  onUpdateBook: (bookId: string, updates: { name?: string; description?: string; icon?: string }) => Promise<boolean>;
}

export const MyListsView: React.FC<MyListsProps> = ({ themeStyles, language, onNavigate, books, onCreateBook, onSetSyncBook, onDeleteBooks, onUpdateBook }) => {
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [notification, setNotification] = useState<string | null>(null);
  const [deleteMode, setDeleteMode] = useState(false);
  const [selectedBookIds, setSelectedBookIds] = useState<string[]>([]);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [editingBookId, setEditingBookId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [editError, setEditError] = useState<string | null>(null);
  const copy = {
    mustHaveSync: language === 'zh' ? '必须有一个同步单词本' : 'At least one sync wordbook is required',
    chooseAnotherSync: language === 'zh' ? '请先选择另一个单词本作为同步单词本' : 'Please choose another wordbook as the sync wordbook first',
    syncSet: (name: string) => language === 'zh' ? `${name} 已设为同步单词本` : `${name} is now the sync wordbook`,
    syncSwitchFailed: language === 'zh' ? '切换同步单词本失败，请重试' : 'Failed to switch sync wordbook, please try again',
    emptyName: language === 'zh' ? '单词本名称不能为空' : 'Wordbook name cannot be empty',
    bookExists: language === 'zh' ? '单词本已存在' : 'Wordbook already exists',
    updateFailed: language === 'zh' ? '更新失败' : 'Update failed',
    title: language === 'zh' ? '词书库管理' : 'Vocabulary Management',
    subtitle: language === 'zh' ? '管理词书、筛选集合，并组织自定义学习内容。' : 'Assemble word books, filter sets, and custom curriculum.',
    newWordbook: language === 'zh' ? '新建词书' : 'New Wordbook',
    confirmDelete: language === 'zh' ? '确认删除' : 'Confirm Delete',
    deleteWordbook: language === 'zh' ? '删除词书' : 'Delete Wordbook',
    cancel: language === 'zh' ? '取消' : 'Cancel',
    createTitle: language === 'zh' ? '创建新词书' : 'Create New Wordbook',
    nameLabel: language === 'zh' ? '词书名称' : 'Wordbook Name',
    namePlaceholder: language === 'zh' ? '例如：我喜欢的词、商务英语' : 'e.g., My Favorite Words, Business English',
    create: language === 'zh' ? '创建词书' : 'Create Wordbook',
    clickToEdit: language === 'zh' ? '点击编辑名称' : 'Click to edit name',
    wordsCount: (count: number) => language === 'zh' ? `${count} 个单词` : `${count} words`,
    syncWordbook: language === 'zh' ? '同步单词本' : 'Sync Wordbook',
    deleteModalTitle: language === 'zh' ? '确认删除？' : 'Confirm deletion?',
    deleteModalDesc: (count: number) => language === 'zh' ? `确定要删除选中的 ${count} 个单词本吗？这将同时删除所有相关单词。` : `Are you sure you want to delete ${count} selected wordbooks? This will also remove all related words.`,
    confirm: language === 'zh' ? '确认' : 'Confirm',
  };

  // 检查单词本名称是否已存在（忽略大小写）
  const isNameExists = name.trim().length > 0 && 
    books.some(book => book.name.toLowerCase() === name.trim().toLowerCase());

  // 检查编辑中的名称是否已存在
  const isEditNameExists = (currentBookId: string, newName: string) => {
    const trimmedName = newName.trim();
    if (trimmedName.length === 0) return false;
    return books.some(
      book => book.id !== currentBookId && 
      book.name.toLowerCase() === trimmedName.toLowerCase()
    );
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    onCreateBook({
      name,
      description: '',
      icon: 'BookOpen',
      isSync: false
    });
    setName('');
    setShowCreate(false);
  };

  const handleToggleSync = async (bookId: string, currentIsSync: boolean) => {
    if (currentIsSync) {
      // 尝试关闭当前同步单词本
      if (books.length === 1) {
        // 只有一个单词本，不能关闭
        setNotification(copy.mustHaveSync);
        setTimeout(() => setNotification(null), 3000);
      } else {
        // 有多个单词本，不能直接关闭，什么也不做
        setNotification(copy.chooseAnotherSync);
        setTimeout(() => setNotification(null), 3000);
      }
    } else {
      // 开启这个单词本的同步
      const ok = await onSetSyncBook(bookId);
      const book = books.find(b => b.id === bookId);
      if (ok && book) {
        setNotification(copy.syncSet(book.name));
      } else if (!ok) {
        setNotification(copy.syncSwitchFailed);
      }
      if (ok || !ok) {
        setTimeout(() => setNotification(null), 3000);
      }
    }
  };

  const handleToggleDeleteSelect = (bookId: string) => {
    const book = books.find(b => b.id === bookId);
    if (selectedBookIds.includes(bookId)) {
      setSelectedBookIds(prev => prev.filter(id => id !== bookId));
    } else {
      // 不能选择同步的单词本
      if (book?.isSync) {
        return;
      }
      setSelectedBookIds(prev => [...prev, bookId]);
    }
  };

  const handleDeleteClick = () => {
    if (deleteMode) {
      if (selectedBookIds.length > 0) {
        setShowConfirmModal(true);
      }
    } else {
      setDeleteMode(true);
      setSelectedBookIds([]);
    }
  };

  const handleCancelDelete = () => {
    setDeleteMode(false);
    setSelectedBookIds([]);
  };

  const handleConfirmDelete = () => {
    onDeleteBooks(selectedBookIds);
    setShowConfirmModal(false);
    setDeleteMode(false);
    setSelectedBookIds([]);
  };

  // 编辑单词本名称
  const handleStartEdit = (bookId: string, currentName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (deleteMode) return;
    setEditingBookId(bookId);
    setEditingName(currentName);
    setEditError(null);
  };

  const handleSaveEdit = async (bookId: string) => {
    const trimmedName = editingName.trim();
    if (!trimmedName) {
      setEditError(copy.emptyName);
      return;
    }
    if (isEditNameExists(bookId, trimmedName)) {
      setEditError(copy.bookExists);
      return;
    }
    try {
      const success = await onUpdateBook(bookId, { name: trimmedName });
      if (success) {
        setEditingBookId(null);
        setEditError(null);
      } else {
        setEditError(copy.updateFailed);
      }
    } catch {
      setEditError(copy.updateFailed);
    }
  };

  const handleCancelEdit = () => {
    setEditingBookId(null);
    setEditError(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent, bookId: string) => {
    if (e.key === 'Enter') {
      handleSaveEdit(bookId);
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  // Switch component
  const Switch = ({ checked, onChange, disabled }: { checked: boolean; onChange: () => void; disabled?: boolean }) => (
    <button
      type="button"
      onClick={onChange}
      disabled={disabled}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
        checked ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-gray-700'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );

  return (
    <div className="space-y-6">
      {/* Notification */}
      {notification && (
        <div className={`${themeStyles.card} bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800`}>
          <div className="flex items-center space-x-2 text-emerald-700 dark:text-emerald-300">
            <CheckCircle2 className="w-4 h-4" />
            <span className="text-sm font-medium">{notification}</span>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center">
        <div>
          <h2 className={`text-xl font-bold tracking-tight ${themeStyles.textPrimary}`}>{copy.title}</h2>
          <p className="text-xs text-neutral-400">{copy.subtitle}</p>
        </div>
        <div className="flex gap-2">
          {!deleteMode && (
            <button 
              onClick={() => setShowCreate(!showCreate)} 
              className={`${themeStyles.btnPrimary} flex items-center space-x-1.5 py-2 text-xs font-semibold`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{copy.newWordbook}</span>
            </button>
          )}
          <button 
            onClick={handleDeleteClick} 
            className={`${deleteMode ? 'bg-red-600 hover:bg-red-700 text-white' : themeStyles.btnSecondary} flex items-center space-x-1.5 py-2 text-xs font-semibold px-4 rounded-xl`}
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{deleteMode ? copy.confirmDelete : copy.deleteWordbook}</span>
          </button>
          {deleteMode && (
            <button 
              onClick={handleCancelDelete} 
              className={`${themeStyles.btnSecondary} py-2 text-xs font-semibold`}
            >
              {copy.cancel}
            </button>
          )}
        </div>
      </div>

      {showCreate && (
        <form onSubmit={handleCreate} className={`${themeStyles.card} space-y-4 max-w-xl`}>
          <h3 className="font-bold text-sm">{copy.createTitle}</h3>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1">{copy.nameLabel}</label>
            <input 
              type="text" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={copy.namePlaceholder}
              className={`w-full px-3 py-2 bg-black/5 dark:bg-white/5 border rounded-xl text-xs ${
                isNameExists 
                  ? 'border-red-500 focus:ring-red-500' 
                  : 'border-neutral-300 dark:border-white/10'
              }`}
              required
            />
            {isNameExists && (
              <p className="text-xs text-red-500 mt-1">{copy.bookExists}</p>
            )}
          </div>
          <div className="flex gap-2">
            <button 
              type="submit" 
              className={`${themeStyles.btnPrimary} py-2 text-xs font-bold flex-1 ${
                isNameExists ? 'opacity-50 cursor-not-allowed' : ''
              }`}
              disabled={isNameExists}
            >
              {copy.create}
            </button>
            <button type="button" onClick={() => setShowCreate(false)} className={`${themeStyles.btnSecondary} py-2 text-xs flex-1`}>
              {copy.cancel}
            </button>
          </div>
        </form>
      )}

      {/* Wordbooks Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {books.map(b => {
          const isSelected = selectedBookIds.includes(b.id);
          const isSyncBook = b.isSync;
          const isDisabled = isSyncBook;
          return (
            <div key={b.id} className="space-y-2">
              <div 
                className={`${themeStyles.card} hover:scale-[1.01] transition-transform ${deleteMode ? 'cursor-default' : 'cursor-pointer'} relative`}
                onClick={() => {
                  if (deleteMode) {
                    if (!isDisabled) {
                      handleToggleDeleteSelect(b.id);
                    }
                  } else {
                    onNavigate(`vocabulary-${b.id}`);
                  }
                }}
              >
                {deleteMode && (
                  <div className="absolute top-2 left-2 z-10">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={(e) => {
                        e.stopPropagation();
                        if (!isDisabled) {
                          handleToggleDeleteSelect(b.id);
                        }
                      }}
                      disabled={isDisabled}
                      className="w-4 h-4 text-red-600 rounded"
                    />
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <div className="flex items-center flex-1 min-w-0">
                    <span className="p-2 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-xl flex-shrink-0">
                      <BookOpen className="w-4 h-4" />
                    </span>
                    <div className="ml-3 flex-1 min-w-0">
                      {editingBookId === b.id ? (
                        <div className="space-y-1">
                          <input
                            type="text"
                            value={editingName}
                            onChange={(e) => {
                              setEditingName(e.target.value);
                              setEditError(null);
                            }}
                            onBlur={() => handleSaveEdit(b.id)}
                            onKeyDown={(e) => handleKeyDown(e, b.id)}
                            autoFocus
                            className={`w-full px-2 py-1 bg-black/5 dark:bg-white/5 border rounded text-xs ${
                              editError
                                ? 'border-red-500 focus:ring-red-500'
                                : 'border-neutral-300 dark:border-white/10'
                            }`}
                            onClick={(e) => e.stopPropagation()}
                          />
                          {editError && (
                            <p className="text-xs text-red-500">{editError}</p>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <h3
                            className={`font-bold text-sm ${themeStyles.textPrimary} cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors`}
                            onClick={(e) => handleStartEdit(b.id, b.name, e)}
                            title={copy.clickToEdit}
                          >
                            {b.name}
                          </h3>
                          <p className={`text-xs ${themeStyles.textSecondary}`}>{copy.wordsCount(b.wordCount)}</p>
                        </div>
                      )}
                    </div>
                  </div>
                  {!deleteMode && (
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                      }}
                    >
                      <Switch 
                        checked={b.isSync} 
                        onChange={() => handleToggleSync(b.id, b.isSync)}
                      />
                    </div>
                  )}
                </div>
                {b.isSync && (
                  <div className="mt-2 flex items-center space-x-1 text-xs text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>{copy.syncWordbook}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Confirm Delete Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className={`${themeStyles.card} p-6 max-w-sm w-full mx-4`}>
            <h3 className="text-base font-bold mb-4">{copy.deleteModalTitle}</h3>
            <p className="text-sm text-neutral-600 dark:text-neutral-300 mb-6">
              {copy.deleteModalDesc(selectedBookIds.length)}
            </p>
            <div className="flex gap-2">
              <button 
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className={`flex-1 ${themeStyles.btnSecondary} py-2 text-sm font-semibold`}
              >
                {copy.cancel}
              </button>
              <button 
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 text-xs font-semibold bg-red-600 text-white rounded-xl hover:bg-red-700"
              >
                {copy.confirm}
              </button>
            </div>
          </div>
        </div>
      )}
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
    { id: '1', sender: 'ai', text: 'Hello! I am your WordBase English Tutor. Click on any highlighted word in the story to view translations, synonyms, or grammar structure. Or feel free to query me about idioms in this passage!', timestamp: '09:05 AM' }
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
  language: AppLanguage;
  onNavigate: (view: string) => void;
}

export const PracticeMainView: React.FC<PracticeMainProps> = ({ themeStyles, language, onNavigate }) => {
  const cards = [
    { id: 'listening', title: language === 'zh' ? '听力训练' : 'Listening Skills', icon: 'Volume2', count: language === 'zh' ? '12 个任务' : '12 tasks', progress: 40, desc: language === 'zh' ? '互动音频字幕、测验与倍速检查。' : 'Interactive audio transcripts, quizzes, speed selection checks.' },
    { id: 'speaking', title: language === 'zh' ? '口语训练' : 'Speaking Skills', icon: 'Mic', count: language === 'zh' ? '8 段对话' : '8 dialogues', progress: 15, desc: language === 'zh' ? '发音波形反馈、语速模拟与口语评分。' : 'Waveform pronunciation checkpoints, speech speed simulation models.' },
    { id: 'reading', title: language === 'zh' ? '阅读理解' : 'Reading Comprehension', icon: 'BookOpen', count: language === 'zh' ? '6 篇文章' : '6 passages', progress: 80, desc: language === 'zh' ? '点击词汇释义、翻译提示与高亮词汇。' : 'Smart translated click glossaries, vocabulary highlighting.' },
    { id: 'writing', title: language === 'zh' ? '写作评估' : 'Writing Evaluation', icon: 'FileText', count: language === 'zh' ? '10 个题目' : '10 prompts', progress: 25, desc: language === 'zh' ? '富文本写作工作区与高级语法建议。' : 'Rich editor workspace with advanced grammar suggestions evaluation.' }
  ];
  const copy = {
    title: language === 'zh' ? '练习技能工作台' : 'Practice Skills Workspace',
    subtitle: language === 'zh' ? '在四个维度的训练场景中练习，并查看评分框架与反馈记录。' : 'Interact with four-dimensional training scenarios, certified grading frameworks, and custom feedback logs.',
    progress: language === 'zh' ? '任务完成进度' : 'Task Complete progress',
    launch: language === 'zh' ? '进入训练室' : 'Launch Skill Room',
  };

  return (
    <div className="space-y-6">
      <div className="text-center max-w-xl mx-auto space-y-2">
        <h2 className={`text-2xl font-bold tracking-tight ${themeStyles.textPrimary}`}>{copy.title}</h2>
        <p className={`text-sm ${themeStyles.textSecondary}`}>
          {copy.subtitle}
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
                <span>{copy.progress}</span>
                <span>{card.progress}%</span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-white/10 h-1.5 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-600" style={{ width: `${card.progress}%` }} />
              </div>
              
              <button 
                onClick={() => onNavigate(`practice-${card.id}`)}
                className="w-full text-center text-xs mt-3 ${themeStyles.btnPrimary} bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 rounded-xl transition-transform cursor-pointer"
              >
                {copy.launch}
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
  language: AppLanguage;
  onNavigate: (view: string) => void;
  quizzes: PracticeQuiz[];
}

export const ListeningPracticeView: React.FC<ListeningPracticeProps> = ({ themeStyles, language, onNavigate, quizzes }) => {
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
  const copy = {
    back: language === 'zh' ? '返回练习页' : 'Back to Practice',
    badge: language === 'zh' ? '商务英语 - C1' : 'BUSINESS ENGLISH - LEVEL C1',
    title: language === 'zh' ? '协同策略循环（听力课）' : 'The Synergy Strategy Loop',
    duration: language === 'zh' ? '时长' : 'Duration',
    speed: language === 'zh' ? '速度:' : 'Speed:',
    transcript: language === 'zh' ? '互动时间轴字幕' : 'Interactive Timed Transcript',
    quizzes: language === 'zh' ? '理解测验' : 'Comprehension Quizzes',
    hideExplanation: language === 'zh' ? '隐藏解析' : 'Hide Explanation',
    viewExplanation: language === 'zh' ? '查看解析' : 'View Explanation',
  };

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
        <span>{copy.back}</span>
      </button>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Playback center */}
        <div className="md:col-span-2 space-y-5">
          <div className={`${themeStyles.card} space-y-4`}>
            <div className="flex justify-between items-start">
              <div>
                <span className={`${themeStyles.badgeClass} mb-2`}>{copy.badge}</span>
                <h3 className={`text-lg font-bold ${themeStyles.textPrimary}`}>{copy.title}</h3>
              </div>
              <span className="text-xs font-mono text-neutral-400">{copy.duration}: 01:28</span>
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
                <span className="text-[10px] text-neutral-400 uppercase">{copy.speed}</span>
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
              {copy.transcript}
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
              {copy.quizzes}
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
                      <span>{revealedExplanations[qidx] ? copy.hideExplanation : copy.viewExplanation}</span>
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
  language: AppLanguage;
  onNavigate: (view: string) => void;
}

export const SpeakingPracticeView: React.FC<SpeakingPracticeProps> = ({ themeStyles, language, onNavigate }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [activeTab, setActiveTab] = useState<'speak1' | 'speak2'>('speak1');
  const [recordingSuccess, setRecordingSuccess] = useState(false);
  const [gradeResult, setGradeResult] = useState<{ score: number; text: string; details: string } | null>(null);
  const copy = {
    back: language === 'zh' ? '返回练习页' : 'Back to Practice',
    badge: language === 'zh' ? 'AI 口语实验室' : 'AI SPEAKING LAB',
    pageTitle: language === 'zh' ? '咖啡店口语对话' : 'Coffee Shop Conversational',
    scenario1: language === 'zh' ? '场景 1' : 'Scenario 1',
    scenario2: language === 'zh' ? '场景 2' : 'Scenario 2',
    oralPrompt: language === 'zh' ? '口语提示' : 'Oral Prompt',
    nativeAudio: language === 'zh' ? '收听原生发音示范' : 'Listen Native Pronunciation Exemplar',
    recording: language === 'zh' ? '录音中（点击中心停止）...' : 'Recording mic audio (click center to stop)...',
    recordHint: language === 'zh' ? '点击开始录音，最长 6 秒' : 'Click to record, maximum 6 seconds recording',
    insights: language === 'zh' ? '口语提示与洞察' : 'Oral Tips & Insights',
    grade: language === 'zh' ? '口语流利度评分' : 'Oral Fluency Grade',
    evaluating: language === 'zh' ? 'AI 正在评估你的口音与节奏...' : 'AI evaluating your accent and pacing...',
    awaiting: language === 'zh' ? '等待录音输入，点击麦克风开始。' : 'Awaiting recording data inputs. Click the Microphone to begin.',
    fluent: language === 'zh' ? '流利且自然的口音' : 'Fluent & Authentic accent',
  };

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
        text: copy.fluent,
        details: language === 'zh'
          ? `你的节奏自然流畅，"${matchWord}" 的发音表现很好，间隔处可稍微调整呼吸。`
          : `Your pacing aligns naturally. Perfect pronunciation on "${matchWord}". Minor breathing check in between required.`
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
        <span>{copy.back}</span>
      </button>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Workspace */}
        <div className="md:col-span-2 space-y-6">
          <div className={`${themeStyles.card} space-y-5`}>
            <div className="flex justify-between items-center border-b border-neutral-200 dark:border-white/10 pb-4">
              <div>
                <span className={`${themeStyles.badgeClass} mb-1 inline-block`}>{copy.badge}</span>
                <h3 className={`text-lg font-bold ${themeStyles.textPrimary}`}>{copy.pageTitle}</h3>
              </div>
              
              <div className="flex space-x-2">
                <button 
                  onClick={() => { setActiveTab('speak1'); setGradeResult(null); }}
                  className={`px-3 py-1 text-xs border rounded-lg transition-all cursor-pointer ${activeTab === 'speak1' ? 'bg-indigo-600 text-white' : 'hover:bg-slate-100 dark:hover:bg-white/5'}`}
                >
                  {copy.scenario1}
                </button>
                <button 
                  onClick={() => { setActiveTab('speak2'); setGradeResult(null); }}
                  className={`px-3 py-1 text-xs border rounded-lg transition-all cursor-pointer ${activeTab === 'speak2' ? 'bg-indigo-600 text-white' : 'hover:bg-slate-100 dark:hover:bg-white/5'}`}
                >
                  {copy.scenario2}
                </button>
              </div>
            </div>

            {/* Speaking prompt */}
            <div className="bg-slate-100 dark:bg-white/5 p-5 rounded-2xl border border-neutral-300/30 relative shadow-inner">
              <span className="absolute top-2 right-2 text-[9px] font-mono uppercase text-neutral-400">{copy.oralPrompt}</span>
              <p className="text-base font-serif font-semibold italic text-slate-800 dark:text-neutral-100 leading-relaxed pr-10">
                "{practiceItems[activeTab].prompt}"
              </p>
              
              <button 
                onClick={speakTextRef}
                className="mt-4 flex items-center space-x-1.5 text-xs text-indigo-650 hover:underline cursor-pointer"
              >
                <Volume2 className="w-4 h-4" />
                <span>{copy.nativeAudio}</span>
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
                    {copy.recording}
                  </span>
                ) : (
                  <span className="text-xs text-neutral-400">{copy.recordHint}</span>
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
              {copy.insights}
            </h4>
            <p className="text-xs leading-relaxed text-neutral-500 mb-4 font-sans">
              {practiceItems[activeTab].tip}
            </p>

            {gradeResult ? (
              <div className="bg-emerald-550/10 border border-emerald-550/20 p-4 rounded-xl space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-emerald-600">{copy.grade}</span>
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
                <span>{copy.evaluating}</span>
              </div>
            ) : (
              <div className="text-center py-8 text-neutral-400 text-xs italic">
                {copy.awaiting}
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
  language: AppLanguage;
  onNavigate: (view: string) => void;
}

export const ReadingPracticeView: React.FC<ReadingPracticeProps> = ({ themeStyles, language, onNavigate }) => {
  const [selectedWordDesc, setSelectedWordDesc] = useState<{ en: string; zh: string; text: string } | null>(null);
  const [quizAnswer, setQuizAnswer] = useState<number | null>(null);
  const copy = {
    back: language === 'zh' ? '返回练习页' : 'Back to Practice',
    section: language === 'zh' ? '阅读部分' : 'Reading Section',
    category: language === 'zh' ? '分类' : 'Category',
    glossary: language === 'zh' ? '语境词汇表' : 'Context Glossary',
    close: language === 'zh' ? '关闭' : 'Close',
    quizTitle: language === 'zh' ? '理解检查' : 'Comprehension check',
    quizQuestion: language === 'zh' ? '在转型规划过程中，管理者最核心的挑战是什么？' : 'Which challenges do administrators center most on during their transition planning?',
    correct: language === 'zh' ? "回答正确！文章明确指出，挑战在于“规划转型策略时的精力与带宽限制”。" : "Correct! The text points specifically to 'mental bandwidth limits when planning pivot strategies.'",
    incorrect: language === 'zh' ? '回答不正确。提示：查看最后一句关于传统交通系统调整的内容。' : 'Incorrect. Hint: look at the final sentence regarding legacy transportation adjustments.',
    genericGlossaryEn: 'Glossary context is ready. Interactive reading word.',
    genericGlossaryZh: language === 'zh' ? '普通阅读辅助词汇' : 'General reading support vocabulary',
  };

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
        en: copy.genericGlossaryEn,
        zh: copy.genericGlossaryZh
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
        <span>{copy.back}</span>
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Passages container */}
        <div className="lg:col-span-2 space-y-6">
          <div className={`${themeStyles.card} relative overflow-hidden`}>
            <div className="absolute top-0 right-0 p-3 bg-teal-550/10 text-emerald-800 rounded-bl-xl text-[10px] font-mono tracking-widest uppercase font-bold">
              {copy.section}
            </div>

            <h2 className={`text-xl font-bold pr-20 ${themeStyles.textPrimary}`}>{article.title}</h2>
            <p className="text-xs text-neutral-400 mt-1 flex items-center space-x-2">
              <span>{copy.category}: {article.category}</span>
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
                <span className="font-mono text-xs font-bold uppercase text-neutral-400">{copy.glossary}</span>
                <button 
                  onClick={() => setSelectedWordDesc(null)}
                  className="text-xs hover:bg-slate-100 dark:hover:bg-white/5 p-1 rounded-sm"
                >
                  {copy.close}
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
              {copy.quizTitle}
            </h4>
            <p className="text-xs font-semibold mb-3">{copy.quizQuestion}</p>
            
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
                  <p className="text-emerald-700 font-semibold">✓ {copy.correct}</p>
                ) : (
                  <p className="text-rose-700 font-semibold">✗ {copy.incorrect}</p>
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
  language: AppLanguage;
  onNavigate: (view: string) => void;
}

export const WritingPracticeView: React.FC<WritingPracticeProps> = ({ themeStyles, language, onNavigate }) => {
  const [text, setText] = useState('We need to expand our leverage metrics. Actually, we must do more negotiation to ensure department synergize properly.');
  const [feedback, setFeedback] = useState<Array<{ type: string; issue: string; suggest: string; detailZh: string; detailEn: string; range: string }>>([]);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const copy = {
    back: language === 'zh' ? '返回练习页' : 'Back to Practice',
    badge: language === 'zh' ? '商务写作' : 'BUSINESS ESSAY WRITING',
    title: language === 'zh' ? '领导策略：个人复盘' : 'Leader Strategy: Personal Retrospective',
    prompt: language === 'zh'
      ? "题目：写一段约 100 词的商务摘要，说明你如何管理战略转型并解决团队带宽问题。请适当使用 'negotiate'、'leverage' 或 'synergize'。"
      : "Prompt: Write a 100-word corporate brief detailing how you manage strategic pivots and resolve team bandwidth struggles. Use keywords: 'negotiate', 'leverage', or 'synergize' where appropriate.",
    placeholder: language === 'zh' ? '开始起草你的报告内容...' : 'Start drafting your report content...',
    chars: language === 'zh' ? '字符' : 'characters',
    words: language === 'zh' ? '词' : 'words',
    checking: language === 'zh' ? 'AI 正在检查语法...' : 'AI checking grammar...',
    submit: language === 'zh' ? '提交 AI 写作评估' : 'Submit AI Writing evaluation',
    feedback: language === 'zh' ? 'AI 评估反馈' : 'AI Evaluation Feedback',
    reviewing: language === 'zh' ? '正在检查语法结构、拼写准确度和用词恰当性...' : 'Reviewing grammar structures, spelling accuracies, and word selection suitability...',
    score: language === 'zh' ? '草稿评分预估' : 'Draft score estimate',
    suggestion: language === 'zh' ? '建议' : 'Suggestion',
    empty: language === 'zh' ? '当前没有语法评审结果。输入或修改你的作文后，点击“提交 AI 写作评估”。' : "No active grammar reviews. Type or edit your essay brief and click 'Submit AI Writing evaluation'.",
  };

  const handleEvaluate = () => {
    setIsEvaluating(true);
    setFeedback([]);
    
    setTimeout(() => {
      setIsEvaluating(false);
      setFeedback([
        { 
          type: 'grammar', 
          issue: 'department synergize', 
          suggest: 'departments synergize (or department synergizes)', 
          detailZh: '主谓不一致，department 为单数，其对应的动词应为单数形式，或者改为复数形式。',
          detailEn: 'Subject-verb disagreement: department is singular, so the verb should be singular as well, or the noun should be pluralized.',
          range: 'synergize properly'
        },
        { 
          type: 'vocabulary', 
          issue: 'do more negotiation', 
          suggest: 'negotiate further / engage in negotiations', 
          detailZh: '书面表达可优化，建议使用更正式的短语 “engage in negotiations” 替换口语化的 “do more negotiation”。', 
          detailEn: 'For more formal writing, replace the conversational phrase “do more negotiation” with “engage in negotiations”.',
          range: 'do more negotiation' 
        },
        { 
          type: 'style', 
          issue: 'Actually', 
          suggest: 'Furthermore / Consequently', 
          detailZh: '衔接词较弱，商业写作中尽量避免 “Actually”，使用 “Furthermore” 会更正式严谨。', 
          detailEn: 'The transition is too weak for business writing. Replacing “Actually” with “Furthermore” improves formality and flow.',
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
        <span>{copy.back}</span>
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Editor Main block */}
        <div className="lg:col-span-2 space-y-4">
          <div className={`${themeStyles.card} space-y-4`}>
            <div>
              <span className={`${themeStyles.badgeClass} mb-2`}>{copy.badge}</span>
              <h3 className={`text-lg font-bold ${themeStyles.textPrimary}`}>{copy.title}</h3>
              <p className={`text-xs ${themeStyles.textSecondary}`}>
                {copy.prompt}
              </p>
            </div>

            <textarea 
              rows={12}
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="w-full p-4 bg-slate-50 dark:bg-white/5 border border-neutral-300 dark:border-white/10 rounded-2xl text-xs font-mono leading-relaxed focus:outline-hidden focus:border-indigo-500 resize-none shadow-inner"
              placeholder={copy.placeholder}
            />

            <div className="flex justify-between items-center text-xs">
              <span className="text-neutral-400 font-mono">
                {text.length} {copy.chars} / {text.split(/\s+/).filter(Boolean).length} {copy.words}
              </span>
              
              <button 
                onClick={handleEvaluate}
                disabled={isEvaluating}
                className={`${themeStyles.btnPrimary} text-xs font-semibold px-4 py-2 flex items-center space-x-1.5`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{isEvaluating ? copy.checking : copy.submit}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Feedback results panel */}
        <div className="space-y-4">
          <div className={`${themeStyles.card}`}>
            <h4 className="text-sm font-bold uppercase tracking-wider mb-3 border-b border-neutral-100 dark:border-white/10 pb-2">
              {copy.feedback}
            </h4>
            
            {isEvaluating ? (
              <div className="text-center py-12 space-y-2 text-xs">
                <RefreshCw className="w-6 h-6 animate-spin text-indigo-650 mx-auto" />
                <p className="text-neutral-400">{copy.reviewing}</p>
              </div>
            ) : feedback.length > 0 ? (
              <div className="space-y-4">
                <div className="bg-indigo-50 dark:bg-white/5 p-3 rounded-xl border border-indigo-150 flex items-center justify-between text-xs text-indigo-700 dark:text-indigo-300 font-bold">
                  <span>{copy.score}</span>
                  <span>74% B2</span>
                </div>

                <div className="space-y-3">
                  {feedback.map((f, i) => (
                    <div key={i} className="p-3 bg-linear-to-r from-red-500/5 to-amber-500/5 border border-amber-500/20 rounded-xl space-y-1.5 leading-normal text-xs shadow-inner">
                      <div className="flex items-center justify-between">
                        <span className={`px-1.5 py-0.5 text-[8px] font-mono rounded-md uppercase font-black ${f.type === 'grammar' ? 'bg-rose-500 text-white' : f.type === 'vocabulary' ? 'bg-amber-500 text-black' : 'bg-indigo-600 text-white'}`}>
                          {f.type}
                        </span>
                        <span className="text-[10px] font-mono text-neutral-400">"{f.issue}"</span>
                      </div>
                      
                      <p className="font-semibold text-rose-700 dark:text-rose-300">💡 {copy.suggestion}: {f.suggest}</p>
                      <p className="text-[10px] text-neutral-500 leading-normal">{language === 'zh' ? f.detailZh : f.detailEn}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-neutral-400 text-xs italic leading-normal">
                {copy.empty}
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
  language: AppLanguage;
  user: { id: string; email: string; nickname?: string; avatar?: number; createdAt: number } | null;
  onUpdateProfile: (data: { nickname?: string; avatar?: number }) => Promise<boolean>;
  onChangePassword: (oldPassword: string, newPassword: string) => Promise<{ ok: boolean; error?: string }>;
  onDeleteAccount: () => Promise<{ ok: boolean; error?: string }>;
}

// Avatar Select Component for Account Settings
function AccountAvatarSelect({
  themeStyles,
  currentAvatar,
  onUpdate
}: {
  themeStyles: ThemeClasses;
  currentAvatar: number;
  onUpdate: (data: { nickname?: string; avatar?: number }) => Promise<boolean>;
}) {
  const [avatars, setAvatars] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    // Predefined avatars (same as server-side)
    const defaultAvatars = [
      `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="50" fill="#FFB6C1"/><circle cx="35" cy="40" r="8" fill="white"/><circle cx="65" cy="40" r="8" fill="white"/><circle cx="35" cy="42" r="4" fill="#333"/><circle cx="65" cy="42" r="4" fill="#333"/><path d="M 35 60 Q 50 75 65 60" stroke="#333" stroke-width="3" fill="none"/></svg>`,
      `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="50" fill="#87CEEB"/><circle cx="35" cy="40" r="8" fill="white"/><circle cx="65" cy="40" r="8" fill="white"/><circle cx="37" cy="42" r="4" fill="#333"/><circle cx="67" cy="42" r="4" fill="#333"/><rect x="35" y="55" width="30" height="15" rx="7" fill="#FFD700"/></svg>`,
      `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="50" fill="#90EE90"/><circle cx="35" cy="40" r="8" fill="white"/><circle cx="65" cy="40" r="8" fill="white"/><circle cx="35" cy="42" r="4" fill="#333"/><circle cx="65" cy="42" r="4" fill="#333"/><path d="M 35 65 Q 50 55 65 65" stroke="#333" stroke-width="3" fill="none"/></svg>`,
      `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="50" fill="#DDA0DD"/><circle cx="35" cy="40" r="8" fill="white"/><circle cx="65" cy="40" r="8" fill="white"/><circle cx="37" cy="42" r="4" fill="#333"/><circle cx="67" cy="42" r="4" fill="#333"/><path d="M 35 60 Q 50 50 65 60" stroke="#333" stroke-width="3" fill="none"/></svg>`,
      `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="50" fill="#F0E68C"/><circle cx="35" cy="40" r="8" fill="white"/><circle cx="65" cy="40" r="8" fill="white"/><circle cx="35" cy="42" r="4" fill="#333"/><circle cx="65" cy="42" r="4" fill="#333"/><ellipse cx="50" cy="60" rx="15" ry="10" fill="#FF6B6B"/></svg>`,
      `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="50" fill="#E6E6FA"/><circle cx="35" cy="40" r="8" fill="white"/><circle cx="65" cy="40" r="8" fill="white"/><circle cx="37" cy="42" r="4" fill="#333"/><circle cx="67" cy="42" r="4" fill="#333"/><polygon points="50,55 55,70 45,70" fill="#FFA500"/></svg>`,
      `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="50" fill="#FFEFD5"/><circle cx="35" cy="40" r="8" fill="white"/><circle cx="65" cy="40" r="8" fill="white"/><circle cx="35" cy="42" r="4" fill="#333"/><circle cx="65" cy="42" r="4" fill="#333"/><circle cx="50" cy="62" r="8" fill="#FF69B4"/></svg>`,
      `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="50" fill="#B0E0E6"/><circle cx="35" cy="40" r="8" fill="white"/><circle cx="65" cy="40" r="8" fill="white"/><circle cx="37" cy="42" r="4" fill="#333"/><circle cx="67" cy="42" r="4" fill="#333"/><rect x="40" y="55" width="20" height="15" rx="3" fill="#8B4513"/></svg>`,
      `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="50" fill="#FAFAD2"/><circle cx="35" cy="40" r="8" fill="white"/><circle cx="65" cy="40" r="8" fill="white"/><circle cx="35" cy="42" r="4" fill="#333"/><circle cx="65" cy="42" r="4" fill="#333"/><ellipse cx="50" cy="65" rx="12" ry="8" fill="#20B2AA"/></svg>`,
      `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="50" fill="#FFE4E1"/><circle cx="35" cy="40" r="8" fill="white"/><circle cx="65" cy="40" r="8" fill="white"/><circle cx="37" cy="42" r="4" fill="#333"/><circle cx="67" cy="42" r="4" fill="#333"/><path d="M 40 60 L 45 55 L 50 60 L 55 55 L 60 60" stroke="#333" stroke-width="3" fill="none"/></svg>`
    ];
    setAvatars(defaultAvatars);
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
        <div className={`mb-3 p-2 rounded-lg text-xs ${message.type === 'success' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'}`}>
          {message.text}
        </div>
      )}
      <div className="grid grid-cols-5 gap-2">
        {avatars.map((avatar, index) => (
          <button
            key={index}
            onClick={() => handleSelectAvatar(index)}
            disabled={isLoading}
            className={`p-1 rounded-lg border-2 transition-all ${
              currentAvatar === index
                ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30'
                : 'border-neutral-200 dark:border-white/10 hover:border-indigo-300 dark:hover:border-indigo-600'
            }`}
          >
            <div
              dangerouslySetInnerHTML={{ __html: avatar }}
              className="w-12 h-12 mx-auto"
            />
          </button>
        ))}
      </div>
    </div>
  );
}

export const AccountSettingsView: React.FC<AccountSettingsProps> = ({ 
  themeStyles, 
  language,
  user, 
  onUpdateProfile, 
  onChangePassword,
  onDeleteAccount
}) => {
  const [isEditingNickname, setIsEditingNickname] = useState(false);
  const [nickname, setNickname] = useState(user?.nickname || user?.email?.split('@')[0] || '');
  const [isUpdating, setIsUpdating] = useState(false);
  const [profileMessage, setProfileMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const [showFirstModal, setShowFirstModal] = useState(false);
  const [showSecondModal, setShowSecondModal] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [deleteAccountMessage, setDeleteAccountMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const copy = {
    title: language === 'zh' ? '账户资料设置' : 'Account Profile Settings',
    subtitle: language === 'zh' ? '配置个人账户信息、头像与订阅状态。' : 'Configure personal account metadata, profile image and subscriptions.',
    avatar: language === 'zh' ? '选择头像' : 'Choose Avatar',
    email: language === 'zh' ? '邮箱' : 'Email',
    nickname: language === 'zh' ? '昵称' : 'Nickname',
    saveLoading: language === 'zh' ? '保存中...' : 'Saving...',
    save: language === 'zh' ? '保存' : 'Save',
    cancel: language === 'zh' ? '取消' : 'Cancel',
    edit: language === 'zh' ? '编辑' : 'Edit',
    changePassword: language === 'zh' ? '修改密码' : 'Change Password',
    currentPassword: language === 'zh' ? '当前密码' : 'Current Password',
    newPassword: language === 'zh' ? '新密码' : 'New Password',
    confirmPassword: language === 'zh' ? '确认新密码' : 'Confirm New Password',
    changingPassword: language === 'zh' ? '修改中...' : 'Updating...',
    submitPassword: language === 'zh' ? '修改密码' : 'Update Password',
    notLoggedIn: language === 'zh' ? '未登录' : 'Not logged in',
    deleteAccount: language === 'zh' ? '注销账号' : 'Delete Account',
    deleteTitle1: language === 'zh' ? '是否注销账号' : 'Delete this account?',
    deleteDesc1: language === 'zh' ? '如果注销此账号，所有数据都会被删除。' : 'Deleting this account will remove all of your data.',
    confirm: language === 'zh' ? '确认' : 'Confirm',
    deleteTitle2: language === 'zh' ? '确认删除？' : 'Final confirmation',
    deleting: language === 'zh' ? '注销中...' : 'Deleting...',
    updateNicknameSuccess: language === 'zh' ? '昵称更新成功！' : 'Nickname updated successfully!',
    updateFailed: language === 'zh' ? '更新失败，请稍后重试' : 'Update failed, please try again later.',
    passwordMismatch: language === 'zh' ? '两次输入的密码不一致' : 'Passwords do not match',
    passwordShort: language === 'zh' ? '密码至少需要6个字符' : 'Password must be at least 6 characters',
    passwordUpdated: language === 'zh' ? '密码修改成功！' : 'Password updated successfully!',
    passwordChangeFailed: language === 'zh' ? '修改失败，请稍后重试' : 'Password update failed, please try again later.',
    deleteFailed: language === 'zh' ? '注销失败，请稍后重试' : 'Delete failed, please try again later.',
  };

  const handleUpdateNickname = async () => {
    if (!nickname.trim()) return;
    setIsUpdating(true);
    setProfileMessage(null);
    try {
      const success = await onUpdateProfile({ nickname: nickname.trim() });
      if (success) {
        setProfileMessage({ text: copy.updateNicknameSuccess, type: 'success' });
        setIsEditingNickname(false);
      } else {
        setProfileMessage({ text: copy.updateFailed, type: 'error' });
      }
    } catch {
      setProfileMessage({ text: copy.updateFailed, type: 'error' });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setPasswordMessage({ text: copy.passwordMismatch, type: 'error' });
      return;
    }
    if (newPassword.length < 6) {
      setPasswordMessage({ text: copy.passwordShort, type: 'error' });
      return;
    }
    setIsChangingPassword(true);
    setPasswordMessage(null);
    try {
      const result = await onChangePassword(oldPassword, newPassword);
      if (result.ok) {
        setPasswordMessage({ text: copy.passwordUpdated, type: 'success' });
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setPasswordMessage({ text: result.error || copy.passwordChangeFailed, type: 'error' });
      }
    } catch {
      setPasswordMessage({ text: copy.passwordChangeFailed, type: 'error' });
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleDeleteAccountConfirm = async () => {
    setDeleteAccountMessage(null);
    setIsDeletingAccount(true);
    try {
      const result = await onDeleteAccount();
      if (!result.ok) {
        setDeleteAccountMessage({ text: result.error || copy.deleteFailed, type: 'error' });
        return;
      }

      setShowSecondModal(false);
      setShowFirstModal(false);
    } catch {
      setDeleteAccountMessage({ text: copy.deleteFailed, type: 'error' });
    } finally {
      setIsDeletingAccount(false);
    }
  };

  return (
    <div className="space-y-6 max-w-xl">
      <div className="border-b border-neutral-200 dark:border-white/10 pb-4">
        <h3 className={`text-lg font-bold ${themeStyles.textPrimary}`}>{copy.title}</h3>
        <p className="text-xs text-neutral-400">{copy.subtitle}</p>
      </div>

      <div className="space-y-8">
        {/* Avatars */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider mb-3">{copy.avatar}</h4>
          <AccountAvatarSelect 
            themeStyles={themeStyles}
            currentAvatar={user?.avatar || 0}
            onUpdate={onUpdateProfile}
          />
        </div>

        {/* User Info */}
        <div className="space-y-4">
          <div className={`p-4 rounded-lg ${themeStyles.secondaryBg}`}>
            <label className="block text-sm font-medium text-neutral-500 mb-2">{copy.email}</label>
            <div className={themeStyles.textPrimary}>{user?.email || copy.notLoggedIn}</div>
          </div>
          <div className={`p-4 rounded-lg ${themeStyles.secondaryBg}`}>
            <label className="block text-sm font-medium text-neutral-500 mb-2">{copy.nickname}</label>
            {profileMessage && (
              <div className={`mb-3 p-2 rounded-lg text-xs ${profileMessage.type === 'success' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'}`}>
                {profileMessage.text}
              </div>
            )}
            {isEditingNickname ? (
              <div className="flex gap-2">
                <input 
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  className={`flex-1 px-3 py-2 bg-white dark:bg-zinc-800 border border-neutral-300 dark:border-white/10 rounded-lg ${themeStyles.textPrimary}`}
                  autoFocus
                />
                <button 
                  onClick={handleUpdateNickname}
                  disabled={isUpdating}
                  className={`${themeStyles.btnPrimary} px-4 py-2 text-xs`}
                >
                  {isUpdating ? copy.saveLoading : copy.save}
                </button>
                <button 
                  onClick={() => { 
                    setIsEditingNickname(false); 
                    setNickname(user?.nickname || user?.email?.split('@')[0] || ''); 
                  }}
                  className={`${themeStyles.btnSecondary} px-4 py-2 text-xs`}
                >
                  {copy.cancel}
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <span className={themeStyles.textPrimary}>{nickname}</span>
                <button 
                  onClick={() => setIsEditingNickname(true)}
                  className="text-xs text-indigo-650 dark:text-indigo-400 hover:underline"
                >
                  {copy.edit}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Change Password */}
        <div>
          <h4 className={`text-sm font-semibold ${themeStyles.textPrimary} mb-4`}>{copy.changePassword}</h4>
          <form onSubmit={handleChangePassword} className={`space-y-4 p-6 rounded-lg ${themeStyles.card}`}>
            {passwordMessage && (
              <div className={`p-3 rounded-lg text-xs ${passwordMessage.type === 'success' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'}`}>
                {passwordMessage.text}
              </div>
            )}
            <div>
              <label className={`block text-xs font-semibold mb-2 ${themeStyles.textPrimary}`}>{copy.currentPassword}</label>
              <input 
                type="password"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                className="w-full px-3 py-2 bg-black/5 dark:bg-white/5 border border-neutral-300 dark:border-white/10 rounded-xl text-xs"
                required
              />
            </div>
            <div>
              <label className={`block text-xs font-semibold mb-2 ${themeStyles.textPrimary}`}>{copy.newPassword}</label>
              <input 
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-2 bg-black/5 dark:bg-white/5 border border-neutral-300 dark:border-white/10 rounded-xl text-xs"
                required
                minLength={6}
              />
            </div>
            <div>
              <label className={`block text-xs font-semibold mb-2 ${themeStyles.textPrimary}`}>{copy.confirmPassword}</label>
              <input 
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2 bg-black/5 dark:bg-white/5 border border-neutral-300 dark:border-white/10 rounded-xl text-xs"
                required
                minLength={6}
              />
            </div>
            <button 
              type="submit"
              disabled={isChangingPassword}
              className={`w-full ${themeStyles.btnPrimary} py-2.5 mt-2 text-xs font-semibold`}
            >
              {isChangingPassword ? copy.changingPassword : copy.submitPassword}
            </button>
          </form>
        </div>

        {/* Subscriptions badge - Hidden */}
        {false && (
        <div className="p-4 bg-linear-to-r from-yellow-500/10 to-amber-500/10 rounded-2xl border border-amber-500/30">
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs font-extrabold text-amber-800">Premium Pro Subscription Active</span>
            <span className="bg-amber-100 text-amber-800 text-[9px] font-mono uppercase px-2 py-0.5 rounded font-bold">ACTIVE</span>
          </div>
          <p className="text-[11px] text-neutral-500 leading-normal">
            Your custom spaced learning books, cloud storage backups and real AI pronunciations are active until Jan 2027.
          </p>
        </div>
        )}

        {/* Delete Account */}
        <div className="pt-4 border-t border-neutral-200 dark:border-white/10">
          {deleteAccountMessage && (
            <div className={`mb-3 p-3 rounded-lg text-xs ${deleteAccountMessage.type === 'success' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'}`}>
              {deleteAccountMessage.text}
            </div>
          )}
          <button 
            type="button"
            onClick={() => {
              setDeleteAccountMessage(null);
              setShowFirstModal(true);
            }}
            className="text-xs text-red-600 dark:text-red-400 font-semibold hover:underline"
          >
            {copy.deleteAccount}
          </button>
        </div>
      </div>

      {/* First Modal */}
      {showFirstModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className={`${themeStyles.card} p-6 max-w-sm w-full mx-4`}>
            <h3 className="text-base font-bold mb-4">{copy.deleteTitle1}</h3>
            <p className="text-sm text-neutral-600 dark:text-neutral-300 mb-6">
              {copy.deleteDesc1}
            </p>
            <div className="flex gap-2">
              <button 
                type="button"
                onClick={() => setShowFirstModal(false)}
                className={`flex-1 ${themeStyles.btnSecondary} py-2 text-sm font-semibold`}
              >
                {copy.cancel}
              </button>
              <button 
                type="button"
                onClick={() => {
                  setShowFirstModal(false);
                  setDeleteAccountMessage(null);
                  setShowSecondModal(true);
                }}
                className={`px-4 py-2 text-xs font-semibold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 rounded-xl hover:bg-red-200 dark:hover:bg-red-900/50`}
              >
                {copy.confirm}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Second Modal */}
      {showSecondModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className={`${themeStyles.card} p-6 max-w-sm w-full mx-4`}>
            <h3 className="text-base font-bold mb-4">{copy.deleteTitle2}</h3>
            {deleteAccountMessage && (
              <div className={`mb-4 p-3 rounded-lg text-xs ${deleteAccountMessage.type === 'success' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'}`}>
                {deleteAccountMessage.text}
              </div>
            )}
            <div className="flex gap-2">
              <button 
                type="button"
                onClick={() => setShowSecondModal(false)}
                disabled={isDeletingAccount}
                className={`flex-1 ${themeStyles.btnSecondary} py-2 text-sm font-semibold`}
              >
                {copy.cancel}
              </button>
              <button 
                type="button"
                onClick={() => {
                  void handleDeleteAccountConfirm();
                }}
                disabled={isDeletingAccount}
                className={`px-4 py-2 text-xs font-semibold bg-red-600 text-white rounded-xl hover:bg-red-700`}
              >
                {isDeletingAccount ? copy.deleting : copy.confirm}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


// ==========================================
// 13. APPEARANCE SETTINGS VIEW (Page 13)
// ==========================================
interface AppearanceSettingsProps {
  themeStyles: ThemeClasses;
  language: AppLanguage;
  activeTheme: ThemeType;
  onThemeChange: (theme: ThemeType) => void;
  isCompactMode: boolean;
  onCompactToggle: () => void;
  isSmallTypography: boolean;
  onTypographyToggle: () => void;
}

export const AppearanceSettingsView: React.FC<AppearanceSettingsProps> = ({ 
  themeStyles, language, activeTheme, onThemeChange, isCompactMode, onCompactToggle, isSmallTypography, onTypographyToggle 
}) => {
  const copy = {
    title: language === 'zh' ? '外观设置' : 'Appearance settings',
    subtitle: language === 'zh' ? '配置视觉主题、紧凑布局和字体缩放。' : 'Configure visual themes, layout compact controls and font scales.',
    palette: language === 'zh' ? '界面主题配色' : 'UI Theme Palette Selection',
    glassLabel: language === 'zh' ? '液态玻璃风格' : 'Liquid Glass Style',
    glassDesc: language === 'zh' ? '半透明磨砂、彩色辉光与深色背景。' : 'Frosted translucency, colorful glows, dark backdrops',
    naturalLabel: language === 'zh' ? '清新自然风格' : 'Natural Style',
    naturalDesc: language === 'zh' ? '燕麦与鼠尾草色调，温和自然。' : 'Earthy oatmeal and warm moss sage accents',
    typography: language === 'zh' ? '字体大小与界面密度' : 'Typography Size Slider & Densities',
    smallFont: language === 'zh' ? '小号字体' : 'Small Font Scales',
    smallFontDesc: language === 'zh' ? '将结构文字缩小至约 14px。' : 'Reduce structural lines font heights to 14px',
    compact: language === 'zh' ? '紧凑布局模式' : 'Layout Compact Mode',
    compactDesc: language === 'zh' ? '减小模块边距与网格留白。' : 'Minimize section margins padding grids',
  };
  return (
    <div className="space-y-6 max-w-xl">
      <div className="border-b border-neutral-200 dark:border-white/10 pb-4">
        <h3 className={`text-lg font-bold ${themeStyles.textPrimary}`}>{copy.title}</h3>
        <p className="text-xs text-neutral-400">{copy.subtitle}</p>
      </div>

      <div className="space-y-6 text-xs">
        {/* Theme select radios */}
        <div>
          <span className="block text-xs font-extrabold uppercase tracking-widest mb-3 text-neutral-400">
            {copy.palette}
          </span>
          
          <div className="grid grid-cols-2 gap-3">
            {[
              { id: 'glass', label: copy.glassLabel, color: 'bg-blue-500', desc: copy.glassDesc },
              { id: 'natural', label: copy.naturalLabel, color: 'bg-emerald-700', desc: copy.naturalDesc }
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

        {/* Toggles - Hidden */}
        {false && (
        <div className="space-y-4 pt-4 border-t border-neutral-200 dark:border-white/10">
          <span className="block text-xs font-extrabold uppercase tracking-widest text-neutral-400">
            {copy.typography}
          </span>

          {/* Typography slider simulate */}
          <div className="flex justify-between items-center py-2 bg-slate-100 dark:bg-white/5 px-4 rounded-xl">
            <div>
              <span className="font-bold block">{copy.smallFont}</span>
              <span className="text-[10px] text-neutral-400">{copy.smallFontDesc}</span>
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
              <span className="font-bold block">{copy.compact}</span>
              <span className="text-[10px] text-neutral-400">{copy.compactDesc}</span>
            </div>
            <input 
              type="checkbox" 
              checked={isCompactMode}
              onChange={onCompactToggle}
              className="rounded cursor-pointer accent-indigo-650"
            />
          </div>
        </div>
        )}
      </div>
    </div>
  );
};


// ==========================================
// 14. AI MODELS VIEW (Page 14)
// ==========================================
interface AIModelsProps {
  themeStyles: ThemeClasses;
  language: AppLanguage;
  onNavigate: (view: string) => void;
  models: AIModel[];
  onToggleModel: (modelId: string) => void;
}

export const AIModelsView: React.FC<AIModelsProps> = ({ themeStyles, language, onNavigate, models, onToggleModel }) => {
  const copy = {
    title: language === 'zh' ? '已选 LLM 提供商' : 'Selected LLM Providers',
    subtitle: language === 'zh' ? '在 ChatGPT、Claude 和 Gemini 等提供商之间切换。' : 'Switch providers between ChatGPT, Claude and Gemini.',
    add: language === 'zh' ? '添加自定义 API 引擎' : 'Add custom API Engine',
    active: language === 'zh' ? '已启用' : 'Active Engine',
    offline: language === 'zh' ? '离线' : 'Offline',
    purpose: language === 'zh' ? '主要用途' : 'Primary purpose',
    apiKey: language === 'zh' ? '客户端 API Key' : 'Client credentials API Key',
    suspend: language === 'zh' ? '暂停引擎' : 'Suspend Engine',
    activate: language === 'zh' ? '设为主引擎' : 'Activate to Primary',
  };
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center border-b border-neutral-200 dark:border-white/10 pb-4">
        <div>
          <h3 className={`text-lg font-bold ${themeStyles.textPrimary}`}>{copy.title}</h3>
          <p className="text-xs text-neutral-400">{copy.subtitle}</p>
        </div>
        <button 
          onClick={() => onNavigate('settings-addmodel')}
          className={`${themeStyles.btnPrimary} text-xs font-semibold py-1.5 px-3`}
        >
          {copy.add}
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
                  {m.isActive ? copy.active : copy.offline}
                </span>
              </div>
              
              <div className="mt-4 pt-3 border-t border-neutral-200 dark:border-white/5 space-y-2">
                <div className="flex justify-between text-[11px]">
                  <span className="text-neutral-400">{copy.purpose}</span>
                  <span className="font-semibold text-right">{m.purpose}</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-neutral-400">{copy.apiKey}</span>
                  <span className="font-mono">{m.apiKey}</span>
                </div>
              </div>
            </div>

            <div className="mt-6">
              <button 
                onClick={() => onToggleModel(m.id)}
                className={`w-full py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${m.isActive ? 'bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-neutral-500' : 'bg-indigo-600 hover:bg-indigo-700 text-white'}`}
              >
                {m.isActive ? copy.suspend : copy.activate}
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
  language: AppLanguage;
  onNavigate: (view: string) => void;
  onSaveModel: (model: Omit<AIModel, 'id' | 'isActive'>) => void;
}

export const AddNewModelView: React.FC<AddNewModelProps> = ({ themeStyles, language, onNavigate, onSaveModel }) => {
  const [name, setName] = useState('');
  const [provider, setProvider] = useState('OpenAI');
  const [apiKey, setApiKey] = useState('');
  const [purpose, setPurpose] = useState('Vocabulary scenarios generation');
  const [endpoint, setEndpoint] = useState('');
  const copy = {
    title: language === 'zh' ? '添加自定义 AI 引擎凭据' : 'Install Custom AI Engine credentials',
    subtitle: language === 'zh' ? '配置自定义 LLM 接口或第三方网关。' : 'Configure customized LLM endpoints or third-party gateways.',
    name: language === 'zh' ? '自定义引擎名称 *' : 'Custom Engine Name *',
    namePlaceholder: language === 'zh' ? '例如：Llama-3.3 客户端网关' : 'e.g., Llama-3.3 Client Host',
    provider: language === 'zh' ? '核心提供商模块' : 'Core Provider Module',
    endpoint: language === 'zh' ? '自定义接口地址' : 'Custom Endpoint Target',
    endpointPlaceholder: language === 'zh' ? 'https://api.gateway.net/v1' : 'https://api.gateway.net/v1',
    apiKey: language === 'zh' ? '私有 API Key *' : 'Provider Personal Secret API Key *',
    apiPlaceholder: language === 'zh' ? '输入凭据以建立连接...' : 'Introduce credentials to connect...',
    purpose: language === 'zh' ? '课程任务用途' : 'Curriculum Task Purpose assignment',
    save: language === 'zh' ? '验证并保存提供商' : 'Verify and Save Provider',
    cancel: language === 'zh' ? '取消' : 'Cancel',
  };

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
          <h3 className={`text-lg font-bold ${themeStyles.textPrimary}`}>{copy.title}</h3>
          <p className="text-xs text-neutral-400">{copy.subtitle}</p>
        </div>
      </div>

      <form onSubmit={submitForm} className="space-y-4 text-xs">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider mb-1">{copy.name}</label>
          <input 
            type="text" 
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={copy.namePlaceholder}
            className="w-full px-3 py-2 bg-black/5 dark:bg-white/5 border border-neutral-300 dark:border-white/10 rounded-xl text-xs"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1">{copy.provider}</label>
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
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1">{copy.endpoint}</label>
            <input 
              type="text" 
              value={endpoint}
              onChange={(e) => setEndpoint(e.target.value)}
              placeholder={copy.endpointPlaceholder}
              className="w-full px-3 py-2 bg-black/5 dark:bg-white/5 border border-neutral-300 dark:border-white/10 rounded-xl text-xs"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider mb-1">{copy.apiKey}</label>
          <input 
            type="password" 
            required
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={copy.apiPlaceholder}
            className="w-full px-3 py-2 bg-black/5 dark:bg-white/5 border border-neutral-300 dark:border-white/10 rounded-xl text-xs"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider mb-1">{copy.purpose}</label>
          <input 
            type="text" 
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            className="w-full px-3 py-2 bg-black/5 dark:bg-white/5 border border-neutral-300 dark:border-white/10 rounded-xl text-xs"
          />
        </div>

        <div className="flex gap-2 pt-4">
          <button type="submit" className={`${themeStyles.btnPrimary} py-2 font-bold flex-1`}>
            {copy.save}
          </button>
          <button 
            type="button" 
            onClick={() => onNavigate('settings-aimodels')} 
            className="bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-neutral-400 py-2 border border-neutral-200 dark:border-white/10 rounded-xl font-bold flex-1 cursor-pointer"
          >
            {copy.cancel}
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
  language: AppLanguage;
}

export const SyncStorageView: React.FC<SyncStorageProps> = ({ themeStyles, language }) => {
  const [cloudSync, setCloudSync] = useState(true);
  const [extensionStatus, setExtensionStatus] = useState(language === 'zh' ? '已启用' : 'Enabled');
  const [copied, setCopied] = useState(false);
  const [pairingCode, setPairingCode] = useState('');
  const [pairingExpiresAt, setPairingExpiresAt] = useState<number | null>(null);
  const [pairingError, setPairingError] = useState('');
  const copy = {
    title: language === 'zh' ? '云端同步与安全备份' : 'Cloud Synchronizing & Safe backups',
    subtitle: language === 'zh' ? '在浏览器扩展与词库之间同步间隔学习数据。' : 'Sync dictionary spacing databases across chrome browser units.',
    syncTitle: language === 'zh' ? '间隔学习云同步' : 'Spaced Intervals Cloud Syncing',
    syncDesc: language === 'zh' ? '安全更新复习间隔计数。' : 'Enable safe updates interval counters',
    pairingTitle: language === 'zh' ? 'Chrome 浏览器扩展配对' : 'Chrome browser extension pairing',
    pairingDesc: language === 'zh' ? '浏览新闻时自动显示点击翻译浮层。' : 'Automate click translate overlays while scanning news.',
    pairingCode: language === 'zh' ? '你的配对码' : 'Your Pairing Code',
    copied: language === 'zh' ? '已复制！' : 'Copied!',
    copyCode: language === 'zh' ? '复制配对码' : 'Copy Code',
    refresh: language === 'zh' ? '刷新' : 'Refresh',
    expires: language === 'zh' ? '过期时间' : 'Expires',
    cache: language === 'zh' ? '缓存占用' : 'Cache storage allocate',
    cacheAmount: language === 'zh' ? '2.8 MB / 10 MB 上限' : '2.8 MB / 10 MB maximum',
    export: language === 'zh' ? '导出词库 JSON' : 'Export Dictionary JSON',
    import: language === 'zh' ? '导入同步备份' : 'Import Sync Backup',
    noToken: language === 'zh' ? '无令牌' : 'No token',
    errorPrefix: language === 'zh' ? '错误' : 'Error',
  };

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
      setPairingError(copy.noToken);
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
        <h3 className={`text-lg font-bold ${themeStyles.textPrimary}`}>{copy.title}</h3>
        <p className="text-xs text-neutral-400">{copy.subtitle}</p>
      </div>

      <div className="space-y-5 text-xs">
        {/* Sync status element */}
        <div className="flex justify-between items-center py-3 bg-zinc-500/5 px-4 rounded-xl border border-neutral-300/30">
          <div>
            <span className="font-bold block">{copy.syncTitle}</span>
            <span className="text-[10px] text-neutral-400">{copy.syncDesc}</span>
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
              <h4 className="font-bold text-sm">{copy.pairingTitle}</h4>
              <p className="text-[11px] text-neutral-400 mt-0.5">{copy.pairingDesc}</p>
            </div>
            <span className="bg-emerald-550/15 text-emerald-600 px-2 py-0.5 rounded text-[9px] font-mono tracking-wider font-extrabold uppercase">
              {extensionStatus}
            </span>
          </div>

          <div className="pt-2">
            <span className="block text-[10px] font-mono uppercase text-neutral-400 mb-1">{copy.pairingCode}</span>
            <div className="flex space-x-1.5 items-center">
              <input 
                type="text" 
                readOnly 
                value={pairingCode || (pairingError ? `${copy.errorPrefix}: ${pairingError}` : '')}
                className="bg-black/5 dark:bg-white/5 border border-neutral-300 dark:border-white/10 px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex-1"
              />
              <button 
                onClick={handleCopy}
                className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-semibold font-sans hover:bg-indigo-700 cursor-pointer"
              >
                {copied ? copy.copied : copy.copyCode}
              </button>
              <button
                onClick={() => loadPairingCode(true)}
                className="px-3 py-1.5 bg-slate-200 dark:bg-white/10 text-neutral-600 dark:text-neutral-300 rounded-lg text-xs font-semibold font-sans hover:bg-slate-300 dark:hover:bg-white/15 cursor-pointer"
              >
                {copy.refresh}
              </button>
            </div>
            {pairingExpiresAt ? (
              <div className="text-[10px] text-neutral-400 mt-2 font-mono">
                {copy.expires}: {new Date(pairingExpiresAt).toLocaleString()}
              </div>
            ) : null}
          </div>
        </div>

        {/* Cache bounds storage bar */}
        <div className="space-y-1 bg-slate-100 dark:bg-white/5 p-4 rounded-xl border border-neutral-200 dark:border-white/10">
          <div className="flex justify-between uppercase font-mono text-[9px] text-neutral-400 font-bold">
            <span>{copy.cache}</span>
            <span>{copy.cacheAmount}</span>
          </div>
          <div className="w-full bg-slate-200 dark:bg-white/10 h-1.5 rounded-full overflow-hidden">
            <div className="h-full bg-indigo-600" style={{ width: '28%' }} />
          </div>
        </div>

        {/* Dynamic backup data operations */}
        <div className="grid grid-cols-2 gap-3 pt-3">
          <button className="flex items-center justify-center space-x-1.5 py-2.5 border border-neutral-300 dark:border-white/10 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer font-bold">
            <Upload className="w-4 h-4 text-neutral-400" />
            <span>{copy.export}</span>
          </button>
          
          <button className="flex items-center justify-center space-x-1.5 py-2.5 border border-neutral-300 dark:border-white/10 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer font-bold">
            <Database className="w-4 h-4 text-neutral-400" />
            <span>{copy.import}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
