# AGENTS.md — WordBase 项目指令

本文档供 AI coding agents（Trae / Claude Code / Cursor / Codex / Copilot 等）在本项目工作时自动读取。
请严格遵循以下约定。

---

## 项目概览

WordBase 是一款 AI 驱动的英语单词学习/复习应用，包含 Web、Desktop、Mobile 三端 + 独立 API 后端。

- **包管理器**：npm workspaces（**不要用 pnpm/yarn**）
- **构建编排**：Turbo
- **测试**：Vitest（根目录统一执行）
- **语言**：TypeScript（全栈）+ Rust（Tauri 壳）

### Monorepo 结构

```
word-base/
├── shared/                  # @wordbase/shared — 跨端共享源码（无构建，TS 直引）
│   ├── components/          # React 组件（views/、布局等）
│   ├── context/             # React Context（SupabaseContext 等）
│   ├── hooks/               # 自定义 hooks
│   ├── i18n/                # 国际化（en/zh）
│   ├── lib/                 # 纯逻辑：SRS算法、API客户端、AI、Supabase
│   ├── primitives/          # 基础类型
│   └── tokens/              # 设计 token
├── packages/
│   └── api/                 # @wordbase/api — Hono 后端（端口 3001）
├── apps/
│   ├── web/                 # @wordbase/web — Next.js 15 + React 19（端口 3000）
│   ├── desktop/             # @wordbase/desktop — Vite + React 19 + Tauri 2（3002）
│   └── mobile/              # @wordbase/mobile — Expo SDK 52 + RN 0.76 + React 18
├── scripts/                 # 构建/版本/图标脚本
└── package.json             # 根 workspace 配置
```

### 平台注意事项

- **React 版本不一致**：web/desktop 用 React 19，mobile 因 RN 0.76 限制用 React 18。写 shared 组件时避免使用仅 React 19 的 API（如 `useActionState`），或用条件判断。
- **shared 无 build**：直接以 TS 源码被各端 bundler 转译，无 dist 产物。
- **API base 自动解析**：`shared/lib/apiBase.ts` 会按平台自动选择 `NEXT_PUBLIC_*` / `VITE_*` 环境变量。

---

## 常用命令

所有命令在仓库根目录执行，除非特别说明。

### 本地开发

```bash
# 复制环境变量（首次）
cp .env.example .env
cp .env.example apps/web/.env.local
cp .env.example packages/api/.env

npm install                  # 根目录安装所有 workspace 依赖

# 全栈开发需要多终端：
npm run dev:api              # 后端 Hono server（端口 3001）
npm run dev                  # Web 前端（端口 3000）— 默认 dev 只起 web
npm run dev:desktop          # Tauri 桌面壳 + Vite HMR（需在 macOS/Windows 本机执行）
npm run dev:mobile           # Expo dev server（需真机/模拟器）
npm run dev:desktop:web      # 桌面端仅浏览器预览（Vite 3002，不起 Tauri 窗）
```

### 构建

```bash
npm run build                # 仅构建 web
npm run build:all            # 构建所有包
npm -w @wordbase/desktop run tauri:build   # 桌面端打包 DMG/EXE
npm -w @wordbase/api run build              # 构建后端 dist/
```

### 验证（提交前必须通过）

```bash
npx tsc --noEmit -p packages/api/tsconfig.json
npx tsc --noEmit -p apps/web/tsconfig.json
npx tsc --noEmit -p apps/desktop/tsconfig.json
npx tsc --noEmit -p apps/mobile/tsconfig.json
npx vitest run               # 单测（shared/lib/*.test.ts）
# 视改动端跑对应 build：
npm -w @wordbase/web run build
npm -w @wordbase/desktop run build
npm -w @wordbase/api run build
# 移动端：
cd apps/mobile && npx expo prebuild --platform android --clean --no-install
```

### 清理

```bash
npm run clean                # turbo 调用各包 clean
rm -rf apps/mobile/android apps/mobile/ios   # 清 Expo prebuild 产物
```

---

## 环境变量

- **所有 `.env*` 文件被 .gitignore**，仅 `.env.example` 入库
- 需要三份：根 `.env`、`apps/web/.env.local`、`packages/api/.env`（api 包使用 `--env-file=.env` 相对自身目录）
- `SUPABASE_SERVICE_ROLE_KEY` 和 `AI_CONFIG_ENCRYPTION_KEY` **绝对不能泄露到前端代码**
- 前端变量前缀：web 用 `NEXT_PUBLIC_`，desktop 用 `VITE_`，两套前缀会自动互跨 fallback
- mobile 环境变量通过 globalThis 注入或 Expo extra 配置

---

## 代码规范

### Commit Message 格式

```
<type>(<scope>): <一句话总结>

[可选 body：列出关键改动点]
```

**type**：`feat` / `fix` / `refactor` / `chore` / `docs` / `test` / `perf` / `style`
**scope**：`web` / `desktop` / `mobile` / `api` / `shared` / `ci` / 具体模块名

示例：
```
feat(desktop): add auto-update via tauri-plugin-updater
fix(mobile): handle expo-notifications permission denial on Android 13
```

### 通用约定

- 不要在 shared 中引用平台特有 API（Tauri/Expo/Next.js 专有），用 `platform.ts` 抽象
- 跨端组件放在 `shared/components/`，平台特有适配放在各 app 的 `src/platform-*.ts`
- 新增环境变量必须同时更新 `.env.example`
- 图标/资源文件必须是真实图片（不是文本占位符），移动端 icon.png 1024x1024
- 不要手动修改 `apps/mobile/android/` 或 `ios/`（由 `expo prebuild` 生成）
- Tauri `src-tauri/` 是已纳入版本控制的完整 Rust 工程。CI 在构建时会从 `apps/desktop/native-templates/` 复制最新的 `tauri.conf.json`、`capabilities/default.json` 和 `lib.rs`（确保 CI 配置和仓库版本一致），然后注入版本号
- Node 版本 22（见 `.node-version`）

---

## Git 工作流

### 分支

| 分支 | 用途 |
|------|------|
| `main` | 生产，**必须手动 PR review 合并** |
| `dev` | 开发集成，AI 可自动合并 |
| `feature/<描述>` / `fix/<描述>` / `chore/<描述>` | 功能/修复分支 |

### 三条指令（开发者说以下话时执行）

#### 1. 「提交代码」——仅 commit + push 当前分支，不合并

1. `git status` 检查
2. 分析改动，生成符合规范的 commit message
3. `git add -A && git commit`
4. `git push origin <当前分支>`

#### 2. 「提交代码并合并到 dev」——全自动（默认日常流程）

1. **先验证**：跑 tsc（四端）+ 对应端的 build + vitest（有测试改动时），**失败则停止并报告错误**
2. `git add -A && git commit`（规范 message）+ `git push origin <当前分支>`
3. `git fetch origin dev`
4. 冲突预检：`git merge --no-commit --no-ff origin/dev`
   - 有冲突 → `git merge --abort`，输出冲突文件列表，**停止，不自动解决**
   - 无冲突 → `git merge --abort` 继续
5. 收集未合入 dev 的 commits，生成 PR 标题和描述（用下方模板）
6. `gh pr create --base dev --head <当前分支>` 创建 PR
7. `git checkout dev && git pull origin dev && git merge --no-ff <当前分支> && git push origin dev`
8. 输出 PR 链接 + merge 结果，`git checkout <原分支>`

#### 3. 「创建 PR」——仅建 PR 不合并（核心/安全/大改动留 review）

1. 同上步骤 1（验证）+ 步骤 2（提交推送）
2. `gh pr create` 后**停止**，不执行本地 merge
3. 输出 PR 链接等待手动 review

### PR 模板

```markdown
## 改动摘要
- ...

## 影响范围
- [ ] Web / [ ] Desktop / [ ] Mobile / [ ] API / [ ] Shared / [ ] CI/CD

## 验证
- [x] tsc 通过
- [x] 构建通过
- [x] 单测通过
- [ ] 手动测试

Closes #<issue号>
```

### 冲突规则

- **禁止 AI 自动解决冲突**，报告文件列表和冲突类型，等待开发者处理
- 开发者说「继续合并」后从冲突检查步骤继续

### 发布到 main

**不自动**。必须手动从 `dev` 提 PR 到 `main`，review 后合并，打 `vX.Y.Z` tag 触发 CI Release。

---

## CI/CD

- `.github/workflows/deploy.yml`：Vercel（Web+API）+ Cloudflare Pages 部署（push main/dev 触发）
- `.github/workflows/ci.yml`：PR/push main/dev 时跑 lint + test + web build
- `.github/workflows/desktop-release.yml`：Release workflow
  - **正式版本**：push `v*` tag 或 push main 分支（自动 bump patch），构建 macOS DMG + Windows NSIS EXE + Android APK + iOS Simulator 包，发布 GitHub Release
  - **dev snapshot**：push dev 分支触发，版本固定为 `0.0.0-dev`，artifact 文件名固定（`WordBase-arm64.dmg` / `WordBase-x64.dmg` / `WordBase-Setup.exe` / `WordBase-Android-snapshot.apk` / `WordBase-iOS-Simulator-snapshot.zip`），每次覆盖旧文件，不保留历史
  - Windows 只构建 NSIS（不构建 MSI），避免 MSI 对 pre-release 版本号的格式限制
- `.github/workflows/mobile-ota.yml`：Expo EAS Update 热更新（push main → production channel，push dev → preview channel）
- `.github/workflows/rollback.yml`：手动触发回滚 Vercel/Cloudflare

### Snapshot 版本管理规则（必须遵守）

- snapshot 版本号固定为 `0.0.0-dev`，**不包含日期、commit hash 等变化后缀**
- artifact 文件名必须固定（不含版本号或使用固定版本号），确保新构建能覆盖旧文件
- publish 前必须先删除 snapshot release 上的旧 assets，防止文件堆积
- 正式 release（vX.Y.Z）保留历史文件，不删除旧 assets
- `scripts/set-version.cjs` 是版本注入的唯一入口，snapshot 模式输出 `0.0.0-dev`

### 部署架构（Cloudflare + Vercel 双部署）

```
用户 / word-picker 插件
  │
  ▼
Cloudflare Pages (word-base.pages.dev)        ← CDN + 静态前端 + API 代理
  │
  ├─ /  /app  /assets/*  → Vite 静态资源（apps/web/dist/，CDN 直接返回）
  └─ /api/*               → _worker.js 反向代理 ──→ Vercel Serverless Functions
                                                    │
                                                    ▼
                                                 Hono API → Supabase
```

| 平台 | 职责 | 说明 |
|------|------|------|
| **Cloudflare Pages** | CDN + 静态前端 + API 代理 | 全球边缘节点分发 Vite 构建产物（`apps/web/dist/`），绑定公开域名 `word-base.pages.dev`；`_worker.js`（Advanced Mode Worker，放在部署根目录）拦截 `/api/*` 请求代理到 Vercel |
| **Vercel** | Next.js API-only 后端 | Hono 通过 `hono/vercel` 挂载在 Next.js App Router 的 catch-all route（`src/app/api/[[...all]]/route.ts`）上，Vercel 只 build API 部分（`npm run build:api`），前端页面全部由 Cloudflare 提供 |

**前端与 API 分离的原因**：
- **前端**：Vite 静态构建（landing + word-picker web app）本质是 CSR，不需要 SSR，用 CDN 分发最快
- **API**：Hono 需要 Node.js 运行时（访问 Supabase），走 Vercel Serverless Functions 最省心
- **Cloudflare Pages 不支持 Node.js server**（把 Hono 放这跑不了）
- **只用 Vercel** 前端资源国内访问不稳定，preview URL 每次变化无法给 word-picker 插件固定使用

**环境隔离**（Cloudflare Preview/Production 环境变量 + Vercel `--prod` 与 alias 双隔离）：
- `main` 分支 → Cloudflare production `word-base.pages.dev` + Vercel `--prod`（alias `word-base-six.vercel.app`）
- `dev` 分支 → Cloudflare preview `dev.word-base.pages.dev`（固定，分支名作子域）+ Vercel preview + `vercel alias set dev-word-base`（alias `dev-word-base.vercel.app`）
- Cloudflare Dashboard 的 `NEX

---

## 关键文件索引

| 文件 | 用途 |
|------|------|
| `shared/lib/apiBase.ts` | 跨端 API URL 解析 |
| `shared/platform.ts` | 平台检测抽象 |
| `apps/web/src/app/api/[[...all]]/route.ts` | Next.js Route Handler 挂载 Hono API |
| `apps/web/vercel.json` | Vercel 框架声明（`framework: "nextjs"`） |
| `turbo.json` | Turborepo 配置 + `globalEnv` 环境变量白名单 |
| `apps/desktop/src-tauri/tauri.conf.json` | Tauri 配置（窗口/权限/图标），`bundle.targets` 为 `["dmg", "nsis"]` |
| `apps/desktop/native-templates/tauri.conf.json` | Tauri 配置模板（CI 构建时复制到 src-tauri/） |
| `apps/desktop/src-tauri/capabilities/default.json` | Tauri 权限白名单 |
| `apps/mobile/app.json` | Expo 配置（bundle ID/权限/插件） |
| `apps/mobile/metro.config.js` | Metro watchFolders 配置（monorepo HMR） |
| `apps/desktop/vite.config.ts` | Vite 别名/HMR/fs.allow 配置 |
| `scripts/set-version.cjs` | CI 版本注入脚本（snapshot → `0.0.0-dev`） |
| `package.json` → `overrides` | npm overrides 强制统一 Expo SDK 版本 |
| `PULL_REQUEST_WORKFLOW.md` | Git 工作流详细文档 |

---

## 不要做的事

- 不要用 pnpm/yarn，只用 npm
- 不要提交 `.env` 文件
- 不要手动改 `apps/mobile/android/` 或 `ios/`（prebuild 产物）
- 不要在 Tauri 配置里用废弃语法（`@vercel/node@3` 类），runtime 用官方名 `nodejs22.x`
- 不要往 capabilities 里加超出必要的权限（shell spawn 只允许 say/powershell）
- 不要在 shared 里直接 import Tauri/Expo/Next 专有模块
- 不要创建假的占位图片文件（12字节 "placeholder" 文本），必须用真实 PNG
- 不要直接在 dev/main 分支上提交，用 feature/fix 分支
