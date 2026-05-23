<template>
  <div class="json-page">
    <!-- 页面标题和副标题 -->
    <div class="page-header">
      <h1 class="page-title">JSON 格式化工具</h1>
      <p class="page-subtitle">
        JSON 数据格式化与对比工具，支持中文逗号处理、代码折叠、深度对比、代码生成和格式转换
      </p>
    </div>

    <!-- 工具栏 -->
    <div class="toolbar-container">
      <JsonToolbar
        v-model:model-view-mode="viewMode"
        v-model:model-indent-spaces="indentSpaces"
        v-model:model-font-size="fontSize"
        :theme="isDark ? 'dark' : 'light'"
        @format="handleFormat"
        @compress="handleCompress"
        @escape="handleEscape"
        @unescape="handleUnescape"
        @expand-all="handleExpandAll"
        @collapse-all="handleCollapseAll"
        @download="handleDownload"
      />
      
      <!-- 模式选择器（整合到工具栏） -->
      <div class="mode-selector">
        <a-radio-group v-model:value="mode" button-style="solid" size="large" @change="handleModeChange">
          <a-radio-button value="format">格式化</a-radio-button>
          <a-radio-button value="compare">对比</a-radio-button>
          <a-radio-button value="generate">代码生成</a-radio-button>
          <a-radio-button value="convert">格式转换</a-radio-button>
        </a-radio-group>
        <span class="mode-description">{{ modeDescription }}</span>
      </div>
    </div>

    <!-- 主要内容区域 - 全宽布局 -->
    <div class="content-full-width">
      <!-- 左侧：输入区域 -->
      <div class="input-panel">
        <!-- 格式化模式 -->
        <JsonInputPanel
          v-if="mode === 'format'"
          v-model="inputJson"
          :theme="isDark ? 'dark' : 'light'"
          :show-validation="true"
          :realtime-validation="true"
          @change="handleInputChange"
        />

        <!-- 对比模式 -->
        <JsonComparePanel
          v-else-if="mode === 'compare'"
          ref="comparePanelRef"
          :theme="isDark ? 'dark' : 'light'"
          @compare="handleCompareResult"
        />

        <!-- 代码生成模式 -->
        <div v-else-if="mode === 'generate'" class="mode-card">
          <div class="mode-card-header">
            <h3 class="mode-card-title">代码生成</h3>
            <p class="mode-card-desc">将 JSON 转换为各编程语言的代码</p>
          </div>
          <div class="generate-section">
            <div class="form-row">
              <span class="label-text">目标语言：</span>
              <a-select v-model:value="targetLanguage" style="width: 180px">
                <a-select-option value="typescript">TypeScript</a-select-option>
                <a-select-option value="java">Java</a-select-option>
                <a-select-option value="python">Python</a-select-option>
                <a-select-option value="go">Go</a-select-option>
                <a-select-option value="csharp">C#</a-select-option>
                <a-select-option value="kotlin">Kotlin</a-select-option>
                <a-select-option value="swift">Swift</a-select-option>
                <a-select-option value="dart">Dart</a-select-option>
              </a-select>
            </div>
            <div class="form-row">
              <span class="label-text">根类型名称：</span>
              <a-input v-model:value="rootTypeName" placeholder="RootType" style="width: 160px" />
            </div>
            <div class="form-row">
              <a-checkbox v-model:checked="useCamelCase">使用驼峰命名</a-checkbox>
              <a-checkbox v-model:checked="addComments">添加注释</a-checkbox>
            </div>
            <div class="editor-wrapper">
              <CodeEditor
                v-model="inputJson"
                language="json"
                :theme="isDark ? 'dark' : 'light'"
                placeholder='{"key": "value"}'
                :enable-fold="true"
                :enable-search="true"
              />
            </div>
            <div class="form-actions">
              <GradientButton type="primary" size="md" @click="handleGenerateCode" :loading="generating">
                <template #icon><CodeOutlined /></template>
                生成代码
              </GradientButton>
            </div>
          </div>
        </div>

        <!-- 格式转换模式 -->
        <div v-else-if="mode === 'convert'" class="mode-card">
          <div class="mode-card-header">
            <h3 class="mode-card-title">格式转换</h3>
            <p class="mode-card-desc">将 JSON 转换为其他数据格式</p>
          </div>
          <div class="convert-section">
            <div class="form-row">
              <span class="label-text">目标格式：</span>
              <a-select v-model:value="targetFormat" style="width: 140px">
                <a-select-option value="xml">XML</a-select-option>
                <a-select-option value="yaml">YAML</a-select-option>
                <a-select-option value="csv">CSV</a-select-option>
                <a-select-option value="sql">SQL</a-select-option>
                <a-select-option value="toml">TOML</a-select-option>
              </a-select>
            </div>
            <div class="editor-wrapper">
              <CodeEditor
                v-model="inputJson"
                language="json"
                :theme="isDark ? 'dark' : 'light'"
                placeholder='{"key": "value"}'
                :enable-fold="true"
                :enable-search="true"
              />
            </div>
            <div class="form-actions">
              <GradientButton type="primary" size="md" @click="handleConvertFormat" :loading="converting">
                <template #icon><SwapOutlined /></template>
                转换格式
              </GradientButton>
            </div>
          </div>
        </div>
      </div>

      <!-- 右侧：输出区域 -->
      <div class="output-panel">
        <!-- 格式化结果 -->
        <JsonOutputPanel
          v-if="mode === 'format'"
          v-model="outputJson"
          :theme="isDark ? 'dark' : 'light'"
          title="格式化结果"
          description="查看处理后的 JSON 数据"
          :show-stats="true"
          @copy="handleCopy"
          @download="handleDownload"
        />

        <!-- 代码生成结果 -->
        <div v-else-if="mode === 'generate'" class="mode-card output-card">
          <div class="mode-card-header">
            <h3 class="mode-card-title">生成结果</h3>
            <p class="mode-card-desc">查看生成的代码</p>
            <div class="header-actions">
              <a-button size="small" @click="handleCopyGenerated">
                <template #icon><CopyOutlined /></template>
                复制
              </a-button>
            </div>
          </div>
          <div class="editor-wrapper">
            <CodeEditor
              v-model="generatedCode"
              :language="getCodeLanguage()"
              :theme="isDark ? 'dark' : 'light'"
              :readonly="true"
              :enable-fold="true"
              :enable-search="true"
            />
          </div>
        </div>

        <!-- 格式转换结果 -->
        <div v-else-if="mode === 'convert'" class="mode-card output-card">
          <div class="mode-card-header">
            <h3 class="mode-card-title">转换结果</h3>
            <p class="mode-card-desc">查看转换后的数据</p>
            <div class="header-actions">
              <a-button size="small" @click="handleCopyConverted">
                <template #icon><CopyOutlined /></template>
                复制
              </a-button>
              <a-button size="small" @click="handleDownloadConverted">
                <template #icon><DownloadOutlined /></template>
                下载
              </a-button>
            </div>
          </div>
          <div class="editor-wrapper">
            <CodeEditor
              v-model="convertedData"
              :language="getConvertLanguage()"
              :theme="isDark ? 'dark' : 'light'"
              :readonly="true"
              :enable-fold="true"
              :enable-search="true"
            />
          </div>
        </div>

        <!-- 对比结果 -->
        <div v-else-if="mode === 'compare'" class="compare-placeholder">
          <a-empty description="对比结果将在左侧面板显示" />
        </div>
      </div>
    </div>

    <!-- 底部操作栏 -->
    <div class="bottom-actions">
      <a-space :size="12">
        <a-button @click="handleEncodeUnicode">
          <template #icon><LinkOutlined /></template>
          中文转Unicode
        </a-button>
        <a-button @click="handleDecodeUnicode">
          <template #icon><DisconnectOutlined /></template>
          Unicode转中文
        </a-button>
        <a-button @click="handleReset">
          <template #icon><ReloadOutlined /></template>
          重置
        </a-button>
      </a-space>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { message } from 'ant-design-vue'
import { storeToRefs } from 'pinia'
import {
  CodeOutlined,
  CopyOutlined,
  DownloadOutlined,
  SwapOutlined,
  LinkOutlined,
  DisconnectOutlined,
  ReloadOutlined,
} from '@ant-design/icons-vue'
import CodeEditor from '@/components/common/CodeEditor.vue'
import VbenGlassCard from '@/components/common/VbenGlassCard.vue'
import GradientButton from '@/components/common/GradientButton.vue'
import JsonToolbar from '@/components/json/JsonToolbar.vue'
import JsonInputPanel from '@/components/json/JsonInputPanel.vue'
import JsonOutputPanel from '@/components/json/JsonOutputPanel.vue'
import JsonComparePanel from '@/components/json/JsonComparePanel.vue'
import { useThemeStore } from '@/stores/theme.js'
import { useJsonTools } from '@/composables/json/useJsonTools'
import { useJsonHistory } from '@/composables/json/useJsonHistory'
import { generateCode, convertFormat } from '@/utils/json'
import type { CodeGeneratorOptions, FormatConverterOptions, JsonCompareResult } from '@/types/json'

const themeStore = useThemeStore()
const { isDark } = storeToRefs(themeStore)

const jsonTools = useJsonTools()

const modeDescription = computed(() => {
  const descriptions: Record<string, string> = {
    format: '快速格式化 JSON 数据，支持语法高亮和错误检查',
    compare: '深度对比两个 JSON 数据，找出所有差异',
    generate: '生成 TypeScript、Java、Python 等多种语言代码',
    convert: '转换为 XML、YAML、CSV、SQL 等格式',
  }
  return descriptions[mode.value] || ''
})

const {
  inputJson,
  outputJson,
  indentSpaces,
  fontSize,
  viewMode,
  handleFormat: formatJson,
  handleMinify,
  handleEscape: escapeJson,
  handleUnescape: unescapeJson,
  handleEncodeUnicode: encodeUnicode,
  handleDecodeUnicode: decodeUnicode,
  handleClear,
  handleCopy,
  handleDownload,
} = jsonTools

const { addHistory } = useJsonHistory()

const mode = ref<'format' | 'compare' | 'generate' | 'convert'>('format')
const targetLanguage = ref<CodeGeneratorOptions['language']>('typescript')
const rootTypeName = ref('RootType')
const useCamelCase = ref(true)
const addComments = ref(true)
const targetFormat = ref<FormatConverterOptions['targetFormat']>('xml')
const generating = ref(false)
const converting = ref(false)
const generatedCode = ref('')
const convertedData = ref('')
const comparePanelRef = ref<InstanceType<typeof JsonComparePanel> | null>(null)

const handleModeChange = () => {
  outputJson.value = ''
  generatedCode.value = ''
  convertedData.value = ''
}

const handleFormat = async () => {
  await formatJson()
  if (outputJson.value) {
    addHistory(outputJson.value, 'format', 'JSON格式化')
  }
}

const handleCompress = () => {
  handleMinify()
}

const handleEscape = () => {
  escapeJson()
}

const handleUnescape = () => {
  unescapeJson()
}

const handleExpandAll = () => {
  message.info('全展开功能')
}

const handleCollapseAll = () => {
  message.info('全折叠功能')
}

const handleInputChange = () => {
  // 输入变化时的处理
}

const handleCompareResult = (result: JsonCompareResult) => {
  addHistory(JSON.stringify(result), 'compare', 'JSON对比')
}

const handleGenerateCode = async () => {
  if (!inputJson.value.trim()) {
    message.warning('请输入JSON数据')
    return
  }

  generating.value = true

  try {
    const options: CodeGeneratorOptions = {
      language: targetLanguage.value,
      rootTypeName: rootTypeName.value,
      useCamelCase: useCamelCase.value,
      addComments: addComments.value,
      optionalFields: false,
      nullChecks: true,
    }

    generatedCode.value = generateCode(inputJson.value, options)
    message.success('代码生成成功')
  } catch (error) {
    message.error('代码生成失败: ' + (error instanceof Error ? error.message : String(error)))
  } finally {
    generating.value = false
  }
}

const handleConvertFormat = async () => {
  if (!inputJson.value.trim()) {
    message.warning('请输入JSON数据')
    return
  }

  converting.value = true

  try {
    const options: FormatConverterOptions = {
      targetFormat: targetFormat.value,
      xmlRootName: 'root',
      csvDelimiter: ',',
      sqlTableName: 'json_data',
      includeHeader: true,
    }

    convertedData.value = convertFormat(inputJson.value, options)
    message.success('格式转换成功')
  } catch (error) {
    message.error('格式转换失败: ' + (error instanceof Error ? error.message : String(error)))
  } finally {
    converting.value = false
  }
}

const handleEncodeUnicode = () => {
  encodeUnicode()
}

const handleDecodeUnicode = () => {
  decodeUnicode()
}

const handleReset = () => {
  handleClear()
  generatedCode.value = ''
  convertedData.value = ''
  message.success('已重置')
}

const handleCopyGenerated = async () => {
  if (!generatedCode.value) {
    message.warning('没有内容可复制')
    return
  }
  try {
    await navigator.clipboard.writeText(generatedCode.value)
    message.success('已复制到剪贴板')
  } catch {
    message.error('复制失败')
  }
}

const handleCopyConverted = async () => {
  if (!convertedData.value) {
    message.warning('没有内容可复制')
    return
  }
  try {
    await navigator.clipboard.writeText(convertedData.value)
    message.success('已复制到剪贴板')
  } catch {
    message.error('复制失败')
  }
}

const handleDownloadConverted = () => {
  if (!convertedData.value) {
    message.warning('没有内容可下载')
    return
  }

  const extension = getConvertExtension()
  const mimeType = getConvertMimeType()

  const blob = new Blob([convertedData.value], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `converted.${extension}`
  a.click()
  URL.revokeObjectURL(url)
  message.success('下载成功')
}

const getCodeLanguage = (): string => {
  const languageMap: Record<string, string> = {
    typescript: 'typescript',
    java: 'java',
    python: 'python',
    go: 'go',
    csharp: 'csharp',
    kotlin: 'kotlin',
    swift: 'swift',
    dart: 'dart',
  }
  return languageMap[targetLanguage.value] || 'typescript'
}

const getConvertLanguage = (): string => {
  const languageMap: Record<string, string> = {
    xml: 'xml',
    yaml: 'yaml',
    csv: 'csv',
    sql: 'sql',
    toml: 'toml',
  }
  return languageMap[targetFormat.value] || 'text'
}

const getConvertExtension = (): string => {
  const extensionMap: Record<string, string> = {
    xml: 'xml',
    yaml: 'yaml',
    csv: 'csv',
    sql: 'sql',
    toml: 'toml',
  }
  return extensionMap[targetFormat.value] || 'txt'
}

const getConvertMimeType = (): string => {
  const mimeMap: Record<string, string> = {
    xml: 'application/xml',
    yaml: 'text/yaml',
    csv: 'text/csv',
    sql: 'application/sql',
    toml: 'text/plain',
  }
  return mimeMap[targetFormat.value] || 'text/plain'
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

<style scoped lang="scss">
.json-page {
  min-height: 100vh;
  background: $bg-base;
  padding: 20px 0;
  max-width: 100vw;
  overflow-x: hidden;
}

.page-header {
  text-align: center;
  margin-bottom: 20px;
  padding: 0 24px;
}

.page-title {
  font-size: 42px;
  font-weight: 700;
  color: $color-primary;
  margin-bottom: 12px;
  line-height: 1.2;
}

.page-subtitle {
  font-size: 18px;
  color: $text-secondary;
  margin-bottom: 0;
  line-height: 1.5;
}

.toolbar-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 20px;
  padding: 20px 24px;
  background: $card-bg;
  border-radius: 0;
  box-shadow: none;
  border-top: 1px solid $border-default;
  border-bottom: 1px solid $border-default;
}

.mode-selector {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
  justify-content: center;
}

.mode-description {
  font-size: 13px;
  color: $text-secondary;
  font-style: italic;
}

.content-full-width {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  width: 100%;
  min-height: calc(100vh - 280px);
  padding: 0 24px;
}

.input-panel,
.output-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;
}

.mode-card {
  display: flex;
  flex-direction: column;
  background: $card-bg;
  border: 1px solid $border-default;
  border-radius: $border-radius-lg;
  overflow: hidden;
  flex: 1;
}

.mode-card-header {
  padding: 16px 20px;
  background: $bg-elevated;
  border-bottom: 1px solid $border-default;
}

.header-actions {
  margin-top: 8px;
  display: flex;
  gap: 8px;
}

.mode-card-title {
  font-size: 16px;
  font-weight: 600;
  color: $text-primary;
  margin: 0 0 4px 0;
}

.mode-card-desc {
  font-size: 13px;
  color: $text-secondary;
  margin: 0;
}

.generate-section,
.convert-section {
  display: flex;
  flex-direction: column;
  padding: 20px;
  gap: 16px;
  flex: 1;
}

.form-row {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.form-actions {
  display: flex;
  gap: 12px;
}

.label-text {
  font-size: 13px;
  font-weight: 500;
  color: $text-secondary;
  min-width: 80px;
}

.editor-wrapper {
  flex: 1;
  min-height: 300px;
  border-radius: $border-radius-md;
  overflow: hidden;
  transition: box-shadow $transition-normal ease;

  &:hover {
    box-shadow: $shadow-md;
  }
}

.compare-placeholder {
  flex: 1;
  min-height: 300px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: $card-bg;
  border-radius: $border-radius-lg;
}

.bottom-actions {
  display: flex;
  justify-content: center;
  padding: 16px 24px;
  margin-top: 20px;
  border-top: 1px solid $border-default;
  background: $card-bg;
}

@media (max-width: 1400px) {
  .json-page {
    padding: 20px 16px;
  }

  .page-title {
    font-size: 36px;
  }

  .content-full-width {
    gap: 16px;
  }
}

@media (max-width: 1200px) {
  .content-full-width {
    grid-template-columns: 1fr;
  }

  .editor-wrapper {
    min-height: 250px;
  }
}

@media (max-width: 768px) {
  .json-page {
    padding: 16px 12px;
  }

  .page-title {
    font-size: 28px;
  }

  .page-subtitle {
    font-size: 15px;
  }

  .toolbar-container {
    padding: 16px;
  }

  .mode-selector {
    flex-direction: column;
  }

  .mode-description {
    text-align: center;
  }

  .content-full-width {
    gap: 12px;
  }

  .mode-card-header {
    padding: 12px 16px;
  }

  .generate-section,
  .convert-section {
    padding: 16px;
  }

  .form-row {
    flex-direction: column;
    align-items: flex-start;
  }

  .label-text {
    min-width: auto;
  }

  .bottom-actions {
    flex-direction: column;
    align-items: stretch;

    .ant-space {
      flex-wrap: wrap;
      justify-content: center;
    }
  }
}

@media (max-width: 480px) {
  .json-page {
    padding: 12px 10px;
  }

  .page-title {
    font-size: 24px;
  }

  .page-subtitle {
    font-size: 14px;
  }

  .editor-wrapper {
    min-height: 200px;
  }
}
</style>
