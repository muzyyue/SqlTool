<template>
  <div class="json-tree-node" :class="{ matched: isMatched }">
    <!-- 节点行 -->
    <div
      class="node-row"
      :style="{ paddingLeft: `${node.depth * 20 + 8}px` }"
      @click="handleClick"
    >
      <!-- 展开/折叠图标 -->
      <span class="node-toggle" @click.stop="handleToggle">
        <template v-if="node.hasChildren">
          <DownOutlined v-if="isExpanded" class="toggle-icon" />
          <RightOutlined v-else class="toggle-icon" />
        </template>
        <span v-else class="toggle-placeholder"></span>
      </span>

      <!-- Key -->
      <span class="node-key" :class="{ highlighted: isKeyMatched }">
        {{ displayKey }}
      </span>

      <!-- 类型标签 -->
      <span class="node-type" :class="`type-${node.type}`">
        {{ node.type }}
      </span>

      <!-- 值预览 -->
      <span v-if="!node.hasChildren" class="node-value" :class="`value-${node.type}`">
        {{ displayValue }}
      </span>

      <!-- 子节点数量 -->
      <span v-if="node.hasChildren && !isExpanded" class="node-count">
        {{ childCount }} 项
      </span>
    </div>

    <!-- 子节点 -->
    <div v-if="node.hasChildren && isExpanded" class="node-children">
      <JsonTreeNode
        v-for="(child, index) in childNodes"
        :key="`${node.path}-${index}`"
        :node="child"
        :expanded-keys="expandedKeys"
        :matched-keys="matchedKeys"
        @toggle="$emit('toggle', $event)"
        @node-click="$emit('node-click', $event.path, $event.value)"
      />
    </div>
  </div>
</template>

<script setup>
/**
 * JSON 树节点组件
 * 递归渲染 JSON 树结构
 * @module JsonTreeNode
 */
import { computed, defineAsyncComponent } from 'vue'
import { DownOutlined, RightOutlined } from '@ant-design/icons-vue'

/**
 * 异步加载自身组件（实现递归）
 */
const JsonTreeNode = defineAsyncComponent(() =>
  import('@/components/json/JsonTreeNode.vue')
)

/**
 * 组件属性定义
 */
const props = defineProps({
  /** 节点数据 */
  node: {
    type: Object,
    required: true,
  },
  /** 展开的节点路径集合 */
  expandedKeys: {
    type: Set,
    default: () => new Set(),
  },
  /** 匹配的节点路径集合 */
  matchedKeys: {
    type: Set,
    default: () => new Set(),
  },
})

/**
 * 组件事件定义
 */
const emit = defineEmits(['toggle', 'nodeClick'])

/**
 * 是否展开
 */
const isExpanded = computed(() => {
  return props.expandedKeys.has(props.node.path)
})

/**
 * 是否匹配搜索
 */
const isMatched = computed(() => {
  return props.matchedKeys.has(props.node.path)
})

/**
 * Key 是否匹配搜索
 */
const isKeyMatched = computed(() => {
  // 简单判断：如果路径匹配且 key 部分包含搜索词
  return isMatched.value
})

/**
 * 显示的 Key
 */
const displayKey = computed(() => {
  const { key, type, path } = props.node
  // 数组索引显示格式
  if (type === 'array-item' || path.match(/\[\d+\]$/)) {
    return `[${key}]`
  }
  return key
})

/**
 * 显示的值
 */
const displayValue = computed(() => {
  const { value, type } = props.node

  switch (type) {
    case 'string':
      return `"${value}"`
    case 'number':
      return value
    case 'boolean':
      return value ? 'true' : 'false'
    case 'null':
      return 'null'
    case 'undefined':
      return 'undefined'
    default:
      return String(value)
  }
})

/**
 * 子节点数量
 */
const childCount = computed(() => {
  const { value, type } = props.node
  if (type === 'array') {
    return value.length
  }
  if (type === 'object') {
    return Object.keys(value).length
  }
  return 0
})

/**
 * 子节点数据
 */
const childNodes = computed(() => {
  const { value, type, path, depth } = props.node

  if (type === 'array') {
    return value.map((item, index) => {
      const itemPath = `${path}[${index}]`
      const itemType = getValueType(item)
      return {
        key: index,
        value: item,
        type: itemType,
        path: itemPath,
        depth: depth + 1,
        hasChildren: isExpandable(item),
      }
    })
  }

  if (type === 'object') {
    return Object.entries(value).map(([key, val]) => {
      const itemPath = `${path}.${key}`
      const valueType = getValueType(val)
      return {
        key,
        value: val,
        type: valueType,
        path: itemPath,
        depth: depth + 1,
        hasChildren: isExpandable(val),
      }
    })
  }

  return []
})

/**
 * 获取值的类型
 * @param {*} value - 要检测的值
 * @returns {string} 类型名称
 */
const getValueType = (value) => {
  if (value === null) return 'null'
  if (value === undefined) return 'undefined'
  if (Array.isArray(value)) return 'array'
  return typeof value
}

/**
 * 判断是否为可展开类型
 * @param {*} value - 要检测的值
 * @returns {boolean} 是否可展开
 */
const isExpandable = (value) => {
  const type = getValueType(value)
  return type === 'object' || type === 'array'
}

/**
 * 处理展开/折叠
 */
const handleToggle = () => {
  emit('toggle', props.node.path)
}

/**
 * 处理节点点击
 */
const handleClick = () => {
  emit('nodeClick', {
    path: props.node.path,
    value: props.node.value,
  })
}
</script>

<style scoped>
/**
 * 树节点容器
 */
.json-tree-node {
  user-select: none;
}

.json-tree-node.matched > .node-row {
  background: var(--color-primary-bg);
}

/**
 * 节点行
 */
.node-row {
  display: flex;
  align-items: center;
  padding: 4px 8px;
  cursor: pointer;
  transition: background var(--transition-fast, 120ms) ease;
  gap: 6px;
  min-height: 28px;
}

.node-row:hover {
  background: var(--interactive-hover);
}

/**
 * 展开/折叠图标
 */
.node-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

.toggle-icon {
  font-size: 10px;
  color: var(--text-secondary);
  transition: transform var(--transition-fast, 120ms) ease;
}

.toggle-placeholder {
  width: 16px;
  height: 16px;
}

/**
 * Key 样式
 */
.node-key {
  font-size: 13px;
  color: var(--text-primary);
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  flex-shrink: 0;
}

.node-key.highlighted {
  color: var(--color-primary);
  font-weight: 500;
}

/**
 * 类型标签
 */
.node-type {
  font-size: 11px;
  padding: 1px 6px;
  border-radius: var(--border-radius-xs, 4px);
  flex-shrink: 0;
  font-weight: 500;
}

/* string 类型 */
.type-string {
  background: var(--color-success-bg);
  color: var(--color-success);
}

/* number 类型 */
.type-number {
  background: var(--color-primary-bg);
  color: var(--color-primary);
}

/* boolean 类型 */
.type-boolean {
  background: var(--color-warning-bg);
  color: var(--color-warning);
}

/* null 类型 */
.type-null {
  background: var(--color-error-bg);
  color: var(--color-error);
}

/* undefined 类型 */
.type-undefined {
  background: var(--bg-sunken);
  color: var(--text-tertiary);
}

/* array 类型 */
.type-array {
  background: var(--badge-primary-bg);
  color: var(--badge-primary-text);
}

/* object 类型 */
.type-object {
  background: var(--color-info-bg);
  color: var(--color-info);
}

/**
 * 值预览
 */
.node-value {
  font-size: 13px;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 300px;
}

.value-string {
  color: var(--color-success);
}

.value-number {
  color: var(--color-primary);
}

.value-boolean {
  color: var(--color-warning);
}

.value-null {
  color: var(--color-error);
}

.value-undefined {
  color: var(--text-tertiary);
}

/**
 * 子节点数量
 */
.node-count {
  font-size: 11px;
  color: var(--text-tertiary);
  flex-shrink: 0;
}

/**
 * 子节点容器
 */
.node-children {
  border-left: 1px dashed var(--border-default);
  margin-left: 16px;
}

/**
 * 响应式设计
 */
@media (max-width: 768px) {
  .node-value {
    max-width: 150px;
  }
}
</style>
