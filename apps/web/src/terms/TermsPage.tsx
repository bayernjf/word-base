'use client';

import { useEffect, useState } from 'react';
import { ArrowLeft, Moon, Sun } from 'lucide-react';
import { WordBaseFullLogo } from '../landing/components/LandingNav';
import { cn, themeVars } from '../landing/theme';

export type LandingTheme = 'dark' | 'light';

const TERMS_CONTENT = {
  zh: {
    title: '服务条款',
    subtitle: '生效日期：2026 年 7 月 17 日',
    backHome: '返回首页',
    intro: '欢迎使用 WordBase。使用或访问 WordBase 的网站、Web 应用、桌面应用、移动应用、浏览器扩展及相关服务，即表示你已阅读、理解并同意遵守本服务条款和隐私政策。如果你不同意本条款，请勿注册或使用本服务。',
    sections: [
      {
        heading: '一、服务说明',
        paragraphs: [
          '1. WordBase 提供单词管理、学习记录、间隔复习、多端同步以及可选的 AI 辅助学习功能。具体功能可能因平台、版本和地区而有所不同。',
          '2. 我们可能持续改进、调整、暂停或终止部分功能。对于影响你使用的重大变更，我们会通过网站、应用内通知或其他合理方式告知。',
          '3. 当前服务为免费提供。如未来推出付费功能，我们会在购买前明确展示价格、计费周期、退款规则及其他相关条件，并在必要时另行取得你的同意。',
        ],
      },
      {
        heading: '二、账户与资格',
        paragraphs: [
          '1. 你应提供真实、准确且有效的注册信息，并妥善保管账户凭据。你对通过自己账户进行的活动负责。',
          '2. 本服务主要面向成年学习者。未满 14 周岁的用户应由监护人阅读并同意本条款及隐私政策后方可使用。',
          '3. 如发现账户被未经授权使用、凭据泄露或其他安全问题，请立即通过本条款列明的渠道联系我们。',
          '4. 你可以随时在应用的「账户设置」中注销账户。账户注销后，相关数据将依据隐私政策处理，且该操作通常无法撤销。',
        ],
      },
      {
        heading: '三、允许的使用与禁止行为',
        paragraphs: [
          '你可以在遵守法律法规和本条款的前提下，将本服务用于个人学习。你不得：',
          '1. 利用本服务从事违法、侵权、欺诈、骚扰或危害他人安全的活动。',
          '2. 未经授权访问、探测、干扰或破坏本服务、服务器、网络、账户或安全机制。',
          '3. 使用自动化手段滥用接口、规避调用限制、批量抓取数据，或对服务造成不合理负载。',
          '4. 上传恶意代码，冒充他人，侵犯知识产权、隐私权或其他合法权利。',
          '5. 对本服务进行违法的反向工程、转售、再许可，或移除权利声明。',
        ],
      },
      {
        heading: '四、用户内容与知识产权',
        paragraphs: [
          '1. 你保留对自己提交的单词、语境、学习笔记及其他内容依法享有的权利。',
          '2. 为提供同步、存储、展示和 AI 辅助功能，你授予我们一项有限的、非独占的、仅为提供和维护服务所必需的处理许可。我们不会取得你内容的所有权。',
          '3. 你应确保提交的内容合法且拥有必要权利。因你提交的内容侵犯第三方权利而产生的责任由你依法承担。',
          '4. WordBase 的品牌、界面设计、软件及由我们提供的原创内容受知识产权法律保护。除法律允许或获得明确授权外，不得擅自复制或商业利用。',
        ],
      },
      {
        heading: '五、AI 功能与第三方服务',
        paragraphs: [
          '1. AI 功能可能由你选择的第三方 AI 服务商提供。使用相关功能时，必要的单词、语境、提示词或学习内容会发送给该服务商处理，具体方式见隐私政策。',
          '2. 如果你配置自己的 API Key，由此产生的费用、配额、服务可用性及数据处理受相应服务商条款约束。你应自行确保有权使用该 API Key。',
          '3. AI 输出可能不准确、不完整、过时或不适合特定用途。你应自行判断和核实，不应将其作为医疗、法律、财务或其他专业建议。',
          '4. Supabase、Cloudflare、Vercel 及你选择的 AI 服务商等第三方服务可能受其各自条款和隐私政策约束。',
        ],
      },
      {
        heading: '六、隐私与数据保护',
        paragraphs: [
          '我们按照《WordBase 隐私政策》收集、使用、存储和保护个人信息。隐私政策是本条款的重要组成部分。注册账户或使用涉及个人信息的功能前，请仔细阅读隐私政策。',
        ],
      },
      {
        heading: '七、服务可用性与免责声明',
        paragraphs: [
          '1. 我们会努力维护服务的安全和稳定，但不保证服务始终不中断、无错误或完全满足你的特定需求。维护、网络故障、第三方服务异常或不可抗力可能造成暂时不可用。',
          '2. 在法律允许的最大范围内，本服务按「现状」和「可用」基础提供。因 AI 输出、第三方服务或用户自身设备与网络产生的风险，应由相应责任方依法承担。',
          '3. 本条款不排除或限制依法不得排除或限制的消费者权利及法定责任。',
        ],
      },
      {
        heading: '八、暂停与终止',
        paragraphs: [
          '1. 如果你严重违反本条款、法律法规，危害服务安全或侵害他人权益，我们可以视情况限制、暂停或终止相关账户或功能，并在合理情况下通知你。',
          '2. 你可以停止使用服务并注销账户。终止后，按其性质应继续有效的条款仍然有效，包括知识产权、责任限制和争议处理条款。',
        ],
      },
      {
        heading: '九、条款更新与适用法律',
        paragraphs: [
          '1. 我们可能因功能、业务或法律要求更新本条款。重大变更会通过网站、应用内通知或其他合理方式告知，并注明新的生效日期。',
          '2. 在法律允许的范围内，本条款适用服务运营者所在地法律。争议应首先通过友好协商解决；协商不成的，依法向有管辖权的机构或法院处理。',
          '3. 如果本条款的任何部分被认定无效，不影响其他条款继续有效。',
        ],
      },
      {
        heading: '十、联系我们',
        paragraphs: [
          '如果你对本条款、账户或服务有疑问，可以通过以下渠道联系我们：',
          '• 应用内：前往「设置」-「意见反馈」',
          '• GitHub：https://github.com/bayernjf/word-base/issues',
          '我们会在收到请求后尽快处理。',
        ],
      },
    ],
  },
  en: {
    title: 'Terms of Service',
    subtitle: 'Effective date: July 17, 2026',
    backHome: 'Back to Home',
    intro: 'Welcome to WordBase. By accessing or using the WordBase website, web app, desktop app, mobile app, browser extension, or related services, you acknowledge that you have read, understood, and agree to these Terms of Service and the Privacy Policy. If you do not agree, do not register for or use the services.',
    sections: [
      {
        heading: '1. The Services',
        paragraphs: [
          '1. WordBase provides vocabulary management, learning records, spaced repetition, cross-device sync, and optional AI-assisted learning features. Features may vary by platform, version, and region.',
          '2. We may improve, modify, suspend, or discontinue features. We will provide reasonable notice through the website, in-app notices, or other appropriate means for material changes that affect your use.',
          '3. The services are currently provided free of charge. If paid features are introduced, pricing, billing periods, refund terms, and other applicable conditions will be clearly presented before purchase, and additional consent will be obtained where required.',
        ],
      },
      {
        heading: '2. Accounts and Eligibility',
        paragraphs: [
          '1. You must provide accurate and current registration information, safeguard your credentials, and take responsibility for activity through your account.',
          '2. The services are primarily intended for adult learners. Users under 14 may use them only after a guardian has reviewed and agreed to these Terms and the Privacy Policy.',
          '3. If you discover unauthorized account use, credential exposure, or another security issue, contact us promptly through the channels listed below.',
          '4. You may delete your account in Account Settings at any time. Related data will be handled under the Privacy Policy, and deletion is generally irreversible.',
        ],
      },
      {
        heading: '3. Acceptable Use',
        paragraphs: [
          'You may use the services for personal learning in compliance with applicable law and these Terms. You must not:',
          '1. Use the services for unlawful, infringing, fraudulent, harassing, or harmful activity.',
          '2. Access, probe, interfere with, or damage the services, servers, networks, accounts, or security controls without authorization.',
          '3. Abuse APIs, evade usage limits, scrape data at scale, or place an unreasonable load on the services through automated means.',
          '4. Upload malicious code, impersonate others, or violate intellectual property, privacy, or other legal rights.',
          '5. Unlawfully reverse engineer, resell, sublicense, or remove proprietary notices from the services.',
        ],
      },
      {
        heading: '4. User Content and Intellectual Property',
        paragraphs: [
          '1. You retain rights you lawfully hold in words, contexts, learning notes, and other content you submit.',
          '2. You grant us a limited, non-exclusive license to process your content only as necessary to provide syncing, storage, display, and AI-assisted features. We do not take ownership of your content.',
          '3. You are responsible for ensuring that your content is lawful and that you have the necessary rights to submit it.',
          '4. The WordBase brand, interface designs, software, and original content supplied by us are protected by intellectual property laws and may not be copied or commercially exploited without authorization, except as permitted by law.',
        ],
      },
      {
        heading: '5. AI Features and Third-Party Services',
        paragraphs: [
          '1. AI features may be provided by a third-party AI provider you select. Necessary words, contexts, prompts, or learning content will be sent to that provider as described in the Privacy Policy.',
          '2. If you configure your own API key, fees, quotas, availability, and data handling are governed by the applicable provider terms. You must be authorized to use that API key.',
          '3. AI output may be inaccurate, incomplete, outdated, or unsuitable for a particular purpose. You are responsible for reviewing it and must not treat it as medical, legal, financial, or other professional advice.',
          '4. Third-party services including Supabase, Cloudflare, Vercel, and your selected AI provider may be governed by their own terms and privacy policies.',
        ],
      },
      {
        heading: '6. Privacy and Data Protection',
        paragraphs: [
          'We collect, use, store, and protect personal information as described in the WordBase Privacy Policy, which forms an important part of these Terms. Review it carefully before creating an account or using features involving personal information.',
        ],
      },
      {
        heading: '7. Availability and Disclaimers',
        paragraphs: [
          '1. We work to keep the services secure and reliable, but do not guarantee uninterrupted or error-free operation or suitability for every particular need. Maintenance, network failures, third-party outages, or events beyond reasonable control may cause temporary unavailability.',
          '2. To the fullest extent permitted by law, the services are provided on an "as is" and "as available" basis. Risks arising from AI output, third-party services, or your devices and network remain with the responsible party under applicable law.',
          '3. Nothing in these Terms excludes or limits consumer rights or liabilities that cannot lawfully be excluded or limited.',
        ],
      },
      {
        heading: '8. Suspension and Termination',
        paragraphs: [
          '1. We may restrict, suspend, or terminate an account or feature if you materially breach these Terms or applicable law, threaten service security, or infringe the rights of others. We will provide notice where reasonable.',
          '2. You may stop using the services and delete your account. Provisions that by their nature should survive termination will remain effective, including intellectual property, limitations of liability, and dispute provisions.',
        ],
      },
      {
        heading: '9. Changes, Governing Law, and Disputes',
        paragraphs: [
          '1. We may update these Terms for product, business, or legal reasons. Material changes will be announced through the website, in-app notices, or other reasonable means with a new effective date.',
          '2. To the extent permitted by law, these Terms are governed by the laws of the service operator’s location. Disputes should first be addressed through good-faith discussion and otherwise submitted to a competent authority or court under applicable law.',
          '3. If any provision is found unenforceable, the remaining provisions continue in effect.',
        ],
      },
      {
        heading: '10. Contact Us',
        paragraphs: [
          'For questions about these Terms, your account, or the services, contact us through:',
          '• In-app: go to "Settings" - "Feedback"',
          '• GitHub: https://github.com/bayernjf/word-base/issues',
          'We will review your request as soon as reasonably possible.',
        ],
      },
    ],
  },
} as const;

export function TermsPage() {
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
    try {
      localStorage.setItem('wordbase-landing-theme', theme);
    } catch {}
  }, [theme]);

  useEffect(() => {
    try {
      localStorage.setItem('wordbase-landing-lang', lang);
    } catch {}
  }, [lang]);

  const content = TERMS_CONTENT[lang];
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
