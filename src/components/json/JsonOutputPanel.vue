<template>
  <div class="json-output-panel">
    <div class="panel-header">
      <div class="panel-title">
        <span class="title-text">{{ title }}</span>
        <span class="title-desc">{{ description }}</span>
      </div>
      <div class="panel-actions">
        <a-space :size="8">
          <a-button size="small" @click="handleCopy">
            <template #icon><CopyOutlined /></template>
            复制
          </a-button>
          <a-button size="small" @click="handleDownload">
            <template #icon><DownloadOutlined /></template>
            下载
          </a-button>
        </a-space>
      </div>
    </div>

    <div class="panel-content">
      <div class="editor-container">
        <CodeEditor
          ref="editorRef"
          v-model="internalValue"
          language="json"
          :theme="theme"
          :readonly="readonly"
          :min-lines="minLines"
          :max-lines="maxLines"
          :enable-fold="enableFold"
          :enable-search="enableSearch"
        />
      </div>

      <div v-if="showStats && stats" class="stats-bar">
        <a-descriptions size="small" :column="4" bordered>
          <a-descriptions-item label="对象">{{ stats.objectCount }}</a-descriptions-item>
          <a-descriptions-item label="数组">{{ stats.arrayCount }}</a-descriptions-item>
          <a-descriptions-item label="字段">{{ stats.fieldCount }}</a-descriptions-item>
          <a-descriptions-item label="大小">{{ formatSize(stats.size) }}</a-descriptions-item>
        </a-descriptions>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { CopyOutlined, DownloadOutlined } from '@ant-design/icons-vue'
import CodeEditor from '@/components/common/CodeEditor.vue'
import { calculateJsonStats, formatSize as formatSizeUtil } from '@/utils/json'
import type { JsonStats } from '@/types/json'

/**
 * 组件属性定义
 */
interface Props {
  /** 编辑器值（v-model） */
  modelValue?: string
  /** 编辑器主题 */
  theme?: 'light' | 'dark'
  /** 面板标题 */
  title?: string
  /** 面板描述 */
  description?: string
  /** 是否只读 */
  readonly?: boolean
  /** 最小行数 */
  minLines?: number
  /** 最大行数 */
  maxLines?: number
  /** 是否启用代码折叠 */
  enableFold?: boolean
  /** 是否启用搜索 */
  enableSearch?: boolean
  /** 是否显示统计信息 */
  showStats?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: '',
  theme: 'light',
  title: '输出结果',
  description: '处理后的 JSON 数据',
  readonly: true,
  minLines: 10,
  maxLines: 30,
  enableFold: true,
  enableSearch: true,
  showStats: true,
})

/**
 * 组件事件定义
 */
const emit = defineEmits<{
  'update:modelValue': [value: string]
  change: [value: string]
  copy: []
  download: []
}>()

const internalValue = ref(props.modelValue)
const stats = ref<JsonStats | null>(null)
const editorRef = ref<InstanceType<typeof CodeEditor> | null>(null)

watch(
  () => props.modelValue,
  (val) => {
    if (val !== internalValue.value) {
      internalValue.value = val
      updateStats()
    }
  },
)

watch(internalValue, () => {
  updateStats()
})

const updateStats = () => {
  if (props.showStats && internalValue.value) {
    try {
      stats.value = calculateJsonStats(internalValue.value)
    } catch {
      stats.value = null
    }
  } else {
    stats.value = null
  }
}

const formatSize = (bytes: number): string => {
  return formatSizeUtil(bytes)
}

const handleCopy = async () => {
  if (!internalValue.value) {
    return
  }
  try {
    await navigator.clipboard.writeText(internalValue.value)
    emit('copy')
  } catch {
    console.error('复制失败')
  }
}

const handleDownload = () => {
  if (!internalValue.value) {
    return
  }
  const blob = new Blob([internalValue.value], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'formatted.json'
  a.click()
  URL.revokeObjectURL(url)
  emit('download')
}

defineExpose({
  getValue: () => internalValue.value,
  setValue: (value: string) => {
    internalValue.value = value
  },
  focus: () => {
    editorRef.value?.focus?.()
  },
})
</script>

<style scoped lang="scss">
.json-output-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: $card-bg;
  border: 1px solid $border-default;
  border-radius: $border-radius-md;
  overflow: hidden;
  contain: content;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: $bg-elevated;
  border-bottom: 1px solid $border-default;
}

.panel-title {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.title-text {
  font-size: 16px;
  font-weight: 600;
  color: $text-primary;
}

.title-desc {
  font-size: 13px;
  color: $text-secondary;
}

.panel-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.editor-container {
  flex: 1;
  overflow: hidden;
}

.stats-bar {
  padding: 8px 16px;
  border-top: 1px solid $border-default;
  background: $bg-elevated;
}

@media (max-width: 768px) {
  .panel-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
    padding: 8px 12px;
  }

  .title-text {
    font-size: 14px;
  }

  .title-desc {
    font-size: 12px;
  }

  .stats-bar {
    padding: 8px 12px;
  }
}
</style>
