<template>
  <div class="json-tree-view">
    <!-- 工具栏 -->
    <div class="json-tree-toolbar">
      <div class="toolbar-left">
        <a-input-search
          v-model:value="searchInput"
          placeholder="搜索 key 或 value..."
          allow-clear
          size="small"
          style="width: 200px"
          @search="handleSearch"
          @change="handleSearchChange"
        />
        <span v-if="matchCount > 0" class="match-count">
          {{ matchCount }} 个匹配
        </span>
      </div>
      <div class="toolbar-right">
        <a-button size="small" @click="expandAll">
          <template #icon><DownOutlined /></template>
          全部展开
        </a-button>
        <a-button size="small" @click="collapseAll">
          <template #icon><RightOutlined /></template>
          全部折叠
        </a-button>
      </div>
    </div>

    <!-- 路径显示 -->
    <div v-if="selectedPath" class="path-display">
      <span class="path-label">路径：</span>
      <code class="path-value">{{ selectedPath }}</code>
      <a-button type="link" size="small" @click="copyPath">
        <template #icon><CopyOutlined /></template>
        复制
      </a-button>
    </div>

    <!-- 树形内容 -->
    <div class="json-tree-content">
      <template v-if="parsedData">
        <JsonTreeNode
          v-for="(node, index) in parsedData"
          :key="index"
          :node="node"
          :expanded-keys="expandedKeys"
          :matched-keys="matchedKeys"
          @toggle="toggleExpand"
          @node-click="handleNodeClick"
        />
      </template>
      <div v-else class="empty-placeholder">
        暂无数据
      </div>
    </div>
  </div>
</template>

<script setup>
/**
 * JSON 树形视图组件
 * 提供树形展示、搜索高亮、路径追踪等功能
 * @module JsonTreeView
 */
import { ref, computed, watch, shallowRef, defineAsyncComponent } from 'vue'
import { message } from 'ant-design-vue'
import { DownOutlined, RightOutlined, CopyOutlined } from '@ant-design/icons-vue'

/**
 * 异步加载树节点组件（实现递归）
 */
const JsonTreeNode = defineAsyncComponent(() =>
  import('@/components/json/JsonTreeNode.vue')
)

/**
 * 组件属性定义
 */
const props = defineProps({
  /** JSON 数据 */
  modelValue: {
    type: [Object, Array],
    default: null,
  },
  /** 搜索关键词 */
  searchKeyword: {
    type: String,
    default: '',
  },
  /** 默认展开层级 */
  defaultExpandDepth: {
    type: Number,
    default: 2,
  },
})

/**
 * 组件事件定义
 */
const emit = defineEmits(['update:modelValue', 'nodeClick'])

/**
 * 搜索输入值
 */
const searchInput = ref(props.searchKeyword)

/**
 * 展开的节点路径集合
 */
const expandedKeys = ref(new Set())

/**
 * 匹配的节点路径集合
 */
const matchedKeys = ref(new Set())

/**
 * 选中的节点路径
 */
const selectedPath = ref('')

/**
 * 匹配数量
 */
const matchCount = ref(0)

/**
 * 解析后的节点数据
 */
const parsedData = shallowRef(null)

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
 * 解析 JSON 数据为树节点结构
 * @param {*} data - 原始数据
 * @param {string} path - 当前路径
 * @param {number} depth - 当前深度
 * @returns {Array} 节点数组
 */
const parseData = (data, path = '', depth = 0) => {
  if (data === null || data === undefined) {
    return null
  }

  const type = getValueType(data)

  if (type === 'array') {
    return data.map((item, index) => {
      const itemPath = path ? `${path}[${index}]` : `[${index}]`
      const itemType = getValueType(item)
      const node = {
        key: index,
        value: item,
        type: itemType,
        path: itemPath,
        depth,
        hasChildren: isExpandable(item),
      }

      // 默认展开前两层
      if (depth < props.defaultExpandDepth && node.hasChildren) {
        expandedKeys.value.add(itemPath)
      }

      return node
    })
  }

  if (type === 'object') {
    return Object.entries(data).map(([key, value]) => {
      const itemPath = path ? `${path}.${key}` : key
      const valueType = getValueType(value)
      const node = {
        key,
        value,
        type: valueType,
        path: itemPath,
        depth,
        hasChildren: isExpandable(value),
      }

      // 默认展开前两层
      if (depth < props.defaultExpandDepth && node.hasChildren) {
        expandedKeys.value.add(itemPath)
      }

      return node
    })
  }

  return null
}

/**
 * 搜索匹配节点
 * @param {*} data - 数据源
 * @param {string} keyword - 搜索关键词
 * @param {string} path - 当前路径
 */
const searchNodes = (data, keyword, path = '') => {
  if (!keyword || !data) {
    matchedKeys.value.clear()
    matchCount.value = 0
    return
  }

  const lowerKeyword = keyword.toLowerCase()
  const matches = new Set()
  let count = 0

  const traverse = (obj, currentPath) => {
    if (obj === null || obj === undefined) return

    const type = getValueType(obj)

    if (type === 'array') {
      obj.forEach((item, index) => {
        const itemPath = currentPath ? `${currentPath}[${index}]` : `[${index}]`
        // 检查索引是否匹配
        if (String(index).toLowerCase().includes(lowerKeyword)) {
          matches.add(itemPath)
          count++
        }
        traverse(item, itemPath)
      })
    } else if (type === 'object') {
      Object.entries(obj).forEach(([key, value]) => {
        const itemPath = currentPath ? `${currentPath}.${key}` : key
        // 检查 key 是否匹配
        if (key.toLowerCase().includes(lowerKeyword)) {
          matches.add(itemPath)
          count++
        }
        // 检查值是否匹配（基本类型）
        const valueType = getValueType(value)
        if (
          (valueType === 'string' || valueType === 'number') &&
          String(value).toLowerCase().includes(lowerKeyword)
        ) {
          matches.add(itemPath)
          count++
        }
        traverse(value, itemPath)
      })
    }
  }

  traverse(data, path)
  matchedKeys.value = matches
  matchCount.value = count

  // 自动展开匹配节点的父级
  expandMatchedParents()
}

/**
 * 展开匹配节点的父级路径
 */
const expandMatchedParents = () => {
  matchedKeys.value.forEach((path) => {
    const parts = path.split(/[.\[\]]+/).filter(Boolean)
    let currentPath = ''
    parts.slice(0, -1).forEach((part, index) => {
      if (index === 0) {
        currentPath = part
      } else if (path.includes(`${currentPath}[`)) {
        // 数组索引
        const match = path.match(new RegExp(`${currentPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\[(\\d+)\\]`))
        if (match) {
          currentPath = `${currentPath}[${match[1]}]`
        }
      } else {
        currentPath = currentPath ? `${currentPath}.${part}` : part
      }
      expandedKeys.value.add(currentPath)
    })
  })
}

/**
 * 切换节点展开状态
 * @param {string} path - 节点路径
 */
const toggleExpand = (path) => {
  if (expandedKeys.value.has(path)) {
    expandedKeys.value.delete(path)
  } else {
    expandedKeys.value.add(path)
  }
  // 触发响应式更新
  expandedKeys.value = new Set(expandedKeys.value)
}

/**
 * 全部展开
 */
const expandAll = () => {
  const expand = (data, path = '') => {
    if (data === null || data === undefined) return

    const type = getValueType(data)

    if (type === 'array') {
      data.forEach((item, index) => {
        const itemPath = path ? `${path}[${index}]` : `[${index}]`
        if (isExpandable(item)) {
          expandedKeys.value.add(itemPath)
          expand(item, itemPath)
        }
      })
    } else if (type === 'object') {
      Object.entries(data).forEach(([key, value]) => {
        const itemPath = path ? `${path}.${key}` : key
        if (isExpandable(value)) {
          expandedKeys.value.add(itemPath)
          expand(value, itemPath)
        }
      })
    }
  }

  expand(props.modelValue)
  expandedKeys.value = new Set(expandedKeys.value)
  message.success('已全部展开')
}

/**
 * 全部折叠
 */
const collapseAll = () => {
  expandedKeys.value.clear()
  expandedKeys.value = new Set()
  message.success('已全部折叠')
}

/**
 * 处理节点点击事件
 * @param {string} path - 节点路径
 * @param {*} value - 节点值
 */
const handleNodeClick = (path, value) => {
  selectedPath.value = path
  emit('nodeClick', path, value)
}

/**
 * 复制路径到剪贴板
 */
const copyPath = async () => {
  if (!selectedPath.value) {
    message.warning('请先选择一个节点')
    return
  }

  try {
    await navigator.clipboard.writeText(selectedPath.value)
    message.success('路径已复制到剪贴板')
  } catch (error) {
    message.error('复制失败，请检查浏览器权限')
    console.error('复制失败:', error)
  }
}

/**
 * 处理搜索
 */
const handleSearch = () => {
  searchNodes(props.modelValue, searchInput.value)
}

/**
 * 处理搜索输入变化（带防抖）
 */
let searchTimer = null
const handleSearchChange = () => {
  if (searchTimer) {
    clearTimeout(searchTimer)
  }
  searchTimer = setTimeout(() => {
    handleSearch()
  }, 300)
}

/**
 * 监听数据变化
 */
watch(
  () => props.modelValue,
  (newData) => {
    if (newData) {
      parsedData.value = parseData(newData)
      // 重新搜索
      if (searchInput.value) {
        handleSearch()
      }
    } else {
      parsedData.value = null
    }
  },
  { immediate: true, deep: true }
)

/**
 * 监听搜索关键词变化
 */
watch(
  () => props.searchKeyword,
  (newKeyword) => {
    searchInput.value = newKeyword
    handleSearch()
  }
)

/**
 * 暴露方法给父组件
 */
defineExpose({
  /** 全部展开 */
  expandAll,
  /** 全部折叠 */
  collapseAll,
  /** 搜索 */
  search: handleSearch,
  /** 获取选中路径 */
  getSelectedPath: () => selectedPath.value,
})
</script>

<style scoped>
/**
 * JSON 树形视图容器
 */
.json-tree-view {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  background: var(--bg-elevated);
  border: 1px solid var(--border-default);
  border-radius: var(--border-radius-md, 12px);
  overflow: hidden;
}

/**
 * 工具栏
 */
.json-tree-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: var(--bg-sunken);
  border-bottom: 1px solid var(--border-default);
  gap: 12px;
  flex-wrap: wrap;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.toolbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.match-count {
  font-size: 12px;
  color: var(--color-primary);
  background: var(--color-primary-bg);
  padding: 2px 8px;
  border-radius: var(--border-radius-xs, 4px);
}

/**
 * 路径显示
 */
.path-display {
  display: flex;
  align-items: center;
  padding: 8px 16px;
  background: var(--color-primary-bg);
  border-bottom: 1px solid var(--border-default);
  gap: 8px;
}

.path-label {
  font-size: 12px;
  color: var(--text-secondary);
  flex-shrink: 0;
}

.path-value {
  flex: 1;
  font-size: 12px;
  color: var(--color-primary);
  background: var(--bg-elevated);
  padding: 4px 8px;
  border-radius: var(--border-radius-xs, 4px);
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/**
 * 树形内容区域
 */
.json-tree-content {
  flex: 1;
  overflow: auto;
  padding: 8px 0;
}

/**
 * 空数据占位
 */
.empty-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 200px;
  color: var(--text-tertiary);
  font-size: 14px;
}

/**
 * 滚动条样式
 */
.json-tree-content::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.json-tree-content::-webkit-scrollbar-track {
  background: var(--scrollbar-track);
  border-radius: var(--border-radius-xs, 4px);
}

.json-tree-content::-webkit-scrollbar-thumb {
  background: var(--scrollbar-thumb);
  border-radius: var(--border-radius-xs, 4px);
}

.json-tree-content::-webkit-scrollbar-thumb:hover {
  background: var(--scrollbar-thumb-hover);
}

/**
 * 响应式设计
 */
@media (max-width: 768px) {
  .json-tree-toolbar {
    flex-direction: column;
    align-items: stretch;
  }

  .toolbar-left,
  .toolbar-right {
    justify-content: flex-start;
  }

  .toolbar-left :deep(.ant-input-search) {
    width: 100% !important;
  }
}
</style>
