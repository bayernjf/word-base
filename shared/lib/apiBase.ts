type Platform = 'web' | 'desktop' | 'ios' | 'android'

function detectPlatform(): Platform {
  if (typeof window !== 'undefined') {
    const w = window as any
    if (w.__TAURI_INTERNALS__ || w.__TAURI__ || w.tauri) {
      return 'desktop'
    }
    if (w.ReactNative) {
      // Expo RN injects ReactNative on global object
      const platform = w.Platform?.OS || ''
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
  }
  return 'web'
}

function getEnvValue(key: string): string | undefined {
  // 1. Try global injected env (for Next.js where shared package isn't processed by DefinePlugin)
  const g = globalThis as any
  if (g.__APP_ENV__ && g.__APP_ENV__[key] !== undefined) {
    return g.__APP_ENV__[key]
  }
  // Try the full key first, then bare key, then VITE_ prefixed
  const bareKey = key.replace(/^NEXT_PUBLIC_/, '')
  if (typeof process !== 'undefined' && process.env) {
    return process.env[key] || process.env[bareKey] || process.env[`VITE_${bareKey}`]
  }
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    const env = import.meta.env as Record<string, string | undefined>
    return env[key] || env[bareKey] || env[`VITE_${bareKey}`]
  }
  return undefined
}

const platform = detectPlatform()

function resolveBaseUrl(): string {
  if (platform === 'web') {
    return ''
  }

  let rawBase = getEnvValue('NEXT_PUBLIC_API_BASE_URL') || ''

  if (!rawBase) {
    if (platform === 'desktop') {
      rawBase = getEnvValue('NEXT_PUBLIC_DESKTOP_API_BASE_URL') || ''
    } else if (platform === 'ios') {
      rawBase = getEnvValue('NEXT_PUBLIC_IOS_API_BASE_URL') || getEnvValue('NEXT_PUBLIC_MOBILE_API_BASE_URL') || ''
    } else if (platform === 'android') {
      rawBase = getEnvValue('NEXT_PUBLIC_ANDROID_API_BASE_URL') || getEnvValue('NEXT_PUBLIC_MOBILE_API_BASE_URL') || ''
    }
  }

  return rawBase.endsWith('/') ? rawBase.slice(0, -1) : rawBase
}

export function getApiBaseUrl(): string {
  return resolveBaseUrl()
}

export const API_PLATFORM = platform

export function apiUrl(path: string): string {
  if (!path.startsWith('/')) {
    path = '/' + path
  }
  return getApiBaseUrl() + path
}
