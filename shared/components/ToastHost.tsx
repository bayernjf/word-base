import React, { useEffect, useState } from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AppLanguage } from '../types';
import { createTranslator } from '../i18n';
import { subscribeToasts, type ToastMessage } from '../lib/toastBus';

const AUTO_DISMISS_MS = 3200;

/**
 * 全局 toast 渲染宿主（评审 P2-5）。
 * 订阅 toastBus，在视口顶部居中堆叠展示，自动消失。
 * 挂载点：AppSupabase 根节点（全应用唯一实例）。
 */
export const ToastHost: React.FC<{ language: AppLanguage }> = ({ language }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    return subscribeToasts((toast) => {
      setToasts((prev) => [...prev, toast]);
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((item) => item.id !== toast.id));
      }, AUTO_DISMISS_MS);
    });
  }, []);

  const t = createTranslator(language);

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed top-4 left-1/2 -translate-x-1/2 z-[9999] flex flex-col items-center gap-2"
    >
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: -16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.96 }}
            transition={{ duration: 0.2 }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-lg border text-xs font-medium max-w-sm backdrop-blur-md ${
              toast.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                : 'bg-red-500/10 border-red-500/30 text-red-500'
            }`}
          >
            {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
            <span className="leading-relaxed">{t(toast.messageKey)}</span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
