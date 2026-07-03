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
      target: ['es2022', 'chrome120', 'safari17'],
      chunkSizeWarningLimit: 600,
    },
    server: {
      port: 3003,
      strictPort: true,
    },
  };
});
