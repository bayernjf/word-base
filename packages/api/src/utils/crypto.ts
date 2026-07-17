// 兼容 Node.js 和浏览器环境的 Crypto API
function getCrypto(): Crypto {
  if (typeof crypto !== 'undefined' && crypto?.subtle) {
    return crypto as Crypto
  }
  // Node.js 17+ 使用 node:crypto 的 webcrypto
  if (typeof process !== 'undefined' && process.versions?.node) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const nodeCrypto = require('node:crypto')
      return nodeCrypto.webcrypto as Crypto
    } catch {
      // 降级到 node:crypto
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const cryptoModule = require('crypto')
        return cryptoModule.webcrypto as Crypto
      } catch {
        // 最终降级：抛出有意义的错误
        throw new Error('Web Crypto API not available in this environment')
      }
    }
  }
  throw new Error('Web Crypto API not available in this environment')
}

// 检查是否支持 Web Crypto API
function supportsWebCrypto(): boolean {
  try {
    return getCrypto() !== undefined
  } catch {
    return false
  }
}

export async function sha256(data: string): Promise<ArrayBuffer> {
  const encoder = new TextEncoder()
  const buffer = encoder.encode(data)
  return getCrypto().subtle.digest('SHA-256', buffer)
}

export async function encryptApiKey(apiKey: string, secret: string): Promise<string> {
  const cryptoApi = getCrypto()
  const encoder = new TextEncoder()
  const keyMaterial = await sha256(secret)
  
  const iv = cryptoApi.getRandomValues(new Uint8Array(12))
  
  const aesKey = await cryptoApi.subtle.importKey(
    'raw',
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt']
  )
  
  const encodedApiKey = encoder.encode(apiKey)
  const encrypted = await cryptoApi.subtle.encrypt(
    { name: 'AES-GCM', iv },
    aesKey,
    encodedApiKey
  )
  
  const ivBase64 = btoa(String.fromCharCode(...iv))
  const encryptedBase64 = btoa(String.fromCharCode(...new Uint8Array(encrypted)))
  
  return `${ivBase64}.${encryptedBase64}`
}

export async function decryptApiKey(payload: string, secret: string): Promise<string> {
  const cryptoApi = getCrypto()
  const parts = payload.split('.')
  if (parts.length !== 2) {
    throw new Error('invalid_encrypted_api_key')
  }
  
  const [ivText, encryptedText] = parts
  
  const encoder = new TextEncoder()
  const keyMaterial = await sha256(secret)
  
  const iv = new Uint8Array(atob(ivText).split('').map(c => c.charCodeAt(0)))
  const encrypted = new Uint8Array(atob(encryptedText).split('').map(c => c.charCodeAt(0)))
  
  const aesKey = await cryptoApi.subtle.importKey(
    'raw',
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt']
  )
  
  const decrypted = await cryptoApi.subtle.decrypt(
    { name: 'AES-GCM', iv },
    aesKey,
    encrypted
  )
  
  const decoder = new TextDecoder()
  return decoder.decode(decrypted)
}