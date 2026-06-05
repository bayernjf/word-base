import { getExecutor } from './index.js';

export async function createBook(book) {
  const executor = getExecutor();
  const stmt = executor.prepare(`
    INSERT INTO vocabulary_books (id, userId, name, description, wordCount, icon, isSync, createdAt, updatedAt)
    VALUES ($id, $userId, $name, $description, $wordCount, $icon, $isSync, $createdAt, $updatedAt)
  `);
  stmt.run(book);
  return book;
}

export async function getBooksByUserId(userId) {
  const executor = getExecutor();
  const stmt = executor.prepare('SELECT * FROM vocabulary_books WHERE userId = $userId ORDER BY isSync DESC, createdAt ASC');
  const books = stmt.all({ userId });
  
  // 查询每个单词本的实际单词数量
  const countStmt = executor.prepare('SELECT COUNT(*) as count FROM words WHERE userId = $userId AND bookId = $bookId');
  return books.map(book => {
    const count = countStmt.get({ userId, bookId: book.id });
    return {
      ...book,
      isSync: !!book.isSync, // 转换为布尔值
      wordCount: count.count
    };
  });
}

export async function getBookById(id, userId) {
  const executor = getExecutor();
  const stmt = executor.prepare('SELECT * FROM vocabulary_books WHERE id = $id AND userId = $userId');
  return stmt.get({ id, userId });
}

export async function getSyncBook(userId) {
  const executor = getExecutor();
  let stmt = executor.prepare('SELECT * FROM vocabulary_books WHERE userId = $userId AND isSync = 1');
  let book = stmt.get({ userId });
  
  if (!book) {
    stmt = executor.prepare('SELECT * FROM vocabulary_books WHERE userId = $userId ORDER BY createdAt ASC LIMIT 1');
    book = stmt.get({ userId });
  }
  
  return book;
}

export async function updateBook(id, userId, updates) {
  const executor = getExecutor();
  const setClauses = [];
  const params = { id, userId };
  
  if (updates.name !== undefined) {
    setClauses.push('name = $name');
    params.name = updates.name;
  }
  if (updates.description !== undefined) {
    setClauses.push('description = $description');
    params.description = updates.description;
  }
  if (updates.icon !== undefined) {
    setClauses.push('icon = $icon');
    params.icon = updates.icon;
  }
  if (updates.isSync !== undefined) {
    setClauses.push('isSync = $isSync');
    params.isSync = updates.isSync ? 1 : 0;
  }
  
  setClauses.push('updatedAt = $updatedAt');
  params.updatedAt = Date.now();
  
  const stmt = executor.prepare(`UPDATE vocabulary_books SET ${setClauses.join(', ')} WHERE id = $id AND userId = $userId`);
  stmt.run(params);
  return getBookById(id, userId);
}

export async function setSyncBook(userId, bookId) {
  const executor = getExecutor();
  
  // 先把该用户所有其他单词本的isSync设为0
  const stmt1 = executor.prepare('UPDATE vocabulary_books SET isSync = 0, updatedAt = $updatedAt WHERE userId = $userId');
  stmt1.run({ updatedAt: Date.now(), userId });
  
  // 再把选中的单词本的isSync设为1
  const stmt2 = executor.prepare('UPDATE vocabulary_books SET isSync = 1, updatedAt = $updatedAt WHERE id = $id AND userId = $userId');
  stmt2.run({ updatedAt: Date.now(), id: bookId, userId });
  
  return getBooksByUserId(userId);
}

export async function deleteBook(id, userId) {
  const executor = getExecutor();
  
  // 删除该单词本的所有单词
  const deleteWordsStmt = executor.prepare('DELETE FROM words WHERE userId = $userId AND bookId = $bookId');
  deleteWordsStmt.run({ userId, bookId: id });
  
  // 删除单词本
  const deleteBookStmt = executor.prepare('DELETE FROM vocabulary_books WHERE id = $id AND userId = $userId');
  return deleteBookStmt.run({ id, userId });
}

export default {
  createBook,
  getBooksByUserId,
  getBookById,
  getSyncBook,
  updateBook,
  setSyncBook,
  deleteBook
};
