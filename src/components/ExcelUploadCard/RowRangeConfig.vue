<template>
  <div class="row-range-config">
    <a-divider style="margin: 12px 0" />
    <div class="row-range-header">
      <a-checkbox :checked="enabled" @change="handleToggle"> 启用行范围选择 </a-checkbox>
      <a-tooltip title="只处理指定范围内的Excel行，提高处理效率">
        <QuestionCircleOutlined />
      </a-tooltip>
    </div>
    <div v-if="enabled" class="row-range-controls">
      <div class="row-range-inputs">
        <div class="row-range-input">
          <label>起始行:</label>
          <a-input-number
            :value="startRow"
            :min="1"
            :max="totalRows"
            :placeholder="`1-${totalRows}`"
            style="width: 100%"
            @change="handleStartRowChange"
          />
        </div>
        <div class="row-range-input">
          <label>结束行:</label>
          <a-input-number
            :value="endRow"
            :min="1"
            :max="totalRows"
            :placeholder="`1-${totalRows}`"
            style="width: 100%"
            @change="handleEndRowChange"
          />
        </div>
      </div>
      <div class="row-range-options">
        <a-checkbox :checked="includeHeader" @change="handleIncludeHeaderChange">
          包含表头
        </a-checkbox>
        <a-tag color="blue">文件总行数: {{ totalRows }}</a-tag>
      </div>
      <div class="row-range-actions">
        <a-button type="primary" size="small" @click="handleApply">
          <template #icon><CheckOutlined /></template>
          应用行范围
        </a-button>
        <a-button size="small" @click="handleReset">
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
</template>

<script setup>
import { QuestionCircleOutlined, CheckOutlined, ReloadOutlined } from '@ant-design/icons-vue'

defineProps({
  enabled: {
    type: Boolean,
    default: false,
  },
  startRow: {
    type: Number,
    default: null,
  },
  endRow: {
    type: Number,
    default: null,
  },
  includeHeader: {
    type: Boolean,
    default: true,
  },
  totalRows: {
    type: Number,
    default: 0,
  },
})

const emit = defineEmits([
  'toggle',
  'start-row-change',
  'end-row-change',
  'include-header-change',
  'apply',
  'reset',
])

const handleToggle = (e) => {
  emit('toggle', e.target.checked)
}

const handleStartRowChange = (value) => {
  emit('start-row-change', value)
}

const handleEndRowChange = (value) => {
  emit('end-row-change', value)
}

const handleIncludeHeaderChange = (e) => {
  emit('include-header-change', e.target.checked)
}

const handleApply = () => {
  emit('apply')
}

const handleReset = () => {
  emit('reset')
}
</script>

<style scoped>
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
  display: flex;
  gap: 16px;
  margin-bottom: 16px;
}

.row-range-input {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.row-range-input label {
  font-weight: 500;
  color: var(--text-primary, #1f2937);
  font-size: 14px;
}

.row-range-options {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.row-range-actions {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}

.row-range-stats {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  padding: 12px;
  background: linear-gradient(135deg, rgba(22, 119, 255, 0.05) 0%, rgba(20, 201, 201, 0.05) 100%);
  border: 1px solid rgba(22, 119, 255, 0.1);
  border-radius: var(--border-radius-sm, 8px);
}

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

[data-theme='dark'] .row-range-stats {
  background: linear-gradient(135deg, rgba(22, 119, 255, 0.1) 0%, rgba(20, 201, 201, 0.1) 100%);
  border-color: rgba(22, 119, 255, 0.2);
}
</style>
