<template>
  <div class="cell-split-config">
    <a-divider style="margin: 12px 0" />
    <div class="cell-split-header">
      <a-checkbox :checked="enabled" @change="handleToggle"> 启用单元格数据拆分 </a-checkbox>
      <a-tooltip title="将单元格内使用分隔符分割的多个数据项拆分成多行数据">
        <QuestionCircleOutlined />
      </a-tooltip>
    </div>
    <div v-if="enabled" class="cell-split-controls">
      <div class="cell-split-separator">
        <label>选择分隔符:</label>
        <a-select
          :value="separator"
          placeholder="请选择分隔符"
          style="width: 100%; max-width: 200px"
          @change="handleSeparatorChange"
        >
          <a-select-option value=",">逗号 (,)</a-select-option>
          <a-select-option value=";">分号 (;)</a-select-option>
          <a-select-option value="|">竖线 (|)</a-select-option>
          <a-select-option value="\t">制表符 (Tab)</a-select-option>
          <a-select-option value=" ">空格 ( )</a-select-option>
          <a-select-option value="/">斜杠 (/)</a-select-option>
          <a-select-option value="-">连字符 (-)</a-select-option>
          <a-select-option value="_">下划线 (_)</a-select-option>
          <a-select-option value="custom">自定义</a-select-option>
        </a-select>
      </div>
      <div v-if="separator === 'custom'" class="cell-split-custom-separator">
        <label>自定义分隔符:</label>
        <a-input
          :value="customSeparator"
          placeholder="请输入自定义分隔符"
          style="width: 100%; max-width: 200px"
          @pressEnter="handleApply"
          @input="handleCustomSeparatorInput"
        />
        <a-button type="primary" size="small" @click="handleApply"> 应用 </a-button>
      </div>
      <div v-if="stats.expandedRows > 0" class="cell-split-stats">
        <a-tag color="blue">原始: {{ stats.originalRows }} 行</a-tag>
        <a-tag color="green">拆分后: {{ stats.splitRows }} 行</a-tag>
        <a-tag color="orange">新增: {{ stats.expandedRows }} 行</a-tag>
      </div>
    </div>
  </div>
</template>

<script setup>
import { QuestionCircleOutlined } from '@ant-design/icons-vue'

defineProps({
  enabled: {
    type: Boolean,
    default: false,
  },
  separator: {
    type: String,
    default: ',',
  },
  customSeparator: {
    type: String,
    default: '',
  },
  stats: {
    type: Object,
    default: () => ({
      originalRows: 0,
      splitRows: 0,
      expandedRows: 0,
    }),
  },
})

const emit = defineEmits(['toggle', 'separator-change', 'apply', 'update:customSeparator'])

const handleToggle = (e) => {
  emit('toggle', e.target.checked)
}

const handleSeparatorChange = (value) => {
  emit('separator-change', value)
}

const handleCustomSeparatorInput = (value) => {
  emit('update:customSeparator', value)
}

const handleApply = () => {
  emit('apply')
}
</script>

<style scoped>
.cell-split-config {
  margin-top: 16px;
}

.cell-split-header {
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

.cell-split-header:hover {
  box-shadow: var(--shadow-md, 0 4px 16px rgba(0, 0, 0, 0.1));
}

.cell-split-controls {
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

.cell-split-controls:hover {
  box-shadow: var(--shadow-md, 0 4px 16px rgba(0, 0, 0, 0.1));
}

.cell-split-separator {
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.cell-split-separator label {
  font-weight: 500;
  color: var(--text-primary, #1f2937);
  white-space: nowrap;
}

.cell-split-separator .ant-select {
  transition: all var(--transition-fast, 120ms) ease;
}

.cell-split-separator .ant-select:hover {
  box-shadow: 0 0 0 2px rgba(22, 119, 255, 0.1);
}

.cell-split-separator .ant-select-focused {
  box-shadow: 0 0 0 2px rgba(22, 119, 255, 0.3);
}

.cell-split-custom-separator {
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.cell-split-custom-separator label {
  font-weight: 500;
  color: var(--text-primary, #1f2937);
  white-space: nowrap;
}

.cell-split-custom-separator .ant-input {
  transition: all var(--transition-fast, 120ms) ease;
}

.cell-split-custom-separator .ant-input:hover {
  box-shadow: 0 0 0 2px rgba(22, 119, 255, 0.1);
}

.cell-split-custom-separator .ant-input:focus {
  box-shadow: 0 0 0 2px rgba(22, 119, 255, 0.3);
}

.cell-split-stats {
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

.cell-split-stats:hover {
  background: linear-gradient(135deg, rgba(22, 119, 255, 0.08) 0%, rgba(20, 201, 201, 0.08) 100%);
  box-shadow: var(--shadow-sm, 0 2px 8px rgba(0, 0, 0, 0.08));
}

.cell-split-stats .ant-tag {
  background: white;
  border: 1px solid rgba(22, 119, 255, 0.2);
  color: var(--text-primary, #1f2937);
  font-weight: 500;
  padding: 6px 14px;
  border-radius: var(--border-radius-xs, 4px);
  transition: all var(--transition-fast, 120ms) ease;
}

.cell-split-stats .ant-tag:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-sm, 0 2px 8px rgba(0, 0, 0, 0.08));
}

.cell-split-stats .ant-tag.ant-tag-blue {
  border-color: rgba(59, 130, 246, 0.3);
  color: #3b82f6;
}

.cell-split-stats .ant-tag.ant-tag-green {
  border-color: rgba(16, 185, 129, 0.3);
  color: #10b981;
}

.cell-split-stats .ant-tag.ant-tag-orange {
  border-color: rgba(245, 158, 11, 0.3);
  color: #f59e0b;
}

[data-theme='dark'] .cell-split-header {
  background: var(--card-bg, rgba(30, 41, 59, 0.6));
  border-color: var(--card-border, rgba(255, 255, 255, 0.1));
}

[data-theme='dark'] .cell-split-controls {
  background: var(--card-bg, rgba(30, 41, 59, 0.6));
  border-color: var(--card-border, rgba(255, 255, 255, 0.1));
}

[data-theme='dark'] .cell-split-separator label,
[data-theme='dark'] .cell-split-custom-separator label {
  color: var(--text-primary, #f3f4f6);
}

[data-theme='dark'] .cell-split-stats {
  background: linear-gradient(135deg, rgba(22, 119, 255, 0.1) 0%, rgba(20, 201, 201, 0.1) 100%);
  border-color: rgba(22, 119, 255, 0.2);
}

[data-theme='dark'] .cell-split-stats .ant-tag {
  background: rgba(30, 41, 59, 0.8);
  border-color: rgba(22, 119, 255, 0.3);
  color: var(--text-primary, #f3f4f6);
}
</style>
