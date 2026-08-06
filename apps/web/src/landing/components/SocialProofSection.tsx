import { useState, useEffect } from 'react';
import { Star, GitFork, Users, BookOpen } from 'lucide-react';
import type { LandingTheme } from '../Landing';
import { cn, themeVars } from '../theme';

interface Props {
  theme: LandingTheme;
}

interface RepoStats {
  stars: number;
  forks: number;
}

export function SocialProofSection({ theme }: Props) {
  const t = themeVars(theme);
  const [stats, setStats] = useState<RepoStats>({ stars: 0, forks: 0 });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch('https://api.github.com/repos/bayernjf/word-base');
        const data = await res.json();
        setStats({
          stars: data.stargazers_count || 0,
          forks: data.forks_count || 0,
        });
      } catch {
        /* noop */
      }
    };
    fetchStats();
  }, []);

  const formatNum = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n));

  const items = [
    { icon: Star, label: 'GitHub Stars', value: formatNum(stats.stars) },
    { icon: GitFork, label: 'Forks', value: formatNum(stats.forks) },
    { icon: BookOpen, label: '生词本容量', value: '无限' },
    { icon: Users, label: '支持平台', value: '5 端' },
  ];

  return (
    <section className="px-4 sm:px-6 py-16">
      <div className="max-w-4xl mx-auto">
        <div
          className={cn(
            'grid grid-cols-2 md:grid-cols-4 gap-4 p-6 rounded-2xl border',
            theme === 'dark'
              ? 'bg-slate-900/40 border-slate-800'
              : 'bg-white border-slate-200',
          )}
        >
          {items.map((item) => (
            <div key={item.label} className="flex flex-col items-center gap-2 text-center">
              <item.icon
                className={cn(
                  'w-5 h-5',
                  theme === 'dark' ? 'text-indigo-400' : 'text-indigo-600',
                )}
              />
              <span className={cn('text-2xl font-bold', t.text)}>{item.value}</span>
              <span className={cn('text-xs', t.textSubtle)}>{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
