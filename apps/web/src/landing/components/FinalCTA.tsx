import { ArrowRight, Download } from 'lucide-react';
import type { LandingTheme } from '../Landing';
import { cn, themeVars } from '../theme';
import { WordBaseFullLogo } from './LandingNav';

interface Props {
  theme: LandingTheme;
}

export function FinalCTA({ theme }: Props) {
  const t = themeVars(theme);

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
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <a
                href="#"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl text-sm font-semibold bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:scale-[1.02] transition-all"
              >
                <Download className="w-4 h-4" />
                安装 Chrome 扩展
              </a>
              <a
                href="/app"
                className={cn(
                  'w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl text-sm font-semibold transition-colors border',
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

      <footer className={cn('px-4 sm:px-6 py-8 border-t', t.border)}>
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <WordBaseFullLogo className="h-16 w-auto" />
              <span className={cn('text-xs ml-1', t.textSubtle)}>添忆：添加记忆；浏览即学习</span>
            </div>
            <div className="flex items-center gap-5">
              <a
                href="#"
                className={cn(
                  'text-xs transition-colors',
                  t.textSubtle,
                  theme === 'dark' ? 'hover:text-white' : 'hover:text-slate-700',
                )}
              >
                GitHub
              </a>
              <a
                href="#"
                className={cn(
                  'text-xs transition-colors',
                  t.textSubtle,
                  theme === 'dark' ? 'hover:text-white' : 'hover:text-slate-700',
                )}
              >
                Chrome 商店
              </a>
              <a
                href="/app"
                className={cn(
                  'text-xs transition-colors',
                  t.textSubtle,
                  theme === 'dark' ? 'hover:text-white' : 'hover:text-slate-700',
                )}
              >
                Web 版
              </a>
            </div>
            <p className={cn('text-xs', t.textSubtle)}>© 2026 WordBase. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </>
  );
}
