<template>
  <div class="deduplication-config">
    <a-divider style="margin: 12px 0" />
    <div class="deduplication-header">
      <a-checkbox :checked="enabled" @change="handleToggle">
        启用数据去重
      </a-checkbox>
      <a-tooltip title="根据选定列的值去除重复数据行，仅保留每组的第一次出现">
        <QuestionCircleOutlined />
      </a-tooltip>
    </div>
    <div v-if="enabled" class="deduplication-controls">
      <a-select
        :value="column"
        placeholder="请选择去重列"
        style="width: 100%; max-width: 300px"
        @change="handleChange"
      >
        <a-select-option
          v-for="(header, idx) in headers || []"
          :key="idx"
          :value="idx"
        >
          {{ header }} (列{{ idx + 1 }})
        </a-select-option>
      </a-select>
      <div v-if="stats.originalRows > 0" class="deduplication-stats">
        <a-tag color="blue">原始: {{ stats.originalRows }} 行</a-tag>
        <a-tag color="green">去重后: {{ stats.deduplicatedRows }} 行</a-tag>
        <a-tag color="orange">去重: {{ stats.removedRows }} 行</a-tag>
      </div>
    </div>
  </div>
</template>

<script setup>
import { QuestionCircleOutlined } from "@ant-design/icons-vue";

defineProps({
  enabled: {
    type: Boolean,
    default: false,
  },
  column: {
    type: Number,
    default: undefined,
  },
  stats: {
    type: Object,
    default: () => ({
      originalRows: 0,
      deduplicatedRows: 0,
      removedRows: 0,
    }),
  },
  headers: {
    type: Array,
    default: () => [],
  },
});

const emit = defineEmits(["toggle", "change"]);

const handleToggle = (e) => {
  emit("toggle", e.target.checked);
};

const handleChange = (value) => {
  emit("change", value);
};
</script>

<style scoped>
.deduplication-config {
  margin-top: 16px;
  contain: layout;
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
  transition: box-shadow var(--transition-normal, 200ms) ease;
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
  transition: box-shadow var(--transition-normal, 200ms) ease;
}

.deduplication-controls:hover {
  box-shadow: var(--shadow-md, 0 4px 16px rgba(0, 0, 0, 0.1));
}

.deduplication-controls .ant-select {
  transition: box-shadow var(--transition-fast, 120ms) ease;
}

.deduplication-controls .ant-select:hover {
  box-shadow: 0 0 0 2px var(--color-primary-bg);
}

.deduplication-controls .ant-select-focused {
  box-shadow: 0 0 0 2px
    color-mix(in srgb, var(--color-primary) 30%, transparent);
}

.deduplication-stats {
  margin-top: 16px;
  padding: 16px;
  background: var(--color-primary-bg);
  border: 1px solid var(--border-default);
  border-radius: var(--border-radius-sm, 8px);
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  transition:
    background,
    box-shadow var(--transition-normal, 200ms) ease;
}

.deduplication-stats:hover {
  background: var(--color-primary-bg);
  box-shadow: var(--shadow-sm, 0 2px 8px rgba(0, 0, 0, 0.08));
}

.deduplication-stats .ant-tag {
  background: var(--bg-elevated);
  border: 1px solid var(--border-default);
  color: var(--text-primary, #1f2937);
  font-weight: 500;
  padding: 6px 14px;
  border-radius: var(--border-radius-xs, 4px);
  transition:
    color,
    border-color,
    box-shadow,
    transform var(--transition-fast, 120ms) ease;
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
</style>
