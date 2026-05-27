/**
 * 单元格拆分 Composable
 * 提供 Excel 单元格内容拆分功能
 */

import { ref, computed } from "vue";
import { message } from "ant-design-vue";

/**
 * 单元格拆分统计信息接口
 */
export interface CellSplitStats {
  originalRows: number;
  splitRows: number;
  expandedRows: number;
}

/**
 * 预定义分隔符选项
 */
export const SEPARATOR_OPTIONS = [
  { label: "逗号 (,)", value: "," },
  { label: "分号 (;)", value: ";" },
  { label: "竖线 (|)", value: "|" },
  { label: "制表符 (\\t)", value: "\t" },
  { label: "换行符 (\\n)", value: "\n" },
  { label: "空格", value: " " },
  { label: "自定义", value: "custom" },
];

/**
 * 单元格拆分 Composable
 * @returns {Object} 单元格拆分相关的状态和方法
 */
export function useCellSplit() {
  const cellSplitEnabled = ref(false);
  const cellSplitSeparator = ref(",");
  const customSeparator = ref("");
  const cellSplitStats = ref<CellSplitStats>({
    originalRows: 0,
    splitRows: 0,
    expandedRows: 0,
  });

  /**
   * 实际使用的分隔符
   */
  const activeSeparator = computed(() => {
    if (cellSplitSeparator.value === "custom") {
      return customSeparator.value;
    }
    return cellSplitSeparator.value;
  });

  /**
   * 是否有有效的分隔符
   */
  const hasValidSeparator = computed(() => {
    return activeSeparator.value.length > 0;
  });

  /**
   * 处理单元格拆分开关切换
   * @param {boolean} enabled - 开关状态
   */
  const handleCellSplitToggle = (enabled: boolean) => {
    cellSplitEnabled.value = enabled;

    if (enabled) {
      message.info("已启用单元格拆分，请选择拆分列和分隔符");
    } else {
      resetCellSplitStats();
    }
  };

  /**
   * 处理分隔符变化
   * @param {string} separator - 新的分隔符
   */
  const handleCellSplitSeparatorChange = (separator: string) => {
    cellSplitSeparator.value = separator;
  };

  /**
   * 设置自定义分隔符
   * @param {string} separator - 自定义分隔符
   */
  const setCustomSeparator = (separator: string) => {
    customSeparator.value = separator;
  };

  /**
   * 重置拆分统计
   */
  const resetCellSplitStats = () => {
    cellSplitStats.value = {
      originalRows: 0,
      splitRows: 0,
      expandedRows: 0,
    };
  };

  /**
   * 拆分单元格内容
   * @param {any[]} data - 原始数据
   * @param {number} columnIndex - 要拆分的列索引
   * @param {Function} logInfo - 日志记录函数
   * @returns {any[]} 拆分后的数据
   */
  const applyCellSplit = (
    data: any[],
    columnIndex: number,
    logInfo: (message: string, type: string, context?: any) => void,
  ): any[] => {
    if (!cellSplitEnabled.value) {
      return data;
    }

    if (!hasValidSeparator.value) {
      message.warning("请先设置分隔符");
      return data;
    }

    if (!data || data.length === 0) {
      message.warning("没有可拆分的数据");
      return data;
    }

    const originalRows = data.length;
    const expandedData: any[] = [];
    let splitRowCount = 0;

    data.forEach((row) => {
      const cellValue = row[columnIndex];

      if (cellValue !== null && cellValue !== undefined) {
        const stringValue = String(cellValue);
        const parts = stringValue.split(activeSeparator.value);

        if (parts.length > 1) {
          splitRowCount++;
          parts.forEach((part) => {
            const newRow = [...row];
            newRow[columnIndex] = part.trim();
            expandedData.push(newRow);
          });
        } else {
          expandedData.push(row);
        }
      } else {
        expandedData.push(row);
      }
    });

    cellSplitStats.value = {
      originalRows,
      splitRows: splitRowCount,
      expandedRows: expandedData.length,
    };

    logInfo(
      `单元格拆分完成: 原始 ${originalRows} 行 → 拆分后 ${expandedData.length} 行 (拆分了 ${splitRowCount} 行)`,
      "cell-split",
      {
        operation: "applyCellSplit",
        columnIndex,
        separator: activeSeparator.value,
        originalRows,
        splitRows: splitRowCount,
        expandedRows: expandedData.length,
      },
    );

    message.success(`拆分完成: ${originalRows} 行 → ${expandedData.length} 行`);
    return expandedData;
  };

  /**
   * 清除单元格拆分状态
   */
  const clearCellSplit = () => {
    cellSplitEnabled.value = false;
    cellSplitSeparator.value = ",";
    customSeparator.value = "";
    resetCellSplitStats();
  };

  return {
    cellSplitEnabled,
    cellSplitSeparator,
    customSeparator,
    cellSplitStats,
    activeSeparator,
    hasValidSeparator,
    handleCellSplitToggle,
    handleCellSplitSeparatorChange,
    setCustomSeparator,
    applyCellSplit,
    resetCellSplitStats,
    clearCellSplit,
    SEPARATOR_OPTIONS,
  };
}
