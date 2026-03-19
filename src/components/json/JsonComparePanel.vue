<template>
  <div class="json-compare-panel">
    <div class="panel-header">
      <div class="panel-title">
        <span class="title-text">JSON 对比</span>
        <span class="title-desc">对比两个 JSON 数据的差异</span>
      </div>
      <div class="panel-actions">
        <a-space :size="8">
          <a-button type="primary" size="small" @click="handleCompare" :loading="comparing">
            <template #icon><SwapOutlined /></template>
            开始对比
          </a-button>
          <a-button size="small" @click="handleClear">
            <template #icon><ClearOutlined /></template>
            清空
          </a-button>
        </a-space>
      </div>
    </div>

    <div class="panel-content">
      <div class="compare-inputs">
        <div class="compare-input">
          <div class="input-header">
            <span class="input-label">JSON 1（左侧）</span>
            <a-button size="small" @click="handlePasteLeft">
              <template #icon><CopyOutlined /></template>
              粘贴
            </a-button>
          </div>
          <CodeEditor
            ref="editor1Ref"
            v-model="json1"
            language="json"
            :theme="theme"
            placeholder="请输入第一个 JSON..."
            :min-lines="5"
            :max-lines="15"
            :enable-fold="true"
            :enable-search="true"
          />
        </div>

        <div class="compare-input">
          <div class="input-header">
            <span class="input-label">JSON 2（右侧）</span>
            <a-button size="small" @click="handlePasteRight">
              <template #icon><CopyOutlined /></template>
              粘贴
            </a-button>
          </div>
          <CodeEditor
            ref="editor2Ref"
            v-model="json2"
            language="json"
            :theme="theme"
            placeholder="请输入第二个 JSON..."
            :min-lines="5"
            :max-lines="15"
            :enable-fold="true"
            :enable-search="true"
          />
        </div>
      </div>

      <div class="compare-options">
        <div class="option-row">
          <a-checkbox v-model:checked="deepCompare">
            深度对比（递归检查所有嵌套字段）
          </a-checkbox>
          <a-checkbox v-model:checked="ignoreCase">
            忽略大小写
          </a-checkbox>
        </div>
        <div class="option-row">
          <span class="option-label">对比字段：</span>
          <a-input
            v-model:value="compareField"
            placeholder="输入要对比的字段路径，如：data.users[0].name"
            style="flex: 1"
          />
        </div>
      </div>

      <div v-if="compareResult" class="compare-result">
        <a-alert
          :type="compareResult.type"
          :message="compareResult.message"
          show-icon
          style="margin-bottom: 16px"
        />

        <div v-if="compareResult.differences.length > 0" class="differences-section">
          <h4 class="differences-title">差异详情（共 {{ compareResult.differences.length }} 处）</h4>
          <a-collapse>
            <a-collapse-panel
              v-for="(diff, index) in compareResult.differences"
              :key="index"
              :header="diff.path"
            >
              <div class="diff-content">
                <div class="diff-item">
                  <span class="diff-label">类型：</span>
                  <a-tag :color="getDiffTagColor(diff.type)">
                    {{ getDiffTypeText(diff.type) }}
                  </a-tag>
                </div>
                <div v-if="diff.leftValue !== undefined" class="diff-item">
                  <span class="diff-label">左侧值：</span>
                  <code class="diff-value">{{ formatValue(diff.leftValue) }}</code>
                </div>
                <div v-if="diff.rightValue !== undefined" class="diff-item">
                  <span class="diff-label">右侧值：</span>
                  <code class="diff-value">{{ formatValue(diff.rightValue) }}</code>
                </div>
                <div v-if="diff.description" class="diff-item">
                  <span class="diff-label">描述：</span>
                  <span class="diff-description">{{ diff.description }}</span>
                </div>
              </div>
            </a-collapse-panel>
          </a-collapse>
        </div>
      </div>

      <div v-else class="compare-placeholder">
        <a-empty description="点击「开始对比」按钮查看对比结果" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import {
  SwapOutlined,
  ClearOutlined,
  CopyOutlined,
} from '@ant-design/icons-vue'
import CodeEditor from '@/components/common/CodeEditor.vue'
import {
  deepCompareJson,
  shallowCompareJson,
  compareByField,
  getDiffTypeText,
  formatValue,
} from '@/utils/json'
import type { JsonCompareResult, JsonDiff, JsonDiffType } from '@/types/json'

/**
 * 组件属性定义
 */
interface Props {
  /** 编辑器主题 */
  theme?: 'light' | 'dark'
}

const props = withDefaults(defineProps<Props>(), {
  theme: 'light',
})

/**
 * 组件事件定义
 */
const emit = defineEmits<{
  compare: [result: JsonCompareResult]
  clear: []
}>()

const json1 = ref('')
const json2 = ref('')
const deepCompare = ref(true)
const ignoreCase = ref(false)
const compareField = ref('')
const comparing = ref(false)
const compareResult = ref<JsonCompareResult | null>(null)

const editor1Ref = ref<InstanceType<typeof CodeEditor> | null>(null)
const editor2Ref = ref<InstanceType<typeof CodeEditor> | null>(null)

const handleCompare = async () => {
  if (!json1.value.trim() || !json2.value.trim()) {
    compareResult.value = {
      type: 'warning',
      message: '请输入两个 JSON 数据进行对比',
      differences: [],
      isEqual: false,
    }
    return
  }

  comparing.value = true

  try {
    let result: JsonCompareResult

    if (compareField.value) {
      result = compareByField(json1.value, json2.value, compareField.value)
    } else if (deepCompare.value) {
      result = deepCompareJson(json1.value, json2.value)
    } else {
      result = shallowCompareJson(json1.value, json2.value)
    }

    compareResult.value = result
    emit('compare', result)
  } catch (error) {
    compareResult.value = {
      type: 'error',
      message: `对比失败: ${error instanceof Error ? error.message : String(error)}`,
      differences: [],
      isEqual: false,
    }
  } finally {
    comparing.value = false
  }
}

const handleClear = () => {
  json1.value = ''
  json2.value = ''
  compareField.value = ''
  compareResult.value = null
  emit('clear')
}

const handlePasteLeft = async () => {
  try {
    const text = await navigator.clipboard.readText()
    if (text) {
      json1.value = text
    }
  } catch {
    console.error('粘贴失败')
  }
}

const handlePasteRight = async () => {
  try {
    const text = await navigator.clipboard.readText()
    if (text) {
      json2.value = text
    }
  } catch {
    console.error('粘贴失败')
  }
}

const getDiffTagColor = (type: JsonDiffType): string => {
  const colorMap: Record<JsonDiffType, string> = {
    missing_left: 'red',
    missing_right: 'orange',
    missing_both: 'default',
    different: 'blue',
  }
  return colorMap[type] || 'default'
}

defineExpose({
  getCompareResult: () => compareResult.value,
  setJson1: (value: string) => {
    json1.value = value
  },
  setJson2: (value: string) => {
    json2.value = value
  },
})
</script>

<style scoped lang="scss">
.json-compare-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: $card-bg;
  border: 1px solid $border-default;
  border-radius: $border-radius-md;
  overflow: hidden;
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
  padding: 16px;
  gap: 16px;
}

.compare-inputs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.compare-input {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.input-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.input-label {
  font-size: 13px;
  font-weight: 500;
  color: $text-secondary;
}

.compare-options {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px;
  background: $bg-sunken;
  border-radius: $border-radius-sm;
}

.option-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.option-label {
  font-size: 13px;
  color: $text-secondary;
  min-width: 80px;
}

.compare-result {
  flex: 1;
  overflow-y: auto;
}

.differences-section {
  margin-top: 16px;
}

.differences-title {
  font-size: 14px;
  font-weight: 600;
  color: $text-primary;
  margin-bottom: 12px;
}

.diff-content {
  padding: 8px 0;
}

.diff-item {
  margin-bottom: 8px;
  display: flex;
  align-items: flex-start;
  gap: 8px;

  &:last-child {
    margin-bottom: 0;
  }
}

.diff-label {
  font-size: 13px;
  color: $text-secondary;
  min-width: 80px;
  flex-shrink: 0;
}

.diff-value {
  background: $color-primary-bg;
  padding: 4px 8px;
  border-radius: $border-radius-sm;
  font-size: 12px;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  max-width: 100%;
  overflow-x: auto;
  border: 1px solid $border-default;
}

.diff-description {
  font-size: 13px;
  color: $text-primary;
}

.compare-placeholder {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

@media (max-width: 1200px) {
  .compare-inputs {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .panel-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
    padding: 8px 12px;
  }

  .panel-content {
    padding: 8px;
  }

  .compare-options {
    padding: 8px;
  }
}
</style>
