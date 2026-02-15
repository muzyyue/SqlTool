<template>
  <div class="code-editor-container">
    <!-- 工具栏 -->
    <div v-if="!readonly" class="code-editor-toolbar">
      <a-space>
        <a-button size="small" @click="handleCopy" :disabled="!modelValue">
          <template #icon><CopyOutlined /></template>
          复制
        </a-button>
        <a-button size="small" @click="handleDownload" :disabled="!modelValue">
          <template #icon><DownloadOutlined /></template>
          下载
        </a-button>
        <a-button size="small" @click="handleClear" :disabled="!modelValue">
          <template #icon><ClearOutlined /></template>
          清空
        </a-button>
      </a-space>
    </div>

    <!-- 编辑器 -->
    <codemirror
      v-model="internalValue"
      :style="{
        height: `${minLines * 20}px`,
        minHeight: `${minLines * 20}px`,
        maxHeight: `${maxLines * 20}px`,
      }"
      :placeholder="placeholder"
      :autofocus="false"
      :disabled="readonly"
      :indent-with-tab="true"
      :tab-size="2"
      :extensions="extensions"
      @ready="handleReady"
      @change="handleChange"
      @focus="handleFocus"
      @blur="handleBlur"
    />
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { message } from 'ant-design-vue'
import { CopyOutlined, DownloadOutlined, ClearOutlined } from '@ant-design/icons-vue'
import { Codemirror } from 'vue-codemirror'
import { basicSetup } from 'codemirror'
import { defaultKeymap, indentWithTab } from '@codemirror/commands'
import { keymap } from '@codemirror/view'
import { search, highlightSelectionMatches } from '@codemirror/search'
import { foldGutter } from '@codemirror/language'
import { json } from '@codemirror/lang-json'
import { sql } from '@codemirror/lang-sql'
import { oneDark } from '@codemirror/theme-one-dark'

/**
 * 组件属性定义
 */
const props = defineProps({
  /** 编辑器值（v-model） */
  modelValue: {
    type: String,
    default: '',
  },
  /** 语言类型：json、sql */
  language: {
    type: String,
    default: 'sql',
    validator: (value) => ['json', 'sql'].includes(value),
  },
  /** 主题：light、dark */
  theme: {
    type: String,
    default: 'light',
    validator: (value) => ['light', 'dark'].includes(value),
  },
  /** 是否只读 */
  readonly: {
    type: Boolean,
    default: false,
  },
  /** 最小行数 */
  minLines: {
    type: Number,
    default: 5,
  },
  /** 最大行数 */
  maxLines: {
    type: Number,
    default: 20,
  },
  /** 占位符文本 */
  placeholder: {
    type: String,
    default: '请输入代码...',
  },
  /** 是否启用代码折叠 */
  enableFold: {
    type: Boolean,
    default: false,
  },
  /** 是否启用搜索 */
  enableSearch: {
    type: Boolean,
    default: false,
  },
})

/**
 * 组件事件定义
 */
const emit = defineEmits(['update:modelValue', 'change', 'focus', 'blur'])

/**
 * 内部值（用于v-model）
 */
const internalValue = ref(props.modelValue)

/**
 * 编辑器实例
 */
const view = ref(null)

/**
 * 扩展配置
 */
const extensions = computed(() => {
  const exts = [basicSetup, keymap.of([defaultKeymap, indentWithTab])]

  if (props.language === 'json') {
    exts.push(json())
  } else if (props.language === 'sql') {
    exts.push(sql())
  }

  if (props.theme === 'dark') {
    exts.push(oneDark)
  }

  if (props.enableSearch) {
    exts.push(search({ top: true }))
    exts.push(highlightSelectionMatches())
  }

  if (props.enableFold) {
    exts.push(
      foldGutter({
        openText: '▼',
        closedText: '▶',
      }),
    )
  }

  return exts
})

/**
 * 处理编辑器就绪事件
 */
const handleReady = (payload) => {
  view.value = payload.view
}

/**
 * 处理值变化事件
 */
const handleChange = (value) => {
  emit('update:modelValue', value)
  emit('change', value)
}

/**
 * 处理焦点事件
 */
const handleFocus = (viewUpdate) => {
  emit('focus', viewUpdate)
}

/**
 * 处理失焦事件
 */
const handleBlur = (viewUpdate) => {
  emit('blur', viewUpdate)
}

/**
 * 复制内容到剪贴板
 */
const handleCopy = async () => {
  if (!props.modelValue) {
    message.warning('没有内容可复制')
    return
  }

  try {
    await navigator.clipboard.writeText(props.modelValue)
    message.success('已复制到剪贴板')
  } catch (error) {
    message.error('复制失败，请检查浏览器权限')
    console.error('复制失败:', error)
  }
}

/**
 * 下载内容为文件
 */
const handleDownload = () => {
  if (!props.modelValue) {
    message.warning('没有内容可下载')
    return
  }

  try {
    const extension = props.language === 'json' ? 'json' : 'sql'
    const blob = new Blob([props.modelValue], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `code.${extension}`
    a.click()
    URL.revokeObjectURL(url)
    message.success('文件下载成功')
  } catch (error) {
    message.error('下载失败')
    console.error('下载失败:', error)
  }
}

/**
 * 清空编辑器内容
 */
const handleClear = () => {
  if (!props.modelValue) {
    message.warning('内容已为空')
    return
  }

  internalValue.value = ''
  emit('update:modelValue', '')
  emit('change', '')
  message.success('内容已清空')
}

/**
 * 监听 modelValue 变化
 */
watch(
  () => props.modelValue,
  (newValue) => {
    if (newValue !== internalValue.value) {
      internalValue.value = newValue
    }
  },
)

/**
 * 暴露方法给父组件
 */
defineExpose({
  /** 复制内容 */
  copy: handleCopy,
  /** 下载内容 */
  download: handleDownload,
  /** 清空内容 */
  clear: handleClear,
  /** 获取编辑器实例 */
  getEditor: () => view.value,
})
</script>

<style scoped>
/**
 * 代码编辑器容器
 */
.code-editor-container {
  position: relative;
  width: 100%;
  border: 1px solid var(--code-border);
  border-radius: var(--border-radius-md, 12px);
  overflow: hidden;
  background: var(--code-bg);
  transition: all var(--transition-normal, 200ms) ease;
}

/**
 * 工具栏
 */
.code-editor-toolbar {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding: 8px 12px;
  background: var(--code-toolbar-bg);
  border-bottom: 1px solid var(--border-default);
}

/**
 * CodeMirror 样式覆盖
 */
.code-editor-container :deep(.cm-editor) {
  height: 100%;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
}

.code-editor-container :deep(.cm-scroller) {
  overflow: auto;
}

.code-editor-container :deep(.cm-content) {
  padding: 12px;
  font-size: 13px;
  line-height: 1.5;
}

.code-editor-container :deep(.cm-gutters) {
  background: var(--bg-elevated);
  color: var(--text-secondary);
  border: none;
  border-right: 1px solid var(--border-default);
}

.code-editor-container :deep(.cm-activeLineGutter) {
  background: var(--bg-base);
  color: var(--text-primary);
}

.code-editor-container :deep(.cm-lineNumbers) {
  padding: 0 8px;
}

.code-editor-container :deep(.cm-line) {
  padding: 0;
}

.code-editor-container :deep(.cm-focused) {
  outline: none;
}

/**
 * 滚动条样式优化
 */
.code-editor-container :deep(.cm-scroller::-webkit-scrollbar) {
  width: 8px;
  height: 8px;
}

.code-editor-container :deep(.cm-scroller::-webkit-scrollbar-track) {
  background: var(--code-scrollbar-track);
  border-radius: var(--border-radius-sm, 4px);
}

.code-editor-container :deep(.cm-scroller::-webkit-scrollbar-thumb) {
  background: var(--code-scrollbar-thumb);
  border-radius: var(--border-radius-sm, 4px);
}

.code-editor-container :deep(.cm-scroller::-webkit-scrollbar-thumb:hover) {
  background: var(--code-scrollbar-thumb);
  filter: brightness(0.85);
}

/**
 * 响应式设计
 */
@media (max-width: 768px) {
  .code-editor-toolbar {
    flex-wrap: wrap;
    gap: 8px;
  }
}

@media (max-width: 480px) {
  .code-editor-container :deep(.cm-scroller) {
    max-height: 250px;
  }
}
</style>
