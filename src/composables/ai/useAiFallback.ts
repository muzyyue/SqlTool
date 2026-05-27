/**
 * AI 降级处理模块
 * 提供自动降级逻辑，支持 API → LOCAL → ORIGINAL 三级降级
 * @module composables/ai/useAiFallback
 */

import { ref, computed, readonly } from "vue";
import { type ModelResponse } from "./types";
import { useAiErrorHandler, type AiError } from "./utils/errorHandler";

/**
 * 降级级别枚举
 * @description 定义降级的三个级别，数字越小优先级越高
 */
export enum FallbackLevel {
  /** API 模型 - 最高优先级 */
  API = 0,
  /** 本地模型 - 中等优先级 */
  LOCAL = 1,
  /** 原有流程 - 最低优先级（兜底方案） */
  ORIGINAL = 2,
}

/**
 * 降级日志接口
 * @description 记录每次降级的详细信息
 */
export interface FallbackLog {
  /** 日志唯一标识 */
  id: string;
  /** 降级发生时间戳 */
  timestamp: number;
  /** 降级前级别 */
  fromLevel: FallbackLevel;
  /** 降级后级别 */
  toLevel: FallbackLevel;
  /** 降级原因 */
  reason: string;
  /** 原始错误信息 */
  error?: AiError;
  /** 当前级别执行耗时（毫秒） */
  duration: number;
  /** 操作上下文描述 */
  context?: string;
}

/**
 * 降级结果接口
 * @description 封装降级操作的返回结果
 * @template T - 返回数据类型
 */
export interface FallbackResult<T = ModelResponse> {
  /** 操作是否成功 */
  success: boolean;
  /** 返回数据 */
  data?: T;
  /** 最终使用的降级级别 */
  finalLevel: FallbackLevel;
  /** 是否发生了降级 */
  isFallback: boolean;
  /** 降级路径（记录经过的所有级别） */
  fallbackPath: FallbackLevel[];
  /** 总耗时（毫秒） */
  totalDuration: number;
  /** 错误信息（仅在失败时有值） */
  error?: AiError;
}

/**
 * 降级选项接口
 * @description 配置降级行为的可选参数
 */
export interface FallbackOptions {
  /** 是否启用降级，默认 true */
  enabled?: boolean;
  /** 最大降级级别，默认 ORIGINAL */
  maxFallbackLevel?: FallbackLevel;
  /** 每级降级之间的延迟时间（毫秒），默认 0 */
  fallbackDelay?: number;
  /** 操作上下文描述，用于日志记录 */
  context?: string;
  /** 自定义降级判断函数 */
  shouldFallback?: (error: AiError, currentLevel: FallbackLevel) => boolean;
  /** 降级开始回调 */
  onFallbackStart?: (
    fromLevel: FallbackLevel,
    toLevel: FallbackLevel,
    reason: string,
  ) => void;
  /** 降级完成回调 */
  onFallbackComplete?: (result: FallbackResult) => void;
}

/**
 * 降级状态接口
 * @description 管理当前降级状态
 */
export interface FallbackState {
  /** 当前降级级别 */
  currentLevel: FallbackLevel;
  /** 是否正在降级中 */
  isFallingBack: boolean;
  /** 最后一次降级时间 */
  lastFallbackTime: number;
  /** 连续降级次数（用于冷却判断） */
  consecutiveFallbacks: number;
  /** 降级冷却结束时间 */
  cooldownEndTime: number;
}

/**
 * 降级事件类型
 */
export enum FallbackEvent {
  /** 降级开始 */
  START = "fallback:start",
  /** 降级成功 */
  SUCCESS = "fallback:success",
  /** 降级失败 */
  FAILED = "fallback:failed",
  /** 恢复到更高级别 */
  RECOVER = "fallback:recover",
}

/**
 * 降级事件处理器类型
 */
export type FallbackEventHandler = (
  event: FallbackEvent,
  data: unknown,
) => void;

/**
 * 模型操作函数类型
 * @description 定义各级别需要执行的操作函数签名
 */
type LevelOperation<T> = () => Promise<T>;

/**
 * 默认降级选项
 */
const DEFAULT_OPTIONS: Required<
  Omit<
    FallbackOptions,
    "shouldFallback" | "onFallbackStart" | "onFallbackComplete" | "context"
  >
> = {
  enabled: true,
  maxFallbackLevel: FallbackLevel.ORIGINAL,
  fallbackDelay: 0,
};

/**
 * 生成唯一 ID
 * @returns 唯一标识字符串
 */
const generateId = (): string => {
  return `fallback_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
};

/**
 * 获取降级级别名称
 * @param level - 降级级别
 * @returns 级别名称字符串
 */
export const getFallbackLevelName = (level: FallbackLevel): string => {
  const names: Record<FallbackLevel, string> = {
    [FallbackLevel.API]: "API 模型",
    [FallbackLevel.LOCAL]: "本地模型",
    [FallbackLevel.ORIGINAL]: "原有流程",
  };
  return names[level];
};

/**
 * 降级日志管理器
 * @description 提供降级日志的记录、查询和管理功能
 */
export function useFallbackLogger() {
  /** 日志记录数组 */
  const logs = ref<FallbackLog[]>([]);
  /** 最大日志条数 */
  const maxLogs = 100;

  /**
   * 记录降级日志
   * @param log - 日志条目（不含 id 和 timestamp）
   * @returns 完整的日志条目
   */
  const addLog = (log: Omit<FallbackLog, "id" | "timestamp">): FallbackLog => {
    const fullLog: FallbackLog = {
      ...log,
      id: generateId(),
      timestamp: Date.now(),
    };

    logs.value.unshift(fullLog);

    // 限制日志数量
    if (logs.value.length > maxLogs) {
      logs.value = logs.value.slice(0, maxLogs);
    }

    return fullLog;
  };

  /**
   * 清除所有日志
   */
  const clearLogs = (): void => {
    logs.value = [];
  };

  /**
   * 获取指定时间范围内的日志
   * @param startTime - 开始时间戳
   * @param endTime - 结束时间戳
   * @returns 过滤后的日志数组
   */
  const getLogsByTimeRange = (
    startTime: number,
    endTime: number,
  ): FallbackLog[] => {
    return logs.value.filter(
      (log) => log.timestamp >= startTime && log.timestamp <= endTime,
    );
  };

  /**
   * 获取指定级别的降级日志
   * @param level - 降级级别
   * @returns 过滤后的日志数组
   */
  const getLogsByLevel = (level: FallbackLevel): FallbackLog[] => {
    return logs.value.filter(
      (log) => log.fromLevel === level || log.toLevel === level,
    );
  };

  /**
   * 获取降级统计信息
   */
  const getStats = computed(() => {
    const stats = {
      totalFallbacks: logs.value.length,
      byLevel: {
        [FallbackLevel.API]: 0,
        [FallbackLevel.LOCAL]: 0,
        [FallbackLevel.ORIGINAL]: 0,
      },
      averageDuration: 0,
    };

    if (logs.value.length === 0) {
      return stats;
    }

    let totalDuration = 0;
    for (const log of logs.value) {
      stats.byLevel[log.fromLevel]++;
      totalDuration += log.duration;
    }

    stats.averageDuration = Math.round(totalDuration / logs.value.length);

    return stats;
  });

  /**
   * 导出日志为 JSON 格式
   * @returns JSON 字符串
   */
  const exportLogs = (): string => {
    return JSON.stringify(logs.value, null, 2);
  };

  /**
   * 从 JSON 导入日志
   * @param json - JSON 字符串
   */
  const importLogs = (json: string): void => {
    try {
      const parsed = JSON.parse(json) as FallbackLog[];
      if (Array.isArray(parsed)) {
        logs.value = parsed.slice(0, maxLogs);
      }
    } catch (error) {
      console.error("[FallbackLogger] 导入日志失败:", error);
    }
  };

  return {
    logs: computed(() => readonly(logs.value)),
    stats: getStats,
    addLog,
    clearLogs,
    getLogsByTimeRange,
    getLogsByLevel,
    exportLogs,
    importLogs,
  };
}

/**
 * 降级状态管理器
 * @description 管理降级状态，提供状态查询和更新功能
 */
export function useFallbackState() {
  /** 降级状态 */
  const state = ref<FallbackState>({
    currentLevel: FallbackLevel.API,
    isFallingBack: false,
    lastFallbackTime: 0,
    consecutiveFallbacks: 0,
    cooldownEndTime: 0,
  });

  /** 降级冷却时间（毫秒） */
  const cooldownDuration = 30000; // 30 秒

  /** 降级阈值（连续降级次数达到此值后触发冷却） */
  const fallbackThreshold = 3;

  /**
   * 是否处于冷却期
   */
  const isInCooldown = computed(() => {
    return Date.now() < state.value.cooldownEndTime;
  });

  /**
   * 是否可以尝试更高级别
   */
  const canAttemptHigherLevel = computed(() => {
    return !state.value.isFallingBack && !isInCooldown.value;
  });

  /**
   * 更新当前级别
   * @param level - 新的降级级别
   * @param reason - 更新原因
   */
  const updateLevel = (level: FallbackLevel, reason?: string): void => {
    const previousLevel = state.value.currentLevel;

    state.value.currentLevel = level;
    state.value.lastFallbackTime = Date.now();

    // 如果降级到更低级别，增加连续降级计数
    if (level > previousLevel) {
      state.value.consecutiveFallbacks++;

      // 检查是否需要进入冷却
      if (state.value.consecutiveFallbacks >= fallbackThreshold) {
        state.value.cooldownEndTime = Date.now() + cooldownDuration;
        console.warn("[FallbackState] 达到降级阈值，进入冷却期");
      }
    } else if (level < previousLevel) {
      // 恢复到更高级别，重置计数
      state.value.consecutiveFallbacks = 0;
      state.value.cooldownEndTime = 0;
    }
  };

  /**
   * 设置降级中状态
   * @param isFallingBack - 是否正在降级
   */
  const setFallingBack = (isFallingBack: boolean): void => {
    state.value.isFallingBack = isFallingBack;
  };

  /**
   * 重置状态
   */
  const reset = (): void => {
    state.value = {
      currentLevel: FallbackLevel.API,
      isFallingBack: false,
      lastFallbackTime: 0,
      consecutiveFallbacks: 0,
      cooldownEndTime: 0,
    };
  };

  /**
   * 尝试恢复到更高级别
   * @returns 是否成功恢复
   */
  const attemptRecover = (): boolean => {
    if (!canAttemptHigherLevel.value) {
      return false;
    }

    if (state.value.currentLevel > FallbackLevel.API) {
      // 尝试恢复到上一级
      const newLevel = state.value.currentLevel - 1;
      updateLevel(newLevel, "尝试恢复");
      return true;
    }

    return false;
  };

  return {
    state: computed(() => readonly(state.value)),
    isInCooldown,
    canAttemptHigherLevel,
    updateLevel,
    setFallingBack,
    reset,
    attemptRecover,
  };
}

/**
 * AI 降级处理主函数
 * @description 提供完整的降级处理逻辑，支持三级降级和自定义策略
 * @template T - 返回数据类型
 */
export function useAiFallback() {
  const errorHandler = useAiErrorHandler();
  const logger = useFallbackLogger();
  const fallbackState = useFallbackState();

  /** 事件监听器映射 */
  const eventListeners = new Map<FallbackEvent, Set<FallbackEventHandler>>();

  /**
   * 触发事件
   * @param event - 事件类型
   * @param data - 事件数据
   */
  const emitEvent = (event: FallbackEvent, data: unknown): void => {
    const listeners = eventListeners.get(event);
    if (listeners) {
      listeners.forEach((handler) => {
        try {
          handler(event, data);
        } catch (error) {
          console.error(`[Fallback] 事件处理器错误 [${event}]:`, error);
        }
      });
    }
  };

  /**
   * 添加事件监听器
   * @param event - 事件类型
   * @param handler - 事件处理器
   */
  const addEventListener = (
    event: FallbackEvent,
    handler: FallbackEventHandler,
  ): void => {
    if (!eventListeners.has(event)) {
      eventListeners.set(event, new Set());
    }
    eventListeners.get(event)!.add(handler);
  };

  /**
   * 移除事件监听器
   * @param event - 事件类型
   * @param handler - 事件处理器
   */
  const removeEventListener = (
    event: FallbackEvent,
    handler: FallbackEventHandler,
  ): void => {
    const listeners = eventListeners.get(event);
    if (listeners) {
      listeners.delete(handler);
    }
  };

  /**
   * 判断是否应该降级
   * @param error - 错误对象
   * @param currentLevel - 当前级别
   * @param options - 降级选项
   * @returns 是否应该降级
   */
  const shouldFallback = (
    error: AiError,
    currentLevel: FallbackLevel,
    options: FallbackOptions,
  ): boolean => {
    // 使用自定义判断函数
    if (options.shouldFallback) {
      return options.shouldFallback(error, currentLevel);
    }

    // 默认判断逻辑：可恢复错误才降级
    if (!error.recoverable) {
      return false;
    }

    // 检查是否已达到最大降级级别
    if (
      currentLevel >=
      (options.maxFallbackLevel ?? DEFAULT_OPTIONS.maxFallbackLevel)
    ) {
      return false;
    }

    return true;
  };

  /**
   * 执行指定级别的操作
   * @template T - 返回数据类型
   * @param level - 降级级别
   * @param operations - 各级别的操作函数映射
   * @returns 操作结果
   */
  const executeWithLevel = async <T>(
    level: FallbackLevel,
    operations: Map<FallbackLevel, LevelOperation<T>>,
  ): Promise<T> => {
    const operation = operations.get(level);
    if (!operation) {
      throw new Error(`未找到 ${getFallbackLevelName(level)} 的操作函数`);
    }
    return operation();
  };

  /**
   * 尝试执行操作，失败时自动降级
   * @template T - 返回数据类型
   * @param operations - 各级别的操作函数映射
   * @param options - 降级选项
   * @returns 降级结果
   */
  const tryWithFallback = async <T = ModelResponse>(
    operations: Map<FallbackLevel, LevelOperation<T>>,
    options: FallbackOptions = {},
  ): Promise<FallbackResult<T>> => {
    const mergedOptions = { ...DEFAULT_OPTIONS, ...options };

    // 如果降级未启用，直接执行最高级别
    if (!mergedOptions.enabled) {
      const startTime = Date.now();
      try {
        const data = await executeWithLevel(FallbackLevel.API, operations);
        return {
          success: true,
          data,
          finalLevel: FallbackLevel.API,
          isFallback: false,
          fallbackPath: [FallbackLevel.API],
          totalDuration: Date.now() - startTime,
        };
      } catch (error) {
        const aiError = errorHandler.logError(
          error instanceof Error ? error : new Error(String(error)),
          options.context,
        );
        return {
          success: false,
          finalLevel: FallbackLevel.API,
          isFallback: false,
          fallbackPath: [FallbackLevel.API],
          totalDuration: Date.now() - startTime,
          error: aiError,
        };
      }
    }

    const startTime = Date.now();
    const fallbackPath: FallbackLevel[] = [];
    let currentLevel = FallbackLevel.API;
    let lastError: AiError | undefined;

    fallbackState.setFallingBack(true);

    try {
      // 从 API 级别开始尝试
      while (currentLevel <= mergedOptions.maxFallbackLevel) {
        fallbackPath.push(currentLevel);
        const levelStartTime = Date.now();

        try {
          // 执行当前级别的操作
          const data = await executeWithLevel(currentLevel, operations);
          const levelDuration = Date.now() - levelStartTime;

          // 成功，更新状态
          if (currentLevel !== FallbackLevel.API && fallbackPath.length > 1) {
            // 发生了降级
            fallbackState.updateLevel(currentLevel, "降级成功");

            // 记录降级日志
            logger.addLog({
              fromLevel: fallbackPath[0],
              toLevel: currentLevel,
              reason: lastError?.message ?? "未知错误",
              error: lastError,
              duration: levelDuration,
              context: options.context,
            });

            // 触发降级成功事件
            emitEvent(FallbackEvent.SUCCESS, {
              fromLevel: fallbackPath[0],
              toLevel: currentLevel,
              reason: lastError?.message,
            });
          }

          return {
            success: true,
            data,
            finalLevel: currentLevel,
            isFallback: currentLevel > FallbackLevel.API,
            fallbackPath,
            totalDuration: Date.now() - startTime,
          };
        } catch (error) {
          // 记录错误
          lastError = errorHandler.logError(
            error instanceof Error ? error : new Error(String(error)),
            `${options.context} [${getFallbackLevelName(currentLevel)}]`,
          );

          const levelDuration = Date.now() - levelStartTime;

          // 判断是否应该降级
          if (!shouldFallback(lastError, currentLevel, mergedOptions)) {
            // 不可降级，直接返回失败
            return {
              success: false,
              finalLevel: currentLevel,
              isFallback: fallbackPath.length > 1,
              fallbackPath,
              totalDuration: Date.now() - startTime,
              error: lastError,
            };
          }

          // 记录降级日志
          const nextLevel = currentLevel + 1;
          if (nextLevel <= mergedOptions.maxFallbackLevel) {
            logger.addLog({
              fromLevel: currentLevel,
              toLevel: nextLevel,
              reason: lastError.message,
              error: lastError,
              duration: levelDuration,
              context: options.context,
            });

            // 触发降级开始事件
            emitEvent(FallbackEvent.START, {
              fromLevel: currentLevel,
              toLevel: nextLevel,
              reason: lastError.message,
            });

            // 调用回调
            if (mergedOptions.onFallbackStart) {
              mergedOptions.onFallbackStart(
                currentLevel,
                nextLevel,
                lastError.message,
              );
            }

            // 降级延迟
            if (mergedOptions.fallbackDelay > 0) {
              await new Promise((resolve) =>
                setTimeout(resolve, mergedOptions.fallbackDelay),
              );
            }
          }

          // 进入下一级别
          currentLevel = nextLevel;
        }
      }

      // 所有级别都失败
      emitEvent(FallbackEvent.FAILED, {
        path: fallbackPath,
        error: lastError,
      });

      return {
        success: false,
        finalLevel: currentLevel - 1,
        isFallback: fallbackPath.length > 1,
        fallbackPath,
        totalDuration: Date.now() - startTime,
        error: lastError,
      };
    } finally {
      fallbackState.setFallingBack(false);

      // 调用完成回调
      if (mergedOptions.onFallbackComplete) {
        const result: FallbackResult<T> = {
          success: false,
          finalLevel: currentLevel,
          isFallback: fallbackPath.length > 1,
          fallbackPath,
          totalDuration: Date.now() - startTime,
          error: lastError,
        };
        mergedOptions.onFallbackComplete(result);
      }
    }
  };

  /**
   * 创建模型操作映射
   * @description 辅助函数，用于快速创建三级降级的操作映射
   * @param apiOperation - API 模型操作
   * @param localOperation - 本地模型操作
   * @param originalOperation - 原有流程操作
   * @returns 操作映射
   */
  const createOperations = <T>(
    apiOperation: LevelOperation<T>,
    localOperation?: LevelOperation<T>,
    originalOperation?: LevelOperation<T>,
  ): Map<FallbackLevel, LevelOperation<T>> => {
    const operations = new Map<FallbackLevel, LevelOperation<T>>();
    operations.set(FallbackLevel.API, apiOperation);

    if (localOperation) {
      operations.set(FallbackLevel.LOCAL, localOperation);
    }

    if (originalOperation) {
      operations.set(FallbackLevel.ORIGINAL, originalOperation);
    }

    return operations;
  };

  return {
    // 状态
    state: fallbackState.state,
    isInCooldown: fallbackState.isInCooldown,
    canAttemptHigherLevel: fallbackState.canAttemptHigherLevel,

    // 日志
    logs: logger.logs,
    stats: logger.stats,

    // 核心方法
    tryWithFallback,
    createOperations,

    // 状态管理
    updateLevel: fallbackState.updateLevel,
    reset: fallbackState.reset,
    attemptRecover: fallbackState.attemptRecover,

    // 日志管理
    clearLogs: logger.clearLogs,
    getLogsByTimeRange: logger.getLogsByTimeRange,
    getLogsByLevel: logger.getLogsByLevel,
    exportLogs: logger.exportLogs,
    importLogs: logger.importLogs,

    // 事件
    addEventListener,
    removeEventListener,

    // 工具
    getFallbackLevelName,
    FallbackLevel,
    FallbackEvent,
  };
}

/**
 * 类型导出
 */
export type {
  FallbackLog,
  FallbackResult,
  FallbackOptions,
  FallbackState,
  FallbackEventHandler,
};
