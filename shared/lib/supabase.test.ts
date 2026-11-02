import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// getSupabase 惰性创建客户端，通过 resetModules + 动态 import 重置单例缓存
const loadSupabase = () => import('./supabase')

const clearAllSupabaseEnvVariants = () => {
  // 宿主根 .env 会被 vitest 载入 process.env，必须显式置空以隔离
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '')
  vi.stubEnv('SUPABASE_URL', '')
  vi.stubEnv('VITE_SUPABASE_URL', '')
  vi.stubEnv('EXPO_PUBLIC_SUPABASE_URL', '')
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', '')
  vi.stubEnv('SUPABASE_ANON_KEY', '')
  vi.stubEnv('VITE_SUPABASE_ANON_KEY', '')
  vi.stubEnv('EXPO_PUBLIC_SUPABASE_ANON_KEY', '')
}

beforeEach(() => {
  vi.resetModules()
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  delete (globalThis as any).__APP_ENV__
})

describe('supabase 配置解析', () => {
  it('缺少 Supabase 配置时抛出明确错误', async () => {
    clearAllSupabaseEnvVariants()
    const { getSupabase } = await loadSupabase()
    expect(() => getSupabase()).toThrow(/Missing Supabase config/)
  })

  it('EXPO_PUBLIC_ 前缀变量可用于构建客户端（Expo/RN Metro 内联）', async () => {
    clearAllSupabaseEnvVariants()
    vi.stubEnv('EXPO_PUBLIC_SUPABASE_URL', 'https://example.supabase.co')
    vi.stubEnv('EXPO_PUBLIC_SUPABASE_ANON_KEY', 'anon-key')
    const { getSupabase } = await loadSupabase()
    expect(() => getSupabase()).not.toThrow()
  })

  it('VITE_ 前缀变量可用于构建客户端（Desktop WebView）', async () => {
    clearAllSupabaseEnvVariants()
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co')
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon-key')
    const { getSupabase } = await loadSupabase()
    expect(() => getSupabase()).not.toThrow()
  })
})
