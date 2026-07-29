// 请求体校验：zod schema 集中定义 + parseBody 统一入口。
// 约定：校验失败返回的 error code 尽量沿用旧的手写校验错误码（如 word_required），
// 通过 fieldErrors 映射保持前端兼容；新增的类型/长度约束统一落到 fallback code。

import { z } from 'zod'

// —— 基础构件 ——

const requiredString = (max: number) => z.string().trim().min(1).max(max)
const optionalId = z.string().trim().max(64).optional()

// AI 端点通用的 contexts 载荷：[{ context: '...' }]，允许多余字段
const aiContextsSchema = z
  .array(z.looseObject({ context: z.string().max(2000).nullish() }))
  .max(20)
  .optional()
  .default([])

// —— Auth ——

export const loginBodySchema = z.object({
  email: z.string().trim().toLowerCase().min(1).max(320),
  password: z.string().min(1).max(256)
})

export const registerBodySchema = z.object({
  email: z.string().trim().toLowerCase().min(1).max(320),
  password: z.string().min(1).max(256),
  nickname: z.string().trim().max(50).optional().default('')
})

export const refreshBodySchema = z.object({
  refreshToken: z.string().trim().min(1).max(2048)
})

// —— AI 词汇能力 ——

export const aiEnrichBodySchema = z.object({
  word: requiredString(100),
  translation: z.string().max(500).optional().default(''),
  wordId: optionalId,
  providerId: optionalId,
  contexts: aiContextsSchema
})

export const aiExplainBodySchema = z.object({
  word: requiredString(100),
  wordId: optionalId,
  providerId: optionalId,
  contexts: aiContextsSchema
})

export const aiSenseClusterBodySchema = aiExplainBodySchema

export const aiTranslateBodySchema = z.object({
  text: requiredString(5000),
  targetLanguage: z.string().trim().max(20).optional().default('zh'),
  providerId: optionalId
})

export const aiTutorChatBodySchema = z.object({
  message: requiredString(2000),
  story: z
    .looseObject({
      title: z.string().max(300).nullish(),
      contentEn: z.string().max(10000).nullish()
    })
    .nullish(),
  history: z
    .array(
      z.looseObject({
        sender: z.string().max(20).nullish(),
        text: z.string().max(4000).nullish()
      })
    )
    .max(20)
    .optional()
    .default([])
})

export const aiStoryGenerateBodySchema = z.object({
  topic: z.string().trim().max(200).optional().default(''),
  difficulty: z.string().trim().max(10).optional().default('B2'),
  words: z
    .array(z.string().max(100))
    .max(50)
    .optional()
    .default([])
    .transform((list) => list.map((w) => w.trim()).filter(Boolean).slice(0, 20)),
  sourceWordIds: z
    .array(z.string().trim().max(64))
    .max(50)
    .optional()
    .default([])
})

// —— AI 练习 ——

export const practiceGenerateBodySchema = z.object({
  type: z.enum(['reading', 'listening', 'writing', 'speaking']),
  words: z
    .array(z.string().max(100))
    .max(50)
    .transform((list) => list.map((w) => w.trim()).filter(Boolean).slice(0, 10))
    .refine((list) => list.length > 0, 'at least one non-empty word is required'),
  difficulty: z.string().trim().max(10).optional().default('B2'),
  providerId: optionalId
})

export const practiceEvaluateBodySchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('writing'),
    userText: requiredString(5000),
    prompt: z.string().max(2000).optional().default(''),
    providerId: optionalId
  }),
  z.object({
    type: z.literal('speaking'),
    transcription: requiredString(5000),
    originalPrompt: z.string().trim().max(2000).optional().default(''),
    providerId: optionalId
  })
])

// —— Books（单词本）——

export const createBookBodySchema = z.object({
  name: z.string().trim().min(1).max(100),
  description: z.string().max(500).optional().default(''),
  icon: z.string().max(50).optional().default('BookOpen'),
  is_sync: z.boolean().optional().default(false),
  word_count: z.number().int().min(0).optional().default(0),
})

export const updateBookBodySchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  icon: z.string().max(50).optional(),
  is_sync: z.boolean().optional(),
  word_count: z.number().int().min(0).optional(),
})

// —— Words（单词）——

export const createWordBodySchema = z.object({
  word: z.string().trim().min(1).max(100),
  book_id: z.string().trim().min(1).max(64),
  frequency: z.number().int().min(0).optional().default(1),
  translation: z.string().max(500).optional().default(''),
  phonetic: z.string().max(200).optional().default(''),
  part_of_speech: z.string().max(50).optional().default('noun'),
  definition: z.string().max(2000).optional().default(''),
  chinese_translation: z.string().max(500).optional().default(''),
  level: z.string().max(10).optional().default('B2'),
  contexts: z.unknown().optional(),
  synonyms: z.unknown().optional(),
  examples: z.unknown().optional(),
  meta: z.unknown().optional(),
})

export const batchWordsBodySchema = z.object({
  words: z.array(z.looseObject({
    word: z.string().trim().min(1).max(100),
    book_id: z.string().trim().min(1).max(64),
  }).passthrough()).min(1).max(200),
})

export const batchDeleteBodySchema = z.object({
  wordIds: z.array(z.string().trim().max(64)).min(1).max(200),
})

// —— AI Provider ——

export const aiProviderBodySchema = z.object({
  name: z.string().trim().max(100).optional(),
  provider: z.enum(['openai', 'anthropic', 'gemini', 'openai-compatible']),
  model: z.string().trim().max(100).optional(),
  endpoint: z.string().max(500).optional(),
  apiKey: z.string().min(1).max(2048),
  isActive: z.boolean().optional().default(false),
})

export const aiProviderPatchBodySchema = z.object({
  name: z.string().trim().max(100).optional(),
  provider: z.enum(['openai', 'anthropic', 'gemini', 'openai-compatible']).optional(),
  model: z.string().trim().max(100).optional(),
  endpoint: z.string().max(500).optional(),
  apiKey: z.string().max(2048).optional(),
  isActive: z.boolean().optional(),
})

// —— User Settings（Extension Sync）——

export const settingsBodySchema = z.object({
  settings: z.record(z.string(), z.unknown()).refine(
    (obj) => {
      try {
        const str = JSON.stringify(obj);
        return str.length <= 64 * 1024; // 64KB limit
      } catch {
        return false;
      }
    },
    { message: 'settings payload exceeds 64KB limit' }
  )
})

// —— 统一解析入口 ——

type HonoLikeContext = { req: { json: () => Promise<unknown> } }

// 两个分支都声明全部字段（互斥字段为 optional undefined），
// 确保在 strict: false 的 tsconfig（如 apps/web）下无需控制流窄化也能编译
export type BodyParseResult<T> =
  | { ok: true; data: T; error?: undefined; details?: undefined }
  | { ok: false; error: string; details: string[]; data?: undefined }

export const parseBody = async <S extends z.ZodType>(
  c: HonoLikeContext,
  schema: S,
  options: { fallback?: string; fieldErrors?: Record<string, string> } = {}
): Promise<BodyParseResult<z.output<S>>> => {
  const raw = await c.req.json().catch(() => null)
  const parsed = schema.safeParse(raw)
  if (!parsed.success) {
    const issues = parsed.error.issues
    const firstField = String(issues[0]?.path?.[0] ?? '')
    const error = options.fieldErrors?.[firstField] || options.fallback || 'invalid_request'
    const details = issues
      .slice(0, 5)
      .map((issue) => `${issue.path.join('.') || 'body'}: ${issue.message}`)
    return { ok: false, error, details }
  }
  return { ok: true, data: parsed.data }
}
