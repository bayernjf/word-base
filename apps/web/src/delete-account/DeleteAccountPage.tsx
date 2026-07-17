'use client';

import { useEffect, useState } from 'react';
import { ArrowLeft, Moon, Sun } from 'lucide-react';
import { WordBaseFullLogo } from '../landing/components/LandingNav';
import { cn, themeVars } from '../landing/theme';

export type LandingTheme = 'dark' | 'light';

const CONTENT = {
  zh: {
    title: '账号删除',
    subtitle: '如何删除你的 WordBase 账号及相关数据',
    backHome: '返回首页',
    intro: '我们尊重并支持你删除账号及相关个人数据的权利。以下说明将帮助你了解删除流程及注意事项。',
    sections: [
      {
        heading: '一、应用内删除',
        paragraphs: [
          '删除账号的最快捷方式是在应用内完成：',
          '1. 登录 WordBase 应用（Web / Desktop / Mobile 均可）。',
          '2. 前往「设置」-「账户设置」。',
          '3. 滑动到页面底部，点击「注销账号」。',
          '4. 系统会弹出两次确认窗口，请仔细阅读提示后确认。',
          '5. 确认后，你的账号、单词本、学习记录、AI 配置及所有关联数据将被永久删除。',
        ],
      },
      {
        heading: '二、删除的内容',
        paragraphs: [
          '账号注销将删除以下数据：',
          '• 你的账户信息（邮箱、昵称、头像）',
          '• 所有单词本及其中包含的单词',
          '• 学习记录和 SRS 复习数据',
          '• AI 配置信息（API Key 等）',
          '• 同步设备绑定信息',
          '• 反馈记录',
          '• 其他与你账号关联的个人数据',
          '删除操作不可逆，请谨慎操作。',
        ],
      },
      {
        heading: '三、数据保留说明',
        paragraphs: [
          '在以下情况下，我们可能需要保留部分数据：',
          '• 法律、法规或政府主管部门要求保留特定数据。',
          '• 因安全、欺诈防范等正当理由需要保留相关日志。',
          '在上述情况下，保留的数据将仅限于必要范围，并在保留期满后匿名化或删除。',
        ],
      },
      {
        heading: '四、通过其他方式请求删除',
        paragraphs: [
          '如果你无法通过应用内方式删除账号，也可以通过以下途径联系我们处理：',
          '• GitHub：https://github.com/bayernjf/word-base/issues',
          '我们在收到请求后会尽快处理，并在验证身份后完成删除。',
        ],
      },
    ],
  },
  en: {
    title: 'Account Deletion',
    subtitle: 'How to delete your WordBase account and associated data',
    backHome: 'Back to Home',
    intro: 'We respect and support your right to delete your account and associated personal data. The following instructions will help you understand the deletion process.',
    sections: [
      {
        heading: '1. In-App Deletion',
        paragraphs: [
          'The fastest way to delete your account is through the app:',
          '1. Log in to WordBase (Web / Desktop / Mobile).',
          '2. Go to "Settings" - "Account Settings".',
          '3. Scroll to the bottom and tap "Delete Account".',
          '4. Two confirmation dialogs will appear — read the prompts carefully and confirm.',
          '5. After confirmation, your account, wordbooks, study records, AI configuration, and all associated data will be permanently deleted.',
        ],
      },
      {
        heading: '2. Data Deleted',
        paragraphs: [
          'Account deletion removes the following data:',
          '• Account information (email, nickname, avatar)',
          '• All wordbooks and the words they contain',
          '• Study records and SRS review data',
          '• AI configuration (API keys, etc.)',
          '• Device sync bindings',
          '• Feedback records',
          '• Other personal data associated with your account',
          'Deletion is irreversible — please proceed with caution.',
        ],
      },
      {
        heading: '3. Data Retention',
        paragraphs: [
          'We may need to retain limited data in the following circumstances:',
          '• When required by applicable laws, regulations, or government authorities.',
          '• When necessary for legitimate security, fraud prevention, or compliance purposes.',
          'In such cases, retained data will be limited to the necessary scope and will be anonymized or deleted once the retention period expires.',
        ],
      },
      {
        heading: '4. Requesting Deletion Through Other Channels',
        paragraphs: [
          'If you are unable to delete your account through the app, you can contact us through:',
          '• GitHub: https://github.com/bayernjf/word-base/issues',
          'We will process your request as soon as possible after verifying your identity.',
        ],
      },
    ],
  },
} as const;

export function DeleteAccountPage() {
  const [theme, setTheme] = useState<LandingTheme>(() => {
    try {
      return localStorage.getItem('wordbase-landing-theme') === 'light' ? 'light' : 'dark';
    } catch {
      return 'dark';
    }
  });
  const [lang, setLang] = useState<'zh' | 'en'>(() => {
    try {
      return localStorage.getItem('wordbase-landing-lang') === 'en' ? 'en' : 'zh';
    } catch {
      return 'zh';
    }
  });

  useEffect(() => {
    document.body.classList.remove('landing-dark', 'landing-light');
    document.body.classList.add(`landing-${theme}`);
    try { localStorage.setItem('wordbase-landing-theme', theme); } catch { /* noop */ }
  }, [theme]);

  useEffect(() => {
    try { localStorage.setItem('wordbase-landing-lang', lang); } catch { /* noop */ }
  }, [lang]);

  const content = CONTENT[lang];
  const t = themeVars(theme);

  return (
    <div className="min-h-screen">
      <header className={cn('fixed top-0 inset-x-0 z-50 backdrop-blur-xl border-b', t.navBg, t.border)}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <a href="/" className="flex items-center group">
            <WordBaseFullLogo className="h-14 w-auto -mt-0.5" />
          </a>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')}
              className={cn('px-3 py-1.5 rounded-lg text-xs font-medium transition-colors', theme === 'dark' ? 'text-slate-400 hover:text-white hover:bg-slate-800/60' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100')}
            >
              {lang === 'zh' ? 'EN' : '中文'}
            </button>
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className={cn('p-2 rounded-lg transition-colors', theme === 'dark' ? 'hover:bg-slate-800/60 text-slate-400' : 'hover:bg-slate-100 text-slate-600')}
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <a
              href="/"
              className={cn('hidden sm:inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors', theme === 'dark' ? 'text-slate-300 hover:text-white hover:bg-slate-800/60' : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100')}
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              {content.backHome}
            </a>
          </div>
        </div>
      </header>
      <main className="pt-24 pb-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div className="mb-8">
            <h1 className={cn('text-3xl sm:text-4xl font-bold tracking-tight', theme === 'dark' ? 'text-white' : 'text-slate-900')}>{content.title}</h1>
            <p className={cn('text-sm mt-2', theme === 'dark' ? 'text-slate-400' : 'text-slate-500')}>{content.subtitle}</p>
          </div>
          <div className={cn('prose prose-sm max-w-none', theme === 'dark' && 'prose-invert')}>
            <p className={cn('text-sm leading-relaxed', theme === 'dark' ? 'text-slate-300' : 'text-slate-700')}>{content.intro}</p>
            {content.sections.map((section) => (
              <section key={section.heading} className="mt-8">
                <h2 className={cn('text-lg font-bold mb-3', theme === 'dark' ? 'text-white' : 'text-slate-900')}>{section.heading}</h2>
                <div className={cn('text-sm leading-relaxed space-y-1.5', theme === 'dark' ? 'text-slate-300' : 'text-slate-700')}>
                  {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
                </div>
              </section>
            ))}
          </div>
          <div className="mt-12 sm:hidden">
            <a href="/" className={cn('flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-medium', theme === 'dark' ? 'bg-slate-800/60 text-slate-300 hover:bg-slate-800' : 'bg-slate-100 text-slate-700 hover:bg-slate-200')}>
              <ArrowLeft className="w-4 h-4" />
              {content.backHome}
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}