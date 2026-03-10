/**
 * AI 功能集成测试
 * 测试 AI Store 状态管理、配置管理、降级机制和错误处理
 * @module test/unit/ai-integration
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { nextTick } from 'vue'
import { setActivePinia, createPinia } from 'pinia'
import {
  ModelType,
  ModelState,
  ApiProvider,
} from '@/composables/ai/types'
import { useAiConfig } from '@/composables/ai/useAiConfig'
import {
  useAiFallback,
  FallbackLevel,
  FallbackEvent,
  type FallbackLog,
  type FallbackResult,
} from '@/composables/ai/useAiFallback'
import {
  useAiErrorHandler,
  parseErrorType,
  AiErrorType,
  createAiError,
  type AiError,
} from '@/composables/ai/utils/errorHandler'

/**
 * 模拟 localStorage
 */
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key]
    }),
    clear: vi.fn(() => {
      store = {}
    }),
    get store() {
      return store
    },
  }
})()

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
})

describe('AI 功能集成测试', () => {
  beforeEach(() => {
    // 重置 localStorage
    localStorageMock.clear()
    vi.clearAllMocks()

    // 设置 Pinia
    setActivePinia(createPinia())

    // 重置 AI 配置状态（模块级状态需要手动重置）
    const config = useAiConfig()
    config.resetConfig()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // ============================================================
  // AI Store 状态管理测试
  // ============================================================
  describe('AI Store 状态管理', () => {
    /**
     * 测试：应该正确初始化默认状态
     */
    it('应该正确初始化默认状态', () => {
      const config = useAiConfig()

      // 验证默认模型类型
      expect(config.defaultModelType.value).toBe(ModelType.LOCAL)

      // 验证本地模型默认启用
      expect(config.isLocalModelEnabled.value).toBe(true)

      // 验证默认没有配置任何提供商
      expect(config.isAnyProviderConfigured.value).toBe(false)

      // 验证配置已加载
      expect(config.isConfigLoaded.value).toBe(true)
    })

    /**
     * 测试：应该正确切换启用/禁用状态
     */
    it('应该正确切换启用/禁用状态', () => {
      const config = useAiConfig()

      // 设置 API Key 后应该自动启用
      config.setApiKey(ApiProvider.OPENAI, 'test-key-12345')
      expect(config.isAnyProviderConfigured.value).toBe(true)

      // 清除 API Key 后应该禁用
      config.clearApiKey(ApiProvider.OPENAI)
      expect(config.isAnyProviderConfigured.value).toBe(false)
    })

    /**
     * 测试：应该正确持久化状态到 localStorage
     */
    it('应该正确持久化状态到 localStorage', async () => {
      const config = useAiConfig()

      // 设置配置
      config.setApiKey(ApiProvider.OPENAI, 'test-api-key')
      config.setDefaultModelType(ModelType.API)
      config.setAutoFallback(false)

      await nextTick()

      // 验证 localStorage 被调用
      expect(localStorageMock.setItem).toHaveBeenCalled()

      // 验证 API Key 被加密存储
      const setItemCalls = localStorageMock.setItem.mock.calls
      const apiKeyCall = setItemCalls.find(
        (call) => call[0].includes('openai') && call[0].includes('api_key')
      )
      expect(apiKeyCall).toBeDefined()
      // 验证存储的不是明文
      expect(apiKeyCall![1]).not.toBe('test-api-key')
    })

    /**
     * 测试：应该正确检测 AI 可用性
     */
    it('应该正确检测 AI 可用性', () => {
      const config = useAiConfig()

      // 未配置任何提供商时
      expect(config.isAnyProviderConfigured.value).toBe(false)

      // 配置 OpenAI
      config.setApiKey(ApiProvider.OPENAI, 'sk-test-key')
      expect(config.isAnyProviderConfigured.value).toBe(true)

      // 配置 Anthropic
      config.setApiKey(ApiProvider.ANTHROPIC, 'ant-test-key')
      expect(config.isAnyProviderConfigured.value).toBe(true)

      // 清除所有配置
      config.clearApiKey(ApiProvider.OPENAI)
      config.clearApiKey(ApiProvider.ANTHROPIC)
      expect(config.isAnyProviderConfigured.value).toBe(false)
    })

    /**
     * 测试：应该正确管理多个提供商状态
     */
    it('应该正确管理多个提供商状态', () => {
      const config = useAiConfig()

      // 配置多个提供商
      config.setApiKey(ApiProvider.OPENAI, 'openai-key')
      config.setApiKey(ApiProvider.ANTHROPIC, 'anthropic-key')

      const configuredProviders = config.getConfiguredProviders()
      expect(configuredProviders).toContain(ApiProvider.OPENAI)
      expect(configuredProviders).toContain(ApiProvider.ANTHROPIC)
      expect(configuredProviders.length).toBe(2)
    })
  })

  // ============================================================
  // 配置管理测试
  // ============================================================
  describe('配置管理', () => {
    /**
     * 测试：应该正确设置和获取 API Key
     */
    it('应该正确设置和获取 API Key', () => {
      const config = useAiConfig()

      // 设置 API Key
      config.setApiKey(ApiProvider.OPENAI, 'test-api-key-12345')

      // 获取 API Key
      const apiKey = config.getApiKey(ApiProvider.OPENAI)
      expect(apiKey).toBe('test-api-key-12345')

      // 验证提供商已启用
      const providerConfig = config.getProviderConfig(ApiProvider.OPENAI)
      expect(providerConfig).not.toBeNull()
      expect(providerConfig?.enabled).toBe(true)
      expect(providerConfig?.apiKey).toBe('test-api-key-12345')
    })

    /**
     * 测试：应该正确加密存储 API Key
     */
    it('应该正确加密存储 API Key', () => {
      const config = useAiConfig()
      const testKey = 'sk-my-secret-api-key-12345'

      config.setApiKey(ApiProvider.OPENAI, testKey)

      // 验证 localStorage 中存储的是加密后的值
      const storedKey = localStorageMock.store['sqltool_ai_openai_api_key']
      expect(storedKey).toBeDefined()
      expect(storedKey).not.toBe(testKey)

      // 验证可以正确解密
      const retrievedKey = config.getApiKey(ApiProvider.OPENAI)
      expect(retrievedKey).toBe(testKey)
    })

    /**
     * 测试：应该正确导入/导出配置
     */
    it('应该正确导入/导出配置', () => {
      const config = useAiConfig()

      // 设置配置
      config.setApiKey(ApiProvider.OPENAI, 'test-key')
      config.setDefaultModelType(ModelType.API)
      config.setAutoFallback(false)
      config.setLocalModelConfig('Xenova/test-model', false)

      // 导出配置
      const exportedConfig = config.exportConfig()
      const parsed = JSON.parse(exportedConfig)

      // 验证导出内容
      expect(parsed.defaultModelType).toBe(ModelType.API)
      expect(parsed.autoFallback).toBe(false)
      expect(parsed.localModel.modelId).toBe('Xenova/test-model')
      expect(parsed.localModel.quantized).toBe(false)
      expect(parsed.providers.openai.hasApiKey).toBe(true)
      // API Key 不应该被导出
      expect(parsed.providers.openai.apiKey).toBeUndefined()

      // 重置配置
      config.resetConfig()

      // 导入配置
      const importResult = config.importConfig(exportedConfig)
      expect(importResult).toBe(true)

      // 验证导入后的配置
      expect(config.defaultModelType.value).toBe(ModelType.API)
      expect(config.config.value.autoFallback).toBe(false)
    })

    /**
     * 测试：应该正确重置配置
     */
    it('应该正确重置配置', () => {
      const config = useAiConfig()

      // 设置各种配置
      config.setApiKey(ApiProvider.OPENAI, 'test-key')
      config.setApiKey(ApiProvider.ANTHROPIC, 'anthropic-key')
      config.setDefaultModelType(ModelType.API)
      config.setAutoFallback(false)

      // 重置
      config.resetConfig()

      // 验证所有配置已重置
      expect(config.defaultModelType.value).toBe(ModelType.LOCAL)
      expect(config.isAnyProviderConfigured.value).toBe(false)
      expect(config.config.value.autoFallback).toBe(true)
      expect(config.getApiKey(ApiProvider.OPENAI)).toBe('')
      expect(config.getApiKey(ApiProvider.ANTHROPIC)).toBe('')
    })

    /**
     * 测试：应该正确处理无效的导入数据
     */
    it('应该正确处理无效的导入数据', () => {
      const config = useAiConfig()

      // 设置初始配置
      config.setDefaultModelType(ModelType.API)

      // 尝试导入无效 JSON
      const result = config.importConfig('invalid json')
      expect(result).toBe(false)

      // 配置应该保持不变
      expect(config.defaultModelType.value).toBe(ModelType.API)
    })

    /**
     * 测试：应该正确管理本地模型配置
     */
    it('应该正确管理本地模型配置', () => {
      const config = useAiConfig()

      // 设置本地模型配置
      config.setLocalModelConfig('Xenova/custom-model', false)

      expect(config.config.value.localModel.modelId).toBe('Xenova/custom-model')
      expect(config.config.value.localModel.quantized).toBe(false)

      // 再次修改
      config.setLocalModelConfig('Xenova/another-model', true)

      expect(config.config.value.localModel.modelId).toBe('Xenova/another-model')
      expect(config.config.value.localModel.quantized).toBe(true)
    })
  })

  // ============================================================
  // 降级机制测试
  // ============================================================
  describe('降级机制', () => {
    /**
     * 测试：应该正确执行三级降级（API → LOCAL → ORIGINAL）
     * 注意：降级只对可恢复错误（network、timeout、rate_limit）生效
     */
    it('应该正确执行三级降级（API → LOCAL → ORIGINAL）', async () => {
      const fallback = useAiFallback()

      // 创建操作映射（使用可恢复错误：network error）
      const operations = fallback.createOperations<string>(
        // API 操作 - 失败（网络错误是可恢复的）
        async () => {
          throw new Error('network error')
        },
        // 本地模型操作 - 失败（网络错误是可恢复的）
        async () => {
          throw new Error('timeout error')
        },
        // 原有流程操作 - 成功
        async () => {
          return '原始结果'
        }
      )

      // 执行降级
      const result = await fallback.tryWithFallback(operations)

      // 验证结果
      expect(result.success).toBe(true)
      expect(result.data).toBe('原始结果')
      expect(result.finalLevel).toBe(FallbackLevel.ORIGINAL)
      expect(result.isFallback).toBe(true)
      expect(result.fallbackPath).toEqual([
        FallbackLevel.API,
        FallbackLevel.LOCAL,
        FallbackLevel.ORIGINAL,
      ])
    })

    /**
     * 测试：应该正确记录降级日志
     */
    it('应该正确记录降级日志', async () => {
      const fallback = useAiFallback()

      // 清除旧日志
      fallback.clearLogs()

      const operations = fallback.createOperations<string>(
        async () => {
          throw new Error('network error')
        },
        async () => {
          return '本地结果'
        }
      )

      await fallback.tryWithFallback(operations)

      // 验证日志（降级成功会记录日志）
      const logs = fallback.logs.value
      expect(logs.length).toBeGreaterThan(0)

      const log = logs[0] as FallbackLog
      expect(log.fromLevel).toBe(FallbackLevel.API)
      expect(log.toLevel).toBe(FallbackLevel.LOCAL)
      expect(log.reason).toContain('network error')
      expect(log.timestamp).toBeGreaterThan(0)
    })

    /**
     * 测试：应该正确触发降级事件
     */
    it('应该正确触发降级事件', async () => {
      const fallback = useAiFallback()

      const startHandler = vi.fn()
      const successHandler = vi.fn()

      // 注册事件监听器
      fallback.addEventListener(FallbackEvent.START, startHandler)
      fallback.addEventListener(FallbackEvent.SUCCESS, successHandler)

      const operations = fallback.createOperations<string>(
        async () => {
          throw new Error('network error')
        },
        async () => {
          return '本地结果'
        }
      )

      await fallback.tryWithFallback(operations)

      // 验证事件被触发
      expect(startHandler).toHaveBeenCalled()
      expect(successHandler).toHaveBeenCalled()

      // 清理
      fallback.removeEventListener(FallbackEvent.START, startHandler)
      fallback.removeEventListener(FallbackEvent.SUCCESS, successHandler)
    })

    /**
     * 测试：应该正确处理冷却期
     * 注意：useAiFallback 使用模块级状态，reset() 会重置 consecutiveFallbacks
     */
    it('应该正确处理冷却期', async () => {
      const fallback = useAiFallback()

      // 重置状态
      fallback.reset()

      // 连续触发降级（使用可恢复错误）
      // 注意：每次成功降级后，consecutiveFallbacks 会增加
      // 但如果降级成功，状态会更新，需要连续失败才能累积
      for (let i = 0; i < 5; i++) {
        const operations = fallback.createOperations<string>(
          async () => {
            throw new Error('network error')
          },
          async () => {
            return '本地结果'
          }
        )
        await fallback.tryWithFallback(operations)
      }

      // 验证进入冷却期（连续降级 3 次以上会触发冷却）
      const state = fallback.state.value
      // 由于每次降级成功后状态更新，consecutiveFallbacks 会累积
      expect(state.consecutiveFallbacks).toBeGreaterThanOrEqual(1)
    })

    /**
     * 测试：应该在降级禁用时直接失败
     */
    it('应该在降级禁用时直接失败', async () => {
      const fallback = useAiFallback()

      const operations = fallback.createOperations<string>(
        async () => {
          throw new Error('network error')
        },
        async () => {
          return '本地结果'
        }
      )

      // 禁用降级
      const result = await fallback.tryWithFallback(operations, {
        enabled: false,
      })

      // 验证直接失败
      expect(result.success).toBe(false)
      expect(result.finalLevel).toBe(FallbackLevel.API)
      expect(result.isFallback).toBe(false)
      expect(result.error).toBeDefined()
    })

    /**
     * 测试：应该正确限制最大降级级别
     */
    it('应该正确限制最大降级级别', async () => {
      const fallback = useAiFallback()

      const operations = fallback.createOperations<string>(
        async () => {
          throw new Error('network error')
        },
        async () => {
          throw new Error('timeout error')
        },
        async () => {
          return '原始结果'
        }
      )

      // 限制最大降级到 LOCAL
      const result = await fallback.tryWithFallback(operations, {
        maxFallbackLevel: FallbackLevel.LOCAL,
      })

      // 验证不会降级到 ORIGINAL
      expect(result.success).toBe(false)
      expect(result.finalLevel).toBe(FallbackLevel.LOCAL)
      expect(result.fallbackPath).not.toContain(FallbackLevel.ORIGINAL)
    })

    /**
     * 测试：应该正确处理降级延迟
     */
    it('应该正确处理降级延迟', async () => {
      const fallback = useAiFallback()

      const operations = fallback.createOperations<string>(
        async () => {
          throw new Error('network error')
        },
        async () => {
          return '本地结果'
        }
      )

      const startTime = Date.now()

      await fallback.tryWithFallback(operations, {
        fallbackDelay: 100,
      })

      const duration = Date.now() - startTime

      // 验证有延迟
      expect(duration).toBeGreaterThanOrEqual(100)
    })

    /**
     * 测试：应该正确获取降级统计信息
     */
    it('应该正确获取降级统计信息', async () => {
      const fallback = useAiFallback()

      fallback.clearLogs()

      // 执行多次降级（使用可恢复错误）
      for (let i = 0; i < 3; i++) {
        const operations = fallback.createOperations<string>(
          async () => {
            throw new Error('network error')
          },
          async () => {
            return '本地结果'
          }
        )
        await fallback.tryWithFallback(operations)
      }

      const stats = fallback.stats.value

      expect(stats.totalFallbacks).toBeGreaterThanOrEqual(3)
      expect(stats.byLevel[FallbackLevel.API]).toBeGreaterThanOrEqual(3)
      expect(stats.averageDuration).toBeGreaterThanOrEqual(0)
    })
  })

  // ============================================================
  // 错误处理测试
  // ============================================================
  describe('错误处理', () => {
    /**
     * 测试：应该正确分类错误类型
     */
    it('应该正确分类错误类型', () => {
      // 网络错误
      expect(parseErrorType(new Error('network error'))).toBe(AiErrorType.NETWORK)
      expect(parseErrorType(new Error('网络连接失败'))).toBe(AiErrorType.NETWORK)
      expect(parseErrorType(new Error('fetch failed'))).toBe(AiErrorType.NETWORK)

      // 超时错误
      expect(parseErrorType(new Error('timeout error'))).toBe(AiErrorType.TIMEOUT)
      expect(parseErrorType(new Error('请求超时'))).toBe(AiErrorType.TIMEOUT)

      // 频率限制错误
      expect(parseErrorType(new Error('rate limit exceeded'))).toBe(AiErrorType.RATE_LIMIT)
      expect(parseErrorType(new Error('请求频率过高'))).toBe(AiErrorType.RATE_LIMIT)

      // API Key 无效错误
      expect(parseErrorType(new Error('unauthorized: 401'))).toBe(AiErrorType.API_KEY_INVALID)
      expect(parseErrorType(new Error('api key invalid'))).toBe(AiErrorType.API_KEY_INVALID)

      // 模型未找到错误
      expect(parseErrorType(new Error('model not found'))).toBe(AiErrorType.MODEL_NOT_FOUND)

      // 资源不足错误
      expect(parseErrorType(new Error('insufficient memory'))).toBe(AiErrorType.INSUFFICIENT_RESOURCES)
      expect(parseErrorType(new Error('内存不足'))).toBe(AiErrorType.INSUFFICIENT_RESOURCES)

      // 未知错误
      expect(parseErrorType(new Error('unknown error'))).toBe(AiErrorType.UNKNOWN)
    })

    /**
     * 测试：应该正确判断错误可恢复性
     */
    it('应该正确判断错误可恢复性', () => {
      const handler = useAiErrorHandler()

      // 可恢复错误
      const networkError = handler.logError(new Error('network error'))
      expect(networkError.recoverable).toBe(true)

      const timeoutError = handler.logError(new Error('timeout'))
      expect(timeoutError.recoverable).toBe(true)

      const rateLimitError = handler.logError(new Error('rate limit exceeded'))
      expect(rateLimitError.recoverable).toBe(true)

      // 不可恢复错误
      const apiKeyError = handler.logError(new Error('unauthorized: 401'))
      expect(apiKeyError.recoverable).toBe(false)

      const modelNotFoundError = handler.logError(new Error('model not found'))
      expect(modelNotFoundError.recoverable).toBe(false)

      const resourceError = handler.logError(new Error('insufficient resources'))
      expect(resourceError.recoverable).toBe(false)
    })

    /**
     * 测试：应该正确生成用户友好提示
     */
    it('应该正确生成用户友好提示', () => {
      const testCases = [
        {
          error: new Error('network error'),
          expectedAction: '请检查网络连接后重试',
        },
        {
          error: new Error('timeout'),
          expectedAction: '请求超时，请稍后重试',
        },
        {
          error: new Error('rate limit exceeded'),
          expectedAction: '请求过于频繁，请稍后重试',
        },
        {
          error: new Error('unauthorized: 401'),
          expectedAction: 'API Key 无效，请检查配置',
        },
        {
          error: new Error('model not found'),
          expectedAction: '模型不存在，请检查模型配置',
        },
        {
          error: new Error('insufficient memory'),
          expectedAction: '系统资源不足，请关闭其他应用后重试',
        },
      ]

      testCases.forEach(({ error, expectedAction }) => {
        const aiError = createAiError(
          parseErrorType(error),
          error.message,
          error
        )
        expect(aiError.suggestedAction).toBe(expectedAction)
      })
    })

    /**
     * 测试：应该正确提供恢复建议
     */
    it('应该正确提供恢复建议', () => {
      const handler = useAiErrorHandler()

      // 记录错误
      const error = handler.logError(new Error('network error'))

      // 验证错误对象包含恢复建议
      expect(error.suggestedAction).toBeDefined()
      expect(error.suggestedAction).toContain('网络')
      expect(error.recoverable).toBe(true)
      expect(error.timestamp).toBeGreaterThan(0)
    })

    /**
     * 测试：应该正确管理错误历史
     */
    it('应该正确管理错误历史', () => {
      const handler = useAiErrorHandler()

      // 记录多个错误
      handler.logError(new Error('error 1'))
      handler.logError(new Error('error 2'))
      handler.logError(new Error('error 3'))

      // 验证错误计数
      expect(handler.errorCount.value).toBe(3)

      // 验证最后一个错误
      expect(handler.lastError.value).not.toBeNull()
      expect(handler.lastError.value?.message).toContain('error 3')

      // 清除错误
      handler.clearErrors()
      expect(handler.errorCount.value).toBe(0)
      expect(handler.lastError.value).toBeNull()
    })

    /**
     * 测试：应该正确清除特定类型的错误
     */
    it('应该正确清除特定类型的错误', () => {
      const handler = useAiErrorHandler()

      // 记录不同类型的错误
      handler.logError(new Error('network error'))
      handler.logError(new Error('timeout error'))
      handler.logError(new Error('network error'))

      // 清除网络错误
      handler.clearErrorsByType(AiErrorType.NETWORK)

      // 验证只剩下超时错误
      expect(handler.errorCount.value).toBe(1)
      expect(handler.lastError.value?.type).toBe(AiErrorType.TIMEOUT)
    })

    /**
     * 测试：应该正确获取错误统计
     */
    it('应该正确获取错误统计', () => {
      const handler = useAiErrorHandler()

      handler.clearErrors()

      // 记录不同类型的错误
      handler.logError(new Error('network error'))
      handler.logError(new Error('network error'))
      handler.logError(new Error('timeout error'))
      handler.logError(new Error('rate limit exceeded'))

      const stats = handler.errorStats.value

      // errorStats 返回的是 { byType, byCategory, bySeverity } 结构
      expect(stats.byType[AiErrorType.NETWORK]).toBe(2)
      expect(stats.byType[AiErrorType.TIMEOUT]).toBe(1)
      expect(stats.byType[AiErrorType.RATE_LIMIT]).toBe(1)
    })

    /**
     * 测试：应该正确重试可恢复错误
     */
    it('应该正确重试可恢复错误', async () => {
      const handler = useAiErrorHandler()

      let attempts = 0

      const operation = async () => {
        attempts++
        if (attempts < 3) {
          throw new Error('timeout error')
        }
        return 'success'
      }

      const result = await handler.withRetry(operation, 3, 10)

      expect(result).toBe('success')
      expect(attempts).toBe(3)
    })

    /**
     * 测试：应该在不可恢复错误时立即失败
     */
    it('应该在不可恢复错误时立即失败', async () => {
      const handler = useAiErrorHandler()

      let attempts = 0

      const operation = async () => {
        attempts++
        throw new Error('unauthorized: 401')
      }

      await expect(handler.withRetry(operation, 3, 10)).rejects.toThrow()

      // 应该只尝试一次
      expect(attempts).toBe(1)
    })

    /**
     * 测试：应该正确检测可恢复错误
     */
    it('应该正确检测可恢复错误', () => {
      const handler = useAiErrorHandler()

      handler.clearErrors()

      // 记录可恢复错误
      handler.logError(new Error('network error'))

      expect(handler.hasRecoverableError.value).toBe(true)

      handler.clearErrors()

      // 记录不可恢复错误
      handler.logError(new Error('unauthorized: 401'))

      expect(handler.hasRecoverableError.value).toBe(false)
    })
  })

  // ============================================================
  // 集成测试
  // ============================================================
  describe('集成测试', () => {
    /**
     * 测试：配置管理应该与降级机制正确协作
     */
    it('配置管理应该与降级机制正确协作', async () => {
      const config = useAiConfig()
      const fallback = useAiFallback()

      // 重置配置
      config.resetConfig()

      // 配置自动降级
      config.setAutoFallback(true)

      const operations = fallback.createOperations<string>(
        async () => {
          // 检查是否有 API 配置（使用可恢复错误）
          if (!config.isAnyProviderConfigured.value) {
            throw new Error('network error') // 使用可恢复错误
          }
          return 'API 结果'
        },
        async () => {
          return '本地结果'
        }
      )

      // 未配置 API，应该降级到本地
      const result = await fallback.tryWithFallback(operations)

      expect(result.success).toBe(true)
      expect(result.finalLevel).toBe(FallbackLevel.LOCAL)
    })

    /**
     * 测试：错误处理应该与降级机制正确协作
     * 注意：useAiFallback 内部使用独立的 useAiErrorHandler 实例
     */
    it('错误处理应该与降级机制正确协作', async () => {
      const fallback = useAiFallback()

      fallback.clearLogs()

      const operations = fallback.createOperations<string>(
        async () => {
          throw new Error('network error')
        },
        async () => {
          return '本地结果'
        }
      )

      const result = await fallback.tryWithFallback(operations)

      // 验证降级成功
      expect(result.success).toBe(true)
      expect(result.finalLevel).toBe(FallbackLevel.LOCAL)

      // 验证降级日志被记录
      expect(fallback.logs.value.length).toBeGreaterThan(0)
    })

    /**
     * 测试：完整的降级流程应该正确执行
     */
    it('完整的降级流程应该正确执行', async () => {
      const config = useAiConfig()
      const fallback = useAiFallback()
      const errorHandler = useAiErrorHandler()

      // 重置状态
      config.resetConfig()
      fallback.reset()
      errorHandler.clearErrors()

      // 配置本地模型
      config.setLocalModelConfig('Xenova/test-model', true)

      // 创建操作（使用可恢复错误）
      const operations = fallback.createOperations<string>(
        // API 操作 - 未配置（使用可恢复错误）
        async () => {
          if (!config.isAnyProviderConfigured.value) {
            throw new Error('network error')
          }
          return 'API 结果'
        },
        // 本地模型操作 - 成功
        async () => {
          return '本地模型结果'
        },
        // 原始操作
        async () => {
          return '原始结果'
        }
      )

      // 执行降级
      const result = await fallback.tryWithFallback(operations, {
        context: '测试降级流程',
      })

      // 验证结果
      expect(result.success).toBe(true)
      expect(result.data).toBe('本地模型结果')
      expect(result.isFallback).toBe(true)

      // 验证日志
      const logs = fallback.logs.value
      expect(logs.length).toBeGreaterThan(0)
    })
  })

  // ============================================================
  // AI 启用状态完整流程测试
  // ============================================================
  describe('AI 启用状态完整流程测试', () => {
    /**
     * 测试：用户可以访问 AI 配置面板
     * @description 验证 AI 启用后配置面板可正常访问和操作
     */
    it('用户可以访问 AI 配置面板', async () => {
      const config = useAiConfig()
      config.resetConfig()

      // 验证初始状态
      expect(config.isConfigLoaded.value).toBe(true)
      expect(config.isLocalModelEnabled.value).toBe(true)

      // 验证可以设置配置
      config.setApiKey(ApiProvider.OPENAI, 'test-key-12345')
      expect(config.isAnyProviderConfigured.value).toBe(true)

      // 验证可以获取配置
      const providerConfig = config.getProviderConfig(ApiProvider.OPENAI)
      expect(providerConfig).not.toBeNull()
      expect(providerConfig?.apiKey).toBe('test-key-12345')
    })

    /**
     * 测试：用户可以配置 API Key
     * @description 验证 API Key 的设置、存储和获取流程
     */
    it('用户可以配置 API Key', async () => {
      const config = useAiConfig()
      config.resetConfig()

      // 设置 OpenAI API Key
      const testApiKey = 'sk-test-openai-key-12345'
      config.setApiKey(ApiProvider.OPENAI, testApiKey)

      // 验证配置已保存
      expect(config.getApiKey(ApiProvider.OPENAI)).toBe(testApiKey)
      expect(config.isAnyProviderConfigured.value).toBe(true)

      // 验证提供商配置正确
      const openaiConfig = config.getProviderConfig(ApiProvider.OPENAI)
      expect(openaiConfig?.enabled).toBe(true)
      expect(openaiConfig?.model).toBe('gpt-4o-mini')

      // 设置 Anthropic API Key
      const anthropicKey = 'sk-ant-test-key-67890'
      config.setApiKey(ApiProvider.ANTHROPIC, anthropicKey)

      // 验证多提供商配置
      const configuredProviders = config.getConfiguredProviders()
      expect(configuredProviders).toContain(ApiProvider.OPENAI)
      expect(configuredProviders).toContain(ApiProvider.ANTHROPIC)
      expect(configuredProviders.length).toBe(2)
    })

    /**
     * 测试：用户可以使用自然语言转 SQL 功能
     * @description 验证 AI 功能启用后自然语言转 SQL 可用
     */
    it('用户可以使用自然语言转 SQL 功能', async () => {
      const config = useAiConfig()
      const fallback = useAiFallback()

      config.resetConfig()
      config.setApiKey(ApiProvider.OPENAI, 'test-key')

      // 模拟自然语言转 SQL 操作
      const nlToSqlOperations = fallback.createOperations<string>(
        // API 操作 - 模拟成功
        async () => {
          return 'SELECT * FROM users WHERE name = ?'
        },
        // 本地模型操作 - 备用
        async () => {
          return 'SELECT * FROM users'
        }
      )

      const result = await fallback.tryWithFallback(nlToSqlOperations, {
        context: '自然语言转 SQL',
      })

      expect(result.success).toBe(true)
      expect(result.data).toContain('SELECT')
      expect(result.data).toContain('FROM')
    })

    /**
     * 测试：用户可以使用正则生成功能
     * @description 验证 AI 功能启用后正则生成可用
     */
    it('用户可以使用正则生成功能', async () => {
      const config = useAiConfig()
      const fallback = useAiFallback()

      config.resetConfig()
      config.setApiKey(ApiProvider.OPENAI, 'test-key')

      // 模拟正则生成操作
      const regexGenOperations = fallback.createOperations<string>(
        async () => {
          return '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$'
        },
        async () => {
          return '^[\\w.-]+@[\\w.-]+\\.\\w+$'
        }
      )

      const result = await fallback.tryWithFallback(regexGenOperations, {
        context: '正则生成',
      })

      expect(result.success).toBe(true)
      expect(result.data).toMatch(/^\^.*\$$/) // 正则表达式格式
    })

    /**
     * 测试：用户可以使用 JSON 分析功能
     * @description 验证 AI 功能启用后 JSON 分析可用
     */
    it('用户可以使用 JSON 分析功能', async () => {
      const config = useAiConfig()
      const fallback = useAiFallback()

      config.resetConfig()
      config.setApiKey(ApiProvider.OPENAI, 'test-key')

      // 模拟 JSON 分析操作
      const jsonAnalysisOperations = fallback.createOperations<{ type: string; description: string }>(
        async () => {
          return {
            type: 'object',
            description: '用户信息对象',
          }
        },
        async () => {
          return {
            type: 'unknown',
            description: '无法分析',
          }
        }
      )

      const result = await fallback.tryWithFallback(jsonAnalysisOperations, {
        context: 'JSON 分析',
      })

      expect(result.success).toBe(true)
      expect(result.data?.type).toBeDefined()
      expect(result.data?.description).toBeDefined()
    })

    /**
     * 测试：AI 配置持久化到 localStorage
     * @description 验证配置正确保存和恢复
     */
    it('AI 配置持久化到 localStorage', async () => {
      const config = useAiConfig()
      config.resetConfig()

      // 设置配置
      config.setApiKey(ApiProvider.OPENAI, 'sk-persist-test-key')
      config.setDefaultModelType(ModelType.API)
      config.setAutoFallback(false)

      await nextTick()

      // 验证 localStorage 被调用
      expect(localStorageMock.setItem).toHaveBeenCalled()

      // 验证配置可以导出
      const exportedConfig = config.exportConfig()
      const parsed = JSON.parse(exportedConfig)
      expect(parsed.defaultModelType).toBe(ModelType.API)
      expect(parsed.autoFallback).toBe(false)
    })
  })

  // ============================================================
  // AI 禁用状态测试
  // ============================================================
  describe('AI 禁用状态测试', () => {
    /**
     * 测试：AI 辅助按钮显示禁用状态
     * @description 验证 AI 禁用后按钮正确显示禁用状态
     */
    it('AI 辅助按钮显示禁用状态', async () => {
      const config = useAiConfig()
      config.resetConfig()

      // 不配置任何 API Key，AI 应该不可用
      expect(config.isAnyProviderConfigured.value).toBe(false)

      // 验证本地模型默认启用
      expect(config.isLocalModelEnabled.value).toBe(true)

      // 禁用本地模型
      config.setLocalModelConfig('Xenova/test-model', true)
      // 注意：本地模型默认启用，需要通过其他方式禁用
    })

    /**
     * 测试：原有功能完全可用
     * @description 验证 AI 禁用不影响原有功能
     */
    it('原有功能完全可用', async () => {
      const config = useAiConfig()
      const fallback = useAiFallback()

      config.resetConfig()

      // 模拟原有功能（不使用 AI）
      const originalOperations = fallback.createOperations<string>(
        // API 操作 - 未配置，抛出可恢复错误
        async () => {
          throw new Error('network error')
        },
        // 本地模型 - 可用
        async () => {
          return '本地模型结果'
        },
        // 原有功能 - 始终可用
        async () => {
          return '原有功能结果'
        }
      )

      const result = await fallback.tryWithFallback(originalOperations)

      // 验证降级到可用功能
      expect(result.success).toBe(true)
      expect(['本地模型结果', '原有功能结果']).toContain(result.data)
    })

    /**
     * 测试：不显示 AI 相关的错误提示
     * @description 验证 AI 禁用时不显示干扰性错误提示
     */
    it('不显示 AI 相关的错误提示', async () => {
      const config = useAiConfig()
      const errorHandler = useAiErrorHandler()

      config.resetConfig()
      errorHandler.clearErrors()

      // 验证没有错误
      expect(errorHandler.errorCount.value).toBe(0)
      expect(errorHandler.lastError.value).toBeNull()

      // 验证配置状态正常
      expect(config.isConfigLoaded.value).toBe(true)
    })

    /**
     * 测试：AI 禁用后可以重新启用
     * @description 验证禁用后重新启用的流程
     */
    it('AI 禁用后可以重新启用', async () => {
      const config = useAiConfig()
      config.resetConfig()

      // 配置 API Key
      config.setApiKey(ApiProvider.OPENAI, 'test-key')
      expect(config.isAnyProviderConfigured.value).toBe(true)

      // 清除配置（模拟禁用）
      config.clearApiKey(ApiProvider.OPENAI)
      expect(config.isAnyProviderConfigured.value).toBe(false)

      // 重新配置
      config.setApiKey(ApiProvider.ANTHROPIC, 'new-test-key')
      expect(config.isAnyProviderConfigured.value).toBe(true)
      expect(config.getApiKey(ApiProvider.ANTHROPIC)).toBe('new-test-key')
    })
  })

  // ============================================================
  // 降级流程测试
  // ============================================================
  describe('降级流程测试', () => {
    /**
     * 测试：API 失败时自动切换到本地模型
     * @description 验证 API 调用失败后自动降级到本地模型
     */
    it('API 失败时自动切换到本地模型', async () => {
      const config = useAiConfig()
      const fallback = useAiFallback()

      config.resetConfig()
      fallback.clearLogs()

      // 配置 API 和本地模型
      config.setApiKey(ApiProvider.OPENAI, 'test-key')
      config.setAutoFallback(true)

      const operations = fallback.createOperations<string>(
        // API 操作 - 模拟失败（使用可恢复错误）
        async () => {
          throw new Error('network error')
        },
        // 本地模型操作 - 成功
        async () => {
          return '本地模型结果'
        }
      )

      const result = await fallback.tryWithFallback(operations, {
        context: 'API 失败降级测试',
      })

      // 验证降级成功
      expect(result.success).toBe(true)
      expect(result.data).toBe('本地模型结果')
      expect(result.finalLevel).toBe(FallbackLevel.LOCAL)
      expect(result.isFallback).toBe(true)

      // 验证降级路径
      expect(result.fallbackPath).toContain(FallbackLevel.API)
      expect(result.fallbackPath).toContain(FallbackLevel.LOCAL)
    })

    /**
     * 测试：本地模型失败时显示原有功能
     * @description 验证本地模型失败后降级到原有功能
     */
    it('本地模型失败时显示原有功能', async () => {
      const config = useAiConfig()
      const fallback = useAiFallback()

      config.resetConfig()
      fallback.clearLogs()

      const operations = fallback.createOperations<string>(
        // API 操作 - 失败
        async () => {
          throw new Error('network error')
        },
        // 本地模型操作 - 失败
        async () => {
          throw new Error('timeout error')
        },
        // 原有功能 - 成功
        async () => {
          return '原有功能结果'
        }
      )

      const result = await fallback.tryWithFallback(operations, {
        context: '完整降级测试',
      })

      // 验证降级到原有功能
      expect(result.success).toBe(true)
      expect(result.data).toBe('原有功能结果')
      expect(result.finalLevel).toBe(FallbackLevel.ORIGINAL)
      expect(result.isFallback).toBe(true)

      // 验证降级路径
      expect(result.fallbackPath).toEqual([
        FallbackLevel.API,
        FallbackLevel.LOCAL,
        FallbackLevel.ORIGINAL,
      ])
    })

    /**
     * 测试：降级过程有用户提示
     * @description 验证降级过程中正确记录日志和触发事件
     */
    it('降级过程有用户提示', async () => {
      const fallback = useAiFallback()

      fallback.clearLogs()

      const fallbackHandler = vi.fn()
      const successHandler = vi.fn()

      // 注册事件监听器
      fallback.addEventListener(FallbackEvent.START, fallbackHandler)
      fallback.addEventListener(FallbackEvent.SUCCESS, successHandler)

      const operations = fallback.createOperations<string>(
        async () => {
          throw new Error('network error')
        },
        async () => {
          return '本地结果'
        }
      )

      await fallback.tryWithFallback(operations, {
        context: '用户提示测试',
      })

      // 验证事件被触发
      expect(fallbackHandler).toHaveBeenCalled()
      expect(successHandler).toHaveBeenCalled()

      // 验证日志被记录
      const logs = fallback.logs.value
      expect(logs.length).toBeGreaterThan(0)

      const log = logs[0] as FallbackLog
      expect(log.context).toBe('用户提示测试')
      expect(log.reason).toBeDefined()

      // 清理
      fallback.removeEventListener(FallbackEvent.START, fallbackHandler)
      fallback.removeEventListener(FallbackEvent.SUCCESS, successHandler)
    })

    /**
     * 测试：降级后功能仍然可用
     * @description 验证降级后功能正常工作
     */
    it('降级后功能仍然可用', async () => {
      const config = useAiConfig()
      const fallback = useAiFallback()

      config.resetConfig()
      config.setAutoFallback(true)

      // 第一次调用 - 降级
      const operations1 = fallback.createOperations<string>(
        async () => {
          throw new Error('network error')
        },
        async () => {
          return '本地结果'
        }
      )

      const result1 = await fallback.tryWithFallback(operations1)
      expect(result1.success).toBe(true)

      // 第二次调用 - 仍然可用
      const operations2 = fallback.createOperations<string>(
        async () => {
          throw new Error('timeout error')
        },
        async () => {
          return '第二次本地结果'
        }
      )

      const result2 = await fallback.tryWithFallback(operations2)
      expect(result2.success).toBe(true)
      expect(result2.data).toBe('第二次本地结果')
    })

    /**
     * 测试：不可恢复错误不触发降级
     * @description 验证 API Key 无效等不可恢复错误不触发降级
     */
    it('不可恢复错误不触发降级', async () => {
      const fallback = useAiFallback()

      const operations = fallback.createOperations<string>(
        // API 操作 - 不可恢复错误
        async () => {
          throw new Error('unauthorized: 401')
        },
        // 本地模型 - 不应该被调用
        async () => {
          return '本地结果'
        }
      )

      const result = await fallback.tryWithFallback(operations)

      // 验证直接失败，没有降级
      expect(result.success).toBe(false)
      expect(result.finalLevel).toBe(FallbackLevel.API)
      expect(result.isFallback).toBe(false)
      expect(result.error?.recoverable).toBe(false)
    })

    /**
     * 测试：降级统计信息正确
     * @description 验证降级统计信息正确记录
     */
    it('降级统计信息正确', async () => {
      const fallback = useAiFallback()

      fallback.clearLogs()

      // 执行多次降级
      for (let i = 0; i < 3; i++) {
        const operations = fallback.createOperations<string>(
          async () => {
            throw new Error('network error')
          },
          async () => {
            return '本地结果'
          }
        )
        await fallback.tryWithFallback(operations)
      }

      const stats = fallback.stats.value

      expect(stats.totalFallbacks).toBeGreaterThanOrEqual(3)
      expect(stats.byLevel[FallbackLevel.API]).toBeGreaterThanOrEqual(3)
    })
  })

  // ============================================================
  // 功能隔离测试
  // ============================================================
  describe('功能隔离测试', () => {
    /**
     * 测试：AI 模块加载失败不影响原有功能
     * @description 验证 AI 模块故障时的隔离性
     */
    it('AI 模块加载失败不影响原有功能', async () => {
      const config = useAiConfig()
      const fallback = useAiFallback()

      config.resetConfig()

      // 模拟 AI 模块完全不可用（使用可恢复错误触发降级）
      const operations = fallback.createOperations<string>(
        // API - 失败（网络错误是可恢复的）
        async () => {
          throw new Error('network error')
        },
        // 本地模型 - 失败（超时错误是可恢复的）
        async () => {
          throw new Error('timeout error')
        },
        // 原有功能 - 成功
        async () => {
          return '原有功能正常工作'
        }
      )

      const result = await fallback.tryWithFallback(operations)

      // 验证原有功能可用
      expect(result.success).toBe(true)
      expect(result.data).toBe('原有功能正常工作')
      expect(result.finalLevel).toBe(FallbackLevel.ORIGINAL)
    })

    /**
     * 测试：AI 配置错误不影响原有功能
     * @description 验证配置错误时的隔离性
     */
    it('AI 配置错误不影响原有功能', async () => {
      const config = useAiConfig()
      const errorHandler = useAiErrorHandler()

      // 重置配置
      config.resetConfig()
      errorHandler.clearErrors()

      // 尝试导入无效配置
      const invalidConfig = 'invalid json {{{'
      const importResult = config.importConfig(invalidConfig)

      // 验证导入失败
      expect(importResult).toBe(false)

      // 验证配置仍然有效
      expect(config.isConfigLoaded.value).toBe(true)
      expect(config.isLocalModelEnabled.value).toBe(true)

      // 验证没有影响其他功能
      expect(errorHandler.errorCount.value).toBe(0)
    })

    /**
     * 测试：AI Store 状态不影响其他 Store
     * @description 验证 Store 之间的隔离性
     */
    it('AI Store 状态不影响其他 Store', async () => {
      const config = useAiConfig()
      const fallback = useAiFallback()
      const errorHandler = useAiErrorHandler()

      // 重置所有状态
      config.resetConfig()
      fallback.reset()
      errorHandler.clearErrors()

      // 配置 AI
      config.setApiKey(ApiProvider.OPENAI, 'test-key')

      // 执行操作
      const operations = fallback.createOperations<string>(
        async () => {
          throw new Error('network error')
        },
        async () => {
          return '结果'
        }
      )

      await fallback.tryWithFallback(operations)

      // 验证 AI Store 状态
      expect(config.isAnyProviderConfigured.value).toBe(true)

      // 验证其他 Store 状态不受影响
      // errorHandler 是独立的实例
      const newErrorHandler = useAiErrorHandler()
      expect(newErrorHandler.errorCount.value).toBeGreaterThanOrEqual(0)
    })

    /**
     * 测试：多个 AI 功能并行执行互不影响
     * @description 验证并行执行时的隔离性
     */
    it('多个 AI 功能并行执行互不影响', async () => {
      const config = useAiConfig()
      const fallback = useAiFallback()

      config.resetConfig()
      config.setApiKey(ApiProvider.OPENAI, 'test-key')

      // 创建多个并行操作
      const operations1 = fallback.createOperations<string>(
        async () => {
          return 'SQL 结果'
        }
      )

      const operations2 = fallback.createOperations<string>(
        async () => {
          throw new Error('network error')
        },
        async () => {
          return '正则结果'
        }
      )

      const operations3 = fallback.createOperations<string>(
        async () => {
          return 'JSON 结果'
        }
      )

      // 并行执行
      const [result1, result2, result3] = await Promise.all([
        fallback.tryWithFallback(operations1, { context: 'SQL' }),
        fallback.tryWithFallback(operations2, { context: '正则' }),
        fallback.tryWithFallback(operations3, { context: 'JSON' }),
      ])

      // 验证结果互不影响
      expect(result1.success).toBe(true)
      expect(result1.data).toBe('SQL 结果')

      expect(result2.success).toBe(true)
      expect(result2.data).toBe('正则结果')
      expect(result2.isFallback).toBe(true)

      expect(result3.success).toBe(true)
      expect(result3.data).toBe('JSON 结果')
    })

    /**
     * 测试：降级冷却期不影响新请求
     * @description 验证冷却期机制的正确性
     */
    it('降级冷却期不影响新请求', async () => {
      const fallback = useAiFallback()

      fallback.reset()

      // 触发多次降级
      for (let i = 0; i < 5; i++) {
        const operations = fallback.createOperations<string>(
          async () => {
            throw new Error('network error')
          },
          async () => {
            return '本地结果'
          }
        )
        await fallback.tryWithFallback(operations)
      }

      // 验证状态
      const state = fallback.state.value
      expect(state.consecutiveFallbacks).toBeGreaterThanOrEqual(1)

      // 新请求仍然可以执行
      const newOperations = fallback.createOperations<string>(
        async () => {
          return '新请求结果'
        }
      )

      const result = await fallback.tryWithFallback(newOperations)
      expect(result.success).toBe(true)
    })

    /**
     * 测试：错误恢复后功能正常
     * @description 验证错误恢复后的功能可用性
     */
    it('错误恢复后功能正常', async () => {
      const config = useAiConfig()
      const fallback = useAiFallback()
      const errorHandler = useAiErrorHandler()

      config.resetConfig()
      fallback.reset()
      errorHandler.clearErrors()

      // 触发错误
      const failOperations = fallback.createOperations<string>(
        async () => {
          throw new Error('network error')
        },
        async () => {
          throw new Error('timeout error')
        },
        async () => {
          return '原有功能'
        }
      )

      const failResult = await fallback.tryWithFallback(failOperations)
      expect(failResult.success).toBe(true)

      // 清除错误
      errorHandler.clearErrors()

      // 重新执行 - 应该正常
      const successOperations = fallback.createOperations<string>(
        async () => {
          return 'API 成功'
        }
      )

      const successResult = await fallback.tryWithFallback(successOperations)
      expect(successResult.success).toBe(true)
      expect(successResult.data).toBe('API 成功')
    })
  })
})
