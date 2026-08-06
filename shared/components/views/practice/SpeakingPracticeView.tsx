import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ArrowLeft, Volume2, Mic, Square, RefreshCw } from 'lucide-react';
import { AppLanguage, Word } from '../../../types';
import { ThemeClasses } from '../../ThemeStyles';
import { createTranslator } from '../../../i18n';
import { getPlatform } from '../../../platform';
import { fetchPracticeContent, requestPracticeEvaluate, type SpeakingScenario, type SpeakingEvaluation } from '../../../lib/practice';

interface SpeakingPracticeProps {
  themeStyles: ThemeClasses;
  language: AppLanguage;
  onNavigate: (view: string) => void;
  words: Word[];
  accessToken?: string;
}

// Web Speech API 类型声明（非标准 API）
interface SpeechRecognitionResult {
  transcript: string;
}
interface SpeechRecognitionEventLike {
  results: ArrayLike<{ 0: SpeechRecognitionResult }>;
  resultIndex: number;
}
interface SpeechRecognitionLike {
  lang: string;
  rate?: number;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
}

function getSpeechRecognition(): SpeechRecognitionLike | null {
  if (typeof window === 'undefined') return null;
  const w = window as any;
  const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
  if (!Ctor) return null;
  const instance = new Ctor();
  instance.lang = 'en-US';
  instance.continuous = false;
  instance.interimResults = false;
  return instance as SpeechRecognitionLike;
}

export const SpeakingPracticeView: React.FC<SpeakingPracticeProps> = ({ themeStyles, language, onNavigate, words, accessToken }) => {
  const [scenario, setScenario] = useState<SpeakingScenario | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [evaluation, setEvaluation] = useState<SpeakingEvaluation | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const t = createTranslator(language);

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const asrAvailable = typeof window !== 'undefined' && ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

  const loadScenario = useCallback(async () => {
    if (!accessToken) { setError('auth_required'); return; }
    const wordList = words.map(w => w.word).filter(Boolean).slice(0, 8);
    if (wordList.length === 0) { setError('no_words'); return; }

    setLoading(true);
    setError(null);
    setScenario(null);
    setTranscription('');
    setEvaluation(null);

    try {
      const result = await fetchPracticeContent(
        { type: 'speaking', words: wordList, difficulty: 'B2' },
        accessToken
      );
      if (result.speaking) {
        setScenario(result.speaking);
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
    loadScenario();
    return () => {
      // 清理录音资源
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, [loadScenario]);

  const speakText = () => {
    if (!scenario) return;
    getPlatform().speak(scenario.prompt, { lang: 'en-US', rate: 0.9 });
  };

  const handleStartRecord = () => {
    if (!asrAvailable) return;

    setTranscription('');
    setEvaluation(null);
    setIsRecording(true);

    const recognition = getSpeechRecognition();
    if (!recognition) {
      setIsRecording(false);
      setError('asr_unavailable');
      return;
    }

    recognition.onresult = (e: SpeechRecognitionEventLike) => {
      const text = e.results[e.results.length - 1][0].transcript;
      setTranscription(text);
    };
    recognition.onerror = () => {
      setIsRecording(false);
      setError('asr_error');
    };
    recognition.onend = () => {
      setIsRecording(false);
    };

    recognitionRef.current = recognition;

    // 同时用 MediaRecorder 录音（可用于后续上传到 Whisper 等 API）
    if (navigator.mediaDevices?.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
          streamRef.current = stream;
          const recorder = new MediaRecorder(stream);
          mediaRecorderRef.current = recorder;
          recorder.start();
        })
        .catch(() => {
          // 录音权限被拒绝，但 ASR 仍可能工作
        });
    }

    try {
      recognition.start();
    } catch {
      setIsRecording(false);
      setError('asr_error');
    }
  };

  const handleStopRecord = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setIsRecording(false);
  };

  const handleEvaluate = async () => {
    if (!accessToken || !scenario || !transcription.trim()) return;

    setIsEvaluating(true);
    setError(null);

    try {
      const result = await requestPracticeEvaluate(
        { type: 'speaking', originalPrompt: scenario.prompt, transcription },
        accessToken
      );
      if (result.speaking) {
        setEvaluation(result.speaking);
      } else {
        setError('evaluate_failed');
      }
    } catch (err) {
      setError(String((err as Error)?.message || 'evaluate_failed'));
    } finally {
      setIsEvaluating(false);
    }
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

      {(loading || (error && !scenario)) && (
        <div className={`${themeStyles.card} flex flex-col items-center justify-center py-16 space-y-3`}>
          {loading && <RefreshCw className="w-6 h-6 animate-spin text-indigo-500" />}
          <p className="text-xs text-neutral-400">
            {loading ? t('speaking.loading') :
             error === 'no_words' ? t('speaking.noWords') :
             error === 'auth_required' ? t('speaking.authRequired') :
             error === 'no_active_ai_provider' ? t('speaking.noModel') :
             error === 'daily_quota_exceeded' ? t('speaking.quotaExceeded') :
             t('speaking.loadFailed')}
          </p>
          {!loading && error !== 'auth_required' && error !== 'no_words' && (
            <button onClick={loadScenario} className={`${themeStyles.btnPrimary} text-xs px-4 py-2`}>
              {t('speaking.retry')}
            </button>
          )}
        </div>
      )}

      {scenario && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Workspace */}
          <div className="md:col-span-2 space-y-6">
            <div className={`${themeStyles.card} space-y-5`}>
              <div className="flex justify-between items-center border-b border-neutral-200 dark:border-white/10 pb-4">
                <div>
                  <span className={`${themeStyles.badgeClass} mb-1 inline-block`}>{t('speaking.badge')}</span>
                  <h3 className={`text-lg font-bold ${themeStyles.textPrimary}`}>{scenario.title}</h3>
                </div>
                <button onClick={loadScenario} className="flex items-center space-x-1 text-xs text-neutral-400 hover:text-indigo-500 transition-colors cursor-pointer">
                  <RefreshCw className="w-3 h-3" />
                  <span>{t('speaking.newScenario')}</span>
                </button>
              </div>

              {/* Speaking prompt */}
              <div className="bg-slate-100 dark:bg-white/5 p-5 rounded-2xl border border-neutral-300/30 relative shadow-inner">
                <span className="absolute top-2 right-2 text-[9px] font-mono uppercase text-neutral-400">{t('speaking.oralPrompt')}</span>
                <p className="text-base font-serif font-semibold italic text-slate-800 dark:text-neutral-100 leading-relaxed pr-10">
                  "{scenario.prompt}"
                </p>

                <button
                  onClick={speakText}
                  className="mt-4 flex items-center space-x-1.5 text-xs text-indigo-650 hover:underline cursor-pointer"
                >
                  <Volume2 className="w-4 h-4" />
                  <span>{t('speaking.nativeAudio')}</span>
                </button>
              </div>

              {/* ASR availability check */}
              {!asrAvailable && (
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/30 rounded-xl p-4 text-xs text-amber-700 dark:text-amber-400">
                  {t('speaking.asrUnavailable')}
                </div>
              )}

              {/* Mic button */}
              <div className="flex flex-col items-center justify-center py-6 space-y-4">
                <button
                  onClick={isRecording ? handleStopRecord : handleStartRecord}
                  disabled={!asrAvailable}
                  className={`w-20 h-20 rounded-full flex items-center justify-center transition-all ${isRecording ? 'bg-rose-500 animate-pulse text-white scale-105 hover:bg-rose-600' : 'bg-indigo-600 hover:bg-indigo-700 text-white'} disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer`}
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
                          height: `${Math.abs(Math.sin(i * 2 + Date.now() / 200)) * 18 + 4}px`,
                          animationDelay: `${i * 0.05}s`,
                          animationDuration: `${0.3 + (i % 3) * 0.1}s`
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Transcription display */}
              {transcription && (
                <div className="bg-slate-50 dark:bg-white/5 rounded-xl p-4 border border-neutral-200 dark:border-white/10">
                  <span className="text-[10px] font-mono uppercase text-neutral-400 block mb-1">{t('speaking.transcription')}</span>
                  <p className="text-xs leading-relaxed">"{transcription}"</p>
                  {!evaluation && !isEvaluating && (
                    <button
                      onClick={handleEvaluate}
                      className="mt-3 text-xs text-indigo-650 hover:underline cursor-pointer"
                    >
                      {t('speaking.evaluate')}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* AI feedback Panel */}
          <div className="space-y-4">
            <div className={`${themeStyles.card}`}>
              <h4 className="text-sm font-bold uppercase tracking-wider mb-3 border-b border-neutral-100 dark:border-white/10 pb-2">
                {t('speaking.insights')}
              </h4>
              <p className="text-xs leading-relaxed text-neutral-500 mb-4 font-sans">
                {scenario.tip}
              </p>

              {isEvaluating ? (
                <div className="flex items-center justify-center p-6 space-x-2 text-neutral-400 text-xs">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>{t('speaking.evaluating')}</span>
                </div>
              ) : evaluation ? (
                <div className="bg-emerald-550/10 border border-emerald-550/20 p-4 rounded-xl space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-emerald-600">{t('speaking.grade')}</span>
                    <span className="text-xl font-mono font-extrabold text-emerald-600">{evaluation.score}%</span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-white/10 h-1.5 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500" style={{ width: `${evaluation.score}%` }} />
                  </div>
                  <p className="text-xs font-semibold">{evaluation.fluency}</p>
                  <p className="text-[11px] text-neutral-400 leading-normal">{evaluation.accuracy}</p>
                  {evaluation.issues.length > 0 && (
                    <div className="pt-2 space-y-2">
                      <p className="text-[10px] font-mono uppercase text-neutral-400">{t('speaking.issues')}</p>
                      {evaluation.issues.map((issue, i) => (
                        <div key={i} className="text-[10px] bg-rose-500/5 border border-rose-500/10 rounded-lg p-2 space-y-0.5">
                          <p className="font-semibold text-rose-700 dark:text-rose-300">"{issue.word}"</p>
                          <p className="text-neutral-500">{t('speaking.expected')}: {issue.expected}</p>
                          <p className="text-neutral-500">{t('speaking.actual')}: {issue.actual}</p>
                          <p className="text-indigo-650 dark:text-indigo-400">{issue.suggestion}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-neutral-400 text-xs italic">
                  {t('speaking.awaiting')}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
