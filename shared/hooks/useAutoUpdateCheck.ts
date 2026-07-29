import { useEffect, useRef } from 'react';
import { getPlatform } from '../platform';

const DESKTOP_CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;

/**
 * 全局后台自动更新检查。
 * - 桌面端：启动后 5s 静默检查一次，之后每 6 小时轮询。
 * - 移动端：启动后 5s 静默检查一次（Expo OTA 下次冷启动生效）。
 * - Web：不做任何检查（web 没有 updater）。
 *
 * 发现更新时发送系统通知（需平台 showNotification 支持）。
 * 此 hook 应在 App 根组件调用一次，而非在某个页面内调用。
 */
export function useAutoUpdateCheck(): void {
  const platform = getPlatform();
  const updater = platform.updater;
  const checkedRef = useRef(false);

  useEffect(() => {
    if (!updater || checkedRef.current) return;
    checkedRef.current = true;

    const isDesktop = updater.channel === 'desktop-binary';
    const isMobile = updater.channel === 'mobile-ota';
    if (!isDesktop && !isMobile) return;

    let intervalId: ReturnType<typeof setInterval> | null = null;

    const doSilentCheck = async () => {
      try {
        const result = await updater.check();
        if (result.hasUpdate && result.version) {
          try {
            await platform.showNotification(
              isMobile ? 'New version available' : 'New version available',
              isMobile
                ? `Version ${result.version} is ready. Open About to apply.`
                : `Version ${result.version} is ready. Open About to install.`
            );
          } catch {
            /* notification not granted or unavailable */
          }
        }
      } catch {
        /* silent — don't crash the app on updater errors */
      }
    };

    const timer = setTimeout(() => {
      void doSilentCheck();
      if (isDesktop) {
        intervalId = setInterval(() => void doSilentCheck(), DESKTOP_CHECK_INTERVAL_MS);
      }
    }, 5000);

    return () => {
      clearTimeout(timer);
      if (intervalId) clearInterval(intervalId);
    };
  }, [updater, platform]);
}
