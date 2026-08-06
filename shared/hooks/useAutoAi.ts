import { useCallback, useEffect, useRef, useState } from 'react';
import { profileApi } from '../lib/supabase';
import { createTranslator } from '../i18n';
import { enqueueAutoAi, type BatchAiType } from '../lib/batchAiStore';
import type { AppLanguage, Word } from '../types';
import type { ProfileRow } from './useProfile';
import { createLogger } from '../lib/logger';

const logger = createLogger('useAutoAi');

/**
 * 自动 AI 分析 hook。
 * 管理 auto_enrich / auto_explain 开关、基线记录、以及自动入队逻辑。
 */
export function useAutoAi(
  user: { id: string } | null,
  accessToken: string | undefined,
  words: Word[],
  hasActiveModel: boolean,
  updateWord: (id: string, updates: Partial<Word>) => Promise<Word | null> | void,
  language: AppLanguage,
  profile: ProfileRow | null,
  setProfile: React.Dispatch<React.SetStateAction<ProfileRow | null>>,
) {
  const [autoEnrich, setAutoEnrich] = useState<boolean>(false);
  const [autoExplain, setAutoExplain] = useState<boolean>(false);
  const autoAiBaselineRef = useRef<Set<string> | null>(null);

  // 从 profile 同步开关状态（profile 加载/切换用户时）
  useEffect(() => {
    setAutoEnrich(!!profile?.auto_enrich);
    setAutoExplain(!!profile?.auto_explain);
    autoAiBaselineRef.current = null;
  }, [profile?.auto_enrich, profile?.auto_explain, profile?.id]);

  const persistAutoFlag = useCallback(async (field: 'auto_enrich' | 'auto_explain', value: boolean) => {
    if (!user || !accessToken) return;
    try {
      await profileApi.updateProfile(user.id, { [field]: value });
      setProfile((prev) => (prev ? { ...prev, [field]: value } : prev));
    } catch (error) {
      logger.error('persistAutoFlag failed', { field, value, error });
    }
  }, [user, accessToken, setProfile]);

  const handleToggleAutoEnrich = useCallback(() => {
    if (!autoEnrich && !hasActiveModel) return;
    const next = !autoEnrich;
    if (next) autoAiBaselineRef.current = null;
    setAutoEnrich(next);
    void persistAutoFlag('auto_enrich', next);
  }, [autoEnrich, hasActiveModel, persistAutoFlag]);

  const handleToggleAutoExplain = useCallback(() => {
    if (!autoExplain && !hasActiveModel) return;
    const next = !autoExplain;
    if (next) autoAiBaselineRef.current = null;
    setAutoExplain(next);
    void persistAutoFlag('auto_explain', next);
  }, [autoExplain, hasActiveModel, persistAutoFlag]);

  const needsEnrich = (word: Word) => !word.definition && !word.memoryTip && !(word.examples && word.examples.length > 0);
  const needsExplain = (word: Word) => !word.deepExplanation;

  // 扫描当前单词本：对基线之后新出现且缺分析的词，按开关入队
  useEffect(() => {
    if (!autoEnrich && !autoExplain) {
      autoAiBaselineRef.current = null;
      return;
    }
    if (!hasActiveModel) return;
    if (!accessToken) return;

    // 首次（或开关刚开启）建立基线：记录当前全部词 id，本轮不处理
    if (autoAiBaselineRef.current === null) {
      autoAiBaselineRef.current = new Set(words.map((w) => w.id));
      return;
    }

    const baseline = autoAiBaselineRef.current;
    const t = createTranslator(language);
    const messages = {
      progress: (current: number, total: number, type: BatchAiType) =>
        type === 'enrich'
          ? t('vocab.autoEnriching', { current, total })
          : t('vocab.autoExplaining', { current, total }),
      complete: (success: number, fail: number) => t('vocab.autoComplete', { success, fail }),
      allFailed: t('vocab.batchAllFailed'),
    };

    for (const word of words) {
      if (baseline.has(word.id)) continue;
      if (autoEnrich && needsEnrich(word)) {
        enqueueAutoAi(word, 'enrich', { accessToken, onUpdateWord: (id, updates) => updateWord(id, updates), messages });
      }
      if (autoExplain && needsExplain(word)) {
        enqueueAutoAi(word, 'explain', { accessToken, onUpdateWord: (id, updates) => updateWord(id, updates), messages });
      }
      baseline.add(word.id);
    }
  }, [words, autoEnrich, autoExplain, hasActiveModel, accessToken, language, updateWord]);

  return {
    autoEnrich,
    autoExplain,
    handleToggleAutoEnrich,
    handleToggleAutoExplain,
  };
}
