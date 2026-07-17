import { cn, themeVars } from '../theme';
import type { LandingTheme } from '../Landing';
import { WordBaseFullLogo } from './LandingNav';

interface Props {
  theme: LandingTheme;
}

export function LandingFooter({ theme }: Props) {
  const t = themeVars(theme);

  return (
    <footer
      className={cn(
        'border-t mt-20',
        t.border,
        theme === 'dark' ? 'bg-slate-950/50' : 'bg-white/50',
      )}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <a href="/" className="inline-block">
              <WordBaseFullLogo className="h-10 w-auto -ml-1" />
            </a>
            <span
              className={cn(
                'text-xs',
                theme === 'dark' ? 'text-slate-400' : 'text-slate-500',
              )}
            >
              添忆：添加记忆；浏览即学习
            </span>
          </div>

          <div className="flex items-center gap-6">
            <a
              href="/app"
              className={cn(
                'text-xs transition-colors',
                theme === 'dark'
                  ? 'text-slate-400 hover:text-white'
                  : 'text-slate-500 hover:text-slate-900',
              )}
            >
              Web 版
            </a>
            <a
              href="/privacy"
              className={cn(
                'text-xs transition-colors',
                theme === 'dark'
                  ? 'text-slate-400 hover:text-white'
                  : 'text-slate-500 hover:text-slate-900',
              )}
            >
              隐私政策
            </a>
            <span
              className={cn(
                'text-xs',
                theme === 'dark' ? 'text-slate-500' : 'text-slate-400',
              )}
            >
              © {new Date().getFullYear()} WordBase. All rights reserved.
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
