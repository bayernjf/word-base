import { Word, VocabularyBook, Story, PracticeQuiz, AIModel } from './types';

export const initialVocabularyBooks: VocabularyBook[] = [
  {
    id: 'inbox',
    name: 'Inbox (插件同步)',
    description: 'Words synced from browser extension.',
    wordCount: 0,
    icon: 'Download',
    progress: 0
  },
  {
    id: 'biz-eng',
    name: 'Business English (商务英语核心)',
    description: 'Master negotiation, presentation, and collaboration terminology.',
    wordCount: 120,
    icon: 'Briefcase',
    progress: 68
  },
  {
    id: 'toefl-core',
    name: 'TOEFL Academic Core (托福高频)',
    description: 'High-frequency academic vocabulary for humanities and sciences.',
    wordCount: 350,
    icon: 'GraduationCap',
    progress: 42
  },
  {
    id: 'daily-life',
    name: 'Daily Conversational (日常口语)',
    description: 'Practical idioms and casual phrasing for travel and lifestyle.',
    wordCount: 88,
    icon: 'MessageSquare',
    progress: 95
  }
];

export const initialWords: Word[] = [
  {
    id: 'w1',
    word: 'negotiate',
    phonetic: '/nɪˈɡəʊʃɪeɪt/',
    partOfSpeech: 'verb',
    definition: 'To try to reach an agreement or compromise by discussion with others.',
    chineseTranslation: '谈判，协商，打交道',
    synonyms: ['bargain', 'mediate', 'discuss', 'settle'],
    bookId: 'biz-eng',
    level: 'B2',
    familiarity: 78,
    examples: [
      {
        en: 'We need to negotiate a new contract with our main supplier.',
        zh: '我们需要与主要供应商谈判并签署一份新合同。'
      },
      {
        en: 'She was able to negotiate a better salary during her interview.',
        zh: '在面试中，她成功争取到了更高的薪资。'
      }
    ],
    usageHistory: [
      {
        context: 'He managed to negotiate a highly profitable licensing agreement with the holding company.',
        translation: '他顺利地与控股公司达成了一项利润丰厚的特许权协议。',
        source: 'Business Review Daily'
      },
      {
        context: 'Negotiating multiple conflict points concurrently is tricky.',
        translation: '同时协商多个冲突点是非常棘手的。',
        source: 'Corporate Seminar 2026'
      }
    ]
  },
  {
    id: 'w2',
    word: 'synergize',
    phonetic: '/ˈsɪn.ə.dʒaɪz/',
    partOfSpeech: 'verb',
    definition: 'To combine or work together to create an effect greater than the sum of individual efforts.',
    chineseTranslation: '协同，发挥增效作用，整合',
    synonyms: ['collaborate', 'cooperate', 'unite', 'harmonize'],
    bookId: 'biz-eng',
    level: 'C1',
    familiarity: 45,
    examples: [
      {
        en: 'The cross-departmental teams must synergize to finish the launch on time.',
        zh: '跨部门团队必须协同作战，以确保按时完成发布。'
      },
      {
        en: 'Our goal is to synergize technological innovation with marketing power.',
        zh: '我们的目标是将技术创新与营销力量有机结合起来，实现增效。'
      }
    ],
    usageHistory: [
      {
        context: 'Merging these two firms should allow us to synergize operations and cut cost.',
        translation: '合并这两家公司应能使我们在运营上产生协同效应并削减成本。',
        source: 'Investors Outlook'
      }
    ]
  },
  {
    id: 'w3',
    word: 'leverage',
    phonetic: '/ˈliːvərɪdʒ/',
    partOfSpeech: 'verb',
    definition: 'To use something to maximum advantage; to use resource efficiently.',
    chineseTranslation: '杠杆，充分利用，凭借',
    synonyms: ['exploit', 'utilize', 'capitalize', 'make use of'],
    bookId: 'biz-eng',
    level: 'B2',
    familiarity: 92,
    examples: [
      {
        en: 'We should leverage our customer base to boost sales of the new service.',
        zh: '我们应该利用我们的客户群来促进新服务的销售。'
      }
    ],
    usageHistory: [
      {
        context: 'By leveraging cloud technology, they scaled their service instantly.',
        translation: '通过利用云技术，他们实现了服务的即时扩容。',
        source: 'Tech Insider'
      }
    ]
  },
  {
    id: 'w4',
    word: 'pivot',
    phonetic: '/ˈpɪvət/',
    partOfSpeech: 'verb/noun',
    definition: 'To shift strategy or direction quickly, often in response to user feedback or market changes.',
    chineseTranslation: '转向，中心，以...为支点',
    synonyms: ['veer', 'rotate', 'reorient', 'swerve'],
    bookId: 'biz-eng',
    level: 'B1',
    familiarity: 62,
    examples: [
      {
        en: 'The startup had to pivot to a software-as-a-service model after failure.',
        zh: '在遭遇失败后，这家创业企业不得不骤然转向软件即服务模式。'
      }
    ],
    usageHistory: [
      {
        context: 'A sudden market entry forced a strategy pivot.',
        translation: '一项突如其来的市场准入逼迫了战略调整。',
        source: 'Wall Street Analysis'
      }
    ]
  },
  {
    id: 'w5',
    word: 'bandwidth',
    phonetic: '/ˈbændwɪdθ/',
    partOfSpeech: 'noun',
    definition: 'The capacity for data transfer, or in a business context, the personal cognitive capacity to take on more work.',
    chineseTranslation: '带宽，精力/时间裕量，生产力限度',
    synonyms: ['capacity', 'time', 'availability', 'capability'],
    bookId: 'biz-eng',
    level: 'C2',
    familiarity: 34,
    examples: [
      {
        en: 'I do not have the bandwidth to take on a second major project this quarter.',
        zh: '本季度我实在没有精力去承接第二个重大项目了。'
      }
    ],
    usageHistory: [
      {
        context: 'The engineering crew lacks the mental bandwidth to digest these alterations.',
        translation: '工程团队缺乏足够的心理精力和时间来消化这些变更。',
        source: 'Sprint Management Logs'
      }
    ]
  }
];

export const initialStories: Story[] = [
  {
    id: 's1',
    title: 'The Annual Boardroom Showdown (年度董事会对决)',
    category: 'Interactive Business English',
    difficulty: 'Intermediate (B2)',
    contentEn: 'Today, the board convened to negotiate our next strategic cycle. The CEO suggested that we leverage our legacy customer database and synergize with the newly acquired AI subsidiary. When some members voiced concern about mental bandwidth, the CTO proposed a structural pivot that could automate customer onboarding instead.',
    contentZh: '今天，董事会召开会议协商我们的下一个战略周期。首席执行官提议我们充分利用传统客户数据库，并与新收购的人工智能子公司协同作战。当一些成员表达对精力负荷的担忧时，首席技术官提出了一项结构性的转变方案，可以直接自动化客户入职流程。',
    sentences: [
      {
        en: 'Today, the board convened to negotiate our next strategic cycle.',
        zh: '今天，董事会召开会议协商我们的下一个战略周期。',
        words: ['Today', 'the', 'board', 'convened', 'to', 'negotiate', 'our', 'next', 'strategic', 'cycle']
      },
      {
        en: 'The CEO suggested that we leverage our legacy customer database and synergize with the newly acquired AI subsidiary.',
        zh: '首席执行官提议我们充分利用传统客户数据库，并与新收购的人工智能子公司协同作战。',
        words: ['The', 'CEO', 'suggested', 'that', 'we', 'leverage', 'our', 'legacy', 'customer', 'database', 'and', 'synergize', 'with', 'the', 'newly', 'acquired', 'AI', 'subsidiary']
      },
      {
        en: 'When some members voiced concern about mental bandwidth, the CTO proposed a structural pivot instead.',
        zh: '当一些成员表达对注意力负荷的担忧时，首席技术官提出了一项结构性的转变方案。',
        words: ['When', 'some', 'members', 'voiced', 'concern', 'about', 'mental', 'bandwidth', 'the', 'CTO', 'proposed', 'a', 'structural', 'pivot', 'instead']
      }
    ],
    highlightedWords: ['negotiate', 'leverage', 'synergize', 'bandwidth', 'pivot'],
    grammarInsight: 'The subjunctive construction is elegantly implied in "The CEO suggested that we leverage" (suggest + that + subject + base verb), a classic test point in TOEFL/Business writing.'
  }
];

export const listeningQuizzes: PracticeQuiz[] = [
  {
    question: 'According to the speaker, what is the main risk of failing to synergize?',
    options: [
      'Increased market share of competitors',
      'Duplication of efforts and siloed, low-impact product development',
      'Sudden resignation of executive boards',
      'Inefficient cloud storage billing spikes'
    ],
    correctIndex: 1,
    explanation: 'The speaker emphasizes that without synergistic integration, departments operate in isolated silos, reproducing redundant materials.'
  },
  {
    question: 'What is meant by "having enough bandwidth" in common team workspaces?',
    options: [
      'Deploying a high-speed fiber internet subscription',
      'Having the mental availability and schedule capacity to handle additional tasks',
      'Having a larger count of processors in the server cluster',
      'The ability of a team member to speak multiple languages'
    ],
    correctIndex: 1,
    explanation: 'In slang business terminology, "bandwidth" acts as a metaphor for cognitive storage, focus slots, or literal hours left in the week.'
  }
];

export const mockDefaultModels: AIModel[] = [
  {
    id: 'gpt-4',
    name: 'GPT-4 Turbo',
    provider: 'OpenAI',
    apiKey: 'sk-proj-••••••••••••••••3aB2',
    purpose: 'Translation & Advanced Essay Review',
    isActive: true
  },
  {
    id: 'claude-35',
    name: 'Claude 3.5 Sonnet',
    provider: 'Anthropic',
    apiKey: 'sk-ant-••••••••••••••••8XkL',
    purpose: 'Contextual Scenario Generation',
    isActive: false
  },
  {
    id: 'gemini-15',
    name: 'Gemini 1.5 Pro',
    provider: 'Google AI',
    apiKey: 'GEMINI_API_KEY (System Inject)',
    purpose: 'Conversational Voice & Fluency Grading',
    isActive: false
  }
];
