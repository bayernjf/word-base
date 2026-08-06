// 服务端结构化日志：单行 JSON 输出，便于 Vercel / 云端日志平台按字段检索。
// 前端已有 shared/lib 的环形缓冲日志体系；API 侧独立维护这份极简实现，
// 避免 api 包引入 @wordbase/shared 依赖。

type LogLevel = 'info' | 'warn' | 'error'

const emit = (level: LogLevel, message: string, context?: Record<string, unknown>) => {
  const entry = {
    ts: new Date().toISOString(),
    level,
    msg: message,
    ...(context && Object.keys(context).length > 0 ? { ctx: context } : {})
  }
  const line = JSON.stringify(entry)
  if (level === 'error') console.error(line)
  else if (level === 'warn') console.warn(line)
  else console.log(line)
}

export const logger = {
  info: (message: string, context?: Record<string, unknown>) => emit('info', message, context),
  warn: (message: string, context?: Record<string, unknown>) => emit('warn', message, context),
  error: (message: string, context?: Record<string, unknown>) => emit('error', message, context)
}

// 从 unknown 错误提取可序列化的上下文（message + 截断的 stack）
export const errorContext = (err: unknown): Record<string, unknown> => ({
  error: err instanceof Error ? err.message : String(err),
  ...(err instanceof Error && err.stack
    ? { stack: err.stack.split('\n').slice(0, 5).join('\n') }
    : {})
})
