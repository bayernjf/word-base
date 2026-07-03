import type { ManualChunksOption } from 'rollup';

/**
 * 三端共用的 manualChunks 拆分策略。
 * 目的：把大依赖拆成独立 chunk，便于浏览器 / Capacitor / Tauri WebView 做差分缓存，
 *      首次加载后，后续改业务代码不用重新下载 react / supabase / motion 这些大库。
 */
export const manualChunks: ManualChunksOption = (id) => {
  if (!id.includes('node_modules')) {
    return;
  }

  if (id.includes('/@supabase/') || id.includes('/supabase-js/')) {
    return 'vendor-supabase';
  }
  if (id.includes('/@google/genai') || id.includes('/google-genai/')) {
    return 'vendor-ai';
  }
  if (id.includes('/motion') || id.includes('/framer-motion/')) {
    return 'vendor-motion';
  }
  if (id.includes('/lucide-react')) {
    return 'vendor-icons';
  }
  if (id.includes('/react/') || id.includes('/react-dom/') || id.includes('scheduler')) {
    return 'vendor-react';
  }
  if (id.includes('/react-router') || id.includes('/react-router-dom')) {
    return 'vendor-router';
  }

  return 'vendor-other';
};
