import crypto from 'node:crypto';
import express from 'express';
import dotenv from 'dotenv';

import { initDatabase } from './db/index.js';
import * as usersDAL from './db/users.js';
import * as booksDAL from './db/books.js';
import * as wordsDAL from './db/words.js';
import * as authDAL from './db/auth.js';
import * as syncDAL from './db/sync.js';

dotenv.config();

// 初始化数据库
initDatabase();

const app = express();
app.use(express.json({ limit: '1mb' }));

// 10个卡通头像SVG
const AVATARS = [
  `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <circle cx="50" cy="50" r="50" fill="#FFB6C1"/>
    <circle cx="35" cy="40" r="8" fill="white"/>
    <circle cx="65" cy="40" r="8" fill="white"/>
    <circle cx="35" cy="42" r="4" fill="#333"/>
    <circle cx="65" cy="42" r="4" fill="#333"/>
    <path d="M 35 60 Q 50 75 65 60" stroke="#333" stroke-width="3" fill="none"/>
  </svg>`,
  `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <circle cx="50" cy="50" r="50" fill="#87CEEB"/>
    <circle cx="35" cy="40" r="8" fill="white"/>
    <circle cx="65" cy="40" r="8" fill="white"/>
    <circle cx="37" cy="42" r="4" fill="#333"/>
    <circle cx="67" cy="42" r="4" fill="#333"/>
    <rect x="35" y="55" width="30" height="15" rx="7" fill="#FFD700"/>
  </svg>`,
  `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <circle cx="50" cy="50" r="50" fill="#90EE90"/>
    <circle cx="35" cy="40" r="8" fill="white"/>
    <circle cx="65" cy="40" r="8" fill="white"/>
    <circle cx="35" cy="42" r="4" fill="#333"/>
    <circle cx="65" cy="42" r="4" fill="#333"/>
    <path d="M 35 65 Q 50 55 65 65" stroke="#333" stroke-width="3" fill="none"/>
  </svg>`,
  `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <circle cx="50" cy="50" r="50" fill="#DDA0DD"/>
    <circle cx="35" cy="40" r="8" fill="white"/>
    <circle cx="65" cy="40" r="8" fill="white"/>
    <circle cx="37" cy="42" r="4" fill="#333"/>
    <circle cx="67" cy="42" r="4" fill="#333"/>
    <path d="M 35 60 Q 50 50 65 60" stroke="#333" stroke-width="3" fill="none"/>
  </svg>`,
  `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <circle cx="50" cy="50" r="50" fill="#F0E68C"/>
    <circle cx="35" cy="40" r="8" fill="white"/>
    <circle cx="65" cy="40" r="8" fill="white"/>
    <circle cx="35" cy="42" r="4" fill="#333"/>
    <circle cx="65" cy="42" r="4" fill="#333"/>
    <ellipse cx="50" cy="60" rx="15" ry="10" fill="#FF6B6B"/>
  </svg>`,
  `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <circle cx="50" cy="50" r="50" fill="#E6E6FA"/>
    <circle cx="35" cy="40" r="8" fill="white"/>
    <circle cx="65" cy="40" r="8" fill="white"/>
    <circle cx="37" cy="42" r="4" fill="#333"/>
    <circle cx="67" cy="42" r="4" fill="#333"/>
    <polygon points="50,55 55,70 45,70" fill="#FFA500"/>
  </svg>`,
  `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <circle cx="50" cy="50" r="50" fill="#FFEFD5"/>
    <circle cx="35" cy="40" r="8" fill="white"/>
    <circle cx="65" cy="40" r="8" fill="white"/>
    <circle cx="35" cy="42" r="4" fill="#333"/>
    <circle cx="65" cy="42" r="4" fill="#333"/>
    <circle cx="50" cy="62" r="8" fill="#FF69B4"/>
  </svg>`,
  `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <circle cx="50" cy="50" r="50" fill="#B0E0E6"/>
    <circle cx="35" cy="40" r="8" fill="white"/>
    <circle cx="65" cy="40" r="8" fill="white"/>
    <circle cx="37" cy="42" r="4" fill="#333"/>
    <circle cx="67" cy="42" r="4" fill="#333"/>
    <rect x="40" y="55" width="20" height="15" rx="3" fill="#8B4513"/>
  </svg>`,
  `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <circle cx="50" cy="50" r="50" fill="#FAFAD2"/>
    <circle cx="35" cy="40" r="8" fill="white"/>
    <circle cx="65" cy="40" r="8" fill="white"/>
    <circle cx="35" cy="42" r="4" fill="#333"/>
    <circle cx="65" cy="42" r="4" fill="#333"/>
    <ellipse cx="50" cy="65" rx="12" ry="8" fill="#20B2AA"/>
  </svg>`,
  `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <circle cx="50" cy="50" r="50" fill="#FFE4E1"/>
    <circle cx="35" cy="40" r="8" fill="white"/>
    <circle cx="65" cy="40" r="8" fill="white"/>
    <circle cx="37" cy="42" r="4" fill="#333"/>
    <circle cx="67" cy="42" r="4" fill="#333"/>
    <path d="M 40 60 L 45 55 L 50 60 L 55 55 L 60 60" stroke="#333" stroke-width="3" fill="none"/>
  </svg>`
];

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
  const tokenRow = await authDAL.getTokenByHash(tokenHash);

  if (!tokenRow || tokenRow.type !== 'access' || Date.now() > tokenRow.expiresAt) {
    return res.status(401).json({ error: 'token_expired' });
  }

  await authDAL.updateTokenLastUsed(tokenHash);

  const user = await usersDAL.getUserById(tokenRow.userId);
  if (!user) {
    return res.status(401).json({ error: 'user_not_found' });
  }

  req.user = user;
  next();
}

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

// 根路径
app.get('/', (_req, res) => {
  res.type('text/plain').send('word-base api (SQLite, DAL架构)');
});

// 健康检查
app.get('/api/v1/health', (_req, res) => {
  res.json({ ok: true });
});

// API: 获取头像列表
app.get('/api/v1/avatars', (_req, res) => {
  res.json({ ok: true, avatars: AVATARS });
});

// API: 发送验证码
app.post('/api/v1/auth/send-code', async (req, res) => {
  const { email, type } = req.body;
  const normalizedEmail = (email || '').trim().toLowerCase();
  const validTypes = ['register', 'reset'];
  
  if (!normalizedEmail || !normalizedEmail.includes('@')) {
    return res.status(400).json({ error: 'invalid_email' });
  }
  if (!validTypes.includes(type)) {
    return res.status(400).json({ error: 'invalid_type' });
  }

  if (type === 'register') {
    const existing = await usersDAL.getUserByEmail(normalizedEmail);
    if (existing) {
      return res.status(409).json({ error: 'email_already_registered' });
    }
  }

  if (type === 'reset') {
    const existing = await usersDAL.getUserByEmail(normalizedEmail);
    if (!existing) {
      return res.status(404).json({ error: 'email_not_registered' });
    }
  }

  const code = randomVerificationCode();
  const now = Date.now();
  await authDAL.createVerificationCode({
    email: normalizedEmail,
    code,
    type,
    expiresAt: now + 10 * 60 * 1000,
    createdAt: now
  });

  sendVerificationCode(normalizedEmail, code, type);
  res.json({ ok: true, message: 'code_sent' });
});

// API: 注册
app.post('/api/v1/auth/register', async (req, res) => {
  const { email, password, code, nickname } = req.body;
  const normalizedEmail = (email || '').trim().toLowerCase();
  const cleanPassword = password || '';
  const cleanCode = (code || '').trim();
  const now = Date.now();

  if (!normalizedEmail || !normalizedEmail.includes('@')) {
    return res.status(400).json({ error: 'invalid_email' });
  }
  if (!cleanPassword || cleanPassword.length < 6) {
    return res.status(400).json({ error: 'password_too_short' });
  }
  if (!cleanCode) {
    return res.status(400).json({ error: 'code_required' });
  }

  const validCode = await authDAL.getValidVerificationCode(normalizedEmail, cleanCode, 'register');
  if (!validCode) {
    return res.status(400).json({ error: 'invalid_code' });
  }

  await authDAL.useVerificationCode(validCode.id);

  const userId = crypto.randomUUID();
  const salt = generateSalt();
  const passwordHash = hashPassword(cleanPassword, salt);
  const cleanNickname = (nickname || '').trim() || normalizedEmail.split('@')[0];
  const randomAvatar = Math.floor(Math.random() * AVATARS.length);

  await usersDAL.createUser({
    id: userId,
    email: normalizedEmail,
    passwordHash,
    passwordSalt: salt,
    nickname: cleanNickname,
    avatar: randomAvatar,
    createdAt: now,
    updatedAt: now
  });

  await booksDAL.createBook({
    id: `${userId}_default`,
    userId,
    name: '默认',
    description: '用于存放单词的默认单词本',
    wordCount: 0,
    icon: 'BookOpen',
    isSync: 1,
    createdAt: now,
    updatedAt: now
  });

  const accessToken = randomToken();
  const refreshToken = randomToken();
  const accessExpiresAt = now + 24 * 60 * 60 * 1000;
  const refreshExpiresAt = now + 7 * 24 * 60 * 60 * 1000;

  await authDAL.createToken({
    tokenHash: sha256Hex(accessToken),
    userId,
    type: 'access',
    expiresAt: accessExpiresAt,
    createdAt: now,
    lastUsedAt: now
  });

  await authDAL.createToken({
    tokenHash: sha256Hex(refreshToken),
    userId,
    type: 'refresh',
    expiresAt: refreshExpiresAt,
    createdAt: now,
    lastUsedAt: now
  });

  const user = await usersDAL.getUserById(userId);
  res.json({ ok: true, accessToken, refreshToken, user });
});

// API: 登录
app.post('/api/v1/auth/login', async (req, res) => {
  const { email, password, remember } = req.body;
  const normalizedEmail = (email || '').trim().toLowerCase();
  const cleanPassword = password || '';
  const now = Date.now();

  if (!normalizedEmail || !cleanPassword) {
    return res.status(400).json({ error: 'invalid_credentials' });
  }

  const user = await usersDAL.getUserByEmail(normalizedEmail);
  if (!user) {
    return res.status(404).json({ error: 'email_not_registered' });
  }

  const expectedHash = hashPassword(cleanPassword, user.passwordSalt);
  if (expectedHash !== user.passwordHash) {
    return res.status(401).json({ error: 'wrong_password' });
  }

  const accessToken = randomToken();
  const refreshToken = randomToken();
  const accessExpiresAt = now + 24 * 60 * 60 * 1000;
  const refreshExpiresAt = remember === true ? now + 7 * 24 * 60 * 60 * 1000 : accessExpiresAt;

  await authDAL.createToken({
    tokenHash: sha256Hex(accessToken),
    userId: user.id,
    type: 'access',
    expiresAt: accessExpiresAt,
    createdAt: now,
    lastUsedAt: now
  });

  await authDAL.createToken({
    tokenHash: sha256Hex(refreshToken),
    userId: user.id,
    type: 'refresh',
    expiresAt: refreshExpiresAt,
    createdAt: now,
    lastUsedAt: now
  });

  const safeUser = await usersDAL.getUserById(user.id);
  res.json({ ok: true, accessToken, refreshToken, user: safeUser });
});

// API: 刷新 token
app.post('/api/v1/auth/refresh', async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    return res.status(400).json({ error: 'refresh_token_required' });
  }

  const tokenHash = sha256Hex(refreshToken);
  const tokenRow = await authDAL.getTokenByHash(tokenHash);

  if (!tokenRow || tokenRow.type !== 'refresh' || Date.now() > tokenRow.expiresAt) {
    return res.status(401).json({ error: 'invalid_refresh_token' });
  }

  const user = await usersDAL.getUserById(tokenRow.userId);
  if (!user) {
    return res.status(401).json({ error: 'user_not_found' });
  }

  const now = Date.now();
  await authDAL.deleteToken(tokenHash);

  const newAccessToken = randomToken();
  const newRefreshToken = randomToken();
  const accessExpiresAt = now + 24 * 60 * 60 * 1000;

  await authDAL.createToken({
    tokenHash: sha256Hex(newAccessToken),
    userId: user.id,
    type: 'access',
    expiresAt: accessExpiresAt,
    createdAt: now,
    lastUsedAt: now
  });

  await authDAL.createToken({
    tokenHash: sha256Hex(newRefreshToken),
    userId: user.id,
    type: 'refresh',
    expiresAt: tokenRow.expiresAt,
    createdAt: now,
    lastUsedAt: now
  });

  res.json({ ok: true, accessToken: newAccessToken, refreshToken: newRefreshToken, user });
});

// API: 重置密码 - 验证验证码
app.post('/api/v1/auth/reset-password-verify', async (req, res) => {
  const { email, code } = req.body;
  const normalizedEmail = (email || '').trim().toLowerCase();
  const cleanCode = (code || '').trim();
  const now = Date.now();

  if (!normalizedEmail || !cleanCode) {
    return res.status(400).json({ error: 'invalid_input' });
  }

  const validCode = await authDAL.getValidVerificationCode(normalizedEmail, cleanCode, 'reset');
  if (!validCode) {
    return res.status(400).json({ error: 'invalid_code' });
  }

  await authDAL.useVerificationCode(validCode.id);

  const user = await usersDAL.getUserByEmail(normalizedEmail);
  const tempToken = randomToken();
  const tempExpiresAt = now + 5 * 60 * 1000;

  await authDAL.createToken({
    tokenHash: sha256Hex(tempToken),
    userId: user.id,
    type: 'reset',
    expiresAt: tempExpiresAt,
    createdAt: now,
    lastUsedAt: now
  });

  res.json({ ok: true, resetToken: tempToken });
});

// API: 重置密码 - 设置新密码
app.post('/api/v1/auth/reset-password', async (req, res) => {
  const { resetToken, newPassword } = req.body;
  const cleanPassword = newPassword || '';
  const now = Date.now();

  if (!resetToken) {
    return res.status(400).json({ error: 'reset_token_required' });
  }
  if (!cleanPassword || cleanPassword.length < 6) {
    return res.status(400).json({ error: 'password_too_short' });
  }

  const tokenHash = sha256Hex(resetToken);
  const tokenRow = await authDAL.getTokenByHash(tokenHash);

  if (!tokenRow || tokenRow.type !== 'reset' || Date.now() > tokenRow.expiresAt) {
    return res.status(401).json({ error: 'invalid_reset_token' });
  }

  const salt = generateSalt();
  const passwordHash = hashPassword(cleanPassword, salt);
  await usersDAL.updateUser(tokenRow.userId, {
    passwordHash,
    passwordSalt: salt
  });

  await authDAL.deleteToken(tokenHash);
  await authDAL.deleteAllUserTokens(tokenRow.userId, ['access', 'refresh']);

  const accessToken = randomToken();
  const refreshToken = randomToken();
  const accessExpiresAt = now + 24 * 60 * 60 * 1000;
  const refreshExpiresAt = now + 7 * 24 * 60 * 60 * 1000;

  await authDAL.createToken({
    tokenHash: sha256Hex(accessToken),
    userId: tokenRow.userId,
    type: 'access',
    expiresAt: accessExpiresAt,
    createdAt: now,
    lastUsedAt: now
  });

  await authDAL.createToken({
    tokenHash: sha256Hex(refreshToken),
    userId: tokenRow.userId,
    type: 'refresh',
    expiresAt: refreshExpiresAt,
    createdAt: now,
    lastUsedAt: now
  });

  const user = await usersDAL.getUserById(tokenRow.userId);
  res.json({ ok: true, accessToken, refreshToken, user });
});

// API: 登出
app.post('/api/v1/auth/logout', requireAuth, async (req, res) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length).trim() : '';
  
  if (token) {
    await authDAL.deleteToken(sha256Hex(token));
  }
  res.json({ ok: true });
});

// API: 删除账号
app.delete('/api/v1/auth/delete-account', requireAuth, async (req, res) => {
  const userId = req.user.id;
  
  const books = await booksDAL.getBooksByUserId(userId);
  for (const book of books) {
    await booksDAL.deleteBook(book.id, userId);
  }
  
  await authDAL.deleteAllUserTokens(userId);
  await usersDAL.deleteUser(userId);
  
  res.json({ ok: true });
});

// API: 获取当前用户信息
app.get('/api/v1/user', requireAuth, (req, res) => {
  res.json({ ok: true, user: req.user });
});

// API: 更新用户信息
app.patch('/api/v1/user', requireAuth, async (req, res) => {
  const { nickname, avatar } = req.body;
  const updates = {};
  
  if (nickname !== undefined) {
    const cleanNickname = (nickname || '').trim();
    if (!cleanNickname) {
      return res.status(400).json({ error: 'nickname_required' });
    }
    updates.nickname = cleanNickname;
  }
  
  if (avatar !== undefined) {
    const cleanAvatar = Number.isFinite(avatar) ? Math.max(0, Math.min(AVATARS.length - 1, avatar)) : 0;
    updates.avatar = cleanAvatar;
  }
  
  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: 'nothing_to_update' });
  }
  
  const updatedUser = await usersDAL.updateUser(req.user.id, updates);
  res.json({ ok: true, user: updatedUser });
});

// API: 修改密码
app.post('/api/v1/user/change-password', requireAuth, async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const cleanOld = oldPassword || '';
  const cleanNew = newPassword || '';

  if (!cleanOld || !cleanNew || cleanNew.length < 6) {
    return res.status(400).json({ error: 'invalid_input' });
  }

  const user = await usersDAL.getUserById(req.user.id);
  const expectedHash = hashPassword(cleanOld, user.passwordSalt);
  if (expectedHash !== user.passwordHash) {
    return res.status(401).json({ error: 'wrong_old_password' });
  }

  const salt = generateSalt();
  const passwordHash = hashPassword(cleanNew, salt);
  await usersDAL.updateUser(req.user.id, { passwordHash, passwordSalt: salt });

  res.json({ ok: true });
});

// API: 获取用户的所有单词本
app.get('/api/v1/books', requireAuth, async (req, res) => {
  const userId = req.user.id;
  const books = booksDAL.getBooksByUserId(userId);
  res.json({ ok: true, books });
});

// API: 创建新单词本
app.post('/api/v1/books', requireAuth, async (req, res) => {
  const { name, description, icon } = req.body;
  const userId = req.user.id;
  const now = Date.now();
  
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'name_required' });
  }
  
  const existingBooks = booksDAL.getBooksByUserId(userId);
  const existing = existingBooks.find(b => b.name.toLowerCase() === name.trim().toLowerCase());
  if (existing) {
    return res.status(409).json({ error: 'book_name_already_exists' });
  }
  
  const bookId = crypto.randomUUID();
  const newBook = booksDAL.createBook({
    id: bookId, userId, name: name.trim(),
    description: description || '',
    wordCount: 0,
    icon: icon || 'BookOpen',
    isSync: false, createdAt: now, updatedAt: now
  });
  
  res.json({ ok: true, book: { ...newBook, isSync: !!newBook.isSync } });
});

// API: 设置同步单词本
app.patch('/api/v1/books/:bookId/set-sync', requireAuth, async (req, res) => {
  const { bookId } = req.params;
  const userId = req.user.id;
  
  const existingBook = booksDAL.getBookById(bookId, userId);
  if (!existingBook) {
    return res.status(404).json({ error: 'book_not_found' });
  }
  
  const books = booksDAL.setSyncBook(userId, bookId);
  res.json({ ok: true, books });
});

// API: 更新单词本
app.patch('/api/v1/books/:bookId', requireAuth, async (req, res) => {
  const { bookId } = req.params;
  const { name, description, icon } = req.body;
  const userId = req.user.id;
  
  const existingBook = booksDAL.getBookById(bookId, userId);
  if (!existingBook) {
    return res.status(404).json({ error: 'book_not_found' });
  }
  
  const updatedBook = booksDAL.updateBook(bookId, userId, { name, description, icon });
  res.json({ ok: true, book: updatedBook });
});

// API: 删除单词本
app.delete('/api/v1/books/:bookId', requireAuth, async (req, res) => {
  const { bookId } = req.params;
  const userId = req.user.id;
  
  const existingBook = booksDAL.getBookById(bookId, userId);
  if (!existingBook) {
    return res.status(404).json({ error: 'book_not_found' });
  }
  
  if (existingBook.isSync) {
    return res.status(400).json({ error: 'cannot_delete_sync_book' });
  }
  
  booksDAL.deleteBook(bookId, userId);
  res.json({ ok: true });
});

// API: 批量删除单词本
app.post('/api/v1/books/batch-delete', requireAuth, async (req, res) => {
  const { bookIds } = req.body;
  const userId = req.user.id;
  
  if (!bookIds || !Array.isArray(bookIds)) {
    return res.status(400).json({ error: 'invalid_input' });
  }
  
  const books = booksDAL.getBooksByUserId(userId);
  const syncBook = books.find(b => b.isSync);
  
  if (syncBook && bookIds.includes(syncBook.id)) {
    return res.status(400).json({ error: 'cannot_delete_sync_book' });
  }
  
  for (const id of bookIds) {
    booksDAL.deleteBook(id, userId);
  }
  
  res.json({ ok: true });
});

// API: 获取单词
app.get('/api/v1/words', requireAuth, async (req, res) => {
  const { bookId } = req.query;
  const words = wordsDAL.getWords(req.user.id, bookId);
  res.json({ ok: true, words });
});

// 标准化单词输入的辅助函数
function normalizeWordInput(input, userId, now) {
  const wordRaw = typeof input?.word === 'string' ? input.word.trim() : '';
  if (!wordRaw) {
    return { ok: false, error: 'word 不能为空' };
  }

  const id = typeof input?.id === 'string' && input.id.trim() ? input.id.trim() : crypto.randomUUID();
  const bookId = input.bookId || `${userId}_default`;
  
  return {
    ok: true,
    word: {
      id,
      userId,
      word: wordRaw,
      frequency: input.frequency || 1,
      translation: input.translation || '',
      timeAdded: input.timeAdded || now,
      timeUpdated: input.timeUpdated || now,
      contexts: JSON.stringify(input.contexts || []),
      phonetic: input.phonetic || '',
      partOfSpeech: input.partOfSpeech || 'noun',
      definition: input.definition || '',
      chineseTranslation: input.chineseTranslation || input.translation || '',
      synonyms: JSON.stringify(input.synonyms || []),
      examples: JSON.stringify(input.examples || []),
      usageHistory: JSON.stringify(input.usageHistory || []),
      level: input.level || 'B2',
      familiarity: input.familiarity || 0,
      bookId,
      meta: JSON.stringify(input.meta || {}),
      createdAt: input.timeAdded || now,
      updatedAt: now
    }
  };
}

// API: 添加单词
app.post('/api/v1/words', requireAuth, async (req, res) => {
  const now = Date.now();
  const userId = req.user.id;
  const input = req.body;
  
  const syncBook = booksDAL.getSyncBook(userId);
  if (!input.bookId && syncBook) {
    input.bookId = syncBook.id;
  }
  
  if (input.frequency !== undefined || input.contexts !== undefined) {
    return handleAddNewFormatWord(input, userId, now, res);
  }
  
  const normalized = normalizeWordInput(input, userId, now);
  if (!normalized.ok) {
    return res.status(400).json({ error: normalized.error });
  }

  const { word } = normalized;
  const existing = wordsDAL.checkWordExists(userId, word.word, word.bookId);
  if (existing) {
    return res.json({ ok: true, saved: false, duplicate: true, word: existing });
  }

  const newWord = wordsDAL.createWord(word);
  res.json({ ok: true, saved: true, duplicate: false, word: newWord });
});

// 处理新格式单词添加
function handleAddNewFormatWord(input, userId, now, res) {
  const wordId = input.id || crypto.randomUUID();
  const bookId = input.bookId || `${userId}_default`;
  
  const existing = wordsDAL.checkWordExists(userId, input.word, bookId);
  
  if (existing) {
    let existingContexts = [];
    if (existing.contexts) {
      existingContexts = existing.contexts;
    }
    
    const newContexts = input.contexts || [];
    const mergedContexts = [...existingContexts];
    
    for (const newCtx of newContexts) {
      const isDuplicate = mergedContexts.some(existingCtx => 
        existingCtx.context === newCtx.context && 
        existingCtx.sourceLink === newCtx.sourceLink
      );
      if (!isDuplicate) {
        mergedContexts.push(newCtx);
      }
    }
    
    const updatedWord = wordsDAL.updateWordContexts(existing.id, userId, mergedContexts);
    return res.json({ ok: true, saved: true, duplicate: false, word: updatedWord });
  }
  
  const normalized = normalizeWordInput(input, userId, now);
  const newWord = wordsDAL.createWord(normalized.word);
  res.json({ ok: true, saved: true, duplicate: false, word: newWord });
}

// API: 批量同步单词
app.post('/api/v1/words/batch', requireAuth, async (req, res) => {
  const { deviceId, entries } = req.body;
  const userId = req.user.id;
  const now = Date.now();

  if (!deviceId || !Array.isArray(entries)) {
    return res.status(400).json({ error: 'invalid_input' });
  }

  const syncBook = booksDAL.getSyncBook(userId);
  const processedEntryIds = [];
  let savedCount = 0;
  let duplicateCount = 0;

  for (const entry of entries) {
    const entryId = entry._legacy?.id || entry.id;
    if (!entryId) continue;

    const input = { ...entry, client: { deviceId, entryId } };
    if (!input.bookId && syncBook) {
      input.bookId = syncBook.id;
    }
    
    if (entry.frequency !== undefined || entry.contexts !== undefined) {
      handleAddNewFormatWord(input, userId, now, { json: () => {} });
      savedCount++;
      processedEntryIds.push(entryId);
      continue;
    }
    
    const normalized = normalizeWordInput(input, userId, now);
    if (!normalized.ok) continue;

    const { word } = normalized;
    const existing = wordsDAL.checkWordExists(userId, word.word, word.bookId);
    if (existing) {
      duplicateCount++;
      processedEntryIds.push(entryId);
      continue;
    }

    wordsDAL.createWord(word);
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

// API: 批量删除单词
app.post('/api/v1/words/batch-delete', requireAuth, async (req, res) => {
  const { wordIds } = req.body;
  const userId = req.user.id;
  
  if (!wordIds || !Array.isArray(wordIds)) {
    return res.status(400).json({ error: 'invalid_input' });
  }
  
  for (const wordId of wordIds) {
    wordsDAL.deleteWordById(wordId, userId);
  }
  
  res.json({ ok: true, deletedCount: wordIds.length });
});

// API: 获取同步状态和最新版本
app.get('/api/v1/sync/status', requireAuth, async (req, res) => {
  const userId = req.user.id;
  const latestVersion = syncDAL.getLatestSyncVersion(userId);
  res.json({ ok: true, latestVersion });
});

// API: 获取增量变更
app.get('/api/v1/sync/changes', requireAuth, async (req, res) => {
  const userId = req.user.id;
  const sinceVersion = Number(req.query.sinceVersion) || 0;
  
  const changelogs = syncDAL.getChangelogsSince(userId, sinceVersion);
  
  // 获取所有变更的实体数据
  const changes = [];
  const bookIds = new Set();
  const wordIds = new Set();
  
  for (const log of changelogs) {
    if (log.action !== 'delete') {
      if (log.entityType === 'book') {
        bookIds.add(log.entityId);
      } else if (log.entityType === 'word') {
        wordIds.add(log.entityId);
      }
    }
    changes.push({
      entityType: log.entityType,
      entityId: log.entityId,
      action: log.action,
      syncVersion: log.syncVersion
    });
  }
  
  // 获取变更的单词本
  const books = booksDAL.getBooksByUserId(userId);
  const changedBooks = books.filter(b => bookIds.has(b.id));
  
  // 获取变更的单词
  const allWords = wordsDAL.getWords(userId);
  const changedWords = allWords.filter(w => wordIds.has(w.id));
  
  res.json({
    ok: true,
    changes,
    books: changedBooks,
    words: changedWords,
    latestVersion: changelogs.length > 0 ? changelogs[changelogs.length - 1].syncVersion : sinceVersion
  });
});

// API: 全量同步（获取所有数据）
app.get('/api/v1/sync/full', requireAuth, async (req, res) => {
  const userId = req.user.id;
  const books = booksDAL.getBooksByUserId(userId);
  const words = wordsDAL.getWords(userId);
  const latestVersion = syncDAL.getLatestSyncVersion(userId);
  
  res.json({
    ok: true,
    books,
    words,
    latestVersion
  });
});

const PORT = Number(process.env.PORT || 3001);
app.listen(PORT, () => {
  console.log(`
    ==========================================
    word-base API (SQLite, DAL架构) 已启动
    地址: http://localhost:${PORT}
    数据库: .data/wordbase.db
    
    📧 邮箱验证码会打印在控制台中!
    ==========================================
  `);
});
