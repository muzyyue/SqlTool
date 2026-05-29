<template>
  <div
    class="vben-glass-card"
    :class="{ 'glass-card-hover': hoverable }"
    @click="handleClick"
  >
    <!-- 头部插槽 -->
    <div
      v-if="$slots.header || title || description || $slots.extra"
      class="glass-card-header"
    >
      <div class="header-content">
        <slot name="header">
          <div v-if="title || description" class="header-title">
            <h3 v-if="title" class="title">{{ title }}</h3>
            <p v-if="description" class="description">{{ description }}</p>
          </div>
        </slot>
      </div>
      <div v-if="$slots.extra" class="header-extra">
        <slot name="extra"></slot>
      </div>
    </div>

    <!-- 默认内容插槽 -->
    <div class="glass-card-body">
      <slot></slot>
    </div>

    <!-- 底部插槽 -->
    <div v-if="$slots.footer" class="glass-card-footer">
      <slot name="footer"></slot>
    </div>
  </div>
</template>

<script setup>
/**
 * VbenGlassCard 组件
 * 玻璃卡片容器组件，支持亮色和暗色主题
 * 使用 CSS 变量实现主题切换，无需手动适配
 * 针对低配核显优化：条件化 backdrop-filter、智能 GPU 层管理、减少显存占用
 *
 * @component
 * @example
 * <VbenGlassCard title="标题" description="描述" hoverable>
 *   <p>卡片内容</p>
 * </VbenGlassCard>
 */
defineProps({
  /** 卡片标题 */
  title: {
    type: String,
    default: "",
  },
  /** 卡片描述 */
  description: {
    type: String,
    default: "",
  },
  /** 是否启用 hover 效果（抬高 2px + 阴影增强） */
  hoverable: {
    type: Boolean,
    default: true,
  },
});

const emit = defineEmits(["hover", "hoverLeave", "click"]);

const handleClick = (event) => {
  emit("click", event);
};
</script>

<style scoped>
/**
 * 玻璃卡片容器
 * 性能优化策略（针对低配核显）：
 * 1. 条件化 backdrop-filter：仅在支持且用户未偏好减少透明效果时启用
 * 2. 智能 GPU 层：使用 translateZ(0) 轻量提升，避免默认 will-change 长期占用显存
 * 3. 隔离渲染：使用 contain 限制重排/重绘范围
 * 4. 尊重用户偏好：prefers-reduced-motion 和 prefers-reduced-transparency
 */
.vben-glass-card {
  position: relative;
  background: var(--bg-glass);
  border: 1px solid var(--border-glass-strong);
  border-radius: var(--border-radius-md);
  box-shadow: var(--shadow-lg);

  /* 轻量级 GPU 层提升，比 will-change 更省显存 */
  transform: translateZ(0);

  /* 渲染隔离：限制布局、样式和绘制重计算范围 */
  contain: layout style paint;
  overflow: hidden;
}

/**
 * 条件化毛玻璃效果
 * 仅在浏览器支持 backdrop-filter 且用户未设置减少透明偏好时启用
 * 低配核显或用户偏好减少透明效果时，自动降级为纯色半透明背景
 */
@media (prefers-reduced-transparency: no-preference) {
  @supports (backdrop-filter: blur(1px)) {
    .vben-glass-card {
      backdrop-filter: blur(var(--backdrop-blur));
      -webkit-backdrop-filter: blur(var(--backdrop-blur));
    }
  }
}

/**
 * Hover 效果
 * 核心优化：只在 hover 期间启用 will-change，避免常驻显存占用
 * 低配核显显存宝贵，动态分配比预分配更友好
 */
.vben-glass-card.glass-card-hover {
  transition:
    transform var(--transition-normal) ease,
    box-shadow var(--transition-normal) ease;
}

.vben-glass-card.glass-card-hover:hover {
  will-change: transform;
  transform: translateY(-2px) translateZ(0);
  box-shadow: var(--shadow-card-hover);
}

/**
 * 尊重减少动画偏好
 * 当用户偏好减少动画时，禁用位移动画，保留基础样式
 */
@media (prefers-reduced-motion: reduce) {
  .vben-glass-card.glass-card-hover {
    transition: none;
  }

  .vben-glass-card.glass-card-hover:hover {
    will-change: auto;
    transform: translateZ(0);
    box-shadow: var(--shadow-lg);
  }
}

/**
 * 卡片头部
 */
.glass-card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-glass);

  /* 性能优化：布局隔离，避免内容变化导致整卡重排 */
  contain: layout style;
}

.header-content {
  flex: 1;
}

.header-title {
  margin: 0;
}

.header-title .title {
  margin: 0 4px 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  line-height: 1.5;
}

.header-title .description {
  margin: 0;
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.5;
}

.header-extra {
  flex-shrink: 0;
  margin-left: 16px;
}

/**
 * 卡片主体
 */
.glass-card-body {
  padding: 20px;
  min-height: 40px;

  /* 性能优化：内容区域严格隔离 */
  contain: content;
}

/**
 * 卡片底部
 */
.glass-card-footer {
  padding: 12px 20px;
  border-top: 1px solid var(--border-glass);
  background: var(--bg-glass-footer);

  /* 性能优化：布局隔离 */
  contain: layout style;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .glass-card-header {
    flex-direction: column;
    gap: 12px;
  }

  .header-extra {
    margin-left: 0;
    width: 100%;
  }

  .glass-card-body {
    padding: 16px;
  }

  .glass-card-footer {
    padding: 12px 16px;
  }
}
</style>
