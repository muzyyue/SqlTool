import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ref } from 'vue'
import { useRowRange } from '@/composables/data/useRowRange'

/**
 * 行范围筛选增强功能测试
 * 验证：自动应用开关、倒计时、历史记录等新功能
 */

describe('行范围筛选增强功能测试', () => {
  let rowRange

  beforeEach(() => {
    rowRange = useRowRange()
  })

  describe('1. 自动应用开关功能', () => {
    it('默认应该开启自动应用', () => {
      expect(rowRange.autoApplyEnabled.value).toBe(true)
    })

    it('应该能够切换自动应用状态', () => {
      rowRange.toggleAutoApply(false)
      expect(rowRange.autoApplyEnabled.value).toBe(false)

      rowRange.toggleAutoApply(true)
      expect(rowRange.autoApplyEnabled.value).toBe(true)
    })

    it('关闭自动应用时应该停止倒计时', () => {
      rowRange.startCountdown(3)
      expect(rowRange.countdown.value).toBe(3)

      rowRange.toggleAutoApply(false)
      expect(rowRange.countdown.value).toBe(0)
    })
  })

  describe('2. 倒计时功能', () => {
    it('应该能够启动倒计时', () => {
      rowRange.startCountdown(5)
      expect(rowRange.countdown.value).toBe(5)
    })

    it('应该能够停止倒计时', () => {
      rowRange.startCountdown(5)
      rowRange.stopCountdown()
      expect(rowRange.countdown.value).toBe(0)
    })

    it('重新启动倒计时应该重置之前的倒计时', () => {
      rowRange.startCountdown(5)
      rowRange.startCountdown(3)
      // 注意：由于 setInterval 是异步的，这里只验证初始值
      expect([3, 2, 1, 0]).toContain(rowRange.countdown.value)
    })

    it('倒计时结束后应该归零', async () => {
      vi.useFakeTimers()

      rowRange.startCountdown(1)

      await vi.advanceTimersByTimeAsync(1100)

      expect(rowRange.countdown.value).toBe(0)

      vi.useRealTimers()
    })
  })

  describe('3. 历史记录功能', () => {
    it('初始状态应该没有历史记录', () => {
      expect(rowRange.history.value).toEqual([])
    })

    it('应该能够添加历史记录', () => {
      rowRange.addHistory(1, 10, true, 10)

      expect(rowRange.history.value.length).toBe(1)
      expect(rowRange.history.value[0].startRow).toBe(1)
      expect(rowRange.history.value[0].endRow).toBe(10)
      expect(rowRange.history.value[0].includeHeader).toBe(true)
      expect(rowRange.history.value[0].rowCount).toBe(10)
    })

    it('新记录应该插入到列表开头', () => {
      rowRange.addHistory(1, 5, true, 5)
      rowRange.addHistory(6, 10, true, 5)

      expect(rowRange.history.value[0].startRow).toBe(6)
      expect(rowRange.history.value[1].startRow).toBe(1)
    })

    it('最多保存 5 条历史记录', () => {
      for (let i = 1; i <= 7; i++) {
        rowRange.addHistory(i, i + 4, true, 5)
      }

      expect(rowRange.history.value.length).toBe(5)
      // 最新的应该在前面
      expect(rowRange.history.value[0].startRow).toBe(7)
    })

    it('每条记录应该有唯一 ID', () => {
      rowRange.addHistory(1, 5, true, 5)
      // 等待 1ms 确保 Date.now() 不同
      return new Promise((resolve) => {
        setTimeout(() => {
          rowRange.addHistory(6, 10, true, 5)

          expect(rowRange.history.value[0].id).not.toBe(
            rowRange.history.value[1].id,
          )
          resolve()
        }, 10)
      })
    })

    it('每条记录应该包含时间戳', () => {
      const beforeAdd = new Date()
      rowRange.addHistory(1, 5, true, 5)
      const afterAdd = new Date()

      const recordTime = new Date(rowRange.history.value[0].appliedAt)

      expect(recordTime.getTime()).toBeGreaterThanOrEqual(beforeAdd.getTime())
      expect(recordTime.getTime()).toBeLessThanOrEqual(afterAdd.getTime())
    })

    it('应该能够清空历史记录', () => {
      rowRange.addHistory(1, 5, true, 5)
      rowRange.addHistory(6, 10, true, 5)

      rowRange.clearHistory()

      expect(rowRange.history.value).toEqual([])
    })
  })

  describe('4. 应用历史记录功能', () => {
    beforeEach(() => {
      rowRange.addHistory(1, 5, true, 5)
      rowRange.addHistory(10, 20, false, 11)
    })

    it('应该能够根据 ID 应用历史记录', () => {
      // 清空可能的历史记录
      rowRange.clearHistory()

      // 只添加一条记录
      rowRange.addHistory(1, 5, true, 5)

      expect(rowRange.history.value.length).toBe(1)
      expect(rowRange.history.value[0].startRow).toBe(1)

      const historyId = rowRange.history.value[0].id
      const result = rowRange.applyHistory(historyId)

      expect(result).not.toBeNull()
      expect(result.startRow).toBe(1)
      expect(result.endRow).toBe(5)
      expect(result.includeHeader).toBe(true)

      // 验证当前设置已更新
      expect(rowRange.startRow.value).toBe(1)
      expect(rowRange.endRow.value).toBe(5)
      expect(rowRange.includeHeader.value).toBe(true)
    })

    it('对于不存在的 ID 应该返回 null', () => {
      const result = rowRange.applyHistory('non-existent-id')

      expect(result).toBeNull()
    })

    it('应用后不应该修改原始历史记录', () => {
      const originalStartRow = rowRange.history.value[1].startRow
      const historyId = rowRange.history.value[1].id

      rowRange.applyHistory(historyId)

      expect(rowRange.history.value[1].startRow).toBe(originalStartRow)
    })
  })

  describe('5. 综合场景测试', () => {
    it('完整工作流：添加记录 → 应用 → 验证', () => {
      // 清空历史
      rowRange.clearHistory()

      // 添加多条历史记录（unshift 会反转顺序）
      rowRange.addHistory(1, 100, true, 100)      // index=2 (最旧)
      rowRange.addHistory(50, 150, true, 101)     // index=1
      rowRange.addHistory(1, 50, false, 50)       // index=0 (最新)

      expect(rowRange.history.value.length).toBe(3)

      // 应用最新的记录 (1-50)
      const record = rowRange.applyHistory(rowRange.history.value[0].id)

      expect(record.startRow).toBe(1)
      expect(record.endRow).toBe(50)
      expect(record.includeHeader).toBe(false)
      expect(rowRange.startRow.value).toBe(1)
      expect(rowRange.endRow.value).toBe(50)
    })

    it('关闭自动应用时不影响手动操作', () => {
      rowRange.toggleAutoApply(false)
      expect(rowRange.autoApplyEnabled.value).toBe(false)

      // 手动添加历史记录仍然有效
      rowRange.addHistory(1, 10, true, 10)
      expect(rowRange.history.value.length).toBe(1)

      // 手动应用历史记录仍然有效
      const record = rowRange.applyHistory(rowRange.history.value[0].id)
      expect(record).not.toBeNull()
    })

    it('边界条件：空历史记录时应用应该返回 null', () => {
      const result = rowRange.applyHistory('any-id')
      expect(result).toBeNull()
    })
  })

  describe('6. 与现有功能的兼容性', () => {
    it('新增功能不应破坏原有的 isValidRange 计算', () => {
      rowRange.totalExcelRows.value = 100
      rowRange.startRow.value = 1
      rowRange.endRow.value = 50

      expect(rowRange.isValidRange.value).toBe(true)
      expect(rowRange.selectedRowCount.value).toBe(50)
    })

    it('新增功能不应破坏 resetRowRange', () => {
      rowRange.rowRangeEnabled.value = true
      rowRange.startRow.value = 10
      rowRange.endRow.value = 20
      rowRange.autoApplyEnabled.value = false
      rowRange.addHistory(1, 5, true, 5)

      rowRange.resetRowRange()

      expect(rowRange.rowRangeEnabled.value).toBe(false)
      expect(rowRange.startRow.value).toBe(null)
      expect(rowRange.endRow.value).toBe(null)
      // 注意：resetRowRange 不应重置 autoApplyEnabled 和 history
      // 这是设计选择，允许用户保留偏好设置
    })

    it('新增功能不应破坏 validateRange', () => {
      rowRange.totalExcelRows.value = 100

      const validResult = rowRange.validateRange(1, 50, 100)
      expect(validResult.valid).toBe(true)

      const invalidResult = rowRange.validateRange(50, 1, 100)
      expect(invalidResult.valid).toBe(false)
    })
  })
})
