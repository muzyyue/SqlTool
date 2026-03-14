<template>
  <VbenGlassCard title="格式转换" description="将 JSON 数据转换为其他格式" class="format-convert-panel">
    <div class="convert-content">
      <!-- 格式选择区域 -->
      <div class="format-options">
        <div class="option-row">
          <label class="option-label">目标格式</label>
          <a-select
            v-model:value="selectedFormat"
            :options="formatOptions"
            style="width: 160px"
            @change="handleFormatChange"
          />
        </div>

        <!-- XML 根节点名称输入 -->
        <div v-if="selectedFormat === 'xml'" class="option-row">
          <label class="option-label">根节点名称</label>
          <a-input
            v-model:value="rootName"
            placeholder="请输入根节点名称"
            style="width: 160px"
            @change="handleRootNameChange"
          />
        </div>
      </div>

      <!-- 转换状态提示 -->
      <div v-if="convertStatus" class="convert-status" :class="convertStatus.type">
        <span class="status-icon">{{ convertStatus.type === 'success' ? '✓' : '✗' }}</span>
        <span class="status-text">{{ convertStatus.message }}</span>
      </div>

      <!-- 转换结果预览 -->
      <div class="result-preview">
        <div class="preview-header">
          <span class="preview-title">转换结果</span>
          <a-space>
            <a-button size="small" :disabled="!convertedResult" @click="handleCopy">
              <template #icon><CopyOutlined /></template>
              复制
            </a-button>
            <a-button size="small" :disabled="!convertedResult" @click="handleDownload">
              <template #icon><DownloadOutlined /></template>
              下载
            </a-button>
          </a-space>
        </div>
        <div class="preview-content">
          <CodeEditor
            v-model="convertedResult"
            language="json"
            :theme="editorTheme"
            :readonly="true"
            :min-lines="8"
            :max-lines="20"
            placeholder="转换结果将在此显示..."
          />
        </div>
      </div>
    </div>
  </VbenGlassCard>
</template>

<script setup>
/**
 * FormatConvertPanel 组件
 * JSON 格式转换面板，支持将 JSON 数据转换为 XML、YAML、TOML、Properties 格式
 *
 * @component
 * @example
 * <FormatConvertPanel :json-data="{ name: '张三', age: 25 }" />
 */
import { ref, computed, watch } from 'vue'
import { message } from 'ant-design-vue'
import { CopyOutlined, DownloadOutlined } from '@ant-design/icons-vue'
import VbenGlassCard from '@/components/common/VbenGlassCard.vue'
import CodeEditor from '@/components/common/CodeEditor.vue'
import { useThemeStore } from '@/stores/theme'
import { jsonToXml, jsonToYaml, jsonToToml, jsonToProperties } from '@/utils/json/format.js'

/**
 * 组件属性定义
 */
const props = defineProps({
  /** JSON 数据（对象或数组） */
  jsonData: {
    type: [Object, Array],
    default: null,
  },
})

/**
 * 格式选项配置
 */
const formatOptions = [
  { value: 'xml', label: 'XML' },
  { value: 'yaml', label: 'YAML' },
  { value: 'toml', label: 'TOML' },
  { value: 'properties', label: 'Properties' },
]

/**
 * 主题 Store
 */
const themeStore = useThemeStore()

/**
 * 编辑器主题（根据全局主题自动切换）
 */
const editorTheme = computed(() => (themeStore.isDark ? 'dark' : 'light'))

/**
 * 选中的目标格式
 * @type {import('vue').Ref<string>}
 */
const selectedFormat = ref('xml')

/**
 * XML 根节点名称
 * @type {import('vue').Ref<string>}
 */
const rootName = ref('root')

/**
 * 转换后的结果
 * @type {import('vue').Ref<string>}
 */
const convertedResult = ref('')

/**
 * 转换状态
 * @type {import('vue').Ref<{type: string, message: string}|null>}
 */
const convertStatus = ref(null)

/**
 * 执行格式转换
 * 根据选中的格式调用对应的转换函数
 */
const performConversion = () => {
  // 清空之前的状态
  convertStatus.value = null

  // 检查输入数据
  if (!props.jsonData) {
    convertedResult.value = ''
    return
  }

  let result

  // 根据选中的格式进行转换
  switch (selectedFormat.value) {
    case 'xml':
      result = jsonToXml(props.jsonData, rootName.value, { indent: 2 })
      break
    case 'yaml':
      result = jsonToYaml(props.jsonData, 2)
      break
    case 'toml':
      result = jsonToToml(props.jsonData)
      break
    case 'properties':
      result = jsonToProperties(props.jsonData)
      break
    default:
      result = { success: false, error: '不支持的格式' }
  }

  // 处理转换结果
  if (result.success) {
    convertedResult.value = result.data
    convertStatus.value = {
      type: 'success',
      message: `转换成功 (${selectedFormat.value.toUpperCase()})`,
    }
  } else {
    convertedResult.value = ''
    convertStatus.value = {
      type: 'error',
      message: result.error || '转换失败',
    }
  }
}

/**
 * 处理格式变更
 */
const handleFormatChange = () => {
  performConversion()
}

/**
 * 处理根节点名称变更
 */
const handleRootNameChange = () => {
  if (selectedFormat.value === 'xml') {
    performConversion()
  }
}

/**
 * 复制转换结果到剪贴板
 */
const handleCopy = async () => {
  if (!convertedResult.value) {
    message.warning('没有内容可复制')
    return
  }

  try {
    await navigator.clipboard.writeText(convertedResult.value)
    message.success('已复制到剪贴板')
  } catch (error) {
    message.error('复制失败，请检查浏览器权限')
    console.error('复制失败:', error)
  }
}

/**
 * 下载转换结果为文件
 */
const handleDownload = () => {
  if (!convertedResult.value) {
    message.warning('没有内容可下载')
    return
  }

  try {
    // 根据格式确定文件扩展名
    const extensions = {
      xml: 'xml',
      yaml: 'yaml',
      toml: 'toml',
      properties: 'properties',
    }
    const extension = extensions[selectedFormat.value] || 'txt'
    const fileName = `converted.${extension}`

    // 创建 Blob 并下载
    const blob = new Blob([convertedResult.value], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = fileName
    a.click()
    URL.revokeObjectURL(url)

    message.success(`文件 ${fileName} 下载成功`)
  } catch (error) {
    message.error('下载失败')
    console.error('下载失败:', error)
  }
}

/**
 * 监听 JSON 数据变化，自动重新转换
 */
watch(
  () => props.jsonData,
  () => {
    performConversion()
  },
  { immediate: true, deep: true },
)

/**
 * 监听格式变化，重新转换
 */
watch(selectedFormat, () => {
  performConversion()
})
</script>

<style scoped>
/**
 * 格式转换面板样式
 */
.format-convert-panel {
  width: 100%;
}

.convert-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/**
 * 格式选项区域
 */
.format-options {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  padding: 12px 16px;
  background: var(--bg-sunken);
  border-radius: var(--border-radius-sm);
}

.option-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.option-label {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-secondary);
  white-space: nowrap;
}

/**
 * 转换状态提示
 */
.convert-status {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: var(--border-radius-xs);
  font-size: 13px;
  transition: all var(--transition-fast) ease;
}

.convert-status.success {
  background: var(--color-success-bg);
  color: var(--color-success);
  border: 1px solid var(--color-success-border);
}

.convert-status.error {
  background: var(--color-error-bg);
  color: var(--color-error);
  border: 1px solid var(--color-error-border);
}

.status-icon {
  font-weight: bold;
}

.status-text {
  flex: 1;
}

/**
 * 结果预览区域
 */
.result-preview {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.preview-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
}

.preview-content {
  border-radius: var(--border-radius-sm);
  overflow: hidden;
}

/**
 * 响应式设计
 */
@media (max-width: 768px) {
  .format-options {
    flex-direction: column;
    gap: 12px;
  }

  .option-row {
    width: 100%;
  }

  .preview-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
}
</style>
