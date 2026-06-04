import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, '.data');
const WORDS_FILE = path.join(DATA_DIR, 'words.json');
const TOKENS_FILE = path.join(DATA_DIR, 'tokens.json');
const PAIRINGS_FILE = path.join(DATA_DIR, 'pairings.json');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

async function readJson(filePath, fallback) {
  try {
    const text = await fs.readFile(filePath, 'utf8');
    return JSON.parse(text);
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      return fallback;
    }
    throw error;
  }
}

async function writeJsonAtomic(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const tmpPath = `${filePath}.${crypto.randomUUID()}.tmp`;
  await fs.writeFile(tmpPath, JSON.stringify(value, null, 2), 'utf8');
  await fs.rename(tmpPath, filePath);
}

function sha256Hex(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

function randomToken() {
  return crypto.randomBytes(32).toString('base64url');
}

function randomPairingCode() {
  return crypto.randomBytes(6).toString('base64url').slice(0, 8).toUpperCase();
}

function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

async function readTokens() {
  const data = await readJson(TOKENS_FILE, {});
  return data && typeof data === 'object' && !Array.isArray(data) ? data : {};
}

async function writeTokens(tokens) {
  await writeJsonAtomic(TOKENS_FILE, tokens);
}

async function readPairings() {
  const data = await readJson(PAIRINGS_FILE, {});
  return data && typeof data === 'object' && !Array.isArray(data) ? data : {};
}

async function writePairings(pairings) {
  await writeJsonAtomic(PAIRINGS_FILE, pairings);
}

async function readUsers() {
  const data = await readJson(USERS_FILE, {});
  return data && typeof data === 'object' && !Array.isArray(data) ? data : {};
}

async function writeUsers(users) {
  await writeJsonAtomic(USERS_FILE, users);
}

function hashPassword(password, salt) {
  return crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
}

function generateSalt() {
  return crypto.randomBytes(32).toString('hex');
}

async function requireAuth(req, res, next) {
  const raw = typeof req.headers?.authorization === 'string' ? req.headers.authorization : '';
  const token = raw.startsWith('Bearer ') ? raw.slice('Bearer '.length).trim() : '';
  if (!token) {
    res.status(401).json({ error: 'unauthorized' });
    return;
  }

  const tokenId = sha256Hex(token);
  const tokens = await readTokens();
  const record = tokens[tokenId];
  if (!record || typeof record !== 'object') {
    res.status(401).json({ error: 'unauthorized' });
    return;
  }

  if (record.type !== 'access') {
    res.status(401).json({ error: 'unauthorized' });
    return;
  }

  const userId = typeof record.userId === 'string' ? record.userId : '';
  if (!userId) {
    res.status(401).json({ error: 'unauthorized' });
    return;
  }

  if (Number(record.expiresAt) < Date.now()) {
    res.status(401).json({ error: 'token_expired' });
    return;
  }

  tokens[tokenId] = { ...record, lastUsedAt: Date.now() };
  await writeTokens(tokens);

  req.auth = { tokenId, userId, token };
  next();
}

function normalizeWordInput(input, userId) {
  const now = Date.now();
  const wordRaw = typeof input?.word === 'string' ? input.word.trim() : '';
  if (!wordRaw) {
    return { ok: false, error: 'word 不能为空' };
  }

  const id = typeof input?.id === 'string' && input.id.trim()
    ? input.id.trim()
    : crypto.randomUUID();

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

  const bookId = typeof input?.bookId === 'string' && input.bookId.trim()
    ? input.bookId.trim()
    : 'inbox';

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
        ? input.examples
            .filter((ex) => ex && typeof ex === 'object')
            .map((ex) => ({
              en: typeof ex.en === 'string' ? ex.en : '',
              zh: typeof ex.zh === 'string' ? ex.zh : ''
            }))
        : (exampleEn || exampleZh ? [{ en: exampleEn, zh: exampleZh }] : []),
      usageHistory: Array.isArray(input?.usageHistory)
        ? input.usageHistory
            .filter((h) => h && typeof h === 'object')
            .map((h) => ({
              context: typeof h.context === 'string' ? h.context : '',
              translation: typeof h.translation === 'string' ? h.translation : '',
              source: typeof h.source === 'string' ? h.source : ''
            }))
        : (sentence || sourceTitle || sourceUrl
            ? [
                {
                  context: sentence,
                  translation: meaning,
                  source: sourceTitle || sourceUrl
                }
              ]
            : []),
      level: typeof input?.level === 'string' ? input.level : 'B2',
      familiarity: Number.isFinite(input?.familiarity) ? Number(input.familiarity) : 0,
      bookId,
      meta: {
        sourceUrl,
        sourceTitle,
        createdAt,
        userId,
        client: clientDeviceId && clientEntryId
          ? { deviceId: clientDeviceId, entryId: clientEntryId }
          : undefined
      }
    }
  };
}

function clientKeyForWord(w) {
  const userId = String(w?.meta?.userId || '').trim();
  const deviceId = String(w?.meta?.client?.deviceId || '').trim();
  const entryId = String(w?.meta?.client?.entryId || '').trim();
  return userId && deviceId && entryId ? `user:${userId}|client:${deviceId}:${entryId}` : '';
}

function wordKeyForWord(w) {
  const userId = String(w?.meta?.userId || '').trim();
  const wordKey = String(w?.word || '').trim().toLowerCase();
  const bookKey = String(w?.bookId || '').trim().toLowerCase();
  return `${userId}::${bookKey}::${wordKey}`;
}

const app = express();
app.use(express.json({ limit: '1mb' }));

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

app.get('/', (_req, res) => {
  res.type('text/plain').send('word-base api');
});

app.get('/api/v1/info', (_req, res) => {
  res.json({
    name: 'word-base-api',
    features: {
      batch: true,
      auth: true,
      pairing: true
    }
  });
});

app.get('/api/v1/health', (_req, res) => {
  res.json({ ok: true });
});

app.post('/api/v1/auth/register', asyncHandler(async (req, res) => {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const password = typeof req.body?.password === 'string' ? req.body.password : '';

  if (!email) {
    res.status(400).json({ error: 'email 不能为空' });
    return;
  }
  if (!email.includes('@')) {
    res.status(400).json({ error: 'email 格式无效' });
    return;
  }
  if (!password || password.length < 6) {
    res.status(400).json({ error: 'password 至少需要 6 个字符' });
    return;
  }

  const users = await readUsers();
  if (Object.values(users).some(u => u && u.email === email)) {
    res.status(409).json({ error: 'email 已被注册' });
    return;
  }

  const userId = crypto.randomUUID();
  const salt = generateSalt();
  const passwordHash = hashPassword(password, salt);

  users[userId] = {
    id: userId,
    email,
    passwordHash,
    passwordSalt: salt,
    createdAt: Date.now()
  };
  await writeUsers(users);

  const accessToken = randomToken();
  const refreshToken = randomToken();
  const now = Date.now();

  const tokens = await readTokens();
  tokens[sha256Hex(accessToken)] = {
    type: 'access',
    userId,
    createdAt: now,
    expiresAt: now + 24 * 60 * 60 * 1000,
    lastUsedAt: now
  };
  tokens[sha256Hex(refreshToken)] = {
    type: 'refresh',
    userId,
    createdAt: now,
    expiresAt: now + 30 * 24 * 60 * 60 * 1000,
    lastUsedAt: now
  };
  await writeTokens(tokens);

  res.json({
    accessToken,
    refreshToken,
    user: { id: userId, email, createdAt: users[userId].createdAt }
  });
}));

app.post('/api/v1/auth/login', asyncHandler(async (req, res) => {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const password = typeof req.body?.password === 'string' ? req.body.password : '';

  if (!email || !password) {
    res.status(400).json({ error: 'email 和 password 不能为空' });
    return;
  }

  const users = await readUsers();
  const user = Object.values(users).find(u => u && u.email === email);
  if (!user) {
    res.status(401).json({ error: 'invalid_credentials' });
    return;
  }

  const expectedHash = hashPassword(password, user.passwordSalt);
  if (expectedHash !== user.passwordHash) {
    res.status(401).json({ error: 'invalid_credentials' });
    return;
  }

  const accessToken = randomToken();
  const refreshToken = randomToken();
  const now = Date.now();

  const tokens = await readTokens();
  tokens[sha256Hex(accessToken)] = {
    type: 'access',
    userId: user.id,
    createdAt: now,
    expiresAt: now + 24 * 60 * 60 * 1000,
    lastUsedAt: now
  };
  tokens[sha256Hex(refreshToken)] = {
    type: 'refresh',
    userId: user.id,
    createdAt: now,
    expiresAt: now + 30 * 24 * 60 * 60 * 1000,
    lastUsedAt: now
  };
  await writeTokens(tokens);

  res.json({
    accessToken,
    refreshToken,
    user: { id: user.id, email: user.email, createdAt: user.createdAt }
  });
}));

app.post('/api/v1/auth/refresh', asyncHandler(async (req, res) => {
  const refreshToken = typeof req.body?.refreshToken === 'string' ? req.body.refreshToken.trim() : '';
  if (!refreshToken) {
    res.status(400).json({ error: 'refreshToken 不能为空' });
    return;
  }

  const tokenId = sha256Hex(refreshToken);
  const tokens = await readTokens();
  const record = tokens[tokenId];
  if (!record || typeof record !== 'object' || record.type !== 'refresh') {
    res.status(401).json({ error: 'invalid_refresh_token' });
    return;
  }

  if (Number(record.expiresAt) < Date.now()) {
    res.status(401).json({ error: 'refresh_token_expired' });
    return;
  }

  const userId = String(record.userId);
  const users = await readUsers();
  const user = users[userId];
  if (!user) {
    res.status(401).json({ error: 'user_not_found' });
    return;
  }

  const accessToken = randomToken();
  const now = Date.now();

  tokens[sha256Hex(accessToken)] = {
    type: 'access',
    userId,
    createdAt: now,
    expiresAt: now + 24 * 60 * 60 * 1000,
    lastUsedAt: now
  };
  tokens[tokenId] = { ...record, lastUsedAt: now };
  await writeTokens(tokens);

  res.json({
    accessToken,
    user: { id: user.id, email: user.email, createdAt: user.createdAt }
  });
}));

app.post('/api/v1/session/bootstrap', asyncHandler(async (_req, res) => {
  const workspaceId = crypto.randomUUID();
  const token = randomToken();
  const tokenId = sha256Hex(token);
  const tokens = await readTokens();
  tokens[tokenId] = {
    workspaceId,
    createdAt: Date.now(),
    lastUsedAt: Date.now()
  };
  await writeTokens(tokens);
  res.json({ token });
}));

app.get('/api/v1/pairing/code', requireAuth, asyncHandler(async (req, res) => {
  const now = Date.now();
  const workspaceId = req.auth.workspaceId;
  const pairings = await readPairings();

  const existing = Object.entries(pairings).find(([, value]) => {
    if (!value || typeof value !== 'object') {
      return false;
    }
    return value.workspaceId === workspaceId && Number(value.expiresAt) > now;
  });

  if (existing) {
    const [code, value] = existing;
    res.json({ code, expiresAt: Number(value.expiresAt) });
    return;
  }

  let code = randomPairingCode();
  while (pairings[code]) {
    code = randomPairingCode();
  }

  pairings[code] = {
    workspaceId,
    createdAt: now,
    expiresAt: now + 10 * 60 * 1000,
    claimCount: 0
  };
  await writePairings(pairings);
  res.json({ code, expiresAt: pairings[code].expiresAt });
}));

app.post('/api/v1/pairing/new', requireAuth, asyncHandler(async (req, res) => {
  const now = Date.now();
  const workspaceId = req.auth.workspaceId;
  const pairings = await readPairings();

  let code = randomPairingCode();
  while (pairings[code]) {
    code = randomPairingCode();
  }

  pairings[code] = {
    workspaceId,
    createdAt: now,
    expiresAt: now + 10 * 60 * 1000,
    claimCount: 0
  };
  await writePairings(pairings);
  res.json({ code, expiresAt: pairings[code].expiresAt });
}));

app.post('/api/v1/pairing/claim', asyncHandler(async (req, res) => {
  const code = typeof req.body?.code === 'string' ? req.body.code.trim().toUpperCase() : '';
  const deviceId = typeof req.body?.deviceId === 'string' ? req.body.deviceId.trim() : '';
  if (!code) {
    res.status(400).json({ error: 'code 不能为空' });
    return;
  }
  if (!deviceId) {
    res.status(400).json({ error: 'deviceId 不能为空' });
    return;
  }

  const now = Date.now();
  const pairings = await readPairings();
  const record = pairings[code];
  if (!record || typeof record !== 'object') {
    res.status(404).json({ error: 'code_not_found' });
    return;
  }
  if (!(Number(record.expiresAt) > now)) {
    res.status(410).json({ error: 'code_expired' });
    return;
  }
  const workspaceId = typeof record.workspaceId === 'string' ? record.workspaceId : '';
  if (!workspaceId) {
    res.status(400).json({ error: 'invalid_code' });
    return;
  }

  const token = randomToken();
  const tokenId = sha256Hex(token);
  const tokens = await readTokens();
  tokens[tokenId] = {
    workspaceId,
    deviceId,
    createdAt: now,
    lastUsedAt: now
  };
  await writeTokens(tokens);

  pairings[code] = {
    ...record,
    claimCount: Number.isFinite(record.claimCount) ? record.claimCount + 1 : 1,
    lastClaimAt: now
  };
  await writePairings(pairings);

  res.json({ token });
}));

async function loadWordsForUser(userId) {
  const all = await readJson(WORDS_FILE, []);
  const words = Array.isArray(all) ? all : [];
  return words.filter((w) => String(w?.meta?.userId || '').trim() === userId);
}

app.get('/api/v1/words', requireAuth, asyncHandler(async (req, res) => {
  const userId = req.auth.userId;
  const words = await loadWordsForUser(userId);
  const bookId = typeof req.query.bookId === 'string' ? req.query.bookId.trim() : '';
  const filtered = bookId ? words.filter((w) => w?.bookId === bookId) : words;
  res.json({ words: filtered });
}));

app.post('/api/v1/words', requireAuth, asyncHandler(async (req, res) => {
  const userId = req.auth.userId;
  const normalized = normalizeWordInput(req.body, userId);
  if (!normalized.ok) {
    res.status(400).json({ error: normalized.error });
    return;
  }

  const nextWord = normalized.word;
  const userWords = await loadWordsForUser(userId);
  const nextClientKey = clientKeyForWord(nextWord);
  const nextWordKey = wordKeyForWord(nextWord);
  const existing = userWords.find((w) => {
    const wClientKey = clientKeyForWord(w);
    if (nextClientKey && wClientKey === nextClientKey) {
      return true;
    }
    return wordKeyForWord(w) === nextWordKey;
  });
  if (existing) {
    res.json({ saved: true, duplicate: true, word: existing });
    return;
  }

  const all = await readJson(WORDS_FILE, []);
  const words = Array.isArray(all) ? all : [];
  const nextWords = [nextWord, ...words].sort((a, b) => {
    const aAt = a?.meta?.createdAt || 0;
    const bAt = b?.meta?.createdAt || 0;
    return bAt - aAt;
  });

  await writeJsonAtomic(WORDS_FILE, nextWords);
  res.json({ saved: true, duplicate: false, word: nextWord });
}));

app.post('/api/v1/words/batch', requireAuth, asyncHandler(async (req, res) => {
  const userId = req.auth.userId;
  const deviceId = typeof req.body?.deviceId === 'string' ? req.body.deviceId.trim() : '';
  const entries = Array.isArray(req.body?.entries) ? req.body.entries : [];

  if (!deviceId) {
    res.status(400).json({ error: 'deviceId 不能为空' });
    return;
  }
  if (entries.length === 0) {
    res.json({
      received: 0,
      savedCount: 0,
      duplicateCount: 0,
      processedEntryIds: []
    });
    return;
  }
  if (entries.length > 200) {
    res.status(413).json({ error: 'entries 过多（最多 200）' });
    return;
  }

  const userWords = await loadWordsForUser(userId);
  const existingClientKeys = new Set(userWords.map(clientKeyForWord).filter(Boolean));
  const existingWordKeys = new Set(userWords.map(wordKeyForWord));

  const processedEntryIds = [];
  const savedWords = [];
  let duplicateCount = 0;

  for (const entry of entries) {
    const entryId = typeof entry?.id === 'string' ? entry.id.trim() : '';
    if (!entryId) {
      continue;
    }

    const normalized = normalizeWordInput({
      ...(entry || {}),
      client: {
        deviceId,
        entryId
      }
    }, userId);
    if (!normalized.ok) {
      continue;
    }

    const nextWord = normalized.word;
    const nextClientKey = clientKeyForWord(nextWord);
    const nextWordKey = wordKeyForWord(nextWord);
    processedEntryIds.push(entryId);

    if ((nextClientKey && existingClientKeys.has(nextClientKey)) || existingWordKeys.has(nextWordKey)) {
      duplicateCount += 1;
      continue;
    }

    if (nextClientKey) {
      existingClientKeys.add(nextClientKey);
    }
    existingWordKeys.add(nextWordKey);
    savedWords.push(nextWord);
  }

  if (savedWords.length > 0) {
    const all = await readJson(WORDS_FILE, []);
    const words = Array.isArray(all) ? all : [];
    const nextWords = [...savedWords, ...words].sort((a, b) => {
      const aAt = a?.meta?.createdAt || 0;
      const bAt = b?.meta?.createdAt || 0;
      return bAt - aAt;
    });
    await writeJsonAtomic(WORDS_FILE, nextWords);
  }

  res.json({
    received: entries.length,
    savedCount: savedWords.length,
    duplicateCount,
    processedEntryIds
  });
}));

const port = Number(process.env.PORT || 3001);
app.listen(port, () => {
  process.stdout.write(`word-base api listening on http://localhost:${port}\n`);
});
