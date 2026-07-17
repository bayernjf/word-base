# WordBase 上架商店就绪度评估

> **用途**：供 AI coding agent 和开发者快速了解项目各端的上架差距，避免每次重复扫描。
>
> **更新规则**：修复某个项后，将对应 checkbox 标记为 `[x]` 并在「更新日志」追加一行。新增功能或发现新问题时，同步更新对应模块。
>
> **评估日期**：2026-07-17 · 评估分支：当前工作分支

---

## 总览

| 维度 | 就绪度 | 结论 |
|------|--------|------|
| 功能完整性 | 🟢 70% | 核心学习闭环完整，练习中心是 mock |
| 合规性与安全 | 🟡 65% | RLS/加密规范，隐私政策已上线，缺限流 |
| 代码质量 | 🟡 65% | 类型安全，测试覆盖率低，主组件过大 |
| 桌面端上架 | 🟡 70% | 可 GitHub Release 分发，进官方商店缺签名公证 |
| 移动端上架 | 🔴 40% | 缺签名、缺素材、练习 mock 会被拒 |
| Web 端上线 | 🟢 100% | 隐私政策 ✓ 服务条款 ✓ 账号删除 ✓ 注册同意 ✓ |

---

## 一、功能完整性 🟢 70%

### 已实现的核心功能

| 模块 | 完成度 | 关键文件 |
|------|--------|----------|
| 用户认证 | 🟢 90% | [api/index.ts](file:///Users/jiangfeng/000mycodes/word-base/packages/api/src/index.ts) — 注册/登录/登出/Token刷新/注销/密码重置 |
| 生词本管理 | 🟢 90% | 多单词本、单词 CRUD、批量操作、语境记录 |
| AI 增强 | 🟢 85% | enrich/explain/sense-cluster/translate/批量自动 AI |
| SRS 间隔复习 | 🟡 75% | [shared/lib/srs.ts](file:///Users/jiangfeng/000mycodes/word-base/shared/lib/srs.ts) — 算法完整，Review 视图可用 |
| 云同步 | 🟢 80% | 全量同步、批量上传/删除、sync_version 版本控制 |
| AI 智能句景 | 🟢 80% | 故事生成 + AI 导师对话，带每日限流（20条/天） |
| 多端支持 | 🟡 70% | Web/Desktop 完整，Mobile 基础可用 |
| 设置中心 | 🟢 85% | 账号/外观/AI 模型/同步存储/关于 |

### 功能缺口

#### 🔴 练习中心（听说读写）— 20% 完成度

| 子模块 | 状态 | 说明 |
|--------|------|------|
| 听力训练 | 🔴 Mock | mockData + 假进度条，无真实音频/TTS |
| 口语训练 | 🔴 Mock | Math.random() 假打分 + 假声波，无录音/语音识别 |
| 阅读理解 | 🔴 Mock | 文章和高亮词写死在组件里 |
| 写作评估 | 🔴 Mock | setTimeout 模拟 + 写死反馈，无真实 AI 批改 |

**处理方案**（二选一）：
- A：补全真实实现（TTS / ASR / AI 批改 / 动态文章）
- B：暂时隐藏入口，标注「即将推出」，避免商店审核被拒

---

## 二、合规性与安全 🟡 60%

### 做得好的方面

| 项 | 状态 | 说明 |
|----|------|------|
| 数据行级安全（RLS） | ✅ | [002_security_policies.sql](file:///Users/jiangfeng/000mycodes/word-base/supabase/migrations/002_security_policies.sql) — 所有核心表启用 RLS |
| AI 密钥加密 | ✅ | [crypto.ts](file:///Users/jiangfeng/000mycodes/word-base/packages/api/src/utils/crypto.ts) — AES-256-GCM + 随机 IV + auth tag |
| Tauri 权限最小化 | ✅ | [capabilities/default.json](file:///Users/jiangfeng/000mycodes/word-base/apps/desktop/src-tauri/capabilities/default.json) — 仅 say/powershell shell |
| CORS 非全开 | ✅* | 已从 `*` 改为回显 Origin（仍非白名单模式） |
| 账号注销 | ✅ | `/api/v1/auth/delete-account` |
| 移动端权限描述 | ✅ | 通知/语音识别/麦克风均有 UsageDescription |

### 合规风险与缺口

| 风险 | 严重度 | 说明 |
|------|--------|------|
| 无隐私政策页面 | ✅ 已解决 | 独立页面 `/privacy` + 应用内「设置-关于-隐私政策」+ landing 页脚链接 |
| 无服务条款 | ✅ 已解决 | 独立双语页面 `/terms` + landing 页脚链接 + 注册同意入口 |
| 无站外账号删除入口 | ✅ 已解决 | 独立双语页面 `/delete-account` + landing 页脚链接 + 隐私政策说明 |
| 注册无明确同意 | ✅ 已解决 | 注册前必须主动勾选隐私政策和服务条款 |
| CORS 非白名单 | 🟠 P1 | 回显任意 Origin，生产应使用白名单校验 |
| AI 接口无限流 | 🔴 P0 | enrich/explain/translate/sense-cluster 无用户级限流 |
| AI 生成内容无审核 | 🟠 P1 | 故事/释义无内容过滤 |
| 加密主密钥无轮换方案 | 🟠 P1 | AI_CONFIG_ENCRYPTION_KEY 丢失则不可解密 |
| 无错误监控 | 🟡 P2 | 前后端均无 Sentry 类监控 |

---

## 三、代码质量 🟡 65%

### 优点

| 项 | 状态 |
|----|------|
| TypeScript 全栈类型安全 | ✅ |
| Monorepo 架构清晰 | ✅ shared + packages + apps |
| 单元测试存在 | ✅ 4 个测试文件（SRS/AI enrich/AI provider/aiUtils） |
| 测试运行器 | ✅ Vitest 已配置 |
| CI/CD | ✅ GitHub Actions 完整 |
| 统一 logger | ✅ |

### 待改进

| 项 | 现状 | 影响 |
|----|------|------|
| 测试覆盖率低 | 仅 4 个测试文件 | 核心业务逻辑无回归保护 |
| API 输入校验弱 | 仅 String() 转换，无 schema 校验 | 恶意输入风险 |
| 全局错误处理 | 各 try-catch 返回统一 internal_server_error | 排障困难 |
| 无 E2E 测试 | 完全没有 | UI 回归无保障 |
| AppSupabase 过大 | 1000+ 行单组件 | 可维护性差 |
| 前端无 URL 路由 | 纯 state 驱动 activeView | 无法分享链接、SEO 差 |

---

## 四、各端上架差距

### 桌面端（macOS / Windows）— 🟡 70%

| 上架项 | 状态 | 说明 |
|--------|------|------|
| Tauri 打包配置 | ✅ | DMG + NSIS |
| 应用签名 | ⚠️ | TAURI_SIGNING_PRIVATE_KEY 已配置，无 Apple 公证/微软签名 |
| 自动更新 | ✅ | tauri-plugin-updater |
| macOS 公证 | ❌ | 未公证的 DMG 用户打开会报「恶意软件」警告 |
| Windows 代码签名 | ❌ | 无 EV/OV 证书，SmartScreen 会警告 |
| 隐私政策 | ✅ | 应用内「设置-关于-隐私政策」+ 独立页面 `/privacy` |
| Mac App Store 配置 | ❌ | 无 sandbox / receipt 验证 |

**结论**：可 GitHub Release 分发，进 Mac App Store / Microsoft Store 差距大。

### 移动端（iOS / Android）— 🔴 40%

| 上架项 | 状态 | 说明 |
|--------|------|------|
| 基础构建 | ✅ | CI 可打 debug APK / iOS Simulator 包 |
| Android 签名 | ❌ | 仅 debug build，无 release keystore |
| iOS 签名 | ❌ | Simulator build，CODE_SIGNING_ALLOWED=NO |
| 隐私政策 | ✅ | 应用内「设置-关于-隐私政策」+ 独立页面 `/privacy` |
| 应用截图/预览 | ❌ | 无商店素材 |
| App Store 元数据 | ❌ | 描述/关键词/分级未准备 |
| Google Play 元数据 | ❌ | 同上 |
| 功能完整度 | 🔴 | 练习中心 mock，审核大概率被拒 |

**结论**：缺口最大，需补功能 + 签名 + 商店素材。

### Web 端 — 🟢 100%

| 上架项 | 状态 |
|--------|------|
| Vercel + Cloudflare 部署 | ✅ |
| 自定义域名 | ⚠️ word-base.pages.dev |
| Landing 页 | ✅ |
| SEO | 🟡 CSR 应用，SEO 较弱 |
| 隐私政策 | ✅ | 独立页面 `/privacy` + landing 页脚 + 应用内入口 |
| 服务条款 | ✅ | 独立双语页面 `/terms` + landing 页脚 + 注册同意入口 |
| 站外账号删除 | ✅ | 独立双语页面 `/delete-account` + landing 页脚 + 隐私政策说明 |
| 注册同意 | ✅ | 注册前必须主动勾选隐私政策和服务条款 |

**结论**：Web 端合规已全部补齐，达到上线标准。

---

## 五、上架前必办清单

### P0 — 阻塞上架

- [ ] 补全或下线练习中心 mock 功能
- [x] 添加隐私政策页面（Web `/privacy` + 应用内关于页链接 + landing 页脚）
- [x] 添加服务条款页面（Web `/terms` + landing 页脚链接 + 注册同意入口）
- [x] 添加站外账号删除页面（Web `/delete-account` + landing 页脚链接 + 隐私政策说明）
- [x] 注册表单添加同意勾选框（未勾选禁止注册）
- [ ] AI 接口加全局限流（enrich/explain/translate/sense-cluster）
- [ ] 移动端 release 签名配置（Android keystore + iOS provisioning）

### P1 — 强烈建议

- [ ] 桌面端代码签名与公证（macOS Apple Developer ID + Windows EV/OV 证书）
- [ ] CORS 白名单化
- [ ] AI 内容审核过滤
- [ ] 加密密钥轮换方案

### P2 — 体验优化

- [ ] 测试覆盖率提升
- [ ] 错误监控接入（Sentry）
- [ ] URL 路由（React Router）
- [ ] AppSupabase 组件拆分
- [ ] 商店素材准备（截图/描述/关键词/分级）

---

## 六、更新日志

| 日期 | 更新内容 | 更新人 |
|------|----------|--------|
| 2026-07-17 | 补齐上线合规：双语服务条款、站外账号删除说明、注册同意勾选框、页脚法律入口；修正隐私政策与实际数据处理一致性 | AI Agent |
| 2026-07-17 | 补齐 Web 端隐私政策：独立 `/privacy` 页面、应用内「设置-关于」入口、landing 页 footer 链接；Web 端就绪度提升至 95% | AI Agent |
| 2026-07-17 | 初始评估，基于当前工作分支全量扫描 | AI Agent |

<!-- 更新格式：
| YYYY-MM-DD | 简述改了什么模块/勾选了什么项 | 名字 |
-->
