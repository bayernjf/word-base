import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Capacitor 配置。
 *
 * webDir 指向 vite 构建产物；开发时可用 server.url 直连桌面机的 dev server
 * （通过 CAP_SERVER_URL 环境变量注入，方便真机调试）。
 */
const config: CapacitorConfig = {
  appId: 'com.wordbase.mobile',
  appName: 'WordBase',
  webDir: 'dist',
  ...(process.env.CAP_SERVER_URL
    ? {
        server: {
          url: process.env.CAP_SERVER_URL,
          cleartext: true,
        },
      }
    : {}),
  plugins: {
    LocalNotifications: {
      smallIcon: 'ic_stat_wordbase',
      iconColor: '#6366f1',
    },
  },
};

export default config;
