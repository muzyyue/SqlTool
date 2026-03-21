/**
 * JSON 格式化工具模块单元测试
 * @module test/unit/json/jsonFormatter.test
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  formatJson,
  minifyJson,
  escapeJson,
  unescapeJson,
  validateJson,
  calculateJsonStats,
  handleChineseComma,
  handleChineseQuote,
  encodeUnicode,
  decodeUnicode,
  formatSize,
} from '@/utils/json/jsonFormatter'
import {
  createSimpleJson,
  createNestedJson,
  createSpecialCharsJson,
  createUnicodeJson,
  createInvalidJson,
  createTimer,
  TEST_CONSTANTS,
} from '../../utils/json-test-helpers'

describe('JSON 格式化工具模块', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('formatJson', () => {
    describe('基础格式化功能', () => {
      it('FMT-001: 应该正确格式化简单对象', () => {
        const input = { name: '张三', age: 25 }
        const result = formatJson(input)

        expect(result).toContain('"name"')
        expect(result).toContain('"张三"')
        expect(result).toContain('"age"')
        expect(result).toContain('25')
        expect(result).toMatch(/^\{[\s\S]*\}$/)
      })

      it('FMT-002: 应该正确格式化嵌套对象', () => {
        const input = { user: { profile: { name: '张三' } } }
        const result = formatJson(input)

        expect(result).toContain('"user"')
        expect(result).toContain('"profile"')
        expect(result).toContain('"张三"')
        const lines = result.split('\n')
        expect(lines.length).toBeGreaterThan(3)
      })

      it('FMT-003: 应该正确格式化数组', () => {
        const input = [1, 2, 3, 4, 5]
        const result = formatJson(input)

        expect(result).toBe('[\n  1,\n  2,\n  3,\n  4,\n  5\n]')
      })

      it('FMT-004: 应该正确格式化空对象', () => {
        const result = formatJson({})
        expect(result).toBe('{}')
      })

      it('FMT-005: 应该正确格式化空数组', () => {
        const result = formatJson([])
        expect(result).toBe('[]')
      })

      it('FMT-006: 应该正确处理null值', () => {
        const input = { value: null }
        const result = formatJson(input)

        expect(result).toContain('null')
      })

      it('FMT-007: 应该正确处理布尔值', () => {
        const input = { active: true, deleted: false }
        const result = formatJson(input)

        expect(result).toContain('true')
        expect(result).toContain('false')
      })

      it('FMT-008: 应该正确处理各种数字类型', () => {
        const input = { int: 123, float: 3.14, negative: -100 }
        const result = formatJson(input)

        expect(result).toContain('"int": 123')
        expect(result).toContain('"float": 3.14')
        expect(result).toContain('"negative": -100')
      })

      it('FMT-009: 应该正确处理转义字符', () => {
        const input = { text: 'hello\nworld\ttab' }
        const result = formatJson(input)

        expect(result).toContain('hello\\nworld\\ttab')
      })

      it('FMT-010: 应该正确处理Unicode字符', () => {
        const input = { name: '张三', emoji: '😀' }
        const result = formatJson(input)

        expect(result).toContain('张三')
        expect(result).toContain('😀')
      })
    })

    describe('格式化选项', () => {
      it('FMT-011: 应该支持自定义缩进空格数', () => {
        const input = { a: 1 }
        const result = formatJson(input, { indentSpaces: 4 })

        expect(result).toContain('    "a"')
      })

      it('FMT-012: 应该支持紧凑格式', () => {
        const input = { a: 1, b: 2 }
        const result = formatJson(input, { formatStyle: 'compact' })

        expect(result).toBe('{"a":1,"b":2}')
        expect(result).not.toContain('\n')
      })

      it('FMT-013: 应该支持键排序', () => {
        const input = { c: 1, a: 2, b: 3 }
        const result = formatJson(input, { sortKeys: true })

        const keys = result.match(/"[a-z]":/g) || []
        expect(keys[0]).toBe('"a":')
        expect(keys[1]).toBe('"b":')
        expect(keys[2]).toBe('"c":')
      })
    })

    describe('输入类型处理', () => {
      it('FMT-014: 应该接受JSON字符串作为输入', () => {
        const input = '{"name":"张三"}'
        const result = formatJson(input)

        expect(result).toContain('"张三"')
      })

      it('FMT-015: 应该接受JSON对象作为输入', () => {
        const input = { name: '张三' }
        const result = formatJson(input)

        expect(result).toContain('"张三"')
      })

      it('应该在输入无效JSON字符串时抛出错误', () => {
        const input = '{invalid json}'

        expect(() => formatJson(input)).toThrow('JSON 格式化失败')
      })
    })
  })

  describe('minifyJson', () => {
    it('MIN-001: 应该正确压缩格式化JSON', () => {
      const input = '{\n  "name": "张三"\n}'
      const result = minifyJson(input)

      expect(result).toBe('{"name":"张三"}')
      expect(result).not.toContain('\n')
      expect(result).not.toContain(' ')
    })

    it('MIN-002: 应该正确压缩带多余空白的JSON', () => {
      const input = '{  "name"  :  "张三"  }'
      const result = minifyJson(input)

      expect(result).toBe('{"name":"张三"}')
    })

    it('MIN-003: 应该正确压缩空对象', () => {
      const result = minifyJson({})
      expect(result).toBe('{}')
    })

    it('MIN-004: 应该正确压缩空数组', () => {
      const result = minifyJson([])
      expect(result).toBe('[]')
    })

    it('MIN-005: 应该正确压缩嵌套对象', () => {
      const input = {
        user: {
          name: '张三',
        },
      }
      const result = minifyJson(input)

      expect(result).toBe('{"user":{"name":"张三"}}')
    })

    it('应该在输入无效JSON时抛出错误', () => {
      expect(() => minifyJson('{invalid}')).toThrow('JSON 压缩失败')
    })
  })

  describe('escapeJson', () => {
    it('ESC-001: 应该正确转义换行符', () => {
      const result = escapeJson('hello\nworld')
      expect(result).toBe('hello\\nworld')
    })

    it('ESC-002: 应该正确转义制表符', () => {
      const result = escapeJson('hello\tworld')
      expect(result).toBe('hello\\tworld')
    })

    it('ESC-003: 应该正确转义回车符', () => {
      const result = escapeJson('hello\rworld')
      expect(result).toBe('hello\\rworld')
    })

    it('ESC-004: 应该正确转义双引号', () => {
      const result = escapeJson('hello"world')
      expect(result).toBe('hello\\"world')
    })

    it('ESC-005: 应该正确转义反斜杠', () => {
      const result = escapeJson('hello\\world')
      expect(result).toBe('hello\\\\world')
    })

    it('ESC-006: 应该正确转义退格符', () => {
      const result = escapeJson('hello\bworld')
      expect(result).toBe('hello\\bworld')
    })

    it('ESC-007: 应该正确转义换页符', () => {
      const result = escapeJson('hello\fworld')
      expect(result).toBe('hello\\fworld')
    })

    it('ESC-008: 应该正确处理多个转义字符', () => {
      const result = escapeJson('a\nb\tc\rd"e\\f')
      expect(result).toBe('a\\nb\\tc\\rd\\"e\\\\f')
    })

    it('ESC-009: 应该正确处理空字符串', () => {
      const result = escapeJson('')
      expect(result).toBe('')
    })

    it('ESC-010: 应该正确处理不含特殊字符的字符串', () => {
      const result = escapeJson('hello world')
      expect(result).toBe('hello world')
    })
  })

  describe('unescapeJson', () => {
    it('ESC-008: 应该正确反转义换行符', () => {
      const result = unescapeJson('hello\\nworld')
      expect(result).toBe('hello\nworld')
    })

    it('ESC-009: 应该正确反转义双引号', () => {
      const result = unescapeJson('hello\\"world')
      expect(result).toBe('hello"world')
    })

    it('ESC-010: 应该正确反转义反斜杠', () => {
      const result = unescapeJson('hello\\\\world')
      expect(result).toBe('hello\\world')
    })

    it('ESC-011: 应该正确反转义多个字符', () => {
      const result = unescapeJson('a\\nb\\tc\\rd\\"e\\\\f')
      expect(result).toBe('a\nb\tc\rd"e\f')
    })

    it('ESC-012: 应该正确处理空字符串', () => {
      const result = unescapeJson('')
      expect(result).toBe('')
    })
  })

  describe('escapeJson / unescapeJson 双向转换', () => {
    it('ESC-011: 双向转换应该保持一致性（不含特殊字符）', () => {
      const original = 'hello world'
      const escaped = escapeJson(original)
      const unescaped = unescapeJson(escaped)

      expect(unescaped).toBe(original)
    })

    it('应该正确处理换行符的反转义', () => {
      const escapedStr = 'hello\\nworld'
      const unescaped = unescapeJson(escapedStr)

      expect(unescaped).toBe('hello\nworld')
    })

    it('应该正确处理制表符的反转义', () => {
      const escapedStr = 'hello\\tworld'
      const unescaped = unescapeJson(escapedStr)

      expect(unescaped).toBe('hello\tworld')
    })
  })

  describe('validateJson', () => {
    it('VAL-001: 应该验证有效JSON', () => {
      const result = validateJson('{"name":"张三"}')

      expect(result.isValid).toBe(true)
      expect(result.errorMessage).toBeUndefined()
    })

    it('VAL-002: 应该验证空字符串', () => {
      const result = validateJson('')

      expect(result.isValid).toBe(false)
      expect(result.errorMessage).toContain('JSON 字符串为空')
    })

    it('VAL-003: 应该验证空白字符串', () => {
      const result = validateJson('   ')

      expect(result.isValid).toBe(false)
    })

    it('VAL-004: 应该检测缺少引号的键', () => {
      const result = validateJson('{name: "张三"}')

      expect(result.isValid).toBe(false)
      expect(result.errorMessage).toBeDefined()
    })

    it('VAL-005: 应该检测缺少大括号', () => {
      const result = validateJson('{"name": "张三"')

      expect(result.isValid).toBe(false)
      expect(result.errorMessage).toBeDefined()
    })

    it('VAL-006: 应该检测多余逗号', () => {
      const result = validateJson('{"name": "张三",}')

      expect(result.isValid).toBe(false)
    })

    it('VAL-007: 应该检测中文逗号', () => {
      const result = validateJson('{"name"，"张三"}')

      expect(result.isValid).toBe(false)
    })

    it('VAL-008: 应该检测中文引号', () => {
      const result = validateJson('{"name"："张三"}')

      expect(result.isValid).toBe(false)
    })

    it('VAL-009: 应该返回错误位置信息', () => {
      const result = validateJson('{name: "张三"}')

      expect(result.isValid).toBe(false)
      expect(result.errorPosition).toBeDefined()
    })

    it('VAL-010: 应该返回友好的错误消息', () => {
      const result = validateJson('{invalid}')

      expect(result.isValid).toBe(false)
      expect(result.errorMessage).toBeDefined()
      expect(typeof result.errorMessage).toBe('string')
    })

    it('应该验证数组JSON', () => {
      const result = validateJson('[1, 2, 3]')

      expect(result.isValid).toBe(true)
    })

    it('应该验证null值', () => {
      const result = validateJson('null')

      expect(result.isValid).toBe(true)
    })
  })

  describe('calculateJsonStats', () => {
    it('STA-001: 应该正确统计对象数量', () => {
      const input = { a: {}, b: {} }
      const stats = calculateJsonStats(input)

      expect(stats.objectCount).toBe(3)
    })

    it('STA-002: 应该正确统计数组数量', () => {
      const input = { arr: [1, 2, 3] }
      const stats = calculateJsonStats(input)

      expect(stats.arrayCount).toBe(1)
    })

    it('STA-003: 应该正确统计字段总数', () => {
      const input = { a: 1, b: 2, c: 3 }
      const stats = calculateJsonStats(input)

      expect(stats.fieldCount).toBe(3)
    })

    it('STA-004: 应该正确统计数据大小', () => {
      const input = { name: '张三' }
      const stats = calculateJsonStats(input)

      expect(stats.size).toBeGreaterThan(0)
    })

    it('STA-005: 应该正确统计字符串数量', () => {
      const input = { a: 'x', b: 'y' }
      const stats = calculateJsonStats(input)

      expect(stats.stringCount).toBe(2)
    })

    it('STA-006: 应该正确统计数字数量', () => {
      const input = { a: 1, b: 2.5 }
      const stats = calculateJsonStats(input)

      expect(stats.numberCount).toBe(2)
    })

    it('STA-007: 应该正确统计布尔数量', () => {
      const input = { a: true, b: false }
      const stats = calculateJsonStats(input)

      expect(stats.booleanCount).toBe(2)
    })

    it('STA-008: 应该正确统计null数量', () => {
      const input = { a: null, b: null }
      const stats = calculateJsonStats(input)

      expect(stats.nullCount).toBe(2)
    })

    it('STA-009: 应该正确统计最大深度', () => {
      const input = { a: { b: { c: {} } } }
      const stats = calculateJsonStats(input)

      expect(stats.maxDepth).toBe(3)
    })

    it('STA-010: 应该正确统计空对象', () => {
      const stats = calculateJsonStats({})

      expect(stats.objectCount).toBe(1)
      expect(stats.fieldCount).toBe(0)
    })

    it('应该正确统计嵌套结构', () => {
      const input = {
        user: {
          name: '张三',
          tags: ['a', 'b'],
        },
      }
      const stats = calculateJsonStats(input)

      expect(stats.objectCount).toBe(2)
      expect(stats.arrayCount).toBe(1)
      expect(stats.stringCount).toBe(3)
      expect(stats.fieldCount).toBe(3)
    })

    it('应该在输入无效JSON时返回默认值', () => {
      const stats = calculateJsonStats('invalid json')

      expect(stats.objectCount).toBe(0)
      expect(stats.size).toBe(0)
    })
  })

  describe('handleChineseComma', () => {
    it('应该将中文逗号替换为英文逗号', () => {
      const result = handleChineseComma('{"name"，"张三"}')
      expect(result).toBe('{"name","张三"}')
    })

    it('应该处理多个中文逗号', () => {
      const result = handleChineseComma('a，b，c')
      expect(result).toBe('a,b,c')
    })

    it('应该保留英文逗号不变', () => {
      const result = handleChineseComma('{"name": "张三"}')
      expect(result).toBe('{"name": "张三"}')
    })
  })

  describe('handleChineseQuote', () => {
    it('应该将中文双引号替换为英文双引号', () => {
      const result = handleChineseQuote('"name"')
      expect(result).toBe('"name"')
    })

    it('应该将中文单引号替换为英文单引号', () => {
      const result = handleChineseQuote("'name'")
      expect(result).toBe("'name'")
    })

    it('应该处理混合引号', () => {
      const result = handleChineseQuote('"name"')
      expect(result).toBe('"name"')
    })
  })

  describe('encodeUnicode', () => {
    it('UNI-001: 应该正确编码中文', () => {
      const result = encodeUnicode('张三')
      expect(result).toBe('\\u5f20\\u4e09')
    })

    it('UNI-003: 应该正确处理混合内容', () => {
      const result = encodeUnicode('hello张三world')
      expect(result).toBe('hello\\u5f20\\u4e09world')
    })

    it('UNI-004: 应该正确编码emoji（emoji不在中文编码范围内）', () => {
      const result = encodeUnicode('😀')
      expect(result).toBe('😀')
    })

    it('应该保留非中文字符不变', () => {
      const result = encodeUnicode('hello world')
      expect(result).toBe('hello world')
    })
  })

  describe('decodeUnicode', () => {
    it('UNI-002: 应该正确解码Unicode', () => {
      const result = decodeUnicode('\\u5f20\\u4e09')
      expect(result).toBe('张三')
    })

    it('应该正确解码混合内容', () => {
      const result = decodeUnicode('hello\\u5f20\\u4e09world')
      expect(result).toBe('hello张三world')
    })

    it('应该保留非Unicode转义序列不变', () => {
      const result = decodeUnicode('hello world')
      expect(result).toBe('hello world')
    })
  })

  describe('encodeUnicode / decodeUnicode 双向转换', () => {
    it('UNI-005: 双向转换应该保持一致性', () => {
      const original = '张三李四'
      const encoded = encodeUnicode(original)
      const decoded = decodeUnicode(encoded)

      expect(decoded).toBe(original)
    })
  })

  describe('formatSize', () => {
    it('应该正确格式化字节', () => {
      expect(formatSize(500)).toBe('500 B')
    })

    it('应该正确格式化KB', () => {
      expect(formatSize(1024)).toBe('1 KB')
    })

    it('应该正确格式化MB', () => {
      expect(formatSize(1024 * 1024)).toBe('1 MB')
    })

    it('应该正确格式化GB', () => {
      expect(formatSize(1024 * 1024 * 1024)).toBe('1 GB')
    })

    it('应该正确处理0字节', () => {
      expect(formatSize(0)).toBe('0 B')
    })

    it('应该保留两位小数', () => {
      const result = formatSize(1500)
      expect(result).toMatch(/^\d+\.\d{2} KB$/)
    })
  })

  describe('性能测试', () => {
    it('应该在500ms内处理1KB JSON', () => {
      const timer = createTimer()
      const json = createSimpleJson()

      timer.start()
      formatJson(json)
      const elapsed = timer.elapsed()

      expect(elapsed).toBeLessThan(TEST_CONSTANTS.PERFORMANCE_TIMEOUT)
    })

    it('应该在500ms内验证1KB JSON', () => {
      const timer = createTimer()
      const json = JSON.stringify(createSimpleJson())

      timer.start()
      validateJson(json)
      const elapsed = timer.elapsed()

      expect(elapsed).toBeLessThan(TEST_CONSTANTS.PERFORMANCE_TIMEOUT)
    })

    it('应该在500ms内计算统计信息', () => {
      const timer = createTimer()
      const json = createNestedJson(10)

      timer.start()
      calculateJsonStats(json)
      const elapsed = timer.elapsed()

      expect(elapsed).toBeLessThan(TEST_CONSTANTS.PERFORMANCE_TIMEOUT)
    })
  })
})
