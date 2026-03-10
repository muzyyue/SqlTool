import { ref, computed, readonly } from 'vue'
import type { ApiProvider, ApiModelConfig } from './types'
import { ModelType } from './types'

/**
 * AI 配置管理模块
 * 管理 API Key、模型选择、运行时配置等
 */

const STORAGE_KEY_PREFIX = 'sqltool_ai_'
const API_KEY_SUFFIX = '_api_key'
const CONFIG_SUFFIX = '_config'

/**
 * 加密 API Key（简单混淆，生产环境应使用更强的加密）
 */
const encryptApiKey = (key: string): string => {
  if (!key) return ''
  const encoded = btoa(key)
  return encoded.split('').reverse().join('')
}

/**
 * 解密 API Key
 */
const decryptApiKey = (encrypted: string): string => {
  if (!encrypted) return ''
  try {
    const reversed = encrypted.split('').reverse().join('')
    return atob(reversed)
  } catch {
    return ''
  }
}

/**
 * 默认配置
 */
const defaultConfig = {
  defaultModelType: ModelType.LOCAL,
  autoFallback: true,
  cacheEnabled: true,
  maxConcurrentRequests: 3,
}

/**
 * AI 配置存储
 */
const configState = ref({
  defaultModelType: defaultConfig.defaultModelType,
  autoFallback: defaultConfig.autoFallback,
  cacheEnabled: defaultConfig.cacheEnabled,
  maxConcurrentRequests: defaultConfig.maxConcurrentRequests,
  providers: {
    openai: {
      enabled: false,
      apiKey: '',
      model: 'gpt-4o-mini',
      baseUrl: 'https://api.openai.com/v1',
    },
    anthropic: {
      enabled: false,
      apiKey: '',
      model: 'claude-3-haiku-20240307',
      baseUrl: 'https://api.anthropic.com/v1',
    },
    custom: {
      enabled: false,
      apiKey: '',
      model: '',
      baseUrl: '',
    },
  },
  localModel: {
    enabled: true,
    modelId: 'Xenova/Qwen2.5-0.5B-Instruct',
    quantized: true,
  },
})

/**
 * 从 localStorage 加载配置
 */
const loadConfig = (): void => {
  try {
    const savedConfig = localStorage.getItem(`${STORAGE_KEY_PREFIX}config`)
    if (savedConfig) {
      const parsed = JSON.parse(savedConfig)
      configState.value = {
        ...defaultConfig,
        ...parsed,
      }
    }

    for (const provider of ['openai', 'anthropic', 'custom'] as ApiProvider[]) {
      const encryptedKey = localStorage.getItem(`${STORAGE_KEY_PREFIX}${provider}${API_KEY_SUFFIX}`)
      if (encryptedKey) {
        configState.value.providers[provider].apiKey = decryptApiKey(encryptedKey)
      }
    }
  } catch (error) {
    console.error('加载 AI 配置失败:', error)
  }
}

/**
 * 保存配置到 localStorage
 */
const saveConfig = (): void => {
  try {
    const configToSave = {
      ...configState.value,
      providers: {
        ...configState.value.providers,
        openai: { ...configState.value.providers.openai, apiKey: '' },
        anthropic: { ...configState.value.providers.anthropic, apiKey: '' },
        custom: { ...configState.value.providers.custom, apiKey: '' },
      },
    }
    localStorage.setItem(`${STORAGE_KEY_PREFIX}config`, JSON.stringify(configToSave))

    for (const provider of ['openai', 'anthropic', 'custom'] as ApiProvider[]) {
      const apiKey = configState.value.providers[provider].apiKey
      if (apiKey) {
        localStorage.setItem(
          `${STORAGE_KEY_PREFIX}${provider}${API_KEY_SUFFIX}`,
          encryptApiKey(apiKey)
        )
      } else {
        localStorage.removeItem(`${STORAGE_KEY_PREFIX}${provider}${API_KEY_SUFFIX}`)
      }
    }
  } catch (error) {
    console.error('保存 AI 配置失败:', error)
  }
}

loadConfig()

/**
 * AI 配置管理 Composable
 */
export function useAiConfig() {
  const isConfigLoaded = ref(true)

  const config = computed(() => readonly(configState.value))

  const isAnyProviderConfigured = computed(() => {
    return Object.values(configState.value.providers).some((p) => p.enabled && p.apiKey)
  })

  const isLocalModelEnabled = computed(() => configState.value.localModel.enabled)

  const defaultModelType = computed(() => configState.value.defaultModelType)

  /**
   * 设置 API Key
   */
  const setApiKey = (provider: ApiProvider, apiKey: string): void => {
    configState.value.providers[provider].apiKey = apiKey
    configState.value.providers[provider].enabled = !!apiKey
    saveConfig()
  }

  /**
   * 获取 API Key
   */
  const getApiKey = (provider: ApiProvider): string => {
    return configState.value.providers[provider].apiKey
  }

  /**
   * 清除 API Key
   */
  const clearApiKey = (provider: ApiProvider): void => {
    configState.value.providers[provider].apiKey = ''
    configState.value.providers[provider].enabled = false
    localStorage.removeItem(`${STORAGE_KEY_PREFIX}${provider}${API_KEY_SUFFIX}`)
    saveConfig()
  }

  /**
   * 设置模型
   */
  const setModel = (provider: ApiProvider, model: string): void => {
    configState.value.providers[provider].model = model
    saveConfig()
  }

  /**
   * 设置 Base URL
   */
  const setBaseUrl = (provider: ApiProvider, baseUrl: string): void => {
    configState.value.providers[provider].baseUrl = baseUrl
    saveConfig()
  }

  /**
   * 设置本地模型配置
   */
  const setLocalModelConfig = (modelId: string, quantized: boolean = true): void => {
    configState.value.localModel.modelId = modelId
    configState.value.localModel.quantized = quantized
    saveConfig()
  }

  /**
   * 设置默认模型类型
   */
  const setDefaultModelType = (type: ModelType): void => {
    configState.value.defaultModelType = type
    saveConfig()
  }

  /**
   * 设置自动降级
   */
  const setAutoFallback = (enabled: boolean): void => {
    configState.value.autoFallback = enabled
    saveConfig()
  }

  /**
   * 设置缓存启用状态
   */
  const setCacheEnabled = (enabled: boolean): void => {
    configState.value.cacheEnabled = enabled
    saveConfig()
  }

  /**
   * 获取提供商配置
   */
  const getProviderConfig = (provider: ApiProvider): ApiModelConfig | null => {
    const p = configState.value.providers[provider]
    if (!p.enabled || !p.apiKey) return null

    return {
      name: provider,
      type: ModelType.API,
      enabled: p.enabled,
      priority: provider === 'openai' ? 1 : provider === 'anthropic' ? 2 : 3,
      provider,
      model: p.model,
      apiKey: p.apiKey,
      baseUrl: p.baseUrl,
    }
  }

  /**
   * 获取所有已配置的提供商
   */
  const getConfiguredProviders = (): ApiProvider[] => {
    return (Object.keys(configState.value.providers) as ApiProvider[]).filter(
      (p) => configState.value.providers[p].enabled && configState.value.providers[p].apiKey
    )
  }

  /**
   * 重置所有配置
   */
  const resetConfig = (): void => {
    configState.value = {
      ...defaultConfig,
      providers: {
        openai: {
          enabled: false,
          apiKey: '',
          model: 'gpt-4o-mini',
          baseUrl: 'https://api.openai.com/v1',
        },
        anthropic: {
          enabled: false,
          apiKey: '',
          model: 'claude-3-haiku-20240307',
          baseUrl: 'https://api.anthropic.com/v1',
        },
        custom: {
          enabled: false,
          apiKey: '',
          model: '',
          baseUrl: '',
        },
      },
      localModel: {
        enabled: true,
        modelId: 'Xenova/Qwen2.5-0.5B-Instruct',
        quantized: true,
      },
    }

    for (const provider of ['openai', 'anthropic', 'custom'] as ApiProvider[]) {
      localStorage.removeItem(`${STORAGE_KEY_PREFIX}${provider}${API_KEY_SUFFIX}`)
    }
    localStorage.removeItem(`${STORAGE_KEY_PREFIX}config`)
  }

  /**
   * 导出配置（不包含 API Key）
   */
  const exportConfig = (): string => {
    const exportData = {
      defaultModelType: configState.value.defaultModelType,
      autoFallback: configState.value.autoFallback,
      cacheEnabled: configState.value.cacheEnabled,
      localModel: configState.value.localModel,
      providers: Object.fromEntries(
        Object.entries(configState.value.providers).map(([key, value]) => [
          key,
          {
            enabled: value.enabled,
            model: value.model,
            baseUrl: value.baseUrl,
            hasApiKey: !!value.apiKey,
          },
        ])
      ),
    }
    return JSON.stringify(exportData, null, 2)
  }

  /**
   * 导入配置（不包含 API Key）
   */
  const importConfig = (configJson: string): boolean => {
    try {
      const imported = JSON.parse(configJson)

      if (imported.defaultModelType !== undefined) {
        configState.value.defaultModelType = imported.defaultModelType
      }
      if (imported.autoFallback !== undefined) {
        configState.value.autoFallback = imported.autoFallback
      }
      if (imported.cacheEnabled !== undefined) {
        configState.value.cacheEnabled = imported.cacheEnabled
      }
      if (imported.localModel) {
        configState.value.localModel = {
          ...configState.value.localModel,
          ...imported.localModel,
        }
      }
      if (imported.providers) {
        for (const [key, value] of Object.entries(imported.providers)) {
          if (configState.value.providers[key as ApiProvider]) {
            const providerConfig = value as {
              enabled?: boolean
              model?: string
              baseUrl?: string
            }
            configState.value.providers[key as ApiProvider].enabled = providerConfig.enabled ?? false
            if (providerConfig.model) {
              configState.value.providers[key as ApiProvider].model = providerConfig.model
            }
            if (providerConfig.baseUrl) {
              configState.value.providers[key as ApiProvider].baseUrl = providerConfig.baseUrl
            }
          }
        }
      }

      saveConfig()
      return true
    } catch (error) {
      console.error('导入配置失败:', error)
      return false
    }
  }

  return {
    config,
    isConfigLoaded,
    isAnyProviderConfigured,
    isLocalModelEnabled,
    defaultModelType,

    setApiKey,
    getApiKey,
    clearApiKey,
    setModel,
    setBaseUrl,
    setLocalModelConfig,
    setDefaultModelType,
    setAutoFallback,
    setCacheEnabled,

    getProviderConfig,
    getConfiguredProviders,

    resetConfig,
    exportConfig,
    importConfig,
  }
}
