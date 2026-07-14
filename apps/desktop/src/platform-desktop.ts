import { createCachedKV, type PlatformAPI, type SpeakOptions, type UpdateService, type UpdateProgress } from '@wordbase/shared/platform';

/**
 * 桌面端（Tauri）平台实现。
 *   - Tauri WebView 内（window.__TAURI_INTERNALS__ 存在）→ 走 Tauri store 插件
 *   - 纯浏览器 vite dev → localStorage 回退
 */

const isTauri = (): boolean =>
  typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

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

async function tauriSpeak(text: string, options: SpeakOptions): Promise<void> {
  try {
    const { Command } = await import('@tauri-apps/plugin-shell');
    const platform = navigator.userAgent.toLowerCase();
    const isMac = platform.includes('mac');
    const isWin = platform.includes('win');
    if (isMac) {
      const args = ['-r', String(Math.max(50, Math.min(400, Math.round((options.rate ?? 0.9) * 200))))];
      if (options.voice) args.push('-v', options.voice);
      args.push(text);
      const cmd = Command.create('say', args);
      cmd.on('close', () => options.onEnd?.());
      cmd.on('error', (e) => options.onError?.(e));
      await cmd.spawn();
      return;
    }
    if (isWin) {
      const escaped = text.replace(/'/g, "''");
      const ps = `Add-Type -AssemblyName System.Speech; $s = New-Object System.Speech.Synthesis.SpeechSynthesizer; $s.Speak('${escaped}')`;
      const cmd = Command.create('powershell', ['-Command', ps]);
      cmd.on('close', () => options.onEnd?.());
      cmd.on('error', (e) => options.onError?.(e));
      await cmd.spawn();
      return;
    }
    await webSpeak(text, options);
  } catch (err) {
    options.onError?.(err);
  }
}

// -------- KV：Tauri Store 优先，否则 localStorage --------

let tauriStore: { get: (k: string) => Promise<string | null>; set: (k: string, v: string) => Promise<void>; delete: (k: string) => Promise<void>; entries: () => Promise<Record<string, string>> } | null = null;

async function getTauriStore() {
  if (!isTauri()) return null;
  if (tauriStore) return tauriStore;
  try {
    const { Store } = await import('@tauri-apps/plugin-store');
    const store = await Store.load('wordbase.json', { autoSave: 100, defaults: {} });
    tauriStore = {
      async get(k) {
        const v = await store.get<string>(k);
        return v ?? null;
      },
      async set(k, v) { await store.set(k, v); await store.save(); },
      async delete(k) { await store.delete(k); await store.save(); },
      async entries() {
        const out: Record<string, string> = {};
        const keys = await store.keys();
        for (const k of keys) {
          if (k.startsWith('wordbase_') || k.startsWith('sb-')) {
            const v = await store.get<string>(k);
            if (v != null) out[k] = v;
          }
        }
        return out;
      },
    };
    return tauriStore;
  } catch {
    return null;
  }
}

async function loadAllKv(): Promise<Record<string, string>> {
  const store = await getTauriStore();
  if (store) return store.entries();
  return loadAllFromLocalStorage();
}

async function saveKv(k: string, v: string): Promise<void> {
  const store = await getTauriStore();
  if (store) return store.set(k, v);
  localStorage.setItem(k, v);
}

async function removeKv(k: string): Promise<void> {
  const store = await getTauriStore();
  if (store) return store.delete(k);
  localStorage.removeItem(k);
}

// -------- Updater（仅 Tauri 桌面端） --------

let pendingUpdate: { version: string; body?: string; date?: string } | null = null;
let downloaded = false;

const desktopUpdater: UpdateService = {
  channel: 'desktop-binary',
  isReady: false,

  async check() {
    if (!isTauri()) return { hasUpdate: false };
    try {
      const { check } = await import('@tauri-apps/plugin-updater');
      const update = await check();
      if (!update?.available) {
        pendingUpdate = null;
        return { hasUpdate: false };
      }
      pendingUpdate = {
        version: update.version,
        body: update.body,
        date: update.date,
      };
      return {
        hasUpdate: true,
        version: update.version,
        body: update.body,
        date: update.date,
      };
    } catch (err) {
      console.warn('[updater] check failed:', err);
      return { hasUpdate: false };
    }
  },

  async download(onProgress?: (p: UpdateProgress) => void) {
    if (!isTauri() || !pendingUpdate) return;
    const { check } = await import('@tauri-apps/plugin-updater');
    const update = await check();
    if (!update?.available) return;
    let accumulated = 0;
    let total: number | undefined;
    await update.download((event) => {
      if (event.event === 'Started') {
        total = event.data.contentLength;
        onProgress?.({ percentage: 0, downloaded: 0, total });
      } else if (event.event === 'Progress') {
        accumulated += event.data.chunkLength;
        const pct = total ? Math.round((accumulated / total) * 100) : undefined;
        onProgress?.({ percentage: pct, downloaded: accumulated, total });
      } else if (event.event === 'Finished') {
        onProgress?.({ percentage: 100, downloaded: accumulated, total });
      }
    });
    downloaded = true;
    desktopUpdater.isReady = true;
  },

  async apply() {
    if (!isTauri() || !downloaded) return;
    const { relaunch } = await import('@tauri-apps/plugin-process');
    await relaunch();
  },
};

// -------- 导出 --------

export const desktopPlatform: PlatformAPI = {
  name: 'desktop',

  async speak(text, options = {}) {
    if (isTauri()) return tauriSpeak(text, options);
    return webSpeak(text, options);
  },
  async stopSpeak() {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  },
  async readClipboard() {
    if (isTauri()) {
      try {
        const { readText } = await import('@tauri-apps/plugin-clipboard-manager');
        return (await readText()) ?? '';
      } catch { /* fallthrough */ }
    }
    try { return await navigator.clipboard.readText(); } catch { return ''; }
  },
  async writeClipboard(text) {
    if (isTauri()) {
      try {
        const { writeText } = await import('@tauri-apps/plugin-clipboard-manager');
        await writeText(text);
        return true;
      } catch { /* fallthrough */ }
    }
    try { await navigator.clipboard.writeText(text); return true; } catch { return false; }
  },
  async showNotification(title, body) {
    if (isTauri()) {
      try {
        const { isPermissionGranted, requestPermission, sendNotification } =
          await import('@tauri-apps/plugin-notification');
        let granted = await isPermissionGranted();
        if (!granted) granted = (await requestPermission()) === 'granted';
        if (granted) sendNotification({ title, body });
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
      if (isTauri() && typeof localStorage !== 'undefined') {
        return localStorage.getItem(k);
      }
      return null;
    },
  }),

  updater: desktopUpdater,

  getPlatform() { return 'desktop'; },
};
