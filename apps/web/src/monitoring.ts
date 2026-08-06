// Web 前端错误监控（Sentry）。env 门控：未配置 NEXT_PUBLIC_SENTRY_DSN 时全部为 no-op。
//
// 采用动态 import：仅当 DSN 存在时才加载 @sentry/browser chunk，未配置时不进入 bundle 主体。
// Sentry.init 会自动接管 window 'error' 与 'unhandledrejection' 全局捕获，
// 与 feedbackLogger 的 installGlobalErrorHandlers 并存（后者写内存缓冲，Sentry 负责远程上报）。

// Vite 在构建期按 envPrefix（NEXT_PUBLIC_/VITE_）内联该值
const dsn = import.meta.env.NEXT_PUBLIC_SENTRY_DSN

// 初始化错误监控（幂等）。未配置 DSN 时直接返回，不加载 SDK。
export function initMonitoring(): void {
  if (!dsn) return
  const rate = Number(import.meta.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE)
  import('@sentry/browser')
    .then((Sentry) => {
      Sentry.init({
        dsn,
        environment: import.meta.env.PROD ? 'production' : 'development',
        tracesSampleRate: Number.isFinite(rate) ? rate : 0
      })
    })
    .catch(() => {
      /* Sentry 加载失败不影响应用运行 */
    })
}
