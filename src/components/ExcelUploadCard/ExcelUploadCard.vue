<template>
  <div class="input-card excel-upload-card">
    <div class="card-header">
      <h3>Excel文件上传</h3>
      <a-tooltip title="支持.xlsx、.xls、.csv格式，最大文件大小10MB">
        <QuestionCircleOutlined />
      </a-tooltip>
    </div>
    <a-upload
      :file-list="fileList"
      :custom-request="handleUpload"
      :show-upload-list="false"
      accept=".xlsx,.xls,.csv"
      @change="handleFileListChange"
    >
      <a-button :loading="uploading">
        <template #icon><UploadOutlined /></template>
        {{ uploading ? '上传中...' : '选择文件' }}
      </a-button>
    </a-upload>

    <div v-if="uploadedFile" class="file-info">
      <a-alert
        :message="uploadedFile.name"
        :description="
          excelData && excelData.length > 0
            ? `文件解析完成，共 ${excelData.length} 行数据`
            : '文件上传成功，正在解析数据...'
        "
        :type="excelData && excelData.length > 0 ? 'success' : 'info'"
        show-icon
        closable
        @close="handleClearFile"
      />
    </div>

    <!-- 去重配置 -->
    <DeduplicationConfig
      v-if="excelData && excelData.length > 0"
      :enabled="deduplicationEnabled"
      :column="deduplicationColumn"
      :stats="deduplicationStats"
      :headers="excelHeaders"
      @toggle="handleDeduplicationToggle"
      @change="handleDeduplicationChange"
    />

    <!-- 单元格数据拆分配置 -->
    <CellSplitConfig
      v-if="excelData && excelData.length > 0"
      :enabled="cellSplitEnabled"
      :separator="cellSplitSeparator"
      :custom-separator="customSeparator"
      :stats="cellSplitStats"
      @toggle="handleCellSplitToggle"
      @separator-change="handleCellSplitSeparatorChange"
      @apply="handleCellSplitApply"
    />

    <!-- 行范围选择配置 -->
    <RowRangeConfig
      v-if="excelData && excelData.length > 0"
      :enabled="rowRangeEnabled"
      :start-row="startRow"
      :end-row="endRow"
      :include-header="includeHeader"
      :total-rows="totalExcelRows"
      @toggle="handleRowRangeToggle"
      @start-row-change="handleStartRowChange"
      @end-row-change="handleEndRowChange"
      @include-header-change="handleIncludeHeaderChange"
      @apply="handleRowRangeApply"
      @reset="handleRowRangeReset"
    />

    <div v-if="excelData && excelData.length > 0" class="data-preview">
      <a-collapse>
        <a-collapse-panel key="preview" header="数据预览">
          <a-table
            :data-source="previewData"
            :columns="previewColumns"
            :pagination="false"
            size="small"
            :scroll="{ x: true }"
          />
          <div class="preview-footer">显示前10行，共 {{ excelData.length }} 行数据</div>
        </a-collapse-panel>
      </a-collapse>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { UploadOutlined, QuestionCircleOutlined } from '@ant-design/icons-vue'
import DeduplicationConfig from './DeduplicationConfig.vue'
import CellSplitConfig from './CellSplitConfig.vue'
import RowRangeConfig from './RowRangeConfig.vue'

const props = defineProps({
  fileList: {
    type: Array,
    default: () => [],
  },
  uploadedFile: {
    type: Object,
    default: null,
  },
  uploading: {
    type: Boolean,
    default: false,
  },
  excelData: {
    type: Array,
    default: () => [],
  },
  excelHeaders: {
    type: Array,
    default: () => [],
  },
  deduplicationEnabled: {
    type: Boolean,
    default: false,
  },
  deduplicationColumn: {
    type: Number,
    default: undefined,
  },
  deduplicationStats: {
    type: Object,
    default: () => ({
      originalRows: 0,
      deduplicatedRows: 0,
      removedRows: 0,
    }),
  },
  cellSplitEnabled: {
    type: Boolean,
    default: false,
  },
  cellSplitSeparator: {
    type: String,
    default: ',',
  },
  customSeparator: {
    type: String,
    default: '',
  },
  cellSplitStats: {
    type: Object,
    default: () => ({
      originalRows: 0,
      splitRows: 0,
      expandedRows: 0,
    }),
  },
  rowRangeEnabled: {
    type: Boolean,
    default: false,
  },
  startRow: {
    type: Number,
    default: null,
  },
  endRow: {
    type: Number,
    default: null,
  },
  includeHeader: {
    type: Boolean,
    default: true,
  },
  totalExcelRows: {
    type: Number,
    default: 0,
  },
})

const emit = defineEmits([
  'update:fileList',
  'before-upload',
  'upload',
  'clear-file',
  'update:deduplicationEnabled',
  'update:deduplicationColumn',
  'deduplication-toggle',
  'deduplication-change',
  'update:cellSplitEnabled',
  'update:cellSplitSeparator',
  'update:customSeparator',
  'cell-split-toggle',
  'cell-split-separator-change',
  'cell-split-apply',
  'update:rowRangeEnabled',
  'update:startRow',
  'update:endRow',
  'update:includeHeader',
  'row-range-toggle',
  'row-range-apply',
  'row-range-reset',
])

const previewData = computed(() => {
  if (!props.excelData || props.excelData.length === 0) {
    return []
  }

  const previewLimit = 10
  return props.excelData.slice(0, previewLimit).map((row, index) => ({
    key: `preview-${index}`,
    ...row,
  }))
})

const previewColumns = computed(() => {
  if (!props.excelHeaders || props.excelHeaders.length === 0) {
    return []
  }

  const maxColumns = 20
  const headersToDisplay = props.excelHeaders.slice(0, maxColumns)

  return headersToDisplay.map((header, index) => ({
    title: `${header} (列${index + 1})`,
    dataIndex: index,
    key: `col-${index}`,
    ellipsis: true,
    width: 150,
  }))
})

const handleUpload = (options) => {
  emit('upload', options)
}

const handleFileListChange = ({ fileList: newFileList }) => {
  emit('update:fileList', newFileList)
}

const handleClearFile = () => {
  emit('clear-file')
}

const handleDeduplicationToggle = (checked) => {
  emit('deduplication-toggle', checked)
}

const handleDeduplicationChange = (column) => {
  emit('deduplication-change', column)
}

const handleCellSplitToggle = (checked) => {
  emit('cell-split-toggle', checked)
}

const handleCellSplitSeparatorChange = (separator) => {
  emit('cell-split-separator-change', separator)
}

const handleCellSplitApply = () => {
  emit('cell-split-apply')
}

const handleRowRangeToggle = (checked) => {
  emit('row-range-toggle', checked)
}

const handleStartRowChange = (value) => {
  emit('update:startRow', value)
}

const handleEndRowChange = (value) => {
  emit('update:endRow', value)
}

const handleIncludeHeaderChange = (checked) => {
  emit('update:includeHeader', checked)
}

const handleRowRangeApply = () => {
  emit('row-range-apply')
}

const handleRowRangeReset = () => {
  emit('row-range-reset')
}
</script>

<style scoped>
.excel-upload-card {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.excel-upload-card .card-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.excel-upload-card .card-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary, #1f2937);
}

.file-info {
  margin-top: 8px;
}

.data-preview {
  margin-top: 16px;
}

.preview-footer {
  margin-top: 12px;
  padding: 8px 12px;
  background: var(--card-bg, rgba(255, 255, 255, 0.85));
  border: 1px solid var(--card-border, rgba(255, 255, 255, 0.5));
  border-radius: var(--border-radius-sm, 8px);
  font-size: 12px;
  color: var(--text-secondary, #6b7280);
  text-align: center;
}

[data-theme='dark'] .preview-footer {
  background: var(--card-bg, rgba(30, 41, 59, 0.6));
  border-color: var(--card-border, rgba(255, 255, 255, 0.1));
  color: var(--text-secondary, #9ca3af);
}
</style>
