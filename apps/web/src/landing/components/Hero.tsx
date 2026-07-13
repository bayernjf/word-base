import { ArrowRight, Sparkles, Check, Globe, Monitor, Smartphone } from 'lucide-react';
import type { LandingTheme } from '../Landing';
import { cn, themeVars } from '../theme';
import { useDownloadUrls } from '../hooks/useDownloadUrls';

interface Props {
  theme: LandingTheme;
  onMacDownload?: () => void;
}

export function Hero({ theme, onMacDownload }: Props) {
  const t = themeVars(theme);
  const { downloadMac, downloadWin, downloadAndroid, downloadIos, downloadChrome } = useDownloadUrls();

  const handleDownloadMac = () => {
    downloadMac();
    onMacDownload?.();
  };

  return (
    <section className="relative pt-32 pb-20 sm:pt-40 sm:pb-28 px-4 sm:px-6 overflow-hidden">
      <div className="absolute inset-0 -z-10">
        {theme === 'dark' ? (
          <>
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-indigo-500/20 rounded-full blur-[120px] landing-animate-pulse-glow" />
            <div className="absolute top-32 right-1/4 w-[350px] h-[350px] bg-fuchsia-500/12 rounded-full blur-[100px]" />
            <div className="absolute top-60 left-1/4 w-[300px] h-[300px] bg-purple-500/10 rounded-full blur-[100px]" />
          </>
        ) : (
          <>
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-indigo-500/10 rounded-full blur-[120px]" />
            <div className="absolute top-32 right-1/4 w-[350px] h-[350px] bg-purple-400/8 rounded-full blur-[100px]" />
          </>
        )}
      </div>

      <div className="max-w-4xl mx-auto text-center">
        <div
          className={cn(
            'inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-medium mb-7',
            theme === 'dark'
              ? 'bg-indigo-500/10 border border-indigo-500/20 text-indigo-300'
              : 'bg-indigo-500/10 border border-indigo-500/20 text-indigo-600',
          )}
        >
          <Sparkles className="w-3.5 h-3.5" />
          默认 Ctrl 悬停即查词 · AI 语境深度学习
        </div>

        <h1
          className={cn(
            'text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight leading-[1.1]',
            t.text,
          )}
        >
          浏览即学习，
          <br />
          让每个生词都
          <span className="landing-gradient-text">不流失</span>
        </h1>

        <p className={cn('mt-6 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed', t.textMuted)}>
          WordBase 结合浏览器划词扩展 WordPicker 与 AI 词汇学习工作台。在英文网页阅读时按住 <kbd className={cn('px-1.5 py-0.5 rounded text-xs font-mono border', theme === 'dark' ? 'bg-slate-800/60 border-slate-700 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-600')}>Ctrl</kbd> 悬停即查词，一键收藏同步云端，在全平台通过 AI 故事、语境练习真正掌握词汇。
        </p>

        <div className="mt-9 flex flex-col items-center justify-center gap-3">
          <div className="inline-flex flex-wrap items-center justify-center gap-2">
            <button
              onClick={downloadChrome}
              className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:scale-[1.02] transition-all"
            >
              安装浏览器插件
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={handleDownloadMac}
              className={cn(
                'inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl text-sm font-semibold transition-colors border',
                theme === 'dark'
                  ? 'bg-slate-800/60 hover:bg-slate-800 border-slate-700/60 text-slate-200'
                  : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700',
              )}
            >
              安装 Mac
            </button>
            <button
              onClick={downloadWin}
              className={cn(
                'inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl text-sm font-semibold transition-colors border',
                theme === 'dark'
                  ? 'bg-slate-800/60 hover:bg-slate-800 border-slate-700/60 text-slate-200'
                  : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700',
              )}
            >
              安装 Win
            </button>
            <button
              onClick={downloadIos}
              className={cn(
                'inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl text-sm font-semibold transition-colors border',
                theme === 'dark'
                  ? 'bg-slate-800/60 hover:bg-slate-800 border-slate-700/60 text-slate-200'
                  : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700',
              )}
            >
              安装 iOS
            </button>
            <button
              onClick={downloadAndroid}
              className={cn(
                'inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl text-sm font-semibold transition-colors border',
                theme === 'dark'
                  ? 'bg-slate-800/60 hover:bg-slate-800 border-slate-700/60 text-slate-200'
                  : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700',
              )}
            >
              安装 Android
            </button>
          </div>
          <a
            href="/app"
            className={cn(
              'inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl text-sm font-semibold transition-colors border',
              theme === 'dark'
                ? 'bg-slate-800/60 hover:bg-slate-800 border-slate-700/60 text-slate-200'
                : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700',
            )}
          >
            打开 Web 版
          </a>
        </div>

        <div className={cn('mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs', t.textSubtle)}>
          <span className="flex items-center gap-1.5">
            <Check className="w-3.5 h-3.5 text-emerald-400" />
            Chrome / Edge / Safari
          </span>
          <span className="flex items-center gap-1.5">
            <Check className="w-3.5 h-3.5 text-emerald-400" />
            免费开源
          </span>
          <span className="flex items-center gap-1.5">
            <Check className="w-3.5 h-3.5 text-emerald-400" />
            离线词典可用
          </span>
          <span className="flex items-center gap-1.5">
            <Check className="w-3.5 h-3.5 text-emerald-400" />
            五端同步
          </span>
        </div>

        <div className={cn('mt-10 flex items-center justify-center gap-4 text-xs', t.textSubtle)}>
          <span className="flex items-center gap-1"><Globe className="w-3.5 h-3.5" /> Web</span>
          <span className="flex items-center gap-1"><Monitor className="w-3.5 h-3.5" /> Mac / Win</span>
          <span className="flex items-center gap-1"><Smartphone className="w-3.5 h-3.5" /> iOS / Android</span>
        </div>
      </div>
    </section>
  );
}
