# WordBase

语境化语言学习工作台 — 基于 React + Supabase 的全栈词汇学习应用。

## 功能

- 多单词本管理与云同步
- 词汇语境化学习（听/说/读/写练习）
- Supabase 认证与数据同步
- 多主题界面（玻璃/清新）
- AI 驱动的词义解释、翻译、故事生成
- 五端覆盖：Web、Mac、Windows、iOS、Android

## 技术栈

- **Web**: Next.js 15 + React 19 + Tailwind CSS v4
- **后端**: Hono + Supabase (PostgreSQL)
- **桌面端**: Tauri 2 (Vite + Rust)
- **移动端**: Expo (React Native)
- **UI**: Lucide Icons + Motion

## 前置条件

- Node.js 22 LTS（推荐用 [fnm](https://github.com/Schniz/fnm) 管理版本，项目根目录 `.node-version` 已锁定）
- Rust 工具链（仅桌面端原生窗口需要）：`brew install rustup && rustup-init`
- Xcode Command Line Tools（Mac 桌面端 / iOS）
- Android Studio（Android）

> **Node 版本说明**：Expo SDK 52 不兼容 Node 26（类型剥离限制），请使用 Node 22 LTS。安装 fnm 后进入项目目录会自动切换：`brew install fnm && echo 'eval "$(fnm env --use-on-cd)"' >> ~/.zshrc`

## 安装依赖

```bash
npm install
```

## 环境变量配置

复制 `.env.example` 为 `.env`（根目录），填入你的 Supabase 配置。各文件用途：

| 文件 | 位置 | 用途 | 是否提交 Git |
|------|------|------|------------|
| `.env` | 项目根目录 | Turbo / Desktop(Vite) / Mobile(Expo) 读取，含 VITE_ 前缀变量 | 否 |
| `apps/web/.env.local` | Web 子项目 | Next.js 读取，含 NEXT_PUBLIC_ 前缀变量 | 否 |
| `packages/api/.env` | API 子项目 | Hono 后端读取，含 SUPABASE_SERVICE_ROLE_KEY | 否 |
| `.env.example` | 项目根目录 | 环境变量模板，仅含占位值 | 是 |

### 环境变量说明

```env
# =============================================
# Supabase 配置（必填）
# =============================================
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co       # Web 前端用
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx                       # Web 前端用（公开 anon key）
VITE_SUPABASE_URL=https://xxx.supabase.co               # Desktop/Mobile 用（Vite/Expo）
VITE_SUPABASE_ANON_KEY=xxx                              # Desktop/Mobile 用（公开 anon key）
SUPABASE_SERVICE_ROLE_KEY=xxx                           # API 后端用（service role，保密！）

# =============================================
# AI 配置加密密钥（必填，用于加密用户自配的 AI API Key）
# =============================================
AI_CONFIG_ENCRYPTION_KEY=replace-with-a-long-random-secret

# =============================================
# API 后端地址（各端独立配置）
# =============================================
# Web 端：Next.js dev server 代理到 localhost:3001，生产走 Vercel/Cloudflare
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001

# Desktop (Tauri)：Mac/Win 本地开发走 localhost
VITE_DESKTOP_API_BASE_URL=http://localhost:3001

# iOS 模拟器：localhost
VITE_IOS_API_BASE_URL=http://localhost:3001

# Android 模拟器：AVD 专用地址 10.0.2.2 指向宿主机
VITE_ANDROID_API_BASE_URL=http://10.0.2.2:3001

# 真机调试：填电脑内网 IP（iOS/Android 同一 WiFi）
# VITE_IOS_API_BASE_URL=http://192.168.x.x:3001
# VITE_ANDROID_API_BASE_URL=http://192.168.x.x:3001

# API 服务监听端口
PORT=3001
```

## 本地开发

### 最快启动（Web + API）

```bash
# 终端 1：启动 API 后端（端口 3001）
npm run dev:api

# 终端 2：启动 Web 前端（端口 3000）
npm run dev
```

打开 `http://localhost:3000` 即可。

### 五端启动命令速查

需要 API 后端运行在 3001 端口（`npm run dev:api`）才能使用登录、同步、AI 等功能。

| 端 | 命令 | 访问方式 | 说明 |
|---|------|---------|------|
| **Web** | `npm run dev` 或 `npm run dev:web` | 浏览器 `http://localhost:3000` | Next.js 开发服务器 |
| **API 后端** | `npm run dev:api` | `http://localhost:3001` | Hono API 服务器（AI、认证、同步） |
| **桌面端（浏览器预览）** | `npm run dev:desktop` | 浏览器 `http://localhost:3002` | Vite dev server，可在浏览器预览 UI |
| **桌面端（原生窗口）** | `npm -w @wordbase/desktop run tauri:dev` | 原生 macOS/Windows 窗口 | 需要 Rust + Tauri CLI |
| **移动端（手机预览）** | `npm run dev:mobile` | 手机安装 Expo Go 扫描二维码 | Expo dev server |
| **移动端（浏览器模拟）** | `npm run dev` + Chrome DevTools | 浏览器 `http://localhost:3000` | 用 Web 端 + Chrome 移动设备模拟 |
| **iOS 模拟器** | `npm -w @wordbase/mobile run build:ios` | iOS 模拟器 | 需要 Xcode |
| **Android 模拟器** | `npm -w @wordbase/mobile run build:android` | Android 模拟器 | 需要 Android Studio |

### 其他命令

| 命令 | 说明 |
|------|------|
| `npm run build` | 构建 Web 生产版本 |
| `npm run build:all` | 构建所有端 |
| `npm run preview` | 预览 Web 构建产物 |
| `npm run lint` | 代码检查 |
| `npm run test` | 运行单元测试 |
| `npm run clean` | 清理构建产物 |

## 部署

Web 端通过 GitHub Actions 自动部署到 Vercel + Cloudflare Pages。详见 [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)。

## 项目结构

```
word-base/
├── apps/
│   ├── web/          # Next.js Web 前端
│   ├── desktop/      # Tauri 桌面端
│   └── mobile/       # Expo 移动端
├── packages/
│   └── api/          # Hono API 后端
├── shared/           # 五端共享代码（组件、hooks、工具）
└── docs/             # 文档
```
