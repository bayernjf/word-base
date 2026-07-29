import React, { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import { AppLanguage, Word } from '../../../types';
import { ThemeClasses } from '../../ThemeStyles';
import { createTranslator } from '../../../i18n';
import { fetchPracticeContent, type ReadingContent } from '../../../lib/practice';

interface ReadingPracticeProps {
  themeStyles: ThemeClasses;
  language: AppLanguage;
  onNavigate: (view: string) => void;
  words: Word[];
  accessToken?: string;
}

export const ReadingPracticeView: React.FC<ReadingPracticeProps> = ({ themeStyles, language, onNavigate, words, accessToken }) => {
  const [content, setContent] = useState<ReadingContent | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedWordDesc, setSelectedWordDesc] = useState<{ en: string; zh: string; text: string } | null>(null);
  const [quizAnswer, setQuizAnswer] = useState<number | null>(null);
  const t = createTranslator(language);

  const loadContent = useCallback(async () => {
    if (!accessToken) { setError('auth_required'); return; }
    const wordList = words.map(w => w.word).filter(Boolean).slice(0, 8);
    if (wordList.length === 0) { setError('no_words'); return; }

    setLoading(true);
    setError(null);
    setContent(null);
    setQuizAnswer(null);
    setSelectedWordDesc(null);

    try {
      const result = await fetchPracticeContent(
        { type: 'reading', words: wordList, difficulty: 'B2' },
        accessToken
      );
      if (result.reading) {
        setContent(result.reading);
      } else {
        setError('no_content');
      }
    } catch (err) {
      setError(String((err as Error)?.message || 'load_failed'));
    } finally {
      setLoading(false);
    }
  }, [accessToken, words]);

  useEffect(() => {
    loadContent();
  }, [loadContent]);

  const handleWordClick = (word: string) => {
    if (!content) return;
    const cleaned = word.toLowerCase().replace(/[,.()]/g, '');
    const lookup = content.highlighted[cleaned];
    if (lookup) {
      setSelectedWordDesc({
        text: cleaned,
        en: lookup.definition,
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

      {loading && (
        <div className={`${themeStyles.card} flex flex-col items-center justify-center py-16 space-y-3`}>
          <RefreshCw className="w-6 h-6 animate-spin text-indigo-500" />
          <p className="text-xs text-neutral-400">{t('reading.loading')}</p>
        </div>
      )}

      {error && !loading && (
        <div className={`${themeStyles.card} flex flex-col items-center justify-center py-16 space-y-3`}>
          <p className="text-xs text-rose-500">
            {error === 'no_words' ? t('reading.noWords') :
             error === 'auth_required' ? t('reading.authRequired') :
             error === 'no_active_ai_provider' ? t('reading.noModel') :
             error === 'daily_quota_exceeded' ? t('reading.quotaExceeded') :
             t('reading.loadFailed')}
          </p>
          {error !== 'auth_required' && error !== 'no_words' && (
            <button onClick={loadContent} className={`${themeStyles.btnPrimary} text-xs px-4 py-2`}>
              {t('reading.retry')}
            </button>
          )}
        </div>
      )}

      {content && !loading && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Passages container */}
          <div className="lg:col-span-2 space-y-6">
            <div className={`${themeStyles.card} relative overflow-hidden`}>
              <div className="absolute top-0 right-0 p-3 bg-teal-550/10 text-emerald-800 rounded-bl-xl text-[10px] font-mono tracking-widest uppercase font-bold">
                {t('reading.section')}
              </div>

              <h2 className={`text-xl font-bold pr-20 ${themeStyles.textPrimary}`}>{content.article.title}</h2>
              <p className="text-xs text-neutral-400 mt-1 flex items-center space-x-2">
                <span>{t('reading.category')}: {content.article.category}</span>
                <span>•</span>
                <span className="bg-amber-100 text-amber-800 border border-amber-250 px-1.5 py-0.5 rounded text-[10px] uppercase font-bold">{content.article.difficulty}</span>
              </p>

              {/* Paragraph markup */}
              <div className="mt-6 p-4 rounded-xl leading-relaxed font-serif text-sm border bg-stone-500/5 select-text shadow-xs">
                <p className="inline leading-loose">
                  {content.article.content.split(' ').map((word, i) => {
                    const norm = word.toLowerCase().replace(/[,.()]/g, '');
                    const isHighlight = norm in content.highlighted;
                    return (
                      <span
                        key={i}
                        onClick={() => handleWordClick(word)}
                        className={`${isHighlight ? 'text-indigo-650 cursor-pointer hover:underline font-bold bg-indigo-500/10 px-1 py-0.5 rounded-sm inline-block mx-0.5' : 'hover:bg-slate-200/50 cursor-pointer px-0.5 inline-block rounded-xs'}`}
                      >
                        {word}{' '}
                      </span>
                    );
                  })}
                </p>
              </div>

              <div className="mt-4 flex justify-end">
                <button onClick={loadContent} className="flex items-center space-x-1 text-xs text-neutral-400 hover:text-indigo-500 transition-colors cursor-pointer">
                  <RefreshCw className="w-3 h-3" />
                  <span>{t('reading.newArticle')}</span>
                </button>
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
            {content.quizzes.length > 0 && (
              <div className={`${themeStyles.card}`}>
                <h4 className="text-sm font-bold uppercase tracking-wider mb-3 border-b border-neutral-100 dark:border-white/10 pb-2">
                  {t('reading.quizTitle')}
                </h4>

                {content.quizzes.map((q, qidx) => (
                  <div key={qidx} className="space-y-3 pb-4 mb-4 border-b border-dotted border-neutral-200 dark:border-white/5 last:border-0 last:pb-0">
                    <p className="text-xs font-semibold leading-relaxed">{qidx + 1}. {q.question}</p>

                    <div className="space-y-2 text-xs">
                      {q.options.map((opt, oidx) => {
                        const isSelected = quizAnswer === oidx && qidx === 0;
                        const isCorrect = oidx === q.correctIndex;
                        const hasAnswered = quizAnswer !== null && qidx === 0;

                        let btnStyle = 'hover:bg-slate-100 dark:hover:bg-white/5 border-neutral-200';
                        if (isSelected) {
                          btnStyle = isCorrect ? 'bg-emerald-500/15 border-emerald-500 text-emerald-800' : 'bg-rose-500/15 border-rose-500 text-rose-800';
                        } else if (hasAnswered && isCorrect) {
                          btnStyle = 'bg-emerald-500/10 border-emerald-400 text-emerald-700 dark:text-emerald-300';
                        }

                        return (
                          <button
                            key={oidx}
                            disabled={hasAnswered}
                            onClick={() => setQuizAnswer(oidx)}
                            className={`w-full text-left p-2.5 rounded-xl border font-medium transition-all cursor-pointer ${btnStyle}`}
                          >
                            {opt}
                          </button>
                        );
                      })}
                    </div>

                    {quizAnswer !== null && qidx === 0 && (
                      <div className="pt-2 animate-fade-in text-[10px] leading-relaxed">
                        {quizAnswer === q.correctIndex ? (
                          <p className="text-emerald-700 font-semibold">✓ {t('reading.correct')}</p>
                        ) : (
                          <p className="text-rose-700 font-semibold">✗ {t('reading.incorrect')}</p>
                        )}
                        <p className="text-neutral-400 mt-1">{q.explanation}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
