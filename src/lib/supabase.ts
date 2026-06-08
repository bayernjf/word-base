import { createClient } from '@supabase/supabase-js'

// Supabase 配置
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'http://localhost:54321'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// =============================================
// 用户资料相关 API
// =============================================
export const profileApi = {
  async getProfile(userId: string) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) throw error
    return data
  },

  async updateProfile(userId: string, updates: any) {
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()

    if (error) throw error
    return data[0]
  }
}

// =============================================
// 单词本相关 API
// =============================================
export const bookApi = {
  async getBooks(userId: string) {
    const { data, error } = await supabase
      .from('vocabulary_books')
      .select('*')
      .eq('user_id', userId)
      .eq('is_deleted', false)
      .order('is_sync', { ascending: false })
      .order('created_at')

    if (error) throw error
    return data
  },

  async createBook(book: any) {
    const { data, error } = await supabase
      .from('vocabulary_books')
      .insert(book)
      .select()

    if (error) throw error
    return data[0]
  },

  async updateBook(bookId: string, updates: any) {
    const { data, error } = await supabase
      .from('vocabulary_books')
      .update(updates)
      .eq('id', bookId)
      .select()

    if (error) throw error
    return data[0]
  },

  async deleteBook(bookId: string) {
    const { data, error } = await supabase
      .from('vocabulary_books')
      .update({ is_deleted: true })
      .eq('id', bookId)
      .select()

    if (error) throw error
    return data
  }
}

// =============================================
// 单词相关 API
// =============================================
export const wordApi = {
  async getWords(userId: string, bookId?: string) {
    let query = supabase
      .from('words')
      .select('*')
      .eq('user_id', userId)
      .eq('is_deleted', false)

    if (bookId) {
      query = query.eq('book_id', bookId)
    }

    const { data, error } = await query.order('created_at', { ascending: false })

    if (error) throw error
    return data
  },

  async createWord(word: any) {
    const { data, error } = await supabase
      .from('words')
      .insert(word)
      .select()

    if (error) throw error
    return data[0]
  },

  async updateWord(wordId: string, updates: any) {
    const { data, error } = await supabase
      .from('words')
      .update(updates)
      .eq('id', wordId)
      .select()

    if (error) throw error
    return data[0]
  },

  async deleteWord(wordId: string) {
    const { data, error } = await supabase
      .from('words')
      .update({ is_deleted: true })
      .eq('id', wordId)
      .select()

    if (error) throw error
    return data
  }
}

// =============================================
// 同步相关 API
// =============================================
export const syncApi = {
  async getChangelogs(userId: string, sinceVersion: number) {
    const { data, error } = await supabase
      .from('sync_changelogs')
      .select('*')
      .eq('user_id', userId)
      .gt('sync_version', sinceVersion)
      .order('sync_version', { ascending: true })

    if (error) throw error
    return data
  },

  async getLatestVersion(userId: string) {
    const { data, error } = await supabase
      .from('sync_changelogs')
      .select('sync_version')
      .eq('user_id', userId)
      .order('sync_version', { ascending: false })
      .limit(1)

    if (error) throw error
    return data[0]?.sync_version || 0
  }
}

export default supabase
