import Database from 'better-sqlite3';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '..', '.data');

// 初始化 SQLite 数据库
export function initSqliteDatabase() {
  const db = new Database(path.join(DATA_DIR, 'wordbase.db'));
  db.pragma('journal_mode = WAL');
  
  // 创建表
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      passwordHash TEXT NOT NULL,
      passwordSalt TEXT NOT NULL,
      nickname TEXT DEFAULT '',
      avatar INTEGER DEFAULT 0,
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

    CREATE TABLE IF NOT EXISTS vocabulary_books (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      wordCount INTEGER DEFAULT 0,
      icon TEXT DEFAULT 'BookOpen',
      isSync INTEGER DEFAULT 0,
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER NOT NULL,
      UNIQUE(userId, name)
    );

    CREATE TABLE IF NOT EXISTS words (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      word TEXT NOT NULL,
      frequency INTEGER DEFAULT 1,
      translation TEXT DEFAULT '',
      timeAdded INTEGER,
      timeUpdated INTEGER,
      contexts TEXT DEFAULT '[]',
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
    CREATE INDEX IF NOT EXISTS idx_vocabulary_books_userId ON vocabulary_books(userId);
    CREATE INDEX IF NOT EXISTS idx_verification_email_type ON verification_codes(email, type);
  `);

  // 添加avatar列到现有用户表
  try {
    db.prepare('ALTER TABLE users ADD COLUMN avatar INTEGER DEFAULT 0').run();
  } catch (e) {
    // 列可能已经存在，忽略错误
  }

  // 添加isSync列到现有单词本表
  try {
    db.prepare('ALTER TABLE vocabulary_books ADD COLUMN isSync INTEGER DEFAULT 0').run();
  } catch (e) {
    // 列可能已经存在，忽略错误
  }

  // 为 words 表添加新字段（新格式字段）
  const addColumns = [
    { name: 'frequency', type: 'INTEGER DEFAULT 1' },
    { name: 'translation', type: 'TEXT DEFAULT \'\'' },
    { name: 'timeAdded', type: 'INTEGER' },
    { name: 'timeUpdated', type: 'INTEGER' },
    { name: 'contexts', type: 'TEXT DEFAULT \'[]\'' }
  ];
  
  for (const col of addColumns) {
    try {
      db.prepare(`ALTER TABLE words ADD COLUMN ${col.name} ${col.type}`).run();
    } catch (e) {
      // 列可能已经存在，忽略错误
    }
  }

  return db;
}

// 创建 SQLite 查询执行器
export function createSqliteExecutor(db) {
  return {
    // 直接保存 db 实例，让各个 DAL 自己操作
    db,
    
    // 提供便捷方法
    prepare: (sql) => db.prepare(sql),
    
    // 事务
    transaction: (fn) => db.transaction(fn)()
  };
}
