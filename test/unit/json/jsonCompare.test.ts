/**
 * JSON 对比工具模块单元测试
 * @module test/unit/json/jsonCompare.test
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  deepCompare,
  shallowCompare,
  compareByField,
  getDiffTypeText,
  formatValue,
} from '@/utils/json/jsonCompare'
import { createNestedJson, createArrayJson, createTimer, TEST_CONSTANTS } from '../../utils/json-test-helpers'

describe('JSON 对比工具模块', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('deepCompare', () => {
    describe('基础对比功能', () => {
      it('CMP-001: 应该正确对比相同的对象', () => {
        const obj1 = { a: 1 }
        const obj2 = { a: 1 }
        const result = deepCompare(obj1, obj2)

        expect(result.isEqual).toBe(true)
        expect(result.type).toBe('success')
        expect(result.message).toContain('完全相同')
        expect(result.differences).toHaveLength(0)
      })

      it('CMP-002: 应该正确对比不同值的对象', () => {
        const obj1 = { a: 1 }
        const obj2 = { a: 2 }
        const result = deepCompare(obj1, obj2)

        expect(result.isEqual).toBe(false)
        expect(result.type).toBe('error')
        expect(result.differences).toHaveLength(1)
        expect(result.differences[0].type).toBe('different')
      })

      it('CMP-003: 应该检测右侧缺少字段', () => {
        const obj1 = { a: 1, b: 2 }
        const obj2 = { a: 1 }
        const result = deepCompare(obj1, obj2)

        expect(result.isEqual).toBe(false)
        const missingRight = result.differences.find((d) => d.type === 'missing_right')
        expect(missingRight).toBeDefined()
        expect(missingRight?.path).toBe('b')
      })

      it('CMP-004: 应该检测左侧缺少字段', () => {
        const obj1 = { a: 1 }
        const obj2 = { a: 1, b: 2 }
        const result = deepCompare(obj1, obj2)

        expect(result.isEqual).toBe(false)
        const missingLeft = result.differences.find((d) => d.type === 'missing_left')
        expect(missingLeft).toBeDefined()
        expect(missingLeft?.path).toBe('b')
      })

      it('CMP-005: 应该正确对比嵌套对象', () => {
        const obj1 = { a: { b: 1 } }
        const obj2 = { a: { b: 2 } }
        const result = deepCompare(obj1, obj2)

        expect(result.isEqual).toBe(false)
        expect(result.differences[0].path).toBe('a.b')
      })

      it('CMP-006: 应该正确对比数组', () => {
        const obj1 = [1, 2, 3]
        const obj2 = [1, 2, 4]
        const result = deepCompare(obj1, obj2)

        expect(result.isEqual).toBe(false)
        expect(result.differences[0].path).toBe('[2]')
      })

      it('CMP-007: 应该检测数组长度差异', () => {
        const obj1 = [1, 2]
        const obj2 = [1, 2, 3]
        const result = deepCompare(obj1, obj2)

        expect(result.isEqual).toBe(false)
        const lengthDiff = result.differences.find((d) => d.path === '[2]')
        expect(lengthDiff).toBeDefined()
        expect(lengthDiff?.type).toBe('missing_left')
      })

      it('CMP-011: 应该检测类型差异', () => {
        const obj1 = { a: 1 }
        const obj2 = { a: '1' }
        const result = deepCompare(obj1, obj2)

        expect(result.isEqual).toBe(false)
        expect(result.differences[0].description).toContain('类型不同')
      })

      it('CMP-012: 应该区分null和undefined', () => {
        const obj1 = { a: null }
        const obj2 = { a: undefined }
        const result = deepCompare(obj1, obj2)

        expect(result.isEqual).toBe(false)
      })

      it('CMP-013: 应该正确对比空对象', () => {
        const result = deepCompare({}, {})

        expect(result.isEqual).toBe(true)
      })

      it('CMP-014: 应该正确对比空数组', () => {
        const result = deepCompare([], [])

        expect(result.isEqual).toBe(true)
      })
    })

    describe('对比选项', () => {
      it('CMP-008: 应该支持忽略大小写', () => {
        const obj1 = { a: 'ABC' }
        const obj2 = { a: 'abc' }
        const result = deepCompare(obj1, obj2, { ignoreCase: true })

        expect(result.isEqual).toBe(true)
      })

      it('CMP-009: 应该支持忽略数组顺序', () => {
        const obj1 = [1, 2, 3]
        const obj2 = [3, 2, 1]
        const result = deepCompare(obj1, obj2, { ignoreArrayOrder: true })

        expect(result.isEqual).toBe(true)
      })

      it('CMP-010: 应该支持忽略null/undefined', () => {
        const obj1 = { a: null }
        const obj2 = { a: undefined }
        const result = deepCompare(obj1, obj2, { ignoreNullUndefined: true })

        expect(result.isEqual).toBe(true)
      })
    })

    describe('深层嵌套对比', () => {
      it('CMP-015: 应该正确处理深层嵌套', () => {
        const depth = 10
        const obj1 = createNestedJson(depth)
        const obj2 = createNestedJson(depth)

        const result = deepCompare(obj1, obj2)
        expect(result.isEqual).toBe(true)
      })

      it('应该检测深层嵌套中的差异', () => {
        const obj1 = {
          level1: {
            level2: {
              level3: {
                value: 'a',
              },
            },
          },
        }
        const obj2 = {
          level1: {
            level2: {
              level3: {
                value: 'b',
              },
            },
          },
        }

        const result = deepCompare(obj1, obj2)
        expect(result.isEqual).toBe(false)
        expect(result.differences[0].path).toBe('level1.level2.level3.value')
      })
    })

    describe('复杂结构对比', () => {
      it('应该正确对比对象数组', () => {
        const obj1 = {
          users: [
            { id: 1, name: '张三' },
            { id: 2, name: '李四' },
          ],
        }
        const obj2 = {
          users: [
            { id: 1, name: '张三' },
            { id: 2, name: '王五' },
          ],
        }

        const result = deepCompare(obj1, obj2)
        expect(result.isEqual).toBe(false)
        expect(result.differences.some((d) => d.path.includes('users[1].name'))).toBe(true)
      })

      it('应该正确对比混合类型结构', () => {
        const obj1 = {
          string: 'hello',
          number: 123,
          boolean: true,
          null: null,
          array: [1, 2, 3],
          object: { nested: 'value' },
        }
        const obj2 = {
          string: 'hello',
          number: 123,
          boolean: true,
          null: null,
          array: [1, 2, 3],
          object: { nested: 'value' },
        }

        const result = deepCompare(obj1, obj2)
        expect(result.isEqual).toBe(true)
      })
    })
  })

  describe('shallowCompare', () => {
    it('SHL-001: 应该正确对比相同对象', () => {
      const result = shallowCompare({ a: 1 }, { a: 1 })

      expect(result.isEqual).toBe(true)
      expect(result.type).toBe('success')
    })

    it('SHL-002: 应该正确对比不同对象', () => {
      const result = shallowCompare({ a: 1 }, { a: 2 })

      expect(result.isEqual).toBe(false)
      expect(result.type).toBe('warning')
    })

    it('SHL-003: 键顺序不同时字符串化结果不同', () => {
      const obj1 = { a: 1, b: 2 }
      const obj2 = { b: 2, a: 1 }
      const result = shallowCompare(obj1, obj2)

      expect(result.isEqual).toBe(false)
    })

    it('SHL-004: 嵌套对象浅对比应该检测差异', () => {
      const obj1 = { a: { b: 1 } }
      const obj2 = { a: { b: 2 } }
      const result = shallowCompare(obj1, obj2)

      expect(result.isEqual).toBe(false)
    })

    it('应该正确对比数组', () => {
      const result = shallowCompare([1, 2, 3], [1, 2, 3])

      expect(result.isEqual).toBe(true)
    })

    it('应该正确对比null', () => {
      const result = shallowCompare(null, null)

      expect(result.isEqual).toBe(true)
    })
  })

  describe('compareByField', () => {
    it('FLD-001: 应该正确对比相同字段值', () => {
      const obj1 = { a: { b: 1 } }
      const obj2 = { a: { b: 1 } }
      const result = compareByField(obj1, obj2, 'a.b')

      expect(result.isEqual).toBe(true)
      expect(result.message).toContain('相同')
    })

    it('FLD-002: 应该正确对比不同字段值', () => {
      const obj1 = { a: { b: 1 } }
      const obj2 = { a: { b: 2 } }
      const result = compareByField(obj1, obj2, 'a.b')

      expect(result.isEqual).toBe(false)
      expect(result.differences[0].type).toBe('different')
    })

    it('FLD-003: 应该检测两侧都缺少字段', () => {
      const obj1 = { a: 1 }
      const obj2 = { b: 2 }
      const result = compareByField(obj1, obj2, 'c')

      expect(result.isEqual).toBe(false)
      expect(result.differences[0].type).toBe('missing_both')
    })

    it('FLD-004: 应该检测左侧缺少字段', () => {
      const obj1 = { a: 1 }
      const obj2 = { a: 1, b: 2 }
      const result = compareByField(obj1, obj2, 'b')

      expect(result.isEqual).toBe(false)
      expect(result.differences[0].type).toBe('missing_left')
    })

    it('FLD-005: 应该检测右侧缺少字段', () => {
      const obj1 = { a: 1, b: 2 }
      const obj2 = { a: 1 }
      const result = compareByField(obj1, obj2, 'b')

      expect(result.isEqual).toBe(false)
      expect(result.differences[0].type).toBe('missing_right')
    })

    it('FLD-006: 应该支持数组索引路径', () => {
      const obj1 = { arr: [1, 2, 3] }
      const obj2 = { arr: [1, 4, 3] }
      const result = compareByField(obj1, obj2, 'arr[1]')

      expect(result.isEqual).toBe(false)
    })

    it('FLD-007: 应该支持复杂路径', () => {
      const obj1 = { a: { b: { c: [{ d: 1 }] } } }
      const obj2 = { a: { b: { c: [{ d: 2 }] } } }
      const result = compareByField(obj1, obj2, 'a.b.c[0].d')

      expect(result.isEqual).toBe(false)
    })

    it('应该正确处理根路径', () => {
      const obj1 = { a: 1 }
      const obj2 = { a: 1 }
      const result = compareByField(obj1, obj2, 'a')

      expect(result.isEqual).toBe(true)
    })

    it('应该正确处理空路径（返回根对象对比结果）', () => {
      const obj1 = { a: 1 }
      const obj2 = { a: 1 }
      const result = compareByField(obj1, obj2, '')

      expect(result.isEqual).toBe(true)
    })
  })

  describe('getDiffTypeText', () => {
    it('应该返回正确的中文描述', () => {
      expect(getDiffTypeText('missing_left')).toBe('左侧缺失')
      expect(getDiffTypeText('missing_right')).toBe('右侧缺失')
      expect(getDiffTypeText('missing_both')).toBe('两侧缺失')
      expect(getDiffTypeText('different')).toBe('值不同')
    })

    it('应该处理未知类型', () => {
      expect(getDiffTypeText('unknown' as any)).toBe('unknown')
    })
  })

  describe('formatValue', () => {
    it('应该正确格式化undefined', () => {
      expect(formatValue(undefined)).toBe('undefined')
    })

    it('应该正确格式化null', () => {
      expect(formatValue(null)).toBe('null')
    })

    it('应该正确格式化字符串', () => {
      expect(formatValue('hello')).toBe('hello')
    })

    it('应该正确格式化数字', () => {
      expect(formatValue(123)).toBe('123')
    })

    it('应该正确格式化布尔值', () => {
      expect(formatValue(true)).toBe('true')
      expect(formatValue(false)).toBe('false')
    })

    it('应该正确格式化对象', () => {
      const result = formatValue({ a: 1 })
      expect(result).toContain('"a"')
      expect(result).toContain('1')
    })

    it('应该正确格式化数组', () => {
      const result = formatValue([1, 2, 3])
      expect(result).toContain('1')
      expect(result).toContain('2')
      expect(result).toContain('3')
    })
  })

  describe('性能测试', () => {
    it('应该在500ms内对比大型对象', () => {
      const timer = createTimer()
      const obj = createArrayJson(1000)

      timer.start()
      deepCompare(obj, obj)
      const elapsed = timer.elapsed()

      expect(elapsed).toBeLessThan(TEST_CONSTANTS.PERFORMANCE_TIMEOUT)
    })

    it('应该在500ms内对比深层嵌套对象', () => {
      const timer = createTimer()
      const obj = createNestedJson(50)

      timer.start()
      deepCompare(obj, obj)
      const elapsed = timer.elapsed()

      expect(elapsed).toBeLessThan(TEST_CONSTANTS.PERFORMANCE_TIMEOUT)
    })
  })

  describe('边界条件', () => {
    it('应该正确处理null输入', () => {
      const result = deepCompare(null, null)
      expect(result.isEqual).toBe(true)
    })

    it('应该正确处理undefined输入', () => {
      const result = deepCompare(undefined, undefined)
      expect(result.isEqual).toBe(true)
    })

    it('应该正确处理null与对象的对比', () => {
      const result = deepCompare(null, { a: 1 })
      expect(result.isEqual).toBe(false)
    })

    it('应该正确处理undefined与对象的对比', () => {
      const result = deepCompare(undefined, { a: 1 })
      expect(result.isEqual).toBe(false)
    })

    it('应该正确处理原始类型对比', () => {
      expect(deepCompare(1, 1).isEqual).toBe(true)
      expect(deepCompare('a', 'a').isEqual).toBe(true)
      expect(deepCompare(true, true).isEqual).toBe(true)
    })

    it('应该正确处理原始类型差异', () => {
      expect(deepCompare(1, 2).isEqual).toBe(false)
      expect(deepCompare('a', 'b').isEqual).toBe(false)
      expect(deepCompare(true, false).isEqual).toBe(false)
    })
  })
})
