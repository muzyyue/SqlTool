<template>
  <div class="batch-edit-panel">
    <!-- 玻璃态卡片容器 -->
    <div class="glass-card">
      <!-- 折叠面板 -->
      <a-collapse v-model:activeKey="activeKey" :bordered="false">
        <a-collapse-panel key="1" header="批量修改SQL语句">
          <!-- 操作按钮栏 -->
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

          <!-- 修改规则列表 -->
          <div v-if="editRules.length > 0" class="rules-list">
            <div v-for="rule in editRules" :key="rule.id" class="rule-item glass-card-inner">
              <!-- 规则头部 -->
              <div class="rule-header">
                <span class="rule-title">修改规则 #{{ editRules.indexOf(rule) + 1 }}</span>
                <a-button type="link" danger size="small" @click="handleRemoveRule(rule.id)">
                  <template #icon><DeleteOutlined /></template>
                  删除
                </a-button>
              </div>

              <!-- 字段选择 -->
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

              <!-- 新值输入 -->
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

              <!-- 条件设置 -->
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
          </div>

          <!-- 空状态提示 -->
          <a-empty
            v-else
            description="暂无修改规则，点击上方按钮添加"
            :image="Empty.PRESENTED_IMAGE_SIMPLE"
            style="padding: 40px 0"
          />

          <!-- 底部操作按钮 -->
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

            <!-- 预览结果提示 -->
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
  Empty,
} from '@ant-design/icons-vue'
import { useBatchEdit } from '@/composables/useBatchEdit'

/**
 * BatchEditPanel组件 - 批量修改SQL语句面板
 *
 * @component
 * @example
 * <BatchEditPanel
 *   :ddl-fields="parsedFields"
 *   :sql="generatedSql"
 *   @preview="handlePreview"
 *   @apply="handleApply"
 * />
 */

// Props定义
const props = defineProps({
  /**
   * DDL字段列表
   * @type {Array<{name: string, type: string}>}
   */
  ddlFields: {
    type: Array,
    default: () => [],
  },
  /**
   * 当前SQL语句
   * @type {string}
   */
  sql: {
    type: String,
    default: '',
  },
  /**
   * 是否自动预览
   * @type {boolean}
   */
  autoPreview: {
    type: Boolean,
    default: false,
  },
})

// Emits定义
const emit = defineEmits(['preview', 'apply', 'change'])

// 使用批量编辑功能
const {
  editRules,
  previewResult,
  addRule,
  removeRule,
  previewBatchEdit,
  resetRules,
  getRulesStats,
} = useBatchEdit()

// 响应式状态
const activeKey = ref([])
const previewing = ref(false)
const applying = ref(false)

// 计算属性：字段选项
const fieldOptions = computed(() => {
  return props.ddlFields.map((field) => ({
    label: `${field.name} (${field.type})`,
    value: field.name,
  }))
})

// 计算属性：规则统计
const rulesStats = computed(() => {
  return getRulesStats()
})

/**
 * 过滤选项
 * @param {string} input - 输入值
 * @param {Object} option - 选项对象
 * @returns {boolean} 是否匹配
 */
const filterOption = (input, option) => {
  return option.label.toLowerCase().includes(input.toLowerCase())
}

/**
 * 处理添加规则
 * @returns {void}
 */
const handleAddRule = () => {
  addRule()
  // 自动展开面板
  if (activeKey.value.length === 0) {
    activeKey.value = ['1']
  }
  emit('change', editRules.value)
}

/**
 * 处理删除规则
 * @param {string} ruleId - 规则ID
 * @returns {void}
 */
const handleRemoveRule = (ruleId) => {
  removeRule(ruleId)
  emit('change', editRules.value)
}

/**
 * 处理重置
 * @returns {void}
 */
const handleReset = () => {
  resetRules()
  message.info('已重置所有修改规则')
  emit('change', editRules.value)
}

/**
 * 处理预览
 * @returns {void}
 */
const handlePreview = async () => {
  if (!props.sql) {
    message.warning('请先生成SQL语句')
    return
  }

  if (editRules.value.length === 0) {
    message.warning('请先添加修改规则')
    return
  }

  // 验证规则
  const invalidRules = editRules.value.filter(
    (rule) => !rule.fieldName || rule.newValue === undefined || rule.newValue === '',
  )
  if (invalidRules.length > 0) {
    message.warning('请完善所有修改规则的字段和新值')
    return
  }

  previewing.value = true
  try {
    const result = previewBatchEdit(props.sql)
    emit('preview', result)
    message.success(`预览成功，将影响 ${result.affectedRows} 行数据`)
  } catch (error) {
    message.error('预览失败：' + error.message)
  } finally {
    previewing.value = false
  }
}

/**
 * 处理应用
 * @returns {void}
 */
const handleApply = async () => {
  if (!props.sql) {
    message.warning('请先生成SQL语句')
    return
  }

  if (editRules.value.length === 0) {
    message.warning('请先添加修改规则')
    return
  }

  // 验证规则
  const invalidRules = editRules.value.filter(
    (rule) => !rule.fieldName || rule.newValue === undefined || rule.newValue === '',
  )
  if (invalidRules.length > 0) {
    message.warning('请完善所有修改规则的字段和新值')
    return
  }

  applying.value = true
  try {
    const result = previewBatchEdit(props.sql)
    emit('apply', result)
    message.success(`应用成功，已修改 ${result.affectedRows} 行数据`)
  } catch (error) {
    message.error('应用失败：' + error.message)
  } finally {
    applying.value = false
  }
}

// 监听规则变化，自动预览
watch(
  editRules,
  () => {
    if (props.autoPreview && props.sql && editRules.value.length > 0) {
      const result = previewBatchEdit(props.sql)
      emit('preview', result)
    }
    emit('change', editRules.value)
  },
  { deep: true },
)

// 监听SQL变化，清空预览结果
watch(
  () => props.sql,
  () => {
    previewResult.value = {
      sql: '',
      affectedRows: 0,
    }
  },
)

// 暴露方法给父组件
defineExpose({
  addRule,
  removeRule,
  resetRules,
  previewBatchEdit,
})
</script>

<style scoped>
/* 主容器 */
.batch-edit-panel {
  margin-top: 16px;
}

/* 玻璃态卡片 */
.glass-card {
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-radius: 12px;
  box-shadow: 0 8px 32px 0 rgba(22, 119, 255, 0.12);
  border: 1px solid rgba(255, 255, 255, 0.3);
  overflow: hidden;
}

/* 内部玻璃态卡片 */
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

/* 操作栏 */
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

/* 规则列表 */
.rules-list {
  max-height: 500px;
  overflow-y: auto;
  padding: 0 4px;
}

/* 规则项 */
.rule-item {
  margin-bottom: 12px;
}

.rule-item:last-child {
  margin-bottom: 0;
}

/* 规则头部 */
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

/* 规则字段 */
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

/* 条件部分 */
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

/* 底部操作按钮 */
.bottom-actions {
  display: flex;
  align-items: center;
  padding: 16px;
  background: linear-gradient(135deg, rgba(22, 119, 255, 0.05) 0%, rgba(20, 201, 201, 0.05) 100%);
  border-top: 1px solid rgba(22, 119, 255, 0.1);
  margin-top: 16px;
  border-radius: 8px;
}

/* 滚动条样式 */
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

/* Ant Design Collapse样式覆盖 */
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
  padding: 0 16px 16px 16px;
}

/* 暗色主题支持 */
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

/* 响应式设计 */
@media (max-width: 768px) {
  .action-bar {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .stats-info {
    width: 100%;
    justify-content: flex-start;
  }

  .bottom-actions {
    flex-direction: column;
    align-items: stretch;
  }

  .bottom-actions :deep(.ant-space) {
    width: 100%;
    justify-content: center;
  }

  .bottom-actions .ant-alert {
    margin-left: 0 !important;
    margin-top: 12px;
  }
}

/* 微交互动画 */
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

/* 按钮悬停效果 */
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
</style>
