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
              :value="matchingStats.matchRate"
              :precision="1"
              suffix="%"
            />
            <a-statistic
              title="已匹配"
              :value="matchingStats.matched"
              :value-style="{ color: '#3f8600' }"
            />
            <a-statistic
              title="未匹配"
              :value="matchingStats.unmatched"
              :value-style="{ color: '#cf1322' }"
            />
          </div>

          <a-table
            :data-source="fieldMappings"
            :columns="mappingColumns"
            :pagination="false"
            size="small"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'ddlField'">
                <div>
                  <strong>{{ record.ddlField.name }}</strong>
                  <div class="field-type">{{ record.ddlField.type }}</div>
                  <a-tag v-if="!record.ddlField.nullable" color="red" size="small"> 必填 </a-tag>
                </div>
              </template>

              <template v-if="column.key === 'excelHeader'">
                <a-select
                  v-if="record.status === 'pending'"
                  v-model:value="record.excelIndex"
                  style="width: 100%"
                  placeholder="选择Excel列"
                  @change="(value) => updateMapping(record.ddlField.name, value)"
                >
                  <a-select-option :value="-1">未匹配</a-select-option>
                  <a-select-option
                    v-for="(header, idx) in excelHeaders || []"
                    :key="idx"
                    :value="idx"
                    :disabled="isColumnUsed(idx)"
                  >
                    {{ header }} (列{{ idx + 1 }})
                  </a-select-option>
                </a-select>
                <span v-else>
                  {{ record.excelHeader }}
                  <a-tag :color="getConfidenceColor(record.confidence)" size="small">
                    {{ getConfidenceText(record.confidence) }}
                  </a-tag>
                </span>
              </template>

              <template v-if="column.key === 'similarity'">
                <a-progress
                  v-if="record.similarity > 0"
                  :percent="Math.round(record.similarity * 100)"
                  size="small"
                />
                <span v-else>-</span>
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
            <a-button type="primary" @click="validateFieldMappings">验证映射</a-button>
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
            :sql="generatedSql"
            :stats="sqlStats"
            :auto-validate="true"
            @copy="handleSqlCopy"
            @download="handleSqlDownload"
            @validate="handleSqlValidation"
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
  SettingOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons-vue'

// 导入核心功能模块
import { useDdlParser } from '@/composables/useDdlParser'
import { useExcelParserEnhanced } from '@/composables/useExcelParserEnhanced'
import { useFieldMatcher } from '@/composables/useFieldMatcher'
import { useSqlGeneratorEnhanced } from '@/composables/useSqlGeneratorEnhanced'
import { useErrorHandler } from '@/composables/useErrorHandler'

// 导入组件
import SqlPreview from '@/components/SqlPreview/SqlPreview.vue'

// 初始化核心功能模块
const { parseDdl: parseDdlWithParser, clearCache } = useDdlParser()
const { parseExcel: parseExcelEnhanced } = useExcelParserEnhanced()
const {
  fieldMappings,
  matchFields,
  updateFieldMapping,
  validateMappings: validateFieldMappings,
  matchingStats,
} = useFieldMatcher()
const {
  generateInsertSql,
  setBeautifyOptions,
  resetBeautifyOptions: resetDefaultBeautifyOptions,
} = useSqlGeneratorEnhanced()
const { logError, logInfo, logWarning } = useErrorHandler()

// 响应式数据
const ddlStatement = ref('')
const parsedFields = ref([])
const fileList = ref([])
const uploadedFile = ref(null)
const excelData = ref([])
const excelHeaders = ref([])
const generatedSql = ref('')
const operationLogs = ref([])
const includeComments = ref(true) // 控制是否包含SQL注释
const databaseType = ref('mysql') // 数据库类型：mysql, postgresql, sqlserver

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
  console.log('showFieldMapping计算属性调用:')
  console.log('parsedFields.length:', parsedFields.value?.length || 0)
  console.log('excelHeaders.length:', excelHeaders.value?.length || 0)
  const result = parsedFields.value.length > 0 && excelHeaders.value.length > 0
  console.log('showFieldMapping结果:', result)
  return result
})

const previewData = computed(() => {
  console.log('previewData计算属性调用:')
  console.log('excelData.length:', excelData.value?.length || 0)

  if (!excelData.value || excelData.value.length === 0) {
    console.log('excelData为空，返回空数组')
    return []
  }

  const data = excelData.value.slice(0, 10).map((row, index) => ({
    key: index,
    ...row,
  }))

  console.log('预览数据行数:', data.length)
  return data
})

const previewColumns = computed(() => {
  console.log('previewColumns计算属性调用:')
  console.log('excelHeaders:', excelHeaders.value)
  console.log('excelHeaders.length:', excelHeaders.value?.length || 0)

  if (!excelHeaders.value || excelHeaders.value.length === 0) {
    console.log('excelHeaders为空，返回空数组')
    return []
  }

  const columns = excelHeaders.value.map((header, index) => ({
    title: `${header} (列${index + 1})`,
    dataIndex: index,
    key: index,
    ellipsis: true,
  }))

  console.log('生成的列配置:', columns)
  return columns
})

const sqlStats = computed(() => {
  if (!generatedSql.value) {
    return { statementCount: 0, affectedRows: 0, generationTime: 0 }
  }

  const statements = generatedSql.value.split(';').filter((s) => s.trim())
  const affectedRows = excelData.value.length

  return {
    statementCount: statements.length,
    affectedRows,
    generationTime: 0, // 实际应该从生成过程中获取
  }
})

// 表格列定义
const mappingColumns = [
  {
    title: 'DDL字段',
    key: 'ddlField',
    width: '30%',
  },
  {
    title: 'Excel列',
    key: 'excelHeader',
    width: '40%',
  },
  {
    title: '相似度',
    key: 'similarity',
    width: '20%',
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
    parsedFields.value = result.fields

    logInfo(`成功解析DDL语句，发现 ${result.fields.length} 个字段`)
    message.success(`DDL解析成功，发现 ${result.fields.length} 个字段`)

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

  console.log('=== 文件上传调试信息开始 ===')
  console.log('上传的文件对象:', file)
  console.log('文件名称:', file?.name)
  console.log('文件大小:', file?.size)
  console.log('文件类型:', file?.type)

  try {
    uploadedFile.value = file

    console.log('开始解析Excel文件...')
    const result = await parseExcelEnhanced(file)

    console.log('Excel解析结果:', result)
    console.log('解析出的数据行数:', result.rows?.length || 0)
    console.log('解析出的表头数量:', result.headers?.length || 0)
    console.log('表头详情:', result.headers)

    excelData.value = result.rows
    excelHeaders.value = result.headers

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

const clearFile = () => {
  uploadedFile.value = null
  excelData.value = []
  excelHeaders.value = []
  fileList.value = []
  logInfo('已清除上传的文件')
}

const autoMatchFields = () => {
  console.log('=== 自动字段匹配调试信息开始 ===')
  console.log('parsedFields:', parsedFields.value)
  console.log('parsedFields数量:', parsedFields.value?.length || 0)
  console.log('excelHeaders:', excelHeaders.value)
  console.log('excelHeaders数量:', excelHeaders.value?.length || 0)

  if (parsedFields.value.length === 0 || excelHeaders.value.length === 0) {
    console.error('自动匹配失败: parsedFields或excelHeaders为空')
    message.warning('请先解析DDL语句和上传Excel文件')
    return
  }

  try {
    console.log('开始自动匹配字段...')
    matchFields(parsedFields.value, excelHeaders.value, 'similarity')
    console.log('自动字段匹配完成')
    logInfo('自动字段匹配完成')
    message.success('字段自动匹配完成')
    console.log('=== 自动字段匹配调试信息结束 ===')
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

  // 使用标准验证方法
  const validation = validateFieldMappings()
  if (!validation.isValid) {
    message.warning('请先完成字段映射配置')
    return
  }

  generating.value = true

  try {
    // 提取表名（简化处理，实际应该从DDL解析结果中获取）
    const tableName = extractTableName(ddlStatement.value)

    // 使用标准字段映射
    const mappingsToUse = fieldMappings.value

    const sql = generateInsertSql(tableName, mappingsToUse, excelData.value, {
      dbType: databaseType.value,
      format: 'formatted',
      batch: 100,
      comments: includeComments.value,
      beautifyOptions: beautifyOptions.value,
    })

    generatedSql.value = sql

    const beautifyStatus = showBeautifyOptions.value ? '应用美化' : '未美化'

    logInfo(
      `SQL生成成功（标准模式，${includeComments.value ? '包含注释' : '纯SQL'}，${beautifyStatus}）`,
      'generation',
      {
        mode: 'standard',
        beautifyOptions: beautifyOptions.value,
        includeComments: includeComments.value,
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

const handleSqlValidation = (validationResult) => {
  if (validationResult.hasErrors) {
    logWarning('SQL语法验证发现错误', 'validation', {
      errors: validationResult.errors,
    })
  } else {
    logInfo('SQL语法验证通过')
  }
}

const exportLogs = () => {
  // 实现日志导出功能
  message.info('日志导出功能开发中')
}

const resetAll = () => {
  ddlStatement.value = ''
  parsedFields.value = []
  uploadedFile.value = null
  excelData.value = []
  excelHeaders.value = []
  generatedSql.value = ''
  fileList.value = []
  handleClearCache()

  logInfo('所有数据已重置')
  message.success('重置成功')
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
}
</style>
