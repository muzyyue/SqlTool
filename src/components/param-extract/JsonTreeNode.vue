<template>
  <div class="json-tree-node" :style="{ paddingLeft: depth * 18 + 'px' }">
    <div class="node-header" @click="toggleExpand">
      <span class="expand-icon" v-if="!node.isLeaf">
        {{ expanded ? "▼" : "▶" }}
      </span>
      <span class="leaf-dot" v-else>●</span>

      <span class="node-key" :class="'type-' + node.type">{{ node.key }}</span>
      <span class="node-separator" v-if="!node.isLeaf">:</span>

      <span
        v-if="node.isLeaf"
        class="node-value"
        :class="'value-' + node.type"
        @click.stop="handleCopyValue"
        :title="'点击复制值'"
      >
        {{ formatValue(node.value) }}
      </span>
      <span v-else class="node-summary">{{ node.value }}</span>

      <a-button
        v-if="depth === 0 || node.isLeaf"
        size="small"
        type="text"
        class="copy-path-btn"
        @click.stop="$emit('copyPath', node.key)"
        title="复制JSONPath"
      >
        <CopyOutlined />
      </a-button>
    </div>

    <div v-if="expanded && !node.isLeaf && node.children" class="node-children">
      <JsonTreeNode
        v-for="(child, index) in node.children"
        :key="index"
        :node="child"
        :depth="depth + 1"
        @copy-path="$emit('copyPath', $event)"
      />
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue";
import { CopyOutlined } from "@ant-design/icons-vue";

const props = defineProps({
  node: {
    type: Object,
    required: true,
  },
  depth: {
    type: Number,
    default: 0,
  },
});

defineEmits(["copyPath"]);

const expanded = ref(props.depth === 0);

function toggleExpand() {
  if (!props.node.isLeaf) {
    expanded.value = !expanded.value;
  }
}

function formatValue(val) {
  if (val === null) return "null";
  if (val === undefined) return "undefined";
  if (typeof val === "string") {
    const maxLen = 60;
    return val.length > maxLen ? `"${val.slice(0, maxLen)}..."` : `"${val}"`;
  }
  return String(val);
}

async function handleCopyValue() {
  try {
    const text =
      typeof props.node.value === "string"
        ? props.node.value
        : JSON.stringify(props.node.value);
    await navigator.clipboard.writeText(text);
  } catch {
    // 静默失败
  }
}
</script>

<style lang="scss" scoped>
.json-tree-node {
  .node-header {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 3px 6px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 13px;
    line-height: 1.7;
    transition: background 0.15s;

    &:hover {
      background: rgba(22, 119, 255, 0.04);
    }

    .expand-icon,
    .leaf-dot {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 16px;
      font-size: 10px;
      color: var(--text-secondary);
      flex-shrink: 0;
    }

    .leaf-dot {
      color: #c0c0c0;
    }

    .node-key {
      color: #9cdcfe;
      font-family: "Fira Code", Consolas, monospace;
      font-weight: 500;

      &.type-string,
      &.type-number,
      &.type-boolean,
      &.type-null {
        color: #569cd6;
      }
      &.type-object {
        color: #4ec9b0;
      }
      &.type-array {
        color: #d7ba7d;
      }
    }

    .node-separator {
      color: #858585;
    }

    .node-value {
      font-family: "Fira Code", Consolas, monospace;
      cursor: pointer;
      padding: 0 4px;
      border-radius: 3px;
      transition: background 0.15s;

      &:hover {
        background: rgba(82, 196, 26, 0.08);

        &.value-string {
          background: rgba(82, 196, 26, 0.12);
        }
        &.value-number {
          background: rgba(22, 119, 255, 0.12);
        }
        &.value-boolean {
          background: rgba(114, 46, 209, 0.12);
        }
        &.value-null {
          color: #8c8c8c;
          background: rgba(140, 140, 140, 0.08);
        }
      }

      &.value-string {
        color: #ce9178;
      }
      &.value-number {
        color: #b5cea8;
      }
      &.value-boolean {
        color: #569cd6;
      }
      &.value-null {
        color: #569cd6;
        opacity: 0.5;
      }
    }

    .node-summary {
      color: var(--text-secondary);
      font-style: italic;
      font-size: 12px;
    }

    .copy-path-btn {
      opacity: 0;
      margin-left: auto;
      flex-shrink: 0;

      &:focus {
        opacity: 1;
      }
    }

    &:hover .copy-path-btn {
      opacity: 0.6;
    }
  }

  .node-children {
    border-left: 1px dashed var(--border-color-split, #e5e5e5);
    margin-left: 10px;
  }
}
</style>
