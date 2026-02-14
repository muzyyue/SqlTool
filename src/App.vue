<script setup>
import { computed, onMounted, onUnmounted } from 'vue'
import { ConfigProvider, theme } from 'ant-design-vue'
import MainLayout from '@/components/Layout/MainLayout.vue'
import { useThemeStore } from '@/stores/theme.js'
import { storeToRefs } from 'pinia'

const themeStore = useThemeStore()
const { isDark } = storeToRefs(themeStore)

const themeConfig = computed(() => ({
  algorithm: isDark.value ? theme.darkAlgorithm : undefined,
  token: {
    colorPrimary: isDark.value ? '#6366f1' : '#1890ff',
  },
}))

/**
 * 处理页面可见性变化
 * 当页面不可见时暂停动画，避免Edge浏览器最小化问题
 */
const handleVisibilityChange = () => {
  if (document.hidden) {
    document.body.classList.add('reduce-motion')
  } else {
    document.body.classList.remove('reduce-motion')
  }
}

onMounted(() => {
  document.addEventListener('visibilitychange', handleVisibilityChange)
})

onUnmounted(() => {
  document.removeEventListener('visibilitychange', handleVisibilityChange)
})
</script>

<template>
  <ConfigProvider :theme="themeConfig">
    <MainLayout>
      <router-view />
    </MainLayout>
  </ConfigProvider>
</template>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html,
body {
  height: 100%;
  font-family:
    -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
}

#app {
  min-height: 100vh;
  background-color: var(--bg-secondary, #f5f5f5);
  transition: background-color var(--transition-normal, 200ms) ease;
}

/**
 * 减少动画模式
 * 用于Edge浏览器最小化时暂停所有动画
 */
.reduce-motion,
.reduce-motion * {
  animation: none !important;
  transition: none !important;
}
</style>
