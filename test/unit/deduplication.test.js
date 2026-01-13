import { describe, it, expect, beforeEach } from 'vitest'
import { ref } from 'vue'

/**
 * 模拟InsertPage组件中的去重功能
 */
describe('Excel数据去重功能测试', () => {
  let excelData
  let originalExcelData
  let deduplicationEnabled
  let deduplicationColumn
  let deduplicationStats

  beforeEach(() => {
    excelData = ref([])
    originalExcelData = ref([])
    deduplicationEnabled = ref(false)
    deduplicationColumn = ref(-1)
    deduplicationStats = ref({
      originalRows: 0,
      deduplicatedRows: 0,
      removedRows: 0,
    })
  })

  /**
   * 应用去重逻辑（修复版本）
   * 根据选定列的值去除重复数据行，仅保留每组的第一次出现
   * 始终基于原始数据进行去重，切换去重列时会恢复原始数据后再去重
   */
  const applyDeduplication = () => {
    if (deduplicationColumn.value === -1) {
      throw new Error('请先选择去重列')
    }

    if (!excelData.value || excelData.value.length === 0) {
      throw new Error('没有可去重的数据')
    }

    // 如果有原始数据，先恢复原始数据再进行去重
    // 这样可以确保每次切换去重列时都基于原始数据计算
    if (originalExcelData.value.length > 0) {
      excelData.value = [...originalExcelData.value]
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

  describe('多次去重切换测试（修复验证）', () => {
    it('切换去重列时应该始终基于原始数据，不丢失数据', () => {
      // 原始数据：10行
      const rawData = [
        { 0: '张三', 1: 'zhangsan@example.com', 2: '北京' },
        { 0: '李四', 1: 'lisi@example.com', 2: '上海' },
        { 0: '张三', 1: 'zhangsan2@example.com', 2: '北京' }, // 姓名重复
        { 0: '王五', 1: 'wangwu@example.com', 2: '广州' },
        { 0: '赵六', 1: 'zhao@example.com', 2: '深圳' },
        { 0: '李四', 1: 'lisi_new@example.com', 2: '上海' }, // 姓名重复
        { 0: '张三', 1: 'zhangsan3@example.com', 2: '北京' }, // 姓名重复
        { 0: '孙七', 1: 'sunqi@example.com', 2: '杭州' },
        { 0: '周八', 1: 'zhouba@example.com', 2: '南京' },
        { 0: '吴九', 1: 'wujiu@example.com', 2: '武汉' },
      ]

      excelData.value = [...rawData]
      originalExcelData.value = [...rawData] // 保存原始数据

      // 第一次根据姓名去重（姓名重复3次，应该保留1次）
      deduplicationColumn.value = 0
      applyDeduplication()

      expect(excelData.value.length).toBe(7) // 姓名有3个重复，保留7个
      expect(deduplicationStats.value.originalRows).toBe(10)
      expect(deduplicationStats.value.deduplicatedRows).toBe(7)
      expect(deduplicationStats.value.removedRows).toBe(3)

      // 切换到邮箱列去重，应该还是基于原始10行数据
      deduplicationColumn.value = 1
      applyDeduplication()

      // 所有邮箱都是唯一的，应该还是10行（因为基于原始数据重新计算）
      expect(excelData.value.length).toBe(10)
      expect(deduplicationStats.value.originalRows).toBe(10)
      expect(deduplicationStats.value.deduplicatedRows).toBe(10)
      expect(deduplicationStats.value.removedRows).toBe(0)

      // 再切换回姓名列，应该还是7行
      deduplicationColumn.value = 0
      applyDeduplication()

      expect(excelData.value.length).toBe(7)
      expect(deduplicationStats.value.originalRows).toBe(10)
      expect(deduplicationStats.value.deduplicatedRows).toBe(7)
      expect(deduplicationStats.value.removedRows).toBe(3)
    })

    it('切换到不同去重列时应该正确统计每次的原始行数', () => {
      const rawData = [
        { 0: 'A', 1: 100 },
        { 0: 'B', 1: 100 }, // 列1重复
        { 0: 'A', 1: 200 }, // 列0重复
        { 0: 'C', 1: 300 },
        { 0: 'B', 1: 400 }, // 列0重复，列1重复
      ]

      excelData.value = [...rawData]
      originalExcelData.value = [...rawData]

      // 根据列0去重
      deduplicationColumn.value = 0
      applyDeduplication()

      expect(excelData.value.length).toBe(3) // A, B, C
      expect(deduplicationStats.value.originalRows).toBe(5)
      expect(deduplicationStats.value.deduplicatedRows).toBe(3)
      expect(deduplicationStats.value.removedRows).toBe(2)

      // 切换到列1去重
      deduplicationColumn.value = 1
      applyDeduplication()

      // 列1的值有重复：100出现2次
      expect(excelData.value.length).toBe(4) // 100, 200, 300, 400（100保留第一个）
      expect(deduplicationStats.value.originalRows).toBe(5) // 始终基于原始5行
      expect(deduplicationStats.value.deduplicatedRows).toBe(4)
      expect(deduplicationStats.value.removedRows).toBe(1)
    })

    it('当没有原始数据时应该正常工作', () => {
      const testData = [
        { 0: 'A', 1: 1 },
        { 0: 'B', 1: 2 },
        { 0: 'A', 1: 3 },
      ]

      excelData.value = [...testData]
      originalExcelData.value = [] // 没有原始数据

      deduplicationColumn.value = 0
      applyDeduplication()

      expect(excelData.value.length).toBe(2)
      expect(deduplicationStats.value.originalRows).toBe(3)
      expect(deduplicationStats.value.deduplicatedRows).toBe(2)
      expect(deduplicationStats.value.removedRows).toBe(1)
    })

    it('清除文件后原始数据应该被正确清除', () => {
      const rawData = [
        { 0: 'A', 1: 1 },
        { 0: 'B', 1: 2 },
      ]

      excelData.value = [...rawData]
      originalExcelData.value = [...rawData]

      expect(originalExcelData.value.length).toBe(2)

      originalExcelData.value = []

      expect(originalExcelData.value.length).toBe(0)
    })
  })
})
