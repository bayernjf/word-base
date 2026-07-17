'use client';

import { useState, useEffect } from 'react';
import { WordBaseFullLogo } from '../landing/components/LandingNav';
import { cn, themeVars } from '../landing/theme';
import { Moon, Sun, ArrowLeft } from 'lucide-react';

export type LandingTheme = 'dark' | 'light';

const PRIVACY_CONTENT = {
  zh: {
    title: '隐私政策',
    subtitle: '最后更新：2026 年 7 月 17 日',
    backHome: '返回首页',
    intro: `欢迎使用 WordBase（以下简称"本应用"）。我们深知个人信息对你的重要性，并会尽全力保护你的个人信息安全可靠。我们致力于维持你对我们的信任，恪守以下原则保护你的个人信息：权责一致原则、目的明确原则、选择同意原则、最少够用原则、确保安全原则、主体参与原则、公开透明原则等。`,
    sections: [
      {
        heading: '一、我们收集的信息',
        paragraphs: [
          '在你使用本应用的过程中，我们仅会收集为提供服务所必需的以下信息：',
          '1. 账户信息：注册时你提供的电子邮箱、昵称/头像（可选）。我们使用 Supabase 作为后端服务，你的账户数据由 Supabase 存储和管理。',
          '2. 学习数据：你添加的单词、生词本、学习记录、SRS 复习数据等。这些数据存储在 Supabase 数据库中，仅与你的账户关联。',
          '3. AI 配置信息：你在应用中配置的 AI 服务商 API Key。我们使用 AES-256-GCM 加密存储，密钥由服务端环境变量管理，无法被直接读取。',
          '4. 设备与日志信息：为保证服务安全与质量，我们可能会记录你的设备型号、操作系统版本、IP 地址及操作日志。',
        ],
      },
      {
        heading: '二、我们如何使用信息',
        paragraphs: [
          '我们严格遵守法律法规的规定以及与你的约定，将收集的信息用于以下用途：',
          '1. 向你提供核心学习功能：单词管理、生词本、复习提醒、AI 增强学习等。',
          '2. 账户管理：注册、登录、身份验证、密码重置。',
          '3. 多设备同步：将你的学习数据同步到不同设备。',
          '4. 服务改进：持续优化产品功能和用户体验。',
          '5. 安全保障：检测和防范欺诈、滥用等安全风险。',
        ],
      },
      {
        heading: '三、AI 功能与数据处理',
        paragraphs: [
          '本应用提供 AI 驱动的学习增强功能（如单词释义、例句生成、故事生成、AI 导师对话等）。使用这些功能时：',
          '1. 你可以自行配置 AI 服务商（OpenAI / Anthropic / Gemini / 自定义兼容接口）及对应的 API Key。',
          '2. 调用 AI 功能时，相关的单词、语境、学习内容等数据会被发送到你选择的 AI 服务商，用于生成结果。',
          '3. 如果你使用自己的 API Key，相关费用和数据处理政策以该 AI 服务商的条款为准。',
          '4. 我们不会将你的学习数据用于训练我们的自有模型，也不会出售给第三方。',
        ],
      },
      {
        heading: '四、信息共享与披露',
        paragraphs: [
          '我们不会向任何第三方出售你的个人信息。仅在以下情况下，我们可能会共享你的信息：',
          '1. 经过你的明确同意。',
          '2. 为实现服务所必需的合作伙伴：如 Supabase（数据库与认证服务）、Vercel / Cloudflare（托管服务）。这些合作伙伴均受严格的数据保护协议约束。',
          '3. 根据法律法规的要求，或政府主管部门的强制性要求。',
          '4. 为维护我们及用户的合法权益所必需的情形。',
        ],
      },
      {
        heading: '五、数据存储与安全',
        paragraphs: [
          '1. 你的数据主要存储在 Supabase 云数据库中，由 Supabase 提供物理安全保障。',
          '2. 敏感信息（如 AI API Key）在服务端使用 AES-256-GCM 算法加密存储。',
          '3. 所有数据传输均通过 HTTPS 加密通道。',
          '4. 我们采用业界标准的安全措施保护你的数据，包括但不限于访问控制、加密传输、定期安全审计。',
          '5. 尽管已经采取了上述合理有效措施，并已经遵守了相关法律规定要求的义务，但请你理解，由于技术的限制以及可能存在的各种恶意手段，我们不能始终保证信息百分之百安全。',
        ],
      },
      {
        heading: '六、你的权利',
        paragraphs: [
          '你对自己的个人信息享有以下权利：',
          '1. 访问权：你可以在应用的「账户设置」中查看和管理你的个人资料。',
          '2. 更正权：你可以随时修改你的昵称、头像等个人信息。',
          '3. 删除权：你可以在「账户设置」中选择「注销账号」，我们将删除你的全部个人数据（包括单词本、学习记录、AI 配置等）。你也可以访问 /delete-account 查看站外删除说明。',
          '4. 撤回同意：你可以通过关闭功能或注销账号的方式撤回授权同意。',
          '5. 注销账号后，除法律法规另有规定外，我们将匿名化或删除你的个人信息。',
        ],
      },
      {
        heading: '七、Cookie 与本地存储',
        paragraphs: [
          '1. 本应用使用浏览器本地存储（localStorage / IndexedDB）来保存你的主题偏好、语言设置、登录状态等非敏感信息，以便提升使用体验。',
          '2. 这些数据仅存储在你的设备本地，不会上传到服务器。',
          '3. 你可以随时在浏览器设置中清除这些数据。',
        ],
      },
      {
        heading: '八、儿童隐私',
        paragraphs: [
          '本应用主要面向成年学习者。如果你是未满 14 周岁的未成年人，请在监护人陪同下阅读本政策，并在监护人同意后使用我们的服务。如果我们发现收集了未获监护人同意的儿童个人信息，会尽快删除相关数据。',
        ],
      },
      {
        heading: '九、政策更新',
        paragraphs: [
          '我们可能会根据业务调整或法律法规要求不时更新本隐私政策。更新后的政策将在本页面公布，重大变更会通过应用内通知或其他适当方式告知你。',
        ],
      },
      {
        heading: '十、联系我们',
        paragraphs: [
          '如果你对本隐私政策有任何疑问、意见或建议，或希望行使你的相关权利，可以通过以下方式联系我们：',
          '• 应用内：前往「设置」-「关于」-「反馈与支持」',
          '• GitHub：提交 Issue 到 word-base 项目仓库',
          '我们将在收到你的反馈后尽快回复。',
        ],
      },
    ],
  },
  en: {
    title: 'Privacy Policy',
    subtitle: 'Last updated: July 17, 2026',
    backHome: 'Back to Home',
    intro: `Welcome to WordBase ("the App"). We understand that personal information is important to you and we are committed to protecting the security of your personal information. We adhere to the following principles: accountability, purpose limitation, consent, data minimization, security safeguards, individual participation, and transparency.`,
    sections: [
      {
        heading: '1. Information We Collect',
        paragraphs: [
          'We only collect information necessary to provide our services:',
          '1. Account information: Email address, nickname/avatar (optional). We use Supabase as our backend service; your account data is stored and managed by Supabase.',
          '2. Learning data: Words you add, vocabulary books, study records, SRS review data, etc. This data is stored in the Supabase database and associated only with your account.',
          '3. AI configuration: AI provider API keys you configure. These are encrypted with AES-256-GCM and stored on the server; the encryption key is managed via environment variables and cannot be read directly.',
          '4. Device and log information: To ensure service quality and security, we may record your device model, OS version, IP address, and operation logs.',
        ],
      },
      {
        heading: '2. How We Use Information',
        paragraphs: [
          'We use collected information strictly in accordance with applicable laws and our agreement with you, for the following purposes:',
          '1. To provide core learning features: word management, vocabulary books, review reminders, AI-enhanced learning, etc.',
          '2. Account management: registration, login, authentication, password reset.',
          '3. Multi-device sync: syncing your learning data across devices.',
          '4. Service improvement: continuously improving product features and user experience.',
          '5. Security: detecting and preventing fraud, abuse, and other security risks.',
        ],
      },
      {
        heading: '3. AI Features and Data Processing',
        paragraphs: [
          'This App provides AI-powered learning features (such as word definitions, example sentences, story generation, AI tutor conversations, etc.). When using these features:',
          '1. You can configure your own AI provider (OpenAI / Anthropic / Gemini / custom compatible endpoint) and corresponding API Key.',
          '2. When calling AI features, relevant data (words, context, learning content, etc.) is sent to the AI provider you selected to generate results.',
          '3. If you use your own API Key, related costs and data handling are subject to that AI provider\'s terms of service.',
          '4. We do not use your learning data to train our own models, nor do we sell it to third parties.',
        ],
      },
      {
        heading: '4. Information Sharing and Disclosure',
        paragraphs: [
          'We do not sell your personal information to any third party. We may share your information only in the following circumstances:',
          '1. With your explicit consent.',
          '2. With necessary service partners: such as Supabase (database and authentication), Vercel / Cloudflare (hosting). These partners are bound by strict data protection agreements.',
          '3. As required by laws and regulations, or by mandatory requirements from government authorities.',
          '4. When necessary to protect the legitimate rights and interests of us and our users.',
        ],
      },
      {
        heading: '5. Data Storage and Security',
        paragraphs: [
          '1. Your data is primarily stored in the Supabase cloud database, with physical security provided by Supabase.',
          '2. Sensitive information (such as AI API Keys) is encrypted on the server using AES-256-GCM.',
          '3. All data transmission uses HTTPS encrypted channels.',
          '4. We employ industry-standard security measures to protect your data, including but not limited to access control, encrypted transmission, and regular security audits.',
          '5. Despite these reasonable and effective measures, please understand that due to technical limitations and potential malicious means, we cannot guarantee 100% information security at all times.',
        ],
      },
      {
        heading: '6. Your Rights',
        paragraphs: [
          'You have the following rights regarding your personal information:',
          '1. Access: You can view and manage your profile in "Account Settings".',
          '2. Correction: You can modify your nickname, avatar, and other personal information at any time.',
          '3. Deletion: You can choose "Delete Account" in "Account Settings"; we will delete all your personal data (including vocabulary books, study records, AI configuration, etc.).',
          '4. Withdrawal of consent: You can withdraw your consent by disabling features or deleting your account.',
          '5. After account deletion, except as otherwise required by laws and regulations, we will anonymize or delete your personal information.',
        ],
      },
      {
        heading: '7. Cookies and Local Storage',
        paragraphs: [
          '1. This App uses browser local storage (localStorage / IndexedDB) to store non-sensitive information such as theme preference, language setting, and login state to improve your experience.',
          '2. This data is stored only on your device and is not uploaded to the server.',
          '3. You can clear this data at any time in your browser settings.',
        ],
      },
      {
        heading: '8. Children\'s Privacy',
        paragraphs: [
          'This App is primarily intended for adult learners. If you are under 14 years old, please read this policy with your guardian and use our services only with your guardian\'s consent. If we discover that we have collected personal information from a child without guardian consent, we will promptly delete the relevant data.',
        ],
      },
      {
        heading: '9. Policy Updates',
        paragraphs: [
          'We may update this privacy policy from time to time due to business adjustments or legal requirements. The updated policy will be posted on this page, and material changes will be notified to you via in-app notification or other appropriate means.',
        ],
      },
      {
        heading: '10. Contact Us',
        paragraphs: [
          'If you have any questions, comments, or suggestions about this privacy policy, or wish to exercise your rights, you can contact us through:',
          '• In-app: go to "Settings" - "About" - "Feedback & Support"',
          '• GitHub: submit an issue to the word-base repository',
          'We will respond as soon as possible after receiving your feedback.',
        ],
      },
    ],
  },
} as const;

export function PrivacyPage() {
  const [theme, setTheme] = useState<LandingTheme>(() => {
    try {
      const saved = localStorage.getItem('wordbase-landing-theme');
      return (saved === 'light' ? 'light' : 'dark') as LandingTheme;
    } catch {
      return 'dark';
    }
  });

  const [lang, setLang] = useState<'zh' | 'en'>(() => {
    try {
      const saved = localStorage.getItem('wordbase-landing-lang');
      return (saved === 'en' ? 'en' : 'zh') as 'zh' | 'en';
    } catch {
      return 'zh';
    }
  });

  useEffect(() => {
    document.body.classList.remove('landing-dark', 'landing-light');
    document.body.classList.add(`landing-${theme}`);
    try {
      localStorage.setItem('wordbase-landing-theme', theme);
    } catch {
      /* ignore */
    }
  }, [theme]);

  useEffect(() => {
    try {
      localStorage.setItem('wordbase-landing-lang', lang);
    } catch {
      /* ignore */
    }
  }, [lang]);

  const toggleTheme = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'));
  const content = PRIVACY_CONTENT[lang];
  const t = themeVars(theme);

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header
        className={cn(
          'fixed top-0 inset-x-0 z-50 backdrop-blur-xl border-b',
          t.navBg,
          t.border,
        )}
      >
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <a href="/" className="flex items-center group">
            <WordBaseFullLogo className="h-14 w-auto -mt-0.5" />
          </a>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                theme === 'dark'
                  ? 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100',
              )}
            >
              {lang === 'zh' ? 'EN' : '中文'}
            </button>
            <button
              onClick={toggleTheme}
              className={cn(
                'p-2 rounded-lg transition-colors',
                theme === 'dark'
                  ? 'hover:bg-slate-800/60 text-slate-400'
                  : 'hover:bg-slate-100 text-slate-600',
              )}
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <a
              href="/"
              className={cn(
                'hidden sm:inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                theme === 'dark'
                  ? 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100',
              )}
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              {content.backHome}
            </a>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="pt-24 pb-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div className="mb-8">
            <h1
              className={cn(
                'text-3xl sm:text-4xl font-bold tracking-tight',
                theme === 'dark' ? 'text-white' : 'text-slate-900',
              )}
            >
              {content.title}
            </h1>
            <p
              className={cn(
                'text-sm mt-2',
                theme === 'dark' ? 'text-slate-400' : 'text-slate-500',
              )}
            >
              {content.subtitle}
            </p>
          </div>

          <div
            className={cn(
              'prose prose-sm max-w-none',
              theme === 'dark' ? 'prose-invert' : '',
            )}
          >
            <p
              className={cn(
                'text-sm leading-relaxed',
                theme === 'dark' ? 'text-slate-300' : 'text-slate-700',
              )}
            >
              {content.intro}
            </p>

            {content.sections.map((section, idx) => (
              <div key={idx} className="mt-8">
                <h2
                  className={cn(
                    'text-lg font-bold mb-3',
                    theme === 'dark' ? 'text-white' : 'text-slate-900',
                  )}
                >
                  {section.heading}
                </h2>
                <div
                  className={cn(
                    'text-sm leading-relaxed space-y-1.5',
                    theme === 'dark' ? 'text-slate-300' : 'text-slate-700',
                  )}
                >
                  {section.paragraphs.map((p, pIdx) => (
                    <p key={pIdx}>{p}</p>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Mobile back button */}
          <div className="mt-12 sm:hidden">
            <a
              href="/"
              className={cn(
                'flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-medium',
                theme === 'dark'
                  ? 'bg-slate-800/60 text-slate-300 hover:bg-slate-800'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200',
              )}
            >
              <ArrowLeft className="w-4 h-4" />
              {content.backHome}
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}
