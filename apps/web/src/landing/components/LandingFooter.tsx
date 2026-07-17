import { Github } from 'lucide-react';
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
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
          <div className="col-span-2">
            <div className="flex items-center gap-3">
              <a href="/">
                <WordBaseFullLogo className="h-16 w-auto" />
              </a>
              <span className={cn('text-xs ml-1', t.textSubtle)}>添忆：添加记忆；浏览即学习</span>
            </div>
          </div>

          <div>
            <h4
              className={cn(
                'text-xs font-bold uppercase tracking-wider mb-4',
                theme === 'dark' ? 'text-slate-500' : 'text-slate-400',
              )}
            >
              产品
            </h4>
            <ul className="space-y-2.5">
              <li>
                <a
                  href="/app"
                  className={cn(
                    'text-sm transition-colors',
                    theme === 'dark'
                      ? 'text-slate-400 hover:text-white'
                      : 'text-slate-600 hover:text-slate-900',
                  )}
                >
                  Web 版
                </a>
              </li>
              <li>
                <a
                  href="#extension"
                  className={cn(
                    'text-sm transition-colors',
                    theme === 'dark'
                      ? 'text-slate-400 hover:text-white'
                      : 'text-slate-600 hover:text-slate-900',
                  )}
                >
                  浏览器扩展
                </a>
              </li>
              <li>
                <a
                  href="#platforms"
                  className={cn(
                    'text-sm transition-colors',
                    theme === 'dark'
                      ? 'text-slate-400 hover:text-white'
                      : 'text-slate-600 hover:text-slate-900',
                  )}
                >
                  多端支持
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4
              className={cn(
                'text-xs font-bold uppercase tracking-wider mb-4',
                theme === 'dark' ? 'text-slate-500' : 'text-slate-400',
              )}
            >
              法律
            </h4>
            <ul className="space-y-2.5">
              <li>
                <a
                  href="/privacy"
                  className={cn(
                    'text-sm transition-colors',
                    theme === 'dark'
                      ? 'text-slate-400 hover:text-white'
                      : 'text-slate-600 hover:text-slate-900',
                  )}
                >
                  隐私政策
                </a>
              </li>
              <li>
                <a
                  href="/terms"
                  className={cn(
                    'text-sm transition-colors',
                    theme === 'dark'
                      ? 'text-slate-400 hover:text-white'
                      : 'text-slate-600 hover:text-slate-900',
                  )}
                >
                  服务条款
                </a>
              </li>
              <li>
                <a
                  href="/delete-account"
                  className={cn(
                    'text-sm transition-colors',
                    theme === 'dark'
                      ? 'text-slate-400 hover:text-white'
                      : 'text-slate-600 hover:text-slate-900',
                  )}
                >
                  账号删除
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div
          className={cn(
            'pt-6 border-t flex flex-col sm:flex-row items-center justify-between gap-4',
            t.border,
          )}
        >
          <p
            className={cn(
              'text-xs',
              theme === 'dark' ? 'text-slate-500' : 'text-slate-400',
            )}
          >
            © {new Date().getFullYear()} WordBase. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <a
              href="/privacy"
              className={cn(
                'text-xs transition-colors',
                theme === 'dark'
                  ? 'text-slate-500 hover:text-slate-300'
                  : 'text-slate-400 hover:text-slate-600',
              )}
            >
              隐私政策
            </a>
            <a
              href="/terms"
              className={cn(
                'text-xs transition-colors',
                theme === 'dark'
                  ? 'text-slate-500 hover:text-slate-300'
                  : 'text-slate-400 hover:text-slate-600',
              )}
            >
              服务条款
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
