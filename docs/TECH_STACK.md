# WordBase 技术栈总览

WordBase 是一款基于 AI 的多端英语单词学习工具，支持 Web、桌面（macOS/Windows）、移动端（iOS/Android）。本文档完整列出项目所用的技术栈。

---

## 1. 项目架构

| 类别 | 技术 | 说明 |
|------|------|------|
| **Monorepo 管理** | Turborepo | 构建缓存 + 任务编排，`shared/` + `packages/*` + `apps/*` |
| **包管理** | npm workspaces | 统一依赖管理 |
| **模块系统** | ES Modules | `type: module` |
| **共享代码** | `shared/` 目录 | 组件 / 类型 / 工具 / hooks / 上下文 / primitives / tokens |
| **应用入口** | `apps/web` / `apps/desktop` / `apps/mobile` | 三端独立构建 |
| **API 服务** | `packages/api` | Hono 独立边缘 API 包 |

---

## 2. 前端核心框架

| 类别 | 技术 | 版本 |
|------|------|------|
| **UI 框架** | React | ^19.0.1 |
| **语言** | TypeScript | ~5.8.2 |
| **Web 前端构建** | Vite 6 | 静态 SPA（CSR） |
| **API 网关** | Next.js 15 App Router | 仅用于 Vercel Serverless 挂载 Hono |
| **JSX 模式** | `react-jsx` | 自动导入 React |
| **TS Target** | ES2022 | - |
| **模块解析** | `bundler` | - |
| **路径别名** | `@wordbase/shared/*` → `./shared/*` | - |

---

## 3. 样式系统

| 类别 | 技术 | 版本 |
|------|------|------|
| **CSS 框架** | Tailwind CSS | ^4.1.14 |
| **跨端 UI 统一** | Primitive 组件架构 | 三端共享 token + 接口，各端独立实现 |
| **Design Token** | `shared/tokens/` | 颜色、间距、圆角、字号、字重纯值 |
| **Primitive 接口** | `shared/primitives/types.ts` | 9 个跨端基础组件（View/Text/Button/Input 等） |
| **Web 实现** | `apps/web/src/primitives/` | HTML + CSSProperties |
| **RN 实现** | `apps/mobile/src/primitives/` | View + StyleSheet |

详见 [跨端 UI 统一方案](./CROSS_PLATFORM_UI.md)。

---

## 4. UI 组件 & 动效

| 类别 | 技术 | 版本 |
|------|------|------|
| **图标库** | Lucide React | ^0.546.0 |
| **动画库** | Motion（原 Framer Motion） | ^12.23.24 |

---

## 5. 状态管理 & 数据层

| 类别 | 技术 | 版本 |
|------|------|------|
| **后端 BaaS** | Supabase | - |
| **Supabase JS SDK** | `@supabase/supabase-js` | ^2.48.1 |
| **状态管理** | React Context + Hooks | `useState` / `useEffect` / `useRef` / `useSyncExternalStore` |
| **认证上下文** | `SupabaseContext` | 封装登录、注册、会话管理 |

---

## 6. AI / LLM

| 类别 | 技术 | 版本 |
|------|------|------|
| **Google Gemini SDK** | `@google/genai` | ^2.4.0 |
| **支持的 AI Provider** | OpenAI / Anthropic / Gemini / OpenAI-Compatible | - |
| **API Key 加密** | AES-256-GCM | Web Crypto API（跨端兼容） |
| **AI 功能** | 单词丰富 / 深度解释 / 义项聚类 / 故事生成 / 导师对话 / 翻译 | - |

---

## 7. 后端 API（Hono）

| 类别 | 技术 | 版本 |
|------|------|------|
| **Web 框架** | Hono | ^4.6.5 |
| **Node 适配器** | `@hono/node-server` | ^1.12.0 |
| **运行时** | Node.js 22 / Cloudflare Workers / Vercel Serverless | - |
| **环境变量** | dotenv | ^17.2.3 |
| **加密模块** | Web Crypto API | `crypto.subtle`（AES-256-GCM） |
| **CORS** | Hono 中间件 | - |
| **入口文件** | `packages/api/src/index.ts` | Hono app（~70 行，注册路由） |
| **路由模块** | `packages/api/src/routes/` | 10 个模块（auth/ai/ai-providers/books/words/sync/settings/session/feedback/practice） |
| **共享上下文** | `packages/api/src/context.ts` | Supabase 客户端/认证/AI 限流/工具函数 |
| **Server 入口** | `packages/api/src/server.ts` | `@hono/node-server` |
| **Vercel 入口** | `apps/web/src/app/api/[[...all]]/route.ts` | Next.js Route Handler 挂载 Hono |
| **包名** | `@wordbase/api` | - |

### 后端 API 端点

| 分类 | 端点 |
|------|------|
| **认证** | 登录 / 注册 / 刷新 token / 登出 / 注销账号 |
| **单词本** | CRUD / 同步 |
| **单词** | CRUD / 批量导入 / 批量删除 |
| **AI 配置** | Provider CRUD / 测试连接 |
| **AI 功能** | enrich / explain / sense-cluster / translate / story-generate / tutor-chat / practice generate+evaluate |
| **同步** | 版本状态 / 增量同步 / 全量同步 |
| **用户设置** | 设置读写同步 |
| **公告** | 公告列表 / 已读标记 |
| **反馈** | 用户反馈提交 |
| **健康检查** | `/api/v1/health` |

---

## 8. 桌面端（Tauri）

| 类别 | 技术 | 版本 |
|------|------|------|
| **桌面框架** | Tauri 2 | - |
| **Tauri API** | `@tauri-apps/api` | ^2.11.1 |
| **Tauri CLI** | `@tauri-apps/cli` | ^2.11.4 |
| **剪贴板插件** | `@tauri-apps/plugin-clipboard-manager` | ^2.3.2 |
| **通知插件** | `@tauri-apps/plugin-notification` | ^2.3.3 |
| **Shell 插件** | `@tauri-apps/plugin-shell` | ^2.3.5 |
| **存储插件** | `@tauri-apps/plugin-store` | ^2.4.3 |
| **系统托盘** | Tauri Tray Icon（template mode） | - |
| **后端语言** | Rust | - |
| **打包目标** | macOS (.dmg) / Windows (.exe) | - |
| **应用分类** | Education | - |
| **Bundle ID** | `com.wordbase.desktop` | - |
| **配置文件** | `apps/desktop/src-tauri/tauri.conf.json` | - |
| **Primitive 注册** | 复用 `webPrimitives` | HTML + CSSProperties |

---

## 9. 移动端（Expo React Native）

| 类别 | 技术 | 版本 |
|------|------|------|
| **移动框架** | Expo | ^52.0.0 |
| **UI 框架** | React Native | ^0.76.0 |
| **剪贴板** | `expo-clipboard` | ^7.0.0 |
| **TTS 语音** | `expo-speech` | ^7.0.0 |
| **本地通知** | `expo-notifications` | ^0.29.0 |
| **状态栏** | `expo-status-bar` | ^2.0.0 |
| **本地存储** | `@react-native-async-storage/async-storage` | ^2.0.0 |
| **安全区域** | `react-native-safe-area-context` | ^4.12.0 |
| **Bundle ID** | `com.wordbase.mobile` | - |
| **配置文件** | `apps/mobile/app.json` | - |
| **Primitive 实现** | `apps/mobile/src/primitives/` | View + StyleSheet |

---

## 10. 数据库（Supabase PostgreSQL）

| 类别 | 技术 |
|------|------|
| **数据库** | PostgreSQL（Supabase 托管） |
| **迁移管理** | 手动 SQL migration（`supabase/migrations/`） |
| **迁移数量** | 21 个（001 ~ 021） |
| **安全策略** | Row Level Security (RLS) |
| **触发器** | 默认单词本自动创建等 |

### 主要数据表

| 表名 | 用途 |
|------|------|
| `vocabulary_books` | 单词本 |
| `words` | 单词（含 SRS 字段、AI 丰富数据、义项分组） |
| `word_contexts` | 单词语境 |
| `ai_provider_configs` | AI 模型配置（加密存储） |
| `sync_changelogs` | 同步变更日志 |
| `stories` | AI 生成的故事 |
| `story_generation_quota` | 故事生成每日限流 |
| `user_profiles` | 用户偏好（主题、AI 自动丰富等） |
| `announcements` | 公告系统 |
| `feedback` | 用户反馈 |
| `pairing_codes` | 设备配对码 |
| `practice_generation_quota` | 练习生成每日限流 |
| `ai_call_quota` | AI 调用每日配额 |
| `user_settings` | 用户设置（跨端同步） |

---

## 11. 部署 & 基础设施

| 平台 | 用途 | 配置文件 |
|------|------|---------|
| **Cloudflare Pages** | 前端静态托管（全球 CDN） | `apps/web/public/_worker.js` |
| **Vercel** | Serverless Functions（Hono API） | `vercel.json`、`apps/web/src/app/api/[[...all]]/route.ts` |
| **Cloudflare Workers** | API 请求反向代理到 Vercel | `apps/web/public/_worker.js` |

### 部署架构

```
Cloudflare Pages（前端静态资源，全球 CDN）
  └─ /api/* → _worker.js 反代 → Vercel 后端

Vercel（Node.js 运行时）
  └─ Serverless Functions → Hono API（packages/api）
```

---

## 12. CI/CD（GitHub Actions）

| Workflow | 触发条件 | 功能 |
|----------|---------|------|
| `ci.yml` | push 到 main/dev/feature/*、PR | 四端 Typecheck + 单测 + Web Build + E2E 冒烟 + Supabase 健康检查 |
| `deploy.yml` | push 到 main/dev | 部署到 Cloudflare Pages + Vercel |
| `desktop-release.yml` | push `v*` tag / push main / push dev | macOS .dmg + Windows .exe + Android APK + iOS Simulator + GitHub Release |
| `mobile-ota.yml` | push 到 main/dev | Expo EAS Update 热更新 |
| `rollback.yml` | 手动触发 | 回滚 Vercel/Cloudflare |

**CI 环境：**
- Node.js 22
- Ubuntu latest
- npm cache

---

## 13. 开发工具

| 类别 | 技术 | 版本 |
|------|------|------|
| **Monorepo 工具** | Turborepo | ^2.10.4 |
| **TS 执行器** | tsx | ^4.21.0 |
| **图像处理** | sharp | ^0.35.3 |
| **Node 类型** | `@types/node` | ^22.14.0 |

---

## 14. 代码质量 & 测试

| 类别 | 技术 | 命令 |
|------|------|------|
| **类型检查** | TypeScript `tsc --noEmit`（四端） | `npm run lint:all` |
| **单元测试** | Vitest（109 用例，9 个测试文件） | `npx vitest run` |
| **E2E 测试** | Playwright（Chromium 冒烟 + 认证流程） | `npm run test:e2e` |
| **构建编排** | Turborepo | `npm run build:all` |
| **错误监控** | Sentry（env 门控，未配 DSN 时惰性） | 配 `SENTRY_DSN` 即生效 |
| **API 校验** | Zod schema（auth/AI/books/words 全覆盖） | `packages/api/src/utils/validation.ts` |
| **日志** | 前端结构化 logger + 环形缓冲；后端 JSON 日志 | `shared/lib/logger.ts` / `api/utils/logger.ts` |

---

## 15. 技术栈全景图

```
┌───────────────────────────────────────────────────────────────────┐
│                         跨端 UI 层                                 │
│  Design Token + Primitive 组件架构（View/Text/Button/...）         │
│  三端统一接口，各端独立实现                                         │
└───────────────────────────────────────────────────────────────────┘
                              │
          ┌───────────────────┼───────────────────┐
          ▼                   ▼                   ▼
┌───────────────┐   ┌───────────────┐   ┌───────────────┐
│   Web 端      │   │  桌面端       │   │  移动端       │
│  Vite 6 SPA   │   │  Tauri 2      │   │  Expo RN 52   │
│  CSR/静态     │   │  macOS/Win    │   │  iOS/Android  │
│  Cloudflare   │   │  WebView      │   │  原生渲染     │
└───────────────┘   └───────────────┘   └───────────────┘
          │                   │                   │
          └───────────────────┼───────────────────┘
                              ▼
┌───────────────────────────────────────────────────────────────────┐
│                        后端 API 层                                 │
│  Hono 4 + @hono/node-server + Supabase Admin + Google GenAI SDK  │
│  AES-256-GCM API Key 加密（Web Crypto API）                       │
│  可部署到 Vercel Serverless / Cloudflare Workers                   │
└───────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌───────────────────────────────────────────────────────────────────┐
│                        基础设施层                                  │
│  Turborepo + Vercel + Cloudflare Pages/Workers                    │
│  GitHub Actions CI/CD                                              │
└───────────────────────────────────────────────────────────────────┘
```
