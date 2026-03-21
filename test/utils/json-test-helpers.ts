/**
 * JSON 测试工具函数
 * 提供测试数据生成、断言辅助、Mock工具等功能
 * @module test/utils/json-test-helpers
 */

import { vi } from 'vitest'
import type { JsonValidationResult, JsonCompareResult } from '@/types/json'

/**
 * JSON生成器选项接口
 */
export interface JsonGeneratorOptions {
  /** 是否包含null值 */
  includeNull?: boolean
  /** 是否包含布尔值 */
  includeBoolean?: boolean
  /** 是否包含数字 */
  includeNumber?: boolean
  /** 是否包含字符串 */
  includeString?: boolean
  /** 是否包含数组 */
  includeArray?: boolean
  /** 是否包含嵌套对象 */
  includeNested?: boolean
  /** 嵌套深度 */
  depth?: number
}

/**
 * 生成简单JSON对象
 * @returns 包含各种类型的简单JSON对象
 */
export function createSimpleJson(): Record<string, unknown> {
  return {
    name: '张三',
    age: 25,
    active: true,
    score: 95.5,
    tags: ['tag1', 'tag2'],
    metadata: null,
  }
}

/**
 * 生成嵌套JSON对象
 * @param depth - 嵌套深度
 * @returns 嵌套JSON对象
 */
export function createNestedJson(depth: number): Record<string, unknown> {
  if (depth <= 0) {
    return { value: 'leaf' }
  }
  return {
    level: depth,
    data: `level_${depth}`,
    child: createNestedJson(depth - 1),
  }
}

/**
 * 生成数组JSON
 * @param count - 元素数量
 * @returns JSON数组
 */
export function createArrayJson(count: number): Record<string, unknown>[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    name: `item_${i + 1}`,
    value: Math.random() * 100,
    active: i % 2 === 0,
  }))
}

/**
 * 生成大型JSON字符串
 * @param sizeKB - 目标大小（KB）
 * @returns JSON字符串
 */
export function createLargeJsonString(sizeKB: number): string {
  const targetSize = sizeKB * 1024
  const baseObj = { data: '' }
  let currentSize = JSON.stringify(baseObj).length
  const chunks: string[] = []

  while (currentSize < targetSize) {
    const chunk = 'x'.repeat(1000)
    chunks.push(chunk)
    currentSize += chunk.length + 3
  }

  return JSON.stringify({ data: chunks.join('') })
}

/**
 * 生成包含特殊字符的JSON
 * @returns 包含特殊字符的JSON对象
 */
export function createSpecialCharsJson(): Record<string, unknown> {
  return {
    newline: 'hello\nworld',
    tab: 'hello\tworld',
    carriage: 'hello\rworld',
    backslash: 'hello\\world',
    quote: 'hello"world',
    singleQuote: "hello'world",
    chinese: '中文测试',
    emoji: '😀🎉',
    mixed: 'line1\nline2\ttab\r\nwindows',
  }
}

/**
 * 生成包含Unicode字符的JSON
 * @returns 包含Unicode字符的JSON对象
 */
export function createUnicodeJson(): Record<string, unknown> {
  return {
    chinese: '张三李四',
    japanese: 'こんにちは',
    korean: '안녕하세요',
    emoji: '😀🎉🚀',
    mixed: 'Hello世界🌍',
  }
}

/**
 * 生成随机JSON对象
 * @param options - 生成选项
 * @returns 随机JSON对象
 */
export function generateRandomJson(
  options: JsonGeneratorOptions = {},
): Record<string, unknown> {
  const {
    includeNull = true,
    includeBoolean = true,
    includeNumber = true,
    includeString = true,
    includeArray = false,
    includeNested = false,
    depth = 1,
  } = options

  const result: Record<string, unknown> = {}

  if (includeString) {
    result.name = `random_${Math.random().toString(36).slice(2, 8)}`
  }

  if (includeNumber) {
    result.value = Math.random() * 1000
    result.integer = Math.floor(Math.random() * 1000)
  }

  if (includeBoolean) {
    result.active = Math.random() > 0.5
  }

  if (includeNull) {
    result.optional = null
  }

  if (includeArray && depth > 0) {
    result.items = Array.from({ length: 3 }, () =>
      generateRandomJson({ ...options, depth: depth - 1 }),
    )
  }

  if (includeNested && depth > 0) {
    result.nested = generateRandomJson({ ...options, depth: depth - 1 })
  }

  return result
}

/**
 * 生成无效的JSON字符串
 * @param type - 无效类型
 * @returns 无效的JSON字符串
 */
export function createInvalidJson(
  type: 'missing_quote' | 'missing_brace' | 'extra_comma' | 'chinese_punctuation',
): string {
  const invalidJsonMap: Record<string, string> = {
    missing_quote: '{name: "张三"}',
    missing_brace: '{"name": "张三"',
    extra_comma: '{"name": "张三",}',
    chinese_punctuation: '{"name"："张三"，"age"：25}',
  }
  return invalidJsonMap[type]
}

/**
 * 比较两个JSON是否相等（忽略键顺序）
 * @param json1 - 第一个JSON
 * @param json2 - 第二个JSON
 * @returns 是否相等
 */
export function jsonEqual(
  json1: unknown,
  json2: unknown,
): boolean {
  return JSON.stringify(json1) === JSON.stringify(json2)
}

/**
 * 等待指定时间
 * @param ms - 毫秒数
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * 断言JSON验证结果
 * @param result - 验证结果
 * @param expected - 预期结果
 */
export function assertValidationResult(
  result: JsonValidationResult,
  expected: { isValid: boolean; errorMessage?: string },
): void {
  const { expect } = vi
  expect(result.isValid).toBe(expected.isValid)

  if (!expected.isValid && expected.errorMessage) {
    expect(result.errorMessage).toContain(expected.errorMessage)
  }
}

/**
 * 断言对比结果
 * @param result - 对比结果
 * @param expected - 预期结果
 */
export function assertCompareResult(
  result: JsonCompareResult,
  expected: { isEqual: boolean; diffCount?: number },
): void {
  const { expect } = vi
  expect(result.isEqual).toBe(expected.isEqual)

  if (expected.diffCount !== undefined) {
    expect(result.differences.length).toBe(expected.diffCount)
  }
}

/**
 * 断言代码生成结果
 * @param code - 生成的代码
 * @param expectations - 预期包含的内容
 */
export function assertGeneratedCode(
  code: string,
  expectations: string[],
): void {
  const { expect } = vi
  expectations.forEach((exp) => {
    expect(code).toContain(exp)
  })
}

/**
 * Mock localStorage
 */
export function mockLocalStorage(): void {
  const store: Record<string, string> = {}

  vi.stubGlobal('localStorage', {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => {
      Object.keys(store).forEach((key) => delete store[key])
    },
    get length() {
      return Object.keys(store).length
    },
    key: (index: number) => Object.keys(store)[index] || null,
  })
}

/**
 * Mock clipboard API
 */
export function mockClipboard(): void {
  vi.stubGlobal('navigator', {
    clipboard: {
      writeText: vi.fn().mockResolvedValue(undefined),
      readText: vi.fn().mockResolvedValue(''),
    },
  })
}

/**
 * Mock window.matchMedia
 */
export function mockMatchMedia(matches: boolean = false): void {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }))
}

/**
 * 创建性能测试计时器
 * @returns 计时器对象
 */
export function createTimer(): { start: () => void; elapsed: () => number } {
  let startTime = 0

  return {
    start: () => {
      startTime = performance.now()
    },
    elapsed: () => {
      return performance.now() - startTime
    },
  }
}

/**
 * 生成指定大小的JSON数据
 * @param targetSizeBytes - 目标字节数
 * @returns JSON对象
 */
export function generateJsonBySize(targetSizeBytes: number): Record<string, unknown> {
  const result: Record<string, unknown> = {
    items: [],
  }

  const itemTemplate = {
    id: 1,
    name: 'item_name_placeholder',
    value: 123.456,
    active: true,
  }

  const itemSize = JSON.stringify(itemTemplate).length
  const itemCount = Math.floor(targetSizeBytes / itemSize)

  for (let i = 0; i < itemCount; i++) {
    result.items.push({
      id: i + 1,
      name: `item_${i + 1}`,
      value: Math.random() * 1000,
      active: i % 2 === 0,
    })
  }

  return result
}

/**
 * 深拷贝JSON对象
 * @param obj - 原始对象
 * @returns 深拷贝后的对象
 */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj))
}

/**
 * 测试数据常量
 */
export const TEST_CONSTANTS = {
  /** 小型JSON大小阈值 */
  SMALL_JSON_SIZE: 1024,
  /** 中型JSON大小阈值 */
  MEDIUM_JSON_SIZE: 100 * 1024,
  /** 大型JSON大小阈值 */
  LARGE_JSON_SIZE: 1024 * 1024,
  /** 性能测试超时时间（毫秒） */
  PERFORMANCE_TIMEOUT: 500,
  /** 大文件性能测试超时时间（毫秒） */
  LARGE_FILE_TIMEOUT: 3000,
  /** 默认嵌套深度 */
  DEFAULT_NESTED_DEPTH: 10,
  /** 最大嵌套深度 */
  MAX_NESTED_DEPTH: 100,
} as const
