import { Hono } from 'hono'
import {
  getRequestContext,
  getActiveAiConfig,
  extractJsonText,
  readString,
  readStringArray,
  callAiProviderRaw,
  logger,
  errorContext,
} from '../context'
import {
  parseBody,
  practiceGenerateBodySchema,
  practiceEvaluateBodySchema,
} from '../utils/validation'

const PRACTICE_DAILY_LIMIT = 20

async function checkPracticeQuota(db: any, userId: string) {
  const today = new Date().toISOString().slice(0, 10)
  const { data: quota } = await db
    .from('practice_generation_quota')
    .select('generated_count')
    .eq('user_id', userId)
    .eq('quota_date', today)
    .maybeSingle()

  const currentCount = quota?.generated_count || 0
  if (currentCount >= PRACTICE_DAILY_LIMIT) {
    return { allowed: false, remaining: 0, quota, today }
  }

  return { allowed: true, remaining: PRACTICE_DAILY_LIMIT - currentCount - 1, quota, today }
}

async function incrementPracticeQuota(db: any, userId: string, quota: any, today: string) {
  if (quota) {
    await db.from('practice_generation_quota')
      .update({ generated_count: quota.generated_count + 1 })
      .eq('user_id', userId)
      .eq('quota_date', today)
  } else {
    await db.from('practice_generation_quota')
      .insert({ user_id: userId, quota_date: today, generated_count: 1 })
  }
}

export function registerPracticeRoutes(app: Hono) {
  app.post('/api/v1/ai/practice/generate', async (c) => {
    try {
      const { user, db } = await getRequestContext(c)
      if (!user) return c.json({ error: 'Unauthorized' }, 401)

      const parsedBody = await parseBody(c, practiceGenerateBodySchema, {
        fieldErrors: { type: 'invalid_practice_type', words: 'words_required' },
      })
      if (!parsedBody.ok) return c.json({ error: parsedBody.error, details: parsedBody.details }, 400)
      const { type, words, difficulty, providerId } = parsedBody.data

      const quotaCheck = await checkPracticeQuota(db, user.id)
      if (!quotaCheck.allowed) {
        return c.json({ error: 'daily_quota_exceeded' }, 429)
      }

      const config = await getActiveAiConfig(db, providerId)

      let result: any = { remaining: quotaCheck.remaining }

      if (type === 'reading') {
        const prompt = [
          'Generate an English reading comprehension passage for vocabulary learning as strict JSON only.',
          'Schema: {"article":{"title":"...","content":"...","category":"...","difficulty":"..."},"highlighted":{"word":{"translation":"中文翻译","definition":"English definition"}},"quizzes":[{"question":"...","options":["A","B","C","D"],"correctIndex":0,"explanation":"..."}]}',
          `Difficulty: ${difficulty}`,
          `Include these vocabulary words naturally in the passage: ${words.join(', ')}`,
          'Rules: article.content should be 150-250 words; highlighted should cover the target words with Chinese translation and English definition; quizzes should have 2-3 comprehension questions; all text in English except translations; do not include markdown.',
        ].filter(Boolean).join('\n')

        const raw = await callAiProviderRaw({ config, prompt, jsonMode: true })
        let parsed: any
        try { parsed = JSON.parse(extractJsonText(raw)) } catch {
          logger.warn('ai_practice_parse_failed', { type: 'reading' })
          return c.json({ error: 'ai_parse_failed' }, 500)
        }

        result.reading = {
          article: {
            title: readString(parsed?.article?.title),
            content: readString(parsed?.article?.content),
            category: readString(parsed?.article?.category) || 'General',
            difficulty: readString(parsed?.article?.difficulty) || difficulty,
          },
          highlighted: parsed?.highlighted && typeof parsed.highlighted === 'object'
            ? Object.fromEntries(
                Object.entries(parsed.highlighted).map(([k, v]: [string, any]) => [
                  k.toLowerCase(),
                  { translation: readString(v?.translation), definition: readString(v?.definition) },
                ])
              )
            : {},
          quizzes: (Array.isArray(parsed?.quizzes) ? parsed.quizzes : [])
            .map((q: any) => ({
              question: readString(q?.question),
              options: readStringArray(q?.options).slice(0, 4),
              correctIndex: Number(q?.correctIndex) || 0,
              explanation: readString(q?.explanation),
            }))
            .filter((q: any) => q.question && q.options.length >= 2)
            .slice(0, 5),
        }
      } else if (type === 'listening') {
        const prompt = [
          'Generate an English listening exercise passage for vocabulary learning as strict JSON only.',
          'Schema: {"passage":"full text","transcript":[{"time":"0:00","text":"sentence"}],"quizzes":[{"question":"...","options":["A","B","C","D"],"correctIndex":0,"explanation":"..."}],"duration":"01:30"}',
          `Difficulty: ${difficulty}`,
          `Include these vocabulary words naturally: ${words.join(', ')}`,
          'Rules: passage should be a short dialogue or monologue of 100-200 words; transcript should split the passage into 3-6 segments with timestamps; quizzes should have 2-3 comprehension questions; duration is estimated total time; do not include markdown.',
        ].filter(Boolean).join('\n')

        const raw = await callAiProviderRaw({ config, prompt, jsonMode: true })
        let parsed: any
        try { parsed = JSON.parse(extractJsonText(raw)) } catch {
          logger.warn('ai_practice_parse_failed', { type: 'listening' })
          return c.json({ error: 'ai_parse_failed' }, 500)
        }

        result.listening = {
          passage: readString(parsed?.passage),
          transcript: (Array.isArray(parsed?.transcript) ? parsed.transcript : [])
            .map((t: any) => ({ time: readString(t?.time), text: readString(t?.text) }))
            .filter((t: any) => t.text)
            .slice(0, 8),
          quizzes: (Array.isArray(parsed?.quizzes) ? parsed.quizzes : [])
            .map((q: any) => ({
              question: readString(q?.question),
              options: readStringArray(q?.options).slice(0, 4),
              correctIndex: Number(q?.correctIndex) || 0,
              explanation: readString(q?.explanation),
            }))
            .filter((q: any) => q.question && q.options.length >= 2)
            .slice(0, 5),
          duration: readString(parsed?.duration) || '01:00',
        }
      } else if (type === 'writing') {
        const prompt = [
          'Generate an English writing practice prompt for vocabulary learning as strict JSON only.',
          'Schema: {"prompt":"...","minWords":80,"suggestedWords":["..."]}',
          `Difficulty: ${difficulty}`,
          `Target vocabulary: ${words.join(', ')}`,
          'Rules: prompt should ask the user to write a short passage (80-150 words) naturally using the target vocabulary; suggestedWords lists 3-5 of the target words that must be used; do not include markdown.',
        ].filter(Boolean).join('\n')

        const raw = await callAiProviderRaw({ config, prompt, jsonMode: true })
        let parsed: any
        try { parsed = JSON.parse(extractJsonText(raw)) } catch {
          logger.warn('ai_practice_parse_failed', { type: 'writing' })
          return c.json({ error: 'ai_parse_failed' }, 500)
        }

        result.writing = {
          prompt: readString(parsed?.prompt),
          minWords: Number(parsed?.minWords) || 80,
          suggestedWords: readStringArray(parsed?.suggestedWords).slice(0, 5),
        }
      } else if (type === 'speaking') {
        const prompt = [
          'Generate an English speaking practice scenario for vocabulary learning as strict JSON only.',
          'Schema: {"title":"...","prompt":"sentence to read aloud","tip":"pronunciation tip in Chinese"}',
          `Difficulty: ${difficulty}`,
          `Target vocabulary: ${words.join(', ')}`,
          'Rules: prompt should be 1-2 sentences suitable for read-aloud practice; tip should be in Chinese about pronunciation or intonation; do not include markdown.',
        ].filter(Boolean).join('\n')

        const raw = await callAiProviderRaw({ config, prompt, jsonMode: true })
        let parsed: any
        try { parsed = JSON.parse(extractJsonText(raw)) } catch {
          logger.warn('ai_practice_parse_failed', { type: 'speaking' })
          return c.json({ error: 'ai_parse_failed' }, 500)
        }

        result.speaking = {
          title: readString(parsed?.title),
          prompt: readString(parsed?.prompt),
          tip: readString(parsed?.tip),
        }
      }

      await incrementPracticeQuota(db, user.id, quotaCheck.quota, quotaCheck.today)

      return c.json(result)
    } catch (err) {
      logger.error('practice_generate_failed', errorContext(err))
      return c.json({ error: 'internal_server_error' }, 500)
    }
  })

  app.post('/api/v1/ai/practice/evaluate', async (c) => {
    try {
      const { user, db } = await getRequestContext(c)
      if (!user) return c.json({ error: 'Unauthorized' }, 401)

      const parsedBody = await parseBody(c, practiceEvaluateBodySchema, {
        fieldErrors: {
          type: 'invalid_evaluate_type',
          userText: 'user_text_required',
          transcription: 'transcription_required',
        },
      })
      if (!parsedBody.ok) return c.json({ error: parsedBody.error, details: parsedBody.details }, 400)
      const body = parsedBody.data

      const config = await getActiveAiConfig(db, body.providerId)

      if (body.type === 'writing') {
        const userText = body.userText

        const prompt = [
          'Evaluate the English writing and provide feedback as strict JSON only.',
          'Schema: {"score":75,"level":"B2","feedback":[{"type":"grammar","issue":"...","suggestion":"...","explanation":"中文解释"}]}',
          `Writing prompt: ${body.prompt}`,
          `User's text: ${userText}`,
          'Rules: score is 0-100; level is CEFR level; feedback items should cover grammar, vocabulary, and style issues; explanation should be in Chinese; do not include markdown.',
        ].filter(Boolean).join('\n')

        const raw = await callAiProviderRaw({ config, prompt, jsonMode: true })
        let parsed: any
        try { parsed = JSON.parse(extractJsonText(raw)) } catch {
          logger.warn('ai_practice_evaluate_parse_failed', { type: 'writing' })
          return c.json({ error: 'ai_parse_failed' }, 500)
        }

        return c.json({
          writing: {
            score: Number(parsed?.score) || 0,
            level: readString(parsed?.level),
            feedback: (Array.isArray(parsed?.feedback) ? parsed.feedback : [])
              .map((f: any) => ({
                type: ['grammar', 'vocabulary', 'style'].includes(readString(f?.type)) ? readString(f?.type) : 'style',
                issue: readString(f?.issue),
                suggestion: readString(f?.suggestion),
                explanation: readString(f?.explanation),
              }))
              .filter((f: any) => f.issue && f.suggestion)
              .slice(0, 8),
          },
        })
      }

      // type === 'speaking'
      const { transcription, originalPrompt } = body

      const prompt = [
        'Evaluate the spoken English by comparing the transcription with the target sentence as strict JSON only.',
        'Schema: {"score":85,"fluency":"...","accuracy":"...","issues":[{"word":"...","expected":"...","actual":"...","suggestion":"..."}]}',
        `Target sentence: ${originalPrompt}`,
        `User transcription (from ASR): ${transcription}`,
        'Rules: score is 0-100; fluency and accuracy are short English descriptions; issues should list word-level mismatches; suggestion should be in Chinese; do not include markdown.',
      ].filter(Boolean).join('\n')

      const raw = await callAiProviderRaw({ config, prompt, jsonMode: true })
      let parsed: any
      try { parsed = JSON.parse(extractJsonText(raw)) } catch {
        logger.warn('ai_practice_evaluate_parse_failed', { type: 'speaking' })
        return c.json({ error: 'ai_parse_failed' }, 500)
      }

      return c.json({
        speaking: {
          score: Number(parsed?.score) || 0,
          fluency: readString(parsed?.fluency),
          accuracy: readString(parsed?.accuracy),
          issues: (Array.isArray(parsed?.issues) ? parsed.issues : [])
            .map((i: any) => ({
              word: readString(i?.word),
              expected: readString(i?.expected),
              actual: readString(i?.actual),
              suggestion: readString(i?.suggestion),
            }))
            .filter((i: any) => i.word)
            .slice(0, 10),
        },
      })
    } catch (err) {
      logger.error('practice_evaluate_failed', errorContext(err))
      return c.json({ error: 'internal_server_error' }, 500)
    }
  })
}
