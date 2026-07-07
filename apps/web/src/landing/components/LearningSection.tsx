import { Sparkles, BookOpenCheck, BrainCircuit, Headphones, MessageSquare, PenTool, BookOpen, RotateCcw } from 'lucide-react';
import type { LandingTheme } from '../Landing';
import { cn, themeVars } from '../theme';

interface Props {
  theme: LandingTheme;
}

const aiFeatures = [
  {
    icon: <Sparkles className="w-5 h-5" />,
    color: '#818cf8',
    title: 'AI 深度解析',
    desc: 'AI 生成词义详解、词根词缀、记忆技巧、例句用法，让你真正理解每个词',
  },
  {
    icon: <BookOpen className="w-5 h-5" />,
    color: '#c084fc',
    title: '语境故事学习',
    desc: '自动将生词编入原创英文故事，在真实语境中理解词义和用法，告别死记硬背',
  },
  {
    icon: <RotateCcw className="w-5 h-5" />,
    color: '#10b981',
    title: 'SRS 间隔复习',
    desc: '基于科学的间隔重复算法，智能安排复习时间，用最少时间实现长期记忆',
  },
];

const practiceModes = [
  { icon: <BookOpenCheck className="w-4 h-4" />, label: '阅读', color: '#818cf8' },
  { icon: <Headphones className="w-4 h-4" />, label: '听力', color: '#c084fc' },
  { icon: <MessageSquare className="w-4 h-4" />, label: '口语', color: '#f59e0b' },
  { icon: <PenTool className="w-4 h-4" />, label: '写作', color: '#ef4444' },
];

export function LearningSection({ theme }: Props) {
  const t = themeVars(theme);

  return (
    <section id="learning" className="px-4 sm:px-6 py-20 sm:py-28">
      <div className="max-w-6xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-16">
          <div
            className={cn(
              'inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium mb-4',
              theme === 'dark' ? 'bg-fuchsia-500/10 text-fuchsia-300' : 'bg-fuchsia-500/10 text-fuchsia-600',
            )}
          >
            <BrainCircuit className="w-3.5 h-3.5" />
            AI 学习工作台
          </div>
          <h2 className={cn('text-3xl sm:text-4xl font-bold tracking-tight', t.text)}>
            从「认识」到「掌握」，
            <br className="sm:hidden" />
            AI 陪你走完最后一公里
          </h2>
          <p className={cn('mt-4 leading-relaxed', t.textMuted)}>
            收藏只是开始。WordBase 的 AI 学习系统帮你在语境中理解、在练习中巩固、在复习中记住。
          </p>
        </div>

        {/* AI Features grid */}
        <div className="grid md:grid-cols-3 gap-5 mb-12">
          {aiFeatures.map((f) => (
            <div
              key={f.title}
              className={cn(
                'relative p-6 rounded-2xl border overflow-hidden group transition-all',
                t.cardBg,
                t.border,
                t.cardHover,
              )}
            >
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                style={{ background: `radial-gradient(circle at 30% 20%, ${f.color}15, transparent 60%)` }}
              />
              <div className="relative">
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center mb-4"
                  style={{ backgroundColor: f.color + '20', color: f.color }}
                >
                  {f.icon}
                </div>
                <h3 className={cn('text-base font-semibold mb-2', t.text)}>{f.title}</h3>
                <p className={cn('text-sm leading-relaxed', t.textMuted)}>{f.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Practice modes */}
        <div className={cn('rounded-2xl border p-6 sm:p-8', t.cardSolid, t.border)}>
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
            <div>
              <h3 className={cn('text-lg font-semibold mb-1', t.text)}>听说读写 · 四维练习</h3>
              <p className={cn('text-sm', t.textMuted)}>
                每个单词都可以通过四种方式强化训练，全面提升语言能力
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {practiceModes.map((m) => (
              <div
                key={m.label}
                className={cn(
                  'flex flex-col items-center gap-2 p-4 rounded-xl border transition-all hover:scale-[1.02]',
                  theme === 'dark' ? 'bg-slate-900/40 border-slate-800/60' : 'bg-white border-slate-200',
                )}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: m.color + '20', color: m.color }}
                >
                  {m.icon}
                </div>
                <span className={cn('text-xs font-medium', t.text)}>{m.label}练习</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
