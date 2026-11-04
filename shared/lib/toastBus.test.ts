import { describe, it, expect } from 'vitest';
import { publishToast, subscribeToasts, type ToastMessage } from './toastBus';

// 评审 P2-5 回归测试：写失败提示总线的发布/订阅语义。

describe('toastBus', () => {
  it('publish 通知所有订阅者，消息带自增 id 与 i18n key', () => {
    const received: ToastMessage[] = [];
    const unsub = subscribeToasts((t) => received.push(t));

    const a = publishToast('error', 'toast.writeFailed');
    const b = publishToast('success', 'toast.writeFailed');

    expect(received).toEqual([a, b]);
    expect(b.id).toBe(a.id + 1);
    expect(a.type).toBe('error');
    expect(a.messageKey).toBe('toast.writeFailed');
    unsub();
  });

  it('取消订阅后不再接收消息', () => {
    const received: ToastMessage[] = [];
    const unsub = subscribeToasts((t) => received.push(t));
    unsub();

    publishToast('error', 'toast.writeFailed');
    expect(received).toEqual([]);
  });

  it('无订阅者时 publish 不抛错（UI 未挂载的窗口期）', () => {
    expect(() => publishToast('error', 'toast.writeFailed')).not.toThrow();
  });
});
