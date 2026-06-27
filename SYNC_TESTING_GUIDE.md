# 双向同步功能测试指南

## 📋 前置准备

1. **确保 Supabase 数据库已设置**
   - 已运行 `001_init_schema.sql`
   - 已运行 `002_security_policies.sql`

2. **确保 .env 文件已配置**
   ```
   VITE_SUPABASE_URL=你的_supabase_url
   VITE_SUPABASE_ANON_KEY=你的_anon_key
   PORT=3001
   ```

3. **安装依赖**
   ```bash
   cd word-base
   npm install
   ```

## 🚀 启动服务

### 1. 启动后端服务
```bash
cd word-base
npm run server:supabase
```

### 2. 启动前端服务（新终端）
```bash
cd word-base
npm run dev
```

## 🧪 测试步骤

### 测试 1：基础注册与默认单词本创建

**步骤：**
1. 打开浏览器，访问 http://localhost:5173
2. 注册新用户（使用任意邮箱和密码）
3. 登录后应该会自动创建名为"默认"的单词本
4. 该单词本应该被设置为同步单词本（isSync = true）

**验证方法：**
- 在 Supabase Dashboard → Table Editor → `vocabulary_books`
- 应该看到一个新的单词本记录
- `is_sync` 字段应该是 `true`

---

### 测试 2：从 Word-Base 到 Word-Picker2 同步

**步骤：**
1. 在 Word-Base 中添加几个新单词（添加到"默认"单词本）
2. 打开 Word-Picker2 插件
3. 使用相同账号登录
4. 等待 3-5 分钟（或刷新插件触发同步）

**验证：**
- Word-Picker2 应该能看到刚才添加的单词

---

### 测试 3：从 Word-Picker2 到 Word-Base 同步

**步骤：**
1. 在 Word-Picker2 中选择任意网页上的单词
2. 保存到"默认"单词本
3. 回到 Word-Base
4. 刷新页面

**验证：**
- Word-Base 应该能看到刚才在插件中添加的单词

---

### 测试 4：单词本操作同步

**步骤：**
1. 在 Word-Base 中创建一个新单词本
2. 在 Word-Picker2 中刷新，应该能看到新单词本
3. 在 Word-Base 中更新单词本的名称
4. 在 Word-Picker2 中刷新，应该看到名称已更新
5. 在 Word-Base 中删除单词本
6. 在 Word-Picker2 中刷新，单词本应该消失

---

### 测试 5：删除操作同步

**步骤：**
1. 在 Word-Base 中删除一个单词
2. 在 Word-Picker2 中刷新，该单词应该消失
3. 在 Word-Picker2 中删除一个单词
4. 在 Word-Base 中刷新，该单词应该消失

---

## 📊 检查同步变更日志

在 Supabase Table Editor 中查看 `sync_changelogs` 表：

- 应该看到 `entity_type` 为 "book" 或 "word" 的记录
- `action` 字段为 "create"、"update" 或 "delete"
- `sync_version` 应该严格递增
- 所有操作都有正确的 `user_id`

---

## 🔧 故障排查

### 问题：同步不工作

**检查清单：**
1. 确认两个应用都使用相同的 Supabase 项目
2. 确认用户已在两边登录
3. 检查浏览器控制台是否有错误
4. 检查 `sync_changelogs` 表是否有记录

### 问题：无法登录

**检查清单：**
1. 确认 .env 文件中的 Supabase 配置正确
2. 确认 Supabase 项目中的 Email 认证已启用
3. 检查用户是否已在 Supabase 中创建

---

## 📝 注意事项

1. **同步间隔**：默认每 3 分钟同步一次，可通过刷新强制同步
2. **软删除**：删除操作是软删除（`is_deleted` = true）
3. **同步单词本**：只有 `isSync` = true 的单词本会被用于添加新单词
4. **网络断开**：离线时所有操作会在本地暂存，网络恢复后自动同步

---

## ✅ 验收标准

- [ ] 注册时自动创建默认单词本
- [ ] 从 Word-Base 添加单词，Word-Picker2 能看到
- [ ] 从 Word-Picker2 添加单词，Word-Base 能看到
- [ ] 单词本操作双向同步
- [ ] 删除操作双向同步
- [ ] sync_changelogs 表记录完整
