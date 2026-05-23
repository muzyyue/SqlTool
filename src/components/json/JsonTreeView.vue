<template>
  <div class="json-tree-view">
    <div class="tree-header">
      <div class="header-left">
        <span class="header-title">树形视图</span>
        <span class="header-desc">可视化展示 JSON 结构</span>
      </div>
      <div class="header-actions">
        <a-space :size="8">
          <a-button size="small" @click="handleExpandAll">
            <template #icon><DownOutlined /></template>
            全展开
          </a-button>
          <a-button size="small" @click="handleCollapseAll">
            <template #icon><RightOutlined /></template>
            全折叠
          </a-button>
        </a-space>
      </div>
    </div>

    <div class="tree-toolbar">
      <a-input-search
        v-model:value="searchText"
        placeholder="搜索字段名或值..."
        style="width: 200px"
        @search="handleSearch"
      />
      <a-select
        v-model:value="filterType"
        style="width: 120px"
        size="small"
        placeholder="筛选类型"
        @change="handleFilterChange"
      >
        <a-select-option value="all">全部</a-select-option>
        <a-select-option value="object">对象</a-select-option>
        <a-select-option value="array">数组</a-select-option>
        <a-select-option value="string">字符串</a-select-option>
        <a-select-option value="number">数字</a-select-option>
        <a-select-option value="boolean">布尔</a-select-option>
      </a-select>
    </div>

    <div class="tree-content" ref="treeContentRef">
      <div v-if="treeData.length > 0" class="tree-nodes">
        <JsonTreeNode
          v-for="node in filteredNodes"
          :key="node.id"
          :node="node"
          :expanded-keys="expandedKeys"
          :search-text="searchText"
          @toggle="handleToggle"
          @edit="handleEdit"
          @delete="handleDelete"
        />
      </div>
      <div v-else class="tree-empty">
        <a-empty description="暂无数据，请输入 JSON" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { DownOutlined, RightOutlined } from "@ant-design/icons-vue";
import JsonTreeNode from "./JsonTreeNode.vue";
import type { JsonTreeNode as JsonTreeNodeType } from "@/types/json";

/**
 * 组件属性定义
 */
interface Props {
  /** JSON 数据 */
  modelValue?: unknown;
  /** 是否可编辑 */
  editable?: boolean;
  /** 是否可删除 */
  deletable?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: null,
  editable: false,
  deletable: false,
});

/**
 * 组件事件定义
 */
const emit = defineEmits<{
  "update:modelValue": [value: unknown];
  edit: [path: string, value: unknown];
  delete: [path: string];
  expandAll: [];
  collapseAll: [];
}>();

const searchText = ref("");
const filterType = ref<string>("all");
const expandedKeys = ref<Set<string>>(new Set());
const treeContentRef = ref<HTMLElement | null>(null);
const treeData = ref<JsonTreeNodeType[]>([]);

watch(
  () => props.modelValue,
  (val) => {
    if (val !== null && val !== undefined) {
      buildTree(val);
    } else {
      treeData.value = [];
    }
  },
  { immediate: true },
);

const filteredNodes = computed(() => {
  let nodes = treeData.value;

  if (filterType.value !== "all") {
    nodes = filterNodesByType(nodes, filterType.value);
  }

  if (searchText.value) {
    nodes = filterNodesBySearch(nodes, searchText.value.toLowerCase());
  }

  return nodes;
});

const buildTree = (
  data: unknown,
  parentPath: string = "",
  depth: number = 0,
) => {
  const nodes: JsonTreeNodeType[] = [];
  const id = parentPath || "root";

  if (data === null) {
    nodes.push({
      id,
      key: parentPath.split(".").pop() || "root",
      value: null,
      valueType: "null",
      path: parentPath,
      depth,
      expanded: false,
      isArrayItem: false,
    });
    return nodes;
  }

  if (Array.isArray(data)) {
    nodes.push({
      id,
      key: parentPath.split(".").pop() || "root",
      value: data,
      valueType: "array",
      path: parentPath,
      depth,
      expanded: expandedKeys.value.has(id),
      isArrayItem: false,
      children: data.map((item, index) => ({
        id: `${id}[${index}]`,
        key: String(index),
        value: item,
        valueType: getValueType(item),
        path: `${parentPath}[${index}]`,
        depth: depth + 1,
        expanded: expandedKeys.value.has(`${id}[${index}]`),
        isArrayItem: true,
        arrayIndex: index,
      })),
    });
    return nodes;
  }

  if (typeof data === "object") {
    const keys = Object.keys(data);
    nodes.push({
      id,
      key: parentPath.split(".").pop() || "root",
      value: data,
      valueType: "object",
      path: parentPath,
      depth,
      expanded: expandedKeys.value.has(id),
      isArrayItem: false,
      children: keys.map((key) => ({
        id: parentPath ? `${parentPath}.${key}` : key,
        key,
        value: data[key],
        valueType: getValueType(data[key]),
        path: parentPath ? `${parentPath}.${key}` : key,
        depth: depth + 1,
        expanded: expandedKeys.value.has(
          parentPath ? `${parentPath}.${key}` : key,
        ),
        isArrayItem: false,
      })),
    });
    return nodes;
  }

  nodes.push({
    id,
    key: parentPath.split(".").pop() || "root",
    value: data,
    valueType: getValueType(data),
    path: parentPath,
    depth,
    expanded: false,
    isArrayItem: false,
  });

  return nodes;
};

const getValueType = (value: unknown): JsonTreeNodeType["valueType"] => {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  if (typeof value === "object") return "object";
  if (typeof value === "string") return "string";
  if (typeof value === "number") return "number";
  if (typeof value === "boolean") return "boolean";
  return "null";
};

const filterNodesByType = (
  nodes: JsonTreeNodeType[],
  type: string,
): JsonTreeNodeType[] => {
  return nodes.filter((node) => {
    if (node.valueType === type) return true;
    if (node.children) {
      const filteredChildren = filterNodesByType(node.children, type);
      return filteredChildren.length > 0;
    }
    return false;
  });
};

const filterNodesBySearch = (
  nodes: JsonTreeNodeType[],
  search: string,
): JsonTreeNodeType[] => {
  return nodes.filter((node) => {
    const keyMatch = node.key.toLowerCase().includes(search);
    const valueMatch =
      typeof node.value === "string" &&
      node.value.toLowerCase().includes(search);
    if (keyMatch || valueMatch) return true;
    if (node.children) {
      const filteredChildren = filterNodesBySearch(node.children, search);
      return filteredChildren.length > 0;
    }
    return false;
  });
};

const handleToggle = (nodeId: string) => {
  if (expandedKeys.value.has(nodeId)) {
    expandedKeys.value.delete(nodeId);
  } else {
    expandedKeys.value.add(nodeId);
  }
  expandedKeys.value = new Set(expandedKeys.value);
};

const handleEdit = (path: string, value: unknown) => {
  emit("edit", path, value);
};

const handleDelete = (path: string) => {
  emit("delete", path);
};

const handleExpandAll = () => {
  const allKeys = new Set<string>();
  const collectKeys = (nodes: JsonTreeNodeType[]) => {
    nodes.forEach((node) => {
      if (node.valueType === "object" || node.valueType === "array") {
        allKeys.add(node.id);
        if (node.children) {
          collectKeys(node.children);
        }
      }
    });
  };
  collectKeys(treeData.value);
  expandedKeys.value = allKeys;
  emit("expandAll");
};

const handleCollapseAll = () => {
  expandedKeys.value = new Set();
  emit("collapseAll");
};

const handleSearch = () => {
  // 搜索时自动展开匹配的节点
};

const handleFilterChange = () => {
  // 筛选类型变化时重置展开状态
};

defineExpose({
  expandAll: handleExpandAll,
  collapseAll: handleCollapseAll,
  getTreeData: () => treeData.value,
});
</script>

<style scoped lang="scss">
.json-tree-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: $card-bg;
  border: 1px solid $border-default;
  border-radius: $border-radius-md;
  overflow: hidden;
}

.tree-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: $bg-elevated;
  border-bottom: 1px solid $border-default;
}

.header-left {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.header-title {
  font-size: 16px;
  font-weight: 600;
  color: $text-primary;
}

.header-desc {
  font-size: 13px;
  color: $text-secondary;
}

.tree-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: $bg-sunken;
  border-bottom: 1px solid $border-default;
}

.tree-content {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
  contain: content;
}

.tree-nodes {
  display: flex;
  flex-direction: column;
}

.tree-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 200px;
}

@media (max-width: 768px) {
  .tree-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
    padding: 8px 12px;
  }

  .tree-toolbar {
    flex-direction: column;
    align-items: stretch;
    padding: 8px 12px;
  }
}
</style>
