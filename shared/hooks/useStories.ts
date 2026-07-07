import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { createLogger } from '../lib/logger';
import { useSupabase } from '../context/SupabaseContext';
import { requestStoryGenerate, type StoryGenerateRequest } from '../lib/aiEnrich';
import type { Story } from '../types';

const logger = createLogger('useStories');

const STORY_SELECT_COLUMNS =
  'id, title, category, difficulty, content_en, content_zh, sentences, highlighted_words, grammar_insight, created_at';

type SupabaseStoryRow = {
  id: string;
  title: string | null;
  category: string | null;
  difficulty: string | null;
  content_en: string | null;
  content_zh: string | null;
  sentences: Story['sentences'] | null;
  highlighted_words: string[] | null;
  grammar_insight: string | null;
  created_at: string;
};

function mapStoryRow(row: SupabaseStoryRow): Story {
  return {
    id: row.id,
    title: row.title || '',
    category: row.category || '',
    difficulty: row.difficulty || 'B2',
    contentEn: row.content_en || '',
    contentZh: row.content_zh || '',
    sentences: Array.isArray(row.sentences) ? row.sentences : [],
    highlightedWords: Array.isArray(row.highlighted_words) ? row.highlighted_words : [],
    grammarInsight: row.grammar_insight || '',
  };
}

export function useStories() {
  const { user, session } = useSupabase();
  const [stories, setStories] = useState<Story[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);

  const loadStories = useCallback(async () => {
    if (!user) {
      setStories([]);
      setIsLoading(false);
      return;
    }
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('stories')
        .select(STORY_SELECT_COLUMNS)
        .eq('user_id', user.id)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setStories(((data || []) as SupabaseStoryRow[]).map(mapStoryRow));
      logger.info(`loadStories success, count=${(data || []).length}`);
    } catch (error) {
      logger.error('Error loading stories:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void loadStories();
  }, [loadStories]);

  const generateStory = useCallback(
    async (input: StoryGenerateRequest): Promise<Story> => {
      const accessToken = session?.access_token;
      if (!accessToken) throw new Error('not_authenticated');
      setIsGenerating(true);
      try {
        const { story } = await requestStoryGenerate(input, accessToken);
        // 新故事置顶插入本地列表
        setStories((prev) => [story as Story, ...prev]);
        return story as Story;
      } finally {
        setIsGenerating(false);
      }
    },
    [session?.access_token]
  );

  const deleteStory = useCallback(
    async (storyId: string) => {
      if (!user) return;
      const previous = stories;
      // 乐观更新
      setStories((prev) => prev.filter((s) => s.id !== storyId));
      const { error } = await supabase
        .from('stories')
        .update({ is_deleted: true, updated_at: new Date().toISOString() })
        .eq('id', storyId)
        .eq('user_id', user.id);
      if (error) {
        logger.error('Error deleting story:', error);
        setStories(previous); // 回滚
      }
    },
    [user, stories]
  );

  return { stories, isLoading, isGenerating, generateStory, deleteStory, reloadStories: loadStories };
}
