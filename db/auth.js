import { getExecutor } from './index.js';

// 验证码相关
export async function createVerificationCode(codeInfo) {
  const executor = getExecutor();
  const stmt = executor.prepare(`
    INSERT INTO verification_codes (email, code, type, expiresAt, createdAt)
    VALUES ($email, $code, $type, $expiresAt, $createdAt)
  `);
  stmt.run(codeInfo);
  return codeInfo;
}

export async function getValidVerificationCode(email, code, type) {
  const executor = getExecutor();
  const now = Date.now();
  const stmt = executor.prepare(`
    SELECT * FROM verification_codes 
    WHERE email = $email AND code = $code AND type = $type
    AND expiresAt > $now AND usedAt IS NULL
    ORDER BY createdAt DESC LIMIT 1
  `);
  return stmt.get({ email, code, type, now });
}

export async function useVerificationCode(id) {
  const executor = getExecutor();
  const now = Date.now();
  const stmt = executor.prepare('UPDATE verification_codes SET usedAt = $now WHERE id = $id');
  return stmt.run({ now, id });
}

// Token 相关
export async function createToken(tokenInfo) {
  const executor = getExecutor();
  const stmt = executor.prepare(`
    INSERT INTO tokens (tokenHash, userId, type, expiresAt, createdAt, lastUsedAt)
    VALUES ($tokenHash, $userId, $type, $expiresAt, $createdAt, $lastUsedAt)
  `);
  stmt.run(tokenInfo);
  return tokenInfo;
}

export async function getTokenByHash(tokenHash) {
  const executor = getExecutor();
  const stmt = executor.prepare('SELECT * FROM tokens WHERE tokenHash = $tokenHash');
  return stmt.get({ tokenHash });
}

export async function updateTokenLastUsed(tokenHash) {
  const executor = getExecutor();
  const now = Date.now();
  const stmt = executor.prepare('UPDATE tokens SET lastUsedAt = $now WHERE tokenHash = $tokenHash');
  return stmt.run({ now, tokenHash });
}

export async function deleteToken(tokenHash) {
  const executor = getExecutor();
  const stmt = executor.prepare('DELETE FROM tokens WHERE tokenHash = $tokenHash');
  return stmt.run({ tokenHash });
}

export async function deleteAllUserTokens(userId) {
  const executor = getExecutor();
  const stmt = executor.prepare('DELETE FROM tokens WHERE userId = $userId');
  return stmt.run({ userId });
}

export default {
  createVerificationCode,
  getValidVerificationCode,
  useVerificationCode,
  createToken,
  getTokenByHash,
  updateTokenLastUsed,
  deleteToken,
  deleteAllUserTokens
};
