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
              <a-checkbox v-model:checked="rowRangeEnabled" @change="handleRowRangeToggle">
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

          <!-- 自定义字段管理 -->
          <CustomFieldManager
            v-if="customBindingEnabled"
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
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, h } from 'vue'
import { message, Modal } from 'ant-design-vue'
import {
  ReloadOutlined,
  PlayCircleOutlined,
  QuestionCircleOutlined,
  UploadOutlined,
  ClockCircleOutlined,
  SettingOutlined,
  CheckOutlined,
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
import CustomFieldManager from '@/components/CustomFieldManager/CustomFieldManager.vue'

// 初始化核心功能模块
const { parseDdl: parseDdlWithParser, clearCache } = useDdlParser()
const { parseExcel: parseExcelEnhanced, getHeaders } = useExcelParserEnhanced()
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

// 行范围选择相关状态
const rowRangeEnabled = ref(false) // 是否启用行范围选择
const startRow = ref(null) // 起始行
const endRow = ref(null) // 结束行
const includeHeader = ref(true) // 是否包含表头
const totalExcelRows = ref(0) // Excel文件总行数

// 自定义绑定相关
const customBindingEnabled = ref(false)
const showCustomBindingModal = ref(false)
const editingCustomField = ref(null)
const hasCustomBindingConfig = computed(() => {
  const stats = customBindingManager.getBindingStats()
  return stats.hasCustomConfig
})

const customFieldsData = computed(() => {
  return Array.isArray(customBindingManager.customFields.value)
    ? customBindingManager.customFields.value
    : []
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

/**
 * 优化后的数据预览计算属性
 * 使用缓存和限制数据量来提升性能
 */
const previewData = computed(() => {
  // 如果没有数据，直接返回空数组
  if (!excelData.value || excelData.value.length === 0) {
    return []
  }

  // 只预览前10行数据，避免大量数据影响性能
  const previewLimit = 10
  const data = excelData.value.slice(0, previewLimit).map((row, index) => ({
    key: `preview-${index}-${Date.now()}`, // 添加唯一key，避免Vue警告
    ...row,
  }))

  return data
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

// 表格列定义
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

    // 先解析一次获取总行数
    const initialResult = await parseExcelEnhanced(file, {
      sheetIndex: 0,
      maxRows: 10000,
    })

    totalExcelRows.value = initialResult.totalRows

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
    }

    const result = await parseExcelEnhanced(file, parseOptions)
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

  // 从fieldMappings中移除对应的映射记录（参考INSERT页面的实现）
  const mappingIndex = fieldMappings.value.findIndex(
    (mapping) => mapping.ddlField.name === ddlFieldName,
  )
  if (mappingIndex >= 0) {
    fieldMappings.value.splice(mappingIndex, 1)
    console.log('已从fieldMappings移除映射记录:', ddlFieldName)
  }

  // 从 updateFields 中移除被清除的字段（如果它不在条件字段中）
  const fieldIndex = updateFields.value.indexOf(ddlFieldName)
  if (fieldIndex !== -1 && !conditionFields.value.includes(ddlFieldName)) {
    updateFields.value.splice(fieldIndex, 1)
  }

  logInfo(`清除字段映射: ${ddlFieldName}`)
  message.info(`已清除字段映射: ${ddlFieldName}`)
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

/**
 * 处理行范围开关切换
 * 当关闭行范围选择时，重置行范围参数
 */
const handleRowRangeToggle = (checked) => {
  if (!checked) {
    startRow.value = null
    endRow.value = null
    logInfo('已关闭行范围选择')
  } else {
    logInfo('已启用行范围选择，请设置起始行和结束行')
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
      // 直接从已解析的excelData中提取第一行作为表头
      if (excelData.value && excelData.value.length > 0) {
        // 使用第一行数据作为表头
        const firstRow = excelData.value[0]
        headers = Object.keys(firstRow).map((key) => {
          // 如果key是数字（如"0", "1"），转换为列名
          const colIndex = parseInt(key)
          if (!isNaN(colIndex)) {
            return key
          }
          // 如果key是数字，说明是默认列名，使用excelHeaders
          if (excelHeaders.value && excelHeaders.value.length > colIndex) {
            return excelHeaders.value[colIndex]
          }
          return `Column_${colIndex + 1}`
        })

        console.log('[applyRowRange] 从已解析数据中提取表头:', headers)

        // 使用已解析的数据
        rows = excelData.value
      } else {
        // 如果没有已解析数据，使用getHeaders
        headers = await getHeaders(uploadedFile.value, {
          sheetIndex: 0,
        })
      }

      // 如果需要获取数据范围，重新解析
      if (rows.length === 0 && startRow.value && endRow.value) {
        const dataResult = await parseExcelEnhanced(uploadedFile.value, {
          sheetIndex: 0,
          maxRows: 10000,
          startRow: startRow.value,
          endRow: endRow.value,
          includeHeader: false, // 数据范围不包含表头
        })
        rows = dataResult.rows
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

    // 如果已有DDL字段，自动执行字段匹配
    if (parsedFields.value.length > 0) {
      autoMatchFields()
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
        const customField = {
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

        // 将自定义字段添加到 customBindingManager
        customBindingManager.addCustomField(customField)
        console.log(`从字段拼接规则添加自定义字段: ${customField.fieldName}`)
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
          customBindingManager: customBindingManager,
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
  display: flex;
  flex-direction: column;
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

/* 暗色主题支持 - UpdatePage全局样式 */
[data-theme='dark'] .update-page {
  background: linear-gradient(180deg, #0f172a 0%, #1e293b 100%);
}

[data-theme='dark'] .page-header {
  background: #1e293b;
  border-bottom-color: #374151;
}

[data-theme='dark'] .page-header h2 {
  color: #60a5fa;
}

[data-theme='dark'] .input-card,
[data-theme='dark'] .output-card {
  background: #1e293b;
  border-color: #374151;
  box-shadow:
    0 4px 12px rgba(0, 0, 0, 0.3),
    0 2px 4px rgba(0, 0, 0, 0.2);
}

[data-theme='dark'] .input-card:hover,
[data-theme='dark'] .output-card:hover {
  box-shadow:
    0 6px 16px rgba(0, 0, 0, 0.4),
    0 3px 6px rgba(0, 0, 0, 0.3);
}

[data-theme='dark'] .card-header {
  border-bottom-color: #374151;
}

[data-theme='dark'] .card-header h3 {
  color: #f3f4f6;
}

[data-theme='dark'] .card-footer {
  border-top-color: #374151;
}

[data-theme='dark'] .field-count {
  color: #9ca3af;
}

[data-theme='dark'] .beautify-options-panel {
  background: #1e293b;
  border-color: #374151;
}

[data-theme='dark'] .option-label {
  color: #d1d5db;
}

[data-theme='dark'] .option-value {
  color: #60a5fa;
}

[data-theme='dark'] .option-row {
  border-bottom-color: #374151;
}

[data-theme='dark'] .option-actions {
  border-top-color: #374151;
}

[data-theme='dark'] .log-time {
  color: #9ca3af;
}

[data-theme='dark'] .log-message {
  color: #e5e7eb;
}

[data-theme='dark'] .sql-preview {
  background: #0f172a;
  border-color: #374151;
  color: #e5e7eb;
}

[data-theme='dark'] .sql-stats {
  border-top-color: #374151;
}

[data-theme='dark'] .mapping-stats {
  background: #1e293b;
}

[data-theme='dark'] .mapping-actions {
  border-top-color: #374151;
}

[data-theme='dark'] .database-type-section {
  background: #1e293b;
  border-color: #374151;
}

[data-theme='dark'] .database-type-section h4 {
  color: #f3f4f6;
}

[data-theme='dark'] .database-type-hint {
  color: #9ca3af;
}

[data-theme='dark'] .field-type {
  color: #9ca3af;
}

[data-theme='dark'] .no-excel-hint {
  background: rgba(245, 158, 11, 0.1);
  border-color: rgba(245, 158, 11, 0.3);
  color: #fbbf24;
}

[data-theme='dark'] .condition-preview {
  border-top-color: #374151;
}

[data-theme='dark'] .condition-example h4 {
  color: #f3f4f6;
}

[data-theme='dark'] .condition-code {
  background: #0f172a;
  border-color: #374151;
  color: #e5e7eb;
}

[data-theme='dark'] .config-section h4 {
  color: #f3f4f6;
}

[data-theme='dark'] .update-fields-summary {
  border-top-color: #374151;
}

/* Ant Design组件暗黑主题适配 */
[data-theme='dark'] .update-page :deep(.ant-input),
[data-theme='dark'] .update-page :deep(.ant-input-affix-wrapper) {
  background: #0f172a;
  border-color: #374151;
  color: #f3f4f6;
}

[data-theme='dark'] .update-page :deep(.ant-input::placeholder) {
  color: #6b7280;
}

[data-theme='dark'] .update-page :deep(.ant-input-affix-wrapper:hover) {
  border-color: #60a5fa;
}

[data-theme='dark'] .update-page :deep(.ant-input-affix-wrapper-focused) {
  border-color: #60a5fa;
  box-shadow: 0 0 0 2px rgba(96, 165, 250, 0.2);
}

[data-theme='dark'] .update-page :deep(.ant-select-selector) {
  background: #0f172a !important;
  border-color: #374151 !important;
  color: #f3f4f6 !important;
}

[data-theme='dark'] .update-page :deep(.ant-select-selection-item) {
  color: #f3f4f6;
}

[data-theme='dark'] .update-page :deep(.ant-select-arrow) {
  color: #9ca3af;
}

[data-theme='dark'] .update-page :deep(.ant-btn) {
  border-color: #374151;
}

[data-theme='dark'] .update-page :deep(.ant-btn-default) {
  background: #1e293b;
  border-color: #374151;
  color: #f3f4f6;
}

[data-theme='dark'] .update-page :deep(.ant-btn-default:hover) {
  border-color: #60a5fa;
  color: #60a5fa;
}

[data-theme='dark'] .update-page :deep(.ant-btn-dashed) {
  background: transparent;
  border-color: #374151;
  color: #f3f4f6;
}

[data-theme='dark'] .update-page :deep(.ant-btn-dashed:hover) {
  border-color: #60a5fa;
  color: #60a5fa;
}

[data-theme='dark'] .update-page :deep(.ant-btn-link) {
  color: #60a5fa;
}

[data-theme='dark'] .update-page :deep(.ant-btn-link:hover) {
  color: #93c5fd;
}

[data-theme='dark'] .update-page :deep(.ant-switch) {
  background: #374151;
}

[data-theme='dark'] .update-page :deep(.ant-switch-checked) {
  background: #60a5fa;
}

[data-theme='dark'] .update-page :deep(.ant-radio-button-wrapper) {
  background: #1e293b;
  border-color: #374151;
  color: #9ca3af;
}

[data-theme='dark'] .update-page :deep(.ant-radio-button-wrapper:hover) {
  color: #f3f4f6;
}

[data-theme='dark'] .update-page :deep(.ant-radio-button-wrapper-checked) {
  background: #60a5fa;
  border-color: #60a5fa;
  color: #fff;
}

[data-theme='dark'] .update-page :deep(.ant-slider-rail) {
  background: #374151;
}

[data-theme='dark'] .update-page :deep(.ant-slider-track) {
  background: #60a5fa;
}

[data-theme='dark'] .update-page :deep(.ant-slider-handle) {
  background: #60a5fa;
  border-color: #60a5fa;
}

[data-theme='dark'] .update-page :deep(.ant-divider) {
  border-top-color: #374151;
}

[data-theme='dark'] .update-page :deep(.ant-divider-inner-text) {
  color: #9ca3af;
}

[data-theme='dark'] .update-page :deep(.ant-timeline-item-tail) {
  border-left-color: #374151;
}

[data-theme='dark'] .update-page :deep(.ant-timeline-item-content) {
  color: #e5e7eb;
}

[data-theme='dark'] .update-page :deep(.ant-empty-description) {
  color: #6b7280;
}

[data-theme='dark'] .update-page :deep(.ant-tooltip-inner) {
  background: #374151;
}

[data-theme='dark'] .update-page :deep(.ant-tooltip-arrow-content) {
  background: #374151;
}

[data-theme='dark'] .update-page :deep(.ant-modal-content) {
  background: #1e293b;
}

[data-theme='dark'] .update-page :deep(.ant-modal-header) {
  background: #1e293b;
  border-bottom-color: #374151;
}

[data-theme='dark'] .update-page :deep(.ant-modal-title) {
  color: #f3f4f6;
}

[data-theme='dark'] .update-page :deep(.ant-modal-close-x) {
  color: #9ca3af;
}

[data-theme='dark'] .update-page :deep(.ant-alert) {
  background: #1e293b;
  border-color: #374151;
}

[data-theme='dark'] .update-page :deep(.ant-table) {
  background: #1e293b;
  color: #f3f4f6;
}

[data-theme='dark'] .update-page :deep(.ant-table-thead > tr > th) {
  background: #0f172a;
  color: #f3f4f6;
  border-bottom-color: #374151;
}

[data-theme='dark'] .update-page :deep(.ant-table-tbody > tr > td) {
  border-bottom-color: #374151;
}

[data-theme='dark'] .update-page :deep(.ant-table-tbody > tr:hover > td) {
  background: #374151;
}

[data-theme='dark'] .update-page :deep(.ant-collapse) {
  background: #1e293b;
  border-color: #374151;
}

[data-theme='dark'] .update-page :deep(.ant-collapse-header) {
  color: #f3f4f6;
}

[data-theme='dark'] .update-page :deep(.ant-collapse-content) {
  background: #1e293b;
  border-top-color: #374151;
}

[data-theme='dark'] .update-page :deep(.ant-checkbox-wrapper) {
  color: #f3f4f6;
}

[data-theme='dark'] .update-page :deep(.ant-progress-text) {
  color: #f3f4f6;
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
