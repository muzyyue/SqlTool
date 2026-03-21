/**
 * JSON 格式转换工具模块单元测试
 * @module test/unit/json/jsonConverter.test
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { convertFormat } from '@/utils/json/jsonConverter'
import type { FormatConverterOptions } from '@/types/json'
import {
  createNestedJson,
  createArrayJson,
  createTimer,
  TEST_CONSTANTS,
} from '../../utils/json-test-helpers'

describe('JSON 格式转换工具模块', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('JSON转XML', () => {
    it('XML-001: 应该正确转换简单对象', () => {
      const input = { name: '张三' }
      const result = convertFormat(input, { targetFormat: 'xml' })

      expect(result).toContain('<?xml version="1.0" encoding="UTF-8"?>')
      expect(result).toContain('<root>')
      expect(result).toContain('<name>张三</name>')
      expect(result).toContain('</root>')
    })

    it('XML-002: 应该正确转换嵌套对象', () => {
      const input = { user: { name: '张三' } }
      const result = convertFormat(input, { targetFormat: 'xml' })

      expect(result).toContain('<user>')
      expect(result).toContain('<name>张三</name>')
      expect(result).toContain('</user>')
    })

    it('XML-003: 应该正确转换数组', () => {
      const input = { items: [1, 2, 3] }
      const result = convertFormat(input, { targetFormat: 'xml' })

      expect(result).toContain('<items>')
      expect(result).toContain('<item>1</item>')
      expect(result).toContain('<item>2</item>')
      expect(result).toContain('<item>3</item>')
    })

    it('XML-004: 应该正确转义特殊字符', () => {
      const input = { text: '<>&\'"' }
      const result = convertFormat(input, { targetFormat: 'xml' })

      expect(result).toContain('&lt;')
      expect(result).toContain('&gt;')
      expect(result).toContain('&amp;')
    })

    it('XML-005: 应该支持自定义根元素名称', () => {
      const input = { name: '张三' }
      const result = convertFormat(input, { targetFormat: 'xml', xmlRootName: 'data' })

      expect(result).toContain('<data>')
      expect(result).toContain('</data>')
    })

    it('XML-006: 应该正确处理空对象', () => {
      const result = convertFormat({}, { targetFormat: 'xml' })

      expect(result).toContain('<root>')
      expect(result).toContain('</root>')
    })

    it('XML-007: 应该正确处理null值', () => {
      const input = { value: null }
      const result = convertFormat(input, { targetFormat: 'xml' })

      expect(result).toContain('<value></value>')
    })

    it('应该正确处理布尔值', () => {
      const input = { active: true, deleted: false }
      const result = convertFormat(input, { targetFormat: 'xml' })

      expect(result).toContain('<active>true</active>')
      expect(result).toContain('<deleted>false</deleted>')
    })

    it('应该正确处理数字', () => {
      const input = { count: 100, price: 3.14 }
      const result = convertFormat(input, { targetFormat: 'xml' })

      expect(result).toContain('<count>100</count>')
      expect(result).toContain('<price>3.14</price>')
    })
  })

  describe('JSON转YAML', () => {
    it('YML-001: 应该正确转换简单对象', () => {
      const input = { name: '张三', age: 25 }
      const result = convertFormat(input, { targetFormat: 'yaml' })

      expect(result).toContain('name: 张三')
      expect(result).toContain('age: 25')
    })

    it('YML-002: 应该正确转换嵌套对象', () => {
      const input = { user: { profile: { name: '张三' } } }
      const result = convertFormat(input, { targetFormat: 'yaml' })

      expect(result).toContain('user:')
      expect(result).toContain('profile:')
      expect(result).toContain('name: 张三')
    })

    it('YML-003: 应该正确转换数组', () => {
      const input = { items: [1, 2, 3] }
      const result = convertFormat(input, { targetFormat: 'yaml' })

      expect(result).toContain('- 1')
      expect(result).toContain('- 2')
      expect(result).toContain('- 3')
    })

    it('YML-004: 应该正确处理特殊字符', () => {
      const input = { text: 'hello:world' }
      const result = convertFormat(input, { targetFormat: 'yaml' })

      expect(result).toContain('"hello:world"')
    })

    it('YML-005: 应该正确处理多行字符串', () => {
      const input = { text: 'line1\nline2' }
      const result = convertFormat(input, { targetFormat: 'yaml' })

      expect(result).toContain('"line1\\nline2"')
    })

    it('YML-006: 应该正确处理null值', () => {
      const input = { value: null }
      const result = convertFormat(input, { targetFormat: 'yaml' })

      expect(result).toContain('value: null')
    })

    it('应该正确处理布尔值', () => {
      const input = { active: true, deleted: false }
      const result = convertFormat(input, { targetFormat: 'yaml' })

      expect(result).toContain('active: true')
      expect(result).toContain('deleted: false')
    })

    it('应该正确处理空对象', () => {
      const result = convertFormat({}, { targetFormat: 'yaml' })

      expect(result).toContain('{}')
    })

    it('应该正确处理空数组', () => {
      const result = convertFormat({ items: [] }, { targetFormat: 'yaml' })

      expect(result).toContain('items: []')
    })
  })

  describe('JSON转CSV', () => {
    it('CSV-001: 应该正确转换对象数组', () => {
      const input = [{ name: '张三', age: 25 }]
      const result = convertFormat(input, { targetFormat: 'csv' })

      expect(result).toContain('name,age')
      expect(result).toContain('张三,25')
    })

    it('CSV-002: 应该包含表头', () => {
      const input = [{ name: '张三' }]
      const result = convertFormat(input, { targetFormat: 'csv', includeHeader: true })

      const lines = result.split('\n')
      expect(lines[0]).toBe('name')
    })

    it('CSV-003: 应该支持不包含表头', () => {
      const input = [{ name: '张三' }]
      const result = convertFormat(input, { targetFormat: 'csv', includeHeader: false })

      const lines = result.split('\n')
      expect(lines[0]).toBe('张三')
    })

    it('CSV-004: 应该支持自定义分隔符', () => {
      const input = [{ a: 1, b: 2 }]
      const result = convertFormat(input, { targetFormat: 'csv', csvDelimiter: ';' })

      expect(result).toContain('a;b')
      expect(result).toContain('1;2')
    })

    it('CSV-005: 应该正确转义特殊字符', () => {
      const input = [{ text: 'hello,world' }]
      const result = convertFormat(input, { targetFormat: 'csv' })

      expect(result).toContain('"hello,world"')
    })

    it('CSV-006: 应该正确处理空数组', () => {
      const result = convertFormat([], { targetFormat: 'csv' })

      expect(result).toBe('')
    })

    it('CSV-007: 应该在非数组输入时抛出错误', () => {
      const input = { name: '张三' }

      expect(() => convertFormat(input, { targetFormat: 'csv' })).toThrow(
        'CSV 转换需要数组类型的数据',
      )
    })

    it('CSV-008: 应该在非对象数组输入时抛出错误', () => {
      const input = [1, 2, 3]

      expect(() => convertFormat(input, { targetFormat: 'csv' })).toThrow(
        'CSV 转换需要对象数组类型的数据',
      )
    })

    it('应该正确处理多行数据', () => {
      const input = [
        { id: 1, name: '张三' },
        { id: 2, name: '李四' },
      ]
      const result = convertFormat(input, { targetFormat: 'csv' })

      const lines = result.split('\n')
      expect(lines.length).toBe(3)
      expect(lines[1]).toContain('张三')
      expect(lines[2]).toContain('李四')
    })

    it('应该正确处理包含引号的值', () => {
      const input = [{ text: 'hello"world' }]
      const result = convertFormat(input, { targetFormat: 'csv' })

      expect(result).toContain('"hello""world"')
    })
  })

  describe('JSON转SQL', () => {
    it('SQL-001: 应该正确生成INSERT语句', () => {
      const input = [{ name: '张三', age: 25 }]
      const result = convertFormat(input, { targetFormat: 'sql' })

      expect(result).toContain('INSERT INTO "json_data"')
      expect(result).toContain('"name", "age"')
      expect(result).toContain("('张三', 25)")
    })

    it('SQL-002: 应该支持自定义表名', () => {
      const input = [{ name: '张三' }]
      const result = convertFormat(input, { targetFormat: 'sql', sqlTableName: 'users' })

      expect(result).toContain('INSERT INTO "users"')
    })

    it('SQL-003: 应该正确生成多行VALUES', () => {
      const input = [{ id: 1 }, { id: 2 }]
      const result = convertFormat(input, { targetFormat: 'sql' })

      expect(result).toContain('(1)')
      expect(result).toContain('(2)')
    })

    it('SQL-004: 应该正确转义字符串中的单引号', () => {
      const input = [{ text: "it's" }]
      const result = convertFormat(input, { targetFormat: 'sql' })

      expect(result).toContain("'it''s'")
    })

    it('SQL-005: 应该正确处理NULL值', () => {
      const input = [{ value: null }]
      const result = convertFormat(input, { targetFormat: 'sql' })

      expect(result).toContain('NULL')
    })

    it('SQL-006: 应该正确处理布尔值', () => {
      const input = [{ active: true }]
      const result = convertFormat(input, { targetFormat: 'sql' })

      expect(result).toContain('TRUE')
    })

    it('SQL-007: 应该正确处理空数组', () => {
      const result = convertFormat([], { targetFormat: 'sql' })

      expect(result).toBe('')
    })

    it('应该在非数组输入时抛出错误', () => {
      const input = { name: '张三' }

      expect(() => convertFormat(input, { targetFormat: 'sql' })).toThrow(
        'SQL 转换需要数组类型的数据',
      )
    })

    it('应该在非对象数组输入时抛出错误', () => {
      const input = [1, 2, 3]

      expect(() => convertFormat(input, { targetFormat: 'sql' })).toThrow(
        'SQL 转换需要对象数组类型的数据',
      )
    })

    it('应该正确处理数字', () => {
      const input = [{ count: 100, price: 3.14 }]
      const result = convertFormat(input, { targetFormat: 'sql' })

      expect(result).toContain('100')
      expect(result).toContain('3.14')
    })
  })

  describe('JSON转TOML', () => {
    it('TOML-001: 应该正确转换简单对象', () => {
      const input = { name: '张三', age: 25 }
      const result = convertFormat(input, { targetFormat: 'toml' })

      expect(result).toContain('name = "张三"')
      expect(result).toContain('age = 25')
    })

    it('TOML-002: 应该正确转换嵌套对象', () => {
      const input = { database: { host: 'localhost' } }
      const result = convertFormat(input, { targetFormat: 'toml' })

      expect(result).toContain('[database]')
      expect(result).toContain('host = "localhost"')
    })

    it('TOML-003: 应该正确转换数组', () => {
      const input = { items: [1, 2, 3] }
      const result = convertFormat(input, { targetFormat: 'toml' })

      expect(result).toContain('items = [1, 2, 3]')
    })

    it('TOML-004: 应该正确转换对象数组', () => {
      const input = { users: [{ name: '张三' }] }
      const result = convertFormat(input, { targetFormat: 'toml' })

      expect(result).toContain('[[users]]')
      expect(result).toContain('name = "张三"')
    })

    it('应该正确处理布尔值', () => {
      const input = { active: true, deleted: false }
      const result = convertFormat(input, { targetFormat: 'toml' })

      expect(result).toContain('active = true')
      expect(result).toContain('deleted = false')
    })

    it('应该正确处理null值', () => {
      const input = { value: null }
      const result = convertFormat(input, { targetFormat: 'toml' })

      expect(result).toContain('value = ""')
    })

    it('应该在非对象输入时抛出错误', () => {
      const input = [1, 2, 3]

      expect(() => convertFormat(input, { targetFormat: 'toml' })).toThrow(
        'TOML 转换需要对象类型的数据',
      )
    })

    it('应该正确处理多行字符串', () => {
      const input = { text: 'line1\nline2' }
      const result = convertFormat(input, { targetFormat: 'toml' })

      expect(result).toContain('"""line1\nline2"""')
    })
  })

  describe('错误处理', () => {
    it('应该在传入不支持的格式时抛出错误', () => {
      const input = { name: '张三' }

      expect(() =>
        convertFormat(input, { targetFormat: 'unsupported' as any }),
      ).toThrow('不支持的目标格式')
    })

    it('应该在传入无效JSON字符串时抛出错误', () => {
      expect(() =>
        convertFormat('{invalid}', { targetFormat: 'xml' }),
      ).toThrow()
    })
  })

  describe('性能测试', () => {
    it('应该在500ms内转换XML', () => {
      const timer = createTimer()
      const input = createNestedJson(5)

      timer.start()
      convertFormat(input, { targetFormat: 'xml' })
      const elapsed = timer.elapsed()

      expect(elapsed).toBeLessThan(TEST_CONSTANTS.PERFORMANCE_TIMEOUT)
    })

    it('应该在500ms内转换YAML', () => {
      const timer = createTimer()
      const input = createNestedJson(5)

      timer.start()
      convertFormat(input, { targetFormat: 'yaml' })
      const elapsed = timer.elapsed()

      expect(elapsed).toBeLessThan(TEST_CONSTANTS.PERFORMANCE_TIMEOUT)
    })

    it('应该在500ms内转换CSV', () => {
      const timer = createTimer()
      const input = createArrayJson(100)

      timer.start()
      convertFormat(input, { targetFormat: 'csv' })
      const elapsed = timer.elapsed()

      expect(elapsed).toBeLessThan(TEST_CONSTANTS.PERFORMANCE_TIMEOUT)
    })

    it('应该在500ms内转换SQL', () => {
      const timer = createTimer()
      const input = createArrayJson(100)

      timer.start()
      convertFormat(input, { targetFormat: 'sql' })
      const elapsed = timer.elapsed()

      expect(elapsed).toBeLessThan(TEST_CONSTANTS.PERFORMANCE_TIMEOUT)
    })
  })

  describe('边界条件', () => {
    it('应该正确处理空对象', () => {
      const result = convertFormat({}, { targetFormat: 'xml' })
      expect(result).toContain('<root>')
    })

    it('应该正确处理空数组（CSV）', () => {
      const result = convertFormat([], { targetFormat: 'csv' })
      expect(result).toBe('')
    })

    it('应该正确处理空数组（SQL）', () => {
      const result = convertFormat([], { targetFormat: 'sql' })
      expect(result).toBe('')
    })

    it('应该正确处理null输入', () => {
      const result = convertFormat(null, { targetFormat: 'xml' })
      expect(result).toContain('<root>')
    })

    it('应该正确处理深层嵌套', () => {
      const input = createNestedJson(10)
      const result = convertFormat(input, { targetFormat: 'xml' })

      expect(result).toBeDefined()
      expect(result.length).toBeGreaterThan(0)
    })
  })
})
