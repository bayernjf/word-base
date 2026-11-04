import { describe, it, expect } from 'vitest';
import { createChunkedSecureStorage, SECURE_CHUNK_SIZE, type KeyValueStore } from './secure-auth-storage';

// 评审 P2-1 回归测试：移动端 Supabase 会话令牌改存安全存储（Keychain/Keystore），
// 单条 2048 字节上限通过分块绕过；旧版 AsyncStorage 明文会话一次性迁移。

function createMemoryStore() {
  const map = new Map<string, string>();
  const store: KeyValueStore & { map: Map<string, string> } = {
    map,
    async getItem(key) {
      return map.has(key) ? map.get(key)! : null;
    },
    async setItem(key, value) {
      map.set(key, value);
    },
    async removeItem(key) {
      map.delete(key);
    },
  };
  return store;
}

describe('createChunkedSecureStorage', () => {
  it('短值单块写入并可读回', async () => {
    const secure = createMemoryStore();
    const storage = createChunkedSecureStorage({ secure });

    await storage.setItem('sb-ref-auth-token', 'short-jwt');
    expect(await storage.getItem('sb-ref-auth-token')).toBe('short-jwt');
    expect(secure.map.get('sb-ref-auth-token')).toBe('1');
    expect(secure.map.get('sb-ref-auth-token.chunk.0')).toBe('short-jwt');
  });

  it('超过单块上限的长会话 JSON 分块后完整读回', async () => {
    const secure = createMemoryStore();
    const storage = createChunkedSecureStorage({ secure });
    const longValue = 'x'.repeat(SECURE_CHUNK_SIZE * 3 + 17);

    await storage.setItem('k', longValue);
    expect(await storage.getItem('k')).toBe(longValue);
    expect(secure.map.get('k')).toBe('4');
    // 每块都不超限
    for (let i = 0; i < 4; i++) {
      expect(secure.map.get(`k.chunk.${i}`)!.length).toBeLessThanOrEqual(SECURE_CHUNK_SIZE);
    }
  });

  it('重写为更短的值时清理多余旧块', async () => {
    const secure = createMemoryStore();
    const storage = createChunkedSecureStorage({ secure });

    await storage.setItem('k', 'x'.repeat(SECURE_CHUNK_SIZE * 3));
    await storage.setItem('k', 'tiny');

    expect(await storage.getItem('k')).toBe('tiny');
    expect(secure.map.get('k')).toBe('1');
    expect(secure.map.has('k.chunk.1')).toBe(false);
    expect(secure.map.has('k.chunk.2')).toBe(false);
  });

  it('removeItem 删除计数键与全部块', async () => {
    const secure = createMemoryStore();
    const storage = createChunkedSecureStorage({ secure });

    await storage.setItem('k', 'x'.repeat(SECURE_CHUNK_SIZE * 2));
    await storage.removeItem('k');

    expect(await storage.getItem('k')).toBeNull();
    expect([...secure.map.keys()].filter((key) => key.startsWith('k'))).toEqual([]);
  });

  it('secure 无记录时从 legacy 明文存储一次性迁移并清除 legacy', async () => {
    const secure = createMemoryStore();
    const legacy = createMemoryStore();
    legacy.map.set('sb-ref-auth-token', 'legacy-session-json');

    const storage = createChunkedSecureStorage({
      secure,
      legacyGet: legacy.getItem,
      legacyRemove: legacy.removeItem,
    });

    expect(await storage.getItem('sb-ref-auth-token')).toBe('legacy-session-json');
    // 已迁移进 secure，legacy 已清除
    expect(secure.map.get('sb-ref-auth-token')).toBe('1');
    expect(legacy.map.has('sb-ref-auth-token')).toBe(false);
    // 再次读取直接命中 secure
    expect(await storage.getItem('sb-ref-auth-token')).toBe('legacy-session-json');
  });

  it('缺块（数据损坏）时返回 null，让 supabase-js 视为无会话', async () => {
    const secure = createMemoryStore();
    const storage = createChunkedSecureStorage({ secure });

    await storage.setItem('k', 'x'.repeat(SECURE_CHUNK_SIZE * 2));
    secure.map.delete('k.chunk.1');

    expect(await storage.getItem('k')).toBeNull();
  });

  it('计数键损坏（非数字）时返回 null 而不是抛错', async () => {
    const secure = createMemoryStore();
    secure.map.set('k', 'not-a-number');
    const storage = createChunkedSecureStorage({ secure });

    await expect(storage.getItem('k')).resolves.toBeNull();
    await expect(storage.removeItem('k')).resolves.toBeUndefined();
  });
});
