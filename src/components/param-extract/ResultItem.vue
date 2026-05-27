<template>
  <div
    class="result-item"
    :class="{
      'is-selected': selected,
      [`status-${itemStatus}`]: true,
    }"
    :style="{ animationDelay: `${index * 50}ms` }"
    @click="emit('select', item)"
    @contextmenu.prevent="handleContextMenu"
  >
    <!-- 左侧状态指示条 -->
    <div
      class="status-indicator"
      :class="`indicator-${item.type || itemStatus}`"
      role="presentation"
      aria-hidden="true"
    ></div>

    <!-- 主内容区 -->
    <div class="item-content">
      <!-- 标题行：类型标签 + 内容预览 -->
      <div class="content-header">
        <span class="type-badge" :class="`type-badge--${item.type}`">
          {{ typeIcon }}
        </span>
        <div class="content-preview">
          <span class="preview-text">{{ truncatedContent }}</span>
          <span v-if="isTruncated" class="more-hint">...</span>
        </div>
      </div>

      <!-- 元数据行：状态标签 + 数据类型 + 提取数量 -->
      <div class="meta-row">
        <a-tag
          :color="statusColor"
          :bordered="false"
          size="small"
          class="meta-tag"
        >
          {{ statusIcon }} {{ statusText }}
        </a-tag>
        <a-tag
          color="processing"
          :bordered="false"
          size="small"
          class="meta-tag"
        >
          {{ displayDataType }}
        </a-tag>
        <span v-if="extractCount != null" class="extract-count">
          <a-badge
            :count="extractCount"
            :number-style="{ backgroundColor: 'var(--color-primary)' }"
            size="small"
          >
            <span class="count-label">提取</span>
          </a-badge>
        </span>
      </div>
    </div>

    <!-- 右侧操作按钮区域 -->
    <div class="item-actions">
      <!-- 圆形复制按钮 + Tooltip -->
      <a-tooltip placement="top" title="复制内容">
        <button
          class="copy-btn"
          aria-label="复制内容"
          @click.stop.prevent="handleCopy"
        >
          <CopyOutlined />
        </button>
      </a-tooltip>

      <!-- 更多操作Dropdown菜单 -->
      <a-dropdown :trigger="['click']">
        <button class="more-btn" aria-label="更多操作" @click.stop>
          <MoreOutlined />
        </button>
        <template #overlay>
          <a-menu
            @click="
              ({ key }) => (key === 'copy' ? handleCopy() : handleDetail())
            "
          >
            <a-menu-item key="copy"><CopyOutlined /> 复制内容</a-menu-item>
            <a-menu-item key="detail"><EyeOutlined /> 查看详情</a-menu-item>
          </a-menu>
        </template>
      </a-dropdown>
    </div>

    <!-- 右键原生菜单 -->
    <Teleport to="body">
      <div
        v-show="contextMenuVisible"
        class="context-menu"
        :style="contextMenuStyle"
        @click.stop
      >
        <div class="menu-item" @click="handleCopy"><CopyOutlined /> 复制</div>
        <div class="menu-item" @click="handleDetail"><EyeOutlined /> 详情</div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { MoreOutlined, CopyOutlined, EyeOutlined } from "@ant-design/icons-vue";
import type { ExtractResultItem } from "./ExtractResultList.vue";

/**
 * ResultItem 组件 - 单个提取结果项
 *
 * @component
 * @description 高端视觉设计的结果卡片，包含状态指示、内容预览和操作按钮
 * @props {ExtractResultItem} item - 结果项数据对象
 * @props {number} index - 在列表中的索引位置（用于staggered动画）
 * @props {boolean} selected - 是否被选中
 * @emits select - 点击选中该项
 * @emits copy - 触发复制操作
 */
interface Props {
  /** 结果项数据 */
  item: ExtractResultItem;
  /** 列表中的索引（用于动画延迟计算） */
  index?: number;
  /** 是否被选中 */
  selected?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  index: 0,
  selected: false,
});

const emit = defineEmits<{
  select: [item: ExtractResultItem];
  copy: [item: ExtractResultItem];
}>();

/** 内容截断长度 */
const MAX_LEN = 100;

/** 右键菜单状态 */
const contextMenuVisible = ref(false);
const contextMenuStyle = ref({ top: "0px", left: "0px" });

/* ===== 计算属性 ===== */

/** 获取类型图标（emoji） */
const typeIcon = computed(
  () =>
    ({ sql: "\u{1F4D1}", json: "\u{1F4D7}" })[props.item.type] || "\u{1F4C4}",
);

/** 获取显示内容（优先显示提取结果值，而非完整原始语句） */
const displayContent = computed(() => {
  const item = props.item;

  if (
    item.extracted &&
    Array.isArray(item.extracted) &&
    item.extracted.length > 0
  ) {
    return item.extracted.map((e) => formatExtractedValue(e.value)).join(", ");
  }

  if (item.content) return item.content;
  if (item.original)
    return typeof item.original === "string"
      ? item.original
      : JSON.stringify(item.original, null, 2);

  return JSON.stringify(item, null, 2);
});

/**
 * 智能格式化提取值，递归深入提取最终原子值
 * 支持字符串化JSON、嵌套对象、数组等各种数据结构
 * @param {*} value - 提取的值（可能是字符串、数字、对象等）
 * @param {number} depth - 当前递归深度（防止无限递归，默认0）
 * @returns {string} - 格式化后的可读字符串
 */
function formatExtractedValue(value: any, depth: number = 0): string {
  const MAX_DEPTH = 5;

  if (depth > MAX_DEPTH) {
    try {
      return typeof value === "string" ? value : JSON.stringify(value);
    } catch {
      return "[...]";
    }
  }

  if (value === null || value === undefined) return String(value);

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (
      (trimmed.startsWith("{") || trimmed.startsWith("[")) &&
      trimmed.length < 10000
    ) {
      try {
        const parsed = JSON.parse(trimmed);
        return formatExtractedValue(parsed, depth + 1);
      } catch {
        return value;
      }
    }
    return value;
  }

  if (typeof value === "number" || typeof value === "boolean")
    return String(value);

  if (Array.isArray(value)) {
    if (value.length === 0) return "[]";
    if (value.length === 1) return formatExtractedValue(value[0], depth + 1);
    return value.map((v) => formatExtractedValue(v, depth + 1)).join(", ");
  }

  if (typeof value === "object") {
    if (value.value !== undefined)
      return formatExtractedValue(value.value, depth + 1);
    if (value.finalValue !== undefined)
      return formatExtractedValue(value.finalValue, depth + 1);
    try {
      const str = JSON.stringify(value);
      return str.length > 50 ? str.slice(0, 50) + "..." : str;
    } catch {
      return "[Object]";
    }
  }

  return String(value);
}

/** 截断后的内容预览文本 */
const truncatedContent = computed(() => {
  const c = displayContent.value;
  return c.length <= MAX_LEN ? c : c.slice(0, MAX_LEN);
});

/** 是否被截断（显示省略号） */
const isTruncated = computed(() => displayContent.value.length > MAX_LEN);

/** 获取数据类型标签文本 */
const displayDataType = computed(() => {
  if (props.item.dataType) return props.item.dataType;
  if (props.item.type) return props.item.type.toUpperCase();
  return "unknown";
});

/** 获取状态信息（success/warning/error） */
const itemStatus = computed(() => {
  if (props.item.status) return props.item.status;
  if (props.item.extracted?.some((e) => e.status === "error")) return "error";
  return "success";
});

/** 获取状态对应的Ant Design tag颜色 */
const statusColor = computed(
  () =>
    ({ success: "success", warning: "warning", error: "error" })[
      itemStatus.value
    ] || "default",
);

/** 获取状态图标 */
const statusIcon = computed(
  () =>
    ({ success: "\u2713", warning: "\u26A0", error: "\u2717" })[
      itemStatus.value
    ] || "",
);

/** 获取状态文本 */
const statusText = computed(
  () =>
    ({ success: "成功", warning: "警告", error: "错误" })[itemStatus.value] ||
    "未知",
);

/** 获取提取数量 */
const extractCount = computed(() => {
  if (props.item.count != null) return props.item.count;
  if (props.item.extracted?.length) return props.item.extracted.length;
  return null;
});

/* ===== 操作方法 ===== */

/** 处理复制操作 */
const handleCopy = (): void => {
  contextMenuVisible.value = false;
  emit("copy", props.item);
};

/** 处理查看详情操作 */
const handleDetail = (): void => {
  contextMenuVisible.value = false;
  emit("select", props.item);
};

/** 右键菜单定位与显示 */
const handleContextMenu = (e: MouseEvent): void => {
  e.preventDefault();
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
  contextMenuStyle.value = { top: `${e.clientY}px`, left: `${e.clientX}px` };
  contextMenuVisible.value = true;

  // 延迟绑定点击关闭事件，避免立即触发
  setTimeout(() => {
    const close = () => {
      contextMenuVisible.value = false;
      document.removeEventListener("click", close);
    };
    document.addEventListener("click", close);
  }, 0);
};
</script>

<style scoped lang="scss">
/* ============================================
   ResultItem 卡片容器样式
   设计规范：Soft Structuralism 风格
   特点：左侧状态指示条 + 悬停/选中交互 + 入场动画
   ============================================ */

.result-item {
  display: flex;
  align-items: stretch;
  position: relative;
  /* 使用主题变量，自动适配深色模式 */
  background: var(--bg-elevated);
  /* 底部细分割线 - 使用主题边框变量 */
  border-bottom: 1px solid var(--border-default);
  cursor: pointer;
  /* 自定义cubic-bezier缓动曲线，模拟物理弹性 */
  transition:
    background,
    box-shadow,
    transform 0.25s cubic-bezier(0.32, 0.72, 0, 1);
  /* GPU加速优化 */
  will-change: transform, opacity;
  /* 入场动画：从下方淡入上滑 */
  animation: fadeSlideUp 0.6s cubic-bezier(0.32, 0.72, 0, 1) both;
  overflow: hidden;

  /* 悬停效果：使用主题交互变量，自动适配深色模式 */
  &:hover {
    background: var(--interactive-hover);
    box-shadow: var(--shadow-sm);
    transform: translateX(4px);

    .status-indicator {
      width: 4px; /* 从3px加宽到4px */
    }

    .copy-btn {
      opacity: 1;
      transform: scale(1);
    }

    .more-btn {
      opacity: 1;
      transform: scale(1);
    }
  }

  /* 选中状态：使用主题选中背景变量 */
  &.is-selected {
    background: var(--interactive-selected);

    .status-indicator {
      box-shadow: 0 0 8px currentColor; /* 发光效果 */
    }
  }
}

/* ============================================
   左侧状态指示条样式
   宽度3px，根据数据类型或状态显示不同颜色
   ============================================ */

.status-indicator {
  width: 3px;
  flex-shrink: 0;
  transition:
    width 0.25s cubic-bezier(0.32, 0.72, 0, 1),
    box-shadow 0.25s ease;
  /* 平滑宽度变化 */
}

/* 数据类型颜色映射 */
.indicator-sql {
  background: #1677ff; /* 蓝色 - SQL类型 */
}
.indicator-json {
  background: #8b5cf6; /* 紫色 - JSON类型 */
}

/* 状态颜色映射 */
.indicator-success {
  background: #10b981; /* 绿色 - 成功 */
}
.indicator-warning {
  background: #f59e0b; /* 橙色 - 警告 */
}
.indicator-error {
  background: #ef4444; /* 红色 - 错误 */
}

/* 默认灰色（未知类型/状态） */
.status-indicator:not([class*="indicator-"]) {
  background: #94a3b8;
}

/* ============================================
   主内容区样式
   包含标题行和元数据行
   ============================================ */

.item-content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 16px 20px;
}

/* 标题行：类型图标 + 内容预览 */
.content-header {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

/* 类型徽章（emoji图标） */
.type-badge {
  font-size: 18px;
  line-height: 1;
  flex-shrink: 0;
  margin-top: 2px;
}

/* 内容预览文本 */
.content-preview {
  flex: 1;
  min-width: 0;

  .preview-text {
    font-size: 14px;
    font-weight: 600;
    /* 使用主题主文字变量，自动适配深色模式 */
    color: var(--text-primary);
    line-height: 1.5;
    word-break: break-all;
    font-family:
      -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue",
      Arial, sans-serif;
  }

  .more-hint {
    /* 使用主题辅助文字变量 */
    color: var(--text-tertiary);
    font-weight: 600;
    margin-left: 2px;
  }
}

/* 元数据行：状态标签 + 数据类型 + 数量 */
.meta-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

/* 元数据标签样式覆盖 */
.meta-tag {
  margin: 0 !important;
  font-size: 12px !important;
  padding: 2px 8px !important;
  border-radius: 6px !important;
  font-weight: 500;
}

/* 提取数量徽章 */
.extract-count {
  display: inline-flex;
  align-items: center;

  .count-label {
    font-size: 11px;
    /* 使用主题次要文字变量 */
    color: var(--text-secondary);
    padding: 2px 8px;
    /* 使用主题主色背景变量 */
    background: var(--color-primary-bg);
    border-radius: 10px;
    font-weight: 500;
  }
}

/* ============================================
   右侧操作按钮区域
   圆形icon-only按钮 + tooltip提示
   ============================================ */

.item-actions {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 6px;
  padding-right: 16px;
}

/* 圆形复制按钮（28x28px） */
.copy-btn {
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 50%;
  background: transparent;
  /* 使用主题次要文字变量作为默认颜色 */
  color: var(--text-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  /* 默认隐藏，hover时显示 */
  opacity: 0;
  transform: scale(0.9);
  transition:
    opacity,
    transform,
    background,
    color 0.2s cubic-bezier(0.32, 0.72, 0, 1);

  &:hover {
    /* 使用主题交互变量，自动适配深色模式 */
    background: var(--interactive-hover);
    color: var(--color-primary); /* 主题蓝色 */
    transform: scale(1.05); /* 轻微放大 */
  }

  &:active {
    transform: scale(0.95); /* 点击时缩小 */
  }

  /* 聚焦时的键盘导航支持 - 使用主题主色变量 */
  &:focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
  }
}

/* 更多操作按钮 */
.more-btn {
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 50%;
  background: transparent;
  /* 使用主题次要文字变量作为默认颜色 */
  color: var(--text-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  opacity: 0;
  transform: scale(0.9);
  transition:
    opacity,
    transform,
    background,
    color 0.2s cubic-bezier(0.32, 0.72, 0, 1);

  &:hover {
    /* 使用主题交互变量，自动适配深色模式 */
    background: var(--interactive-hover);
    color: var(--color-primary);
    transform: scale(1.05);
  }

  &:focus-visible {
    /* 使用主题主色变量 */
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
  }
}

/* 始终在移动端显示操作按钮（触摸设备需要可见的点击目标） */
@media (max-width: 768px) {
  .copy-btn,
  .more-btn {
    opacity: 1;
    transform: scale(1);
  }
}

/* ============================================
   右键原生菜单样式
   ============================================ */

.context-menu {
  position: fixed;
  z-index: 1000;
  /* 使用主题变量，自动适配深色模式 */
  background: var(--bg-elevated);
  border: 1px solid var(--border-default);
  border-radius: 12px;
  /* 使用主题阴影变量 */
  box-shadow: var(--shadow-md), var(--shadow-sm);
  padding: 6px 0;
  min-width: 150px;
  /* 毛玻璃效果 */
  -webkit-backdrop-filter: blur(12px);
  backdrop-filter: blur(12px);

  .menu-item {
    padding: 10px 14px;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 13px;
    /* 使用主题主文字变量 */
    color: var(--text-primary);
    font-weight: 500;
    transition:
      background,
      color 0.15s ease;
    border-radius: 6px;
    margin: 2px 4px;

    &:hover {
      /* 使用主题主色背景和文字变量，自动适配深色模式 */
      background: var(--color-primary-bg);
      color: var(--color-primary);
    }

    &:active {
      /* 加深选中效果 - 使用主题主色边框变量 */
      background: var(--color-primary-border);
    }
  }
}

/* ============================================
   入场动画关键帧
   fadeSlideUp：从下方淡入并上滑
   ============================================ */

@keyframes fadeSlideUp {
  from {
    opacity: 0;
    transform: translateY(16px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* ============================================
   响应式适配（768px以下屏幕）
   ============================================ */

@media (max-width: 768px) {
  .result-item {
    /* 移动端减小右移距离 */
    &:hover {
      transform: translateX(2px);
    }
  }

  .item-content {
    padding: 12px 14px;
    gap: 8px;
  }

  .content-header {
    gap: 8px;
  }

  .type-badge {
    font-size: 16px;
  }

  .content-preview .preview-text {
    font-size: 13px;
  }

  .meta-row {
    gap: 6px;
  }

  .meta-tag {
    font-size: 11px !important;
    padding: 1px 6px !important;
  }

  .item-actions {
    padding-right: 12px;
    gap: 4px;
  }

  .copy-btn,
  .more-btn {
    width: 24px;
    height: 24px;
    font-size: 12px;
  }

  .status-indicator {
    width: 2px;

    .result-item:hover & {
      width: 3px;
    }
  }
}

/* ============================================
   无障碍与性能优化
   ============================================ */

/* 尊重用户的减少动画偏好设置 */
@media (prefers-reduced-motion: reduce) {
  .result-item {
    animation: none;
    transition:
      background 0.15s ease,
      box-shadow 0.15s ease;
  }

  .result-item:hover {
    transform: none;
  }

  .status-indicator {
    transition: none;
  }

  .copy-btn,
  .more-btn {
    transition: none;
  }
}

/* 高对比度模式适配 */
@media (forced-colors: active) {
  .status-indicator {
    background: CanvasText;
  }

  .copy-btn:hover,
  .more-btn:hover {
    outline: 2px solid CanvasText;
  }
}
</style>
