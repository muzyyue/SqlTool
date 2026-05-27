import { ref, computed } from "vue";

/**
 * AI 错误类型枚举
 * 定义具体的错误类型，用于精确识别和处理不同的错误场景
 */
export enum AiErrorType {
  /** 初始化失败 */
  INITIALIZATION = "initialization",
  /** 网络错误 */
  NETWORK = "network",
  /** 请求超时 */
  TIMEOUT = "timeout",
  /** API 限流 */
  RATE_LIMIT = "rate_limit",
  /** 响应格式无效 */
  INVALID_RESPONSE = "invalid_response",
  /** 模型未找到 */
  MODEL_NOT_FOUND = "model_not_found",
  /** 资源不足 */
  INSUFFICIENT_RESOURCES = "insufficient_resources",
  /** API Key 无效 */
  API_KEY_INVALID = "api_key_invalid",
  /** 配置错误 */
  CONFIG_ERROR = "config_error",
  /** 权限不足 */
  PERMISSION_DENIED = "permission_denied",
  /** 模型加载失败 */
  MODEL_LOAD_FAILED = "model_load_failed",
  /** 未知错误 */
  UNKNOWN = "unknown",
}

/**
 * AI 错误分类枚举
 * 高层次的错误分类，用于错误统计和用户提示分组
 */
export enum AiErrorCategory {
  /** 网络相关错误 */
  NETWORK = "network",
  /** API 相关错误 */
  API = "api",
  /** 模型相关错误 */
  MODEL = "model",
  /** 配置相关错误 */
  CONFIG = "config",
  /** 权限相关错误 */
  PERMISSION = "permission",
  /** 资源相关错误 */
  RESOURCE = "resource",
}

/**
 * AI 错误严重级别枚举
 * 用于标识错误的影响程度，指导错误处理策略
 */
export enum AiErrorSeverity {
  /** 低严重性：不影响核心功能，可忽略或延迟处理 */
  LOW = "low",
  /** 中等严重性：影响部分功能，需要用户注意 */
  MEDIUM = "medium",
  /** 高严重性：影响核心功能，需要立即处理 */
  HIGH = "high",
  /** 严重错误：系统不可用，需要紧急处理 */
  CRITICAL = "critical",
}

/**
 * AI 错误接口
 * 包含错误的完整信息，用于错误处理和用户提示
 */
export interface AiError {
  /** 错误类型 */
  type: AiErrorType;
  /** 错误消息 */
  message: string;
  /** 原始错误对象 */
  originalError?: Error;
  /** 是否可恢复 */
  recoverable: boolean;
  /** 建议操作 */
  suggestedAction?: string;
  /** 错误时间戳 */
  timestamp: number;
  /** 错误分类 */
  category?: AiErrorCategory;
  /** 错误严重级别 */
  severity?: AiErrorSeverity;
  /** 重试次数 */
  retryCount?: number;
}

/**
 * 获取错误分类
 * 根据错误类型映射到对应的错误分类
 * @param type - 错误类型
 * @returns 错误分类
 */
export const getErrorCategory = (type: AiErrorType): AiErrorCategory => {
  const categoryMap: Record<AiErrorType, AiErrorCategory> = {
    [AiErrorType.NETWORK]: AiErrorCategory.NETWORK,
    [AiErrorType.TIMEOUT]: AiErrorCategory.NETWORK,
    [AiErrorType.RATE_LIMIT]: AiErrorCategory.API,
    [AiErrorType.INVALID_RESPONSE]: AiErrorCategory.API,
    [AiErrorType.API_KEY_INVALID]: AiErrorCategory.PERMISSION,
    [AiErrorType.MODEL_NOT_FOUND]: AiErrorCategory.MODEL,
    [AiErrorType.MODEL_LOAD_FAILED]: AiErrorCategory.MODEL,
    [AiErrorType.INSUFFICIENT_RESOURCES]: AiErrorCategory.RESOURCE,
    [AiErrorType.CONFIG_ERROR]: AiErrorCategory.CONFIG,
    [AiErrorType.PERMISSION_DENIED]: AiErrorCategory.PERMISSION,
    [AiErrorType.INITIALIZATION]: AiErrorCategory.CONFIG,
    [AiErrorType.UNKNOWN]: AiErrorCategory.API,
  };
  return categoryMap[type] || AiErrorCategory.API;
};

/**
 * 获取错误严重级别
 * 根据错误类型判断错误的严重程度
 * @param type - 错误类型
 * @returns 错误严重级别
 */
export const getErrorSeverity = (type: AiErrorType): AiErrorSeverity => {
  // CRITICAL: 系统不可用，需要紧急处理
  if (
    type === AiErrorType.API_KEY_INVALID ||
    type === AiErrorType.PERMISSION_DENIED ||
    type === AiErrorType.CONFIG_ERROR
  ) {
    return AiErrorSeverity.CRITICAL;
  }

  // HIGH: 影响核心功能，需要立即处理
  if (
    type === AiErrorType.MODEL_NOT_FOUND ||
    type === AiErrorType.MODEL_LOAD_FAILED ||
    type === AiErrorType.INSUFFICIENT_RESOURCES
  ) {
    return AiErrorSeverity.HIGH;
  }

  // MEDIUM: 影响部分功能，需要用户注意
  if (
    type === AiErrorType.RATE_LIMIT ||
    type === AiErrorType.INVALID_RESPONSE ||
    type === AiErrorType.INITIALIZATION
  ) {
    return AiErrorSeverity.MEDIUM;
  }

  // LOW: 不影响核心功能，可忽略或延迟处理
  return AiErrorSeverity.LOW;
};

/**
 * 创建 AI 错误
 * 根据错误类型和消息创建完整的错误对象
 * @param type - 错误类型
 * @param message - 错误消息
 * @param originalError - 原始错误对象
 * @returns AI 错误对象
 */
export const createAiError = (
  type: AiErrorType,
  message: string,
  originalError?: Error,
): AiError => {
  const error: AiError = {
    type,
    message,
    originalError,
    recoverable: isErrorRecoverable(type),
    suggestedAction: getRecoverySuggestionByType(type),
    timestamp: Date.now(),
    category: getErrorCategory(type),
    severity: getErrorSeverity(type),
    retryCount: 0,
  };
  return error;
};

/**
 * 判断错误是否可恢复（基于错误类型）
 * @param type - 错误类型
 * @returns 是否可恢复
 */
const isErrorRecoverable = (type: AiErrorType): boolean => {
  const recoverableTypes: AiErrorType[] = [
    AiErrorType.NETWORK,
    AiErrorType.TIMEOUT,
    AiErrorType.RATE_LIMIT,
    AiErrorType.INVALID_RESPONSE,
  ];

  const nonRecoverableTypes: AiErrorType[] = [
    AiErrorType.API_KEY_INVALID,
    AiErrorType.MODEL_NOT_FOUND,
    AiErrorType.INSUFFICIENT_RESOURCES,
    AiErrorType.CONFIG_ERROR,
    AiErrorType.PERMISSION_DENIED,
  ];

  return recoverableTypes.includes(type) && !nonRecoverableTypes.includes(type);
};

/**
 * 判断错误是否可恢复（支持 AiError 对象）
 * @param error - AI 错误对象或错误类型
 * @returns 是否可恢复
 */
export const isRecoverable = (error: AiError | AiErrorType): boolean => {
  if (typeof error === "string") {
    return isErrorRecoverable(error);
  }
  return error.recoverable;
};

/**
 * 获取用户友好的错误提示消息
 * 提供简洁、易懂的错误描述，适合直接展示给用户
 * @param error - AI 错误对象或错误类型
 * @returns 用户友好的错误提示
 */
export const getUserFriendlyMessage = (
  error: AiError | AiErrorType,
): string => {
  const type = typeof error === "string" ? error : error.type;

  const friendlyMessages: Record<AiErrorType, string> = {
    [AiErrorType.INITIALIZATION]: "AI 服务初始化失败，请刷新页面重试",
    [AiErrorType.NETWORK]: "网络连接失败，请检查网络后重试",
    [AiErrorType.TIMEOUT]: "网络连接超时，请检查网络后重试",
    [AiErrorType.RATE_LIMIT]: "请求过于频繁，请稍后再试",
    [AiErrorType.INVALID_RESPONSE]: "服务器返回了无效响应，请重试",
    [AiErrorType.MODEL_NOT_FOUND]: "AI 模型不存在，请联系管理员",
    [AiErrorType.INSUFFICIENT_RESOURCES]: "系统资源不足，请关闭其他应用后重试",
    [AiErrorType.API_KEY_INVALID]: "AI 配置有误，请检查 API Key 是否正确",
    [AiErrorType.CONFIG_ERROR]: "AI 配置有误，请检查配置信息",
    [AiErrorType.PERMISSION_DENIED]: "权限不足，无法访问该功能",
    [AiErrorType.MODEL_LOAD_FAILED]:
      "AI 模型加载失败，请刷新页面或切换到其他模式",
    [AiErrorType.UNKNOWN]: "发生未知错误，请重试",
  };

  return friendlyMessages[type] || friendlyMessages[AiErrorType.UNKNOWN];
};

/**
 * 获取错误恢复建议（基于错误类型）
 * 提供技术性的恢复建议，用于开发者或高级用户
 * @param type - 错误类型
 * @returns 恢复建议
 */
const getRecoverySuggestionByType = (type: AiErrorType): string => {
  const suggestions: Record<AiErrorType, string> = {
    [AiErrorType.INITIALIZATION]: "请刷新页面重试，或检查网络连接",
    [AiErrorType.NETWORK]: "请检查网络连接后重试",
    [AiErrorType.TIMEOUT]: "请求超时，请稍后重试",
    [AiErrorType.RATE_LIMIT]: "请求过于频繁，请稍后重试",
    [AiErrorType.INVALID_RESPONSE]: "服务器返回了无效响应，请重试",
    [AiErrorType.MODEL_NOT_FOUND]: "模型不存在，请检查模型配置",
    [AiErrorType.INSUFFICIENT_RESOURCES]: "系统资源不足，请关闭其他应用后重试",
    [AiErrorType.API_KEY_INVALID]: "API Key 无效，请检查配置",
    [AiErrorType.CONFIG_ERROR]: "配置有误，请检查 AI 配置项",
    [AiErrorType.PERMISSION_DENIED]: "权限不足，请检查用户权限设置",
    [AiErrorType.MODEL_LOAD_FAILED]: "模型加载失败，请刷新页面或切换模型",
    [AiErrorType.UNKNOWN]: "发生未知错误，请重试",
  };

  return suggestions[type] || suggestions[AiErrorType.UNKNOWN];
};

/**
 * 获取错误恢复建议（支持 AiError 对象）
 * @param error - AI 错误对象或错误类型
 * @returns 恢复建议
 */
export const getRecoverySuggestion = (error: AiError | AiErrorType): string => {
  if (typeof error === "string") {
    return getRecoverySuggestionByType(error);
  }
  return error.suggestedAction || getRecoverySuggestionByType(error.type);
};

/**
 * 判断是否应该重试
 * 根据错误类型和严重级别判断是否应该自动重试
 * @param error - AI 错误对象或错误类型
 * @returns 是否应该重试
 */
export const shouldRetry = (error: AiError | AiErrorType): boolean => {
  const type = typeof error === "string" ? error : error.type;
  const severity =
    typeof error === "string"
      ? getErrorSeverity(error)
      : error.severity || getErrorSeverity(type);

  // CRITICAL 级别错误不应该自动重试
  if (severity === AiErrorSeverity.CRITICAL) {
    return false;
  }

  // 可恢复的错误才应该重试
  return isRecoverable(error);
};

/**
 * 获取重试延迟时间（毫秒）
 * 根据错误类型和重试次数计算合适的延迟时间
 * @param error - AI 错误对象或错误类型
 * @param attempt - 当前重试次数（从 1 开始）
 * @returns 重试延迟时间（毫秒）
 */
export const getRetryDelay = (
  error: AiError | AiErrorType,
  attempt: number = 1,
): number => {
  const type = typeof error === "string" ? error : error.type;

  // 基础延迟配置
  const baseDelays: Record<AiErrorType, number> = {
    [AiErrorType.NETWORK]: 2000, // 网络错误：2秒
    [AiErrorType.TIMEOUT]: 3000, // 超时：3秒
    [AiErrorType.RATE_LIMIT]: 30000, // 限流：30秒
    [AiErrorType.INVALID_RESPONSE]: 2000, // 无效响应：2秒
    [AiErrorType.INITIALIZATION]: 5000, // 初始化失败：5秒
    [AiErrorType.MODEL_LOAD_FAILED]: 5000, // 模型加载失败：5秒
    [AiErrorType.API_KEY_INVALID]: 0, // 不重试
    [AiErrorType.MODEL_NOT_FOUND]: 0, // 不重试
    [AiErrorType.INSUFFICIENT_RESOURCES]: 10000, // 资源不足：10秒
    [AiErrorType.CONFIG_ERROR]: 0, // 不重试
    [AiErrorType.PERMISSION_DENIED]: 0, // 不重试
    [AiErrorType.UNKNOWN]: 3000, // 未知错误：3秒
  };

  const baseDelay = baseDelays[type] || 3000;

  // 如果基础延迟为 0，直接返回
  if (baseDelay === 0) {
    return 0;
  }

  // 指数退避策略：delay = baseDelay * (2 ^ (attempt - 1))
  // 最大延迟不超过 60 秒
  const exponentialDelay = baseDelay * Math.pow(2, attempt - 1);
  return Math.min(exponentialDelay, 60000);
};

/**
 * 解析错误类型
 * 从原始错误对象中解析出具体的错误类型
 * @param error - 原始错误对象
 * @returns AI 错误类型
 */
export const parseErrorType = (error: Error): AiErrorType => {
  const message = error.message.toLowerCase();

  // 超时错误
  if (message.includes("timeout") || message.includes("超时")) {
    return AiErrorType.TIMEOUT;
  }

  // 网络错误
  if (
    message.includes("network") ||
    message.includes("网络") ||
    message.includes("fetch") ||
    message.includes("failed to fetch") ||
    message.includes("networkerror")
  ) {
    return AiErrorType.NETWORK;
  }

  // API 限流
  if (
    message.includes("rate limit") ||
    message.includes("频率") ||
    message.includes("too many requests") ||
    message.includes("429")
  ) {
    return AiErrorType.RATE_LIMIT;
  }

  // API Key 无效
  if (
    message.includes("api key") ||
    message.includes("unauthorized") ||
    message.includes("401") ||
    message.includes("invalid key") ||
    message.includes("authentication")
  ) {
    return AiErrorType.API_KEY_INVALID;
  }

  // 权限不足
  if (
    message.includes("permission") ||
    message.includes("forbidden") ||
    message.includes("403") ||
    message.includes("权限")
  ) {
    return AiErrorType.PERMISSION_DENIED;
  }

  // 模型未找到
  if (message.includes("model") && message.includes("not found")) {
    return AiErrorType.MODEL_NOT_FOUND;
  }

  // 模型加载失败
  if (
    message.includes("model") &&
    (message.includes("load") || message.includes("加载"))
  ) {
    return AiErrorType.MODEL_LOAD_FAILED;
  }

  // 资源不足
  if (
    message.includes("memory") ||
    message.includes("内存") ||
    message.includes("resources") ||
    message.includes("oom") ||
    message.includes("out of memory")
  ) {
    return AiErrorType.INSUFFICIENT_RESOURCES;
  }

  // 配置错误
  if (
    message.includes("config") ||
    message.includes("配置") ||
    message.includes("invalid") ||
    message.includes("missing")
  ) {
    return AiErrorType.CONFIG_ERROR;
  }

  // 无效响应
  if (
    message.includes("invalid response") ||
    message.includes("parse") ||
    message.includes("json") ||
    message.includes("format")
  ) {
    return AiErrorType.INVALID_RESPONSE;
  }

  // 初始化失败
  if (
    message.includes("initialization") ||
    message.includes("初始化") ||
    message.includes("setup")
  ) {
    return AiErrorType.INITIALIZATION;
  }

  return AiErrorType.UNKNOWN;
};

/**
 * AI 错误处理器 Composable
 * 提供完整的错误处理、记录和重试机制
 * @returns 错误处理器相关的方法和状态
 */
export function useAiErrorHandler() {
  const errors = ref<AiError[]>([]);
  const maxErrors = 50;

  /** 最后一次错误 */
  const lastError = computed(() => errors.value[0] || null);

  /** 错误总数 */
  const errorCount = computed(() => errors.value.length);

  /** 是否存在可恢复的错误 */
  const hasRecoverableError = computed(() =>
    errors.value.some((e) => e.recoverable),
  );

  /**
   * 记录错误
   * 将错误添加到错误列表，并自动解析错误类型
   * @param error - 错误对象或 AI 错误对象
   * @param context - 错误上下文信息
   * @returns AI 错误对象
   */
  const logError = (error: Error | AiError, context?: string): AiError => {
    let aiError: AiError;

    // 如果已经是 AiError 对象，直接使用
    if ("type" in error && "recoverable" in error) {
      aiError = error as AiError;
    } else {
      // 否则解析错误类型并创建 AiError
      const type = parseErrorType(error as Error);
      aiError = createAiError(type, (error as Error).message, error as Error);
    }

    // 添加上下文信息
    if (context) {
      aiError.message = `${context}: ${aiError.message}`;
    }

    // 添加到错误列表开头
    errors.value.unshift(aiError);

    // 限制错误列表长度
    if (errors.value.length > maxErrors) {
      errors.value = errors.value.slice(0, maxErrors);
    }

    // 控制台输出错误信息
    console.error("[AI Error]", {
      type: aiError.type,
      category: aiError.category,
      severity: aiError.severity,
      message: aiError.message,
      recoverable: aiError.recoverable,
      suggestedAction: aiError.suggestedAction,
      userFriendlyMessage: getUserFriendlyMessage(aiError),
    });

    return aiError;
  };

  /**
   * 清除所有错误
   */
  const clearErrors = (): void => {
    errors.value = [];
  };

  /**
   * 清除特定类型的错误
   * @param type - 要清除的错误类型
   */
  const clearErrorsByType = (type: AiErrorType): void => {
    errors.value = errors.value.filter((e) => e.type !== type);
  };

  /**
   * 清除特定分类的错误
   * @param category - 要清除的错误分类
   */
  const clearErrorsByCategory = (category: AiErrorCategory): void => {
    errors.value = errors.value.filter((e) => e.category !== category);
  };

  /**
   * 清除特定严重级别的错误
   * @param severity - 要清除的错误严重级别
   */
  const clearErrorsBySeverity = (severity: AiErrorSeverity): void => {
    errors.value = errors.value.filter((e) => e.severity !== severity);
  };

  /**
   * 获取错误统计
   * 按类型、分类和严重级别统计错误数量
   */
  const getErrorStats = computed(() => {
    const statsByType: Record<AiErrorType, number> = {} as Record<
      AiErrorType,
      number
    >;
    const statsByCategory: Record<AiErrorCategory, number> = {} as Record<
      AiErrorCategory,
      number
    >;
    const statsBySeverity: Record<AiErrorSeverity, number> = {} as Record<
      AiErrorSeverity,
      number
    >;

    // 初始化统计对象
    for (const type of Object.values(AiErrorType)) {
      statsByType[type] = 0;
    }
    for (const category of Object.values(AiErrorCategory)) {
      statsByCategory[category] = 0;
    }
    for (const severity of Object.values(AiErrorSeverity)) {
      statsBySeverity[severity] = 0;
    }

    // 统计错误数量
    for (const error of errors.value) {
      statsByType[error.type]++;
      if (error.category) {
        statsByCategory[error.category]++;
      }
      if (error.severity) {
        statsBySeverity[error.severity]++;
      }
    }

    return {
      byType: statsByType,
      byCategory: statsByCategory,
      bySeverity: statsBySeverity,
      total: errors.value.length,
    };
  });

  /**
   * 重试操作
   * 自动重试失败的操作，支持指数退避策略
   * @param operation - 要执行的操作
   * @param maxRetries - 最大重试次数
   * @param baseDelayMs - 基础延迟时间（毫秒）
   * @returns 操作结果
   */
  const withRetry = async <T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    baseDelayMs?: number,
  ): Promise<T> => {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        const aiError = createAiError(
          parseErrorType(lastError),
          lastError.message,
          lastError,
        );
        aiError.retryCount = attempt - 1;

        // 判断是否应该重试
        if (!shouldRetry(aiError)) {
          throw lastError;
        }

        // 如果还有重试机会，等待后重试
        if (attempt < maxRetries) {
          const delay = baseDelayMs || getRetryDelay(aiError, attempt);
          console.log(`[AI] 重试 ${attempt}/${maxRetries}，等待 ${delay}ms...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError;
  };

  return {
    // 状态
    errors: computed(() => errors.value),
    lastError,
    errorCount,
    hasRecoverableError,
    errorStats: getErrorStats,

    // 方法
    logError,
    clearErrors,
    clearErrorsByType,
    clearErrorsByCategory,
    clearErrorsBySeverity,
    withRetry,

    // 工具函数
    createAiError,
    parseErrorType,
    getErrorCategory,
    getErrorSeverity,
    getUserFriendlyMessage,
    getRecoverySuggestion,
    isRecoverable,
    shouldRetry,
    getRetryDelay,

    // 枚举
    AiErrorType,
    AiErrorCategory,
    AiErrorSeverity,
  };
}
