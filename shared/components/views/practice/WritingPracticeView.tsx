import React, { useState } from 'react';
import { ArrowLeft, Sparkles, RefreshCw } from 'lucide-react';
import { AppLanguage } from '../../../types';
import { ThemeClasses } from '../../ThemeStyles';
import { createTranslator } from '../../../i18n';

interface WritingPracticeProps {
  themeStyles: ThemeClasses;
  language: AppLanguage;
  onNavigate: (view: string) => void;
}

export const WritingPracticeView: React.FC<WritingPracticeProps> = ({ themeStyles, language, onNavigate }) => {
  const [text, setText] = useState('We need to expand our leverage metrics. Actually, we must do more negotiation to ensure department synergize properly.');
  const [feedback, setFeedback] = useState<Array<{ type: string; issue: string; suggest: string; detailKey: string; range: string }>>([]);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const t = createTranslator(language);

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
          detailKey: 'writing.fb1Detail',
          range: 'synergize properly'
        },
        { 
          type: 'vocabulary', 
          issue: 'do more negotiation', 
          suggest: 'negotiate further / engage in negotiations', 
          detailKey: 'writing.fb2Detail', 
          range: 'do more negotiation' 
        },
        { 
          type: 'style', 
          issue: 'Actually', 
          suggest: 'Furthermore / Consequently', 
          detailKey: 'writing.fb3Detail', 
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
        <span>{t('writing.back')}</span>
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Editor Main block */}
        <div className="lg:col-span-2 space-y-4">
          <div className={`${themeStyles.card} space-y-4`}>
            <div>
              <span className={`${themeStyles.badgeClass} mb-2`}>{t('writing.badge')}</span>
              <h3 className={`text-lg font-bold ${themeStyles.textPrimary}`}>{t('writing.title')}</h3>
              <p className={`text-xs ${themeStyles.textSecondary}`}>
                {t('writing.prompt')}
              </p>
            </div>

            <textarea 
              rows={12}
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="w-full p-4 bg-slate-50 dark:bg-white/5 border border-neutral-300 dark:border-white/10 rounded-2xl text-xs font-mono leading-relaxed focus:outline-hidden focus:border-indigo-500 resize-none shadow-inner"
              placeholder={t('writing.placeholder')}
            />

            <div className="flex justify-between items-center text-xs">
              <span className="text-neutral-400 font-mono">
                {text.length} {t('writing.chars')} / {text.split(/\s+/).filter(Boolean).length} {t('writing.words')}
              </span>
              
              <button 
                onClick={handleEvaluate}
                disabled={isEvaluating}
                className={`${themeStyles.btnPrimary} text-xs font-semibold px-4 py-2 flex items-center space-x-1.5`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{isEvaluating ? t('writing.checking') : t('writing.submit')}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Feedback results panel */}
        <div className="space-y-4">
          <div className={`${themeStyles.card}`}>
            <h4 className="text-sm font-bold uppercase tracking-wider mb-3 border-b border-neutral-100 dark:border-white/10 pb-2">
              {t('writing.feedback')}
            </h4>
            
            {isEvaluating ? (
              <div className="text-center py-12 space-y-2 text-xs">
                <RefreshCw className="w-6 h-6 animate-spin text-indigo-650 mx-auto" />
                <p className="text-neutral-400">{t('writing.reviewing')}</p>
              </div>
            ) : feedback.length > 0 ? (
              <div className="space-y-4">
                <div className="bg-indigo-50 dark:bg-white/5 p-3 rounded-xl border border-indigo-150 flex items-center justify-between text-xs text-indigo-700 dark:text-indigo-300 font-bold">
                  <span>{t('writing.score')}</span>
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
                      
                      <p className="font-semibold text-rose-700 dark:text-rose-300">💡 {t('writing.suggestion')}: {f.suggest}</p>
                      <p className="text-[10px] text-neutral-500 leading-normal">{t(f.detailKey as Parameters<typeof t>[0])}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-neutral-400 text-xs italic leading-normal">
                {t('writing.empty')}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
