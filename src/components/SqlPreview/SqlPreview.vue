<template>
  <div class="sql-preview-container">
    <!-- 预览模式切换 -->
    <div class="preview-controls">
      <div class="control-group">
        <span class="control-label">预览模式：</span>
        <a-radio-group v-model:value="previewMode" size="small">
          <a-radio-button value="formatted">格式化</a-radio-button>
          <a-radio-button value="compressed">压缩</a-radio-button>
        </a-radio-group>
      </div>

      <div class="control-group">
        <span class="control-label">语法高亮：</span>
        <a-switch
          v-model:checked="syntaxHighlight"
          size="small"
          :disabled="isCompressedMode"
        />
      </div>

      <div class="control-group">
        <span class="control-label">显示行号：</span>
        <a-switch
          v-model:checked="showLineNumbers"
          size="small"
          :disabled="isCompressedMode"
        />
      </div>
    </div>

    <!-- SQL预览区域 -->
    <div
      ref="sqlPreviewArea"
      class="sql-preview-area"
      :class="{ 'with-line-numbers': showLineNumbers }"
      @scroll.passive="handleScrollSync"
    >
      <pre
        ref="sqlCodeContainer"
        class="sql-code"
        :class="{
          'syntax-highlight': syntaxHighlight,
          compressed: previewMode === 'compressed',
        }"
      >
        <code v-html="highlightedSql"></code>
      </pre>

      <div
        v-if="showLineNumbers"
        ref="lineNumbersContainer"
        class="line-numbers"
      >
        <span v-for="n in visibleLineNumbers" :key="n" class="line-number">{{
          n
        }}</span>
      </div>
    </div>

    <!-- 统计信息 -->
    <div v-if="sqlStats" class="sql-stats">
      <div class="stat-item">
        <span class="stat-label">语句数量：</span>
        <span class="stat-value">{{ sqlStats.statementCount }}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">影响行数：</span>
        <span class="stat-value">{{ sqlStats.affectedRows }}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">生成时间：</span>
        <span class="stat-value">{{ sqlStats.generationTime }}ms</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">文件大小：</span>
        <span class="stat-value">{{ formatFileSize(sqlStats.fileSize) }}</span>
      </div>
    </div>

    <!-- 操作按钮 -->
    <div class="action-buttons">
      <a-space>
        <a-button
          type="primary"
          @click="copySql"
          :disabled="!sql"
          :loading="copying"
        >
          <template #icon><CopyOutlined /></template>
          复制SQL
        </a-button>

        <a-button @click="copyRawSql" :disabled="!sql" :loading="copyingRaw">
          <template #icon><CopyOutlined /></template>
          复制原始SQL
        </a-button>

        <a-button @click="downloadSql" :disabled="!sql">
          <template #icon><DownloadOutlined /></template>
          下载文件
        </a-button>

        <a-button @click="previewInNewWindow" :disabled="!sql">
          <template #icon><EyeOutlined /></template>
          新窗口预览
        </a-button>

        <a-dropdown :disabled="!sql">
          <template #overlay>
            <a-menu @click="handleExportMenuClick">
              <a-menu-item key="copy">
                <CopyOutlined /> 复制到剪贴板
              </a-menu-item>
              <a-menu-item key="download">
                <DownloadOutlined /> 下载SQL文件
              </a-menu-item>
              <a-menu-item key="preview">
                <EyeOutlined /> 新窗口预览
              </a-menu-item>
            </a-menu>
          </template>
          <a-button>
            <template #icon><MoreOutlined /></template>
            更多操作
          </a-button>
        </a-dropdown>
      </a-space>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from "vue";
import { message } from "ant-design-vue";
import {
  CopyOutlined,
  DownloadOutlined,
  EyeOutlined,
  MoreOutlined,
} from "@ant-design/icons-vue";
import { useErrorHandler } from "@/composables/core/useErrorHandler";
import { useSqlGeneratorEnhanced } from "@/composables/sql/useSqlGeneratorEnhanced";
import { sqlHighlighter } from "@/utils/sql/sqlSyntaxHighlighter";

const props = defineProps({
  sql: {
    type: String,
    default: "",
  },
  stats: {
    type: Object,
    default: () => ({
      statementCount: 0,
      affectedRows: 0,
      generationTime: 0,
      fileSize: 0,
    }),
  },
  beautifyOptions: {
    type: Object,
    default: () => ({
      indentSpaces: 4,
      formatStyle: "expanded",
      keywordCase: "upper",
      maxLineLength: 80,
      alignValues: true,
    }),
  },
});

const emit = defineEmits(["copy", "download"]);

const { logError, logInfo } = useErrorHandler();
const sqlGenerator = useSqlGeneratorEnhanced();

// 响应式数据
const previewMode = ref("formatted");
const syntaxHighlight = ref(true);
const showLineNumbers = ref(true);
const copying = ref(false);
const copyingRaw = ref(false);

// 保存格式化模式下的原始状态
const originalSyntaxHighlight = ref(true);
const originalShowLineNumbers = ref(true);

// 监听预览模式变化，控制语法高亮和行号显示
watch(previewMode, (newMode, oldMode) => {
  if (newMode === "compressed" && oldMode === "formatted") {
    // 切换到压缩模式时，保存当前状态并禁用
    originalSyntaxHighlight.value = syntaxHighlight.value;
    originalShowLineNumbers.value = showLineNumbers.value;
    syntaxHighlight.value = false;
    showLineNumbers.value = false;
  } else if (newMode === "formatted" && oldMode === "compressed") {
    // 切换回格式化模式时，恢复原始状态
    syntaxHighlight.value = originalSyntaxHighlight.value;
    showLineNumbers.value = originalShowLineNumbers.value;
  }
  // 清除缓存，确保显示更新
  clearCache();
});

// 监听SQL内容变化，清除缓存
watch(
  () => props.sql,
  () => {
    clearCache();
    nextTick(() => {
      updateVisibleLineNumbers(0);
    });
  },
);

// 监听美化选项变化，清除缓存
watch(
  () => props.beautifyOptions,
  () => {
    clearCache();
  },
  { deep: true },
);

// 监听语法高亮开关变化，清除缓存
watch(syntaxHighlight, () => {
  clearCache();
});

// 监听行号显示开关，重新计算可见行号
watch(showLineNumbers, (newValue) => {
  if (newValue && sqlPreviewArea.value) {
    updateVisibleLineNumbers(sqlPreviewArea.value.scrollTop);
  }
});

// 监听行号显示开关变化，清除缓存
watch(showLineNumbers, () => {
  clearCache();
});

// SQL美化设置（使用父组件传递的选项）
const beautifySettings = computed(() => ({
  indentSpaces: props.beautifyOptions.indentSpaces || 4,
  formatStyle:
    props.beautifyOptions.formatStyle === "standard"
      ? "expanded"
      : props.beautifyOptions.formatStyle,
  keywordCase: props.beautifyOptions.keywordCase || "upper",
  maxLineLength: props.beautifyOptions.maxLineLength || 80,
  alignValues: props.beautifyOptions.alignValues !== false,
}));

// 计算属性：是否为压缩模式
const isCompressedMode = computed(() => previewMode.value === "compressed");

// 缓存机制
const cacheKey = computed(() => {
  return `${props.sql}-${previewMode.value}-${JSON.stringify(beautifySettings.value)}-${syntaxHighlight.value}`;
});

const sqlCache = ref(new Map());

// 计算属性
const formattedSql = computed(() => {
  if (!props.sql) return "";

  // 检查缓存
  const cacheData = sqlCache.value.get(cacheKey.value);
  if (cacheData && cacheData.formattedSql !== undefined) {
    return cacheData.formattedSql;
  }

  let formatted = "";

  if (previewMode.value === "compressed") {
    // 压缩模式：使用SQL生成器的美化功能
    formatted = sqlGenerator.formatSql(props.sql, "minified");
  } else if (previewMode.value === "formatted") {
    // 格式化模式：使用完整的美化功能
    formatted = sqlGenerator.beautifySql(props.sql, beautifySettings.value);
  } else {
    // 原始模式
    formatted = props.sql;
  }

  // 更新缓存
  const cacheEntry = sqlCache.value.get(cacheKey.value) || {};
  cacheEntry.formattedSql = formatted;
  sqlCache.value.set(cacheKey.value, cacheEntry);

  return formatted;
});

const highlightedSql = computed(() => {
  if (!props.sql) return "";

  // 检查缓存
  const cacheData = sqlCache.value.get(cacheKey.value);
  if (cacheData && cacheData.highlightedSql !== undefined) {
    return cacheData.highlightedSql;
  }

  let highlighted = "";

  if (syntaxHighlight.value) {
    try {
      // 对美化后的SQL进行语法高亮
      highlighted = sqlHighlighter.highlight(formattedSql.value);
    } catch (error) {
      console.error("语法高亮处理失败:", error);
      highlighted = formattedSql.value;
    }
  } else {
    highlighted = formattedSql.value;
  }

  // 更新缓存
  const cacheEntry = sqlCache.value.get(cacheKey.value) || {};
  cacheEntry.highlightedSql = highlighted;
  sqlCache.value.set(cacheKey.value, cacheEntry);

  return highlighted;
});

const lineCount = computed(() => {
  return formattedSql.value.split("\n").length;
});

const sqlPreviewArea = ref(null);
const lineNumbersContainer = ref(null);
const sqlCodeContainer = ref(null);

const visibleLineNumbers = ref([]);
const LINE_HEIGHT = 19.5;

const updateVisibleLineNumbers = (scrollTop = 0) => {
  if (!sqlPreviewArea.value) return;

  const containerHeight = sqlPreviewArea.value.clientHeight || 400;
  const totalLines = lineCount.value;
  const visibleLinesCount = Math.ceil(containerHeight / LINE_HEIGHT);

  const startLine = Math.max(1, Math.floor(scrollTop / LINE_HEIGHT) + 1);
  const endLine = Math.min(totalLines, startLine + visibleLinesCount - 1);

  if (startLine <= endLine) {
    visibleLineNumbers.value = Array.from(
      { length: endLine - startLine + 1 },
      (_, i) => startLine + i,
    );
  } else {
    visibleLineNumbers.value = [];
  }
};

let scrollRafId = null;
const handleScrollSync = (event) => {
  const scrollTop = event.target.scrollTop;

  if (scrollRafId) {
    cancelAnimationFrame(scrollRafId);
  }

  scrollRafId = requestAnimationFrame(() => {
    if (lineNumbersContainer.value) {
      lineNumbersContainer.value.style.transform = `translateY(${scrollTop}px)`;
    }

    updateVisibleLineNumbers(scrollTop);

    scrollRafId = null;
  });
};

const sqlStats = computed(() => {
  return {
    statementCount: props.stats.statementCount || 0,
    affectedRows: props.stats.affectedRows || 0,
    generationTime: props.stats.generationTime || 0,
    fileSize: props.stats.fileSize || new Blob([props.sql]).size,
  };
});

// 方法
const clearCache = () => {
  sqlCache.value.clear();
};

const formatFileSize = (bytes) => {
  if (bytes === 0) return "0 B";

  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

const copySql = async () => {
  if (!props.sql) {
    message.warning("没有SQL语句可复制");
    return;
  }

  copying.value = true;

  try {
    await navigator.clipboard.writeText(props.sql);
    message.success("SQL已复制到剪贴板");
    logInfo("SQL语句已复制到剪贴板");
    emit("copy", props.sql);
  } catch (error) {
    message.error("复制失败，请检查浏览器权限");
    logError(error, "system", { operation: "copySql" });
  } finally {
    copying.value = false;
  }
};

const copyRawSql = async () => {
  if (!props.sql) {
    message.warning("没有SQL语句可复制");
    return;
  }

  copyingRaw.value = true;

  try {
    const rawSql = sqlGenerator.formatSql(props.sql, "minified");
    await navigator.clipboard.writeText(rawSql);
    message.success("原始SQL（不换行）已复制到剪贴板");
    logInfo("原始SQL语句已复制到剪贴板");
    emit("copy", rawSql);
  } catch (error) {
    message.error("复制失败，请检查浏览器权限");
    logError(error, "system", { operation: "copyRawSql" });
  } finally {
    copyingRaw.value = false;
  }
};

const downloadSql = () => {
  if (!props.sql) {
    message.warning("没有SQL语句可下载");
    return;
  }

  try {
    const blob = new Blob([props.sql], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "generated_sql.sql";
    a.click();
    URL.revokeObjectURL(url);

    message.success("SQL文件下载成功");
    logInfo("SQL语句已下载");
    emit("download", props.sql);
  } catch (error) {
    message.error("下载失败");
    logError(error, "system", { operation: "downloadSql" });
  }
};

const previewInNewWindow = () => {
  if (!props.sql) {
    message.warning("没有SQL语句可预览");
    return;
  }

  try {
    const newWindow = window.open("", "_blank");
    newWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>SQL预览</title>
        <style>
          body { font-family: Consolas, Monaco, monospace; padding: 20px; }
          pre { background: #f5f5f5; padding: 15px; border-radius: 4px; overflow-x: auto; }
        </style>
      </head>
      <body>
        <h3>生成的SQL语句预览</h3>
        <pre><code>${props.sql.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</code></pre>
      </body>
      </html>
    `);
    newWindow.document.close();

    logInfo("在新窗口预览SQL语句");
  } catch (error) {
    message.error("新窗口预览失败，请检查浏览器弹出窗口设置");
    logError(error, "system", { operation: "previewInNewWindow" });
  }
};

const handleExportMenuClick = ({ key }) => {
  switch (key) {
    case "copy":
      copySql();
      break;
    case "download":
      downloadSql();
      break;
    case "preview":
      previewInNewWindow();
      break;
  }
};

// 组件挂载后初始化可见行号
onMounted(() => {
  nextTick(() => {
    updateVisibleLineNumbers(0);
  });

  // 监听容器大小变化，重新计算可见行号
  if (typeof ResizeObserver !== "undefined" && sqlPreviewArea.value) {
    const resizeObserver = new ResizeObserver(() => {
      if (sqlPreviewArea.value) {
        updateVisibleLineNumbers(sqlPreviewArea.value.scrollTop);
      }
    });

    resizeObserver.observe(sqlPreviewArea.value);

    // 组件卸载时清理观察器
    onUnmounted(() => {
      resizeObserver.disconnect();
    });
  }
});

// 暴露方法给父组件
defineExpose({
  copySql,
  downloadSql,
  previewInNewWindow,
  clearCache,
});
</script>

<style scoped>
.sql-preview-container {
  border: 1px solid var(--border-default);
  border-radius: var(--border-radius-md);
  overflow: hidden;
}

.preview-controls {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 16px;
  background: var(--table-header-bg);
  border-bottom: 1px solid var(--border-default);
  flex-wrap: wrap;
}

.control-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.control-label {
  font-size: 12px;
  color: var(--text-secondary);
}

.sql-preview-area {
  position: relative;
  overflow: auto;
  max-height: 400px;
  background: var(--panel-bg);
}

.sql-preview-area.with-line-numbers {
  padding-left: 48px;
}

.line-numbers {
  position: absolute;
  left: 0;
  top: 0;
  background: var(--code-gutter-bg);
  padding: 12px 8px;
  border-right: 1px solid var(--border-default);
  text-align: right;
  user-select: none;
  width: 40px;
  height: 100%;
  overflow: hidden;
}

.line-number {
  display: block;
  font-size: 13px;
  color: var(--code-gutter-text);
  line-height: 1.5;
}

.sql-code {
  margin: 0;
  padding: 12px 16px;
  font-family: "Consolas", "Monaco", "Courier New", monospace;
  font-size: 13px;
  line-height: 1.5;
  white-space: pre-wrap;
  overflow-wrap: break-word;
}

.sql-code.compressed {
  white-space: pre;
  word-break: normal;
}

.sql-code.syntax-highlight {
  color: var(--text-primary);
}

.sql-code.syntax-highlight code :deep(.sql-keyword) {
  color: #d73a49;
  font-weight: 600;
  background: rgba(215, 58, 73, 0.05);
  padding: 0 2px;
  border-radius: 2px;
}

.sql-code.syntax-highlight code :deep(.sql-string) {
  color: #032f62;
  background: rgba(3, 47, 98, 0.05);
  padding: 0 2px;
  border-radius: 2px;
}

.sql-code.syntax-highlight code :deep(.sql-number) {
  color: #005cc5;
  background: rgba(0, 92, 197, 0.05);
  padding: 0 2px;
  border-radius: 2px;
}

.sql-code.syntax-highlight code :deep(.sql-comment) {
  color: #6a737d;
  font-style: italic;
  background: rgba(106, 115, 125, 0.05);
  padding: 0 2px;
  border-radius: 2px;
}

.sql-code.syntax-highlight code :deep(.sql-table) {
  color: #22863a;
  background: rgba(34, 134, 58, 0.05);
  padding: 0 2px;
  border-radius: 2px;
}

.sql-code.syntax-highlight code :deep(.sql-column) {
  color: #6f42c1;
  background: rgba(111, 66, 193, 0.05);
  padding: 0 2px;
  border-radius: 2px;
}

[data-theme="dark"] .sql-code.syntax-highlight {
  color: var(--text-primary);
}

[data-theme="dark"] .sql-code.syntax-highlight code :deep(.sql-keyword) {
  color: #f97583;
  background: rgba(249, 117, 131, 0.15);
}

[data-theme="dark"] .sql-code.syntax-highlight code :deep(.sql-string) {
  color: #79b8ff;
  background: rgba(121, 184, 255, 0.15);
}

[data-theme="dark"] .sql-code.syntax-highlight code :deep(.sql-number) {
  color: #79b8ff;
  background: rgba(121, 184, 255, 0.15);
}

[data-theme="dark"] .sql-code.syntax-highlight code :deep(.sql-comment) {
  color: #8b949e;
  background: rgba(139, 148, 158, 0.15);
}

[data-theme="dark"] .sql-code.syntax-highlight code :deep(.sql-table) {
  color: #7ee787;
  background: rgba(126, 231, 135, 0.15);
}

[data-theme="dark"] .sql-code.syntax-highlight code :deep(.sql-column) {
  color: #d2a8ff;
  background: rgba(210, 168, 255, 0.15);
}

/* 滚动条样式优化 */
.sql-preview-area {
  scroll-behavior: smooth;
  -webkit-overflow-scrolling: touch;
}

.sql-preview-area::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.sql-preview-area::-webkit-scrollbar-track {
  background: var(--code-scrollbar-track);
  border-radius: var(--border-radius-xs);
}

.sql-preview-area::-webkit-scrollbar-thumb {
  background: var(--code-scrollbar-thumb);
  border-radius: var(--border-radius-xs);
}

.sql-preview-area::-webkit-scrollbar-thumb:hover {
  background: var(--code-scrollbar-thumb-hover);
}

/* Firefox 滚动条支持 */
.sql-preview-area * {
  scrollbar-width: thin;
  scrollbar-color: var(--code-scrollbar-thumb) var(--code-scrollbar-track);
}

.sql-stats {
  display: flex;
  justify-content: space-around;
  padding: 12px 16px;
  background: var(--panel-bg);
  border-top: 1px solid var(--border-default);
  border-bottom: 1px solid var(--border-default);
}

.stat-item {
  text-align: center;
}

.stat-label {
  display: block;
  font-size: 12px;
  color: var(--text-secondary);
}

.stat-value {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

.action-buttons {
  padding: 16px;
  background: var(--bg-elevated);
  border-top: 1px solid var(--border-default);
}

.validation-result {
  border-top: 1px solid var(--border-default);
}

.validation-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: var(--table-header-bg);
  font-weight: 600;
}

.validation-content {
  padding: 16px;
}

.validation-content.has-errors {
  background: var(--color-error-bg);
}

.error-list {
  margin: 0;
  padding-left: 20px;
}

.error-list li {
  margin-bottom: 4px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .preview-controls {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .sql-stats {
    flex-wrap: wrap;
    gap: 12px;
  }

  .stat-item {
    flex: 1 0 45%;
  }

  .action-buttons :deep(.ant-space) {
    flex-wrap: wrap;
  }

  .sql-preview-area {
    max-height: 350px;
  }

  .line-numbers {
    min-width: 35px;
    padding: 10px 6px;
  }

  .line-number {
    font-size: 12px;
  }

  .sql-code {
    padding: 10px 12px;
    font-size: 12px;
  }
}

@media (max-width: 480px) {
  .stat-item {
    flex: 1 0 100%;
  }

  .sql-preview-area {
    max-height: 280px;
  }

  .line-numbers {
    min-width: 30px;
    padding: 8px 4px;
  }

  .line-number {
    font-size: 11px;
  }

  .sql-code {
    padding: 8px 10px;
    font-size: 11px;
  }
}

@media (min-width: 1440px) {
  .sql-preview-area {
    max-height: 500px;
  }
}
</style>
