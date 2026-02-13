<template>
  <div class="field-mapping-wrapper">
    <div class="field-mapping-card" v-if="props.showFieldMapping">
      <div class="card-header">
        <div class="header-left">
          <h3 class="card-title">
            <LinkOutlined />
            <span>字段映射</span>
          </h3>
          <div class="match-rate-badge" :class="matchRateClass">{{ matchRate }}% 匹配率</div>
        </div>
        <div class="header-stats">
          <a-space>
            <div class="stat-item success">
              <CheckCircleOutlined />
              <span>{{ stats.matched }}</span>
            </div>
            <div class="stat-item warning">
              <ExclamationCircleOutlined />
              <span>{{ stats.unmatched }}</span>
            </div>
            <div class="stat-item" v-if="hasCustomBindingConfig">
              <ToolOutlined />
              <span>{{ stats.customBindings }}</span>
            </div>
          </a-space>
        </div>
      </div>

      <div class="mapping-container">
        <div class="mapping-tabs">
          <a-tabs v-model:activeKey="activeTab" size="small">
            <a-tab-pane key="auto" tab="智能匹配">
              <div class="tab-content">
                <div class="auto-match-section">
                  <div class="section-header">
                    <h4><RobotOutlined /> 自动字段匹配</h4>
                    <p class="section-desc">基于字段名称、类型和语义的智能匹配算法</p>
                  </div>

                  <div class="match-algorithm">
                    <a-radio-group v-model:value="algorithm" button-style="solid" size="small">
                      <a-radio-button value="exact">
                        <ThunderboltOutlined /> 精确匹配
                      </a-radio-button>
                      <a-radio-button value="fuzzy"> <SearchOutlined /> 模糊匹配 </a-radio-button>
                      <a-radio-button value="semantic">
                        <ExperimentOutlined /> 语义匹配
                      </a-radio-button>
                    </a-radio-group>
                  </div>

                  <a-button
                    type="primary"
                    block
                    @click="handleAutoMatchFields"
                    :loading="matchingLoading"
                  >
                    <template #icon><RocketOutlined /></template>
                    执行智能匹配
                  </a-button>

                  <div class="match-progress" v-if="matchingLoading">
                    <a-progress :percent="matchProgress" status="active" size="small" />
                    <span class="progress-text">正在分析字段相似度...</span>
                  </div>
                </div>
              </div>
            </a-tab-pane>

            <a-tab-pane key="manual" tab="手动映射">
              <div class="tab-content">
                <a-table
                  :dataSource="mappingFields"
                  :columns="mappingColumns"
                  :pagination="false"
                  size="small"
                  :rowClassName="(record) => (record.excelIndex === -1 ? 'unmatched-row' : '')"
                  class="mapping-table"
                >
                  <template #bodyCell="{ column, record }">
                    <!-- DDL字段列 -->
                    <template v-if="column.key === 'ddlField'">
                      <div class="field-cell">
                        <div class="field-badge" :class="getFieldTypeClass(record.ddlField?.type)">
                          {{ record.ddlField?.name }}
                        </div>
                        <a-tag v-if="!record.ddlField?.nullable" color="red" size="small"
                          >必填</a-tag
                        >
                        <a-tag v-if="record.ddlField?.isCustom" color="purple" size="small"
                          >自定义</a-tag
                        >
                      </div>
                    </template>

                    <!-- Excel列选择 -->
                    <template v-if="column.key === 'excelColumn'">
                      <a-select
                        :value="record.excelIndex"
                        placeholder="选择Excel列"
                        style="width: 100%"
                        size="small"
                        @change="(value) => handleUpdateMapping(record.ddlField?.name, value)"
                        :disabled="!props.excelHeaders?.length"
                      >
                        <a-select-option :value="-1">
                          <a-space>
                            <StopOutlined />
                            <span>未绑定</span>
                          </a-space>
                        </a-select-option>
                        <a-select-option
                          v-for="(header, idx) in props.excelHeaders || []"
                          :key="idx"
                          :value="idx"
                          :disabled="isColumnUsed(idx, record.excelIndex)"
                        >
                          <a-space>
                            <ColumnWidthOutlined />
                            <span>{{ header }}</span>
                            <span class="col-index">({{ idx + 1 }})</span>
                          </a-space>
                        </a-select-option>
                      </a-select>
                    </template>

                    <!-- 匹配状态 -->
                    <template v-if="column.key === 'status'">
                      <div class="status-cell">
                        <template v-if="record.excelIndex !== -1">
                          <!-- 已匹配状态 -->
                          <a-tooltip :title="getStatusTooltip(record)">
                            <div class="status-wrapper">
                              <!-- 匹配类型标签 -->
                              <a-tag
                                :color="getConfidenceColor(record.confidence)"
                                size="small"
                                class="match-type-tag"
                              >
                                <template #icon>
                                  <CheckCircleOutlined v-if="record.confidence === 'high'" />
                                  <InfoCircleOutlined v-else-if="record.confidence === 'medium'" />
                                  <WarningOutlined v-else-if="record.confidence === 'low'" />
                                  <EditOutlined v-else-if="record.confidence === 'manual'" />
                                  <QuestionCircleOutlined v-else />
                                </template>
                                {{ getConfidenceText(record.confidence) }}
                              </a-tag>

                              <!-- 相似度进度条 -->
                              <a-progress
                                v-if="record.similarity"
                                :percent="Math.round(record.similarity * 100)"
                                size="small"
                                :stroke-color="getSimilarityColor(record.similarity)"
                                :show-info="false"
                                class="similarity-progress"
                              />

                              <!-- 匹配详情按钮 -->
                              <a-button
                                type="link"
                                size="small"
                                class="detail-btn"
                                @click="showMatchDetail(record)"
                              >
                                详情
                              </a-button>
                            </div>
                          </a-tooltip>
                        </template>

                        <template v-else>
                          <!-- 未匹配状态 - 添加操作引导 -->
                          <div class="unmatched-status">
                            <a-tag color="default" size="small" class="unmatched-tag">
                              <template #icon><MinusCircleOutlined /></template>
                              待匹配
                            </a-tag>
                          </div>
                        </template>
                      </div>
                    </template>

                    <!-- 操作列 -->
                    <template v-if="column.key === 'actions'">
                      <div class="actions-cell">
                        <a-button
                          type="link"
                          size="small"
                          @click="handleClearMapping(record.ddlField?.name)"
                        >
                          清除
                        </a-button>
                        <a-checkbox
                          :checked="record.generatedByFunction"
                          @change="handleGeneratedByFunctionChange(record)"
                          size="small"
                        >
                          函数生成
                        </a-checkbox>
                      </div>
                    </template>
                  </template>
                </a-table>
              </div>
            </a-tab-pane>

            <a-tab-pane key="batch" tab="批量操作">
              <div class="tab-content">
                <div class="batch-actions">
                  <div class="action-group">
                    <h4><BorderOuterOutlined /> 批量操作</h4>
                    <a-space direction="vertical" style="width: 100%">
                      <a-button block @click="handleClearAllMappings">
                        <template #icon><DeleteOutlined /></template>
                        清除所有映射
                      </a-button>
                      <a-button
                        block
                        type="primary"
                        @click="handleValidateEnhancedMappings"
                        :disabled="!hasValidMappings"
                      >
                        <template #icon><CheckCircleOutlined /></template>
                        验证映射完整性
                      </a-button>
                    </a-space>
                  </div>

                  <div class="action-group">
                    <h4><ControlOutlined /> 自定义绑定</h4>
                    <div class="custom-binding-actions">
                      <a-switch
                        :checked="customBindingEnabled"
                        checked-children="启用"
                        un-checked-children="禁用"
                        @change="handleCustomBindingToggle"
                      />
                      <a-button
                        v-if="customBindingEnabled"
                        type="link"
                        size="small"
                        @click="handleOpenCustomBindingModal"
                      >
                        <template #icon><SettingOutlined /></template>
                        配置自定义字段
                      </a-button>
                    </div>
                    <p class="action-hint">启用后可创建复合字段和自定义映射规则</p>
                  </div>

                  <CustomFieldManager
                    v-if="customBindingEnabled"
                    :key="customFieldManagerKey"
                    :custom-fields="props.customFieldsData"
                    :custom-binding-manager="props.customBindingManager"
                    @edit="handleEditCustomField"
                    @delete="handleDeleteCustomField"
                    @refresh="handleRefreshCustomFields"
                  />
                </div>
              </div>
            </a-tab-pane>
          </a-tabs>
        </div>

        <div class="database-type-section">
          <div class="section-label"><DatabaseOutlined /> 目标数据库</div>
          <a-radio-group
            :value="props.databaseType"
            button-style="solid"
            @change="handleDatabaseTypeChange"
          >
            <a-radio-button value="mysql"> <MySQLOutlined /> MySQL </a-radio-button>
            <a-radio-button value="postgresql"> <PostgreSQLOutlined /> PostgreSQL </a-radio-button>
            <a-radio-button value="sqlserver"> <SqlServerOutlined /> SQL Server </a-radio-button>
          </a-radio-group>
          <div class="database-hint">
            选择目标数据库类型，确保生成的 INSERT 语句符合对应语法规范
          </div>
        </div>
      </div>

      <div class="mapping-footer">
        <a-space>
          <a-button @click="handleClearAllMappings">
            <template #icon><UndoOutlined /></template>
            重置映射
          </a-button>
          <a-button
            type="primary"
            @click="handleValidateEnhancedMappings"
            :disabled="!hasValidMappings"
          >
            <template #icon><CheckOutlined /></template>
            确认映射
          </a-button>
        </a-space>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import {
  LinkOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  ToolOutlined,
  RobotOutlined,
  ThunderboltOutlined,
  SearchOutlined,
  ExperimentOutlined,
  RocketOutlined,
  StopOutlined,
  ColumnWidthOutlined,
  BorderOuterOutlined,
  DeleteOutlined,
  ControlOutlined,
  UndoOutlined,
  DatabaseOutlined,
  CheckOutlined,
  InfoCircleOutlined,
  WarningOutlined,
  EditOutlined,
  QuestionCircleOutlined,
  MinusCircleOutlined,
  SettingOutlined,
} from '@ant-design/icons-vue'

// 数据库图标使用通用图标替代
const MySQLOutlined = DatabaseOutlined
const PostgreSQLOutlined = DatabaseOutlined
const SqlServerOutlined = DatabaseOutlined
import CustomFieldManager from '@/components/CustomFieldManager/CustomFieldManager.vue'

const props = defineProps({
  showFieldMapping: { type: Boolean, default: false },
  enhancedMatchingStats: {
    type: Object,
    default: () => ({
      matchRate: 0,
      matched: 0,
      unmatched: 0,
      total: 0,
      confidenceStats: {},
      customBindings: 0,
      concatenationRules: 0,
      customFields: 0,
    }),
  },
  filteredFieldMappings: { type: Array, default: () => [] },
  excelHeaders: { type: Array, default: () => [] },
  customBindingEnabled: { type: Boolean, default: false },
  customFieldsData: { type: Array, default: () => [] },
  customFieldManagerKey: { type: String, default: '' },
  customBindingManager: { type: Object, default: () => ({}) },
  databaseType: { type: String, default: 'mysql' },
  hasCustomBindingConfig: { type: Boolean, default: false },
})

const emit = defineEmits([
  'autoMatchFields',
  'clearAllMappings',
  'validateEnhancedMappings',
  'updateMapping',
  'handleGeneratedByFunctionChange',
  'clearMapping',
  'handleCustomBindingToggle',
  'openCustomBindingModal',
  'handleEditCustomField',
  'handleDeleteCustomField',
  'handleRefreshCustomFields',
  'update:databaseType',
  'update:customBindingEnabled',
])

const activeTab = ref('manual')
const algorithm = ref('fuzzy')
const matchingLoading = ref(false)
const matchProgress = ref(0)

const stats = computed(() => {
  return {
    matched: props.enhancedMatchingStats.matched || 0,
    unmatched: props.enhancedMatchingStats.unmatched || 0,
    total: props.enhancedMatchingStats.total || 0,
    customBindings: props.enhancedMatchingStats.customBindings || 0,
  }
})

const matchRate = computed(() => {
  return props.enhancedMatchingStats.matchRate || 0
})

const matchRateClass = computed(() => {
  const rate = matchRate.value
  if (rate >= 80) return 'excellent'
  if (rate >= 60) return 'good'
  if (rate >= 40) return 'warning'
  return 'danger'
})

const customBindingEnabled = computed({
  get: () => props.customBindingEnabled,
  set: (val) => emit('update:customBindingEnabled', val),
})

const mappingFields = computed(() => {
  return props.filteredFieldMappings || []
})

const mappingColumns = [
  {
    title: 'DDL字段',
    key: 'ddlField',
    width: '25%',
    align: 'left',
  },
  {
    title: 'Excel列',
    key: 'excelColumn',
    width: '30%',
    align: 'left',
  },
  {
    title: '匹配状态',
    key: 'status',
    width: '20%',
    align: 'center',
  },
  {
    title: '操作',
    key: 'actions',
    width: '25%',
    align: 'center',
  },
]

const hasValidMappings = computed(() => {
  return mappingFields.value.some((field) => field.excelIndex !== -1)
})

const isColumnUsed = (columnIndex, currentExcelIndex = -1) => {
  return mappingFields.value.some(
    (mapping) =>
      mapping.excelIndex === columnIndex &&
      mapping.excelIndex !== -1 &&
      mapping.excelIndex !== currentExcelIndex,
  )
}

const getConfidenceColor = (confidence) => {
  const colorMap = {
    high: 'green',
    medium: 'orange',
    low: 'red',
    manual: 'purple',
  }
  return colorMap[confidence] || 'default'
}

const getConfidenceText = (confidence) => {
  const textMap = {
    high: '高匹配',
    medium: '中匹配',
    low: '低匹配',
    manual: '手动绑定',
  }
  return textMap[confidence] || '已绑定'
}

/**
 * 获取匹配状态提示信息
 * @param {Object} record - 字段映射记录
 * @returns {string} 提示文本
 */
const getStatusTooltip = (record) => {
  if (!record.confidence) {
    return `已绑定到: ${props.excelHeaders?.[record.excelIndex] || '未知列'}`
  }

  const confidenceText = {
    high: '高置信度匹配',
    medium: '中等置信度匹配',
    low: '低置信度匹配，建议检查',
    manual: '手动绑定',
  }

  let tooltip = confidenceText[record.confidence] || '已绑定'

  if (record.similarity) {
    tooltip += `\n相似度: ${(record.similarity * 100).toFixed(1)}%`
  }

  if (props.excelHeaders?.[record.excelIndex]) {
    tooltip += `\nExcel列: ${props.excelHeaders[record.excelIndex]}`
  }

  return tooltip
}

/**
 * 显示匹配详情
 * @param {Object} record - 字段映射记录
 */
const showMatchDetail = (record) => {
  // 可以扩展为打开详情弹窗或侧边面板
  console.log('匹配详情:', record)
}

const getSimilarityColor = (similarity) => {
  if (similarity >= 0.8) return '#52c41a'
  if (similarity >= 0.6) return '#faad14'
  if (similarity >= 0.4) return '#fa8c16'
  return '#ff4d4f'
}

const getFieldTypeClass = (type) => {
  if (!type) return 'default'
  const lowerType = type.toLowerCase()
  if (lowerType.includes('int') || lowerType.includes('float') || lowerType.includes('decimal')) {
    return 'number'
  }
  if (lowerType.includes('varchar') || lowerType.includes('text') || lowerType.includes('char')) {
    return 'string'
  }
  if (lowerType.includes('date') || lowerType.includes('time')) {
    return 'date'
  }
  if (lowerType.includes('bool')) {
    return 'boolean'
  }
  return 'default'
}

const handleAutoMatchFields = async () => {
  matchingLoading.value = true
  matchProgress.value = 0
  const interval = setInterval(() => {
    if (matchProgress.value < 90) {
      matchProgress.value += 10
    }
  }, 100)
  await emit('autoMatchFields')
  clearInterval(interval)
  matchProgress.value = 100
  setTimeout(() => {
    matchingLoading.value = false
    matchProgress.value = 0
  }, 500)
}

const handleUpdateMapping = (ddlFieldName, excelIndex) => {
  emit('updateMapping', ddlFieldName, excelIndex)
}

const handleGeneratedByFunctionChange = (record) => {
  emit('handleGeneratedByFunctionChange', record)
}

const handleClearMapping = (ddlFieldName) => {
  emit('clearMapping', ddlFieldName)
}

const handleClearAllMappings = () => {
  emit('clearAllMappings')
}

const handleValidateEnhancedMappings = () => {
  emit('validateEnhancedMappings')
}

const handleCustomBindingToggle = (checked) => {
  customBindingEnabled.value = checked
  emit('handleCustomBindingToggle', checked)
}

const handleOpenCustomBindingModal = () => {
  emit('openCustomBindingModal')
}

const handleEditCustomField = (record) => {
  emit('handleEditCustomField', record)
}

const handleDeleteCustomField = (record) => {
  emit('handleDeleteCustomField', record)
}

const handleRefreshCustomFields = () => {
  emit('handleRefreshCustomFields')
}

const handleDatabaseTypeChange = (e) => {
  emit('update:databaseType', e.target.value)
}
</script>

<style scoped>
.field-mapping-wrapper {
  width: 100%;
}

.field-mapping-card {
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.5);
  border-radius: 12px;
  padding: 20px;
  transition: all 0.3s ease;
}

.field-mapping-card:hover {
  box-shadow: 0 8px 32px rgba(22, 119, 255, 0.12);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
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
  color: #1f2937;
  display: flex;
  align-items: center;
  gap: 8px;
}

.match-rate-badge {
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 600;
  color: white;
  transition: all 0.3s ease;
}

.match-rate-badge.excellent {
  background: linear-gradient(135deg, #52c41a 0%, #389e0d 100%);
}

.match-rate-badge.good {
  background: linear-gradient(135deg, #1890ff 0%, #096dd9 100%);
}

.match-rate-badge.warning {
  background: linear-gradient(135deg, #faad14 0%, #d48806 100%);
}

.match-rate-badge.danger {
  background: linear-gradient(135deg, #ff4d4f 0%, #cf1322 100%);
}

.header-stats {
  display: flex;
  gap: 16px;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 12px;
  background: #f5f5f5;
  border-radius: 20px;
  font-size: 13px;
  color: #6b7280;
}

.stat-item.success {
  background: #f6ffed;
  color: #52c41a;
}

.stat-item.warning {
  background: #fff7e6;
  color: #fa8c16;
}

.mapping-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.mapping-tabs {
  background: #fafafa;
  border-radius: 8px;
  padding: 16px;
}

.tab-content {
  padding: 16px 0;
}

.auto-match-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.section-header {
  margin-bottom: 8px;
}

.section-header h4 {
  margin: 0 0 4px 0;
  font-size: 14px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
}

.section-desc {
  margin: 0;
  font-size: 13px;
  color: #6b7280;
}

.match-algorithm {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.match-progress {
  margin-top: 8px;
}

.progress-text {
  font-size: 12px;
  color: #6b7280;
  margin-top: 4px;
  display: block;
}

.mapping-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.mapping-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: white;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
  transition: all 0.2s ease;
}

.mapping-item:hover {
  border-color: #1677ff;
  box-shadow: 0 2px 8px rgba(22, 119, 255, 0.1);
}

.mapping-item.is-unmatched {
  background: #fffbeb;
  border-color: #fcd34d;
}

.mapping-field {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 140px;
}

.field-badge {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  font-family: 'JetBrains Mono', monospace;
  background: #f3f4f6;
  color: #374151;
}

.field-badge.number {
  background: #eff6ff;
  color: #1d4ed8;
}

.field-badge.string {
  background: #f0fdf4;
  color: #16a34a;
}

.field-badge.date {
  background: #fefce8;
  color: #ca8a04;
}

.field-badge.boolean {
  background: #fdf4ff;
  color: #a855f7;
}

.mapping-arrow {
  color: #9ca3af;
  font-size: 12px;
}

.mapping-target {
  flex: 1;
  min-width: 180px;
}

.mapping-status {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 120px;
}

.mapping-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.col-index {
  color: #9ca3af;
  font-size: 11px;
}

.batch-actions {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.action-group {
  padding: 16px;
  background: white;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
}

.action-group h4 {
  margin: 0 0 12px 0;
  font-size: 14px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
}

.custom-binding-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.action-hint {
  margin: 8px 0 0 0;
  font-size: 12px;
  color: #6b7280;
}

.database-type-section {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
  border-radius: 8px;
  border: 1px solid #bae6fd;
  flex-wrap: wrap;
}

.section-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  color: #1f2937;
}

.database-hint {
  width: 100%;
  margin-top: 8px;
  font-size: 12px;
  color: #6b7280;
}

.mapping-footer {
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid rgba(0, 0, 0, 0.06);
  display: flex;
  justify-content: flex-end;
}

[data-theme='dark'] .field-mapping-card {
  background: rgba(30, 41, 59, 0.6);
  border-color: rgba(255, 255, 255, 0.1);
}

[data-theme='dark'] .header-left h3 {
  color: #f1f5f9;
}

[data-theme='dark'] .card-header {
  border-color: rgba(255, 255, 255, 0.1);
}

[data-theme='dark'] .match-rate-badge {
  color: white;
}

[data-theme='dark'] .stat-item {
  background: #1e293b;
  color: #9ca3af;
}

[data-theme='dark'] .stat-item.success {
  background: rgba(82, 196, 26, 0.2);
}

[data-theme='dark'] .stat-item.warning {
  background: rgba(250, 173, 20, 0.2);
}

[data-theme='dark'] .mapping-tabs {
  background: #1e293b;
}

[data-theme='dark'] .mapping-item {
  background: #1e293b;
  border-color: #475569;
}

[data-theme='dark'] .mapping-item:hover {
  border-color: #60a5fa;
}

[data-theme='dark'] .mapping-item.is-unmatched {
  background: rgba(251, 191, 36, 0.1);
  border-color: rgba(251, 191, 36, 0.3);
}

[data-theme='dark'] .field-badge {
  background: #334155;
  color: #e2e8f0;
}

[data-theme='dark'] .field-badge.number {
  background: rgba(29, 78, 216, 0.2);
  color: #60a5fa;
}

[data-theme='dark'] .field-badge.string {
  background: rgba(22, 163, 74, 0.2);
  color: #4ade80;
}

[data-theme='dark'] .section-desc {
  color: #9ca3af;
}

[data-theme='dark'] .action-group {
  background: #1e293b;
  border-color: #475569;
}

[data-theme='dark'] .action-hint {
  color: #9ca3af;
}

[data-theme='dark'] .database-type-section {
  background: linear-gradient(135deg, rgba(22, 119, 255, 0.1) 0%, rgba(20, 201, 201, 0.1) 100%);
  border-color: rgba(22, 119, 255, 0.3);
}

[data-theme='dark'] .section-label {
  color: #f1f5f9;
}

[data-theme='dark'] .database-hint {
  color: #9ca3af;
}

[data-theme='dark'] .progress-text {
  color: #9ca3af;
}

[data-theme='dark'] .col-index {
  color: #6b7280;
}

/* 表格样式 */
.mapping-table {
  margin-top: 8px;
}

.mapping-table :deep(.ant-table) {
  background: transparent;
}

.mapping-table :deep(.ant-table-thead > tr > th) {
  background: #f8fafc;
  font-weight: 600;
  color: #374151;
  border-bottom: 2px solid #e5e7eb;
}

.mapping-table :deep(.ant-table-tbody > tr > td) {
  padding: 12px 16px;
  border-bottom: 1px solid #f1f5f9;
}

.mapping-table :deep(.ant-table-tbody > tr:hover > td) {
  background: #f8fafc;
}

.mapping-table :deep(.ant-table-tbody > tr.unmatched-row) {
  background: #fffbeb;
}

.mapping-table :deep(.ant-table-tbody > tr.unmatched-row:hover > td) {
  background: #fef3c7;
}

.field-cell {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.status-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

/* 匹配状态可视化样式 */
.status-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 4px;
}

.match-type-tag {
  display: flex;
  align-items: center;
  gap: 4px;
  font-weight: 500;
}

.match-type-tag :deep(.anticon) {
  font-size: 12px;
}

.similarity-progress {
  width: 60px;
}

.similarity-progress :deep(.ant-progress-inner) {
  background-color: #f1f5f9;
  border-radius: 4px;
}

.detail-btn {
  padding: 0 4px;
  height: 20px;
  font-size: 11px;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.status-wrapper:hover .detail-btn {
  opacity: 1;
}

/* 未匹配状态样式 */
.unmatched-status {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.unmatched-tag {
  display: flex;
  align-items: center;
  gap: 4px;
  background: #f3f4f6;
  color: #6b7280;
  border: 1px dashed #d1d5db;
}

.unmatched-tag :deep(.anticon) {
  font-size: 12px;
}

.actions-cell {
  display: flex;
  align-items: center;
  gap: 12px;
  justify-content: center;
}

/* 暗黑模式适配 */
[data-theme='dark'] .similarity-progress :deep(.ant-progress-inner) {
  background-color: #334155;
}

[data-theme='dark'] .unmatched-tag {
  background: #374151;
  color: #9ca3af;
  border-color: #4b5563;
}

[data-theme='dark'] .mapping-table :deep(.ant-table-thead > tr > th) {
  background: #1e293b;
  color: #e2e8f0;
  border-bottom-color: #475569;
}

[data-theme='dark'] .mapping-table :deep(.ant-table-tbody > tr > td) {
  border-bottom-color: #334155;
}

[data-theme='dark'] .mapping-table :deep(.ant-table-tbody > tr:hover > td) {
  background: #334155;
}

[data-theme='dark'] .mapping-table :deep(.ant-table-tbody > tr.unmatched-row) {
  background: rgba(251, 191, 36, 0.1);
}

[data-theme='dark'] .mapping-table :deep(.ant-table-tbody > tr.unmatched-row:hover > td) {
  background: rgba(251, 191, 36, 0.2);
}
</style>
