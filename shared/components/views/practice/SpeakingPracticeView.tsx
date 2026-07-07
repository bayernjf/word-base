import React, { useState, useRef } from 'react';
import { ArrowLeft, Volume2, Mic, Square, RefreshCw } from 'lucide-react';
import { AppLanguage } from '../../../types';
import { ThemeClasses } from '../../ThemeStyles';
import { createTranslator } from '../../../i18n';
import { getPlatform } from '../../../platform';

interface SpeakingPracticeProps {
  themeStyles: ThemeClasses;
  language: AppLanguage;
  onNavigate: (view: string) => void;
}

export const SpeakingPracticeView: React.FC<SpeakingPracticeProps> = ({ themeStyles, language, onNavigate }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [activeTab, setActiveTab] = useState<'speak1' | 'speak2'>('speak1');
  const [recordingSuccess, setRecordingSuccess] = useState(false);
  const [gradeResult, setGradeResult] = useState<{ score: number; text: string; details: string } | null>(null);
  const t = createTranslator(language);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const practiceItems = {
    speak1: {
      title: 'Coffee Shop: Ordering details',
      prompt: "I'd like a medium vanilla latte with soy milk, and a butter croissant please.",
      tip: "Pronouncing the initial word 'latte' with correct flat 'a' sounds, and stressing the second syllable is essential."
    },
    speak2: {
      title: 'Business Negotiation: Counter-Proposal',
      prompt: 'While we value this collaboration, we need to negotiate a structural pivot on pricing models.',
      tip: 'Remember the sliding tone transition on "While we value". Sound collaborative but objective.'
    }
  };

  const handleStartRecord = () => {
    setIsRecording(true);
    setGradeResult(null);
    setRecordingSuccess(false);

    // simulated tape record bounds
    timerRef.current = setTimeout(() => {
      handleStopRecord();
    }, 6000);
  };

  const handleStopRecord = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setIsRecording(false);
    setRecordingSuccess(true);
    
    // simulated accuracy parser AI grader
    setTimeout(() => {
      const activePrompt = practiceItems[activeTab];
      const matchWord = activePrompt.prompt.includes('latte') ? 'vanilla latte' : 'negotiate';
      setGradeResult({
        score: Math.floor(Math.random() * 12) + 85,
        text: t('speaking.fluent'),
        details: t('speaking.gradeDetail', { word: matchWord })
      });
    }, 1000);
  };

  const speakTextRef = () => {
    getPlatform().speak(practiceItems[activeTab].prompt, { lang: 'en-US' });
  };

  return (
    <div className="space-y-6">
      <button 
        onClick={() => onNavigate('practice')}
        className="inline-flex items-center space-x-1 text-xs font-medium hover:underline text-neutral-500 cursor-pointer"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>{t('speaking.back')}</span>
      </button>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Workspace */}
        <div className="md:col-span-2 space-y-6">
          <div className={`${themeStyles.card} space-y-5`}>
            <div className="flex justify-between items-center border-b border-neutral-200 dark:border-white/10 pb-4">
              <div>
                <span className={`${themeStyles.badgeClass} mb-1 inline-block`}>{t('speaking.badge')}</span>
                <h3 className={`text-lg font-bold ${themeStyles.textPrimary}`}>{t('speaking.pageTitle')}</h3>
              </div>
              
              <div className="flex space-x-2">
                <button 
                  onClick={() => { setActiveTab('speak1'); setGradeResult(null); }}
                  className={`px-3 py-1 text-xs border rounded-lg transition-all cursor-pointer ${activeTab === 'speak1' ? 'bg-indigo-600 text-white' : 'hover:bg-slate-100 dark:hover:bg-white/5'}`}
                >
                  {t('speaking.scenario1')}
                </button>
                <button 
                  onClick={() => { setActiveTab('speak2'); setGradeResult(null); }}
                  className={`px-3 py-1 text-xs border rounded-lg transition-all cursor-pointer ${activeTab === 'speak2' ? 'bg-indigo-600 text-white' : 'hover:bg-slate-100 dark:hover:bg-white/5'}`}
                >
                  {t('speaking.scenario2')}
                </button>
              </div>
            </div>

            {/* Speaking prompt */}
            <div className="bg-slate-100 dark:bg-white/5 p-5 rounded-2xl border border-neutral-300/30 relative shadow-inner">
              <span className="absolute top-2 right-2 text-[9px] font-mono uppercase text-neutral-400">{t('speaking.oralPrompt')}</span>
              <p className="text-base font-serif font-semibold italic text-slate-800 dark:text-neutral-100 leading-relaxed pr-10">
                "{practiceItems[activeTab].prompt}"
              </p>
              
              <button 
                onClick={speakTextRef}
                className="mt-4 flex items-center space-x-1.5 text-xs text-indigo-650 hover:underline cursor-pointer"
              >
                <Volume2 className="w-4 h-4" />
                <span>{t('speaking.nativeAudio')}</span>
              </button>
            </div>

            {/* Mic button checks */}
            <div className="flex flex-col items-center justify-center py-6 space-y-4">
              <button 
                onClick={isRecording ? handleStopRecord : handleStartRecord}
                className={`w-20 h-20 rounded-full flex items-center justify-center transition-all ${isRecording ? 'bg-rose-500 animate-pulse text-white scale-105 hover:bg-rose-600' : 'bg-indigo-600 hover:bg-indigo-700 text-white'}`}
              >
                {isRecording ? <Square className="w-6 h-6 fill-white" /> : <Mic className="w-6 h-6" />}
              </button>
              <div className="text-center font-mono">
                {isRecording ? (
                  <span className="text-xs text-rose-500 font-semibold uppercase tracking-wider animate-pulse flex items-center space-x-1 justify-center">
                    <span className="w-2 h-2 bg-rose-500 rounded-full inline-block animate-ping mr-1" />
                    {t('speaking.recording')}
                  </span>
                ) : (
                  <span className="text-xs text-neutral-400">{t('speaking.recordHint')}</span>
                )}
              </div>

              {/* Recording visual spectrum */}
              {isRecording && (
                <div className="flex items-center space-x-1.5 h-6">
                  {Array.from({ length: 15 }).map((_, i) => (
                    <div 
                      key={i} 
                      className="w-1 bg-rose-400 rounded-full animate-bounce" 
                      style={{ 
                        height: `${Math.random() * 18 + 4}px`, 
                        animationDelay: `${i * 0.05}s`,
                        animationDuration: `${Math.random() * 0.4 + 0.3}s` 
                      }} 
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* AI feedback Panel */}
        <div className="space-y-4">
          <div className={`${themeStyles.card}`}>
            <h4 className="text-sm font-bold uppercase tracking-wider mb-3 border-b border-neutral-100 dark:border-white/10 pb-2">
              {t('speaking.insights')}
            </h4>
            <p className="text-xs leading-relaxed text-neutral-500 mb-4 font-sans">
              {practiceItems[activeTab].tip}
            </p>

            {gradeResult ? (
              <div className="bg-emerald-550/10 border border-emerald-550/20 p-4 rounded-xl space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-emerald-600">{t('speaking.grade')}</span>
                  <span className="text-xl font-mono font-extrabold text-emerald-600">{gradeResult.score}%</span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-white/10 h-1.5 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500" style={{ width: `${gradeResult.score}%` }} />
                </div>
                <p className="text-xs font-semibold">{gradeResult.text}</p>
                <p className="text-[11px] text-neutral-400 leading-normal">{gradeResult.details}</p>
              </div>
            ) : recordingSuccess ? (
              <div className="flex items-center justify-center p-6 space-x-2 text-neutral-400 text-xs">
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>{t('speaking.evaluating')}</span>
              </div>
            ) : (
              <div className="text-center py-8 text-neutral-400 text-xs italic">
                {t('speaking.awaiting')}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
