import React, { useState, useRef, useEffect } from 'react';
import { Award, Sparkles, Send } from 'lucide-react';
import { Word, Story, ChatMessage } from '../../../types';
import { ThemeClasses } from '../../ThemeStyles';

interface StudyScenarioProps {
  themeStyles: ThemeClasses;
  stories: Story[];
  words: Word[];
}

export const StudyScenarioView: React.FC<StudyScenarioProps> = ({ themeStyles, stories, words }) => {
  const [selectedWord, setSelectedWord] = useState<Word | null>(null);
  const [chats, setChats] = useState<ChatMessage[]>([
    { id: '1', sender: 'ai', text: 'Hello! I am your WordBase English Tutor. Click on any highlighted word in the story to view translations, synonyms, or grammar structure. Or feel free to query me about idioms in this passage!', timestamp: '09:05 AM' }
  ]);
  const [message, setMessage] = useState('');
  const [showChinese, setShowChinese] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  const activeStory = stories[0];

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

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    const userMsg: ChatMessage = {
      id: String(Date.now()),
      sender: 'user',
      text: message,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    
    setChats(prev => [...prev, userMsg]);
    setMessage('');

    // Responsive AI tutor simulator
    setTimeout(() => {
      let replyText = `That is an excellent point! In Business contexts, we generally prefer integrating nouns with action verbs of motion. Is there a specific sentence in "${activeStory.title}" that you want me to breakdown grammatically?`;
      if (message.toLowerCase().includes('pivot')) {
        replyText = `"Pivot" in startup culture is typically used as a verb indicating a rapid directional adjustment. However, we also use it as a noun: e.g. "We executed a structural pivot last winter".`;
      } else if (message.toLowerCase().includes('negotiate')) {
        replyText = `Excellent! "Negotiate" derives from Latin roots meaning "un-leisure" (work/business). Pro-tip: negotiate is always accompanied by with/for: "negotiate with clients for better terms".`;
      } else if (message.toLowerCase().includes('leverage')) {
        replyText = `While engineering circles use "leverage" mechanically, in corporative strategies it carries high persuasion weight as an optimizer verb, meaning maximizing existing investments!`;
      }
      
      setChats(prev => [
        ...prev,
        {
          id: String(Date.now() + 1),
          sender: 'ai',
          text: replyText,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    }, 1000);
  };

  return (
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
                    className={`${isHighlight ? `${themeStyles.accentText} cursor-pointer hover:underline font-semibold bg-indigo-500/10 px-1 py-0.5 rounded-sm inline-block mx-0.5` : 'hover:bg-slate-200/50 dark:hover:bg-white/5 cursor-pointer rounded-xs px-0.5 inline-block'}`}
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
          <div ref={chatBottomRef} />
        </div>

        {/* Footer Chat Submit form */}
        <form onSubmit={handleSendMessage} className="mt-3 pt-2 border-t border-slate-200 dark:border-white/10 flex items-center space-x-2">
          <input 
            type="text" 
            placeholder="Query about pivot, definitions..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="flex-1 px-3 py-2 bg-slate-100 dark:bg-white/5 border border-neutral-300 dark:border-white/10 rounded-xl text-xs focus:ring-0 focus:outline-hidden"
          />
          <button 
            type="submit" 
            className="p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-all cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
};
