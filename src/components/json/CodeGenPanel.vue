<template>
  <VbenGlassCard title="代码生成" description="根据 JSON 数据生成类型定义代码" hoverable>
    <!-- 配置区域 -->
    <div class="codegen-config">
      <div class="config-row">
        <div class="config-item">
          <label class="config-label">目标语言</label>
          <a-select v-model:value="selectedLanguage" style="width: 160px" @change="handleLanguageChange">
            <a-select-option value="typescript">
              <span class="lang-option"><CodeOutlined /> TypeScript</span>
            </a-select-option>
            <a-select-option value="java">
              <span class="lang-option"><CoffeeOutlined /> Java</span>
            </a-select-option>
            <a-select-option value="python">
              <span class="lang-option"><BugOutlined /> Python</span>
            </a-select-option>
            <a-select-option value="go">
              <span class="lang-option"><RocketOutlined /> Go</span>
            </a-select-option>
          </a-select>
        </div>
        <div class="config-item">
          <label class="config-label">类名/接口名</label>
          <a-input
            v-model:value="className"
            placeholder="输入类名或接口名"
            style="width: 200px"
            @change="handleClassNameChange"
          />
        </div>
      </div>
    </div>

    <!-- 生成状态提示 -->
    <div v-if="generateStatus" class="generate-status">
      <a-alert
        :message="generateStatus.message"
        :type="generateStatus.type"
        show-icon
        closable
        @close="generateStatus = null"
      />
    </div>

    <!-- 代码预览区域 -->
    <div class="code-preview">
      <div class="preview-header">
        <span class="preview-title">生成结果</span>
        <a-space>
          <a-button size="small" @click="handleCopy" :disabled="!generatedCode">
            <template #icon><CopyOutlined /></template>
            复制
          </a-button>
          <a-button size="small" @click="handleDownload" :disabled="!generatedCode">
            <template #icon><DownloadOutlined /></template>
            下载
          </a-button>
        </a-space>
      </div>
      <div class="editor-wrapper">
        <CodeEditor
          ref="codeEditorRef"
          v-model="generatedCode"
          language="json"
          :theme="isDark ? 'dark' : 'light'"
          :readonly="true"
          :min-lines="10"
          :max-lines="25"
          placeholder="生成的代码将显示在这里..."
        />
      </div>
    </div>
  </VbenGlassCard>
</template>

<script setup>
/**
 * CodeGenPanel 组件
 * 根据 JSON 数据生成 TypeScript、Java、Python、Go 等语言的类型定义代码
 *
 * @component
 * @example
 * <CodeGenPanel :json-data="parsedJson" />
 */
import { ref, watch, computed } from 'vue'
import { message } from 'ant-design-vue'
import { storeToRefs } from 'pinia'
import {
  CopyOutlined,
  DownloadOutlined,
  CodeOutlined,
  CoffeeOutlined,
  BugOutlined,
  RocketOutlined,
} from '@ant-design/icons-vue'
import VbenGlassCard from '@/components/common/VbenGlassCard.vue'
import CodeEditor from '@/components/common/CodeEditor.vue'
import { useThemeStore } from '@/stores/theme.js'
import {
  jsonToTypeScript,
  jsonToJava,
  jsonToPython,
  jsonToGo,
} from '@/utils/json/codegen.js'

/**
 * 组件 Props 定义
 */
const props = defineProps({
  /** JSON 数据对象或数组 */
  jsonData: {
    type: [Object, Array],
    default: null,
  },
})

/**
 * 组件 Emits 定义
 */
const emit = defineEmits(['generated', 'error'])

/**
 * 主题状态
 */
const themeStore = useThemeStore()
const { isDark } = storeToRefs(themeStore)

/**
 * 选中的目标语言
 * @type {import('vue').Ref<'typescript' | 'java' | 'python' | 'go'>}
 */
const selectedLanguage = ref('typescript')

/**
 * 类名/接口名
 * @type {import('vue').Ref<string>}
 */
const className = ref('Root')

/**
 * 生成的代码
 * @type {import('vue').Ref<string>}
 */
const generatedCode = ref('')

/**
 * 生成状态
 * @type {import('vue').Ref<{type: string, message: string} | null>}
 */
const generateStatus = ref(null)

/**
 * 代码编辑器引用
 */
const codeEditorRef = ref(null)

/**
 * 语言对应的文件扩展名
 */
const languageExtensions = {
  typescript: 'ts',
  java: 'java',
  python: 'py',
  go: 'go',
}

/**
 * 语言对应的代码生成函数映射
 */
const codegenFunctions = {
  typescript: jsonToTypeScript,
  java: jsonToJava,
  python: jsonToPython,
  go: jsonToGo,
}

/**
 * 处理 JSON 数据，提取对象用于代码生成
 * @param {Object|Array} data - JSON 数据
 * @returns {Object|null} 可用于代码生成的对象
 */
const extractObjectForCodegen = (data) => {
  if (!data) return null

  // 如果是数组，取第一个元素
  if (Array.isArray(data)) {
    if (data.length === 0) {
      return null
    }
    // 如果数组元素是对象，使用第一个元素
    if (typeof data[0] === 'object' && data[0] !== null) {
      return data[0]
    }
    return null
  }

  // 如果是对象，直接返回
  if (typeof data === 'object') {
    return data
  }

  return null
}

/**
 * 生成代码
 * 根据当前选中的语言和 JSON 数据生成对应的类型定义代码
 */
const generateCode = () => {
  // 清除之前的状态
  generateStatus.value = null

  // 检查是否有 JSON 数据
  if (!props.jsonData) {
    generatedCode.value = ''
    return
  }

  // 提取可用于代码生成的对象
  const objectData = extractObjectForCodegen(props.jsonData)

  if (!objectData) {
    generateStatus.value = {
      type: 'warning',
      message: 'JSON 数据为空或格式不支持，请输入有效的 JSON 对象',
    }
    generatedCode.value = ''
    emit('error', { message: '无效的 JSON 数据' })
    return
  }

  // 获取对应的代码生成函数
  const codegenFn = codegenFunctions[selectedLanguage.value]

  if (!codegenFn) {
    generateStatus.value = {
      type: 'error',
      message: `不支持的语言: ${selectedLanguage.value}`,
    }
    generatedCode.value = ''
    return
  }

  // 执行代码生成
  const result = codegenFn(objectData, className.value || 'Root')

  if (result.success) {
    generatedCode.value = result.data
    generateStatus.value = {
      type: 'success',
      message: `成功生成 ${selectedLanguage.value} 代码`,
    }
    emit('generated', { language: selectedLanguage.value, code: result.data })
  } else {
    generateStatus.value = {
      type: 'error',
      message: result.error || '代码生成失败',
    }
    generatedCode.value = ''
    emit('error', { message: result.error })
  }
}

/**
 * 处理语言切换
 */
const handleLanguageChange = () => {
  generateCode()
}

/**
 * 处理类名变化
 */
const handleClassNameChange = () => {
  generateCode()
}

/**
 * 复制代码到剪贴板
 */
const handleCopy = async () => {
  if (!generatedCode.value) {
    message.warning('没有内容可复制')
    return
  }

  try {
    await navigator.clipboard.writeText(generatedCode.value)
    message.success('已复制到剪贴板')
  } catch (error) {
    message.error('复制失败，请检查浏览器权限')
    console.error('复制失败:', error)
  }
}

/**
 * 下载代码文件
 */
const handleDownload = () => {
  if (!generatedCode.value) {
    message.warning('没有内容可下载')
    return
  }

  try {
    const extension = languageExtensions[selectedLanguage.value]
    const blob = new Blob([generatedCode.value], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${className.value || 'Root'}.${extension}`
    a.click()
    URL.revokeObjectURL(url)
    message.success('文件下载成功')
  } catch (error) {
    message.error('下载失败')
    console.error('下载失败:', error)
  }
}

/**
 * 监听 jsonData 变化，自动重新生成代码
 */
watch(
  () => props.jsonData,
  () => {
    generateCode()
  },
  { deep: true, immediate: true },
)

/**
 * 暴露方法给父组件
 */
defineExpose({
  /** 重新生成代码 */
  regenerate: generateCode,
  /** 获取生成的代码 */
  getCode: () => generatedCode.value,
  /** 获取当前语言 */
  getLanguage: () => selectedLanguage.value,
  /** 获取类名 */
  getClassName: () => className.value,
})
</script>

<style scoped lang="scss">
/**
 * 代码生成面板样式
 * 使用 CSS 变量实现主题切换
 */

// 配置区域
.codegen-config {
  margin-bottom: 20px;
}

// 配置行
.config-row {
  display: flex;
  gap: 20px;
  flex-wrap: wrap;
}

// 配置项
.config-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

// 配置标签
.config-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
}

// 语言选项
.lang-option {
  display: flex;
  align-items: center;
  gap: 8px;
}

// 生成状态
.generate-status {
  margin-bottom: 16px;
}

// 代码预览区域
.code-preview {
  margin-top: 16px;
}

// 预览头部
.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border-default);
}

// 预览标题
.preview-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

// 编辑器包装器
.editor-wrapper {
  border-radius: var(--border-radius-md);
  overflow: hidden;
  transition: all var(--transition-normal) ease;

  &:hover {
    box-shadow: var(--shadow-md);
  }
}

// 响应式设计
@media (max-width: 768px) {
  .config-row {
    flex-direction: column;
    gap: 16px;
  }

  .config-item {
    width: 100%;
  }

  .preview-header {
    flex-direction: column;
    gap: 12px;
    align-items: flex-start;
  }
}
</style>
