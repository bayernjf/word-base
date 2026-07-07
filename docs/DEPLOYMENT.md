# Web 端部署指南（Vercel + Cloudflare Pages 双平台）

WordBase Web 端支持同时部署到 Vercel 和 Cloudflare Pages，互为备份，统一由 GitHub Actions 自动完成。

---

## 架构总览

```
代码推送到 main 分支
        │
        ▼
GitHub Actions（统一构建）
        │
        ├──► 部署到 Cloudflare Pages（主生产环境）
        └──► 部署到 Vercel（备用/演示环境）
```

- **一次构建，两份部署**：CI 里只构建一次，产物同时发布到两个平台
- **互不依赖**：两个平台独立运行，一个挂了另一个正常服务
- **DNS 智能切换**：通过 Cloudflare DNS Failover 实现自动故障转移

---

## 配置文件清单

| 文件 | 用途 | 适用平台 |
|------|------|---------|
| `.github/workflows/deploy.yml` | GitHub Actions 部署工作流 | 两者共用 |
| `apps/web/vercel.json` | Vercel 路由重写配置 | Vercel |
| `apps/web/wrangler.toml` | Cloudflare Pages CLI 配置 | Cloudflare |
| `apps/web/public/_redirects` | Cloudflare Pages SPA 路由 | Cloudflare |

---

## 部署步骤

### Step 1：创建 Cloudflare Pages 项目

1. 登录 [dash.cloudflare.com](https://dash.cloudflare.com)
2. 左侧菜单 → **Workers & Pages** → **Create** → **Pages** → Connect to Git**
3. 选择你的 word-base GitHub 仓库
4. 配置构建设置：
   - **Project name**：`wordbase`（或自定义，需与 `wrangler.toml` 里的 name 一致）
   - **Production branch**：`main`
   - **Framework preset**：`None`
   - **Build command**：留空（CI 里已经构建好了）
   - **Build output directory**：留空
5. 点击 **Save and Deploy**
   > 第一次部署会失败（因为还没配 CI，正常），项目创建好就行

### Step 2：获取 Cloudflare 凭证

**API Token：**
1. 右上角头像 → **My Profile** → **API Tokens**
2. 点击 **Create Token**
3. 找到最上面的 **Custom token** → 点击 **Get started**
   > 注意：Cloudflare 没有现成的 Pages 模板，需要手动创建
4. 填写 Token 名称：`GitHub Actions`
5. 在 **Permissions** 区域添加一条：
   - 第一列选 **Account**（不是 Zone）
   - 第二列选 **Pages**
   - 第三列选 **Edit**
6. **Account Resources** 保持默认（All accounts）
7. 其他选项不用改，拉到最下面点 **Continue to summary**
8. 点 **Create Token**
9. 复制 Token（只显示一次，保存好）

**Account ID：**
- Cloudflare Dashboard 首页右下角 → **Account ID**，复制

### Step 3：创建 Vercel 项目

1. 登录 [vercel.com](https://vercel.com)（用 GitHub 登录）
2. **Add New** → **Project** → 导入 word-base 仓库
3. 配置：
   - **Framework Preset**：`Other`
   - **Build Command**：留空
   - **Output Directory**：留空
   - **Install Command**：留空
4. 点击 **Deploy**
   > 第一次部署可能失败，没关系，项目创建好就行
5. 进入项目 → **Settings** → **General**：
   - 复制 **Project ID**
   - 复制 **Organization ID**（个人账号一般是你的用户名）

### Step 4：获取 Vercel Token

1. 右上角头像 → **Settings** → **Tokens**
2. 输入 Token 名称：`GitHub Actions`
3. Scope 选择你的团队/个人账号
4. 点击 **Create Token** → 复制 Token

### Step 5：配置 GitHub Secrets

进入 GitHub 仓库 → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

逐个添加以下 Secrets：

| Secret 名称 | 值 | 必填 |
|-------------|-----|------|
| `CLOUDFLARE_API_TOKEN` | Step 2 的 Cloudflare API Token | ✅ |
| `CLOUDFLARE_ACCOUNT_ID` | Step 2 的 Cloudflare Account ID | ✅ |
| `VERCEL_TOKEN` | Step 4 的 Vercel Token | ✅ |
| `VERCEL_ORG_ID` | Step 3 的 Vercel Organization ID | ✅ |
| `VERCEL_PROJECT_ID` | Step 3 的 Vercel Project ID | ✅ |
| `VITE_SUPABASE_URL` | Supabase 项目 URL | ✅ |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key | ✅ |

> 注意：`VITE_SUPABASE_URL` 和 `VITE_SUPABASE_ANON_KEY` 如果 CI 工作流里已经配过就不用重复加。

### Step 6：推送触发部署

```bash
git add .
git commit -m "feat: add dual deployment workflow"
git push origin main
```

然后去 GitHub 仓库 → **Actions** → **Deploy Web** 工作流查看进度。

部署成功后：
- Cloudflare Pages 地址：`https://wordbase.pages.dev`
- Vercel 地址：`https://xxx.vercel.app`

---

## DNS 配置（可选，自定义域名）

### 方案一：Cloudflare DNS + Failover（推荐）

用 Cloudflare DNS 管理域名，主站指向 Cloudflare Pages，备用指向 Vercel，自动故障切换。

1. 确保你的域名 NS 已切换到 Cloudflare
2. 添加 CNAME 记录：

| Type | Name | Content | Proxy status |
|------|------|---------|--------------|
| CNAME | `@` (或 www) | `wordbase.pages.dev` | Proxied |

3. 启用 **Failover**（需要企业版以上套餐，或用 Load Balancer）
   - 免费版可以手动切换

### 方案二：双 CNAME 轮询

两个平台各绑一个子域名，简单直接：

| Type | Name | Content | Proxy |
|------|------|---------|-----|
| CNAME | `www` | `wordbase.pages.dev` | Proxied |
| CNAME | `vercel` | `xxx.vercel.app` | Proxied |

---

## 环境变量管理

构建时使用的环境变量统一在 GitHub Secrets 中配置，两个平台共用。

| 变量名 | 说明 |
|--------|------|
| `VITE_SUPABASE_URL` | Supabase 项目 URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key |

> 落地页（`/`）不需要 Supabase，只有产品页（`/app`）才需要。

如果以后需要加埋点等新变量：
1. 在 GitHub Secrets 中添加
2. 在 `.github/workflows/deploy.yml` 的 build job 的 env 中引用
3. 重新触发部署

---

## 手动部署

### 手动部署到 Cloudflare Pages

```bash
# 安装 wrangler CLI
npm install -g wrangler

# 登录
wrangler login

# 构建
npm run build

# 部署
cd apps/web
wrangler pages deploy dist --project-name=wordbase
```

### 手动部署到 Vercel

```bash
# 安装 Vercel CLI
npm install -g vercel

# 登录
vercel login

# 构建
npm run build

# 部署
cd apps/web
vercel --prod
```

---

## 常见问题

### Q: 部署后访问 /app 404？

A: 路由重写没生效。检查：
- Vercel：确认 `apps/web/vercel.json` 里的 rewrites 配置
- Cloudflare Pages：确认 `apps/web/public/_redirects` 文件在 dist 目录里

### Q: 两个平台构建结果不一样？

A: CI 模式下不会，因为只构建一次，产物相同。如果用平台各自构建才可能不一样。

### Q: 怎么只更新一个平台？

A: 去 GitHub Actions 手动触发，或者用 CLI 手动部署单个平台。

### Q: PR 会自动部署吗？

A: 不会。目前配置是只有 push 到 main 才部署。PR 只跑 CI 构建验证，不部署。

### Q: 落地页和产品页是分开的吗？

A: 是的。落地页在 `/`，产品页在 `/app`，两个是独立的 HTML 入口。落地页不加载 Supabase SDK，首屏更轻量。
