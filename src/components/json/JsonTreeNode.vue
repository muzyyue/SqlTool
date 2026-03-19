<template>
  <div class="json-tree-node">
    <div
      class="node-content"
      :style="{ paddingLeft: `${node.depth * 20}px` }"
      @click="handleToggle"
    >
      <span class="node-expand-icon" v-if="hasChildren">
        <DownOutlined v-if="isExpanded" />
        <RightOutlined v-else />
      </span>
      <span class="node-expand-placeholder" v-else></span>

      <span class="node-key" :class="{ 'search-match': isKeyMatch }">
        {{ node.key }}
      </span>

      <span class="node-colon">:</span>

      <span class="node-type" :class="`type-${node.valueType}`">
        {{ node.valueType }}
      </span>

      <span
        v-if="node.valueType !== 'object' && node.valueType !== 'array'"
        class="node-value"
        :class="`value-${node.valueType}`"
      >
        {{ displayValue }}
      </span>
    </div>

    <div v-if="hasChildren && isExpanded" class="node-children">
      <JsonTreeNode
        v-for="child in node.children"
        :key="child.id"
        :node="child"
        :expanded-keys="expandedKeys"
        :search-text="searchText"
        @toggle="$emit('toggle', $event)"
        @edit="$emit('edit', $event)"
        @delete="$emit('delete', $event)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { DownOutlined, RightOutlined } from '@ant-design/icons-vue'
import type { JsonTreeNode as JsonTreeNodeType } from '@/types/json'

interface Props {
  node: JsonTreeNodeType
  expandedKeys: Set<string>
  searchText?: string
}

const props = withDefaults(defineProps<Props>(), {
  searchText: '',
})

const emit = defineEmits<{
  toggle: [nodeId: string]
  edit: [path: string, value: unknown]
  delete: [path: string]
}>()

const hasChildren = computed(() => {
  return props.node.children && props.node.children.length > 0
})

const isExpanded = computed(() => {
  return props.expandedKeys.has(props.node.id)
})

const isKeyMatch = computed(() => {
  if (!props.searchText) return false
  return props.node.key.toLowerCase().includes(props.searchText.toLowerCase())
})

const displayValue = computed(() => {
  const { value, valueType } = props.node
  if (valueType === 'string') {
    const str = String(value)
    return str.length > 50 ? `"${str.substring(0, 50)}..."` : `"${str}"`
  }
  if (valueType === 'null') return 'null'
  if (valueType === 'boolean') return String(value)
  if (valueType === 'number') return String(value)
  return ''
})

const handleToggle = () => {
  if (hasChildren.value) {
    emit('toggle', props.node.id)
  }
}
</script>

<style scoped lang="scss">
.json-tree-node {
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.6;
}

.node-content {
  display: flex;
  align-items: center;
  padding: 4px 8px;
  cursor: pointer;
  border-radius: 4px;
  transition: background 0.15s ease;

  &:hover {
    background: $bg-elevated;
  }
}

.node-expand-icon {
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: $text-secondary;
  font-size: 10px;
  flex-shrink: 0;
}

.node-expand-placeholder {
  width: 16px;
  flex-shrink: 0;
}

.node-key {
  color: $color-primary;
  font-weight: 500;
}

.node-colon {
  color: $text-secondary;
  margin: 0 4px;
}

.node-type {
  font-size: 11px;
  padding: 1px 4px;
  border-radius: 3px;
  margin-right: 6px;

  &.type-object {
    background: rgba(24, 144, 255, 0.1);
    color: #1890ff;
  }

  &.type-array {
    background: rgba(82, 196, 26, 0.1);
    color: #52c41a;
  }

  &.type-string {
    background: rgba(250, 173, 20, 0.1);
    color: #faad14;
  }

  &.type-number {
    background: rgba(114, 46, 209, 0.1);
    color: #722ed1;
  }

  &.type-boolean {
    background: rgba(19, 194, 194, 0.1);
    color: #13c2c2;
  }

  &.type-null {
    background: rgba(140, 140, 140, 0.1);
    color: #8c8c8c;
  }
}

.node-value {
  color: $text-secondary;

  &.value-string {
    color: #52c41a;
  }

  &.value-number {
    color: #722ed1;
  }

  &.value-boolean {
    color: #13c2c2;
  }

  &.value-null {
    color: #8c8c8c;
    font-style: italic;
  }
}

.node-children {
  margin-left: 0;
}

.search-match {
  background: rgba(250, 173, 20, 0.3);
  border-radius: 2px;
  padding: 0 2px;
}
</style>
