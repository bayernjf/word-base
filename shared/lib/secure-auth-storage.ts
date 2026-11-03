import type { AuthStorage } from '../platform';

/**
 * 分块安全存储适配器（评审 P2-1）。
 *
 * expo-secure-store 单条 value 上限 2048 字节，而 Supabase 会话 JSON
 * （含 JWT + user 元数据）经常超限，因此按固定宽度分块：
 *   - `key` 本身存块数（十进制字符串）
 *   - `key.chunk.{i}` 存第 i 块
 *
 * 支持从旧版明文存储（AsyncStorage）一次性迁移：secure 中无记录时
 * 读 legacy，命中则写入 secure 并清除 legacy。
 */

export const SECURE_CHUNK_SIZE = 2000;

export interface KeyValueStore {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

const chunkKey = (key: string, index: number) => `${key}.chunk.${index}`;

async function readChunkCount(secure: KeyValueStore, key: string): Promise<number | null> {
  const raw = await secure.getItem(key);
  if (raw == null) return null;
  const count = Number.parseInt(raw, 10);
  return Number.isFinite(count) && count >= 0 ? count : null;
}

export function createChunkedSecureStorage(deps: {
  secure: KeyValueStore;
  /** 旧版明文存储读（一次性迁移来源，可选）。 */
  legacyGet?: (key: string) => Promise<string | null>;
  legacyRemove?: (key: string) => Promise<void>;
}): AuthStorage {
  const { secure, legacyGet, legacyRemove } = deps;

  async function getItem(key: string): Promise<string | null> {
    const count = await readChunkCount(secure, key);
    if (count == null) {
      if (!legacyGet) return null;
      const legacy = await legacyGet(key);
      if (legacy == null) return null;
      await setItem(key, legacy);
      try {
        await legacyRemove?.(key);
      } catch {
        /* best effort：遗留明文清除失败不阻断登录 */
      }
      return legacy;
    }
    if (count === 0) return null;
    const parts: string[] = [];
    for (let i = 0; i < count; i++) {
      const part = await secure.getItem(chunkKey(key, i));
      // 缺块即数据损坏：返回 null 让 supabase-js 视为无会话，强制重新登录
      if (part == null) return null;
      parts.push(part);
    }
    return parts.join('');
  }

  async function setItem(key: string, value: string): Promise<void> {
    const chunks: string[] = [];
    for (let i = 0; i < value.length; i += SECURE_CHUNK_SIZE) {
      chunks.push(value.slice(i, i + SECURE_CHUNK_SIZE));
    }
    const previous = await readChunkCount(secure, key);
    for (let i = 0; i < chunks.length; i++) {
      await secure.setItem(chunkKey(key, i), chunks[i]);
    }
    await secure.setItem(key, String(chunks.length));
    // 新值更短时清理遗留的多余块
    if (previous != null) {
      for (let i = chunks.length; i < previous; i++) {
        await secure.removeItem(chunkKey(key, i));
      }
    }
  }

  async function removeItem(key: string): Promise<void> {
    const count = await readChunkCount(secure, key);
    await secure.removeItem(key);
    if (count == null) return;
    for (let i = 0; i < count; i++) {
      await secure.removeItem(chunkKey(key, i));
    }
  }

  return { getItem, setItem, removeItem };
}
