import { Moon, Sun, ArrowRight } from 'lucide-react';
import type { LandingTheme } from '../Landing';
import { cn, themeVars } from '../theme';

export const WordBaseFullLogo = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 340 128" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
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
      <linearGradient id="textGrad" x1="72" y1="36" x2="240" y2="92" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#6366f1"/>
        <stop offset="50%" stopColor="#818cf8"/>
        <stop offset="100%" stopColor="#f59e0b"/>
      </linearGradient>
    </defs>
    <g transform="translate(4, 24) scale(1.2)">
      <rect x="36" y="14" width="16" height="40" rx="3" fill="url(#bookRight)"/>
      <rect x="10" y="10" width="16" height="44" rx="3" fill="url(#bookLeft)"/>
      <rect x="22" y="16" width="20" height="28" rx="3.5" fill="url(#card)"/>
      <path d="M26 23.5h12M26 29.5h12M26 35.5h10" stroke="#1f2937" strokeWidth="2" strokeLinecap="round" opacity="0.8"/>
    </g>
    <text x="78" y="78" fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" fontSize="50" fontWeight="800" fill="url(#textGrad)" letterSpacing="-1.5">WordBase</text>
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
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between overflow-visible">
        <a href="/" className="flex items-center group overflow-visible">
          <WordBaseFullLogo className="h-16 w-auto -mt-1" />
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
