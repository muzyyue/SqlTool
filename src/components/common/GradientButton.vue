<template>
  <button
    class="gradient-button"
    :class="[
      `gradient-button-${type}`,
      `gradient-button-${size}`,
      {
        'gradient-button-disabled': disabled,
        'gradient-button-loading': loading,
      },
    ]"
    :disabled="disabled || loading"
    @click="handleClick"
  >
    <!-- Loading 图标 -->
    <span v-if="loading" class="gradient-button-loading-icon">
      <LoadingOutlined />
    </span>

    <!-- 图标插槽 -->
    <span v-if="$slots.icon && !loading" class="gradient-button-icon">
      <slot name="icon"></slot>
    </span>

    <!-- 默认内容插槽 -->
    <span class="gradient-button-content">
      <slot></slot>
    </span>
  </button>
</template>

<script setup>
/**
 * GradientButton 组件
 * 渐变按钮组件，支持主渐变和次级样式
 *
 * @component
 * @example
 * <GradientButton type="primary" size="md" @click="handleClick">
 *   <template #icon><PlusOutlined /></template>
 *   点击按钮
 * </GradientButton>
 */
import { LoadingOutlined } from "@ant-design/icons-vue";

/**
 * 组件属性定义
 */
const props = defineProps({
  /** 按钮类型：primary（主渐变）、secondary（次级） */
  type: {
    type: String,
    default: "primary",
    validator: (value) => ["primary", "secondary"].includes(value),
  },
  /** 按钮尺寸：sm（小）、md（中）、lg（大） */
  size: {
    type: String,
    default: "md",
    validator: (value) => ["sm", "md", "lg"].includes(value),
  },
  /** 是否禁用 */
  disabled: {
    type: Boolean,
    default: false,
  },
  /** 是否加载中 */
  loading: {
    type: Boolean,
    default: false,
  },
});

/**
 * 组件事件定义
 */
const emit = defineEmits({
  /** 点击事件 */
  click: [event],
});

/**
 * 处理点击事件
 * @param event - 鼠标事件对象
 */
const handleClick = (event) => {
  if (!props.disabled && !props.loading) {
    emit("click", event);
  }
};
</script>

<style scoped>
/**
 * 渐变按钮基础样式
 */
.gradient-button {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 0 16px;
  font-size: 14px;
  font-weight: 500;
  line-height: 1.5;
  color: #ffffff;
  background: var(--color-primary);
  border: none;
  border-radius: var(--border-radius-sm);
  box-shadow: var(--shadow-sm);
  cursor: pointer;

  /* 性能优化：只过渡实际变化的属性（避免 transition: all）
   * hover: background, box-shadow
   * active: transform (scale)
   * disabled/loading: opacity
   */
  transition:
    background-color var(--transition-normal) ease,
    box-shadow var(--transition-normal) ease,
    transform var(--transition-normal) ease,
    opacity var(--transition-normal) ease;

  user-select: none;
  outline: none;

  /* GPU 加速：active 时有 scale 动画 */
  will-change: transform;

  /* 布局隔离：按钮内部不影响外部 */
  contain: layout style;
}

/**
 * Hover 效果：背景色加深
 */
.gradient-button:hover:not(.gradient-button-disabled):not(
    .gradient-button-loading
  ) {
  background: var(--color-primary-hover);
  box-shadow: var(--shadow-md);
}

/**
 * Active 效果：缩放 0.98
 */
.gradient-button:active:not(.gradient-button-disabled):not(
    .gradient-button-loading
  ) {
  transform: scale(0.98);
}

/**
 * Focus 状态：显示焦点环
 */
.gradient-button:focus-visible:not(.gradient-button-disabled) {
  box-shadow: 0 0 0 3px
    color-mix(in srgb, var(--color-primary) 30%, transparent);
}

/**
 * 禁用状态
 */
.gradient-button-disabled {
  opacity: 0.6;
  cursor: not-allowed;
  filter: grayscale(0.3);
}

/**
 * 加载状态
 */
.gradient-button-loading {
  cursor: wait;
  opacity: 0.8;
}

/**
 * Loading 图标
 */
.gradient-button-loading-icon {
  display: inline-flex;
  align-items: center;
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
 * 图标插槽
 */
.gradient-button-icon {
  display: inline-flex;
  align-items: center;
  font-size: 16px;
}

/**
 * 内容插槽
 */
.gradient-button-content {
  display: inline-flex;
  align-items: center;
}

/**
 * 按钮类型：primary（主色纯色）
 */
.gradient-button-primary {
  background: var(--color-primary);
}

/**
 * 按钮类型：secondary（次级样式）
 * 注意：使用灰色渐变，后续可考虑添加 --gradient-secondary 变量
 */
.gradient-button-secondary {
  background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%);
}

/**
 * 按钮尺寸：sm（小）
 */
.gradient-button-sm {
  height: 28px;
  padding: 0 12px;
  font-size: 12px;
  border-radius: var(--border-radius-sm);
}

.gradient-button-sm .gradient-button-icon {
  font-size: 14px;
}

/**
 * 按钮尺寸：md（中）
 */
.gradient-button-md {
  height: 36px;
  padding: 0 16px;
  font-size: 14px;
  border-radius: var(--border-radius-sm);
}

.gradient-button-md .gradient-button-icon {
  font-size: 16px;
}

/**
 * 按钮尺寸：lg（大）
 */
.gradient-button-lg {
  height: 44px;
  padding: 0 24px;
  font-size: 16px;
  border-radius: var(--border-radius-md);
}

.gradient-button-lg .gradient-button-icon {
  font-size: 18px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .gradient-button-lg {
    height: 40px;
    padding: 0 20px;
    font-size: 15px;
  }
}

@media (max-width: 480px) {
  .gradient-button-md {
    height: 32px;
    padding: 0 14px;
    font-size: 13px;
  }

  .gradient-button-lg {
    height: 36px;
    padding: 0 18px;
    font-size: 14px;
  }
}
</style>
