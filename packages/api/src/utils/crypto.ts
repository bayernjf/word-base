function getCrypto(): Crypto {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    return crypto as Crypto
  }
  throw new Error('Web Crypto API not available')
}

export async function sha256(data: string): Promise<ArrayBuffer> {
  const encoder = new TextEncoder()
  const buffer = encoder.encode(data)
  return getCrypto().subtle.digest('SHA-256', buffer)
}

export async function encryptApiKey(apiKey: string, secret: string): Promise<string> {
  const encoder = new TextEncoder()
  const keyMaterial = await sha256(secret)
  
  const iv = crypto.getRandomValues(new Uint8Array(12))
  
  const aesKey = await getCrypto().subtle.importKey(
    'raw',
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt']
  )
  
  const encodedApiKey = encoder.encode(apiKey)
  const encrypted = await getCrypto().subtle.encrypt(
    { name: 'AES-GCM', iv },
    aesKey,
    encodedApiKey
  )
  
  const ivBase64 = btoa(String.fromCharCode(...iv))
  const encryptedBase64 = btoa(String.fromCharCode(...new Uint8Array(encrypted)))
  
  return `${ivBase64}.${encryptedBase64}`
}

export async function decryptApiKey(payload: string, secret: string): Promise<string> {
  const parts = payload.split('.')
  if (parts.length !== 2) {
    throw new Error('invalid_encrypted_api_key')
  }
  
  const [ivText, encryptedText] = parts
  
  const encoder = new TextEncoder()
  const keyMaterial = await sha256(secret)
  
  const iv = new Uint8Array(atob(ivText).split('').map(c => c.charCodeAt(0)))
  const encrypted = new Uint8Array(atob(encryptedText).split('').map(c => c.charCodeAt(0)))
  
  const aesKey = await getCrypto().subtle.importKey(
    'raw',
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt']
  )
  
  const decrypted = await getCrypto().subtle.decrypt(
    { name: 'AES-GCM', iv },
    aesKey,
    encrypted
  )
  
  const decoder = new TextDecoder()
  return decoder.decode(decrypted)
}