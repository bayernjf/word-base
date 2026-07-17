/**
 * 反馈诊断日志采集器。
 *
 * 三端共用：
 *   1. 从 logger 环形缓冲区导出最近 N 分钟日志，序列化为纯文本（供 feedback_logs.content）
 *   2. 提供 installGlobalErrorHandlers()，在三端入口调用一次，捕获未处理异常写入缓冲区
 *
 * 桌面端额外能力：通过 platform.getRecentLogs() 调 Tauri 主进程获取脱敏后的应用日志，
 * 与前端缓冲区日志合并（主进程日志在前，前端日志在后）。
 */

import { getRecentLogBuffer, createLogger, type LogEntry } from './logger';
import type { FeedbackLogData } from './feedback';

// 序列化单条日志：[ISO 时间] [LEVEL] [ns] message
function formatEntry(e: LogEntry): string {
  const iso = new Date(e.ts).toISOString();
  return `[${iso}] [${e.level.toUpperCase()}] [${e.ns}] ${e.message}`;
}

// 日志正文上限（与 soft-desk 一致：500KB）
const MAX_CONTENT_BYTES = 500 * 1024;
// 日志行数上限（与 soft-desk 一致：2000 行）
const MAX_LINES = 2000;

function byteLength(str: string): number {
  try {
    return new TextEncoder().encode(str).length;
  } catch {
    return str.length * 3;
  }
}

/**
 * 导出最近 minutes 分钟的前端日志缓冲区。
 * 返回 null 表示无日志可导出。
 */
export function collectFrontendLogs(minutes: number): FeedbackLogData | null {
  const entries = getRecentLogBuffer(minutes);
  if (entries.length === 0) return null;

  const oldest = entries[0];
  const newest = entries[entries.length - 1];

  const lines = entries.map(formatEntry);
  let truncated = false;

  // 按行数截断（保留最新的 N 行）
  if (lines.length > MAX_LINES) {
    lines.splice(0, lines.length - MAX_LINES);
    truncated = true;
  }

  let content = lines.join('\n');

  // 按字节截断（保留最新的部分）
  if (byteLength(content) > MAX_CONTENT_BYTES) {
    while (byteLength(content) > MAX_CONTENT_BYTES && lines.length > 1) {
      lines.shift();
      content = lines.join('\n');
    }
    truncated = true;
  }

  return {
    content,
    lineCount: lines.length,
    startedAt: new Date(oldest.ts).toISOString(),
    endedAt: new Date(newest.ts).toISOString(),
    truncated,
  };
}

/**
 * 合并前端日志与平台主进程日志（桌面端用）。
 * 主进程日志在前，前端日志在后；任一为空则只返回另一份。
 */
export function mergeLogs(
  platformLog: FeedbackLogData | null,
  frontendLog: FeedbackLogData | null,
): FeedbackLogData | null {
  if (!platformLog && !frontendLog) return null;
  if (!platformLog) return frontendLog;
  if (!frontendLog) return platformLog;

  const content = `${platformLog.content}\n\n--- frontend logs ---\n${frontendLog.content}`;
  const lineCount = platformLog.lineCount + frontendLog.lineCount + 1;
  const startedAt = platformLog.startedAt || frontendLog.startedAt;
  const endedAt = frontendLog.endedAt || platformLog.endedAt;
  const truncated = platformLog.truncated || frontendLog.truncated;

  // 合并后若超限，再次按字节截断
  if (byteLength(content) > MAX_CONTENT_BYTES) {
    const lines = content.split('\n');
    let trimmed = content;
    while (byteLength(trimmed) > MAX_CONTENT_BYTES && lines.length > 1) {
      lines.shift();
      trimmed = lines.join('\n');
    }
    return {
      content: trimmed,
      lineCount: lines.length,
      startedAt,
      endedAt,
      truncated: true,
    };
  }

  return { content, lineCount, startedAt, endedAt, truncated };
}

let _installed = false;

/**
 * 安装全局错误捕获：把未处理异常写入日志缓冲区。
 * 三端入口各调用一次（幂等，重复调用安全）。
 *
 * - Web/Desktop：window 'error' + 'unhandledrejection'
 * - Mobile(RN)：ErrorUtils.setGlobalHandler（若存在）
 */
export function installGlobalErrorHandlers(): void {
  if (_installed) return;
  _installed = true;

  const logError = (ns: string, message: string): void => {
    try {
      createLogger(ns).error(message);
    } catch {
      /* ignore */
    }
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('error', (event) => {
      const msg = event.error?.stack || event.message || 'unknown error';
      logError('global-error', `${event.filename || ''}:${event.lineno || 0} ${msg}`);
    });
    window.addEventListener('unhandledrejection', (event) => {
      const reason = event.reason;
      const msg = reason instanceof Error ? (reason.stack || reason.message) : String(reason);
      logError('global-rejection', msg);
    });
  }

  // React Native（Expo）全局错误处理
  const g = globalThis as unknown as {
    ErrorUtils?: {
      setGlobalHandler?: (handler: (err: unknown, isFatal?: boolean) => void) => void;
    };
  };
  if (g.ErrorUtils?.setGlobalHandler) {
    g.ErrorUtils.setGlobalHandler((err, isFatal) => {
      const msg = err instanceof Error ? (err.stack || err.message) : String(err);
      logError('rn-error', `${isFatal ? '[FATAL] ' : ''}${msg}`);
    });
  }
}
