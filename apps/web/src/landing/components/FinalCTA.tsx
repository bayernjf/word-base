import { ArrowRight, Download } from 'lucide-react';
import type { LandingTheme } from '../Landing';
import { cn, themeVars } from '../theme';
import { WordBaseFullLogo } from './LandingNav';
import { useDownloadUrls } from '../hooks/useDownloadUrls';
import { UnavailablePlatformButton } from './UnavailablePlatformButton';

interface Props {
  theme: LandingTheme;
}

export function FinalCTA({ theme }: Props) {
  const t = themeVars(theme);
  const { downloadChrome } = useDownloadUrls();

  return (
    <>
      <section id="cta" className="px-4 sm:px-6 py-20 sm:py-28">
        <div className="max-w-3xl mx-auto text-center">
          <div className="relative">
            <div className="absolute inset-0 -z-10">
              {theme === 'dark' ? (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-gradient-to-r from-indigo-500/20 via-purple-500/20 to-fuchsia-500/20 rounded-full blur-[100px]" />
              ) : (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-fuchsia-500/10 rounded-full blur-[100px]" />
              )}
            </div>

            <h2
              className={cn(
                'text-3xl sm:text-5xl font-bold tracking-tight leading-tight mb-6',
                t.text,
              )}
            >
              开始你的无痛
              <br />
              <span className="landing-gradient-text">词汇积累之旅</span>
            </h2>
            <p className={cn('text-base sm:text-lg mb-10 max-w-xl mx-auto', t.textMuted)}>
              现在安装浏览器扩展，让每一次英文阅读都成为词汇积累的机会。
            </p>
            <div className="flex flex-col items-center justify-center gap-3">
              <div className="inline-flex flex-wrap items-center justify-center gap-2">
                <button
                  onClick={downloadChrome}
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl text-sm font-semibold bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:scale-[1.02] transition-all"
                >
                  <Download className="w-4 h-4" />
                  安装浏览器插件
                </button>
                {['Mac', 'Win', 'iOS', 'Android'].map((platform) => (
                  <UnavailablePlatformButton
                    key={platform}
                    theme={theme}
                    className={cn(
                      'inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl text-sm font-semibold transition-colors border opacity-50 cursor-not-allowed',
                      theme === 'dark'
                        ? 'bg-slate-800/60 border-slate-700/60 text-slate-200'
                        : 'bg-white border-slate-200 text-slate-700',
                    )}
                  >
                    安装 {platform}
                  </UnavailablePlatformButton>
                ))}
              </div>
              <a
                href="/app"
                className={cn(
                  'inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl text-sm font-semibold transition-colors border',
                  theme === 'dark'
                    ? 'bg-slate-800/60 hover:bg-slate-800 border-slate-700/60 text-slate-200'
                    : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700',
                )}
              >
                <ArrowRight className="w-4 h-4" />
                打开 Web 版
              </a>
            </div>
          </div>
        </div>
      </section>

    </>
  );
}
