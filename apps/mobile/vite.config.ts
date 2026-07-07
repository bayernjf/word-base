import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import type { ManualChunksOption } from 'rollup';
import path from 'path';
import { defineConfig } from 'vite';

const manualChunks: ManualChunksOption = (id) => {
  if (!id.includes('node_modules')) return;
  if (id.includes('/@supabase/') || id.includes('/supabase-js/')) return 'vendor-supabase';
  if (id.includes('/@google/genai') || id.includes('/google-genai/')) return 'vendor-ai';
  if (id.includes('/motion') || id.includes('/framer-motion/')) return 'vendor-motion';
  if (id.includes('/lucide-react')) return 'vendor-icons';
  if (id.includes('/react/') || id.includes('/react-dom/') || id.includes('scheduler')) return 'vendor-react';
  if (id.includes('/react-router') || id.includes('/react-router-dom')) return 'vendor-router';
  return 'vendor-other';
};

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss({
      content: [
        path.resolve(__dirname, '../../shared/**/*.{ts,tsx}'),
        path.resolve(__dirname, './**/*.{ts,tsx,html}'),
      ],
    })],
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
