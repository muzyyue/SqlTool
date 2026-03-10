/**
 * AI Pinia Store
 * 管理 AI 功能的全局状态，包括启用/禁用、可用性检查、错误处理等
 */

import { defineStore } from "pinia";
import { ref, computed, watch } from "vue";
import { useAiConfig } from "@/composables/ai/useAiConfig";
import { getModelManager } from "@/composables/ai/useModelManager";
import type { ModelType } from "@/composables/ai/types";

/**
 * localStorage 存储键名
 */
const STORAGE_KEY = "sqltool_ai_enabled";

/**
 * AI 状态类型
 */
export type AiStatus = "ready" | "loading" | "error" | "disabled";

/**
 * AI 状态配置映射
 * 图标使用 UnoCSS 图标预设格式：i-{collection}-{icon}
 */
export const AI_STATUS_CONFIG: Record<
  AiStatus,
  {
    color: string;
    label: string;
    icon: string;
    description: string;
  }
> = {
  ready: {
    color: "success",
    label: "AI 就绪",
    icon: "i-carbon-checkmark-filled",
    description: "AI 服务已就绪，可以正常使用",
  },
  loading: {
    color: "processing",
    label: "加载中",
    icon: "i-carbon-renew",
    description: "AI 服务正在加载中，请稍候",
  },
  error: {
    color: "error",
    label: "AI 不可用",
    icon: "i-carbon-warning-filled",
    description: "AI 服务暂时不可用，请稍后重试",
  },
  disabled: {
    color: "default",
    label: "AI 已禁用",
    icon: "i-carbon-locked",
    description: "AI 服务已禁用，点击可启用",
  },
};

/**
 * 从 localStorage 加载启用状态
 * @returns 是否启用 AI 功能
 */
const loadEnabledState = (): boolean => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved === "true";
  } catch (error) {
    console.error("加载 AI 启用状态失败:", error);
    return false;
  }
};

/**
 * 保存启用状态到 localStorage
 * @param enabled - 是否启用
 */
const saveEnabledState = (enabled: boolean): void => {
  try {
    localStorage.setItem(STORAGE_KEY, String(enabled));
  } catch (error) {
    console.error("保存 AI 启用状态失败:", error);
  }
};

/**
 * AI Store
 * 提供 AI 功能的全局状态管理
 */
export const useAiStore = defineStore("ai", () => {
  // ==================== State ====================

  /**
   * AI 功能是否启用
   */
  const isEnabled = ref<boolean>(loadEnabledState());

  /**
   * AI 服务是否可用
   */
  const isAvailable = ref<boolean>(false);

  /**
   * 是否正在加载
   */
  const isLoading = ref<boolean>(false);

  /**
   * 最后的错误信息
   */
  const lastError = ref<Error | null>(null);

  /**
   * 当前使用的模型类型
   */
  const currentModelType = ref<ModelType | null>(null);

  // ==================== Getters ====================

  /**
   * 是否可以使用 AI 功能
   * 需要同时满足：已启用、可用、未加载中
   */
  const canUseAi = computed<boolean>(() => {
    return isEnabled.value && isAvailable.value && !isLoading.value;
  });

  /**
   * AI 服务状态文本
   * 返回用户友好的状态描述
   */
  const statusText = computed<string>(() => {
    if (!isEnabled.value) {
      return "AI 功能已禁用";
    }
    if (isLoading.value) {
      return "AI 服务加载中...";
    }
    if (lastError.value) {
      return "AI 服务不可用";
    }
    if (isAvailable.value) {
      return "AI 服务可用";
    }
    return "AI 服务不可用";
  });

  /**
   * 格式化的错误消息
   */
  const errorMessage = computed<string>(() => {
    if (!lastError.value) return "";
    return lastError.value.message || String(lastError.value);
  });

  /**
   * AI 服务状态
   * 返回 ready | loading | error | disabled
   */
  const status = computed<AiStatus>(() => {
    if (!isEnabled.value) {
      return "disabled";
    }
    if (isLoading.value) {
      return "loading";
    }
    if (lastError.value || !isAvailable.value) {
      return "error";
    }
    return "ready";
  });

  /**
   * 是否可以切换状态
   * 加载中时不能切换
   */
  const canToggle = computed<boolean>(() => {
    return !isLoading.value;
  });

  // ==================== Actions ====================

  /**
   * 启用 AI 功能
   * 会自动触发可用性检查
   */
  const enable = async (): Promise<void> => {
    isEnabled.value = true;
    saveEnabledState(true);
    clearError();
    await checkAvailability();
  };

  /**
   * 禁用 AI 功能
   * 会清除错误信息和可用性状态
   */
  const disable = (): void => {
    isEnabled.value = false;
    saveEnabledState(false);
    isAvailable.value = false;
    currentModelType.value = null;
    clearError();
  };

  /**
   * 检查 AI 服务可用性
   * 会尝试初始化模型管理器并检查配置
   * @returns 是否可用
   */
  const checkAvailability = async (): Promise<boolean> => {
    // 如果未启用，直接返回不可用
    if (!isEnabled.value) {
      isAvailable.value = false;
      return false;
    }

    isLoading.value = true;
    clearError();

    try {
      // 获取 AI 配置
      const aiConfig = useAiConfig();
      const hasProvider = aiConfig.isAnyProviderConfigured.value;
      const hasLocal = aiConfig.isLocalModelEnabled.value;

      // 如果没有任何可用的模型配置
      if (!hasProvider && !hasLocal) {
        isAvailable.value = false;
        setError(
          new Error("未配置任何 AI 模型，请先配置 API Key 或启用本地模型"),
        );
        return false;
      }

      // 获取模型管理器并检查状态
      const manager = getModelManager();

      // 如果未初始化，尝试初始化
      if (!manager.isInitialized.value) {
        await manager.initialize();
      }

      // 更新状态
      isAvailable.value = manager.currentModelType.value !== null;
      currentModelType.value = manager.currentModelType.value;

      // 检查是否有错误
      if (manager.lastError.value) {
        setError(manager.lastError.value);
        isAvailable.value = false;
      }

      return isAvailable.value;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      setError(err);
      isAvailable.value = false;
      return false;
    } finally {
      isLoading.value = false;
    }
  };

  /**
   * 设置错误信息
   * @param error - 错误对象
   */
  const setError = (error: Error): void => {
    lastError.value = error instanceof Error ? error : new Error(String(error));
  };

  /**
   * 清除错误信息
   */
  const clearError = (): void => {
    lastError.value = null;
  };

  /**
   * 切换 AI 功能启用状态
   */
  const toggle = async (): Promise<void> => {
    if (isEnabled.value) {
      disable();
    } else {
      await enable();
    }
  };

  /**
   * 切换启用状态（别名，用于组件调用）
   */
  const toggleEnabled = async (): Promise<void> => {
    await toggle();
  };

  /**
   * 重置 Store 状态
   * 会清除所有运行时状态，但保留启用状态
   */
  const reset = (): void => {
    isAvailable.value = false;
    isLoading.value = false;
    currentModelType.value = null;
    clearError();
  };

  /**
   * 同步模型管理器的加载状态
   * 用于实时反映模型管理器的加载状态
   */
  const syncLoadingState = (): void => {
    if (!isEnabled.value) {
      return;
    }

    try {
      const manager = getModelManager();
      isLoading.value = manager.isLoading.value;
    } catch (error) {
      console.error("同步加载状态失败:", error);
    }
  };

  // ==================== Watchers ====================

  /**
   * 监听启用状态变化
   * 启用时自动检查可用性
   */
  watch(isEnabled, async (newEnabled) => {
    if (newEnabled) {
      await checkAvailability();
    }
  });

  // ==================== Return ====================

  return {
    // State
    isEnabled,
    isAvailable,
    isLoading,
    lastError,
    currentModelType,

    // Getters
    canUseAi,
    statusText,
    errorMessage,
    status,
    canToggle,

    // Actions
    enable,
    disable,
    toggle,
    toggleEnabled,
    checkAvailability,
    setError,
    clearError,
    reset,
    syncLoadingState,
  };
});
