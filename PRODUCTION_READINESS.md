# word-base 生产上线就绪度评估

> 评判标准：真实投入生产（公网部署 + 多用户使用）的工程标准，而非"本地能 demo"。
>
> 生成日期：2026-06-27 · 评估对象：当前 `feature/20260604` 分支
>
> 技术栈：React 19 + Vite 6 + TypeScript + Tailwind 4 + Supabase（Auth/Postgres/RLS） + Express（AI 代理 + 同步 API） + Google GenAI / 自定义 AI Provider

---

## 总览

| 模块 | 就绪度 | 结论 |
|---|---|---|
| 认证与账号 | 🟢 85% | 基于 Supabase Auth，较扎实 |
| 生词本与数据存储 | 🟢 90% | 核心 CRUD + 同步完整 |
| 多设备云同步 | 🟢 80% | 队列 + changelog 设计完整 |
| AI 增强（释义/义项/深度解释） | 🟢 85% | 真实可用，已接 provider |
| AI 智能句景（故事 + 导师） | 🟢 80% | 真实，带限流 |
| SRS 间隔复习 | 🟡 70% | 逻辑真实，缺测试运行器 |
| 练习模块（听/说/读/写） | 🔴 20% | **全是 mock UI 原型** |
| AI Provider 配置与密钥安全 | 🟢 85% | AES-256-GCM 加密，规范 |
| 工程质量保障 | 🔴 30% | 有测试文件但跑不起来，无 CI |
| 部署与运维 | 🔴 35% | CORS 全开、地址硬编码、无监控 |

**结论**：**词汇学习核心闭环（登录→生词本→AI 增强→云同步→间隔复习→智能句景）已经是真实可用的产品级功能**，完成度高。但**练习中心（听说读写）整体是 UI 原型，没有真实逻辑**；同时**工程化与部署运维**距离生产标准有明显差距。

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

## 模块六：SRS 间隔复习 🟡 70%

| 功能点 | 状态 | 说明 |
|---|---|---|
| 间隔重复算法（ease/interval/next_review） | ✅ | `lib/srs.ts` + 迁移 005 |
| 到期词筛选 `getDueWords` | ✅ | |
| 遇见熟悉度合并 `mergeEncounterFamiliarity` | ✅ | |
| 复习视图 ReviewView | ✅ | |
| 遇见曲线 EncounterCurve | ✅ | |

**风险**：
- 🔴 `srs.test.ts` 存在，但**项目无测试运行器**（见模块九），算法正确性无自动化保障。SRS 算错会直接破坏学习体验。

---

## 模块七：练习中心（听 / 说 / 读 / 写）🔴 20%

| 功能点 | 状态 | 说明 |
|---|---|---|
| 听力训练 | 🔴 Mock | `mockData.listeningQuizzes` + 假播放进度条（定时器递增），**无真实音频/TTS** |
| 口语训练 | 🔴 Mock | `Math.random()` 假打分 + 假声波动画，**无录音/语音识别** |
| 阅读理解 | 🔴 Mock | 文章和高亮词全部**写死在组件里** |
| 写作评估 | 🔴 Mock | `setTimeout` 模拟 + **写死的反馈数组**，无真实 AI 批改 |
| 练习主页卡片 | ✅ | UI 完成，进度为静态展示值 |

**结论**：练习中心是**视觉原型**，四个子模块没有任何真实功能逻辑。生产上线前要么补真实实现（TTS、ASR、AI 批改、动态文章），要么明确标注"开发中"避免误导用户。

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

## 模块九：工程质量保障 🔴 30%

| 项 | 状态 | 说明 |
|---|---|---|
| TypeScript 类型检查 | ✅ | `npm run lint` = `tsc --noEmit` |
| 单元测试文件 | ⚠️ | 有 `srs.test.ts`/`aiEnrich.test.ts`/`aiProviderConfigs.test.ts` |
| 测试运行器 | 🔴 **缺失** | package.json 无 vitest/jest 依赖，也无 `test` 脚本——**现有测试根本跑不起来** |
| 集成 / E2E 测试 | 🔴 无 | |
| CI | 🔴 无 | 无自动 lint/test 卡点 |
| 错误监控 / 上报 | 🔴 无 | 前后端均无 Sentry 类监控 |
| 日志 | 🟡 | 有统一 logger，但后端部分仍用 `console.error` |

**这是最需要补强的模块**：测试形同虚设（写了不能跑），核心算法（SRS）和 AI 解析逻辑无回归保护。

---

## 模块十：部署与运维 🔴 35%

| 项 | 状态 | 说明 |
|---|---|---|
| 后端框架 | ✅ | Express，静态托管 dist |
| CORS | 🔴 | `Access-Control-Allow-Origin: *` **全开**，生产应限定来源 |
| 地址硬编码 | 🔴 | 扩展/默认指向 `localhost:3000/3001`，需环境化 |
| 限流 / 防刷 | 🔴 | 仅 story 有日限，无全局 rate limit |
| 密钥 / 环境变量管理 | 🟡 | 用 dotenv，需确认生产 secrets 管理 |
| 健康检查 | ✅ | `/api/v1/health` |
| 进程管理 / 水平扩展 | 🔴 | 单进程，`isSyncing` 等用内存态，多实例不安全 |
| HTTPS / 反代 | ❓ | 未见配置，依赖部署环境 |

---

## 上线前必办清单（按优先级）

### P0（阻塞，不做无法面向多用户上线）

- [ ] 收敛 CORS 来源白名单，移除 `*`
- [ ] 后端地址 / Supabase 配置全部环境化，移除 localhost 硬编码
- [ ] 给 AI 接口（enrich/explain/translate/sense-cluster）加全局限流与每用户配额，防刷爆第三方配额
- [ ] 练习中心四个 mock 模块：明确"开发中"标识或下线入口，避免误导
- [ ] `AI_CONFIG_ENCRYPTION_KEY` 制定备份 + 轮换方案

### P1（强烈建议）

- [ ] 引入 vitest + `test` 脚本，让现有测试可运行，并接 CI（lint + test 卡点）
- [ ] 补 SRS 算法、AI payload 解析的单元测试回归保护
- [ ] 接前后端错误监控（Sentry）
- [ ] 确认 Supabase 生产配置：邮箱验证、密码强度、登录限流
- [ ] 后端内存态（isSyncing 等）改为支持多实例的方案，或固定单实例部署

### P2（功能完善 / 体验）

- [ ] 练习中心真实化：听力 TTS、口语录音+ASR、阅读动态文章、写作 AI 批改
- [ ] AI 导师对话改流式输出
- [ ] AI 生成内容审核 / 过滤
- [ ] 同步字段级冲突合并，sync_version 加唯一约束防撞号

---

## 备注

- 本文档为静态评估快照，随代码演进需更新。
- 勾选清单可作为后续逐项解决的跟踪表。
- 词汇学习主闭环已达到可用水平；优先补齐 P0 的安全/防刷/部署项，再决定练习中心是真实化还是暂时下线。
