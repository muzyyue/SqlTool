<template>
  <div class="vben-glass-card" :class="{ 'glass-card-hover': hoverable }" @click="handleClick">
    <!-- 头部插槽 -->
    <div v-if="$slots.header || title || description || $slots.extra" class="glass-card-header">
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
    default: '',
  },
  /** 卡片描述 */
  description: {
    type: String,
    default: '',
  },
  /** 是否启用 hover 效果（抬高 2px + 阴影增强） */
  hoverable: {
    type: Boolean,
    default: true,
  },
})

const emit = defineEmits(['hover', 'hoverLeave', 'click'])

const handleClick = (event) => {
  emit('click', event)
}
</script>

<style scoped>
/**
 * 玻璃卡片容器
 * 使用 CSS 变量实现主题切换，无需 [data-theme='dark'] 选择器
 */
.vben-glass-card {
  position: relative;
  background: var(--bg-glass);
  backdrop-filter: blur(var(--backdrop-blur));
  -webkit-backdrop-filter: blur(var(--backdrop-blur));
  border: 1px solid var(--border-glass-strong);
  border-radius: var(--border-radius-md);
  box-shadow: var(--shadow-lg);
  transition: all var(--transition-normal) ease;
  overflow: hidden;
}

/**
 * Hover 效果
 * 抬高 2px + 阴影增强
 */
.vben-glass-card.glass-card-hover:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-card-hover);
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
}

/**
 * 卡片底部
 */
.glass-card-footer {
  padding: 12px 20px;
  border-top: 1px solid var(--border-glass);
  background: var(--bg-glass-footer);
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
