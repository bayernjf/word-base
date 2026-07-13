import React from 'react';
import { ChevronDown, ChevronUp, Languages, Save, Trash2, Sparkles, BrainCircuit, AlertCircle } from 'lucide-react';
import { AppLanguage, Word } from '../../../types';
import { ThemeClasses } from '../../ThemeStyles';
import { createTranslator } from '../../../i18n';
import { getFrequency, formatDateTime } from '../shared/helpers';
import { WordPhonetics } from '../shared/WordPhonetics';
import { EncounterCurve } from './EncounterCurve';

interface WordDetailCompactProps {
  themeStyles: ThemeClasses;
  language: AppLanguage;
  word: Word;
  contextTranslations: Record<number, string>;
  contextActionLoading: Record<number, 'translate' | 'save' | 'delete'>;
  expandedSections: Record<string, boolean>;
  aiEnrichError: string | null;
  deepExplainError: string | null;
  senseClusterError: string | null;
  senseClusterLoading: boolean;
  effectiveEnrichLoading: boolean;
  effectiveDeepExplainLoading: boolean;
  onToggleSection: (key: string) => void;
  onExpandAll: () => void;
  onCollapseAll: () => void;
  onAiEnrich: () => void;
  onDeepExplain: () => void;
  onSenseCluster: () => void;
  onTranslateContext: (index: number, text: string) => void;
  onSaveContextTranslation: (index: number) => void;
  onDeleteContextTranslation: (index: number) => void;
}

export const WordDetailCompact: React.FC<WordDetailCompactProps> = ({
  themeStyles, language, word,
  contextTranslations, contextActionLoading,
  expandedSections,
  aiEnrichError, deepExplainError, senseClusterError, senseClusterLoading,
  effectiveEnrichLoading, effectiveDeepExplainLoading,
  onToggleSection, onExpandAll, onCollapseAll,
  onAiEnrich, onDeepExplain, onSenseCluster,
  onTranslateContext, onSaveContextTranslation, onDeleteContextTranslation,
}) => {
  const t = createTranslator(language);
  const isGlass = themeStyles.name === 'glass';

  return (
    <div className={`${themeStyles.card} overflow-y-auto`} style={{ maxHeight: 'calc(100vh - 240px)' }}>
      <div className="p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className={`text-2xl font-extrabold tracking-tight ${themeStyles.textPrimary}`}>{word.word}</h2>
              {word.partOfSpeech && <span className="bg-indigo-500/10 px-2 py-0.5 text-indigo-600 dark:text-indigo-400 text-xs font-mono rounded-md uppercase font-semibold">{word.partOfSpeech}</span>}
              {word.level && <span className="bg-slate-100 dark:bg-white/10 px-2 py-0.5 text-neutral-500 text-xs font-mono rounded-md">{word.level}</span>}
            </div>
            <WordPhonetics word={word.word} fallbackPhonetic={word.phonetic} language={language} />
            <p className="text-lg font-bold text-indigo-650 dark:text-indigo-400 mt-1">{word.translation || word.chineseTranslation}</p>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button onClick={onAiEnrich} disabled={effectiveEnrichLoading}
              className={`p-2 rounded-lg border transition-colors cursor-pointer disabled:opacity-50 ${isGlass ? 'border-white/10 text-indigo-300 hover:bg-indigo-500/10' : 'border-[#bad8b7] text-[#2f805d] hover:bg-[#e1f0db]'}`}
              title={t('wordDetail.aiEnrich')}><Sparkles className={`w-4 h-4 ${effectiveEnrichLoading ? 'animate-pulse' : ''}`} /></button>
            <button onClick={onDeepExplain} disabled={effectiveDeepExplainLoading}
              className={`p-2 rounded-lg border transition-colors cursor-pointer disabled:opacity-50 ${isGlass ? 'border-white/10 text-indigo-300 hover:bg-indigo-500/10' : 'border-[#bad8b7] text-[#2f805d] hover:bg-[#e1f0db]'}`}
              title={t('wordDetail.deepExplain')}><BrainCircuit className={`w-4 h-4 ${effectiveDeepExplainLoading ? 'animate-pulse' : ''}`} /></button>
          </div>
        </div>
        {aiEnrichError && <p className="text-xs text-rose-500">{aiEnrichError}</p>}
        {deepExplainError && <p className="text-xs text-rose-500">{deepExplainError}</p>}
        {word.definition && <p className={`text-sm leading-relaxed ${themeStyles.textSecondary}`}>{word.definition}</p>}
        <div className="flex items-center gap-4 text-xs text-neutral-400 flex-wrap">
          <span>{t('wordDetail.frequency')}: <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">{getFrequency(word)}</span></span>
          <span>{language === 'zh' ? '收集' : 'Collections'}: <span className="font-mono font-bold">{word.contexts?.length || 0}</span></span>
          {word.familiarity !== undefined && <span>{t('wordDetail.confidence')}: <span className="font-mono font-bold">{word.familiarity}%</span></span>}
        </div>
        {(word.synonyms?.length || word.memoryTip) ? (
          <div className={`rounded-lg border ${isGlass ? 'border-white/10' : 'border-[#bad8b7]'} overflow-hidden`}>
            <button onClick={() => onToggleSection('details')} className={`w-full flex items-center justify-between px-4 py-2.5 text-xs font-medium transition-colors cursor-pointer ${isGlass ? 'hover:bg-white/5 text-white/70' : 'hover:bg-[#f2faee] text-[#5d7564]'}`}>
              <span>{language === 'zh' ? '更多详情' : 'More Details'}</span>
              {expandedSections.details ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
            {expandedSections.details && (
              <div className={`px-4 pb-3 space-y-2 border-t ${isGlass ? 'border-white/5' : 'border-[#c7dfbd]'}`}>
                {word.synonyms?.length ? <div className="pt-2"><span className="text-[10px] font-mono uppercase text-neutral-400">{t('wordDetail.synonyms')}</span><div className="flex flex-wrap gap-1.5 mt-1">{word.synonyms!.map((s,i) => <span key={i} className="bg-slate-100 dark:bg-white/5 border border-neutral-300 dark:border-white/10 text-xs px-2 py-0.5 rounded-full">{s}</span>)}</div></div> : null}
                {word.memoryTip && <div className="pt-2"><span className="text-[10px] font-mono uppercase text-neutral-400">{t('wordDetail.memoryTip')}</span><p className={`text-xs mt-0.5 italic leading-relaxed ${themeStyles.textSecondary}`}>{word.memoryTip}</p></div>}
              </div>
            )}
          </div>
        ) : null}
        {word.deepExplanation && (
          <div className={`rounded-lg border ${isGlass ? 'border-indigo-500/20' : 'border-[#bad8b7]'} overflow-hidden`}>
            <button onClick={() => onToggleSection('deepExplain')} className={`w-full flex items-center justify-between px-4 py-2.5 text-xs font-medium transition-colors cursor-pointer ${isGlass ? 'hover:bg-indigo-500/5 text-indigo-300' : 'hover:bg-[#f2faee] text-[#2f805d]'}`}>
              <span>{t('wordDetail.deepExplanation')}</span>
              {expandedSections.deepExplain ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
            {expandedSections.deepExplain && (
              <div className={`px-4 pb-3 space-y-2 border-t ${isGlass ? 'border-white/5' : 'border-[#c7dfbd]'}`}>
                {word.deepExplanation.contextInsights.map((item,i) => <div key={i} className="pt-2 space-y-0.5"><p className={`text-xs ${themeStyles.textSecondary} italic`}>"{item.context}"</p><p className={`text-sm ${themeStyles.textPrimary}`}>{item.insight}</p></div>)}
                {word.deepExplanation.synonymComparison && <div><span className="text-[10px] font-mono uppercase text-neutral-400">{t('wordDetail.synonymComparison')}</span><p className={`text-sm ${themeStyles.textPrimary}`}>{word.deepExplanation.synonymComparison}</p></div>}
                {word.deepExplanation.memoryHook && <div><span className="text-[10px] font-mono uppercase text-neutral-400">{t('wordDetail.memoryHook')}</span><p className={`text-sm ${themeStyles.textSecondary} italic`}>{word.deepExplanation.memoryHook}</p></div>}
              </div>
            )}
          </div>
        )}
        <div className={`rounded-lg border ${isGlass ? 'border-white/10' : 'border-[#bad8b7]'} overflow-hidden`}>
          <button onClick={() => onToggleSection('dictLinks')} className={`w-full flex items-center justify-between px-4 py-2.5 text-xs font-medium transition-colors cursor-pointer ${isGlass ? 'hover:bg-white/5 text-white/70' : 'hover:bg-[#f2faee] text-[#5d7564]'}`}>
            <span>{t('wordDetail.dictLinks')}</span>
            {expandedSections.dictLinks ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
          {expandedSections.dictLinks && <div className={`px-4 pb-3 pt-2 border-t flex items-center gap-2 text-xs ${isGlass ? 'border-white/5' : 'border-[#c7dfbd]'}`}><a href={`https://dictionary.cambridge.org/dictionary/english-chinese-simplified/${encodeURIComponent(word.word.toLowerCase().replace(/\s+/g, '-'))}`} target="_blank" rel="noopener noreferrer" className="text-indigo-600 dark:text-indigo-400 hover:underline">Cambridge</a><span className="text-neutral-300 dark:text-white/20">·</span><a href={`https://www.oxfordlearnersdictionaries.com/definition/english/${encodeURIComponent(word.word.toLowerCase().replace(/\s+/g, '_'))}`} target="_blank" rel="noopener noreferrer" className="text-indigo-600 dark:text-indigo-400 hover:underline">Oxford</a><span className="text-neutral-300 dark:text-white/20">·</span><a href={`https://www.collinsdictionary.com/dictionary/english/${encodeURIComponent(word.word.toLowerCase().replace(/\s+/g, '-'))}`} target="_blank" rel="noopener noreferrer" className="text-indigo-600 dark:text-indigo-400 hover:underline">Collins</a></div>}
        </div>
        {(word.contexts || []).length > 1 && (
          <div className={`rounded-lg border ${isGlass ? 'border-white/10' : 'border-[#bad8b7]'} overflow-hidden`}>
            <button onClick={() => onToggleSection('encounterCurve')} className={`w-full flex items-center justify-between px-4 py-2.5 text-xs font-medium transition-colors cursor-pointer ${isGlass ? 'hover:bg-white/5 text-white/70' : 'hover:bg-[#f2faee] text-[#5d7564]'}`}>
              <span>{language === 'zh' ? '遭遇曲线' : 'Encounter Curve'}</span>
              {expandedSections.encounterCurve ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
            {expandedSections.encounterCurve && (
              <div className={`px-4 pb-3 pt-2 border-t ${isGlass ? 'border-white/5' : 'border-[#c7dfbd]'}`}>
                <EncounterCurve contexts={word.contexts || []} themeStyles={themeStyles} language={language} />
              </div>
            )}
          </div>
        )}
        <div className={`rounded-lg border ${isGlass ? 'border-white/10' : 'border-[#bad8b7]'} overflow-hidden`}>
          <div onClick={() => onToggleSection('senseClusters')} className={`w-full flex items-center justify-between px-4 py-2.5 text-xs font-medium transition-colors cursor-pointer ${isGlass ? 'hover:bg-white/5 text-white/70' : 'hover:bg-[#f2faee] text-[#5d7564]'}`}>
            <span>{t('wordDetail.senseTitle')}{word.senseGroups?.groups?.length ? ` (${word.senseGroups.groups.length})` : ''}</span>
            <div className="flex items-center gap-2">
              {senseClusterError && <span className="text-[10px] text-rose-500">{senseClusterError}</span>}
              <button onClick={(e) => { e.stopPropagation(); onSenseCluster(); }} disabled={senseClusterLoading}
                className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium transition-colors cursor-pointer disabled:opacity-50 ${isGlass ? 'bg-indigo-500/10 text-indigo-300 hover:bg-indigo-500/20' : 'bg-[#d9efd2] text-[#2f805d] hover:bg-[#c4e6bb]'}`}>
                <Sparkles className={`w-3 h-3 ${senseClusterLoading ? 'animate-pulse' : ''}`} />
                <span>{senseClusterLoading ? '...' : word.senseGroups?.groups?.length ? t('wordDetail.senseRecluster') : t('wordDetail.senseCluster')}</span>
              </button>
              {expandedSections.senseClusters ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </div>
          </div>
          {expandedSections.senseClusters && word.senseGroups?.groups?.length ? (
            <div className={`px-4 pb-3 pt-2 border-t space-y-2 ${isGlass ? 'border-white/5' : 'border-[#c7dfbd]'}`}>
              {word.senseGroups.groups.map((group, gi) => (
                <div key={gi} className={`rounded-lg border px-3 py-2 ${isGlass ? 'border-white/10 bg-white/[0.03]' : 'border-[#bad8b7] bg-[#f3faef]'}`}>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`text-sm font-bold truncate ${themeStyles.textPrimary}`}>{group.sense}</span>
                      {group.translation && <span className={`text-xs ${isGlass ? 'text-indigo-300' : 'text-[#2f805d]'}`}>{group.translation}</span>}
                    </div>
                    <span className="text-[10px] font-mono text-neutral-400 whitespace-nowrap">{group.contexts.length}</span>
                  </div>
                  {group.definition && <p className={`text-xs mb-1.5 ${themeStyles.textSecondary}`}>{group.definition}</p>}
                  <ul className="space-y-0.5">
                    {group.contexts.map((ctx, ci) => (
                      <li key={ci} className={`text-xs leading-relaxed pl-3 border-l-2 ${isGlass ? 'border-white/10 text-white/80' : 'border-[#84c796] text-[#3a5244]'}`}>{ctx}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ) : null}
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between"><h3 className={`text-sm font-semibold uppercase tracking-wider ${themeStyles.textPrimary}`}>{t('wordDetail.contexts')}</h3><span className="text-[10px] text-neutral-400 font-mono">{word.contexts?.length || 0} {language === 'zh' ? '条' : 'items'}</span></div>
          {word.contexts?.length ? <>
            {word.contexts.slice(0, expandedSections.allContexts ? undefined : 3).map((ctx,i) => (
              <div key={i} className={`rounded-lg border px-3 py-2.5 ${isGlass ? 'border-white/10 bg-white/[0.03]' : 'border-[#c7dfbd] bg-[#fffdf7]'}`}>
                <div className="flex items-center justify-between mb-1"><span className="text-[10px] font-mono text-neutral-400">#{i+1} · {(() => { const d = ctx.timeAdded ?? ctx.addedDate; return d !== undefined ? formatDateTime(d) : '-'; })()}</span>{ctx.sourceLink && <a href={ctx.sourceLink} target="_blank" rel="noopener noreferrer" className="text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline">{t('wordDetail.source')}</a>}</div>
                <p className={`text-xs leading-relaxed ${themeStyles.textPrimary}`}>{ctx.context}</p>
                {(contextTranslations[i] || ctx.translation) && <p className="text-xs text-indigo-650 dark:text-indigo-400 mt-1">{contextTranslations[i] || ctx.translation}</p>}
                <div className="flex items-center gap-1.5 mt-2">
                  <button onClick={() => onTranslateContext(i, ctx.context)} disabled={!!contextActionLoading[i]} className="p-1 text-neutral-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-500/10 rounded transition-colors disabled:opacity-50 cursor-pointer" title={t('wordDetail.translateToSelected')}><Languages className="w-3.5 h-3.5" /></button>
                  <button onClick={() => onSaveContextTranslation(i)} disabled={!!contextActionLoading[i]} className="p-1 text-neutral-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-500/10 rounded transition-colors disabled:opacity-50 cursor-pointer" title={t('wordDetail.saveTranslation')}><Save className="w-3.5 h-3.5" /></button>
                  <button onClick={() => onDeleteContextTranslation(i)} disabled={!!contextActionLoading[i]} className="p-1 text-neutral-400 hover:text-red-500 hover:bg-red-500/10 rounded transition-colors disabled:opacity-50 cursor-pointer" title={t('wordDetail.deleteTranslation')}><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            ))}
            {(word.contexts.length > 3 || expandedSections.allContexts) && (
              <button onClick={() => onToggleSection('allContexts')} className={`w-full py-2 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${isGlass ? 'border-white/10 text-white/60 hover:bg-white/5' : 'border-[#bad8b7] text-[#5d7564] hover:bg-[#f2faee]'}`}>
                {expandedSections.allContexts ? (language === 'zh' ? '收起语境' : 'Collapse') : (language === 'zh' ? `查看全部 ${word.contexts.length} 条语境` : `View all ${word.contexts.length} contexts`)}
              </button>
            )}
          </> : <p className="text-xs text-neutral-400 py-4 text-center">{t('wordDetail.noContexts')}</p>}
        </div>
        <button onClick={() => { const e = Object.keys(expandedSections).some(k => expandedSections[k]); e ? onCollapseAll() : onExpandAll(); }} className={`w-full py-2 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${isGlass ? 'border-white/10 text-white/60 hover:bg-white/5' : 'border-[#bad8b7] text-[#5d7564] hover:bg-[#f2faee]'}`}>
          {Object.keys(expandedSections).some(k => expandedSections[k]) ? (language === 'zh' ? '收起全部' : 'Collapse All') : (language === 'zh' ? '展开全部' : 'Expand All')}
        </button>
      </div>
    </div>
  );
};
