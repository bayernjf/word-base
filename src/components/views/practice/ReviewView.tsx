import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, CheckCircle2, RotateCcw, ChevronLeft, ChevronRight } from 'lucide-react';
import type { AppLanguage, Word } from '../../../types';
import type { ThemeClasses } from '../../ThemeStyles';
import { calcNextReview, getDueWords, ReviewQuality } from '../../../lib/srs';
import { WordPhonetics } from '../shared/WordPhonetics';

interface ReviewViewProps {
  themeStyles: ThemeClasses;
  language: AppLanguage;
  words: Word[];
  onNavigate: (view: string) => void;
  onReviewWord: (wordId: string, updates: Partial<Word>) => Promise<Word | null>;
}

const copy = {
  zh: {
    back: '返回练习',
    title: '今日复习',
    subtitle: '根据记忆强度安排下一次出现时间。',
    due: '待复习',
    emptyTitle: '今天没有到期词',
    emptyDesc: '新的复习会在间隔到期后自动出现。',
    context: '语境',
    showAnswer: '显示答案',
    again: '忘记',
    hard: '吃力',
    good: '记得',
    easy: '熟练',
    reviewed: '已完成',
  },
  en: {
    back: 'Back to practice',
    title: 'Today Review',
    subtitle: 'Schedule the next review from how well you remembered it.',
    due: 'due',
    emptyTitle: 'No due words today',
    emptyDesc: 'New reviews appear here when their interval expires.',
    context: 'Context',
    showAnswer: 'Show answer',
    again: 'Again',
    hard: 'Hard',
    good: 'Good',
    easy: 'Easy',
    reviewed: 'Reviewed',
  },
};

const ratings: Array<{ quality: ReviewQuality; key: 'again' | 'hard' | 'good' | 'easy'; className: string }> = [
  { quality: 2, key: 'again', className: 'border-rose-500/30 text-rose-500 hover:bg-rose-500/10' },
  { quality: 3, key: 'hard', className: 'border-amber-500/30 text-amber-500 hover:bg-amber-500/10' },
  { quality: 4, key: 'good', className: 'border-sky-500/30 text-sky-500 hover:bg-sky-500/10' },
  { quality: 5, key: 'easy', className: 'border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/10' },
];

export const ReviewView: React.FC<ReviewViewProps> = ({ themeStyles, language, words, onNavigate, onReviewWord }) => {
  const t = copy[language];
  const [showAnswer, setShowAnswer] = useState(false);
  const [reviewedCount, setReviewedCount] = useState(0);
  const [pendingWordIds, setPendingWordIds] = useState<string[]>([]);

  const dueWords = useMemo(
    () => getDueWords(words).filter((word) => !pendingWordIds.includes(word.id)),
    [pendingWordIds, words]
  );
  const activeWord = dueWords[0];
  const contexts = activeWord?.contexts?.filter((c) => c?.context) ?? [];
  const [contextIndex, setContextIndex] = useState(0);

  // 切换到下一个待复习词时，语境索引归零
  useEffect(() => {
    setContextIndex(0);
  }, [activeWord?.id]);

  const safeContextIndex = Math.min(contextIndex, Math.max(0, contexts.length - 1));
  const currentContext = contexts[safeContextIndex];

  const handleRate = async (quality: ReviewQuality) => {
    if (!activeWord) return;

    const reviewedAt = Date.now();
    const updates = calcNextReview(activeWord, quality, reviewedAt);
    setPendingWordIds((prev) => [...prev, activeWord.id]);
    setShowAnswer(false);

    const saved = await onReviewWord(activeWord.id, updates);
    if (saved) {
      setReviewedCount((count) => count + 1);
    } else {
      setPendingWordIds((prev) => prev.filter((id) => id !== activeWord.id));
    }
  };

  return (
    <div className="space-y-6">
      <button
        onClick={() => onNavigate('practice')}
        className={`flex items-center space-x-2 text-sm ${themeStyles.textSecondary} hover:${themeStyles.textPrimary} cursor-pointer`}
      >
        <ArrowLeft className="w-4 h-4" />
        <span>{t.back}</span>
      </button>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className={`text-2xl font-bold tracking-tight ${themeStyles.textPrimary}`}>{t.title}</h2>
          <p className={`text-sm mt-1 ${themeStyles.textSecondary}`}>{t.subtitle}</p>
        </div>
        <div className={`${themeStyles.badgeClass} self-start md:self-auto`}>
          {dueWords.length} {t.due} / {reviewedCount} {t.reviewed}
        </div>
      </div>

      {!activeWord ? (
        <div className={`${themeStyles.card} text-center py-12`}>
          <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-500 mb-3" />
          <h3 className={`text-lg font-bold ${themeStyles.textPrimary}`}>{t.emptyTitle}</h3>
          <p className={`text-sm mt-2 ${themeStyles.textSecondary}`}>{t.emptyDesc}</p>
        </div>
      ) : (
        <div className={`${themeStyles.card} space-y-6`}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className={`text-sm ${themeStyles.textSecondary}`}>{activeWord.partOfSpeech || activeWord.level || ''}</p>
              <h3 className={`text-4xl font-bold mt-2 ${themeStyles.textPrimary}`}>{activeWord.word}</h3>
              <WordPhonetics word={activeWord.word} fallbackPhonetic={activeWord.phonetic} language={language} />
            </div>
            <RotateCcw className="w-5 h-5 text-indigo-400" />
          </div>

          {currentContext?.context && (
            <div className={`rounded-2xl border ${themeStyles.borderClass} p-4 ${themeStyles.secondaryBg}`}>
              <div className="flex items-center justify-between mb-2">
                <p className={`text-xs font-semibold uppercase ${themeStyles.textSecondary}`}>{t.context}</p>
                {contexts.length > 1 && (
                  <div className={`flex items-center gap-1.5 text-xs ${themeStyles.textSecondary}`}>
                    <button
                      onClick={() => setContextIndex((i) => (i - 1 + contexts.length) % contexts.length)}
                      className="p-0.5 rounded hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
                      aria-label="previous context"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="font-mono tabular-nums">{safeContextIndex + 1}/{contexts.length}</span>
                    <button
                      onClick={() => setContextIndex((i) => (i + 1) % contexts.length)}
                      className="p-0.5 rounded hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
                      aria-label="next context"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
              <p className={`text-sm leading-relaxed ${themeStyles.textPrimary}`}>{currentContext.context}</p>
            </div>
          )}

          {showAnswer ? (
            <div className="space-y-4">
              <div className={`rounded-2xl border ${themeStyles.borderClass} p-4`}>
                <p className={`text-sm leading-relaxed ${themeStyles.textPrimary}`}>
                  {activeWord.translation || activeWord.chineseTranslation || activeWord.definition || '-'}
                </p>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {ratings.map((rating) => (
                  <button
                    key={rating.quality}
                    onClick={() => void handleRate(rating.quality)}
                    className={`rounded-xl border px-4 py-3 text-sm font-semibold transition-colors cursor-pointer ${rating.className}`}
                  >
                    {t[rating.key]}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <button onClick={() => setShowAnswer(true)} className={`${themeStyles.btnPrimary} w-full`}>
              {t.showAnswer}
            </button>
          )}
        </div>
      )}
    </div>
  );
};
