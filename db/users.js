import { getExecutor } from './index.js';

export async function createUser(user) {
  const executor = getExecutor();
  const stmt = executor.prepare(`
    INSERT INTO users (id, email, passwordHash, passwordSalt, nickname, avatar, createdAt, updatedAt)
    VALUES ($id, $email, $passwordHash, $passwordSalt, $nickname, $avatar, $createdAt, $updatedAt)
  `);
  stmt.run(user);
  return user;
}

export async function getUserByEmail(email) {
  const executor = getExecutor();
  const stmt = executor.prepare('SELECT * FROM users WHERE email = $email');
  return stmt.get({ email });
}

export async function getUserById(id) {
  const executor = getExecutor();
  const stmt = executor.prepare('SELECT id, email, nickname, avatar, createdAt FROM users WHERE id = $id');
  return stmt.get({ id });
}

export async function updateUser(id, updates) {
  const executor = getExecutor();
  const setClauses = [];
  const params = { id };
  
  if (updates.nickname !== undefined) {
    setClauses.push('nickname = $nickname');
    params.nickname = updates.nickname;
  }
  if (updates.avatar !== undefined) {
    setClauses.push('avatar = $avatar');
    params.avatar = updates.avatar;
  }
  if (updates.passwordHash !== undefined) {
    setClauses.push('passwordHash = $passwordHash');
    params.passwordHash = updates.passwordHash;
  }
  if (updates.passwordSalt !== undefined) {
    setClauses.push('passwordSalt = $passwordSalt');
    params.passwordSalt = updates.passwordSalt;
  }
  
  setClauses.push('updatedAt = $updatedAt');
  params.updatedAt = Date.now();
  
  const stmt = executor.prepare(`UPDATE users SET ${setClauses.join(', ')} WHERE id = $id`);
  stmt.run(params);
  return getUserById(id);
}

export async function deleteUser(id) {
  const executor = getExecutor();
  const stmt = executor.prepare('DELETE FROM users WHERE id = $id');
  return stmt.run({ id });
}

export default {
  createUser,
  getUserByEmail,
  getUserById,
  updateUser,
  deleteUser
};
