# WordBase — Handoff Document

> 项目交接文档 · 生成日期：2026-07-30

---

## 1. 项目概述

**WordBase** 是一款 AI 驱动的英语单词学习与复习应用，支持 **Web**、**Desktop（macOS/Windows）**、**Mobile（iOS/Android）** 三端。

核心能力：
- AI 单词丰富（释义、例句、词根词缀、助记等）
- SRS 间隔复习算法（类 Anki/FSRS）
- 多模态练习：听力、口语、阅读、写作
- AI 故事生成（基于单词上下文）
- 多端数据同步（Supabase PostgreSQL + 增量 changelog）
- 多 AI Provider 支持（OpenAI / Anthropic / Gemini / OpenAI-Compatible）
- 国际化（中/英双语）

---

## 2. 技术栈速览

| 层 | 技术 |
|---|---|
| **Monorepo** | Turborepo + npm workspaces（**禁用 pnpm/yarn**） |
| **语言** | TypeScript 5.8（全栈）+ Rust（Tauri 壳） |
| **Web 前端** | Vite 6 + React 19 + Tailwind CSS 4（静态 SPA） |
| **Web API 网关** | Next.js 15 App Router（仅 Vercel Serverless Functions） |
| **Desktop** | Tauri 2 + Vite + React 19（Rust 后端） |
| **Mobile** | Expo SDK 52 + React Native 0.76 + React **18** |
| **后端 API** | Hono 4 + @hono/node-server |
| **数据库/Auth** | Supabase（PostgreSQL + RLS + Auth） |
| **AI SDK** | @google/genai、Web Crypto API（AES-256-GCM 加密） |
| **部署** | Cloudflare Pages（CDN 静态前端）+ Vercel（Serverless API） |
| **CI/CD** | GitHub Actions（5 个 workflow） |
| **Node** | 22（见 `.node-version`） |

---

## 3. Monorepo 结构

```
word-base/
├── shared/                      # @wordbase/shared — 跨端共享源码（无 build，TS 直引）
│   ├── components/              # React 组件（views/、布局、公告等）
│   │   └── views/               # 按场景分：auth/dashboard/practice/settings/study/vocabulary
│   ├── context/                 # SupabaseContext 等 React Context
│   ├── hooks/                   # useVocabulary、useStories 等
│   ├── i18n/                    # en.ts / zh.ts + createTranslator
│   ├── lib/                     # 纯逻辑：SRS、API 客户端、AI、Supabase、日志、分析、公告、反馈
│   ├── primitives/              # 跨端基础组件接口（9 个）+ 各端注册
│   ├── tokens/                  # Design Token（颜色/间距/圆角/字号）
│   ├── platform.ts              # 平台检测抽象（PlatformAPI）
│   ├── types.ts                 # 全局类型定义
│   └── index.ts                 # 统一对外导出
├── packages/
│   └── api/                     # @wordbase/api — Hono 后端（端口 3001）
│       └── src/
│           ├── index.ts         # Hono app 定义（路由）
│           └── server.ts        # @hono/node-server 启动入口
├── apps/
│   ├── web/                     # @wordbase/web — Vite 静态前端 + Next.js API 网关
│   │   ├── src/app/api/[[...all]]/route.ts  # Next.js 挂载 Hono API
│   │   └── public/_worker.js    # Cloudflare Workers API 反代
│   ├── desktop/                 # @wordbase/desktop — Vite + Tauri 2
│   │   └── src-tauri/           # Rust 工程（已入版本控制）
│   └── mobile/                  # @wordbase/mobile — Expo + RN
│       └── app.json             # Expo 配置（bundle ID/权限/插件）
├── supabase/migrations/         # 19 个 SQL 迁移脚本（001 ~ 019）
├── scripts/                     # 构建/版本/图标脚本
└── .github/workflows/           # 5 个 CI/CD workflow
```

---

## 4. 关键架构决策

### 4.1 前端与 API 分离部署

- **前端**（Vite SPA）→ Cloudflare Pages CDN 全球分发
- **API**（Hono）→ Vercel Serverless Functions（需要 Node.js 运行时）
- Cloudflare `_worker.js` 拦截 `/api/*` 反代到 Vercel
- 原因：Cloudflare Pages 不支持 Node.js server

### 4.2 跨端 UI 三层 Primitive 架构

1. **Design Token**（`shared/tokens/`）→ 纯值
2. **Primitive 接口**（`shared/primitives/types.ts`）→ 9 个组件的语义化 Props
3. **各端实现** → Web（HTML+CSS）/ RN（View+StyleSheet）

各端在入口注册 primitive 实现后，业务组件通过 `usePrimitives()` 获取统一接口。

### 4.3 shared 无 build

`shared/` 以 TS 源码被各端 bundler 直接转译，无 dist 产物。修改 shared 后各端 HMR 自动生效。

### 4.4 React 版本差异

- Web/Desktop → React **19**
- Mobile → React **18**（RN 0.76 限制）
- 写 shared 组件时避免仅 React 19 的 API（如 `useActionState`）

---

## 5. 常用命令

```bash
# 安装依赖
npm install

# 本地开发（多终端）
npm run dev              # Web 前端（Vite 端口 3000）
npm run dev:api          # 后端 Hono server（端口 3001）
npm run dev:desktop      # Tauri 桌面壳 + Vite HMR（macOS/Windows 本机）
npm run dev:mobile       # Expo dev server（需真机/模拟器）

# 构建
npm run build            # 仅 Web
npm run build:all        # 所有包
npm -w @wordbase/api run build          # 后端
npm -w @wordbase/desktop run tauri:build # 桌面 DMG/EXE

# 验证（提交前必跑）
npx tsc --noEmit -p packages/api/tsconfig.json
npx tsc --noEmit -p apps/web/tsconfig.json
npx tsc --noEmit -p apps/desktop/tsconfig.json
npx tsc --noEmit -p apps/mobile/tsconfig.json
npx vitest run           # 单测

# 清理
npm run clean
rm -rf apps/mobile/android apps/mobile/ios  # 清 Expo prebuild 产物
```

---

## 6. 环境变量

需要三份 `.env` 文件（均被 gitignore，仅 `.env.example` 入库）：

| 文件 | 用途 |
|---|---|
| 根 `.env` | 全局 + Mobile |
| `apps/web/.env.local` | Web 前端（`NEXT_PUBLIC_*` 前缀） |
| `packages/api/.env` | 后端 API（`SUPABASE_SERVICE_ROLE_KEY` 等） |

关键变量：
- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase 连接
- `SUPABASE_SERVICE_ROLE_KEY` — **仅后端，绝不能泄露到前端**
- `AI_CONFIG_ENCRYPTION_KEY` — 用户 AI API Key 加密密钥（AES-256-GCM）
- `NEXT_PUBLIC_API_BASE_URL` — API 地址（各端有独立 fallback）

---

## 7. 数据库

- **引擎**：PostgreSQL（Supabase 托管）
- **迁移**：`supabase/migrations/` 下 19 个增量 SQL 文件
- **安全**：Row Level Security (RLS)
- **核心表**：

| 表 | 用途 |
|---|---|
| `user_profiles` | 用户偏好（主题、语言、AI 自动丰富等） |
| `vocabulary_books` | 单词本 |
| `words` | 单词（含 SRS 字段、AI 丰富数据、义项分组） |
| `word_contexts` | 单词语境 |
| `ai_provider_configs` | AI 模型配置（加密存储） |
| `sync_changelogs` | 同步变更日志 |
| `stories` | AI 生成故事 |
| `announcements` | 公告系统 |
| `feedback` | 用户反馈 |
| `practice_quota` | 练习配额 |

---

## 8. API 端点

| 分类 | 路径前缀 |
|---|---|
| 认证 | `/api/v1/auth/*` |
| 单词本 | `/api/v1/books/*` |
| 单词 | `/api/v1/words/*` |
| AI 配置 | `/api/v1/ai/providers/*` |
| 同步 | `/api/v1/sync/*` |
| 公告 | `/api/v1/announcements/*` |
| 反馈 | `/api/v1/feedback/*` |
| 健康检查 | `/api/v1/health` |

---

## 9. CI/CD Workflow

| Workflow | 触发 | 功能 |
|---|---|---|
| `ci.yml` | push main/dev/feature/*、PR | Typecheck + Web Build + Supabase 健康检查 |
| `deploy.yml` | push main/dev | Cloudflare Pages + Vercel 部署 |
| `desktop-release.yml` | push `v*` tag / push main / push dev | 桌面+移动端打包，GitHub Release |
| `mobile-ota.yml` | push main/dev | Expo EAS Update 热更新 |
| `rollback.yml` | 手动触发 | 回滚 Vercel/Cloudflare |

**部署环境隔离**：
- `main` → Cloudflare production (`word-base.pages.dev`) + Vercel `--prod`
- `dev` → Cloudflare preview (`dev.word-base.pages.dev`) + Vercel preview

---

## 10. Git 工作流

| 分支 | 用途 |
|---|---|
| `main` | 生产，手动 PR review 合并 |
| `dev` | 开发集成，AI 可自动合并 |
| `feature/<描述>` | 功能开发 |
| `fix/<描述>` | Bug 修复 |

**Commit 格式**：`<type>(<scope>): <一句话总结>`
- type: `feat` / `fix` / `refactor` / `chore` / `docs` / `test` / `perf` / `style`
- scope: `web` / `desktop` / `mobile` / `api` / `shared` / `ci`

---

## 11. 当前工作状态

**当前分支**：`feature/20260604`

**最近完成（已提交）**：**练习中心（Practice Center）全面 AI 化改造**

已通过全部验证：四端 tsc + vitest（7/7）+ web build。

### 改动概述

将 4 个练习模块（阅读/听力/写作/口语）从**静态硬编码 mock 数据**改为**基于用户生词本的 AI 动态生成 + 评估**。

### 变更明细

#### 1. 新增 API 端点（`packages/api/src/index.ts`，+289 行）

- **`POST /api/v1/ai/practice/generate`** — 统一内容生成入口
  - 支持 4 种类型：`reading`（AI 生成文章+高亮词汇+理解题）、`listening`（AI 生成听力短文+时间轴字幕+理解题）、`writing`（AI 生成写作提示+建议词汇）、`speaking`（AI 生成跟读场景+发音提示）
  - 复用用户已配置的 AI Provider（`callAiProviderRaw` + JSON mode）
  - 基于用户生词本中的词汇生成内容（最多 8 个词）
  - 支持难度选择（B1/B2/C1）
  - 每日限流 20 次（`practice_generation_quota` 表）
- **`POST /api/v1/ai/practice/evaluate`** — 写作批改 + 口语评分
  - `writing`：AI 评分（0-100）+ CEFR 等级 + 语法/词汇/风格反馈
  - `speaking`：AI 对比原文与 ASR 转写，给出词级发音问题反馈
- 辅助函数：`checkPracticeQuota()` / `incrementPracticeQuota()`

#### 2. 新增数据库迁移（`supabase/migrations/019_practice_quota.sql`）

- 新建 `practice_generation_quota` 表（与 `story_generation_quota` 同构）
- 字段：`user_id` + `quota_date` + `generated_count`
- 启用 RLS，仅允许用户读写自己的配额记录

#### 3. 新增共享工具（`shared/lib/practice.ts`，192 行）

- 完整的类型定义：`ReadingContent`、`ListeningContent`、`WritingPrompt`、`WritingFeedback`、`SpeakingScenario`、`SpeakingEvaluation` 等
- API 客户端：`requestPracticeGenerate()` / `requestPracticeEvaluate()`
- 内容缓存：`fetchPracticeContent()` — 5 分钟 TTL 内存缓存，相同参数不重复请求
- 缓存管理：`clearPracticeCache()`

#### 4. 练习主界面重构（`PracticeMainView.tsx`）

- 新增 `hasActiveModel` prop，用于判断 AI 功能是否可用
- 4 个练习卡片（阅读/写作/听力/口语）增加 `isReady` 状态：需要已配置 AI 模型 + 有生词
- 未就绪时显示 "Needs AI Model / 需配置 AI" 徽章
- 非复习类卡片不再显示假进度条，改为显示 "AI-powered / AI 驱动" 标识
- 间隔复习卡片保持原有进度条逻辑

#### 5. 四个练习视图重构

| 视图 | 改动 |
|---|---|
| `ReadingPracticeView` | 移除硬编码文章，改为调用 `fetchPracticeContent` 动态生成；增加 loading/error/retry 状态；词汇高亮和释义从 AI 返回数据中获取 |
| `ListeningPracticeView` | 移除 mock quizzes 依赖，改为 AI 生成听力内容+理解题；增加 TTS 播放+时间轴字幕联动 |
| `WritingPracticeView` | 移除硬编码写作题目，改为 AI 生成写作提示；提交后调用 evaluate API 获取 AI 批改反馈 |
| `SpeakingPracticeView` | 移除硬编码场景，改为 AI 生成跟读场景；增加 Web Speech API（ASR）录音转写 + evaluate API 发音评估 |

#### 6. 路由层适配（`AppSupabase.tsx`）

- 所有练习视图统一传入 `words`（用户生词列表）和 `accessToken`（认证 token）
- `PracticeMainView` 新增 `hasActiveModel` prop
- 移除 `listeningQuizzes` mock 数据导入

#### 7. 清理 mock 数据（`mockData.ts` / `index.ts`）

- 删除 `listeningQuizzes` 硬编码听力理解题（25 行）
- 移除 `shared/index.ts` 中失效的 `listeningQuizzes` re-export
- 移除 `PracticeQuiz` 类型导入（类型本身保留，仍被 `practice.ts` 使用）

#### 8. i18n 文案更新（`en.ts` / `zh.ts`）

- 四个练习模块各新增：`loading`、`noWords`、`authRequired`、`noModel`、`quotaExceeded`、`loadFailed`、`retry` 等状态文案
- 阅读新增 `newArticle`、写作新增 `minWords`/`newPrompt`、听力新增 `newContent`、口语新增 `newScenario`/`asrUnavailable`/`transcription`/`evaluate`/`issues`/`expected`/`actual`
- 移除原有硬编码的假反馈文案（如写作 fb1/fb2/fb3 详情）

#### 9. 就绪度文档同步更新

- `APP_STORE_READINESS.md`：练习中心 20%→75%，功能完整性 70%→85%，勾选 P0「补全练习中心」
- `PRODUCTION_READINESS.md`：模块七重写为 AI 化现状；修正过时结论（Express→Hono、vitest/CI 已就绪、CORS 已非全开、已上 Cloudflare+Vercel）

### 最近已提交的 commit（新→旧）

```
docs: refresh readiness assessments and update handoff document
chore(shared): remove unused listeningQuizzes mock data
feat(shared): rework practice views to AI-generated content
feat(api): add AI practice content generation and evaluation endpoints
75de467 style(web): add prefers-reduced-motion media query
256eeab feat(web): enlarge Hero title and simplify subtitle
a95f0ab feat(web): add scroll reveal animations, social proof and FAQ sections
a6ff41e feat(web): add SEO meta tags, robots.txt and sitemap.xml
c723c50 fix(web): add mobile navigation drawer and scroll-responsive navbar
c2201e5 fix(web): import trackEvent in useDownloadUrls to prevent crash
```

---

## 12. 关键文件索引

| 文件 | 用途 |
|---|---|
| `shared/lib/apiBase.ts` | 跨端 API URL 自动解析（按平台选环境变量） |
| `shared/platform.ts` | 平台检测抽象（PlatformAPI） |
| `shared/lib/srs.ts` | SRS 间隔复习算法 |
| `shared/lib/supabase.ts` | Supabase 客户端封装 |
| `shared/lib/aiEnrich.ts` | AI 单词丰富逻辑 |
| `shared/lib/logger.ts` | 结构化日志 + 环形缓冲区 |
| `shared/lib/analytics.ts` | GA4 + Clarity 分析 |
| `shared/lib/feedback*.ts` | 反馈采集 + 诊断日志 |
| `shared/lib/announcement/` | 公告系统 |
| `shared/lib/batchAiStore.ts` | 批量 AI 任务队列 |
| `apps/web/src/app/api/[[...all]]/route.ts` | Next.js Route Handler 挂载 Hono API |
| `apps/web/vercel.json` | Vercel 框架声明 |
| `apps/desktop/src-tauri/tauri.conf.json` | Tauri 配置 |
| `apps/desktop/native-templates/` | CI 构建时覆盖的 Tauri 配置模板 |
| `apps/mobile/app.json` | Expo 配置 |
| `apps/mobile/metro.config.js` | Metro watchFolders（monorepo HMR） |
| `scripts/set-version.cjs` | CI 版本注入（snapshot → `0.0.0-dev`） |

---

## 13. 注意事项 / 坑

1. **不要用 pnpm/yarn**，只用 npm workspaces
2. **不要手动改 `apps/mobile/android/` 或 `ios/`**，它们由 `expo prebuild` 生成
3. **shared 无 build**，直接以 TS 源码被各端 bundler 转译
4. **React 版本不一致**：shared 组件避免 React 19-only API
5. **`SUPABASE_SERVICE_ROLE_KEY` 和 `AI_CONFIG_ENCRYPTION_KEY` 绝不能泄露到前端**
6. **Tauri `src-tauri/` 已入版本控制**，CI 会从 `native-templates/` 覆盖配置 + 注入版本号
7. **Snapshot 版本固定 `0.0.0-dev`**，artifact 文件名固定（覆盖旧文件）
8. **图标/资源必须是真实图片**，不能用文本占位符
9. **新增环境变量必须同步更新 `.env.example`**
10. **禁止 AI 自动解决 Git 冲突**，需报告后由开发者处理
11. **前端环境变量前缀不同**：Web 用 `NEXT_PUBLIC_`，Desktop 用 `VITE_`，两套前缀会自动互跨 fallback
12. **Android 模拟器用 `10.0.2.2`** 指向宿主机 localhost

---

## 14. 快速上手

```bash
# 1. 克隆 & 安装
git clone <repo-url> && cd word-base
npm install

# 2. 配置环境变量
cp .env.example .env
cp .env.example apps/web/.env.local
cp .env.example packages/api/.env
# 编辑上述文件填入真实 Supabase 密钥

# 3. 启动开发（至少两个终端）
# 终端 1：后端
npm run dev:api
# 终端 2：Web 前端
npm run dev

# 4. 访问
# Web: http://localhost:3000
# API: http://localhost:3001
```

---

## 15. 待办 / 下一步

- [ ] 新增的 `019_practice_quota.sql` 迁移需要在 Supabase 数据库执行
- [ ] 练习 API 端点（generate/evaluate）需要与前端联调验证
- [ ] 口语练习依赖 Web Speech API（仅 Chrome/Edge 支持），需确认移动端降级方案
- [ ] 移动端练习功能需要真机测试（React 18 兼容性 + ASR 可用性）
- [ ] 练习内容缓存目前是纯内存 Map，刷新页面即失效，可考虑后续优化
- [ ] 正式发版阻塞项（见 `.trae/TODO.md`）：Tauri 签名密钥 Secrets、Expo OTA 配置（`EXPO_TOKEN`）
- [ ] 桌面端 updater P0 修复（`apply()` 未调 `install()` 等，见 `.trae/TODO.md`）

---

*本文档基于仓库当前状态自动生成，反映 2026-07-30 的项目全貌。*
