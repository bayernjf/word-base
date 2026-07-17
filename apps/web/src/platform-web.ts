import { createCachedKV, type PlatformAPI, type SpeakOptions, type SystemInfo, type PlatformLogData } from '@wordbase/shared/platform';

function pickEnglishVoice(voices: any[], preferred?: string): any {
  if (!voices.length) return null;
  if (preferred) {
    const byName = voices.find(v => v.name === preferred);
    if (byName) return byName;
    const byLang = voices.find(v => v.lang === preferred);
    if (byLang) return byLang;
  }
  const en = voices.filter(v => v.lang?.toLowerCase().startsWith('en'));
  const pool = en.length ? en : voices;
  return (
    pool.find(v => /google/i.test(v.name)) ||
    pool.find(v => /microsoft/i.test(v.name)) ||
    pool[0] ||
    null
  );
}

function loadAllFromLocalStorage(): Record<string, string> {
  const out: Record<string, string> = {};
  if (typeof localStorage === 'undefined') return out;
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k) {
      const v = localStorage.getItem(k);
      if (v !== null) out[k] = v;
    }
  }
  return out;
}

export const webPlatform: PlatformAPI = {
  name: 'web',

  async speak(text: string, options: SpeakOptions = {}): Promise<void> {
    if (!('speechSynthesis' in window)) {
      options.onError?.(new Error('speechSynthesis not available'));
      return;
    }
    return new Promise<void>((resolve) => {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = options.lang ?? 'en-US';
      if (options.rate !== undefined) utterance.rate = options.rate;
      if (options.pitch !== undefined) utterance.pitch = options.pitch;
      if (options.volume !== undefined) utterance.volume = options.volume;
      const voice = pickEnglishVoice(window.speechSynthesis.getVoices(), options.voice);
      if (voice) utterance.voice = voice;
      utterance.onend = () => { options.onEnd?.(); resolve(); };
      utterance.onerror = (e) => { options.onError?.(e); resolve(); };
      window.speechSynthesis.speak(utterance);
    });
  },

  async stopSpeak(): Promise<void> {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  },

  async readClipboard(): Promise<string> {
    try { return await navigator.clipboard.readText(); } catch { return ''; }
  },

  async writeClipboard(text: string): Promise<boolean> {
    try { await navigator.clipboard.writeText(text); return true; } catch { return false; }
  },

  async showNotification(title: string, body: string): Promise<void> {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'default') await Notification.requestPermission();
    if (Notification.permission === 'granted') new Notification(title, { body });
  },

  async openUrl(url: string): Promise<void> {
    try {
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch {
      /* ignore */
    }
  },

  kv: createCachedKV({
    loadAll: async () => loadAllFromLocalStorage(),
    save: async (k, v) => { localStorage.setItem(k, v); },
    remove: async (k) => { localStorage.removeItem(k); },
  }),

  getPlatform() { return 'web'; },

  async getSystemInfo(): Promise<SystemInfo> {
    const ua = (typeof navigator !== 'undefined' && navigator.userAgent) || '';
    let osVersion: string | undefined;
    if (/Windows NT ([\d.]+)/.test(ua)) osVersion = `Windows ${RegExp.$1}`;
    else if (/Mac OS X ([\d_]+)/.test(ua)) osVersion = `macOS ${RegExp.$1.replace(/_/g, '.')}`;
    else if (/Android ([\d.]+)/.test(ua)) osVersion = `Android ${RegExp.$1}`;
    else if (/(?:iPhone|iPad|iPod).*?OS ([\d_]+)/.test(ua)) osVersion = `iOS ${RegExp.$1.replace(/_/g, '.')}`;

    const g = globalThis as any;
    const appVersion = g.__APP_VERSION__ || (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_APP_VERSION) || 'unknown';

    return {
      appVersion: String(appVersion),
      platform: 'web',
      osVersion,
    };
  },

  async getRecentLogs(): Promise<PlatformLogData | null> {
    return null;
  },
};
