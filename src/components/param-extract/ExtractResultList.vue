<template>
  <div class="extract-result-list">
    <!-- 批量操作栏 -->
    <div v-if="!isEmpty && !loading" class="batch-actions">
      <a-checkbox
        :checked="isAllSelected"
        :indeterminate="isIndeterminate"
        @change="handleSelectAll"
      >
        全选 ({{ selectedCount }}/{{ items.length }})
      </a-checkbox>
      <a-space :size="8">
        <a-button
          size="small"
          :disabled="selectedCount === 0"
          @click="handleCopyAll"
        >
          <template #icon><CopyOutlined /></template>复制全部
        </a-button>
        <a-button
          size="small"
          :disabled="items.length === 0"
          @click="handleExport"
        >
          <template #icon><DownloadOutlined /></template>导出
        </a-button>
      </a-space>
    </div>

    <!-- 加载骨架屏 -->
    <div v-if="loading" class="skeleton-container">
      <a-skeleton v-for="i in 5" :key="i" active :paragraph="{ rows: 2 }" />
    </div>

    <!-- 空状态 -->
    <a-empty
      v-else-if="isEmpty"
      description="暂无提取结果，请输入内容后点击提取"
      class="empty-state"
    >
      <template #image
        ><InboxOutlined style="font-size: 64px; color: var(--text-tertiary)"
      /></template>
    </a-empty>

    <!-- 结果列表 -->
    <div v-else ref="scrollContainerRef" class="list-container">
      <div class="normal-list">
        <ResultItem
          v-for="item in items"
          :key="item.id"
          :item="item"
          :selected="isSelected(item.id)"
          @select="$emit('select', item)"
          @copy="$emit('copy', item)"
        />
      </div>

      <!-- 列表底部提示 -->
      <div v-if="items.length > 50" class="list-hint">
        <InfoCircleOutlined /> 共 {{ items.length }} 条结果
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from "vue";
import {
  CopyOutlined,
  DownloadOutlined,
  InboxOutlined,
  InfoCircleOutlined,
} from "@ant-design/icons-vue";
import ResultItem from "./ResultItem.vue";

const props = defineProps({
  items: {
    type: Array,
    default: () => [],
  },
  loading: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(["select", "copy", "copy-all"]);

const selectedIds = ref(new Set());
const scrollContainerRef = ref(null);

const isEmpty = computed(() => !props.loading && props.items.length === 0);
const selectedCount = computed(() => selectedIds.value.size);
const isAllSelected = computed(
  () => props.items.length > 0 && selectedIds.value.size === props.items.length,
);
const isIndeterminate = computed(
  () =>
    selectedIds.value.size > 0 && selectedIds.value.size < props.items.length,
);

function isSelected(id) {
  return selectedIds.value.has(id);
}

function handleSelectAll(e) {
  selectedIds.value = e.target.checked
    ? new Set(props.items.map((i) => i.id))
    : new Set();
}

function handleCopyAll() {
  const selected = props.items.filter((item) => selectedIds.value.has(item.id));
  emit("copy-all", selected.length > 0 ? selected : props.items);
}

function handleExport() {
  const blob = new Blob([JSON.stringify(props.items, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  Object.assign(a, {
    href: url,
    download: `extract-results-${Date.now()}.json`,
  });
  a.click();
  URL.revokeObjectURL(url);
}

defineExpose({
  getSelectedItems: () =>
    props.items.filter((item) => selectedIds.value.has(item.id)),
  clearSelection: () => selectedIds.value.clear(),
  selectAll: () => {
    selectedIds.value = new Set(props.items.map((i) => i.id));
  },
});
</script>

<style scoped lang="scss">
.extract-result-list {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--bg-elevated);
  border: 1px solid var(--border-default);
  border-radius: var(--border-radius-md);
  overflow: hidden;
}

.batch-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  border-bottom: 1px solid var(--border-default);
  gap: 12px;
  flex-wrap: wrap;
}

.skeleton-container {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.empty-state {
  padding: 60px 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 300px;
}

.list-container {
  flex: 1;
  overflow-y: auto;

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: var(--scrollbar-track);
    border-radius: 3px;
  }

  &::-webkit-scrollbar-thumb {
    background: var(--scrollbar-thumb);
    border-radius: 3px;

    &:hover {
      background: var(--scrollbar-thumb-hover);
    }
  }
}

.normal-list {
  display: flex;
  flex-direction: column;
}

.list-hint {
  position: sticky;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 10;
  padding: 8px 16px;
  background: var(--color-info-bg, #e6f7ff);
  color: var(--text-secondary);
  font-size: 12px;
  text-align: center;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border-top: 1px solid var(--border-default);
}

@media (max-width: 768px) {
  .batch-actions {
    flex-direction: column;
    align-items: stretch;
    padding: 8px 12px;
    gap: 8px;
  }

  .skeleton-container {
    padding: 12px;
  }

  .empty-state {
    padding: 40px 16px;
    min-height: 200px;
  }

  .list-hint {
    font-size: 11px;
    padding: 6px 12px;
  }
}
</style>
