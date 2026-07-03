import { createCachedKV, type PlatformAPI, type SpeakOptions } from '@wordbase/shared/platform';

/**
 * 移动端（Capacitor）平台实现。
 *   - 原生壳（Capacitor.isNativePlatform()）→ Capacitor Preferences 插件
 *   - 浏览器 vite dev → localStorage 回退
 */

function pickEnglishVoice(voices: SpeechSynthesisVoice[], preferred?: string): SpeechSynthesisVoice | null {
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

function webSpeak(text: string, options: SpeakOptions): Promise<void> {
  if (!('speechSynthesis' in window)) {
    options.onError?.(new Error('speechSynthesis not available'));
    return Promise.resolve();
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
}

async function isNative(): Promise<boolean> {
  try {
    const { Capacitor } = await import('@capacitor/core');
    return Capacitor.isNativePlatform();
  } catch { return false; }
}

async function capSpeak(text: string, options: SpeakOptions): Promise<void> {
  try {
    const { TextToSpeech } = await import('@capacitor-community/text-to-speech');
    await TextToSpeech.speak({
      text,
      lang: options.lang ?? 'en-US',
      rate: options.rate ?? 1.0,
      pitch: options.pitch ?? 1.0,
      volume: options.volume ?? 1.0,
      voice: 0,
      category: 'ambient',
    });
    options.onEnd?.();
  } catch (err) {
    options.onError?.(err);
  }
}

// -------- KV --------
// Capacitor Preferences 不提供 keys() 枚举，所以我们额外维护一份 key 索引
// （'wordbase__keys' 也是一个 Preferences entry），用来支持 loadAll。

const KEYS_INDEX = 'wordbase__keys';

async function loadAllFromCapPreferences(): Promise<Record<string, string>> {
  const { Preferences } = await import('@capacitor/preferences');
  const out: Record<string, string> = {};
  try {
    const { value: keysJson } = await Preferences.get({ key: KEYS_INDEX });
    const keys: string[] = keysJson ? JSON.parse(keysJson) : [];
    for (const k of keys) {
      const { value } = await Preferences.get({ key: k });
      if (value != null) out[k] = value;
    }
  } catch { /* ignore */ }
  return out;
}

async function saveToCapPreferences(k: string, v: string): Promise<void> {
  const { Preferences } = await import('@capacitor/preferences');
  await Preferences.set({ key: k, value: v });
  // 维护 key 索引
  const { value: keysJson } = await Preferences.get({ key: KEYS_INDEX });
  const keys: string[] = keysJson ? JSON.parse(keysJson) : [];
  if (!keys.includes(k)) {
    keys.push(k);
    await Preferences.set({ key: KEYS_INDEX, value: JSON.stringify(keys) });
  }
}

async function removeFromCapPreferences(k: string): Promise<void> {
  const { Preferences } = await import('@capacitor/preferences');
  await Preferences.remove({ key: k });
  const { value: keysJson } = await Preferences.get({ key: KEYS_INDEX });
  const keys: string[] = keysJson ? JSON.parse(keysJson) : [];
  const idx = keys.indexOf(k);
  if (idx !== -1) {
    keys.splice(idx, 1);
    await Preferences.set({ key: KEYS_INDEX, value: JSON.stringify(keys) });
  }
}

async function loadAllKv(): Promise<Record<string, string>> {
  if (await isNative()) return loadAllFromCapPreferences();
  return loadAllFromLocalStorage();
}

async function saveKv(k: string, v: string): Promise<void> {
  if (await isNative()) return saveToCapPreferences(k, v);
  localStorage.setItem(k, v);
}

async function removeKv(k: string): Promise<void> {
  if (await isNative()) return removeFromCapPreferences(k);
  localStorage.removeItem(k);
}

// -------- 导出 --------

export const mobilePlatform: PlatformAPI = {
  name: 'mobile',

  async speak(text, options = {}) {
    if (await isNative()) return capSpeak(text, options);
    return webSpeak(text, options);
  },
  async stopSpeak() {
    if (await isNative()) {
      try { const { TextToSpeech } = await import('@capacitor-community/text-to-speech'); await TextToSpeech.stop(); return; }
      catch { /* fallthrough */ }
    }
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  },
  async readClipboard() {
    if (await isNative()) {
      try { const { Clipboard } = await import('@capacitor/clipboard'); const r = await Clipboard.read(); return r.value ?? ''; }
      catch { /* fallthrough */ }
    }
    try { return await navigator.clipboard.readText(); } catch { return ''; }
  },
  async writeClipboard(text) {
    if (await isNative()) {
      try { const { Clipboard } = await import('@capacitor/clipboard'); await Clipboard.write({ string: text }); return true; }
      catch { /* fallthrough */ }
    }
    try { await navigator.clipboard.writeText(text); return true; } catch { return false; }
  },
  async showNotification(title, body) {
    if (await isNative()) {
      try {
        const { LocalNotifications } = await import('@capacitor/local-notifications');
        const perm = await LocalNotifications.checkPermissions();
        let granted = perm.display === 'granted';
        if (!granted) {
          const req = await LocalNotifications.requestPermissions();
          granted = req.display === 'granted';
        }
        if (granted) {
          await LocalNotifications.schedule({
            notifications: [{
              id: Date.now() % 2147483647,
              title,
              body,
              schedule: { at: new Date(Date.now() + 100) },
            }],
          });
        }
        return;
      } catch { /* fallthrough */ }
    }
    if (!('Notification' in window)) return;
    if (Notification.permission === 'default') await Notification.requestPermission();
    if (Notification.permission === 'granted') new Notification(title, { body });
  },

  kv: createCachedKV({
    loadAll: loadAllKv,
    save: saveKv,
    remove: removeKv,
    readMiss: async (k) => {
      // 原生壳下，缓存 miss 时回退读 localStorage（一次性迁移老数据到 Cap Preferences）
      if ((await isNative()) && typeof localStorage !== 'undefined') {
        return localStorage.getItem(k);
      }
      return null;
    },
  }),

  getPlatform() { return 'mobile'; },
};
