import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      port: 3000,
      // HMR 可通过 DISABLE_HMR 环境变量禁用。
      // 请勿修改 — 禁用文件监听以防止编辑时闪烁。
      hmr: process.env.DISABLE_HMR !== 'true',
      // 当 DISABLE_HMR 为 true 时禁用文件监听以节省 CPU。
      watch: process.env.DISABLE_HMR === 'true' ? null : {
        ignored: ['**/.data/**'],
      },
      proxy: {
        '/api': {
          target: 'http://localhost:3001',
          changeOrigin: true,
        },
      },
    },
  };
});
