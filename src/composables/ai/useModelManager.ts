import { ref, computed, readonly, watch } from "vue";
import type {
  IModelAdapter,
  ModelResponse,
  GenerateOptions,
  EmbeddingResponse,
  EmbeddingOptions,
  ModelManagerConfig,
  ModelEventListener,
  LoadingProgress,
} from "./types";
import { ModelType, ModelState, ModelEvent, ApiProvider } from "./types";
import { useAiConfig } from "./useAiConfig";
import { LocalModelAdapter, ApiModelAdapter } from "./adapters";

/**
 * 默认模型管理器配置
 */
const DEFAULT_CONFIG: ModelManagerConfig = {
  defaultModelType: ModelType.LOCAL,
  autoFallback: true,
  fallbackOrder: [ModelType.API, ModelType.LOCAL],
  cacheEnabled: true,
  maxConcurrentRequests: 3,
};

/**
 * 模型管理器状态
 */
interface ManagerState {
  currentAdapter: IModelAdapter | null;
  localAdapter: LocalModelAdapter | null;
  apiAdapters: Map<ApiProvider, ApiModelAdapter>;
  isInitialized: boolean;
  pendingRequests: number;
  lastError: Error | null;
}

/**
 * 创建全局状态（单例模式）
 */
const globalState = ref<ManagerState>({
  currentAdapter: null,
  localAdapter: null,
  apiAdapters: new Map(),
  isInitialized: false,
  pendingRequests: 0,
  lastError: null,
});

/**
 * 模型管理器 Composable
 * 提供统一的模型调用接口，支持本地模型和 API 模型的自动切换
 */
export function useModelManager() {
  const state = globalState;
  const aiConfig = useAiConfig();

  const isLoading = computed(() => state.value.pendingRequests > 0);
  const isInitialized = computed(() => state.value.isInitialized);
  const currentModelType = computed(
    () => state.value.currentAdapter?.type ?? null,
  );
  const currentModelName = computed(
    () => state.value.currentAdapter?.name ?? null,
  );
  const lastError = computed(() => readonly(state.value.lastError));

  /**
   * 初始化模型管理器
   */
  const initialize = async (): Promise<void> => {
    if (state.value.isInitialized) {
      return;
    }

    try {
      await initializeLocalAdapter();
      await initializeApiAdapters();

      state.value.currentAdapter = selectDefaultAdapter();
      state.value.isInitialized = true;
    } catch (error) {
      state.value.lastError =
        error instanceof Error ? error : new Error(String(error));
      throw error;
    }
  };

  /**
   * 初始化本地模型适配器
   */
  const initializeLocalAdapter = async (): Promise<void> => {
    if (!aiConfig.isLocalModelEnabled.value) {
      return;
    }

    const localConfig = aiConfig.config.value.localModel;

    state.value.localAdapter = new LocalModelAdapter({
      name: "本地模型",
      type: ModelType.LOCAL,
      enabled: localConfig.enabled,
      priority: 0,
      modelId: localConfig.modelId,
      modelType: "text-generation" as never,
      quantized: localConfig.quantized,
    });
  };

  /**
   * 初始化 API 模型适配器
   */
  const initializeApiAdapters = async (): Promise<void> => {
    const providers = aiConfig.getConfiguredProviders();

    for (const provider of providers) {
      const providerConfig = aiConfig.getProviderConfig(provider);
      if (providerConfig) {
        const adapter = new ApiModelAdapter({
          name: `${provider} API`,
          type: ModelType.API,
          enabled: providerConfig.enabled,
          priority: providerConfig.priority,
          provider: providerConfig.provider,
          model: providerConfig.model,
          apiKey: providerConfig.apiKey,
          baseUrl: providerConfig.baseUrl,
        });

        state.value.apiAdapters.set(provider, adapter);
      }
    }
  };

  /**
   * 选择默认适配器
   */
  const selectDefaultAdapter = (): IModelAdapter | null => {
    const defaultType = aiConfig.defaultModelType.value;

    if (defaultType === ModelType.LOCAL && state.value.localAdapter) {
      return state.value.localAdapter;
    }

    if (defaultType === ModelType.API) {
      const firstApiAdapter = state.value.apiAdapters.values().next().value;
      if (firstApiAdapter) {
        return firstApiAdapter;
      }
    }

    if (state.value.localAdapter) {
      return state.value.localAdapter;
    }

    return state.value.apiAdapters.values().next().value ?? null;
  };

  /**
   * 切换模型类型
   */
  const switchModelType = async (
    type: ModelType,
    provider?: ApiProvider,
  ): Promise<boolean> => {
    if (type === ModelType.LOCAL) {
      if (!state.value.localAdapter) {
        throw new Error("本地模型未启用");
      }
      state.value.currentAdapter = state.value.localAdapter;
      return true;
    }

    if (type === ModelType.API) {
      if (provider) {
        const adapter = state.value.apiAdapters.get(provider);
        if (!adapter) {
          throw new Error(`${provider} API 未配置`);
        }
        state.value.currentAdapter = adapter;
        return true;
      }

      const firstAdapter = state.value.apiAdapters.values().next().value;
      if (firstAdapter) {
        state.value.currentAdapter = firstAdapter;
        return true;
      }

      throw new Error("没有可用的 API 模型");
    }

    return false;
  };

  /**
   * 生成文本（带自动降级）
   */
  const generate = async (
    prompt: string,
    options?: GenerateOptions,
  ): Promise<ModelResponse> => {
    if (!state.value.isInitialized) {
      await initialize();
    }

    if (!state.value.currentAdapter) {
      throw new Error("没有可用的模型");
    }

    state.value.pendingRequests++;
    state.value.lastError = null;

    try {
      const response = await tryGenerateWithFallback(prompt, options);
      return response;
    } finally {
      state.value.pendingRequests--;
    }
  };

  /**
   * 尝试生成（带降级策略）
   */
  const tryGenerateWithFallback = async (
    prompt: string,
    options?: GenerateOptions,
  ): Promise<ModelResponse> => {
    const adapter = state.value.currentAdapter!;
    const autoFallback = aiConfig.config.value.autoFallback;

    try {
      if (!adapter.isReady) {
        await adapter.initialize();
      }
      return await adapter.generate(prompt, options);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      state.value.lastError = err;

      if (!autoFallback) {
        throw err;
      }

      return await fallbackGenerate(prompt, options, adapter.type);
    }
  };

  /**
   * 降级生成
   */
  const fallbackGenerate = async (
    prompt: string,
    options?: GenerateOptions,
    failedType?: ModelType,
  ): Promise<ModelResponse> => {
    const fallbackOrder = aiConfig.config.value.autoFallback
      ? [ModelType.LOCAL, ModelType.API]
      : [];

    for (const type of fallbackOrder) {
      if (type === failedType) continue;

      const fallbackAdapter = getAdapterByType(type);
      if (!fallbackAdapter) continue;

      try {
        if (!fallbackAdapter.isReady) {
          await fallbackAdapter.initialize();
        }
        const response = await fallbackAdapter.generate(prompt, options);
        state.value.currentAdapter = fallbackAdapter;
        return response;
      } catch (error) {
        console.warn(`降级到 ${type} 模型失败:`, error);
        continue;
      }
    }

    throw new Error("所有模型都不可用，请检查配置");
  };

  /**
   * 根据类型获取适配器
   */
  const getAdapterByType = (type: ModelType): IModelAdapter | null => {
    if (type === ModelType.LOCAL) {
      return state.value.localAdapter;
    }

    return state.value.apiAdapters.values().next().value ?? null;
  };

  /**
   * 生成嵌入向量
   */
  const generateEmbedding = async (
    text: string,
    options?: EmbeddingOptions,
  ): Promise<EmbeddingResponse> => {
    if (!state.value.isInitialized) {
      await initialize();
    }

    const adapter = state.value.localAdapter;
    if (!adapter) {
      throw new Error("嵌入向量生成仅支持本地模型");
    }

    if (!adapter.isReady) {
      await adapter.initialize();
    }

    if (!adapter.generateEmbedding) {
      throw new Error("当前模型不支持嵌入向量生成");
    }

    return adapter.generateEmbedding(text, options);
  };

  /**
   * 获取可用模型列表
   */
  const getAvailableModels = computed(() => {
    const models: Array<{
      name: string;
      type: ModelType;
      provider?: ApiProvider;
      isReady: boolean;
    }> = [];

    if (state.value.localAdapter) {
      models.push({
        name: state.value.localAdapter.name,
        type: ModelType.LOCAL,
        isReady: state.value.localAdapter.isReady,
      });
    }

    state.value.apiAdapters.forEach((adapter, provider) => {
      models.push({
        name: adapter.name,
        type: ModelType.API,
        provider,
        isReady: adapter.isReady,
      });
    });

    return models;
  });

  /**
   * 添加事件监听器
   */
  const addEventListener = (
    event: ModelEvent,
    listener: ModelEventListener,
  ): void => {
    if (state.value.currentAdapter) {
      state.value.currentAdapter.addEventListener(event, listener);
    }
  };

  /**
   * 移除事件监听器
   */
  const removeEventListener = (
    event: ModelEvent,
    listener: ModelEventListener,
  ): void => {
    if (state.value.currentAdapter) {
      state.value.currentAdapter.removeEventListener(event, listener);
    }
  };

  /**
   * 预加载模型
   */
  const preloadModel = async (type: ModelType): Promise<void> => {
    if (type === ModelType.LOCAL && state.value.localAdapter) {
      await state.value.localAdapter.initialize();
    } else if (type === ModelType.API) {
      const adapter = state.value.apiAdapters.values().next().value;
      if (adapter) {
        await adapter.initialize();
      }
    }
  };

  /**
   * 释放资源
   */
  const dispose = (): void => {
    if (state.value.localAdapter) {
      state.value.localAdapter.dispose();
    }
    state.value.apiAdapters.forEach((adapter) => adapter.dispose());
    state.value.apiAdapters.clear();

    state.value.currentAdapter = null;
    state.value.localAdapter = null;
    state.value.isInitialized = false;
    state.value.lastError = null;
  };

  /**
   * 重置管理器
   */
  const reset = async (): Promise<void> => {
    dispose();
    await initialize();
  };

  /**
   * 监听配置变化
   */
  watch(
    () => aiConfig.config.value,
    () => {
      if (state.value.isInitialized) {
        reset().catch(console.error);
      }
    },
    { deep: true },
  );

  return {
    state: computed(() => readonly(state.value)),
    isLoading,
    isInitialized,
    currentModelType,
    currentModelName,
    lastError,
    availableModels: getAvailableModels,

    initialize,
    switchModelType,
    generate,
    generateEmbedding,

    addEventListener,
    removeEventListener,

    preloadModel,
    dispose,
    reset,
  };
}

/**
 * 模型管理器单例
 */
let managerInstance: ReturnType<typeof useModelManager> | null = null;

/**
 * 获取模型管理器单例
 */
export function getModelManager(): ReturnType<typeof useModelManager> {
  if (!managerInstance) {
    managerInstance = useModelManager();
  }
  return managerInstance;
}
