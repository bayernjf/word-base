import { Moon, Sun, Github, ArrowRight } from 'lucide-react';
import type { LandingTheme } from '../Landing';
import { cn, themeVars } from '../theme';

const WordBaseLogo = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M32 6L36 20L50 20L39 29L44 43L32 33L20 43L25 29L14 20L28 20L32 6Z" fill="currentColor" opacity="0.3"/>
    <rect x="10" y="22" width="18" height="36" rx="3" fill="currentColor" opacity="0.4"/>
    <rect x="36" y="22" width="18" height="36" rx="3" fill="currentColor" opacity="0.25"/>
    <rect x="18" y="18" width="28" height="38" rx="4" fill="currentColor"/>
    <path d="M24 28h16M24 35h16M24 42h12M24 49h9" stroke="#fff" strokeWidth="2" strokeLinecap="round" opacity="0.9"/>
  </svg>
);

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
            <WordBaseLogo className="w-6 h-6 text-white" />
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
