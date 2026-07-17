import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Play, Square, HelpCircle } from 'lucide-react';
import { AppLanguage, PracticeQuiz } from '../../../types';
import { ThemeClasses } from '../../ThemeStyles';
import { createTranslator } from '../../../i18n';

interface ListeningPracticeProps {
  themeStyles: ThemeClasses;
  language: AppLanguage;
  onNavigate: (view: string) => void;
  quizzes: PracticeQuiz[];
}

export const ListeningPracticeView: React.FC<ListeningPracticeProps> = ({ themeStyles, language, onNavigate, quizzes }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [revealedExplanations, setRevealedExplanations] = useState<Record<number, boolean>>({});

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (isPlaying) {
      timerRef.current = setInterval(() => {
        setProgress(p => {
          if (p >= 100) {
            setIsPlaying(false);
            clearInterval(timerRef.current!);
            return 100;
          }
          return p + 1.5 * speed;
        });
      }, 300);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isPlaying, speed]);

  const handleSeek = (index: number) => {
    // simulated tape jump
    setProgress(index * 25);
    setIsPlaying(true);
  };

  const currentSeconds = Math.floor((progress / 100) * 88); 
  const totalSeconds = 88;
  const t = createTranslator(language);

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="space-y-6">
      <button 
        onClick={() => onNavigate('practice')}
        className="inline-flex items-center space-x-1 text-xs font-medium hover:underline text-neutral-500 cursor-pointer"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>{t('listening.back')}</span>
      </button>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Playback center */}
        <div className="md:col-span-2 space-y-5">
          <div className={`${themeStyles.card} space-y-4`}>
            <div className="flex justify-between items-start">
              <div>
                <span className={`${themeStyles.badgeClass} mb-2`}>{t('listening.badge')}</span>
                <h3 className={`text-lg font-bold ${themeStyles.textPrimary}`}>{t('listening.title')}</h3>
              </div>
              <span className="text-xs font-mono text-neutral-400">{t('listening.duration')}: 01:28</span>
            </div>

            {/* Audio tape visualizer simulation */}
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

            {/* Simulated audio commands bar */}
            <div className="flex items-center justify-between gap-4 bg-slate-50 dark:bg-white/5 p-3 rounded-xl border border-slate-200 dark:border-white/5">
              <div className="flex items-center space-x-3">
                <button 
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="p-3 bg-indigo-650 text-white rounded-full hover:bg-indigo-700 hover:scale-105 active:scale-95 transition-all text-center cursor-pointer"
                >
                  {isPlaying ? <Square className="w-4 h-4 fill-white" /> : <Play className="w-4 h-4 fill-white" />}
                </button>
                <div className="text-xs font-mono">
                  <span>{formatTime(currentSeconds)}</span>
                  <span className="text-neutral-400"> / {formatTime(totalSeconds)}</span>
                </div>
              </div>

              {/* Speed rate chooser */}
              <div className="flex items-center space-x-1.5 font-mono text-xs">
                <span className="text-[10px] text-neutral-400 uppercase">{t('listening.speed')}</span>
                {[0.8, 1.0, 1.25, 1.5].map(s => (
                  <button 
                    key={s} 
                    onClick={() => setSpeed(s)}
                    className={`px-2 py-0.5 rounded-sm font-semibold transition-colors ${speed === s ? 'bg-indigo-600 text-white' : 'hover:bg-slate-200 dark:hover:bg-white/5'}`}
                  >
                    {s}x
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Interactive timed transcripts */}
          <div className={`${themeStyles.card}`}>
            <h3 className={`text-sm font-semibold uppercase tracking-wider mb-3 ${themeStyles.textPrimary}`}>
              {t('listening.transcript')}
            </h3>
            <div className="space-y-4 text-sm leading-relaxed">
              {[
                { time: '0:00', text: 'Good morning corporate listeners, in today’s review segment we explore synergy.', progressLimit: 0 },
                { time: '0:22', text: 'To synergize means to integrate departments, overcoming traditional division blocks.', progressLimit: 25 },
                { time: '0:45', text: 'Often team members raise logical concern over personal bandwidth limits.', progressLimit: 50 },
                { time: '1:08', text: 'Therefore executing strategic pivot moves ensures agile, collaborative workflows.', progressLimit: 75 }
              ].map((para, i) => {
                const isActive = progress >= para.progressLimit && progress < para.progressLimit + 25;
                return (
                  <div 
                    key={i} 
                    onClick={() => handleSeek(i)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer ${isActive ? 'bg-indigo-500/10 border-indigo-500/30 font-semibold' : 'border-transparent hover:bg-slate-100 dark:hover:bg-white/5'}`}
                  >
                    <span className="text-[10px] font-mono text-neutral-400 block mb-0.5">{para.time}</span>
                    <p>{para.text}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Quizzes Sidebar checks */}
        <div className="space-y-4">
          <div className={`${themeStyles.card}`}>
            <h4 className="text-sm font-bold uppercase tracking-wider mb-4 border-b border-neutral-200 dark:border-white/15 pb-2">
              {t('listening.quizzes')}
            </h4>
            
            {quizzes.map((q, qidx) => (
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
        </div>
      </div>
    </div>
  );
};
