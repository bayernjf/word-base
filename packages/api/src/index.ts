import { Hono } from 'hono'
import { logger, errorContext } from './utils/logger'
import { initMonitoring, captureException } from './utils/monitoring'
import { parseAllowedOrigins, isOriginAllowed } from './utils/cors'
import {
  registerAuthRoutes,
  registerAiProviderRoutes,
  registerBookRoutes,
  registerWordRoutes,
  registerSyncRoutes,
  registerSettingsRoutes,
  registerAiRoutes,
  registerSessionRoutes,
  registerFeedbackRoutes,
  registerPracticeRoutes,
} from './routes'

const app = new Hono()

// 错误监控初始化（env 门控：无 SENTRY_DSN 时为 no-op）。
initMonitoring()

// 兜底错误处理
app.onError((err, c) => {
  logger.error('unhandled_error', { path: c.req.path, method: c.req.method, ...errorContext(err) })
  captureException(err, { path: c.req.path, method: c.req.method })
  return c.json({ error: 'internal_server_error' }, 500)
})

// CORS 白名单
const allowedOrigins = parseAllowedOrigins(process.env.ALLOWED_ORIGINS)

app.use(async (c, next) => {
  const origin = c.req.header('Origin');
  if (origin && isOriginAllowed(origin, allowedOrigins)) {
    c.res.headers.set('Access-Control-Allow-Origin', origin);
    c.res.headers.set('Vary', 'Origin');
    c.res.headers.set('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
    c.res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  } else if (origin) {
    logger.warn('cors_origin_rejected', { origin, path: c.req.path });
  }

  if (c.req.method === 'OPTIONS') {
    return c.json({ ok: true }, 200);
  }
  
  await next();
});

// Health check
app.get('/api/v1/health', (c) => {
  return c.json({ ok: true })
})

// Register all route modules
registerAuthRoutes(app)
registerAiProviderRoutes(app)
registerBookRoutes(app)
registerWordRoutes(app)
registerSyncRoutes(app)
registerSettingsRoutes(app)
registerAiRoutes(app)
registerSessionRoutes(app)
registerFeedbackRoutes(app)
registerPracticeRoutes(app)

export default app
