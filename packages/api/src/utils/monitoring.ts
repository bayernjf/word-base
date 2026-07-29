// 服务端错误监控（Sentry）。env 门控：未配置 SENTRY_DSN 时全部为 no-op。
//
// 同一个 Hono app 既被独立 server.ts 启动，也被 Vercel serverless（Next.js
// route.ts）导入，因此在 index.ts 模块加载时调用一次 initMonitoring() 即可覆盖两种运行时。
// captureException 在 app.onError 兜底处调用，把未处理异常上报到 Sentry。
import * as Sentry from '@sentry/node'

let enabled = false

// 初始化 Sentry（幂等）。仅当 SENTRY_DSN 存在时真正启用，否则完全惰性。
export const initMonitoring = (): void => {
  if (enabled) return
  const dsn = process.env.SENTRY_DSN
  if (!dsn) return
  const tracesSampleRate = Number(process.env.SENTRY_TRACES_SAMPLE_RATE)
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: Number.isFinite(tracesSampleRate) ? tracesSampleRate : 0
  })
  enabled = true
}

// 上报异常。未启用时为 no-op。context 作为附加标签便于检索。
export const captureException = (err: unknown, context?: Record<string, unknown>): void => {
  if (!enabled) return
  Sentry.captureException(err, context ? { extra: context } : undefined)
}
