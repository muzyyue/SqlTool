/**
 * AI 模块统一入口
 * 提供本地模型和 API 模型的统一调用接口
 */

export * from './types'
export { useAiConfig } from './useAiConfig'
export { useModelManager, getModelManager } from './useModelManager'
export { useAiFallback, useFallbackLogger, useFallbackState, FallbackLevel, FallbackEvent, getFallbackLevelName } from './useAiFallback'
export type { FallbackLog, FallbackResult, FallbackOptions, FallbackState, FallbackEventHandler } from './useAiFallback'
export * from './adapters'
export * from './utils'
