/**
 * JSON提取引擎单元测试
 */

import { describe, it, expect } from 'vitest'
import {
  extractJsonBlocks,
  parseJsonPairs,
  extractByJsonPath,
  extractAtomicValues,
  analyzeJsonStructure
} from '@/utils/json/jsonExtractor'

describe('jsonExtractor', () => {
  describe('extractJsonBlocks', () => {
    it('应从混合文本中识别单个JSON对象', () => {
      const text = `日志信息: {"userId": 12345, "ip": "192.168.1.100"} 结束`
      const blocks = extractJsonBlocks(text)
      expect(blocks).toHaveLength(1)
      expect(blocks[0].json).toContain('"userId"')
    })

    it('应从混合文本中识别多个JSON块', () => {
      const text = `
        [2024-01-15] 用户登录 {"userId": 123}
        [2024-01-15] API调用 {"error": "timeout", "code": 500}
        [2024-01-15] 配置更新 {"debug": true, "level": "info"}
      `
      expect(extractJsonBlocks(text)).toHaveLength(3)
    })

    it('应识别JSON数组', () => {
      const blocks = extractJsonBlocks(`数据: [{"id": 1}, {"id": 2}, {"id": 3}]`)
      expect(blocks).toHaveLength(1)
      expect(blocks[0].json).toMatch(/^\[/)
    })

    it('应忽略非法JSON', () => {
      const blocks = extractJsonBlocks(`{invalid json} 正常文本: {"valid": true}`)
      expect(blocks).toHaveLength(1)
    })

    it('空文本应返回空数组', () => {
      expect(extractJsonBlocks('')).toEqual([])
      expect(extractJsonBlocks(null)).toEqual([])
    })
  })

  describe('parseJsonPairs', () => {
    it('应提取基础对象的键值对', () => {
      const pairs = parseJsonPairs({ name: '张三', age: 25, active: true })
      expect(pairs).toHaveLength(3)
      expect(pairs.find(p => p.key === 'name').value).toBe('张三')
      expect(pairs.find(p => p.key === 'name').path).toBe('$.name')
    })

    it('应递归提取嵌套对象', () => {
      const pairs = parseJsonPairs({ user: { name: '张三', address: { city: '北京' } } })
      expect(pairs.find(p => p.key === 'city').value).toBe('北京')
    })

    it('应处理数组（不展开模式）', () => {
      const pairs = parseJsonPairs({ tags: ['Vue'] }, { includeArrays: false })
      expect(pairs[0].dataType).toBe('array')
    })

    it('应展开数组元素（展开模式）', () => {
      const pairs = parseJsonPairs({ items: [1, 2, 3] }, { includeArrays: true })
      expect(pairs).toHaveLength(3)
      expect(pairs[0].path).toBe('$.items[0]')
    })

    it('应处理null值', () => {
      expect(parseJsonPairs({ value: null })[0].dataType).toBe('null')
    })
  })

  describe('extractByJsonPath', () => {
    it('应根据路径提取值', () => {
      const results = extractByJsonPath(
        { store: { book: [{ title: 'A' }, { title: 'B' }] } },
        ['$.store.book[0].title', '$.store.book[1].price']
      )
      expect(results[0].value).toBe('A')
    })

    it('应处理无效路径', () => {
      expect(extractByJsonPath({ name: 'test' }, ['$.nonexistent'])[0].status).toBe('error')
    })
  })

  describe('extractAtomicValues - 智能解包核心功能', () => {
    it('应提取基础原子值', () => {
      const results = extractAtomicValues({ name: '张三', age: 25, active: true })
      expect(results).toHaveLength(3)
      const r = results.find(x => x.finalValue === '张三')
      expect(r.fullPath).toBe('$.name')
      expect(r.parseDepth).toBe(1)
    })

    it('应解包单层字符串化JSON（用户实际场景）', () => {
      const json = [{ field: 'files', type: 'files', value: '[{"type": 1, "value": "询问笔录,起诉意见书"}]' }]
      const results = extractAtomicValues(json)

      const targetValue = results.find(r => r.finalValue === '询问笔录,起诉意见书')
      expect(targetValue).toBeDefined()
      expect(targetValue.fullPath).toBe('$[0].value[0].value')
      expect(targetValue.parseDepth).toBe(5)
      expect(targetValue.metadata.isEscapedJson).toBe(true)
    })

    it('应解包多层嵌套字符串化JSON', () => {
      const results = extractAtomicValues(
        { data: '{"inner": "[{\\"deep\\": \\"最终值\\"}]"}' },
        { maxDepth: 5 }
      )
      expect(results.find(r => r.finalValue === '最终值')).toBeDefined()
    })

    it('应生成完整的数据血缘链路', () => {
      const results = extractAtomicValues(
        { field: 'test', value: '{"nested": "目标值"}' },
        { includeLineage: true }
      )
      const t = results.find(r => r.finalValue === '目标值')
      expect(t.lineage.some(s => s.action === 'parse-json-string')).toBe(true)
    })

    it('应在达到最大深度时停止并标记', () => {
      const json = { l1: JSON.stringify({ l2: JSON.stringify({ l3: JSON.stringify({ l4: 'deep' }) }) }) }
      expect(extractAtomicValues(json, { maxDepth: 2 }).filter(r => r.status === 'depth-limit').length).toBeGreaterThan(0)
    })

    it('应检测循环引用', () => {
      const json = { a: 1 }; json.self = json
      expect(extractAtomicValues(json).filter(r => r.status === 'circular-ref').length).toBeGreaterThan(0)
    })

    it('应正确处理null/undefined/空字符串', () => {
      const results = extractAtomicValues({ n: null, s: '', num: 42 })
      expect(results.find(r => r.finalValue === null)).toBeDefined()
    })

    it('性能测试：1000个键的解包时间应小于500ms', () => {
      const obj = {}; for (let i = 0; i < 1000; i++) obj[`k${i}`] = `v${i}`
      const start = performance.now()
      expect(extractAtomicValues(obj).length).toBe(1000)
      expect(performance.now() - start).toBeLessThan(500)
    })
  })

  describe('analyzeJsonStructure', () => {
    it('应正确分析简单对象结构', () => {
      const a = analyzeJsonStructure({ a: 1, b: 'x', c: true, d: null })
      expect(a.depth).toBe(0)
      expect(a.totalKeys).toBe(4)
    })

    it('应计算嵌套深度', () => {
      expect(analyzeJsonStructure({ l1: { l2: { l3: {} } } }).depth).toBe(3)
    })
  })

  describe('边界情况', () => {
    it('应处理特殊字符', () => {
      expect(parseJsonPairs({ name: '中文 🎉' })[0].value).toBe('中文 🎉')
    })
    it('应处理转义字符', () => {
      expect(parseJsonPairs({ p: 'C:\\U' })[0].value).toContain('C:\\')
    })
  })
})
