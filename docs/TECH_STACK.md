# WordBase 技术栈总览

WordBase 是一款基于 AI 的多端英语单词学习工具，支持 Web、桌面（macOS/Windows）、移动端（iOS/Android）。本文档完整列出项目所用的技术栈。

---

## 1. 项目架构

| 类别 | 技术 | 说明 |
|------|------|------|
| **Monorepo 管理** | npm workspaces | `shared/` + `apps/*` 多包结构 |
| **包管理** | npm | 统一依赖管理 |
| **模块系统** | ES Modules | `type: module` |
| **共享代码** | `shared/` 目录 | 组件 / 类型 / 工具 / hooks / 上下文 |
| **应用入口** | `apps/web` / `apps/desktop` / `apps/mobile` | 三端独立构建 |

---

## 2. 前端核心框架

| 类别 | 技术 | 版本 |
|------|------|------|
| **UI 框架** | React | ^19.0.1 |
| **语言** | TypeScript | ~5.8.2 |
| **构建工具** | Vite | ^6.2.3 |
| **React 插件** | `@vitejs/plugin-react` | ^5.0.4 |
| **JSX 模式** | `react-jsx` | 自动导入 React |
| **TS Target** | ES2022 | - |
| **模块解析** | `bundler` | - |
| **路径别名** | `@wordbase/shared/*` → `./shared/*` | - |

---

## 3. 样式系统

| 类别 | 技术 | 版本 |
|------|------|------|
| **CSS 框架** | Tailwind CSS | ^4.1.14 |
| **Vite 集成** | `@tailwindcss/vite` | ^4.1.14 |
| **PostCSS** | `autoprefixer` | ^10.4.21 |

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
| **API Key 加密** | AES-256-GCM | Node.js `crypto` 模块 |
| **AI 功能** | 单词丰富 / 深度解释 / 义项聚类 / 故事生成 / 导师对话 / 翻译 | - |

---

## 7. 后端（Express）

| 类别 | 技术 | 版本 |
|------|------|------|
| **Web 框架** | Express | ^4.21.2 |
| **运行时** | Node.js | 22 |
| **环境变量** | dotenv | ^17.2.3 |
| **加密模块** | Node.js `crypto` | `createCipheriv` / `createDecipheriv` / `createHash` / `randomBytes` |
| **静态文件服务** | Express `express.static` | - |
| **CORS** | 自定义中间件 | - |
| **入口文件** | `supabase-server.js` | - |
| **Vercel Serverless 入口** | `api/[...all].js` | - |

### 后端 API 端点（30+）

| 分类 | 端点 |
|------|------|
| **认证** | 登录 / 注册 / 刷新 token / 登出 / 注销账号 |
| **单词本** | CRUD / 同步 / 默认单词本 |
| **单词** | CRUD / 批量导入 / 语境管理 |
| **AI 丰富** | 单词释义 / 深度解释 / 义项聚类 |
| **AI 故事** | 生成故事 / 导师对话 / 翻译 |
| **AI 配置** | Provider CRUD / 测试连接 |
| **同步** | 变更日志 / 版本同步 |
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

---

## 9. 移动端（Capacitor）

| 类别 | 技术 | 版本 |
|------|------|------|
| **移动框架** | Capacitor 7 | ^7.6.7 |
| **Capacitor CLI** | `@capacitor/cli` | ^7.0.0 |
| **iOS 平台** | `@capacitor/ios` | ^7.0.0 |
| **Android 平台** | `@capacitor/android` | ^7.0.0 |
| **剪贴板** | `@capacitor/clipboard` | ^7.0.4 |
| **本地存储** | `@capacitor/preferences` | ^7.0.4 |
| **本地通知** | `@capacitor/local-notifications` | ^7.0.6 |
| **TTS 语音** | `@capacitor-community/text-to-speech` | ^6.1.0 |
| **Android 构建** | Gradle + Java 21 | - |
| **iOS 构建** | CocoaPods + Swift | - |
| **Bundle ID** | `com.wordbase.mobile` | - |
| **配置文件** | `apps/mobile/capacitor.config.ts` | - |

---

## 10. 数据库（Supabase PostgreSQL）

| 类别 | 技术 |
|------|------|
| **数据库** | PostgreSQL（Supabase 托管） |
| **迁移管理** | 手动 SQL migration（`supabase/migrations/`） |
| **迁移数量** | 14 个（001 ~ 014） |
| **安全策略** | Row Level Security (RLS) |
| **触发器** | 默认单词本自动创建等 |

### 主要数据表

| 表名 | 用途 |
|------|------|
| `vocabulary_books` | 单词本 |
| `words` | 单词（含 SRS 字段、AI 丰富数据） |
| `word_contexts` | 单词语境 |
| `ai_provider_configs` | AI 模型配置（加密存储） |
| `sync_changelogs` | 同步变更日志 |
| `stories` | AI 生成的故事 |
| `story_generation_quota` | 故事生成每日限流 |
| `user_profiles` | 用户偏好（主题、AI 自动丰富等） |

---

## 11. 部署 & 基础设施

| 平台 | 用途 | 配置文件 |
|------|------|---------|
| **Vercel** | 前端静态 + Serverless Functions（后端） | `vercel.json`、`api/[...all].js` |
| **Cloudflare Pages** | 前端静态托管 | - |
| **Cloudflare Workers** | API 请求反向代理到 Vercel | `apps/web/public/_worker.js` |

### 部署架构

```
Cloudflare Pages（前端静态资源，全球 CDN）
  └─ /api/* → _worker.js 反代 → Vercel 后端

Vercel（完整 Node.js 运行时）
  └─ Serverless Functions → Express（supabase-server.js）
```

---

## 12. CI/CD（GitHub Actions）

| Workflow | 触发条件 | 功能 |
|----------|---------|------|
| `ci.yml` | push 到 main/dev/feature/*、PR | Typecheck + Web Build + Supabase 健康检查 |
| `deploy.yml` | push 到 main/dev | 部署到 Cloudflare Pages + Vercel |
| `desktop-release.yml` | tag `desktop-v*` | 构建 macOS .dmg + Windows .exe + Android APK + GitHub Release |

**CI 环境：**
- Node.js 22
- Ubuntu latest
- npm cache

---

## 13. 开发工具

| 类别 | 技术 | 版本 |
|------|------|------|
| **TS 执行器** | tsx | ^4.21.0 |
| **图像处理** | sharp | ^0.35.3 |
| **Node 类型** | `@types/node` | ^22.14.0 |
| **Express 类型** | `@types/express` | ^4.17.21 |

---

## 14. 代码质量

| 类别 | 技术 | 命令 |
|------|------|------|
| **类型检查** | TypeScript `tsc --noEmit` | `npm run lint` |
| **Lint（Web）** | tsc 类型检查 | `npm -w @wordbase/web run lint` |
| **全端 Lint** | tsc 类型检查 | `npm run lint:all` |

---

## 15. 技术栈全景图

```
┌───────────────────────────────────────────────────────────────────┐
│                         前端 UI 层                                 │
│  React 19 + TypeScript + Tailwind CSS 4 + Motion + Lucide Icons   │
└───────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌───────────────────────────────────────────────────────────────────┐
│                        数据 & 业务层                               │
│  Supabase JS SDK + React Context + Hooks + SRS 算法               │
└───────────────────────────────────────────────────────────────────┘
                              │
          ┌───────────────────┼───────────────────┐
          ▼                   ▼                   ▼
┌───────────────┐   ┌───────────────┐   ┌───────────────┐
│   Web 端      │   │  桌面端       │   │  移动端       │
│  Vite + SPA   │   │  Tauri 2      │   │  Capacitor 7  │
│  Vercel/CF    │   │  macOS/Win    │   │  iOS/Android  │
└───────────────┘   └───────────────┘   └───────────────┘
          │                   │                   │
          └───────────────────┼───────────────────┘
                              ▼
┌───────────────────────────────────────────────────────────────────┐
│                        后端服务层                                  │
│  Express 4 + Node.js 22 + Supabase Admin + Google GenAI SDK      │
│  AES-256-GCM API Key 加密                                         │
└───────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌───────────────────────────────────────────────────────────────────┐
│                        基础设施层                                  │
│  Vercel（Serverless Functions）+ Cloudflare Pages + Workers       │
│  GitHub Actions CI/CD                                             │
└───────────────────────────────────────────────────────────────────┘
```
