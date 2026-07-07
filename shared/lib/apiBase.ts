type Platform = 'web' | 'desktop' | 'ios' | 'android'

function detectPlatform(): Platform {
  if (typeof window !== 'undefined') {
    const w = window as any
    if (w.__TAURI_INTERNALS__ || w.__TAURI__ || w.tauri) {
      return 'desktop'
    }
    if (w.Capacitor) {
      const platform = w.Capacitor?.getPlatform?.() || ''
      if (platform === 'ios') return 'ios'
      if (platform === 'android') return 'android'
    }
    if (w.webkit?.messageHandlers?.bridge) {
      return 'ios'
    }
  }
  if (typeof navigator !== 'undefined') {
    const ua = navigator.userAgent || ''
    if (/Android/i.test(ua)) return 'android'
    if (/iPhone|iPad|iPod/i.test(ua)) return 'ios'
    if (/Capacitor/i.test(ua)) return 'ios'
  }
  return 'web'
}

const platform = detectPlatform()
const env = import.meta.env

let rawBase = env.VITE_API_BASE_URL || ''

if (!rawBase) {
  if (platform === 'desktop') {
    rawBase = env.VITE_DESKTOP_API_BASE_URL || ''
  } else if (platform === 'ios') {
    rawBase = env.VITE_IOS_API_BASE_URL || env.VITE_MOBILE_API_BASE_URL || ''
  } else if (platform === 'android') {
    rawBase = env.VITE_ANDROID_API_BASE_URL || env.VITE_MOBILE_API_BASE_URL || ''
  }
}

export const API_BASE_URL = rawBase.endsWith('/')
  ? rawBase.slice(0, -1)
  : rawBase

export const API_PLATFORM = platform

export function apiUrl(path: string): string {
  if (!path.startsWith('/')) {
    path = '/' + path
  }
  return API_BASE_URL + path
}
