import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { createLogger } from './logger'
import { getPlatform, hasPlatform } from '../platform'

const logger = createLogger('supabase')

function getEnvValue(key: string): string | undefined {
  // Normalize: try NEXT_PUBLIC_ prefix for Next.js client-side, then bare key
  const bareKey = key.replace(/^NEXT_PUBLIC_/, '')
  if (typeof process !== 'undefined' && process.env) {
    return process.env[key] || process.env[bareKey] || process.env[`VITE_${bareKey}`]
  }
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    return import.meta.env[key] || import.meta.env[`VITE_${bareKey}`]
  }
  return undefined
}

const supabaseUrl = getEnvValue('NEXT_PUBLIC_SUPABASE_URL') || 'http://localhost:54321'
const supabaseAnonKey = getEnvValue('NEXT_PUBLIC_SUPABASE_ANON_KEY') || 'your-anon-key'

let _client: SupabaseClient | null = null

function buildClient(): SupabaseClient {
  // setPlatform() 之后才会调用 buildClient；
  // 若意外在平台注入前调用（如单测、SSR），则回退到默认 localStorage。
  const kv = hasPlatform() ? getPlatform().kv : null

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: kv
        ? {
            async getItem(key: string) {
              return (await kv.get(key))
            },
            async setItem(key: string, value: string) {
              await kv.set(key, value)
            },
            async removeItem(key: string) {
              await kv.remove(key)
            },
          }
        : undefined,
    },
  })
}

export function getSupabase(): SupabaseClient {
  if (!_client) {
    _client = buildClient()
  }
  return _client
}

/** 兼容旧的 `import { supabase }` 用法：通过 getter 惰性创建。 */
export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop, receiver) {
    return Reflect.get(getSupabase(), prop, receiver)
  },
})

// =============================================
// 用户资料相关 API
// =============================================
export const profileApi = {
  async getProfile(userId: string) {
    logger.debug('profileApi.getProfile', { userId })
    const { data, error } = await getSupabase()
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) throw error
    logger.info('profileApi.getProfile success')
    return data
  },

  async updateProfile(userId: string, updates: any) {
    logger.debug('profileApi.updateProfile', { userId, fields: Object.keys(updates) })
    const { data, error } = await getSupabase()
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()

    if (error) throw error
    logger.info('profileApi.updateProfile success')
    return data[0]
  }
}

// =============================================
// 单词本相关 API
// =============================================
export const bookApi = {
  async getBooks(userId: string) {
    logger.debug('bookApi.getBooks', { userId })
    const { data, error } = await getSupabase()
      .from('vocabulary_books')
      .select('*')
      .eq('user_id', userId)
      .eq('is_deleted', false)
      .order('is_sync', { ascending: false })
      .order('created_at')

    if (error) throw error
    logger.info('bookApi.getBooks success', { count: data?.length })
    return data
  },

  async createBook(book: any) {
    logger.debug('bookApi.createBook', { name: book.name })
    const { data, error } = await getSupabase()
      .from('vocabulary_books')
      .insert(book)
      .select()

    if (error) throw error
    logger.info('bookApi.createBook success', { id: data?.[0]?.id })
    return data[0]
  },

  async updateBook(bookId: string, updates: any) {
    logger.debug('bookApi.updateBook', { bookId })
    const { data, error } = await getSupabase()
      .from('vocabulary_books')
      .update(updates)
      .eq('id', bookId)
      .select()

    if (error) throw error
    logger.info('bookApi.updateBook success')
    return data[0]
  },

  async deleteBook(bookId: string) {
    logger.debug('bookApi.deleteBook', { bookId })
    const { data, error } = await getSupabase()
      .from('vocabulary_books')
      .update({ is_deleted: true })
      .eq('id', bookId)
      .select()

    if (error) throw error
    logger.info('bookApi.deleteBook success')
    return data
  }
}

// =============================================
// 单词相关 API
// =============================================
export const wordApi = {
  async getWords(userId: string, bookId?: string) {
    logger.debug('wordApi.getWords', { userId, bookId })
    let query = getSupabase()
      .from('words')
      .select('*')
      .eq('user_id', userId)
      .eq('is_deleted', false)

    if (bookId) {
      query = query.eq('book_id', bookId)
    }

    const { data, error } = await query.order('created_at', { ascending: false })

    if (error) throw error
    logger.info('wordApi.getWords success', { count: data?.length })
    return data
  },

  async createWord(word: any) {
    logger.debug('wordApi.createWord', { word: word.word })
    const { data, error } = await getSupabase()
      .from('words')
      .insert(word)
      .select()

    if (error) throw error
    logger.info('wordApi.createWord success', { id: data?.[0]?.id })
    return data[0]
  },

  async updateWord(wordId: string, updates: any) {
    logger.debug('wordApi.updateWord', { wordId })
    const { data, error } = await getSupabase()
      .from('words')
      .update(updates)
      .eq('id', wordId)
      .select()

    if (error) throw error
    logger.info('wordApi.updateWord success')
    return data[0]
  },

  async deleteWord(wordId: string) {
    logger.debug('wordApi.deleteWord', { wordId })
    const { data, error } = await getSupabase()
      .from('words')
      .update({ is_deleted: true })
      .eq('id', wordId)
      .select()

    if (error) throw error
    logger.info('wordApi.deleteWord success')
    return data
  }
}

// =============================================
// 同步相关 API
// =============================================
export const syncApi = {
  async getChangelogs(userId: string, sinceVersion: number) {
    logger.debug('syncApi.getChangelogs', { userId, sinceVersion })
    const { data, error } = await getSupabase()
      .from('sync_changelogs')
      .select('*')
      .eq('user_id', userId)
      .gt('sync_version', sinceVersion)
      .order('sync_version', { ascending: true })

    if (error) throw error
    logger.info('syncApi.getChangelogs success', { count: data?.length })
    return data
  },

  async getLatestVersion(userId: string) {
    logger.debug('syncApi.getLatestVersion', { userId })
    const { data, error } = await getSupabase()
      .from('sync_changelogs')
      .select('sync_version')
      .eq('user_id', userId)
      .order('sync_version', { ascending: false })
      .limit(1)

    if (error) throw error
    logger.info('syncApi.getLatestVersion success', { version: data?.[0]?.sync_version })
    return data?.[0]?.sync_version || 0
  }
}

export default supabase
