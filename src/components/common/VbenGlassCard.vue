<template>
  <div class="vben-glass-card" :class="{ 'glass-card-hover': hoverable }">
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

defineEmits(['hover', 'hoverLeave'])
</script>

<style scoped>
/**
 * 玻璃卡片容器
 * 使用 CSS 变量实现主题切换
 */
.vben-glass-card {
  position: relative;
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.5);
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(22, 119, 255, 0.12);
  transition: all 200ms ease;
  overflow: hidden;
}

/**
 * Hover 效果
 * 抬高 2px + 阴影增强
 */
.vben-glass-card.glass-card-hover:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 40px rgba(22, 119, 255, 0.18);
}

/**
 * 卡片头部
 */
.glass-card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 16px 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.3);
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
  color: #1f2937;
  line-height: 1.5;
}

.header-title .description {
  margin: 0;
  font-size: 13px;
  color: #6b7280;
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
  border-top: 1px solid rgba(255, 255, 255, 0.3);
  background: rgba(255, 255, 255, 0.3);
}

/* 暗色主题支持 */
[data-theme='dark'] .vben-glass-card {
  background: rgba(30, 41, 59, 0.6);
  border-color: rgba(255, 255, 255, 0.1);
}

[data-theme='dark'] .glass-card-header {
  border-bottom-color: rgba(255, 255, 255, 0.1);
}

[data-theme='dark'] .glass-card-footer {
  border-top-color: rgba(255, 255, 255, 0.1);
  background: rgba(30, 41, 59, 0.3);
}

[data-theme='dark'] .header-title .title {
  color: #f3f4f6;
}

[data-theme='dark'] .header-title .description {
  color: #9ca3af;
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
