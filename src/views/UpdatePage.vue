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
            <a-button type="link" size="small" @click="parseDdl" :loading="parsingDdl">
              解析DDL
            </a-button>
            <span v-if="parsedFields.length > 0" class="field-count">
              已解析 {{ parsedFields.length }} 个字段
            </span>
          </div>
        </div>

        <!-- 条件字段选择 -->
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

          <div v-if="excelData.length > 0" class="data-preview">
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
                  <a-tag
                    v-if="conditionFields.includes(record.ddlField.name)"
                    color="blue"
                    size="small"
                  >
                    条件字段
                  </a-tag>
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
                    v-for="(header, idx) in excelHeaders"
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
            <a-button type="primary" @click="validateMappings">验证映射</a-button>
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
              <a-button @click="generateSql" type="primary" :loading="generating">
                <template #icon><PlayCircleOutlined /></template>
                生成SQL
              </a-button>
            </div>
          </div>

          <SqlPreview
            :sql="generatedSql"
            :stats="sqlStats"
            :auto-validate="true"
            @copy="logInfo('UPDATE SQL语句已复制到剪贴板')"
            @download="logInfo('UPDATE SQL语句已下载')"
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
} from '@ant-design/icons-vue'

// 导入核心功能模块
import { useDdlParser } from '@/composables/useDdlParser'
import { useExcelParserEnhanced } from '@/composables/useExcelParserEnhanced'
import { useFieldMatcher } from '@/composables/useFieldMatcher'
import { useSqlGeneratorEnhanced } from '@/composables/useSqlGeneratorEnhanced'
import { useErrorHandler } from '@/composables/useErrorHandler'

// 导入SQL预览组件
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
const { generateUpdateSql } = useSqlGeneratorEnhanced()
const { logError, logInfo, logWarning } = useErrorHandler()

// 响应式数据
const ddlStatement = ref('')
const parsedFields = ref([])
const conditionFields = ref([])
const conditionLogic = ref('AND')
const conditionOperator = ref('=')
const fileList = ref([])
const uploadedFile = ref(null)
const excelData = ref([])
const excelHeaders = ref([])
const generatedSql = ref('')
const operationLogs = ref([])

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
    excelData.value = result.data
    excelHeaders.value = result.headers

    onSuccess('文件上传成功')
    logInfo(`成功解析Excel文件，共 ${result.data.length} 行数据`)
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

  const validation = validateFieldMappings()
  if (!validation.isValid) {
    message.warning('请先完成字段映射配置')
    return
  }

  generating.value = true

  try {
    // 提取表名（简化处理，实际应该从DDL解析结果中获取）
    const tableName = extractTableName(ddlStatement.value)

    const sql = generateUpdateSql(
      tableName,
      fieldMappings.value,
      conditionFields.value,
      excelData.value,
      {
        dbType: 'mysql',
        format: 'formatted',
        conditionLogic: conditionLogic.value,
        conditionOperator: conditionOperator.value,
        comments: true,
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

const exportLogs = () => {
  // 实现日志导出功能
  message.info('日志导出功能开发中')
}

const resetAll = () => {
  ddlStatement.value = ''
  parsedFields.value = []
  conditionFields.value = []
  conditionLogic.value = 'AND'
  conditionOperator.value = '='
  uploadedFile.value = null
  excelData.value = []
  excelHeaders.value = []
  generatedSql.value = ''
  fileList.value = []
  clearCache()

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
  padding-bottom: 16px;
  border-bottom: 1px solid #f0f0f0;
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
  border-top: 1px solid #f0f0f0;
}

.condition-preview {
  display: flex;
  flex-direction: column;
  gap: 16px;
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
</style>
