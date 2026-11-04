# WordBase 深度代码评审报告（2026-11-02）

> 评审方式：只读静态评审 + 实跑验证门（lint/test）。未修改任何源码、未提交 git。
> 评审基线：分支 `main`（HEAD `8d8fcdd`），349 个 git 跟踪文件。
> 对照文档：`CODE_AUDIT_REPORT.md`、`APP_STORE_READINESS.md`、`PRODUCTION_READINESS.md`、`handoff.md`。

---

## 一、仓库定位与规模概览

npm workspaces + Turbo monorepo，三端一 API：

| 区域 | 内容 | 跟踪文件数（约） |
|------|------|------|
| `shared/` | 跨端共享：组件/hooks/lib/context，TS 源码直引 | ~90 |
| `apps/web` | Vite 静态前端（Cloudflare Pages）+ Next.js App Router 仅作 Vercel API 壳 | 47 |
| `apps/desktop` | Tauri 2 + Vite | 39 |
| `apps/mobile` | Expo SDK 52 + RN 0.76 | 16 |
| `packages/api` | Hono API（Vercel Serverless，经 Next route handler 挂载） | 23 |
| `supabase/migrations` | 22 个迁移（001–022，链完整无缺号） | 22 |
| `tests/` + `shared/lib/*.test.ts` | vitest 16 文件 164 用例 | ~21 |
| `.turbo/cache` | **构建缓存产物被误跟踪（45 个文件）** | 45 |

架构总评：模块边界清晰（shared 无 build、直引源码；API 已按域拆分为 `routes/` 10 个模块）；平台抽象层（`shared/platform.ts`）设计合理。但**三端共用的环境变量注入链在 desktop/mobile 的 CI 构建上是断的**（见 P1-1/P1-2），且「增量同步」子系统是半成品（见 P2-8）。

## 二、结论摘要

| 严重度 | 数量 |
|--------|------|
| P0 | 0 |
| P1 | 5 |
| P2 | 5 |
| P3 | 7 |

**最关键的 3 条**：

1. **移动端 env 注入链断裂（P1-1）**：Expo/Metro 只内联 `EXPO_PUBLIC_*`，而全仓代码只读 `NEXT_PUBLIC_*`/`VITE_*`，且 OTA 与 CI 构建均未注入任何可用变量——打包出的移动端 App 拿不到 Supabase 配置与 API 地址，登录/同步全链路不可用（与文档自述「移动端未真机验证」互证）。
2. **AI/反馈/练习每日配额可被用户自己改写绕过（P1-3）**：4 张 quota 表的 RLS 允许用户 UPDATE/INSERT 自己的配额行，且 API 用用户态 client 读写配额——任何人拿自己的 access token 直接调 PostgREST 把 `call_count` 清零，每日成本控制（`AI_DAILY_LIMIT=300` 等）形同虚设。
3. **桌面 Release 构建缺 `VITE_*` 注入（P1-2）**：`desktop-release.yml` 只传 `NEXT_PUBLIC_*`，而 desktop 的 Vite `envPrefix` 不含 `NEXT_PUBLIC_`——GitHub Release 分发的桌面安装包运行时拿不到 Supabase 配置和 API base，无法连接后端。

## 三、逐条发现（按严重度排序）

### P1 — 严重缺陷

#### P1-1 移动端无法获得 Supabase/API 配置（env 注入链断裂）

- **证据**：
  - `shared/lib/supabase.ts:74-92`（`getEnvValue` 依次读 `__APP_ENV__` → `process.env[NEXT_PUBLIC_*|bare|VITE_*]` → `import.meta.env`）；`shared/lib/apiBase.ts:27-43` 同构。
  - 全仓 grep `EXPO_PUBLIC`：**0 处定义/引用**（仅有文档外的空结果）；`apps/mobile/app.json` 无 `extra` 字段；无任何代码注入 `globalThis.__APP_ENV__`（`__APP_ENV__` 赋值只出现在 `shared/lib/apiBase.test.ts:30-89` 测试中）。
  - Expo SDK 52 的 Metro 打包只内联 `EXPO_PUBLIC_*` 环境变量到客户端 bundle；`process.env.NEXT_PUBLIC_*`/`VITE_*` 在 RN 运行时为 `undefined`。
  - `.github/workflows/mobile-ota.yml:66-69`（`eas update` 步骤**无任何 env 注入**）；`.github/workflows/desktop-release.yml:277-278,332-333`（mobile prebuild 仅传 `NEXT_PUBLIC_*`）。
  - 后果链：`getSupabase()` 首次访问时 `buildClient()` 抛 `Missing Supabase config`（`shared/lib/supabase.ts:100-105`）；`apiUrl('/api/v1/auth/login')` 在 `NEXT_PUBLIC_*_API_BASE_URL` 全空时返回相对路径（`shared/lib/apiBase.ts:47-64`），RN fetch 相对 URL 必然失败。
- **影响**：任何打包出的移动端 App（EAS build / OTA 更新）无法登录、无法同步，核心功能全灭。与 `APP_STORE_READINESS.md:19`「移动端 45%、需真机验证」互证——该问题至今未被发现正是因为从未真机跑通。
- **未确认**：未真机/未执行 `eas update` 实测（只读评审），但 env 链路静态可证。
- **修复建议**：移动端统一改用 `EXPO_PUBLIC_SUPABASE_URL`/`EXPO_PUBLIC_SUPABASE_ANON_KEY`/`EXPO_PUBLIC_API_BASE_URL`（`getEnvValue` 增加 `EXPO_PUBLIC_` 前缀回退），并在 `eas.json` 各 profile 或 `mobile-ota.yml` 注入；发 OTA 前加构建产物 smoke 检查。

#### P1-2 桌面端 Release 构建产物缺 Supabase/API 配置

- **证据**：`apps/desktop/vite.config.ts:60`（`envPrefix: ['VITE_', 'TAURI_']`）→ 客户端 bundle 只暴露 `VITE_*`；而 `.github/workflows/desktop-release.yml:183-185`（tauri-action 构建 env）只传 `NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_ANON_KEY`，且全 workflows grep `VITE_SUPABASE`/`VITE_DESKTOP_API` **0 命中**；CI 环境无根 `.env`（`.gitignore` 忽略 `.env*`）。
- **影响**：GitHub Release 分发的 macOS/Windows 安装包运行时 `getSupabase()` 抛错、`apiUrl()` 解析为空——发布产物核心功能不可用。本地 dev 因根 `.env` 有 `VITE_*`（`.env.example:15-16,72`）而正常，故该问题只在 CI Release 产物出现，更具隐蔽性。
- **未确认**：未实际执行 Release 构建（只读评审），env 链路静态可证。
- **修复建议**：`desktop-release.yml` 的构建 env 增加 `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY`/`VITE_DESKTOP_API_BASE_URL`（secrets 复用即可）；并在 workflow 增加产物启动 smoke。

#### P1-3 配额表 RLS 允许用户自改写 → 每日成本控制可绕过

- **证据**：
  - `supabase/migrations/020_ai_call_quota.sql:29-37`：`Users can upsert/update their own ai call quota`（`WITH CHECK (auth.uid() = user_id)`，无列级限制）。
  - 同款：`019_practice_quota.sql:29-37`、`014_stories.sql:88-96`（story_generation_quota）、`018_feedback.sql:118-126`（feedback_quota）。
  - API 侧用**用户态 client** 读写配额：`packages/api/src/context.ts:83-90`（`db.from('ai_call_quota').select/update/insert`）、`context.ts:93-107`；`packages/api/src/routes/feedback.ts:42-52`。
- **影响**：任何登录用户可绕过 API，直接用 anon key + 自己的 access token 调 PostgREST：`UPDATE ai_call_quota SET call_count=0 WHERE user_id=...`，每日 300 次 AI 调用硬上限（迁移注释自述「控 AI 成本」）完全失效；story/practice/feedback 配额同理。属于授权设计缺陷导致的成本滥用风险。
- **修复建议**：收回 quota 表的 INSERT/UPDATE 策略（只保留 SELECT），API 改用 `supabaseAdmin`（service role）或 `SECURITY DEFINER` 的原子自增 RPC 写配额。

#### P1-4 `moveWords` 失败回滚逻辑无效（数据完整性）

- **证据**：`shared/hooks/useVocabulary.ts:886-906`——回滚时 `select('id, book_id')` 查的是**已移动行当前的 book_id**（此时已是目标本 ID），再 upsert 回同一个值，注释自称「恢复原来的 book_id」实际是无操作；且 `upsert(..., { onConflict: 'id,user_id' })` 所依赖的 `(id, user_id)` 唯一约束不存在（`001_init_schema.sql:49,72`：PK 仅 `id`，唯一约束是 `(user_id, word, book_id)`），回滚 SQL 本身也会报错；合并进目标词的 contexts（`useVocabulary.ts:856-867`）也不回滚。
- **影响**：批量移动中途失败时，已移动的词留在目标本、已合并的 contexts 不可逆，数据处于半迁移状态，且用户无感知（返回 `success: false` 但数据已变）。
- **修复建议**：移动前在内存记录 `sourceId → 原 book_id/原目标词快照`，回滚按快照恢复；或改用 SECURITY DEFINER RPC 在单事务内完成移动+合并。

#### P1-5 `rollback.yml` 回滚产物缺环境变量，回滚即损坏

- **证据**：`.github/workflows/rollback.yml:45-52`（"Verify target commit builds" 步骤 `npm -w @wordbase/web run build` **无 env 注入**）；随后 Cloudflare 回滚步骤（`rollback.yml:54-68`）直接把该 dist 发布——其 env 块挂在 pages-action 发布步骤上，对已构建的静态产物无效。
- **影响**：执行 Web 回滚会发布一个缺 `NEXT_PUBLIC_SUPABASE_*` 的前端 bundle，回滚后站点立即不可用（`getSupabase()` 抛错）——回滚工具本身是故障源。
- **修复建议**：把 `NEXT_PUBLIC_*` env 移到构建步骤；或将回滚实现改为「对目标 commit 重新走 deploy.yml 流程」。

### P2 — 质量/安全/可维护性问题

#### P2-1 移动端 Supabase 会话令牌明文存 AsyncStorage

- **证据**：`apps/mobile/src/platform-expo.ts:6,84-121`（kv = AsyncStorage）→ `shared/lib/supabase.ts:109-127` 把该 kv 作为 supabase-js `auth.storage` → access/refresh token 明文落盘。AsyncStorage 在 Android 为未加密存储（root/备份可读）。Expo 官方建议敏感令牌用 `expo-secure-store`（Keychain/Keystore）。项目依赖中未引入 SecureStore（`apps/mobile/package.json` 无 `expo-secure-store`）。
- **影响**：设备被 root/越狱或备份泄露时会话令牌可被窃取（refresh token 长期有效）。
- **修复建议**：auth storage 适配器改用 expo-secure-store，普通偏好继续用 AsyncStorage。

#### P2-2 匿名会话发放无限流 + 配对体系半成品

- **证据**：`packages/api/src/routes/session.ts:6-19`（`/api/v1/session/bootstrap` 调 `signInAnonymously` 发 token，无 rate limit、无用途限制）；配对只有 `/pairing/new`、`/pairing/code`（session.ts:21-72），全仓无「提交配对码换 token」的兑换端点，也无任何消费方（grep `pairing` 仅迁移/文档/这三个端点）。
- **影响**：若 Supabase 项目开了匿名登录，任何人可无限批量创建匿名用户（auth.users 表膨胀）；配对功能是不可用的死代码路径。
- **修复建议**：bootstrap 加 IP 级限流；补全或移除配对端点。

#### P2-3 `sync_version` 冲突检测形同虚设，增量同步子系统是死代码

- **证据**：
  - `packages/api/src/routes/words.ts:94-138`：batch 端点用**客户端自报**的 `sync_version+1` 做「冲突检测」；而客户端直写 Supabase 时永远写 `sync_version: 1`（`useVocabulary.ts:426,693`），服务端其他地方从不递增——`incomingVersion < existingVersion` 几乎永不成立。
  - `sync_changelogs` 表无任何写入方（全仓 grep 仅 `sync.ts:11` 读取、`shared/lib/supabase.ts:300-327` 死代码 `syncApi`——`getChangelogs`/`getLatestVersion` 无任何调用方）；`001_init_schema.sql:128-140` 的 `get_next_sync_version()` 是死函数；API 无 `/api/v1/sync/changes` 端点（`routes/sync.ts` 只有 `status`/`full`）。
- **影响**：文档宣称的「增量同步 + changelog 版本追踪」实际不存在；跨设备并发修改同一词时无任何版本保护，后写覆盖先写（lost update）。
- **修复建议**：要么实装 changelog 写入与服务端版本递增，要么在文档中明示「当前仅全量同步、无并发冲突保护」。

#### P2-4 内存限流不跨实例 + 配额「读后写」竞态

- **证据**：`packages/api/src/utils/rateLimit.ts`（进程内 Map）；`context.ts:83-107`（先 select 再 update `call_count+1`，并发请求同读 N 同写 N+1 → 少计）。`PRODUCTION_READINESS.md:89` 已自认内存态不跨实例。
- **影响**：Vercel 多实例下「每用户 20/分、全局 120/分」被实例数放大；配额计数在并发下偏松。
- **修复建议**：依赖 P1-3 的修复（service-role 原子自增 RPC 天然解决竞态）；内存限流阈值按实例数折算或改用外部存储。

#### P2-5 无离线队列，弱网下写操作静默丢失

- **证据**：`useVocabulary.ts` 全部写路径（`addWord:707-710`、`updateWord:975-978`、`deleteWords:757-761`、`createBook:447-456` 等）失败仅 `logger.error` 并返回 `null/false`；全仓 grep `queue|offline|pendingSync` 无任何同步队列实现（仅 `batchAiStore` 是 AI 任务队列，不落盘）。
- **影响**：弱网/断网时用户加词、改词操作失败后无重试、无本地暂存，刷新即丢；返回 `null` 时 UI 层未必有错误提示（静默失败面）。
- **修复建议**：至少为写失败路径加用户可见的错误提示；中期引入持久化 outbox 队列。

### P3 — 体验/规范问题

1. **`.turbo/cache` 45 个构建缓存文件被 git 跟踪**：`.gitignore` 已含 `.turbo/` 但文件是历史上先提交的，未 `git rm --cached`。证据：`git ls-files | grep -c "\.turbo"` = 45。
2. **双锁文件并存**：`packages/api/package-lock.json`（被跟踪，内容还是 `api@1.0.0`，2025-07 后未更新）与根 `package-lock.json` 冲突，workspaces 下属于残留误导文件。
3. **`/api/v1/auth/logout` 不撤销令牌**：`packages/api/src/routes/auth.ts:125-129` 仅返回 `{ok:true}`，refresh token 服务端不失效（登出仅靠客户端清本地会话）。
4. **注销失败提示硬编码 dev 端口**：`shared/hooks/useProfile.ts:175-177`，生产环境网络失败也提示「无法连接 3001 服务，请先启动后端服务」。
5. **死代码**：`platform-expo.ts:79-82`（`loadAllFromAsyncStorage` 永远返回空对象）；`shared/lib/supabase.ts:299-327`（`syncApi` 无调用方）；`001` 迁移的 `get_next_sync_version()`。
6. **`loadBooks` 每次拉取用户全部 words 行仅为计数**：`useVocabulary.ts:300-304`（`select('book_id')` 全表），词量大时浪费带宽；可用 PostgREST count 聚合。
7. **CI lint 覆盖缺口**：根 `npm run lint`（turbo）实际只跑了 3/5 个包（web/desktop/mobile 的 `tsc --noEmit`）；`@wordbase/shared`、`@wordbase/api` 无 `lint` script——shared 无独立 typecheck，只靠消费端间接覆盖（实测输出见第五节）。

### 未发现实质问题的维度

- **service-role key 泄露**：全仓 grep `SERVICE_ROLE` 仅出现在后端 `packages/api/src/context.ts:13`、脚本、CI secrets 与文档；无任何客户端引用。既有审计报告此项结论属实。
- **RLS 覆盖**：22 个迁移中全部业务表均 `ENABLE ROW LEVEL SECURITY` 且策略为 owner-scoped（除 announcements 表刻意全可读、quota 表过宽——已单列）；`set_sync_book` RPC（016）先校验归属再操作，无越权。
- **注入**：SQL 全部经 supabase-js 参数化；zod schema 覆盖 API 入参（`validation.ts` 240 行，含长度/枚举上限）；AI prompt 拼接的是用户自己的词库数据，风险面低。
- **密钥加密**：AI provider key 用 AES-256-GCM + 随机 IV（`utils/crypto.ts`），实现规范（密钥派生 sha256 单次哈希偏弱，既有报告已记录，不重复列）。
- **迁移链一致性**：001–022 连续无缺号；代码引用的表/列（`memory_tip`/`deep_explanation`/`sense_groups`/`source_language`/quota 各表）均有对应迁移。
- **性能热点**：词表有分页（`VocabularyListView.tsx:355-358`），未发现无虚拟化大列表；其余全量拉取（`sync/full`、`loadBooks` 计数）已按 P3 记录。

## 四、文档与实现一致性抽查（9 处）

| # | 文档声称 | 实际情况 | 结论 |
|---|----------|----------|------|
| 1 | `CODE_AUDIT_REPORT.md:77`「单文件 index.ts（2061 行）包含全部端点」 | 实际 `packages/api/src/index.ts` 仅 68 行，端点已拆分至 `routes/` 10 模块 | **过时**（审计建议已执行但报告未更新） |
| 2 | `CODE_AUDIT_REPORT.md:29` / `PRODUCTION_READINESS.md:164`「109 个单测」 | 实测 16 文件 **164** 用例全过 | **过时**（向好方向） |
| 3 | `PRODUCTION_READINESS.md:65-67`「增量同步 `/api/v1/sync/{status,changes,full}`、`recordChange` 递增 sync_version」 | 无 `changes` 端点、无 `recordChange` 函数（grep 0 命中） | **不符**（详见 P2-3） |
| 4 | `APP_STORE_READINESS.md:34`「云同步 80%：全量同步、批量上传/删除、sync_version 版本控制」 | sync_version 版本控制无效（P2-3）；无离线队列（P2-5） | **高估** |
| 5 | `.env.example:10`「VITE_ 开头的变量会暴露给 Desktop/Mobile 客户端」 | 对 Mobile 错误：Expo 只内联 `EXPO_PUBLIC_*`（P1-1） | **错误** |
| 6 | `handoff.md:147`「根 .env：全局 + Mobile」 | Mobile 构建链根本读不到根 .env 里的 `NEXT_PUBLIC_`/`VITE_` 变量（P1-1） | **误导** |
| 7 | `PRODUCTION_READINESS.md:163`「CI 四端 tsc 卡点」 | `ci.yml:38-47` 确有 api/web/desktop/mobile 四个 `tsc --noEmit` | **属实** |
| 8 | `CODE_AUDIT_REPORT.md:111`「敏感密钥仅后端使用」 | grep 证实（见上节） | **属实** |
| 9 | `APP_STORE_READINESS.md:106`「AppSupabase 已拆分，主组件 ~747 行」 | 实测 `shared/AppSupabase.tsx` 恰为 747 行，4 个 hooks 存在 | **属实** |

## 五、验证门实际执行结果

| 命令 | 结果 | 摘要 |
|------|------|------|
| `npx vitest run` | ✅ 通过 | `Test Files 16 passed (16)` / `Tests 164 passed (164)`，6.41s |
| `npm run lint`（turbo run lint） | ✅ 通过 | 3 successful / 3 total（web、desktop、mobile 的 `tsc --noEmit`），55.1s；**`@wordbase/shared` 与 `@wordbase/api` 无 lint 任务被跳过**（turbo 输出 "Running lint in 5 packages" 但仅 3 个任务） |
| `npm run test:e2e`（Playwright） | ⏭ 跳过 | 需先构建 web 产物并下载浏览器，超出只读评审的快速验证范围；CI 中 `ci.yml` 有对应门禁 |
| `npm run build` | ⏭ 跳过 | 构建产物目录 `dist/` 属产物目录，且 lint+test 已覆盖类型与逻辑层 |

注：`packages/api` 的类型检查在 CI 由 `npx tsc --noEmit -p packages/api/tsconfig.json`（`ci.yml:38`）单独卡点，本地根 lint 不覆盖——本地 lint 通过不代表 api/shared 类型零错误（本次未单独复跑 api 的 tsc，标记未确认）。

## 六、修复优先级建议

1. **先修「构建产物不可用」三连（P1-1/P1-2/P1-5）**：统一各端 env 注入（mobile 用 `EXPO_PUBLIC_`、desktop CI 补 `VITE_`、rollback 构建补 `NEXT_PUBLIC_`），并为三个发布 workflow 各加产物级 smoke 检查——这是「发出去的东西能不能跑」的问题，优先级最高。
2. **收回 quota 表写权限（P1-3）**：迁移新增 revoke + service-role/RPC 原子自增，一并解决 P2-4 竞态。
3. **修 `moveWords` 回滚（P1-4）**或改单事务 RPC。
4. **会话令牌迁移到 SecureStore（P2-1）**，顺带拆分「敏感存储 vs 普通 kv」。
5. **文档纠偏**：更新 `CODE_AUDIT_REPORT.md` 的架构描述与测试数、删除/实装增量同步相关宣称（P2-3）、修正 `.env.example` 与 `handoff.md` 的 mobile env 说明。
6. **仓库卫生**：`git rm -r --cached .turbo`、删除 `packages/api/package-lock.json`、为 shared/api 补 lint script。
7. **中期**：离线 outbox 队列、logout 撤销令牌、bootstrap 限流、补全真机验证流程。
