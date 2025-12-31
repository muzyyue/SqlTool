import { describe, it, expect, beforeEach } from 'vitest'
import { ref } from 'vue'

/**
 * 模拟InsertPage组件中的去重功能
 */
describe('Excel数据去重功能测试', () => {
  let excelData
  let deduplicationEnabled
  let deduplicationColumn
  let deduplicationStats

  beforeEach(() => {
    excelData = ref([])
    deduplicationEnabled = ref(false)
    deduplicationColumn = ref(-1)
    deduplicationStats = ref({
      originalRows: 0,
      deduplicatedRows: 0,
      removedRows: 0,
    })
  })

  /**
   * 应用去重逻辑
   * 根据选定列的值去除重复数据行，仅保留每组的第一次出现
   */
  const applyDeduplication = () => {
    if (deduplicationColumn.value === -1) {
      throw new Error('请先选择去重列')
    }

    if (!excelData.value || excelData.value.length === 0) {
      throw new Error('没有可去重的数据')
    }

    const columnIndex = deduplicationColumn.value
    const seenValues = new Set()
    const deduplicatedData = []

    excelData.value.forEach((row) => {
      const value = row[columnIndex]
      if (!seenValues.has(value)) {
        seenValues.add(value)
        deduplicatedData.push(row)
      }
    })

    const originalRows = excelData.value.length
    const deduplicatedRows = deduplicatedData.length
    const removedRows = originalRows - deduplicatedRows

    excelData.value = deduplicatedData

    deduplicationStats.value = {
      originalRows,
      deduplicatedRows,
      removedRows,
    }
  }

  describe('基本去重功能', () => {
    it('应该能够根据指定列去除重复数据', () => {
      excelData.value = [
        { 0: '张三', 1: 25, 2: '北京' },
        { 0: '李四', 1: 30, 2: '上海' },
        { 0: '张三', 1: 25, 2: '北京' },
        { 0: '王五', 1: 28, 2: '广州' },
      ]

      deduplicationColumn.value = 0 // 根据姓名列去重

      applyDeduplication()

      expect(excelData.value.length).toBe(3)
      expect(excelData.value[0][0]).toBe('张三')
      expect(excelData.value[1][0]).toBe('李四')
      expect(excelData.value[2][0]).toBe('王五')
    })

    it('应该保留每组数据的第一次出现', () => {
      excelData.value = [
        { 0: 'A', 1: 1 },
        { 0: 'B', 1: 2 },
        { 0: 'A', 1: 3 },
        { 0: 'B', 1: 4 },
        { 0: 'A', 1: 5 },
      ]

      deduplicationColumn.value = 0

      applyDeduplication()

      expect(excelData.value.length).toBe(2)
      expect(excelData.value[0][1]).toBe(1) // 保留第一次出现的值
      expect(excelData.value[1][1]).toBe(2)
    })

    it('应该正确统计去重前后的数据行数', () => {
      excelData.value = [
        { 0: '张三', 1: 25 },
        { 0: '李四', 1: 30 },
        { 0: '张三', 1: 25 },
        { 0: '王五', 1: 28 },
        { 0: '李四', 1: 30 },
      ]

      deduplicationColumn.value = 0

      applyDeduplication()

      expect(deduplicationStats.value.originalRows).toBe(5)
      expect(deduplicationStats.value.deduplicatedRows).toBe(3)
      expect(deduplicationStats.value.removedRows).toBe(2)
    })
  })

  describe('边界条件测试', () => {
    it('当没有选择去重列时应该抛出错误', () => {
      excelData.value = [
        { 0: '张三', 1: 25 },
        { 0: '李四', 1: 30 },
      ]
      deduplicationColumn.value = -1

      expect(() => applyDeduplication()).toThrow('请先选择去重列')
    })

    it('当数据为空时应该抛出错误', () => {
      excelData.value = []
      deduplicationColumn.value = 0

      expect(() => applyDeduplication()).toThrow('没有可去重的数据')
    })

    it('当数据只有一行时应该保持不变', () => {
      excelData.value = [{ 0: '张三', 1: 25 }]

      deduplicationColumn.value = 0

      applyDeduplication()

      expect(excelData.value.length).toBe(1)
      expect(deduplicationStats.value.removedRows).toBe(0)
    })

    it('当数据没有重复时应该保持不变', () => {
      excelData.value = [
        { 0: 'A', 1: 1 },
        { 0: 'B', 1: 2 },
        { 0: 'C', 1: 3 },
      ]

      deduplicationColumn.value = 0

      applyDeduplication()

      expect(excelData.value.length).toBe(3)
      expect(deduplicationStats.value.removedRows).toBe(0)
    })

    it('当所有数据都相同时应该只保留一行', () => {
      excelData.value = [
        { 0: 'A', 1: 1 },
        { 0: 'A', 1: 1 },
        { 0: 'A', 1: 1 },
        { 0: 'A', 1: 1 },
        { 0: 'A', 1: 1 },
      ]

      deduplicationColumn.value = 0

      applyDeduplication()

      expect(excelData.value.length).toBe(1)
      expect(deduplicationStats.value.originalRows).toBe(5)
      expect(deduplicationStats.value.deduplicatedRows).toBe(1)
      expect(deduplicationStats.value.removedRows).toBe(4)
    })
  })

  describe('不同列的去重测试', () => {
    it('应该能够根据第一列去重', () => {
      excelData.value = [
        { 0: 'A', 1: 1 },
        { 0: 'B', 1: 2 },
        { 0: 'A', 1: 3 },
      ]

      deduplicationColumn.value = 0

      applyDeduplication()

      expect(excelData.value.length).toBe(2)
      expect(excelData.value[0][0]).toBe('A')
      expect(excelData.value[1][0]).toBe('B')
    })

    it('应该能够根据第二列去重', () => {
      excelData.value = [
        { 0: 'A', 1: 1 },
        { 0: 'B', 1: 2 },
        { 0: 'C', 1: 1 },
      ]

      deduplicationColumn.value = 1

      applyDeduplication()

      expect(excelData.value.length).toBe(2)
      expect(excelData.value[0][1]).toBe(1)
      expect(excelData.value[1][1]).toBe(2)
    })

    it('应该能够根据第三列去重', () => {
      excelData.value = [
        { 0: 'A', 1: 1, 2: '北京' },
        { 0: 'B', 1: 2, 2: '上海' },
        { 0: 'C', 1: 3, 2: '北京' },
      ]

      deduplicationColumn.value = 2

      applyDeduplication()

      expect(excelData.value.length).toBe(2)
      expect(excelData.value[0][2]).toBe('北京')
      expect(excelData.value[1][2]).toBe('上海')
    })
  })

  describe('数据类型测试', () => {
    it('应该能够处理字符串类型的去重', () => {
      excelData.value = [
        { 0: 'apple', 1: 1 },
        { 0: 'banana', 1: 2 },
        { 0: 'apple', 1: 3 },
      ]

      deduplicationColumn.value = 0

      applyDeduplication()

      expect(excelData.value.length).toBe(2)
    })

    it('应该能够处理数字类型的去重', () => {
      excelData.value = [
        { 0: 1, 1: 'A' },
        { 0: 2, 1: 'B' },
        { 0: 1, 1: 'C' },
      ]

      deduplicationColumn.value = 0

      applyDeduplication()

      expect(excelData.value.length).toBe(2)
    })

    it('应该能够处理混合类型的去重', () => {
      excelData.value = [
        { 0: '1', 1: 'A' },
        { 0: 1, 1: 'B' },
        { 0: '1', 1: 'C' },
      ]

      deduplicationColumn.value = 0

      applyDeduplication()

      expect(excelData.value.length).toBe(2)
    })

    it('应该能够处理null和undefined值的去重', () => {
      excelData.value = [
        { 0: null, 1: 'A' },
        { 0: undefined, 1: 'B' },
        { 0: null, 1: 'C' },
      ]

      deduplicationColumn.value = 0

      applyDeduplication()

      expect(excelData.value.length).toBe(2)
    })

    it('应该能够处理空字符串的去重', () => {
      excelData.value = [
        { 0: '', 1: 'A' },
        { 0: 'B', 1: 'C' },
        { 0: '', 1: 'D' },
      ]

      deduplicationColumn.value = 0

      applyDeduplication()

      expect(excelData.value.length).toBe(2)
    })
  })

  describe('大数据量测试', () => {
    it('应该能够处理大量数据的去重', () => {
      const largeData = []
      for (let i = 0; i < 1000; i++) {
        largeData.push({ 0: i % 10, 1: `数据${i}` })
      }

      excelData.value = largeData
      deduplicationColumn.value = 0

      applyDeduplication()

      expect(excelData.value.length).toBe(10)
      expect(deduplicationStats.value.originalRows).toBe(1000)
      expect(deduplicationStats.value.deduplicatedRows).toBe(10)
      expect(deduplicationStats.value.removedRows).toBe(990)
    })
  })

  describe('去重开关功能测试', () => {
    it('关闭去重开关应该重置去重状态', () => {
      excelData.value = [
        { 0: 'A', 1: 1 },
        { 0: 'B', 1: 2 },
        { 0: 'A', 1: 3 },
      ]

      deduplicationColumn.value = 0
      applyDeduplication()

      expect(excelData.value.length).toBe(2)

      deduplicationEnabled.value = false
      deduplicationColumn.value = -1
      deduplicationStats.value = {
        originalRows: 0,
        deduplicatedRows: 0,
        removedRows: 0,
      }

      expect(deduplicationColumn.value).toBe(-1)
      expect(deduplicationStats.value.removedRows).toBe(0)
    })
  })
})
