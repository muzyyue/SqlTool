<template>
  <div class="regex-ai-assistant">
    <!-- AI 状态提示区域 -->
    <div v-if="!isAiReady" class="ai-status-section">
      <!-- 加载中状态 -->
      <a-spin v-if="isCheckingAi" tip="正在检查 AI 服务状态...">
        <template #indicator>
          <span class="i-carbon-renew spin-icon"></span>
        </template>
      </a-spin>

      <!-- AI 不可用提示 -->
      <a-alert
        v-else-if="aiError"
        type="error"
        show-icon
        message="AI 服务不可用"
        :description="aiError"
      >
        <template #icon>
          <span class="i-carbon-warning-filled"></span>
        </template>
      </a-alert>

      <!-- AI 未启用提示 -->
      <a-alert
        v-else-if="!aiStore.isEnabled"
        type="info"
        show-icon
        message="AI 功能未启用"
      >
        <template #icon>
          <span class="i-carbon-locked"></span>
        </template>
        <template #action>
          <a-button size="small" type="primary" @click="handleEnableAi">
            启用 AI
          </a-button>
        </template>
      </a-alert>
    </div>

    <!-- AI 就绪，显示功能区域 -->
    <template v-else>
      <!-- 功能切换标签页 -->
      <a-tabs v-model:activeKey="activeTab" class="function-tabs">
        <!-- 自然语言生成正则 -->
        <a-tab-pane key="generate" tab="生成正则">
          <template #tab>
            <span class="tab-label">
              <span class="i-carbon-magic-wand"></span>
              生成正则
            </span>
          </template>

          <div class="tab-content">
            <!-- 输入区域 -->
            <div class="input-section">
              <div class="input-header">
                <span class="input-label">描述您需要的正则表达式</span>
              </div>
              <a-textarea
                v-model:value="generateInput"
                placeholder="例如：匹配中国大陆手机号码、匹配邮箱地址、匹配日期格式 YYYY-MM-DD..."
                :auto-size="{ minRows: 3, maxRows: 6 }"
                :disabled="isGenerating"
                class="input-textarea"
              />
            </div>

            <!-- 生成按钮 -->
            <div class="action-section">
              <a-button
                type="primary"
                :loading="isGenerating"
                :disabled="!generateInput.trim()"
                class="generate-btn"
                @click="handleGenerate"
              >
                <template #icon>
                  <span v-if="!isGenerating" class="i-carbon-magic-wand"></span>
                </template>
                {{ isGenerating ? '生成中...' : '生成正则' }}
              </a-button>
            </div>

            <!-- 生成结果 -->
            <div v-if="generatedRegex" class="result-section">
              <div class="result-header">
                <span class="result-label">生成的正则表达式</span>
                <a-space>
                  <a-button type="link" size="small" @click="handleCopyRegex">
                    <template #icon>
                      <span class="i-carbon-copy"></span>
                    </template>
                    复制
                  </a-button>
                  <a-button type="link" size="small" @click="handleClearGenerate">
                    <template #icon>
                      <span class="i-carbon-close"></span>
                    </template>
                    清除
                  </a-button>
                </a-space>
              </div>
              <div class="regex-display">
                <code class="regex-code">{{ generatedRegex }}</code>
              </div>
            </div>
          </div>
        </a-tab-pane>

        <!-- 正则解释 -->
        <a-tab-pane key="explain" tab="解释正则">
          <template #tab>
            <span class="tab-label">
              <span class="i-carbon-text-annotation-toggle"></span>
              解释正则
            </span>
          </template>

          <div class="tab-content">
            <!-- 输入区域 -->
            <div class="input-section">
              <div class="input-header">
                <span class="input-label">输入需要解释的正则表达式</span>
              </div>
              <a-textarea
                v-model:value="explainInput"
                placeholder="输入正则表达式，例如：^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"
                :auto-size="{ minRows: 2, maxRows: 4 }"
                :disabled="isExplaining"
                class="input-textarea"
              />
            </div>

            <!-- 解释按钮 -->
            <div class="action-section">
              <a-button
                type="primary"
                :loading="isExplaining"
                :disabled="!explainInput.trim()"
                class="generate-btn"
                @click="handleExplain"
              >
                <template #icon>
                  <span v-if="!isExplaining" class="i-carbon-text-annotation-toggle"></span>
                </template>
                {{ isExplaining ? '解释中...' : '解释正则' }}
              </a-button>
            </div>

            <!-- 解释结果 -->
            <div v-if="explainResult" class="result-section">
              <div class="result-header">
                <span class="result-label">正则解释</span>
                <a-button type="link" size="small" @click="handleClearExplain">
                  <template #icon>
                    <span class="i-carbon-close"></span>
                  </template>
                  清除
                </a-button>
              </div>
              <div class="explain-content">
                {{ explainResult }}
              </div>
            </div>
          </div>
        </a-tab-pane>
      </a-tabs>

      <!-- 匹配示例区域 -->
      <div v-if="currentRegex" class="match-section">
        <div class="match-header">
          <span class="i-carbon-view"></span>
          <span class="match-title">匹配示例</span>
        </div>

        <!-- 测试字符串输入 -->
        <div class="test-input-section">
          <a-input
            v-model:value="testInputValue"
            placeholder="输入测试字符串..."
            class="test-input"
          >
            <template #prefix>
              <span class="i-carbon-search"></span>
            </template>
          </a-input>
        </div>

        <!-- 匹配结果展示 -->
        <div v-if="matchResult" class="match-result">
          <template v-if="matchResult.matches.length > 0">
            <div class="match-info">
              <a-tag color="success">
                匹配到 {{ matchResult.matches.length }} 个结果
              </a-tag>
            </div>
            <!-- 高亮显示匹配结果 -->
            <div class="match-display">
              <span
                v-for="(part, index) in matchResult.highlightedParts"
                :key="index"
                :class="{ 'match-highlight': part.isMatch }"
              >
                {{ part.text }}
              </span>
            </div>
            <!-- 匹配详情表格 -->
            <div v-if="matchResult.matches.length > 1" class="match-table-wrapper">
              <a-table
                :columns="matchColumns"
                :data-source="matchResult.tableData"
                :pagination="false"
                size="small"
                class="match-table"
              />
            </div>
          </template>
          <template v-else>
            <a-empty description="无匹配结果" :image-style="{ height: '40px' }" />
          </template>
        </div>

        <!-- 正则错误提示 -->
        <a-alert
          v-if="regexError"
          type="error"
          show-icon
          :message="regexError"
          class="regex-error-alert"
        />
      </div>

      <!-- 应用按钮 -->
      <div v-if="generatedRegex || explainInput" class="apply-section">
        <a-button
          type="primary"
          :disabled="!currentRegex"
          @click="handleApply"
        >
          <template #icon>
            <span class="i-carbon-checkmark"></span>
          </template>
          应用到目标
        </a-button>
      </div>

      <!-- 错误提示 -->
      <a-alert
        v-if="operationError"
        type="error"
        show-icon
        closable
        :message="operationError"
        class="error-alert"
        @close="operationError = null"
      >
        <template #icon>
          <span class="i-carbon-warning-filled"></span>
        </template>
      </a-alert>
    </template>
  </div>
</template>

<script setup lang="ts">
/**
 * RegexAiAssistant 组件
 * 正则表达式 AI 助手，提供自然语言生成正则和正则解释功能
 *
 * @component
 * @example
 * <RegexAiAssistant
 *   :current-regex="regexValue"
 *   :test-string="testStr"
 *   @result="handleResult"
 *   @error="handleError"
 * />
 */

import { ref, computed, watch, onMounted } from 'vue'
import { message } from 'ant-design-vue'
import { useAiStore } from '@/stores/ai.js'
import { getModelManager } from '@/composables/ai/useModelManager'
import type { GenerateOptions } from '@/composables/ai/types'

// ===== 类型定义 =====

/**
 * 匹配结果接口
 */
interface MatchPart {
  /** 文本内容 */
  text: string
  /** 是否为匹配部分 */
  isMatch: boolean
}

/**
 * 匹配结果详情接口
 */
interface MatchResult {
  /** 所有匹配项 */
  matches: RegExpMatchArray[]
  /** 高亮显示的部分 */
  highlightedParts: MatchPart[]
  /** 表格数据 */
  tableData: Array<{ key: number; index: number; value: string }>
}

/**
 * 表格列配置类型
 */
interface TableColumn {
  title: string
  dataIndex: string
  key: string
  width?: number
}

// ===== Props 定义 =====

const props = withDefaults(
  defineProps<{
    /** 当前正则表达式 */
    currentRegex?: string
    /** 测试字符串 */
    testString?: string
  }>(),
  {
    currentRegex: '',
    testString: '',
  }
)

// ===== Emits 定义 =====

const emit = defineEmits<{
  /** 生成结果事件 */
  result: [regex: string]
  /** 错误事件 */
  error: [error: Error]
}>()

// ===== Store & Composables =====

const aiStore = useAiStore()
const modelManager = getModelManager()

// ===== 响应式状态 =====

/** 当前激活的标签页 */
const activeTab = ref<'generate' | 'explain'>('generate')

/** 自然语言输入 */
const generateInput = ref('')

/** 生成的正则表达式 */
const generatedRegex = ref('')

/** 需要解释的正则输入 */
const explainInput = ref('')

/** 解释结果 */
const explainResult = ref('')

/** 测试字符串输入 */
const testInputValue = ref('')

/** 是否正在生成正则 */
const isGenerating = ref(false)

/** 是否正在解释正则 */
const isExplaining = ref(false)

/** 是否正在检查 AI 状态 */
const isCheckingAi = ref(false)

/** AI 错误信息 */
const aiError = ref<string | null>(null)

/** 操作错误信息 */
const operationError = ref<string | null>(null)

/** 正则表达式错误 */
const regexError = ref<string | null>(null)

/** 匹配结果 */
const matchResult = ref<MatchResult | null>(null)

// ===== 计算属性 =====

/** AI 是否就绪 */
const isAiReady = computed(() => {
  return aiStore.canUseAi && !aiError.value
})

/** 当前使用的正则表达式 */
const currentRegex = computed(() => {
  if (activeTab.value === 'generate') {
    return generatedRegex.value || props.currentRegex
  }
  return explainInput.value || props.currentRegex
})

/** 匹配表格列配置 */
const matchColumns: TableColumn[] = [
  {
    title: '序号',
    dataIndex: 'index',
    key: 'index',
    width: 60,
  },
  {
    title: '匹配内容',
    dataIndex: 'value',
    key: 'value',
  },
]

// ===== 监听器 =====

/**
 * 监听 props.testString 变化
 * 同步到测试输入框
 */
watch(
  () => props.testString,
  (newVal) => {
    if (newVal) {
      testInputValue.value = newVal
    }
  },
  { immediate: true }
)

/**
 * 监听当前正则变化
 * 更新匹配结果
 */
watch(
  currentRegex,
  () => {
    updateMatchResult()
  }
)

/**
 * 监听测试字符串变化
 * 更新匹配结果
 */
watch(
  testInputValue,
  () => {
    updateMatchResult()
  }
)

// ===== 生命周期 =====

onMounted(async () => {
  await checkAiAvailability()
})

// ===== 方法 =====

/**
 * 检查 AI 服务可用性
 */
const checkAiAvailability = async (): Promise<void> => {
  isCheckingAi.value = true
  aiError.value = null

  try {
    // 如果未启用，不检查
    if (!aiStore.isEnabled) {
      isCheckingAi.value = false
      return
    }

    // 检查可用性
    const isAvailable = await aiStore.checkAvailability()

    if (!isAvailable) {
      aiError.value = aiStore.lastError?.message || 'AI 服务暂时不可用，请稍后重试'
    }
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error))
    aiError.value = err.message
  } finally {
    isCheckingAi.value = false
  }
}

/**
 * 启用 AI 功能
 */
const handleEnableAi = async (): Promise<void> => {
  try {
    aiStore.toggleEnabled()
    await checkAiAvailability()
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error))
    message.error(`启用 AI 失败: ${err.message}`)
  }
}

/**
 * 处理生成正则操作
 */
const handleGenerate = async (): Promise<void> => {
  // 验证输入
  if (!generateInput.value.trim()) {
    message.warning('请输入您的需求描述')
    return
  }

  // 验证 AI 可用性
  if (!isAiReady.value) {
    message.warning('AI 服务不可用，请稍后重试')
    return
  }

  isGenerating.value = true
  operationError.value = null

  try {
    // 构建提示词
    const prompt = buildGeneratePrompt(generateInput.value)

    // 调用 AI 生成
    const options: GenerateOptions = {
      maxTokens: 500,
      temperature: 0.3,
    }

    const response = await modelManager.generate(prompt, options)

    // ModelResponse 直接返回 content，失败时会抛出异常
    if (response.content) {
      // 清理生成的正则表达式
      const regex = cleanGeneratedRegex(response.content)
      generatedRegex.value = regex
      message.success('正则表达式生成成功')
    } else {
      throw new Error('生成结果为空，请重试')
    }
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error))
    operationError.value = err.message
    emit('error', err)
  } finally {
    isGenerating.value = false
  }
}

/**
 * 处理解释正则操作
 */
const handleExplain = async (): Promise<void> => {
  // 验证输入
  if (!explainInput.value.trim()) {
    message.warning('请输入需要解释的正则表达式')
    return
  }

  // 验证 AI 可用性
  if (!isAiReady.value) {
    message.warning('AI 服务不可用，请稍后重试')
    return
  }

  // 验证正则表达式有效性
  if (!validateRegex(explainInput.value)) {
    message.warning('输入的正则表达式格式无效')
    return
  }

  isExplaining.value = true
  operationError.value = null

  try {
    // 构建提示词
    const prompt = buildExplainPrompt(explainInput.value)

    // 调用 AI 生成
    const options: GenerateOptions = {
      maxTokens: 1000,
      temperature: 0.5,
    }

    const response = await modelManager.generate(prompt, options)

    // ModelResponse 直接返回 content，失败时会抛出异常
    if (response.content) {
      explainResult.value = response.content.trim()
      message.success('正则解释生成成功')
    } else {
      throw new Error('解释结果为空，请重试')
    }
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error))
    operationError.value = err.message
    emit('error', err)
  } finally {
    isExplaining.value = false
  }
}

/**
 * 构建生成正则的提示词
 * @param userInput - 用户输入的自然语言描述
 * @returns 完整的提示词
 */
const buildGeneratePrompt = (userInput: string): string => {
  return `你是一个正则表达式专家。请根据用户的自然语言描述生成一个正则表达式。

要求：
1. 只输出正则表达式本身，不要添加任何解释、说明或代码块标记
2. 不要输出 \`/\` 和 \`/\` 包裹符号，只输出正则表达式的内容
3. 如果需要标志位（如 i, g, m），请在最后用 /flags 的形式表示，例如：/gi
4. 确保生成的正则表达式语法正确且能正常工作

用户需求：
${userInput}

请直接输出正则表达式：`
}

/**
 * 构建解释正则的提示词
 * @param regex - 需要解释的正则表达式
 * @returns 完整的提示词
 */
const buildExplainPrompt = (regex: string): string => {
  return `你是一个正则表达式专家。请详细解释以下正则表达式的含义。

要求：
1. 使用简洁易懂的语言解释
2. 逐个部分解释每个元字符和模式的作用
3. 给出该正则表达式可能匹配的示例
4. 如果有常见的使用场景，请一并说明

正则表达式：
${regex}

请解释这个正则表达式：`
}

/**
 * 清理生成的正则表达式
 * 移除代码块标记、多余的空白和换行
 * @param content - AI 生成的原始内容
 * @returns 清理后的正则表达式
 */
const cleanGeneratedRegex = (content: string): string => {
  let regex = content.trim()

  // 移除代码块标记
  regex = regex.replace(/^```[\w]*\n?/g, '').replace(/\n?```$/g, '')

  // 移除可能的包裹符号
  regex = regex.replace(/^\/|\/$/g, '')

  // 移除多余的空白和换行
  regex = regex.replace(/\s+/g, '').trim()

  return regex
}

/**
 * 验证正则表达式是否有效
 * @param pattern - 正则表达式字符串
 * @returns 是否有效
 */
const validateRegex = (pattern: string): boolean => {
  try {
    new RegExp(pattern)
    return true
  } catch {
    return false
  }
}

/**
 * 更新匹配结果
 */
const updateMatchResult = (): void => {
  regexError.value = null
  matchResult.value = null

  if (!currentRegex.value || !testInputValue.value) {
    return
  }

  try {
    const regex = new RegExp(currentRegex.value, 'g')
    const text = testInputValue.value
    const matches: RegExpMatchArray[] = []

    // 获取所有匹配
    let match: RegExpMatchArray | null
    while ((match = regex.exec(text)) !== null) {
      matches.push([...match] as RegExpMatchArray)
      // 防止零宽匹配导致的无限循环
      if (match.index === regex.lastIndex) {
        regex.lastIndex++
      }
    }

    // 构建高亮显示部分
    const highlightedParts: MatchPart[] = []
    let lastIndex = 0

    // 重置正则
    regex.lastIndex = 0

    while ((match = regex.exec(text)) !== null) {
      // 添加未匹配部分
      if (match.index > lastIndex) {
        highlightedParts.push({
          text: text.slice(lastIndex, match.index),
          isMatch: false,
        })
      }
      // 添加匹配部分
      highlightedParts.push({
        text: match[0],
        isMatch: true,
      })
      lastIndex = match.index + match[0].length

      // 防止零宽匹配导致的无限循环
      if (match.index === regex.lastIndex) {
        regex.lastIndex++
      }
    }

    // 添加最后未匹配部分
    if (lastIndex < text.length) {
      highlightedParts.push({
        text: text.slice(lastIndex),
        isMatch: false,
      })
    }

    // 构建表格数据
    const tableData = matches.map((m, index) => ({
      key: index,
      index: index + 1,
      value: m[0],
    }))

    matchResult.value = {
      matches,
      highlightedParts,
      tableData,
    }
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error))
    regexError.value = `正则表达式错误: ${err.message}`
  }
}

/**
 * 复制正则表达式到剪贴板
 */
const handleCopyRegex = async (): Promise<void> => {
  try {
    await navigator.clipboard.writeText(generatedRegex.value)
    message.success('已复制到剪贴板')
  } catch {
    message.error('复制失败，请手动复制')
  }
}

/**
 * 清除生成结果
 */
const handleClearGenerate = (): void => {
  generatedRegex.value = ''
}

/**
 * 清除解释结果
 */
const handleClearExplain = (): void => {
  explainResult.value = ''
}

/**
 * 应用正则表达式到目标
 */
const handleApply = (): void => {
  const regex = currentRegex.value

  if (!regex) {
    message.warning('没有可应用的正则表达式')
    return
  }

  // 验证正则有效性
  if (!validateRegex(regex)) {
    message.warning('正则表达式格式无效')
    return
  }

  emit('result', regex)
  message.success('正则表达式已应用')
}
</script>

<style scoped>
/**
 * 正则 AI 助手容器
 */
.regex-ai-assistant {
  padding: 16px;
  background: var(--bg-glass);
  backdrop-filter: blur(var(--backdrop-blur));
  -webkit-backdrop-filter: blur(var(--backdrop-blur));
  border: 1px solid var(--border-glass);
  border-radius: var(--border-radius-md);
  contain: layout style paint;
}

/**
 * AI 状态区域
 */
.ai-status-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 200px;
  gap: 16px;
}

/**
 * 旋转图标动画
 */
.spin-icon {
  animation: spin 1s linear infinite;
  font-size: 24px;
  color: var(--color-primary);
  will-change: transform;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

/**
 * 功能切换标签页
 */
.function-tabs {
  margin-bottom: 16px;
}

.tab-label {
  display: flex;
  align-items: center;
  gap: 6px;
}

.tab-label .i-carbon-magic-wand,
.tab-label .i-carbon-text-annotation-toggle {
  font-size: 14px;
}

.tab-content {
  padding: 12px 0;
}

/**
 * 输入区域
 */
.input-section {
  margin-bottom: 12px;
}

.input-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.input-label {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
}

.input-textarea {
  border-radius: var(--border-radius-sm);
  border-color: var(--input-border);
  background: var(--input-bg);
  color: var(--text-primary);
  transition: border-color var(--transition-fast) ease, background-color var(--transition-fast) ease, box-shadow var(--transition-fast) ease;
}

.input-textarea:focus,
.input-textarea:hover {
  border-color: var(--input-border-focus);
}

.input-textarea::placeholder {
  color: var(--input-placeholder);
}

/**
 * 操作按钮区域
 */
.action-section {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.generate-btn {
  min-width: 120px;
  border-radius: var(--border-radius-sm);
  transition: transform var(--transition-fast) ease, box-shadow var(--transition-fast) ease, background-color var(--transition-fast) ease, border-color var(--transition-fast) ease;
}

.generate-btn:not(:disabled):hover {
  transform: translateY(-1px);
  box-shadow: var(--shadow-button-hover);
}

.generate-btn:not(:disabled):active {
  transform: scale(0.98);
}

/**
 * 结果区域
 */
.result-section {
  margin-top: 16px;
  padding: 12px;
  background: var(--bg-elevated);
  border: 1px solid var(--border-default);
  border-radius: var(--border-radius-sm);
}

.result-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.result-label {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
}

/**
 * 正则表达式显示
 */
.regex-display {
  padding: 12px;
  background: var(--bg-code);
  border-radius: var(--border-radius-xs);
  overflow-x: auto;
}

.regex-code {
  font-family: 'Fira Code', 'Consolas', monospace;
  font-size: 14px;
  color: var(--color-primary);
  word-break: break-all;
}

/**
 * 解释内容
 */
.explain-content {
  font-size: 14px;
  line-height: 1.8;
  color: var(--text-primary);
  white-space: pre-wrap;
}

/**
 * 匹配示例区域
 */
.match-section {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--border-default);
}

.match-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  font-weight: 500;
  color: var(--text-primary);
}

.match-header .i-carbon-view {
  font-size: 16px;
  color: var(--color-primary);
}

.match-title {
  font-size: 14px;
}

/**
 * 测试输入区域
 */
.test-input-section {
  margin-bottom: 12px;
}

.test-input {
  border-radius: var(--border-radius-sm);
}

/**
 * 匹配结果展示
 */
.match-result {
  padding: 12px;
  background: var(--bg-elevated);
  border: 1px solid var(--border-default);
  border-radius: var(--border-radius-sm);
}

.match-info {
  margin-bottom: 8px;
}

/**
 * 匹配高亮显示
 */
.match-display {
  padding: 12px;
  background: var(--bg-code);
  border-radius: var(--border-radius-xs);
  font-family: 'Fira Code', 'Consolas', monospace;
  font-size: 13px;
  line-height: 1.6;
  word-break: break-all;
  color: var(--text-primary);
}

.match-highlight {
  background: rgba(22, 119, 255, 0.2);
  color: var(--color-primary);
  border-radius: 2px;
  padding: 0 2px;
}

/**
 * 匹配表格
 */
.match-table-wrapper {
  margin-top: 12px;
}

.match-table {
  font-size: 13px;
}

/**
 * 正则错误提示
 */
.regex-error-alert {
  margin-top: 12px;
  border-radius: var(--border-radius-sm);
}

/**
 * 应用按钮区域
 */
.apply-section {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--border-default);
  display: flex;
  justify-content: flex-end;
}

/**
 * 错误提示
 */
.error-alert {
  margin-top: 16px;
  border-radius: var(--border-radius-sm);
}

/**
 * 全局样式覆盖
 */
:deep(.ant-tabs-tab) {
  padding: 8px 16px;
}

:deep(.ant-tabs-tab-active) {
  font-weight: 500;
}

:deep(.ant-tabs-ink-bar) {
  background: var(--color-primary);
}

:deep(.ant-empty-description) {
  color: var(--text-tertiary);
}

:deep(.ant-tag) {
  border-radius: var(--border-radius-xs);
}

:deep(.ant-table) {
  background: transparent;
}

:deep(.ant-table-thead > tr > th) {
  background: var(--bg-elevated);
  color: var(--text-secondary);
}

:deep(.ant-table-tbody > tr > td) {
  background: transparent;
  color: var(--text-primary);
}
</style>
