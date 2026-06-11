/**
 * 参数提取工具核心 Composable
 * 统一管理SQL和JSON提取的状态和逻辑
 */

import { ref, reactive, computed, watch } from "vue";
import {
  detectContentType,
  createExtractor,
  ContentType,
} from "@/utils/extractorFactory";

/**
 * 默认配置
 * 专注于 SQL 语句提取
 */
const DEFAULT_CONFIG = {
  autoExtract: true,
  extractType: "sql", // 默认只提取SQL
  debounceDelay: 300,
  maxResults: 1000,
};

const MAX_EXTRACT_DEPTH = 5;

/**
 * 从提取结果项中智能提取可读值
 * 支持字符串化JSON、嵌套对象、数组等复杂结构
 * @param {Object} item - 提取结果项（含 extracted/value/finalValue）
 * @param {number} depth - 当前递归深度
 * @returns {string} - 可读的文本内容
 */
function extractReadableValue(item, depth = 0) {
  if (depth > MAX_EXTRACT_DEPTH) {
    try {
      return typeof item === "string" ? item : JSON.stringify(item);
    } catch {
      return "[...]";
    }
  }

  if (item === null || item === undefined) return "";

  if (typeof item === "string") {
    const trimmed = item.trim();
    if (
      (trimmed.startsWith("{") || trimmed.startsWith("[")) &&
      trimmed.length < 10000
    ) {
      try {
        return extractReadableValue(JSON.parse(trimmed), depth + 1);
      } catch {
        return item;
      }
    }
    return item;
  }

  if (typeof item === "number" || typeof item === "boolean")
    return String(item);

  if (Array.isArray(item)) {
    if (item.length === 0) return "";
    if (item.length === 1) return extractReadableValue(item[0], depth + 1);
    return item.map((v) => extractReadableValue(v, depth + 1)).join("\n");
  }

  if (typeof item === "object") {
    if (item.extracted && Array.isArray(item.extracted)) {
      return item.extracted
        .map((e) => extractReadableValue(e.value || e, depth + 1))
        .join("\n");
    }

    if (item.value !== undefined)
      return extractReadableValue(item.value, depth + 1);

    if (item.finalValue !== undefined)
      return extractReadableValue(item.finalValue, depth + 1);

    try {
      return JSON.stringify(item, null, 2);
    } catch {
      return "[Object]";
    }
  }

  return String(item);
}

export function useParamExtractor(config = {}) {
  // 合并配置
  const options = { ...DEFAULT_CONFIG, ...config };

  // ==================== 状态定义 ====================

  const state = reactive({
    // 输入相关
    inputText: "",
    extractType: options.extractType, // 'sql' (专注于SQL提取)

    // 提取结果
    extractedItems: [], // 结果项列表
    selectedItem: null, // 当前选中的结果项

    // 统计信息（仅SQL）
    stats: {
      total: 0, // 总数
      sqlCount: 0, // SQL数量
      success: 0, // 成功数
      warning: 0, // 警告数
      error: 0, // 错误数
    },

    // UI状态
    loading: false, // 处理中
    filterStatus: "all", // 状态筛选 ('all' | 'success' | 'warning' | 'error')

    // 选项
    autoExtract: options.autoExtract, // 自动提取开关
    lastExtractTime: null, // 上次提取时间
    lastError: null, // 最后的错误信息

    // 交互式参数选择
    interactiveMode: false, // 是否处于交互模式
    selectedField: null, // 当前选中的字段
    selectedValues: [], // 当前选中的取值列表
  });

  // 防抖定时器
  let debounceTimer = null;
  let currentExtractor = null;

  // ==================== 计算属性 ====================

  /**
   * 过滤后的结果列表（支持状态筛选和交互式字段-取值筛选）
   */
  const filteredItems = computed(() => {
    let items = state.extractedItems;

    // 交互模式：按字段和取值精准筛选
    if (
      state.interactiveMode &&
      state.selectedField &&
      state.selectedValues?.length > 0
    ) {
      items = items
        .map((item) => {
          if (!item.extracted?.length) return null;
          const matched = item.extracted.filter((ext) => {
            const path = ext.path || ext.key;
            if (path !== state.selectedField) return false;
            const extValue =
              typeof ext.value === "object" && ext.value !== null
                ? JSON.stringify(ext.value)
                : String(ext.value ?? "");
            return state.selectedValues.some((sv) => {
              const svStr = String(sv ?? "");
              return extValue === svStr || extValue.includes(svStr);
            });
          });
          if (matched.length === 0) return null;
          return { ...item, extracted: matched };
        })
        .filter(Boolean);
    }

    // 状态筛选
    if (state.filterStatus !== "all") {
      items = items
        .map((item) => ({
          ...item,
          extracted: item.extracted.filter(
            (extracted) => extracted.status === state.filterStatus,
          ),
        }))
        .filter((item) => item.extracted.length > 0);
    }

    return items;
  });

  /**
   * 是否有结果
   */
  const hasResults = computed(() => state.extractedItems.length > 0);

  /**
   * 是否有选中项
   */
  const hasSelectedItem = computed(() => state.selectedItem !== null);

  /**
   * 选中的详情查看器组件类型
   */
  const detailComponentType = computed(() => {
    if (!state.selectedItem) return null;
    return state.selectedItem.type === "sql"
      ? "SqlDetailViewer"
      : "JsonDetailViewer";
  });

  /**
   * 是否正在加载
   */
  const isLoading = computed(() => state.loading);

  // ==================== 核心方法 ====================

  /**
   * 触发提取操作（专注于SQL提取）
   */
  async function extract() {
    if (!state.inputText || !state.inputText.trim()) {
      clearResults();
      return;
    }

    if (state.loading) {
      console.warn("正在提取中，请勿重复操作");
      return;
    }

    let timeoutId = null;

    try {
      state.loading = true;
      state.lastError = null;

      // 设置超时保护（10秒）
      const timeoutPromise = new Promise((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error("操作超时，请检查输入内容或减少数据量"));
        }, 10000);
      });

      // 创建 SQL 提取器
      if (!currentExtractor) {
        currentExtractor = createExtractor(ContentType.SQL);
      }

      // 执行提取（带超时）
      const extractOptions = {
        ignoreComments: true,
        preserveStrings: true,
        trimWhitespace: true,
        removeLogPrefix: true,
        extractCodeBlocks: true,
      };
      const extractPromise = currentExtractor.extract(
        state.inputText,
        extractOptions,
      );
      const result = await Promise.race([extractPromise, timeoutPromise]);

      // 更新状态
      updateExtractionResult(result);

      state.lastExtractTime = Date.now();
    } catch (error) {
      console.error("提取失败:", error);
      state.lastError = error.message || "提取过程中发生错误";
      state.stats.error++;

      // 确保出错时清空可能的部分结果
      if (state.extractedItems.length === 0) {
        state.extractedItems = [];
        state.selectedItem = null;
      }
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      state.loading = false;
    }
  }

  /**
   * 带防抖的自动提取
   */
  function debouncedExtract() {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    debounceTimer = setTimeout(() => {
      if (state.autoExtract && state.inputText) {
        extract();
      }
    }, options.debounceDelay);
  }

  /**
   * 设置交互模式
   * @param {boolean} enabled - 是否启用交互模式
   */
  function setInteractiveMode(enabled) {
    state.interactiveMode = !!enabled;
    if (!enabled) {
      state.selectedField = null;
      state.selectedValues = [];
    }
  }

  /**
   * 按字段和取值进行精准提取/筛选
   * @param {string} field - 字段路径
   * @param {Array} values - 取值列表
   */
  async function extractByFieldAndValue(field, values) {
    try {
      state.selectedField = field;
      state.selectedValues = Array.isArray(values) ? values : [values];
      state.lastError = null;
      return true;
    } catch (error) {
      state.lastError = error.message || "精准提取失败";
      throw error;
    }
  }

  /**
   * 切换提取类型（仅支持sql）
   */
  function switchType(type) {
    if (type === "sql") {
      state.extractType = type;
      currentExtractor = null; // 清除缓存，下次重新创建

      // 如果有输入内容，立即重新提取
      if (state.inputText) {
        extract();
      }
    }
  }

  /**
   * 设置筛选条件（仅状态筛选）
   */
  function setFilter(filterType, filterStatus) {
    if (filterStatus !== undefined) {
      state.filterStatus = filterStatus;
    }
  }

  /**
   * 清空结果
   */
  function clearResults() {
    state.extractedItems = [];
    state.selectedItem = null;
    resetStats();
    state.lastExtractTime = null;
    state.lastError = null;
  }

  /**
   * 选择某个结果项
   */
  function selectItem(item) {
    state.selectedItem = item;
  }

  /**
   * 取消选择
   */
  function deselectItem() {
    state.selectedItem = null;
  }

  /**
   * 复制单条结果到剪贴板
   */
  async function copyItem(item) {
    try {
      const text = extractReadableValue(item);
      await navigator.clipboard.writeText(text);
      return true;
    } catch (error) {
      console.error("复制失败:", error);
      return false;
    }
  }

  /**
   * 复制全部结果
   */
  async function copyAll(format = "text") {
    try {
      let text = "";

      if (format === "json") {
        text = JSON.stringify(state.extractedItems, null, 2);
      } else {
        const lines = [];
        state.extractedItems.forEach((item) => {
          if (item.extracted && Array.isArray(item.extracted)) {
            item.extracted.forEach((extracted) => {
              const value = extractReadableValue(extracted.value || extracted);
              lines.push(value);
            });
          } else {
            lines.push(extractReadableValue(item));
          }
        });
        text = lines.join("\n");
      }

      await navigator.clipboard.writeText(text);
      return true;
    } catch (error) {
      console.error("复制全部失败:", error);
      return false;
    }
  }

  /**
   * 导出结果
   */
  function exportResults(format = "json") {
    const data =
      format === "json"
        ? JSON.stringify(state.extractedItems, null, 2)
        : convertToCSV(state.extractedItems);

    const blob = new Blob([data], { type: `text/${format}` });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `extracted-results.${format}`;
    link.click();
    URL.revokeObjectURL(url);
  }

  /**
   * 更新输入文本
   */
  function setInputText(text) {
    state.inputText = text;

    // 触发自动提取
    if (state.autoExtract) {
      debouncedExtract();
    }
  }

  // ==================== 内部辅助方法 ====================

  /**
   * 更新提取结果
   */
  function updateExtractionResult(result) {
    state.extractedItems = result.items || [];

    // 更新统计信息
    if (result.stats) {
      Object.assign(state.stats, result.stats);
    }

    // 自动选择第一个结果
    if (state.extractedItems.length > 0 && !state.selectedItem) {
      selectItem(state.extractedItems[0]);
    }
  }

  /**
   * 重置统计信息
   */
  function resetStats() {
    Object.assign(state.stats, {
      total: 0,
      sqlCount: 0,
      jsonCount: 0,
      success: 0,
      warning: 0,
      error: 0,
    });
  }

  /**
   * 从提取器获取类型
   */
  function getTypeFromExtractor(extractor) {
    if (!extractor) return null;
    return extractor.type || null;
  }

  /**
   * 转换为CSV格式
   */
  function convertToCSV(items) {
    const headers = ["ID", "类型", "键名", "值", "数据类型", "状态"];
    const rows = [headers.join(",")];

    items.forEach((item, index) => {
      item.extracted.forEach((extracted) => {
        const row = [
          index + 1,
          item.type,
          `"${(extracted.key || "").replace(/"/g, '""')}"`,
          `"${String(extracted.value || "").replace(/"/g, '""')}"`,
          extracted.dataType,
          extracted.status,
        ];
        rows.push(row.join(","));
      });
    });

    return rows.join("\n");
  }

  // ==================== 监听器 ====================

  // 监听输入变化，触发自动提取
  watch(
    () => state.inputText,
    (newVal) => {
      if (newVal && state.autoExtract) {
        debouncedExtract();
      }
    },
    { flush: "post" },
  );

  // 清理函数
  function cleanup() {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
  }

  // 返回公共接口
  return {
    // 状态
    state,

    // 计算属性
    filteredItems,
    hasResults,
    hasSelectedItem,
    detailComponentType,
    isLoading,

    // 方法
    extract,
    debouncedExtract,
    clearResults,
    selectItem,
    deselectItem,
    copyItem,
    copyAll,
    exportResults,
    switchType,
    setFilter,
    setInputText,
    setInteractiveMode,
    extractByFieldAndValue,

    // 清理方法
    cleanup,
  };
}

export default useParamExtractor;
