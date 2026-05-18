<template>
  <div
    class="result-item"
    :class="{ 'is-selected': selected, [`status-${item.status}`]: true }"
    @click="emit('select', item)"
    @contextmenu.prevent="handleContextMenu"
  >
    <!-- 左侧类型图标 -->
    <div class="item-icon" :class="`type-${item.type}`">
      {{ typeIcon }}
    </div>

    <!-- 中间内容区 -->
    <div class="item-content">
      <!-- 预览内容（截断100字符） -->
      <div class="content-preview">
        <span class="preview-text">{{ truncatedContent }}</span
        ><span v-if="isTruncated" class="more-hint">...</span>
      </div>

      <!-- 标签组：状态 + 数据类型 + 数量徽章 -->
      <div class="tag-group">
        <a-tag :color="statusColor" :bordered="false" size="small">
          {{ statusIcon }} {{ statusText }}
        </a-tag>
        <a-tag color="processing" :bordered="false" size="small">{{
          displayDataType
        }}</a-tag>
        <a-badge
          v-if="extractCount != null"
          :count="extractCount"
          :number-style="{ backgroundColor: 'var(--color-primary)' }"
          size="small"
        >
          <span class="count-label">提取</span>
        </a-badge>
      </div>
    </div>

    <!-- 右侧操作按钮（Dropdown菜单） -->
    <div class="item-actions">
      <a-dropdown :trigger="['click']">
        <a-button type="text" size="small" @click.stop
          ><MoreOutlined
        /></a-button>
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

interface Props {
  item: ExtractResultItem;
  selected?: boolean;
}
const props = withDefaults(defineProps<Props>(), { selected: false });
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
const typeIcon = computed(
  () =>
    ({ sql: "\u{1F4D1}", json: "\u{1F4D7}" })[props.item.type] || "\u{1F4C4}",
);

/** 获取显示内容（兼容多种数据格式） */
const displayContent = computed(() => {
  const item = props.item;

  if (item.content) return item.content;
  if (item.original)
    return typeof item.original === "string"
      ? item.original
      : JSON.stringify(item.original, null, 2);

  if (item.extracted && Array.isArray(item.extracted)) {
    return item.extracted.map((e) => `${e.key}: ${e.value}`).join("\n");
  }

  return JSON.stringify(item, null, 2);
});

const truncatedContent = computed(() => {
  const c = displayContent.value;
  return c.length <= MAX_LEN ? c : c.slice(0, MAX_LEN);
});

const isTruncated = computed(() => displayContent.value.length > MAX_LEN);

/** 获取数据类型标签 */
const displayDataType = computed(() => {
  if (props.item.dataType) return props.item.dataType;
  if (props.item.type) return props.item.type.toUpperCase();
  return "unknown";
});

/** 获取状态信息 */
const itemStatus = computed(() => {
  if (props.item.status) return props.item.status;
  if (props.item.extracted?.some((e) => e.status === "error")) return "error";
  return "success";
});

const statusColor = computed(
  () =>
    ({ success: "success", warning: "warning", error: "error" })[
      itemStatus.value
    ] || "default",
);
const statusIcon = computed(
  () =>
    ({ success: "\u2713", warning: "\u26A0", error: "\u2717" })[
      itemStatus.value
    ] || "",
);
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
const handleCopy = () => {
  contextMenuVisible.value = false;
  emit("copy", props.item);
};
const handleDetail = () => {
  contextMenuVisible.value = false;
  console.log("查看详情:", props.item.id);
};

/** 右键菜单定位与显示 */
const handleContextMenu = (e: MouseEvent) => {
  e.preventDefault();
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
  contextMenuStyle.value = { top: `${e.clientY}px`, left: `${e.clientX}px` };
  contextMenuVisible.value = true;
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
.result-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: var(--bg-elevated);
  border: 1px solid var(--border-default);
  border-radius: var(--border-radius-sm);
  margin: 4px 8px;
  cursor: pointer;
  transition: all var(--transition-fast) ease;
  position: relative;

  &:hover {
    border-color: var(--color-primary);
    box-shadow: var(--shadow-sm);
    transform: translateY(-1px);
    background: var(--interactive-hover);
  }

  &.is-selected {
    border-color: var(--color-primary);
    background: var(--interactive-selected);
    box-shadow: 0 0 0 2px var(--color-primary-border);
  }

  &.status-success {
    border-left: 3px solid var(--color-success);
  }
  &.status-warning {
    border-left: 3px solid var(--color-warning);
  }
  &.status-error {
    border-left: 3px solid var(--color-error);
  }
}

/* 类型图标 */
.item-icon {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--border-radius-xs);
  font-size: 20px;
  flex-shrink: 0;

  &.type-sql {
    background: rgba(22, 119, 255, 0.1);
  }
  &.type-json {
    background: rgba(82, 196, 26, 0.1);
  }
}

/* 内容区 */
.item-content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.content-preview {
  font-size: 13px;
  color: var(--text-primary);
  line-height: 1.5;
  word-break: break-all;
  .preview-text {
    font-family: "Monaco", "Menlo", monospace;
  }
  .more-hint {
    color: var(--text-tertiary);
    font-weight: 600;
  }
}

/* 标签组 */
.tag-group {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  :deep(.ant-tag) {
    margin: 0;
    font-size: 11px;
    padding: 1px 6px;
    border-radius: 4px;
  }
}

.count-label {
  font-size: 11px;
  color: var(--text-secondary);
  padding: 2px 8px;
  background: var(--badge-primary-bg);
  border-radius: 10px;
}

/* 操作按钮 */
.item-actions {
  flex-shrink: 0;
  opacity: 0;
  transition: opacity var(--transition-fast);
  .result-item:hover & {
    opacity: 1;
  }
}

/* 右键菜单 */
.context-menu {
  position: fixed;
  z-index: 1000;
  background: var(--bg-elevated);
  border: 1px solid var(--border-default);
  border-radius: var(--border-radius-sm);
  box-shadow: var(--shadow-lg);
  padding: 4px 0;
  min-width: 140px;

  .menu-item {
    padding: 8px 12px;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    color: var(--text-primary);
    transition: background var(--transition-fast);

    &:hover {
      background: var(--interactive-hover);
      color: var(--color-primary);
    }
  }
}

/* 响应式 */
@media (max-width: 768px) {
  .result-item {
    padding: 10px 12px;
    margin: 4px;
    gap: 8px;
  }
  .item-icon {
    width: 32px;
    height: 32px;
    font-size: 16px;
  }
  .content-preview {
    font-size: 12px;
  }
  .tag-group {
    gap: 4px;
    :deep(.ant-tag) {
      font-size: 10px;
      padding: 0 4px;
    }
  }
  .item-actions {
    opacity: 1;
  }
}
</style>
