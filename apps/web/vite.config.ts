import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';
import { manualChunks } from '@wordbase/shared/vite-chunks';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    envDir: path.resolve(__dirname, '../..'),
    resolve: {
      alias: {
        '@wordbase/shared': path.resolve(__dirname, '../../shared'),
      },
    },
    build: {
      rollupOptions: {
        output: { manualChunks },
      },
      chunkSizeWarningLimit: 600,
    },
    server: {
      port: 3000,
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true'
        ? null
        : {
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
