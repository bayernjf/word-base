import React from 'react';
import { Volume2, Mic, BookOpen, FileText, RotateCcw } from 'lucide-react';
import { AppLanguage, Word } from '../../../types';
import { ThemeClasses } from '../../ThemeStyles';
import { createTranslator } from '../../../i18n';
import { getDueWords } from '../../../lib/srs';

interface PracticeMainProps {
  themeStyles: ThemeClasses;
  language: AppLanguage;
  onNavigate: (view: string) => void;
  words?: Word[];
}

export const PracticeMainView: React.FC<PracticeMainProps> = ({ themeStyles, language, onNavigate, words = [] }) => {
  const t = createTranslator(language);
  const dueCount = getDueWords(words).length;
  const cards = [
    {
      id: 'review',
      title: language === 'en' ? 'Spaced Review' : '间隔复习',
      icon: 'RotateCcw',
      count: language === 'en' ? `${dueCount} due` : `${dueCount} 个待复习`,
      progress: words.length ? Math.round(((words.length - dueCount) / words.length) * 100) : 100,
      desc: language === 'en' ? 'Flip cards and rate recall to schedule the next review.' : '翻卡评分，自动安排下一次复习时间。',
    },
    { id: 'listening', title: t('practiceMain.listeningTitle'), icon: 'Volume2', count: t('practiceMain.listeningCount'), progress: 40, desc: t('practiceMain.listeningDesc') },
    { id: 'speaking', title: t('practiceMain.speakingTitle'), icon: 'Mic', count: t('practiceMain.speakingCount'), progress: 15, desc: t('practiceMain.speakingDesc') },
    { id: 'reading', title: t('practiceMain.readingTitle'), icon: 'BookOpen', count: t('practiceMain.readingCount'), progress: 80, desc: t('practiceMain.readingDesc') },
    { id: 'writing', title: t('practiceMain.writingTitle'), icon: 'FileText', count: t('practiceMain.writingCount'), progress: 25, desc: t('practiceMain.writingDesc') }
  ];

  return (
    <div className="space-y-6">
      <div className="text-center max-w-xl mx-auto space-y-2">
        <h2 className={`text-2xl font-bold tracking-tight ${themeStyles.textPrimary}`}>{t('practiceMain.title')}</h2>
        <p className={`text-sm ${themeStyles.textSecondary}`}>
          {t('practiceMain.subtitle')}
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
                   card.id === 'review' ? <RotateCcw className="w-6 h-6" /> :
                   <FileText className="w-6 h-6" />}
                </span>
                <span className="font-mono text-xs text-neutral-400 uppercase">{card.count}</span>
              </div>
              
              <h3 className={`text-base font-bold mb-1.5 ${themeStyles.textPrimary}`}>{card.title}</h3>
              <p className={`text-xs ${themeStyles.textSecondary}`}>{card.desc}</p>
            </div>

            <div className="mt-6 pt-4 border-t border-neutral-200 dark:border-white/10 space-y-2">
              <div className="flex justify-between text-[10px] font-mono">
                <span>{t('practiceMain.progress')}</span>
                <span>{card.progress}%</span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-white/10 h-1.5 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-600" style={{ width: `${card.progress}%` }} />
              </div>
              
              <button 
                onClick={() => onNavigate(`practice-${card.id}`)}
                className="w-full text-center text-xs mt-3 ${themeStyles.btnPrimary} bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 rounded-xl transition-transform cursor-pointer"
              >
                {t('practiceMain.launch')}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
