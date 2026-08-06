# WordBase 架构总览

WordBase 是一款基于 AI 的多端英语单词学习工具，采用 Turborepo Monorepo 架构，支持 Web、桌面（macOS/Windows）和移动端（iOS/Android）三端。

---

## 项目结构

```
word-base/
├── shared/                    # 跨端共享代码（组件、类型、工具、hooks、primitives、tokens）
├── packages/
│   └── api/                   # Hono API 服务（路由模块化）
│       └── src/
│           ├── index.ts       # Hono app 入口（~70 行，注册路由）
│           ├── context.ts     # 共享上下文（Supabase/认证/AI 工具）
│           ├── routes/        # 10 个路由模块（auth/ai/ai-providers/books/words/sync/settings/session/feedback/practice）
│           └── utils/         # 工具（cors/crypto/logger/rateLimit/validation/monitoring）
├── apps/
│   ├── web/                   # Vite 6 静态 SPA + Next.js API 网关（仅 Vercel Serverless）
│   │   └── src/app/api/[[...all]]/route.ts  # Next.js Route Handler 挂载 Hono
│   ├── desktop/               # Tauri 2 桌面应用（macOS / Windows）
│   └── mobile/                # Expo React Native 移动应用（iOS / Android）
├── supabase/
│   └── migrations/            # PostgreSQL 数据库迁移（21 个，001 ~ 021）
├── tests/                     # 测试（unit/ + e2e/）
├── turbo.json                 # Turborepo 任务编排配置
└── vercel.json                # Vercel 部署配置
```

详细技术栈见 [docs/TECH_STACK.md](./docs/TECH_STACK.md)。

跨端 UI 统一方案见 [docs/CROSS_PLATFORM_UI.md](./docs/CROSS_PLATFORM_UI.md)。

---

## 三端架构

### Web 端（apps/web）

- **前端**：Vite 6 + React 19（静态 SPA，CSR）
- **API 网关**：Next.js 15 App Router（仅用于 Vercel Serverless Functions 挂载 Hono）
- **构建**：`vite build`，输出到 `dist/`（静态资源由 Cloudflare CDN 分发）
- **部署**：Cloudflare Pages（前端）+ Vercel（API）
- **UI**：HTML + Tailwind CSS 4 + Primitive 组件

### 桌面端（apps/desktop）

- **框架**：Tauri 2 + Vite
- **渲染**：WebView（复用 Web primitive 实现）
- **原生能力**：Rust 后端（剪贴板、通知、存储、Shell）
- **打包**：macOS (.dmg) / Windows (.exe)
- **UI**：与 Web 端共享 `webPrimitives` 实现

### 移动端（apps/mobile）

- **框架**：Expo + React Native
- **渲染**：原生渲染
- **原生能力**：expo-speech / expo-clipboard / expo-notifications / AsyncStorage
- **构建**：`expo prebuild` 生成原生项目，然后 Gradle / Xcode 构建
- **UI**：独立的 RN primitive 实现（View / Text / Pressable + StyleSheet）

---

## 跨端 UI 统一

采用三层 Primitive 组件架构：

1. **Design Token**（`shared/tokens/`）：颜色、间距、圆角、字号纯值，三端共用
2. **Primitive 接口**（`shared/primitives/types.ts`）：9 个跨端基础组件的语义化 Props
3. **各端实现**：Web（HTML + CSS）和 RN（View + StyleSheet）独立实现

各端在应用入口注册 primitive 实现后，业务组件通过 `usePrimitives()` 获取统一的组件接口。

---

## 后端 API

- **框架**：Hono 4（轻量级 Web 框架）
- **运行时**：Node.js（本地）/ Vercel Serverless（生产）
- **模块化**：`packages/api/src/routes/` 下 10 个路由模块 + `context.ts` 共享上下文
- **数据库**：Supabase PostgreSQL（RLS 策略 + 21 个迁移）
- **认证**：Supabase Auth（JWT）
- **加密**：AES-256-GCM（Web Crypto API，加密用户 AI API Key）
- **安全**：CORS 白名单 + AI 限流（内存固定窗口 + 每日配额）+ Zod 入参校验
- **监控**：Sentry 错误上报（env 门控）+ 结构化 JSON 日志

### API 端点

| 分类 | 路径前缀 |
|------|---------|
| 认证 | `/api/v1/auth/*` |
| 单词本 | `/api/v1/books/*` |
| 单词 | `/api/v1/words/*` |
| AI 配置 | `/api/v1/ai/providers/*` |
| AI 功能 | `/api/v1/ai/{enrich,explain,story-generate,tutor-chat,practice/*}` |
| 同步 | `/api/v1/sync/*` |
| 用户设置 | `/api/v1/settings/*` |
| 会话 | `/api/v1/session/*` |
| 公告 | `/api/v1/announcements/*` |
| 反馈 | `/api/v1/feedback/*` |
| 健康检查 | `/api/v1/health` |

---

## 数据同步

- 客户端通过 Supabase JS SDK 直连 PostgreSQL（RLS 保护）
- API 服务使用 Supabase Service Role Key 进行管理操作
- 增量同步通过 `sync_changelogs` 表实现版本追踪
- 全量同步支持拉取和推送

---

## 部署架构

```
Cloudflare Pages（前端静态资源，全球 CDN）
  └─ /api/* → _worker.js 反代 → Vercel

Vercel（Node.js 运行时）
  └─ Serverless Functions → Hono API（packages/api）

GitHub Actions CI/CD（5 个 workflow）
  ├─ ci.yml：四端 typecheck + 单测 + Web 构建 + E2E 冒烟 + Supabase 健康检查
  ├─ deploy.yml：Cloudflare Pages + Vercel 部署
  ├─ desktop-release.yml：Tauri + Expo 原生打包 + GitHub Release
  ├─ mobile-ota.yml：Expo EAS Update 热更新
  └─ rollback.yml：手动回滚 Vercel/Cloudflare
```

---

## 环境变量

前端变量按平台区分前缀：Web 用 `NEXT_PUBLIC_`，Desktop 用 `VITE_`，两套前缀自动互跨 fallback。

| 变量 | 用途 |
|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 项目 URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase 匿名 Key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Service Role Key（仅服务端） |
| `AI_CONFIG_ENCRYPTION_KEY` | AI API Key 加密密钥（仅服务端） |
| `NEXT_PUBLIC_API_BASE_URL` | API 服务地址 |
| `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` | Sentry 错误监控（可选，未配则惰性） |
