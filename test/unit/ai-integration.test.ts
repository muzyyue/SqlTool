/**
 * AI 功能集成测试
 * 仅测试多模块协作、端到端流程等集成场景
 * 单元测试（useAiConfig、useAiErrorHandler、useModelCache）请查看 ai-module.test.ts
 * @module test/unit/ai-integration
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { nextTick } from 'vue'
import { setActivePinia, createPinia } from 'pinia'
import {
  ModelType,
  ApiProvider,
} from '@/composables/ai/types'
import { useAiConfig } from '@/composables/ai/useAiConfig'
import {
  useAiFallback,
  FallbackLevel,
  FallbackEvent,
  type FallbackLog,
} from '@/composables/ai/useAiFallback'
import {
  useAiErrorHandler,
  parseErrorType,
  AiErrorType,
  createAiError,
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
    localStorageMock.clear()
    vi.clearAllMocks()
    setActivePinia(createPinia())
    const config = useAiConfig()
    config.resetConfig()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // ============================================================
  // 降级机制测试（集成测试特有）
  // ============================================================
  describe('降级机制', () => {
    /**
     * 测试：应该正确执行三级降级（API → LOCAL → ORIGINAL）
     */
    it('应该正确执行三级降级（API → LOCAL → ORIGINAL）', async () => {
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

      const result = await fallback.tryWithFallback(operations)

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

      const logs = fallback.logs.value
      expect(logs.length).toBeGreaterThan(0)

      const log = logs[0] as FallbackLog
      expect(log.fromLevel).toBe(FallbackLevel.API)
      expect(log.toLevel).toBe(FallbackLevel.LOCAL)
      expect(log.reason).toContain('network error')
    })

    /**
     * 测试：应该正确触发降级事件
     */
    it('应该正确触发降级事件', async () => {
      const fallback = useAiFallback()

      const startHandler = vi.fn()
      const successHandler = vi.fn()

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

      expect(startHandler).toHaveBeenCalled()
      expect(successHandler).toHaveBeenCalled()

      fallback.removeEventListener(FallbackEvent.START, startHandler)
      fallback.removeEventListener(FallbackEvent.SUCCESS, successHandler)
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

      const result = await fallback.tryWithFallback(operations, {
        enabled: false,
      })

      expect(result.success).toBe(false)
      expect(result.finalLevel).toBe(FallbackLevel.API)
      expect(result.isFallback).toBe(false)
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

      const result = await fallback.tryWithFallback(operations, {
        maxFallbackLevel: FallbackLevel.LOCAL,
      })

      expect(result.success).toBe(false)
      expect(result.finalLevel).toBe(FallbackLevel.LOCAL)
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
      await fallback.tryWithFallback(operations, { fallbackDelay: 100 })
      const duration = Date.now() - startTime

      expect(duration).toBeGreaterThanOrEqual(100)
    })
  })

  // ============================================================
  // 集成测试（多模块协作）
  // ============================================================
  describe('集成测试', () => {
    /**
     * 测试：配置管理应该与降级机制正确协作
     */
    it('配置管理应该与降级机制正确协作', async () => {
      const config = useAiConfig()
      const fallback = useAiFallback()

      config.resetConfig()
      config.setAutoFallback(true)

      const operations = fallback.createOperations<string>(
        async () => {
          if (!config.isAnyProviderConfigured.value) {
            throw new Error('network error')
          }
          return 'API 结果'
        },
        async () => {
          return '本地结果'
        }
      )

      const result = await fallback.tryWithFallback(operations)

      expect(result.success).toBe(true)
      expect(result.finalLevel).toBe(FallbackLevel.LOCAL)
    })

    /**
     * 测试：错误处理应该与降级机制正确协作
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

      expect(result.success).toBe(true)
      expect(result.finalLevel).toBe(FallbackLevel.LOCAL)
      expect(fallback.logs.value.length).toBeGreaterThan(0)
    })

    /**
     * 测试：完整的降级流程应该正确执行
     */
    it('完整的降级流程应该正确执行', async () => {
      const config = useAiConfig()
      const fallback = useAiFallback()
      const errorHandler = useAiErrorHandler()

      config.resetConfig()
      fallback.reset()
      errorHandler.clearErrors()

      config.setLocalModelConfig('Xenova/test-model', true)

      const operations = fallback.createOperations<string>(
        async () => {
          if (!config.isAnyProviderConfigured.value) {
            throw new Error('network error')
          }
          return 'API 结果'
        },
        async () => {
          return '本地模型结果'
        },
        async () => {
          return '原始结果'
        }
      )

      const result = await fallback.tryWithFallback(operations, {
        context: '测试降级流程',
      })

      expect(result.success).toBe(true)
      expect(result.data).toBe('本地模型结果')
      expect(result.isFallback).toBe(true)
      expect(fallback.logs.value.length).toBeGreaterThan(0)
    })
  })

  // ============================================================
  // AI 启用状态完整流程测试
  // ============================================================
  describe('AI 启用状态完整流程测试', () => {
    /**
     * 测试：用户可以使用自然语言转 SQL 功能
     */
    it('用户可以使用自然语言转 SQL 功能', async () => {
      const config = useAiConfig()
      const fallback = useAiFallback()

      config.resetConfig()
      config.setApiKey(ApiProvider.OPENAI, 'test-key')

      const nlToSqlOperations = fallback.createOperations<string>(
        async () => {
          return 'SELECT * FROM users WHERE name = ?'
        },
        async () => {
          return 'SELECT * FROM users'
        }
      )

      const result = await fallback.tryWithFallback(nlToSqlOperations, {
        context: '自然语言转 SQL',
      })

      expect(result.success).toBe(true)
      expect(result.data).toContain('SELECT')
    })

    /**
     * 测试：用户可以使用正则生成功能
     */
    it('用户可以使用正则生成功能', async () => {
      const config = useAiConfig()
      const fallback = useAiFallback()

      config.resetConfig()
      config.setApiKey(ApiProvider.OPENAI, 'test-key')

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
      expect(result.data).toMatch(/^\^.*\$$/)
    })

    /**
     * 测试：用户可以使用 JSON 分析功能
     */
    it('用户可以使用 JSON 分析功能', async () => {
      const config = useAiConfig()
      const fallback = useAiFallback()

      config.resetConfig()
      config.setApiKey(ApiProvider.OPENAI, 'test-key')

      const jsonAnalysisOperations = fallback.createOperations<{ type: string; description: string }>(
        async () => {
          return { type: 'object', description: '用户信息对象' }
        },
        async () => {
          return { type: 'unknown', description: '无法分析' }
        }
      )

      const result = await fallback.tryWithFallback(jsonAnalysisOperations, {
        context: 'JSON 分析',
      })

      expect(result.success).toBe(true)
      expect(result.data?.type).toBeDefined()
    })

    /**
     * 测试：AI 配置持久化到 localStorage
     */
    it('AI 配置持久化到 localStorage', async () => {
      const config = useAiConfig()
      config.resetConfig()

      config.setApiKey(ApiProvider.OPENAI, 'sk-persist-test-key')
      config.setDefaultModelType(ModelType.API)
      config.setAutoFallback(false)

      await nextTick()

      expect(localStorageMock.setItem).toHaveBeenCalled()

      const exportedConfig = config.exportConfig()
      const parsed = JSON.parse(exportedConfig)
      expect(parsed.defaultModelType).toBe(ModelType.API)
    })
  })

  // ============================================================
  // AI 禁用状态测试
  // ============================================================
  describe('AI 禁用状态测试', () => {
    /**
     * 测试：原有功能完全可用
     */
    it('原有功能完全可用', async () => {
      const config = useAiConfig()
      const fallback = useAiFallback()

      config.resetConfig()

      const originalOperations = fallback.createOperations<string>(
        async () => {
          throw new Error('network error')
        },
        async () => {
          return '本地模型结果'
        },
        async () => {
          return '原有功能结果'
        }
      )

      const result = await fallback.tryWithFallback(originalOperations)

      expect(result.success).toBe(true)
      expect(['本地模型结果', '原有功能结果']).toContain(result.data)
    })

    /**
     * 测试：AI 禁用后可以重新启用
     */
    it('AI 禁用后可以重新启用', async () => {
      const config = useAiConfig()
      config.resetConfig()

      config.setApiKey(ApiProvider.OPENAI, 'test-key')
      expect(config.isAnyProviderConfigured.value).toBe(true)

      config.clearApiKey(ApiProvider.OPENAI)
      expect(config.isAnyProviderConfigured.value).toBe(false)

      config.setApiKey(ApiProvider.ANTHROPIC, 'new-test-key')
      expect(config.isAnyProviderConfigured.value).toBe(true)
    })
  })

  // ============================================================
  // 降级流程测试
  // ============================================================
  describe('降级流程测试', () => {
    /**
     * 测试：API 失败时自动切换到本地模型
     */
    it('API 失败时自动切换到本地模型', async () => {
      const config = useAiConfig()
      const fallback = useAiFallback()

      config.resetConfig()
      fallback.clearLogs()

      config.setApiKey(ApiProvider.OPENAI, 'test-key')
      config.setAutoFallback(true)

      const operations = fallback.createOperations<string>(
        async () => {
          throw new Error('network error')
        },
        async () => {
          return '本地模型结果'
        }
      )

      const result = await fallback.tryWithFallback(operations, {
        context: 'API 失败降级测试',
      })

      expect(result.success).toBe(true)
      expect(result.data).toBe('本地模型结果')
      expect(result.finalLevel).toBe(FallbackLevel.LOCAL)
      expect(result.isFallback).toBe(true)
    })

    /**
     * 测试：本地模型失败时显示原有功能
     */
    it('本地模型失败时显示原有功能', async () => {
      const fallback = useAiFallback()

      const operations = fallback.createOperations<string>(
        async () => {
          throw new Error('network error')
        },
        async () => {
          throw new Error('timeout error')
        },
        async () => {
          return '原有功能结果'
        }
      )

      const result = await fallback.tryWithFallback(operations, {
        context: '完整降级测试',
      })

      expect(result.success).toBe(true)
      expect(result.data).toBe('原有功能结果')
      expect(result.finalLevel).toBe(FallbackLevel.ORIGINAL)
    })

    /**
     * 测试：不可恢复错误不触发降级
     */
    it('不可恢复错误不触发降级', async () => {
      const fallback = useAiFallback()

      const operations = fallback.createOperations<string>(
        async () => {
          throw new Error('unauthorized: 401')
        },
        async () => {
          return '本地结果'
        }
      )

      const result = await fallback.tryWithFallback(operations)

      expect(result.success).toBe(false)
      expect(result.finalLevel).toBe(FallbackLevel.API)
      expect(result.isFallback).toBe(false)
      expect(result.error?.recoverable).toBe(false)
    })
  })

  // ============================================================
  // 功能隔离测试
  // ============================================================
  describe('功能隔离测试', () => {
    /**
     * 测试：AI 模块加载失败不影响原有功能
     */
    it('AI 模块加载失败不影响原有功能', async () => {
      const fallback = useAiFallback()

      const operations = fallback.createOperations<string>(
        async () => {
          throw new Error('network error')
        },
        async () => {
          throw new Error('timeout error')
        },
        async () => {
          return '原有功能正常工作'
        }
      )

      const result = await fallback.tryWithFallback(operations)

      expect(result.success).toBe(true)
      expect(result.data).toBe('原有功能正常工作')
      expect(result.finalLevel).toBe(FallbackLevel.ORIGINAL)
    })

    /**
     * 测试：AI 配置错误不影响原有功能
     */
    it('AI 配置错误不影响原有功能', async () => {
      const config = useAiConfig()
      const errorHandler = useAiErrorHandler()

      config.resetConfig()
      errorHandler.clearErrors()

      const importResult = config.importConfig('invalid json {{{')

      expect(importResult).toBe(false)
      expect(config.isConfigLoaded.value).toBe(true)
      expect(config.isLocalModelEnabled.value).toBe(true)
    })

    /**
     * 测试：多个 AI 功能并行执行互不影响
     */
    it('多个 AI 功能并行执行互不影响', async () => {
      const config = useAiConfig()
      const fallback = useAiFallback()

      config.resetConfig()
      config.setApiKey(ApiProvider.OPENAI, 'test-key')

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

      const [result1, result2, result3] = await Promise.all([
        fallback.tryWithFallback(operations1, { context: 'SQL' }),
        fallback.tryWithFallback(operations2, { context: '正则' }),
        fallback.tryWithFallback(operations3, { context: 'JSON' }),
      ])

      expect(result1.success).toBe(true)
      expect(result1.data).toBe('SQL 结果')

      expect(result2.success).toBe(true)
      expect(result2.data).toBe('正则结果')
      expect(result2.isFallback).toBe(true)

      expect(result3.success).toBe(true)
      expect(result3.data).toBe('JSON 结果')
    })

    /**
     * 测试：错误恢复后功能正常
     */
    it('错误恢复后功能正常', async () => {
      const config = useAiConfig()
      const fallback = useAiFallback()
      const errorHandler = useAiErrorHandler()

      config.resetConfig()
      fallback.reset()
      errorHandler.clearErrors()

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

      errorHandler.clearErrors()

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

  // ============================================================
  // 错误类型分类测试（集成场景）
  // ============================================================
  describe('错误类型分类（集成场景）', () => {
    /**
     * 测试：应该正确分类错误类型并生成用户友好提示
     */
    it('应该正确分类错误类型并生成用户友好提示', () => {
      const testCases = [
        {
          error: new Error('network error'),
          expectedType: AiErrorType.NETWORK,
          expectedAction: '请检查网络连接后重试',
        },
        {
          error: new Error('timeout'),
          expectedType: AiErrorType.TIMEOUT,
          expectedAction: '请求超时，请稍后重试',
        },
        {
          error: new Error('rate limit exceeded'),
          expectedType: AiErrorType.RATE_LIMIT,
          expectedAction: '请求过于频繁，请稍后重试',
        },
        {
          error: new Error('unauthorized: 401'),
          expectedType: AiErrorType.API_KEY_INVALID,
          expectedAction: 'API Key 无效，请检查配置',
        },
      ]

      testCases.forEach(({ error, expectedType, expectedAction }) => {
        expect(parseErrorType(error)).toBe(expectedType)
        const aiError = createAiError(parseErrorType(error), error.message, error)
        expect(aiError.suggestedAction).toBe(expectedAction)
      })
    })
  })
})
