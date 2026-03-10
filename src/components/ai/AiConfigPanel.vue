<template>
  <div class="ai-config-panel">
    <!-- AI 功能总开关与状态 -->
    <div class="config-section status-section">
      <div class="section-header">
        <div class="header-left">
          <span class="section-icon i-carbon-machine-learning-model"></span>
          <h3 class="section-title">AI 功能</h3>
        </div>
        <div class="header-right">
          <a-switch
            v-model:checked="aiEnabled"
            :loading="aiStore.isLoading"
            checked-children="启用"
            un-checked-children="禁用"
            @change="handleAiEnabledChange"
          />
        </div>
      </div>

      <!-- AI 状态提示 -->
      <a-alert
        :type="statusAlertType"
        :message="statusAlertMessage"
        show-icon
        class="status-alert"
      >
        <template #icon>
          <span :class="statusIconClass"></span>
        </template>
      </a-alert>
    </div>

    <!-- API 配置区域 -->
    <div class="config-section api-section">
      <div class="section-header">
        <span class="section-icon i-carbon-api"></span>
        <h3 class="section-title">API 配置</h3>
      </div>

      <!-- OpenAI 配置 -->
      <div class="provider-config">
        <div class="provider-header">
          <span class="provider-icon i-carbon-chat"></span>
          <span class="provider-name">OpenAI</span>
          <a-switch
            v-model:checked="providerStates.openai.enabled"
            size="small"
            @change="handleProviderEnableChange('openai')"
          />
        </div>
        <a-form layout="vertical" class="provider-form" v-if="providerStates.openai.enabled">
          <a-form-item label="API Key">
            <a-input-password
              v-model:value="providerStates.openai.apiKey"
              placeholder="sk-..."
              @blur="handleApiKeyChange('openai')"
            />
          </a-form-item>
          <a-form-item label="模型">
            <a-select
              v-model:value="providerStates.openai.model"
              :options="openaiModelOptions"
              @change="handleModelChange('openai')"
            />
          </a-form-item>
          <a-form-item label="API 地址">
            <a-input
              v-model:value="providerStates.openai.baseUrl"
              placeholder="https://api.openai.com/v1"
              @blur="handleBaseUrlChange('openai')"
            />
          </a-form-item>
        </a-form>
      </div>

      <a-divider />

      <!-- Anthropic 配置 -->
      <div class="provider-config">
        <div class="provider-header">
          <span class="provider-icon i-carbon-chat-bot"></span>
          <span class="provider-name">Anthropic</span>
          <a-switch
            v-model:checked="providerStates.anthropic.enabled"
            size="small"
            @change="handleProviderEnableChange('anthropic')"
          />
        </div>
        <a-form layout="vertical" class="provider-form" v-if="providerStates.anthropic.enabled">
          <a-form-item label="API Key">
            <a-input-password
              v-model:value="providerStates.anthropic.apiKey"
              placeholder="sk-ant-..."
              @blur="handleApiKeyChange('anthropic')"
            />
          </a-form-item>
          <a-form-item label="模型">
            <a-select
              v-model:value="providerStates.anthropic.model"
              :options="anthropicModelOptions"
              @change="handleModelChange('anthropic')"
            />
          </a-form-item>
          <a-form-item label="API 地址">
            <a-input
              v-model:value="providerStates.anthropic.baseUrl"
              placeholder="https://api.anthropic.com/v1"
              @blur="handleBaseUrlChange('anthropic')"
            />
          </a-form-item>
        </a-form>
      </div>

      <a-divider />

      <!-- 自定义 API 配置 -->
      <div class="provider-config">
        <div class="provider-header">
          <span class="provider-icon i-carbon-settings-adjust"></span>
          <span class="provider-name">自定义 API</span>
          <a-switch
            v-model:checked="providerStates.custom.enabled"
            size="small"
            @change="handleProviderEnableChange('custom')"
          />
        </div>
        <a-form layout="vertical" class="provider-form" v-if="providerStates.custom.enabled">
          <a-form-item label="API Key">
            <a-input-password
              v-model:value="providerStates.custom.apiKey"
              placeholder="输入 API Key"
              @blur="handleApiKeyChange('custom')"
            />
          </a-form-item>
          <a-form-item label="模型名称">
            <a-input
              v-model:value="providerStates.custom.model"
              placeholder="输入模型名称"
              @blur="handleModelChange('custom')"
            />
          </a-form-item>
          <a-form-item label="API 地址">
            <a-input
              v-model:value="providerStates.custom.baseUrl"
              placeholder="输入 API 基础地址"
              @blur="handleBaseUrlChange('custom')"
            />
          </a-form-item>
        </a-form>
      </div>
    </div>

    <!-- 本地模型配置区域 -->
    <div class="config-section local-section">
      <div class="section-header">
        <span class="section-icon i-carbon-chip"></span>
        <h3 class="section-title">本地模型</h3>
        <a-tag v-if="localModelEnabled" color="success" class="local-tag">已启用</a-tag>
      </div>

      <a-form layout="vertical" class="local-form">
        <a-form-item label="启用本地模型">
          <a-switch
            v-model:checked="localModelEnabled"
            checked-children="启用"
            un-checked-children="禁用"
            @change="handleLocalModelEnableChange"
          />
          <div class="form-hint">
            本地模型在浏览器中运行，无需网络连接，但性能较低
          </div>
        </a-form-item>

        <a-form-item label="模型选择" v-if="localModelEnabled">
          <a-select
            v-model:value="localModelState.modelId"
            :options="localModelOptions"
            @change="handleLocalModelChange"
          />
          <div class="form-hint">
            选择适合您设备的模型，较大的模型效果更好但需要更多内存
          </div>
        </a-form-item>

        <a-form-item label="量化模式" v-if="localModelEnabled">
          <a-switch
            v-model:checked="localModelState.quantized"
            checked-children="开启"
            un-checked-children="关闭"
            @change="handleLocalModelChange"
          />
          <div class="form-hint">
            量化可以显著减少内存占用，但可能略微降低输出质量
          </div>
        </a-form-item>
      </a-form>
    </div>

    <!-- 操作按钮区域 -->
    <div class="config-actions">
      <a-button @click="handleReset">
        <template #icon>
          <span class="i-carbon-reset"></span>
        </template>
        重置配置
      </a-button>
      <a-button type="primary" @click="handleSave">
        <template #icon>
          <span class="i-carbon-save"></span>
        </template>
        保存配置
      </a-button>
    </div>
  </div>
</template>

<script setup>
/**
 * AiConfigPanel 组件
 * AI 配置面板，用于管理 AI 功能的全局配置
 * 包括 API Key 配置、本地模型配置、AI 功能开关等
 *
 * @component
 * @example
 * <AiConfigPanel />
 */

import { ref, reactive, computed, onMounted } from 'vue'
import { message, Modal } from 'ant-design-vue'
import { useAiStore, AI_STATUS_CONFIG } from '@/stores/ai.js'
import { useAiConfig } from '@/composables/ai/useAiConfig'

// ==================== Store & Composable ====================

/** AI Store 实例 */
const aiStore = useAiStore()

/** AI 配置管理实例 */
const aiConfig = useAiConfig()

// ==================== 响应式状态 ====================

/** AI 功能是否启用 */
const aiEnabled = ref(aiStore.isEnabled)

/** 提供商状态 */
const providerStates = reactive({
  openai: {
    enabled: false,
    apiKey: '',
    model: 'gpt-4o-mini',
    baseUrl: 'https://api.openai.com/v1',
  },
  anthropic: {
    enabled: false,
    apiKey: '',
    model: 'claude-3-haiku-20240307',
    baseUrl: 'https://api.anthropic.com/v1',
  },
  custom: {
    enabled: false,
    apiKey: '',
    model: '',
    baseUrl: '',
  },
})

/** 本地模型启用状态 */
const localModelEnabled = ref(false)

/** 本地模型状态 */
const localModelState = reactive({
  enabled: false,
  modelId: 'Xenova/Qwen2.5-0.5B-Instruct',
  quantized: true,
})

// ==================== 模型选项配置 ====================

/** OpenAI 模型选项 */
const openaiModelOptions = [
  { label: 'GPT-4o', value: 'gpt-4o' },
  { label: 'GPT-4o Mini', value: 'gpt-4o-mini' },
  { label: 'GPT-4 Turbo', value: 'gpt-4-turbo' },
  { label: 'GPT-3.5 Turbo', value: 'gpt-3.5-turbo' },
]

/** Anthropic 模型选项 */
const anthropicModelOptions = [
  { label: 'Claude 3 Opus', value: 'claude-3-opus-20240229' },
  { label: 'Claude 3 Sonnet', value: 'claude-3-sonnet-20240229' },
  { label: 'Claude 3 Haiku', value: 'claude-3-haiku-20240307' },
]

/** 本地模型选项 */
const localModelOptions = [
  { label: 'Qwen2.5-0.5B-Instruct (推荐)', value: 'Xenova/Qwen2.5-0.5B-Instruct' },
  { label: 'Qwen2.5-1.5B-Instruct', value: 'Xenova/Qwen2.5-1.5B-Instruct' },
  { label: 'Phi-3-mini-4k-instruct', value: 'Xenova/Phi-3-mini-4k-instruct' },
  { label: 'TinyLlama-1.1B-Chat-v1.0', value: 'Xenova/TinyLlama-1.1B-Chat-v1.0' },
]

// ==================== 计算属性 ====================

/**
 * 状态提示类型
 * 根据 AI 状态返回对应的 Alert 类型
 * @returns {'success' | 'info' | 'warning' | 'error'}
 */
const statusAlertType = computed(() => {
  const status = aiStore.status
  const typeMap = {
    ready: 'success',
    loading: 'info',
    error: 'error',
    disabled: 'warning',
  }
  return typeMap[status] || 'info'
})

/**
 * 状态提示消息
 * @returns {string}
 */
const statusAlertMessage = computed(() => {
  const status = aiStore.status
  const config = AI_STATUS_CONFIG[status]
  let msg = config.description

  // 如果有错误信息，追加显示
  if (status === 'error' && aiStore.errorMessage) {
    msg += `：${aiStore.errorMessage}`
  }

  return msg
})

/**
 * 状态图标类名
 * @returns {string}
 */
const statusIconClass = computed(() => {
  const status = aiStore.status
  const config = AI_STATUS_CONFIG[status]
  return config.icon
})

// ==================== 方法定义 ====================

/**
 * 初始化配置状态
 * 从 Store 和 Composable 加载当前配置
 */
const initConfig = () => {
  // 同步 AI 启用状态
  aiEnabled.value = aiStore.isEnabled

  // 同步提供商配置
  const config = aiConfig.config.value
  for (const provider of ['openai', 'anthropic', 'custom']) {
    const p = config.providers[provider]
    providerStates[provider] = {
      enabled: p.enabled,
      apiKey: p.apiKey,
      model: p.model,
      baseUrl: p.baseUrl,
    }
  }

  // 同步本地模型配置
  localModelEnabled.value = config.localModel.enabled
  localModelState.enabled = config.localModel.enabled
  localModelState.modelId = config.localModel.modelId
  localModelState.quantized = config.localModel.quantized
}

/**
 * 处理 AI 功能启用状态变更
 * @param {boolean} checked - 是否启用
 */
const handleAiEnabledChange = async (checked) => {
  if (checked) {
    await aiStore.enable()
  } else {
    aiStore.disable()
  }
}

/**
 * 处理提供商启用状态变更
 * @param {'openai' | 'anthropic' | 'custom'} provider - 提供商名称
 */
const handleProviderEnableChange = (provider) => {
  const state = providerStates[provider]
  // 如果启用但没有 API Key，提示用户输入
  if (state.enabled && !state.apiKey) {
    const providerName =
      provider === 'openai' ? 'OpenAI' : provider === 'anthropic' ? 'Anthropic' : '自定义'
    message.info(`请输入 ${providerName} 的 API Key`)
  }
  // 更新配置
  if (state.apiKey) {
    aiConfig.setApiKey(provider, state.apiKey)
  }
}

/**
 * 处理 API Key 变更
 * @param {'openai' | 'anthropic' | 'custom'} provider - 提供商名称
 */
const handleApiKeyChange = (provider) => {
  const apiKey = providerStates[provider].apiKey
  aiConfig.setApiKey(provider, apiKey)

  // 如果有 API Key，自动启用该提供商
  if (apiKey) {
    providerStates[provider].enabled = true
  }

  // 重新检查可用性
  if (aiEnabled.value) {
    aiStore.checkAvailability()
  }
}

/**
 * 处理模型变更
 * @param {'openai' | 'anthropic' | 'custom'} provider - 提供商名称
 */
const handleModelChange = (provider) => {
  const model = providerStates[provider].model
  aiConfig.setModel(provider, model)
}

/**
 * 处理 Base URL 变更
 * @param {'openai' | 'anthropic' | 'custom'} provider - 提供商名称
 */
const handleBaseUrlChange = (provider) => {
  const baseUrl = providerStates[provider].baseUrl
  aiConfig.setBaseUrl(provider, baseUrl)
}

/**
 * 处理本地模型启用状态变更
 * @param {boolean} enabled - 是否启用
 */
const handleLocalModelEnableChange = (enabled) => {
  localModelState.enabled = enabled
  aiConfig.setLocalModelConfig(localModelState.modelId, localModelState.quantized)

  // 重新检查可用性
  if (aiEnabled.value) {
    aiStore.checkAvailability()
  }
}

/**
 * 处理本地模型配置变更
 */
const handleLocalModelChange = () => {
  aiConfig.setLocalModelConfig(localModelState.modelId, localModelState.quantized)

  // 重新检查可用性
  if (aiEnabled.value) {
    aiStore.checkAvailability()
  }
}

/**
 * 保存配置
 */
const handleSave = () => {
  // 保存提供商配置
  for (const provider of ['openai', 'anthropic', 'custom']) {
    const state = providerStates[provider]
    if (state.apiKey) {
      aiConfig.setApiKey(provider, state.apiKey)
    }
    aiConfig.setModel(provider, state.model)
    aiConfig.setBaseUrl(provider, state.baseUrl)
  }

  // 保存本地模型配置
  aiConfig.setLocalModelConfig(localModelState.modelId, localModelState.quantized)

  message.success('配置已保存')

  // 重新检查可用性
  if (aiEnabled.value) {
    aiStore.checkAvailability()
  }
}

/**
 * 重置配置
 */
const handleReset = () => {
  Modal.confirm({
    title: '确认重置',
    content: '确定要重置所有 AI 配置吗？这将清除所有 API Key 和模型设置。',
    okText: '确认重置',
    cancelText: '取消',
    okType: 'danger',
    onOk: () => {
      // 重置配置
      aiConfig.resetConfig()

      // 重置本地状态
      providerStates.openai = {
        enabled: false,
        apiKey: '',
        model: 'gpt-4o-mini',
        baseUrl: 'https://api.openai.com/v1',
      }
      providerStates.anthropic = {
        enabled: false,
        apiKey: '',
        model: 'claude-3-haiku-20240307',
        baseUrl: 'https://api.anthropic.com/v1',
      }
      providerStates.custom = {
        enabled: false,
        apiKey: '',
        model: '',
        baseUrl: '',
      }
      localModelEnabled.value = true
      localModelState.enabled = true
      localModelState.modelId = 'Xenova/Qwen2.5-0.5B-Instruct'
      localModelState.quantized = true

      // 禁用 AI 功能
      aiStore.disable()

      message.success('配置已重置')
    },
  })
}

// ==================== 生命周期 ====================

onMounted(() => {
  initConfig()
})
</script>

<style scoped>
/**
 * AI 配置面板容器
 * 使用 CSS 变量实现主题切换
 */
.ai-config-panel {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 20px;
  max-height: 70vh;
  overflow-y: auto;
}

/**
 * 配置区域通用样式
 */
.config-section {
  background: var(--bg-glass);
  backdrop-filter: blur(var(--backdrop-blur));
  -webkit-backdrop-filter: blur(var(--backdrop-blur));
  border: 1px solid var(--border-glass-strong);
  border-radius: var(--border-radius-md);
  padding: 20px;
  transition: all var(--transition-normal) ease;
}

.config-section:hover {
  box-shadow: var(--shadow-sm);
}

/**
 * 区域头部样式
 */
.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.section-icon {
  font-size: 20px;
  color: var(--color-primary);
}

.section-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}

/**
 * 状态提示样式
 */
.status-alert {
  margin-top: 12px;
}

/**
 * 提供商配置样式
 */
.provider-config {
  margin-bottom: 16px;
}

.provider-config:last-child {
  margin-bottom: 0;
}

.provider-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px;
  background: var(--interactive-hover);
  border-radius: var(--border-radius-sm);
  transition: background var(--transition-fast) ease;
}

.provider-header:hover {
  background: var(--interactive-active);
}

.provider-icon {
  font-size: 18px;
  color: var(--color-primary);
}

.provider-name {
  flex: 1;
  font-weight: 500;
  color: var(--text-primary);
}

.provider-form {
  margin-top: 16px;
  padding-left: 12px;
}

/**
 * 本地模型配置样式
 */
.local-tag {
  margin-left: auto;
}

.local-form {
  margin-top: 16px;
}

/**
 * 表单提示样式
 */
.form-hint {
  margin-top: 4px;
  font-size: 12px;
  color: var(--text-tertiary);
}

/**
 * 操作按钮区域
 */
.config-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding-top: 16px;
  border-top: 1px solid var(--border-default);
}

/**
 * 分隔线样式
 */
:deep(.ant-divider) {
  margin: 16px 0;
  border-color: var(--border-default);
}

/**
 * 表单项样式覆盖
 */
:deep(.ant-form-item) {
  margin-bottom: 16px;
}

:deep(.ant-form-item:last-child) {
  margin-bottom: 0;
}

:deep(.ant-form-item-label > label) {
  color: var(--text-secondary);
  font-size: 13px;
}

/**
 * 输入框样式覆盖
 */
:deep(.ant-input),
:deep(.ant-input-password),
:deep(.ant-select) {
  background: var(--input-bg);
  border-color: var(--input-border);
}

:deep(.ant-input:hover),
:deep(.ant-input-password:hover),
:deep(.ant-select:hover) {
  border-color: var(--input-border-hover);
}

:deep(.ant-input:focus),
:deep(.ant-input-password:focus),
:deep(.ant-select-focused) {
  border-color: var(--input-border-focus);
}

/**
 * 开关样式覆盖
 */
:deep(.ant-switch-checked) {
  background-color: var(--color-primary);
}

/**
 * 按钮样式覆盖
 */
:deep(.ant-btn-primary) {
  background-color: var(--color-primary);
  border-color: var(--color-primary);
}

:deep(.ant-btn-primary:hover) {
  background-color: var(--color-primary-hover);
  border-color: var(--color-primary-hover);
}

/**
 * 响应式设计
 */
@media (max-width: 768px) {
  .ai-config-panel {
    padding: 16px;
    gap: 16px;
  }

  .config-section {
    padding: 16px;
  }

  .config-actions {
    flex-direction: column;
  }

  .config-actions .ant-btn {
    width: 100%;
  }
}
</style>
