import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import type { ManualChunksOption } from 'rollup';
import fs from 'fs';
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
    plugins: [
      react(),
      tailwindcss({
        content: [
          path.resolve(__dirname, '../../shared/**/*.{ts,tsx}'),
          path.resolve(__dirname, './**/*.{ts,tsx,html}'),
        ],
      }),
      {
        name: 'landing-redirect',
        configureServer(server) {
          server.middlewares.use((req, _res, next) => {
            if (req.url === '/app' || req.url === '/app/') {
              req.url = '/app.html';
            }
            next();
          });
        },
        configurePreviewServer(server) {
          server.middlewares.use((req, _res, next) => {
            if (req.url === '/app' || req.url === '/app/') {
              req.url = '/app.html';
            }
            next();
          });
        },
        closeBundle() {
          const distDir = path.resolve(__dirname, 'dist');
          const appHtml = path.join(distDir, 'app.html');
          const appIndexDir = path.join(distDir, 'app');
          const appIndexHtml = path.join(appIndexDir, 'index.html');
          
          if (fs.existsSync(appHtml)) {
            fs.mkdirSync(appIndexDir, { recursive: true });
            fs.copyFileSync(appHtml, appIndexHtml);
            console.log('\n  Created app/index.html for /app path support');
          }
        },
      },
    ],
    envDir: path.resolve(__dirname, '../..'),
    envPrefix: ['VITE_', 'NEXT_PUBLIC_'],
    resolve: {
      alias: {
        '@wordbase/shared': path.resolve(__dirname, '../../shared'),
      },
    },
    build: {
      rollupOptions: {
        input: {
          main: path.resolve(__dirname, 'index.html'),
          app: path.resolve(__dirname, 'app.html'),
        },
        output: { manualChunks },
      },
      chunkSizeWarningLimit: 600,
      assetsInlineLimit: 4096,
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
