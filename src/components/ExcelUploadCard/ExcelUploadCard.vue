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
          <a-button v-if="uploadedFile" type="text" danger size="small" @click="handleClearFile">
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
            <p class="upload-hint">支持 .xlsx、.xls、.csv 格式，单个文件最大 10MB</p>
            <div class="upload-tips">
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
              <span><FileOutlined /> {{ formatFileSize(uploadedFile.size || 0) }}</span>
              <span><LineOutlined /> {{ excelData?.length || 0 }} 行</span>
              <span><ColumnWidthOutlined /> {{ excelHeaders?.length || 0 }} 列</span>
            </div>
            <a-progress :percent="100" status="success" size="small" :show-info="false" />
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
                    <a-tag v-if="deduplicationEnabled" color="blue" size="small">已启用</a-tag>
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
                    <a-select-option v-for="(header, idx) in excelHeaders" :key="idx" :value="idx">
                      {{ header }} (列 {{ idx + 1 }})
                    </a-select-option>
                  </a-select>
                </a-form-item>
                <div class="deduplication-stats" v-if="deduplicationStats.originalRows > 0">
                  <a-descriptions :column="3" size="small" bordered>
                    <a-descriptions-item label="原始数据">
                      <a-statistic :value="deduplicationStats.originalRows" />
                    </a-descriptions-item>
                    <a-descriptions-item label="去重后">
                      <a-statistic :value="deduplicationStats.deduplicatedRows" />
                    </a-descriptions-item>
                    <a-descriptions-item label="已移除">
                      <a-statistic :value="deduplicationStats.removedRows" type="danger" />
                    </a-descriptions-item>
                  </a-descriptions>
                </div>
              </div>
            </a-collapse-panel>

            <a-collapse-panel
              key="cellSplit"
              :collapsible="!excelData?.length ? 'disabled' : undefined"
            >
              <template #header>
                <div class="collapse-header">
                  <span>
                    <ColumnWidthOutlined /> 单元格拆分
                    <a-tag v-if="cellSplitEnabled" color="purple" size="small">已启用</a-tag>
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
                <a-form-item label="自定义分隔符" v-if="cellSplitSeparatorLocal === 'custom'">
                  <a-input
                    v-model:value="customSeparatorLocal"
                    placeholder="请输入分隔符"
                    @change="handleCellSplitSeparatorChange"
                  />
                </a-form-item>
                <div class="cell-split-stats" v-if="cellSplitStats.originalRows > 0">
                  <a-descriptions :column="3" size="small" bordered>
                    <a-descriptions-item label="原始行数">
                      <a-statistic :value="cellSplitStats.originalRows" />
                    </a-descriptions-item>
                    <a-descriptions-item label="拆分后">
                      <a-statistic :value="cellSplitStats.splitRows" />
                    </a-descriptions-item>
                    <a-descriptions-item label="新增行数">
                      <a-statistic :value="cellSplitStats.expandedRows" type="success" />
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
                    <a-tag v-if="rowRangeEnabled" color="cyan" size="small">已启用</a-tag>
                  </span>
                  <a-switch
                    :checked="rowRangeEnabled"
                    size="small"
                    @change="handleRowRangeToggle"
                  />
                </div>
              </template>
              <div class="row-range-panel">
                <div class="panel-description">
                  <InfoCircleOutlined />
                  只处理指定范围内的数据行，支持跳过表头
                </div>
                <div class="row-range-config-wrapper">
                  <!-- 输入区域：包含行号输入和开关 -->
                  <div class="row-range-inputs-row">
                    <div class="range-input-group">
                      <div class="range-input">
                        <label>起始行号</label>
                        <a-input-number
                          v-model:value="startRowLocal"
                          :min="1"
                          :max="totalExcelRows"
                          :disabled="!rowRangeEnabled"
                          @change="handleRowRangeChange"
                          class="range-number-input"
                          :placeholder="`1-${totalExcelRows || 1}`"
                        />
                        <span class="input-hint" v-if="totalExcelRows > 0"
                          >共 {{ totalExcelRows }} 行</span
                        >
                      </div>
                      <div class="range-input">
                        <label>结束行号</label>
                        <a-input-number
                          v-model:value="endRowLocal"
                          :min="startRowLocal || 1"
                          :max="totalExcelRows"
                          :disabled="!rowRangeEnabled"
                          @change="handleRowRangeChange"
                          class="range-number-input"
                          :placeholder="`1-${totalExcelRows || 1}`"
                        />
                        <span class="input-hint" v-if="totalExcelRows > 0"
                          >共 {{ totalExcelRows }} 行</span
                        >
                      </div>
                      <div class="range-input header-toggle">
                        <label>包含表头</label>
                        <a-switch
                          v-model:checked="includeHeaderLocal"
                          :disabled="!rowRangeEnabled"
                          @change="handleIncludeHeaderChange"
                        />
                      </div>
                    </div>
                    <!-- 操作按钮区域 -->
                    <div class="row-range-actions">
                      <a-button
                        type="primary"
                        @click="applyRowRange"
                        :disabled="!rowRangeEnabled"
                        class="action-btn"
                      >
                        <template #icon><CheckOutlined /></template>
                        应用范围
                      </a-button>
                      <a-button
                        @click="resetRowRange"
                        :disabled="!rowRangeEnabled"
                        class="action-btn"
                      >
                        <template #icon><UndoOutlined /></template>
                        重置
                      </a-button>
                    </div>
                  </div>
                </div>
                <div
                  class="row-range-summary"
                  v-if="rowRangeEnabled && startRowLocal && endRowLocal"
                >
                  <a-tag color="processing">
                    将处理第 {{ startRowLocal }} 至 {{ endRowLocal }} 行
                    {{ includeHeaderLocal ? '(含表头)' : '(不含表头)' }}
                  </a-tag>
                  <a-tag v-if="totalExcelRows > 0" color="cyan">
                    {{ deduplicationEnabled ? '去重后' : '共' }} {{ excelData?.length || 0 }} 行
                  </a-tag>
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
import { ref, watch } from 'vue'
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
  UndoOutlined,
  CloudUploadOutlined,
} from '@ant-design/icons-vue'

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
  cellSplitSeparator: { type: String, default: ',' },
  customSeparator: { type: String, default: '' },
  cellSplitStats: {
    type: Object,
    default: () => ({ originalRows: 0, splitRows: 0, expandedRows: 0 }),
  },
  rowRangeEnabled: { type: Boolean, default: false },
  startRow: { type: Number, default: null },
  endRow: { type: Number, default: null },
  includeHeader: { type: Boolean, default: true },
  totalExcelRows: { type: Number, default: 0 },
})

const emit = defineEmits([
  'upload',
  'clear-file',
  'deduplication-toggle',
  'deduplication-change',
  'cell-split-toggle',
  'cell-split-separator-change',
  'cell-split-apply',
  'row-range-toggle',
  'row-range-apply',
  'row-range-reset',
])

const activeCollapseKeys = ref([])
const deduplicationColumnLocal = ref(props.deduplicationColumn)
const cellSplitSeparatorLocal = ref(props.cellSplitSeparator)
const customSeparatorLocal = ref(props.customSeparator)
const startRowLocal = ref(props.startRow)
const endRowLocal = ref(props.endRow)
const includeHeaderLocal = ref(props.includeHeader)

watch(
  () => props.deduplicationColumn,
  (val) => {
    deduplicationColumnLocal.value = val
  },
)

watch(
  () => props.cellSplitSeparator,
  (val) => {
    cellSplitSeparatorLocal.value = val
  },
)

watch(
  () => props.customSeparator,
  (val) => {
    customSeparatorLocal.value = val
  },
)

watch(
  () => props.startRow,
  (val) => {
    startRowLocal.value = val
  },
)

watch(
  () => props.endRow,
  (val) => {
    endRowLocal.value = val
  },
)

watch(
  () => props.includeHeader,
  (val) => {
    includeHeaderLocal.value = val
  },
)

const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const handleUpload = (options) => {
  emit('upload', options)
}

const handleFileListChange = () => {}

const handleClearFile = () => {
  emit('clear-file')
}

const handleReupload = () => {
  emit('clear-file')
  setTimeout(() => {
    emit('upload', {})
  }, 100)
}

const handleDeduplicationToggle = (value) => {
  emit('deduplication-toggle', value)
}

const handleDeduplicationChange = (value) => {
  deduplicationColumnLocal.value = value
  emit('deduplication-change', value)
}

const handleCellSplitToggle = (value) => {
  emit('cell-split-toggle', value)
}

const handleCellSplitSeparatorChange = () => {
  const separator =
    cellSplitSeparatorLocal.value === 'custom'
      ? customSeparatorLocal.value
      : cellSplitSeparatorLocal.value
  emit('cell-split-separator-change', separator)
}

const handleCellSplitApply = () => {
  emit('cell-split-apply')
}

const handleRowRangeToggle = (value) => {
  emit('row-range-toggle', value)
}

const handleRowRangeChange = () => {
  emit('update:startRow', startRowLocal.value)
  emit('update:endRow', endRowLocal.value)
}

const handleIncludeHeaderChange = () => {
  emit('update:includeHeader', includeHeaderLocal.value)
}

const applyRowRange = () => {
  emit('row-range-apply')
}

const resetRowRange = () => {
  startRowLocal.value = null
  endRowLocal.value = null
  includeHeaderLocal.value = true
  emit('row-range-reset')
}
</script>

<style scoped>
.excel-upload-wrapper {
  width: 100%;
}

.excel-upload-card {
  background: var(--bg-glass);
  backdrop-filter: blur(var(--backdrop-blur));
  border: 1px solid var(--border-glass);
  border-radius: var(--border-radius-md);
  padding: 20px;
  transition: all var(--transition-normal) ease;
}

.excel-upload-card:hover {
  box-shadow: var(--shadow-card-hover);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-left h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  display: flex;
  align-items: center;
  gap: 8px;
}

.upload-zone {
  margin-bottom: 16px;
}

.upload-zone :deep(.ant-upload-dragger) {
  border: 2px dashed var(--input-border);
  border-radius: var(--border-radius-md);
  background: var(--input-bg);
  padding: 32px;
  transition: all var(--transition-normal) ease;
}

.upload-zone :deep(.ant-upload-dragger:hover) {
  border-color: var(--color-primary);
  background: var(--color-primary-bg);
}

.upload-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.upload-icon {
  font-size: 48px;
  color: var(--color-primary);
  margin-bottom: 8px;
}

.upload-text {
  margin: 0;
  font-size: 16px;
  color: var(--text-primary);
}

.primary-text {
  font-weight: 500;
}

.upload-hint {
  margin: 0;
  font-size: 13px;
  color: var(--text-secondary);
}

.upload-tips {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}

.file-details {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.file-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background: var(--gradient-primary-light);
  border-radius: var(--border-radius-md);
  border: 1px solid var(--color-primary-border);
}

.file-icon {
  font-size: 40px;
  color: var(--color-primary);
  background: var(--card-bg);
  padding: 12px;
  border-radius: var(--border-radius-md);
  box-shadow: var(--shadow-sm);
}

.file-info {
  flex: 1;
}

.file-name {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.file-meta {
  display: flex;
  gap: 16px;
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 8px;
}

.file-meta span {
  display: flex;
  align-items: center;
  gap: 4px;
}

.data-options {
  margin-top: 8px;
}

.collapse-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  padding-right: 8px;
}

.collapse-header span {
  display: flex;
  align-items: center;
  gap: 8px;
}

.preview-header {
  margin-bottom: 12px;
}

.preview-info {
  color: var(--text-secondary);
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
  background: var(--color-primary-bg);
  border-radius: var(--border-radius-md);
  margin-bottom: 16px;
  color: var(--color-primary);
  font-size: 13px;
}

.deduplication-panel,
.cell-split-panel,
.row-range-panel {
  padding: 8px 0;
}

/* 行范围筛选区域响应式布局 */
.row-range-config-wrapper {
  width: 100%;
}

.row-range-inputs-row {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 16px;
}

.range-input-group {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: 12px;
  flex: 1;
  min-width: 280px;
}

.range-input {
  display: flex;
  flex-direction: column;
  gap: 8px;
  position: relative;
}

.range-input label {
  font-size: 12px;
  color: #6b7280;
  font-weight: 500;
  white-space: nowrap;
  line-height: 1;
  height: 12px;
  display: flex;
  align-items: center;
}

.input-hint {
  font-size: 11px;
  color: #9ca3af;
  margin-top: 2px;
  white-space: nowrap;
}

.range-number-input {
  width: 100px;
}

.range-number-input :deep(.ant-input-number) {
  width: 100%;
}

.header-toggle {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
  /* 与 .range-input 对齐 */
  justify-content: flex-start;
}

.header-toggle label {
  margin-bottom: 0;
  font-size: 12px;
  color: #6b7280;
  font-weight: 500;
  white-space: nowrap;
  line-height: 1;
  height: 12px;
  display: flex;
  align-items: center;
}

.row-range-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: flex-end;
}

.action-btn {
  min-width: 100px;
}

.row-range-summary {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 16px;
  padding: 12px;
  background: linear-gradient(135deg, rgba(22, 119, 255, 0.05) 0%, rgba(20, 201, 201, 0.05) 100%);
  border-radius: 8px;
}

/* 平板端适配 */
@media screen and (max-width: 768px) {
  .row-range-inputs-row {
    flex-direction: column;
    align-items: stretch;
  }

  .range-input-group {
    min-width: auto;
    justify-content: flex-start;
  }

  .range-number-input {
    width: 90px;
  }

  .row-range-actions {
    width: 100%;
    justify-content: flex-start;
    margin-top: 8px;
  }

  .action-btn {
    flex: 1;
    min-width: auto;
    max-width: 140px;
  }
}

/* 移动端适配 */
@media screen and (max-width: 480px) {
  .range-input-group {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }

  .range-input {
    width: 100%;
  }

  .range-number-input {
    width: 100%;
  }

  .range-number-input :deep(.ant-input-number) {
    width: 100%;
  }

  .header-toggle {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    padding-bottom: 0;
    padding-top: 8px;
  }

  .row-range-actions {
    flex-direction: column;
    width: 100%;
  }

  .action-btn {
    width: 100%;
    max-width: none;
  }

  .row-range-summary {
    flex-direction: column;
  }
}
</style>
