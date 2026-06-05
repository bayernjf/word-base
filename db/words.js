import { getExecutor } from './index.js';

// 解析 JSON 字段的辅助函数
function parseWordRow(row) {
  if (!row) return null;
  return {
    ...row,
    synonyms: JSON.parse(row.synonyms),
    examples: JSON.parse(row.examples),
    usageHistory: JSON.parse(row.usageHistory),
    meta: JSON.parse(row.meta),
    contexts: row.contexts ? JSON.parse(row.contexts) : undefined
  };
}

export async function getWords(userId, bookId = null) {
  const executor = getExecutor();
  let stmt;
  
  if (bookId) {
    stmt = executor.prepare('SELECT * FROM words WHERE userId = $userId AND bookId = $bookId ORDER BY createdAt DESC');
    stmt = stmt.bind({ userId, bookId });
  } else {
    stmt = executor.prepare('SELECT * FROM words WHERE userId = $userId ORDER BY createdAt DESC');
    stmt = stmt.bind({ userId });
  }
  
  const rows = stmt.all();
  return rows.map(parseWordRow);
}

export async function getWordById(id, userId) {
  const executor = getExecutor();
  const stmt = executor.prepare('SELECT * FROM words WHERE id = $id AND userId = $userId');
  const row = stmt.get({ id, userId });
  return parseWordRow(row);
}

export async function checkWordExists(userId, wordText, bookId) {
  const executor = getExecutor();
  const stmt = executor.prepare('SELECT * FROM words WHERE userId = $userId AND word = $word AND bookId = $bookId');
  const row = stmt.get({ userId, word: wordText, bookId });
  return row ? parseWordRow(row) : null;
}

export async function createWord(word) {
  const executor = getExecutor();
  const stmt = executor.prepare(`
    INSERT INTO words (
      id, userId, word, frequency, translation, timeAdded, timeUpdated, contexts,
      phonetic, partOfSpeech, definition, chineseTranslation, synonyms, examples,
      usageHistory, level, familiarity, bookId, meta, createdAt, updatedAt
    )
    VALUES (
      $id, $userId, $word, $frequency, $translation, $timeAdded, $timeUpdated, $contexts,
      $phonetic, $partOfSpeech, $definition, $chineseTranslation, $synonyms, $examples,
      $usageHistory, $level, $familiarity, $bookId, $meta, $createdAt, $updatedAt
    )
  `);
  stmt.run(word);
  return getWordById(word.id, word.userId);
}

export async function updateWordContexts(id, userId, contexts) {
  const executor = getExecutor();
  const stmt = executor.prepare(`
    UPDATE words 
    SET contexts = $contexts, frequency = $frequency, timeUpdated = $timeUpdated, updatedAt = $updatedAt
    WHERE id = $id AND userId = $userId
  `);
  stmt.run({
    id,
    userId,
    contexts: JSON.stringify(contexts),
    frequency: contexts.length,
    timeUpdated: Date.now(),
    updatedAt: Date.now()
  });
  return getWordById(id, userId);
}

export async function deleteWordById(id, userId) {
  const executor = getExecutor();
  const stmt = executor.prepare('DELETE FROM words WHERE id = $id AND userId = $userId');
  return stmt.run({ id, userId });
}

export async function deleteWordsByBookId(bookId, userId) {
  const executor = getExecutor();
  const stmt = executor.prepare('DELETE FROM words WHERE bookId = $bookId AND userId = $userId');
  return stmt.run({ bookId, userId });
}

export default {
  getWords,
  getWordById,
  checkWordExists,
  createWord,
  updateWordContexts,
  deleteWordById,
  deleteWordsByBookId
};
