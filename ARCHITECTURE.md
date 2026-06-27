# Word Picker - Supabase 架构总览

## 🏗️ 整体架构

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                  Supabase                                   │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────┐  ┌───────────────┐    │
│  │   Auth      │  │  PostgreSQL  │  │   Realtime   │  │    Storage    │    │
│  └─────────────┘  └─────────────┘  └──────────────┘  └───────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
                                     ↓
          ┌───────────────────────────┼───────────────────────────┐
          ↓                           ↓                           ↓
┌────────────────────┐    ┌────────────────────┐    ┌────────────────────┐
│   Chrome 插件       │    │   Mac 原生应用      │    │   iPhone 原生应用   │
│ (Supabase JS SDK)  │    │ (Supabase Swift)   │    │ (Supabase Swift)   │
└────────────────────┘    └────────────────────┘    └────────────────────┘
           ↓                           ↓                           ↓
  chrome.storage.local            Core Data                    SwiftData
  (本地缓存)                    (本地存储)                   (本地存储)
```

## 📊 数据库设计

### 核心表结构

#### 1. `vocabulary_books` (单词本表)
| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| user_id | UUID | 用户 ID (外键) |
| name | TEXT | 单词本名称 |
| description | TEXT | 描述 |
| word_count | INT | 单词数 |
| icon | TEXT | 图标名称 |
| is_sync | BOOL | 是否同步单词本 |
| created_at | TIMESTAMP | 创建时间 |
| updated_at | TIMESTAMP | 更新时间 |
| sync_version | INT | 同步版本号 |
| is_deleted | BOOL | 软删除标记 |

#### 2. `words` (单词表)
| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| user_id | UUID | 用户 ID (外键) |
| word | TEXT | 单词 |
| translation | TEXT | 翻译 |
| frequency | INT | 频率 |
| book_id | UUID | 单词本 ID |
| contexts | JSONB | 上下文 |
| ... 其他字段 | ... | ... |
| sync_version | INT | 同步版本号 |
| is_deleted | BOOL | 软删除标记 |

#### 3. `sync_changelogs` (同步变更日志)
| 字段 | 类型 | 说明 |
|------|------|------|
| id | BIGINT | 自增 ID |
| user_id | UUID | 用户 ID |
| entity_type | TEXT | 实体类型 ('book'/'word') |
| entity_id | UUID | 实体 ID |
| action | TEXT | 动作 ('create'/'update'/'delete') |
| sync_version | INT | 同步版本号 |
| created_at | TIMESTAMP | 时间戳 |

## 🔒 安全策略 (RLS)

- 用户只能访问自己的数据
- 通过 `auth.uid() = user_id` 验证
- 所有查询都经过安全策略过滤

## 📡 同步机制

### 双向同步流程

1. **实时推送** (Supabase Realtime)
   - 任何变更都会被推送给其他设备
   - 近实时同步

2. **增量同步** (定期拉取)
   - 设备定期检查 `sync_changelogs`
   - 拉取变更并应用

3. **全量同步** (首次登录)
   - 登录时全量拉取数据
   - 初始化本地存储

### 冲突解决策略
- 最后写入获胜 (Last Write Wins)
- 基于 `updated_at` 时间戳
- 本地变更会合并服务器变更

## 💡 本地优先架构

所有平台都是**本地优先** (Local-First)：
1. 所有读写操作优先本地
2. 后台进行同步
3. 完全离线可用
4. 同步完成后自动合并

## 📱 多平台 SDK 支持

| 平台 | 推荐存储 | SDK |
|------|---------|-----|
| Chrome 插件 | chrome.storage.local | Supabase JS |
| Mac 原生 | Core Data | Supabase Swift |
| iPhone 原生 | SwiftData | Supabase Swift |
| Web 版 | IndexedDB | Supabase JS |

## 💰 商业化架构优势

- ✅ 完全控制用户数据
- ✅ 容易添加付费功能 (Stripe)
- ✅ 基于用户 ID 的使用量统计
- ✅ 支持按功能/使用量分级定价
- ✅ 成本可控，比 Firebase 便宜 70-80%
