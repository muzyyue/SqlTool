<template>
  <div class="json-input-panel">
    <div class="panel-header">
      <div class="panel-title">
        <span class="title-text">JSON 输入</span>
        <span class="title-desc">输入需要处理的 JSON 数据</span>
      </div>
      <div class="panel-actions">
        <a-space :size="8">
          <a-button size="small" @click="handlePaste">
            <template #icon><CopyOutlined /></template>
            粘贴
          </a-button>
          <a-button size="small" @click="handleClear">
            <template #icon><ClearOutlined /></template>
            清空
          </a-button>
          <a-button size="small" @click="handleSample">
            <template #icon><FileTextOutlined /></template>
            示例
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
          :placeholder="placeholder"
          :min-lines="minLines"
          :max-lines="maxLines"
          :enable-fold="enableFold"
          :enable-search="enableSearch"
          @change="handleChange"
          @focus="handleFocus"
          @blur="handleBlur"
        />
      </div>

      <div v-if="showValidation && validationResult" class="validation-bar">
        <a-alert
          :type="validationResult.isValid ? 'success' : 'error'"
          :message="validationResult.isValid ? 'JSON 格式正确' : validationResult.errorMessage"
          show-icon
        >
          <template v-if="!validationResult.isValid && validationResult.errorLine" #description>
            <div class="error-location">
              错误位置：第 {{ validationResult.errorLine }} 行
              <span v-if="validationResult.errorColumn">，第 {{ validationResult.errorColumn }} 列</span>
            </div>
          </template>
        </a-alert>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { CopyOutlined, ClearOutlined, FileTextOutlined } from '@ant-design/icons-vue'
import CodeEditor from '@/components/common/CodeEditor.vue'
import { validateJson } from '@/utils/json'
import type { JsonValidationResult } from '@/types/json'

/**
 * 组件属性定义
 */
interface Props {
  /** 编辑器值（v-model） */
  modelValue?: string
  /** 编辑器主题 */
  theme?: 'light' | 'dark'
  /** 占位符文本 */
  placeholder?: string
  /** 最小行数 */
  minLines?: number
  /** 最大行数 */
  maxLines?: number
  /** 是否启用代码折叠 */
  enableFold?: boolean
  /** 是否启用搜索 */
  enableSearch?: boolean
  /** 是否显示验证结果 */
  showValidation?: boolean
  /** 是否实时验证 */
  realtimeValidation?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: '',
  theme: 'light',
  placeholder: '请输入 JSON 数据...',
  minLines: 10,
  maxLines: 30,
  enableFold: true,
  enableSearch: true,
  showValidation: true,
  realtimeValidation: true,
})

/**
 * 组件事件定义
 */
const emit = defineEmits<{
  'update:modelValue': [value: string]
  change: [value: string]
  focus: [event: FocusEvent]
  blur: [event: FocusEvent]
  paste: []
  clear: []
  sample: []
}>()

const internalValue = ref(props.modelValue)
const validationResult = ref<JsonValidationResult | null>(null)
const editorRef = ref<InstanceType<typeof CodeEditor> | null>(null)

watch(
  () => props.modelValue,
  (val) => {
    if (val !== internalValue.value) {
      internalValue.value = val
    }
  },
)

const handleChange = (value: string) => {
  emit('update:modelValue', value)
  emit('change', value)

  if (props.realtimeValidation) {
    validationResult.value = validateJson(value)
  }
}

const handleFocus = (event: FocusEvent) => {
  emit('focus', event)
}

const handleBlur = (event: FocusEvent) => {
  emit('blur', event)
}

const handlePaste = async () => {
  try {
    const text = await navigator.clipboard.readText()
    if (text) {
      internalValue.value = text
      handleChange(text)
      emit('paste')
    }
  } catch {
    console.error('粘贴失败')
  }
}

const handleClear = () => {
  internalValue.value = ''
  handleChange('')
  validationResult.value = null
  emit('clear')
}

const handleSample = () => {
  const sampleJson = {
    name: '张三',
    age: 25,
    email: 'zhangsan@example.com',
    address: {
      city: '北京',
      district: '朝阳区',
    },
    hobbies: ['读书', '游泳', '旅行'],
  }
  const sampleText = JSON.stringify(sampleJson, null, 2)
  internalValue.value = sampleText
  handleChange(sampleText)
  emit('sample')
}

defineExpose({
  getValue: () => internalValue.value,
  setValue: (value: string) => {
    internalValue.value = value
    handleChange(value)
  },
  validate: () => {
    validationResult.value = validateJson(internalValue.value)
    return validationResult.value
  },
  focus: () => {
    editorRef.value?.focus?.()
  },
})
</script>

<style scoped lang="scss">
.json-input-panel {
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

.validation-bar {
  padding: 8px 16px;
  border-top: 1px solid $border-default;
}

.error-location {
  margin-top: 4px;
  font-size: 12px;
  color: $text-secondary;
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
}
</style>
