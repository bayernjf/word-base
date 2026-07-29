# word-base 生产上线就绪度评估

> 评判标准：真实投入生产（公网部署 + 多用户使用）的工程标准，而非"本地能 demo"。
>
> 生成日期：2026-06-27 · 最近更新：2026-07-30（P0 安全：CORS 白名单 + AI 限流/配额 + 密钥轮换 + Playwright E2E 冒烟） · 评估对象：当前 `feature/20260604` 分支
>
> 技术栈：React 19 + Vite 6 + TypeScript + Tailwind 4 + Supabase（Auth/Postgres/RLS） + Hono（AI 代理 + 同步 API） + Google GenAI / 自定义 AI Provider

---

## 总览

| 模块 | 就绪度 | 结论 |
|---|---|---|
| 认证与账号 | 🟢 85% | 基于 Supabase Auth，较扎实 |
| 生词本与数据存储 | 🟢 90% | 核心 CRUD + 同步完整 |
| 多设备云同步 | 🟢 80% | 队列 + changelog 设计完整 |
| AI 增强（释义/义项/深度解释） | 🟢 85% | 真实可用，已接 provider |
| AI 智能句景（故事 + 导师） | 🟢 80% | 真实，带限流 |
| SRS 间隔复习 | 🟢 80% | 逻辑真实，20 个单测用例覆盖边界场景 |
| 练习模块（听/说/读/写） | 🟡 75% | 已 AI 化（生成 + 评估 + 限流），待联调验证 |
| AI Provider 配置与密钥安全 | 🟢 85% | AES-256-GCM 加密，规范 |
| 工程质量保障 |  80% | vitest + CI 四端 tsc 卡点、zod 入参校验、结构化日志、Sentry 错误监控（env 门控）、Playwright E2E 冒烟测试已接入 |
| 部署与运维 | 🟡 70% | 已上 Cloudflare + Vercel，CORS 白名单 + AI 限流 + Sentry 监控就位，缺跨实例内存态方案 |

**结论**：**词汇学习核心闭环（登录→生词本→AI 增强→云同步→间隔复习→智能句景）已经是真实可用的产品级功能**，完成度高。练习中心（听说读写）已于 2026-07-30 完成 AI 化改造（不再是 mock），剩联调与真机验证；工程化基础（vitest + Playwright E2E + CI）已补齐，但测试覆盖率、限流、监控仍距生产标准有差距。

---

## 模块一：认证与账号 🟢 85%

| 功能点 | 状态 | 说明 |
|---|---|---|
| 注册 / 登录 / 登出 | ✅ | Supabase Auth，`/api/v1/auth/*` |
| Token 刷新 | ✅ | `/api/v1/auth/refresh` |
| 注销账号 | ✅ | `/api/v1/auth/delete-account` |
| 个人资料（昵称 / 头像 / 主题偏好） | ✅ | `profiles` 表 + 迁移 009 |
| 行级安全（RLS） | ✅ | 002 安全策略 + user-scoped client |

**风险**：
- 🟠 注册无邮箱验证 / 无密码强度校验（取决于 Supabase 项目配置，需确认生产开关）。
- 🟠 无登录失败限流，存在撞库 / 暴力破解面（依赖 Supabase 默认保护，需确认）。

---

## 模块二：生词本与数据存储 🟢 90%

| 功能点 | 状态 |
|---|---|
| 单词增删改查 | ✅ |
| 多生词本（books）+ 默认本触发器 | ✅ 迁移 003 |
| 唯一同步本约束 | ✅ 迁移 004 |
| 语境（contexts）+ 来源链接 / XPath 范围 | ✅ |
| 词形、音标、词性、释义、例句、同义词 | ✅ |
| 单词移动 / 批量操作 | ✅ |

完成度最高的模块之一，可上生产。

---

## 模块三：多设备云同步 🟢 80%

| 功能点 | 状态 | 说明 |
|---|---|---|
| 同步状态 / 增量 / 全量 | ✅ | `/api/v1/sync/{status,changes,full}` |
| 批量上传 / 批量删除 | ✅ | `/api/v1/words/{batch,batch-delete}` |
| 变更日志版本号（changelog） | ✅ | `recordChange` 递增 sync_version |
| 与浏览器扩展（word-picker2）打通 | ✅ | 同一套 API |

**风险**：
- 🟠 `recordChange` 取 `lastChange[0]` 但查询失败时无回退，并发写入可能 sync_version 撞号（无唯一约束兜底时存在丢日志风险）。
- 🟠 全量同步整表覆盖，跨设备并发缺乏字段级冲突合并。

---

## 模块四：AI 增强 🟢 85%

| 功能点 | 状态 | 说明 |
|---|---|---|
| AI 释义丰富（enrich） | ✅ | `/api/v1/ai/enrich` |
| AI 深度解释（explain） | ✅ | `/api/v1/ai/explain` + 迁移 011 |
| 多语境义项分离（sense-cluster） | ✅ | `/api/v1/ai/sense-cluster` + 迁移 013 |
| 记忆提示（memory tip） | ✅ | 迁移 010 |
| 语境翻译 | ✅ | `/api/v1/ai/translate` |
| 批量 / 自动 AI 处理 | ✅ | `batchAiStore` + 全失败提示 |
| 失败反馈 | ✅ | 各入口均有错误反馈（近期已加强） |

**风险**：
- 🟠 AI 接口仅 story 有每日限流（`STORY_DAILY_LIMIT`），**enrich/explain/translate 等无限流**，恶意用户可刷爆第三方 AI 配额、产生费用。
- 🟠 AI 请求超时 120s，无并发上限，高并发下 Express 单进程易被打满。

---

## 模块五：AI 智能句景（故事 + 导师）🟢 80%

| 功能点 | 状态 | 说明 |
|---|---|---|
| 生成精读文章（主题 / 生词本选词） | ✅ | `/api/v1/ai/story-generate` |
| 每日生成限流 | ✅ | `story_generation_quota` + 迁移 014 |
| AI 导师对话（带文章上下文） | ✅ | `/api/v1/ai/tutor-chat` |
| 故事库管理（切换 / 删除） | ✅ | `useStories` |
| 双主题适配 | ✅ | 近期已完成 |

**风险**：
- 🟠 导师对话非流式，长回复体验等待久。
- 🟠 生成内容无审核，AI 可能产出不当文本（生产面向多用户需加内容过滤）。

---

## 模块六：SRS 间隔复习 🟢 80%

| 功能点 | 状态 | 说明 |
|---|---|---|
| 间隔重复算法（ease/interval/next_review） | ✅ | `lib/srs.ts` + 迁移 005 |
| 到期词筛选 `getDueWords` | ✅ | |
| 遇见熟悉度合并 `mergeEncounterFamiliarity` | ✅ | |
| 复习视图 ReviewView | ✅ | |
| 遇见曲线 EncounterCurve | ✅ | |

**风险**：
- 🟡 已改写为 vitest 套件并纳入根 `vitest.config.ts`（20 个用例：ease 下限、NaN 归一化、quality 全档位、遇见分封顶/跨度封顶、无时间戳退化等）；CI 跑 `vitest run` 即可卡点。

---

## 模块七：练习中心（听 / 说 / 读 / 写）🟡 75%

> 2026-07-30 完成 AI 化改造：新增 `POST /api/v1/ai/practice/generate`（统一内容生成）与 `POST /api/v1/ai/practice/evaluate`（写作批改 + 口语评分），基于用户生词本选词（最多 8 个），支持难度 B1/B2/C1，每日限流 20 次（`practice_generation_quota` 表 + 迁移 019）。共享层 `shared/lib/practice.ts` 提供类型、API 客户端与 5 分钟内存缓存。

| 功能点 | 状态 | 说明 |
|---|---|---|
| 听力训练 | 🟢 已实现 | AI 生成听力短文 + 时间轴字幕 + 理解题，TTS 播放与字幕联动 |
| 口语训练 | 🟢 已实现 | AI 生成跟读场景，Web Speech API（ASR）录音转写 + evaluate API 词级发音反馈 |
| 阅读理解 | 🟢 已实现 | AI 动态生成文章 + 高亮词汇释义 + 理解题，带 loading/error/retry 状态 |
| 写作评估 | 🟢 已实现 | AI 生成写作提示 + 建议词汇，提交后 AI 评分（0-100）+ CEFR 等级 + 语法/词汇/风格反馈 |
| 练习主页卡片 | ✅ | `isReady` 状态（需 AI 模型 + 有生词），移除假进度条 |

**剩余风险**：
- 🟠 前后端尚未完整联调；迁移 `019_practice_quota.sql` 需在生产 Supabase 执行。
- 🟠 口语 ASR 依赖 Web Speech API（仅 Chrome/Edge），移动端降级方案未确认，需真机测试。
- 🟡 内容缓存为纯内存 Map，刷新即失效，可后续优化。

---

## 模块八：AI Provider 配置与密钥安全 🟢 85%

| 功能点 | 状态 | 说明 |
|---|---|---|
| 多 Provider（OpenAI/Anthropic/兼容/Gemini） | ✅ | 迁移 006/007/008 |
| API Key 加密存储 | ✅ | **AES-256-GCM + 随机 IV + auth tag**，实现规范 |
| 测试连接 | ✅ | `/api/v1/ai/providers/test`（近期已加） |
| 增删改查 | ✅ | |

**风险**：
- 🔴 加密主密钥 `AI_CONFIG_ENCRYPTION_KEY` 走环境变量，**一旦丢失或更换，所有已存密钥不可解密**；需要密钥轮换方案与备份策略。
- 🟠 密钥派生用 `sha256(secret)` 单次哈希，建议用 KDF（scrypt/PBKDF2）增强；当前可接受但非最佳实践。

---

## 模块九：工程质量保障 🟢 80%

| 项 | 状态 | 说明 |
|---|---|---|
| TypeScript 类型检查 | ✅ | 四端 `tsc --noEmit`，CI 已卡点（`ci.yml` 四端 typecheck + api build） |
| 单元测试文件 | ✅ | srs/aiEnrich/aiProviderConfigs/aiUtils/practice/apiBase/apiValidation/apiSecurity 共 80 用例 |
| 测试运行器 | ✅ | vitest 已配置，include 覆盖 `tests/**` + `shared/**`，exclude e2e |
| API 输入校验 | ✅ | zod schema（`packages/api/src/utils/validation.ts`）覆盖 auth + 全部 AI 端点，错误码向后兼容 |
| E2E 冒烟测试 | ✅ | Playwright Chromium，覆盖 landing/app/privacy/terms 静态页面加载（`tests/e2e/smoke.spec.ts`） |
| CI | ✅ | GitHub Actions（`ci.yml`：lint + 四端 typecheck + test + api/web build + e2e） |
| 错误监控 / 上报 | ✅ | 前后端 Sentry env 门控接入（api `utils/monitoring.ts` 在 `app.onError` 上报；web `src/monitoring.ts` 动态 import，未配 DSN 时零成本惰性），配 `SENTRY_DSN`/`NEXT_PUBLIC_SENTRY_DSN` 即生效 |
| 日志 | ✅ | 前端统一 logger + 环形缓冲；后端结构化 JSON 日志（`utils/logger.ts`）+ `app.onError` 兜底 |

**现状**：单测 80 用例、Playwright E2E 冒烟 4 用例、CI 四端卡点、API 入参校验、结构化日志、Sentry 错误监控（env 门控）已就位。

---

## 模块十：部署与运维 🟡 70%

| 项 | 状态 | 说明 |
|---|---|---|
| 后端框架 | ✅ | Hono（本地 @hono/node-server，生产 Vercel Serverless） |
| 部署 | ✅ | Cloudflare Pages（静态前端）+ Vercel（API），main/dev 环境隔离 |
| CORS | ✅ | 白名单模式（`utils/cors.ts`）：生产/预览域名 + Tauri + 本地开发 + 插件来源，未命中不下发 CORS 头，`ALLOWED_ORIGINS` 可追加 |
| 限流 / 防刷 | ✅ | story/practice 每日配额 + AI 轻量端点（enrich/explain/translate/sense-cluster/tutor-chat）内存固定窗口限流 + `ai_call_quota` 每日配额（迁移 020） |
| 密钥 / 环境变量管理 | ✅ | 三份 `.env`，生产走平台 secrets；`AI_CONFIG_ENCRYPTION_KEY` 有备份/轮换方案（`docs/KEY_ROTATION.md` + `scripts/rotate-ai-config-key.mjs`） |
| 健康检查 | ✅ | `/api/v1/health` |
| 错误监控 | ✅ | 前后端 Sentry env 门控接入（未配 DSN 时惰性），配 `SENTRY_DSN`/`NEXT_PUBLIC_SENTRY_DSN` 即生效 |
| 进程管理 / 水平扩展 | 🟡 | Vercel Serverless 天然多实例，但内存态（练习缓存等）不跨实例 |
| HTTPS / 反代 | ✅ | Cloudflare `_worker.js` 反代 `/api/*` → Vercel |

---

## 上线前必办清单（按优先级）

### P0（阻塞，不做无法面向多用户上线）

- [x] 收敛 CORS 来源白名单（2026-07-30：`utils/cors.ts` 白名单模式，未命中不下发 CORS 头，`ALLOWED_ORIGINS` 可追加）
- [x] 后端地址 / Supabase 配置环境化（`apiBase.ts` 按平台自动解析，生产走 Cloudflare/Vercel）
- [x] 给 AI 接口（enrich/explain/translate/sense-cluster/tutor-chat）加全局限流与每用户配额（2026-07-30：内存固定窗口 + `ai_call_quota` 每日配额，需执行迁移 020）
- [x] 练习中心四个 mock 模块：已 AI 化改造（2026-07-30），剩联调 + 真机验证 + 执行迁移 019
- [x] `AI_CONFIG_ENCRYPTION_KEY` 制定备份 + 轮换方案（2026-07-30：`docs/KEY_ROTATION.md` 流程 + 幂等轮换脚本）

### P1（强烈建议）

- [x] 引入 vitest + `test` 脚本，并接 CI（lint + 四端 typecheck + test + api/web build 卡点，`ci.yml`）
- [x] 补 SRS 算法、AI payload 解析的单元测试回归保护（2026-07-30：shared/lib 测试纳入 vitest，SRS 20 用例含边界场景）
- [x] API 请求体 zod 校验 + 后端统一错误收口（2026-07-30：auth/AI/practice 端点全覆盖，`app.onError` 兜底，结构化 JSON 日志替换 console.*）
- [x] 接前后端错误监控（Sentry）（2026-07-30：env 门控接入 api/web，未配 DSN 时惰性，配 `SENTRY_DSN`/`NEXT_PUBLIC_SENTRY_DSN` 即生效）
- [ ] 确认 Supabase 生产配置：邮箱验证、密码强度、登录限流
- [ ] 后端内存态（练习缓存等）跨实例方案，或确认 Serverless 实例行为可接受

### P2（功能完善 / 体验）

- [x] 练习中心真实化：听力 TTS、口语录音+ASR、阅读动态文章、写作 AI 批改（2026-07-30）
- [ ] 口语 ASR 移动端降级方案（Web Speech API 仅 Chrome/Edge）
- [ ] AI 导师对话改流式输出
- [ ] AI 生成内容审核 / 过滤
- [ ] 同步字段级冲突合并，sync_version 加唯一约束防撞号

---

## 备注

- 本文档为静态评估快照，随代码演进需更新（最近更新：2026-07-30，部署 P0：CORS 白名单 + AI 限流/每日配额（迁移 020） + 密钥轮换方案 + 80 个单测用例 + Playwright E2E 冒烟）。
- 待执行的运维动作：在 Supabase 执行迁移 019（练习配额）与 020（AI 调用配额）；如需收紧限流阈值可调 `utils/rateLimit.ts` 参数。
