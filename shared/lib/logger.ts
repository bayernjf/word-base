/**
 * 跨端日志器。
 *
 * 设计：
 *   1. 每条日志同时输出到 console（按 level 过滤）+ 写入全局环形缓冲区
 *   2. 环形缓冲区供「意见反馈」系统导出最近 N 条诊断日志（见 feedbackLogger.ts）
 *   3. 缓冲区是进程内内存，不持久化；上限 500 条，超出丢弃最旧
 *   4. 提供 getRecentLogBuffer / clearLogBuffer 供反馈系统使用
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const STORAGE_KEY = 'wordbase-log-level';

// =============================================
// 全局环形缓冲区（三端共享）
// =============================================
export interface LogEntry {
  ts: number;          // 毫秒时间戳
  level: LogLevel;
  ns: string;          // 命名空间
  message: string;     // 序列化后的消息（含参数）
}

const BUFFER_MAX = 500;
const _buffer: LogEntry[] = [];

function pushBuffer(level: LogLevel, ns: string, message: string): void {
  _buffer.push({ ts: Date.now(), level, ns, message });
  if (_buffer.length > BUFFER_MAX) {
    _buffer.splice(0, _buffer.length - BUFFER_MAX);
  }
}

/** 返回缓冲区副本（从旧到新）。可选过滤最近 minutes 分钟。 */
export function getRecentLogBuffer(minutes?: number): LogEntry[] {
  if (minutes === undefined) return _buffer.slice();
  const cutoff = Date.now() - minutes * 60 * 1000;
  return _buffer.filter((e) => e.ts >= cutoff);
}

/** 清空缓冲区（主要供测试使用）。 */
export function clearLogBuffer(): void {
  _buffer.length = 0;
}

function getMinLevel(): LogLevel {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return 'debug';
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && saved in LEVEL_PRIORITY) return saved as LogLevel;
  } catch {
    // ignore
  }
  const isProd = (typeof process !== 'undefined' && process.env?.NODE_ENV === 'production')
    || (typeof import.meta !== 'undefined' && String(import.meta.env?.PROD) === 'true');
  return isProd ? 'warn' : 'debug';
}

function isLevelEnabled(level: LogLevel): boolean {
  return LEVEL_PRIORITY[level] >= LEVEL_PRIORITY[getMinLevel()];
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('zh-CN', { hour12: false }) + '.' + String(date.getMilliseconds()).padStart(3, '0');
}

function formatArgs(args: unknown[]): unknown[] {
  return args.map((arg) => {
    if (arg instanceof Error) {
      return arg.stack || arg.message;
    }
    if (typeof arg === 'object' && arg !== null) {
      try {
        return JSON.stringify(arg);
      } catch {
        return String(arg);
      }
    }
    return arg;
  });
}

function serializeArgs(args: unknown[]): string {
  return formatArgs(args).map((a) => (typeof a === 'string' ? a : String(a))).join(' ');
}

class Logger {
  private ns: string;

  constructor(namespace: string) {
    this.ns = namespace;
  }

  debug(...args: unknown[]): void {
    if (!isLevelEnabled('debug')) return;
    const msg = serializeArgs(args);
    pushBuffer('debug', this.ns, msg);
    console.debug(`[${formatTime(new Date())}] [${this.ns}] [DEBUG]`, ...formatArgs(args));
  }

  info(...args: unknown[]): void {
    if (!isLevelEnabled('info')) return;
    const msg = serializeArgs(args);
    pushBuffer('info', this.ns, msg);
    console.info(`[${formatTime(new Date())}] [${this.ns}] [INFO]`, ...formatArgs(args));
  }

  warn(...args: unknown[]): void {
    if (!isLevelEnabled('warn')) return;
    const msg = serializeArgs(args);
    pushBuffer('warn', this.ns, msg);
    console.warn(`[${formatTime(new Date())}] [${this.ns}] [WARN]`, ...formatArgs(args));
  }

  error(...args: unknown[]): void {
    if (!isLevelEnabled('error')) return;
    const msg = serializeArgs(args);
    pushBuffer('error', this.ns, msg);
    console.error(`[${formatTime(new Date())}] [${this.ns}] [ERROR]`, ...formatArgs(args));
  }
}

export function createLogger(namespace: string): Logger {
  return new Logger(namespace);
}

export { Logger };
