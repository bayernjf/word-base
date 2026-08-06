import React from 'react';
import { Volume2, Mic, BookOpen, FileText, RotateCcw, Sparkles } from 'lucide-react';
import { AppLanguage, Word } from '../../../types';
import { ThemeClasses } from '../../ThemeStyles';
import { createTranslator } from '../../../i18n';
import { getDueWords } from '../../../lib/srs';

interface PracticeMainProps {
  themeStyles: ThemeClasses;
  language: AppLanguage;
  onNavigate: (view: string) => void;
  words?: Word[];
  hasActiveModel?: boolean;
}

export const PracticeMainView: React.FC<PracticeMainProps> = ({ themeStyles, language, onNavigate, words = [], hasActiveModel = false }) => {
  const t = createTranslator(language);
  const isGlass = themeStyles.name === 'glass';
  const accentIcon = isGlass ? 'bg-indigo-500/10 text-indigo-300' : 'bg-[#56a978]/15 text-[#2f805d]';
  const accentBar = isGlass ? 'bg-indigo-400' : 'bg-[#56a978]';
  const dueCount = getDueWords(words).length;

  const cards = [
    {
      id: 'review',
      title: language === 'en' ? 'Spaced Review' : '间隔复习',
      icon: 'RotateCcw',
      count: language === 'en' ? `${dueCount} due` : `${dueCount} 个待复习`,
      progress: words.length ? Math.round(((words.length - dueCount) / words.length) * 100) : 0,
      desc: language === 'en' ? 'Flip cards and rate recall to schedule the next review.' : '翻卡评分，自动安排下一次复习时间。',
      isReady: true,
    },
    {
      id: 'reading',
      title: t('practiceMain.readingTitle'),
      icon: 'BookOpen',
      count: t('practiceMain.readingCount'),
      progress: 0,
      desc: language === 'en' ? 'AI-generated articles using your vocabulary.' : 'AI 根据你的生词生成阅读文章。',
      isReady: hasActiveModel && words.length > 0,
    },
    {
      id: 'writing',
      title: t('practiceMain.writingTitle'),
      icon: 'FileText',
      count: t('practiceMain.writingCount'),
      progress: 0,
      desc: language === 'en' ? 'Write with your vocabulary and get AI feedback.' : '用你的生词写作，获取 AI 批改反馈。',
      isReady: hasActiveModel && words.length > 0,
    },
    {
      id: 'listening',
      title: t('practiceMain.listeningTitle'),
      icon: 'Volume2',
      count: t('practiceMain.listeningCount'),
      progress: 0,
      desc: language === 'en' ? 'Listen to AI-generated passages and answer quizzes.' : '听 AI 生成的短文，回答理解题。',
      isReady: hasActiveModel && words.length > 0,
    },
    {
      id: 'speaking',
      title: t('practiceMain.speakingTitle'),
      icon: 'Mic',
      count: t('practiceMain.speakingCount'),
      progress: 0,
      desc: language === 'en' ? 'Read aloud and get AI pronunciation feedback.' : '跟读句子，获取 AI 发音评估。',
      isReady: hasActiveModel && words.length > 0,
    },
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
                <span className={`p-3 ${accentIcon} rounded-2xl`}>
                  {card.id === 'listening' ? <Volume2 className="w-6 h-6" /> :
                   card.id === 'speaking' ? <Mic className="w-6 h-6" /> :
                   card.id === 'reading' ? <BookOpen className="w-6 h-6" /> :
                   card.id === 'review' ? <RotateCcw className="w-6 h-6" /> :
                   <FileText className="w-6 h-6" />}
                </span>
                <span className="font-mono text-xs text-neutral-400 uppercase">{card.count}</span>
              </div>

              <h3 className={`text-base font-bold mb-1.5 ${themeStyles.textPrimary}`}>
                {card.title}
                {!card.isReady && card.id !== 'review' && (
                  <span className="ml-2 text-[9px] px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded uppercase font-mono">
                    {language === 'en' ? 'Needs AI Model' : '需配置 AI'}
                  </span>
                )}
              </h3>
              <p className={`text-xs ${themeStyles.textSecondary}`}>{card.desc}</p>
            </div>

            <div className="mt-6 pt-4 border-t border-neutral-200 dark:border-white/10 space-y-2">
              {card.id === 'review' ? (
                <>
                  <div className="flex justify-between text-[10px] font-mono">
                    <span>{t('practiceMain.progress')}</span>
                    <span>{card.progress}%</span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-white/10 h-1.5 rounded-full overflow-hidden">
                    <div className={`h-full ${accentBar}`} style={{ width: `${card.progress}%` }} />
                  </div>
                </>
              ) : (
                <div className="flex items-center space-x-1 text-[10px] font-mono text-neutral-400">
                  <Sparkles className="w-3 h-3" />
                  <span>{language === 'en' ? 'AI-powered' : 'AI 驱动'}</span>
                </div>
              )}

              <button
                onClick={() => onNavigate(`practice-${card.id}`)}
                className={`w-full text-xs mt-3 ${themeStyles.btnPrimary}`}
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
