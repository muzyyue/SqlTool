import { ref } from "vue";
import { message } from "ant-design-vue";
import { useExcelParserEnhanced } from "@/composables/excel/useExcelParserEnhanced";

/**
 * Excel数据处理Composable
 * 提供Excel文件上传、去重、单元格拆分、行范围选择等功能
 * @returns {Object} 包含所有Excel数据处理函数和状态的对象
 */
export function useExcelDataProcessor() {
  const { parseExcel } = useExcelParserEnhanced();
  const fileList = ref([]);
  const uploadedFile = ref(null);
  const uploading = ref(false);
  const excelData = ref([]);
  const excelHeaders = ref([]);
  const totalExcelRows = ref(0);

  // 去重相关状态
  const deduplicationEnabled = ref(false);
  const deduplicationColumn = ref(undefined);
  const deduplicationStats = ref({
    originalRows: 0,
    deduplicatedRows: 0,
    removedRows: 0,
  });
  const originalExcelData = ref([]);

  // 单元格数据拆分相关状态
  const cellSplitEnabled = ref(false);
  const cellSplitSeparator = ref(",");
  const customSeparator = ref("");
  const cellSplitStats = ref({
    originalRows: 0,
    splitRows: 0,
    expandedRows: 0,
  });
  const originalExcelDataForSplit = ref([]);

  // 行范围选择相关状态
  const rowRangeEnabled = ref(false);
  const startRow = ref(null);
  const endRow = ref(null);
  const includeHeader = ref(true);

  /**
   * 处理文件上传
   * @param {Object} options - 上传选项
   * @param {File} options.file - 上传的文件
   * @param {Function} options.onSuccess - 成功回调
   * @param {Function} options.onError - 错误回调
   */
  const handleUpload = async (options) => {
    const { file, onSuccess, onError } = options;
    uploading.value = true;

    try {
      uploadedFile.value = file;

      // 先解析一次获取总行数
      const initialResult = await parseExcel(file, {
        sheetIndex: 0,
        maxRows: 10000,
        includeHeader: includeHeader.value,
      });

      totalExcelRows.value = initialResult.totalRows;

      // 根据行范围设置解析参数
      const parseOptions = {
        sheetIndex: 0,
        maxRows: 10000,
        includeHeader: includeHeader.value,
      };

      // 如果启用了行范围选择，添加行范围参数
      if (rowRangeEnabled.value && startRow.value && endRow.value) {
        parseOptions.startRow = startRow.value;
        parseOptions.endRow = endRow.value;
      }

      const result = await parseExcel(file, parseOptions);

      excelData.value = result.rows;
      excelHeaders.value = result.headers;
      originalExcelData.value = [...result.rows];
      originalExcelDataForSplit.value = [...result.rows];

      onSuccess("文件上传成功");
      message.success("文件解析成功");
    } catch (error) {
      console.error("文件上传和解析失败:", error);
      onError(error.message || "文件解析失败");
      message.error(error.message || "文件解析失败");
    } finally {
      uploading.value = false;
    }
  };

  /**
   * 清除上传的文件及相关数据
   */
  const clearFile = () => {
    uploadedFile.value = null;
    excelData.value = [];
    excelHeaders.value = [];
    originalExcelData.value = [];
    fileList.value = [];

    // 清除去重相关状态
    deduplicationEnabled.value = false;
    deduplicationColumn.value = undefined;
    deduplicationStats.value = {
      originalRows: 0,
      deduplicatedRows: 0,
      removedRows: 0,
    };

    // 清除单元格拆分相关状态
    cellSplitEnabled.value = false;
    cellSplitSeparator.value = ",";
    customSeparator.value = "";
    cellSplitStats.value = {
      originalRows: 0,
      splitRows: 0,
      expandedRows: 0,
    };
    originalExcelDataForSplit.value = [];

    // 清除行范围相关状态
    rowRangeEnabled.value = false;
    startRow.value = null;
    endRow.value = null;
    includeHeader.value = true;
    totalExcelRows.value = 0;

    message.info("文件已清除");
  };

  /**
   * 处理去重开关切换
   * @param {boolean} checked - 去重开关状态
   */
  const handleDeduplicationToggle = (checked) => {
    deduplicationEnabled.value = checked;

    if (!checked) {
      if (originalExcelData.value.length > 0) {
        excelData.value = [...originalExcelData.value];
        const restoredRowCount = excelData.value.length;
        message.success(
          `数据去重已关闭，已恢复原始数据（${restoredRowCount} 行）`,
        );
      } else {
        message.info("数据去重已关闭");
      }

      deduplicationColumn.value = undefined;
      deduplicationStats.value = {
        originalRows: 0,
        deduplicatedRows: 0,
        removedRows: 0,
      };
    } else {
      message.info("已启用数据去重，请选择去重列");
    }
  };

  /**
   * 应用去重逻辑
   */
  const applyDeduplication = () => {
    if (
      deduplicationColumn.value === undefined ||
      deduplicationColumn.value === null
    ) {
      message.warning("请先选择去重列");
      return;
    }

    if (!excelData.value || excelData.value.length === 0) {
      message.warning("没有可去重的数据");
      return;
    }

    if (originalExcelData.value.length > 0) {
      excelData.value = [...originalExcelData.value];
    }

    const columnIndex = deduplicationColumn.value;
    const seenValues = new Set();
    const deduplicatedData = [];

    excelData.value.forEach((row) => {
      const value = row[columnIndex];
      if (!seenValues.has(value)) {
        seenValues.add(value);
        deduplicatedData.push(row);
      }
    });

    const originalRows = originalExcelData.value.length;
    const deduplicatedRows = deduplicatedData.length;
    const removedRows = originalRows - deduplicatedRows;

    excelData.value = deduplicatedData;

    deduplicationStats.value = {
      originalRows,
      deduplicatedRows,
      removedRows,
    };

    if (removedRows > 0) {
      message.success(
        `去重完成: 原始 ${originalRows} 行 → 去重后 ${deduplicatedRows} 行`,
      );
    } else {
      message.info("未发现重复数据");
    }
  };

  /**
   * 处理单元格数据拆分开关切换
   * @param {boolean} checked - 拆分开关状态
   */
  const handleCellSplitToggle = (checked) => {
    cellSplitEnabled.value = checked;

    if (!checked) {
      if (originalExcelDataForSplit.value.length > 0) {
        excelData.value = [...originalExcelDataForSplit.value];
        const restoredRowCount = excelData.value.length;
        message.success(
          `单元格数据拆分已关闭，已恢复原始数据（${restoredRowCount} 行）`,
        );
      } else {
        message.info("单元格数据拆分已关闭");
      }

      cellSplitStats.value = {
        originalRows: 0,
        splitRows: 0,
        expandedRows: 0,
      };
    } else {
      if (
        originalExcelDataForSplit.value.length === 0 &&
        excelData.value.length > 0
      ) {
        originalExcelDataForSplit.value = [...excelData.value];
      }
      message.info("已启用单元格数据拆分，请选择分隔符");
    }
  };

  /**
   * 应用单元格数据拆分逻辑
   */
  const applyCellSplit = () => {
    if (!cellSplitSeparator.value) {
      message.warning("请先选择分隔符");
      return;
    }

    if (cellSplitSeparator.value === "custom" && !customSeparator.value) {
      message.warning("请输入自定义分隔符");
      return;
    }

    if (!excelData.value || excelData.value.length === 0) {
      message.warning("没有可拆分的数据");
      return;
    }

    if (originalExcelDataForSplit.value.length > 0) {
      excelData.value = [...originalExcelDataForSplit.value];
    }

    const separator =
      cellSplitSeparator.value === "custom"
        ? customSeparator.value
        : cellSplitSeparator.value;
    const actualSeparator = separator === "\\t" ? "\t" : separator;

    const splitData = [];

    excelData.value.forEach((row) => {
      const columnSplits = [];

      Object.keys(row).forEach((key) => {
        const cellValue = row[key];
        if (cellValue !== null && cellValue !== undefined && cellValue !== "") {
          const splits = String(cellValue)
            .split(actualSeparator)
            .map((s) => s.trim())
            .filter((s) => s !== "");
          columnSplits.push(splits);
        } else {
          columnSplits.push([cellValue]);
        }
      });

      const rowSplitCount = Math.max(
        ...columnSplits.map((splits) => splits.length),
      );

      for (let i = 0; i < rowSplitCount; i++) {
        const newRow = {};
        Object.keys(row).forEach((key, index) => {
          const splits = columnSplits[index];
          newRow[key] = splits[i] || splits[splits.length - 1] || "";
        });
        splitData.push(newRow);
      }
    });

    const originalRows = excelData.value.length;
    const splitRows = splitData.length;
    const expandedRows = splitRows - originalRows;

    excelData.value = splitData;

    cellSplitStats.value = {
      originalRows,
      splitRows,
      expandedRows,
    };

    if (expandedRows > 0) {
      message.success(
        `拆分完成: 原始 ${originalRows} 行 → 拆分后 ${splitRows} 行`,
      );
    } else {
      message.info("数据无需拆分");
    }
  };

  /**
   * 处理行范围开关切换
   * @param {boolean} checked - 行范围开关状态
   */
  const handleRowRangeToggle = (checked) => {
    rowRangeEnabled.value = checked;

    if (!checked) {
      if (originalExcelData.value.length > 0) {
        excelData.value = [...originalExcelData.value];
        const restoredRowCount = excelData.value.length;
        message.success(
          `行范围选择已关闭，已恢复原始数据（${restoredRowCount} 行）`,
        );
      } else {
        message.info("行范围选择已关闭");
      }

      startRow.value = null;
      endRow.value = null;
    } else {
      message.info("已启用行范围选择，请设置起始行和结束行");
    }
  };

  /**
   * 应用行范围
   */
  const applyRowRange = async () => {
    if (!uploadedFile.value) {
      message.warning("请先上传Excel文件");
      return;
    }

    if (!startRow.value || !endRow.value) {
      message.warning("请设置起始行和结束行");
      return;
    }

    if (startRow.value > endRow.value) {
      message.error("起始行不能大于结束行");
      return;
    }

    if (
      startRow.value > totalExcelRows.value ||
      endRow.value > totalExcelRows.value
    ) {
      message.error(`行数超出范围，文件总行数为 ${totalExcelRows.value}`);
      return;
    }

    uploading.value = true;

    try {
      const result = await parseExcel(uploadedFile.value, {
        sheetIndex: 0,
        maxRows: 10000,
        startRow: startRow.value,
        endRow: endRow.value,
        includeHeader: includeHeader.value,
      });

      excelData.value = result.rows;
      excelHeaders.value = result.headers;
      originalExcelData.value = [...result.rows];
      originalExcelDataForSplit.value = [...result.rows];

      startRow.value = null;
      endRow.value = null;

      message.success(`行范围已重置，共 ${result.rows.length} 行数据`);
    } catch (error) {
      console.error("重置行范围失败:", error);
      message.error(error.message || "重置行范围失败");
    } finally {
      uploading.value = false;
    }
  };

  /**
   * 重置行范围
   */
  const resetRowRange = async () => {
    if (!uploadedFile.value) {
      message.warning("请先上传Excel文件");
      return;
    }

    uploading.value = true;

    try {
      const result = await parseExcel(uploadedFile.value, {
        sheetIndex: 0,
        maxRows: 10000,
        includeHeader: includeHeader.value,
      });

      excelData.value = result.rows;
      excelHeaders.value = result.headers;
      originalExcelData.value = [...result.rows];
      originalExcelDataForSplit.value = [...result.rows];

      startRow.value = null;
      endRow.value = null;

      message.success(`行范围已重置，共 ${result.rows.length} 行数据`);
    } catch (error) {
      console.error("重置行范围失败:", error);
      message.error(error.message || "重置行范围失败");
    } finally {
      uploading.value = false;
    }
  };

  return {
    fileList,
    uploadedFile,
    uploading,
    excelData,
    excelHeaders,
    totalExcelRows,
    deduplicationEnabled,
    deduplicationColumn,
    deduplicationStats,
    cellSplitEnabled,
    cellSplitSeparator,
    customSeparator,
    cellSplitStats,
    rowRangeEnabled,
    startRow,
    endRow,
    includeHeader,
    handleUpload,
    clearFile,
    handleDeduplicationToggle,
    applyDeduplication,
    handleCellSplitToggle,
    applyCellSplit,
    handleRowRangeToggle,
    applyRowRange,
    resetRowRange,
  };
}
