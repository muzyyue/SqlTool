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
                @change="handleDeduplicationToggle"
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
                placeholder="选择去重列"
                style="width: 100%"
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
                    style="width: 100%; margin-top: 8px"
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
            <a-button type="primary" @click="validateMappings">验证映射</a-button>

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
                style="width: 100%"
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
      @save="handleCustomBindingSave"
      @cancel="handleCustomBindingCancel"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { message } from 'ant-design-vue'
import {
  ReloadOutlined,
  PlayCircleOutlined,
  QuestionCircleOutlined,
  UploadOutlined,
  ClockCircleOutlined,
  SettingOutlined,
} from '@ant-design/icons-vue'

// 导入核心功能模块
import { useDdlParser } from '@/composables/useDdlParser'
import { useExcelParserEnhanced } from '@/composables/useExcelParserEnhanced'
import { useFieldMatcher } from '@/composables/useFieldMatcher'
import { useSqlGeneratorEnhanced } from '@/composables/useSqlGeneratorEnhanced'
import { useErrorHandler } from '@/composables/useErrorHandler'

// 导入SQL预览组件
import SqlPreview from '@/components/SqlPreview/SqlPreview.vue'
import CustomBindingModal from '@/components/CustomBindingModal.vue'

// 初始化核心功能模块
const { parseDdl: parseDdlWithParser, clearCache } = useDdlParser()
const { parseExcel: parseExcelEnhanced } = useExcelParserEnhanced()
const {
  fieldMappings,
  matchFields,
  updateFieldMapping,
  validateMappings: validateFieldMappings,
  matchingStats,
  customBindingManager,
} = useFieldMatcher()
const {
  generateUpdateSql,
  setBeautifyOptions,
  resetBeautifyOptions: resetDefaultBeautifyOptions,
} = useSqlGeneratorEnhanced()
const { logError, logInfo, logWarning } = useErrorHandler()

// 响应式数据
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
const generatedSql = ref('')
const operationLogs = ref([])
const databaseType = ref('mysql')

// 去重相关
const deduplicationEnabled = ref(false)
const deduplicationColumn = ref(null)
const deduplicationStats = ref({
  originalRows: 0,
  deduplicatedRows: 0,
  removedRows: 0,
})

// 自定义绑定相关
const customBindingEnabled = ref(false)
const showCustomBindingModal = ref(false)
const hasCustomBindingConfig = computed(() => {
  const stats = customBindingManager.getBindingStats()
  return stats.hasCustomConfig
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

// SQL注释和美化相关
const includeComments = ref(true)
const showBeautifyOptions = ref(false)
const beautifyOptions = ref({
  indentSpaces: 4,
  formatStyle: 'expanded',
  keywordCase: 'upper',
  maxLineLength: 80,
  alignValues: true,
})

// 计算属性
const showFieldMapping = computed(() => {
  return parsedFields.value.length > 0 && excelHeaders.value.length > 0
})

const previewData = computed(() => {
  return excelData.value.slice(0, 10)
})

const previewColumns = computed(() => {
  return excelHeaders.value.map((header, index) => ({
    title: `${header} (列${index + 1})`,
    dataIndex: index,
    key: index,
    ellipsis: true,
  }))
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

// 表格列定义
const mappingColumns = [
  {
    title: '字段名',
    key: 'fieldName',
    width: '20%',
  },
  {
    title: 'DDL字段',
    key: 'ddlField',
    width: '35%',
  },
  {
    title: 'Excel列',
    key: 'excelHeader',
    width: '25%',
  },
  {
    title: '相似度',
    key: 'similarity',
    width: '10%',
  },
  {
    title: '操作',
    key: 'actions',
    width: '10%',
  },
]

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

  try {
    uploadedFile.value = file

    const result = await parseExcelEnhanced(file)
    excelData.value = result.rows
    excelHeaders.value = result.headers

    onSuccess('文件上传成功')
    logInfo(`成功解析Excel文件，共 ${result.rows.length} 行数据`)
    message.success('文件解析成功')

    // 如果已有DDL字段，自动执行字段匹配
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
  fileList.value = []
  logInfo('已清除上传的文件')
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

const clearMapping = (ddlFieldName) => {
  updateFieldMapping(ddlFieldName, null, -1)
  logInfo(`清除字段映射: ${ddlFieldName}`)
}

const clearAllMappings = () => {
  parsedFields.value.forEach((field) => {
    updateFieldMapping(field.name, null, -1)
  })
  logInfo('清除所有字段映射')
  message.info('已清除所有字段映射')
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

const validateMappings = () => {
  const validation = validateFieldMappings()

  // 额外验证条件字段是否已映射
  const conditionFieldsNotMapped = conditionFields.value.filter((fieldName) => {
    const mapping = fieldMappings.value.find((m) => m.ddlField.name === fieldName)
    return !mapping || mapping.excelIndex === -1
  })

  if (conditionFieldsNotMapped.length > 0) {
    validation.errors.push(`条件字段 ${conditionFieldsNotMapped.join(', ')} 未正确映射到Excel列`)
    validation.isValid = false
  }

  if (validation.isValid) {
    message.success('字段映射验证通过')
    logInfo('字段映射验证通过')
  } else {
    currentErrors.value = validation.errors.map((error) => ({
      id: Date.now() + Math.random(),
      message: '映射验证失败',
      context: error,
    }))
    errorModalVisible.value = true
    logWarning('字段映射验证失败', 'validation', { errors: validation.errors })
  }
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
    message.warning('请先完成字段映射配置')
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

const getLogColor = (level) => {
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

const clearLogs = () => {
  operationLogs.value = []
  logInfo('操作日志已清除')
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

const exportLogs = () => {
  message.info('日志导出功能开发中')
}

const handleClearCache = () => {
  clearCache()
  logInfo('DDL解析缓存已清除')
  message.success('缓存已清除，下次解析将重新计算')
}

const handleDeduplicationToggle = (checked) => {
  if (!checked) {
    deduplicationColumn.value = null
    deduplicationStats.value = {
      originalRows: 0,
      deduplicatedRows: 0,
      removedRows: 0,
    }
    logInfo('已关闭数据去重')
  } else {
    logInfo('已启用数据去重，请选择去重列')
  }
}

const applyDeduplication = () => {
  if (deduplicationColumn.value === null || deduplicationColumn.value === undefined) {
    message.warning('请先选择去重列')
    return
  }

  if (!excelData.value || excelData.value.length === 0) {
    message.warning('没有可去重的数据')
    return
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
    })
    message.info('未发现重复数据')
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
    customFields.forEach((field) => {
      if (
        typeof field === 'object' &&
        field !== null &&
        field.fieldName &&
        field.fieldName.trim() !== ''
      ) {
        validCustomFieldsMap.set(field.fieldName.trim(), field)
      }
    })
    const validCustomFields = Array.from(validCustomFieldsMap.values())

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
}

/**
 * 切换美化选项面板显示状态
 */
const toggleBeautifyOptions = () => {
  const newState = !showBeautifyOptions.value
  showBeautifyOptions.value = newState

  logInfo(`SQL美化选项面板${newState ? '显示' : '隐藏'}`, 'beautify', {
    operation: 'toggleBeautifyOptions',
    operationType: 'beautify',
    isVisible: newState,
  })
}

/**
 * 应用美化选项到生成的SQL
 */
const applyBeautifyOptions = async () => {
  try {
    // 记录美化选项应用前的状态
    const previousOptions = { ...beautifyOptions.value }

    // 应用美化选项到SQL生成器
    setBeautifyOptions(beautifyOptions.value)

    // 如果已有生成的SQL，重新应用美化
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
        },
      )
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

/**
 * 重置美化选项为默认值
 */
const resetBeautifyOptions = () => {
  const previousOptions = { ...beautifyOptions.value }

  beautifyOptions.value = {
    indentSpaces: 2,
    formatStyle: 'standard',
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

/**
 * 获取美化选项变更详情
 */
const getOptionChanges = (previous, current) => {
  const changes = []
  for (const key in current) {
    if (previous[key] !== current[key]) {
      changes.push({
        key,
        previous: previous[key],
        current: current[key],
      })
    }
  }
  return changes
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
  deduplicationEnabled.value = false
  deduplicationColumn.value = null
  deduplicationStats.value = {
    originalRows: 0,
    deduplicatedRows: 0,
    removedRows: 0,
  }
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

<style scoped>
.update-page {
  padding: 0;
  min-height: 100%;
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
}

.header-actions {
  display: flex;
  gap: 8px;
}

.content-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  min-height: 600px;
}

.input-section,
.output-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.input-card,
.output-card {
  background: white;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.card-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #f0f0f0;
}

.field-count {
  color: #666;
  font-size: 12px;
}

.condition-config {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.config-section h4 {
  margin: 0 0 8px 0;
  color: #333;
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
  gap: 8px;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #f0f0f0;
}

.field-type {
  color: #666;
  font-size: 12px;
  margin-top: 2px;
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
}

/* SQL美化选项面板样式 */
.beautify-options-panel {
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 6px;
  padding: 16px;
  margin-bottom: 16px;
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
  color: #333;
  font-size: 14px;
}

.option-value {
  min-width: 40px;
  text-align: right;
  color: #1890ff;
  font-weight: 500;
}

.option-actions {
  display: flex;
  gap: 8px;
  padding-top: 8px;
}

.condition-preview {
  display: flex;
  flex-direction: column;
  gap: 16px;
  border-top: 1px solid #f0f0f0;
}

.condition-example h4 {
  margin: 0 0 8px 0;
  color: #333;
  font-size: 14px;
  font-weight: 500;
}

.condition-code {
  background: #f6f8fa;
  border: 1px solid #e1e4e8;
  border-radius: 4px;
  padding: 8px 12px;
  font-family: 'Courier New', monospace;
  font-size: 12px;
  color: #24292e;
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

  .condition-config {
    gap: 12px;
  }
}

@media (max-width: 480px) {
  .input-card,
  .output-card {
    padding: 12px;
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

/* 去重配置样式 */
.deduplication-config {
  margin-top: 12px;
}

.deduplication-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.deduplication-controls {
  margin-top: 12px;
}

.deduplication-stats {
  margin-top: 12px;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

/* 数据库类型选择样式 */
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

/* 字段映射表格样式 */
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

/* 自定义绑定统计样式 */
.custom-binding-stats {
  display: flex;
  align-items: center;
}

/* 更新字段配置样式 */
.update-fields-config {
  padding: 8px 0;
}

.update-fields-summary {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #f0f0f0;
}
</style>
