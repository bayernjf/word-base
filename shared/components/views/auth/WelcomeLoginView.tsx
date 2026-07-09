import React, { useState } from 'react';
import { AlertCircle, CheckCircle2, RefreshCw, ChevronRight } from 'lucide-react';
import { AppLanguage } from '../../../types';
import { ThemeClasses } from '../../ThemeStyles';
import { createTranslator } from '../../../i18n';

const WordBaseLogo = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <defs>
      <linearGradient id="bookLeft" x1="10" y1="10" x2="26" y2="54" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#818cf8"/>
        <stop offset="100%" stopColor="#6366f1"/>
      </linearGradient>
      <linearGradient id="bookRight" x1="36" y1="14" x2="52" y2="54" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#a5b4fc"/>
        <stop offset="100%" stopColor="#818cf8"/>
      </linearGradient>
      <linearGradient id="card" x1="22" y1="16" x2="42" y2="42" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#fbbf24"/>
        <stop offset="100%" stopColor="#f59e0b"/>
      </linearGradient>
    </defs>
    <rect x="36" y="14" width="16" height="40" rx="3" fill="url(#bookRight)"/>
    <rect x="10" y="10" width="16" height="44" rx="3" fill="url(#bookLeft)"/>
    <rect x="22" y="16" width="20" height="28" rx="3.5" fill="url(#card)"/>
    <path d="M26 23.5h12M26 29.5h12M26 35.5h10" stroke="#1f2937" strokeWidth="2" strokeLinecap="round" opacity="0.8"/>
  </svg>
);

interface LoginProps {
  themeStyles: ThemeClasses;
  language: AppLanguage;
  onLogin: (email: string, password: string, remember: boolean) => Promise<boolean>;
  onRegister: (email: string, password: string, nickname?: string) => Promise<boolean>;
  onRequestPasswordReset: (email: string) => Promise<{ ok: boolean; error?: string }>;
  authError?: string | null;
  setAuthError?: (error: string | null) => void;
}

type AuthStep = 'login' | 'register' | 'forgot-email';

export const WelcomeLoginView: React.FC<LoginProps> = ({ 
  themeStyles, 
  language,
  onLogin, 
  onRegister, 
  onRequestPasswordReset, 
  authError, 
  setAuthError 
}) => {
  const [step, setStep] = useState<AuthStep>(() => {
    if (typeof window === 'undefined') return 'login';
    try {
      const auth = new URLSearchParams(window.location.search).get('auth');
      return auth === 'register' ? 'register' : 'login';
    } catch {
      return 'login';
    }
  });
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const t = createTranslator(language);
  const isGlass = themeStyles.name === 'glass';
  const inputClass = isGlass
    ? 'w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-neutral-100 placeholder:text-white/35 focus:outline-hidden focus:border-indigo-500'
    : 'w-full px-3 py-2 bg-[#fffdf7] border border-[#9fc89f] rounded-xl text-sm text-[#1d3a2b] placeholder:text-[#8a9c89] shadow-xs shadow-[#8fb998]/10 focus:outline-hidden focus:border-[#56a978]';

  const clearMessages = () => {
    setAuthError?.(null);
    setMessage(null);
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    setIsLoading(true);
    try {
      await onLogin(email, password, rememberMe);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    if (password !== confirmPassword) {
      setMessage({ text: t('login.passwordMismatch'), type: 'error' });
      return;
    }
    if (password.length < 6) {
      setMessage({ text: t('login.passwordTooShort'), type: 'error' });
      return;
    }
    setIsLoading(true);
    try {
      await onRegister(email, password, nickname);
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    if (!email) {
      setMessage({ text: t('login.enterEmail'), type: 'error' });
      return;
    }
    setIsLoading(true);
    try {
      const result = await onRequestPasswordReset(email);
      if (result.ok) {
        setMessage({ text: t('login.recoverySent'), type: 'success' });
      } else {
        setMessage({ text: result.error || t('login.sendFailed'), type: 'error' });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const resetToLogin = () => {
    setStep('login');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setNickname('');
    clearMessages();
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-4">
      <div className={`w-full max-w-md ${themeStyles.card}`}>
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-3 bg-indigo-500/10 rounded-2xl mb-3 text-indigo-600">
            <WordBaseLogo className="w-12 h-12" />
          </div>
          <h2 className={`text-2xl font-bold ${themeStyles.textPrimary}`}>
            WordBase
          </h2>
          <p className={`text-sm mt-1 ${themeStyles.textSecondary}`}>
            {step === 'register' ? t('login.registerSubtitle') : 
             step.startsWith('forgot') ? t('login.forgotSubtitle') :
             t('login.loginSubtitle')}
          </p>
        </div>

        {(message || authError) && (
          <div className={`mb-4 p-3 rounded-lg text-sm ${
            (message?.type === 'success' || !authError) ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 
            'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
          }`}>
            <div className="flex items-center space-x-2">
              {message?.type === 'error' || authError ? <AlertCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
              <span>{message?.text || authError}</span>
            </div>
          </div>
        )}

        {/* Login Step */}
        {step === 'login' && (
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium mb-1 uppercase tracking-wider">{t('login.email')}</label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass} 
                required
              />
            </div>
            
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-xs font-medium uppercase tracking-wider">{t('login.password')}</label>
              </div>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputClass} 
                required
              />
            </div>

            <div className="flex items-center space-x-2">
              <input 
                type="checkbox" 
                id="remember" 
                checked={rememberMe} 
                onChange={() => setRememberMe(!rememberMe)}
                className="rounded border-neutral-300Accent focus:ring-0 cursor-pointer"
              />
              <label htmlFor="remember" className={`text-xs select-none cursor-pointer ${themeStyles.textSecondary}`}>
                {t('login.rememberMe')}
              </label>
            </div>

            <button type="submit" className={`w-full ${themeStyles.btnPrimary} py-2.5 flex items-center justify-center space-x-2`} disabled={isLoading}>
              {isLoading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <span>{t('login.signIn')}</span>
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>

            <div className="text-center pt-2">
              <button 
                  type="button" 
                  onClick={() => { clearMessages(); setStep('forgot-email'); }}
                  className="text-xs text-indigo-650 dark:text-indigo-400 font-medium hover:underline"
                >
                  {t('login.forgotPassword')}
              </button><br></br>
              <button 
                type="button" 
                onClick={() => { clearMessages(); setStep('register'); }}
                className="text-xs text-indigo-650 dark:text-indigo-400 font-medium hover:underline"
              >
                {t('login.createAccount')}
              </button>
            </div>
          </form>
        )}

        {/* Register Step */}
        {step === 'register' && (
          <form onSubmit={handleRegisterSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium mb-1 uppercase tracking-wider">{t('login.email')}</label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass} 
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1 uppercase tracking-wider">{t('login.nickname')}</label>
              <input 
                type="text" 
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                className={inputClass} 
              />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1 uppercase tracking-wider">{t('login.password')}</label>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputClass} 
                required
                minLength={6}
              />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1 uppercase tracking-wider">{t('login.confirmPassword')}</label>
              <input 
                type="password" 
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={inputClass} 
                required
                minLength={6}
              />
            </div>

            <button type="submit" className={`w-full ${themeStyles.btnPrimary} py-2.5 flex items-center justify-center space-x-2`} disabled={isLoading}>
              {isLoading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <span>{t('login.createFreeAccount')}</span>
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>

            <div className="text-center pt-2">
              <button 
                type="button" 
                onClick={() => resetToLogin()}
                className="text-xs text-indigo-650 dark:text-indigo-400 font-medium hover:underline"
              >
                {t('login.alreadyHaveAccount')}
              </button>
            </div>
          </form>
        )}

        {/* Forgot Password - Email Step */}
        {step === 'forgot-email' && (
          <form onSubmit={handleForgotEmailSubmit} className="space-y-4">
            <div>
              <h3 className={`text-lg font-semibold mb-3 ${themeStyles.textPrimary}`}>{t('login.resetPassword')}</h3>
              <p className={`text-xs mb-4 ${themeStyles.textSecondary}`}>
                {t('login.resetHint')}
              </p>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1 uppercase tracking-wider">{t('login.email')}</label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass} 
                required
              />
            </div>
            <button type="submit" className={`w-full ${themeStyles.btnPrimary} py-2.5`} disabled={isLoading}>
              {isLoading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : t('login.sendRecoveryEmail')}
            </button>
            <button 
              type="button" 
              onClick={resetToLogin}
              className="w-full text-center text-xs underline mt-2 block"
            >
              {t('login.backToSignIn')}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
