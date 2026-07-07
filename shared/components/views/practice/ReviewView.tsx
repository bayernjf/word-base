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
    example: '例句',
    clozeHint: '根据语境填出空缺的单词',
    recallHint: '根据释义回忆这个单词',
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
    example: 'Example',
    clozeHint: 'Recall the missing word from the context',
    recallHint: 'Recall the word from its meaning',
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

const CLOZE_BLANK = '\u0000CLOZE\u0000';

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * 判断一个语境句子是否"有效"——不能只是单词本身或太短，
 * 必须包含足够的上下文信息才有做完形填空的价值。
 */
function isValidContext(sentence: string, word: string): boolean {
  const s = sentence.trim();
  const w = word.trim().toLowerCase();
  if (!s || !w) return false;
  // 句子长度至少是单词的 3 倍以上，且包含空格（即至少两个词）
  if (s.length < w.length * 3) return false;
  if (!/\s/.test(s)) return false;
  // 去掉目标词后剩余内容不能太少
  const remaining = s.replace(new RegExp(`\\b${escapeRegExp(w)}\\b`, 'gi'), '').trim();
  return remaining.length >= w.length * 2;
}

/**
 * 把语境句中的目标词挖空，返回 { masked, matched }。
 * 优先整词匹配；匹配不到时（词形变化等）退化为前缀匹配，挖掉同词根的词。
 * matched=false 时表示句子里找不到该词，调用方应回退到纯释义回忆模式。
 */
function buildCloze(sentence: string, word: string): { masked: string; matched: boolean } {
  const target = word.trim();
  if (!target) return { masked: sentence, matched: false };

  const whole = new RegExp(`\\b${escapeRegExp(target)}\\b`, 'gi');
  if (whole.test(sentence)) {
    return { masked: sentence.replace(whole, CLOZE_BLANK), matched: true };
  }

  // 退化：匹配以目标词为前缀的变形（如 measure → measured / measures）
  const stem = target.length > 4 ? target.slice(0, Math.ceil(target.length * 0.7)) : target;
  const prefix = new RegExp(`\\b${escapeRegExp(stem)}[a-z]*\\b`, 'gi');
  if (prefix.test(sentence)) {
    return { masked: sentence.replace(prefix, CLOZE_BLANK), matched: true };
  }

  return { masked: sentence, matched: false };
}

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

  // 统一的可用句子列表：优先用户有效语境 → examples 例句
  // 每个条目：{ text: 英文句子, source: 'user' | 'example', translation?: 中文翻译 }
  const availableSentences = useMemo<
    Array<{ text: string; source: 'user' | 'example'; translation?: string }>
  >(() => {
    if (!activeWord) return [];
    const result: Array<{ text: string; source: 'user' | 'example'; translation?: string }> = [];

    // 1. 用户语境（过滤掉无效的）
    const userContexts = activeWord.contexts?.filter((c) => c?.context) ?? [];
    for (const c of userContexts) {
      if (isValidContext(c.context, activeWord.word)) {
        result.push({ text: c.context, source: 'user', translation: c.translation });
      }
    }

    // 2. AI 生成的 examples 例句
    const examples = activeWord.examples ?? [];
    for (const ex of examples) {
      if (ex?.en && isValidContext(ex.en, activeWord.word)) {
        result.push({ text: ex.en, source: 'example', translation: ex.zh });
      }
    }

    return result;
  }, [activeWord]);

  const [sentenceIndex, setSentenceIndex] = useState(0);

  // 切换到下一个待复习词时，句子索引归零
  useEffect(() => {
    setSentenceIndex(0);
  }, [activeWord?.id]);

  const safeSentenceIndex = Math.min(sentenceIndex, Math.max(0, availableSentences.length - 1));
  const currentSentence = availableSentences[safeSentenceIndex];

  // 语境化复习：把当前句子中的目标词挖空做完形填空；句中找不到该词则回退到纯释义回忆
  const cloze = useMemo(
    () => (currentSentence?.text && activeWord ? buildCloze(currentSentence.text, activeWord.word) : null),
    [currentSentence?.text, activeWord]
  );
  const isCloze = !showAnswer && !!cloze?.matched;

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
              {isCloze ? (
                <div className="mt-2">
                  <p className={`text-sm ${themeStyles.textSecondary}`}>{t.clozeHint}</p>
                  <div className="mt-1">
                    <WordPhonetics word={activeWord.word} fallbackPhonetic={activeWord.phonetic} language={language} />
                  </div>
                </div>
              ) : (
                <>
                  <h3 className={`text-4xl font-bold mt-2 ${themeStyles.textPrimary}`}>{activeWord.word}</h3>
                  <WordPhonetics word={activeWord.word} fallbackPhonetic={activeWord.phonetic} language={language} />
                </>
              )}
            </div>
            <RotateCcw className="w-5 h-5 text-indigo-400" />
          </div>

          {currentSentence?.text && (
            <div className={`rounded-2xl border ${themeStyles.borderClass} p-4 ${themeStyles.secondaryBg}`}>
              <div className="flex items-center justify-between mb-2">
                <p className={`text-xs font-semibold uppercase ${themeStyles.textSecondary}`}>
                  {isCloze ? '' : currentSentence.source === 'user' ? t.context : t.example}
                </p>
                {availableSentences.length > 1 && (
                  <div className={`flex items-center gap-1.5 text-xs ${themeStyles.textSecondary}`}>
                    <button
                      onClick={() => setSentenceIndex((i) => (i - 1 + availableSentences.length) % availableSentences.length)}
                      className="p-0.5 rounded hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
                      aria-label="previous sentence"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="font-mono tabular-nums">{safeSentenceIndex + 1}/{availableSentences.length}</span>
                    <button
                      onClick={() => setSentenceIndex((i) => (i + 1) % availableSentences.length)}
                      className="p-0.5 rounded hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
                      aria-label="next sentence"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
              <p className={`text-sm leading-relaxed ${themeStyles.textPrimary}`}>
                {isCloze
                  ? cloze!.masked.split(CLOZE_BLANK).map((segment, i, arr) => (
                      <React.Fragment key={i}>
                        {segment}
                        {i < arr.length - 1 && (
                          <span className="inline-block w-10 border-b-2 border-current align-baseline mx-0.5" />
                        )}
                      </React.Fragment>
                    ))
                  : currentSentence.text}
              </p>
              {showAnswer && currentSentence.translation && (
                <p className={`text-sm mt-2 ${themeStyles.textSecondary}`}>{currentSentence.translation}</p>
              )}
            </div>
          )}

          {/* 无可用句子时，提示用释义回忆 */}
          {!currentSentence?.text && !showAnswer && (
            <p className={`text-sm ${themeStyles.textSecondary}`}>{t.recallHint}</p>
          )}

          {showAnswer ? (
            <div className="space-y-4">
              <div className={`rounded-2xl border ${themeStyles.borderClass} p-4`}>
                <p className={`text-2xl font-bold ${themeStyles.textPrimary}`}>{activeWord.word}</p>
                <p className={`text-sm leading-relaxed mt-2 ${themeStyles.textPrimary}`}>
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
