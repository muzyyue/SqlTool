<template>
  <Tooltip :title="tooltipContent" :placement="tooltipPlacement">
    <div
      class="ai-status-indicator"
      :class="[`status-${currentStatus}`, `size-${size}`, { clickable: clickable }]"
      @click="handleClick"
    >
      <!-- Loading 状态：显示旋转图标 -->
      <span v-if="currentStatus === 'loading'" class="status-icon spin-icon" :class="statusConfig.icon"></span>

      <!-- 其他状态：显示对应图标 -->
      <span v-else class="status-icon" :class="statusConfig.icon"></span>

      <!-- 状态文字 -->
      <span v-if="showLabel" class="status-label">{{ statusConfig.label }}</span>
    </div>
  </Tooltip>
</template>

<script setup>
/**
 * AiStatusIndicator 组件
 * AI 状态指示器，用于展示 AI 服务的当前状态
 * 支持四种状态：ready(就绪)、loading(加载中)、error(错误)、disabled(禁用)
 *
 * @component
 * @example
 * <!-- 基础用法 -->
 * <AiStatusIndicator />
 *
 * @example
 * <!-- 显示文字标签 -->
 * <AiStatusIndicator show-label />
 *
 * @example
 * <!-- 大尺寸 -->
 * <AiStatusIndicator size="large" show-label />
 *
 * @example
 * <!-- 自定义状态 -->
 * <AiStatusIndicator status="loading" />
 */
import { computed } from 'vue'
import { Tooltip } from 'ant-design-vue'
import { useAiStore, AI_STATUS_CONFIG } from '@/stores/ai.js'

/**
 * AI 状态类型
 * @typedef {'ready' | 'loading' | 'error' | 'disabled'} AiStatus
 */

/**
 * 组件尺寸类型
 * @typedef {'small' | 'default' | 'large'} IndicatorSize
 */

// ===== Props 定义 =====
const props = defineProps({
  /**
   * 是否显示状态文字标签
   * @type {Boolean}
   */
  showLabel: {
    type: Boolean,
    default: false,
  },

  /**
   * 指示器尺寸
   * @type {IndicatorSize}
   */
  size: {
    type: String,
    default: 'default',
    validator: (value) => ['small', 'default', 'large'].includes(value),
  },

  /**
   * 自定义状态（覆盖 Store 状态）
   * @type {AiStatus}
   */
  status: {
    type: String,
    default: null,
    validator: (value) => value === null || ['ready', 'loading', 'error', 'disabled'].includes(value),
  },

  /**
   * 是否可点击切换状态
   * @type {Boolean}
   */
  clickable: {
    type: Boolean,
    default: true,
  },

  /**
   * Tooltip 显示位置
   * @type {String}
   */
  tooltipPlacement: {
    type: String,
    default: 'top',
  },
})

// ===== Emits 定义 =====
const emit = defineEmits([
  /**
   * 状态切换事件
   * @param {AiStatus} newStatus - 新状态
   */
  'toggle',
  /**
   * 点击事件
   * @param {Event} event - 原生点击事件
   */
  'click',
])

// ===== Store =====
const aiStore = useAiStore()

// ===== 计算属性 =====

/**
 * 当前状态（优先使用 props.status，否则使用 store 状态）
 * @returns {AiStatus}
 */
const currentStatus = computed(() => {
  return props.status || aiStore.status
})

/**
 * 当前状态配置
 * @returns {{ color: string, label: string, icon: string, description: string }}
 */
const statusConfig = computed(() => {
  return AI_STATUS_CONFIG[currentStatus.value]
})

/**
 * Tooltip 内容
 * @returns {String}
 */
const tooltipContent = computed(() => {
  const config = statusConfig.value
  let content = config.description

  // 如果有错误信息，追加显示
  if (currentStatus.value === 'error' && aiStore.errorMessage) {
    content += `：${aiStore.errorMessage}`
  }

  // 如果可点击，提示可操作
  if (props.clickable && aiStore.canToggle) {
    content += '（点击切换状态）'
  }

  return content
})

// ===== 方法 =====

/**
 * 处理点击事件
 * @param {Event} event - 原生点击事件
 */
const handleClick = (event) => {
  // 不可点击或正在加载时，不处理
  if (!props.clickable || currentStatus.value === 'loading') {
    return
  }

  // 触发点击事件
  emit('click', event)

  // 切换 Store 状态
  aiStore.toggleEnabled()

  // 触发状态切换事件
  emit('toggle', aiStore.status)
}
</script>

<style scoped>
/**
 * AI 状态指示器容器
 * 使用 CSS 变量实现主题切换
 */
.ai-status-indicator {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  background: var(--bg-glass);
  backdrop-filter: blur(var(--backdrop-blur));
  -webkit-backdrop-filter: blur(var(--backdrop-blur));
  border: 1px solid var(--border-glass-strong);
  border-radius: var(--border-radius-xs);
  font-size: 13px;
  font-weight: 500;
  transition: all var(--transition-fast) ease;
  cursor: default;
  user-select: none;
}

/**
 * 可点击状态
 */
.ai-status-indicator.clickable {
  cursor: pointer;
}

.ai-status-indicator.clickable:hover {
  transform: scale(1.02);
  box-shadow: var(--shadow-sm);
}

.ai-status-indicator.clickable:active {
  transform: scale(0.98);
}

/**
 * 尺寸变体 - small
 */
.ai-status-indicator.size-small {
  padding: 2px 6px;
  font-size: 12px;
  gap: 4px;
}

.ai-status-indicator.size-small .status-icon {
  font-size: 12px;
}

/**
 * 尺寸变体 - default
 */
.ai-status-indicator.size-default .status-icon {
  font-size: 14px;
}

/**
 * 尺寸变体 - large
 */
.ai-status-indicator.size-large {
  padding: 6px 14px;
  font-size: 14px;
  gap: 8px;
}

.ai-status-indicator.size-large .status-icon {
  font-size: 16px;
}

/**
 * 状态图标
 */
.status-icon {
  flex-shrink: 0;
  transition: transform var(--transition-fast) ease;
  display: inline-block;
}

/**
 * 状态文字标签
 */
.status-label {
  color: var(--text-primary);
  line-height: 1;
  white-space: nowrap;
}

/**
 * Loading 状态旋转动画
 */
.spin-icon {
  animation: spin 1s linear infinite;
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
 * Ready 状态 - 绿色
 */
.ai-status-indicator.status-ready {
  background: var(--badge-success-bg);
  border-color: var(--color-success-border);
}

.ai-status-indicator.status-ready .status-icon {
  color: var(--color-success);
}

.ai-status-indicator.status-ready .status-label {
  color: var(--badge-success-text);
}

/**
 * Loading 状态 - 蓝色
 */
.ai-status-indicator.status-loading {
  background: var(--badge-primary-bg);
  border-color: var(--color-primary-border);
}

.ai-status-indicator.status-loading .status-icon {
  color: var(--color-primary);
}

.ai-status-indicator.status-loading .status-label {
  color: var(--badge-primary-text);
}

/**
 * Error 状态 - 红色
 */
.ai-status-indicator.status-error {
  background: var(--badge-error-bg);
  border-color: rgba(255, 77, 79, 0.2);
}

.ai-status-indicator.status-error .status-icon {
  color: var(--color-error);
}

.ai-status-indicator.status-error .status-label {
  color: var(--badge-error-text);
}

/**
 * Disabled 状态 - 灰色
 */
.ai-status-indicator.status-disabled {
  background: var(--bg-sunken);
  border-color: var(--border-default);
  opacity: 0.7;
}

.ai-status-indicator.status-disabled .status-icon {
  color: var(--text-tertiary);
}

.ai-status-indicator.status-disabled .status-label {
  color: var(--text-secondary);
}

/**
 * Hover 效果（仅非 loading 状态）
 */
.ai-status-indicator.clickable:not(.status-loading):hover {
  opacity: 1;
}

.ai-status-indicator.clickable.status-disabled:hover {
  opacity: 0.9;
  border-color: var(--color-primary);
}

.ai-status-indicator.clickable.status-disabled:hover .status-icon {
  color: var(--color-primary);
}
</style>
