import React, { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Sparkles, RefreshCw } from 'lucide-react';
import { AppLanguage, Word } from '../../../types';
import { ThemeClasses } from '../../ThemeStyles';
import { createTranslator } from '../../../i18n';
import { fetchPracticeContent, requestPracticeEvaluate, type WritingPrompt, type WritingFeedback } from '../../../lib/practice';

interface WritingPracticeProps {
  themeStyles: ThemeClasses;
  language: AppLanguage;
  onNavigate: (view: string) => void;
  words: Word[];
  accessToken?: string;
}

export const WritingPracticeView: React.FC<WritingPracticeProps> = ({ themeStyles, language, onNavigate, words, accessToken }) => {
  const [prompt, setPrompt] = useState<WritingPrompt | null>(null);
  const [text, setText] = useState('');
  const [feedback, setFeedback] = useState<WritingFeedback | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const t = createTranslator(language);

  const loadPrompt = useCallback(async () => {
    if (!accessToken) { setError('auth_required'); return; }
    const wordList = words.map(w => w.word).filter(Boolean).slice(0, 8);
    if (wordList.length === 0) { setError('no_words'); return; }

    setIsGenerating(true);
    setError(null);
    setPrompt(null);
    setText('');
    setFeedback(null);

    try {
      const result = await fetchPracticeContent(
        { type: 'writing', words: wordList, difficulty: 'B2' },
        accessToken
      );
      if (result.writing) {
        setPrompt(result.writing);
      } else {
        setError('no_content');
      }
    } catch (err) {
      setError(String((err as Error)?.message || 'load_failed'));
    } finally {
      setIsGenerating(false);
    }
  }, [accessToken, words]);

  useEffect(() => {
    loadPrompt();
  }, [loadPrompt]);

  const handleEvaluate = async () => {
    if (!accessToken || !prompt || !text.trim()) return;

    setIsEvaluating(true);
    setFeedback(null);
    setError(null);

    try {
      const result = await requestPracticeEvaluate(
        { type: 'writing', prompt: prompt.prompt, userText: text },
        accessToken
      );
      if (result.writing) {
        setFeedback(result.writing);
      } else {
        setError('evaluate_failed');
      }
    } catch (err) {
      setError(String((err as Error)?.message || 'evaluate_failed'));
    } finally {
      setIsEvaluating(false);
    }
  };

  const wordCount = text.split(/\s+/).filter(Boolean).length;

  return (
    <div className="space-y-6">
      <button
        onClick={() => onNavigate('practice')}
        className="inline-flex items-center space-x-1 text-xs font-medium hover:underline text-neutral-500 cursor-pointer"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>{t('writing.back')}</span>
      </button>

      {(isGenerating || (error && !prompt)) && (
        <div className={`${themeStyles.card} flex flex-col items-center justify-center py-16 space-y-3`}>
          {isGenerating && <RefreshCw className="w-6 h-6 animate-spin text-indigo-500" />}
          <p className="text-xs text-neutral-400">
            {isGenerating ? t('writing.loading') :
             error === 'no_words' ? t('writing.noWords') :
             error === 'auth_required' ? t('writing.authRequired') :
             error === 'no_active_ai_provider' ? t('writing.noModel') :
             error === 'daily_quota_exceeded' ? t('writing.quotaExceeded') :
             t('writing.loadFailed')}
          </p>
          {!isGenerating && error !== 'auth_required' && error !== 'no_words' && (
            <button onClick={loadPrompt} className={`${themeStyles.btnPrimary} text-xs px-4 py-2`}>
              {t('writing.retry')}
            </button>
          )}
        </div>
      )}

      {prompt && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Editor Main block */}
          <div className="lg:col-span-2 space-y-4">
            <div className={`${themeStyles.card} space-y-4`}>
              <div>
                <span className={`${themeStyles.badgeClass} mb-2`}>{t('writing.badge')}</span>
                <h3 className={`text-lg font-bold ${themeStyles.textPrimary}`}>{t('writing.title')}</h3>
                <p className={`text-xs ${themeStyles.textSecondary}`}>
                  {prompt.prompt}
                </p>
                {prompt.suggestedWords.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {prompt.suggestedWords.map(w => (
                      <span key={w} className="px-2 py-0.5 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded text-[10px] font-mono">
                        {w}
                      </span>
                    ))}
                  </div>
                )}
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
                  {text.length} {t('writing.chars')} / {wordCount} {t('writing.words')}
                  {prompt.minWords > 0 && wordCount < prompt.minWords && (
                    <span className="text-amber-500 ml-2">({t('writing.minWords', { count: prompt.minWords })})</span>
                  )}
                </span>

                <button
                  onClick={handleEvaluate}
                  disabled={isEvaluating || !text.trim() || wordCount < 10}
                  className={`${themeStyles.btnPrimary} text-xs font-semibold px-4 py-2 flex items-center space-x-1.5 disabled:opacity-50 disabled:cursor-not-allowed`}
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
              ) : feedback ? (
                <div className="space-y-4">
                  <div className="bg-indigo-50 dark:bg-white/5 p-3 rounded-xl border border-indigo-150 flex items-center justify-between text-xs text-indigo-700 dark:text-indigo-300 font-bold">
                    <span>{t('writing.score')}</span>
                    <span>{feedback.score}% {feedback.level}</span>
                  </div>

                  <div className="space-y-3">
                    {feedback.feedback.map((f, i) => (
                      <div key={i} className="p-3 bg-linear-to-r from-red-500/5 to-amber-500/5 border border-amber-500/20 rounded-xl space-y-1.5 leading-normal text-xs shadow-inner">
                        <div className="flex items-center justify-between">
                          <span className={`px-1.5 py-0.5 text-[8px] font-mono rounded-md uppercase font-black ${f.type === 'grammar' ? 'bg-rose-500 text-white' : f.type === 'vocabulary' ? 'bg-amber-500 text-black' : 'bg-indigo-600 text-white'}`}>
                            {f.type}
                          </span>
                          <span className="text-[10px] font-mono text-neutral-400">"{f.issue}"</span>
                        </div>

                        <p className="font-semibold text-rose-700 dark:text-rose-300">💡 {t('writing.suggestion')}: {f.suggestion}</p>
                        <p className="text-[10px] text-neutral-500 leading-normal">{f.explanation}</p>
                      </div>
                    ))}
                  </div>

                  <button onClick={loadPrompt} className="w-full text-xs text-neutral-400 hover:text-indigo-500 transition-colors flex items-center justify-center space-x-1 cursor-pointer">
                    <RefreshCw className="w-3 h-3" />
                    <span>{t('writing.newPrompt')}</span>
                  </button>
                </div>
              ) : (
                <div className="text-center py-12 text-neutral-400 text-xs italic leading-normal">
                  {t('writing.empty')}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
