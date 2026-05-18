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
 */
const DEFAULT_CONFIG = {
  autoExtract: true,
  extractType: "auto",
  debounceDelay: 300,
  maxResults: 1000,
  jsonMode: "pairs", // 'pairs' | 'atomic'
  flattenNested: true,
  maxDepth: 3,
  includeLineage: true,
};

export function useParamExtractor(config = {}) {
  // 合并配置
  const options = { ...DEFAULT_CONFIG, ...config };

  // ==================== 状态定义 ====================

  const state = reactive({
    // 输入相关
    inputText: "",
    extractType: options.extractType, // 'auto' | 'sql' | 'json'
    detectedType: ContentType.UNKNOWN, // 自动检测结果

    // 提取结果
    extractedItems: [], // 结果项列表
    selectedItem: null, // 当前选中的结果项

    // 统计信息
    stats: {
      total: 0, // 总数
      sqlCount: 0, // SQL数量
      jsonCount: 0, // JSON数量
      success: 0, // 成功数
      warning: 0, // 警告数
      error: 0, // 错误数
    },

    // UI状态
    loading: false, // 处理中
    filterType: "all", // 类型筛选 ('all' | 'sql' | 'json')
    filterStatus: "all", // 状态筛选 ('all' | 'success' | 'warning' | 'error')

    // 选项
    autoExtract: options.autoExtract, // 自动提取开关
    flattenNested: options.flattenNested, // JSON嵌套展开选项
    lastExtractTime: null, // 上次提取时间
    lastError: null, // 最后的错误信息
  });

  // 防抖定时器
  let debounceTimer = null;
  let currentExtractor = null;

  // ==================== 计算属性 ====================

  /**
   * 过滤后的结果列表
   */
  const filteredItems = computed(() => {
    let items = state.extractedItems;

    // 类型筛选
    if (state.filterType !== "all") {
      items = items.filter((item) => item.type === state.filterType);
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
   * 触发提取操作
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

      // 确定提取类型
      const effectiveType = getEffectiveExtractType();

      // 创建或复用提取器
      if (
        !currentExtractor ||
        getTypeFromExtractor(currentExtractor) !== effectiveType
      ) {
        currentExtractor = createExtractor(effectiveType);
      }

      // 执行提取（带超时）
      const extractOptions = buildExtractOptions();
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
   * 手动触发类型检测
   */
  function detectType() {
    if (!state.inputText) {
      state.detectedType = ContentType.UNKNOWN;
      return;
    }

    const detection = detectContentType(state.inputText);
    state.detectedType = detection.type;
    return detection;
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
      const text =
        typeof item === "string"
          ? item
          : JSON.stringify(item.value || item.finalValue || item, null, 2);
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
        // 文本格式：每行一个结果
        const lines = [];
        state.extractedItems.forEach((item) => {
          item.extracted.forEach((extracted) => {
            lines.push(`${extracted.key}: ${extracted.value}`);
          });
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
   * 切换提取类型
   */
  function switchType(type) {
    if (["auto", "sql", "json"].includes(type)) {
      state.extractType = type;
      currentExtractor = null; // 清除缓存，下次重新创建

      // 如果有输入内容，立即重新提取
      if (state.inputText) {
        extract();
      }
    }
  }

  /**
   * 设置筛选条件
   */
  function setFilter(filterType, filterStatus) {
    if (filterType !== undefined) {
      state.filterType = filterType;
    }
    if (filterStatus !== undefined) {
      state.filterStatus = filterStatus;
    }
  }

  /**
   * 更新输入文本
   */
  function setInputText(text) {
    state.inputText = text;

    // 自动检测类型
    if (state.extractType === "auto") {
      detectType();
    }

    // 触发自动提取
    if (state.autoExtract) {
      debouncedExtract();
    }
  }

  /**
   * 更新JSON模式
   */
  function setJsonMode(mode) {
    if (["pairs", "atomic"].includes(mode)) {
      options.jsonMode = mode;
    }
  }

  // ==================== 内部辅助方法 ====================

  /**
   * 获取有效的提取类型
   */
  function getEffectiveExtractType() {
    if (state.extractType !== "auto") {
      return state.extractType;
    }

    // 自动检测
    if (state.detectedType !== ContentType.UNKNOWN) {
      return state.detectedType;
    }

    // 实时检测
    const detection = detectContentType(state.inputText);
    state.detectedType = detection.type;
    return detection.type;
  }

  /**
   * 构建提取选项
   */
  function buildExtractOptions() {
    const baseOptions = {
      ignoreComments: true,
      preserveStrings: true,
      trimWhitespace: true,
    };

    if (
      getEffectiveExtractType() === ContentType.JSON ||
      getEffectiveExtractType() === ContentType.MIXED
    ) {
      return {
        ...baseOptions,
        mode: options.jsonMode,
        maxDepth: options.maxDepth,
        includeLineage: options.includeLineage,
        flattenNested: state.flattenNested,
      };
    }

    return baseOptions;
  }

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
    detectType,
    clearResults,
    selectItem,
    deselectItem,
    copyItem,
    copyAll,
    exportResults,
    switchType,
    setFilter,
    setInputText,
    setJsonMode,
    cleanup,
  };
}

export default useParamExtractor;
