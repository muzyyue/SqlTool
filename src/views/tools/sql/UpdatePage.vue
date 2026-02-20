<template>
  <div class="update-page">
    <!-- 页面标题和操作 -->
    <div class="page-header">
      <h2>UPDATE语句生成</h2>
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
              <a-button type="link" size="small" @click="parseDdl" :loading="parsingDdl">
                解析DDL
              </a-button>
              <a-button
                type="link"
                size="small"
                @click="parseDdl"
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
          :show-cell-split="false"
          @upload="handleUpload"
          @clear-file="clearFile"
          @reparse="handleReparse"
          @deduplication-toggle="handleDeduplicationToggle"
          @deduplication-change="handleDeduplicationChange"
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

        <!-- 条件字段配置 -->
        <div class="input-card" v-if="parsedFields.length > 0">
          <div class="card-header">
            <h3>条件字段配置</h3>
            <a-tooltip title="选择用于WHERE条件的字段，通常为主键或唯一标识字段">
              <QuestionCircleOutlined />
            </a-tooltip>
          </div>

          <div class="condition-config">
            <div class="config-section">
              <h4>选择条件字段</h4>
              <a-select
                v-model:value="conditionFields"
                mode="multiple"
                style="width: 100%; max-width: 300px"
                placeholder="请选择条件字段"
                :max-tag-count="3"
              >
                <a-select-option
                  v-for="field in parsedFields"
                  :key="field.name"
                  :value="field.name"
                >
                  {{ field.name }} ({{ field.type }})
                </a-select-option>
              </a-select>
            </div>

            <div class="config-section">
              <h4>条件逻辑</h4>
              <a-radio-group v-model:value="conditionLogic" button-style="solid">
                <a-radio-button value="AND">AND（所有条件必须满足）</a-radio-button>
                <a-radio-button value="OR">OR（任一条件满足）</a-radio-button>
              </a-radio-group>
            </div>

            <div class="config-section">
              <h4>条件操作符</h4>
              <a-select v-model:value="conditionOperator" style="width: 100%">
                <a-select-option value="=">等于 (=)</a-select-option>
                <a-select-option value="LIKE">模糊匹配 (LIKE)</a-select-option>
                <a-select-option value="IN">包含 (IN)</a-select-option>
                <a-select-option value=">">大于 (>)</a-select-option>
                <a-select-option value="&lt;">小于 (&lt;)</a-select-option>
              </a-select>
            </div>
          </div>
        </div>

        <!-- 选择要修改的字段 -->
        <div class="input-card" v-if="parsedFields.length > 0">
          <div class="card-header">
            <h3>选择要修改的字段</h3>
            <a-tooltip title="选择需要在UPDATE语句中更新的字段，未选择的字段将不会被更新">
              <QuestionCircleOutlined />
            </a-tooltip>
          </div>

          <div class="update-fields-config">
            <a-checkbox-group v-model:value="updateFields" style="width: 100%">
              <a-row :gutter="[8, 8]">
                <a-col v-for="field in parsedFields" :key="field.name" :span="12">
                  <a-checkbox :value="field.name"> {{ field.name }} ({{ field.type }}) </a-checkbox>
                </a-col>
              </a-row>
            </a-checkbox-group>
            <div v-if="updateFields.length > 0" class="update-fields-summary">
              <a-tag color="blue">已选择 {{ updateFields.length }} 个字段</a-tag>
            </div>
          </div>
        </div>
      </div>

      <!-- 右侧：输出区域 -->
      <div class="output-section">
        <!-- SQL预览 -->
        <div class="output-card">
          <div class="card-header">
            <h3>生成的UPDATE语句</h3>
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
                  <a-radio value="standard">标准风格</a-radio>
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
                  checked-children="对齐"
                  un-checked-children="不对齐"
                  size="small"
                />
              </div>

              <div class="option-actions">
                <a-button @click="applyBeautifyOptions" type="primary" size="small">
                  应用美化
                </a-button>
                <a-button @click="resetBeautifyOptions" size="small"> 重置默认 </a-button>
              </div>
            </a-space>
          </div>

          <SqlPreview
            :sql="generatedSql"
            :stats="sqlStats"
            :beautify-options="beautifyOptions"
            :auto-validate="true"
            @copy="copySql"
            @download="downloadSql"
            @validate="handleSqlValidation"
          />
        </div>

        <!-- 条件预览 -->
        <div class="output-card" v-if="conditionFields.length > 0">
          <div class="card-header">
            <h3>条件预览</h3>
            <a-tooltip title="基于当前配置生成的WHERE条件示例">
              <QuestionCircleOutlined />
            </a-tooltip>
          </div>

          <div class="condition-preview">
            <div class="condition-example">
              <h4>WHERE条件示例：</h4>
              <code class="condition-code">
                {{ conditionPreview }}
              </code>
            </div>

            <div class="condition-info">
              <a-alert
                message="条件字段说明"
                :description="conditionDescription"
                type="info"
                show-icon
              />
            </div>
          </div>
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
                :color="getLogColor(log.level)"
              >
                <template #dot>
                  <ClockCircleOutlined />
                </template>
                <p class="log-time">{{ formatTime(log.timestamp) }}</p>
                <p class="log-message">{{ log.message }}</p>
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
        <template #tooltip>{{ isDark ? '切换亮色模式' : '切换暗色模式' }}</template>
      </a-float-button>
    </a-float-button-group>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, h } from 'vue'
import { message, Modal } from 'ant-design-vue'
import { storeToRefs } from 'pinia'
import {
  ReloadOutlined,
  PlayCircleOutlined,
  QuestionCircleOutlined,
  ClockCircleOutlined,
  SettingOutlined,
  VerticalAlignTopOutlined,
  BulbOutlined,
  BulbFilled,
} from '@ant-design/icons-vue'
import { useThemeStore } from '@/stores/theme.js'
import { useSettings } from '@/composables/core/useSettings.js'

const themeStore = useThemeStore()
const { isDark } = storeToRefs(themeStore)
const { getSetting } = useSettings()

const scrollToTop = () => {
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

const handleToggleTheme = () => {
  themeStore.toggle()
}

// 导入核心功能模块
import { useDdlParser } from '@/composables/sql/useDdlParser'
import { useExcelParserEnhanced } from '@/composables/excel/useExcelParserEnhanced'
import { useFieldMatcher } from '@/composables/data/useFieldMatcher'
import { useSqlGeneratorEnhanced } from '@/composables/sql/useSqlGeneratorEnhanced'
import { useErrorHandler } from '@/composables/core/useErrorHandler'
import { useDeduplication } from '@/composables/data/useDeduplication'
import { useRowRange } from '@/composables/data/useRowRange'
import { useBeautifyOptions } from '@/composables/data/useBeautifyOptions'
import { useOperationLog } from '@/composables/core/useOperationLog'

// 导入SQL预览组件
import SqlPreview from '@/components/SqlPreview/SqlPreview.vue'
import CustomBindingModal from '@/components/CustomBindingModal.vue'
import ExcelUploadCard from '@/components/ExcelUploadCard/ExcelUploadCard.vue'
import FieldMappingCard from '@/components/FieldMappingCard/FieldMappingCard.vue'

// 初始化核心功能模块
const { parseDdl: parseDdlWithParser, clearCache } = useDdlParser()
const { parseExcel: parseExcelEnhanced, getHeaders } = useExcelParserEnhanced()
const {
  fieldMappings,
  matchFields,
  updateFieldMapping,
  validateMappings: validateFieldMappings,
  validateEnhancedMappings,
  matchingStats,
  customBindingManager,
  resetMappings,
} = useFieldMatcher()
const {
  generateUpdateSql,
  setBeautifyOptions,
  resetBeautifyOptions: resetDefaultBeautifyOptions,
} = useSqlGeneratorEnhanced()
const { logError, logInfo, logWarning } = useErrorHandler()

const {
  deduplicationEnabled,
  deduplicationColumn,
  deduplicationStats,
  handleDeduplicationToggle: handleDeduplicationToggleBase,
  applyDeduplication: applyDeduplicationBase,
  setOriginalData,
  clearDeduplication,
} = useDeduplication()

const {
  rowRangeEnabled,
  startRow,
  endRow,
  includeHeader,
  totalExcelRows,
  resetRowRange: resetRowRangeState,
  setTotalRows,
  handleRowRangeToggle: handleRowRangeToggleBase,
} = useRowRange()

const {
  showBeautifyOptions,
  beautifyOptions,
  toggleBeautifyOptions: toggleBeautifyOptionsBase,
  resetBeautifyOptions: resetBeautifyOptionsBase,
  getOptionChanges,
} = useBeautifyOptions()

const {
  operationLogs,
  getLogColor,
  formatTime,
  clearLogs,
  exportLogs,
} = useOperationLog()

const ddlStatement = ref('')
const parsedFields = ref([])
const conditionFields = ref([])
const conditionLogic = ref('AND')
const conditionOperator = ref('=')
const updateFields = ref([])
const fileList = ref([])
const uploadedFile = ref(null)
const excelData = ref([])
const excelHeaders = ref([])
const originalExcelData = ref([])
const generatedSql = ref('')
const databaseType = ref('mysql')

// 自定义绑定相关
const customBindingEnabled = ref(false)
const showCustomBindingModal = ref(false)
const editingCustomField = ref(null)
const hasCustomBindingConfig = computed(() => {
  const stats = customBindingManager.getBindingStats()
  return stats.hasCustomConfig
})

const customFieldManagerKey = computed(() => {
  const fields = customFieldsData.value
  const fieldCount = fields.length
  const fieldNames = fields
    .map((f) => f.fieldName)
    .sort()
    .join(',')
  return `custom-fields-${fieldCount}-${fieldNames}`
})

const customFieldsData = computed(() => {
  const fields = Array.isArray(customBindingManager.customFields.value)
    ? customBindingManager.customFields.value
    : []

  const bindings = Array.isArray(customBindingManager.customBindings.value)
    ? customBindingManager.customBindings.value
    : []

  const rules = Array.isArray(customBindingManager.fieldConcatenationRules.value)
    ? customBindingManager.fieldConcatenationRules.value
    : []

  const allFields = [...fields]

  bindings.forEach((binding) => {
    if (binding.bindingType === 'single') {
      allFields.push({
        id: `binding-${binding.ddlFieldName}`,
        fieldName: binding.ddlFieldName,
        dataType: 'string',
        dataSource: 'single_binding',
        config: {
          excelIndex: binding.excelIndex,
        },
        isSingleBinding: true,
      })
    }
  })

  rules.forEach((rule) => {
    allFields.push({
      id: `rule-${rule.ddlFieldName}`,
      fieldName: rule.ddlFieldName,
      dataType: rule.dataType || 'string',
      dataSource: 'excel_combine',
      config: {
        sourceColumns: rule.sourceColumns,
        separator: rule.separator,
        format: rule.format,
      },
      isConcatenationRule: true,
    })
  })

  return allFields
})

// 增强匹配统计信息，用于UI显示
const enhancedMatchingStats = computed(() => {
  return {
    matchRate: matchingStats.value.matchRate || 0,
    matched: matchingStats.value.matched || 0,
    unmatched: matchingStats.value.unmatched || 0,
    total: matchingStats.value.total || 0,
    confidenceStats: matchingStats.value.confidenceStats || {},
    customBindings: customBindingManager.customBindingCount.value || 0,
    concatenationRules: customBindingManager.concatenationRuleCount.value || 0,
    customFields: customBindingManager.customFieldCount.value || 0,
  }
})

// 过滤后的字段映射，排除来自字段拼接规则的excel_combine类型字段
const filteredFieldMappings = computed(() => {
  return fieldMappings.value.filter((mapping) => {
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

// 状态标志
const parsingDdl = ref(false)
const uploading = ref(false)
const generating = ref(false)
const errorModalVisible = ref(false)
const currentErrors = ref([])

const includeComments = ref(true)

// 计算属性
const showFieldMapping = computed(() => {
  return parsedFields.value.length > 0 && excelHeaders.value.length > 0
})

const sqlStats = computed(() => {
  if (!generatedSql.value) {
    return { statementCount: 0, affectedRows: 0, generationTime: 0, fileSize: 0 }
  }

  const statements = generatedSql.value.split(';').filter((s) => s.trim())
  const affectedRows = excelData.value.length

  return {
    statementCount: statements.length,
    affectedRows,
    generationTime: 0, // 实际应该从生成过程中获取
    fileSize: new Blob([generatedSql.value]).size,
  }
})

const conditionPreview = computed(() => {
  if (conditionFields.value.length === 0) {
    return '请先选择条件字段'
  }

  const conditions = conditionFields.value.map((field) => {
    return `${field} ${conditionOperator.value} ?`
  })

  return `WHERE ${conditions.join(` ${conditionLogic.value} `)}`
})

const conditionDescription = computed(() => {
  if (conditionFields.value.length === 0) {
    return '请选择用于WHERE条件的字段，通常为主键或唯一标识字段'
  }

  return `已选择 ${conditionFields.value.length} 个条件字段，使用 ${conditionLogic.value} 逻辑连接`
})

/**
 * 监听字段选择变化，更新字段映射状态
 * 当用户选择/取消选择条件字段或更新字段时，同步更新映射状态
 */
watch(
  [() => conditionFields.value, () => updateFields.value],
  ([newConditionFields, newUpdateFields], [oldConditionFields, oldUpdateFields]) => {
    // 只有当数据已加载时才处理
    if (parsedFields.value.length === 0 || excelHeaders.value.length === 0) {
      return
    }

    // 检测是否有变化
    const conditionChanged =
      !oldConditionFields ||
      JSON.stringify(newConditionFields.sort()) !== JSON.stringify(oldConditionFields.sort())
    const updateChanged =
      !oldUpdateFields ||
      JSON.stringify(newUpdateFields.sort()) !== JSON.stringify(oldUpdateFields.sort())

    if (conditionChanged || updateChanged) {
      console.log('字段选择已变化，重新同步映射状态')
      // 重新同步所有字段的映射状态
      fieldMappings.value.forEach((mapping) => {
        const field = parsedFields.value.find((f) => f.name === mapping.ddlField.name)
        if (field) {
          // 确保映射记录存在且是最新的
          field.excelIndex = mapping.excelIndex
        }
      })
    }
  },
  { deep: true },
)

// 方法
const handleDdlChange = () => {
  parsedFields.value = []
  conditionFields.value = []
  logInfo('DDL语句已修改')
}

const parseDdl = async () => {
  if (!ddlStatement.value.trim()) {
    message.warning('请输入DDL语句')
    return
  }

  // 解析新DDL时清空之前的自定义字段数据
  customBindingEnabled.value = false
  customBindingManager.resetBindings()
  resetMappings()
  logInfo('解析新DDL，已清空之前的自定义字段数据')

  parsingDdl.value = true

  try {
    const result = await parseDdlWithParser(ddlStatement.value)
    parsedFields.value = result.fields

    // 自动选择可能的主键字段作为条件字段
    const primaryKeyFields = result.fields.filter(
      (field) =>
        field.name.toLowerCase().includes('id') ||
        field.name.toLowerCase().includes('key') ||
        field.name.toLowerCase().includes('code'),
    )

    if (primaryKeyFields.length > 0) {
      conditionFields.value = primaryKeyFields.map((field) => field.name)
    }

    logInfo(`成功解析DDL语句，发现 ${result.fields.length} 个字段`)
    message.success('DDL解析成功')

    // 如果已有Excel数据，自动执行字段匹配
    if (excelHeaders.value.length > 0) {
      autoMatchFields()
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

const handleUpload = async (options) => {
  const { file, onSuccess, onError } = options

  // 上传新文件时清空之前的自定义字段数据
  customBindingEnabled.value = false
  customBindingManager.resetBindings()
  resetMappings()
  logInfo('上传新文件，已清空之前的自定义字段数据')

  uploading.value = true

  try {
    uploadedFile.value = file

    const chunkSize = getSetting('chunkSize') || 1000
    const chunkProcessing = getSetting('chunkProcessing') !== false

    const initialResult = await parseExcelEnhanced(file, {
      sheetIndex: 0,
      maxRows: 10000,
      chunkSize: chunkProcessing ? chunkSize : 10000,
    })

    setTotalRows(initialResult.totalRows)

    const parseOptions = {
      sheetIndex: 0,
      maxRows: 10000,
      chunkSize: chunkProcessing ? chunkSize : 10000,
    }

    if (rowRangeEnabled.value && startRow.value && endRow.value) {
      parseOptions.startRow = startRow.value
      parseOptions.endRow = endRow.value
      parseOptions.includeHeader = includeHeader.value
    }

    const result = await parseExcelEnhanced(file, parseOptions)
    excelData.value = result.rows
    excelHeaders.value = result.headers
    originalExcelData.value = [...result.rows]

    setOriginalData(result.rows)

    onSuccess('文件上传成功')
    logInfo(`成功解析Excel文件，共 ${result.rows.length} 行数据`)
    message.success('文件解析成功')

    if (parsedFields.value.length > 0) {
      autoMatchFields()
    }
  } catch (error) {
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

const clearFile = () => {
  uploadedFile.value = null
  excelData.value = []
  excelHeaders.value = []
  originalExcelData.value = []
  fileList.value = []
  logInfo('已清除上传的文件')
}

const handleReparse = async () => {
  customBindingEnabled.value = false
  customBindingManager.resetBindings()
  resetMappings()
  logInfo('重新解析，已清空自定义字段数据')

  if (originalExcelData.value && originalExcelData.value.length > 0) {
    excelData.value = [...originalExcelData.value]
    if (excelHeaders.value && excelHeaders.value.length > 0) {
      message.success(`数据重新加载成功，共 ${excelData.value.length} 行数据`)
    }

    if (parsedFields.value.length > 0) {
      autoMatchFields()
    }

    logInfo('数据重新加载完成', 'file', {
      operation: 'reparse',
      rows: excelData.value.length,
      columns: excelHeaders.value?.length || 0,
    })
  } else {
    message.warning('没有可重新加载的数据')
  }
}

const autoMatchFields = () => {
  if (parsedFields.value.length === 0 || excelHeaders.value.length === 0) {
    message.warning('请先解析DDL语句和上传Excel文件')
    return
  }

  try {
    matchFields(parsedFields.value, excelHeaders.value, 'similarity')
    logInfo('自动字段匹配完成')
    message.success('字段自动匹配完成')
  } catch (error) {
    const friendlyError = logError(error, 'matching', {
      operation: 'autoMatchFields',
      ddlFieldsCount: parsedFields.value.length,
      excelHeadersCount: excelHeaders.value.length,
    })
    message.error(friendlyError)
  }
}

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
      logInfo(`字段 ${record.ddlField.name} 标记为自定义，将跳过Excel列映射检查`)
    } else {
      logInfo(`字段 ${record.ddlField.name} 取消自定义标记`)
    }
  }
}

const clearMapping = (ddlFieldName) => {
  console.log('执行clearMapping:', ddlFieldName)

  const fieldInfo = parsedFields.value.find((field) => field.name === ddlFieldName)

  const mappingIndex = fieldMappings.value.findIndex(
    (mapping) => mapping.ddlField.name === ddlFieldName,
  )

  if (fieldInfo && fieldInfo.isCustom) {
    // 自定义字段：删除整个映射记录和字段定义
    if (mappingIndex >= 0) {
      fieldMappings.value.splice(mappingIndex, 1)
      console.log('已从fieldMappings移除自定义字段映射记录:', ddlFieldName)
    }
    const fieldIndex = parsedFields.value.findIndex((field) => field.name === ddlFieldName)
    if (fieldIndex >= 0) {
      parsedFields.value.splice(fieldIndex, 1)
    }
    customBindingManager.removeCustomField(ddlFieldName)
    logInfo(`移除自定义字段: ${ddlFieldName}`)
    message.info(`已移除自定义字段: ${ddlFieldName}`)
  } else {
    // 普通DDL字段：删除映射记录
    if (mappingIndex >= 0) {
      fieldMappings.value.splice(mappingIndex, 1)
      console.log('已清除字段映射记录:', ddlFieldName)
    }

    // 从 updateFields 中移除被清除的字段（如果它不在条件字段中）
    const updateFieldIndex = updateFields.value.indexOf(ddlFieldName)
    if (updateFieldIndex !== -1 && !conditionFields.value.includes(ddlFieldName)) {
      updateFields.value.splice(updateFieldIndex, 1)
    }

    logInfo(`清除字段映射: ${ddlFieldName}`)
    message.info(`已清除字段映射: ${ddlFieldName}`)
  }
}

const clearAllMappings = () => {
  // 移除所有fieldMappings中的映射记录
  const originalCount = fieldMappings.value.length
  fieldMappings.value = []
  console.log(`已清除所有字段映射，共${originalCount}条记录`)

  // 清除所有 updateFields（除了条件字段）
  updateFields.value = updateFields.value.filter((field) => conditionFields.value.includes(field))

  logInfo('清除所有字段映射')
  message.info('已清除所有字段映射')
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

const generateSql = async () => {
  if (parsedFields.value.length === 0) {
    message.warning('请先解析DDL语句')
    return
  }

  if (excelData.value.length === 0) {
    message.warning('请先上传Excel文件')
    return
  }

  if (conditionFields.value.length === 0) {
    message.warning('请至少选择一个条件字段')
    return
  }

  if (updateFields.value.length === 0) {
    message.warning('请至少选择一个要更新的字段')
    return
  }

  const validation = validateFieldMappings()
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
          '提示：对于自定义字段（如UUID主键），请在字段映射表格中勾选"自定义"复选框',
        ]),
      ]),
      okText: '我知道了',
    })
    return
  }

  generating.value = true

  try {
    const tableName = extractTableName(ddlStatement.value)

    const sql = generateUpdateSql(
      tableName,
      fieldMappings.value,
      excelData.value,
      conditionFields.value,
      {
        dbType: databaseType.value,
        format: 'formatted',
        conditionLogic: conditionLogic.value,
        conditionOperator: conditionOperator.value,
        comments: includeComments.value,
        beautifyOptions: beautifyOptions.value,
        updateFields: updateFields.value,
        customBindingManager: customBindingManager,
      },
    )

    generatedSql.value = sql
    logInfo('UPDATE SQL生成成功')
    message.success('UPDATE SQL生成成功')
  } catch (error) {
    const friendlyError = logError(error, 'generation', {
      operation: 'generateUpdateSql',
      tableName: extractTableName(ddlStatement.value),
      dataRows: excelData.value.length,
      conditionFields: conditionFields.value,
    })
    message.error(friendlyError)
  } finally {
    generating.value = false
  }
}

const extractTableName = (ddl) => {
  const match = ddl.match(/CREATE TABLE\s+(?:IF NOT EXISTS\s+)?`?([^`\s(]+)`?/i)
  return match ? match[1] : 'unknown_table'
}

const handleSqlValidation = (validationResult) => {
  if (validationResult.hasErrors) {
    logWarning('SQL语法验证发现错误', 'validation', {
      errors: validationResult.errors,
    })
  } else {
    logInfo('SQL语法验证通过')
  }
}

const copySql = async (sql) => {
  try {
    await navigator.clipboard.writeText(sql || generatedSql.value)
    message.success('SQL已复制到剪贴板')
    logInfo('SQL语句已复制到剪贴板')
  } catch {
    message.error('复制失败')
    logError('SQL语句复制失败', 'copy', {
      sqlLength: sql ? sql.length : generatedSql.value.length,
    })
  }
}

const downloadSql = (sql) => {
  try {
    const sqlToDownload = sql || generatedSql.value
    const blob = new Blob([sqlToDownload], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const tableName = extractTableName(ddlStatement.value)
    a.download = `${tableName}_update.sql`
    a.click()
    URL.revokeObjectURL(url)
    message.success('SQL文件下载成功')
    logInfo('SQL语句已下载')
  } catch (error) {
    message.error('下载失败')
    logError('SQL语句下载失败', 'download', {
      error: error.message,
    })
  }
}

const handleClearCache = () => {
  clearCache()
  logInfo('DDL解析缓存已清除')
  message.success('缓存已清除，下次解析将重新计算')
}

const handleDeduplicationToggle = (e) => {
  const checked = typeof e === 'boolean' ? e : e?.target?.checked
  handleDeduplicationToggleBase(checked, excelData.value, logInfo)
}

const handleDeduplicationChange = (column) => {
  deduplicationColumn.value = column
  if (column !== undefined && column !== null) {
    applyDeduplication()
  }
}

const applyDeduplication = () => {
  applyDeduplicationBase(excelData.value, excelHeaders.value, logInfo)
}

const handleRowRangeToggle = (e) => {
  const checked = typeof e === 'boolean' ? e : e?.target?.checked
  handleRowRangeToggleBase(checked, logInfo)
  if (!checked) {
    startRow.value = null
    endRow.value = null
  }
}

const handleStartRowUpdate = (val) => {
  startRow.value = val
}

const handleEndRowUpdate = (val) => {
  endRow.value = val
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
    let headers = []
    let rows = []

    if (includeHeader.value) {
      if (excelHeaders.value && excelHeaders.value.length > 0) {
        headers = excelHeaders.value
      } else if (excelData.value && excelData.value.length > 0) {
        const firstRow = excelData.value[0]
        headers = Object.keys(firstRow)
      } else {
        headers = await getHeaders(uploadedFile.value, {
          sheetIndex: 0,
        })
      }

      if (
        startRow.value &&
        endRow.value &&
        originalExcelData.value &&
        originalExcelData.value.length > 0
      ) {
        const startIndex = startRow.value - 1
        const endIndex = endRow.value - 1
        rows = originalExcelData.value.slice(startIndex, endIndex + 1)
      } else {
        rows = originalExcelData.value || []
      }
    } else {
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
    const result = await parseExcelEnhanced(uploadedFile.value, {
      sheetIndex: 0,
      maxRows: 10000,
    })

    excelData.value = result.rows
    excelHeaders.value = result.headers

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
  logInfo('自定义绑定配置已保存')
  console.log('保存的自定义绑定配置:', customFieldsData)

  try {
    if (customFieldsData && typeof customFieldsData === 'object') {
      customBindingManager.importBindings(customFieldsData)
      console.log('已导入完整绑定配置到customBindingManager')
    }

    const customBindings = Array.isArray(customBindingManager.customBindings.value)
      ? customBindingManager.customBindings.value
      : []

    console.log('单列绑定数据:', customBindings)

    const singleBindings = customBindings.filter((binding) => binding.bindingType === 'single')

    singleBindings.forEach((binding) => {
      const { ddlFieldName, excelIndex } = binding

      let ddlField = parsedFields.value.find((field) => field.name === ddlFieldName)

      if (!ddlField) {
        console.warn(`DDL字段 ${ddlFieldName} 不存在，创建临时字段对象`)
        ddlField = {
          name: ddlFieldName,
          type: 'string',
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
        }
        parsedFields.value.push(ddlField)
        console.log(`已添加临时字段到parsedFields: ${ddlFieldName}`)
      }

      const existingIndex = fieldMappings.value.findIndex((m) => m.ddlField?.name === ddlFieldName)

      if (existingIndex >= 0) {
        fieldMappings.value[existingIndex] = {
          ...fieldMappings.value[existingIndex],
          excelIndex: excelIndex,
          excelHeader: excelIndex >= 0 ? excelHeaders.value[excelIndex] : null,
          status: excelIndex >= 0 ? 'bound' : 'unmatched',
        }
        console.log(`已更新单列绑定映射: ${ddlFieldName} -> 列${excelIndex + 1}`)
      } else {
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

    // 2.5. 处理字段拼接规则中的自定义字段名称
    const fieldConcatenationRules = Array.isArray(
      customBindingManager.fieldConcatenationRules.value,
    )
      ? customBindingManager.fieldConcatenationRules.value
      : []

    console.log('字段拼接规则数据:', fieldConcatenationRules)

    // 从字段拼接规则中提取自定义字段
    fieldConcatenationRules.forEach((rule) => {
      console.log('处理字段拼接规则:', rule)
      console.log('  ddlFieldName:', rule.ddlFieldName)
      console.log('  sourceColumns:', rule.sourceColumns)

      // 使用 ddlFieldName 作为自定义字段名称
      if (rule.ddlFieldName && rule.ddlFieldName.trim() !== '') {
        // 注意：拼接规则已经存储在 fieldConcatenationRules 中
        // 不需要再调用 addCustomField，否则会在 customFieldsData 中重复显示

        const customConfig = {
          fieldName: rule.ddlFieldName,
          dataType: rule.dataType || 'string',
          dataSource: 'excel_combine',
          excelCombineConfig: {
            columns: rule.sourceColumns || [],
            separator: rule.separator || '',
            format: rule.format || '',
            isFromConcatenationRule: true,
          },
        }

        // 创建或更新 ddlField 和 mapping
        let ddlField = parsedFields.value.find((field) => field.name === rule.ddlFieldName)

        if (!ddlField) {
          ddlField = {
            name: rule.ddlFieldName,
            type: rule.dataType || 'string',
            nullable: true,
            isIdentity: false,
            primaryKey: false,
            isCustom: true,
            customConfig: customConfig,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }
          parsedFields.value.push(ddlField)
          console.log(`已添加拼接字段到parsedFields: ${rule.ddlFieldName}`)
        } else {
          const existingFieldIndex = parsedFields.value.findIndex(
            (field) => field.name === rule.ddlFieldName,
          )
          if (existingFieldIndex >= 0) {
            parsedFields.value[existingFieldIndex] = {
              ...parsedFields.value[existingFieldIndex],
              isCustom: true,
              customConfig: customConfig,
              type: rule.dataType || parsedFields.value[existingFieldIndex].type,
              updatedAt: new Date().toISOString(),
            }
            console.log(`已更新拼接字段配置: ${rule.ddlFieldName}`)
          }
        }

        const existingMappingIndex = fieldMappings.value.findIndex(
          (m) => m.ddlField?.name === rule.ddlFieldName,
        )

        if (existingMappingIndex >= 0) {
          const existingMapping = fieldMappings.value[existingMappingIndex]
          const updatedDdlField = parsedFields.value.find((f) => f.name === rule.ddlFieldName) || existingMapping.ddlField

          fieldMappings.value[existingMappingIndex] = {
            ...existingMapping,
            ddlField: updatedDdlField,
            excelIndex: -1,
            excelHeader: null,
            status: 'unmatched',
            confidence: 'manual',
            generatedByFunction: true,
          }
          console.log(`已更新拼接字段映射: ${rule.ddlFieldName}`)
        } else {
          const mapping = {
            ddlField: ddlField,
            excelHeader: null,
            excelIndex: -1,
            similarity: 0,
            confidence: 'manual',
            status: 'unmatched',
            generatedByFunction: true,
          }
          fieldMappings.value.push(mapping)
          console.log(`已添加拼接字段映射: ${rule.ddlFieldName}`)
        }
      } else {
        console.log('跳过规则，ddlFieldName为空')
      }
    })

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

    const validCustomFieldsMap = new Map()
    const duplicateFieldNames = new Set()
    customFields.forEach((field) => {
      if (
        typeof field === 'object' &&
        field !== null &&
        field.fieldName &&
        field.fieldName.trim() !== ''
      ) {
        // 检查是否已存在相同fieldName
        if (validCustomFieldsMap.has(field.fieldName.trim())) {
          duplicateFieldNames.add(field.fieldName.trim())
        }
        // 使用fieldName作为key，但保留所有字段（通过数组存储）
        if (!validCustomFieldsMap.has(field.fieldName.trim())) {
          validCustomFieldsMap.set(field.fieldName.trim(), [])
        }
        validCustomFieldsMap.get(field.fieldName.trim()).push(field)
      }
    })

    // 如果发现重复，提示用户
    if (duplicateFieldNames.size > 0) {
      message.warning(
        `发现重复的自定义字段名：${Array.from(duplicateFieldNames).join(', ')}，将保留所有字段`,
      )
    }

    // 将Map转换为数组（展平）
    const validCustomFields = Array.from(validCustomFieldsMap.values()).flat()

    console.log('有效自定义字段（去重后）:', validCustomFields)
    console.log('有效自定义字段数量:', validCustomFields.length)

    const originalLength = parsedFields.value.length
    parsedFields.value = parsedFields.value.filter((field) => !field.isCustom)
    logInfo(`已移除 ${originalLength - parsedFields.value.length} 个之前添加的自定义字段`)

    let addedCount = 0
    validCustomFields.forEach((customField, index) => {
      try {
        console.log(`添加自定义字段${index}:`, customField)

        const ddlField = {
          name: customField.fieldName,
          type: customField.dataType || 'string',
          nullable: customField.nullable !== false,
          isIdentity: customField.isIdentity || false,
          primaryKey: customField.primaryKey || false,
          isCustom: true,
          customConfig: customField,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }

        parsedFields.value.push(ddlField)
        console.log(`已添加到parsedFields:`, ddlField.name)

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

    validCustomFields.forEach((customField) => {
      const ddlFieldRef = parsedFields.value.find((field) => field.name === customField.fieldName)

      const existingIndex = fieldMappings.value.findIndex(
        (m) => m.ddlField?.name === customField.fieldName,
      )

      if (existingIndex >= 0) {
        fieldMappings.value[existingIndex] = {
          ...fieldMappings.value[existingIndex],
          ddlField: ddlFieldRef,
        }
        console.log('已更新映射记录:', customField.fieldName)
      } else {
        const mapping = {
          ddlField: ddlFieldRef,
          excelHeader: null,
          excelIndex: -1,
          similarity: 0,
          confidence: 'manual',
          status: 'unmatched',
        }
        fieldMappings.value.push(mapping)
        console.log('已添加映射记录:', customField.fieldName)
      }
    })

    console.log('最终fieldMappings:', fieldMappings.value)
    console.log('最终fieldMappings数量:', fieldMappings.value.length)
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
  logInfo(`删除: ${record.fieldName}`)

  const dataSource = record.dataSource

  // 从fieldMappings中移除对应的映射记录
  const mappingIndex = fieldMappings.value.findIndex(
    (mapping) => mapping.ddlField?.name === record.fieldName,
  )
  if (mappingIndex >= 0) {
    fieldMappings.value.splice(mappingIndex, 1)
    console.log('已从fieldMappings移除映射记录:', record.fieldName)
  }

  // 根据数据来源从parsedFields中移除对应的字段定义
  if (dataSource === 'single_binding') {
    // 单列绑定：不需要从parsedFields移除，因为它是DDL字段
  } else if (dataSource === 'excel_combine') {
    // 拼接规则：从parsedFields移除自定义字段
    const fieldIndex = parsedFields.value.findIndex((field) => field.name === record.fieldName)
    if (fieldIndex >= 0) {
      parsedFields.value.splice(fieldIndex, 1)
    }
  } else {
    // 自定义字段：从parsedFields移除
    const fieldIndex = parsedFields.value.findIndex((field) => field.name === record.fieldName)
    if (fieldIndex >= 0) {
      parsedFields.value.splice(fieldIndex, 1)
    }
  }
}

const handleRefreshCustomFields = () => {
  logInfo('刷新自定义字段列表')
}

const handleDatabaseTypeChange = (type) => {
  databaseType.value = type
  logInfo(`数据库类型已切换为: ${type}`, 'database', {
    operation: 'changeDatabaseType',
    databaseType: type,
  })
}

const toggleBeautifyOptions = () => {
  toggleBeautifyOptionsBase(logInfo)
}

const applyBeautifyOptions = async () => {
  try {
    setBeautifyOptions(beautifyOptions.value)

    if (generatedSql.value) {
      const tableName = extractTableName(ddlStatement.value)
      const sql = generateUpdateSql(
        tableName,
        fieldMappings.value,
        excelData.value,
        conditionFields.value,
        {
          dbType: databaseType.value,
          format: 'formatted',
          conditionLogic: conditionLogic.value,
          conditionOperator: conditionOperator.value,
          comments: includeComments.value,
          updateFields: updateFields.value,
          beautifyOptions: beautifyOptions.value,
          customBindingManager: customBindingManager,
        },
      )
      generatedSql.value = sql
    }

    const previousOptions = { indentSpaces: 4, formatStyle: 'expanded', keywordCase: 'upper', maxLineLength: 80, alignValues: true }
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
  resetBeautifyOptionsBase(logInfo, resetDefaultBeautifyOptions)
}

const resetAll = () => {
  ddlStatement.value = ''
  parsedFields.value = []
  conditionFields.value = []
  conditionLogic.value = 'AND'
  conditionOperator.value = '='
  updateFields.value = []
  uploadedFile.value = null
  excelData.value = []
  excelHeaders.value = []
  generatedSql.value = ''
  fileList.value = []
  clearCache()
  clearDeduplication()
  resetRowRangeState()
  customBindingEnabled.value = false
  customBindingManager.resetBindings()

  logInfo('所有数据已重置')
  message.success('重置成功')
}

// 生命周期
onMounted(() => {
  logInfo('UPDATE页面已加载')
})
</script>

<style scoped lang="scss">
.update-page {
  padding: 0;
  min-height: 100%;
  background: $page-bg-gradient;
}

.page-header {
  @include flex-between;
  margin-bottom: 24px;
  padding: 10px 20px;
  border-bottom: 1px solid $page-header-border;
  background: $page-header-bg;
  border-radius: $border-radius-sm;

  h2 {
    margin: 0;
    color: $page-header-title;
    font-size: 24px;
    font-weight: 600;
    margin-right: 20px;
  }
}

.header-actions {
  display: flex;
  gap: 10px;
  margin-left: auto;
}

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

.input-card,
.output-card {
  @include card-base;
  @include card-hover;
  border-radius: $border-radius-lg;
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

.condition-config {
  @include flex-column;
  gap: 16px;
}

.config-section h4 {
  margin: 0 0 8px 0;
  color: $text-primary;
  font-size: 14px;
  font-weight: 500;
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

.mapping-stats {
  @include stats-grid(3);
  margin-bottom: 16px;
}

.mapping-actions {
  display: flex;
  gap: 8px;
  margin-top: 16px;
  padding-top: 16px;
  @include divider-top;
}

.field-type {
  color: $text-secondary;
  font-size: 12px;
  margin-top: 2px;
}

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
  @include stats-grid(3);
  margin-top: 16px;
  padding-top: 16px;
  @include divider-top;
}

// SQL美化选项面板样式
.beautify-options-panel {
  @include panel-base;
  border-radius: $border-radius-sm;
  margin-bottom: 16px;
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

.condition-preview {
  @include flex-column;
  gap: 16px;
  @include divider-top;
}

.condition-example h4 {
  margin: 0 0 8px 0;
  color: $text-primary;
  font-size: 14px;
  font-weight: 500;
}

.condition-code {
  background: $code-bg;
  border: 1px solid $border-default;
  border-radius: $border-radius-xs;
  padding: 8px 12px;
  font-family: 'Courier New', monospace;
  font-size: 12px;
  color: $text-primary;
  display: block;
  white-space: pre-wrap;
}

.condition-info {
  margin-top: 8px;
}

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

// 响应式设计
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

  .condition-config {
    gap: 12px;
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

  .condition-example h4 {
    font-size: 13px;
  }

  .condition-code {
    font-size: 11px;
    padding: 6px 10px;
  }
}

// 去重配置样式 - 优化版
.deduplication-config {
  margin-top: 16px;
}

.deduplication-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: $card-bg;
  backdrop-filter: blur($backdrop-blur);
  -webkit-backdrop-filter: blur($backdrop-blur);
  border: 1px solid $card-border;
  border-radius: $border-radius-md;
  box-shadow: $shadow-sm;
  transition: all $transition-normal ease;

  &:hover {
    box-shadow: $shadow-md;
  }
}

.deduplication-controls {
  margin-top: 16px;
  padding: 20px;
  background: $card-bg;
  backdrop-filter: blur($backdrop-blur);
  -webkit-backdrop-filter: blur($backdrop-blur);
  border: 1px solid $card-border;
  border-radius: $border-radius-md;
  box-shadow: $shadow-sm;
  transition: all $transition-normal ease;

  &:hover {
    box-shadow: $shadow-md;
  }

  .ant-select {
    transition: all $transition-fast ease;

    &:hover {
      box-shadow: 0 0 0 2px rgba(22, 119, 255, 0.1);
    }
  }

  .ant-select-focused {
    box-shadow: 0 0 0 2px rgba(22, 119, 255, 0.3);
  }
}

.deduplication-stats {
  margin-top: 16px;
  padding: 16px;
  background: linear-gradient(135deg, rgba(22, 119, 255, 0.05) 0%, rgba(20, 201, 201, 0.05) 100%);
  border: 1px solid rgba(22, 119, 255, 0.1);
  border-radius: $border-radius-sm;
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  transition: all $transition-normal ease;

  &:hover {
    background: linear-gradient(135deg, rgba(22, 119, 255, 0.08) 0%, rgba(20, 201, 201, 0.08) 100%);
    box-shadow: $shadow-sm;
  }

  .ant-tag {
    background: white;
    border: 1px solid rgba(22, 119, 255, 0.2);
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
      border-color: rgba(59, 130, 246, 0.3);
      color: #3b82f6;
    }

    &.ant-tag-green {
      border-color: rgba(16, 185, 129, 0.3);
      color: #10b981;
    }

    &.ant-tag-orange {
      border-color: rgba(245, 158, 11, 0.3);
      color: #f59e0b;
    }
  }
}

// 数据库类型选择样式
.database-type-section {
  @include panel-base;
  margin-top: 16px;
  border-radius: $border-radius-sm;

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

// 字段映射表格样式
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

// 自定义绑定统计样式
.custom-binding-stats {
  display: flex;
  align-items: center;
}

// 更新字段配置样式
.update-fields-config {
  padding: 8px 0;
}

.update-fields-summary {
  margin-top: 12px;
  padding-top: 12px;
  @include divider-top;
}
</style>
