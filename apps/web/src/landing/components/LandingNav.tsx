import { Moon, Sun, Github, ArrowRight, BookOpen } from 'lucide-react';
import type { LandingTheme } from '../Landing';
import { cn, themeVars } from '../theme';

interface Props {
  theme: LandingTheme;
  toggleTheme: () => void;
}

const navLinks = [
  { label: '工作流', href: '#workflow' },
  { label: '浏览器扩展', href: '#extension' },
  { label: 'AI 学习', href: '#learning' },
  { label: '多端同步', href: '#platforms' },
];

export function LandingNav({ theme, toggleTheme }: Props) {
  const t = themeVars(theme);

  return (
    <header
      className={cn(
        'fixed top-0 inset-x-0 z-50 backdrop-blur-xl border-b',
        t.navBg,
        t.border,
      )}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <a href="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-400 via-purple-400 to-fuchsia-400 flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:shadow-indigo-500/40 transition-shadow">
            <BookOpen className="w-4 h-4 text-white" />
          </div>
          <span className={cn('text-lg font-bold tracking-tight', t.text)}>WordBase</span>
        </a>

        <nav className="hidden md:flex items-center gap-7">
          {navLinks.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className={cn(
                'text-sm transition-colors hover:opacity-80',
                t.textMuted,
                theme === 'dark' ? 'hover:text-white' : 'hover:text-slate-800',
              )}
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            className={cn(
              'p-2 rounded-lg transition-colors',
              theme === 'dark'
                ? 'hover:bg-slate-800/60 text-slate-400'
                : 'hover:bg-slate-100 text-slate-600',
            )}
            aria-label="切换主题"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              'hidden sm:inline-flex p-2 rounded-lg transition-colors',
              theme === 'dark'
                ? 'hover:bg-slate-800/60 text-slate-400'
                : 'hover:bg-slate-100 text-slate-600',
            )}
            aria-label="GitHub"
          >
            <Github className="w-4 h-4" />
          </a>
          <a
            href="/app"
            className={cn(
              'hidden sm:inline-flex text-sm transition-colors px-3 py-1.5',
              t.textMuted,
              theme === 'dark' ? 'hover:text-white' : 'hover:text-slate-800',
            )}
          >
            进入 Web 版
          </a>
          <a
            href="#cta"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:scale-[1.02] transition-all"
          >
            免费使用
            <ArrowRight className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </header>
  );
}
