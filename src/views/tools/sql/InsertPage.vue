<template>
  <div class="insert-page">
    <!-- 页面标题和操作 -->
    <div class="page-header">
      <h2>INSERT语句生成</h2>
      <div class="header-actions">
        <a-button @click="resetAll">
          <template #icon><ReloadOutlined /></template>
          重置
        </a-button>
        <a-button type="primary" @click="generateSql" :loading="generating">
          <template #icon><PlayCircleOutlined /></template>
          生成SQL
        </a-button>
      </div>
    </div>

    <!-- 主要内容区域 -->
    <div class="content-grid">
      <!-- 左侧：输入区域 -->
      <div class="input-section">
        <!-- DDL输入 -->
        <div class="input-card">
          <div class="card-header">
            <h3>DDL语句输入</h3>
            <a-tooltip
              title="输入CREATE TABLE语句，系统将自动解析表结构和字段信息"
            >
              <QuestionCircleOutlined />
            </a-tooltip>
          </div>
          <a-textarea
            v-model:value="ddlStatement"
            placeholder="请输入CREATE TABLE语句..."
            :rows="8"
            :maxlength="5000"
            show-count
            @change="handleDdlChange"
          />
          <div class="card-footer">
            <a-space>
              <a-button
                type="link"
                size="small"
                @click="parseDdl(false)"
                :loading="parsingDdl"
              >
                解析DDL
              </a-button>
              <a-button
                type="link"
                size="small"
                @click="parseDdl(true)"
                :loading="parsingDdl"
                title="强制刷新缓存，重新解析DDL"
              >
                强制刷新
              </a-button>
              <a-button
                type="link"
                size="small"
                @click="handleClearCache"
                title="清除所有DDL解析缓存"
              >
                清除缓存
              </a-button>
            </a-space>
            <span v-if="parsedFields.length > 0" class="field-count">
              已解析 {{ parsedFields.length }} 个字段
            </span>
          </div>
        </div>

        <!-- Excel上传 - 使用现有组件 -->
        <ExcelUploadCard
          :file-list="fileList"
          :uploaded-file="uploadedFile"
          :uploading="uploading"
          :excel-data="excelData"
          :excel-headers="excelHeaders"
          :deduplication-enabled="deduplicationEnabled"
          :deduplication-column="deduplicationColumn"
          :deduplication-stats="deduplicationStats"
          :row-range-enabled="rowRangeEnabled"
          :start-row="startRow"
          :end-row="endRow"
          :include-header="includeHeader"
          :total-excel-rows="totalExcelRows"
          :cell-split-enabled="cellSplitEnabled"
          :cell-split-separator="cellSplitSeparator"
          :custom-separator="customSeparator"
          :cell-split-stats="cellSplitStats"
          @upload="handleUpload"
          @clear-file="clearFile"
          @reparse="handleReparse"
          @deduplication-toggle="handleDeduplicationToggle"
          @deduplication-change="handleDeduplicationChange"
          @cell-split-toggle="handleCellSplitToggle"
          @cell-split-separator-change="handleCellSplitSeparatorChange"
          @cell-split-apply="handleCellSplitApply"
          @row-range-toggle="handleRowRangeToggle"
          @row-range-apply="applyRowRange"
          @row-range-reset="resetRowRange"
          @update:startRow="handleStartRowUpdate"
          @update:endRow="handleEndRowUpdate"
        />

        <!-- 字段映射 - 使用现有组件 -->
        <FieldMappingCard
          v-if="showFieldMapping"
          :show-field-mapping="showFieldMapping"
          :enhanced-matching-stats="enhancedMatchingStats"
          :filtered-field-mappings="filteredFieldMappings"
          :mapping-columns="mappingColumns"
          :excel-headers="excelHeaders"
          :custom-binding-enabled="customBindingEnabled"
          :custom-fields-data="customFieldsData"
          :custom-field-manager-key="customFieldManagerKey"
          :custom-binding-manager="customBindingManager"
          :database-type="databaseType"
          :has-custom-binding-config="hasCustomBindingConfig"
          @auto-match-fields="autoMatchFields"
          @clear-all-mappings="clearAllMappings"
          @validate-enhanced-mappings="validateEnhancedMappings"
          @update-mapping="updateMapping"
          @handle-generated-by-function-change="handleGeneratedByFunctionChange"
          @clear-mapping="clearMapping"
          @handle-custom-binding-toggle="handleCustomBindingToggle"
          @open-custom-binding-modal="openCustomBindingModal"
          @handle-edit-custom-field="handleEditCustomField"
          @handle-delete-custom-field="handleDeleteCustomField"
          @handle-refresh-custom-fields="handleRefreshCustomFields"
          @update:database-type="handleDatabaseTypeChange"
        />
      </div>

      <!-- 右侧：输出区域 -->
      <div class="output-section">
        <!-- SQL预览 -->
        <div class="output-card">
          <div class="card-header">
            <h3>生成的INSERT语句</h3>
            <div class="output-actions">
              <a-space>
                <a-switch
                  v-model:checked="includeComments"
                  checked-children="包含注释"
                  un-checked-children="纯SQL"
                  size="small"
                />
                <a-button
                  @click="toggleBeautifyOptions"
                  type="dashed"
                  size="small"
                >
                  <template #icon><SettingOutlined /></template>
                  美化选项
                </a-button>
                <a-button
                  @click="generateSql"
                  type="primary"
                  :loading="generating"
                >
                  <template #icon><PlayCircleOutlined /></template>
                  生成SQL
                </a-button>
              </a-space>
            </div>
          </div>

          <!-- SQL美化选项面板 -->
          <div v-if="showBeautifyOptions" class="beautify-options-panel">
            <a-divider orientation="left">SQL美化选项</a-divider>
            <a-space direction="vertical" style="width: 100%">
              <div class="option-row">
                <span class="option-label">缩进空格数:</span>
                <a-slider
                  v-model:value="beautifyOptions.indentSpaces"
                  :min="1"
                  :max="8"
                  :marks="{ 1: '1', 2: '2', 4: '4', 8: '8' }"
                  style="width: 200px"
                />
                <span class="option-value">{{
                  beautifyOptions.indentSpaces
                }}</span>
              </div>

              <div class="option-row">
                <span class="option-label">格式化风格:</span>
                <a-radio-group v-model:value="beautifyOptions.formatStyle">
                  <a-radio value="compact">紧凑风格</a-radio>
                  <a-radio value="expanded">展开风格</a-radio>
                </a-radio-group>
              </div>

              <div class="option-row">
                <span class="option-label">关键字大小写:</span>
                <a-radio-group v-model:value="beautifyOptions.keywordCase">
                  <a-radio value="upper">大写</a-radio>
                  <a-radio value="preserve">保持原样</a-radio>
                </a-radio-group>
              </div>

              <div class="option-row">
                <span class="option-label">最大行长度:</span>
                <a-slider
                  v-model:value="beautifyOptions.maxLineLength"
                  :min="40"
                  :max="200"
                  :marks="{ 40: '40', 80: '80', 120: '120', 200: '200' }"
                  style="width: 200px"
                />
                <span class="option-value">{{
                  beautifyOptions.maxLineLength
                }}</span>
              </div>

              <div class="option-row">
                <span class="option-label">垂直对齐:</span>
                <a-switch
                  v-model:checked="beautifyOptions.alignValues"
                  checked-children="启用"
                  un-checked-children="禁用"
                  size="small"
                />
              </div>

              <div class="option-actions">
                <a-button @click="resetBeautifyOptions" size="small"
                  >重置默认</a-button
                >
                <a-button
                  @click="applyBeautifyOptions"
                  type="primary"
                  size="small"
                  >应用美化</a-button
                >
              </div>
            </a-space>
          </div>

          <SqlPreview
            :sql="displaySql"
            :stats="sqlStats"
            :beautify-options="beautifyOptions"
            @copy="handleSqlCopy"
            @download="handleSqlDownload"
          />

          <!-- 预览模式切换 -->
          <div v-if="previewSql" class="preview-mode-switch">
            <a-radio-group
              v-model:value="previewMode"
              button-style="solid"
              size="small"
            >
              <a-radio-button value="original">原始SQL</a-radio-button>
              <a-radio-button value="preview">预览修改</a-radio-button>
            </a-radio-group>
          </div>

          <!-- 批量修改面板 -->
          <BatchEditPanel
            v-if="generatedSql"
            :ddl-fields="parsedFields"
            :excel-data="excelData"
            :field-mappings="fieldMappings"
            :auto-preview="false"
            @preview="handleBatchPreview"
            @apply="handleBatchApply"
            @change="handleBatchChange"
            @update:excelData="handleExcelDataUpdate"
          />
        </div>

        <!-- 操作日志 -->
        <div class="output-card">
          <div class="card-header">
            <h3>操作日志</h3>
            <div class="log-actions">
              <a-button @click="clearLogs" size="small">清除日志</a-button>
              <a-button @click="exportLogs" size="small">导出日志</a-button>
            </div>
          </div>

          <div class="log-content">
            <a-timeline>
              <a-timeline-item
                v-for="log in operationLogs"
                :key="log.id"
                :color="getLogColor(log.level, log.context?.operationType)"
              >
                <template #dot>
                  <ClockCircleOutlined />
                </template>
                <p class="log-time">{{ formatTime(log.timestamp) }}</p>
                <p class="log-message">{{ formatLogMessage(log) }}</p>
              </a-timeline-item>
            </a-timeline>

            <a-empty
              v-if="operationLogs.length === 0"
              description="暂无操作日志"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- 错误提示 -->
    <a-modal
      v-model:open="errorModalVisible"
      title="错误信息"
      width="600px"
      :footer="null"
    >
      <a-alert
        v-for="error in currentErrors"
        :key="error.id"
        :message="error.message"
        :description="error.context"
        type="error"
        show-icon
        closable
        style="margin-bottom: 8px"
      />
    </a-modal>

    <!-- 自定义绑定模态框 -->
    <CustomBindingModal
      v-model:open="showCustomBindingModal"
      :ddl-fields="parsedFields"
      :excel-headers="excelHeaders"
      :custom-binding-manager="customBindingManager"
      :editing-field="editingCustomField"
      :field-mappings="fieldMappings"
      @save="handleCustomBindingSave"
      @cancel="handleCustomBindingCancel"
    />

    <!-- 悬浮按钮组 -->
    <a-float-button-group trigger="click" type="primary" shape="circle">
      <template #icon><SettingOutlined /></template>
      <a-float-button @click="scrollToTop">
        <template #icon><VerticalAlignTopOutlined /></template>
        <template #tooltip>回到顶部</template>
      </a-float-button>
      <a-float-button @click="handleToggleTheme">
        <template #icon>
          <BulbOutlined v-if="!isDark" />
          <BulbFilled v-else />
        </template>
        <template #tooltip>{{
          isDark ? "切换亮色模式" : "切换暗色模式"
        }}</template>
      </a-float-button>
    </a-float-button-group>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, h } from "vue";
import { message, Modal } from "ant-design-vue";
import { storeToRefs } from "pinia";
import {
  ReloadOutlined,
  PlayCircleOutlined,
  QuestionCircleOutlined,
  SettingOutlined,
  ClockCircleOutlined,
  VerticalAlignTopOutlined,
  BulbOutlined,
  BulbFilled,
} from "@ant-design/icons-vue";
import { useThemeStore } from "@/stores/theme.js";
import { useSettings } from "@/composables/core/useSettings.js";

const themeStore = useThemeStore();
const { isDark } = storeToRefs(themeStore);
const { getSetting } = useSettings();

const scrollToTop = () => {
  window.scrollTo({ top: 0, behavior: "smooth" });
};

const handleToggleTheme = () => {
  themeStore.toggle();
};

// 导入核心功能模块
import { useDdlParser } from "@/composables/sql/useDdlParser";
import { useExcelParserEnhanced } from "@/composables/excel/useExcelParserEnhanced";
import { useFieldMatcher } from "@/composables/data/useFieldMatcher";
import { useSqlGeneratorEnhanced } from "@/composables/sql/useSqlGeneratorEnhanced";
import { useErrorHandler } from "@/composables/core/useErrorHandler";
import { useDeduplication } from "@/composables/data/useDeduplication";
import { useRowRange } from "@/composables/data/useRowRange";
import { useBeautifyOptions } from "@/composables/data/useBeautifyOptions";
import { useOperationLog } from "@/composables/core/useOperationLog";
import { useCellSplit } from "@/composables/excel/useCellSplit";

// 导入组件
import SqlPreview from "@/components/SqlPreview/SqlPreview.vue";
import CustomBindingModal from "@/components/CustomBindingModal.vue";
import BatchEditPanel from "@/components/BatchEditPanel/BatchEditPanel.vue";
import { ExcelUploadCard } from "@/components/ExcelUploadCard";
import { FieldMappingCard } from "@/components/FieldMappingCard";

// 初始化核心功能模块
const { parseDdl: parseDdlWithParser, clearCache } = useDdlParser();
const { parseExcel: parseExcelEnhanced, getHeaders } = useExcelParserEnhanced();
const {
  fieldMappings,
  enhancedMatchFields,
  updateFieldMapping,
  validateEnhancedMappings,
  validateAllFieldsMapped,
  matchingStats,
  customBindingManager,
  resetMappings,
} = useFieldMatcher();
const {
  generateInsertSql,
  setBeautifyOptions,
  resetBeautifyOptions: resetDefaultBeautifyOptions,
} = useSqlGeneratorEnhanced();
const { logError } = useErrorHandler();

const {
  deduplicationEnabled,
  deduplicationColumn,
  deduplicationStats,
  originalExcelData,
  handleDeduplicationToggle: handleDeduplicationToggleBase,
  applyDeduplication: applyDeduplicationBase,
  setOriginalData,
  clearDeduplication,
} = useDeduplication();

const {
  rowRangeEnabled,
  startRow,
  endRow,
  includeHeader,
  totalExcelRows,
  resetRowRange: resetRowRangeState,
} = useRowRange();

const {
  showBeautifyOptions,
  beautifyOptions,
  toggleBeautifyOptions: toggleBeautifyOptionsBase,
  resetBeautifyOptions: resetBeautifyOptionsBase,
} = useBeautifyOptions();

const {
  operationLogs,
  logInfo,
  getLogColor,
  formatTime,
  formatLogMessage,
  clearLogs,
  exportLogs,
} = useOperationLog();

const {
  cellSplitEnabled,
  cellSplitSeparator,
  customSeparator,
  cellSplitStats,
  handleCellSplitToggle: handleCellSplitToggleBase,
  handleCellSplitSeparatorChange,
  clearCellSplit,
} = useCellSplit();

/**
 * 增强匹配统计，使用DDL原始字段列表数据
 * 统计DDL原始字段列表中来自字段拼接规则的字段数量
 */
const enhancedMatchingStats = computed(() => {
  return {
    matchRate: matchingStats.value.matchRate || 0,
    matched: matchingStats.value.matched || 0,
    unmatched: matchingStats.value.unmatched || 0,
    total: matchingStats.value.total || 0,
    confidenceStats: matchingStats.value.confidenceStats || {},
    customBindings: customBindingManager.customBindingCount.value || 0,
    concatenationRules: customBindingManager.concatenationRuleCount.value || 0,
    customFields: parsedFields.value.filter((field) => {
      return (
        field.isCustom &&
        field.customConfig?.dataSource === "excel_combine" &&
        field.customConfig?.isFromConcatenationRule
      );
    }).length,
  };
});

/**
 * 过滤后的字段映射，使用DDL原始字段列表数据
 * 只保留DDL原始字段列表中存在的字段映射，排除来自字段拼接规则的excel_combine类型字段
 * 字段拼接规则创建的字段不出现在DDL原始字段列表中
 */
const filteredFieldMappings = computed(() => {
  return fieldMappings.value.filter((mapping) => {
    // 检查DDL字段是否存在于parsedFields中
    const ddlFieldExists = parsedFields.value.some(
      (field) => field.name === mapping.ddlField?.name,
    );

    // 如果字段不在parsedFields中，但标记为自定义字段，则保留
    if (!ddlFieldExists) {
      if (mapping.ddlField?.isCustom) {
        return true;
      }
      return false;
    }

    // 如果是自定义字段且数据源类型为excel_combine，并且来自字段拼接规则，则过滤掉
    if (
      mapping.ddlField?.isCustom &&
      mapping.ddlField?.customConfig?.dataSource === "excel_combine" &&
      mapping.ddlField?.customConfig?.isFromConcatenationRule
    ) {
      return false;
    }
    return true;
  });
});

// 自定义绑定相关
const showCustomBindingModal = ref(false);
const editingCustomField = ref(null);
const customBindingEnabled = ref(false);
const hasCustomBindingConfig = computed(() => {
  const stats = customBindingManager.getBindingStats();
  return stats.hasCustomConfig;
});

const customFieldsData = computed(() => {
  const fields = Array.isArray(customBindingManager.customFields.value)
    ? customBindingManager.customFields.value
    : [];

  const bindings = Array.isArray(customBindingManager.customBindings.value)
    ? customBindingManager.customBindings.value
    : [];

  const rules = Array.isArray(
    customBindingManager.fieldConcatenationRules.value,
  )
    ? customBindingManager.fieldConcatenationRules.value
    : [];

  const allFields = [...fields];

  bindings.forEach((binding) => {
    if (binding.bindingType === "single") {
      allFields.push({
        id: `binding-${binding.ddlFieldName}`,
        fieldName: binding.ddlFieldName,
        dataType: "string",
        dataSource: "single_binding",
        config: {
          excelIndex: binding.excelIndex,
        },
        isSingleBinding: true,
      });
    }
  });

  rules.forEach((rule) => {
    allFields.push({
      id: `rule-${rule.ddlFieldName}`,
      fieldName: rule.ddlFieldName,
      dataType: rule.dataType || "string",
      dataSource: "excel_combine",
      excelCombineConfig: {
        columns: rule.sourceColumns || [],
        separator: rule.separator || "",
        format: rule.format || "",
      },
      isConcatenationRule: true,
    });
  });

  return allFields;
});

const customFieldManagerKey = computed(() => {
  const fields = customFieldsData.value;
  const fieldCount = fields.length;
  const fieldNames = fields
    .map((f) => f.fieldName)
    .sort()
    .join(",");
  return `custom-field-manager-${fieldCount}-${fieldNames}`;
});

const ddlStatement = ref("");
const parsedFields = ref([]);
const fileList = ref([]);
const uploadedFile = ref(null);
const excelData = ref([]);
const excelHeaders = ref([]);
const generatedSql = ref("");
const previewSql = ref("");
const previewMode = ref("original");
const batchEditRules = ref([]);
const includeComments = ref(true);
const databaseType = ref("mysql");

const parsingDdl = ref(false);
const uploading = ref(false);
const generating = ref(false);
const errorModalVisible = ref(false);
const currentErrors = ref([]);

// 计算属性
const showFieldMapping = computed(() => {
  return parsedFields.value.length > 0 && excelHeaders.value.length > 0;
});

const sqlStats = computed(() => {
  const sqlToCheck =
    previewMode.value === "preview" && previewSql.value
      ? previewSql.value
      : generatedSql.value;

  if (!sqlToCheck) {
    return { statementCount: 0, affectedRows: 0, generationTime: 0 };
  }

  const statements = sqlToCheck.split(";").filter((s) => s.trim());
  const affectedRows = excelData.value.length;

  return {
    statementCount: statements.length,
    affectedRows,
    generationTime: 0, // 实际应该从生成过程中获取
  };
});

// 计算属性：显示的SQL（根据预览模式）
const displaySql = computed(() => {
  return previewMode.value === "preview" && previewSql.value
    ? previewSql.value
    : generatedSql.value;
});

const mappingColumns = [
  {
    title: "字段名",
    key: "fieldName",
    width: "15%",
  },
  {
    title: "DDL字段",
    key: "ddlField",
    width: "30%",
  },
  {
    title: "Excel列",
    key: "excelHeader",
    width: "20%",
  },
  {
    title: "相似度",
    key: "similarity",
    width: "10%",
  },
  {
    title: "自定义",
    key: "generatedByFunction",
    width: "10%",
  },
  {
    title: "操作",
    key: "actions",
    width: "15%",
  },
];

// 方法
const handleDdlChange = () => {
  parsedFields.value = [];
  logInfo("DDL语句已修改");
};

const parseDdl = async (forceRefresh = false) => {
  if (!ddlStatement.value.trim()) {
    message.warning("请输入DDL语句");
    return;
  }

  // 解析新DDL时清空之前的自定义字段数据
  customBindingEnabled.value = false;
  customBindingManager.resetBindings();
  resetMappings();
  logInfo("解析新DDL，已清空之前的自定义字段数据");

  parsingDdl.value = true;

  try {
    const result = await parseDdlWithParser(ddlStatement.value, forceRefresh);
    parsedFields.value = result.fields.map((field) => ({
      ...field,
      excelIndex: -1,
    }));

    logInfo(`成功解析DDL语句，发现 ${result.fields.length} 个字段`);
    message.success(`DDL解析成功，发现 ${result.fields.length} 个字段`);

    // 立即创建映射记录，确保所有DDL字段都显示
    if (excelHeaders.value.length > 0) {
      // 如果已有Excel数据，执行自动匹配
      autoMatchFields();
    } else {
      // 如果没有Excel数据，创建手动映射模板
      enhancedMatchFields(parsedFields.value, [], "manual");
    }
  } catch (error) {
    const friendlyError = logError(error, "parsing", {
      operation: "parseDdl",
      ddlLength: ddlStatement.value.length,
    });
    message.error(friendlyError);
  } finally {
    parsingDdl.value = false;
  }
};

const handleUpload = async (options) => {
  const { file, onSuccess, onError } = options;

  // 上传新文件时清空之前的自定义字段数据
  customBindingEnabled.value = false;
  customBindingManager.resetBindings();
  resetMappings();
  logInfo("上传新文件，已清空之前的自定义字段数据");

  const maxFileSizeMB = getSetting("maxFileSize") || 10;
  const maxFileSizeBytes = maxFileSizeMB * 1024 * 1024;
  if (file.size > maxFileSizeBytes) {
    const errorMsg = `文件大小超出限制：${(file.size / 1024 / 1024).toFixed(2)}MB > ${maxFileSizeMB}MB`;
    message.error(errorMsg);
    onError(errorMsg);
    return;
  }

  const supportedFormats = getSetting("supportedFormats") || [
    "xlsx",
    "xls",
    "csv",
  ];
  const fileExt = file.name.split(".").pop().toLowerCase();
  if (!supportedFormats.includes(fileExt)) {
    const errorMsg = `不支持的文件格式：.${fileExt}，支持的格式：${supportedFormats.map((f) => `.${f}`).join(", ")}`;
    message.error(errorMsg);
    onError(errorMsg);
    return;
  }

  uploading.value = true;

  try {
    uploadedFile.value = file;

    const chunkSize = getSetting("chunkSize") || 1000;
    const chunkProcessing = getSetting("chunkProcessing") !== false;

    const initialResult = await parseExcelEnhanced(file, {
      sheetIndex: 0,
      maxRows: 10000,
      chunkSize: chunkProcessing ? chunkSize : 10000,
    });

    totalExcelRows.value = initialResult.totalRows;

    const parseOptions = {
      sheetIndex: 0,
      maxRows: 10000,
      chunkSize: chunkProcessing ? chunkSize : 10000,
    };

    if (rowRangeEnabled.value && startRow.value && endRow.value) {
      parseOptions.startRow = startRow.value;
      parseOptions.endRow = endRow.value;
      parseOptions.includeHeader = includeHeader.value;
    }

    const result = await parseExcelEnhanced(file, parseOptions);

    excelData.value = result.rows;
    excelHeaders.value = result.headers;
    setOriginalData(result.rows);

    onSuccess("文件上传成功");
    logInfo(`成功解析Excel文件，共 ${result.rows?.length || 0} 行数据`);
    message.success("文件解析成功");

    if (parsedFields.value.length > 0) {
      autoMatchFields();
    }
  } catch (error) {
    const friendlyError = logError(error, "file", {
      operation: "parseExcel",
      fileName: file.name,
      fileSize: file.size,
    });
    onError(friendlyError);
    message.error(friendlyError);
  } finally {
    uploading.value = false;
  }
};

/**
 * 清除上传的文件及相关数据
 * 重置Excel数据、表头、去重设置、字段映射等所有文件相关状态
 */
const clearFile = () => {
  uploadedFile.value = null;
  excelData.value = [];
  excelHeaders.value = [];
  originalExcelData.value = [];
  fileList.value = [];

  clearDeduplication();
  resetRowRangeState();
  clearCellSplit();

  resetMappings();

  customBindingEnabled.value = false;
  customBindingManager.resetBindings();

  generatedSql.value = "";

  logInfo("已清除上传的文件及相关数据", "file", {
    operation: "clearFile",
    resetDeduplication: true,
    resetRowRange: true,
    resetFieldMappings: true,
    resetCustomBindings: true,
    resetGeneratedSql: true,
    resetCellSplit: true,
  });
  message.info("文件及相关数据已清除");
};

/**
 * 重新解析当前已上传的文件
 * 优先使用已保存的原始数据，避免重新读取文件
 */
const handleReparse = async () => {
  // 重新解析时清空自定义字段数据
  customBindingEnabled.value = false;
  customBindingManager.resetBindings();
  resetMappings();
  logInfo("重新解析，已清空自定义字段数据");

  if (originalExcelData.value && originalExcelData.value.length > 0) {
    excelData.value = [...originalExcelData.value];
    if (excelHeaders.value && excelHeaders.value.length > 0) {
      message.success(`数据重新加载成功，共 ${excelData.value.length} 行数据`);
    }

    if (parsedFields.value.length > 0) {
      autoMatchFields();
    }

    logInfo("数据重新加载完成", "file", {
      operation: "reparse",
      rows: excelData.value.length,
      columns: excelHeaders.value?.length || 0,
    });
    return;
  }

  if (!uploadedFile.value) {
    message.warning("没有可重新解析的数据");
    return;
  }

  uploading.value = true;

  try {
    const chunkSize = getSetting("chunkSize") || 1000;
    const chunkProcessing = getSetting("chunkProcessing") !== false;

    const initialResult = await parseExcelEnhanced(uploadedFile.value, {
      sheetIndex: 0,
      maxRows: chunkProcessing ? chunkSize : undefined,
      startRow: 1,
      endRow: undefined,
      includeHeader: true,
    });

    excelData.value = initialResult.data;
    excelHeaders.value = initialResult.headers;
    originalExcelData.value = initialResult.data;

    if (initialResult.totalRows > chunkSize) {
      message.info(
        `已加载前 ${chunkSize} 行数据，共 ${initialResult.totalRows} 行`,
      );
    } else {
      message.success(`文件重新解析成功，共 ${initialResult.totalRows} 行数据`);
    }

    if (parsedFields.value.length > 0) {
      autoMatchFields();
    }

    logInfo("文件重新解析完成", "file", {
      operation: "reparse",
      fileName: uploadedFile.value.name,
      rows: initialResult.totalRows,
      columns: initialResult.headers.length,
    });
  } catch (error) {
    const friendlyError = logError(error, "file", {
      operation: "reparse",
      fileName: uploadedFile.value?.name,
    });
    message.error(friendlyError);
  } finally {
    uploading.value = false;
  }
};

const handleDeduplicationToggle = (checked) => {
  if (!checked && originalExcelData.value.length > 0) {
    excelData.value = [...originalExcelData.value];
    totalExcelRows.value = excelData.value.length;
  }
  handleDeduplicationToggleBase(checked, excelData.value, logInfo);
  if (checked) {
    totalExcelRows.value = excelData.value.length;
  }
};

const handleDeduplicationChange = (column) => {
  deduplicationColumn.value = column;
  if (column !== undefined) {
    applyDeduplication();
  }
};

const handleCellSplitToggle = (enabled) => {
  handleCellSplitToggleBase(enabled);
};

const handleCellSplitApply = () => {
  message.info("单元格拆分功能开发中");
};

const handleDatabaseTypeChange = (type) => {
  databaseType.value = type;
  logInfo(`数据库类型已切换为: ${type}`, "database", {
    operation: "changeDatabaseType",
    databaseType: type,
  });
};

const applyDeduplication = () => {
  applyDeduplicationBase(excelData.value, excelHeaders.value, logInfo);
  totalExcelRows.value = excelData.value.length;
};

const handleStartRowUpdate = (val) => {
  startRow.value = val;
};

const handleEndRowUpdate = (val) => {
  endRow.value = val;
};

const handleRowRangeToggle = (checked) => {
  rowRangeEnabled.value = checked;

  if (!checked) {
    if (originalExcelData.value.length > 0) {
      const previousRowCount = excelData.value.length;
      excelData.value = [...originalExcelData.value];
      const restoredRowCount = excelData.value.length;

      logInfo(
        `行范围选择已关闭，已恢复原始数据（${previousRowCount} 行 → ${restoredRowCount} 行）`,
        "row-range",
        {
          operation: "resetRowRange",
          previousRowCount,
          restoredRowCount,
          restored: true,
        },
      );
      message.success(
        `行范围选择已关闭，已恢复原始数据（${restoredRowCount} 行）`,
      );
    } else {
      logInfo("行范围选择已关闭（无原始数据可恢复）", "row-range", {
        operation: "resetRowRange",
        restored: false,
      });
      message.info("行范围选择已关闭");
    }

    startRow.value = null;
    endRow.value = null;
    includeHeader.value = true;
  } else {
    logInfo("已启用行范围选择，请设置起始行和结束行", "row-range", {
      operation: "enableRowRange",
    });
    message.info("已启用行范围选择，请设置起始行和结束行");
  }
};

/**
 * 应用行范围
 * 根据用户设置的行范围重新解析Excel文件
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
    let headers = [];
    let rows = [];

    if (includeHeader.value) {
      if (excelHeaders.value && excelHeaders.value.length > 0) {
        headers = excelHeaders.value;
      } else if (excelData.value && excelData.value.length > 0) {
        const firstRow = excelData.value[0];
        headers = Object.keys(firstRow);
      } else {
        headers = await getHeaders(uploadedFile.value, {
          sheetIndex: 0,
        });
      }

      if (
        startRow.value &&
        endRow.value &&
        excelData.value &&
        excelData.value.length > 0
      ) {
        const startIndex = startRow.value - 1;
        const endIndex = endRow.value - 1;
        rows = excelData.value.slice(startIndex, endIndex + 1);
      } else {
        rows = excelData.value || [];
      }
    } else {
      const result = await parseExcelEnhanced(uploadedFile.value, {
        sheetIndex: 0,
        maxRows: 10000,
        startRow: startRow.value,
        endRow: endRow.value,
        includeHeader: false,
      });
      headers = result.headers;
      rows = result.rows;
    }

    excelData.value = rows;
    excelHeaders.value = headers;
    totalExcelRows.value = rows.length;

    const selectedRowCount = rows.length;
    logInfo(
      `行范围应用成功: ${startRow.value}-${endRow.value}，共 ${rows.length} 行数据`,
      "row-range",
      {
        operation: "applyRowRange",
        startRow: startRow.value,
        endRow: endRow.value,
        includeHeader: includeHeader.value,
        selectedRowCount,
        actualRowCount: rows.length,
      },
    );
    message.success(`行范围应用成功，共 ${rows.length} 行数据`);

    // 注意：行范围变化只影响数据行，不影响表头和字段映射
    // 因此不需要重新执行字段匹配，保留用户已配置的映射关系
  } catch (error) {
    let errorMessage = error.message || "未知错误";
    let userFriendlyMessage = errorMessage;

    if (errorMessage.includes("无法识别表头信息")) {
      userFriendlyMessage =
        "Excel文件所有行都没有有效的表头数据，请检查文件内容或选择包含表头的行范围";
    } else if (errorMessage.includes("获取表头超时")) {
      userFriendlyMessage = "读取Excel表头超时，请检查文件是否过大或损坏";
    } else if (
      errorMessage.includes("工作表") &&
      errorMessage.includes("为空")
    ) {
      userFriendlyMessage = "所选工作表为空，请选择其他工作表";
    } else if (errorMessage.includes("没有找到有效的工作表")) {
      userFriendlyMessage = "Excel文件中没有有效的工作表，请检查文件格式";
    } else if (errorMessage.includes("获取表头失败")) {
      userFriendlyMessage = "无法读取Excel表头，请检查文件格式和内容";
    }
    message.error(userFriendlyMessage);
  } finally {
    uploading.value = false;
  }
};

const resetRowRange = async () => {
  if (!uploadedFile.value) {
    message.warning("请先上传Excel文件");
    return;
  }

  uploading.value = true;

  try {
    const result = await parseExcelEnhanced(uploadedFile.value, {
      sheetIndex: 0,
      maxRows: 10000,
    });

    excelData.value = result.rows;
    excelHeaders.value = result.headers;
    originalExcelData.value = [...result.rows];

    startRow.value = null;
    endRow.value = null;

    logInfo(`行范围已重置，共 ${result.rows.length} 行数据`, "row-range", {
      operation: "resetRowRange",
      totalRowCount: result.rows.length,
    });
    message.success(`行范围已重置，共 ${result.rows.length} 行数据`);
  } catch (error) {
    const friendlyError = logError(error, "row-range", {
      operation: "resetRowRange",
      errorMessage: error.message,
    });
    message.error(friendlyError);
  } finally {
    uploading.value = false;
  }
};

const autoMatchFields = () => {
  if (parsedFields.value.length === 0 || excelHeaders.value.length === 0) {
    message.warning("请先解析DDL语句和上传Excel文件");
    return;
  }

  try {
    enhancedMatchFields(parsedFields.value, excelHeaders.value, "similarity");

    // 同步更新parsedFields中的excelIndex
    fieldMappings.value.forEach((mapping) => {
      const field = parsedFields.value.find(
        (f) => f.name === mapping.ddlField.name,
      );
      if (field) {
        field.excelIndex = mapping.excelIndex;
      }
    });

    logInfo("自动字段匹配完成");
    message.success("字段自动匹配完成");
  } catch (error) {
    console.error("自动字段匹配失败:", error);
    const friendlyError = logError(error, "matching", {
      operation: "autoMatchFields",
      ddlFieldsCount: parsedFields.value.length,
      excelHeadersCount: excelHeaders.value.length,
    });
    message.error(friendlyError);
  }
};

const updateMapping = (ddlFieldName, excelIndex) => {
  const excelHeader = excelIndex >= 0 ? excelHeaders.value[excelIndex] : null;
  updateFieldMapping(ddlFieldName, excelHeader, excelIndex);
  logInfo(`手动更新字段映射: ${ddlFieldName} -> ${excelHeader || "未匹配"}`);
};

const handleGeneratedByFunctionChange = (record) => {
  const mapping = fieldMappings.value.find(
    (m) => m.ddlField.name === record.ddlField.name,
  );
  if (mapping) {
    mapping.generatedByFunction = record.generatedByFunction;
    if (record.generatedByFunction) {
      logInfo(
        `字段 ${record.ddlField.name} 标记为自定义，将跳过Excel列映射检查`,
      );
    } else {
      logInfo(`字段 ${record.ddlField.name} 取消自定义标记`);
    }
  }
};

const clearMapping = (ddlFieldName) => {
  const fieldInfo = parsedFields.value.find(
    (field) => field.name === ddlFieldName,
  );

  const mappingIndex = fieldMappings.value.findIndex(
    (mapping) => mapping.ddlField.name === ddlFieldName,
  );

  if (fieldInfo && fieldInfo.isCustom) {
    // 自定义字段：删除整个映射记录和字段定义
    if (mappingIndex >= 0) {
      fieldMappings.value.splice(mappingIndex, 1);
    }
    const fieldIndex = parsedFields.value.findIndex(
      (field) => field.name === ddlFieldName,
    );
    if (fieldIndex >= 0) {
      parsedFields.value.splice(fieldIndex, 1);
    }

    customBindingManager.removeCustomField(ddlFieldName);

    logInfo(`移除自定义字段: ${ddlFieldName}`);
    message.info(`已移除自定义字段: ${ddlFieldName}`);
  } else {
    // 普通DDL字段：删除映射记录
    if (mappingIndex >= 0) {
      fieldMappings.value.splice(mappingIndex, 1);
      logInfo(`清除字段映射: ${ddlFieldName}`);
      message.info(`已清除字段映射: ${ddlFieldName}`);
    }
  }
};

const clearAllMappings = () => {
  // 移除所有自定义字段
  const originalLength = parsedFields.value.length;
  parsedFields.value = parsedFields.value.filter((field) => !field.isCustom);
  const customFieldsRemoved = originalLength - parsedFields.value.length;

  // 清除剩余普通字段的映射关系
  parsedFields.value.forEach((field) => {
    updateFieldMapping(field.name, null, -1);
  });

  if (customFieldsRemoved > 0) {
    logInfo(`已移除 ${customFieldsRemoved} 个自定义字段`);
    logInfo("已清除所有普通字段映射");
    message.info(
      `已移除 ${customFieldsRemoved} 个自定义字段并清除所有普通字段映射`,
    );
  } else {
    logInfo("清除所有字段映射");
    message.info("已清除所有字段映射");
  }
};

const handleClearCache = () => {
  clearCache();
  logInfo("DDL解析缓存已清除");
  message.success("缓存已清除，下次解析将重新计算");
};

const toggleBeautifyOptions = () => {
  toggleBeautifyOptionsBase(logInfo);
};

const applyBeautifyOptions = async () => {
  try {
    setBeautifyOptions(beautifyOptions.value);

    if (generatedSql.value) {
      const tableName = extractTableName(ddlStatement.value);
      const sql = generateInsertSql(
        tableName,
        fieldMappings.value,
        excelData.value,
        {
          dbType: databaseType.value,
          format: "formatted",
          batch: 100,
          comments: includeComments.value,
          beautifyOptions: beautifyOptions.value,
          customBindingManager: customBindingManager,
        },
      );
      generatedSql.value = sql;
    }

    logInfo("SQL美化选项已应用", "beautify", {
      operation: "applyBeautifyOptions",
      operationType: "beautify",
      options: beautifyOptions.value,
    });
    message.success("美化选项已应用");
  } catch (error) {
    const friendlyError = logError(error, "beautify", {
      operation: "applyBeautifyOptions",
      operationType: "beautify",
      options: beautifyOptions.value,
    });
    message.error(friendlyError);
  }
};

const resetBeautifyOptions = () => {
  resetBeautifyOptionsBase(logInfo, resetDefaultBeautifyOptions);
};

const handleSqlCopy = () => {
  const beautifyStatus = showBeautifyOptions.value ? "应用美化" : "未美化";
  logInfo(`INSERT SQL语句已复制到剪贴板（${beautifyStatus}）`, "copy", {
    beautifyOptions: beautifyOptions.value,
    includeComments: includeComments.value,
  });
};

const handleSqlDownload = () => {
  const beautifyStatus = showBeautifyOptions.value ? "应用美化" : "未美化";
  logInfo(`INSERT SQL语句已下载（${beautifyStatus}）`, "download", {
    beautifyOptions: beautifyOptions.value,
    includeComments: includeComments.value,
  });
};

const generateSql = async () => {
  if (!parsedFields.value || parsedFields.value.length === 0) {
    message.warning("请先解析DDL语句");
    return;
  }

  if (!excelData.value || excelData.value.length === 0) {
    message.warning("请先上传Excel文件");
    return;
  }

  // 验证映射配置
  const validation = validateEnhancedMappings();
  if (!validation.isValid) {
    Modal.error({
      title: "字段映射配置不完整",
      content: h("div", [
        h("p", "以下字段存在问题，请修复后再生成SQL："),
        h("ul", { style: { paddingLeft: "20px", marginTop: "10px" } }, [
          ...validation.errors.map((error) =>
            h(
              "li",
              { style: { marginBottom: "5px", color: "#ff4d4f" } },
              error,
            ),
          ),
        ]),
        h("p", { style: { marginTop: "15px", color: "#8c8c8c" } }, [
          '提示：对于自定义字段（如UUID主键），请在字段映射表格中勾选"自定义"复选框',
        ]),
      ]),
      okText: "我知道了",
    });
    return;
  }

  // 验证所有DDL字段是否都有映射记录
  const allFieldsValidation = validateAllFieldsMapped(parsedFields.value);
  if (!allFieldsValidation.isValid) {
    Modal.error({
      title: "字段映射不完整",
      content: h("div", [
        h("p", "以下必填字段未获取到数据："),
        h("ul", { style: { paddingLeft: "20px", marginTop: "10px" } }, [
          ...allFieldsValidation.errors.map((error) =>
            h(
              "li",
              { style: { marginBottom: "5px", color: "#ff4d4f" } },
              error,
            ),
          ),
        ]),
      ]),
      okText: "我知道了",
    });
    return;
  }

  generating.value = true;

  try {
    const tableName = extractTableName(ddlStatement.value);

    const mappingsToUse = fieldMappings.value;
    const customFieldsConfig = customBindingManager.customFields.value;
    const enableCustomBinding = customBindingEnabled.value;

    // 生成SQL
    const sql = generateInsertSql(tableName, mappingsToUse, excelData.value, {
      dbType: databaseType.value,
      format: "formatted",
      batch: 100,
      comments: includeComments.value,
      beautifyOptions: beautifyOptions.value,
      customBindingManager: customBindingManager,
    });

    generatedSql.value = sql;

    const beautifyStatus = showBeautifyOptions.value ? "应用美化" : "未美化";
    const bindingMode = enableCustomBinding ? "自定义绑定模式" : "标准模式";

    logInfo(
      `SQL生成成功（${bindingMode}，${includeComments.value ? "包含注释" : "纯SQL"}，${beautifyStatus}）`,
      "generation",
      {
        mode: enableCustomBinding ? "custom" : "standard",
        beautifyOptions: beautifyOptions.value,
        includeComments: includeComments.value,
        customFieldsCount: customFieldsConfig.length,
      },
    );
    message.success("SQL生成成功");
  } catch (error) {
    const friendlyError = logError(error, "generation", {
      operation: "generateInsertSql",
      tableName: extractTableName(ddlStatement.value),
      dataRows: excelData.value ? excelData.value.length : 0,
    });
    message.error(friendlyError);
  } finally {
    generating.value = false;
  }
};

const extractTableName = (ddl) => {
  // 支持多种DDL语句格式
  const patterns = [
    /CREATE TABLE\s+(?:IF NOT EXISTS\s+)?`?([^`\s(]+)`?/i,
    /CREATE TABLE\s+(?:IF NOT EXISTS\s+)?"?([^"\s(]+)"?/i,
    /CREATE TABLE\s+(?:IF NOT EXISTS\s+)?\[?([^\]\s(]+)\]?/i,
  ];

  for (const pattern of patterns) {
    const match = ddl.match(pattern);
    if (match) {
      // 移除可能的schema前缀（如public.）
      const tableName = match[1].replace(/^[^.]+\./, "");
      return tableName;
    }
  }

  return "unknown_table";
};

const openCustomBindingModal = () => {
  showCustomBindingModal.value = true;
};

const handleCustomBindingToggle = (checked) => {
  customBindingEnabled.value = checked;
  customBindingManager.setEnableCustomBinding(checked);
  logInfo(`自定义绑定已${checked ? "启用" : "禁用"}`);
  message.success(`自定义绑定已${checked ? "启用" : "禁用"}`);
};

const handleCustomBindingSave = (savedConfig) => {
  logInfo("自定义绑定配置已保存", savedConfig);

  try {
    if (!customBindingEnabled.value) {
      customBindingEnabled.value = true;
      customBindingManager.setEnableCustomBinding(true);
      logInfo("已自动启用自定义绑定");
    }

    // 注意：savedConfig 的结构是 { singleBindings, concatenationRules, customFields }
    // 而不是 { customBindings, fieldConcatenationRules, customFields }
    // 所以不需要调用 importBindings，因为 CustomBindingModal 已经更新了 customBindingManager

    const customBindings = Array.isArray(
      customBindingManager.customBindings.value,
    )
      ? customBindingManager.customBindings.value
      : [];

    const singleBindings = customBindings.filter(
      (binding) => binding.bindingType === "single",
    );

    singleBindings.forEach((binding) => {
      const { ddlFieldName, excelIndex } = binding;

      let ddlField = parsedFields.value.find(
        (field) => field.name === ddlFieldName,
      );

      if (!ddlField) {
        ddlField = {
          name: ddlFieldName,
          type: "string",
          nullable: true,
          isIdentity: false,
          primaryKey: false,
          isCustom: true,
          customConfig: {
            fieldName: ddlFieldName,
            isFromCustomBinding: true,
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        parsedFields.value.push(ddlField);
      }

      const existingIndex = fieldMappings.value.findIndex(
        (m) => m.ddlField?.name === ddlFieldName,
      );

      if (existingIndex >= 0) {
        const existingMapping = fieldMappings.value[existingIndex];
        const updatedDdlField =
          parsedFields.value.find((f) => f.name === ddlFieldName) ||
          existingMapping.ddlField;

        fieldMappings.value[existingIndex] = {
          ...existingMapping,
          ddlField: updatedDdlField,
          excelIndex: excelIndex,
          excelHeader: excelIndex >= 0 ? excelHeaders.value[excelIndex] : null,
          status: excelIndex >= 0 ? "bound" : "unmatched",
        };
      } else {
        const mapping = {
          ddlField: ddlField,
          excelHeader: excelIndex >= 0 ? excelHeaders.value[excelIndex] : null,
          excelIndex: excelIndex,
          similarity: 0,
          confidence: "manual",
          status: excelIndex >= 0 ? "bound" : "unmatched",
        };
        fieldMappings.value.push(mapping);
      }
    });

    const fieldConcatenationRules = Array.isArray(
      customBindingManager.fieldConcatenationRules.value,
    )
      ? customBindingManager.fieldConcatenationRules.value
      : [];

    fieldConcatenationRules.forEach((rule) => {
      if (rule.ddlFieldName && rule.ddlFieldName.trim() !== "") {
        // 注意：拼接规则已经存储在 fieldConcatenationRules 中
        // 不需要再调用 addCustomField，否则会在 customFieldsData 中重复显示

        const customConfig = {
          fieldName: rule.ddlFieldName,
          dataType: rule.dataType || "string",
          dataSource: "excel_combine",
          excelCombineConfig: {
            columns: rule.sourceColumns || [],
            separator: rule.separator || "",
            format: rule.format || "",
            isFromConcatenationRule: true,
          },
        };

        let ddlField = parsedFields.value.find(
          (field) => field.name === rule.ddlFieldName,
        );

        if (!ddlField) {
          ddlField = {
            name: rule.ddlFieldName,
            type: rule.dataType || "string",
            nullable: true,
            isIdentity: false,
            primaryKey: false,
            isCustom: true,
            customConfig: customConfig,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          parsedFields.value.push(ddlField);
        } else {
          const existingFieldIndex = parsedFields.value.findIndex(
            (field) => field.name === rule.ddlFieldName,
          );
          if (existingFieldIndex >= 0) {
            parsedFields.value[existingFieldIndex] = {
              ...parsedFields.value[existingFieldIndex],
              isCustom: true,
              customConfig: customConfig,
              type:
                rule.dataType || parsedFields.value[existingFieldIndex].type,
              updatedAt: new Date().toISOString(),
            };
          }
        }

        const existingMappingIndex = fieldMappings.value.findIndex(
          (m) => m.ddlField?.name === rule.ddlFieldName,
        );

        if (existingMappingIndex >= 0) {
          const existingMapping = fieldMappings.value[existingMappingIndex];
          const updatedDdlField =
            parsedFields.value.find((f) => f.name === rule.ddlFieldName) ||
            existingMapping.ddlField;

          fieldMappings.value[existingMappingIndex] = {
            ...existingMapping,
            ddlField: updatedDdlField,
            excelIndex: -1,
            excelHeader: null,
            status: "unmatched",
            confidence: "manual",
            generatedByFunction: true,
          };
        } else {
          const mapping = {
            ddlField: ddlField,
            excelHeader: null,
            excelIndex: -1,
            similarity: 0,
            confidence: "manual",
            status: "unmatched",
            generatedByFunction: true,
          };
          fieldMappings.value.push(mapping);
        }
      }
    });

    let customFields = [];

    // 优先使用 customBindingManager 中的数据，因为 CustomBindingModal 已经更新了它
    customFields = Array.isArray(customBindingManager.customFields.value)
      ? customBindingManager.customFields.value
      : [];

    // 如果 savedConfig 中有 customFields，也合并进来
    if (
      savedConfig &&
      savedConfig.customFields &&
      Array.isArray(savedConfig.customFields)
    ) {
      savedConfig.customFields.forEach((field) => {
        if (
          field &&
          field.fieldName &&
          !customFields.find((f) => f.fieldName === field.fieldName)
        ) {
          customFields.push(field);
        }
      });
    }

    const validCustomFieldsMap = new Map();
    customFields.forEach((field) => {
      if (
        typeof field === "object" &&
        field !== null &&
        field.fieldName &&
        field.fieldName.trim() !== ""
      ) {
        validCustomFieldsMap.set(field.fieldName.trim(), field);
      }
    });
    const validCustomFields = Array.from(validCustomFieldsMap.values());

    const newFieldConfigMap = new Map();
    validCustomFields.forEach((field) => {
      if (field.fieldName) {
        newFieldConfigMap.set(field.fieldName, field);
      }
    });

    const fieldsToRemove = new Set();
    parsedFields.value.forEach((field, index) => {
      if (field.isCustom) {
        if (newFieldConfigMap.has(field.name)) {
          const newConfig = newFieldConfigMap.get(field.name);
          parsedFields.value[index] = {
            ...parsedFields.value[index],
            isCustom: true,
            customConfig: newConfig,
            type: newConfig.dataType || field.type,
            updatedAt: new Date().toISOString(),
          };
          newFieldConfigMap.delete(field.name);
        } else {
          fieldsToRemove.add(field.name);
        }
      }
    });

    if (fieldsToRemove.size > 0) {
      parsedFields.value = parsedFields.value.filter(
        (field) => !fieldsToRemove.has(field.name),
      );
      logInfo(`已移除 ${fieldsToRemove.size} 个不再存在的自定义字段`);
    }

    let addedCount = 0;
    newFieldConfigMap.forEach((customField) => {
      try {
        const ddlField = {
          name: customField.fieldName,
          type: customField.dataType || "string",
          nullable: customField.nullable !== false,
          isIdentity: false,
          primaryKey: false,
          isCustom: true,
          customConfig: customField,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        parsedFields.value.push(ddlField);
        addedCount++;
        logInfo(`添加自定义字段: ${customField.fieldName}`);
      } catch (error) {
        logError(error, "custom-field", {
          operation: "addCustomField",
          customField: customField,
          errorMessage: error.message,
        });
        message.error(
          `处理自定义字段${customField.fieldName}时出错: ${error.message}`,
        );
      }
    });

    logInfo(
      `成功更新 ${parsedFields.value.length - fieldsToRemove.size} 个现有字段，添加 ${addedCount} 个新字段`,
    );

    validCustomFields.forEach((customField) => {
      const ddlFieldRef = parsedFields.value.find(
        (field) => field.name === customField.fieldName,
      );

      const existingIndex = fieldMappings.value.findIndex(
        (m) => m.ddlField?.name === customField.fieldName,
      );

      if (existingIndex >= 0) {
        fieldMappings.value[existingIndex] = {
          ...fieldMappings.value[existingIndex],
          ddlField: ddlFieldRef,
          customFieldName: customField.fieldName,
          generatedByFunction: true,
        };
      } else {
        const mapping = {
          ddlField: ddlFieldRef,
          customFieldName: customField.fieldName,
          excelHeader: null,
          excelIndex: -1,
          similarity: 0,
          confidence: "manual",
          status: "unmatched",
          generatedByFunction: true,
        };
        fieldMappings.value.push(mapping);
      }

      customBindingManager.addCustomField(customField);
    });

    if (parsedFields.value && excelHeaders.value) {
      fieldMappings.value = enhancedMatchFields(
        parsedFields.value,
        excelHeaders.value,
        "similarity",
        true,
      );
    }

    editingCustomField.value = null;
  } catch (error) {
    logError(error, "custom-binding", {
      operation: "saveCustomBinding",
      errorMessage: error.message,
    });
    message.error(`自定义绑定保存失败: ${error.message}`);
  }
};

const handleCustomBindingCancel = () => {
  showCustomBindingModal.value = false;
  editingCustomField.value = null;
};

const handleEditCustomField = (record) => {
  logInfo(`编辑自定义字段: ${record.fieldName}`);
  editingCustomField.value = record;
  openCustomBindingModal();
};

const handleDeleteCustomField = (record) => {
  logInfo(`删除: ${record.fieldName}`);

  const dataSource = record.dataSource;

  // 从fieldMappings中移除对应的映射记录
  const mappingIndex = fieldMappings.value.findIndex(
    (mapping) => mapping.ddlField?.name === record.fieldName,
  );
  if (mappingIndex >= 0) {
    fieldMappings.value.splice(mappingIndex, 1);
    console.log("已从fieldMappings移除映射记录:", record.fieldName);
  }

  // 根据数据来源从parsedFields中移除对应的字段定义
  if (dataSource === "single_binding") {
    // 单列绑定：不需要从parsedFields移除，因为它是DDL字段
  } else if (dataSource === "excel_combine") {
    // 拼接规则：从parsedFields移除自定义字段
    const fieldIndex = parsedFields.value.findIndex(
      (field) => field.name === record.fieldName,
    );
    if (fieldIndex >= 0) {
      parsedFields.value.splice(fieldIndex, 1);
    }
  } else {
    // 自定义字段：从parsedFields移除
    const fieldIndex = parsedFields.value.findIndex(
      (field) => field.name === record.fieldName,
    );
    if (fieldIndex >= 0) {
      parsedFields.value.splice(fieldIndex, 1);
    }
  }
};

const handleRefreshCustomFields = () => {
  logInfo("刷新自定义字段列表");
  // 删除自定义字段后不需要重新解析DDL，只需要更新字段映射
  // parseDdl(false)  // 注释掉，避免覆盖已配置的数据
};

const resetAll = () => {
  ddlStatement.value = "";
  parsedFields.value = [];
  uploadedFile.value = null;
  excelData.value = [];
  excelHeaders.value = [];
  originalExcelData.value = [];
  generatedSql.value = "";
  previewSql.value = "";
  previewMode.value = "original";
  fileList.value = [];

  clearDeduplication();
  resetRowRangeState();

  handleClearCache();
  customBindingEnabled.value = false;
  customBindingManager.resetBindings();

  logInfo("所有数据已重置", "reset", {
    operation: "resetAll",
    resetDeduplication: true,
    resetRowRange: true,
    resetCustomBinding: true,
  });
  message.success("重置成功");
};

/**
 * 处理批量预览
 * @param {Object} result - 预览结果
 */
const handleBatchPreview = (result) => {
  previewSql.value = generateSqlFromData(result.modifiedData);
  previewMode.value = "preview";
  logInfo(`批量修改预览：将影响 ${result.affectedRows} 行数据`, "batch-edit", {
    operation: "preview",
    affectedRows: result.affectedRows,
  });
  message.info(`预览：将影响 ${result.affectedRows} 行数据`);
};

/**
 * 处理批量应用
 * @param {Object} result - 应用结果
 */
const handleBatchApply = (result) => {
  excelData.value = result.modifiedData;
  generatedSql.value = generateSqlFromData(result.modifiedData);
  previewSql.value = "";
  previewMode.value = "original";

  logInfo(
    `批量修改应用成功：已修改 ${result.affectedRows} 行数据`,
    "batch-edit",
    {
      operation: "apply",
      affectedRows: result.affectedRows,
    },
  );
  message.success(`应用成功，已修改 ${result.affectedRows} 行数据`);
};

/**
 * 处理 Excel 数据更新
 * @param {Array} newData - 新的 Excel 数据
 */
const handleExcelDataUpdate = (newData) => {
  excelData.value = newData;
};

/**
 * 处理批量修改规则变化
 * @param {Array} rules - 修改规则列表
 */
const handleBatchChange = (rules) => {
  batchEditRules.value = rules;
};

/**
 * 从数据生成 SQL
 * @param {Array} data - 数据数组
 * @returns {string} 生成的 SQL
 */
const generateSqlFromData = (data) => {
  if (!data || data.length === 0) {
    return "";
  }

  const tableName = extractTableName(ddlStatement.value);
  const mappingsToUse = fieldMappings.value;

  const sql = generateInsertSql(tableName, mappingsToUse, data, {
    dbType: databaseType.value,
    format: "formatted",
    batch: 100,
    comments: includeComments.value,
    beautifyOptions: beautifyOptions.value,
    customBindingManager: customBindingManager,
  });

  return sql;
};

// 生命周期
onMounted(() => {
  logInfo("INSERT页面已加载");
});
</script>

<style scoped lang="scss">
// ========================================
// 页面容器
// ========================================
.insert-page {
  padding: 0;
  min-height: 100%;
  background: $page-bg-gradient;

  // --- 页面头部 ---
  .page-header {
    @include flex-between;
    margin-bottom: 24px;
    padding: 10px 20px;
    border-bottom: 1px solid $page-header-border;
    background: $page-header-bg;
    border-radius: $border-radius-sm;

    h2 {
      margin: 0 20px 0 0;
      color: $page-header-title;
      font-size: 24px;
      font-weight: 600;
    }
  }

  .header-actions {
    display: flex;
    gap: 10px;
    margin-left: auto;
  }

  // --- 内容区域 ---
  .content-grid {
    @include flex-column;
    gap: 24px;
    min-height: 600px;
    width: 100%;
    max-width: 100%;
  }

  .input-section,
  .output-section {
    @include flex-column;
    gap: 16px;
    min-width: 0;
    overflow: hidden;
  }
}

// ========================================
// 卡片组件
// ========================================
.input-card,
.output-card {
  @include card-base;
  @include card-hover;
}

.card-header {
  @include flex-between;
  margin-bottom: 16px;
  padding-bottom: 12px;
  @include divider-bottom;

  h3 {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    color: $text-primary;
  }
}

.card-footer {
  @include flex-between;
  margin-top: 16px;
  padding-top: 16px;
  @include divider-top;
}

.field-count {
  color: $text-secondary;
  font-size: 12px;
}

// ========================================
// DDL 输入区域
// ========================================
.ddl-fields-section {
  margin-top: 16px;
  padding-top: 16px;
  @include divider-top;
  overflow: hidden;

  .ant-table {
    font-size: 12px;
  }

  .ant-table-container {
    overflow-x: auto;
  }

  .ant-table-thead > tr > th {
    @include table-header;
  }
}

.file-info {
  margin-top: 12px;
}

.data-preview {
  margin-top: 12px;
}

.preview-footer {
  margin-top: 8px;
  text-align: center;
  color: $text-secondary;
  font-size: 12px;
}

// ========================================
// 字段映射区域
// ========================================
.mapping-stats {
  @include stats-grid(3);
}

.mapping-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 16px;
  padding-top: 16px;
  @include divider-top;
}

.database-type-section {
  @include panel-base;
  margin-top: 16px;

  h4 {
    margin: 0 0 12px 0;
    font-size: 14px;
    font-weight: 600;
    color: $text-primary;
  }
}

.database-type-hint {
  margin-top: 8px;
  color: $text-secondary;
  font-size: 12px;
}

.field-type {
  color: $text-secondary;
  font-size: 12px;
  margin-top: 2px;
}

.field-name-cell {
  display: flex;
  align-items: center;
  gap: 8px;

  .ant-input {
    flex: 1;
  }
}

.ddl-field-cell {
  @include flex-column;
  gap: 4px;
}

.ddl-field-info {
  @include flex-column;
  gap: 2px;
}

.no-excel-hint {
  padding: 8px;
  background: $hint-warning-bg;
  border: 1px solid $hint-warning-border;
  border-radius: $border-radius-xs;
  color: $hint-warning-text;
  text-align: center;
  margin-top: 8px;
}

// ========================================
// SQL 预览区域
// ========================================
.output-actions,
.log-actions {
  display: flex;
  gap: 8px;
}

.sql-preview {
  background: $code-bg;
  border: 1px solid $border-default;
  border-radius: $border-radius-xs;
  padding: 12px;
  max-height: 300px;
  overflow-y: auto;
  font-family: "Courier New", monospace;
  font-size: 12px;
  line-height: 1.4;
}

.sql-code {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-all;
}

.sql-stats {
  @include stats-grid(3);
  margin-top: 16px;
  padding-top: 16px;
  @include divider-top;
}

// --- SQL 美化选项面板 ---
.beautify-options-panel {
  @include panel-base;
  margin-bottom: 16px;
}

// --- 预览模式切换 ---
.preview-mode-switch {
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 10;
  background: $bg-glass;
  padding: 4px;
  border-radius: $border-radius-sm;
  box-shadow: $shadow-sm;
}

.option-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 0;
  border-bottom: 1px solid $panel-border;

  &:last-child {
    border-bottom: none;
  }
}

.option-label {
  min-width: 120px;
  font-weight: 500;
  color: $option-label;
  font-size: 14px;
}

.option-value {
  min-width: 30px;
  text-align: center;
  font-weight: 600;
  color: $option-value;
  font-size: 14px;
}

.option-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid $panel-border;
}

// ========================================
// 操作日志
// ========================================
.log-content {
  max-height: 200px;
  overflow-y: auto;
}

.log-time {
  margin: 0;
  color: $log-time;
  font-size: 12px;
}

.log-message {
  margin: 4px 0 0 0;
  font-size: 14px;
  color: $log-message;
}

// ========================================
// 去重配置
// ========================================
.deduplication-config {
  margin-top: 16px;
}

.deduplication-header {
  @include glass-card;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  transition: all $transition-normal ease;

  @include glass-card-hover;
}

.deduplication-controls {
  @include glass-card;
  margin-top: 16px;
  padding: 20px;
  transition: all $transition-normal ease;

  @include glass-card-hover;

  .ant-select {
    transition: all $transition-fast ease;

    &:hover {
      box-shadow: 0 0 0 2px $color-primary-bg;
    }
  }

  .ant-select-focused {
    box-shadow: 0 0 0 2px color-mix(in srgb, $color-primary 30%, transparent);
  }
}

.deduplication-stats {
  margin-top: 16px;
  padding: 16px;
  background: $gradient-primary-light;
  border: 1px solid $color-primary-border;
  border-radius: $border-radius-sm;
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  transition: all $transition-normal ease;

  &:hover {
    background: $color-primary-bg;
    box-shadow: $shadow-sm;
  }

  .ant-tag {
    background: $bg-elevated;
    border: 1px solid $color-primary-border;
    color: $text-primary;
    font-weight: 500;
    padding: 6px 14px;
    border-radius: $border-radius-xs;
    transition: all $transition-fast ease;

    &:hover {
      transform: translateY(-2px);
      box-shadow: $shadow-sm;
    }

    &.ant-tag-blue {
      border-color: color-mix(in srgb, $color-primary 30%, transparent);
      color: $color-primary;
    }

    &.ant-tag-green {
      border-color: color-mix(in srgb, $color-success 30%, transparent);
      color: $color-success;
    }

    &.ant-tag-orange {
      border-color: color-mix(in srgb, $color-warning 30%, transparent);
      color: $color-warning;
    }
  }
}

// ========================================
// 行范围选择
// ========================================
.row-range-config {
  margin-top: 16px;
}

.row-range-header {
  @include glass-card;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  transition: all $transition-normal ease;

  @include glass-card-hover;
}

.row-range-controls {
  @include glass-card;
  margin-top: 16px;
  padding: 20px;
  transition: all $transition-normal ease;

  @include glass-card-hover;
}

.row-range-inputs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 16px;
}

.row-range-input {
  @include flex-column;
  gap: 8px;

  label {
    font-size: 14px;
    font-weight: 500;
    color: $text-primary;
    transition: color $transition-fast ease;
  }

  .ant-input-number {
    transition: all $transition-fast ease;

    &:hover {
      box-shadow: 0 0 0 2px $color-primary-bg;
    }
  }

  .ant-input-number:focus-within {
    box-shadow: 0 0 0 2px color-mix(in srgb, $color-primary 30%, transparent);
  }
}

.row-range-options {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid $card-border;
  transition: all $transition-fast ease;

  .ant-checkbox-wrapper {
    transition: all $transition-fast ease;

    &:hover {
      color: $color-primary;
    }
  }

  .ant-tag {
    background: $color-primary-bg;
    border: 1px solid $color-primary-border;
    color: $color-primary;
    font-weight: 500;
    padding: 4px 12px;
    border-radius: $border-radius-xs;
    transition: all $transition-fast ease;

    &:hover {
      background: color-mix(in srgb, $color-primary 15%, transparent);
      transform: translateY(-1px);
    }
  }
}

.row-range-actions {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;

  .ant-btn {
    transition: all $transition-fast ease;

    &:hover {
      transform: translateY(-1px);
      box-shadow: $shadow-sm;
    }

    &:active {
      transform: scale(0.98);
    }
  }
}

.row-range-stats {
  margin-top: 16px;
  padding: 16px;
  background: $gradient-primary-light;
  border: 1px solid $color-primary-border;
  border-radius: $border-radius-sm;
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  transition: all $transition-normal ease;

  &:hover {
    background: $color-primary-bg;
    box-shadow: $shadow-sm;
  }

  .ant-tag {
    background: $bg-elevated;
    border: 1px solid $color-primary-border;
    color: $text-primary;
    font-weight: 500;
    padding: 6px 14px;
    border-radius: $border-radius-xs;
    transition: all $transition-fast ease;

    &:hover {
      transform: translateY(-2px);
      box-shadow: $shadow-sm;
    }

    &.ant-tag-green {
      border-color: color-mix(in srgb, $color-success 30%, transparent);
      color: $color-success;
    }

    &.ant-tag-orange {
      border-color: color-mix(in srgb, $color-warning 30%, transparent);
      color: $color-warning;
    }
  }
}

// ========================================
// 响应式设计
// ========================================
@include respond-to(lg) {
  .content-grid {
    gap: 16px;
  }

  .mapping-stats {
    grid-template-columns: 1fr;
    gap: 8px;
  }

  .sql-stats {
    grid-template-columns: 1fr;
    gap: 8px;
  }
}

@include respond-to(md) {
  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .header-actions {
    width: 100%;
    justify-content: flex-end;
  }

  .mapping-actions {
    flex-direction: column;
  }

  .row-range-inputs {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .row-range-options {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .row-range-actions {
    flex-direction: column;
    gap: 8px;

    .ant-btn {
      width: 100%;
    }
  }

  .row-range-stats {
    flex-direction: column;
    gap: 8px;
  }
}

@include respond-to(sm) {
  .input-card,
  .output-card {
    padding: 16px;
  }

  .card-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .output-actions,
  .log-actions {
    width: 100%;
    justify-content: space-between;
  }

  .row-range-header,
  .row-range-controls {
    padding: 16px 12px;
  }

  .row-range-input label {
    font-size: 13px;
  }

  .row-range-stats {
    padding: 12px;
  }
}
</style>
