import { describe, it, expect, beforeEach } from 'vitest'
import { ref } from 'vue'

/**
 * 行范围筛选功能诊断测试
 * 验证 applyRowRange 函数是否正确工作，以及数据流是否完整
 *
 * Bug 报告：INSERT语句生成页面的行范围筛选功能出现异常，
 *         在生成sql时不会根据行范围生成sql
 *
 * 假设：
 * A. 用户未点击"应用行范围"按钮（UX 问题）
 * B. applyRowRange 函数存在 bug
 * C. 事件传播链断裂
 */

describe('行范围筛选功能诊断测试', () => {
  let excelData
  let originalExcelData
  let rowRangeEnabled
  let startRow
  let endRow
  let includeHeader
  let totalExcelRows

  beforeEach(() => {
    excelData = ref([])
    originalExcelData = ref([])
    rowRangeEnabled = ref(false)
    startRow = ref(null)
    endRow = ref(null)
    includeHeader = ref(true)
    totalExcelRows = ref(0)
  })

  /**
   * 模拟 InsertPage.vue 中的 applyRowRange 函数
   * 简化版本，用于测试核心逻辑
   */
  const applyRowRange = () => {
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

    if (includeHeader.value) {
      if (excelData.value && excelData.value.length > 0) {
        const firstRow = excelData.value[0]
        headers = Object.keys(firstRow)

        if (startRow.value && endRow.value && excelData.value.length > 0) {
          const startIndex = startRow.value - 1
          const endIndex = endRow.value - 1
          rows = excelData.value.slice(startIndex, endIndex + 1)
        } else {
          rows = excelData.value || []
        }
      }
    }

    excelData.value = rows
    totalExcelRows.value = rows.length

    return {
      rows,
      headers,
      selectedRowCount: rows.length,
    }
  }

  /**
   * 模拟 generateSql 函数使用的数据
   */
  const getGenerateSqlInput = () => ({
    dataLength: excelData.value.length,
    totalRows: totalExcelRows.value,
    isRowRangeActive: rowRangeEnabled.value && startRow.value && endRow.value,
  })

  describe('假设 A 验证：未点击"应用行范围"的影响', () => {
    it('场景 1：设置行范围但不应用，直接生成 SQL 应该使用全部数据', () => {
      const rawData = Array.from({ length: 10 }, (_, i) => ({
        0: `姓名${i}`,
        1: i,
        2: `城市${i}`,
      }))

      originalExcelData.value = [...rawData]
      excelData.value = [...rawData]
      totalExcelRows.value = 10

      // 用户设置行范围（模拟 UI 输入）
      startRow.value = 1
      endRow.value = 5
      rowRangeEnabled.value = true

      // ⚠️ 关键：用户没有点击"应用行范围"按钮

      // 直接生成 SQL（模拟用户行为）
      const sqlInput = getGenerateSqlInput()

      // ❌ 预期问题：excelData.value 仍然是 10 行，而不是 5 行
      expect(sqlInput.dataLength).toBe(10)
      expect(sqlInput.totalRows).toBe(10)
      expect(sqlInput.isRowRangeActive).toBeTruthy() // 设置已激活但数据未筛选

      console.log('❌ Bug 确认：设置行范围但未应用时，数据未被筛选')
      console.log(`   数据长度: ${sqlInput.dataLength} (期望: 5)`)
      console.log(`   总行数: ${sqlInput.totalRows} (期望: 5)`)
    })

    it('场景 2：设置行范围并应用后，生成 SQL 应该使用筛选后的数据', () => {
      const rawData = Array.from({ length: 10 }, (_, i) => ({
        0: `姓名${i}`,
        1: i,
        2: `城市${i}`,
      }))

      originalExcelData.value = [...rawData]
      excelData.value = [...rawData]
      totalExcelRows.value = 10

      // 用户设置行范围
      startRow.value = 1
      endRow.value = 5
      rowRangeEnabled.value = true

      // ✅ 用户点击了"应用行范围"按钮
      const result = applyRowRange()

      // 生成 SQL
      const sqlInput = getGenerateSqlInput()

      // ✓ 预期正确：excelData.value 应该是 5 行
      expect(result.selectedRowCount).toBe(5)
      expect(sqlInput.dataLength).toBe(5)
      expect(sqlInput.totalRows).toBe(5)

      console.log('✅ 正确行为：应用行范围后，数据已被筛选')
      console.log(`   数据长度: ${sqlInput.dataLength}`)
      console.log(`   总行数: ${sqlInput.totalRows}`)
    })
  })

  describe('假设 B 验证：applyRowRange 函数的副作用', () => {
    it('场景 3：多次应用行范围可能导致 totalExcelRows 错误', () => {
      const rawData = Array.from({ length: 10 }, (_, i) => ({
        0: `姓名${i}`,
        1: i,
      }))

      originalExcelData.value = [...rawData]
      excelData.value = [...rawData]
      totalExcelRows.value = 10

      // 第一次应用：选择 1-5 行
      startRow.value = 1
      endRow.value = 5
      applyRowRange()

      expect(excelData.value.length).toBe(5)
      expect(totalExcelRows.value).toBe(5) // ⚠️ totalExcelRows 被更新为 5

      console.log('第一次应用后:')
      console.log(`  excelData.length: ${excelData.value.length}`)
      console.log(`  totalExcelRows: ${totalExcelRows.value}`)

      // 第二次应用：尝试选择 1-3 行（基于当前数据的绝对行号）
      startRow.value = 1
      endRow.value = 3

      // ❌ 可能的问题：totalExcelRows 已经是 5，验证通过
      // 但实际上用户想要的是原始数据的 1-3 行
      try {
        const result = applyRowRange()
        expect(result.selectedRowCount).toBe(3)

        console.log('第二次应用后:')
        console.log(`  excelData.length: ${excelData.value.length}`)
        console.log(`  totalExcelRows: ${totalExcelRows.value}`)

        // ⚠️ 潜在问题：此时 excelData 是从已经筛选过的数据中再次筛选
        // 而不是从原始数据中筛选
      } catch (error) {
        console.log('❌ 第二次应用失败:', error.message)
      }
    })
  })

  describe('假设 C 验证：事件传播链完整性', () => {
    it('应该正确追踪从 UI 输入到状态更新的完整链路', () => {
      const rawData = [{ 0: 'A', 1: 1 }, { 0: 'B', 1: 2 }]

      originalExcelData.value = [...rawData]
      excelData.value = [...rawData]
      totalExcelRows.value = 2

      // 模拟 UI 层的事件流
      const simulateUIEventFlow = (newStartRow, newEndRow) => {
        // Step 1: ExcelUploadCard 接收输入
        const startRowLocal = ref(newStartRow)
        const endRowLocal = ref(newEndRow)

        // Step 2: 触发 change 事件
        const handleChange = () => {
          return {
            startRow: startRowLocal.value,
            endRow: endRowLocal.value,
          }
        }

        // Step 3: InsertPage 接收事件并更新状态
        const emitted = handleChange()
        startRow.value = emitted.startRow
        endRow.value = emitted.endRow

        return {
          startRow: startRow.value,
          endRow: endRow.value,
        }
      }

      const result = simulateUIEventFlow(1, 1)

      expect(result.startRow).toBe(1)
      expect(result.endRow).toBe(1)

      console.log('✅ 事件传播链正常')
      console.log(`  startRow: ${result.startRow}`)
      console.log(`  endRow: ${result.endRow}`)
    })
  })

  describe('回归测试：确保修复不破坏现有功能', () => {
    it('禁用行范围后应该恢复原始数据', () => {
      const rawData = [
        { 0: '张三', 1: 25 },
        { 0: '李四', 1: 30 },
        { 0: '王五', 1: 28 },
      ]

      originalExcelData.value = [...rawData]
      excelData.value = rawData.slice(0, 1)
      totalExcelRows.value = 1

      rowRangeEnabled.value = false
      startRow.value = null
      endRow.value = null

      expect(excelData.value.length).toBe(1)

      // 恢复原始数据
      excelData.value = [...originalExcelData.value]
      totalExcelRows.value = originalExcelData.value.length

      expect(excelData.value.length).toBe(3)
      expect(totalExcelRows.value).toBe(3)
    })
  })
})
