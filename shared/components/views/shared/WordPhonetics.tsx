import React, { useEffect, useState } from 'react';
import { Volume2 } from 'lucide-react';
import { AppLanguage } from '../../../types';
import { createTranslator } from '../../../i18n';
import { getPlatform } from '../../../platform';

interface DictPhonetics {
  uk?: string;
  us?: string;
  ukAudio?: string;
  usAudio?: string;
}

interface WordPhoneticsProps {
  word: string;
  /** 已有音标，API 无结果时作为 fallback 展示 */
  fallbackPhonetic?: string;
  language: AppLanguage;
  /** 紧凑模式：小字号、自动换行 */
  compact?: boolean;
  /** 是否显示发音喇叭按钮（默认 compact 模式不显示，非 compact 模式显示） */
  showSpeaker?: boolean;
}

/**
 * 单词音标 + 真人发音组件：从 Free Dictionary API 获取英音/美音音标与音频，
 * 提供发音播放（音频失败时回退到浏览器 TTS）。供单词详情页与复习卡片共用，
 * 保证音标与发音表现一致。
 */
export const WordPhonetics: React.FC<WordPhoneticsProps> = ({ word, fallbackPhonetic, language, compact = false, showSpeaker }) => {
  // 默认：非 compact 模式显示喇叭，compact 模式不显示
  const shouldShowSpeaker = showSpeaker !== undefined ? showSpeaker : !compact;
  const t = createTranslator(language);
  const [dictPhonetics, setDictPhonetics] = useState<DictPhonetics>({});
  const [playingType, setPlayingType] = useState<'uk' | 'us' | 'tts' | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!word) {
      setLoaded(true);
      return;
    }
    let cancelled = false;
    setLoaded(false);
    fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word.toLowerCase())}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled) return;
        if (!Array.isArray(data) || !data[0]) {
          setDictPhonetics({});
          setLoaded(true);
          return;
        }
        const entry = data[0];
        const phonetics = (entry.phonetics || []) as Array<{ text?: string; audio?: string }>;
        let uk = '';
        let us = '';
        let ukAudio = '';
        let usAudio = '';
        for (const p of phonetics) {
          const text = p.text || '';
          const audio = p.audio || '';
          if (audio) {
            if (audio.includes('-uk') || audio.includes('_uk') || audio.endsWith('uk.mp3')) {
              ukAudio = audio;
              if (text) uk = text;
            } else if (audio.includes('-us') || audio.includes('_us') || audio.endsWith('us.mp3')) {
              usAudio = audio;
              if (text) us = text;
            }
          }
        }
        // fallback：按文本分配
        if (!uk || !us) {
          const texts = phonetics.filter((p) => p.text).map((p) => p.text as string);
          if (texts.length >= 2) {
            if (!uk) uk = texts[0];
            if (!us) us = texts[1];
          } else if (texts.length === 1) {
            if (!uk && !us) {
              uk = texts[0];
            } else if (!uk) {
              uk = texts[0];
            } else if (!us) {
              us = texts[0];
            }
          }
        }
        // 最后 fallback：用顶层 phonetic 字段
        if (!uk && !us && entry.phonetic) {
          uk = entry.phonetic;
        }
        // 将 IPA 反转 R (ɹ) 替换为常见印刷体 r，提升可读性
        const normalizeR = (s: string) => s.replace(/\u0279/g, 'r');
        setDictPhonetics({ uk: normalizeR(uk), us: normalizeR(us), ukAudio, usAudio });
        setLoaded(true);
      })
      .catch(() => {
        if (!cancelled) {
          setDictPhonetics({});
          setLoaded(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [word]);

  const speakWithTTS = () => {
    getPlatform().speak(word, {
      lang: 'en-US',
      rate: 0.9,
      pitch: 1.05,
      onEnd: () => setPlayingType(null),
      onError: () => setPlayingType(null),
    });
  };

  const handleSpeech = (type: 'uk' | 'us' | 'tts', audioUrl?: string) => {
    setPlayingType(type);
    if (audioUrl) {
      const audio = new Audio(audioUrl);
      audio.onended = () => setPlayingType(null);
      audio.onerror = () => {
        speakWithTTS();
      };
      audio.play();
    } else {
      speakWithTTS();
    }
  };

  return (
    <div className={`${compact ? 'flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5' : 'flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3 mt-1'}`}>
      {dictPhonetics.uk && (
        <p className={`${compact ? 'text-[11px] text-neutral-500 dark:text-neutral-400' : 'text-sm text-neutral-400'} font-mono flex items-center space-x-1.5 whitespace-nowrap`}>
          <span className={`${compact ? 'text-[9px] text-neutral-400 dark:text-white/40' : 'text-[10px] text-neutral-300 dark:text-white/30'} uppercase mr-0.5`}>
            {compact ? '英' : t('wordDetail.ukPronunciation')}
          </span>
          <span className={compact ? '' : 'truncate'}>{dictPhonetics.uk}</span>
          {shouldShowSpeaker && (
            <button
              onClick={() => handleSpeech('uk', dictPhonetics.ukAudio)}
              disabled={playingType !== null}
              className={`${compact ? 'p-0.5 ml-0.5' : 'p-1 ml-1'} hover:bg-slate-100 dark:hover:bg-white/5 rounded-full text-indigo-600 dark:text-indigo-400 transition-colors cursor-pointer flex-shrink-0`}
              title={language === 'zh' ? '英音发音' : 'UK Pronunciation'}
            >
              <Volume2 className={`${compact ? 'w-3 h-3' : 'w-4 h-4'} ${playingType === 'uk' ? 'animate-bounce' : ''}`} />
            </button>
          )}
        </p>
      )}
      {dictPhonetics.us && (
        <p className={`${compact ? 'text-[11px] text-neutral-500 dark:text-neutral-400' : 'text-sm text-neutral-400'} font-mono flex items-center space-x-1.5 whitespace-nowrap`}>
          <span className={`${compact ? 'text-[9px] text-neutral-400 dark:text-white/40' : 'text-[10px] text-neutral-300 dark:text-white/30'} uppercase mr-0.5`}>
            {compact ? '美' : t('wordDetail.usPronunciation')}
          </span>
          <span className={compact ? '' : 'truncate'}>{dictPhonetics.us}</span>
          {shouldShowSpeaker && (
            <button
              onClick={() => handleSpeech('us', dictPhonetics.usAudio)}
              disabled={playingType !== null}
              className={`${compact ? 'p-0.5 ml-0.5' : 'p-1 ml-1'} hover:bg-slate-100 dark:hover:bg-white/5 rounded-full text-indigo-600 dark:text-indigo-400 transition-colors cursor-pointer flex-shrink-0`}
              title={language === 'zh' ? '美音发音' : 'US Pronunciation'}
            >
              <Volume2 className={`${compact ? 'w-3 h-3' : 'w-4 h-4'} ${playingType === 'us' ? 'animate-bounce' : ''}`} />
            </button>
          )}
        </p>
      )}
      {/* API 无结果时 fallback 到已有 phonetic */}
      {!dictPhonetics.uk && !dictPhonetics.us && fallbackPhonetic && (
        <p className={`${compact ? 'text-[11px] text-neutral-500 dark:text-neutral-400' : 'text-sm text-neutral-400'} font-mono flex items-center space-x-1.5 whitespace-nowrap`}>
          <span>{fallbackPhonetic.startsWith('/') ? fallbackPhonetic : `/${fallbackPhonetic}/`}</span>
          {shouldShowSpeaker && (
            <button
              onClick={() => handleSpeech('tts')}
              disabled={playingType !== null}
              className={`${compact ? 'p-0.5 ml-0.5' : 'p-1 ml-1'} hover:bg-slate-100 dark:hover:bg-white/5 rounded-full text-indigo-600 dark:text-indigo-400 transition-colors cursor-pointer flex-shrink-0`}
            >
              <Volume2 className={`${compact ? 'w-3 h-3' : 'w-4 h-4'} ${playingType === 'tts' ? 'animate-bounce' : ''}`} />
            </button>
          )}
        </p>
      )}
    </div>
  );
};
