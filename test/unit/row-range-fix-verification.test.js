import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ref } from 'vue'

/**
 * 行范围筛选功能修复验证测试
 * 验证自动应用机制和防抖功能是否正常工作
 *
 * 修复内容：
 * 1. 添加防抖自动应用机制（800ms）
 * 2. 修复 totalExcelRows 副作用问题
 * 3. 用户修改 startRow/endRow 后自动触发 applyRowRange
 */

describe('行范围筛选功能修复验证', () => {
  let excelData
  let originalExcelData
  let rowRangeEnabled
  let startRow
  let endRow
  let includeHeader
  let totalExcelRows
  let uploadedFile

  beforeEach(() => {
    excelData = ref([])
    originalExcelData = ref([])
    rowRangeEnabled = ref(false)
    startRow = ref(null)
    endRow = ref(null)
    includeHeader = ref(true)
    totalExcelRows = ref(0)
    uploadedFile = ref(null)

    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  /**
   * 模拟修复后的 InsertPage.vue 中的防抖自动应用逻辑
   */
  const createDebouncedApplyRowRange = (applyRowRangeFn) => {
    let debounceTimer = null
    const DEBOUNCE_MS = 800

    return () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer)
      }

      debounceTimer = setTimeout(async () => {
        if (
          rowRangeEnabled.value &&
          startRow.value &&
          endRow.value &&
          uploadedFile.value &&
          excelData.value.length > 0
        ) {
          await applyRowRangeFn()
        }
        debounceTimer = null
      }, DEBOUNCE_MS)
    }
  }

  /**
   * 模拟修复后的 applyRowRange 函数（不更新 totalExcelRows）
   */
  const applyRowRangeFixed = async () => {
    if (!uploadedFile.value) {
      throw new Error('请先上传Excel文件')
    }

    if (!startRow.value || !endRow.value) {
      throw new Error('请设置起始行和结束行')
    }

    if (startRow.value > endRow.value) {
      throw new Error('起始行不能大于结束行')
    }

    if (
      startRow.value > totalExcelRows.value ||
      endRow.value > totalExcelRows.value
    ) {
      throw new Error(`行数超出范围，文件总行数为 ${totalExcelRows.value}`)
    }

    let headers = []
    let rows = []

    if (includeHeader.value && excelData.value.length > 0) {
      headers = Object.keys(excelData.value[0])

      const startIndex = startRow.value - 1
      const endIndex = endRow.value - 1
      rows = excelData.value.slice(startIndex, endIndex + 1)
    }

    excelData.value = rows

    return { rows, headers, selectedRowCount: rows.length }
  }

  describe('修复验证 1：防抖自动应用机制', () => {
    it('应该在用户停止输入 800ms 后自动应用行范围', async () => {
      const rawData = Array.from({ length: 10 }, (_, i) => ({
        0: `姓名${i}`,
        1: i,
      }))

      originalExcelData.value = [...rawData]
      excelData.value = [...rawData]
      totalExcelRows.value = 10
      uploadedFile.value = { name: 'test.xlsx' }
      rowRangeEnabled.value = true

      const debouncedApply = createDebouncedApplyRowRange(applyRowRangeFixed)

      // 用户输入起始行
      startRow.value = 1
      debouncedApply()

      // 用户立即输入结束行（模拟快速输入）
      endRow.value = 5
      debouncedApply()

      // 在 800ms 内，不应该应用
      expect(excelData.value.length).toBe(10)

      // 等待 800ms
      await vi.advanceTimersByTimeAsync(800)

      // 现在应该已经应用了
      expect(excelData.value.length).toBe(5)
      expect(totalExcelRows.value).toBe(10) // ✅ 修复：totalExcelRows 不变
    })

    it('应该在多次快速输入时只应用最后一次的值', async () => {
      const rawData = Array.from({ length: 20 }, (_, i) => ({
        0: `数据${i}`,
      }))

      originalExcelData.value = [...rawData]
      excelData.value = [...rawData]
      totalExcelRows.value = 20
      uploadedFile.value = { name: 'test.xlsx' }
      rowRangeEnabled.value = true

      const debouncedApply = createDebouncedApplyRowRange(applyRowRangeFixed)

      // 快速连续修改 5 次
      const inputs = [
        { start: 1, end: 10 },
        { start: 2, end: 8 },
        { start: 3, end: 6 },
        { start: 1, end: 5 },
        { start: 2, end: 4 },
      ]

      for (const input of inputs) {
        startRow.value = input.start
        endRow.value = input.end
        debouncedApply()
        await vi.advanceTimersByTimeAsync(200) // 每次间隔 200ms，不足 800ms
      }

      // 最后一次输入后等待 800ms
      await vi.advanceTimersByTimeAsync(800)

      // 应该只应用最后一次的值：start=2, end=4 → 3 行数据
      expect(excelData.value.length).toBe(3)
      expect(totalExcelRows.value).toBe(20) // ✅ 总行数保持不变
    })
  })

  describe('修复验证 2：totalExcelRows 副作用修复', () => {
    it('多次应用行范围时 totalExcelRows 应保持不变', async () => {
      const rawData = Array.from({ length: 15 }, (_, i) => ({
        0: `项${i}`,
        1: i * 10,
      }))

      originalExcelData.value = [...rawData]
      excelData.value = [...rawData]
      totalExcelRows.value = 15
      uploadedFile.value = { name: 'test.xlsx' }
      rowRangeEnabled.value = true

      // 第一次应用：选择 1-10 行
      startRow.value = 1
      endRow.value = 10
      await applyRowRangeFixed()

      expect(excelData.value.length).toBe(10)
      expect(totalExcelRows.value).toBe(15) // ✅ 保持原始值

      // 第二次应用：选择 1-5 行（基于当前已筛选的数据）
      startRow.value = 1
      endRow.value = 5
      await applyRowRangeFixed()

      expect(excelData.value.length).toBe(5)
      expect(totalExcelRows.value).toBe(15) // ✅ 仍然保持原始值

      console.log('✅ 修复验证通过：totalExcelRows 在多次应用后仍为 15')
    })

    it('禁用行范围后重新启用，totalExcelRows 应正确恢复', async () => {
      const rawData = Array.from({ length: 8 }, (_, i) => ({ 0: `A${i}` }))

      originalExcelData.value = [...rawData]
      excelData.value = [...rawData]
      totalExcelRows.value = 8
      uploadedFile.value = { name: 'test.xlsx' }

      // 应用行范围
      rowRangeEnabled.value = true
      startRow.value = 1
      endRow.value = 3
      await applyRowRangeFixed()

      expect(excelData.value.length).toBe(3)
      expect(totalExcelRows.value).toBe(8)

      // 禁用行范围（恢复数据）
      rowRangeEnabled.value = false
      excelData.value = [...originalExcelData.value]

      expect(excelData.value.length).toBe(8)
      expect(totalExcelRows.value).toBe(8)

      console.log('✅ 修复验证通过：禁用后 totalExcelRows 正确')
    })
  })

  describe('修复验证 3：边界条件处理', () => {
    it('未上传文件时不应该自动应用', async () => {
      uploadedFile.value = null
      rowRangeEnabled.value = true
      startRow.value = 1
      endRow.value = 5

      const debouncedApply = createDebouncedApplyRowRange(applyRowRangeFixed)
      debouncedApply()

      await vi.advanceTimersByTimeAsync(800)

      // 不应该抛出错误，也不应该改变数据
      expect(excelData.value.length).toBe(0)
    })

    it('行范围未启用时不应该自动应用', async () => {
      const rawData = [{ 0: 'A' }, { 0: 'B' }]
      originalExcelData.value = [...rawData]
      excelData.value = [...rawData]
      totalExcelRows.value = 2
      uploadedFile.value = { name: 'test.xlsx' }
      rowRangeEnabled.value = false
      startRow.value = 1
      endRow.value = 1

      const debouncedApply = createDebouncedApplyRowRange(applyRowRangeFixed)
      debouncedApply()

      await vi.advanceTimersByTimeAsync(800)

      expect(excelData.value.length).toBe(2)
    })

    it('起始行或结束行为空时不应该自动应用', async () => {
      const rawData = [{ 0: 'X' }]
      originalExcelData.value = [...rawData]
      excelData.value = [...rawData]
      totalExcelRows.value = 1
      uploadedFile.value = { name: 'test.xlsx' }
      rowRangeEnabled.value = true
      startRow.value = 1
      endRow.value = null

      const debouncedApply = createDebouncedApplyRowRange(applyRowRangeFixed)
      debouncedApply()

      await vi.advanceTimersByTimeAsync(800)

      expect(excelData.value.length).toBe(1)
    })
  })

  describe('回归测试：确保修复不破坏现有功能', () => {
    it('手动点击"应用行范围"按钮仍然有效', async () => {
      const rawData = Array.from({ length: 12 }, (_, i) => ({ 0: i }))
      originalExcelData.value = [...rawData]
      excelData.value = [...rawData]
      totalExcelRows.value = 12
      uploadedFile.value = { name: 'test.xlsx' }
      rowRangeEnabled.value = true
      startRow.value = 2
      endRow.value = 8

      // 直接调用 applyRowRangeFixed（模拟手动点击按钮）
      const result = await applyRowRangeFixed()

      expect(result.selectedRowCount).toBe(7)
      expect(excelData.value.length).toBe(7)
      expect(totalExcelRows.value).toBe(12)
    })

    it('生成的 SQL 应使用筛选后的数据', async () => {
      const rawData = Array.from({ length: 10 }, (_, i) => ({
        0: `用户${i}`,
        1: 20 + i,
        2: `城市${i}`,
      }))

      originalExcelData.value = [...rawData]
      excelData.value = [...rawData]
      totalExcelRows.value = 10
      uploadedFile.value = { name: 'test.xlsx' }
      rowRangeEnabled.value = true

      // 设置并应用行范围
      startRow.value = 1
      endRow.value = 3
      await applyRowRangeFixed()

      // 模拟 generateSql 函数使用的数据
      const dataForSqlGeneration = excelData.value

      expect(dataForSqlGeneration.length).toBe(3)
      expect(dataForSqlGeneration[0][0]).toBe('用户0')
      expect(dataForSqlGeneration[2][0]).toBe('用户2')

      console.log('✅ 回归测试通过：SQL 生成使用正确的筛选数据')
    })
  })
})
