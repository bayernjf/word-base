import { Hono } from 'hono'
import {
  getRequestContext,
  getActiveAiConfig,
  extractJsonText,
  readString,
  readStringArray,
  callAiProviderRaw,
  checkAiCallLimits,
  recordAiCall,
  aiLimitResponse,
  logger,
  errorContext,
} from '../context'
import {
  parseBody,
  aiEnrichBodySchema,
  aiExplainBodySchema,
  aiSenseClusterBodySchema,
  aiTranslateBodySchema,
  aiTutorChatBodySchema,
  aiStoryGenerateBodySchema,
} from '../utils/validation'

export function registerAiRoutes(app: Hono) {
  // --- /api/v1/ai/enrich ---
  app.post('/api/v1/ai/enrich', async (c) => {
    try {
      const { user, db } = await getRequestContext(c)
      if (!user) return c.json({ error: 'Unauthorized' }, 401)

      const parsed = await parseBody(c, aiEnrichBodySchema, { fieldErrors: { word: 'word_required' } })
      if (!parsed.ok) return c.json({ error: parsed.error, details: parsed.details }, 400)
      const { word, translation, wordId, providerId } = parsed.data

      const limit = await checkAiCallLimits(db, user.id)
      if (!limit.allowed) return aiLimitResponse(c, limit)

      const config = await getActiveAiConfig(db, providerId)
      const contexts = parsed.data.contexts
        .map((item) => item?.context?.trim())
        .filter(Boolean)
        .slice(0, 5)

      const prompt = [
        'Generate vocabulary enrichment as strict JSON only.',
        'Schema: {"definition":"...","translation":"...","synonyms":["..."],"examples":[{"en":"...","zh":"..."}],"usageHistory":[{"context":"...","translation":"...","source":"AI"}],"memoryTip":"..."}',
        `Word: ${word}`,
        `Current translation: ${translation}`,
        `Contexts: ${JSON.stringify(contexts)}`,
        'Rules: "definition" must be an English explanation of the word meaning (English-English style); "translation" must be the Chinese translation; examples must be natural English with Chinese translations; synonyms must be English; memoryTip must be in Chinese; do not include markdown.',
      ].join('\n')

      const raw = await callAiProviderRaw({ config, prompt, jsonMode: true })
      await recordAiCall(db, user.id, limit)
      let aiParsed: any
      try {
        aiParsed = JSON.parse(extractJsonText(raw))
      } catch {
        logger.warn('ai_enrich_parse_failed', { wordId })
        return c.json({
          enrichment: {
            definition: '',
            translation: '',
            synonyms: [],
            examples: [],
            usageHistory: [],
          },
        }, 200)
      }

      const enrichment = {
        definition: readString(aiParsed.definition),
        translation: readString(aiParsed.translation),
        synonyms: readStringArray(aiParsed.synonyms).slice(0, 8),
        examples: (Array.isArray(aiParsed.examples) ? aiParsed.examples : [])
          .map((item: any) => {
            const en = readString(item?.en)
            const zh = readString(item?.zh)
            return en && zh ? { en, zh } : null
          })
          .filter(Boolean)
          .slice(0, 5),
        usageHistory: (Array.isArray(aiParsed.usageHistory) ? aiParsed.usageHistory : [])
          .map((item: any) => {
            const ctx = readString(item?.context)
            const tr = readString(item?.translation)
            return ctx && tr ? { context: ctx, translation: tr, source: readString(item?.source) || 'AI' } : null
          })
          .filter(Boolean)
          .slice(0, 5),
        memoryTip: readString(aiParsed.memoryTip) || undefined,
      }

      if (wordId) {
        await db.from('words').update({
          definition: enrichment.definition,
          translation: enrichment.translation,
          chinese_translation: enrichment.translation,
          synonyms: enrichment.synonyms,
          examples: enrichment.examples,
          usage_history: enrichment.usageHistory,
          memory_tip: enrichment.memoryTip || null,
          updated_at: new Date().toISOString(),
        }).eq('id', wordId).eq('user_id', user.id)
      }

      return c.json({ enrichment })
    } catch (err) {
      logger.error('ai_enrich_failed', errorContext(err))
      return c.json({ error: 'internal_server_error' }, 500)
    }
  })

  // --- /api/v1/ai/explain ---
  app.post('/api/v1/ai/explain', async (c) => {
    try {
      const { user, db } = await getRequestContext(c)
      if (!user) return c.json({ error: 'Unauthorized' }, 401)

      const parsed = await parseBody(c, aiExplainBodySchema, { fieldErrors: { word: 'word_required' } })
      if (!parsed.ok) return c.json({ error: parsed.error, details: parsed.details }, 400)
      const { word, wordId, providerId } = parsed.data

      const limit = await checkAiCallLimits(db, user.id)
      if (!limit.allowed) return aiLimitResponse(c, limit)

      const config = await getActiveAiConfig(db, providerId)
      const contexts = parsed.data.contexts
        .map((item) => item?.context?.trim())
        .filter(Boolean)
        .slice(0, 5)

      const prompt = [
        'Generate a deep explanation of the word as strict JSON only.',
        'Schema: {"contextInsights":[{"context":"...","insight":"..."}],"synonymComparison":"...","memoryHook":"..."}',
        `Word: ${word}`,
        `Contexts: ${JSON.stringify(contexts)}`,
        'Rules: contextInsights should analyze how the word is used in each context; synonymComparison should compare synonyms in Chinese; memoryHook should be a Chinese mnemonic; do not include markdown.',
      ].join('\n')

      const raw = await callAiProviderRaw({ config, prompt, jsonMode: true })
      await recordAiCall(db, user.id, limit)
      let aiParsed: any
      try {
        aiParsed = JSON.parse(extractJsonText(raw))
      } catch {
        logger.warn('ai_explain_parse_failed', { wordId })
        return c.json({ deepExplanation: { contextInsights: [], synonymComparison: '', memoryHook: '' } }, 200)
      }

      const deepExplanation = {
        contextInsights: (Array.isArray(aiParsed.contextInsights) ? aiParsed.contextInsights : [])
          .map((item: any) => {
            const ctx = readString(item?.context)
            const insight = readString(item?.insight)
            return ctx && insight ? { context: ctx, insight } : null
          })
          .filter(Boolean)
          .slice(0, 5),
        synonymComparison: readString(aiParsed.synonymComparison),
        memoryHook: readString(aiParsed.memoryHook),
        generatedAt: Date.now(),
      }

      if (wordId) {
        await db.from('words').update({
          deep_explanation: deepExplanation,
          updated_at: new Date().toISOString(),
        }).eq('id', wordId).eq('user_id', user.id)
      }

      return c.json({ deepExplanation })
    } catch (err) {
      logger.error('ai_explain_failed', errorContext(err))
      return c.json({ error: 'internal_server_error' }, 500)
    }
  })

  // --- /api/v1/ai/sense-cluster ---
  app.post('/api/v1/ai/sense-cluster', async (c) => {
    try {
      const { user, db } = await getRequestContext(c)
      if (!user) return c.json({ error: 'Unauthorized' }, 401)

      const parsed = await parseBody(c, aiSenseClusterBodySchema, { fieldErrors: { word: 'word_required' } })
      if (!parsed.ok) return c.json({ error: parsed.error, details: parsed.details }, 400)
      const { word, wordId, providerId } = parsed.data

      const limit = await checkAiCallLimits(db, user.id)
      if (!limit.allowed) return aiLimitResponse(c, limit)

      const config = await getActiveAiConfig(db, providerId)
      const contexts = parsed.data.contexts
        .map((item) => item?.context?.trim())
        .filter(Boolean)
        .slice(0, 10)

      const prompt = [
        'Cluster the contexts of the word by its senses as strict JSON only.',
        'Schema: {"groups":[{"sense":"...","translation":"...","definition":"...","contexts":["..."]}]}',
        `Word: ${word}`,
        `Contexts: ${JSON.stringify(contexts)}`,
        'Rules: group contexts that share the same meaning; "sense" is a short English label; "translation" is the Chinese meaning; "definition" is an English explanation; "contexts" lists the input contexts that belong to this group; do not include markdown.',
      ].join('\n')

      const raw = await callAiProviderRaw({ config, prompt, jsonMode: true })
      await recordAiCall(db, user.id, limit)
      let aiParsed: any
      try {
        aiParsed = JSON.parse(extractJsonText(raw))
      } catch {
        logger.warn('ai_sense_cluster_parse_failed', { wordId })
        return c.json({ senseGroups: { groups: [] } }, 200)
      }

      const senseGroups = {
        groups: (Array.isArray(aiParsed.groups) ? aiParsed.groups : [])
          .map((item: any) => {
            const sense = readString(item?.sense)
            if (!sense) return null
            return {
              sense,
              translation: readString(item?.translation),
              definition: readString(item?.definition),
              contexts: readStringArray(item?.contexts),
            }
          })
          .filter(Boolean)
          .slice(0, 8),
        generatedAt: Date.now(),
      }

      if (wordId) {
        await db.from('words').update({
          sense_groups: senseGroups,
          updated_at: new Date().toISOString(),
        }).eq('id', wordId).eq('user_id', user.id)
      }

      return c.json({ senseGroups })
    } catch (err) {
      logger.error('ai_sense_cluster_failed', errorContext(err))
      return c.json({ error: 'internal_server_error' }, 500)
    }
  })

  // --- /api/v1/ai/translate ---
  app.post('/api/v1/ai/translate', async (c) => {
    try {
      const { user, db } = await getRequestContext(c)
      if (!user) return c.json({ error: 'Unauthorized' }, 401)

      const parsed = await parseBody(c, aiTranslateBodySchema, { fieldErrors: { text: 'text_required' } })
      if (!parsed.ok) return c.json({ error: parsed.error, details: parsed.details }, 400)
      const { text, targetLanguage, providerId } = parsed.data

      const limit = await checkAiCallLimits(db, user.id)
      if (!limit.allowed) return aiLimitResponse(c, limit)

      const config = await getActiveAiConfig(db, providerId)
      const prompt = `Translate the following text to ${targetLanguage === 'zh' ? 'Chinese' : targetLanguage}. Return only the translation, no explanation.\n\nText: ${text}`

      const raw = await callAiProviderRaw({ config, prompt, jsonMode: false })
      await recordAiCall(db, user.id, limit)
      const translatedText = String(raw || '').trim()

      return c.json({ translatedText })
    } catch (err) {
      logger.error('ai_translate_failed', errorContext(err))
      return c.json({ error: 'internal_server_error' }, 500)
    }
  })

  // --- /api/v1/ai/story-generate ---
  app.post('/api/v1/ai/story-generate', async (c) => {
    try {
      const { user, db } = await getRequestContext(c)
      if (!user) return c.json({ error: 'Unauthorized' }, 401)

      const parsed = await parseBody(c, aiStoryGenerateBodySchema)
      if (!parsed.ok) return c.json({ error: parsed.error, details: parsed.details }, 400)
      const { topic, difficulty, words, sourceWordIds } = parsed.data

      const today = new Date().toISOString().slice(0, 10)
      const { data: quota } = await db
        .from('story_generation_quota')
        .select('generated_count')
        .eq('user_id', user.id)
        .eq('quota_date', today)
        .maybeSingle()

      const DAILY_LIMIT = 20
      const currentCount = quota?.generated_count || 0
      if (currentCount >= DAILY_LIMIT) {
        return c.json({ error: 'daily_quota_exceeded' }, 429)
      }
      const remaining = DAILY_LIMIT - currentCount - 1

      const config = await getActiveAiConfig(db)
      const prompt = [
        'Generate a short English story for vocabulary learning as strict JSON only.',
        'Schema: {"title":"...","category":"...","contentEn":"...","contentZh":"...","sentences":[{"en":"...","zh":"...","words":["..."]}],"highlightedWords":["..."],"grammarInsight":"..."}',
        `Difficulty: ${difficulty}`,
        topic ? `Topic: ${topic}` : 'Topic: free choice',
        words.length ? `Include these words: ${words.join(', ')}` : '',
        'Rules: contentEn should be 150-300 words; contentZh is the full Chinese translation; sentences should be split with word arrays containing key vocabulary; highlightedWords lists target words; grammarInsight is a Chinese explanation of key grammar; do not include markdown.',
      ].filter(Boolean).join('\n')

      const raw = await callAiProviderRaw({ config, prompt, jsonMode: true })
      let aiParsed: any
      try {
        aiParsed = JSON.parse(extractJsonText(raw))
      } catch {
        logger.warn('ai_story_parse_failed')
        return c.json({ error: 'ai_parse_failed' }, 500)
      }

      const story = {
        title: readString(aiParsed.title),
        category: readString(aiParsed.category) || topic || 'general',
        difficulty,
        contentEn: readString(aiParsed.contentEn),
        contentZh: readString(aiParsed.contentZh),
        sentences: Array.isArray(aiParsed.sentences) ? aiParsed.sentences.map((s: any) => ({
          en: readString(s?.en),
          zh: readString(s?.zh),
          words: readStringArray(s?.words),
        })).filter((s: any) => s.en) : [],
        highlightedWords: readStringArray(aiParsed.highlightedWords),
        grammarInsight: readString(aiParsed.grammarInsight),
      }

      const { data: inserted, error: insertErr } = await db
        .from('stories')
        .insert({
          user_id: user.id,
          title: story.title,
          category: story.category,
          difficulty,
          content_en: story.contentEn,
          content_zh: story.contentZh,
          sentences: story.sentences,
          highlighted_words: story.highlightedWords,
          grammar_insight: story.grammarInsight,
          source_word_ids: sourceWordIds,
          is_public: false,
          is_deleted: false,
        })
        .select('id, created_at')
        .single()

      if (insertErr) throw insertErr

      if (quota) {
        await db.from('story_generation_quota')
          .update({ generated_count: currentCount + 1 })
          .eq('user_id', user.id)
          .eq('quota_date', today)
      } else {
        await db.from('story_generation_quota')
          .insert({ user_id: user.id, quota_date: today, generated_count: 1 })
      }

      return c.json({
        story: { ...story, id: inserted.id, createdAt: inserted.created_at },
        remaining,
      })
    } catch (err) {
      logger.error('ai_story_generate_failed', errorContext(err))
      return c.json({ error: 'internal_server_error' }, 500)
    }
  })

  // --- /api/v1/ai/tutor-chat ---
  app.post('/api/v1/ai/tutor-chat', async (c) => {
    try {
      const { user, db } = await getRequestContext(c)
      if (!user) return c.json({ error: 'Unauthorized' }, 401)

      const parsed = await parseBody(c, aiTutorChatBodySchema, { fieldErrors: { message: 'message_required' } })
      if (!parsed.ok) return c.json({ error: parsed.error, details: parsed.details }, 400)
      const { message, story, history } = parsed.data

      const limit = await checkAiCallLimits(db, user.id)
      if (!limit.allowed) return aiLimitResponse(c, limit)

      const config = await getActiveAiConfig(db)

      const systemParts: string[] = [
        'You are an English tutor helping a Chinese student learn vocabulary through stories.',
        'Respond in Chinese. Be encouraging and concise.',
      ]

      if (story) {
        systemParts.push(`Current story title: ${story.title || ''}`)
        systemParts.push(`Story content: ${story.contentEn || ''}`)
      }

      const messages = [
        { role: 'system', content: systemParts.join('\n') },
        ...history.map((m) => ({
          role: m.sender === 'user' ? 'user' : 'assistant',
          content: String(m.text || ''),
        })),
        { role: 'user', content: message },
      ]

      const prompt = messages.map(m => `[${m.role}] ${m.content}`).join('\n\n')

      const raw = await callAiProviderRaw({ config, prompt, jsonMode: false })
      await recordAiCall(db, user.id, limit)
      const reply = String(raw || '').trim()

      return c.json({ reply })
    } catch (err) {
      logger.error('ai_tutor_chat_failed', errorContext(err))
      return c.json({ error: 'internal_server_error' }, 500)
    }
  })
}
