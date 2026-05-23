<template>
  <div class="excel-upload-wrapper">
    <div class="excel-upload-card">
      <div class="card-header">
        <div class="header-left">
          <h3 class="card-title">
            <FileExcelOutlined />
            <span>Excel数据源</span>
          </h3>
          <a-tag color="green" v-if="uploadedFile">已上传</a-tag>
        </div>
        <div class="header-actions">
          <a-button
            v-if="uploadedFile"
            type="text"
            danger
            size="small"
            @click="handleClearFile"
          >
            <template #icon><DeleteOutlined /></template>
            更换文件
          </a-button>
        </div>
      </div>

      <div class="upload-zone" v-if="!uploadedFile">
        <a-upload-dragger
          :file-list="fileList"
          :custom-request="handleUpload"
          :show-upload-list="false"
          accept=".xlsx,.xls,.csv"
          @change="handleFileListChange"
          :disabled="uploading"
        >
          <div class="upload-content">
            <div class="upload-icon">
              <CloudUploadOutlined :spin="uploading" />
            </div>
            <p class="upload-text">
              <span class="primary-text">点击或拖拽文件到此处上传</span>
            </p>
            <p class="upload-hint">支持 .xlsx、.xls、.csv 格式</p>
            <div class="upload-tips">
              <a-tag color="red">最大 {{ maxFileSize }}MB</a-tag>
              <a-tag color="blue">智能解析</a-tag>
              <a-tag color="green">UTF-8编码</a-tag>
              <a-tag color="orange">自动识别表头</a-tag>
            </div>
          </div>
        </a-upload-dragger>
      </div>

      <div class="file-details" v-else>
        <div class="file-card">
          <div class="file-icon">
            <FileExcelOutlined />
          </div>
          <div class="file-info">
            <div class="file-name">{{ uploadedFile.name }}</div>
            <div class="file-meta">
              <span
                ><FileOutlined />
                {{ formatFileSize(uploadedFile.size || 0) }}</span
              >
              <span><LineOutlined /> {{ excelData?.length || 0 }} 行</span>
              <span
                ><ColumnWidthOutlined />
                {{ excelHeaders?.length || 0 }} 列</span
              >
            </div>
            <a-progress
              :percent="100"
              status="success"
              size="small"
              :show-info="false"
            />
          </div>
          <div class="file-actions">
            <a-button-group>
              <a-tooltip title="重新解析">
                <a-button @click="handleReupload" :loading="uploading">
                  <RedoOutlined />
                </a-button>
              </a-tooltip>
              <a-tooltip title="清除文件">
                <a-button @click="handleClearFile" danger>
                  <DeleteOutlined />
                </a-button>
              </a-tooltip>
            </a-button-group>
          </div>
        </div>

        <div class="data-options">
          <a-collapse v-model:activeKey="activeCollapseKeys">
            <a-collapse-panel
              key="deduplication"
              :collapsible="!excelData?.length ? 'disabled' : undefined"
            >
              <template #header>
                <div class="collapse-header">
                  <span>
                    <FilterOutlined /> 数据去重
                    <a-tag v-if="deduplicationEnabled" color="blue" size="small"
                      >已启用</a-tag
                    >
                  </span>
                  <a-switch
                    :checked="deduplicationEnabled"
                    size="small"
                    @change="handleDeduplicationToggle"
                  />
                </div>
              </template>
              <div class="deduplication-panel">
                <div class="panel-description">
                  <InfoCircleOutlined />
                  根据指定列去除重复数据，保留首次出现的记录
                </div>
                <a-form-item label="去重依据列">
                  <a-select
                    v-model:value="deduplicationColumnLocal"
                    placeholder="选择需要去重的列"
                    style="width: 100%"
                    @change="handleDeduplicationChange"
                    :disabled="!deduplicationEnabled"
                  >
                    <a-select-option
                      v-for="(header, idx) in excelHeaders"
                      :key="idx"
                      :value="idx"
                    >
                      {{ header }} (列 {{ idx + 1 }})
                    </a-select-option>
                  </a-select>
                </a-form-item>
                <div
                  class="deduplication-stats"
                  v-if="deduplicationStats.originalRows > 0"
                >
                  <a-descriptions :column="3" size="small" bordered>
                    <a-descriptions-item label="原始数据">
                      <a-statistic :value="deduplicationStats.originalRows" />
                    </a-descriptions-item>
                    <a-descriptions-item label="去重后">
                      <a-statistic
                        :value="deduplicationStats.deduplicatedRows"
                      />
                    </a-descriptions-item>
                    <a-descriptions-item label="已移除">
                      <a-statistic
                        :value="deduplicationStats.removedRows"
                        type="danger"
                      />
                    </a-descriptions-item>
                  </a-descriptions>
                </div>
              </div>
            </a-collapse-panel>

            <a-collapse-panel
              v-if="showCellSplit"
              key="cellSplit"
              :collapsible="!excelData?.length ? 'disabled' : undefined"
            >
              <template #header>
                <div class="collapse-header">
                  <span>
                    <ColumnWidthOutlined /> 单元格拆分
                    <a-tag v-if="cellSplitEnabled" color="purple" size="small"
                      >已启用</a-tag
                    >
                  </span>
                  <a-switch
                    :checked="cellSplitEnabled"
                    size="small"
                    @change="handleCellSplitToggle"
                  />
                </div>
              </template>
              <div class="cell-split-panel">
                <div class="panel-description">
                  <InfoCircleOutlined />
                  将指定列中包含分隔符的单元格拆分为多行
                </div>
                <a-form-item label="分隔符类型">
                  <a-radio-group
                    v-model:value="cellSplitSeparatorLocal"
                    @change="handleCellSplitSeparatorChange"
                    :disabled="!cellSplitEnabled"
                  >
                    <a-radio value=",">逗号 ,</a-radio>
                    <a-radio value=";">分号 ;</a-radio>
                    <a-radio value="|">竖线 |</a-radio>
                    <a-radio value="\t">制表符</a-radio>
                    <a-radio value=" ">空格</a-radio>
                    <a-radio value="/">斜杠 /</a-radio>
                    <a-radio value="-">连字符 -</a-radio>
                    <a-radio value="_">下划线 _</a-radio>
                    <a-radio value="custom">自定义</a-radio>
                  </a-radio-group>
                </a-form-item>
                <a-form-item
                  label="自定义分隔符"
                  v-if="cellSplitSeparatorLocal === 'custom'"
                >
                  <a-input
                    v-model:value="customSeparatorLocal"
                    placeholder="请输入分隔符"
                    @change="handleCellSplitSeparatorChange"
                  />
                </a-form-item>
                <div
                  class="cell-split-stats"
                  v-if="cellSplitStats.originalRows > 0"
                >
                  <a-descriptions :column="3" size="small" bordered>
                    <a-descriptions-item label="原始行数">
                      <a-statistic :value="cellSplitStats.originalRows" />
                    </a-descriptions-item>
                    <a-descriptions-item label="拆分后">
                      <a-statistic :value="cellSplitStats.splitRows" />
                    </a-descriptions-item>
                    <a-descriptions-item label="新增行数">
                      <a-statistic
                        :value="cellSplitStats.expandedRows"
                        type="success"
                      />
                    </a-descriptions-item>
                  </a-descriptions>
                </div>
                <a-button
                  type="primary"
                  block
                  @click="handleCellSplitApply"
                  :disabled="!cellSplitEnabled || !cellSplitSeparatorLocal"
                >
                  应用拆分
                </a-button>
              </div>
            </a-collapse-panel>

            <a-collapse-panel
              key="rowRange"
              :collapsible="!excelData?.length ? 'disabled' : undefined"
            >
              <template #header>
                <div class="collapse-header">
                  <span>
                    <OrderedListOutlined /> 行范围筛选
                    <a-tag v-if="rowRangeEnabled" color="cyan" size="small"
                      >已启用</a-tag
                    >
                  </span>
                  <a-switch
                    :checked="rowRangeEnabled"
                    size="small"
                    @change="handleRowRangeToggle"
                  />
                </div>
              </template>
              <div class="row-range-panel">
                <div class="row-range-controls">
                  <div class="row-range-inputs">
                    <div class="row-range-input">
                      <label>起始行:</label>
                      <a-input-number
                        v-model:value="startRowLocal"
                        :min="1"
                        :max="totalExcelRows"
                        :placeholder="`1-${totalExcelRows}`"
                        style="width: 100%"
                        :disabled="!rowRangeEnabled"
                        @change="handleRowRangeChange"
                      />
                    </div>
                    <div class="row-range-input">
                      <label>结束行:</label>
                      <a-input-number
                        v-model:value="endRowLocal"
                        :min="startRowLocal || 1"
                        :max="totalExcelRows"
                        :placeholder="`1-${totalExcelRows}`"
                        style="width: 100%"
                        :disabled="!rowRangeEnabled"
                        @change="handleRowRangeChange"
                      />
                    </div>
                  </div>
                  <div class="row-range-options">
                    <a-checkbox
                      v-model:checked="includeHeaderLocal"
                      @change="handleIncludeHeaderChange"
                      :disabled="!rowRangeEnabled"
                    >
                      包含表头
                    </a-checkbox>
                    <a-tag color="blue">文件总行数: {{ totalExcelRows }}</a-tag>
                  </div>
                  <div class="row-range-actions">
                    <a-button
                      type="primary"
                      size="small"
                      @click="applyRowRange"
                      :disabled="!rowRangeEnabled"
                    >
                      <template #icon><CheckOutlined /></template>
                      应用行范围
                    </a-button>
                    <a-button
                      size="small"
                      @click="resetRowRange"
                      :disabled="!rowRangeEnabled"
                    >
                      <template #icon><ReloadOutlined /></template>
                      重置范围
                    </a-button>
                  </div>
                </div>
              </div>
            </a-collapse-panel>

            <a-collapse-panel
              key="preview"
              :collapsible="!excelData?.length ? 'disabled' : undefined"
            >
              <template #header>
                <div class="collapse-header">
                  <span> <FileOutlined /> 数据预览 </span>
                </div>
              </template>
              <div class="preview-panel">
                <div class="preview-header">
                  <a-space>
                    <span class="preview-info">
                      显示前 {{ Math.min(5, excelData?.length || 0) }} 行，共
                      {{ excelData?.length || 0 }} 行数据
                    </span>
                  </a-space>
                </div>
                <div class="preview-table-container">
                  <a-table
                    :data-source="excelData.slice(0, 5)"
                    :columns="
                      excelHeaders.slice(0, 10).map((header, index) => ({
                        title: `${header}`,
                        dataIndex: index,
                        key: `col-${index}`,
                        ellipsis: true,
                        width: 120,
                      }))
                    "
                    :pagination="false"
                    size="small"
                    :scroll="{ x: true }"
                    :loading="uploading"
                  />
                </div>
              </div>
            </a-collapse-panel>
          </a-collapse>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from "vue";
import {
  FileExcelOutlined,
  FileOutlined,
  LineOutlined,
  ColumnWidthOutlined,
  FilterOutlined,
  OrderedListOutlined,
  InfoCircleOutlined,
  DeleteOutlined,
  RedoOutlined,
  CheckOutlined,
  CloudUploadOutlined,
  ReloadOutlined,
} from "@ant-design/icons-vue";
import { useSettings } from "@/composables/core/useSettings";

const props = defineProps({
  fileList: { type: Array, default: () => [] },
  uploadedFile: { type: Object, default: null },
  uploading: { type: Boolean, default: false },
  excelData: { type: Array, default: () => [] },
  excelHeaders: { type: Array, default: () => [] },
  deduplicationEnabled: { type: Boolean, default: false },
  deduplicationColumn: { type: Number, default: undefined },
  deduplicationStats: {
    type: Object,
    default: () => ({ originalRows: 0, deduplicatedRows: 0, removedRows: 0 }),
  },
  cellSplitEnabled: { type: Boolean, default: false },
  cellSplitSeparator: { type: String, default: "," },
  customSeparator: { type: String, default: "" },
  cellSplitStats: {
    type: Object,
    default: () => ({ originalRows: 0, splitRows: 0, expandedRows: 0 }),
  },
  rowRangeEnabled: { type: Boolean, default: false },
  startRow: { type: Number, default: null },
  endRow: { type: Number, default: null },
  includeHeader: { type: Boolean, default: true },
  totalExcelRows: { type: Number, default: 0 },
  showCellSplit: { type: Boolean, default: true },
});

const emit = defineEmits([
  "upload",
  "clear-file",
  "reparse",
  "deduplication-toggle",
  "deduplication-change",
  "cell-split-toggle",
  "cell-split-separator-change",
  "cell-split-apply",
  "row-range-toggle",
  "row-range-apply",
  "row-range-reset",
  "update:startRow",
  "update:endRow",
  "update:includeHeader",
]);

const activeCollapseKeys = ref([]);
const deduplicationColumnLocal = ref(props.deduplicationColumn);
const cellSplitSeparatorLocal = ref(props.cellSplitSeparator);
const customSeparatorLocal = ref(props.customSeparator);
const startRowLocal = ref(props.startRow);
const endRowLocal = ref(props.endRow);
const includeHeaderLocal = ref(props.includeHeader);

/**
 * 从系统设置 composable 中获取 getSetting 方法
 * 用于动态读取配置参数
 */
const { getSetting } = useSettings();

/**
 * 动态读取系统设置中的文件大小限制（单位：MB）
 * 支持实时响应设置变更
 */
const maxFileSize = computed(() => {
  return getSetting("maxFileSize") || 50;
});

watch(
  () => props.deduplicationColumn,
  (val) => {
    deduplicationColumnLocal.value = val;
  },
);

watch(
  () => props.cellSplitSeparator,
  (val) => {
    cellSplitSeparatorLocal.value = val;
  },
);

watch(
  () => props.customSeparator,
  (val) => {
    customSeparatorLocal.value = val;
  },
);

watch(
  () => props.startRow,
  (val) => {
    startRowLocal.value = val;
  },
);

watch(
  () => props.endRow,
  (val) => {
    endRowLocal.value = val;
  },
);

watch(
  () => props.includeHeader,
  (val) => {
    includeHeaderLocal.value = val;
  },
);

const formatFileSize = (bytes) => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

const handleUpload = (options) => {
  emit("upload", options);
};

const handleFileListChange = () => {};

const handleClearFile = () => {
  emit("clear-file");
};

const handleReupload = () => {
  emit("reparse");
};

const handleDeduplicationToggle = (value) => {
  emit("deduplication-toggle", value);
};

const handleDeduplicationChange = (value) => {
  deduplicationColumnLocal.value = value;
  emit("deduplication-change", value);
};

const handleCellSplitToggle = (value) => {
  emit("cell-split-toggle", value);
};

const handleCellSplitSeparatorChange = () => {
  const separator =
    cellSplitSeparatorLocal.value === "custom"
      ? customSeparatorLocal.value
      : cellSplitSeparatorLocal.value;
  emit("cell-split-separator-change", separator);
};

const handleCellSplitApply = () => {
  emit("cell-split-apply");
};

const handleRowRangeToggle = (value) => {
  emit("row-range-toggle", value);
};

const handleRowRangeChange = () => {
  emit("update:startRow", startRowLocal.value);
  emit("update:endRow", endRowLocal.value);
};

const handleIncludeHeaderChange = () => {
  emit("update:includeHeader", includeHeaderLocal.value);
};

const applyRowRange = () => {
  emit("update:startRow", startRowLocal.value);
  emit("update:endRow", endRowLocal.value);
  emit("row-range-apply");
};

const resetRowRange = () => {
  startRowLocal.value = null;
  endRowLocal.value = null;
  includeHeaderLocal.value = true;
  emit("row-range-reset");
};
</script>

<style scoped lang="scss">
.excel-upload-wrapper {
  width: 100%;
}

.excel-upload-card {
  background: $card-bg;
  backdrop-filter: blur($backdrop-blur);
  border: 1px solid $card-border;
  border-radius: $border-radius-md;
  padding: 20px;
  transition: box-shadow $transition-normal ease, border-color $transition-normal ease;
  contain: layout style;

  &:hover {
    box-shadow: $shadow-card-hover;
  }
}

.card-header {
  @include flex-between;
  margin-bottom: 16px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;

  h3 {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    color: $text-primary;
    display: flex;
    align-items: center;
    gap: 8px;
  }
}

.upload-zone {
  margin-bottom: 16px;

  :deep(.ant-upload-dragger) {
    border: 2px dashed $border-default;
    border-radius: $border-radius-md;
    background: $bg-elevated;
    padding: 32px;
    transition: border-color $transition-normal ease, background-color $transition-normal ease;

    &:hover {
      border-color: $color-primary;
      background: $color-primary-bg;
    }
  }
}

.upload-content {
  @include flex-column-center;
  gap: 12px;
}

.upload-icon {
  font-size: 48px;
  color: $color-primary;
  margin-bottom: 8px;
}

.upload-text {
  margin: 0;
  font-size: 16px;
  color: $text-primary;
}

.primary-text {
  font-weight: 500;
}

.upload-hint {
  margin: 0;
  font-size: 13px;
  color: $text-secondary;
}

.upload-tips {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}

.file-details {
  @include flex-column;
  gap: 16px;
}

.file-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background: $gradient-primary-light;
  border-radius: $border-radius-md;
  border: 1px solid $color-primary-border;
}

.file-icon {
  font-size: 40px;
  color: $color-primary;
  background: $bg-elevated;
  padding: 12px;
  border-radius: $border-radius-md;
  box-shadow: $shadow-sm;
}

.file-info {
  flex: 1;
}

.file-name {
  font-size: 16px;
  font-weight: 600;
  color: $text-primary;
  margin-bottom: 4px;
}

.file-meta {
  display: flex;
  gap: 16px;
  font-size: 13px;
  color: $text-secondary;
  margin-bottom: 8px;

  span {
    display: flex;
    align-items: center;
    gap: 4px;
  }
}

.data-options {
  margin-top: 8px;
}

.collapse-header {
  @include flex-between;
  width: 100%;
  padding-right: 8px;

  span {
    display: flex;
    align-items: center;
    gap: 8px;
  }
}

.preview-header {
  margin-bottom: 12px;
}

.preview-info {
  color: $text-secondary;
  font-size: 13px;
}

.preview-table-container {
  max-height: 300px;
  overflow: auto;
}

.panel-description {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  background: $color-primary-bg;
  border-radius: $border-radius-sm;
  margin-bottom: 16px;
  color: $color-primary;
  font-size: 13px;
}

.deduplication-panel,
.cell-split-panel,
.row-range-panel {
  padding: 8px 0;
}

// 行范围筛选样式
.row-range-config {
  margin-top: 8px;
}

.row-range-header {
  @include glass-card;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  transition: box-shadow $transition-normal ease, transform $transition-normal ease, background-color $transition-normal ease;

  @include glass-card-hover;
}

.row-range-controls {
  @include glass-card;
  margin-top: 16px;
  padding: 20px;
  transition: box-shadow $transition-normal ease, transform $transition-normal ease, background-color $transition-normal ease;

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
  }
}

.row-range-options {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  padding: 12px 16px;
  background: $bg-sunken;
  border-radius: $border-radius-sm;
}

.row-range-actions {
  display: flex;
  gap: 12px;
}

.action-btn {
  min-width: 100px;
}

// 响应式适配
@include respond-to(md) {
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
    width: 100%;
  }
}

@include respond-to(sm) {
  .row-range-inputs {
    grid-template-columns: 1fr;
  }

  .row-range-input {
    width: 100%;
  }

  .row-range-actions {
    flex-direction: column;
    width: 100%;
  }

  .action-btn {
    width: 100%;
    max-width: none;
  }
}
</style>
