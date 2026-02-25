import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { applyTheme, getCurrentTheme } from '@/design/theme.js'

export const useThemeStore = defineStore('theme', () => {
  const isDark = ref(getCurrentTheme() === 'dark')

  const toggle = () => {
    isDark.value = !isDark.value
  }

  const setTheme = (themeName) => {
    isDark.value = themeName === 'dark'
  }

  watch(
    isDark,
    (newIsDark) => {
      const themeName = newIsDark ? 'dark' : 'light'
      applyTheme(themeName)
    },
    { immediate: true },
  )

  return {
    isDark,
    toggle,
    setTheme,
  }
})
