/**
 * 主题变量定义
 * 定义亮色和暗色模式的所有 CSS 变量
 */

export const themeVars = {
  light: {
    '--bg-primary': '#FFFFFF',
    '--bg-secondary': '#F5F7FA',
    '--bg-tertiary': '#F3F4F6',
    '--card-bg': 'rgba(255,255,255,0.85)',
    '--card-border': 'rgba(255,255,255,0.5)',
    '--text-primary': '#1F2937',
    '--text-secondary': '#6B7280',
    '--text-tertiary': '#9CA3AF',
    '--primary-gradient': 'linear-gradient(135deg, #1677FF 0%, #14C9C9 100%)',
    '--shadow-sm': '0 2 8 0 rgba(0,0,0,0.08)',
    '--shadow-md': '0 4 16 0 rgba(0,0,0,0.1)',
    '--shadow-lg': '0 8 32 0 rgba(22,119,255,0.12)',
    '--shadow-xl': '0 16 48 0 rgba(0,0,0,0.15)',
    '--backdrop-blur': '20px',
    '--border-radius-xs': '4px',
    '--border-radius-sm': '8px',
    '--border-radius-md': '12px',
    '--border-radius-lg': '16px',
    '--border-radius-xl': '20px',
    '--transition-fast': '120ms',
    '--transition-normal': '200ms',
    '--transition-slow': '300ms',
  },
  dark: {
    '--bg-primary': '#151C28',
    '--bg-secondary': '#0F1219',
    '--bg-tertiary': '#1E293B',
    '--card-bg': 'rgba(30,41,59,0.6)',
    '--card-border': 'rgba(255,255,255,0.1)',
    '--text-primary': '#F3F4F6',
    '--text-secondary': '#9CA3AF',
    '--text-tertiary': '#6B7280',
    '--primary-gradient': 'linear-gradient(135deg, #1677FF 0%, #14C9C9 100%)',
    '--shadow-sm': '0 2 8 0 rgba(0,0,0,0.08)',
    '--shadow-md': '0 4 16 0 rgba(0,0,0,0.1)',
    '--shadow-lg': '0 8 32 0 rgba(22,119,255,0.12)',
    '--shadow-xl': '0 16 48 0 rgba(0,0,0,0.15)',
    '--backdrop-blur': '20px',
    '--border-radius-xs': '4px',
    '--border-radius-sm': '8px',
    '--border-radius-md': '12px',
    '--border-radius-lg': '16px',
    '--border-radius-xl': '20px',
    '--transition-fast': '120ms',
    '--transition-normal': '200ms',
    '--transition-slow': '300ms',
  },
}

/**
 * 应用主题到 DOM
 * @param theme - 主题名称（'light' 或 'dark'）
 */
export function applyTheme(theme: 'light' | 'dark' = 'light') {
  const vars = themeVars[theme]
  const root = document.documentElement

  Object.entries(vars).forEach(([key, value]) => {
    root.style.setProperty(key, value)
  })

  root.setAttribute('data-theme', theme)
}

/**
 * 获取当前主题
 * @returns 当前主题名称
 */
export function getCurrentTheme(): 'light' | 'dark' {
  const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null
  if (savedTheme) {
    return savedTheme
  }

  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  return prefersDark ? 'dark' : 'light'
}

/**
 * 切换主题
 */
export function toggleTheme() {
  const currentTheme = getCurrentTheme()
  const newTheme = currentTheme === 'light' ? 'dark' : 'light'
  applyTheme(newTheme)
  localStorage.setItem('theme', newTheme)
}
