import { Globe, Monitor, Smartphone, Cloud, RefreshCw, Lock, Check } from 'lucide-react';
import type { LandingTheme } from '../Landing';
import { cn, themeVars } from '../theme';

interface Props {
  theme: LandingTheme;
}

const platforms = [
  {
    icon: <Globe className="w-6 h-6" />,
    name: 'Web',
    desc: '浏览器即开即用',
    color: '#818cf8',
  },
  {
    icon: <Monitor className="w-6 h-6" />,
    name: '桌面端',
    desc: 'macOS / Windows',
    color: '#c084fc',
  },
  {
    icon: <Smartphone className="w-6 h-6" />,
    name: '移动端',
    desc: 'iOS / Android',
    color: '#e879f9',
  },
];

const syncFeatures = [
  { icon: <RefreshCw className="w-4 h-4" />, label: '实时双向同步' },
  { icon: <Cloud className="w-4 h-4" />, label: '云端备份' },
  { icon: <Lock className="w-4 h-4" />, label: '本地优先 · 离线可用' },
];

export function MultiPlatformSection({ theme }: Props) {
  const t = themeVars(theme);

  return (
    <section
      id="platforms"
      className={cn('px-4 sm:px-6 py-20 sm:py-28 border-y', t.sectionAlt, t.border)}
    >
      <div className="max-w-6xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-16">
          <div
            className={cn(
              'inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium mb-4',
              theme === 'dark' ? 'bg-emerald-500/10 text-emerald-300' : 'bg-emerald-500/10 text-emerald-600',
            )}
          >
            <Cloud className="w-3.5 h-3.5" />
            五端同步
          </div>
          <h2 className={cn('text-3xl sm:text-4xl font-bold tracking-tight', t.text)}>
            一次收藏，随处学习
          </h2>
          <p className={cn('mt-4 leading-relaxed', t.textMuted)}>
            浏览器里收藏的单词，在电脑和手机上立即可见。通勤路上用手机复习，工作时用桌面端深度学习。
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-5 mb-10">
          {platforms.map((p) => (
            <div
              key={p.name}
              className={cn(
                'relative p-8 rounded-2xl border text-center transition-all landing-animate-float',
                t.cardBg,
                t.border,
              )}
              style={{ animationDelay: platforms.indexOf(p) * 0.4 + 's' }}
            >
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
                style={{ backgroundColor: p.color + '20', color: p.color }}
              >
                {p.icon}
              </div>
              <h3 className={cn('text-lg font-semibold mb-1', t.text)}>{p.name}</h3>
              <p className={cn('text-sm', t.textMuted)}>{p.desc}</p>
            </div>
          ))}
        </div>

        <div className={cn('rounded-2xl border p-6 sm:p-8', t.cardBg, t.border)}>
          <div className="grid sm:grid-cols-3 gap-6">
            {syncFeatures.map((f) => (
              <div key={f.label} className="flex items-center gap-3">
                <div
                  className={cn(
                    'w-9 h-9 rounded-lg flex items-center justify-center shrink-0',
                    theme === 'dark' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-emerald-50 text-emerald-600',
                  )}
                >
                  {f.icon}
                </div>
                <div>
                  <span className={cn('text-sm font-medium', t.text)}>{f.label}</span>
                </div>
              </div>
            ))}
          </div>
          <div className={cn('mt-6 pt-6 border-t flex flex-wrap gap-x-6 gap-y-2 text-xs', t.border, t.textSubtle)}>
            <span className="flex items-center gap-1"><Check className="w-3 h-3 text-emerald-400" /> 浏览器扩展采集</span>
            <span className="flex items-center gap-1"><Check className="w-3 h-3 text-emerald-400" /> 多单词本分类管理</span>
            <span className="flex items-center gap-1"><Check className="w-3 h-3 text-emerald-400" /> 自定义 AI 模型</span>
            <span className="flex items-center gap-1"><Check className="w-3 h-3 text-emerald-400" /> 数据导入导出</span>
          </div>
        </div>
      </div>
    </section>
  );
}
