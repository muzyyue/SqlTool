import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { applyTheme, getCurrentTheme, toggleTheme as toggleThemeUtil } from '@/design/theme.js'

/**
 * 主题管理 Store
 * 管理亮色/暗色模式切换
 */
export const useThemeStore = defineStore('theme', () => {
  const isDark = ref(getCurrentTheme() === 'dark')

  /**
   * 切换主题
   */
  const toggle = () => {
    toggleThemeUtil()
  }

  /**
   * 设置主题
   * @param theme - 主题名称（'light' 或 'dark'）
   */
  const setTheme = (theme) => {
    isDark.value = theme === 'dark'
  }

  /**
   * 监听主题变化，自动应用到 DOM
   */
  watch(
    isDark,
    (newIsDark) => {
      const theme = newIsDark ? 'dark' : 'light'
      applyTheme(theme)
    },
    { immediate: true },
  )

  return {
    isDark,
    toggle,
    setTheme,
  }
})
