import React from 'react';
import { Sparkles, ChevronRight, BookOpen, RotateCcw } from 'lucide-react';
import { AppLanguage, Word, VocabularyBook } from '../../../types';
import { ThemeClasses } from '../../ThemeStyles';
import { createTranslator } from '../../../i18n';
import { getDueWords } from '../../../lib/srs';
import { useIsMobile } from '../../../hooks/useIsMobile';

interface DashboardProps {
  themeStyles: ThemeClasses;
  language: AppLanguage;
  onNavigate: (view: string) => void;
  books: VocabularyBook[];
  words: Word[];
}

export const DashboardView: React.FC<DashboardProps> = ({ themeStyles, language, onNavigate, books, words, user }) => {
  const t = createTranslator(language);
  const isMobile = useIsMobile();
  const displayName = user?.nickname || user?.email?.split('@')[0] || t('dashboard.learner');
  const dueCount = getDueWords(words).length;
  const reviewTitle = language === 'en' ? 'Due today' : '今日待复习';
  const reviewDesc = language === 'en' ? `${dueCount} words ready` : `${dueCount} 个词待复习`;
  const quickStartView = dueCount > 0 ? 'practice-review' : 'vocabulary';
  
  return (
    <div className={isMobile ? 'space-y-4' : 'space-y-6'}>
      {/* Top Welcome Title Grid */}
      <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 bg-linear-to-r from-indigo-500/10 to-purple-500/5 ${isMobile ? 'p-4' : 'p-6'} rounded-2xl border border-indigo-500/20`}>
        <div>
          <h2 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold tracking-tight ${themeStyles.textPrimary}`}>
            {t('dashboard.welcome')}，{displayName}！✨
          </h2>
          {/* Streak info - Hidden */}
          {false && (
          <p className={`text-sm mt-1 ${themeStyles.textSecondary}`}>
            {t('dashboard.streakPrefix')} <span className="font-semibold text-emerald-600 dark:text-emerald-400">{t('dashboard.streak')}</span>{t('dashboard.streakSuffix')}
          </p>
          )}
        </div>
        <button 
          onClick={() => onNavigate(quickStartView)}
          className={`${themeStyles.btnPrimary} flex items-center justify-center space-x-2 py-3 px-5`}
        >
          <Sparkles className="w-4 h-4 fill-white/20" />
          <span>{t('dashboard.quickStart')}</span>
        </button>
      </div>

      <button
        onClick={() => onNavigate('practice-review')}
        className={`${themeStyles.card} w-full flex items-center justify-between gap-4 text-left cursor-pointer`}
      >
        <div className="flex items-center gap-3">
          <span className="p-3 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl">
            <RotateCcw className="w-5 h-5" />
          </span>
          <div>
            <h3 className={`text-base font-bold ${themeStyles.textPrimary}`}>{reviewTitle}</h3>
            <p className={`text-xs mt-1 ${themeStyles.textSecondary}`}>{reviewDesc}</p>
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-neutral-400" />
      </button>


      {/* Grid: My Word lists */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className={`${isMobile ? 'text-base' : 'text-lg'} font-bold tracking-tight ${themeStyles.textPrimary}`}>
            {t('dashboard.booksTitle')}
          </h3>
          <button 
            onClick={() => onNavigate('mylists')} 
            className="text-xs font-medium text-indigo-650 dark:text-indigo-400 hover:underline flex items-center space-x-1 cursor-pointer"
          >
            <span>{t('dashboard.manageBooks')}</span>
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
                  <p className={`text-xs mt-1 ${themeStyles.textSecondary}`}>{t('dashboard.wordsCount', { count: book.wordCount })}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
