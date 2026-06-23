import React from 'react';
import { Sparkles, ChevronRight, BookOpen } from 'lucide-react';
import { AppLanguage, Word, VocabularyBook } from '../../../types';
import { ThemeClasses } from '../../ThemeStyles';
import { createTranslator } from '../../../i18n';

interface DashboardProps {
  themeStyles: ThemeClasses;
  language: AppLanguage;
  onNavigate: (view: string) => void;
  books: VocabularyBook[];
  words: Word[];
}

export const DashboardView: React.FC<DashboardProps> = ({ themeStyles, language, onNavigate, books, words, user }) => {
  const t = createTranslator(language);
  const knownPercent = 65; // Simulated goal metric
  const displayName = user?.nickname || user?.email?.split('@')[0] || t('dashboard.learner');
  
  return (
    <div className="space-y-6">
      {/* Top Welcome Title Grid */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-linear-to-r from-indigo-500/10 to-purple-500/5 p-6 rounded-2xl border border-indigo-500/20">
        <div>
          <h2 className={`text-2xl font-bold tracking-tight ${themeStyles.textPrimary}`}>
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
          onClick={() => onNavigate('vocabulary')}
          className={`${themeStyles.btnPrimary} flex items-center justify-center space-x-2 py-3 px-5`}
        >
          <Sparkles className="w-4 h-4 fill-white/20" />
          <span>{t('dashboard.quickStart')}</span>
        </button>
      </div>


      {/* Grid: My Word lists */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className={`text-lg font-bold tracking-tight ${themeStyles.textPrimary}`}>
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
