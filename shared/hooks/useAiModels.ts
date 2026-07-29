import { useCallback, useEffect, useState } from 'react';
import { createLogger } from '../lib/logger';
import {
  AiProviderConfig,
  AiProviderInput,
  createAiProviderConfig,
  deleteAiProviderConfig,
  listAiProviderConfigs,
  updateAiProviderConfig,
  testAiProviderConfig,
  type AiProviderTestInput,
} from '../lib/aiProviderConfigs';

const logger = createLogger('useAiModels');

/**
 * AI Provider 配置管理 hook。
 * 封装 CRUD 操作、连接测试、以及激活模型的派生状态。
 */
export function useAiModels(accessToken: string | undefined) {
  const [models, setModels] = useState<AiProviderConfig[]>([]);

  const loadAiProviders = useCallback(async () => {
    if (!accessToken) {
      setModels([]);
      return;
    }

    try {
      logger.debug('loadAiProviders started');
      const providers = await listAiProviderConfigs(accessToken);
      setModels(providers);
      logger.info(`loadAiProviders success, count=${providers.length}`);
    } catch (error) {
      logger.warn('Could not load AI providers (no configs yet):', error instanceof Error ? error.message : error);
      setModels([]);
    }
  }, [accessToken]);

  useEffect(() => {
    void loadAiProviders();
  }, [loadAiProviders]);

  const handleToggleModel = useCallback(async (modelId: string) => {
    if (!accessToken) return;

    const current = models.find((model) => model.id === modelId);
    logger.debug('handleToggleModel', { modelId, currentActive: current?.isActive });
    try {
      const updated = await updateAiProviderConfig(modelId, { isActive: !current?.isActive }, accessToken);
      setModels((prev) => prev.map((model) => {
        if (updated.isActive && model.id !== updated.id) {
          return { ...model, isActive: false };
        }
        return model.id === updated.id ? updated : model;
      }));
      logger.info('handleToggleModel success', { modelId, isActive: updated.isActive });
    } catch (error) {
      logger.error('Error toggling AI provider:', error);
    }
  }, [accessToken, models]);

  const handleAddCustomModel = useCallback(async (newModel: AiProviderInput) => {
    if (!accessToken) return;

    logger.debug('handleAddCustomModel', { provider: newModel.provider });
    try {
      const created = await createAiProviderConfig(
        {
          ...newModel,
          isActive: models.length === 0,
        },
        accessToken
      );
      setModels((prev) => {
        const next = created.isActive ? prev.map((model) => ({ ...model, isActive: false })) : prev;
        return [...next, created];
      });
      logger.info('handleAddCustomModel success', { id: created.id, provider: created.provider });
    } catch (error) {
      logger.error('Error adding AI provider:', error);
      throw error;
    }
  }, [accessToken, models.length]);

  const handleTestModelConnection = useCallback(async (input: AiProviderTestInput): Promise<boolean> => {
    if (!accessToken) throw new Error('not_authenticated');
    logger.debug('handleTestModelConnection', { provider: input.provider, model: input.model });
    return testAiProviderConfig(input, accessToken);
  }, [accessToken]);

  const handleUpdateCustomModel = useCallback(async (modelId: string, updates: AiProviderInput) => {
    if (!accessToken) return;

    logger.debug('handleUpdateCustomModel', { modelId, provider: updates.provider });
    try {
      const updated = await updateAiProviderConfig(modelId, updates, accessToken);
      setModels((prev) => prev.map((model) => {
        if (updated.isActive && model.id !== updated.id) {
          return { ...model, isActive: false };
        }
        return model.id === updated.id ? updated : model;
      }));
      logger.info('handleUpdateCustomModel success', { modelId });
    } catch (error) {
      logger.error('Error updating AI provider:', error);
      throw error;
    }
  }, [accessToken]);

  const handleDeleteModel = useCallback(async (modelId: string) => {
    if (!accessToken) return;

    logger.debug('handleDeleteModel', { modelId });
    try {
      await deleteAiProviderConfig(modelId, accessToken);
      setModels((prev) => prev.filter((model) => model.id !== modelId));
      logger.info('handleDeleteModel success', { modelId });
    } catch (error) {
      logger.error('Error deleting AI provider:', error);
      throw error;
    }
  }, [accessToken]);

  const hasActiveModel = models.some((model) => model.isActive);

  return {
    models,
    hasActiveModel,
    handleToggleModel,
    handleAddCustomModel,
    handleTestModelConnection,
    handleUpdateCustomModel,
    handleDeleteModel,
  };
}
