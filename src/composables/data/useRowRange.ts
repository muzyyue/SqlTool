/**
 * 行范围配置 Composable
 * 提供 Excel 行范围选择功能，支持起始行、结束行和包含表头配置
 */

import { ref, computed } from "vue";
import { message } from "ant-design-vue";

/**
 * 行范围历史记录接口
 */
export interface RowRangeHistory {
  id: string;
  startRow: number;
  endRow: number;
  includeHeader: boolean;
  appliedAt: Date;
  rowCount: number;
}

/**
 * 行范围配置选项接口
 */
export interface RowRangeOptions {
  enabled: boolean;
  startRow: number | null;
  endRow: number | null;
  includeHeader: boolean;
  totalRows: number;
}

/**
 * 行范围配置结果接口
 */
export interface RowRangeResult {
  startRow: number | null;
  endRow: number | null;
  includeHeader: boolean;
  rowCount: number;
}

/**
 * 行范围配置 Composable
 * @returns {Object} 行范围配置相关的状态和方法
 */
export function useRowRange() {
  const rowRangeEnabled = ref(false);
  const startRow = ref<number | null>(null);
  const endRow = ref<number | null>(null);
  const includeHeader = ref(true);
  const totalExcelRows = ref(0);

  // 新增：自动应用开关（默认开启）
  const autoApplyEnabled = ref(true);

  // 新增：倒计时状态
  const countdown = ref(0);
  let countdownTimer: ReturnType<typeof setInterval> | null = null;

  // 新增：历史记录（最多保存 5 条）
  const history = ref<RowRangeHistory[]>([]);
  const MAX_HISTORY_SIZE = 5;

  const isValidRange = computed(() => {
    return (
      startRow.value !== null &&
      endRow.value !== null &&
      startRow.value >= 1 &&
      endRow.value >= startRow.value &&
      endRow.value <= totalExcelRows.value
    );
  });

  const selectedRowCount = computed(() => {
    if (!isValidRange.value) return 0;
    return endRow.value! - startRow.value! + 1;
  });

  const hasActiveRange = computed(() => {
    return (
      rowRangeEnabled.value &&
      startRow.value !== null &&
      endRow.value !== null &&
      isValidRange.value
    );
  });

  /**
   * 应用行范围配置
   * @param {RowRangeOptions} options - 行范围配置选项
   * @returns {RowRangeResult} 应用后的行范围结果
   */
  const applyRowRange = (options: RowRangeOptions): RowRangeResult => {
    if (
      !options.enabled ||
      options.startRow === null ||
      options.endRow === null
    ) {
      return {
        startRow: null,
        endRow: null,
        includeHeader: true,
        rowCount: 0,
      };
    }

    const start = Math.max(1, options.startRow);
    const end = Math.min(options.totalRows, options.endRow);

    return {
      startRow: start,
      endRow: end,
      includeHeader: options.includeHeader,
      rowCount: end - start + 1,
    };
  };

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
      return { valid: false, message: "请设置起始行和结束行" };
    }

    if (start < 1) {
      return { valid: false, message: "起始行不能小于1" };
    }

    if (end < start) {
      return { valid: false, message: "结束行不能小于起始行" };
    }

    if (end > maxRows) {
      return { valid: false, message: `行数超出范围，文件总行数为 ${maxRows}` };
    }

    return { valid: true };
  };

  /**
   * 重置行范围配置
   */
  const resetRowRange = () => {
    rowRangeEnabled.value = false;
    startRow.value = null;
    endRow.value = null;
    includeHeader.value = true;
  };

  /**
   * 设置总行数
   * @param {number} totalRows - Excel文件总行数
   */
  const setTotalRows = (totalRows: number) => {
    totalExcelRows.value = totalRows;
  };

  /**
   * 处理行范围开关切换
   * @param {boolean} checked - 行范围开关状态
   * @param {Function} logInfo - 日志记录函数
   */
  const handleRowRangeToggle = (
    checked: boolean,
    logInfo: (message: string, type: string, context?: any) => void,
  ) => {
    rowRangeEnabled.value = checked;
    if (!checked) {
      logInfo("已关闭行范围选择，将处理所有数据", "row-range", {
        operation: "disableRowRange",
      });
      message.info("已关闭行范围选择，将处理所有数据");
    } else {
      logInfo("已启用行范围选择，请设置起始行和结束行", "row-range", {
        operation: "enableRowRange",
      });
      message.info("已启用行范围选择，请设置起始行和结束行");
    }
  };

  /**
   * 启动倒计时
   * @param {number} seconds - 倒计时秒数
   */
  const startCountdown = (seconds: number) => {
    if (countdownTimer) {
      clearInterval(countdownTimer);
    }

    countdown.value = seconds;
    countdownTimer = setInterval(() => {
      countdown.value--;
      if (countdown.value <= 0) {
        stopCountdown();
      }
    }, 1000);
  };

  /**
   * 停止倒计时
   */
  const stopCountdown = () => {
    if (countdownTimer) {
      clearInterval(countdownTimer);
      countdownTimer = null;
    }
    countdown.value = 0;
  };

  /**
   * 切换自动应用开关
   * @param {boolean} enabled - 是否启用自动应用
   */
  const toggleAutoApply = (enabled: boolean) => {
    autoApplyEnabled.value = enabled;
    if (!enabled) {
      stopCountdown();
    }
    message.info(
      enabled ? "已开启自动应用模式" : "已关闭自动应用模式，请手动点击应用按钮",
    );
  };

  /**
   * 添加历史记录
   * @param {number} startRow - 起始行
   * @param {number} endRow - 结束行
   * @param {boolean} includeHeader - 是否包含表头
   * @param {number} rowCount - 筛选后的行数
   */
  const addHistory = (
    startRowVal: number,
    endRowVal: number,
    includeHeaderVal: boolean,
    rowCount: number,
  ) => {
    const record: RowRangeHistory = {
      id: Date.now().toString(),
      startRow: startRowVal,
      endRow: endRowVal,
      includeHeader: includeHeaderVal,
      appliedAt: new Date(),
      rowCount,
    };

    history.value.unshift(record);

    if (history.value.length > MAX_HISTORY_SIZE) {
      history.value = history.value.slice(0, MAX_HISTORY_SIZE);
    }
  };

  /**
   * 应用历史记录
   * @param {string} historyId - 历史记录 ID
   * @returns {RowRangeHistory | null} 应用的历史记录
   */
  const applyHistory = (historyId: string): RowRangeHistory | null => {
    const record = history.value.find((h) => h.id === historyId);
    if (record) {
      startRow.value = record.startRow;
      endRow.value = record.endRow;
      includeHeader.value = record.includeHeader;
      return record;
    }
    return null;
  };

  /**
   * 清空历史记录
   */
  const clearHistory = () => {
    history.value = [];
  };

  return {
    rowRangeEnabled,
    startRow,
    endRow,
    includeHeader,
    totalExcelRows,
    autoApplyEnabled,
    countdown,
    history,
    isValidRange,
    selectedRowCount,
    hasActiveRange,
    applyRowRange,
    validateRange,
    resetRowRange,
    setTotalRows,
    handleRowRangeToggle,
    startCountdown,
    stopCountdown,
    toggleAutoApply,
    addHistory,
    applyHistory,
    clearHistory,
  };
}
