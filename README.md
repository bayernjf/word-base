# WordScene AI

语境化语言学习工作台 — 基于 React + Supabase 的全栈词汇学习应用。

## 功能

- 多单词本管理与同步
- 词汇语境化学习（听/说/读/写练习）
- Supabase 认证与云同步
- 多主题界面（玻璃/清新）

## 技术栈

- **前端**: React 19 + TypeScript + Vite + Tailwind CSS v4
- **后端**: Express + Supabase
- **数据库**: PostgreSQL (Supabase)
- **UI**: Lucide Icons + Motion (Framer Motion)

## 本地运行

**前置条件:** Node.js 18+

1. 安装依赖:
   ```bash
   npm install
   ```

2. 配置环境变量:
   复制 `.env.example` 为 `.env`，填入你的 Supabase 配置:
   ```env
   VITE_SUPABASE_URL=your-supabase-url
   VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
   ```

3. 启动前端:
   ```bash
   npm run dev
   ```

4. 启动后端（可选，用于同步服务）:
   ```bash
   npm run server:supabase
   ```

## 可用脚本

| 命令 | 说明 |
|------|------|
| `npm run dev` | 启动开发服务器 (端口 3000) |
| `npm run build` | 构建生产版本 |
| `npm run preview` | 预览构建结果 |
| `npm run server` | 启动 SQLite 后端 |
| `npm run server:supabase` | 启动 Supabase 同步后端 (端口 3001) |
| `npm run lint` | 类型检查 |