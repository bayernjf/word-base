import { useState, useEffect } from 'react';
import { getConsent, setConsent } from '../lib/analytics';
import type { ConsentState } from '../lib/analytics';

export function AnalyticsConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = getConsent();
    if (consent === null) {
      const timer = setTimeout(() => setVisible(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    setConsent('granted');
    setVisible(false);
  };

  const handleDecline = () => {
    setConsent('denied');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 inset-x-0 z-[100] p-3 sm:p-4">
      <div className="max-w-3xl mx-auto bg-slate-900/95 backdrop-blur-xl border border-slate-700/60 rounded-2xl shadow-2xl shadow-black/30 p-4 sm:p-5">
        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mb-3">
          我们使用 Google Analytics 和 Microsoft Clarity 来分析流量和使用模式，以持续改进产品。
          这些工具不会收集你的个人信息（如邮箱、密码、学习内容）。
          你可以选择接受或拒绝。你可以在任何时候在「设置」中更改偏好。
          <a
            href="/privacy"
            className="text-indigo-400 hover:text-indigo-300 underline ml-1"
            target="_blank"
            rel="noopener noreferrer"
          >
            隐私政策
          </a>
        </p>
        <div className="flex items-center gap-2 justify-end">
          <button
            onClick={handleDecline}
            className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            拒绝
          </button>
          <button
            onClick={handleAccept}
            className="px-5 py-2 rounded-xl text-xs font-semibold bg-indigo-500 hover:bg-indigo-400 text-white transition-colors cursor-pointer shadow-lg shadow-indigo-500/25"
          >
            接受
          </button>
        </div>
      </div>
    </div>
  );
}

export function AnalyticsConsentToggle() {
  const [consent, setConsentState] = useState<ConsentState | null>(null);

  useEffect(() => {
    setConsentState(getConsent());
  }, []);

  const handleToggle = () => {
    const next: ConsentState = consent === 'granted' ? 'denied' : 'granted';
    setConsent(next);
    setConsentState(next);
  };

  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium">使用数据分析</p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          允许 Google Analytics 和 Microsoft Clarity 收集匿名的使用数据
        </p>
      </div>
      <button
        onClick={handleToggle}
        role="switch"
        aria-checked={consent === 'granted'}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
          consent === 'granted' ? 'bg-indigo-500' : 'bg-slate-600'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            consent === 'granted' ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
}