<script setup>
import { computed } from 'vue'
import { theme } from 'ant-design-vue'
import { useThemeStore } from '@/stores/theme'
import MainLayout from '@/components/Layout/MainLayout.vue'

const themeStore = useThemeStore()

const antdTheme = computed(() => ({
  algorithm: themeStore.isDark ? theme.darkAlgorithm : theme.defaultAlgorithm,
  token: {
    colorPrimary: '#1677ff',
    borderRadius: 6,
  },
}))
</script>

<template>
  <a-config-provider :theme="antdTheme">
    <MainLayout>
      <router-view />
    </MainLayout>
  </a-config-provider>
</template>

<style>
/**
 * 全局基础样式
 * 使用 CSS 变量实现主题切换
 * 采用高端设计规范：Plus Jakarta Sans 字体 + 流畅动画系统
 */

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html,
body {
  height: 100%;
  font-family:
    'Plus Jakarta Sans',
    -apple-system,
    BlinkMacSystemFont,
    'Segoe UI',
    Roboto,
    'Helvetica Neue',
    Arial,
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-rendering: optimizeLegibility;
}

#app {
  min-height: 100vh;
  background-color: var(--bg-base);
  transition: background-color var(--transition-normal) ease;
}

/* ==================== 全局动画系统 ==================== */

@keyframes fadeSlideUp {
  from {
    opacity: 0;
    transform: translateY(16px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes scaleIn {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes shimmer {
  0% {
    background-position: -200% 0;
    opacity: 0.6;
  }
  50% {
    opacity: 1;
  }
  100% {
    background-position: 200% 0;
    opacity: 0.6;
  }
}

@keyframes pulse-soft {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
}

/* 全局过渡类 */
.transition-smooth {
  transition: all 0.3s cubic-bezier(0.32, 0.72, 0, 1);
}

.transition-fast {
  transition: all 0.2s cubic-bezier(0.32, 0.72, 0, 1);
}

/* GPU 加速优化 */
.gpu-accelerated {
  will-change: transform, opacity;
  transform: translateZ(0);
}

/* 减少动画偏好 */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}

/* 高对比度模式 */
@media (forced-colors: active) {
  .stat-pill,
  .action-btn,
  .type-btn {
    border: 2px solid currentColor;
  }
}

/* 焦点可见性（无障碍） */
*:focus-visible {
  outline: 2px solid #1677ff;
  outline-offset: 2px;
  border-radius: 4px;
}

/* 选择文本样式 */
::selection {
  background-color: rgba(22, 119, 255, 0.15);
  color: inherit;
}
</style>
