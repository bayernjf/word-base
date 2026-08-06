// CORS 来源白名单：默认覆盖生产/预览域名、Tauri 桌面端与浏览器插件，
// 可通过环境变量 ALLOWED_ORIGINS（逗号分隔）追加来源
const DEFAULT_ALLOWED_ORIGINS = [
  // Cloudflare Pages（生产 / dev 预览）
  'https://word-base.pages.dev',
  'https://dev.word-base.pages.dev',
  // Vercel（API 直连 alias）
  'https://word-base-six.vercel.app',
  'https://dev-word-base.vercel.app',
  // Tauri 2 桌面端 WebView
  'tauri://localhost',
  'http://tauri.localhost',
  'https://tauri.localhost'
]

// 本地开发与真机调试来源（任意端口）：
// localhost / 127.0.0.1（web、desktop dev）、10.0.2.2（Android 模拟器）、192.168.x.x（真机同 WiFi）
const LOCAL_ORIGIN_PATTERN = /^https?:\/\/(localhost|127\.0\.0\.1|10\.0\.2\.2|192\.168\.\d{1,3}\.\d{1,3})(:\d+)?$/

// 浏览器插件（word-picker）来源。API 走 Bearer 认证且不使用 Cookie，放行插件 scheme 风险可控
const EXTENSION_SCHEMES = ['chrome-extension://', 'moz-extension://', 'safari-web-extension://']

const normalizeOrigin = (origin: string) => origin.trim().replace(/\/+$/, '')

export const parseAllowedOrigins = (raw?: string): Set<string> => {
  const extra = String(raw || '')
    .split(',')
    .map(normalizeOrigin)
    .filter(Boolean)
  return new Set([...DEFAULT_ALLOWED_ORIGINS, ...extra])
}

export const isOriginAllowed = (origin: string | undefined, allowed: Set<string>): boolean => {
  if (!origin) return false
  const normalized = normalizeOrigin(origin)
  if (!normalized) return false
  if (allowed.has(normalized)) return true
  if (LOCAL_ORIGIN_PATTERN.test(normalized)) return true
  return EXTENSION_SCHEMES.some((scheme) => normalized.startsWith(scheme))
}
