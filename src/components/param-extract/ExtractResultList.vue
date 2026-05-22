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
          class="action-btn"
          :disabled="selectedCount === 0"
          @click="handleCopyAll"
        >
          <template #icon><CopyOutlined /></template>复制全部
        </a-button>
        <a-button
          size="small"
          class="action-btn"
          :disabled="items.length === 0"
          @click="handleExport"
        >
          <template #icon><DownloadOutlined /></template>导出
        </a-button>
      </a-space>
    </div>

    <!-- 自定义加载骨架屏 -->
    <div v-if="loading" class="skeleton-container">
      <div v-for="i in 5" :key="i" class="skeleton-item">
        <div class="skeleton-header"></div>
        <div class="skeleton-text"></div>
        <div class="skeleton-text skeleton-text--short"></div>
      </div>
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
          v-for="(item, index) in items"
          :key="item.id"
          :item="item"
          :index="index"
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

/**
 * ExtractResultList 组件 - 提取结果列表容器
 *
 * @component
 * @description 高端视觉设计的结果列表容器，包含批量操作、骨架屏、空状态和结果展示
 * @props {Array} items - 提取结果项数组
 * @props {Boolean} loading - 加载状态
 * @emits select - 选中某项结果
 * @emits copy - 复制某项结果
 * @emits copy-all - 批量复制结果
 */
const props = defineProps({
  /** 提取结果项数组 */
  items: {
    type: Array,
    default: () => [],
  },
  /** 是否正在加载 */
  loading: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(["select", "copy", "copy-all"]);

/** 已选中的结果ID集合 */
const selectedIds = ref(new Set());
/** 滚动容器引用 */
const scrollContainerRef = ref(null);

/** 是否为空状态（非加载且无数据） */
const isEmpty = computed(() => !props.loading && props.items.length === 0);
/** 当前选中数量 */
const selectedCount = computed(() => selectedIds.value.size);
/** 是否全选 */
const isAllSelected = computed(
  () => props.items.length > 0 && selectedIds.value.size === props.items.length,
);
/** 是否为半选状态（部分选中） */
const isIndeterminate = computed(
  () =>
    selectedIds.value.size > 0 && selectedIds.value.size < props.items.length,
);

/**
 * 判断指定ID是否被选中
 * @param {string|number} id - 结果项ID
 * @returns {boolean} 是否选中
 */
function isSelected(id) {
  return selectedIds.value.has(id);
}

/**
 * 处理全选/取消全选操作
 * @param {Event} e - Checkbox change事件
 */
function handleSelectAll(e) {
  selectedIds.value = e.target.checked
    ? new Set(props.items.map((i) => i.id))
    : new Set();
}

/**
 * 处理批量复制操作（优先复制选中项，无选中则复制全部）
 */
function handleCopyAll() {
  const selected = props.items.filter((item) => selectedIds.value.has(item.id));
  emit("copy-all", selected.length > 0 ? selected : props.items);
}

/**
 * 处理导出操作（将结果导出为JSON文件）
 */
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

/**
 * 暴露给父组件的方法
 * @property {Function} getSelectedItems - 获取当前选中的结果项数组
 * @property {Function} clearSelection - 清除所有选中状态
 * @property {Function} selectAll - 选中所有结果项
 */
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
/* ============================================
   ExtractResultList 容器样式
   设计规范：Soft Structuralism 风格
   特点：白色背景、细边框、多层柔和阴影、大圆角
   ============================================ */

.extract-result-list {
  display: flex;
  flex-direction: column;
  height: 100%;
  /* 使用主题变量，自动适配亮色/深色模式 */
  background: var(--bg-elevated);
  /* 边框使用主题变量 */
  border: 1px solid var(--border-default);
  /* 大圆角，营造现代感 */
  border-radius: 20px;
  /* 多层阴影：使用主题阴影变量组合 */
  box-shadow: var(--shadow-sm), var(--shadow-xs);
  overflow: hidden;
  /* CSS containment优化渲染性能 */
  contain: content;
}

/* ============================================
   批量操作栏样式
   设计特点：渐变背景、药丸状按钮、hover上浮效果
   ============================================ */

.batch-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  /* 使用主题变量实现渐变背景，自动适配深色模式 */
  background: linear-gradient(180deg, var(--bg-sunken) 0%, var(--bg-base) 100%);
  padding: 14px 20px;
  border-bottom: 1px solid var(--border-default);
  gap: 12px;
  flex-wrap: wrap;

  :deep(.ant-btn) {
    border-radius: 8px;
    transition: all 0.2s ease;
    font-weight: 500;
    font-size: 13px;
    display: inline-flex;
    align-items: center;
    gap: 6px;

    &:hover:not(:disabled) {
      color: var(--color-primary);
      border-color: var(--color-primary);
    }

    &:active:not(:disabled) {
      transform: scale(0.98);
    }
  }

  .action-btn {
    padding: 6px 14px;
  }
}

/* ============================================
   自定义加载骨架屏样式
   设计特点：脉冲动画、shimmer效果、圆角12px
   不依赖 ant-design 的 skeleton 组件
   ============================================ */

.skeleton-container {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.skeleton-item {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 16px;
  /* 使用主题变量，自动适配深色模式 */
  background: var(--bg-elevated);
  border: 1px solid var(--border-default);
  border-radius: 12px;
  overflow: hidden;
  position: relative;
}

/* 骨架屏标题条 - 使用主题变量实现shimmer效果 */
.skeleton-header {
  width: 60%;
  height: 16px;
  /* 深色模式下自动适配为深色系渐变 */
  background: linear-gradient(
    90deg,
    var(--bg-sunken) 25%,
    var(--bg-elevated) 50%,
    var(--bg-sunken) 75%
  );
  background-size: 200% 100%;
  border-radius: 8px;
  /* shimmer动画：背景渐变从左到右移动 */
  animation: shimmer 1.5s ease-in-out infinite;
}

/* 骨架屏文本行 - 使用主题变量实现shimmer效果 */
.skeleton-text {
  width: 100%;
  height: 12px;
  /* 深色模式下自动适配为深色系渐变 */
  background: linear-gradient(
    90deg,
    var(--bg-sunken) 25%,
    var(--bg-elevated) 50%,
    var(--bg-sunken) 75%
  );
  background-size: 200% 100%;
  border-radius: 6px;
  animation: shimmer 1.5s ease-in-out infinite;
  /* 错开动画时间，营造层次感 */
  animation-delay: 0.2s;
}

/* 较短的文本行（第二行） */
.skeleton-text--short {
  width: 80%;
  animation-delay: 0.4s;
}

/* Shimmer关键帧动画 */
@keyframes shimmer {
  0% {
    background-position: -200% 0;
    opacity: 0.6;
  }
  50% {
    opacity: 1;
  }
  100% {
    background-position: 200% 0;
    opacity: 0.6;
  }
}

/* ============================================
   空状态样式
   ============================================ */

.empty-state {
  padding: 60px 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 300px;
  /* 使用主题变量，自动适配深色模式 */
  color: var(--text-tertiary);
}

/* ============================================
   列表容器与自定义滚动条
   设计特点：6px宽、透明轨道、滑块颜色变化
   ============================================ */

.list-container {
  flex: 1;
  overflow-y: auto;
  /* CSS containment优化滚动性能 */
  contain: content;

  /* Webkit浏览器滚动条样式（Chrome/Safari/Edge） */
  &::-webkit-scrollbar {
    width: 6px;
  }

  /* 滚动条轨道：完全透明 */
  &::-webkit-scrollbar-track {
    background: transparent;
  }

  /* 滚动条滑块：使用主题变量，自动适配深色模式 */
  &::-webkit-scrollbar-thumb {
    background: var(--scrollbar-thumb);
    border-radius: 3px;
    /* 平滑过渡 */
    transition: background 0.2s ease;

    /* hover时加深颜色 */
    &:hover {
      background: var(--scrollbar-thumb-hover);
    }
  }

  /* Firefox浏览器滚动条样式 - 使用主题变量 */
  scrollbar-width: thin;
  scrollbar-color: var(--scrollbar-thumb) transparent;
}
.normal-list {
  display: flex;
  flex-direction: column;
}

/* ============================================
   底部提示栏样式
   设计特点：sticky定位、毛玻璃效果、半透明白色背景
   ============================================ */

.list-hint {
  position: sticky;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 10;
  /* 使用毛玻璃背景变量，自动适配深色模式 */
  background: var(--bg-glass);
  /* 毛玻璃模糊效果 */
  -webkit-backdrop-filter: blur(12px);
  backdrop-filter: blur(12px);
  padding: 10px 20px;
  font-size: 12px;
  /* 使用主题文字变量 */
  color: var(--text-tertiary);
  text-align: center;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  /* 顶部细分割线 - 使用主题边框变量 */
  border-top: 1px solid var(--border-default);
}

/* ============================================
   响应式适配（768px以下屏幕）
   ============================================ */

@media (max-width: 768px) {
  .extract-result-list {
    /* 移动端适当减小圆角 */
    border-radius: 16px;
  }

  .batch-actions {
    flex-direction: column;
    align-items: stretch;
    padding: 10px 14px;
    gap: 10px;

    :deep(.ant-btn) {
      width: 100%;
      justify-content: center;
    }
  }

  .skeleton-container {
    padding: 14px;
    gap: 12px;
  }

  .skeleton-item {
    padding: 12px;
  }

  .empty-state {
    padding: 40px 16px;
    min-height: 200px;
  }

  .list-hint {
    font-size: 11px;
    padding: 8px 14px;
  }
}

/* ============================================
   无障碍与性能优化
   ============================================ */

/* 尊重用户的减少动画偏好设置 */
@media (prefers-reduced-motion: reduce) {
  .skeleton-header,
  .skeleton-text {
    animation: none;
    opacity: 0.8;
  }

  .batch-actions :deep(.ant-btn) {
    transition: none;
  }
}
</style>
