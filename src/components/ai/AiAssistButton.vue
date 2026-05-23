<template>
  <Tooltip :title="computedTooltip" :placement="'top'">
    <Button
      :type="type"
      :size="size"
      :disabled="isButtonDisabled"
      :loading="isButtonLoading"
      :class="['ai-assist-button', { 'ai-assist-button--disabled': isButtonDisabled }]"
      @click="handleClick"
    >
      <template #icon>
        <slot name="icon">
          <span class="i-carbon-cube ai-assist-button__icon" />
        </slot>
      </template>
      <slot>
        AI 助手
      </slot>
    </Button>
  </Tooltip>
</template>

<script setup lang="ts">
/**
 * AiAssistButton 组件
 * AI 辅助功能按钮，集成 AI Store 实现状态感知
 *
 * @component
 * @example
 * <!-- 基础用法 -->
 * <AiAssistButton @click="handleAiAssist" />
 *
 * @example
 * <!-- 主要按钮 -->
 * <AiAssistButton type="primary" @click="handleAiAssist">
 *   智能填充
 * </AiAssistButton>
 *
 * @example
 * <!-- 自定义图标 -->
 * <AiAssistButton @click="handleAiAssist">
 *   <template #icon>
 *     <span class="i-carbon-magic-wand" />
 *   </template>
 *   AI 生成
 * </AiAssistButton>
 */

import { computed } from 'vue'
import { Button, Tooltip } from 'ant-design-vue'
import { useAiStore } from '@/stores/ai.js'

// ===== 类型定义 =====

/**
 * 按钮类型
 */
type ButtonType = 'primary' | 'default' | 'text'

/**
 * 按钮尺寸
 */
type ButtonSize = 'small' | 'default' | 'large'

// ===== Props 定义 =====

interface Props {
  /**
   * 按钮类型
   * @default 'default'
   */
  type?: ButtonType

  /**
   * 按钮尺寸
   * @default 'default'
   */
  size?: ButtonSize

  /**
   * 是否禁用（外部控制）
   * @default false
   */
  disabled?: boolean

  /**
   * 是否显示加载状态（外部控制）
   * @default false
   */
  loading?: boolean

  /**
   * 自定义 Tooltip 提示文字
   * 不设置时根据 AI 状态自动生成
   */
  tooltip?: string
}

const props = withDefaults(defineProps<Props>(), {
  type: 'default',
  size: 'default',
  disabled: false,
  loading: false,
  tooltip: undefined,
})

// ===== Emits 定义 =====

interface Emits {
  /**
   * 点击事件
   * 仅在按钮可点击时触发
   */
  (e: 'click'): void
}

const emit = defineEmits<Emits>()

// ===== Store =====

const aiStore = useAiStore()

// ===== 计算属性 =====

/**
 * 按钮是否禁用
 * 优先级：外部 disabled > AI 未启用 > AI 不可用
 */
const isButtonDisabled = computed(() => {
  // 外部显式禁用
  if (props.disabled) {
    return true
  }

  // AI 未启用
  if (!aiStore.isEnabled) {
    return true
  }

  // AI 不可用（非加载状态）
  if (!aiStore.isAvailable && !aiStore.isLoading) {
    return true
  }

  return false
})

/**
 * 按钮是否显示加载状态
 * 外部 loading 或 AI Store 加载中
 */
const isButtonLoading = computed(() => {
  return props.loading || aiStore.isLoading
})

/**
 * 计算后的 Tooltip 内容
 * 根据状态自动生成提示文字
 */
const computedTooltip = computed(() => {
  // 使用自定义 tooltip
  if (props.tooltip) {
    return props.tooltip
  }

  // AI 未启用
  if (!aiStore.isEnabled) {
    return 'AI 功能未启用'
  }

  // AI 加载中
  if (aiStore.isLoading) {
    return 'AI 服务加载中...'
  }

  // AI 不可用
  if (!aiStore.isAvailable) {
    return aiStore.errorMessage || 'AI 服务不可用'
  }

  // AI 可用
  return '点击使用 AI 辅助功能'
})

// ===== 方法 =====

/**
 * 处理按钮点击事件
 * 仅在按钮可用时触发 emit
 */
const handleClick = () => {
  // 禁用状态不触发事件
  if (isButtonDisabled.value) {
    return
  }

  // 加载状态不触发事件
  if (isButtonLoading.value) {
    return
  }

  emit('click')
}
</script>

<style scoped>
/**
 * AI 辅助按钮样式
 * 使用 CSS 变量实现主题切换，支持玻璃态设计
 */

.ai-assist-button {
  /* 玻璃态背景 */
  background: var(--bg-glass) !important;
  backdrop-filter: blur(var(--backdrop-blur));
  -webkit-backdrop-filter: blur(var(--backdrop-blur));

  /* 边框 */
  border: 1px solid var(--border-glass-strong) !important;

  /* 文字颜色 */
  color: var(--text-primary) !important;

  /* 过渡动画 - 仅针对实际变化的属性 */
  transition: transform var(--transition-fast) ease, box-shadow var(--transition-fast) ease, background-color var(--transition-fast) ease, border-color var(--transition-fast) ease, opacity var(--transition-fast) ease !important;

  /* 圆角 */
  border-radius: var(--border-radius-sm) !important;

  /* 性能优化：预声明变换属性 */
  will-change: transform, box-shadow;
}

/**
 * 按钮悬停效果
 */
.ai-assist-button:hover:not(.ai-assist-button--disabled) {
  /* 抬高效果 */
  transform: translateY(-2px);

  /* 增强阴影 */
  box-shadow: var(--shadow-button-hover) !important;

  /* 边框高亮 */
  border-color: var(--color-primary) !important;
}

/**
 * 按钮按下效果
 */
.ai-assist-button:active:not(.ai-assist-button--disabled) {
  /* 缩放效果 */
  transform: scale(0.98);

  /* 减少阴影 */
  box-shadow: var(--shadow-xs) !important;
}

/**
 * 禁用状态
 */
.ai-assist-button--disabled {
  opacity: 0.6;
  cursor: not-allowed !important;
}

.ai-assist-button--disabled:hover {
  transform: none !important;
  box-shadow: none !important;
}

/**
 * Primary 类型按钮
 */
.ai-assist-button.ant-btn-primary {
  background: var(--gradient-primary) !important;
  border: none !important;
  color: var(--text-inverse) !important;
}

.ai-assist-button.ant-btn-primary:hover:not(.ai-assist-button--disabled) {
  box-shadow: var(--shadow-lg) !important;
  opacity: 0.9;
}

/**
 * Text 类型按钮
 */
.ai-assist-button.ant-btn-text {
  background: transparent !important;
  border: none !important;
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
}

.ai-assist-button.ant-btn-text:hover:not(.ai-assist-button--disabled) {
  background: var(--interactive-hover) !important;
}

/**
 * 按钮图标
 */
.ai-assist-button__icon {
  font-size: 16px;
  line-height: 1;
}

/**
 * 不同尺寸的图标大小
 */
.ai-assist-button.ant-btn-sm .ai-assist-button__icon {
  font-size: 14px;
}

.ai-assist-button.ant-btn-lg .ai-assist-button__icon {
  font-size: 18px;
}
</style>
