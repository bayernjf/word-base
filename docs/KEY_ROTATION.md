# AI_CONFIG_ENCRYPTION_KEY 备份与轮换方案

`AI_CONFIG_ENCRYPTION_KEY` 用于加密用户在前端录入的 AI Provider API Key（AES-256-GCM，存储于
`ai_provider_configs.encrypted_api_key`，密文格式 `ivBase64.encryptedBase64`）。
**密钥一旦丢失，所有用户已保存的 API Key 将永久不可解密**（用户需逐个重新录入），因此必须有备份与轮换机制。

## 一、密钥备份（现在就做）

1. 密钥存放位置清单（轮换时需全部同步更新）：
   - 本地：`packages/api/.env`（本地开发）
   - Vercel：项目 Environment Variables（Production + Preview）
   - GitHub Actions：仓库 Secrets（如 CI 有用到）
2. 备份方式：将当前密钥存入**密码管理器**（1Password/Bitwarden 等）的安全笔记，标注：
   - 密钥值、生效日期、用途（`WordBase AI_CONFIG_ENCRYPTION_KEY`）
   - 禁止以明文形式存在聊天记录、普通云笔记、代码仓库中
3. 每次轮换后，旧密钥**保留 30 天**再从密码管理器删除（应对回滚需要）。

## 二、轮换流程（半年一次，或密钥疑似泄露时立即执行）

轮换脚本：[`scripts/rotate-ai-config-key.mjs`](../scripts/rotate-ai-config-key.mjs)，幂等可重跑。

### 步骤

```bash
# 0. 生成新密钥并存入密码管理器
openssl rand -base64 32

# 1. 数据库备份（Supabase Dashboard → Database → Backups 确认有当日备份，
#    或手动导出 ai_provider_configs 表）

# 2. 干跑预演：确认所有行都能用旧密钥解开
AI_CONFIG_ENCRYPTION_KEY_NEW="<新密钥>" node scripts/rotate-ai-config-key.mjs
#    输出「可轮换 N 行 / 失败 0 行」才继续；有失败行先排查

# 3.（可选但推荐）短暂停写：在低峰期执行，避免轮换窗口内用户新保存的
#    API Key 用旧密钥加密（脚本重跑可兜底，但停写更干净）

# 4. 正式执行重加密
AI_CONFIG_ENCRYPTION_KEY_NEW="<新密钥>" node scripts/rotate-ai-config-key.mjs --apply

# 5. 立即更新各环境密钥并重新部署：
#    - Vercel Dashboard → Environment Variables → AI_CONFIG_ENCRYPTION_KEY = 新密钥 → Redeploy
#    - 本地 packages/api/.env 同步更新
#    - GitHub Secrets 同步更新（如有）

# 6. 验证：登录 App → 设置 → AI 模型，确认已保存的 Provider 可正常调用（enrich 一个单词）

# 7. 兜底重跑：若步骤 3 未停写，部署完成后再跑一次 --apply，
#    把轮换窗口内新写入的旧密钥密文补齐（已轮换的行自动跳过）
```

### 回滚

若轮换后出现大面积 `invalid_encrypted_api_key`：
1. 将各环境 `AI_CONFIG_ENCRYPTION_KEY` 改回旧密钥并重新部署（旧密钥在密码管理器保留 30 天）
2. 反向执行脚本：`AI_CONFIG_ENCRYPTION_KEY=<新密钥> AI_CONFIG_ENCRYPTION_KEY_NEW=<旧密钥> node scripts/rotate-ai-config-key.mjs --apply`

## 三、故障场景处理

| 场景 | 处理 |
|---|---|
| 密钥丢失且无备份 | 无法恢复密文。清空 `ai_provider_configs.encrypted_api_key`，通知用户重新录入 |
| 部分行新旧密钥都解不开 | 脚本会列出失败行 id（exit code 2），这些行对应用户需重新录入 API Key |
| 轮换脚本中断 | 直接重跑（已轮换的行自动识别跳过） |
| 密钥泄露 | 立即执行轮换流程，并检查 Vercel/GitHub 访问日志 |
