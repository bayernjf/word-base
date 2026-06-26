import React, { useEffect, useState } from 'react';
import { Volume2 } from 'lucide-react';
import { AppLanguage } from '../../../types';
import { createTranslator } from '../../../i18n';

interface DictPhonetics {
  uk?: string;
  us?: string;
  ukAudio?: string;
  usAudio?: string;
}

function selectBestEnglishVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | undefined {
  const englishVoices = voices.filter(
    (v) => v.lang.toLowerCase().startsWith('en') || v.lang.toLowerCase().startsWith('en-')
  );
  if (englishVoices.length === 0) return undefined;
  // 优先级排序：Google > Apple > Microsoft > 其他
  const priorityList = [
    'Google US English',
    'Google UK English',
    'Samantha',
    'Daniel',
    'Alex',
    'Karen',
    'Victoria',
    'Microsoft David',
    'Microsoft Zira',
    'Microsoft Mark',
    'Microsoft Jenny',
    'Google UK English Male',
    'Google UK English Female',
    'Google US English Male',
    'Google US English Female',
  ];
  for (const name of priorityList) {
    const found = englishVoices.find((v) => v.name === name);
    if (found) return found;
  }
  // fallback：优先本地（非远程）语音
  const local = englishVoices.find((v) => v.localService);
  if (local) return local;
  return englishVoices[0];
}

interface WordPhoneticsProps {
  word: string;
  /** 已有音标，API 无结果时作为 fallback 展示 */
  fallbackPhonetic?: string;
  language: AppLanguage;
}

/**
 * 单词音标 + 真人发音组件：从 Free Dictionary API 获取英音/美音音标与音频，
 * 提供发音播放（音频失败时回退到浏览器 TTS）。供单词详情页与复习卡片共用，
 * 保证音标与发音表现一致。
 */
export const WordPhonetics: React.FC<WordPhoneticsProps> = ({ word, fallbackPhonetic, language }) => {
  const t = createTranslator(language);
  const [dictPhonetics, setDictPhonetics] = useState<DictPhonetics | null>(null);
  const [playingType, setPlayingType] = useState<'uk' | 'us' | 'tts' | null>(null);

  useEffect(() => {
    if (!word) {
      setDictPhonetics({});
      return;
    }
    let cancelled = false;
    fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word.toLowerCase())}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !Array.isArray(data) || !data[0]) {
          if (!cancelled) setDictPhonetics({});
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
            uk = texts[0];
            us = texts[1];
          } else if (texts.length === 1) {
            uk = texts[0];
          }
        }
        // 将 IPA 反转 R (ɹ) 替换为常见印刷体 r，提升可读性
        const normalizeR = (s: string) => s.replace(/\u0279/g, 'r');
        if (!cancelled) setDictPhonetics({ uk: normalizeR(uk), us: normalizeR(us), ukAudio, usAudio });
      })
      .catch(() => {
        if (!cancelled) setDictPhonetics({});
      });
    return () => {
      cancelled = true;
    };
  }, [word]);

  const speakWithTTS = () => {
    const utterance = new SpeechSynthesisUtterance(word);
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = selectBestEnglishVoice(voices);
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }
    utterance.rate = 0.9;
    utterance.pitch = 1.05;
    utterance.onend = () => setPlayingType(null);
    utterance.onerror = () => setPlayingType(null);
    window.speechSynthesis.speak(utterance);
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

  // 音标：API 加载完成后再展示，避免从单音标闪现到双音标
  if (dictPhonetics === null) return null;

  return (
    <div className="flex items-center gap-3 mt-1">
      {dictPhonetics.uk && (
        <p className="text-sm text-neutral-400 font-mono flex items-center space-x-1">
          <span className="text-[10px] text-neutral-300 dark:text-white/30 uppercase">{t('wordDetail.ukPronunciation')}</span>
          <span>{dictPhonetics.uk}</span>
          <button
            onClick={() => handleSpeech('uk', dictPhonetics.ukAudio)}
            disabled={playingType !== null}
            className="p-1 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full text-indigo-600 dark:text-indigo-400 transition-colors cursor-pointer"
            title={language === 'zh' ? '英音发音' : 'UK Pronunciation'}
          >
            <Volume2 className={`w-4 h-4 ${playingType === 'uk' ? 'animate-bounce' : ''}`} />
          </button>
        </p>
      )}
      {dictPhonetics.us && (
        <p className="text-sm text-neutral-400 font-mono flex items-center space-x-1">
          <span className="text-[10px] text-neutral-300 dark:text-white/30 uppercase">{t('wordDetail.usPronunciation')}</span>
          <span>{dictPhonetics.us}</span>
          <button
            onClick={() => handleSpeech('us', dictPhonetics.usAudio)}
            disabled={playingType !== null}
            className="p-1 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full text-indigo-600 dark:text-indigo-400 transition-colors cursor-pointer"
            title={language === 'zh' ? '美音发音' : 'US Pronunciation'}
          >
            <Volume2 className={`w-4 h-4 ${playingType === 'us' ? 'animate-bounce' : ''}`} />
          </button>
        </p>
      )}
      {/* API 无结果时 fallback 到已有 phonetic */}
      {!dictPhonetics.uk && !dictPhonetics.us && fallbackPhonetic && (
        <p className="text-sm text-neutral-400 font-mono flex items-center space-x-2">
          <span>/{fallbackPhonetic}/</span>
          <button
            onClick={() => handleSpeech('tts')}
            disabled={playingType !== null}
            className="p-1 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full text-indigo-600 dark:text-indigo-400 transition-colors cursor-pointer"
          >
            <Volume2 className={`w-4 h-4 ${playingType === 'tts' ? 'animate-bounce' : ''}`} />
          </button>
        </p>
      )}
    </div>
  );
};
