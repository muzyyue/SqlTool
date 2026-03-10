<template>
  <a-modal
    :open="open"
    :title="title"
    :width="640"
    :footer="null"
    :maskClosable="false"
    :destroyOnClose="true"
    class="ai-dialog"
    @update:open="handleOpenChange"
  >
    <div class="ai-dialog-content">
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
          :message="aiErrorTitle"
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

      <!-- AI 就绪，显示输入区域 -->
      <template v-else>
        <!-- 上下文信息展示 -->
        <div v-if="hasContext" class="context-section">
          <div class="context-header">
            <span class="i-carbon-information"></span>
            <span class="context-title">上下文信息</span>
          </div>
          <div class="context-content">
            <div v-if="context.tableName" class="context-item">
              <span class="context-label">表名:</span>
              <a-tag color="blue">{{ context.tableName }}</a-tag>
            </div>
            <div v-if="context.operationType" class="context-item">
              <span class="context-label">操作类型:</span>
              <a-tag color="green">{{ context.operationType }}</a-tag>
            </div>
            <div v-if="context.fieldCount" class="context-item">
              <span class="context-label">字段数量:</span>
              <span class="context-value">{{ context.fieldCount }}</span>
            </div>
          </div>
        </div>

        <!-- 自然语言输入区域 -->
        <div class="input-section">
          <div class="input-header">
            <span class="input-label">描述您的需求</span>
            <span class="input-hint">支持自然语言描述，AI 将帮您生成内容</span>
          </div>
          <a-textarea
            v-model:value="inputValue"
            :placeholder="placeholder"
            :auto-size="{ minRows: 4, maxRows: 8 }"
            :disabled="isGenerating"
            class="input-textarea"
            @pressEnter="handleGenerate"
          />
        </div>

        <!-- 生成按钮区域 -->
        <div class="action-section">
          <a-button
            type="primary"
            :loading="isGenerating"
            :disabled="!inputValue.trim()"
            class="generate-btn"
            @click="handleGenerate"
          >
            <template #icon>
              <span v-if="!isGenerating" class="i-carbon-magic-wand"></span>
            </template>
            {{ isGenerating ? '生成中...' : '生成' }}
          </a-button>
          <span v-if="inputValue.trim()" class="shortcut-hint">
            按 Enter 快速生成
          </span>
        </div>

        <!-- 生成结果区域 -->
        <div v-if="generatedResult" class="result-section">
          <div class="result-header">
            <span class="result-label">生成结果</span>
            <a-space>
              <a-button
                type="link"
                size="small"
                @click="handleCopyResult"
              >
                <template #icon>
                  <span class="i-carbon-copy"></span>
                </template>
                复制
              </a-button>
              <a-button
                type="link"
                size="small"
                @click="handleClearResult"
              >
                <template #icon>
                  <span class="i-carbon-close"></span>
                </template>
                清除
              </a-button>
            </a-space>
          </div>
          <a-textarea
            v-model:value="generatedResult"
            :auto-size="{ minRows: 6, maxRows: 12 }"
            class="result-textarea"
          />
          <div class="result-actions">
            <a-button
              type="primary"
              :disabled="!generatedResult.trim()"
              @click="handleApply"
            >
              <template #icon>
                <span class="i-carbon-checkmark"></span>
              </template>
              应用结果
            </a-button>
          </div>
        </div>

        <!-- 错误提示区域 -->
        <a-alert
          v-if="generateError"
          type="error"
          show-icon
          closable
          :message="generateError.message"
          class="error-alert"
          @close="generateError = null"
        >
          <template #icon>
            <span class="i-carbon-warning-filled"></span>
          </template>
        </a-alert>
      </template>
    </div>
  </a-modal>
</template>

<script setup lang="ts">
/**
 * AiDialog 组件
 * AI 对话框组件，用于自然语言生成 SQL 等场景
 *
 * @component
 * @example
 * <AiDialog
 *   v-model:open="showDialog"
 *   title="AI 生成 SQL"
 *   placeholder="描述您想要生成的 SQL，例如：生成一个查询所有用户信息的 SELECT 语句"
 *   :context="{ tableName: 'users', operationType: 'SELECT', fieldCount: 10 }"
 *   @result="handleResult"
 *   @error="handleError"
 * />
 */

import { ref, computed, watch } from 'vue'
import { message } from 'ant-design-vue'
import { useAiStore } from '@/stores/ai.js'
import { getModelManager } from '@/composables/ai/useModelManager'
import type { GenerateOptions } from '@/composables/ai/types'

// ===== 类型定义 =====

/**
 * AI 上下文信息接口
 */
interface AiContext {
  /** 表名 */
  tableName?: string
  /** 操作类型 (SELECT, INSERT, UPDATE 等) */
  operationType?: string
  /** 字段数量 */
  fieldCount?: number
  /** DDL 结构 */
  ddl?: string
  /** 其他自定义上下文 */
  [key: string]: unknown
}

/**
 * 生成错误接口
 */
interface GenerateError {
  message: string
  code?: string
  details?: unknown
}

// ===== Props 定义 =====

const props = withDefaults(
  defineProps<{
    /** 对话框是否打开 */
    open: boolean
    /** 对话框标题 */
    title?: string
    /** 输入框占位符 */
    placeholder?: string
    /** AI 上下文信息 */
    context?: AiContext
  }>(),
  {
    title: 'AI 助手',
    placeholder: '请描述您的需求...',
    context: () => ({}),
  }
)

// ===== Emits 定义 =====

const emit = defineEmits<{
  /** 打开状态更新事件 */
  'update:open': [open: boolean]
  /** 生成结果事件 */
  result: [result: string]
  /** 错误事件 */
  error: [error: GenerateError]
}>()

// ===== Store & Composables =====

const aiStore = useAiStore()
const modelManager = getModelManager()

// ===== 响应式状态 =====

/** 用户输入的自然语言 */
const inputValue = ref('')

/** AI 生成的结果 */
const generatedResult = ref('')

/** 是否正在生成 */
const isGenerating = ref(false)

/** 是否正在检查 AI 状态 */
const isCheckingAi = ref(false)

/** AI 错误信息 */
const aiError = ref<string | null>(null)

/** 生成错误信息 */
const generateError = ref<GenerateError | null>(null)

// ===== 计算属性 =====

/** AI 是否就绪 */
const isAiReady = computed(() => {
  return aiStore.canUseAi && !aiError.value
})

/** AI 错误标题 */
const aiErrorTitle = computed(() => {
  if (!aiStore.isEnabled) {
    return 'AI 功能未启用'
  }
  if (aiStore.lastError) {
    return 'AI 服务不可用'
  }
  return 'AI 服务异常'
})

/** 是否有上下文信息 */
const hasContext = computed(() => {
  return props.context && Object.keys(props.context).length > 0
})

// ===== 监听器 =====

/**
 * 监听对话框打开状态
 * 打开时检查 AI 可用性
 */
watch(
  () => props.open,
  async (newOpen) => {
    if (newOpen) {
      // 重置状态
      inputValue.value = ''
      generatedResult.value = ''
      generateError.value = null
      aiError.value = null

      // 检查 AI 可用性
      await checkAiAvailability()
    }
  }
)

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
 * 处理对话框打开状态变化
 * @param newOpen - 新的打开状态
 */
const handleOpenChange = (newOpen: boolean): void => {
  emit('update:open', newOpen)
}

/**
 * 处理生成操作
 */
const handleGenerate = async (): Promise<void> => {
  // 验证输入
  if (!inputValue.value.trim()) {
    message.warning('请输入您的需求描述')
    return
  }

  // 验证 AI 可用性
  if (!isAiReady.value) {
    message.warning('AI 服务不可用，请稍后重试')
    return
  }

  isGenerating.value = true
  generateError.value = null

  try {
    // 构建提示词
    const prompt = buildPrompt(inputValue.value)

    // 调用 AI 生成
    const options: GenerateOptions = {
      maxTokens: 2000,
      temperature: 0.7,
    }

    const response = await modelManager.generate(prompt, options)

    // ModelResponse 直接返回 content，失败时会抛出异常
    if (response.content) {
      generatedResult.value = response.content.trim()
      message.success('生成成功')
    } else {
      throw new Error('生成结果为空，请重试')
    }
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error))
    generateError.value = {
      message: err.message,
      code: 'GENERATE_ERROR',
      details: error,
    }
    emit('error', generateError.value)
  } finally {
    isGenerating.value = false
  }
}

/**
 * 构建提示词
 * @param userInput - 用户输入
 * @returns 完整的提示词
 */
const buildPrompt = (userInput: string): string => {
  const parts: string[] = []

  // 添加上下文信息
  if (hasContext.value) {
    parts.push('## 上下文信息')
    if (props.context.tableName) {
      parts.push(`表名: ${props.context.tableName}`)
    }
    if (props.context.operationType) {
      parts.push(`操作类型: ${props.context.operationType}`)
    }
    if (props.context.fieldCount) {
      parts.push(`字段数量: ${props.context.fieldCount}`)
    }
    if (props.context.ddl) {
      parts.push(`DDL 结构:\n${props.context.ddl}`)
    }
    parts.push('')
  }

  // 添加用户需求
  parts.push('## 用户需求')
  parts.push(userInput)
  parts.push('')

  // 添加输出要求
  parts.push('## 输出要求')
  parts.push('请根据上述上下文和需求，生成相应的内容。只输出结果，不要添加额外的解释或说明。')

  return parts.join('\n')
}

/**
 * 复制结果到剪贴板
 */
const handleCopyResult = async (): Promise<void> => {
  try {
    await navigator.clipboard.writeText(generatedResult.value)
    message.success('已复制到剪贴板')
  } catch {
    message.error('复制失败，请手动复制')
  }
}

/**
 * 清除生成结果
 */
const handleClearResult = (): void => {
  generatedResult.value = ''
}

/**
 * 应用生成结果
 */
const handleApply = (): void => {
  if (!generatedResult.value.trim()) {
    message.warning('没有可应用的结果')
    return
  }

  emit('result', generatedResult.value)
  emit('update:open', false)
  message.success('结果已应用')
}
</script>

<style scoped>
/**
 * AI 对话框内容容器
 */
.ai-dialog-content {
  padding: 8px 0;
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
 * 上下文信息区域
 */
.context-section {
  margin-bottom: 16px;
  padding: 12px 16px;
  background: var(--bg-glass);
  backdrop-filter: blur(var(--backdrop-blur));
  -webkit-backdrop-filter: blur(var(--backdrop-blur));
  border: 1px solid var(--border-glass);
  border-radius: var(--border-radius-sm);
}

.context-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  font-weight: 500;
  color: var(--text-primary);
}

.context-header .i-carbon-information {
  font-size: 16px;
  color: var(--color-primary);
}

.context-title {
  font-size: 14px;
}

.context-content {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.context-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.context-label {
  font-size: 13px;
  color: var(--text-secondary);
}

.context-value {
  font-size: 13px;
  color: var(--text-primary);
  font-weight: 500;
}

/**
 * 输入区域
 */
.input-section {
  margin-bottom: 16px;
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

.input-hint {
  font-size: 12px;
  color: var(--text-tertiary);
}

.input-textarea {
  border-radius: var(--border-radius-sm);
  border-color: var(--input-border);
  background: var(--input-bg);
  color: var(--text-primary);
  transition: all var(--transition-fast) ease;
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
  margin-bottom: 16px;
}

.generate-btn {
  min-width: 100px;
  border-radius: var(--border-radius-sm);
  transition: all var(--transition-fast) ease;
}

.generate-btn:not(:disabled):hover {
  transform: translateY(-1px);
  box-shadow: var(--shadow-button-hover);
}

.generate-btn:not(:disabled):active {
  transform: scale(0.98);
}

.shortcut-hint {
  font-size: 12px;
  color: var(--text-tertiary);
}

/**
 * 结果区域
 */
.result-section {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--border-default);
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

.result-textarea {
  border-radius: var(--border-radius-sm);
  border-color: var(--input-border);
  background: var(--input-bg);
  color: var(--text-primary);
  font-family: 'Fira Code', 'Consolas', monospace;
  font-size: 13px;
  line-height: 1.6;
}

.result-textarea:focus,
.result-textarea:hover {
  border-color: var(--input-border-focus);
}

.result-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 12px;
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
:deep(.ant-modal-content) {
  background: var(--bg-elevated);
  border-radius: var(--border-radius-md);
  box-shadow: var(--shadow-lg);
}

:deep(.ant-modal-header) {
  background: transparent;
  border-bottom: 1px solid var(--border-default);
}

:deep(.ant-modal-title) {
  color: var(--text-primary);
  font-weight: 600;
}

:deep(.ant-modal-close) {
  color: var(--text-secondary);
}

:deep(.ant-modal-close:hover) {
  color: var(--text-primary);
}

:deep(.ant-alert) {
  border-radius: var(--border-radius-sm);
}

:deep(.ant-tag) {
  border-radius: var(--border-radius-xs);
}
</style>
