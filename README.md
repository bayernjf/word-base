# WordBase

语境化语言学习工作台 — 基于 React + Supabase 的全栈词汇学习应用。

## 功能

- 多单词本管理与同步
- 词汇语境化学习（听/说/读/写练习）
- Supabase 认证与云同步
- 多主题界面（玻璃/清新）
- AI 驱动的词义解释、翻译、故事生成

## 技术栈

- **前端**: React 19 + TypeScript + Vite + Tailwind CSS v4
- **后端**: Express + Supabase
- **数据库**: PostgreSQL (Supabase)
- **UI**: Lucide Icons + Motion (Framer Motion)
- **桌面端**: Tauri 2
- **移动端**: Capacitor 7

## 本地运行

**前置条件:** Node.js 20+

1. 安装依赖:
   ```bash
   npm install
   ```

2. 配置环境变量:
   复制 `.env.example` 为 `.env`，填入你的 Supabase 配置:
   ```env
   VITE_SUPABASE_URL=your-supabase-url
   VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   AI_CONFIG_ENCRYPTION_KEY=replace-with-a-long-random-secret
   ```

3. 启动前端:
   ```bash
   npm run dev
   ```

4. 启动后端（AI 功能需要）:
   ```bash
   npm run server:supabase
   ```

## 多端开发

项目支持 Web、桌面（Mac/Win）、移动（iOS/Android）五端。

### 环境变量配置

后端服务地址各端独立配置，在 `.env` 中设置：

```env
# 通用覆盖（优先级最高，临时调试改这个）
VITE_API_BASE_URL=

# Web 端（默认走 vite proxy /api → localhost:3001，留空即可）
# VITE_API_BASE_URL=

# 桌面端（Tauri，Mac/Win 都用 localhost）
VITE_DESKTOP_API_BASE_URL=http://localhost:3001

# iOS 模拟器
VITE_IOS_API_BASE_URL=http://localhost:3001

# Android 模拟器（AVD 专用地址 10.0.2.2 指向宿主机）
VITE_ANDROID_API_BASE_URL=http://10.0.2.2:3001

# 真机调试（iOS/Android 同一 wifi，填电脑内网 IP）
# VITE_IOS_API_BASE_URL=http://192.168.x.x:3001
# VITE_ANDROID_API_BASE_URL=http://192.168.x.x:3001
```

### 各端启动命令

| 端 | 命令 | 访问地址 | AI 后端地址 |
|---|------|---------|------------|
| Web | `npm run dev:web` | `http://localhost:3000` | 走 vite 代理 |
| Mac 桌面 | `npm run dev:desktop` | Tauri 窗口 | `http://localhost:3001` |
| iOS 模拟器 | `npm -w @wordbase/mobile run cap:run:ios` | 模拟器 | `http://localhost:3001` |
| Android 模拟器 | `npm -w @wordbase/mobile run cap:run:android` | 模拟器 | `http://10.0.2.2:3001` |

> **注意**：所有端的 AI 功能都需要先启动后端服务 `npm run server:supabase`。

## CI/CD 构建产物测试

每次 push 到 `main` / `dev` / `feature/*` 分支会触发 CI 构建，产物存储在 Actions Artifacts 中。

### 下载产物

1. 打开 GitHub 仓库 → **Actions**
2. 找到对应工作流 run → 点击进入
3. 在 **Artifacts** 区域下载需要的包

### 各端测试方法

| 端 | Artifact 名称 | 安装/测试方法 | AI 后端要求 |
|---|--------------|--------------|------------|
| Web | `web-dist` | 本地 `npm run dev:web` 即可，无需下载 | Mac 上启后端 |
| Mac 桌面 | `desktop-macos-dmg` | 下载 .dmg → 双击安装 → 从 Launchpad 打开 | Mac 上启后端 |
| Windows 桌面 | `desktop-windows-exe` | 下载 .exe → 传到 Windows → 双击安装 | Win 上启后端 |
| iOS 模拟器 | `ios-simulator-app` | 解压 .zip → 打开 Xcode 模拟器 → 拖入 .app | Mac 上启后端 |
| Android | `android-debug-apk` | 下载 .apk → 打开 Android 模拟器 → 拖入安装 | Mac 上启后端 |

### 后端服务启动

所有端的 AI 功能都需要后端服务运行在 3001 端口：

```bash
npm run server:supabase
```

- **Mac 本机**：Web + Mac 桌面 + iOS 模拟器 + Android 模拟器 共用这一个后端
- **Windows 电脑**：需要在 Windows 上单独启后端，或把 `VITE_DESKTOP_API_BASE_URL` 改成 Mac 的内网 IP

## 开发模式 vs 构建产物

测试有两种方式，适用不同场景：

| 对比项 | 命令行 dev 模式 | CI 构建安装包 |
|--------|---------------|-------------|
| 启动方式 | `npm run dev:desktop` / `npm run dev:mobile` | 下载 .dmg / .apk / .app 安装 |
| 代码更新 | 改完自动热重载 | 需重新构建重新安装 |
| 调试工具 | Chrome DevTools、完整调试 | 只有原生日志，调试较麻烦 |
| 环境变量 | 读本地 `.env` | 读 CI 中配置的 Secrets |
| 速度 | 快，秒启 | 慢，CI 需数分钟 |
| 适用场景 | 日常开发、调试 bug | 验证构建产物、回归测试、分发测试 |

### 推荐工作流

```
日常开发 → 命令行 dev 模式（快，能调试）
  ↓
功能完成 → push 代码 → CI 自动出包
  ↓
发布前验证 → 下载安装包测试（确保打包后正常）
```

### 什么时候必须用安装包测

1. **发布前验证** — 确保打包后的产物与 dev 模式行为一致
2. **原生功能测试** — 推送、剪贴板、通知等 Tauri/Capacitor 插件
3. **给他人测试** — 发给测试同学或朋友，无需装开发环境
4. **性能测试** — dev 模式含调试代码，性能数据不准

## Web 端部署

Web 端支持同时部署到 Vercel 和 Cloudflare Pages，由 GitHub Actions 自动完成。

详细步骤见 [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)。

## 可用脚本

| 命令 | 说明 |
|------|------|
| `npm run dev` | 启动 Web 开发服务器 (端口 3000) |
| `npm run dev:web` | 同 `npm run dev` |
| `npm run dev:desktop` | 启动桌面端开发 (Tauri) |
| `npm run dev:mobile` | 启动移动端开发服务器 (端口 3003) |
| `npm run build` | 构建 Web 生产版本 |
| `npm run build:all` | 构建所有端前端 |
| `npm run preview` | 预览 Web 构建结果 |
| `npm run server:supabase` | 启动后端 AI 服务 (端口 3001) |
| `npm run lint` | Web 端类型检查 |
| `npm run lint:all` | 三端类型检查 |