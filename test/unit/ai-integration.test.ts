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
