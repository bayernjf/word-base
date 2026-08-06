# WordBase 上架商店就绪度评估

> **用途**：供 AI coding agent 和开发者快速了解项目各端的上架差距，避免每次重复扫描。
>
> **更新规则**：修复某个项后，将对应 checkbox 标记为 `[x]` 并在「更新日志」追加一行。新增功能或发现新问题时，同步更新对应模块。
>
> **评估日期**：2026-07-30 · 评估分支：`feature/20260604`

---

## 总览

| 维度 | 就绪度 | 结论 |
|------|--------|------|
| 功能完整性 | 🟢 85% | 核心学习闭环完整，练习中心已 AI 化（待联调验证） |
| 合规性与安全 | 🟢 80% | RLS/加密规范，隐私政策已上线，CORS 白名单 + AI 限流已就位 |
| 代码质量 | 🟢 80% | 类型安全，109 单测 + E2E，API Zod 校验，AppSupabase 已拆分 |
| 桌面端上架 | 🟡 70% | 可 GitHub Release 分发，进官方商店缺签名公证 |
| 移动端上架 | 🔴 45% | 缺签名、缺素材；练习功能需真机验证（ASR 依赖 Web Speech API） |
| Web 端上线 | 🟢 100% | 隐私政策 ✓ 服务条款 ✓ 账号删除 ✓ 注册同意 ✓ |

---

## 一、功能完整性 🟢 85%

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
| 练习中心 | 🟡 75% | 四模块已 AI 化（`/api/v1/ai/practice/{generate,evaluate}`），待联调与真机验证 |

### 功能缺口

#### 🟡 练习中心（听说读写）— 75% 完成度（2026-07-30 AI 化改造完成）

| 子模块 | 状态 | 说明 |
|--------|------|------|
| 听力训练 | 🟢 已实现 | AI 生成听力短文 + 时间轴字幕 + 理解题，TTS 播放联动 |
| 口语训练 | 🟢 已实现 | AI 生成跟读场景，Web Speech API（ASR）录音转写 + evaluate API 发音评估 |
| 阅读理解 | 🟢 已实现 | 基于用户生词本 AI 动态生成文章 + 高亮词汇 + 理解题 |
| 写作评估 | 🟢 已实现 | AI 生成写作提示，提交后 AI 批改（评分 + CEFR 等级 + 反馈） |

所有生成走用户已配置的 AI Provider，每日限流 20 次（`practice_generation_quota` 表 + 迁移 019）。

**剩余风险**：
- 🟠 前后端尚未完整联调；迁移 `019_practice_quota.sql` 需在生产 Supabase 执行
- 🟠 口语 ASR 依赖 Web Speech API（仅 Chrome/Edge），移动端降级方案未确认，需真机测试

---

## 二、合规性与安全 🟢 80%

### 做得好的方面

| 项 | 状态 | 说明 |
|----|------|------|
| 数据行级安全（RLS） | ✅ | [002_security_policies.sql](file:///Users/jiangfeng/000mycodes/word-base/supabase/migrations/002_security_policies.sql) — 所有核心表启用 RLS |
| AI 密钥加密 | ✅ | [crypto.ts](file:///Users/jiangfeng/000mycodes/word-base/packages/api/src/utils/crypto.ts) — AES-256-GCM + 随机 IV + auth tag |
| Tauri 权限最小化 | ✅ | [capabilities/default.json](file:///Users/jiangfeng/000mycodes/word-base/apps/desktop/src-tauri/capabilities/default.json) — 仅 say/powershell shell |
| CORS 白名单 | ✅ | `utils/cors.ts` 白名单模式，未命中不下发 CORS 头 |
| AI 接口限流 | ✅ | 内存固定窗口（每用户 20/分、全局 120/分）+ `ai_call_quota` 每日 300 次配额 |
| 密钥轮换方案 | ✅ | `docs/KEY_ROTATION.md` + `scripts/rotate-ai-config-key.mjs` |
| 错误监控 | ✅ | 前后端 Sentry env 门控接入，配 DSN 即生效 |
| 账号注销 | ✅ | `/api/v1/auth/delete-account` |
| 移动端权限描述 | ✅ | 通知/语音识别/麦克风均有 UsageDescription |

### 合规风险与缺口

| 风险 | 严重度 | 说明 |
|------|--------|------|
| 无隐私政策页面 | ✅ 已解决 | 独立页面 `/privacy` + 应用内「设置-关于-隐私政策」+ landing 页脚链接 |
| 无服务条款 | ✅ 已解决 | 独立双语页面 `/terms` + landing 页脚链接 + 注册同意入口 |
| 无站外账号删除入口 | ✅ 已解决 | 独立双语页面 `/delete-account` + landing 页脚链接 + 隐私政策说明 |
| 注册无明确同意 | ✅ 已解决 | 注册前必须主动勾选隐私政策和服务条款 |
| CORS 非白名单 | ✅ 已解决 | 已改为白名单模式（`utils/cors.ts`） |
| AI 接口无限流 | ✅ 已解决 | 内存固定窗口 + 每日配额（迁移 020） |
| AI 生成内容无审核 | 🟠 P1 | 故事/释义无内容过滤 |
| 加密主密钥无轮换方案 | ✅ 已解决 | `docs/KEY_ROTATION.md` + 幂等轮换脚本 |
| 无错误监控 | ✅ 已解决 | Sentry env 门控接入（api + web） |

---

## 三、代码质量 🟢 80%

### 优点

| 项 | 状态 |
|----|------|
| TypeScript 全栈类型安全 | ✅ |
| Monorepo 架构清晰 | ✅ shared + packages + apps |
| 单元测试 | ✅ 9 个测试文件，109 用例（vitest） |
| E2E 测试 | ✅ Playwright Chromium（冒烟 + 认证流程） |
| API 输入校验 | ✅ Zod schema 全覆盖 |
| 测试运行器 | ✅ Vitest + Playwright |
| CI/CD | ✅ GitHub Actions 完整（5 个 workflow） |
| 统一 logger | ✅ 前端结构化 + 环形缓冲；后端 JSON 日志 |
| 错误监控 | ✅ Sentry env 门控接入 |
| AppSupabase 拆分 | ✅ 已提取 4 个独立 hooks，主组件 ~747 行 |

### 待改进

| 项 | 现状 | 影响 |
|----|------|------|
| 测试覆盖率 | 109 单测 + E2E 冒烟，但业务组件无测试 | 组件级回归无保障 |
| 前端无 URL 路由 | 纯 state 驱动 activeView | 无法分享链接、SEO 差 |
| API 集成测试缺失 | 无端点级测试 | 接口回归无保障 |

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
| 功能完整度 | 🟡 | 练习中心已 AI 化，但 ASR 依赖 Web Speech API，移动端可用性需真机验证 |

**结论**：缺口最大，需补签名 + 商店素材 + 练习功能真机验证。

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

- [x] 补全或下线练习中心 mock 功能（2026-07-30 四模块 AI 化完成，剩联调 + 真机验证）
- [x] 添加隐私政策页面（Web `/privacy` + 应用内关于页链接 + landing 页脚）
- [x] 添加服务条款页面（Web `/terms` + landing 页脚链接 + 注册同意入口）
- [x] 添加站外账号删除页面（Web `/delete-account` + landing 页脚链接 + 隐私政策说明）
- [x] 注册表单添加同意勾选框（未勾选禁止注册）
- [x] AI 接口加全局限流（2026-07-30：内存固定窗口 + `ai_call_quota` 每日配额，迁移 020）
- [ ] 移动端 release 签名配置（Android keystore + iOS provisioning）

### P1 — 强烈建议

- [ ] 桌面端代码签名与公证（macOS Apple Developer ID + Windows EV/OV 证书）
- [x] CORS 白名单化（2026-07-30：`utils/cors.ts` 白名单模式）
- [ ] AI 内容审核过滤
- [x] 加密密钥轮换方案（2026-07-30：`docs/KEY_ROTATION.md` + 幂等轮换脚本）

### P2 — 体验优化

- [x] 测试覆盖率提升（2026-07-30：109 单测 + Playwright E2E）
- [x] 错误监控接入（2026-07-30：Sentry env 门控，api + web）
- [ ] URL 路由（React Router）
- [x] AppSupabase 组件拆分（2026-07-30：提取 useAiModels/useProfile/useAutoAi/useBookActions 4 个 hooks）
- [ ] 商店素材准备（截图/描述/关键词/分级）

---

## 六、更新日志

| 日期 | 更新内容 | 更新人 |
|------|----------|--------|
| 2026-07-31 | 同步已完成项：CORS 白名单、AI 限流、Sentry 监控、密钥轮换、AppSupabase 拆分、E2E 测试、API Zod 校验；合规性 65%→80%，代码质量 65%→80% | AI Agent |
| 2026-07-30 | 练习中心（听/说/读/写）AI 化改造完成：新增 practice generate/evaluate API + 每日限流 + 迁移 019；功能完整性 70%→85%，移动端 40%→45%；勾选 P0「补全练习中心」 | AI Agent |
| 2026-07-17 | 补齐上线合规：双语服务条款、站外账号删除说明、注册同意勾选框、页脚法律入口；修正隐私政策与实际数据处理一致性 | AI Agent |
| 2026-07-17 | 补齐 Web 端隐私政策：独立 `/privacy` 页面、应用内「设置-关于」入口、landing 页 footer 链接；Web 端就绪度提升至 95% | AI Agent |
| 2026-07-17 | 初始评估，基于当前工作分支全量扫描 | AI Agent |

<!-- 更新格式：
| YYYY-MM-DD | 简述改了什么模块/勾选了什么项 | 名字 |
-->
