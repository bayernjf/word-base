import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import dotenv from 'dotenv';
import Database from 'better-sqlite3';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '.data');

// 确保数据目录存在
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// 初始化 SQLite 数据库
const db = new Database(path.join(DATA_DIR, 'wordbase.db'));
db.pragma('journal_mode = WAL');

// 创建数据库表
function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      passwordHash TEXT NOT NULL,
      passwordSalt TEXT NOT NULL,
      nickname TEXT DEFAULT '',
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS verification_codes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL,
      code TEXT NOT NULL,
      type TEXT NOT NULL,
      expiresAt INTEGER NOT NULL,
      usedAt INTEGER,
      createdAt INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tokens (
      tokenHash TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      type TEXT NOT NULL,
      expiresAt INTEGER NOT NULL,
      createdAt INTEGER NOT NULL,
      lastUsedAt INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS words (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      word TEXT NOT NULL,
      phonetic TEXT DEFAULT '',
      partOfSpeech TEXT DEFAULT 'noun',
      definition TEXT DEFAULT '',
      chineseTranslation TEXT DEFAULT '',
      synonyms TEXT DEFAULT '[]',
      examples TEXT DEFAULT '[]',
      usageHistory TEXT DEFAULT '[]',
      level TEXT DEFAULT 'B2',
      familiarity INTEGER DEFAULT 0,
      bookId TEXT DEFAULT 'inbox',
      meta TEXT DEFAULT '{}',
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER NOT NULL,
      UNIQUE(userId, word, bookId)
    );

    CREATE INDEX IF NOT EXISTS idx_words_userId ON words(userId);
    CREATE INDEX IF NOT EXISTS idx_verification_email_type ON verification_codes(email, type);
  `);
}

initDatabase();

// 工具函数
function randomToken() {
  return crypto.randomBytes(32).toString('base64url');
}

function randomVerificationCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function hashPassword(password, salt) {
  return crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
}

function generateSalt() {
  return crypto.randomBytes(32).toString('hex');
}

function sha256Hex(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

const app = express();
app.use(express.json({ limit: '1mb' }));

// CORS
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  next();
});

// 发送验证码（为了演示，直接打印到控制台，实际项目可以使用 nodemailer 发送邮件）
function sendVerificationCode(email, code, type) {
  const typeText = type === 'register' ? '注册' : '重置密码';
  console.log(`
  ==========================================
  邮箱验证码 (${typeText})
  邮箱: ${email}
  验证码: ${code}
  有效期: 10分钟
  ==========================================
  `);
  return true;
}

// 中间件：验证 access token
async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length).trim() : '';
  
  if (!token) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  const tokenHash = sha256Hex(token);
  const tokenRow = db.prepare('SELECT * FROM tokens WHERE tokenHash = ?').get(tokenHash);

  if (!tokenRow || tokenRow.type !== 'access' || Date.now() > tokenRow.expiresAt) {
    return res.status(401).json({ error: 'token_expired' });
  }

  // 更新 lastUsedAt
  db.prepare('UPDATE tokens SET lastUsedAt = ? WHERE tokenHash = ?').run(Date.now(), tokenHash);

  const user = db.prepare('SELECT id, email, nickname, createdAt FROM users WHERE id = ?').get(tokenRow.userId);
  if (!user) {
    return res.status(401).json({ error: 'user_not_found' });
  }

  req.user = user;
  next();
}

// 根路径
app.get('/', (_req, res) => {
  res.type('text/plain').send('word-base api (SQLite)');
});

// 健康检查
app.get('/api/v1/health', (_req, res) => {
  res.json({ ok: true });
});

// API: 发送验证码
app.post('/api/v1/auth/send-code', (req, res) => {
  const { email, type } = req.body;
  const normalizedEmail = (email || '').trim().toLowerCase();
  const validTypes = ['register', 'reset'];
  
  if (!normalizedEmail || !normalizedEmail.includes('@')) {
    return res.status(400).json({ error: 'invalid_email' });
  }
  if (!validTypes.includes(type)) {
    return res.status(400).json({ error: 'invalid_type' });
  }

  // 如果是注册类型，检查邮箱是否已注册
  if (type === 'register') {
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(normalizedEmail);
    if (existing) {
      return res.status(409).json({ error: 'email_already_registered' });
    }
  }

  // 如果是重置密码类型，检查邮箱是否存在
  if (type === 'reset') {
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(normalizedEmail);
    if (!existing) {
      return res.status(404).json({ error: 'email_not_registered' });
    }
  }

  // 生成验证码
  const code = randomVerificationCode();
  const expiresAt = Date.now() + 10 * 60 * 1000; // 10分钟

  db.prepare(`
    INSERT INTO verification_codes (email, code, type, expiresAt, createdAt)
    VALUES (?, ?, ?, ?, ?)
  `).run(normalizedEmail, code, type, expiresAt, Date.now());

  // 发送验证码
  sendVerificationCode(normalizedEmail, code, type);

  res.json({ ok: true, message: 'code_sent' });
});

// API: 注册
app.post('/api/v1/auth/register', (req, res) => {
  const { email, password, code, nickname } = req.body;
  const normalizedEmail = (email || '').trim().toLowerCase();
  const cleanPassword = password || '';
  const cleanCode = (code || '').trim();

  if (!normalizedEmail || !normalizedEmail.includes('@')) {
    return res.status(400).json({ error: 'invalid_email' });
  }
  if (!cleanPassword || cleanPassword.length < 6) {
    return res.status(400).json({ error: 'password_too_short' });
  }
  if (!cleanCode) {
    return res.status(400).json({ error: 'code_required' });
  }

  // 验证验证码
  const now = Date.now();
  const codeRow = db.prepare(`
    SELECT * FROM verification_codes 
    WHERE email = ? AND code = ? AND type = 'register' 
    AND expiresAt > ? AND usedAt IS NULL
    ORDER BY createdAt DESC LIMIT 1
  `).get(normalizedEmail, cleanCode, now);

  if (!codeRow) {
    return res.status(400).json({ error: 'invalid_code' });
  }

  // 标记验证码已使用
  db.prepare('UPDATE verification_codes SET usedAt = ? WHERE id = ?').run(now, codeRow.id);

  // 创建用户
  const userId = crypto.randomUUID();
  const salt = generateSalt();
  const passwordHash = hashPassword(cleanPassword, salt);
  const cleanNickname = (nickname || '').trim() || normalizedEmail.split('@')[0];

  db.prepare(`
    INSERT INTO users (id, email, passwordHash, passwordSalt, nickname, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(userId, normalizedEmail, passwordHash, salt, cleanNickname, now, now);

  // 生成 token
  const accessToken = randomToken();
  const refreshToken = randomToken();
  const accessExpiresAt = now + 24 * 60 * 60 * 1000; // 24小时
  const refreshExpiresAt = now + 7 * 24 * 60 * 60 * 1000; // 7天

  db.prepare(`
    INSERT INTO tokens (tokenHash, userId, type, expiresAt, createdAt, lastUsedAt)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(sha256Hex(accessToken), userId, 'access', accessExpiresAt, now, now);

  db.prepare(`
    INSERT INTO tokens (tokenHash, userId, type, expiresAt, createdAt, lastUsedAt)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(sha256Hex(refreshToken), userId, 'refresh', refreshExpiresAt, now, now);

  const user = db.prepare('SELECT id, email, nickname, createdAt FROM users WHERE id = ?').get(userId);
  res.json({
    ok: true,
    accessToken,
    refreshToken,
    user
  });
});

// API: 登录
app.post('/api/v1/auth/login', (req, res) => {
  const { email, password, remember } = req.body;
  const normalizedEmail = (email || '').trim().toLowerCase();
  const cleanPassword = password || '';

  if (!normalizedEmail || !cleanPassword) {
    return res.status(400).json({ error: 'invalid_credentials' });
  }

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(normalizedEmail);
  if (!user) {
    return res.status(404).json({ error: 'email_not_registered' });
  }

  const expectedHash = hashPassword(cleanPassword, user.passwordSalt);
  if (expectedHash !== user.passwordHash) {
    return res.status(401).json({ error: 'wrong_password' });
  }

  const now = Date.now();
  const accessToken = randomToken();
  const refreshToken = randomToken();
  const accessExpiresAt = now + 24 * 60 * 60 * 1000; // 24小时
  const refreshExpiresAt = remember === true ? now + 7 * 24 * 60 * 60 * 1000 : now + 24 * 60 * 60 * 1000; // 记住我就是7天

  db.prepare(`
    INSERT INTO tokens (tokenHash, userId, type, expiresAt, createdAt, lastUsedAt)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(sha256Hex(accessToken), user.id, 'access', accessExpiresAt, now, now);

  db.prepare(`
    INSERT INTO tokens (tokenHash, userId, type, expiresAt, createdAt, lastUsedAt)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(sha256Hex(refreshToken), user.id, 'refresh', refreshExpiresAt, now, now);

  const safeUser = db.prepare('SELECT id, email, nickname, createdAt FROM users WHERE id = ?').get(user.id);
  res.json({
    ok: true,
    accessToken,
    refreshToken,
    user: safeUser
  });
});

// API: 刷新 token
app.post('/api/v1/auth/refresh', (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    return res.status(400).json({ error: 'refresh_token_required' });
  }

  const tokenHash = sha256Hex(refreshToken);
  const tokenRow = db.prepare('SELECT * FROM tokens WHERE tokenHash = ?').get(tokenHash);

  if (!tokenRow || tokenRow.type !== 'refresh' || Date.now() > tokenRow.expiresAt) {
    return res.status(401).json({ error: 'invalid_refresh_token' });
  }

  const user = db.prepare('SELECT id, email, nickname, createdAt FROM users WHERE id = ?').get(tokenRow.userId);
  if (!user) {
    return res.status(401).json({ error: 'user_not_found' });
  }

  const now = Date.now();
  const newAccessToken = randomToken();
  const newRefreshToken = randomToken();
  const accessExpiresAt = now + 24 * 60 * 60 * 1000;
  const refreshExpiresAt = tokenRow.expiresAt; // 保持原 refresh token 的有效期

  // 删除旧的 token
  db.prepare('DELETE FROM tokens WHERE tokenHash = ?').run(tokenHash);

  // 插入新的 token
  db.prepare(`
    INSERT INTO tokens (tokenHash, userId, type, expiresAt, createdAt, lastUsedAt)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(sha256Hex(newAccessToken), user.id, 'access', accessExpiresAt, now, now);

  db.prepare(`
    INSERT INTO tokens (tokenHash, userId, type, expiresAt, createdAt, lastUsedAt)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(sha256Hex(newRefreshToken), user.id, 'refresh', refreshExpiresAt, now, now);

  res.json({
    ok: true,
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
    user
  });
});

// API: 重置密码 - 验证验证码
app.post('/api/v1/auth/reset-password-verify', (req, res) => {
  const { email, code } = req.body;
  const normalizedEmail = (email || '').trim().toLowerCase();
  const cleanCode = (code || '').trim();

  if (!normalizedEmail || !cleanCode) {
    return res.status(400).json({ error: 'invalid_input' });
  }

  const now = Date.now();
  const codeRow = db.prepare(`
    SELECT * FROM verification_codes 
    WHERE email = ? AND code = ? AND type = 'reset' 
    AND expiresAt > ? AND usedAt IS NULL
    ORDER BY createdAt DESC LIMIT 1
  `).get(normalizedEmail, cleanCode, now);

  if (!codeRow) {
    return res.status(400).json({ error: 'invalid_code' });
  }

  // 临时标记验证码为已使用但保留一段时间，或者返回临时 token，这里简化处理，直接返回成功
  db.prepare('UPDATE verification_codes SET usedAt = ? WHERE id = ?').run(now, codeRow.id);

  // 生成一个临时 token 用于重置密码（5分钟有效期）
  const tempToken = randomToken();
  const tempExpiresAt = now + 5 * 60 * 1000;
  db.prepare(`
    INSERT INTO tokens (tokenHash, userId, type, expiresAt, createdAt, lastUsedAt)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(sha256Hex(tempToken), db.prepare('SELECT id FROM users WHERE email = ?').get(normalizedEmail).id, 'reset', tempExpiresAt, now, now);

  res.json({
    ok: true,
    resetToken: tempToken
  });
});

// API: 重置密码 - 设置新密码
app.post('/api/v1/auth/reset-password', (req, res) => {
  const { resetToken, newPassword } = req.body;
  const cleanPassword = newPassword || '';

  if (!resetToken) {
    return res.status(400).json({ error: 'reset_token_required' });
  }
  if (!cleanPassword || cleanPassword.length < 6) {
    return res.status(400).json({ error: 'password_too_short' });
  }

  const tokenHash = sha256Hex(resetToken);
  const tokenRow = db.prepare('SELECT * FROM tokens WHERE tokenHash = ?').get(tokenHash);

  if (!tokenRow || tokenRow.type !== 'reset' || Date.now() > tokenRow.expiresAt) {
    return res.status(401).json({ error: 'invalid_reset_token' });
  }

  const now = Date.now();
  const salt = generateSalt();
  const passwordHash = hashPassword(cleanPassword, salt);

  db.prepare(`
    UPDATE users SET passwordHash = ?, passwordSalt = ?, updatedAt = ? WHERE id = ?
  `).run(passwordHash, salt, now, tokenRow.userId);

  // 删除临时 token
  db.prepare('DELETE FROM tokens WHERE tokenHash = ?').run(tokenHash);

  // 可选：清除该用户所有其他 token，强制重新登录
  db.prepare('DELETE FROM tokens WHERE userId = ? AND type IN ("access", "refresh")').run(tokenRow.userId);

  // 生成新的 token
  const accessToken = randomToken();
  const refreshToken = randomToken();
  const accessExpiresAt = now + 24 * 60 * 60 * 1000;
  const refreshExpiresAt = now + 7 * 24 * 60 * 60 * 1000;

  db.prepare(`
    INSERT INTO tokens (tokenHash, userId, type, expiresAt, createdAt, lastUsedAt)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(sha256Hex(accessToken), tokenRow.userId, 'access', accessExpiresAt, now, now);

  db.prepare(`
    INSERT INTO tokens (tokenHash, userId, type, expiresAt, createdAt, lastUsedAt)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(sha256Hex(refreshToken), tokenRow.userId, 'refresh', refreshExpiresAt, now, now);

  const user = db.prepare('SELECT id, email, nickname, createdAt FROM users WHERE id = ?').get(tokenRow.userId);
  res.json({
    ok: true,
    accessToken,
    refreshToken,
    user
  });
});

// API: 登出
app.post('/api/v1/auth/logout', requireAuth, (req, res) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length).trim() : '';
  
  if (token) {
    db.prepare('DELETE FROM tokens WHERE tokenHash = ?').run(sha256Hex(token));
  }
  res.json({ ok: true });
});

// API: 获取当前用户信息
app.get('/api/v1/user', requireAuth, (req, res) => {
  res.json({ ok: true, user: req.user });
});

// API: 更新用户信息
app.patch('/api/v1/user', requireAuth, (req, res) => {
  const { nickname } = req.body;
  const cleanNickname = (nickname || '').trim();

  if (!cleanNickname) {
    return res.status(400).json({ error: 'nickname_required' });
  }

  db.prepare('UPDATE users SET nickname = ?, updatedAt = ? WHERE id = ?').run(
    cleanNickname, Date.now(), req.user.id
  );

  const updatedUser = db.prepare('SELECT id, email, nickname, createdAt FROM users WHERE id = ?').get(req.user.id);
  res.json({ ok: true, user: updatedUser });
});

// API: 修改密码
app.post('/api/v1/user/change-password', requireAuth, (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const cleanOld = oldPassword || '';
  const cleanNew = newPassword || '';

  if (!cleanOld || !cleanNew || cleanNew.length < 6) {
    return res.status(400).json({ error: 'invalid_input' });
  }

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  const expectedHash = hashPassword(cleanOld, user.passwordSalt);
  if (expectedHash !== user.passwordHash) {
    return res.status(401).json({ error: 'wrong_old_password' });
  }

  const salt = generateSalt();
  const passwordHash = hashPassword(cleanNew, salt);
  db.prepare(`
    UPDATE users SET passwordHash = ?, passwordSalt = ?, updatedAt = ? WHERE id = ?
  `).run(passwordHash, salt, Date.now(), req.user.id);

  res.json({ ok: true });
});

// API: 获取单词
app.get('/api/v1/words', requireAuth, (req, res) => {
  const { bookId } = req.query;
  let stmt;
  if (bookId) {
    stmt = db.prepare('SELECT * FROM words WHERE userId = ? AND bookId = ? ORDER BY createdAt DESC');
    stmt = stmt.bind(req.user.id, bookId);
  } else {
    stmt = db.prepare('SELECT * FROM words WHERE userId = ? ORDER BY createdAt DESC');
    stmt = stmt.bind(req.user.id);
  }

  const rows = stmt.all();
  const words = rows.map(row => ({
    ...row,
    synonyms: JSON.parse(row.synonyms),
    examples: JSON.parse(row.examples),
    usageHistory: JSON.parse(row.usageHistory),
    meta: JSON.parse(row.meta)
  }));

  res.json({ words });
});

// API: 添加单词
app.post('/api/v1/words', requireAuth, (req, res) => {
  const now = Date.now();
  const normalized = normalizeWordInput(req.body, req.user.id, now);
  
  if (!normalized.ok) {
    return res.status(400).json({ error: normalized.error });
  }

  const { word } = normalized;

  // 检查是否已存在
  const existing = db.prepare('SELECT * FROM words WHERE userId = ? AND word = ? AND bookId = ?').get(req.user.id, word.word, word.bookId);
  if (existing) {
    return res.json({ ok: true, saved: false, duplicate: true, word: { ...existing, synonyms: JSON.parse(existing.synonyms), examples: JSON.parse(existing.examples), usageHistory: JSON.parse(existing.usageHistory), meta: JSON.parse(existing.meta) } });
  }

  db.prepare(`
    INSERT INTO words (id, userId, word, phonetic, partOfSpeech, definition, chineseTranslation, synonyms, examples, usageHistory, level, familiarity, bookId, meta, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    word.id, word.meta.userId, word.word, word.phonetic, word.partOfSpeech, word.definition, word.chineseTranslation,
    JSON.stringify(word.synonyms), JSON.stringify(word.examples), JSON.stringify(word.usageHistory),
    word.level, word.familiarity, word.bookId, JSON.stringify(word.meta), word.meta.createdAt, now
  );

  res.json({ ok: true, saved: true, duplicate: false, word });
});

// API: 批量同步单词
app.post('/api/v1/words/batch', requireAuth, (req, res) => {
  const { deviceId, entries } = req.body;
  const userId = req.user.id;

  if (!deviceId || !Array.isArray(entries)) {
    return res.status(400).json({ error: 'invalid_input' });
  }

  const processedEntryIds = [];
  let savedCount = 0;
  let duplicateCount = 0;
  const now = Date.now();

  for (const entry of entries) {
    const entryId = entry?.id;
    if (!entryId) continue;

    // 检查是否已经处理过（基于 userId + deviceId + entryId，这里简化处理）
    const normalized = normalizeWordInput({
      ...entry,
      client: { deviceId, entryId }
    }, userId, now);

    if (!normalized.ok) continue;

    const { word } = normalized;
    
    // 检查是否已存在
    const existing = db.prepare('SELECT * FROM words WHERE userId = ? AND word = ? AND bookId = ?').get(userId, word.word, word.bookId);
    if (existing) {
      duplicateCount++;
      processedEntryIds.push(entryId);
      continue;
    }

    db.prepare(`
      INSERT INTO words (id, userId, word, phonetic, partOfSpeech, definition, chineseTranslation, synonyms, examples, usageHistory, level, familiarity, bookId, meta, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      word.id, word.meta.userId, word.word, word.phonetic, word.partOfSpeech, word.definition, word.chineseTranslation,
      JSON.stringify(word.synonyms), JSON.stringify(word.examples), JSON.stringify(word.usageHistory),
      word.level, word.familiarity, word.bookId, JSON.stringify(word.meta), word.meta.createdAt, now
    );

    savedCount++;
    processedEntryIds.push(entryId);
  }

  res.json({
    ok: true,
    received: entries.length,
    savedCount,
    duplicateCount,
    processedEntryIds
  });
});

// 标准化单词输入的辅助函数
function normalizeWordInput(input, userId, now) {
  const wordRaw = typeof input?.word === 'string' ? input.word.trim() : '';
  if (!wordRaw) {
    return { ok: false, error: 'word 不能为空' };
  }

  const id = typeof input?.id === 'string' && input.id.trim() ? input.id.trim() : crypto.randomUUID();
  const phonetic = typeof input?.phonetic === 'string' ? input.phonetic.trim() : '';
  const meaning = typeof input?.meaning === 'string' ? input.meaning.trim() : '';
  const exampleEn = typeof input?.exampleEn === 'string' ? input.exampleEn.trim() : '';
  const exampleZh = typeof input?.exampleZh === 'string' ? input.exampleZh.trim() : '';
  const sentence = typeof input?.sentence === 'string' ? input.sentence.trim() : '';
  const sourceUrl = typeof input?.sourceUrl === 'string' ? input.sourceUrl.trim() : '';
  const sourceTitle = typeof input?.sourceTitle === 'string' ? input.sourceTitle.trim() : '';
  const createdAt = Number.isFinite(input?.createdAt) ? Number(input.createdAt) : now;
  const clientDeviceId = typeof input?.client?.deviceId === 'string' ? input.client.deviceId.trim() : '';
  const clientEntryId = typeof input?.client?.entryId === 'string' ? input.client.entryId.trim() : '';
  const bookId = typeof input?.bookId === 'string' && input.bookId.trim() ? input.bookId.trim() : 'inbox';

  return {
    ok: true,
    word: {
      id,
      word: wordRaw,
      phonetic,
      partOfSpeech: typeof input?.partOfSpeech === 'string' ? input.partOfSpeech : 'noun',
      definition: typeof input?.definition === 'string' ? input.definition : '',
      chineseTranslation: typeof input?.chineseTranslation === 'string' ? input.chineseTranslation : meaning,
      synonyms: Array.isArray(input?.synonyms) ? input.synonyms.filter((s) => typeof s === 'string') : [],
      examples: Array.isArray(input?.examples)
        ? input.examples.filter((ex) => ex && typeof ex === 'object').map((ex) => ({ en: typeof ex.en === 'string' ? ex.en : '', zh: typeof ex.zh === 'string' ? ex.zh : '' }))
        : (exampleEn || exampleZh ? [{ en: exampleEn, zh: exampleZh }] : []),
      usageHistory: Array.isArray(input?.usageHistory)
        ? input.usageHistory.filter((h) => h && typeof h === 'object').map((h) => ({
            context: typeof h.context === 'string' ? h.context : '',
            translation: typeof h.translation === 'string' ? h.translation : '',
            source: typeof h.source === 'string' ? h.source : ''
          }))
        : (sentence || sourceTitle || sourceUrl
            ? [{ context: sentence, translation: meaning, source: sourceTitle || sourceUrl }]
            : []),
      level: typeof input?.level === 'string' ? input.level : 'B2',
      familiarity: Number.isFinite(input?.familiarity) ? Number(input.familiarity) : 0,
      bookId,
      meta: {
        sourceUrl,
        sourceTitle,
        createdAt,
        userId,
        client: clientDeviceId && clientEntryId ? { deviceId: clientDeviceId, entryId: clientEntryId } : undefined
      }
    }
  };
}

const PORT = Number(process.env.PORT || 3001);
app.listen(PORT, () => {
  console.log(`
  ==========================================
  word-base API (SQLite) 已启动
  地址: http://localhost:${PORT}
  数据库: ${path.join(DATA_DIR, 'wordbase.db')}
  
  📧 邮箱验证码会打印在控制台中！
  ==========================================
  `);
});
