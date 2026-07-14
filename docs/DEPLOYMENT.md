# 部署架构（Cloudflare Pages + Vercel）

WordBase 采用 Cloudflare Pages + Vercel 双平台部署，由 GitHub Actions 自动完成。

---

## 架构总览

```
用户 / word-picker 插件
  │
  ▼
Cloudflare Pages (word-base.pages.dev)        ← CDN + 统一入口
  │
  ├─ /app/*  → Next.js standalone 前端（静态 + SSR）
  └─ /api/*  → _worker.js 反向代理 ──→ Vercel Serverless Functions
                                            │
                                            ▼
                                         Hono API → Supabase
```

### 两个平台的职责

| 平台 | 职责 | 说明 |
|------|------|------|
| **Vercel** | API 后端 + Next.js SSR | Hono 通过 `hono/vercel` 运行在 Serverless Functions 中，处理 `/api/v1/*`（单词同步、认证、AI）；Next.js SSR 也在 Vercel 上原生运行 |
| **Cloudflare Pages** | CDN + 静态前端 + API 代理 | 全球边缘节点分发静态资源，绑定公开域名 `word-base.pages.dev`；`_worker.js`（放在部署输出根目录）将 `/api/*` 代理到 Vercel，避免跨域；dev 分支自动部署到 `dev.word-base.pages.dev` |

### 为什么不用单平台

- **只用 Vercel**：免费版 Serverless Function 调用次数/带宽有限，国内访问不稳定，且 preview URL 每次变化无法给 word-picker 插件固定使用
- **只用 Cloudflare Pages**：不支持 Node.js server 原生运行（Hono API 无法直接跑）
- **互补**：Cloudflare 做门面（CDN + 域名 + 固定 preview URL），Vercel 做后端（API + SSR），流量免费且 API 调用量小

### 请求链路

1. 浏览器/插件请求 `https://word-base.pages.dev/api/v1/words/batch`
2. Cloudflare Pages 收到请求，`_worker.js` 判断路径以 `/api/` 开头
3. Worker 读取构建时绑定的 `NEXT_PUBLIC_API_BASE_URL`（Vercel URL），转发请求
4. Vercel Serverless Function 运行 Hono API，访问 Supabase 数据库
5. 响应经 Worker 返回，Worker 添加 CORS 头

---

## 环境隔离

| 维度 | production（main 分支） | dev preview（dev 分支） |
|------|------------------------|------------------------|
| Cloudflare URL | `word-base.pages.dev` | `dev.word-base.pages.dev`（固定，分支名作子域） |
| Vercel 部署 | `--prod`（固定 production alias） | preview deployment（每次临时 URL） |
| `_worker.js` API 代理目标 | Vercel production URL | 当次 Vercel preview URL（构建时注入 Worker 环境变量） |
| word-picker 插件 | `SYNC_BASE_URL=https://word-base.pages.dev` | `SYNC_BASE_URL=https://dev.word-base.pages.dev` |
| 数据库 | Supabase production | Supabase production（暂不做数据库级隔离） |

> **注**：两个环境共用同一个 Supabase 数据库。dev 为开发者自测，测试数据进自己账号，不存在污染他人数据的问题。后续如需数据库级隔离可加 staging Supabase 项目。

---

## 部署流程（CI）

`.github/workflows/deploy.yml` 在 push main/dev 时触发：

```
1. Build Web (Next.js standalone)
      │
      ├──► deploy-vercel: Vercel CLI 部署
      │     main → vercel deploy --prod（固定 URL）
      │     dev  → vercel deploy（preview，临时 URL）
      │     输出 vercel-url（最终 API base）
      │
      └──► deploy-cloudflare: Cloudflare Pages 部署
            - 下载 .next 构建产物
            - 复制 static/server 到 standalone 目录
            - 复制 _worker.js 到输出根目录（关键：不在 public/ 下）
            - node 脚本清空 package.json 的 scripts（避免 npm 尝试运行 dev 命令）
            - 注入 NEXT_PUBLIC_API_BASE_URL=<vercel-url>
            - 上传到 Cloudflare Pages
```

### 关键文件

| 文件 | 用途 |
|------|------|
| `.github/workflows/deploy.yml` | 部署工作流（build → Vercel → Cloudflare） |
| `apps/web/public/_worker.js` | Cloudflare Pages Advanced Mode Worker，反向代理 `/api/*` 到 Vercel |
| `apps/web/vercel.json` | Vercel 框架声明 `framework: nextjs` |
| `apps/web/next.config.ts` | Next.js 配置（`output: 'standalone'`） |
| `apps/web/src/app/api/[[...all]]/route.ts` | Next.js Route Handler，`hono/vercel` 挂载 Hono API |
| `apps/web/wrangler.toml` | Cloudflare Pages 项目名配置 |

### `_worker.js` 工作原理

Cloudflare Pages 的 Advanced Mode 允许在输出根目录放一个 `_worker.js`，它会拦截所有请求：

- `/api/*` → 代理到 `NEXT_PUBLIC_API_BASE_URL`（构建时由 CI 注入 Vercel URL）
- 其他路径 → `env.ASSETS.fetch(request)` 交给 Cloudflare Pages 静态资源服务处理

Worker 会清除 Cloudflare 特有 header、回显 Origin 做 CORS、删除上游 content-encoding 避免 double-encoding。

---

## 部署前提（首次配置）

### 1. Cloudflare Pages 项目

1. 登录 [dash.cloudflare.com](https://dash.cloudflare.com) → Workers & Pages → Create → Pages → Connect to Git
2. 选择 word-base 仓库
3. 构建设置：Framework preset = `None`，Build command 留空，Output directory 留空（CI 已构建好）
4. Production branch 设为 `main`

### 2. Vercel 项目

1. 登录 [vercel.com](https://vercel.com) → Add New → Project → 导入 word-base
2. Framework Preset = `Other`，所有命令留空
3. Settings → General 复制 Project ID 和 Organization ID

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
# 构建 web
npm -w @wordbase/web run build

# Vercel
npm i -g vercel
vercel deploy --prod   # production
vercel deploy          # preview

# Cloudflare Pages（需先把 _worker.js 复制到 standalone 根目录）
cp apps/web/public/_worker.js apps/web/.next/standalone/apps/web/_worker.js
npx wrangler pages deploy apps/web/.next/standalone/apps/web --project-name=word-base
```

---

## 常见问题

### Q: `/api/*` 返回 HTML 而不是 JSON？

`_worker.js` 没有生效。确认：
- `_worker.js` 被复制到了 Cloudflare Pages 部署输出的**根目录**（不是 `public/` 子目录）
- Cloudflare Pages 的 Functions 目录没有其他文件冲突

### Q: dev 版插件无法同步？

检查 `https://dev.word-base.pages.dev/api/v1/sync/status` 是否返回 JSON（非 HTML）。如果返回 HTML，说明 dev 分支的 Cloudflare 部署还没有包含 `_worker.js`，push 最新 dev 即可。

### Q: Vercel preview URL 过期了怎么办？

Cloudflare 上每次 dev push 会重新部署，`_worker.js` 会拿到最新的 Vercel preview URL。旧 URL 失效不影响，因为下一次 dev push 会更新代理目标。

### Q: 两个平台构建结果不一样？

不会，CI 只构建一次（`npm -w @wordbase/web run build`），产物同时发布到两个平台。
