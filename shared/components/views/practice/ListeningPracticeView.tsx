import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ArrowLeft, Play, Square, Pause, RefreshCw, HelpCircle } from 'lucide-react';
import { AppLanguage, Word } from '../../../types';
import { ThemeClasses } from '../../ThemeStyles';
import { createTranslator } from '../../../i18n';
import { getPlatform } from '../../../platform';
import { fetchPracticeContent, type ListeningContent } from '../../../lib/practice';

interface ListeningPracticeProps {
  themeStyles: ThemeClasses;
  language: AppLanguage;
  onNavigate: (view: string) => void;
  words: Word[];
  accessToken?: string;
}

export const ListeningPracticeView: React.FC<ListeningPracticeProps> = ({ themeStyles, language, onNavigate, words, accessToken }) => {
  const [content, setContent] = useState<ListeningContent | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSentenceIdx, setCurrentSentenceIdx] = useState(-1);
  const [speed, setSpeed] = useState(1);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [revealedExplanations, setRevealedExplanations] = useState<Record<number, boolean>>({});
  const t = createTranslator(language);

  const playbackRef = useRef(false);

  const loadContent = useCallback(async () => {
    if (!accessToken) { setError('auth_required'); return; }
    const wordList = words.map(w => w.word).filter(Boolean).slice(0, 8);
    if (wordList.length === 0) { setError('no_words'); return; }

    setLoading(true);
    setError(null);
    setContent(null);
    setIsPlaying(false);
    setCurrentSentenceIdx(-1);
    setSelectedAnswers({});
    setRevealedExplanations({});
    playbackRef.current = false;

    try {
      const result = await fetchPracticeContent(
        { type: 'listening', words: wordList, difficulty: 'B2' },
        accessToken
      );
      if (result.listening) {
        setContent(result.listening);
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
    return () => { playbackRef.current = false; };
  }, [loadContent]);

  // 逐句 TTS 播放
  const playFrom = useCallback(async (startIndex: number) => {
    if (!content || startIndex >= content.transcript.length) {
      setIsPlaying(false);
      setCurrentSentenceIdx(-1);
      playbackRef.current = false;
      return;
    }

    playbackRef.current = true;
    setIsPlaying(true);
    setCurrentSentenceIdx(startIndex);

    const sentence = content.transcript[startIndex];
    try {
      await getPlatform().speak(sentence.text, {
        lang: 'en-US',
        rate: speed,
        onEnd: () => {
          if (!playbackRef.current) return;
          // 播放下一句
          const nextIdx = startIndex + 1;
          if (nextIdx < content.transcript.length) {
            setCurrentSentenceIdx(nextIdx);
            playFrom(nextIdx);
          } else {
            setIsPlaying(false);
            setCurrentSentenceIdx(-1);
            playbackRef.current = false;
          }
        },
        onError: () => {
          setIsPlaying(false);
          setCurrentSentenceIdx(-1);
          playbackRef.current = false;
        },
      });
    } catch {
      setIsPlaying(false);
      setCurrentSentenceIdx(-1);
      playbackRef.current = false;
    }
  }, [content, speed]);

  const handlePlayPause = () => {
    if (isPlaying) {
      // 暂停：停止 TTS
      playbackRef.current = false;
      getPlatform().stopSpeak();
      setIsPlaying(false);
      setCurrentSentenceIdx(-1);
    } else {
      // 从头开始或从当前句继续
      const startIdx = currentSentenceIdx >= 0 ? currentSentenceIdx : 0;
      playFrom(startIdx);
    }
  };

  const handleSeek = (index: number) => {
    playbackRef.current = false;
    getPlatform().stopSpeak();
    setCurrentSentenceIdx(index);
    if (isPlaying) {
      playFrom(index);
    }
  };

  const handleSpeedChange = (newSpeed: number) => {
    setSpeed(newSpeed);
    if (isPlaying) {
      // 换速后从当前句重新播放
      const currentIdx = currentSentenceIdx >= 0 ? currentSentenceIdx : 0;
      playbackRef.current = false;
      getPlatform().stopSpeak();
      setTimeout(() => {
        setSpeed(newSpeed);
        playFrom(currentIdx);
      }, 100);
    }
  };

  const totalSegments = content?.transcript.length || 0;
  const progress = totalSegments > 0
    ? currentSentenceIdx >= 0 ? ((currentSentenceIdx + 1) / totalSegments) * 100 : 0
    : 0;

  return (
    <div className="space-y-6">
      <button
        onClick={() => { playbackRef.current = false; getPlatform().stopSpeak(); onNavigate('practice'); }}
        className="inline-flex items-center space-x-1 text-xs font-medium hover:underline text-neutral-500 cursor-pointer"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>{t('listening.back')}</span>
      </button>

      {loading && (
        <div className={`${themeStyles.card} flex flex-col items-center justify-center py-16 space-y-3`}>
          <RefreshCw className="w-6 h-6 animate-spin text-indigo-500" />
          <p className="text-xs text-neutral-400">{t('listening.loading')}</p>
        </div>
      )}

      {error && !loading && (
        <div className={`${themeStyles.card} flex flex-col items-center justify-center py-16 space-y-3`}>
          <p className="text-xs text-rose-500">
            {error === 'no_words' ? t('listening.noWords') :
             error === 'auth_required' ? t('listening.authRequired') :
             error === 'no_active_ai_provider' ? t('listening.noModel') :
             error === 'daily_quota_exceeded' ? t('listening.quotaExceeded') :
             t('listening.loadFailed')}
          </p>
          {error !== 'auth_required' && error !== 'no_words' && (
            <button onClick={loadContent} className={`${themeStyles.btnPrimary} text-xs px-4 py-2`}>
              {t('listening.retry')}
            </button>
          )}
        </div>
      )}

      {content && !loading && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Playback center */}
          <div className="md:col-span-2 space-y-5">
            <div className={`${themeStyles.card} space-y-4`}>
              <div className="flex justify-between items-start">
                <div>
                  <span className={`${themeStyles.badgeClass} mb-2`}>{t('listening.badge')}</span>
                  <h3 className={`text-lg font-bold ${themeStyles.textPrimary}`}>{t('listening.title')}</h3>
                </div>
                <span className="text-xs font-mono text-neutral-400">{t('listening.duration')}: {content.duration}</span>
              </div>

              {/* Audio visualizer */}
              <div className="h-16 bg-black/10 dark:bg-white/5 rounded-xl border border-neutral-200 dark:border-white/5 flex items-center justify-between px-6 overflow-hidden">
                <div className="flex items-center space-x-0.5 w-full">
                  {Array.from({ length: 45 }).map((_, i) => {
                    const animatedHeight = isPlaying ? Math.sin((progress + i) * 0.4) * 24 + 28 : Math.abs(Math.sin(i * 12)) * 10 + 6;
                    return (
                      <div
                        key={i}
                        className={`flex-1 rounded-sm transition-all duration-300 ${i / 45 * 100 <= progress ? 'bg-indigo-600 dark:bg-indigo-400' : 'bg-slate-300 dark:bg-white/10'}`}
                        style={{ height: `${animatedHeight}px` }}
                      />
                    );
                  })}
                </div>
              </div>

              {/* Audio controls bar */}
              <div className="flex items-center justify-between gap-4 bg-slate-50 dark:bg-white/5 p-3 rounded-xl border border-slate-200 dark:border-white/5">
                <div className="flex items-center space-x-3">
                  <button
                    onClick={handlePlayPause}
                    className="p-3 bg-indigo-650 text-white rounded-full hover:bg-indigo-700 hover:scale-105 active:scale-95 transition-all text-center cursor-pointer"
                  >
                    {isPlaying ? <Pause className="w-4 h-4 fill-white" /> : <Play className="w-4 h-4 fill-white" />}
                  </button>
                  <div className="text-xs font-mono">
                    <span>{currentSentenceIdx >= 0 ? `${currentSentenceIdx + 1}/${totalSegments}` : '0/0'}</span>
                  </div>
                </div>

                {/* Speed rate chooser */}
                <div className="flex items-center space-x-1.5 font-mono text-xs">
                  <span className="text-[10px] text-neutral-400 uppercase">{t('listening.speed')}</span>
                  {[0.8, 1.0, 1.25, 1.5].map(s => (
                    <button
                      key={s}
                      onClick={() => handleSpeedChange(s)}
                      className={`px-2 py-0.5 rounded-sm font-semibold transition-colors ${speed === s ? 'bg-indigo-600 text-white' : 'hover:bg-slate-200 dark:hover:bg-white/5'}`}
                    >
                      {s}x
                    </button>
                  ))}
                </div>

                <button onClick={loadContent} className="flex items-center space-x-1 text-xs text-neutral-400 hover:text-indigo-500 transition-colors cursor-pointer">
                  <RefreshCw className="w-3 h-3" />
                  <span>{t('listening.newContent')}</span>
                </button>
              </div>
            </div>

            {/* Interactive transcript */}
            <div className={`${themeStyles.card}`}>
              <h3 className={`text-sm font-semibold uppercase tracking-wider mb-3 ${themeStyles.textPrimary}`}>
                {t('listening.transcript')}
              </h3>
              <div className="space-y-4 text-sm leading-relaxed">
                {content.transcript.map((para, i) => {
                  const isActive = currentSentenceIdx === i;
                  const isPassed = currentSentenceIdx > i;
                  return (
                    <div
                      key={i}
                      onClick={() => handleSeek(i)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer ${isActive ? 'bg-indigo-500/10 border-indigo-500/30 font-semibold' : isPassed ? 'border-transparent opacity-60 hover:bg-slate-100 dark:hover:bg-white/5' : 'border-transparent hover:bg-slate-100 dark:hover:bg-white/5'}`}
                    >
                      <span className="text-[10px] font-mono text-neutral-400 block mb-0.5">{para.time}</span>
                      <p>{para.text}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Quizzes Sidebar */}
          <div className="space-y-4">
            {content.quizzes.length > 0 && (
              <div className={`${themeStyles.card}`}>
                <h4 className="text-sm font-bold uppercase tracking-wider mb-4 border-b border-neutral-200 dark:border-white/15 pb-2">
                  {t('listening.quizzes')}
                </h4>

                {content.quizzes.map((q, qidx) => (
                  <div key={qidx} className="space-y-3 pb-4 mb-4 border-b border-dotted border-neutral-200 dark:border-white/5 last:border-0 last:pb-0">
                    <p className="text-xs font-semibold leading-relaxed">{qidx + 1}. {q.question}</p>

                    <div className="space-y-1.5">
                      {q.options.map((opt, oidx) => {
                        const isSelected = selectedAnswers[qidx] === oidx;
                        const isCorrect = oidx === q.correctIndex;
                        const hasAnswered = selectedAnswers[qidx] !== undefined;

                        let btnStyle = 'bg-slate-100 dark:bg-white/5 border border-transparent';
                        if (isSelected) {
                          btnStyle = isCorrect ? 'bg-emerald-500/20 border-emerald-500 text-emerald-800 dark:text-emerald-300 font-medium' : 'bg-rose-500/20 border-rose-500 text-rose-800 dark:text-rose-300';
                        } else if (hasAnswered && isCorrect) {
                          btnStyle = 'bg-emerald-500/10 border-emerald-400 text-emerald-700 dark:text-emerald-300';
                        }

                        return (
                          <button
                            key={oidx}
                            disabled={hasAnswered}
                            onClick={() => setSelectedAnswers({...selectedAnswers, [qidx]: oidx})}
                            className={`w-full text-left p-2 rounded-xl text-[11px] leading-relaxed transition-all uppercase font-medium select-none ${btnStyle} cursor-pointer`}
                          >
                            {opt}
                          </button>
                        );
                      })}
                    </div>

                    {selectedAnswers[qidx] !== undefined && (
                      <div className="pt-2">
                        <button
                          onClick={() => setRevealedExplanations({...revealedExplanations, [qidx]: !revealedExplanations[qidx]})}
                          className="text-[10px] font-mono text-indigo-650 dark:text-indigo-400 hover:underline flex items-center space-x-1"
                        >
                          <HelpCircle className="w-3 h-3" />
                          <span>{revealedExplanations[qidx] ? t('listening.hideExplanation') : t('listening.viewExplanation')}</span>
                        </button>
                        {revealedExplanations[qidx] && (
                          <p className="text-[10px] text-neutral-400 leading-normal mt-1 p-2 bg-black/10 dark:bg-white/5 rounded-md">
                            {q.explanation}
                          </p>
                        )}
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
