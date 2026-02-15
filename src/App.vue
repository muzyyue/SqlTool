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
    -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
}

#app {
  min-height: 100vh;
  background-color: var(--bg-base);
  transition: background-color var(--transition-normal) ease;
}
</style>
