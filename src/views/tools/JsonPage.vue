<template>
  <div class="json-page">
    <!-- 页面标题和副标题 -->
    <div class="page-header">
      <h1 class="page-title">JSON 格式化工具</h1>
      <p class="page-subtitle">JSON 数据格式化与对比工具,支持中文逗号处理、代码折叠和深度对比</p>
    </div>

    <!-- 操作按钮区域 -->
    <div class="action-buttons">
      <GradientButton type="secondary" size="md" @click="resetAll">
        <template #icon><ReloadOutlined /></template>
        重置
      </GradientButton>
      <GradientButton type="primary" size="md" @click="formatJson" :loading="formatting">
        <template #icon><PlayCircleOutlined /></template>
        格式化
      </GradientButton>
    </div>

    <!-- 主要内容区域 -->
    <div class="content-grid">
      <!-- 左侧：输入区域 -->
      <div class="input-section">
        <!-- 模式选择 -->
        <VbenGlassCard title="操作模式" description="选择JSON处理模式" hoverable>
          <a-radio-group v-model:value="mode" button-style="solid" @change="handleModeChange">
            <a-radio-button value="format">格式化</a-radio-button>
            <a-radio-button value="compare">对比</a-radio-button>
          </a-radio-group>
        </VbenGlassCard>

        <!-- JSON输入区域 -->
        <VbenGlassCard
          :title="mode === 'format' ? 'JSON 输入' : 'JSON 对比'"
          :description="mode === 'format' ? '输入需要格式化的JSON数据' : '输入两个JSON数据进行对比'"
          hoverable
        >
          <!-- 格式化模式 -->
          <div v-if="mode === 'format'" class="json-input-section">
            <div class="form-row">
              <a-checkbox v-model:checked="handleChineseComma"> 自动处理中文逗号（，） </a-checkbox>
            </div>
            <div class="form-row">
              <a-checkbox v-model:checked="enableFold"> 启用代码折叠 </a-checkbox>
            </div>
            <div class="editor-wrapper">
              <CodeEditor
                ref="jsonEditor"
                v-model="inputJson"
                language="json"
                :theme="isDark ? 'dark' : 'light'"
                placeholder='{"key": "value"}'
                :enable-fold="enableFold"
                :enable-search="true"
              />
            </div>
          </div>

          <!-- 对比模式 -->
          <div v-else class="json-compare-section">
            <div class="compare-inputs">
              <div class="compare-input">
                <div class="input-label">JSON 1（左侧）</div>
                <CodeEditor
                  ref="jsonEditor1"
                  v-model="compareJson1"
                  language="json"
                  :theme="isDark ? 'dark' : 'light'"
                  placeholder='{"key": "value"}'
                  :enable-fold="enableFold"
                  :enable-search="true"
                />
              </div>
              <div class="compare-input">
                <div class="input-label">JSON 2（右侧）</div>
                <CodeEditor
                  ref="jsonEditor2"
                  v-model="compareJson2"
                  language="json"
                  :theme="isDark ? 'dark' : 'light'"
                  placeholder='{"key": "value"}'
                  :enable-fold="enableFold"
                  :enable-search="true"
                />
              </div>
            </div>
            <div class="form-row">
              <a-space direction="vertical" style="width: 100%">
                <div>
                  <span class="label-text">对比字段：</span>
                  <a-input
                    v-model:value="compareField"
                    placeholder="输入要对比的字段路径，如：data.users[0].name"
                    style="width: 100%"
                  />
                </div>
                <a-checkbox v-model:checked="deepCompare">
                  深度对比（递归检查所有嵌套字段）
                </a-checkbox>
              </a-space>
            </div>
          </div>
        </VbenGlassCard>
      </div>

      <!-- 右侧：输出区域 -->
      <div class="output-section">
        <!-- 格式化结果 -->
        <VbenGlassCard
          v-if="mode === 'format'"
          title="格式化结果"
          description="查看格式化后的JSON数据"
          hoverable
        >
          <template #extra>
            <a-space>
              <a-button size="small" @click="copyOutput">
                <template #icon><CopyOutlined /></template>
                复制
              </a-button>
              <a-button size="small" @click="downloadOutput">
                <template #icon><DownloadOutlined /></template>
                下载
              </a-button>
            </a-space>
          </template>
          <div class="editor-wrapper">
            <CodeEditor
              ref="outputEditor"
              v-model="outputJson"
              language="json"
              :theme="isDark ? 'dark' : 'light'"
              :readonly="true"
              :enable-fold="enableFold"
              :enable-search="true"
            />
          </div>
          <!-- 统计信息 -->
          <div v-if="jsonStats" class="stats-panel">
            <a-descriptions size="small" :column="2" bordered>
              <a-descriptions-item label="对象数量">{{
                jsonStats.objectCount
              }}</a-descriptions-item>
              <a-descriptions-item label="数组数量">{{ jsonStats.arrayCount }}</a-descriptions-item>
              <a-descriptions-item label="字段总数">{{ jsonStats.fieldCount }}</a-descriptions-item>
              <a-descriptions-item label="数据大小">{{
                formatSize(jsonStats.size)
              }}</a-descriptions-item>
            </a-descriptions>
          </div>
        </VbenGlassCard>

        <!-- 对比结果 -->
        <VbenGlassCard v-else title="对比结果" description="查看JSON对比结果" hoverable>
          <template #extra>
            <a-space>
              <GradientButton type="primary" size="sm" @click="compareJson" :loading="comparing">
                <template #icon><SwapOutlined /></template>
                开始对比
              </GradientButton>
            </a-space>
          </template>
          <div v-if="compareResult" class="compare-result">
            <a-alert
              :message="compareResult.message"
              :type="compareResult.type"
              show-icon
              style="margin-bottom: 16px"
            />
            <div v-if="compareResult.differences.length > 0" class="differences-list">
              <h4>差异详情：</h4>
              <a-collapse>
                <a-collapse-panel
                  v-for="(diff, index) in compareResult.differences"
                  :key="index"
                  :header="diff.path"
                >
                  <div class="diff-content">
                    <div class="diff-item">
                      <span class="diff-label">类型：</span>
                      <a-tag
                        :color="
                          diff.type === 'missing_left'
                            ? 'red'
                            : diff.type === 'missing_right'
                              ? 'orange'
                              : 'blue'
                        "
                      >
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
                  </div>
                </a-collapse-panel>
              </a-collapse>
            </div>
          </div>
          <div v-else class="compare-placeholder">
            <a-empty description="点击开始对比按钮查看对比结果" />
          </div>
        </VbenGlassCard>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { message } from 'ant-design-vue'
import { storeToRefs } from 'pinia'
import {
  ReloadOutlined,
  PlayCircleOutlined,
  CopyOutlined,
  DownloadOutlined,
  SwapOutlined,
} from '@ant-design/icons-vue'
import CodeEditor from '@/components/common/CodeEditor.vue'
import VbenGlassCard from '@/components/common/VbenGlassCard.vue'
import GradientButton from '@/components/common/GradientButton.vue'
import { useThemeStore } from '@/stores/theme.js'

const themeStore = useThemeStore()
const { isDark } = storeToRefs(themeStore)

const mode = ref('format')
const inputJson = ref('')
const outputJson = ref('')
const compareJson1 = ref('')
const compareJson2 = ref('')
const compareField = ref('')
const handleChineseComma = ref(true)
const enableFold = ref(true)
const deepCompare = ref(false)
const formatting = ref(false)
const comparing = ref(false)
const jsonStats = ref(null)
const compareResult = ref(null)

const jsonEditor = ref(null)
const jsonEditor1 = ref(null)
const jsonEditor2 = ref(null)
const outputEditor = ref(null)

const handleModeChange = () => {
  resetAll()
}

const resetAll = () => {
  inputJson.value = ''
  outputJson.value = ''
  compareJson1.value = ''
  compareJson2.value = ''
  compareField.value = ''
  jsonStats.value = null
  compareResult.value = null
  message.success('已重置')
}

const formatJson = async () => {
  if (!inputJson.value.trim()) {
    message.warning('请输入JSON数据')
    return
  }

  formatting.value = true

  try {
    let jsonText = inputJson.value

    if (handleChineseComma.value) {
      jsonText = jsonText.replace(/，/g, ',')
    }

    const parsed = JSON.parse(jsonText)
    outputJson.value = JSON.stringify(parsed, null, 2)
    jsonStats.value = calculateJsonStats(parsed)
    message.success('格式化成功')
  } catch (error) {
    message.error('JSON格式错误: ' + error.message)
  } finally {
    formatting.value = false
  }
}

const calculateJsonStats = (data) => {
  let objectCount = 0
  let arrayCount = 0
  let fieldCount = 0

  const traverse = (obj) => {
    if (Array.isArray(obj)) {
      arrayCount++
      obj.forEach((item) => traverse(item))
    } else if (typeof obj === 'object' && obj !== null) {
      objectCount++
      Object.keys(obj).forEach((key) => {
        fieldCount++
        traverse(obj[key])
      })
    }
  }

  traverse(data)

  return {
    objectCount,
    arrayCount,
    fieldCount,
    size: new Blob([JSON.stringify(data)]).size,
  }
}

const formatSize = (bytes) => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
}

const compareJson = async () => {
  if (!compareJson1.value.trim() || !compareJson2.value.trim()) {
    message.warning('请输入两个JSON数据进行对比')
    return
  }

  comparing.value = true

  try {
    let json1Text = compareJson1.value
    let json2Text = compareJson2.value

    if (handleChineseComma.value) {
      json1Text = json1Text.replace(/，/g, ',')
      json2Text = json2Text.replace(/，/g, ',')
    }

    const json1 = JSON.parse(json1Text)
    const json2 = JSON.parse(json2Text)

    if (compareField.value) {
      const result = compareByField(json1, json2, compareField.value)
      compareResult.value = result
    } else if (deepCompare.value) {
      const result = deepCompareJson(json1, json2)
      compareResult.value = result
    } else {
      const result = shallowCompareJson(json1, json2)
      compareResult.value = result
    }

    message.success('对比完成')
  } catch (error) {
    message.error('对比失败: ' + error.message)
  } finally {
    comparing.value = false
  }
}

const compareByField = (json1, json2, fieldPath) => {
  const getValueByPath = (obj, path) => {
    const keys = path.split(/[.[\]]+/).filter(Boolean)
    let current = obj
    for (const key of keys) {
      if (current === null || current === undefined) {
        return undefined
      }
      current = current[key]
    }
    return current
  }

  const value1 = getValueByPath(json1, fieldPath)
  const value2 = getValueByPath(json2, fieldPath)

  if (value1 === undefined && value2 === undefined) {
    return {
      type: 'warning',
      message: '两个JSON都不包含指定字段',
      differences: [
        {
          path: fieldPath,
          type: 'missing_both',
          leftValue: undefined,
          rightValue: undefined,
        },
      ],
    }
  } else if (value1 === undefined) {
    return {
      type: 'warning',
      message: '左侧JSON缺少指定字段',
      differences: [
        {
          path: fieldPath,
          type: 'missing_left',
          leftValue: undefined,
          rightValue: value2,
        },
      ],
    }
  } else if (value2 === undefined) {
    return {
      type: 'warning',
      message: '右侧JSON缺少指定字段',
      differences: [
        {
          path: fieldPath,
          type: 'missing_right',
          leftValue: value1,
          rightValue: undefined,
        },
      ],
    }
  } else {
    const isEqual = JSON.stringify(value1) === JSON.stringify(value2)
    if (isEqual) {
      return {
        type: 'success',
        message: '指定字段值相同',
        differences: [],
      }
    } else {
      return {
        type: 'error',
        message: '指定字段值不同',
        differences: [
          {
            path: fieldPath,
            type: 'different',
            leftValue: value1,
            rightValue: value2,
          },
        ],
      }
    }
  }
}

const deepCompareJson = (obj1, obj2, path = '') => {
  const differences = []

  const traverse = (o1, o2, currentPath) => {
    if (o1 === o2) return

    if (o1 === undefined || o1 === null) {
      differences.push({
        path: currentPath,
        type: 'missing_left',
        leftValue: o1,
        rightValue: o2,
      })
      return
    }

    if (o2 === undefined || o2 === null) {
      differences.push({
        path: currentPath,
        type: 'missing_right',
        leftValue: o1,
        rightValue: o2,
      })
      return
    }

    if (typeof o1 !== typeof o2) {
      differences.push({
        path: currentPath,
        type: 'different',
        leftValue: o1,
        rightValue: o2,
      })
      return
    }

    if (Array.isArray(o1) && Array.isArray(o2)) {
      const maxLength = Math.max(o1.length, o2.length)
      for (let i = 0; i < maxLength; i++) {
        if (i >= o1.length) {
          differences.push({
            path: `${currentPath}[${i}]`,
            type: 'missing_left',
            leftValue: undefined,
            rightValue: o2[i],
          })
        } else if (i >= o2.length) {
          differences.push({
            path: `${currentPath}[${i}]`,
            type: 'missing_right',
            leftValue: o1[i],
            rightValue: undefined,
          })
        } else {
          traverse(o1[i], o2[i], `${currentPath}[${i}]`)
        }
      }
    } else if (typeof o1 === 'object' && typeof o2 === 'object') {
      const keys1 = Object.keys(o1)
      const keys2 = Object.keys(o2)
      const allKeys = new Set([...keys1, ...keys2])

      allKeys.forEach((key) => {
        if (!keys1.includes(key)) {
          differences.push({
            path: currentPath ? `${currentPath}.${key}` : key,
            type: 'missing_left',
            leftValue: undefined,
            rightValue: o2[key],
          })
        } else if (!keys2.includes(key)) {
          differences.push({
            path: currentPath ? `${currentPath}.${key}` : key,
            type: 'missing_right',
            leftValue: o1[key],
            rightValue: undefined,
          })
        } else {
          traverse(o1[key], o2[key], currentPath ? `${currentPath}.${key}` : key)
        }
      })
    } else if (o1 !== o2) {
      differences.push({
        path: currentPath,
        type: 'different',
        leftValue: o1,
        rightValue: o2,
      })
    }
  }

  traverse(obj1, obj2, path)

  if (differences.length === 0) {
    return {
      type: 'success',
      message: '两个JSON完全相同',
      differences: [],
    }
  } else {
    return {
      type: 'error',
      message: `发现 ${differences.length} 处差异`,
      differences,
    }
  }
}

const shallowCompareJson = (obj1, obj2) => {
  const str1 = JSON.stringify(obj1)
  const str2 = JSON.stringify(obj2)

  if (str1 === str2) {
    return {
      type: 'success',
      message: '两个JSON完全相同',
      differences: [],
    }
  } else {
    return {
      type: 'warning',
      message: '两个JSON不同（使用深度对比查看详细差异）',
      differences: [
        {
          path: 'root',
          type: 'different',
          leftValue: obj1,
          rightValue: obj2,
        },
      ],
    }
  }
}

const getDiffTypeText = (type) => {
  const typeMap = {
    missing_left: '左侧缺失',
    missing_right: '右侧缺失',
    missing_both: '两侧缺失',
    different: '值不同',
  }
  return typeMap[type] || type
}

const formatValue = (value) => {
  if (value === undefined) return 'undefined'
  if (value === null) return 'null'
  if (typeof value === 'object') {
    return JSON.stringify(value, null, 2)
  }
  return String(value)
}

const copyOutput = async () => {
  if (!outputJson.value) {
    message.warning('没有内容可复制')
    return
  }
  try {
    await navigator.clipboard.writeText(outputJson.value)
    message.success('已复制到剪贴板')
  } catch {
    message.error('复制失败')
  }
}

const downloadOutput = () => {
  if (!outputJson.value) {
    message.warning('没有内容可下载')
    return
  }
  const blob = new Blob([outputJson.value], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'formatted.json'
  a.click()
  URL.revokeObjectURL(url)
  message.success('下载成功')
}

onMounted(() => {
  inputJson.value = JSON.stringify(
    {
      name: '张三',
      age: 25,
      email: 'zhangsan@example.com',
      address: {
        city: '北京',
        district: '朝阳区',
      },
      hobbies: ['读书', '游泳', '旅行'],
    },
    null,
    2,
  )
})
</script>

<style scoped>
/**
 * JSON 页面容器
 * 使用语义化 CSS 变量实现主题切换
 */
.json-page {
  min-height: 100vh;
  background: var(--bg-base);
  padding: 40px 20px;
}

/**
 * 页面头部
 * 居中布局,包含标题和副标题
 */
.page-header {
  text-align: center;
  margin-bottom: 60px;
}

/**
 * 页面标题
 * 使用主色变量，48px字体
 */
.page-title {
  font-size: 48px;
  font-weight: 700;
  color: var(--color-primary);
  margin-bottom: 16px;
  line-height: 1.2;
}

/**
 * 页面副标题
 * 说明工具功能
 */
.page-subtitle {
  font-size: 20px;
  color: var(--text-secondary);
  margin-bottom: 0;
  line-height: 1.6;
}

/**
 * 操作按钮区域
 * 居中显示
 */
.action-buttons {
  display: flex;
  gap: 16px;
  justify-content: center;
  margin-bottom: 32px;
}

/**
 * 内容网格布局
 * 使用响应式设计
 */
.content-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  min-height: calc(100vh - 180px);
}

/**
 * 输入和输出区域
 */
.input-section,
.output-section {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/**
 * 表单行
 */
.form-row {
  margin-bottom: 16px;
}

.form-row:last-child {
  margin-bottom: 0;
}

/**
 * 编辑器包装器
 */
.editor-wrapper {
  margin-top: 16px;
  border-radius: var(--border-radius-md);
  overflow: hidden;
  transition: var(--transition-normal);
}

.editor-wrapper:hover {
  box-shadow: var(--shadow-md);
}

/**
 * JSON 输入区域
 */
.json-input-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/**
 * JSON 对比区域
 */
.json-compare-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/**
 * 对比输入框布局
 */
.compare-inputs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

/**
 * 单个对比输入框
 */
.compare-input {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/**
 * 输入标签
 */
.input-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
  padding: 4px 0;
}

/**
 * 标签文本
 */
.label-text {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
}

/**
 * 统计信息面板
 */
.stats-panel {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid var(--border-default);
  transition: var(--transition-normal);
}

/**
 * 对比结果区域
 */
.compare-result {
  min-height: 200px;
}

/**
 * 对比占位符
 */
.compare-placeholder {
  min-height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/**
 * 差异列表
 */
.differences-list h4 {
  margin-bottom: 16px;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

/**
 * 差异内容
 */
.diff-content {
  padding: 12px 0;
}

/**
 * 差异项
 */
.diff-item {
  margin-bottom: 12px;
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.diff-item:last-child {
  margin-bottom: 0;
}

/**
 * 差异标签
 */
.diff-label {
  font-size: 13px;
  color: var(--text-secondary);
  min-width: 80px;
  flex-shrink: 0;
}

/**
 * 差异值
 */
.diff-value {
  background: var(--color-primary-bg);
  padding: 6px 12px;
  border-radius: var(--border-radius-sm);
  font-size: 12px;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  max-width: 100%;
  overflow-x: auto;
  border: 1px solid var(--border-default);
  transition: var(--transition-normal);
}

.diff-value:hover {
  background: var(--color-primary-bg);
  border-color: var(--color-primary);
}

/**
 * 响应式设计
 */
@media (max-width: 1400px) {
  .json-page {
    padding: 32px 16px;
  }

  .page-header {
    margin-bottom: 48px;
  }

  .page-title {
    font-size: 36px;
  }

  .page-subtitle {
    font-size: 18px;
  }
}

@media (max-width: 1200px) {
  .content-grid {
    grid-template-columns: 1fr;
  }

  .compare-inputs {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .json-page {
    padding: 24px 12px;
  }

  .page-header {
    margin-bottom: 40px;
  }

  .page-title {
    font-size: 28px;
  }

  .page-subtitle {
    font-size: 16px;
  }

  .action-buttons {
    flex-direction: column;
    width: 100%;
  }

  .action-buttons button {
    width: 100%;
  }

  .content-grid {
    gap: 16px;
  }

  .input-section,
  .output-section {
    gap: 16px;
  }
}

@media (max-width: 480px) {
  .json-page {
    padding: 20px 15px;
  }

  .page-header {
    margin-bottom: 32px;
  }

  .page-title {
    font-size: 24px;
  }

  .page-subtitle {
    font-size: 14px;
  }

  .content-grid {
    gap: 12px;
  }

  .compare-inputs {
    gap: 12px;
  }
}
</style>
