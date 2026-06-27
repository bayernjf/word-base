# Supabase 架构迁移指南

## 为什么选择 Supabase？
- ✅ 完全开源，可自托管
- ✅ 比 Firebase 便宜 70-80%
- ✅ PostgreSQL 企业级数据库
- ✅ 内置 Auth + 实时同步 + 存储
- ✅ 独立开发者的最佳选择
- ✅ 完美支持 Mac、iPhone、Chrome 插件

## 快速开始

### 1. 创建 Supabase 项目
1. 访问 https://supabase.com
2. 注册/登录账号
3. 创建新项目
4. 获得你的 `SUPABASE_URL` 和 `SUPABASE_ANON_KEY`

### 2. 运行数据库迁移
在 Supabase Dashboard → SQL Editor → New Query 中运行以下文件：
1. `supabase/migrations/001_init_schema.sql`
2. `supabase/migrations/002_security_policies.sql`

### 3. 配置环境变量
在 `word-base/.env` 中添加：
```env
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### 4. 本地开发（可选）
使用 Supabase CLI 本地开发：
```bash
# 安装 CLI
brew install supabase/tap/supabase

# 初始化
cd word-base
supabase init

# 启动本地 Supabase
supabase start
```

## 架构设计

### 数据库表结构
```
┌─────────────────┐
│  auth.users     │
└─────────────────┘
         │
         ├───────────────┐
         ↓               ↓
┌───────────────────┐ ┌───────────────────┐
│ vocabulary_books  │ │     words         │
└───────────────────┘ └───────────────────┘
         │
         ↓
┌───────────────────┐
│ sync_changelogs   │
└───────────────────┘
```

### 关键特性
- **软删除**：所有表有 `is_deleted` 字段
- **版本控制**：`sync_version` 严格递增
- **实时同步**：内置数据库触发器 + Supabase Realtime
- **安全策略**：完整的 RLS（行级安全策略）

## 迁移现有数据

### 从 SQLite 迁移到 Supabase
1. 导出当前 SQLite 数据（JSON格式）
2. 调用 API 批量导入到 Supabase
3. 代码示例见 `src/scripts/migrate.ts`

## 多平台支持

### Chrome 插件 (Word-Picker2)
使用 Supabase JS SDK + `chrome.storage.local` 本地缓存
- 在线时自动同步
- 离线时完全可用

### Mac 应用
使用 Supabase Swift SDK + Core Data
- 与插件 90% 代码共享
- 原生离线体验

### iPhone 应用
使用 Supabase Swift SDK + SwiftData
- 与 Mac 版本共享核心代码
- App Store 发布准备

## 商业化准备

### 关键改进（可用于变现）
1. ✅ **用户数据 100% 可控**
2. ✅ **内置用户认证**
3. ✅ **完美的付费功能支持**：
   - 按单词数/单词本数限制
   - 按设备数量限制
   - Stripe 支付集成容易
4. ✅ **分析追踪**：可扩展加入使用统计

## 下一步
1. 在 Supabase 中运行迁移脚本
2. 配置环境变量
3. 更新现有的 `server.js` 以集成 Supabase
4. 更新 Word-Picker2 的 service-worker
5. 开始 Mac 版本开发！
