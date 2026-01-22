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
            <a-tooltip title="输入CREATE TABLE语句，系统将自动解析表结构和字段信息">
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
              <a-button type="link" size="small" @click="parseDdl(false)" :loading="parsingDdl">
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

        <!-- Excel上传 -->
        <div class="input-card">
          <div class="card-header">
            <h3>Excel文件上传</h3>
            <a-tooltip title="支持.xlsx、.xls、.csv格式，最大文件大小10MB">
              <QuestionCircleOutlined />
            </a-tooltip>
          </div>
          <a-upload
            v-model:file-list="fileList"
            :before-upload="beforeUpload"
            :custom-request="handleUpload"
            :show-upload-list="false"
            accept=".xlsx,.xls,.csv"
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
              @close="clearFile"
            />
          </div>

          <!-- 去重配置 -->
          <div v-if="excelData && excelData.length > 0" class="deduplication-config">
            <a-divider style="margin: 12px 0" />
            <div class="deduplication-header">
              <a-checkbox
                v-model:checked="deduplicationEnabled"
                @change="(e) => handleDeduplicationToggle(e.target.checked)"
              >
                启用数据去重
              </a-checkbox>
              <a-tooltip title="根据选定列的值去除重复数据行，仅保留每组的第一次出现">
                <QuestionCircleOutlined />
              </a-tooltip>
            </div>
            <div v-if="deduplicationEnabled" class="deduplication-controls">
              <a-select
                v-model:value="deduplicationColumn"
                placeholder="请选择去重列"
                style="width: 100%; max-width: 300px"
                @change="applyDeduplication"
              >
                <a-select-option
                  v-for="(header, idx) in excelHeaders || []"
                  :key="idx"
                  :value="idx"
                >
                  {{ header }} (列{{ idx + 1 }})
                </a-select-option>
              </a-select>
              <div v-if="deduplicationStats.removedRows > 0" class="deduplication-stats">
                <a-tag color="blue">原始: {{ deduplicationStats.originalRows }} 行</a-tag>
                <a-tag color="green">去重后: {{ deduplicationStats.deduplicatedRows }} 行</a-tag>
                <a-tag color="orange">去重: {{ deduplicationStats.removedRows }} 行</a-tag>
              </div>
            </div>
          </div>

          <!-- 行范围选择配置 -->
          <div v-if="excelData && excelData.length > 0" class="row-range-config">
            <a-divider style="margin: 12px 0" />
            <div class="row-range-header">
              <a-checkbox
                v-model:checked="rowRangeEnabled"
                @change="(e) => handleRowRangeToggle(e.target.checked)"
              >
                启用行范围选择
              </a-checkbox>
              <a-tooltip title="只处理指定范围内的Excel行，提高处理效率">
                <QuestionCircleOutlined />
              </a-tooltip>
            </div>
            <div v-if="rowRangeEnabled" class="row-range-controls">
              <div class="row-range-inputs">
                <div class="row-range-input">
                  <label>起始行:</label>
                  <a-input-number
                    v-model:value="startRow"
                    :min="1"
                    :max="totalExcelRows"
                    :placeholder="`1-${totalExcelRows}`"
                    style="width: 100%"
                  />
                </div>
                <div class="row-range-input">
                  <label>结束行:</label>
                  <a-input-number
                    v-model:value="endRow"
                    :min="1"
                    :max="totalExcelRows"
                    :placeholder="`1-${totalExcelRows}`"
                    style="width: 100%"
                  />
                </div>
              </div>
              <div class="row-range-options">
                <a-checkbox v-model:checked="includeHeader"> 包含表头 </a-checkbox>
                <a-tag color="blue">文件总行数: {{ totalExcelRows }}</a-tag>
              </div>
              <div class="row-range-actions">
                <a-button type="primary" size="small" @click="applyRowRange">
                  <template #icon><CheckOutlined /></template>
                  应用行范围
                </a-button>
                <a-button size="small" @click="resetRowRange">
                  <template #icon><ReloadOutlined /></template>
                  重置范围
                </a-button>
              </div>
              <div v-if="startRow && endRow" class="row-range-stats">
                <a-tag color="green">选择范围: {{ startRow }} - {{ endRow }}</a-tag>
                <a-tag color="orange">将处理 {{ endRow - startRow + 1 }} 行</a-tag>
              </div>
            </div>
          </div>

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

        <!-- 字段映射 -->
        <div class="input-card" v-if="showFieldMapping">
          <div class="card-header">
            <h3>字段映射配置</h3>
            <a-tooltip title="建立DDL字段与Excel列的映射关系，支持自动匹配和手动调整">
              <QuestionCircleOutlined />
            </a-tooltip>
          </div>

          <div class="mapping-stats">
            <a-statistic
              title="匹配率"
              :value="enhancedMatchingStats.matchRate"
              :precision="1"
              suffix="%"
            />
            <a-statistic
              title="已匹配"
              :value="enhancedMatchingStats.matched"
              :value-style="{ color: '#3f8600' }"
            />
            <a-statistic
              title="未匹配"
              :value="enhancedMatchingStats.unmatched"
              :value-style="{ color: '#cf1322' }"
            />

            <!-- 自定义绑定统计 -->
            <div v-if="hasCustomBindingConfig" class="custom-binding-stats">
              <a-divider type="vertical" />
              <a-statistic
                title="自定义绑定"
                :value="enhancedMatchingStats.customBindings || 0"
                :value-style="{ color: '#1890ff' }"
              />
              <a-statistic
                title="字段拼接"
                :value="enhancedMatchingStats.concatenationRules || 0"
                :value-style="{ color: '#722ed1' }"
              />
            </div>
          </div>

          <a-table
            :data-source="filteredFieldMappings"
            :columns="mappingColumns"
            :pagination="false"
            size="small"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'fieldName'">
                <span>{{ record.ddlField.name }}</span>
              </template>

              <template v-if="column.key === 'ddlField'">
                <div class="ddl-field-cell">
                  <div class="ddl-field-info">
                    <strong>{{ record.ddlField.name }}</strong>
                    <div class="field-type">{{ record.ddlField.type }}</div>
                    <a-tag v-if="!record.ddlField.nullable" color="red" size="small"> 必填 </a-tag>
                    <a-tag
                      v-if="record.status === 'unmatched' || record.excelIndex === -1"
                      color="orange"
                      size="small"
                    >
                      未匹配
                    </a-tag>
                  </div>
                  <a-select
                    v-if="excelHeaders && excelHeaders.length > 0"
                    v-model:value="record.excelIndex"
                    style="width: 100%; max-width: 280px; margin-top: 8px"
                    placeholder="选择Excel列"
                    size="small"
                    @change="(value) => updateMapping(record.ddlField.name, value)"
                  >
                    <a-select-option :value="-1">未绑定</a-select-option>
                    <a-select-option
                      v-for="(header, idx) in excelHeaders || []"
                      :key="idx"
                      :value="idx"
                      :disabled="isColumnUsed(idx)"
                    >
                      {{ header }} (列{{ idx + 1 }})
                    </a-select-option>
                  </a-select>
                  <div v-else class="no-excel-hint">
                    <small>请先上传Excel文件</small>
                  </div>
                </div>
              </template>

              <template v-if="column.key === 'excelHeader'">
                <span v-if="record.excelIndex === -1 || !record.excelHeader">
                  <a-tag color="gray" size="small">未绑定</a-tag>
                </span>
                <span v-else>
                  {{ record.excelHeader }}
                  <a-tag
                    v-if="record.confidence && record.confidence !== 'manual'"
                    :color="getConfidenceColor(record.confidence)"
                    size="small"
                  >
                    {{ getConfidenceText(record.confidence) }}
                  </a-tag>
                  <a-tag v-else-if="record.confidence === 'manual'" color="purple" size="small">
                    手动
                  </a-tag>
                </span>
              </template>

              <template v-if="column.key === 'similarity'">
                <span v-if="record.excelIndex === -1 || !record.similarity">-</span>
                <a-progress
                  v-else
                  :percent="Math.round(record.similarity * 100)"
                  size="small"
                  :stroke-color="getSimilarityColor(record.similarity)"
                />
              </template>

              <template v-if="column.key === 'generatedByFunction'">
                <a-checkbox
                  v-model:checked="record.generatedByFunction"
                  @change="handleGeneratedByFunctionChange(record)"
                />
              </template>

              <template v-if="column.key === 'actions'">
                <a-space>
                  <a-button type="link" size="small" @click="clearMapping(record.ddlField.name)">
                    清除
                  </a-button>
                </a-space>
              </template>
            </template>
          </a-table>

          <div class="mapping-actions">
            <a-button @click="autoMatchFields">自动匹配</a-button>
            <a-button @click="clearAllMappings">清除所有</a-button>
            <a-button type="primary" @click="validateEnhancedMappings">验证映射</a-button>

            <!-- 自定义绑定操作 -->
            <a-divider type="vertical" />
            <a-switch
              v-model:checked="customBindingEnabled"
              checked-children="自定义绑定"
              un-checked-children="标准模式"
              size="small"
              @change="handleCustomBindingToggle"
            />
            <a-button
              type="dashed"
              @click="openCustomBindingModal"
              :disabled="!customBindingEnabled"
            >
              <template #icon><SettingOutlined /></template>
              配置绑定
            </a-button>
          </div>

          <!-- 自定义字段管理 -->
          <CustomFieldManager
            v-if="customBindingEnabled"
            :key="customFieldManagerKey"
            :custom-fields="customFieldsData"
            :custom-binding-manager="customBindingManager"
            @edit="handleEditCustomField"
            @delete="handleDeleteCustomField"
            @refresh="handleRefreshCustomFields"
          />

          <!-- 数据库类型选择 -->
          <div class="database-type-section">
            <h4>数据库类型</h4>
            <a-radio-group v-model:value="databaseType" button-style="solid">
              <a-radio-button value="mysql">MySQL</a-radio-button>
              <a-radio-button value="postgresql">PostgreSQL</a-radio-button>
              <a-radio-button value="sqlserver">SQL Server</a-radio-button>
            </a-radio-group>
            <div class="database-type-hint">
              <small>选择目标数据库类型，确保生成的SQL符合对应语法规范</small>
            </div>
          </div>
        </div>
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
                <a-button @click="toggleBeautifyOptions" type="dashed" size="small">
                  <template #icon><SettingOutlined /></template>
                  美化选项
                </a-button>
                <a-button @click="generateSql" type="primary" :loading="generating">
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
                <span class="option-value">{{ beautifyOptions.indentSpaces }}</span>
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
                <span class="option-value">{{ beautifyOptions.maxLineLength }}</span>
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
                <a-button @click="resetBeautifyOptions" size="small">重置默认</a-button>
                <a-button @click="applyBeautifyOptions" type="primary" size="small"
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
            <a-radio-group v-model:value="previewMode" button-style="solid" size="small">
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

            <a-empty v-if="operationLogs.length === 0" description="暂无操作日志" />
          </div>
        </div>
      </div>
    </div>

    <!-- 错误提示 -->
    <a-modal v-model:open="errorModalVisible" title="错误信息" width="600px" :footer="null">
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
  </div>
</template>

<script setup>
import { ref, computed, onMounted, h } from 'vue'
import { message, Modal } from 'ant-design-vue'
import {
  ReloadOutlined,
  PlayCircleOutlined,
  QuestionCircleOutlined,
  UploadOutlined,
  SettingOutlined,
  ClockCircleOutlined,
  CheckOutlined,
} from '@ant-design/icons-vue'

// 导入核心功能模块
import { useDdlParser } from '@/composables/useDdlParser'
import { useExcelParserEnhanced } from '@/composables/useExcelParserEnhanced'
import { useFieldMatcher } from '@/composables/useFieldMatcher'
import { useSqlGeneratorEnhanced } from '@/composables/useSqlGeneratorEnhanced'
import { useErrorHandler } from '@/composables/useErrorHandler'

// 导入组件
import SqlPreview from '@/components/SqlPreview/SqlPreview.vue'
import CustomBindingModal from '@/components/CustomBindingModal.vue'
import CustomFieldManager from '@/components/CustomFieldManager/CustomFieldManager.vue'
import BatchEditPanel from '@/components/BatchEditPanel/BatchEditPanel.vue'

/**
 * 简单的防抖函数
 * @param {Function} func - 要防抖的函数
 * @param {number} wait - 等待时间（毫秒）
 * @returns {Function} 防抖后的函数
 */
const createDebounce = (func, wait) => {
  let timeout = null
  return function executedFunction(...args) {
    const later = () => {
      timeout = null
      func.apply(this, args)
    }
    if (timeout) {
      clearTimeout(timeout)
    }
    timeout = setTimeout(later, wait)
  }
}

// 初始化核心功能模块
const { parseDdl: parseDdlWithParser, clearCache } = useDdlParser()
const { parseExcel: parseExcelEnhanced, getHeaders } = useExcelParserEnhanced()
const {
  fieldMappings,
  enhancedMatchFields,
  updateFieldMapping,
  validateEnhancedMappings,
  matchingStats,
  customBindingManager,
} = useFieldMatcher()

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
        field.customConfig?.dataSource === 'excel_combine' &&
        field.customConfig?.isFromConcatenationRule
      )
    }).length,
  }
})

/**
 * 过滤后的字段映射，使用DDL原始字段列表数据
 * 只保留DDL原始字段列表中存在的字段映射，排除来自字段拼接规则的excel_combine类型字段
 * 字段拼接规则创建的字段不出现在DDL原始字段列表中
 */
const filteredFieldMappings = computed(() => {
  return fieldMappings.value.filter((mapping) => {
    // 检查DDL字段是否存在于parsedFields中
    const ddlFieldExists = parsedFields.value.some((field) => field.name === mapping.ddlField?.name)

    // 如果字段不在parsedFields中，但标记为自定义字段，则保留
    if (!ddlFieldExists) {
      if (mapping.ddlField?.isCustom) {
        return true
      }
      return false
    }

    // 如果是自定义字段且数据源类型为excel_combine，并且来自字段拼接规则，则过滤掉
    if (
      mapping.ddlField?.isCustom &&
      mapping.ddlField?.customConfig?.dataSource === 'excel_combine' &&
      mapping.ddlField?.customConfig?.isFromConcatenationRule
    ) {
      return false
    }
    return true
  })
})

// 自定义绑定相关
const showCustomBindingModal = ref(false)
const editingCustomField = ref(null)
const customBindingEnabled = ref(false)
const hasCustomBindingConfig = computed(() => {
  const stats = customBindingManager.getBindingStats()
  return stats.hasCustomConfig
})

const customFieldsData = computed(() => {
  return Array.isArray(customBindingManager.customFields.value)
    ? customBindingManager.customFields.value
    : []
})

const customFieldManagerKey = computed(() => {
  const fields = customFieldsData.value
  const fieldCount = fields.length
  const fieldNames = fields
    .map((f) => f.fieldName)
    .sort()
    .join(',')
  return `custom-field-manager-${fieldCount}-${fieldNames}`
})

const {
  generateInsertSql,
  setBeautifyOptions,
  resetBeautifyOptions: resetDefaultBeautifyOptions,
} = useSqlGeneratorEnhanced()
const { logError, logInfo } = useErrorHandler()

// 响应式数据
const ddlStatement = ref('')
const parsedFields = ref([])
const fileList = ref([])
const uploadedFile = ref(null)
const excelData = ref([])
const excelHeaders = ref([])
const generatedSql = ref('')
const previewSql = ref('')
const previewMode = ref('original')
const batchEditRules = ref([])
const operationLogs = ref([])
const includeComments = ref(true) // 控制是否包含SQL注释
const databaseType = ref('mysql') // 数据库类型：mysql, postgresql, sqlserver

// 去重相关状态
const deduplicationEnabled = ref(false) // 是否启用去重
const deduplicationColumn = ref(undefined) // 去重列索引，undefined表示未选择
const deduplicationStats = ref({
  originalRows: 0, // 原始行数
  deduplicatedRows: 0, // 去重后行数
  removedRows: 0, // 去重数量
}) // 去重统计信息
const originalExcelData = ref([]) // 保存原始数据，用于多次去重切换

// 行范围选择相关状态
const rowRangeEnabled = ref(false) // 是否启用行范围选择
const startRow = ref(null) // 起始行
const endRow = ref(null) // 结束行
const includeHeader = ref(true) // 是否包含表头
const totalExcelRows = ref(0) // Excel文件总行数

// SQL美化相关数据
const showBeautifyOptions = ref(false)
const beautifyOptions = ref({
  indentSpaces: 4,
  formatStyle: 'expanded',
  keywordCase: 'upper',
  maxLineLength: 80,
  alignValues: true,
})

// 状态标志
const parsingDdl = ref(false)
const uploading = ref(false)
const generating = ref(false)
const errorModalVisible = ref(false)
const currentErrors = ref([])

// 计算属性
const showFieldMapping = computed(() => {
  return parsedFields.value.length > 0 && excelHeaders.value.length > 0
})

/**
 * 优化后的数据预览计算属性
 * 使用缓存和限制数据量来提升性能
 */
const previewData = computed(() => {
  if (!excelData.value || excelData.value.length === 0) {
    return []
  }

  const previewLimit = 10
  return excelData.value.slice(0, previewLimit).map((row, index) => ({
    key: `preview-${index}`,
    ...row,
  }))
})

/**
 * 优化后的预览列配置计算属性
 * 添加缓存和错误处理
 */
const previewColumns = computed(() => {
  // 如果没有表头，返回空数组
  if (!excelHeaders.value || excelHeaders.value.length === 0) {
    return []
  }

  // 限制列数量，避免过多列影响性能
  const maxColumns = 20
  const headersToDisplay = excelHeaders.value.slice(0, maxColumns)

  const columns = headersToDisplay.map((header, index) => ({
    title: `${header} (列${index + 1})`,
    dataIndex: index,
    key: `col-${index}`,
    ellipsis: true,
    width: 150, // 固定列宽，提升渲染性能
  }))

  return columns
})

const sqlStats = computed(() => {
  const sqlToCheck =
    previewMode.value === 'preview' && previewSql.value ? previewSql.value : generatedSql.value

  if (!sqlToCheck) {
    return { statementCount: 0, affectedRows: 0, generationTime: 0 }
  }

  const statements = sqlToCheck.split(';').filter((s) => s.trim())
  const affectedRows = excelData.value.length

  return {
    statementCount: statements.length,
    affectedRows,
    generationTime: 0, // 实际应该从生成过程中获取
  }
})

// 计算属性：显示的SQL（根据预览模式）
const displaySql = computed(() => {
  return previewMode.value === 'preview' && previewSql.value ? previewSql.value : generatedSql.value
})

const mappingColumns = [
  {
    title: '字段名',
    key: 'fieldName',
    width: '15%',
  },
  {
    title: 'DDL字段',
    key: 'ddlField',
    width: '30%',
  },
  {
    title: 'Excel列',
    key: 'excelHeader',
    width: '20%',
  },
  {
    title: '相似度',
    key: 'similarity',
    width: '10%',
  },
  {
    title: '函数生成',
    key: 'generatedByFunction',
    width: '10%',
  },
  {
    title: '操作',
    key: 'actions',
    width: '15%',
  },
]

// 方法
const handleDdlChange = () => {
  parsedFields.value = []
  logInfo('DDL语句已修改')
}

const parseDdl = async (forceRefresh = false) => {
  if (!ddlStatement.value.trim()) {
    message.warning('请输入DDL语句')
    return
  }

  parsingDdl.value = true

  try {
    const result = await parseDdlWithParser(ddlStatement.value, forceRefresh)
    parsedFields.value = result.fields.map((field) => ({
      ...field,
      excelIndex: -1,
    }))

    logInfo(`成功解析DDL语句，发现 ${result.fields.length} 个字段`)
    message.success(`DDL解析成功，发现 ${result.fields.length} 个字段`)

    // 立即创建映射记录，确保所有DDL字段都显示
    if (excelHeaders.value.length > 0) {
      // 如果已有Excel数据，执行自动匹配
      autoMatchFields()
    } else {
      // 如果没有Excel数据，创建手动映射模板
      enhancedMatchFields(parsedFields.value, [], 'manual')
    }
  } catch (error) {
    const friendlyError = logError(error, 'parsing', {
      operation: 'parseDdl',
      ddlLength: ddlStatement.value.length,
    })
    message.error(friendlyError)
  } finally {
    parsingDdl.value = false
  }
}

const beforeUpload = (file) => {
  const isValidType = ['xlsx', 'xls', 'csv'].some((ext) => file.name.toLowerCase().endsWith(ext))

  if (!isValidType) {
    message.error('只支持.xlsx、.xls、.csv格式的文件')
    return false
  }

  const isLt10M = file.size / 1024 / 1024 < 10
  if (!isLt10M) {
    message.error('文件大小不能超过10MB')
    return false
  }

  return true
}

const handleUpload = async (options) => {
  const { file, onSuccess, onError } = options
  uploading.value = true

  console.log('=== 文件上传调试信息开始 ===')
  console.log('上传的文件对象:', file)
  console.log('文件名称:', file?.name)
  console.log('文件大小:', file?.size)
  console.log('文件类型:', file?.type)

  try {
    uploadedFile.value = file

    console.log('开始解析Excel文件...')

    // 先解析一次获取总行数
    const initialResult = await parseExcelEnhanced(file, {
      sheetIndex: 0,
      maxRows: 10000,
    })

    totalExcelRows.value = initialResult.totalRows
    console.log('Excel文件总行数:', totalExcelRows.value)

    // 根据行范围设置解析参数
    const parseOptions = {
      sheetIndex: 0,
      maxRows: 10000,
    }

    // 如果启用了行范围选择，添加行范围参数
    if (rowRangeEnabled.value && startRow.value && endRow.value) {
      parseOptions.startRow = startRow.value
      parseOptions.endRow = endRow.value
      parseOptions.includeHeader = includeHeader.value
      console.log(
        `应用行范围: ${startRow.value} - ${endRow.value}, 包含表头: ${includeHeader.value}`,
      )
    }

    const result = await parseExcelEnhanced(file, parseOptions)

    console.log('Excel解析结果:', result)
    console.log('解析出的数据行数:', result.rows?.length || 0)
    console.log('解析出的表头数量:', result.headers?.length || 0)
    console.log('表头详情:', result.headers)

    excelData.value = result.rows
    excelHeaders.value = result.headers
    originalExcelData.value = [...result.rows] // 保存原始数据，用于去重功能

    console.log('excelData赋值后:', excelData.value?.length || 0)
    console.log('excelHeaders赋值后:', excelHeaders.value?.length || 0)

    onSuccess('文件上传成功')
    logInfo(`成功解析Excel文件，共 ${result.rows?.length || 0} 行数据`)
    message.success('文件解析成功')

    // 如果已有DDL字段，自动执行字段匹配
    if (parsedFields.value.length > 0) {
      console.log('开始自动字段匹配...')
      autoMatchFields()
    }

    console.log('=== 文件上传调试信息结束 ===')
  } catch (error) {
    console.error('文件上传和解析失败:', error)
    console.error('错误详情:', error.message)
    console.error('错误堆栈:', error.stack)

    const friendlyError = logError(error, 'file', {
      operation: 'parseExcel',
      fileName: file.name,
      fileSize: file.size,
    })
    onError(friendlyError)
    message.error(friendlyError)
  } finally {
    uploading.value = false
  }
}

/**
 * 清除上传的文件及相关数据
 * 重置Excel数据、表头、去重设置等所有文件相关状态
 */
const clearFile = () => {
  uploadedFile.value = null
  excelData.value = []
  excelHeaders.value = []
  originalExcelData.value = []
  fileList.value = []

  // 清除去重相关状态
  deduplicationEnabled.value = false
  deduplicationColumn.value = undefined
  deduplicationStats.value = {
    originalRows: 0,
    deduplicatedRows: 0,
    removedRows: 0,
  }

  // 清除行范围相关状态
  rowRangeEnabled.value = false
  startRow.value = null
  endRow.value = null
  includeHeader.value = true
  totalExcelRows.value = 0

  logInfo('已清除上传的文件及相关数据', 'file', {
    operation: 'clearFile',
    resetDeduplication: true,
    resetRowRange: true,
  })
  message.info('文件已清除')
}

/**
 * 处理去重开关切换
 * 当关闭去重时，恢复原始数据并清除所有去重相关设置
 * @param {boolean} checked - 去重开关状态
 */
const handleDeduplicationToggle = (checked) => {
  if (!checked) {
    // 恢复原始数据
    if (originalExcelData.value.length > 0) {
      const previousRowCount = excelData.value.length
      excelData.value = [...originalExcelData.value]
      const restoredRowCount = excelData.value.length

      logInfo(
        `数据去重已关闭，已恢复原始数据（${previousRowCount} 行 → ${restoredRowCount} 行）`,
        'deduplication',
        {
          operation: 'resetDeduplication',
          previousRowCount,
          restoredRowCount,
          restored: true,
        },
      )
      message.success(`数据去重已关闭，已恢复原始数据（${restoredRowCount} 行）`)
    } else {
      logInfo('数据去重已关闭（无原始数据可恢复）', 'deduplication', {
        operation: 'resetDeduplication',
        restored: false,
      })
      message.info('数据去重已关闭')
    }

    // 清除去重相关设置
    deduplicationColumn.value = undefined
    deduplicationStats.value = {
      originalRows: 0,
      deduplicatedRows: 0,
      removedRows: 0,
    }
  } else {
    logInfo('已启用数据去重，请选择去重列', 'deduplication', {
      operation: 'enableDeduplication',
    })
    message.info('已启用数据去重，请选择去重列')
  }
}

/**
 * 应用去重逻辑
 * 根据选定列的值去除重复数据行，仅保留每组的第一次出现
 * 始终基于原始数据进行去重，切换去重列时会恢复原始数据后再去重
 */
const applyDeduplication = () => {
  if (deduplicationColumn.value === undefined || deduplicationColumn.value === null) {
    message.warning('请先选择去重列')
    return
  }

  if (!excelData.value || excelData.value.length === 0) {
    message.warning('没有可去重的数据')
    return
  }

  // 如果有原始数据，先恢复原始数据再进行去重
  // 这样可以确保每次切换去重列时都基于原始数据计算
  if (originalExcelData.value.length > 0) {
    excelData.value = [...originalExcelData.value]
  }

  const columnIndex = deduplicationColumn.value
  const seenValues = new Set()
  const deduplicatedData = []

  excelData.value.forEach((row) => {
    const value = row[columnIndex]
    if (!seenValues.has(value)) {
      seenValues.add(value)
      deduplicatedData.push(row)
    }
  })

  const originalRows = excelData.value.length
  const deduplicatedRows = deduplicatedData.length
  const removedRows = originalRows - deduplicatedRows

  excelData.value = deduplicatedData

  deduplicationStats.value = {
    originalRows,
    deduplicatedRows,
    removedRows,
  }

  if (removedRows > 0) {
    logInfo(
      `数据去重完成: 原始 ${originalRows} 行 → 去重后 ${deduplicatedRows} 行 (去除 ${removedRows} 行重复)`,
      'deduplication',
      {
        operation: 'applyDeduplication',
        columnIndex,
        columnName: excelHeaders.value[columnIndex],
        originalRows,
        deduplicatedRows,
        removedRows,
      },
    )
    message.success(`去重完成: 原始 ${originalRows} 行 → 去重后 ${deduplicatedRows} 行`)
  } else {
    logInfo('数据去重完成: 未发现重复数据', 'deduplication', {
      operation: 'applyDeduplication',
      columnIndex,
      columnName: excelHeaders.value[columnIndex],
      originalRows,
      deduplicatedRows,
      removedRows,
    })
    message.info('未发现重复数据')
  }
}

/**
 * 处理行范围开关切换
 * 当关闭行范围选择时，恢复原始数据并清除所有行范围相关设置
 * @param {boolean} checked - 行范围开关状态
 */
const handleRowRangeToggle = (checked) => {
  if (!checked) {
    // 恢复原始数据
    if (originalExcelData.value.length > 0) {
      const previousRowCount = excelData.value.length
      excelData.value = [...originalExcelData.value]
      const restoredRowCount = excelData.value.length

      logInfo(
        `行范围选择已关闭，已恢复原始数据（${previousRowCount} 行 → ${restoredRowCount} 行）`,
        'row-range',
        {
          operation: 'resetRowRange',
          previousRowCount,
          restoredRowCount,
          restored: true,
        },
      )
      message.success(`行范围选择已关闭，已恢复原始数据（${restoredRowCount} 行）`)
    } else {
      logInfo('行范围选择已关闭（无原始数据可恢复）', 'row-range', {
        operation: 'resetRowRange',
        restored: false,
      })
      message.info('行范围选择已关闭')
    }

    // 清除行范围相关设置
    startRow.value = null
    endRow.value = null
    includeHeader.value = true
  } else {
    logInfo('已启用行范围选择，请设置起始行和结束行', 'row-range', {
      operation: 'enableRowRange',
    })
    message.info('已启用行范围选择，请设置起始行和结束行')
  }
}

/**
 * 应用行范围
 * 根据用户设置的行范围重新解析Excel文件
 */
const applyRowRange = async () => {
  if (!uploadedFile.value) {
    message.warning('请先上传Excel文件')
    return
  }

  if (!startRow.value || !endRow.value) {
    message.warning('请设置起始行和结束行')
    return
  }

  if (startRow.value > endRow.value) {
    message.error('起始行不能大于结束行')
    return
  }

  if (startRow.value > totalExcelRows.value || endRow.value > totalExcelRows.value) {
    message.error(`行数超出范围，文件总行数为 ${totalExcelRows.value}`)
    return
  }

  uploading.value = true

  try {
    // 如果需要保留原始表头，使用快速方法获取表头
    let headers = []
    let rows = []

    if (includeHeader.value) {
      // 优先使用已解析的excelHeaders作为表头
      if (excelHeaders.value && excelHeaders.value.length > 0) {
        headers = excelHeaders.value
        console.log('[applyRowRange] 使用已解析的excelHeaders:', headers)
      } else if (excelData.value && excelData.value.length > 0) {
        // 备用方案：从第一行数据中提取
        const firstRow = excelData.value[0]
        headers = Object.keys(firstRow)
        console.log('[applyRowRange] 从已解析数据中提取表头:', headers)
      } else {
        // 如果没有已解析数据，使用getHeaders
        headers = await getHeaders(uploadedFile.value, {
          sheetIndex: 0,
        })
      }

      // 如果设置了行范围，从原始数据中截取指定范围
      if (
        startRow.value &&
        endRow.value &&
        originalExcelData.value &&
        originalExcelData.value.length > 0
      ) {
        // originalExcelData.value是从第2行开始的数据（不包含表头）
        // 如果startRow=2, endRow=5，应该取originalExcelData.value的第1-4行（索引0-3）
        const startIndex = startRow.value - 1
        const endIndex = endRow.value - 1
        rows = originalExcelData.value.slice(startIndex, endIndex + 1)
      } else {
        // 没有设置行范围，使用原始数据
        rows = originalExcelData.value || []
      }
    } else {
      // 不包含表头的情况，直接解析数据范围
      const result = await parseExcelEnhanced(uploadedFile.value, {
        sheetIndex: 0,
        maxRows: 10000,
        startRow: startRow.value,
        endRow: endRow.value,
        includeHeader: false,
      })
      headers = result.headers
      rows = result.rows
    }

    excelData.value = rows
    excelHeaders.value = headers

    const selectedRowCount = rows.length
    logInfo(
      `行范围应用成功: ${startRow.value}-${endRow.value}，共 ${rows.length} 行数据`,
      'row-range',
      {
        operation: 'applyRowRange',
        startRow: startRow.value,
        endRow: endRow.value,
        includeHeader: includeHeader.value,
        selectedRowCount,
        actualRowCount: rows.length,
      },
    )
    message.success(`行范围应用成功，共 ${rows.length} 行数据`)

    // 如果已有DDL字段，使用防抖延迟执行字段匹配，避免频繁UI更新
    if (parsedFields.value.length > 0) {
      if (autoMatchFieldsDebounced) {
        autoMatchFieldsDebounced()
      }
    }
  } catch (error) {
    console.error('应用行范围失败:', error)

    let errorMessage = error.message || '未知错误'
    let userFriendlyMessage = errorMessage

    // 提供更友好的错误提示
    if (errorMessage.includes('无法识别表头信息')) {
      userFriendlyMessage =
        'Excel文件所有行都没有有效的表头数据，请检查文件内容或选择包含表头的行范围'
    } else if (errorMessage.includes('获取表头超时')) {
      userFriendlyMessage = '读取Excel表头超时，请检查文件是否过大或损坏'
    } else if (errorMessage.includes('工作表') && errorMessage.includes('为空')) {
      userFriendlyMessage = '所选工作表为空，请选择其他工作表'
    } else if (errorMessage.includes('没有找到有效的工作表')) {
      userFriendlyMessage = 'Excel文件中没有有效的工作表，请检查文件格式'
    } else if (errorMessage.includes('获取表头失败')) {
      userFriendlyMessage = '无法读取Excel表头，请检查文件格式和内容'
    }
    message.error(userFriendlyMessage)
  } finally {
    uploading.value = false
  }
}

/**
 * 重置行范围
 * 恢复到处理所有行
 */
const resetRowRange = async () => {
  if (!uploadedFile.value) {
    message.warning('请先上传Excel文件')
    return
  }

  uploading.value = true

  try {
    console.log('重置行范围，处理所有数据')

    const result = await parseExcelEnhanced(uploadedFile.value, {
      sheetIndex: 0,
      maxRows: 10000,
    })

    excelData.value = result.rows
    excelHeaders.value = result.headers
    originalExcelData.value = [...result.rows]

    startRow.value = null
    endRow.value = null

    logInfo(`行范围已重置，共 ${result.rows.length} 行数据`, 'row-range', {
      operation: 'resetRowRange',
      totalRowCount: result.rows.length,
    })
    message.success(`行范围已重置，共 ${result.rows.length} 行数据`)

    // 如果已有DDL字段，自动执行字段匹配
    if (parsedFields.value.length > 0) {
      autoMatchFields()
    }
  } catch (error) {
    console.error('重置行范围失败:', error)
    const friendlyError = logError(error, 'row-range', {
      operation: 'resetRowRange',
      errorMessage: error.message,
    })
    message.error(friendlyError)
  } finally {
    uploading.value = false
  }
}

const autoMatchFields = () => {
  if (parsedFields.value.length === 0 || excelHeaders.value.length === 0) {
    message.warning('请先解析DDL语句和上传Excel文件')
    return
  }

  try {
    enhancedMatchFields(parsedFields.value, excelHeaders.value, 'similarity')

    // 同步更新parsedFields中的excelIndex
    fieldMappings.value.forEach((mapping) => {
      const field = parsedFields.value.find((f) => f.name === mapping.ddlField.name)
      if (field) {
        field.excelIndex = mapping.excelIndex
      }
    })

    logInfo('自动字段匹配完成')
    message.success('字段自动匹配完成')
  } catch (error) {
    console.error('自动字段匹配失败:', error)
    const friendlyError = logError(error, 'matching', {
      operation: 'autoMatchFields',
      ddlFieldsCount: parsedFields.value.length,
      excelHeadersCount: excelHeaders.value.length,
    })
    message.error(friendlyError)
  }
}

// 防抖版本的自动字段匹配（延迟500ms执行，避免频繁UI更新）
const autoMatchFieldsDebounced = createDebounce(() => {
  if (parsedFields.value.length > 0 && excelHeaders.value.length > 0) {
    autoMatchFields()
  }
}, 500)

const updateMapping = (ddlFieldName, excelIndex) => {
  const excelHeader = excelIndex >= 0 ? excelHeaders.value[excelIndex] : null
  updateFieldMapping(ddlFieldName, excelHeader, excelIndex)
  logInfo(`手动更新字段映射: ${ddlFieldName} -> ${excelHeader || '未匹配'}`)
}

const handleGeneratedByFunctionChange = (record) => {
  const mapping = fieldMappings.value.find((m) => m.ddlField.name === record.ddlField.name)
  if (mapping) {
    mapping.generatedByFunction = record.generatedByFunction
    if (record.generatedByFunction) {
      logInfo(`字段 ${record.ddlField.name} 标记为通过函数生成，将跳过Excel列映射检查`)
    } else {
      logInfo(`字段 ${record.ddlField.name} 取消函数生成标记`)
    }
  }
}

const clearMapping = (ddlFieldName) => {
  console.log('执行clearMapping:', ddlFieldName)

  // 查找字段信息，判断是否为自定义字段
  const fieldInfo = parsedFields.value.find((field) => field.name === ddlFieldName)
  console.log('字段信息:', fieldInfo)

  // 从fieldMappings中移除对应的映射记录（无论是自定义字段还是普通字段）
  const mappingIndex = fieldMappings.value.findIndex(
    (mapping) => mapping.ddlField.name === ddlFieldName,
  )
  if (mappingIndex >= 0) {
    fieldMappings.value.splice(mappingIndex, 1)
    console.log('已从fieldMappings移除映射记录:', ddlFieldName)
  }

  if (fieldInfo && fieldInfo.isCustom) {
    // 1. 从parsedFields中移除自定义字段
    const fieldIndex = parsedFields.value.findIndex((field) => field.name === ddlFieldName)
    if (fieldIndex >= 0) {
      parsedFields.value.splice(fieldIndex, 1)
      console.log('已从parsedFields移除自定义字段:', ddlFieldName)
    }

    // 2. 从customBindingManager中移除自定义字段
    customBindingManager.removeCustomField(ddlFieldName)
    console.log('已从customBindingManager移除自定义字段:', ddlFieldName)

    logInfo(`移除自定义字段: ${ddlFieldName}`)
    message.info(`已移除自定义字段: ${ddlFieldName}`)
  } else {
    // 如果是普通字段，从fieldMappings中移除后就不再显示在界面上
    console.log('已移除普通字段映射记录:', ddlFieldName)
    logInfo(`移除字段映射记录: ${ddlFieldName}`)
    message.info(`已移除字段映射记录: ${ddlFieldName}`)
  }
}

const clearAllMappings = () => {
  // 移除所有自定义字段
  const originalLength = parsedFields.value.length
  parsedFields.value = parsedFields.value.filter((field) => !field.isCustom)
  const customFieldsRemoved = originalLength - parsedFields.value.length

  // 清除剩余普通字段的映射关系
  parsedFields.value.forEach((field) => {
    updateFieldMapping(field.name, null, -1)
  })

  if (customFieldsRemoved > 0) {
    logInfo(`已移除 ${customFieldsRemoved} 个自定义字段`)
    logInfo('已清除所有普通字段映射')
    message.info(`已移除 ${customFieldsRemoved} 个自定义字段并清除所有普通字段映射`)
  } else {
    logInfo('清除所有字段映射')
    message.info('已清除所有字段映射')
  }
}

const handleClearCache = () => {
  clearCache()
  logInfo('DDL解析缓存已清除')
  message.success('缓存已清除，下次解析将重新计算')
}

const isColumnUsed = (columnIndex) => {
  return fieldMappings.value.some((mapping) => mapping.excelIndex === columnIndex)
}

const getConfidenceColor = (confidence) => {
  const colors = {
    'very-high': 'green',
    high: 'blue',
    medium: 'orange',
    low: 'red',
    'very-low': 'gray',
    manual: 'purple',
  }
  return colors[confidence] || 'gray'
}

const getConfidenceText = (confidence) => {
  const texts = {
    'very-high': '极高',
    high: '高',
    medium: '中',
    low: '低',
    'very-low': '极低',
    manual: '手动',
  }
  return texts[confidence] || '未知'
}

const getSimilarityColor = (similarity) => {
  if (similarity >= 0.8) return '#52c41a'
  if (similarity >= 0.6) return '#1890ff'
  if (similarity >= 0.4) return '#faad14'
  return '#ff4d4f'
}

// SQL美化相关方法
const toggleBeautifyOptions = () => {
  const newState = !showBeautifyOptions.value
  showBeautifyOptions.value = newState

  logInfo(`SQL美化选项面板${newState ? '显示' : '隐藏'}`, 'beautify', {
    operation: 'toggleBeautifyOptions',
    operationType: 'beautify',
    isVisible: newState,
  })
}

const applyBeautifyOptions = async () => {
  try {
    // 记录美化选项应用前的状态
    const previousOptions = { ...beautifyOptions.value }

    // 应用美化选项到SQL生成器
    setBeautifyOptions(beautifyOptions.value)

    // 如果已有生成的SQL，重新应用美化
    if (generatedSql.value) {
      const tableName = extractTableName(ddlStatement.value)
      const sql = generateInsertSql(tableName, fieldMappings.value, excelData.value, {
        dbType: databaseType.value,
        format: 'formatted',
        batch: 100,
        comments: includeComments.value,
        beautifyOptions: beautifyOptions.value,
        customBindingManager: customBindingManager, // 添加customBindingManager参数
      })
      generatedSql.value = sql
    }

    // 记录详细的美化选项变更
    const optionChanges = getOptionChanges(previousOptions, beautifyOptions.value)
    logInfo('SQL美化选项已应用', 'beautify', {
      operation: 'applyBeautifyOptions',
      operationType: 'beautify',
      options: beautifyOptions.value,
      changes: optionChanges,
      hasSql: !!generatedSql.value,
      sqlLength: generatedSql.value ? generatedSql.value.length : 0,
    })
    message.success('美化选项已应用')
  } catch (error) {
    const friendlyError = logError(error, 'beautify', {
      operation: 'applyBeautifyOptions',
      operationType: 'beautify',
      options: beautifyOptions.value,
    })
    message.error(friendlyError)
  }
}

const resetBeautifyOptions = () => {
  const previousOptions = { ...beautifyOptions.value }

  beautifyOptions.value = {
    indentSpaces: 4,
    formatStyle: 'expanded',
    keywordCase: 'upper',
    maxLineLength: 80,
    alignValues: true,
  }
  resetDefaultBeautifyOptions()

  // 记录重置操作的详细信息
  const optionChanges = getOptionChanges(previousOptions, beautifyOptions.value)
  logInfo('SQL美化选项已重置为默认值', 'beautify', {
    operation: 'resetBeautifyOptions',
    operationType: 'beautify',
    previousOptions: previousOptions,
    newOptions: beautifyOptions.value,
    changes: optionChanges,
  })
  message.info('美化选项已重置')
}

// 获取美化选项变更详情
const getOptionChanges = (previous, current) => {
  const changes = []

  if (previous.indentSpaces !== current.indentSpaces) {
    changes.push(`缩进空格数: ${previous.indentSpaces} → ${current.indentSpaces}`)
  }

  if (previous.formatStyle !== current.formatStyle) {
    changes.push(`格式化风格: ${previous.formatStyle} → ${current.formatStyle}`)
  }

  if (previous.keywordCase !== current.keywordCase) {
    changes.push(`关键字大小写: ${previous.keywordCase} → ${current.keywordCase}`)
  }

  if (previous.maxLineLength !== current.maxLineLength) {
    changes.push(`最大行长度: ${previous.maxLineLength} → ${current.maxLineLength}`)
  }

  if (previous.alignValues !== current.alignValues) {
    changes.push(
      `垂直对齐: ${previous.alignValues ? '开启' : '关闭'} → ${current.alignValues ? '开启' : '关闭'}`,
    )
  }

  return changes.length > 0 ? changes : ['无变更']
}

const handleSqlCopy = () => {
  const beautifyStatus = showBeautifyOptions.value ? '应用美化' : '未美化'
  logInfo(`INSERT SQL语句已复制到剪贴板（${beautifyStatus}）`, 'copy', {
    beautifyOptions: beautifyOptions.value,
    includeComments: includeComments.value,
  })
}

const handleSqlDownload = () => {
  const beautifyStatus = showBeautifyOptions.value ? '应用美化' : '未美化'
  logInfo(`INSERT SQL语句已下载（${beautifyStatus}）`, 'download', {
    beautifyOptions: beautifyOptions.value,
    includeComments: includeComments.value,
  })
}

const generateSql = async () => {
  if (!parsedFields.value || parsedFields.value.length === 0) {
    message.warning('请先解析DDL语句')
    return
  }

  if (!excelData.value || excelData.value.length === 0) {
    message.warning('请先上传Excel文件')
    return
  }

  // 验证映射配置
  const validation = validateEnhancedMappings()
  if (!validation.isValid) {
    Modal.error({
      title: '字段映射配置不完整',
      content: h('div', [
        h('p', '以下字段存在问题，请修复后再生成SQL：'),
        h('ul', { style: { paddingLeft: '20px', marginTop: '10px' } }, [
          ...validation.errors.map((error) =>
            h('li', { style: { marginBottom: '5px', color: '#ff4d4f' } }, error),
          ),
        ]),
        h('p', { style: { marginTop: '15px', color: '#8c8c8c' } }, [
          '提示：对于通过函数生成的字段（如UUID主键），请在字段映射表格中勾选"函数生成"复选框',
        ]),
      ]),
      okText: '我知道了',
    })
    return
  }

  generating.value = true

  try {
    const tableName = extractTableName(ddlStatement.value)

    const mappingsToUse = fieldMappings.value
    const customFieldsConfig = customBindingManager.customFields
    const enableCustomBinding = customBindingEnabled.value

    // 生成SQL
    const sql = generateInsertSql(tableName, mappingsToUse, excelData.value, {
      dbType: databaseType.value,
      format: 'formatted',
      batch: 100,
      comments: includeComments.value,
      beautifyOptions: beautifyOptions.value,
      customBindingManager: customBindingManager,
    })

    generatedSql.value = sql

    const beautifyStatus = showBeautifyOptions.value ? '应用美化' : '未美化'
    const bindingMode = enableCustomBinding ? '自定义绑定模式' : '标准模式'

    logInfo(
      `SQL生成成功（${bindingMode}，${includeComments.value ? '包含注释' : '纯SQL'}，${beautifyStatus}）`,
      'generation',
      {
        mode: enableCustomBinding ? 'custom' : 'standard',
        beautifyOptions: beautifyOptions.value,
        includeComments: includeComments.value,
        customFieldsCount: customFieldsConfig.length,
      },
    )
    message.success('SQL生成成功')
  } catch (error) {
    const friendlyError = logError(error, 'generation', {
      operation: 'generateInsertSql',
      tableName: extractTableName(ddlStatement.value),
      dataRows: excelData.value ? excelData.value.length : 0,
    })
    message.error(friendlyError)
  } finally {
    generating.value = false
  }
}

const extractTableName = (ddl) => {
  // 支持多种DDL语句格式
  const patterns = [
    /CREATE TABLE\s+(?:IF NOT EXISTS\s+)?`?([^`\s(]+)`?/i,
    /CREATE TABLE\s+(?:IF NOT EXISTS\s+)?"?([^"\s(]+)"?/i,
    /CREATE TABLE\s+(?:IF NOT EXISTS\s+)?\[?([^\]\s(]+)\]?/i,
  ]

  for (const pattern of patterns) {
    const match = ddl.match(pattern)
    if (match) {
      // 移除可能的schema前缀（如public.）
      const tableName = match[1].replace(/^[^.]+\./, '')
      return tableName
    }
  }

  return 'unknown_table'
}

const getLogColor = (level, operationType) => {
  // 美化操作使用特殊颜色
  if (operationType === 'beautify') {
    return 'green'
  }

  const colors = {
    info: 'blue',
    warning: 'orange',
    error: 'red',
  }
  return colors[level] || 'gray'
}

const formatTime = (timestamp) => {
  return new Date(timestamp).toLocaleTimeString('zh-CN')
}

const formatLogMessage = (log) => {
  let message = log.message

  // 美化操作的特殊格式化
  if (log.context && log.context.operationType === 'beautify') {
    const operation = log.context.operation || 'unknown'

    switch (operation) {
      case 'toggleBeautifyOptions': {
        const isVisible = log.context.isVisible ? '显示' : '隐藏'
        message += ` (${isVisible}美化选项面板)`
        break
      }

      case 'applyBeautifyOptions':
        if (log.context.changes && log.context.changes.length > 0) {
          message += ` (变更: ${log.context.changes.join(', ')})`
        }
        break

      case 'resetBeautifyOptions':
        if (log.context.changes && log.context.changes.length > 0) {
          message += ` (重置项: ${log.context.changes.join(', ')})`
        }
        break
    }

    // 添加美化选项摘要
    if (log.context.options) {
      const options = log.context.options
      const summary = `[缩进:${options.indentSpaces}空格, 风格:${options.formatStyle}, 关键字:${options.keywordCase}]`
      message += ` ${summary}`
    }
  }

  return message
}

const clearLogs = () => {
  operationLogs.value = []
  logInfo('操作日志已清除')
}

const exportLogs = () => {
  // 实现日志导出功能
  message.info('日志导出功能开发中')
}

// 自定义绑定相关方法
const openCustomBindingModal = () => {
  showCustomBindingModal.value = true
}

const handleCustomBindingToggle = (checked) => {
  customBindingEnabled.value = checked
  customBindingManager.setEnableCustomBinding(checked)
  logInfo(`自定义绑定已${checked ? '启用' : '禁用'}`)
  message.success(`自定义绑定已${checked ? '启用' : '禁用'}`)
}

const handleCustomBindingSave = (customFieldsData) => {
  // 保存自定义绑定配置
  logInfo('自定义绑定配置已保存')
  console.log(
    '保存的自定义绑定配置:==================================================',
    customBindingManager,
  )

  try {
    // 确保自定义绑定已启用
    if (!customBindingEnabled.value) {
      customBindingEnabled.value = true
      customBindingManager.setEnableCustomBinding(true)
      logInfo('已自动启用自定义绑定')
    }

    // 1. 首先导入完整的绑定配置到customBindingManager
    if (customFieldsData && typeof customFieldsData === 'object') {
      customBindingManager.importBindings(customFieldsData)
      console.log('已导入完整绑定配置到customBindingManager')
    }

    // 2. 处理单列绑定（customBindings）- 同步到fieldMappings
    const customBindings = Array.isArray(customBindingManager.customBindings.value)
      ? customBindingManager.customBindings.value
      : []

    console.log('单列绑定数据:', customBindings)

    // 过滤出单列绑定
    const singleBindings = customBindings.filter((binding) => binding.bindingType === 'single')

    // 遍历单列绑定，更新或创建映射记录
    singleBindings.forEach((binding) => {
      const { ddlFieldName, excelIndex } = binding

      // 查找DDL字段
      let ddlField = parsedFields.value.find((field) => field.name === ddlFieldName)

      // 如果DDL字段不存在（可能是自定义字段名），创建临时字段对象
      if (!ddlField) {
        console.warn(`DDL字段 ${ddlFieldName} 不存在，创建临时字段对象`)
        ddlField = {
          name: ddlFieldName,
          type: 'string',
          nullable: true,
          isIdentity: false,
          primaryKey: false,
          isCustom: true, // 标记为自定义字段
          customConfig: {
            fieldName: ddlFieldName,
            isFromCustomBinding: true, // 标记来自自定义绑定
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
        // 添加到parsedFields中，确保后续可以找到
        parsedFields.value.push(ddlField)
        console.log(`已添加临时字段到parsedFields: ${ddlFieldName}`)
      }

      // 查找现有映射记录
      const existingIndex = fieldMappings.value.findIndex((m) => m.ddlField?.name === ddlFieldName)

      if (existingIndex >= 0) {
        // 更新现有映射记录
        fieldMappings.value[existingIndex] = {
          ...fieldMappings.value[existingIndex],
          excelIndex: excelIndex,
          excelHeader: excelIndex >= 0 ? excelHeaders.value[excelIndex] : null,
          status: excelIndex >= 0 ? 'bound' : 'unmatched',
        }
        console.log(`已更新单列绑定映射: ${ddlFieldName} -> 列${excelIndex + 1}`)
      } else {
        // 创建新的映射记录
        const mapping = {
          ddlField: ddlField,
          excelHeader: excelIndex >= 0 ? excelHeaders.value[excelIndex] : null,
          excelIndex: excelIndex,
          similarity: 0,
          confidence: 'manual',
          status: excelIndex >= 0 ? 'bound' : 'unmatched',
        }
        fieldMappings.value.push(mapping)
        console.log(`已添加单列绑定映射: ${ddlFieldName} -> 列${excelIndex + 1}`)
      }
    })

    // 3. 获取自定义字段数据，确保它是数组
    console.log('customFieldsData:', customFieldsData)
    console.log('customBindingManager.customFields.value:', customBindingManager.customFields.value)

    let customFields = []

    if (customFieldsData && customFieldsData.customFields) {
      customFields = Array.isArray(customFieldsData.customFields)
        ? customFieldsData.customFields
        : []
    } else {
      customFields = Array.isArray(customBindingManager.customFields.value)
        ? customBindingManager.customFields.value
        : []
    }

    console.log('customFields:', customFields)

    // 3. 去重处理：移除空字段名的自定义字段，并根据fieldName去重
    const validCustomFieldsMap = new Map()
    customFields.forEach((field) => {
      if (
        typeof field === 'object' &&
        field !== null &&
        field.fieldName &&
        field.fieldName.trim() !== ''
      ) {
        // 使用Map去重，保留最后一个出现的字段
        validCustomFieldsMap.set(field.fieldName.trim(), field)
      }
    })
    // 转换为数组
    const validCustomFields = Array.from(validCustomFieldsMap.values())

    console.log('有效自定义字段（去重后）:', validCustomFields)
    console.log('有效自定义字段数量:', validCustomFields.length)

    // 4. 先移除所有之前添加的自定义字段
    const originalLength = parsedFields.value.length
    parsedFields.value = parsedFields.value.filter((field) => !field.isCustom)
    logInfo(`已移除 ${originalLength - parsedFields.value.length} 个之前添加的自定义字段`)

    // 5. 遍历有效的自定义字段，整合到DDL解析结果中
    let addedCount = 0
    validCustomFields.forEach((customField, index) => {
      try {
        console.log(`添加自定义字段${index}:`, customField)

        // 检查是否已存在同名字段
        const existingFieldIndex = parsedFields.value.findIndex(
          (field) => field.name === customField.fieldName,
        )

        if (existingFieldIndex >= 0) {
          // 更新已存在的字段
          parsedFields.value[existingFieldIndex] = {
            ...parsedFields.value[existingFieldIndex],
            isCustom: true,
            customConfig: customField,
            isIdentity: false, // 自定义字段不应该被标记为数据库层的自增字段
            primaryKey: false, // 自定义字段不应该被标记为主键字段
            updatedAt: new Date().toISOString(),
          }
          console.log(`已更新parsedFields中的字段: ${customField.fieldName}`)
        } else {
          // 构建符合DDL解析结果结构的字段对象
          const ddlField = {
            name: customField.fieldName,
            type: customField.dataType || 'string',
            nullable: customField.nullable !== false,
            isIdentity: false, // 自定义字段不应该被标记为数据库层的自增字段
            primaryKey: false, // 自定义字段不应该被标记为主键字段
            isCustom: true, // 标记为自定义字段
            customConfig: customField, // 保存原始自定义字段配置
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }

          // 添加到DDL解析结果集合中
          parsedFields.value.push(ddlField)
          console.log(`已添加到parsedFields:`, ddlField.name)
        }

        addedCount++
        logInfo(`添加自定义字段: ${customField.fieldName}`)
      } catch (error) {
        logError(error, 'custom-field', {
          operation: 'addCustomField',
          customField: customField,
          errorMessage: error.message,
        })
        message.error(`处理自定义字段${customField.fieldName}时出错: ${error.message}`)
      }
    })

    logInfo(`成功添加 ${addedCount} 个自定义字段`)
    console.log('最终parsedFields:', parsedFields.value)
    console.log('最终parsedFields数量:', parsedFields.value.length)

    // 6. 为新添加的自定义字段创建或更新映射记录，并同步到 customBindingManager
    validCustomFields.forEach((customField) => {
      const ddlFieldRef = parsedFields.value.find((field) => field.name === customField.fieldName)

      const existingIndex = fieldMappings.value.findIndex(
        (m) => m.ddlField?.name === customField.fieldName,
      )

      if (existingIndex >= 0) {
        fieldMappings.value[existingIndex] = {
          ...fieldMappings.value[existingIndex],
          ddlField: ddlFieldRef,
          customFieldName: customField.fieldName,
          generatedByFunction: true,
        }
      } else {
        const mapping = {
          ddlField: ddlFieldRef,
          customFieldName: customField.fieldName,
          excelHeader: null,
          excelIndex: -1,
          similarity: 0,
          confidence: 'manual',
          status: 'unmatched',
          generatedByFunction: true,
        }
        fieldMappings.value.push(mapping)
      }

      // 将自定义字段添加到 customBindingManager，确保 enhancedMatchFields 能够获取到配置
      customBindingManager.addCustomField(customField)
    })

    console.log('最终fieldMappings:', fieldMappings.value)
    console.log('最终fieldMappings数量:', fieldMappings.value.length)

    if (parsedFields.value && excelHeaders.value) {
      fieldMappings.value = enhancedMatchFields(
        parsedFields.value,
        excelHeaders.value,
        'similarity',
        true,
      )
    }

    message.success(
      `自定义绑定配置已保存，成功处理 ${singleBindings.length} 个单列绑定和 ${addedCount} 个自定义字段`,
    )
  } catch (error) {
    logError(error, 'custom-binding', {
      operation: 'saveCustomBinding',
      errorMessage: error.message,
    })
    message.error(`自定义绑定保存失败: ${error.message}`)
  }
}

const handleCustomBindingCancel = () => {
  showCustomBindingModal.value = false
  editingCustomField.value = null
}

const handleEditCustomField = (record) => {
  logInfo(`编辑自定义字段: ${record.fieldName}`)
  editingCustomField.value = record
  openCustomBindingModal()
}

const handleDeleteCustomField = (record) => {
  logInfo(`删除自定义字段: ${record.fieldName}`)

  // 从fieldMappings中移除对应的映射记录
  const mappingIndex = fieldMappings.value.findIndex(
    (mapping) => mapping.ddlField?.name === record.fieldName,
  )
  if (mappingIndex >= 0) {
    fieldMappings.value.splice(mappingIndex, 1)
    console.log('已从fieldMappings移除自定义字段映射记录:', record.fieldName)
  }
}

const handleRefreshCustomFields = () => {
  logInfo('刷新自定义字段列表')
  // 删除自定义字段后不需要重新解析DDL，只需要更新字段映射
  // parseDdl(false)  // 注释掉，避免覆盖已配置的数据
}

/**
 * 重置所有数据和配置
 * 清除DDL、Excel数据、去重设置、自定义绑定等所有状态
 */
const resetAll = () => {
  ddlStatement.value = ''
  parsedFields.value = []
  uploadedFile.value = null
  excelData.value = []
  excelHeaders.value = []
  originalExcelData.value = []
  generatedSql.value = ''
  previewSql.value = ''
  previewMode.value = 'original'
  fileList.value = []

  // 清除去重相关状态
  deduplicationEnabled.value = false
  deduplicationColumn.value = undefined
  deduplicationStats.value = {
    originalRows: 0,
    deduplicatedRows: 0,
    removedRows: 0,
  }

  // 清除行范围相关状态
  rowRangeEnabled.value = false
  startRow.value = null
  endRow.value = null
  includeHeader.value = true
  totalExcelRows.value = 0

  handleClearCache()
  customBindingEnabled.value = false
  customBindingManager.resetBindings()

  logInfo('所有数据已重置', 'reset', {
    operation: 'resetAll',
    resetDeduplication: true,
    resetRowRange: true,
    resetCustomBinding: true,
  })
  message.success('重置成功')
}

/**
 * 处理批量预览
 * @param {Object} result - 预览结果
 */
const handleBatchPreview = (result) => {
  previewSql.value = generateSqlFromData(result.modifiedData)
  previewMode.value = 'preview'
  logInfo(`批量修改预览：将影响 ${result.affectedRows} 行数据`, 'batch-edit', {
    operation: 'preview',
    affectedRows: result.affectedRows,
  })
  message.info(`预览：将影响 ${result.affectedRows} 行数据`)
}

/**
 * 处理批量应用
 * @param {Object} result - 应用结果
 */
const handleBatchApply = (result) => {
  excelData.value = result.modifiedData
  generatedSql.value = generateSqlFromData(result.modifiedData)
  previewSql.value = ''
  previewMode.value = 'original'

  logInfo(`批量修改应用成功：已修改 ${result.affectedRows} 行数据`, 'batch-edit', {
    operation: 'apply',
    affectedRows: result.affectedRows,
  })
  message.success(`应用成功，已修改 ${result.affectedRows} 行数据`)
}

/**
 * 处理 Excel 数据更新
 * @param {Array} newData - 新的 Excel 数据
 */
const handleExcelDataUpdate = (newData) => {
  excelData.value = newData
}

/**
 * 处理批量修改规则变化
 * @param {Array} rules - 修改规则列表
 */
const handleBatchChange = (rules) => {
  batchEditRules.value = rules
}

/**
 * 从数据生成 SQL
 * @param {Array} data - 数据数组
 * @returns {string} 生成的 SQL
 */
const generateSqlFromData = (data) => {
  if (!data || data.length === 0) {
    return ''
  }

  const tableName = extractTableName(ddlStatement.value)
  const mappingsToUse = fieldMappings.value

  const sql = generateInsertSql(tableName, mappingsToUse, data, {
    dbType: databaseType.value,
    format: 'formatted',
    batch: 100,
    comments: includeComments.value,
    beautifyOptions: beautifyOptions.value,
    customBindingManager: customBindingManager,
  })

  return sql
}

// 生命周期
onMounted(() => {
  logInfo('INSERT页面已加载')
})
</script>

<style scoped>
.insert-page {
  padding: 0;
  min-height: 100%;
  background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%);
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding: 10px 20px;
  border-bottom: 1px solid #f0f0f0;
  background: #fafafa;
  border-radius: 8px;
}

.page-header h2 {
  margin: 0;
  color: #1890ff;
  font-size: 24px;
  font-weight: 600;
  margin-right: 20px;
}

.header-actions {
  display: flex;
  gap: 10px;
  margin-left: auto;
}

.content-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  min-height: 600px;
  width: 100%;
  max-width: 100%;
}

.input-section,
.output-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;
  overflow: hidden;
}

.input-card,
.output-card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow:
    0 4px 12px rgba(0, 0, 0, 0.08),
    0 2px 4px rgba(0, 0, 0, 0.04);
  border: 1px solid rgba(0, 0, 0, 0.06);
  overflow: hidden;
  position: relative;
  transition: all 0.2s ease;
}

.input-card:hover,
.output-card:hover {
  box-shadow:
    0 6px 16px rgba(0, 0, 0, 0.1),
    0 3px 6px rgba(0, 0, 0, 0.06);
  transform: translateY(-1px);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #f1f5f9;
}

.card-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #1e293b;
}

.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #f1f5f9;
}

.field-count {
  color: #666;
  font-size: 12px;
}

.ddl-fields-section {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #f0f0f0;
  overflow: hidden;
}

.ddl-fields-section .ant-table {
  font-size: 12px;
}

.ddl-fields-section .ant-table-container {
  overflow-x: auto;
}

.ddl-fields-section .ant-table-thead > tr > th {
  background: #fafafa;
  font-weight: 600;
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
  color: #666;
  font-size: 12px;
}

.mapping-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-bottom: 16px;
  padding: 16px;
  background: #fafafa;
  border-radius: 4px;
}

.mapping-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #f0f0f0;
}

.database-type-section {
  margin-top: 16px;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 6px;
  border: 1px solid #e9ecef;
}

.database-type-section h4 {
  margin: 0 0 12px 0;
  font-size: 14px;
  font-weight: 600;
  color: #495057;
}

.database-type-hint {
  margin-top: 8px;
  color: #6c757d;
  font-size: 12px;
}

.field-type {
  color: #666;
  font-size: 12px;
  margin-top: 2px;
}

.field-name-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.field-name-cell .ant-input {
  flex: 1;
}

.ddl-field-cell {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.ddl-field-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.no-excel-hint {
  padding: 8px;
  background: #fffbe6;
  border: 1px solid #ffe58f;
  border-radius: 4px;
  color: #fa8c16;
  text-align: center;
  margin-top: 8px;
}

.output-actions,
.log-actions {
  display: flex;
  gap: 8px;
}

.sql-preview {
  background: #f6f8fa;
  border: 1px solid #e1e4e8;
  border-radius: 4px;
  padding: 12px;
  max-height: 300px;
  overflow-y: auto;
  font-family: 'Courier New', monospace;
  font-size: 12px;
  line-height: 1.4;
}

.sql-code {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-all;
}

.sql-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #f0f0f0;
}

/* SQL美化选项面板样式 */
.beautify-options-panel {
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 6px;
  padding: 16px;
  margin-bottom: 16px;
}

/* 预览模式切换样式 */
.preview-mode-switch {
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 10;
  background: rgba(255, 255, 255, 0.95);
  padding: 4px;
  border-radius: 6px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.option-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 0;
  border-bottom: 1px solid #e9ecef;
}

.option-row:last-child {
  border-bottom: none;
}

.option-label {
  min-width: 120px;
  font-weight: 500;
  color: #495057;
  font-size: 14px;
}

.option-value {
  min-width: 30px;
  text-align: center;
  font-weight: 600;
  color: #1890ff;
  font-size: 14px;
}

.option-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #e9ecef;
}

.log-content {
  max-height: 200px;
  overflow-y: auto;
}

.log-time {
  margin: 0;
  color: #666;
  font-size: 12px;
}

.log-message {
  margin: 4px 0 0 0;
  font-size: 14px;
}

/* 响应式设计 */
@media (max-width: 1024px) {
  .content-grid {
    grid-template-columns: 1fr;
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

@media (max-width: 768px) {
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
}

@media (max-width: 480px) {
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
}

/* 去重配置样式 - 优化版 */
.deduplication-config {
  margin-top: 16px;
}

.deduplication-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: var(--card-bg, rgba(255, 255, 255, 0.85));
  backdrop-filter: blur(var(--backdrop-blur, 20px));
  -webkit-backdrop-filter: blur(var(--backdrop-blur, 20px));
  border: 1px solid var(--card-border, rgba(255, 255, 255, 0.5));
  border-radius: var(--border-radius-md, 12px);
  box-shadow: var(--shadow-sm, 0 2px 8px rgba(0, 0, 0, 0.08));
  transition: all var(--transition-normal, 200ms) ease;
}

.deduplication-header:hover {
  box-shadow: var(--shadow-md, 0 4px 16px rgba(0, 0, 0, 0.1));
}

.deduplication-controls {
  margin-top: 16px;
  padding: 20px;
  background: var(--card-bg, rgba(255, 255, 255, 0.85));
  backdrop-filter: blur(var(--backdrop-blur, 20px));
  -webkit-backdrop-filter: blur(var(--backdrop-blur, 20px));
  border: 1px solid var(--card-border, rgba(255, 255, 255, 0.5));
  border-radius: var(--border-radius-md, 12px);
  box-shadow: var(--shadow-sm, 0 2px 8px rgba(0, 0, 0, 0.08));
  transition: all var(--transition-normal, 200ms) ease;
}

.deduplication-controls:hover {
  box-shadow: var(--shadow-md, 0 4px 16px rgba(0, 0, 0, 0.1));
}

.deduplication-controls .ant-select {
  transition: all var(--transition-fast, 120ms) ease;
}

.deduplication-controls .ant-select:hover {
  box-shadow: 0 0 0 2px rgba(22, 119, 255, 0.1);
}

.deduplication-controls .ant-select-focused {
  box-shadow: 0 0 0 2px rgba(22, 119, 255, 0.3);
}

.deduplication-stats {
  margin-top: 16px;
  padding: 16px;
  background: linear-gradient(135deg, rgba(22, 119, 255, 0.05) 0%, rgba(20, 201, 201, 0.05) 100%);
  border: 1px solid rgba(22, 119, 255, 0.1);
  border-radius: var(--border-radius-sm, 8px);
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  transition: all var(--transition-normal, 200ms) ease;
}

.deduplication-stats:hover {
  background: linear-gradient(135deg, rgba(22, 119, 255, 0.08) 0%, rgba(20, 201, 201, 0.08) 100%);
  box-shadow: var(--shadow-sm, 0 2px 8px rgba(0, 0, 0, 0.08));
}

.deduplication-stats .ant-tag {
  background: white;
  border: 1px solid rgba(22, 119, 255, 0.2);
  color: var(--text-primary, #1f2937);
  font-weight: 500;
  padding: 6px 14px;
  border-radius: var(--border-radius-xs, 4px);
  transition: all var(--transition-fast, 120ms) ease;
}

.deduplication-stats .ant-tag:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-sm, 0 2px 8px rgba(0, 0, 0, 0.08));
}

.deduplication-stats .ant-tag.ant-tag-blue {
  border-color: rgba(59, 130, 246, 0.3);
  color: #3b82f6;
}

.deduplication-stats .ant-tag.ant-tag-green {
  border-color: rgba(16, 185, 129, 0.3);
  color: #10b981;
}

.deduplication-stats .ant-tag.ant-tag-orange {
  border-color: rgba(245, 158, 11, 0.3);
  color: #f59e0b;
}

/* 暗色主题支持 */
[data-theme='dark'] .deduplication-header {
  background: var(--card-bg, rgba(30, 41, 59, 0.6));
  border-color: var(--card-border, rgba(255, 255, 255, 0.1));
}

[data-theme='dark'] .deduplication-controls {
  background: var(--card-bg, rgba(30, 41, 59, 0.6));
  border-color: var(--card-border, rgba(255, 255, 255, 0.1));
}

[data-theme='dark'] .deduplication-stats {
  background: linear-gradient(135deg, rgba(22, 119, 255, 0.1) 0%, rgba(20, 201, 201, 0.1) 100%);
  border-color: rgba(22, 119, 255, 0.2);
}

[data-theme='dark'] .deduplication-stats .ant-tag {
  background: rgba(30, 41, 59, 0.8);
  border-color: rgba(22, 119, 255, 0.3);
  color: var(--text-primary, #f3f4f6);
}

/* 行范围选择样式 - 优化版 */
.row-range-config {
  margin-top: 16px;
}

.row-range-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: var(--card-bg, rgba(255, 255, 255, 0.85));
  backdrop-filter: blur(var(--backdrop-blur, 20px));
  -webkit-backdrop-filter: blur(var(--backdrop-blur, 20px));
  border: 1px solid var(--card-border, rgba(255, 255, 255, 0.5));
  border-radius: var(--border-radius-md, 12px);
  box-shadow: var(--shadow-sm, 0 2px 8px rgba(0, 0, 0, 0.08));
  transition: all var(--transition-normal, 200ms) ease;
}

.row-range-header:hover {
  box-shadow: var(--shadow-md, 0 4px 16px rgba(0, 0, 0, 0.1));
}

.row-range-controls {
  margin-top: 16px;
  padding: 20px;
  background: var(--card-bg, rgba(255, 255, 255, 0.85));
  backdrop-filter: blur(var(--backdrop-blur, 20px));
  -webkit-backdrop-filter: blur(var(--backdrop-blur, 20px));
  border: 1px solid var(--card-border, rgba(255, 255, 255, 0.5));
  border-radius: var(--border-radius-md, 12px);
  box-shadow: var(--shadow-sm, 0 2px 8px rgba(0, 0, 0, 0.08));
  transition: all var(--transition-normal, 200ms) ease;
}

.row-range-controls:hover {
  box-shadow: var(--shadow-md, 0 4px 16px rgba(0, 0, 0, 0.1));
}

.row-range-inputs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 16px;
}

.row-range-input {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.row-range-input label {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary, #1f2937);
  transition: color var(--transition-fast, 120ms) ease;
}

.row-range-input .ant-input-number {
  transition: all var(--transition-fast, 120ms) ease;
}

.row-range-input .ant-input-number:hover {
  box-shadow: 0 0 0 2px rgba(22, 119, 255, 0.1);
}

.row-range-input .ant-input-number:focus-within {
  box-shadow: 0 0 0 2px rgba(22, 119, 255, 0.3);
}

.row-range-options {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--card-border, rgba(255, 255, 255, 0.5));
  transition: all var(--transition-fast, 120ms) ease;
}

.row-range-options .ant-checkbox-wrapper {
  transition: all var(--transition-fast, 120ms) ease;
}

.row-range-options .ant-checkbox-wrapper:hover {
  color: var(--primary-gradient, linear-gradient(135deg, #1677ff 0%, #14c9c9 100%));
}

.row-range-options .ant-tag {
  background: linear-gradient(135deg, rgba(22, 119, 255, 0.1) 0%, rgba(20, 201, 201, 0.1) 100%);
  border: 1px solid rgba(22, 119, 255, 0.2);
  color: #1677ff;
  font-weight: 500;
  padding: 4px 12px;
  border-radius: var(--border-radius-xs, 4px);
  transition: all var(--transition-fast, 120ms) ease;
}

.row-range-options .ant-tag:hover {
  background: linear-gradient(135deg, rgba(22, 119, 255, 0.15) 0%, rgba(20, 201, 201, 0.15) 100%);
  transform: translateY(-1px);
}

.row-range-actions {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}

.row-range-actions .ant-btn {
  transition: all var(--transition-fast, 120ms) ease;
}

.row-range-actions .ant-btn:hover {
  transform: translateY(-1px);
  box-shadow: var(--shadow-sm, 0 2px 8px rgba(0, 0, 0, 0.08));
}

.row-range-actions .ant-btn:active {
  transform: scale(0.98);
}

.row-range-stats {
  margin-top: 16px;
  padding: 16px;
  background: linear-gradient(135deg, rgba(22, 119, 255, 0.05) 0%, rgba(20, 201, 201, 0.05) 100%);
  border: 1px solid rgba(22, 119, 255, 0.1);
  border-radius: var(--border-radius-sm, 8px);
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  transition: all var(--transition-normal, 200ms) ease;
}

.row-range-stats:hover {
  background: linear-gradient(135deg, rgba(22, 119, 255, 0.08) 0%, rgba(20, 201, 201, 0.08) 100%);
  box-shadow: var(--shadow-sm, 0 2px 8px rgba(0, 0, 0, 0.08));
}

.row-range-stats .ant-tag {
  background: white;
  border: 1px solid rgba(22, 119, 255, 0.2);
  color: var(--text-primary, #1f2937);
  font-weight: 500;
  padding: 6px 14px;
  border-radius: var(--border-radius-xs, 4px);
  transition: all var(--transition-fast, 120ms) ease;
}

.row-range-stats .ant-tag:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-sm, 0 2px 8px rgba(0, 0, 0, 0.08));
}

.row-range-stats .ant-tag.ant-tag-green {
  border-color: rgba(16, 185, 129, 0.3);
  color: #10b981;
}

.row-range-stats .ant-tag.ant-tag-orange {
  border-color: rgba(245, 158, 11, 0.3);
  color: #f59e0b;
}

/* 暗色主题支持 */
[data-theme='dark'] .row-range-header {
  background: var(--card-bg, rgba(30, 41, 59, 0.6));
  border-color: var(--card-border, rgba(255, 255, 255, 0.1));
}

[data-theme='dark'] .row-range-controls {
  background: var(--card-bg, rgba(30, 41, 59, 0.6));
  border-color: var(--card-border, rgba(255, 255, 255, 0.1));
}

[data-theme='dark'] .row-range-input label {
  color: var(--text-primary, #f3f4f6);
}

[data-theme='dark'] .row-range-options {
  border-bottom-color: var(--card-border, rgba(255, 255, 255, 0.1));
}

[data-theme='dark'] .row-range-stats {
  background: linear-gradient(135deg, rgba(22, 119, 255, 0.1) 0%, rgba(20, 201, 201, 0.1) 100%);
  border-color: rgba(22, 119, 255, 0.2);
}

[data-theme='dark'] .row-range-stats .ant-tag {
  background: rgba(30, 41, 59, 0.8);
  border-color: rgba(22, 119, 255, 0.3);
  color: var(--text-primary, #f3f4f6);
}

/* 响应式设计 */
@media (max-width: 768px) {
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
  }

  .row-range-actions .ant-btn {
    width: 100%;
  }

  .row-range-stats {
    flex-direction: column;
    gap: 8px;
  }
}

@media (max-width: 480px) {
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
