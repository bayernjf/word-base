import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Info, Download, RefreshCw, CheckCircle, AlertCircle, Shield, ExternalLink } from 'lucide-react';
import { ThemeClasses } from '../../ThemeStyles';
import { getPlatform } from '@wordbase/shared/platform';
import type { AppLanguage } from '../../../types';
import type { UpdateProgress } from '@wordbase/shared/platform';
import { AnalyticsConsentToggle } from '../../AnalyticsConsentBanner';

interface AboutSettingsProps {
  themeStyles: ThemeClasses;
  language: AppLanguage;
  onPrivacyPolicyClick?: () => void;
}

type UpdateState =
  | { phase: 'idle' }
  | { phase: 'checking' }
  | { phase: 'up-to-date' }
  | { phase: 'available'; version: string; body?: string }
  | { phase: 'downloading'; percentage?: number; downloaded?: number; total?: number }
  | { phase: 'ready'; version: string; body?: string }
  | { phase: 'applying' }
  | { phase: 'error'; message: string };

const COPY = {
  zh: {
    title: '关于 WordBase',
    tagline: 'AI 驱动的英语词汇学习与复习',
    versionCardTitle: '版本信息',
    updateCardTitle: '应用更新',
    currentVersion: '当前版本',
    latestVersion: '最新版本',
    releaseNotes: '更新说明',
    autoCheckDesktop: '启动后自动检查，每 6 小时轮询一次',
    autoCheckMobile: '启动时自动检查热更新，下次冷启动生效',
    updateDescDesktop: 'WordBase 会在启动后自动检查新版本。若发现更新，将在后台下载并提示你重启完成安装。',
    updateDescMobile: '新版本下载后重启应用即可生效（仅应用内资源热更新，无需前往应用商店）。原生更新请前往应用商店。',
    checking: '正在检查更新…',
    check: '手动检查更新',
    downloading: '正在下载更新…',
    download: '下载更新',
    installRelaunch: '立即重启安装',
    applyRelaunch: '重启应用以更新',
    upToDate: '已是最新版本',
    updateAvailable: '发现新版本',
    readyToInstallDesktop: '更新已下载，重启应用完成安装',
    readyToInstallMobile: '更新已就绪，重启应用完成更新',
    applying: '正在应用更新…',
    error: '检查更新失败',
    notSupported: '当前环境不支持自动更新',
    channelDesktop: '桌面端二进制更新',
    channelMobile: 'OTA 热更新',
    privacyTitle: '隐私政策',
    privacyDesc: '了解我们如何收集、使用和保护你的个人信息',
    privacyAction: '查看隐私政策',
  },
  en: {
    title: 'About WordBase',
    tagline: 'AI-powered vocabulary learning',
    versionCardTitle: 'Version',
    updateCardTitle: 'Updates',
    currentVersion: 'Current version',
    latestVersion: 'Latest version',
    releaseNotes: 'Release notes',
    autoCheckDesktop: 'Checked on launch, then every 6 hours',
    autoCheckMobile: 'Checked on launch; applied on next cold start',
    updateDescDesktop: 'WordBase automatically checks for updates on launch. When an update is available, it downloads in the background and prompts you to restart.',
    updateDescMobile: 'Updates apply after an app restart (in-app JS bundle only). Native updates require the app store.',
    checking: 'Checking for updates…',
    check: 'Check for updates',
    downloading: 'Downloading update…',
    download: 'Download update',
    installRelaunch: 'Restart & install',
    applyRelaunch: 'Restart to apply',
    upToDate: 'You are up to date',
    updateAvailable: 'Update available',
    readyToInstallDesktop: 'Update downloaded — restart to install',
    readyToInstallMobile: 'Update ready — restart to apply',
    applying: 'Applying update…',
    error: 'Update check failed',
    notSupported: 'Auto-update is not available in this environment',
    channelDesktop: 'Desktop binary updates',
    channelMobile: 'OTA hot updates',
    privacyTitle: 'Privacy Policy',
    privacyDesc: 'Learn how we collect, use, and protect your personal information',
    privacyAction: 'View Privacy Policy',
  },
} as const;

const DESKTOP_CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;

export const AboutSettingsView: React.FC<AboutSettingsProps> = ({ themeStyles, language, onPrivacyPolicyClick }) => {
  const c = COPY[language] || COPY.en;
  const isGlass = themeStyles.name === 'glass';

  const cardBase = isGlass
    ? 'bg-white/5 border border-white/10 backdrop-blur-xl rounded-3xl'
    : 'bg-[#fffdf7] border border-[#bad8b7] rounded-3xl shadow-sm shadow-[#8fb998]/15';
  const iconWrap = isGlass
    ? 'bg-white/10 text-indigo-300'
    : 'bg-[#e8f2e1] text-[#336f4e]';
  const mutedText = isGlass ? 'text-white/50' : 'text-[#7a8f7f]';
  const bodyText = isGlass ? 'text-white/70' : 'text-[#4a6350]';
  const headingText = themeStyles.textPrimary;
  const btnSecondary = themeStyles.btnSecondary;
  const btnPrimary = isGlass
    ? 'bg-indigo-600 hover:bg-indigo-500 text-white'
    : 'bg-[#56a978] hover:bg-[#3f8e5e] text-white';

  const platform = getPlatform();
  const updater = platform.updater;
  const channel = updater?.channel;
  const isDesktop = channel === 'desktop-binary';
  const isMobile = channel === 'mobile-ota';

  const [currentVersion, setCurrentVersion] = useState<string>('');
  const [state, setState] = useState<UpdateState>({ phase: 'idle' });
  const lastCheckRef = useRef<number>(0);

  // Read current app version
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (isDesktop) {
        try {
          const { getVersion } = await import('@tauri-apps/api/app');
          const v = await getVersion();
          if (!cancelled) setCurrentVersion(v);
          return;
        } catch { /* fallthrough */ }
      }
      if (isMobile) {
        try {
          // @ts-ignore - expo-updates only exists in the mobile workspace; use runtime import to avoid Vite static analysis
          const mod = await (globalThis as any).import('expo-updates');
          const Updates = mod as any;
          const v = Updates.updateId || Updates.runtimeVersion || 'installed';
          if (!cancelled) setCurrentVersion(typeof v === 'string' ? v.slice(0, 12) : 'installed');
          return;
        } catch { /* fallthrough */ }
      }
      if (!cancelled) setCurrentVersion('—');
    })();
    return () => { cancelled = true; };
  }, [isDesktop, isMobile]);

  const performCheck = useCallback(async (silent = false) => {
    if (!updater) return;
    if (!silent) setState({ phase: 'checking' });
    try {
      const result = await updater.check();
      lastCheckRef.current = Date.now();
      if (!result.hasUpdate || !result.version) {
        setState({ phase: 'up-to-date' });
        return;
      }
      setState({ phase: 'available', version: result.version, body: result.body });
      if (silent) {
        try {
          platform.showNotification(
            language === 'zh'
              ? (isMobile ? '发现新版本（热更新）' : '发现新版本')
              : (isMobile ? 'Hot update available' : 'Update available'),
            language === 'zh'
              ? `新版本 ${result.version} 已就绪，前往"关于"安装。`
              : `Version ${result.version} is ready. Open About to install.`
          );
        } catch { /* ignore */ }
      }
    } catch (err) {
      if (!silent) setState({ phase: 'error', message: err instanceof Error ? err.message : String(err) });
    }
  }, [updater, platform, language, isMobile]);

  // Auto-check on launch + periodic polling (desktop) / launch-only (mobile)
  useEffect(() => {
    if (!updater) return;
    const initialTimer = setTimeout(() => { performCheck(true); }, 5000);
    const interval = isDesktop ? setInterval(() => performCheck(true), DESKTOP_CHECK_INTERVAL_MS) : null;
    return () => {
      clearTimeout(initialTimer);
      if (interval) clearInterval(interval);
    };
  }, [updater, performCheck, isDesktop]);

  const handleDownload = useCallback(async () => {
    if (!updater) return;
    setState({ phase: 'downloading' });
    try {
      await updater.download((p: UpdateProgress) => {
        setState({ phase: 'downloading', percentage: p.percentage, downloaded: p.downloaded, total: p.total });
      });
      setState((prev) =>
        prev.phase === 'available'
          ? { phase: 'ready', version: prev.version, body: prev.body }
          : { phase: 'ready', version: '' }
      );
    } catch (err) {
      setState({ phase: 'error', message: err instanceof Error ? err.message : String(err) });
    }
  }, [updater]);

  const handleApply = useCallback(async () => {
    if (!updater) return;
    setState({ phase: 'applying' });
    try {
      await updater.apply();
      // On desktop, relaunch() quits & restarts the app; on mobile, reloadAsync() reloads the JS bundle.
      // If we're still here 3s later, show ready state again.
      setTimeout(() => setState((prev) =>
        prev.phase === 'applying' ? { phase: 'ready', version: '' } : prev
      ), 3000);
    } catch (err) {
      setState({ phase: 'error', message: err instanceof Error ? err.message : String(err) });
    }
  }, [updater]);

  const StatusIcon = () => {
    if (state.phase === 'checking' || state.phase === 'downloading' || state.phase === 'applying') {
      return <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" />;
    }
    if (state.phase === 'up-to-date' || state.phase === 'ready') {
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    }
    if (state.phase === 'error') {
      return <AlertCircle className="w-4 h-4 text-red-500" />;
    }
    if (state.phase === 'available') {
      return <Download className="w-4 h-4 text-amber-500" />;
    }
    return null;
  };

  const statusText = () => {
    switch (state.phase) {
      case 'idle':
        return isDesktop ? c.autoCheckDesktop : isMobile ? c.autoCheckMobile : c.notSupported;
      case 'checking': return c.checking;
      case 'up-to-date': return c.upToDate;
      case 'available': return `${c.updateAvailable}: v${state.version}`;
      case 'downloading': {
        const pct = state.percentage;
        return pct !== undefined ? `${c.downloading} ${pct}%` : c.downloading;
      }
      case 'ready': return isDesktop ? c.readyToInstallDesktop : c.readyToInstallMobile;
      case 'applying': return c.applying;
      case 'error': return `${c.error}: ${state.message}`;
    }
  };

  const downloadPercent = state.phase === 'downloading' ? state.percentage : undefined;
  const displayedVersion = currentVersion || '…';

  return (
    <div className="space-y-6 max-w-xl">
      <div className="border-b border-white/10 pb-4" style={!isGlass ? { borderColor: '#d0e4cb' } : undefined}>
        <h3 className={`text-lg font-bold ${headingText}`}>{c.title}</h3>
        <p className={`text-xs ${mutedText}`}>{c.tagline}</p>
      </div>

      {/* 版本信息卡片 */}
      <div className={`${cardBase} overflow-hidden`}>
        <div className="flex items-start gap-4 p-5">
          <div className={`w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 ${iconWrap}`}>
            <Info className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className={`text-sm font-bold ${headingText}`}>{c.versionCardTitle}</h4>
            <p className={`text-xs ${mutedText} mt-0.5`}>
              {c.currentVersion} <span className={`font-mono font-semibold ${bodyText}`}>v{displayedVersion}</span>
              {(state.phase === 'available' || state.phase === 'ready') && state.version && (
                <>
                  {' · '}
                  {c.latestVersion}{' '}
                  <span className="font-mono font-semibold text-green-500">v{state.version}</span>
                </>
              )}
            </p>
            {channel && (
              <p className={`text-[10px] ${mutedText} mt-1 font-mono`}>
                {isDesktop ? c.channelDesktop : c.channelMobile}
              </p>
            )}
            {(state.phase === 'available' || state.phase === 'ready') && state.body && (
              <div className={`mt-3 p-3 rounded-xl text-xs whitespace-pre-wrap ${
                isGlass ? 'bg-white/5 text-white/70' : 'bg-[#f4f9ef] text-[#4a6350]'
              }`}>
                <div className={`font-semibold mb-1 ${bodyText}`}>{c.releaseNotes}</div>
                <div className="opacity-90">{state.body}</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 应用更新卡片 */}
      <div className={`${cardBase} overflow-hidden`}>
        <div className="flex items-start gap-4 p-5">
          <div className={`w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 ${iconWrap}`}>
            <Download className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className={`text-sm font-bold ${headingText}`}>{c.updateCardTitle}</h4>
            <p className={`text-xs ${mutedText} mt-0.5 flex items-center gap-1.5`}>
              <StatusIcon />
              <span>{statusText()}</span>
            </p>
            <p className={`text-xs ${bodyText} mt-2 leading-relaxed`}>
              {isDesktop ? c.updateDescDesktop : isMobile ? c.updateDescMobile : ''}
            </p>

            {state.phase === 'downloading' && (
              <div className={`mt-3 w-full h-1.5 rounded-full overflow-hidden ${
                isGlass ? 'bg-white/10' : 'bg-[#e0ece0]'
              }`}>
                <div
                  className="h-full bg-green-500 transition-all"
                  style={{ width: downloadPercent !== undefined ? `${downloadPercent}%` : '20%' }}
                />
              </div>
            )}

            <div className="mt-4 flex flex-wrap gap-2">
              {!updater && (
                <span className={`text-xs ${mutedText} px-1`}>{c.notSupported}</span>
              )}
              {updater && (
                <>
                  {(state.phase === 'idle' || state.phase === 'up-to-date' || state.phase === 'error') && (
                    <button
                      onClick={() => { void performCheck(false); }}
                      className={`${btnSecondary} px-4 py-2 text-xs font-semibold flex items-center gap-1.5 cursor-pointer`}
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      {c.check}
                    </button>
                  )}
                  {state.phase === 'available' && (
                    <button
                      onClick={() => { void handleDownload(); }}
                      className={`${btnPrimary} px-4 py-2 text-xs font-semibold rounded-xl flex items-center gap-1.5 cursor-pointer`}
                    >
                      <Download className="w-3.5 h-3.5" />
                      {c.download}
                    </button>
                  )}
                  {state.phase === 'ready' && (
                    <button
                      onClick={() => { void handleApply(); }}
                      className={`${btnPrimary} px-4 py-2 text-xs font-semibold rounded-xl flex items-center gap-1.5 cursor-pointer`}
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      {isDesktop ? c.installRelaunch : c.applyRelaunch}
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 隐私政策卡片 */}
      {onPrivacyPolicyClick && (
        <div className={`${cardBase} overflow-hidden`}>
          <div className="flex items-start gap-4 p-5">
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 ${iconWrap}`}>
              <Shield className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className={`text-sm font-bold ${headingText}`}>{c.privacyTitle}</h4>
              <p className={`text-xs ${mutedText} mt-0.5`}>{c.privacyDesc}</p>
              <div className="mt-4">
                <button
                  onClick={onPrivacyPolicyClick}
                  className={`${btnSecondary} px-4 py-2 text-xs font-semibold flex items-center gap-1.5 cursor-pointer`}
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  {c.privacyAction}
                </button>
              </div>
              {platform.getPlatform() === 'web' && (
                <div className={`mt-5 pt-4 border-t ${isGlass ? 'border-white/10' : 'border-[#bad8b7]'}`}>
                  <AnalyticsConsentToggle />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
