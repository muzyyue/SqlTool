<template>
  <div class="sql-ai-assistant">
    <!-- AI 状态检查区域 -->
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
        <template #action>
          <a-button size="small" @click="handleRetry">
            重试
          </a-button>
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
      <!-- 上下文信息展示 -->
      <div class="context-section">
        <div class="context-header">
          <span class="i-carbon-information"></span>
          <span class="context-title">上下文信息</span>
        </div>
        <div class="context-content">
          <div class="context-item">
            <span class="context-label">表名:</span>
            <a-tag color="blue">{{ tableName || '未指定' }}</a-tag>
          </div>
          <div class="context-item">
            <span class="context-label">操作类型:</span>
            <a-tag :color="operationTypeColor">{{ operationType }}</a-tag>
          </div>
          <div class="context-item">
            <span class="context-label">字段数量:</span>
            <span class="context-value">{{ fields.length }}</span>
          </div>
          <div class="context-item">
            <span class="context-label">当前模型:</span>
            <a-tag color="purple">{{ currentModelName }}</a-tag>
          </div>
        </div>
      </div>

      <!-- 功能标签页 -->
      <a-tabs v-model:activeKey="activeTab" class="function-tabs">
        <!-- 自然语言转 SQL -->
        <a-tab-pane key="generate" tab="自然语言转 SQL">
          <div class="tab-content">
            <!-- 输入区域 -->
            <div class="input-section">
              <div class="input-header">
                <span class="input-label">描述您的需求</span>
                <span class="input-hint">使用自然语言描述，AI 将帮您生成 SQL</span>
              </div>
              <a-textarea
                v-model:value="naturalLanguage"
                placeholder="例如：查询所有年龄大于18岁的用户，按创建时间降序排列"
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
                :disabled="!naturalLanguage.trim()"
                class="generate-btn"
                @click="handleGenerateSql"
              >
                <template #icon>
                  <span v-if="!isGenerating" class="i-carbon-magic-wand"></span>
                </template>
                {{ isGenerating ? '生成中...' : '生成 SQL' }}
              </a-button>
            </div>

            <!-- 生成结果区域 -->
            <div v-if="generatedSql" class="result-section">
              <div class="result-header">
                <span class="result-label">生成的 SQL</span>
                <a-space>
                  <a-button type="link" size="small" @click="handleCopySql">
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

              <!-- SQL 编辑器 -->
              <CodeEditor
                v-model="generatedSql"
                language="sql"
                :theme="editorTheme"
                :min-lines="6"
                :max-lines="15"
                placeholder="生成的 SQL 将显示在这里..."
              />

              <!-- SQL 解释 -->
              <div v-if="sqlExplanation" class="explanation-section">
                <div class="explanation-header">
                  <span class="i-carbon-code"></span>
                  <span class="explanation-title">SQL 解释</span>
                </div>
                <div class="explanation-content">{{ sqlExplanation }}</div>
              </div>

              <!-- 应用按钮 -->
              <div class="apply-section">
                <a-button
                  type="primary"
                  :disabled="!generatedSql.trim()"
                  @click="handleApply"
                >
                  <template #icon>
                    <span class="i-carbon-checkmark"></span>
                  </template>
                  应用到目标
                </a-button>
              </div>
            </div>
          </div>
        </a-tab-pane>

        <!-- SQL 优化 -->
        <a-tab-pane key="optimize" tab="SQL 优化">
          <div class="tab-content">
            <!-- SQL 输入区域 -->
            <div class="input-section">
              <div class="input-header">
                <span class="input-label">输入待优化的 SQL</span>
                <span class="input-hint">AI 将分析 SQL 并给出优化建议</span>
              </div>
              <CodeEditor
                v-model="inputSql"
                language="sql"
                :theme="editorTheme"
                :min-lines="4"
                :max-lines="10"
                placeholder="请输入需要优化的 SQL 语句..."
              />
            </div>

            <!-- 分析按钮 -->
            <div class="action-section">
              <a-button
                type="primary"
                :loading="isOptimizing"
                :disabled="!inputSql.trim()"
                class="generate-btn"
                @click="handleOptimizeSql"
              >
                <template #icon>
                  <span v-if="!isOptimizing" class="i-carbon-analytics"></span>
                </template>
                {{ isOptimizing ? '分析中...' : '分析优化' }}
              </a-button>
            </div>

            <!-- 优化结果区域 -->
            <div v-if="optimizationResult" class="result-section">
              <!-- 问题分析 -->
              <div v-if="optimizationResult.problems.length > 0" class="analysis-section">
                <div class="analysis-header">
                  <span class="i-carbon-warning"></span>
                  <span class="analysis-title">问题分析</span>
                </div>
                <ul class="analysis-list">
                  <li v-for="(problem, index) in optimizationResult.problems" :key="index">
                    {{ problem }}
                  </li>
                </ul>
              </div>

              <!-- 优化建议 -->
              <div v-if="optimizationResult.suggestions.length > 0" class="suggestions-section">
                <div class="suggestions-header">
                  <span class="i-carbon-light"></span>
                  <span class="suggestions-title">优化建议</span>
                </div>
                <ul class="suggestions-list">
                  <li v-for="(suggestion, index) in optimizationResult.suggestions" :key="index">
                    {{ suggestion }}
                  </li>
                </ul>
              </div>

              <!-- 优化后 SQL -->
              <div v-if="optimizationResult.optimizedSql" class="optimized-sql-section">
                <div class="result-header">
                  <span class="result-label">优化后的 SQL</span>
                  <a-space>
                    <a-button type="link" size="small" @click="handleCopyOptimizedSql">
                      <template #icon>
                        <span class="i-carbon-copy"></span>
                      </template>
                      复制
                    </a-button>
                    <a-button type="link" size="small" @click="handleClearOptimize">
                      <template #icon>
                        <span class="i-carbon-close"></span>
                      </template>
                      清除
                    </a-button>
                  </a-space>
                </div>
                <CodeEditor
                  v-model="optimizationResult.optimizedSql"
                  language="sql"
                  :theme="editorTheme"
                  :min-lines="4"
                  :max-lines="10"
                  placeholder="优化后的 SQL 将显示在这里..."
                />

                <!-- 应用按钮 -->
                <div class="apply-section">
                  <a-button
                    type="primary"
                    :disabled="!optimizationResult.optimizedSql.trim()"
                    @click="handleApplyOptimized"
                  >
                    <template #icon>
                      <span class="i-carbon-checkmark"></span>
                    </template>
                    应用优化结果
                  </a-button>
                </div>
              </div>
            </div>
          </div>
        </a-tab-pane>
      </a-tabs>

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
</template>

<script setup lang="ts">
/**
 * SqlAiAssistant 组件
 * SQL AI 助手组件，提供自然语言转 SQL 和 SQL 优化功能
 *
 * @component
 * @example
 * <SqlAiAssistant
 *   table-name="users"
 *   :ddl="createTableSql"
 *   operation-type="SELECT"
 *   :fields="fieldList"
 *   @result="handleSqlResult"
 *   @error="handleError"
 * />
 */

import { ref, computed, onMounted } from 'vue'
import { message } from 'ant-design-vue'
import { useAiStore } from '@/stores/ai.js'
import { useThemeStore } from '@/stores/theme.js'
import { getModelManager } from '@/composables/ai/useModelManager'
import type { GenerateOptions } from '@/composables/ai/types'
import CodeEditor from '@/components/common/CodeEditor.vue'

// ==================== 类型定义 ====================

/**
 * 操作类型
 */
type OperationType = 'INSERT' | 'UPDATE' | 'SELECT'

/**
 * 字段信息接口
 */
interface FieldInfo {
  /** 字段名称 */
  name: string
  /** 字段类型 */
  type: string
  /** 字段注释 */
  comment?: string
  /** 是否可空 */
  nullable?: boolean
}

/**
 * 生成错误接口
 */
interface GenerateError {
  message: string
  code?: string
  details?: unknown
}

/**
 * 优化结果接口
 */
interface OptimizationResult {
  /** 问题列表 */
  problems: string[]
  /** 优化建议列表 */
  suggestions: string[]
  /** 优化后的 SQL */
  optimizedSql: string
}

// ==================== Props 定义 ====================

const props = withDefaults(
  defineProps<{
    /** 表名 */
    tableName: string
    /** DDL 语句 */
    ddl: string
    /** 操作类型 */
    operationType: OperationType
    /** 字段列表 */
    fields: FieldInfo[]
  }>(),
  {
    tableName: '',
    ddl: '',
    operationType: 'SELECT',
    fields: () => [],
  }
)

// ==================== Emits 定义 ====================

const emit = defineEmits<{
  /** 生成结果事件 */
  result: [sql: string]
  /** 错误事件 */
  error: [error: Error]
}>()

// ==================== Store & Composables ====================

/** AI Store 实例 */
const aiStore = useAiStore()

/** 主题 Store 实例 */
const themeStore = useThemeStore()

/** 模型管理器实例 */
const modelManager = getModelManager()

// ==================== 响应式状态 ====================

/** 当前激活的标签页 */
const activeTab = ref<'generate' | 'optimize'>('generate')

/** 自然语言输入 */
const naturalLanguage = ref('')

/** 待优化的 SQL */
const inputSql = ref('')

/** 生成的 SQL */
const generatedSql = ref('')

/** SQL 解释 */
const sqlExplanation = ref('')

/** 优化结果 */
const optimizationResult = ref<OptimizationResult | null>(null)

/** 是否正在生成 SQL */
const isGenerating = ref(false)

/** 是否正在优化 SQL */
const isOptimizing = ref(false)

/** 是否正在检查 AI 状态 */
const isCheckingAi = ref(false)

/** AI 错误信息 */
const aiError = ref<string | null>(null)

/** 生成错误信息 */
const generateError = ref<GenerateError | null>(null)

// ==================== 计算属性 ====================

/**
 * AI 是否就绪
 */
const isAiReady = computed(() => {
  return aiStore.canUseAi && !aiError.value
})

/**
 * AI 错误标题
 */
const aiErrorTitle = computed(() => {
  if (!aiStore.isEnabled) {
    return 'AI 功能未启用'
  }
  if (aiStore.lastError) {
    return 'AI 服务不可用'
  }
  return 'AI 服务异常'
})

/**
 * 操作类型对应的标签颜色
 */
const operationTypeColor = computed(() => {
  const colorMap: Record<OperationType, string> = {
    SELECT: 'green',
    INSERT: 'blue',
    UPDATE: 'orange',
  }
  return colorMap[props.operationType] || 'default'
})

/**
 * 编辑器主题
 */
const editorTheme = computed(() => {
  return themeStore.isDark ? 'dark' : 'light'
})

/**
 * 当前模型名称
 */
const currentModelName = computed(() => {
  return modelManager.currentModelName.value || '未知模型'
})

// ==================== 方法定义 ====================

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
 * 重试检查 AI 可用性
 */
const handleRetry = async (): Promise<void> => {
  await checkAiAvailability()
}

/**
 * 构建生成 SQL 的 Prompt
 * @param userInput - 用户输入的自然语言
 * @returns 完整的 Prompt
 */
const buildGeneratePrompt = (userInput: string): string => {
  const parts: string[] = []

  // 添加角色定义
  parts.push('你是一个 SQL 专家，请根据以下信息生成 SQL 语句。')
  parts.push('')

  // 添加表信息
  if (props.tableName) {
    parts.push(`表名: ${props.tableName}`)
  }

  // 添加操作类型
  parts.push(`操作类型: ${props.operationType}`)
  parts.push('')

  // 添加 DDL 结构
  if (props.ddl) {
    parts.push('DDL 结构:')
    parts.push('```sql')
    parts.push(props.ddl)
    parts.push('```')
    parts.push('')
  }

  // 添加字段列表
  if (props.fields.length > 0) {
    parts.push('字段列表:')
    props.fields.forEach((field) => {
      let fieldDesc = `- ${field.name} (${field.type})`
      if (field.comment) {
        fieldDesc += ` - ${field.comment}`
      }
      if (field.nullable !== undefined) {
        fieldDesc += field.nullable ? ' [可空]' : ' [非空]'
      }
      parts.push(fieldDesc)
    })
    parts.push('')
  }

  // 添加用户需求
  parts.push('用户需求:')
  parts.push(userInput)
  parts.push('')

  // 添加输出要求
  parts.push('输出要求:')
  parts.push('1. 只输出 SQL 语句，不要添加额外的解释或说明')
  parts.push('2. SQL 语句使用标准 SQL 语法')
  parts.push('3. 如果是 SELECT 语句，只查询必要的字段')
  parts.push('4. 如果是 INSERT 语句，确保字段和值一一对应')
  parts.push('5. 如果是 UPDATE 语句，确保 WHERE 条件合理')

  return parts.join('\n')
}

/**
 * 构建优化 SQL 的 Prompt
 * @param sql - 待优化的 SQL
 * @returns 完整的 Prompt
 */
const buildOptimizePrompt = (sql: string): string => {
  const parts: string[] = []

  // 添加角色定义
  parts.push('你是一个 SQL 优化专家，请分析以下 SQL 并给出优化建议。')
  parts.push('')

  // 添加表信息
  if (props.tableName) {
    parts.push(`表名: ${props.tableName}`)
  }

  // 添加 DDL 结构
  if (props.ddl) {
    parts.push('DDL 结构:')
    parts.push('```sql')
    parts.push(props.ddl)
    parts.push('```')
    parts.push('')
  }

  // 添加原始 SQL
  parts.push('原始 SQL:')
  parts.push('```sql')
  parts.push(sql)
  parts.push('```')
  parts.push('')

  // 添加输出要求
  parts.push('请按以下格式输出:')
  parts.push('')
  parts.push('## 问题分析')
  parts.push('- 问题1')
  parts.push('- 问题2')
  parts.push('')
  parts.push('## 优化建议')
  parts.push('- 建议1')
  parts.push('- 建议2')
  parts.push('')
  parts.push('## 优化后 SQL')
  parts.push('```sql')
  parts.push('优化后的 SQL 语句')
  parts.push('```')

  return parts.join('\n')
}

/**
 * 从 Markdown 中提取 SQL
 * @param content - Markdown 内容
 * @returns 提取的 SQL
 */
const extractSqlFromMarkdown = (content: string): string => {
  // 尝试匹配 ```sql ... ``` 代码块
  const sqlBlockMatch = content.match(/```sql\s*([\s\S]*?)```/i)
  if (sqlBlockMatch) {
    return sqlBlockMatch[1].trim()
  }

  // 尝试匹配 ``` ... ``` 代码块
  const codeBlockMatch = content.match(/```\s*([\s\S]*?)```/)
  if (codeBlockMatch) {
    return codeBlockMatch[1].trim()
  }

  // 如果没有代码块，返回原内容
  return content.trim()
}

/**
 * 解析优化结果
 * @param content - AI 返回的内容
 * @returns 解析后的优化结果
 */
const parseOptimizationResult = (content: string): OptimizationResult => {
  const result: OptimizationResult = {
    problems: [],
    suggestions: [],
    optimizedSql: '',
  }

  // 解析问题分析
  const problemsMatch = content.match(/##\s*问题分析\s*([\s\S]*?)(?=##|$)/i)
  if (problemsMatch) {
    const problems = problemsMatch[1]
      .split('\n')
      .filter((line) => line.trim().startsWith('-'))
      .map((line) => line.replace(/^-\s*/, '').trim())
    result.problems = problems
  }

  // 解析优化建议
  const suggestionsMatch = content.match(/##\s*优化建议\s*([\s\S]*?)(?=##|$)/i)
  if (suggestionsMatch) {
    const suggestions = suggestionsMatch[1]
      .split('\n')
      .filter((line) => line.trim().startsWith('-'))
      .map((line) => line.replace(/^-\s*/, '').trim())
    result.suggestions = suggestions
  }

  // 解析优化后 SQL
  const optimizedSqlMatch = content.match(/##\s*优化后\s*SQL\s*```sql\s*([\s\S]*?)```/i)
  if (optimizedSqlMatch) {
    result.optimizedSql = optimizedSqlMatch[1].trim()
  }

  return result
}

/**
 * 处理生成 SQL 操作
 */
const handleGenerateSql = async (): Promise<void> => {
  // 验证输入
  if (!naturalLanguage.value.trim()) {
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
  generatedSql.value = ''
  sqlExplanation.value = ''

  try {
    // 构建提示词
    const prompt = buildGeneratePrompt(naturalLanguage.value)

    // 调用 AI 生成
    const options: GenerateOptions = {
      maxTokens: 2000,
      temperature: 0.3, // 降低温度以获得更精确的 SQL
    }

    const response = await modelManager.generate(prompt, options)

    if (response.content) {
      // 提取 SQL
      generatedSql.value = extractSqlFromMarkdown(response.content)
      message.success('SQL 生成成功')
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
    emit('error', err)
  } finally {
    isGenerating.value = false
  }
}

/**
 * 处理优化 SQL 操作
 */
const handleOptimizeSql = async (): Promise<void> => {
  // 验证输入
  if (!inputSql.value.trim()) {
    message.warning('请输入需要优化的 SQL')
    return
  }

  // 验证 AI 可用性
  if (!isAiReady.value) {
    message.warning('AI 服务不可用，请稍后重试')
    return
  }

  isOptimizing.value = true
  generateError.value = null
  optimizationResult.value = null

  try {
    // 构建提示词
    const prompt = buildOptimizePrompt(inputSql.value)

    // 调用 AI 生成
    const options: GenerateOptions = {
      maxTokens: 3000,
      temperature: 0.3,
    }

    const response = await modelManager.generate(prompt, options)

    if (response.content) {
      // 解析优化结果
      optimizationResult.value = parseOptimizationResult(response.content)
      message.success('SQL 分析完成')
    } else {
      throw new Error('分析结果为空，请重试')
    }
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error))
    generateError.value = {
      message: err.message,
      code: 'OPTIMIZE_ERROR',
      details: error,
    }
    emit('error', err)
  } finally {
    isOptimizing.value = false
  }
}

/**
 * 复制 SQL 到剪贴板
 */
const handleCopySql = async (): Promise<void> => {
  try {
    await navigator.clipboard.writeText(generatedSql.value)
    message.success('已复制到剪贴板')
  } catch {
    message.error('复制失败，请手动复制')
  }
}

/**
 * 复制优化后的 SQL 到剪贴板
 */
const handleCopyOptimizedSql = async (): Promise<void> => {
  try {
    if (optimizationResult.value?.optimizedSql) {
      await navigator.clipboard.writeText(optimizationResult.value.optimizedSql)
      message.success('已复制到剪贴板')
    }
  } catch {
    message.error('复制失败，请手动复制')
  }
}

/**
 * 清除生成结果
 */
const handleClearGenerate = (): void => {
  generatedSql.value = ''
  sqlExplanation.value = ''
}

/**
 * 清除优化结果
 */
const handleClearOptimize = (): void => {
  optimizationResult.value = null
}

/**
 * 应用生成的 SQL
 */
const handleApply = (): void => {
  if (!generatedSql.value.trim()) {
    message.warning('没有可应用的 SQL')
    return
  }

  emit('result', generatedSql.value)
  message.success('SQL 已应用')
}

/**
 * 应用优化后的 SQL
 */
const handleApplyOptimized = (): void => {
  if (!optimizationResult.value?.optimizedSql?.trim()) {
    message.warning('没有可应用的优化 SQL')
    return
  }

  emit('result', optimizationResult.value.optimizedSql)
  message.success('优化 SQL 已应用')
}

// ==================== 生命周期 ====================

/**
 * 组件挂载时检查 AI 可用性
 */
onMounted(async () => {
  if (aiStore.isEnabled) {
    await checkAiAvailability()
  }
})
</script>

<style scoped>
/**
 * SQL AI 助手容器
 */
.sql-ai-assistant {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px;
  background: var(--bg-glass);
  backdrop-filter: blur(var(--backdrop-blur, 20px));
  -webkit-backdrop-filter: blur(var(--backdrop-blur, 20px));
  border: 1px solid var(--border-glass);
  border-radius: var(--border-radius-md, 12px);
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
  padding: 12px 16px;
  background: var(--bg-elevated);
  border: 1px solid var(--border-default);
  border-radius: var(--border-radius-sm, 4px);
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
 * 功能标签页
 */
.function-tabs {
  margin-top: 8px;
}

.tab-content {
  padding: 16px 0;
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
  border-radius: var(--border-radius-sm, 4px);
  border-color: var(--input-border);
  background: var(--input-bg);
  color: var(--text-primary);
  transition: all var(--transition-fast, 120ms) ease;
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
  min-width: 120px;
  border-radius: var(--border-radius-sm, 4px);
  transition: all var(--transition-fast, 120ms) ease;
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
  padding-top: 16px;
  border-top: 1px solid var(--border-default);
}

.result-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.result-label {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
}

/**
 * SQL 解释区域
 */
.explanation-section {
  margin-top: 16px;
  padding: 12px 16px;
  background: var(--bg-elevated);
  border: 1px solid var(--border-default);
  border-radius: var(--border-radius-sm, 4px);
}

.explanation-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  font-weight: 500;
  color: var(--text-primary);
}

.explanation-header .i-carbon-code {
  font-size: 16px;
  color: var(--color-primary);
}

.explanation-title {
  font-size: 14px;
}

.explanation-content {
  font-size: 13px;
  line-height: 1.6;
  color: var(--text-secondary);
}

/**
 * 应用按钮区域
 */
.apply-section {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}

/**
 * 分析区域
 */
.analysis-section {
  margin-bottom: 16px;
  padding: 12px 16px;
  background: rgba(255, 77, 79, 0.1);
  border: 1px solid rgba(255, 77, 79, 0.3);
  border-radius: var(--border-radius-sm, 4px);
}

.analysis-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  font-weight: 500;
  color: var(--text-primary);
}

.analysis-header .i-carbon-warning {
  font-size: 16px;
  color: #ff4d4f;
}

.analysis-title {
  font-size: 14px;
}

.analysis-list {
  margin: 0;
  padding-left: 20px;
  font-size: 13px;
  line-height: 1.8;
  color: var(--text-secondary);
}

/**
 * 优化建议区域
 */
.suggestions-section {
  margin-bottom: 16px;
  padding: 12px 16px;
  background: rgba(24, 144, 255, 0.1);
  border: 1px solid rgba(24, 144, 255, 0.3);
  border-radius: var(--border-radius-sm, 4px);
}

.suggestions-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  font-weight: 500;
  color: var(--text-primary);
}

.suggestions-header .i-carbon-light {
  font-size: 16px;
  color: #1890ff;
}

.suggestions-title {
  font-size: 14px;
}

.suggestions-list {
  margin: 0;
  padding-left: 20px;
  font-size: 13px;
  line-height: 1.8;
  color: var(--text-secondary);
}

/**
 * 优化后 SQL 区域
 */
.optimized-sql-section {
  margin-top: 16px;
}

/**
 * 错误提示
 */
.error-alert {
  margin-top: 16px;
  border-radius: var(--border-radius-sm, 4px);
}

/**
 * 全局样式覆盖
 */
:deep(.ant-tabs-tab) {
  color: var(--text-secondary);
  font-weight: 500;
}

:deep(.ant-tabs-tab-active) {
  color: var(--color-primary);
}

:deep(.ant-tabs-ink-bar) {
  background-color: var(--color-primary);
}

:deep(.ant-tag) {
  border-radius: var(--border-radius-xs, 4px);
}

:deep(.ant-btn-primary) {
  background-color: var(--color-primary);
  border-color: var(--color-primary);
}

:deep(.ant-btn-primary:hover) {
  background-color: var(--color-primary-hover);
  border-color: var(--color-primary-hover);
}

:deep(.ant-alert) {
  border-radius: var(--border-radius-sm, 4px);
}

/**
 * 响应式设计
 */
@media (max-width: 768px) {
  .sql-ai-assistant {
    padding: 12px;
  }

  .context-content {
    flex-direction: column;
    gap: 8px;
  }

  .input-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }

  .action-section {
    flex-direction: column;
  }

  .generate-btn {
    width: 100%;
  }
}
</style>
