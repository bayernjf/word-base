import { Word, VocabularyBook, Story, PracticeQuiz, AIModel } from './types';

export const initialVocabularyBooks: VocabularyBook[] = [
  {
    id: 'default',
    userId: '',
    name: '默认',
    description: '用于存放单词的默认单词本',
    wordCount: 5,
    icon: 'BookOpen',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    isSync: true
  },
  {
    id: 'business',
    userId: '',
    name: '商务英语',
    description: '商务场景常用词汇',
    wordCount: 0,
    icon: 'BookOpen',
    createdAt: Date.now() - 86400000,
    updatedAt: Date.now() - 86400000,
    isSync: false
  }
];

const now = Date.now();
const day = 86400000;

export const initialWords: Word[] = [
  {
    id: 'w1',
    word: 'negotiate',
    frequency: 2,
    translation: '协商，谈判',
    timeAdded: now - 7 * day,
    timeUpdated: now - 2 * day,
    contexts: [
      {
        context: 'We need to negotiate the contract terms before signing.',
        timeAdded: now - 6 * day,
        sourceLink: 'https://example.com/business-contracts',
        translation: '我们需要在签约前协商合同条款。'
      },
      {
        context: 'The two companies are negotiating a merger.',
        timeAdded: now - 3 * day,
        translation: '两家公司正在谈判合并事宜。'
      }
    ],
    bookId: 'default'
  },
  {
    id: 'w2',
    word: 'leverage',
    frequency: 1,
    translation: '利用，杠杆作用',
    timeAdded: now - 6 * day,
    timeUpdated: now - 1 * day,
    contexts: [
      {
        context: 'We can leverage our existing resources to expand.',
        timeAdded: now - 5 * day,
        sourceLink: 'https://example.com/strategy',
        translation: '我们可以利用现有资源进行扩张。'
      }
    ],
    bookId: 'default'
  },
  {
    id: 'w3',
    word: 'synergize',
    frequency: 1,
    translation: '协同，协作',
    timeAdded: now - 5 * day,
    timeUpdated: now - 5 * day,
    contexts: [
      {
        context: 'The teams need to synergize to achieve our goals.',
        timeAdded: now - 5 * day,
        translation: '团队需要协同合作以实现我们的目标。'
      }
    ],
    bookId: 'default'
  },
  {
    id: 'w4',
    word: 'bandwidth',
    frequency: 1,
    translation: '带宽，精力',
    timeAdded: now - 4 * day,
    timeUpdated: now - 4 * day,
    contexts: [
      {
        context: 'I don\'t have the bandwidth for another project right now.',
        timeAdded: now - 4 * day,
        translation: '我现在没有精力再做另一个项目了。'
      }
    ],
    bookId: 'default'
  },
  {
    id: 'w5',
    word: 'pivot',
    frequency: 1,
    translation: '转向，关键',
    timeAdded: now - 3 * day,
    timeUpdated: now - 3 * day,
    contexts: [
      {
        context: 'The startup decided to pivot to a new business model.',
        timeAdded: now - 3 * day,
        sourceLink: 'https://example.com/startup-stories',
        translation: '这家初创公司决定转向新的商业模式。'
      }
    ],
    bookId: 'default'
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
    apiKey: 'your-gemini-api-key-here',
    purpose: 'Conversational Voice & Fluency Grading',
    isActive: false
  }
];
