import * as Clipboard from 'expo-clipboard';
import * as Speech from 'expo-speech';
import * as Notifications from 'expo-notifications';
import { SchedulableTriggerInputTypes } from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { createCachedKV, type PlatformAPI, type SpeakOptions, type UpdateService, type UpdateProgress, type UpdateCheckResult, type SystemInfo, type PlatformLogData } from '@wordbase/shared/platform';

async function expoSpeak(text: string, options: SpeakOptions): Promise<void> {
  try {
    await Speech.speak(text, {
      language: options.lang ?? 'en-US',
      rate: options.rate ?? 1.0,
      pitch: options.pitch ?? 1.0,
      volume: options.volume ?? 1.0,
      onDone: () => options.onEnd?.(),
      onError: (error) => options.onError?.(error),
    });
  } catch (err) {
    options.onError?.(err);
  }
}

async function expoStopSpeak(): Promise<void> {
  try {
    await Speech.stop();
  } catch {
  }
}

async function expoReadClipboard(): Promise<string> {
  try {
    const result = await Clipboard.getStringAsync();
    return result ?? '';
  } catch {
    return '';
  }
}

async function expoWriteClipboard(text: string): Promise<boolean> {
  try {
    await Clipboard.setStringAsync(text);
    return true;
  } catch {
    return false;
  }
}

async function expoShowNotification(title: string, body: string): Promise<void> {
  try {
    const perm = await Notifications.getPermissionsAsync();
    let granted = perm.granted;
    if (!granted) {
      const req = await Notifications.requestPermissionsAsync();
      granted = req.granted;
    }
    if (granted) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
        },
        trigger: {
          type: SchedulableTriggerInputTypes.TIME_INTERVAL,
          repeats: false,
          seconds: 0.1,
        },
      });
    }
  } catch {
  }
}

function loadAllFromAsyncStorage(): Record<string, string> {
  const out: Record<string, string> = {};
  return out;
}

async function saveToAsyncStorage(k: string, v: string): Promise<void> {
  try {
    await AsyncStorage.setItem(k, v);
  } catch {
  }
}

async function removeFromAsyncStorage(k: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(k);
  } catch {
  }
}

async function loadAllKv(): Promise<Record<string, string>> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const values = await AsyncStorage.multiGet(keys);
    const out: Record<string, string> = {};
    for (const [key, value] of values) {
      if (value != null) out[key] = value;
    }
    return out;
  } catch {
    return {};
  }
}

async function saveKv(k: string, v: string): Promise<void> {
  await saveToAsyncStorage(k, v);
}

async function removeKv(k: string): Promise<void> {
  await removeFromAsyncStorage(k);
}

// -------- OTA Updater（Expo Updates，JS 热更新） --------

let otaUpdate: { id: string; createdAt: string | Date } | null = null;

const mobileUpdater: UpdateService = {
  channel: 'mobile-ota',
  isReady: false,

  async check(): Promise<UpdateCheckResult> {
    try {
      const Updates = await import('expo-updates');
      if (!Updates.isEnabled) return { hasUpdate: false };
      const result = await Updates.checkForUpdateAsync();
      if (!result.isAvailable) {
        otaUpdate = null;
        return { hasUpdate: false };
      }
      const updateId = (result.manifest as { id?: string; revisionId?: string } | undefined)?.id
        || (result.manifest as { id?: string; revisionId?: string } | undefined)?.revisionId
        || 'new';
      otaUpdate = { id: updateId, createdAt: new Date() };
      // 展示 SemVer（app.json version）而非 OTA update ID
      const appVersion = (Constants.expoConfig?.version as string | undefined) || 'unknown';
      return {
        hasUpdate: true,
        version: appVersion,
      };
    } catch (err) {
      console.warn('[ota] check failed:', err);
      return { hasUpdate: false, error: err instanceof Error ? err.message : String(err) };
    }
  },

  async download(onProgress?: (p: UpdateProgress) => void): Promise<void> {
    try {
      const Updates = await import('expo-updates');
      if (!Updates.isEnabled || !otaUpdate) return;
      const fetchResult = await Updates.fetchUpdateAsync();
      // isNew=true: 刚下载完；isNew=false: 之前已下载过，本次无需重复下载
      // 两种情况都视为 ready，apply() 会调 reloadAsync()
      mobileUpdater.isReady = true;
      onProgress?.({ percentage: 100 });
    } catch (err) {
      console.warn('[ota] fetch failed:', err);
      throw err;
    }
  },

  async apply(): Promise<void> {
    try {
      const Updates = await import('expo-updates');
      if (!mobileUpdater.isReady) return;
      await Updates.reloadAsync();
    } catch (err) {
      console.warn('[ota] reload failed:', err);
    }
  },
};

export const mobilePlatform: PlatformAPI = {
  name: 'mobile',

  async speak(text: string, options: SpeakOptions = {}) {
    return expoSpeak(text, options);
  },
  async stopSpeak() {
    return expoStopSpeak();
  },
  async readClipboard() {
    return expoReadClipboard();
  },
  async writeClipboard(text: string) {
    return expoWriteClipboard(text);
  },
  async showNotification(title: string, body: string) {
    return expoShowNotification(title, body);
  },

  async openUrl(url: string): Promise<void> {
    try {
      const { Linking } = await import('react-native');
      await Linking.openURL(url);
    } catch {
      /* ignore */
    }
  },

  kv: createCachedKV({
    loadAll: loadAllKv,
    save: saveKv,
    remove: removeKv,
    readMiss: async () => null,
  }),

  updater: mobileUpdater,

  getPlatform() {
    return Platform.OS === 'ios' ? 'ios' : 'android';
  },

  async getSystemInfo(): Promise<SystemInfo> {
    const appVersion = (Constants.expoConfig?.version as string | undefined) || 'unknown';
    const osVersion = String(Platform.Version ?? '');
    const deviceModel = Platform.OS === 'ios' ? 'iOS device' : 'Android device';
    return {
      appVersion,
      platform: Platform.OS === 'ios' ? 'ios' : 'android',
      osVersion,
      deviceModel,
    };
  },

  async getRecentLogs(): Promise<PlatformLogData | null> {
    return null;
  },
};