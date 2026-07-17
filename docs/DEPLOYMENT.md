# 部署架构（Cloudflare Pages + Vercel）

WordBase 采用 Cloudflare Pages + Vercel 双平台部署，由 GitHub Actions 自动完成。

---

## 架构总览

```
用户 / word-picker 插件
  │
  ▼
Cloudflare Pages (word-base.pages.dev)        ← CDN + 静态前端 + API 代理
  │
  ├─ /  /app  /assets/*  → Vite 静态资源（CDN 直接返回）
  └─ /api/*               → _worker.js 反向代理 ──→ Vercel Serverless Functions
                                                    │
                                                    ▼
                                                 Hono API → Supabase
```

### 两个平台的职责

| 平台 | 职责 | 说明 |
|------|------|------|
| **Cloudflare Pages** | CDN + 静态前端 + API 代理 | 全球边缘节点分发 Vite 构建产物（`apps/web/dist/`），绑定公开域名 `word-base.pages.dev`；`_worker.js`（Advanced Mode Worker，放在部署根目录）拦截 `/api/*` 请求代理到 Vercel |
| **Vercel** | Next.js API-only 后端 | Hono 通过 `hono/vercel` 挂载在 Next.js App Router 的 catch-all route（`src/app/api/[[...all]]/route.ts`）上，Vercel 只 build API 部分，前端页面全部由 Cloudflare 提供 |

### 前端与 API 分离的原因

- **前端**：Vite 静态构建（landing + word-picker web app）本质是 CSR，不需要 SSR，用 CDN 分发最快
- **API**：Hono 需要 Node.js 运行时（访问 Supabase），走 Vercel Serverless Functions 最省心
- **Cloudflare Pages 不支持 Node.js server**（如果把 Hono 放在这，无法直接跑）
- **只用 Vercel** 的话，前端资源国内访问不稳定、preview URL 每次变化

### 请求链路

1. 浏览器/插件请求 `https://word-base.pages.dev/api/v1/words/batch`
2. Cloudflare Pages 边缘节点收到请求，`_worker.js` 判断路径以 `/api/` 开头
3. Worker 读取 `env.NEXT_PUBLIC_API_BASE_URL`（Cloudflare Dashboard 环境变量，指向 Vercel URL），转发请求
4. Vercel Serverless Function 运行 Hono API，访问 Supabase 数据库
5. 响应经 Worker 返回，Worker 补齐 CORS 头、过滤非法 header

静态资源（`/`、`/app`、`/assets/*`）由 `env.ASSETS.fetch(request)` 直接从 Cloudflare CDN 返回，不出边缘节点。

---

## 环境隔离

| 维度 | production（main 分支） | dev preview（dev 分支） |
|------|------------------------|------------------------|
| Cloudflare URL | `word-base.pages.dev` | `dev.word-base.pages.dev`（固定，分支名作子域） |
| Vercel 部署 | `--prod`（production alias `word-base-six.vercel.app`） | preview deployment + `vercel alias set dev-word-base` |
| `_worker.js` API 代理目标 | `word-base-six.vercel.app` | `dev-word-base.vercel.app` |
| Cloudflare env var `NEXT_PUBLIC_API_BASE_URL` | Production 环境：`https://word-base-six.vercel.app` | Preview 环境：`https://dev-word-base.vercel.app` |
| word-picker 插件 | `SYNC_BASE_URL=https://word-base.pages.dev` | `SYNC_BASE_URL=https://dev.word-base.pages.dev` |
| 数据库 | Supabase production | Supabase production（暂不做数据库级隔离） |

> **关键**：dev 和 main 通过 Cloudflare Pages 的 Production / Preview 两个环境变量作用域隔离，Vercel 通过 `--prod` 与 `vercel alias set` 生成两个不同的固定 alias。两条链路互不干扰。
>
> **注**：两个环境共用同一个 Supabase 数据库。dev 为开发者自测，测试数据进自己账号，不存在污染他人数据的问题。后续如需数据库级隔离可加 staging Supabase 项目。

---

## 部署流程（CI）

`.github/workflows/deploy.yml` 在 push main/dev 时触发：

```
1. Build Web (Vite)
      npm run build     # apps/web → vite build → dist/
      cp _worker.js → dist/                  # _worker.js 归位到部署根
      上传 dist/ 为 artifact
      │
      ├──► deploy-vercel: Next.js API 部署
      │     npm run build:api  → next build（只 build API route）
      │     main → vercel deploy --prod（更新 word-base-six.vercel.app）
      │     dev  → vercel deploy + vercel alias set dev-word-base
      │
      └──► deploy-cloudflare: Cloudflare Pages 部署
            cloudflare/pages-action@v1 上传 apps/web/dist/
            branch: main / dev（决定 Production / Preview 环境）
```

### 关键文件

| 文件 | 用途 |
|------|------|
| `.github/workflows/deploy.yml` | 部署工作流（Vite build → Vercel API 部署 → Cloudflare Pages 部署） |
| `apps/web/vite.config.ts` | Vite 前端构建配置（landing + app 双入口） |
| `apps/web/index.html` / `apps/web/app.html` | 两个入口 HTML |
| `apps/web/src/landing.main.tsx` / `apps/web/src/app.main.tsx` | Vite 入口脚本 |
| `apps/web/next.config.ts` | Next.js API-only 配置（**不含前端页面**） |
| `apps/web/src/app/api/[[...all]]/route.ts` | Next.js App Router catch-all，挂载 Hono API |
| `apps/web/src/app/layout.tsx` | Next.js 最小 root layout（只是满足框架要求） |
| `apps/web/public/_worker.js` | Cloudflare Pages Advanced Mode Worker，反向代理 `/api/*` |
| `apps/web/vercel.json` | Vercel `framework: nextjs` 声明 |
| `apps/web/wrangler.toml` | Cloudflare Pages 项目名配置 |
| `apps/web/tsconfig.json` | Next.js API build 用的 tsconfig（`jsx: preserve` + next plugin） |
| `apps/web/tsconfig.vite.json` | Vite build 用的 tsconfig（`jsx: react-jsx`） |
| `vercel.json` | 根目录 Vercel 配置，`buildCommand: npm -w @wordbase/web run build:api` |

### `_worker.js` 工作原理

Cloudflare Pages Advanced Mode 允许在输出根目录放一个 `_worker.js`，拦截所有请求：

- `/api/*` → 代理到 `env.NEXT_PUBLIC_API_BASE_URL`（Cloudflare Dashboard 按环境注入 Vercel URL）
- 其他路径 → `env.ASSETS.fetch(request)` 交给 Cloudflare Pages 静态资源服务处理

Worker 会：
- 过滤请求 header 中的非 ASCII 字符（避免 `TypeError: Invalid header value`）
- 清除 Cloudflare 特有 header（`cf-connecting-ip`、`cf-ray` 等）
- 逐个复制响应 header，非法 header 单独跳过
- 补齐 CORS 头，回显 Origin
- 删除上游 `content-encoding` 避免 double-encoding

---

## 部署前提（首次配置）

### 1. Cloudflare Pages 项目

1. 登录 [dash.cloudflare.com](https://dash.cloudflare.com) → Workers & Pages → Create → Pages → Connect to Git
2. 选择 word-base 仓库
3. 构建设置：Framework preset = `None`，Build command 留空，Output directory 留空（CI 已构建好）
4. Production branch 设为 `main`
5. **Settings → Variables and secrets** 分环境配置 `NEXT_PUBLIC_API_BASE_URL`：
   - **Production**: `https://word-base-six.vercel.app`
   - **Preview**: `https://dev-word-base.vercel.app`

### 2. Vercel 项目

1. 登录 [vercel.com](https://vercel.com) → Add New → Project → 导入 word-base
2. Framework Preset = `Other`，所有命令留空（走根 `vercel.json` 的 `buildCommand: npm -w @wordbase/web run build:api`）
3. Settings → General 复制 Project ID 和 Organization ID
4. **Settings → Deployment Protection** 关闭 Vercel Authentication（否则 preview URL 需要登录才能访问，Cloudflare Worker 代理会拿到 SSO 登录页）

### 3. GitHub Secrets

进入仓库 Settings → Secrets and variables → Actions：

| Secret | 用途 |
|--------|------|
| `CLOUDFLARE_API_TOKEN` | Cloudflare API Token（Account > Pages > Edit） |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare Account ID |
| `VERCEL_TOKEN` | Vercel 个人 Token |
| `VERCEL_ORG_ID` | Vercel Organization ID |
| `VERCEL_PROJECT_ID` | Vercel Project ID |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `NEXT_PUBLIC_API_BASE_URL` | Vercel URL（构建期 Vite 打包时替换 `SYNC_BASE_URL` 用） |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key（仅 API 使用） |
| `AI_CONFIG_ENCRYPTION_KEY` | AI 配置加密密钥 |

### 4. 推送触发

```bash
# dev preview
git checkout dev && git push origin dev

# production（通过 PR 合并到 main）
```

部署成功后：
- Production: `https://word-base.pages.dev`
- Dev preview: `https://dev.word-base.pages.dev`

---

## word-picker 插件联动

word-picker 的 `SYNC_BASE_URL` 在 CI 构建时按分支注入（见 word-picker 的 `.github/workflows/release.yml`）：

| word-picker 版本 | SYNC_BASE_URL | 对应 word-base 环境 |
|-----------------|---------------|-------------------|
| dev snapshot（`0.0.0.0`） | `https://dev.word-base.pages.dev` | dev preview |
| 正式版（`x.y.z`） | `https://word-base.pages.dev` | production |

本地开发时在 word-picker 的 `.env.local` 中设 `SYNC_BASE_URL=http://localhost:3001` 直连本地 API server。

---

## 手动部署

```bash
# 构建 Vite 前端
npm -w @wordbase/web run build          # → apps/web/dist/

# 构建 Next.js API
npm -w @wordbase/web run build:api      # → apps/web/.next/

# Vercel API 部署
npm i -g vercel
vercel deploy --prod                    # main -> production alias
vercel deploy                           # dev  -> preview URL
vercel alias set <preview-url> dev-word-base  # 只 dev 分支需要

# Cloudflare Pages 静态部署
cp apps/web/public/_worker.js apps/web/dist/_worker.js
npx wrangler pages deploy apps/web/dist --project-name=word-base --branch=<main|dev>
```

---

## 常见问题

### Q: `/api/*` 返回 HTML 而不是 JSON？

`_worker.js` 没有生效，或代理到的 Vercel deployment 上没有 API routes。确认：
- `_worker.js` 在 Cloudflare Pages 部署输出的**根目录**（不是 `public/` 子目录）
- Cloudflare Dashboard 的 `NEXT_PUBLIC_API_BASE_URL` 指向**最新的**、有 API routes 的 Vercel deployment
- Vercel deployment 关闭了 Deployment Protection（否则会拦截返回 SSO 登录页 HTML）

### Q: dev 版插件无法同步？

检查 `https://dev.word-base.pages.dev/api/v1/health` 返回是否是 `{"ok":true}`。如果返回 HTML：
- 确认 Cloudflare Dashboard **Preview 环境**的 `NEXT_PUBLIC_API_BASE_URL` 是 `https://dev-word-base.vercel.app`
- 确认 dev 分支最后一次部署有跑 `vercel alias set dev-word-base`（看 CI 日志 `Setting alias ...`）

### Q: Cloudflare error 1101？

`_worker.js` JS 抛异常。最常见是 `new Headers(request.headers)` 遇到非 ASCII header 值。当前 `_worker.js` 已用逐 header 复制 + `isAscii` 过滤修复，若再出现走 `X-Worker-Debug-*` 响应头查具体 header。

### Q: 两个平台构建结果不一致？

不会。Cloudflare 部署的是 `apps/web/dist/`（Vite build 产物），Vercel 部署的是 `apps/web/.next/`（Next.js API-only build 产物），两个 build 独立执行、职责不同。

---

## 演进方向

如果未来 API 跨洋延迟成为瓶颈，可以把 Hono 从 Vercel 迁到 **Cloudflare Workers**（独立 Worker，绑到 word-base 子路径），这样 API 也在 Cloudflare 边缘运行，跟静态资源同源，跨洋 hop 完全消除。Hono 天然支持 Cloudflare Workers runtime，改动主要是把 `process.env` 改成 `env`、去掉 Node.js 特有 API、用 `wrangler` 部署。

**当前架构完全够用。如果哪天 API 真的成瓶颈了再迁到 Cloudflare Workers。**
