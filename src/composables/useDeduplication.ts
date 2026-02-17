import { ref, computed } from 'vue'
import { message } from 'ant-design-vue'

/**
 * 去重统计信息接口
 */
export interface DeduplicationStats {
  originalRows: number
  deduplicatedRows: number
  removedRows: number
}

/**
 * 去重功能Composable
 * 提供Excel数据去重功能，根据选定列的值去除重复数据行
 * @returns {Object} 去重相关的状态和方法
 */
export function useDeduplication() {
  const deduplicationEnabled = ref(false)
  const deduplicationColumn = ref<number | undefined>(undefined)
  const deduplicationStats = ref<DeduplicationStats>({
    originalRows: 0,
    deduplicatedRows: 0,
    removedRows: 0,
  })
  const originalExcelData = ref<any[]>([])

  const hasDeduplication = computed(
    () => deduplicationEnabled.value && deduplicationColumn.value !== undefined,
  )

  /**
   * 处理去重开关切换
   * 当关闭去重时，恢复原始数据并清除所有去重相关设置
   * @param {boolean} checked - 去重开关状态
   * @param {Function} logInfo - 日志记录函数
   */
  const handleDeduplicationToggle = (
    checked: boolean,
    excelData: any[],
    logInfo: (message: string, type: string, context?: any) => void,
  ) => {
    deduplicationEnabled.value = checked

    if (!checked) {
      if (originalExcelData.value.length > 0) {
        const previousRowCount = excelData.length
        excelData.splice(0, excelData.length, ...originalExcelData.value)
        const restoredRowCount = excelData.length

        logInfo(
          `数据去重已关闭，已恢复原始数据（${previousRowCount} 行 → ${restoredRowCount} 行）`,
          'deduplication',
          {
            operation: 'resetDeduplication',
            previousRowCount,
            restoredRowCount,
            restored: true,
          },
        )
        message.success(`数据去重已关闭，已恢复原始数据（${restoredRowCount} 行）`)
      } else {
        logInfo('数据去重已关闭（无原始数据可恢复）', 'deduplication', {
          operation: 'resetDeduplication',
          restored: false,
        })
        message.info('数据去重已关闭')
      }

      deduplicationColumn.value = undefined
      deduplicationStats.value = {
        originalRows: 0,
        deduplicatedRows: 0,
        removedRows: 0,
      }
    } else {
      logInfo('已启用数据去重，请选择去重列', 'deduplication', {
        operation: 'enableDeduplication',
      })
      message.info('已启用数据去重，请选择去重列')
    }
  }

  /**
   * 应用去重逻辑
   * 根据选定列的值去除重复数据行，仅保留每组的第一次出现
   * 始终基于原始数据进行去重，切换去重列时会恢复原始数据后再去重
   * @param {Ref<any[]>} excelData - Excel数据引用
   * @param {string[]} excelHeaders - Excel表头
   * @param {Function} logInfo - 日志记录函数
   */
  const applyDeduplication = (
    excelData: any[],
    excelHeaders: string[],
    logInfo: (message: string, type: string, context?: any) => void,
  ) => {
    if (deduplicationColumn.value === undefined || deduplicationColumn.value === null) {
      message.warning('请先选择去重列')
      return
    }

    if (!excelData || excelData.length === 0) {
      message.warning('没有可去重的数据')
      return
    }

    if (originalExcelData.value.length > 0) {
      excelData.splice(0, excelData.length, ...originalExcelData.value)
    }

    const columnIndex = deduplicationColumn.value
    const seenValues = new Set()
    const deduplicatedData: any[] = []

    excelData.forEach((row) => {
      const value = row[columnIndex]
      if (!seenValues.has(value)) {
        seenValues.add(value)
        deduplicatedData.push(row)
      }
    })

    const originalRows = excelData.length
    const deduplicatedRows = deduplicatedData.length
    const removedRows = originalRows - deduplicatedRows

    excelData.splice(0, excelData.length, ...deduplicatedData)

    deduplicationStats.value = {
      originalRows,
      deduplicatedRows,
      removedRows,
    }

    if (removedRows > 0) {
      logInfo(
        `数据去重完成: 原始 ${originalRows} 行 → 去重后 ${deduplicatedRows} 行 (去除 ${removedRows} 行重复)`,
        'deduplication',
        {
          operation: 'applyDeduplication',
          columnIndex,
          columnName: excelHeaders[columnIndex],
          originalRows,
          deduplicatedRows,
          removedRows,
        },
      )
      message.success(`去重完成: 原始 ${originalRows} 行 → 去重后 ${deduplicatedRows} 行`)
    } else {
      logInfo('数据去重完成: 未发现重复数据', 'deduplication', {
        operation: 'applyDeduplication',
        columnIndex,
        columnName: excelHeaders[columnIndex],
        originalRows,
        deduplicatedRows,
        removedRows,
      })
      message.info('未发现重复数据')
    }
  }

  /**
   * 设置原始数据
   * @param {any[]} data - 原始Excel数据
   */
  const setOriginalData = (data: any[]) => {
    originalExcelData.value = [...data]
  }

  /**
   * 清除去重状态
   */
  const clearDeduplication = () => {
    deduplicationEnabled.value = false
    deduplicationColumn.value = undefined
    deduplicationStats.value = {
      originalRows: 0,
      deduplicatedRows: 0,
      removedRows: 0,
    }
    originalExcelData.value = []
  }

  return {
    deduplicationEnabled,
    deduplicationColumn,
    deduplicationStats,
    hasDeduplication,
    originalExcelData,
    handleDeduplicationToggle,
    applyDeduplication,
    setOriginalData,
    clearDeduplication,
  }
}
