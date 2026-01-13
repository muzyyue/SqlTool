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

    <!-- 编辑器容器 -->
    <div ref="editorContainer" class="code-editor-wrapper"></div>
  </div>
</template>

<script setup>
/**
 * CodeEditor 组件
 * 基于 CodeMirror 6 的代码编辑器组件
 *
 * @component
 * @example
 * <CodeEditor
 *   v-model="code"
 *   language="sql"
 *   theme="light"
 *   :readonly="false"
 *   @change="handleChange"
 * />
 */
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import { message } from 'ant-design-vue'
import { CopyOutlined, DownloadOutlined, ClearOutlined } from '@ant-design/icons-vue'
import { EditorView, basicSetup } from 'codemirror'
import { EditorState } from '@codemirror/state'
import { oneDark } from '@codemirror/theme-one-dark'
import { json } from '@codemirror/lang-json'
import { sql } from '@codemirror/lang-sql'
import { keymap } from '@codemirror/view'
import { defaultKeymap, indentWithTab } from '@codemirror/commands'

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
})

/**
 * 组件事件定义
 */
const emit = defineEmits({
  /** 值更新事件（v-model） */
  'update:modelValue': [value],
  /** 内容变化事件 */
  change: [value],
})

/**
 * 编辑器容器引用
 */
const editorContainer = ref(null)

/**
 * CodeMirror 编辑器实例
 */
let editorView = null

/**
 * 获取语言扩展
 * @param language - 语言类型
 * @returns CodeMirror 语言扩展
 */
const getLanguageExtension = (language) => {
  switch (language) {
    case 'json':
      return json()
    case 'sql':
      return sql()
    default:
      return sql()
  }
}

/**
 * 获取主题扩展
 * @param theme - 主题类型
 * @returns CodeMirror 主题扩展
 */
const getThemeExtension = (theme) => {
  switch (theme) {
    case 'dark':
      return oneDark
    case 'light':
    default:
      return []
  }
}

/**
 * 创建编辑器状态
 * @param content - 编辑器内容
 * @returns EditorState 对象
 */
const createEditorState = (content) => {
  return EditorState.create({
    doc: content,
    extensions: [
      basicSetup,
      keymap.of([
        ...defaultKeymap,
        // Tab 键插入 2 个空格
        indentWithTab,
      ]),
      // 语言支持
      getLanguageExtension(props.language),
      // 主题支持
      ...getThemeExtension(props.theme),
      // 只读模式
      EditorView.editable.of(!props.readonly),
      // 禁用只读时的光标
      EditorState.readOnly.of(props.readonly),
      // 自定义样式
      EditorView.theme({
        '&': {
          fontSize: '13px',
          fontFamily: "'Consolas', 'Monaco', 'Courier New', monospace",
        },
        '&.cm-focused': {
          outline: 'none',
        },
        '.cm-scroller': {
          overflow: 'auto',
        },
        '.cm-content': {
          padding: '12px',
          minHeight: `${props.minLines * 20}px`,
          maxHeight: `${props.maxLines * 20}px`,
        },
        '.cm-gutters': {
          backgroundColor: props.theme === 'dark' ? '#1e1e1e' : '#f5f5f5',
          color: props.theme === 'dark' ? '#858585' : '#999',
          border: 'none',
        },
        '.cm-activeLineGutter': {
          backgroundColor: props.theme === 'dark' ? '#2c2c2c' : '#e0e0e0',
          color: props.theme === 'dark' ? '#c6c6c6' : '#333',
        },
        '.cm-lineNumbers': {
          padding: '0 8px',
        },
      }),
      // 变更监听
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          const newValue = update.state.doc.toString()
          emit('update:modelValue', newValue)
          emit('change', newValue)
        }
      }),
    ],
  })
}

/**
 * 初始化编辑器
 */
const initEditor = () => {
  if (!editorContainer.value) return

  // 销毁旧实例
  if (editorView) {
    editorView.destroy()
  }

  // 创建新实例
  editorView = new EditorView({
    state: createEditorState(props.modelValue),
    parent: editorContainer.value,
  })
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

  if (editorView) {
    const transaction = editorView.state.update({
      changes: {
        from: 0,
        to: editorView.state.doc.length,
        insert: '',
      },
    })
    editorView.dispatch(transaction)
  }
  message.success('内容已清空')
}

/**
 * 监听 modelValue 变化
 */
watch(
  () => props.modelValue,
  (newValue) => {
    if (editorView && editorView.state.doc.toString() !== newValue) {
      const transaction = editorView.state.update({
        changes: {
          from: 0,
          to: editorView.state.doc.length,
          insert: newValue,
        },
      })
      editorView.dispatch(transaction)
    }
  },
)

/**
 * 监听 language 变化
 */
watch(
  () => props.language,
  () => {
    initEditor()
  },
)

/**
 * 监听 theme 变化
 */
watch(
  () => props.theme,
  () => {
    initEditor()
  },
)

/**
 * 监听 readonly 变化
 */
watch(
  () => props.readonly,
  () => {
    initEditor()
  },
)

/**
 * 组件挂载时初始化编辑器
 */
onMounted(() => {
  initEditor()
})

/**
 * 组件卸载前销毁编辑器
 */
onBeforeUnmount(() => {
  if (editorView) {
    editorView.destroy()
    editorView = null
  }
})

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
  getEditor: () => editorView,
})
</script>

<style scoped>
/**
 * 代码编辑器容器
 */
.code-editor-container {
  position: relative;
  width: 100%;
  border: 1px solid #d9d9d9;
  border-radius: var(--border-radius-md, 12px);
  overflow: hidden;
  background: #ffffff;
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
  background: #fafafa;
  border-bottom: 1px solid #d9d9d9;
}

/**
 * 编辑器包装器
 */
.code-editor-wrapper {
  position: relative;
  min-height: 100px;
  max-height: 400px;
  overflow: auto;
}

/**
 * CodeMirror 样式覆盖
 */
.code-editor-wrapper :deep(.cm-editor) {
  height: 100%;
}

.code-editor-wrapper :deep(.cm-scroller) {
  overflow: auto;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
}

.code-editor-wrapper :deep(.cm-content) {
  padding: 12px;
  font-size: 13px;
  line-height: 1.5;
}

.code-editor-wrapper :deep(.cm-gutters) {
  background: #f5f5f5;
  color: #999;
  border: none;
  border-right: 1px solid #e0e0e0;
}

.code-editor-wrapper :deep(.cm-activeLineGutter) {
  background: #e0e0e0;
  color: #333;
}

.code-editor-wrapper :deep(.cm-lineNumbers) {
  padding: 0 8px;
}

.code-editor-wrapper :deep(.cm-line) {
  padding: 0;
}

.code-editor-wrapper :deep(.cm-focused) {
  outline: none;
}

/**
 * 滚动条样式优化
 */
.code-editor-wrapper::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.code-editor-wrapper::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 4px;
}

.code-editor-wrapper::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 4px;
}

.code-editor-wrapper::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}

/* 暗色主题支持 */
[data-theme='dark'] .code-editor-container {
  background: #1e1e1e;
  border-color: #3c3c3c;
}

[data-theme='dark'] .code-editor-toolbar {
  background: #2d2d2d;
  border-bottom-color: #3c3c3c;
}

[data-theme='dark'] .code-editor-wrapper :deep(.cm-scroller) {
  background: #1e1e1e;
}

[data-theme='dark'] .code-editor-wrapper::-webkit-scrollbar-track {
  background: #2d2d30;
}

[data-theme='dark'] .code-editor-wrapper::-webkit-scrollbar-thumb {
  background: #464647;
}

[data-theme='dark'] .code-editor-wrapper::-webkit-scrollbar-thumb:hover {
  background: #5a5a5a;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .code-editor-toolbar {
    flex-wrap: wrap;
    gap: 8px;
  }

  .code-editor-wrapper {
    max-height: 300px;
  }
}

@media (max-width: 480px) {
  .code-editor-wrapper {
    max-height: 250px;
  }
}
</style>
