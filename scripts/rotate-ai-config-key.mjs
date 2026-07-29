#!/usr/bin/env node
// =============================================
// AI_CONFIG_ENCRYPTION_KEY 轮换脚本
// 将 ai_provider_configs.encrypted_api_key 从旧密钥重加密为新密钥
//
// 用法（在仓库根目录执行）：
//   node scripts/rotate-ai-config-key.mjs            # 干跑：只报告可解密/已轮换/失败行数，不写库
//   node scripts/rotate-ai-config-key.mjs --apply    # 真正执行重加密并更新数据库
//
// 所需环境变量（可放 packages/api/.env 或根 .env，脚本自动读取）：
//   NEXT_PUBLIC_SUPABASE_URL / SUPABASE_URL   Supabase 项目地址
//   SUPABASE_SERVICE_ROLE_KEY                  服务端密钥（绕过 RLS 读写全部行）
//   AI_CONFIG_ENCRYPTION_KEY                   当前（旧）加密密钥
//   AI_CONFIG_ENCRYPTION_KEY_NEW               新加密密钥（openssl rand -base64 32 生成）
//
// 幂等性：已用新密钥加密的行会被识别并跳过，中断后可安全重跑。
// 详细操作流程（含备份、切换顺序）见 docs/KEY_ROTATION.md
// =============================================

import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { webcrypto } from 'node:crypto'

const ROOT = resolve(new URL('.', import.meta.url).pathname, '..')

// --- 轻量 .env 解析（不引第三方依赖），process.env 优先 ---
const loadEnvFile = (path) => {
  if (!existsSync(path)) return
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (!match) continue
    const [, key, rawValue] = match
    if (process.env[key] !== undefined) continue
    process.env[key] = rawValue.replace(/^["']|["']$/g, '')
  }
}
loadEnvFile(resolve(ROOT, 'packages/api/.env'))
loadEnvFile(resolve(ROOT, '.env'))

const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '').replace(/\/+$/, '')
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const oldSecret = process.env.AI_CONFIG_ENCRYPTION_KEY || ''
const newSecret = process.env.AI_CONFIG_ENCRYPTION_KEY_NEW || ''
const apply = process.argv.includes('--apply')

const fail = (msg) => {
  console.error(`[rotate-ai-config-key] 错误：${msg}`)
  process.exit(1)
}

if (!supabaseUrl) fail('缺少 NEXT_PUBLIC_SUPABASE_URL / SUPABASE_URL')
if (!serviceRoleKey) fail('缺少 SUPABASE_SERVICE_ROLE_KEY')
if (!oldSecret) fail('缺少 AI_CONFIG_ENCRYPTION_KEY（旧密钥）')
if (!newSecret) fail('缺少 AI_CONFIG_ENCRYPTION_KEY_NEW（新密钥）')
if (oldSecret === newSecret) fail('新旧密钥相同，无需轮换')

// --- 与 packages/api/src/utils/crypto.ts 完全一致的 AES-256-GCM 实现 ---
const sha256 = async (text) => webcrypto.subtle.digest('SHA-256', new TextEncoder().encode(text))

const importAesKey = async (secret, usage) =>
  webcrypto.subtle.importKey('raw', await sha256(secret), { name: 'AES-GCM', length: 256 }, false, [usage])

const encrypt = async (plaintext, secret) => {
  const iv = webcrypto.getRandomValues(new Uint8Array(12))
  const key = await importAesKey(secret, 'encrypt')
  const encrypted = await webcrypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(plaintext))
  const ivBase64 = Buffer.from(iv).toString('base64')
  const encryptedBase64 = Buffer.from(new Uint8Array(encrypted)).toString('base64')
  return `${ivBase64}.${encryptedBase64}`
}

const decrypt = async (payload, secret) => {
  const parts = String(payload || '').split('.')
  if (parts.length !== 2) throw new Error('invalid_encrypted_api_key')
  const iv = new Uint8Array(Buffer.from(parts[0], 'base64'))
  const encrypted = new Uint8Array(Buffer.from(parts[1], 'base64'))
  const key = await importAesKey(secret, 'decrypt')
  const decrypted = await webcrypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, encrypted)
  return new TextDecoder().decode(decrypted)
}

// --- PostgREST REST API 直连（service role 绕过 RLS）---
const restHeaders = {
  apikey: serviceRoleKey,
  Authorization: `Bearer ${serviceRoleKey}`,
  'Content-Type': 'application/json',
}

const fetchAllConfigs = async () => {
  const res = await fetch(`${supabaseUrl}/rest/v1/ai_provider_configs?select=id,encrypted_api_key`, { headers: restHeaders })
  if (!res.ok) fail(`读取 ai_provider_configs 失败：HTTP ${res.status} ${await res.text()}`)
  return res.json()
}

const updateConfig = async (id, encryptedApiKey) => {
  const res = await fetch(`${supabaseUrl}/rest/v1/ai_provider_configs?id=eq.${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { ...restHeaders, Prefer: 'return=minimal' },
    body: JSON.stringify({ encrypted_api_key: encryptedApiKey }),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status} ${await res.text()}`)
}

const main = async () => {
  console.log(`[rotate-ai-config-key] 模式：${apply ? 'APPLY（写库）' : 'DRY-RUN（只读预演，加 --apply 才写库）'}`)
  const rows = await fetchAllConfigs()
  console.log(`[rotate-ai-config-key] 共 ${rows.length} 行 ai_provider_configs`)

  let rotated = 0
  let alreadyNew = 0
  let empty = 0
  const failed = []

  for (const row of rows) {
    if (!row.encrypted_api_key) {
      empty += 1
      continue
    }
    let plaintext
    try {
      plaintext = await decrypt(row.encrypted_api_key, oldSecret)
    } catch {
      // 旧密钥解不开：可能已用新密钥加密（重跑场景），验证后跳过
      try {
        await decrypt(row.encrypted_api_key, newSecret)
        alreadyNew += 1
        continue
      } catch {
        failed.push(row.id)
        continue
      }
    }
    if (apply) {
      try {
        await updateConfig(row.id, await encrypt(plaintext, newSecret))
      } catch (err) {
        failed.push(row.id)
        console.error(`[rotate-ai-config-key] 更新失败 id=${row.id}：${err.message}`)
        continue
      }
    }
    rotated += 1
  }

  console.log(`[rotate-ai-config-key] ${apply ? '已轮换' : '可轮换'}：${rotated} 行`)
  console.log(`[rotate-ai-config-key] 已是新密钥（跳过）：${alreadyNew} 行`)
  console.log(`[rotate-ai-config-key] 空密文（跳过）：${empty} 行`)
  if (failed.length) {
    console.error(`[rotate-ai-config-key] ⚠️ 新旧密钥均无法解密 ${failed.length} 行（用户需重新录入 API Key）：${failed.join(', ')}`)
  }
  if (apply && !failed.length) {
    console.log('[rotate-ai-config-key] ✅ 轮换完成。请立即将各环境 AI_CONFIG_ENCRYPTION_KEY 更新为新密钥并重新部署 API。')
  }
  process.exit(failed.length ? 2 : 0)
}

main().catch((err) => fail(err?.message || String(err)))
