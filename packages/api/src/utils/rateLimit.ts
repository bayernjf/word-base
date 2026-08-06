// 内存态固定窗口限流：单实例内防突发刷量（Vercel Serverless 每实例独立计数，
// 跨实例的硬上限由 ai_call_quota 每日配额兜底）
type WindowState = { windowStart: number; count: number }

const MAX_TRACKED_KEYS = 10_000

export class FixedWindowCounter {
  private windows = new Map<string, WindowState>()

  constructor(private windowMs: number, private max: number) {}

  /** 记录一次命中；超出窗口上限时返回 allowed=false 与建议重试秒数 */
  hit(key: string, now = Date.now()): { allowed: boolean; retryAfterSeconds: number } {
    const state = this.windows.get(key)
    if (!state || now - state.windowStart >= this.windowMs) {
      this.prune(now)
      this.windows.set(key, { windowStart: now, count: 1 })
      return { allowed: true, retryAfterSeconds: 0 }
    }

    if (state.count >= this.max) {
      const retryAfterSeconds = Math.max(1, Math.ceil((state.windowStart + this.windowMs - now) / 1000))
      return { allowed: false, retryAfterSeconds }
    }

    state.count += 1
    return { allowed: true, retryAfterSeconds: 0 }
  }

  /** 防止 Map 无界增长：仅在键数超限时清理过期窗口 */
  private prune(now: number) {
    if (this.windows.size < MAX_TRACKED_KEYS) return
    for (const [key, state] of this.windows) {
      if (now - state.windowStart >= this.windowMs) {
        this.windows.delete(key)
      }
    }
  }
}

// AI 轻量端点（enrich/explain/sense-cluster/translate/tutor-chat）限流参数
export const AI_USER_WINDOW_MS = 60_000
export const AI_USER_MAX_PER_WINDOW = 20
export const AI_GLOBAL_WINDOW_MS = 60_000
export const AI_GLOBAL_MAX_PER_WINDOW = 120
export const AI_DAILY_LIMIT = 300

export const createAiUserLimiter = () => new FixedWindowCounter(AI_USER_WINDOW_MS, AI_USER_MAX_PER_WINDOW)
export const createAiGlobalLimiter = () => new FixedWindowCounter(AI_GLOBAL_WINDOW_MS, AI_GLOBAL_MAX_PER_WINDOW)
