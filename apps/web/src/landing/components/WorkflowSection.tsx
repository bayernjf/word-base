import { useState, useRef, useCallback, useEffect, type CSSProperties, type MouseEvent as ReactMouseEvent } from 'react';
import { MousePointer2, Cloud, Brain, ArrowRight, Plus, Volume2 } from 'lucide-react';
import type { LandingTheme } from '../Landing';
import { cn, themeVars } from '../theme';

interface Props {
  theme: LandingTheme;
}

const DEMO_PARAGRAPH = `The most important skill in programming is not knowing everything, but knowing how to learn effectively. When you encounter an unfamiliar concept, take a moment to understand it deeply rather than just memorizing syntax. Great developers build robust mental models that help them tackle novel problems with confidence.`;

interface DemoWord {
  word: string;
  pos: string;
  phonetic: string;
  meaning: string;
}

const DEMO_WORDS: DemoWord[] = [
  { word: 'programming', pos: 'n.', phonetic: '/ˈproʊɡræmɪŋ/', meaning: '编程；程序设计' },
  { word: 'unfamiliar', pos: 'adj.', phonetic: '/ˌʌnfəˈmɪliər/', meaning: '不熟悉的；陌生的' },
  { word: 'concept', pos: 'n.', phonetic: '/ˈkɑːnsept/', meaning: '概念；观念' },
  { word: 'robust', pos: 'adj.', phonetic: '/roʊˈbʌst/', meaning: '健壮的；稳固的' },
  { word: 'tackle', pos: 'v.', phonetic: '/ˈtækl/', meaning: '处理；解决' },
  { word: 'novel', pos: 'adj.', phonetic: '/ˈnɑːvl/', meaning: '新奇的；新颖的' },
];

const DEMO_WORDS_MAP = new Map(DEMO_WORDS.map((w) => [w.word, w]));

interface PopupState {
  word: DemoWord;
  x: number;
  y: number;
}

export function WorkflowSection({ theme }: Props) {
  const t = themeVars(theme);
  const [ctrlPressed, setCtrlPressed] = useState(false);
  const [popup, setPopup] = useState<PopupState | null>(null);
  const [activeWordEl, setActiveWordEl] = useState<HTMLElement | null>(null);
  const [collected, setCollected] = useState<string[]>([]);
  const [flyingWordKey, setFlyingWordKey] = useState<string | null>(null);
  const [flyTarget, setFlyTarget] = useState({ x: 0, y: 0 });
  const bookCardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      if (e.key === 'Control' || e.key === 'Meta') {
        e.preventDefault();
        setCtrlPressed(true);
      }
    };
    const onUp = (e: KeyboardEvent) => {
      if (e.key === 'Control' || e.key === 'Meta') {
        setCtrlPressed(false);
        setPopup(null);
        setActiveWordEl(null);
      }
    };
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
    };
  }, []);

  const handleWordHover = useCallback(
    (e: ReactMouseEvent<HTMLSpanElement>, word: DemoWord) => {
      if (!ctrlPressed) return;
      const rect = e.currentTarget.getBoundingClientRect();
      setPopup({ word, x: rect.left + rect.width / 2, y: rect.bottom + 10 });
      setActiveWordEl(e.currentTarget);
    },
    [ctrlPressed],
  );

  const doCollect = useCallback(
    (wordKey: string, el: HTMLElement | null) => {
      if (collected.includes(wordKey)) return;
      if (el && bookCardRef.current) {
        const wordRect = el.getBoundingClientRect();
        const targetRect = bookCardRef.current.getBoundingClientRect();
        setFlyTarget({
          x: targetRect.left + targetRect.width / 2 - wordRect.left - wordRect.width / 2,
          y: targetRect.top - wordRect.top + 20,
        });
        setFlyingWordKey(wordKey);
        setTimeout(() => {
          setFlyingWordKey(null);
          setCollected((prev) => (prev.includes(wordKey) ? prev : [...prev, wordKey]));
          setPopup(null);
        }, 700);
      } else {
        setCollected((prev) => (prev.includes(wordKey) ? prev : [...prev, wordKey]));
        setPopup(null);
      }
    },
    [collected],
  );

  const steps = [
    {
      icon: <MousePointer2 className="w-5 h-5" />,
      color: '#818cf8',
      step: '01',
      title: '采集',
      desc: '浏览英文网页时按住 Ctrl/Cmd 悬停单词，即时弹出翻译释义',
    },
    {
      icon: <Cloud className="w-5 h-5" />,
      color: '#c084fc',
      step: '02',
      title: '同步',
      desc: '点击收藏自动同步到云端，所有设备实时更新，永不丢失',
    },
    {
      icon: <Brain className="w-5 h-5" />,
      color: '#e879f9',
      step: '03',
      title: '学习',
      desc: '在 Web/桌面/手机上通过 AI 故事、语境练习、SRS 复习掌握词汇',
    },
  ];

  const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);
  const modKey = isMac ? '⌘ Cmd' : 'Ctrl';

  return (
    <section id="workflow" className={cn('px-4 sm:px-6 py-20 sm:py-28')}>
      <div className="max-w-6xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-16">
          <div
            className={cn(
              'inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium mb-4',
              theme === 'dark' ? 'bg-indigo-500/10 text-indigo-300' : 'bg-indigo-500/10 text-indigo-600',
            )}
          >
            <ArrowRight className="w-3.5 h-3.5" />
            三步工作流
          </div>
          <h2 className={cn('text-3xl sm:text-4xl font-bold tracking-tight', t.text)}>
            从遇到生词到真正掌握
          </h2>
          <p className={cn('mt-4 leading-relaxed', t.textMuted)}>
            浏览器即点即采，云端无缝同步，AI 驱动深度学习——词汇积累从未如此顺畅。
          </p>
        </div>

        {/* Step cards */}
        <div className="grid md:grid-cols-3 gap-4 mb-12">
          {steps.map((s, i) => (
            <div key={s.step} className="relative">
              <div
                className={cn(
                  'p-6 rounded-2xl border h-full transition-all',
                  t.cardBg,
                  t.border,
                  t.cardHover,
                )}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: s.color + '20', color: s.color }}
                  >
                    {s.icon}
                  </div>
                  <span className={cn('text-xs font-mono', t.textSubtle)}>{s.step}</span>
                </div>
                <h3 className={cn('text-lg font-semibold mb-2', t.text)}>{s.title}</h3>
                <p className={cn('text-sm leading-relaxed', t.textMuted)}>{s.desc}</p>
              </div>
              {i < steps.length - 1 && (
                <div className="hidden md:block absolute top-1/2 -right-3 z-10">
                  <ArrowRight
                    className={cn('w-5 h-5', theme === 'dark' ? 'text-slate-700' : 'text-slate-300')}
                  />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Interactive demo */}
        <div className={cn('rounded-2xl border p-5 sm:p-8', t.cardBg, t.border)}>
          <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
            {/* Left: paragraph */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-4">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-400/70" />
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-400/70" />
                  <div className="w-2.5 h-2.5 rounded-full bg-green-400/70" />
                </div>
                <span className={cn('text-xs ml-2', t.textSubtle)}>
                  {ctrlPressed ? '🔍 查词模式已开启 — 悬停带下划线的单词' : `按住 ${modKey} 键开始查词（点击单词也可收藏）`}
                </span>
              </div>
              <div
                className={cn(
                  'relative text-base leading-loose p-5 rounded-xl transition-colors select-text',
                  ctrlPressed
                    ? theme === 'dark'
                      ? 'bg-indigo-500/5 ring-1 ring-indigo-500/20'
                      : 'bg-indigo-50 ring-1 ring-indigo-200'
                    : t.cardSolid,
                )}
              >
                {DEMO_PARAGRAPH.split(' ').map((rawWord, i) => {
                  const cleanWord = rawWord.replace(/[.,!?;:]$/, '');
                  const punct = rawWord.slice(cleanWord.length);
                  const demoWord = DEMO_WORDS_MAP.get(cleanWord.toLowerCase());
                  const isCollected = collected.includes(cleanWord.toLowerCase());
                  const isFlying = flyingWordKey === cleanWord.toLowerCase();

                  return (
                    <span key={i}>
                      {demoWord ? (
                        <span
                          className={cn(
                            'relative inline-block cursor-pointer rounded px-0.5 -mx-0.5 transition-all',
                            ctrlPressed
                              ? theme === 'dark'
                                ? 'underline decoration-indigo-400/50 decoration-2 underline-offset-4 hover:bg-indigo-500/20 text-indigo-200'
                                : 'underline decoration-indigo-400/50 decoration-2 underline-offset-4 hover:bg-indigo-100 text-indigo-700'
                              : isCollected
                                ? theme === 'dark'
                                  ? 'text-emerald-400/70'
                                  : 'text-emerald-600/70'
                                : theme === 'dark'
                                  ? 'text-slate-200 hover:text-indigo-300'
                                  : 'text-slate-700 hover:text-indigo-600',
                            isFlying && 'landing-animate-fly',
                          )}
                          style={
                            isFlying
                              ? ({
                                  '--fly-x': `${flyTarget.x}px`,
                                  '--fly-y': `${flyTarget.y}px`,
                                } as CSSProperties)
                              : undefined
                          }
                          onMouseEnter={(e) => handleWordHover(e, demoWord)}
                          onMouseLeave={() => {
                            if (ctrlPressed) return;
                            setPopup(null);
                          }}
                          onClick={(e) => {
                            if (!isCollected) {
                              doCollect(demoWord.word, e.currentTarget);
                            }
                          }}
                        >
                          {cleanWord}
                        </span>
                      ) : (
                        <span className={t.textMuted}>{cleanWord}</span>
                      )}
                      {punct && <span className={t.textMuted}>{punct}</span>}
                      {i < DEMO_PARAGRAPH.split(' ').length - 1 ? ' ' : null}
                    </span>
                  );
                })}
              </div>
              <p className={cn('text-xs mt-3', t.textSubtle)}>
                💡 提示：按住 <kbd className={cn('px-1.5 py-0.5 rounded text-[10px] font-mono border', theme === 'dark' ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-600')}>{modKey.split(' ')[1] || modKey}</kbd> 键后悬停带下划线的单词查看释义，点击单词直接收藏
              </p>
            </div>

            {/* Right: word book */}
            <div
              ref={bookCardRef}
              className={cn('lg:w-64 shrink-0 rounded-xl border p-4', t.cardSolid, t.border)}
            >
              <div className="flex items-center justify-between mb-3">
                <h4 className={cn('text-sm font-semibold', t.text)}>📚 我的单词本</h4>
                <span className={cn('text-xs tabular-nums', t.textSubtle)}>
                  {collected.length} 词
                </span>
              </div>
              <div className="space-y-1.5 min-h-[120px]">
                {collected.length === 0 ? (
                  <p className={cn('text-xs text-center py-8 leading-relaxed', t.textSubtle)}>
                    还没有收藏单词
                    <br />
                    试试点击左侧带下划线的单词
                  </p>
                ) : (
                  collected.map((w) => {
                    const dw = DEMO_WORDS_MAP.get(w);
                    return (
                      <div
                        key={w}
                        className={cn(
                          'px-2.5 py-1.5 rounded-lg text-xs flex items-center gap-2 landing-animate-count-up',
                          theme === 'dark' ? 'bg-slate-800/50' : 'bg-white border border-slate-100',
                        )}
                      >
                        <span className={cn('font-medium truncate', t.text)}>{w}</span>
                        {dw && (
                          <span className={cn('truncate text-[10px]', t.textSubtle)}>
                            {dw.meaning}
                          </span>
                        )}
                        <span className={cn('ml-auto text-emerald-400 text-[10px] shrink-0')}>
                          已同步
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Popup */}
          {popup && (
            <div
              className="fixed z-50 pointer-events-none"
              style={{
                left: popup.x,
                top: popup.y,
                transform: 'translateX(-50%)',
              }}
            >
              <div
                className={cn(
                  'pointer-events-auto rounded-xl p-3 shadow-2xl border min-w-[220px] relative',
                  theme === 'dark' ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200',
                )}
              >
                <div
                  className={cn(
                    'absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rotate-45',
                    theme === 'dark'
                      ? 'bg-slate-900 border-l border-t border-slate-700'
                      : 'bg-white border-l border-t border-slate-200',
                  )}
                />
                <div className="flex items-center gap-2 mb-1">
                  <span className={cn('text-sm font-bold', t.text)}>{popup.word.word}</span>
                  <button
                    className={cn(
                      'p-0.5 rounded transition-colors',
                      theme === 'dark' ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500',
                    )}
                  >
                    <Volume2 className="w-3 h-3" />
                  </button>
                  <span
                    className={cn(
                      'text-[10px] px-1.5 py-0.5 rounded ml-auto',
                      theme === 'dark' ? 'bg-indigo-500/20 text-indigo-300' : 'bg-indigo-50 text-indigo-600',
                    )}
                  >
                    {popup.word.pos}
                  </span>
                </div>
                <p className={cn('text-[11px] mb-2 font-mono', t.textSubtle)}>{popup.word.phonetic}</p>
                <p className={cn('text-xs leading-relaxed mb-2.5', t.textMuted)}>{popup.word.meaning}</p>
                <button
                  onClick={() => doCollect(popup.word.word, activeWordEl)}
                  disabled={collected.includes(popup.word.word)}
                  className={cn(
                    'w-full flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-medium transition-all',
                    collected.includes(popup.word.word)
                      ? theme === 'dark'
                        ? 'bg-emerald-500/20 text-emerald-400 cursor-default'
                        : 'bg-emerald-50 text-emerald-600 cursor-default'
                      : 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white hover:opacity-90 active:scale-[0.98]',
                  )}
                >
                  {collected.includes(popup.word.word) ? (
                    <>✓ 已收藏</>
                  ) : (
                    <>
                      <Plus className="w-3 h-3" /> 收藏到单词本
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
