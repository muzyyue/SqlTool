/**
 * 行范围配置 Composable
 * 提供 Excel 行范围选择功能，支持起始行、结束行和包含表头配置
 */

import { ref, computed } from 'vue'
import { message } from 'ant-design-vue'

/**
 * 行范围配置选项接口
 */
export interface RowRangeOptions {
  enabled: boolean
  startRow: number | null
  endRow: number | null
  includeHeader: boolean
  totalRows: number
}

/**
 * 行范围配置结果接口
 */
export interface RowRangeResult {
  startRow: number | null
  endRow: number | null
  includeHeader: boolean
  rowCount: number
}

/**
 * 行范围配置 Composable
 * @returns {Object} 行范围配置相关的状态和方法
 */
export function useRowRange() {
  const rowRangeEnabled = ref(false)
  const startRow = ref<number | null>(null)
  const endRow = ref<number | null>(null)
  const includeHeader = ref(true)
  const totalExcelRows = ref(0)

  const isValidRange = computed(() => {
    return (
      startRow.value !== null &&
      endRow.value !== null &&
      startRow.value >= 1 &&
      endRow.value >= startRow.value &&
      endRow.value <= totalExcelRows.value
    )
  })

  const selectedRowCount = computed(() => {
    if (!isValidRange.value) return 0
    return endRow.value! - startRow.value! + 1
  })

  const hasActiveRange = computed(() => {
    return (
      rowRangeEnabled.value &&
      startRow.value !== null &&
      endRow.value !== null &&
      isValidRange.value
    )
  })

  /**
   * 应用行范围配置
   * @param {RowRangeOptions} options - 行范围配置选项
   * @returns {RowRangeResult} 应用后的行范围结果
   */
  const applyRowRange = (options: RowRangeOptions): RowRangeResult => {
    if (!options.enabled || options.startRow === null || options.endRow === null) {
      return {
        startRow: null,
        endRow: null,
        includeHeader: true,
        rowCount: 0,
      }
    }

    const start = Math.max(1, options.startRow)
    const end = Math.min(options.totalRows, options.endRow)

    return {
      startRow: start,
      endRow: end,
      includeHeader: options.includeHeader,
      rowCount: end - start + 1,
    }
  }

  /**
   * 验证行范围
   * @param {number} start - 起始行
   * @param {number} end - 结束行
   * @param {number} maxRows - 最大行数
   * @returns {{ valid: boolean; message?: string }} 验证结果
   */
  const validateRange = (
    start: number | null,
    end: number | null,
    maxRows: number,
  ): { valid: boolean; message?: string } => {
    if (start === null || end === null) {
      return { valid: false, message: '请设置起始行和结束行' }
    }

    if (start < 1) {
      return { valid: false, message: '起始行不能小于1' }
    }

    if (end < start) {
      return { valid: false, message: '结束行不能小于起始行' }
    }

    if (end > maxRows) {
      return { valid: false, message: `行数超出范围，文件总行数为 ${maxRows}` }
    }

    return { valid: true }
  }

  /**
   * 重置行范围配置
   */
  const resetRowRange = () => {
    rowRangeEnabled.value = false
    startRow.value = null
    endRow.value = null
    includeHeader.value = true
  }

  /**
   * 设置总行数
   * @param {number} totalRows - Excel文件总行数
   */
  const setTotalRows = (totalRows: number) => {
    totalExcelRows.value = totalRows
  }

  /**
   * 处理行范围开关切换
   * @param {boolean} checked - 行范围开关状态
   * @param {Function} logInfo - 日志记录函数
   */
  const handleRowRangeToggle = (
    checked: boolean,
    logInfo: (message: string, type: string, context?: any) => void,
  ) => {
    if (!checked) {
      logInfo('已关闭行范围选择，将处理所有数据', 'row-range', {
        operation: 'disableRowRange',
      })
      message.info('已关闭行范围选择，将处理所有数据')
    } else {
      logInfo('已启用行范围选择，请设置起始行和结束行', 'row-range', {
        operation: 'enableRowRange',
      })
      message.info('已启用行范围选择，请设置起始行和结束行')
    }
  }

  return {
    rowRangeEnabled,
    startRow,
    endRow,
    includeHeader,
    totalExcelRows,
    isValidRange,
    selectedRowCount,
    hasActiveRange,
    applyRowRange,
    validateRange,
    resetRowRange,
    setTotalRows,
    handleRowRangeToggle,
  }
}
