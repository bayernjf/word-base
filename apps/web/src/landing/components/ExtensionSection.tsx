import { Keyboard, Shield, Zap, Bookmark, Wifi, Download, Settings } from 'lucide-react';
import type { LandingTheme } from '../Landing';
import { cn, themeVars } from '../theme';

interface Props {
  theme: LandingTheme;
}

const features = [
  {
    icon: <Keyboard className="w-5 h-5" />,
    color: '#818cf8',
    title: '默认 Ctrl 悬停即查',
    desc: '无需选中、无需右键，默认按住 Ctrl 键鼠标悬停即可触发查词，极致流畅',
  },
  {
    icon: <Shield className="w-5 h-5" />,
    color: '#c084fc',
    title: 'Shadow DOM 隔离',
    desc: '使用 Shadow DOM 渲染悬浮弹窗，完全不污染页面样式，兼容所有网站',
  },
  {
    icon: <Zap className="w-5 h-5" />,
    color: '#f59e0b',
    title: '即时翻译',
    desc: '内置免费翻译源，支持接入大模型翻译引擎，支持多语言互译',
  },
  {
    icon: <Bookmark className="w-5 h-5" />,
    color: '#10b981',
    title: '一键收藏',
    desc: '保存单词的同时记录句子上下文、来源URL与页面标题，方便日后回顾',
  },
  {
    icon: <Wifi className="w-5 h-5" />,
    color: '#ef4444',
    title: '离线词典',
    desc: '内置离线英汉词典，无网络环境下也能正常查词，隐私安全无忧',
  },
  {
    icon: <Settings className="w-5 h-5" />,
    color: '#ec4899',
    title: '自由配置',
    desc: '选择添加特效、自定义触发键、悬停延迟、缓存上限，打造属于你的查词体验',
  },
];

export function ExtensionSection({ theme }: Props) {
  const t = themeVars(theme);

  return (
    <section
      id="extension"
      className={cn('px-4 sm:px-6 py-20 sm:py-28 border-y', t.sectionAlt, t.border)}
    >
      <div className="max-w-6xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-16">
          <div
            className={cn(
              'inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium mb-4',
              theme === 'dark' ? 'bg-purple-500/10 text-purple-300' : 'bg-purple-500/10 text-purple-600',
            )}
          >
            <Download className="w-3.5 h-3.5" />
            WordPicker 浏览器扩展
          </div>
          <h2 className={cn('text-3xl sm:text-4xl font-bold tracking-tight', t.text)}>
            浏览英文网页时，
            <br className="sm:hidden" />
            生词不再是障碍
          </h2>
          <p className={cn('mt-4 leading-relaxed', t.textMuted)}>
            安装 WordPicker 扩展后，阅读英文文档、论文、新闻时遇到生词，无需离开页面即可查词收藏。
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((f) => (
            <div
              key={f.title}
              className={cn(
                'p-5 rounded-xl border transition-all group',
                t.cardBg,
                t.border,
                t.cardHover,
              )}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 transition-transform group-hover:scale-105"
                style={{ backgroundColor: f.color + '20', color: f.color }}
              >
                {f.icon}
              </div>
              <h3 className={cn('text-sm font-semibold mb-1.5', t.text)}>{f.title}</h3>
              <p className={cn('text-xs leading-relaxed', t.textMuted)}>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
