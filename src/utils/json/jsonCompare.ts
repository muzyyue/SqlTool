/**
 * JSON 对比工具模块
 * 提供 JSON 深度对比、浅层对比、字段对比等功能
 * @module utils/json/jsonCompare
 */

import type { JsonCompareResult, JsonDiff, JsonDiffType, JsonCompareOptions } from '@/types/json'

/**
 * 默认对比选项
 */
const DEFAULT_COMPARE_OPTIONS: JsonCompareOptions = {
  mode: 'deep',
  ignoreCase: false,
  ignoreArrayOrder: false,
  ignoreNullUndefined: false,
}

/**
 * 深度对比两个 JSON 对象
 * @param obj1 - 第一个 JSON 对象
 * @param obj2 - 第二个 JSON 对象
 * @param options - 对比选项
 * @returns 对比结果
 * @example
 * deepCompare({ a: 1 }, { a: 2 })
 * // 返回: { type: 'error', message: '发现 1 处差异', differences: [...], isEqual: false }
 */
export function deepCompare(
  obj1: unknown,
  obj2: unknown,
  options: Partial<JsonCompareOptions> = {},
): JsonCompareResult {
  const mergedOptions = { ...DEFAULT_COMPARE_OPTIONS, ...options }
  const differences: JsonDiff[] = []

  compareValues(obj1, obj2, '', differences, mergedOptions)

  if (differences.length === 0) {
    return {
      type: 'success',
      message: '两个 JSON 完全相同',
      differences: [],
      isEqual: true,
    }
  }

  return {
    type: 'error',
    message: `发现 ${differences.length} 处差异`,
    differences,
    isEqual: false,
  }
}

/**
 * 浅层对比两个 JSON 对象（仅比较字符串化结果）
 * @param obj1 - 第一个 JSON 对象
 * @param obj2 - 第二个 JSON 对象
 * @returns 对比结果
 * @example
 * shallowCompare({ a: 1 }, { a: 1 })
 * // 返回: { type: 'success', message: '两个 JSON 完全相同', differences: [], isEqual: true }
 */
export function shallowCompare(obj1: unknown, obj2: unknown): JsonCompareResult {
  const str1 = JSON.stringify(obj1)
  const str2 = JSON.stringify(obj2)

  if (str1 === str2) {
    return {
      type: 'success',
      message: '两个 JSON 完全相同',
      differences: [],
      isEqual: true,
    }
  }

  return {
    type: 'warning',
    message: '两个 JSON 不同（使用深度对比查看详细差异）',
    differences: [
      {
        path: 'root',
        type: 'different',
        leftValue: obj1,
        rightValue: obj2,
        description: '浅层对比发现差异',
      },
    ],
    isEqual: false,
  }
}

/**
 * 按字段路径对比两个 JSON 对象
 * @param obj1 - 第一个 JSON 对象
 * @param obj2 - 第二个 JSON 对象
 * @param fieldPath - 字段路径（如：data.users[0].name）
 * @returns 对比结果
 * @example
 * compareByField({ data: { name: '张三' } }, { data: { name: '李四' } }, 'data.name')
 * // 返回: { type: 'error', message: '指定字段值不同', differences: [...], isEqual: false }
 */
export function compareByField(
  obj1: unknown,
  obj2: unknown,
  fieldPath: string,
): JsonCompareResult {
  const value1 = getValueByPath(obj1, fieldPath)
  const value2 = getValueByPath(obj2, fieldPath)

  if (value1 === undefined && value2 === undefined) {
    return {
      type: 'warning',
      message: '两个 JSON 都不包含指定字段',
      differences: [
        {
          path: fieldPath,
          type: 'missing_both',
          leftValue: undefined,
          rightValue: undefined,
          description: '两侧均缺失该字段',
        },
      ],
      isEqual: false,
    }
  }

  if (value1 === undefined) {
    return {
      type: 'warning',
      message: '左侧 JSON 缺少指定字段',
      differences: [
        {
          path: fieldPath,
          type: 'missing_left',
          leftValue: undefined,
          rightValue: value2,
          description: '左侧缺失该字段',
        },
      ],
      isEqual: false,
    }
  }

  if (value2 === undefined) {
    return {
      type: 'warning',
      message: '右侧 JSON 缺少指定字段',
      differences: [
        {
          path: fieldPath,
          type: 'missing_right',
          leftValue: value1,
          rightValue: undefined,
          description: '右侧缺失该字段',
        },
      ],
      isEqual: false,
    }
  }

  const isEqual = JSON.stringify(value1) === JSON.stringify(value2)
  if (isEqual) {
    return {
      type: 'success',
      message: '指定字段值相同',
      differences: [],
      isEqual: true,
    }
  }

  return {
    type: 'error',
    message: '指定字段值不同',
    differences: [
      {
        path: fieldPath,
        type: 'different',
        leftValue: value1,
        rightValue: value2,
        description: '字段值不同',
      },
    ],
    isEqual: false,
  }
}

/**
 * 获取差异类型的中文描述
 * @param type - 差异类型
 * @returns 中文描述
 */
export function getDiffTypeText(type: JsonDiffType): string {
  const typeMap: Record<JsonDiffType, string> = {
    missing_left: '左侧缺失',
    missing_right: '右侧缺失',
    missing_both: '两侧缺失',
    different: '值不同',
  }
  return typeMap[type] || type
}

/**
 * 格式化值用于显示
 * @param value - 任意值
 * @returns 格式化后的字符串
 */
export function formatValue(value: unknown): string {
  if (value === undefined) return 'undefined'
  if (value === null) return 'null'
  if (typeof value === 'object') {
    return JSON.stringify(value, null, 2)
  }
  return String(value)
}

/**
 * 根据路径获取值
 * @param obj - JSON 对象
 * @param path - 路径字符串
 * @returns 路径对应的值
 */
function getValueByPath(obj: unknown, path: string): unknown {
  const keys = path.split(/[.[\]]+/).filter(Boolean)
  let current = obj

  for (const key of keys) {
    if (current === null || current === undefined) {
      return undefined
    }

    if (typeof current === 'object') {
      if (Array.isArray(current)) {
        const index = parseInt(key, 10)
        if (isNaN(index)) {
          return undefined
        }
        current = current[index]
      } else {
        current = (current as Record<string, unknown>)[key]
      }
    } else {
      return undefined
    }
  }

  return current
}

/**
 * 递归对比两个值
 * @param value1 - 第一个值
 * @param value2 - 第二个值
 * @param path - 当前路径
 * @param differences - 差异列表
 * @param options - 对比选项
 */
function compareValues(
  value1: unknown,
  value2: unknown,
  path: string,
  differences: JsonDiff[],
  options: JsonCompareOptions,
): void {
  const { ignoreNullUndefined, ignoreCase } = options

  if (ignoreNullUndefined) {
    if (value1 === null || value1 === undefined) {
      if (value2 === null || value2 === undefined) {
        return
      }
    }
  }

  if (value1 === value2) {
    return
  }

  if (value1 === undefined || value1 === null) {
    differences.push({
      path,
      type: 'missing_left',
      leftValue: value1,
      rightValue: value2,
      description: `左侧值为 ${value1 === undefined ? 'undefined' : 'null'}`,
    })
    return
  }

  if (value2 === undefined || value2 === null) {
    differences.push({
      path,
      type: 'missing_right',
      leftValue: value1,
      rightValue: value2,
      description: `右侧值为 ${value2 === undefined ? 'undefined' : 'null'}`,
    })
    return
  }

  if (typeof value1 !== typeof value2) {
    differences.push({
      path,
      type: 'different',
      leftValue: value1,
      rightValue: value2,
      description: `类型不同: ${typeof value1} vs ${typeof value2}`,
    })
    return
  }

  if (typeof value1 === 'string' && ignoreCase) {
    if (value1.toLowerCase() !== (value2 as string).toLowerCase()) {
      differences.push({
        path,
        type: 'different',
        leftValue: value1,
        rightValue: value2,
        description: '字符串值不同（忽略大小写）',
      })
    }
    return
  }

  if (Array.isArray(value1) && Array.isArray(value2)) {
    compareArrays(value1, value2, path, differences, options)
    return
  }

  if (typeof value1 === 'object' && typeof value2 === 'object') {
    compareObjects(value1, value2, path, differences, options)
    return
  }

  if (value1 !== value2) {
    differences.push({
      path,
      type: 'different',
      leftValue: value1,
      rightValue: value2,
      description: '值不同',
    })
  }
}

/**
 * 对比两个数组
 * @param arr1 - 第一个数组
 * @param arr2 - 第二个数组
 * @param path - 当前路径
 * @param differences - 差异列表
 * @param options - 对比选项
 */
function compareArrays(
  arr1: unknown[],
  arr2: unknown[],
  path: string,
  differences: JsonDiff[],
  options: JsonCompareOptions,
): void {
  const { ignoreArrayOrder } = options
  const maxLength = Math.max(arr1.length, arr2.length)

  if (ignoreArrayOrder) {
    const str1 = JSON.stringify(arr1.map((item) => JSON.stringify(item)).sort())
    const str2 = JSON.stringify(arr2.map((item) => JSON.stringify(item)).sort())
    if (str1 !== str2) {
      differences.push({
        path,
        type: 'different',
        leftValue: arr1,
        rightValue: arr2,
        description: '数组元素不同（忽略顺序）',
      })
    }
    return
  }

  for (let i = 0; i < maxLength; i++) {
    const itemPath = `${path}[${i}]`

    if (i >= arr1.length) {
      differences.push({
        path: itemPath,
        type: 'missing_left',
        leftValue: undefined,
        rightValue: arr2[i],
        description: '左侧数组缺少该元素',
      })
    } else if (i >= arr2.length) {
      differences.push({
        path: itemPath,
        type: 'missing_right',
        leftValue: arr1[i],
        rightValue: undefined,
        description: '右侧数组缺少该元素',
      })
    } else {
      compareValues(arr1[i], arr2[i], itemPath, differences, options)
    }
  }
}

/**
 * 对比两个对象
 * @param obj1 - 第一个对象
 * @param obj2 - 第二个对象
 * @param path - 当前路径
 * @param differences - 差异列表
 * @param options - 对比选项
 */
function compareObjects(
  obj1: Record<string, unknown>,
  obj2: Record<string, unknown>,
  path: string,
  differences: JsonDiff[],
  options: JsonCompareOptions,
): void {
  const keys1 = Object.keys(obj1)
  const keys2 = Object.keys(obj2)
  const allKeys = new Set([...keys1, ...keys2])

  allKeys.forEach((key) => {
    const keyPath = path ? `${path}.${key}` : key

    if (!keys1.includes(key)) {
      differences.push({
        path: keyPath,
        type: 'missing_left',
        leftValue: undefined,
        rightValue: obj2[key],
        description: '左侧对象缺少该字段',
      })
    } else if (!keys2.includes(key)) {
      differences.push({
        path: keyPath,
        type: 'missing_right',
        leftValue: obj1[key],
        rightValue: undefined,
        description: '右侧对象缺少该字段',
      })
    } else {
      compareValues(obj1[key], obj2[key], keyPath, differences, options)
    }
  })
}
