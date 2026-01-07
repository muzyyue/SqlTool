<template>
  <div class="batch-edit-panel">
    <div class="glass-card">
      <a-collapse v-model:activeKey="activeKey" :bordered="false">
        <a-collapse-panel key="1" header="批量修改SQL语句">
          <div class="action-bar">
            <a-space>
              <a-button type="primary" @click="handleAddRule" size="small">
                <template #icon><PlusOutlined /></template>
                添加修改规则
              </a-button>
              <a-button @click="handleReset" size="small" :disabled="editRules.length === 0">
                <template #icon><ReloadOutlined /></template>
                重置
              </a-button>
            </a-space>

            <div class="stats-info">
              <a-tag color="blue">规则数量: {{ editRules.length }}</a-tag>
              <a-tag v-if="rulesStats.withCondition > 0" color="orange">
                带条件: {{ rulesStats.withCondition }}
              </a-tag>
            </div>
          </div>

          <div v-if="editRules.length > 0" class="rules-list">
            <div v-for="rule in editRules" :key="rule.id" class="rule-item glass-card-inner">
              <div class="rule-header">
                <span class="rule-title">修改规则 #{{ editRules.indexOf(rule) + 1 }}</span>
                <a-button type="link" danger size="small" @click="handleRemoveRule(rule.id)">
                  <template #icon><DeleteOutlined /></template>
                  删除
                </a-button>
              </div>

              <div class="rule-field">
                <label class="field-label">选择字段:</label>
                <a-select
                  v-model:value="rule.fieldName"
                  placeholder="请选择要修改的字段"
                  style="width: 100%"
                  :options="fieldOptions"
                  show-search
                  :filter-option="filterOption"
                />
              </div>

              <div class="rule-field">
                <label class="field-label">新值:</label>
                <a-input
                  v-model:value="rule.newValue"
                  placeholder="输入新的字段值"
                  :allow-clear="true"
                >
                  <template #suffix>
                    <a-tooltip title="输入NULL表示设置为空值">
                      <InfoCircleOutlined style="color: #999" />
                    </a-tooltip>
                  </template>
                </a-input>
              </div>

              <div class="rule-field condition-section">
                <div class="condition-header">
                  <a-checkbox v-model:checked="rule.condition.enabled">
                    <span class="condition-label">设置修改条件</span>
                  </a-checkbox>
                  <a-tooltip title="启用后，只有满足条件的行才会被修改">
                    <QuestionCircleOutlined style="color: #999; margin-left: 4px" />
                  </a-tooltip>
                </div>

                <div v-if="rule.condition.enabled" class="condition-content">
                  <div class="condition-row">
                    <label class="field-label">条件字段:</label>
                    <a-select
                      v-model:value="rule.condition.fieldName"
                      placeholder="选择条件字段"
                      style="width: 100%"
                      :options="fieldOptions"
                      show-search
                      :filter-option="filterOption"
                    />
                  </div>
                  <div class="condition-row">
                    <label class="field-label">操作符:</label>
                    <a-select
                      v-model:value="rule.condition.operator"
                      placeholder="选择操作符"
                      style="width: 100%"
                    >
                      <a-select-option value="=">=</a-select-option>
                      <a-select-option value="!=">!=</a-select-option>
                      <a-select-option value=">">&gt;</a-select-option>
                      <a-select-option value="<">&lt;</a-select-option>
                      <a-select-option value=">=">&gt;=</a-select-option>
                      <a-select-option value="<=">&lt;=</a-select-option>
                      <a-select-option value="LIKE">LIKE</a-select-option>
                      <a-select-option value="IN">IN</a-select-option>
                    </a-select>
                  </div>
                  <div class="condition-row">
                    <label class="field-label">条件值:</label>
                    <a-input
                      v-model:value="rule.condition.value"
                      placeholder="输入条件值"
                      :allow-clear="true"
                    >
                      <template #suffix>
                        <a-tooltip title="IN操作符使用逗号分隔多个值">
                          <InfoCircleOutlined style="color: #999" />
                        </a-tooltip>
                      </template>
                    </a-input>
                  </div>
                </div>
              </div>
            </div>

            <a-empty
              v-if="editRules.length === 0"
              description="暂无修改规则，点击上方按钮添加"
              style="padding: 40px 0"
            />

            <div v-if="editRules.length > 0" class="bottom-actions">
              <a-space>
                <a-button @click="handlePreview" :loading="previewing">
                  <template #icon><EyeOutlined /></template>
                  预览修改
                </a-button>
                <a-button type="primary" @click="handleApply" :loading="applying">
                  <template #icon><CheckOutlined /></template>
                  应用修改
                </a-button>
              </a-space>
            </div>

            <a-alert
              v-if="previewResult.affectedRows > 0"
              :message="`预览结果：将影响 ${previewResult.affectedRows} 行数据`"
              type="info"
              show-icon
              style="flex: 1; margin-left: 16px"
            />
          </div>
        </a-collapse-panel>
      </a-collapse>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { message } from 'ant-design-vue'
import {
  PlusOutlined,
  ReloadOutlined,
  DeleteOutlined,
  EyeOutlined,
  CheckOutlined,
  QuestionCircleOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons-vue'

const props = defineProps({
  ddlFields: {
    type: Array,
    default: () => [],
  },
  excelData: {
    type: Array,
    default: () => [],
  },
  fieldMappings: {
    type: Array,
    default: () => [],
  },
  autoPreview: {
    type: Boolean,
    default: false,
  },
  rules: {
    type: Array,
    default: () => [],
  },
})

const emit = defineEmits(['preview', 'apply', 'change', 'update:excelData'])

const activeKey = ref([])
const previewing = ref(false)
const applying = ref(false)
const editRules = ref([])
const previewResult = ref({
  affectedRows: 0,
  modifiedData: [],
})

const fieldOptions = computed(() => {
  return props.ddlFields.map((field) => ({
    label: `${field.name} (${field.type})`,
    value: field.name,
  }))
})

const rulesStats = computed(() => {
  return {
    total: editRules.value.length,
    withCondition: editRules.value.filter((r) => r.condition.enabled).length,
  }
})

const filterOption = (input, option) => {
  return option.label.toLowerCase().includes(input.toLowerCase())
}

const getExcelColumnIndex = (ddlFieldName) => {
  const mapping = props.fieldMappings.find((m) => m.ddlField === ddlFieldName)
  return mapping ? mapping.excelColumn : -1
}

const matchCondition = (fieldValue, operator, conditionValue) => {
  try {
    switch (operator) {
      case '=':
        return String(fieldValue) === String(conditionValue)
      case '!=':
        return String(fieldValue) !== String(conditionValue)
      case '>':
        return Number(fieldValue) > Number(conditionValue)
      case '<':
        return Number(fieldValue) < Number(conditionValue)
      case '>=':
        return Number(fieldValue) >= Number(conditionValue)
      case '<=':
        return Number(fieldValue) <= Number(conditionValue)
      case 'LIKE': {
        const pattern = conditionValue.replace(/%/g, '.*').replace(/_/g, '.')
        const regex = new RegExp(pattern, 'i')
        return regex.test(String(fieldValue))
      }
      case 'IN': {
        const values = conditionValue.split(',').map((v) => v.trim())
        return values.includes(String(fieldValue))
      }
      default:
        return false
    }
  } catch (error) {
    console.error('条件匹配失败:', error)
    return false
  }
}

const applyBatchEditToData = (data, rules) => {
  if (!data || !rules || rules.length === 0) {
    return {
      affectedRows: 0,
      modifiedData: data,
    }
  }

  let affectedRows = 0
  const modifiedData = data.map((row) => {
    let modified = false
    const newRow = { ...row }

    rules.forEach((rule) => {
      if (!rule.fieldName || rule.newValue === undefined || rule.newValue === '') {
        return
      }

      const columnIndex = getExcelColumnIndex(rule.fieldName)
      if (columnIndex === -1) {
        return
      }

      if (rule.condition.enabled) {
        const conditionColumnIndex = getExcelColumnIndex(rule.condition.fieldName)
        if (conditionColumnIndex === -1) {
          return
        }

        const conditionFieldValue = row[String(conditionColumnIndex)]
        if (!matchCondition(conditionFieldValue, rule.condition.operator, rule.condition.value)) {
          return
        }
      }

      newRow[String(columnIndex)] = rule.newValue
      modified = true
    })

    if (modified) {
      affectedRows++
    }

    return newRow
  })

  return {
    affectedRows,
    modifiedData,
  }
}

const handleAddRule = () => {
  const newRule = {
    id: `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    fieldName: '',
    newValue: '',
    condition: {
      enabled: false,
      operator: '=',
      value: '',
    },
  }
  editRules.value.push(newRule)
  if (activeKey.value.length === 0) {
    activeKey.value = ['1']
  }
  emit('change', editRules.value)
}

const handleRemoveRule = (ruleId) => {
  const index = editRules.value.findIndex((rule) => rule.id === ruleId)
  if (index !== -1) {
    editRules.value.splice(index, 1)
  }
  emit('change', editRules.value)
}

const handleReset = () => {
  editRules.value = []
  previewResult.value = {
    affectedRows: 0,
    modifiedData: [],
  }
  message.info('已重置所有修改规则')
  emit('change', editRules.value)
}

const handlePreview = async () => {
  if (!props.excelData || props.excelData.length === 0) {
    message.warning('请先上传Excel文件')
    return
  }
  if (editRules.value.length === 0) {
    message.warning('请先添加修改规则')
    return
  }
  previewing.value = true
  try {
    const result = applyBatchEditToData(props.excelData, editRules.value)
    previewResult.value = result
    emit('preview', result)
    message.success(`预览成功，将影响 ${result.affectedRows} 行数据`)
  } catch (error) {
    message.error('预览失败：' + error.message)
  } finally {
    previewing.value = false
  }
}

const handleApply = async () => {
  if (!props.excelData || props.excelData.length === 0) {
    message.warning('请先上传Excel文件')
    return
  }
  if (editRules.value.length === 0) {
    message.warning('请先添加修改规则')
    return
  }
  applying.value = true
  try {
    const result = applyBatchEditToData(props.excelData, editRules.value)
    emit('update:excelData', result.modifiedData)
    emit('apply', result)
    message.success(`应用成功，已修改 ${result.affectedRows} 行数据`)
  } catch (error) {
    message.error('应用失败：' + error.message)
  } finally {
    applying.value = false
  }
}

watch(
  editRules,
  () => {
    if (
      props.autoPreview &&
      props.excelData &&
      props.excelData.length > 0 &&
      editRules.value.length > 0
    ) {
      const result = applyBatchEditToData(props.excelData, editRules.value)
      emit('preview', result)
    }
    emit('change', editRules.value)
  },
  { deep: true },
)

defineExpose({
  addRule: handleAddRule,
  removeRule: handleRemoveRule,
  resetRules: handleReset,
  applyBatchEdit: () => applyBatchEditToData(props.excelData, editRules.value),
})
</script>

<style scoped>
.batch-edit-panel {
  margin-top: 16px;
}

.glass-card {
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-radius: 12px;
  box-shadow: 0 8px 32px 0 rgba(22, 119, 255, 0.12);
  border: 1px solid rgba(255, 255, 255, 0.3);
  overflow: hidden;
}

.glass-card-inner {
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  padding: 16px;
  margin-bottom: 12px;
  transition: all 0.3s ease;
}

.glass-card-inner:hover {
  box-shadow: 0 4px 16px 0 rgba(22, 119, 255, 0.08);
  transform: translateY(-2px);
}

.action-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: linear-gradient(135deg, rgba(22, 119, 255, 0.05) 0%, rgba(20, 201, 201, 0.05) 100%);
  border-bottom: 1px solid rgba(22, 119, 255, 0.1);
  margin-bottom: 16px;
  border-radius: 8px;
}

.stats-info {
  display: flex;
  gap: 8px;
}

.rules-list {
  max-height: 500px;
  overflow-y: auto;
  padding: 0;
}

.rule-item {
  margin-bottom: 12px;
}

.rule-item:last-child {
  margin-bottom: 0;
}

.rule-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(22, 119, 255, 0.1);
}

.rule-title {
  font-weight: 600;
  font-size: 14px;
  color: #1677ff;
}

.rule-field {
  margin-bottom: 12px;
}

.rule-field:last-child {
  margin-bottom: 0;
}

.field-label {
  display: block;
  margin-bottom: 6px;
  font-size: 13px;
  color: #666;
  font-weight: 500;
}

.condition-section {
  background: rgba(20, 201, 201, 0.05);
  border-radius: 6px;
  padding: 12px;
  border: 1px solid rgba(20, 201, 201, 0.1);
}

.condition-header {
  display: flex;
  align-items: center;
  margin-bottom: 12px;
}

.condition-label {
  font-size: 13px;
  font-weight: 500;
  color: #14c9c9;
}

.condition-content {
  padding-left: 24px;
}

.condition-row {
  margin-bottom: 12px;
}

.condition-row:last-child {
  margin-bottom: 0;
}

.bottom-actions {
  display: flex;
  align-items: center;
  padding: 16px;
  background: linear-gradient(135deg, rgba(22, 119, 255, 0.05) 0%, rgba(20, 201, 201, 0.05) 100%);
  border-top: 1px solid rgba(22, 119, 255, 0.1);
  margin-top: 16px;
  border-radius: 8px;
}

.bottom-actions .ant-alert {
  margin-left: 0 !important;
  margin-top: 12px;
}

.rules-list::-webkit-scrollbar {
  width: 6px;
}

.rules-list::-webkit-scrollbar-track {
  background: rgba(22, 119, 255, 0.05);
  border-radius: 3px;
}

.rules-list::-webkit-scrollbar-thumb {
  background: rgba(22, 119, 255, 0.2);
  border-radius: 3px;
}

.rules-list::-webkit-scrollbar-thumb:hover {
  background: rgba(22, 119, 255, 0.3);
}

:deep(.ant-collapse) {
  background: transparent;
  border: none;
}

:deep(.ant-collapse-item) {
  border: none;
}

:deep(.ant-collapse-header) {
  font-weight: 600;
  font-size: 15px;
  color: #1677ff;
  padding: 16px;
}

:deep(.ant-collapse-content) {
  border: none;
  background: transparent;
}

:deep(.ant-collapse-content-box) {
  padding: 0 16px 16px;
}

[data-theme='dark'] .glass-card {
  background: rgba(30, 41, 59, 0.6);
  border-color: rgba(255, 255, 255, 0.1);
  box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.3);
}

[data-theme='dark'] .glass-card-inner {
  background: rgba(30, 41, 59, 0.4);
  border-color: rgba(255, 255, 255, 0.05);
}

[data-theme='dark'] .glass-card-inner:hover {
  box-shadow: 0 4px 16px 0 rgba(0, 0, 0, 0.2);
}

[data-theme='dark'] .action-bar,
[data-theme='dark'] .bottom-actions {
  background: linear-gradient(135deg, rgba(22, 119, 255, 0.1) 0%, rgba(20, 201, 201, 0.1) 100%);
  border-color: rgba(255, 255, 255, 0.1);
}

[data-theme='dark'] .rule-header {
  border-color: rgba(255, 255, 255, 0.1);
}

[data-theme='dark'] .rule-title {
  color: #60a5fa;
}

[data-theme='dark'] .field-label {
  color: #94a3b8;
}

[data-theme='dark'] .condition-section {
  background: rgba(20, 201, 201, 0.1);
  border-color: rgba(20, 201, 201, 0.2);
}

[data-theme='dark'] .condition-label {
  color: #5eead4;
}

[data-theme='dark'] .rules-list::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.05);
}

[data-theme='dark'] .rules-list::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
}

[data-theme='dark'] .rules-list::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.2);
}

:deep(.ant-btn) {
  transition: all 0.2s ease;
}

:deep(.ant-btn:hover) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(22, 119, 255, 0.15);
}

:deep(.ant-btn:active) {
  transform: translateY(0);
  box-shadow: none;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.rule-item {
  animation: fadeIn 0.3s ease;
}
</style>
