<template>
  <div class="input-card field-mapping-card" v-if="props.showFieldMapping">
    <div class="card-header">
      <h3>字段映射配置</h3>
      <a-tooltip title="建立DDL字段与Excel列的映射关系，支持自动匹配和手动调整">
        <QuestionCircleOutlined />
      </a-tooltip>
    </div>

    <div class="mapping-stats">
      <a-statistic
        title="匹配率"
        :value="props.enhancedMatchingStats.matchRate"
        :precision="1"
        suffix="%"
      />
      <a-statistic
        title="已匹配"
        :value="props.enhancedMatchingStats.matched"
        :value-style="{ color: '#3f8600' }"
      />
      <a-statistic
        title="未匹配"
        :value="props.enhancedMatchingStats.unmatched"
        :value-style="{ color: '#cf1322' }"
      />

      <div v-if="props.hasCustomBindingConfig" class="custom-binding-stats">
        <a-divider type="vertical" />
        <a-statistic
          title="自定义绑定"
          :value="props.enhancedMatchingStats.customBindings || 0"
          :value-style="{ color: '#1890ff' }"
        />
        <a-statistic
          title="字段拼接"
          :value="props.enhancedMatchingStats.concatenationRules || 0"
          :value-style="{ color: '#722ed1' }"
        />
      </div>
    </div>

    <a-table
      :data-source="props.filteredFieldMappings"
      :columns="props.mappingColumns"
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
              v-if="props.excelHeaders && props.excelHeaders.length > 0"
              :value="record.excelIndex"
              style="width: 100%; max-width: 280px; margin-top: 8px"
              placeholder="选择Excel列"
              size="small"
              @change="(value) => handleUpdateMapping(record.ddlField.name, value)"
            >
              <a-select-option :value="-1">未绑定</a-select-option>
              <a-select-option
                v-for="(header, idx) in props.excelHeaders || []"
                :key="idx"
                :value="idx"
                :disabled="isColumnUsed(idx, record.excelIndex)"
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
            :checked="record.generatedByFunction"
            @change="handleGeneratedByFunctionChange(record)"
          />
        </template>

        <template v-if="column.key === 'actions'">
          <a-space>
            <a-button type="link" size="small" @click="handleClearMapping(record.ddlField.name)">
              清除
            </a-button>
          </a-space>
        </template>
      </template>
    </a-table>

    <div class="mapping-actions">
      <a-button @click="handleAutoMatchFields">自动匹配</a-button>
      <a-button @click="handleClearAllMappings">清除所有</a-button>
      <a-button type="primary" @click="handleValidateEnhancedMappings">验证映射</a-button>

      <a-divider type="vertical" />
      <a-switch
        :checked="props.customBindingEnabled"
        checked-children="自定义绑定"
        un-checked-children="标准模式"
        size="small"
        @change="handleCustomBindingToggle"
      />
      <a-button
        type="dashed"
        @click="handleOpenCustomBindingModal"
        :disabled="!props.customBindingEnabled"
      >
        <template #icon><SettingOutlined /></template>
        配置绑定
      </a-button>
    </div>

    <CustomFieldManager
      v-if="props.customBindingEnabled"
      :key="props.customFieldManagerKey"
      :custom-fields="props.customFieldsData"
      :custom-binding-manager="props.customBindingManager"
      @edit="handleEditCustomField"
      @delete="handleDeleteCustomField"
      @refresh="handleRefreshCustomFields"
    />

    <div class="database-type-section">
      <h4>数据库类型</h4>
      <a-radio-group
        :value="props.databaseType"
        button-style="solid"
        @change="handleDatabaseTypeChange"
      >
        <a-radio-button value="mysql">MySQL</a-radio-button>
        <a-radio-button value="postgresql">PostgreSQL</a-radio-button>
        <a-radio-button value="sqlserver">SQL Server</a-radio-button>
      </a-radio-group>
      <div class="database-type-hint">
        <small>选择目标数据库类型，确保生成的SQL符合对应语法规范</small>
      </div>
    </div>
  </div>
</template>

<script setup>
import { QuestionCircleOutlined, SettingOutlined } from '@ant-design/icons-vue'
import CustomFieldManager from '@/components/CustomFieldManager/CustomFieldManager.vue'

const props = defineProps({
  showFieldMapping: {
    type: Boolean,
    default: false,
  },
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
  filteredFieldMappings: {
    type: Array,
    default: () => [],
  },
  mappingColumns: {
    type: Array,
    default: () => [],
  },
  excelHeaders: {
    type: Array,
    default: () => [],
  },
  customBindingEnabled: {
    type: Boolean,
    default: false,
  },
  customFieldsData: {
    type: Array,
    default: () => [],
  },
  customFieldManagerKey: {
    type: String,
    default: '',
  },
  customBindingManager: {
    type: Object,
    default: () => ({}),
  },
  databaseType: {
    type: String,
    default: 'mysql',
  },
  hasCustomBindingConfig: {
    type: Boolean,
    default: false,
  },
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

const isColumnUsed = (columnIndex, currentExcelIndex = -1) => {
  return props.filteredFieldMappings.some(
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
  return colorMap[confidence] || 'gray'
}

const getConfidenceText = (confidence) => {
  const textMap = {
    high: '高',
    medium: '中',
    low: '低',
    manual: '手动',
  }
  return textMap[confidence] || '-'
}

const getSimilarityColor = (similarity) => {
  if (similarity >= 0.8) return '#52c41a'
  if (similarity >= 0.6) return '#faad14'
  if (similarity >= 0.4) return '#fa8c16'
  return '#ff4d4f'
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

const handleAutoMatchFields = () => {
  emit('autoMatchFields')
}

const handleClearAllMappings = () => {
  emit('clearAllMappings')
}

const handleValidateEnhancedMappings = () => {
  emit('validateEnhancedMappings')
}

const handleCustomBindingToggle = (checked) => {
  emit('update:customBindingEnabled', checked)
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

const handleDatabaseTypeChange = (value) => {
  emit('update:databaseType', value)
}
</script>

<style scoped>
.field-mapping-card {
  margin-bottom: 20px;
}

.field-mapping-card .card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.field-mapping-card .card-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.mapping-stats {
  display: flex;
  gap: 24px;
  margin-bottom: 20px;
  padding: 16px;
  background: #fafafa;
  border-radius: 4px;
}

.custom-binding-stats {
  display: flex;
  align-items: center;
  gap: 16px;
}

.ddl-field-cell {
  padding: 8px 0;
}

.ddl-field-info {
  margin-bottom: 8px;
}

.ddl-field-info strong {
  display: block;
  margin-bottom: 4px;
}

.field-type {
  color: #666;
  font-size: 12px;
}

.no-excel-hint {
  color: #999;
  font-size: 12px;
  padding: 8px 0;
}

.mapping-actions {
  display: flex;
  align-items: center;
  margin: 16px 0;
  gap: 8px;
}

.database-type-section {
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid #f0f0f0;
}

.database-type-section h4 {
  margin: 0 0 12px 0;
  font-size: 14px;
  font-weight: 600;
}

.database-type-hint {
  margin-top: 8px;
  color: #666;
  font-size: 12px;
}
</style>
