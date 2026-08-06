import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { LandingTheme } from '../Landing';
import { cn, themeVars } from '../theme';

interface Props {
  theme: LandingTheme;
}

const faqs = [
  {
    q: 'WordBase 是免费的吗？',
    a: '是的，WordBase 完全免费开源。核心功能（划词收藏、SRS 复习、AI 增强）全部免费使用。AI 功能需要你配置自己的 API Key（OpenAI / Anthropic / Gemini 等），费用由对应平台收取。',
  },
  {
    q: '数据存储在哪里？安全吗？',
    a: '数据存储在 Supabase（基于 PostgreSQL）云端，通过行级安全（RLS）策略确保每个用户只能访问自己的数据。AI API Key 使用 AES-256-GCM 加密存储，不会泄露。你随时可以导出或删除所有数据。',
  },
  {
    q: '支持哪些浏览器？',
    a: 'WordPicker 浏览器扩展支持 Chrome、Edge、Safari 等基于 Chromium 或 WebKit 的浏览器。安装后，在任意英文网页按住 Ctrl 悬停单词即可查词并收藏。',
  },
  {
    q: 'AI 功能需要什么配置？',
    a: '在设置页面添加你的 AI Provider 配置（OpenAI、Anthropic、Gemini 或任意 OpenAI 兼容接口），填入 API Key 即可。支持多 Provider 同时配置和切换。不配置 AI 也能使用基础的划词收藏和 SRS 复习功能。',
  },
  {
    q: '支持哪些平台？',
    a: 'Web 版直接在浏览器中使用，桌面端支持 macOS 和 Windows，移动端支持 iOS 和 Android。所有平台共享同一份数据，通过云端实时同步。',
  },
  {
    q: '离线可以使用吗？',
    a: '浏览器扩展内置离线词典，无需联网即可查词。已收藏的单词在离线时也可查看。AI 功能和云同步需要网络连接。',
  },
];

export function FaqSection({ theme }: Props) {
  const t = themeVars(theme);
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="px-4 sm:px-6 py-20 sm:py-28">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <div
            className={cn(
              'inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-medium mb-4',
              theme === 'dark'
                ? 'bg-indigo-500/10 border border-indigo-500/20 text-indigo-300'
                : 'bg-indigo-500/10 border border-indigo-500/20 text-indigo-600',
            )}
          >
            常见问题
          </div>
          <h2 className={cn('text-3xl sm:text-4xl font-bold tracking-tight', t.text)}>
            还有疑问？
          </h2>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <div
              key={i}
              className={cn(
                'rounded-xl border overflow-hidden transition-colors',
                theme === 'dark'
                  ? 'bg-slate-900/40 border-slate-800'
                  : 'bg-white border-slate-200',
              )}
            >
              <button
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left"
              >
                <span className={cn('text-sm font-medium', t.text)}>{faq.q}</span>
                <ChevronDown
                  className={cn(
                    'w-4 h-4 shrink-0 transition-transform duration-300',
                    t.textMuted,
                    openIndex === i && 'rotate-180',
                  )}
                />
              </button>
              <div
                className={cn(
                  'overflow-hidden transition-all duration-300',
                  openIndex === i ? 'max-h-60' : 'max-h-0',
                )}
              >
                <p className={cn('px-5 pb-4 text-sm leading-relaxed', t.textMuted)}>
                  {faq.a}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
