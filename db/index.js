import { initSqliteDatabase, createSqliteExecutor } from './sqlite.js';

// 数据库类型
const DB_TYPE = process.env.DB_TYPE || 'sqlite';

// 全局数据库连接
let db = null;
let executor = null;

// 初始化数据库
export function initDatabase() {
  switch (DB_TYPE) {
    case 'sqlite':
    default:
      db = initSqliteDatabase();
      executor = createSqliteExecutor(db);
      break;
    // 未来可以添加 PostgreSQL 支持
    // case 'postgres':
    //   db = initPostgresDatabase();
    //   executor = createPostgresExecutor(db);
    //   break;
  }
  return { db, executor };
}

// 获取数据库执行器
export function getExecutor() {
  if (!executor) {
    initDatabase();
  }
  return executor;
}

export default {
  initDatabase,
  getExecutor
};
