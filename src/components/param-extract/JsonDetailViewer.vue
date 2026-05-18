<template>
  <div class="json-detail-viewer">
    <a-tabs v-model:activeKey="activeTab">
      <!-- Tab 1: 树形视图 -->
      <a-tab-pane key="tree" tab="📂 树形视图">
        <div class="tree-container">
          <JsonTreeNode
            v-for="(node, index) in treeNodes"
            :key="index"
            :node="node"
            :depth="0"
            @copy-path="handleCopyPath"
          />
          <a-empty v-if="treeNodes.length === 0" description="无数据" />
        </div>
        <div class="action-bar">
          <a-button size="small" @click="copyOriginal">
            <template #icon><CopyOutlined /></template>
            复制原始JSON
          </a-button>
          <a-button size="small" @click="copyFormatted">
            <template #icon><CopyOutlined /></template>
            复制格式化JSON
          </a-button>
          <a-button size="small" @click="downloadJson">
            <template #icon><DownloadOutlined /></template>
            下载.json
          </a-button>
        </div>
      </a-tab-pane>

      <!-- Tab 2: ⭐ 智能解包视图 -->
      <a-tab-pane key="unwrap" tab="⚙️ 智能解包">
        <!-- 解包选项 -->
        <div class="unwrap-options">
          <div class="option-row">
            <span class="option-label">最大深度:</span>
            <a-select v-model:value="unwrapConfig.maxDepth" size="small" style="width: 80px">
              <a-select-option :value="1">1</a-select-option>
              <a-select-option :value="2">2</a-select-option>
              <a-select-option :value="3">3</a-select-option>
              <a-select-option :value="5">5</a-select-option>
              <a-select-option :value="10">10</a-select-option>
            </a-select>
          </div>
          <div class="option-row">
            <a-switch v-model:checked="unwrapConfig.detectStringifiedJson" size="small" />
            <span>检测转义JSON</span>
          </div>
          <div class="option-row">
            <a-switch v-model:checked="unwrapConfig.includeLineage" size="small" />
            <span>显示血缘信息</span>
          </div>
          <a-button type="primary" size="small" @click="runUnwrap" :loading="unwrapping">
            重新解包
          </a-button>
        </div>

        <!-- 统计卡片 -->
        <div class="unwrap-stats" v-if="atomicValues.length > 0">
          <a-statistic title="✅ 成功" :value="successCount" :value-style="{ color: '#52c41a' }" />
          <a-statistic title="⚠️ 深度限制" :value="depthLimitCount" :value-style="{ color: '#faad14' }" />
          <a-statistic title="❌ 错误" :value="errorCount" :value-style="{ color: '#ff4d4f' }" />
        </div>

        <!-- 原子值列表 -->
        <div class="atomic-list">
          <div
            v-for="(item, index) in atomicValues"
            :key="index"
            class="atomic-item"
          >
            <div class="atomic-value">
              <span class="type-icon" :class="'type-' + item.dataType">{{ getTypeIcon(item.dataType) }}</span>
              <span class="value-text">{{ truncateValue(item.finalValue) }}</span>
            </div>
            <div class="atomic-meta">
              <a-tag color="blue">路径: {{ item.fullPath }}</a-tag>
              <a-tag :color="getTypeColor(item.dataType)">{{ item.dataType }}</a-tag>
              <a-tag>深度: {{ item.parseDepth }}</a-tag>
            </div>
            <div class="atomic-actions">
              <a-button size="small" @click="copyAtomicValue(item)">
                <template #icon><CopyOutlined /></template>
                复制
              </a-button>
              <a-button size="small" @click="showLineage(item)" :disabled="!item.lineage?.length">
                <template #icon><EyeOutlined /></template>
                查看血缘
              </a-button>
            </div>
          </div>
          <a-empty v-if="atomicValues.length === 0 && !unwrapping" description="点击「重新解包」开始提取" />
        </div>

        <!-- 批量操作 -->
        <div class="batch-actions" v-if="atomicValues.length > 0">
          <a-button size="small" @click="copyAllAtoms">
            <template #icon><CopyOutlined /></template>
            复制全部原子值
          </a-button>
          <a-button size="small" @click="exportCSV">
            <template #icon><ExportOutlined /></template>
            导出CSV
          </a-button>
        </div>
      </a-tab-pane>
    </a-tabs>

    <!-- 血缘查看器 Modal -->
    <a-modal
      v-model:open="lineageModalVisible"
      title="🔗 数据血缘查看器"
      :footer="null"
      width="700px"
    >
      <template v-if="selectedLineageItem">
        <a-descriptions :column="1" bordered size="small">
          <a-descriptions-item label="最终值">
            <strong>{{ selectedLineageItem.finalValue }}</strong>
          </a-descriptions-item>
          <a-descriptions-item label="完整路径">
            <a-tag color="blue">{{ selectedLineageItem.fullPath }}</a-tag>
          </a-descriptions-item>
          <a-descriptions-item label="解析深度">
            {{ selectedLineageItem.parseDepth }}
          </a-descriptions-item>
          <a-descriptions-item label="包装模式">
            <a-tag :color="selectedLineageItem.metadata?.originalWrapper ? 'green' : 'default'">
              {{ selectedLineageItem.metadata?.originalWrapper || '未识别' }}
            </a-tag>
          </a-descriptions-item>
          <a-descriptions-item label="转义JSON">
            <a-tag :color="selectedLineageItem.metadata?.isEscapedJson ? 'red' : 'default'">
              {{ selectedLineageItem.metadata?.isEscapedJson ? '是 ✓' : '否' }}
            </a-tag>
          </a-descriptions-item>
        </a-descriptions>

        <h4 style="margin: 16px 0 8px">解析步骤：</h4>
        <a-table
          :columns="lineageColumns"
          :data-source="selectedLineageItem.lineage || []"
          :pagination="false"
          size="small"
          bordered
        />
      </template>
    </a-modal>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import {
  CopyOutlined,
  DownloadOutlined,
  EyeOutlined,
  ExportOutlined
} from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'
import JsonTreeNode from './JsonTreeNode.vue'
import { extractAtomicValues } from '@/utils/json/jsonExtractor'

const props = defineProps({
  item: {
    type: Object,
    required: true
  }
})

const activeTab = ref('tree')
const unwrapping = ref(false)
const lineageModalVisible = ref(false)
const selectedLineageItem = ref(null)

const unwrapConfig = ref({
  maxDepth: 3,
  detectStringifiedJson: true,
  includeLineage: true
})

const atomicValues = ref([])

const lineageColumns = [
  { title: '步骤', dataIndex: 'step', key: 'step', width: 60 },
  { title: '路径', dataIndex: 'path', key: 'path', width: 200 },
  { title: '操作类型', dataIndex: 'action', key: 'action', width: 160 },
  { title: '原始值(截断)', dataIndex: 'rawValue', key: 'rawValue', ellipsis: true }
]

// 树形节点数据
const treeNodes = computed(() => {
  if (!props.item?.original) return []
  try {
    const json = JSON.parse(props.item.original)
    return buildTreeNodes(json, '$')
  } catch {
    return []
  }
})

const successCount = computed(() =>
  atomicValues.value.filter(v => v.status === 'success').length
)
const depthLimitCount = computed(() =>
  atomicValues.value.filter(v => v.status === 'depth-limit').length
)
const errorCount = computed(() =>
  atomicValues.value.filter(v => v.status === 'error' || v.status === 'parse-error').length
)

function buildTreeNodes(obj, path) {
  if (obj === null || obj === undefined) {
    return [{ key: path, value: obj, type: 'null', isLeaf: true }]
  }
  if (typeof obj !== 'object') {
    return [{ key: path, value: obj, type: typeof obj, isLeaf: true }]
  }
  if (Array.isArray(obj)) {
    return [{
      key: path,
      value: `[${obj.length} items]`,
      type: 'array',
      isLeaf: false,
      children: obj.map((item, i) => buildTreeNodes(item, `${path}[${i}`)).flat()
    }]
  }
  const children = []
  for (const [k, v] of Object.entries(obj)) {
    children.push(...buildTreeNodes(v, `${path}.${k}`))
  }
  return [{ key: path, value: '{...}', type: 'object', isLeaf: false, children }]
}

function getTypeIcon(type) {
  const icons = { string: 'T', number: '#', boolean: '?', null: '∅', object: '{', array: '[[]]' }
  return icons[type] || '*'
}

function getTypeColor(type) {
  const colors = { string: 'green', number: 'blue', boolean: 'purple', null: 'default', object: 'orange', array: 'cyan' }
  return colors[type] || 'default'
}

function truncateValue(val, maxLen = 80) {
  if (val === null || val === undefined) return String(val)
  const str = typeof val === 'string' ? val : JSON.stringify(val)
  return str.length > maxLen ? str.slice(0, maxLen) + '...' : str
}

async function runUnwrap() {
  unwrapping.value = true
  try {
    let json
    if (typeof props.item.original === 'string') {
      json = JSON.parse(props.item.original)
    } else {
      json = props.item.original
    }
    atomicValues.value = extractAtomicValues(json, unwrapConfig.value)
  } catch (e) {
    message.error('解包失败: ' + e.message)
    atomicValues.value = []
  } finally {
    unwrapping.value = false
  }
}

async function copyOriginal() {
  try {
    await navigator.clipboard.writeText(props.item.original || '')
    message.success('已复制原始JSON')
  } catch {
    message.error('复制失败')
  }
}

async function copyFormatted() {
  try {
    const formatted = JSON.stringify(JSON.parse(props.item.original), null, 2)
    await navigator.clipboard.writeText(formatted)
    message.success('已复制格式化JSON')
  } catch {
    message.error('复制失败')
  }
}

function downloadJson() {
  const blob = new Blob([props.item.original], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'extracted-data.json'
  a.click()
  URL.revokeObjectURL(url)
  message.success('下载已开始')
}

async function copyAtomicValue(item) {
  try {
    const text = typeof item.finalValue === 'string' ? item.finalValue : JSON.stringify(item.finalValue)
    await navigator.clipboard.writeText(text)
    message.success('已复制')
  } catch {
    message.error('复制失败')
  }
}

function showLineage(item) {
  selectedLineageItem.value = item
  lineageModalVisible.value = true
}

async function handleCopyPath(path) {
  try {
    await navigator.clipboard.writeText(path)
    message.success(`已复制路径: ${path}`)
  } catch {
    message.error('复制失败')
  }
}

async function copyAllAtoms() {
  const lines = atomicValues.value
    .filter(v => v.status === 'success')
    .map(v => `${v.fullPath}: ${v.finalValue}`)
    .join('\n')
  try {
    await navigator.clipboard.writeText(lines)
    message.success(`已复制 ${lines.split('\n').length} 条原子值`)
  } catch {
    message.error('复制失败')
  }
}

function exportCSV() {
  const headers = ['路径', '值', '类型', '深度', '状态']
  const rows = atomicValues.value.map(v => [
    `"${v.fullPath}"`,
    `"${truncateValue(v.finalValue, 50).replace(/"/g, '""')}"`,
    v.dataType,
    v.parseDepth,
    v.status
  ])
  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'atomic-values.csv'
  a.click()
  URL.revokeObjectURL(url)
  message.success('CSV导出成功')
}

watch(() => props.item, () => {
  if (activeTab.value === 'unwrap' && atomicValues.value.length === 0) {
    runUnwrap()
  }
}, { immediate: true })
</script>

<style lang="scss" scoped>
.json-detail-viewer {
  .tree-container {
    max-height: 400px;
    overflow-y: auto;
    border: 1px solid var(--border-default);
    border-radius: 8px;
    padding: 12px;
    background: var(--bg-base);
  }

  .action-bar, .batch-actions {
    display: flex;
    gap: 8px;
    justify-content: flex-end;
    margin-top: 12px;
    flex-wrap: wrap;
  }

  // 智能解包样式
  .unwrap-options {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 12px;
    background: var(--bg-elevated);
    border-radius: 8px;
    margin-bottom: 16px;
    flex-wrap: wrap;

    .option-row {
      display: flex;
      align-items: center;
      gap: 6px;

      .option-label {
        font-size: 13px;
        color: var(--text-secondary);
        min-width: 60px;
      }
    }
  }

  .unwrap-stats {
    display: flex;
    gap: 24px;
    justify-content: space-around;
    padding: 16px;
    background: var(--bg-elevated);
    border-radius: 8px;
    margin-bottom: 16px;
  }

  .atomic-list {
    .atomic-item {
      padding: 12px;
      border: 1px solid var(--border-default);
      border-radius: 8px;
      margin-bottom: 8px;
      transition: all 0.2s;

      &:hover {
        border-color: var(--color-primary);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
      }

      .atomic-value {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 6px;

        .type-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 22px;
          height: 22px;
          border-radius: 4px;
          font-size: 11px;
          font-weight: bold;
          color: white;

          &.type-string { background: #52c41a; }
          &.type-number { background: #1677ff; }
          &.type-boolean { background: #722ed1; }
          &.type-null { background: #8c8c8c; }
          &.type-object { background: #fa8c16; }
          &.type-array { background: #13c2c2; }
        }

        .value-text {
          font-family: 'Fira Code', Consolas, monospace;
          font-size: 13px;
          word-break: break-all;
          color: var(--text-primary);
        }
      }

      .atomic-meta {
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
        margin-bottom: 6px;
      }

      .atomic-actions {
        display: flex;
        gap: 6px;
      }
    }
  }

  :deep(.ant-tabs-content) {
    padding-top: 16px;
  }
}
</style>
