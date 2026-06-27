import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Award, Sparkles, Send, Plus, Trash2, Loader2, Check } from 'lucide-react';
import { Word, Story, ChatMessage, AppLanguage } from '../../../types';
import { ThemeClasses } from '../../ThemeStyles';
import { createTranslator } from '../../../i18n';
import { getDueWords } from '../../../lib/srs';
import { requestTutorChat, type StoryGenerateRequest } from '../../../lib/aiEnrich';

const MAX_SELECTED_WORDS = 8;

interface StudyScenarioProps {
  themeStyles: ThemeClasses;
  language: AppLanguage;
  stories: Story[];
  words: Word[];
  isGenerating?: boolean;
  hasActiveModel?: boolean;
  accessToken?: string;
  onGenerateStory?: (input: StoryGenerateRequest) => Promise<Story>;
  onDeleteStory?: (storyId: string) => void;
}

export const StudyScenarioView: React.FC<StudyScenarioProps> = ({ themeStyles, language, stories, words, isGenerating = false, hasActiveModel = false, accessToken, onGenerateStory, onDeleteStory }) => {
  const t = createTranslator(language);
  const isGlass = themeStyles.name === 'glass';
  const [selectedWord, setSelectedWord] = useState<Word | null>(null);
  const [activeStoryId, setActiveStoryId] = useState<string | null>(null);
  const [showGenerate, setShowGenerate] = useState(false);
  const [genMode, setGenMode] = useState<'topic' | 'wordbook'>('topic');
  const [topic, setTopic] = useState('');
  const [difficulty, setDifficulty] = useState('B2');
  const [selectedWordIds, setSelectedWordIds] = useState<string[]>([]);
  const [wordSearch, setWordSearch] = useState('');
  const [genError, setGenError] = useState<string | null>(null);
  const [chats, setChats] = useState<ChatMessage[]>([
    { id: '1', sender: 'ai', text: 'Hello! I am your WordBase English Tutor. Click on any highlighted word in the story to view translations, synonyms, or grammar structure. Or feel free to query me about idioms in this passage!', timestamp: '09:05 AM' }
  ]);
  const [message, setMessage] = useState('');
  const [showChinese, setShowChinese] = useState(false);
  const [tutorThinking, setTutorThinking] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // 当前选中的故事：优先用户选择，否则取列表第一篇
  const activeStory = stories.find(s => s.id === activeStoryId) || stories[0] || null;

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chats]);

  const handleWordClick = (wordSpelling: string) => {
    const cleanWord = wordSpelling.replace(/[,.()]/g, '').toLowerCase();
    const match = words.find(w => w.word.toLowerCase() === cleanWord);
    if (match) {
      setSelectedWord(match);
      // Auto tutor comment
      setChats(prev => [
        ...prev,
        {
          id: String(Date.now()),
          sender: 'ai',
          text: `🔍 Loaded vocabulary profile for "${match.word}": It means "${match.chineseTranslation}" (${match.partOfSpeech}). Core concept: ${match.definition}. Here is a synonym: ${match.synonyms[0] || 'N/A'}.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } else {
      // simulated translate tooltip
      setSelectedWord({
        id: 'temp',
        word: cleanWord,
        phonetic: '/.../',
        partOfSpeech: 'lexical unit',
        definition: 'Interactive word clicked from scene context.',
        chineseTranslation: '上下文交互式点击词汇',
        synonyms: [],
        examples: [],
        usageHistory: [],
        level: 'B2',
        familiarity: 50,
        bookId: ''
      });
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = message.trim();
    if (!text || tutorThinking) return;
    const userMsg: ChatMessage = {
      id: String(Date.now()),
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setChats(prev => [...prev, userMsg]);
    setMessage('');

    if (!accessToken) {
      setChats(prev => [...prev, {
        id: String(Date.now() + 1),
        sender: 'ai',
        text: language === 'en' ? 'Please sign in again to use the AI tutor.' : '请重新登录后再使用 AI 导师。',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
      return;
    }

    setTutorThinking(true);
    try {
      const reply = await requestTutorChat(
        {
          story: activeStory ? { title: activeStory.title, contentEn: activeStory.contentEn } : undefined,
          history: chats.slice(-6),
          message: text,
        },
        accessToken
      );
      setChats(prev => [...prev, {
        id: String(Date.now() + 1),
        sender: 'ai',
        text: reply || (language === 'en' ? 'Could you rephrase your question?' : '可以换个说法再问一次吗？'),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
    } catch {
      setChats(prev => [...prev, {
        id: String(Date.now() + 1),
        sender: 'ai',
        text: language === 'en' ? 'The tutor is unavailable right now. Please try again later.' : 'AI 导师暂时不可用，请稍后再试。',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
    } finally {
      setTutorThinking(false);
    }
  };

  // 智能挑选：优先到期复习词，再补低熟悉度词，最多 8 个
  const smartPick = (): Word[] => {
    const due = getDueWords(words);
    const dueIds = new Set(due.map(w => w.id));
    const rest = words
      .filter(w => !dueIds.has(w.id))
      .sort((a, b) => (a.familiarity ?? 0) - (b.familiarity ?? 0));
    return [...due, ...rest].slice(0, MAX_SELECTED_WORDS);
  };

  const applySmartPick = () => {
    setSelectedWordIds(smartPick().map(w => w.id));
  };

  const toggleWord = (id: string) => {
    setSelectedWordIds(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id);
      if (prev.length >= MAX_SELECTED_WORDS) return prev; // 达上限不再加
      return [...prev, id];
    });
  };

  const filteredWords = useMemo(() => {
    const q = wordSearch.trim().toLowerCase();
    const list = q ? words.filter(w => w.word.toLowerCase().includes(q)) : words;
    return list.slice(0, 100);
  }, [words, wordSearch]);

  const handleGenerate = async () => {
    if (!onGenerateStory || isGenerating) return;
    setGenError(null);

    if (genMode === 'wordbook') {
      const chosen = words.filter(w => selectedWordIds.includes(w.id));
      if (chosen.length === 0) {
        setGenError(language === 'en' ? 'Please select at least one word.' : '请至少选择一个生词。');
        return;
      }
      try {
        const created = await onGenerateStory({
          difficulty,
          words: chosen.map(w => w.word),
          sourceWordIds: chosen.map(w => w.id),
        });
        setActiveStoryId(created.id);
        setShowGenerate(false);
        setSelectedWordIds([]);
        setWordSearch('');
      } catch (err) {
        handleGenError(err);
      }
      return;
    }

    try {
      const created = await onGenerateStory({
        topic: topic.trim() || undefined,
        difficulty,
      });
      setActiveStoryId(created.id);
      setShowGenerate(false);
      setTopic('');
    } catch (err) {
      handleGenError(err);
    }
  };

  const handleGenError = (err: unknown) => {
    const code = err instanceof Error ? err.message : 'ai_story_generate_failed';
    setGenError(
      code === 'story_daily_limit_reached'
        ? (language === 'en' ? 'Daily generation limit reached. Try again tomorrow.' : '今日生成次数已达上限，请明天再来。')
        : code === 'ai_key_not_configured'
          ? (language === 'en' ? 'No AI model configured.' : '尚未配置 AI 模型。')
          : (language === 'en' ? `Generation failed: ${code}` : `生成失败：${code}`)
    );
  };

  return (
    <div className="space-y-6">
      {/* Toolbar: story library + generate */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          {stories.map(s => (
            <button
              key={s.id}
              onClick={() => setActiveStoryId(s.id)}
              className={`group flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors cursor-pointer ${
                activeStory?.id === s.id
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : `${themeStyles.textSecondary} border-neutral-300/50 hover:bg-indigo-500/10`
              }`}
            >
              <span className="max-w-[160px] truncate">{s.title || t('stories.untitled')}</span>
              {onDeleteStory && (
                <Trash2
                  className="w-3 h-3 opacity-0 group-hover:opacity-70 hover:opacity-100"
                  onClick={(e) => { e.stopPropagation(); onDeleteStory(s.id); }}
                />
              )}
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowGenerate(v => !v)}
          disabled={!hasActiveModel}
          title={!hasActiveModel ? t('stories.noModel') : ''}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{t('stories.generate')}</span>
        </button>
      </div>

      {/* Generate panel */}
      {showGenerate && (
        <div className={`${themeStyles.card} space-y-3`}>
          <h3 className={`text-sm font-bold ${themeStyles.textPrimary}`}>{t('stories.generateTitle')}</h3>

          {/* Mode tabs */}
          <div className="inline-flex rounded-xl border border-neutral-300/50 dark:border-white/10 p-0.5 text-xs">
            {(['topic', 'wordbook'] as const).map(m => (
              <button
                key={m}
                onClick={() => setGenMode(m)}
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                  genMode === m ? 'bg-indigo-600 text-white' : themeStyles.textSecondary
                }`}
              >
                {m === 'topic' ? t('stories.modeTopic') : t('stories.modeWordbook')}
              </button>
            ))}
          </div>

          {genMode === 'topic' ? (
            <div className="flex gap-3 flex-wrap">
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder={t('stories.topicPlaceholder')}
                className="flex-1 min-w-[200px] px-3 py-2 bg-slate-100 dark:bg-white/5 border border-neutral-300 dark:border-white/10 rounded-xl text-xs focus:ring-0 focus:outline-hidden"
              />
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
                className="px-3 py-2 bg-slate-100 dark:bg-white/5 border border-neutral-300 dark:border-white/10 rounded-xl text-xs cursor-pointer"
              >
                {['A2', 'B1', 'B2', 'C1', 'C2'].map(l => <option key={l} value={l}>{l}</option>)}
              </select>
              <button
                onClick={() => void handleGenerate()}
                disabled={isGenerating}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isGenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                <span>{isGenerating ? t('stories.generating') : t('stories.generateConfirm')}</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {words.length === 0 ? (
                <p className={`text-xs ${themeStyles.textSecondary}`}>{t('stories.noWords')}</p>
              ) : (
                <>
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={applySmartPick}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-indigo-400/40 text-indigo-500 hover:bg-indigo-500/10 text-xs font-medium transition-colors cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{t('stories.smartPick')}</span>
                    </button>
                    <span className={`text-[10px] font-mono ${themeStyles.textSecondary}`}>
                      {t('stories.selectedCount', { count: selectedWordIds.length, max: MAX_SELECTED_WORDS })}
                    </span>
                    <input
                      type="text"
                      value={wordSearch}
                      onChange={(e) => setWordSearch(e.target.value)}
                      placeholder={t('stories.searchWords')}
                      className="flex-1 min-w-[140px] px-3 py-1.5 bg-slate-100 dark:bg-white/5 border border-neutral-300 dark:border-white/10 rounded-lg text-xs focus:ring-0 focus:outline-hidden"
                    />
                  </div>

                  <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto p-0.5">
                    {filteredWords.map(w => {
                      const selected = selectedWordIds.includes(w.id);
                      const atLimit = !selected && selectedWordIds.length >= MAX_SELECTED_WORDS;
                      return (
                        <button
                          key={w.id}
                          onClick={() => toggleWord(w.id)}
                          disabled={atLimit}
                          className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs border transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                            selected
                              ? 'bg-indigo-600 text-white border-indigo-600'
                              : `${themeStyles.textSecondary} border-neutral-300/50 hover:bg-indigo-500/10`
                          }`}
                        >
                          {selected && <Check className="w-3 h-3" />}
                          <span>{w.word}</span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex gap-3 flex-wrap items-center">
                    <select
                      value={difficulty}
                      onChange={(e) => setDifficulty(e.target.value)}
                      className="px-3 py-2 bg-slate-100 dark:bg-white/5 border border-neutral-300 dark:border-white/10 rounded-xl text-xs cursor-pointer"
                    >
                      {['A2', 'B1', 'B2', 'C1', 'C2'].map(l => <option key={l} value={l}>{l}</option>)}
                    </select>
                    <button
                      onClick={() => void handleGenerate()}
                      disabled={isGenerating || selectedWordIds.length === 0}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {isGenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                      <span>{isGenerating ? t('stories.generating') : t('stories.generateConfirm')}</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
          {genError && <p className="text-xs text-rose-500">{genError}</p>}
        </div>
      )}

      {!activeStory ? (
        <div className={`${themeStyles.card} text-center py-16`}>
          <Sparkles className="w-10 h-10 mx-auto mb-3 text-indigo-500/60" />
          <p className={`text-sm ${themeStyles.textSecondary}`}>{t('stories.emptyHint')}</p>
        </div>
      ) : (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Narrative block */}
        <div className="lg:col-span-2 space-y-6">
          <div className={`${themeStyles.card} relative overflow-hidden`}>
          <div className="absolute top-0 right-0 p-3 bg-indigo-500/10 text-indigo-600 rounded-bl-xl text-[10px] font-mono tracking-widest uppercase">
            AI STORY STUDY
          </div>
          
          <h2 className={`text-xl font-extrabold pr-20 ${themeStyles.textPrimary}`}>
            {activeStory.title}
          </h2>
          <p className="text-xs text-neutral-400 mt-1 flex items-center space-x-2">
            <span>Category: {activeStory.category}</span>
            <span>•</span>
            <span className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded text-[10px] uppercase font-bold">{activeStory.difficulty}</span>
          </p>

          <div className="mt-6 p-4 rounded-xl relative leading-relaxed font-serif text-sm border border-neutral-300/40 bg-zinc-500/5 select-text shadow-inner">
            <p className="inline">
              {activeStory.contentEn.split(' ').map((word, i) => {
                const norm = word.replace(/[,.()]/g, '').toLowerCase();
                const isHighlight = activeStory.highlightedWords.includes(norm);
                return (
                  <span 
                    key={i} 
                    onClick={() => handleWordClick(word)}
                    className={`${isHighlight ? `${isGlass ? 'text-indigo-300' : 'text-[#2f805d]'} cursor-pointer font-semibold bg-indigo-500/10 px-1 py-0.5 rounded-sm inline-block mx-0.5` : 'hover:bg-slate-200/50 dark:hover:bg-white/5 cursor-pointer rounded-xs px-0.5 inline-block'}`}
                  >
                    {word}{' '}
                  </span>
                );
              })}
            </p>

            {/* Translation block */}
            <div className="mt-6 pt-4 border-t border-neutral-300/40">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[10px] font-mono uppercase text-neutral-400 tracking-wider">
                  Full Passage Translation
                </span>
                <button 
                  onClick={() => setShowChinese(!showChinese)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white dark:bg-indigo-500/15 py-1 px-3 text-[10px] font-bold uppercase rounded-md transition-all cursor-pointer"
                >
                  {showChinese ? 'Hide Chinese Translation' : 'Reveal Chinese Translation'}
                </button>
              </div>

              {showChinese && (
                <p className="text-xs font-sans text-neutral-600 leading-relaxed transition-opacity animate-fade-in">
                  {activeStory.contentZh}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Selected Dictionary Glossary Popups */}
        {selectedWord && (
          <div className={`${themeStyles.card} border-l-4 border-indigo-500 transition-transform`}>
            <div className="flex justify-between items-start mb-2">
              <div>
                <h3 className="text-lg font-bold flex items-center space-x-2">
                  <span>{selectedWord.word}</span>
                  <span className="bg-slate-100 dark:bg-white/10 px-2 py-0.5 text-[10px] rounded uppercase font-bold">{selectedWord.partOfSpeech}</span>
                </h3>
                <p className="text-xs text-neutral-400 font-mono">{selectedWord.phonetic}</p>
              </div>
              <button 
                onClick={() => setSelectedWord(null)}
                className="text-xs bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 p-1 rounded-sm"
              >
                Close
              </button>
            </div>
            
            <p className="text-xs mt-2"><strong className="text-neutral-500 uppercase tracking-widest text-[9px] block">Definition:</strong> {selectedWord.definition}</p>
            <p className="text-xs font-semibold text-indigo-650 dark:text-indigo-400 mt-1"><strong className="text-neutral-500 uppercase tracking-widest text-[9px] block">Translation:</strong> {selectedWord.chineseTranslation}</p>
            {selectedWord.synonyms.length > 0 && (
              <p className="text-xs mt-1"><strong>Synonyms:</strong> {selectedWord.synonyms.join(', ')}</p>
            )}
          </div>
        )}

        {/* Grammar Insight Card */}
        <div className={`${themeStyles.card}`}>
          <div className="flex items-center space-x-2 mb-2 text-indigo-600 dark:text-indigo-400">
            <Award className="w-5 h-5" />
            <h3 className={`text-sm font-semibold uppercase tracking-wider ${themeStyles.textPrimary}`}>
              Interactive Grammar Insight
            </h3>
          </div>
          <p className="text-xs leading-relaxed text-neutral-600">
            {activeStory.grammarInsight}
          </p>
        </div>
      </div>

      {/* Tutor Panel chat sidebar */}
      <div className={`${themeStyles.card} flex flex-col h-[550px] justify-between`}>
        <div className="flex items-center space-x-2 border-b border-slate-200 dark:border-white/10 pb-3 mb-2">
          <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <div>
            <h4 className={`text-sm font-bold ${themeStyles.textPrimary}`}>Tutor AI Chat Panel</h4>
            <span className="text-[10px] font-mono text-emerald-500 flex items-center space-x-1">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
              <span>AI Agent Online</span>
            </span>
          </div>
        </div>

        {/* Messaging Box Area */}
        <div className="flex-1 overflow-y-auto space-y-3 px-1 pr-2 scrollbar-thin scrollbar-thumb-rounded">
          {chats.map(c => (
            <div 
              key={c.id} 
              className={`max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed font-sans ${c.sender === 'user' ? 'bg-indigo-600 text-white rounded-br-none ml-auto' : 'bg-slate-100 dark:bg-white/5 rounded-bl-none border border-neutral-300/30'}`}
            >
              <p>{c.text}</p>
              <span className={`text-[8px] font-mono mt-1 block text-right ${c.sender === 'user' ? 'text-white/75' : 'text-neutral-400'}`}>
                {c.timestamp}
              </span>
            </div>
          ))}
          {tutorThinking && (
            <div className="max-w-[85%] rounded-2xl p-3 text-xs bg-slate-100 dark:bg-white/5 rounded-bl-none border border-neutral-300/30 flex items-center gap-2 text-neutral-400">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>{t('stories.tutorThinking')}</span>
            </div>
          )}
          <div ref={chatBottomRef} />
        </div>

        {/* Footer Chat Submit form */}
        <form onSubmit={handleSendMessage} className="mt-3 pt-2 border-t border-slate-200 dark:border-white/10 flex items-center space-x-2">
          <input 
            type="text" 
            placeholder={t('stories.chatPlaceholder')}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="flex-1 px-3 py-2 bg-slate-100 dark:bg-white/5 border border-neutral-300 dark:border-white/10 rounded-xl text-xs focus:ring-0 focus:outline-hidden"
          />
          <button 
            type="submit" 
            disabled={tutorThinking}
            className="p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
      </div>
      )}
    </div>
  );
};
