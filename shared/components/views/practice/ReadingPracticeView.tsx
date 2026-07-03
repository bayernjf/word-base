import React, { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { AppLanguage } from '../../../types';
import { ThemeClasses } from '../../ThemeStyles';
import { createTranslator } from '../../../i18n';

interface ReadingPracticeProps {
  themeStyles: ThemeClasses;
  language: AppLanguage;
  onNavigate: (view: string) => void;
}

export const ReadingPracticeView: React.FC<ReadingPracticeProps> = ({ themeStyles, language, onNavigate }) => {
  const [selectedWordDesc, setSelectedWordDesc] = useState<{ en: string; zh: string; text: string } | null>(null);
  const [quizAnswer, setQuizAnswer] = useState<number | null>(null);
  const t = createTranslator(language);

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
        en: t('reading.genericGlossaryEn'),
        zh: t('reading.genericGlossaryZh')
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
        <span>{t('reading.back')}</span>
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Passages container */}
        <div className="lg:col-span-2 space-y-6">
          <div className={`${themeStyles.card} relative overflow-hidden`}>
            <div className="absolute top-0 right-0 p-3 bg-teal-550/10 text-emerald-800 rounded-bl-xl text-[10px] font-mono tracking-widest uppercase font-bold">
              {t('reading.section')}
            </div>

            <h2 className={`text-xl font-bold pr-20 ${themeStyles.textPrimary}`}>{article.title}</h2>
            <p className="text-xs text-neutral-400 mt-1 flex items-center space-x-2">
              <span>{t('reading.category')}: {article.category}</span>
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
                <span className="font-mono text-xs font-bold uppercase text-neutral-400">{t('reading.glossary')}</span>
                <button 
                  onClick={() => setSelectedWordDesc(null)}
                  className="text-xs hover:bg-slate-100 dark:hover:bg-white/5 p-1 rounded-sm"
                >
                  {t('reading.close')}
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
              {t('reading.quizTitle')}
            </h4>
            <p className="text-xs font-semibold mb-3">{t('reading.quizQuestion')}</p>
            
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
                  <p className="text-emerald-700 font-semibold">✓ {t('reading.correct')}</p>
                ) : (
                  <p className="text-rose-700 font-semibold">✗ {t('reading.incorrect')}</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
