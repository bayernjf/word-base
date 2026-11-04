import type { TranslateKey } from '../i18n';

/**
 * 全局 toast 总线（评审 P2-5）。
 *
 * 写路径失败此前仅 logger.error 并返回 null/false，UI 层无感知（静默失败）。
 * 这里提供一个框架无关的发布/订阅总线：hooks/任意模块 publish，
 * 唯一的 <ToastHost /> 组件订阅并渲染，文案按 messageKey 走 i18n。
 */

export type ToastType = 'success' | 'error';

export interface ToastMessage {
  id: number;
  type: ToastType;
  messageKey: TranslateKey;
}

type ToastListener = (toast: ToastMessage) => void;

let nextId = 1;
const listeners = new Set<ToastListener>();

export function publishToast(type: ToastType, messageKey: TranslateKey): ToastMessage {
  const toast: ToastMessage = { id: nextId++, type, messageKey };
  for (const listener of listeners) {
    listener(toast);
  }
  return toast;
}

/** 订阅 toast；返回取消订阅函数。 */
export function subscribeToasts(listener: ToastListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
