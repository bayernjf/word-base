import * as Clipboard from 'expo-clipboard';
import * as Speech from 'expo-speech';
import * as Notifications from 'expo-notifications';
import { SchedulableTriggerInputTypes } from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createCachedKV, type PlatformAPI, type SpeakOptions } from '@wordbase/shared/platform';

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

  kv: createCachedKV({
    loadAll: loadAllKv,
    save: saveKv,
    remove: removeKv,
    readMiss: async () => null,
  }),

  getPlatform() {
    return Platform.OS === 'ios' ? 'ios' : 'android';
  },
};