/**
 * 主题变量定义
 * 定义亮色和暗色模式的所有 CSS 变量
 * 采用语义化命名，元素只引用变量，不直接写颜色值
 */

export const themeVars = {
  light: {
    // ===== 背景色层级 =====
    '--bg-base': '#F5F7FA',
    '--bg-elevated': '#FFFFFF',
    '--bg-sunken': '#F3F4F6',
    '--bg-overlay': 'rgba(0, 0, 0, 0.45)',
    '--bg-glass': 'rgba(255, 255, 255, 0.85)',
    '--bg-glass-light': 'rgba(255, 255, 255, 0.6)',
    '--bg-glass-footer': 'rgba(255, 255, 255, 0.3)',

    // ===== 文本色层级 =====
    '--text-primary': '#1F2937',
    '--text-secondary': '#6B7280',
    '--text-tertiary': '#9CA3AF',
    '--text-disabled': '#D1D5DB',
    '--text-inverse': '#FFFFFF',
    '--text-link': '#1677FF',
    '--text-link-hover': '#4096FF',

    // ===== 边框色 =====
    '--border-default': '#E5E7EB',
    '--border-light': 'rgba(255, 255, 255, 0.5)',
    '--border-strong': '#D1D5DB',
    '--border-focus': '#1677FF',
    '--border-glass': 'rgba(255, 255, 255, 0.3)',
    '--border-glass-light': 'rgba(255, 255, 255, 0.2)',
    '--border-glass-strong': 'rgba(255, 255, 255, 0.5)',

    // ===== 状态色 =====
    '--color-primary': '#1677FF',
    '--color-primary-hover': '#4096FF',
    '--color-primary-active': '#0958D9',
    '--color-primary-bg': '#E6F4FF',
    '--color-primary-border': 'rgba(22, 119, 255, 0.1)',
    '--color-success': '#52C41A',
    '--color-success-bg': '#F6FFED',
    '--color-success-border': 'rgba(82, 196, 26, 0.1)',
    '--color-warning': '#FAAD14',
    '--color-warning-bg': '#FFFBE6',
    '--color-error': '#FF4D4F',
    '--color-error-bg': '#FFF2F0',
    '--color-info': '#1677FF',
    '--color-info-bg': '#E6F4FF',

    // ===== 交互色 =====
    '--interactive-hover': 'rgba(0, 0, 0, 0.04)',
    '--interactive-active': 'rgba(0, 0, 0, 0.08)',
    '--interactive-selected': 'rgba(22, 119, 255, 0.1)',
    '--interactive-hover-inverse': 'rgba(255, 255, 255, 0.1)',
    '--interactive-active-inverse': 'rgba(255, 255, 255, 0.15)',

    // ===== 阴影层级 =====
    '--shadow-xs': '0 1px 2px rgba(0, 0, 0, 0.04)',
    '--shadow-sm': '0 2px 8px rgba(0, 0, 0, 0.08)',
    '--shadow-md': '0 4px 16px rgba(0, 0, 0, 0.1)',
    '--shadow-lg': '0 8px 32px rgba(22, 119, 255, 0.12)',
    '--shadow-xl': '0 16px 48px rgba(0, 0, 0, 0.15)',
    '--shadow-card': '0 8px 32px rgba(22, 119, 255, 0.12)',
    '--shadow-card-hover': '0 12px 40px rgba(22, 119, 255, 0.18)',
    '--shadow-header': '0 2px 8px rgba(0, 0, 0, 0.1)',
    '--shadow-button-hover': '0 4px 12px rgba(22, 119, 255, 0.15)',

    // ===== 头部/导航 =====
    '--header-bg-start': '#1890FF',
    '--header-bg-end': '#096DD9',
    '--header-text': '#FFFFFF',
    '--header-text-secondary': 'rgba(255, 255, 255, 0.8)',
    '--nav-item-text': 'rgba(255, 255, 255, 0.8)',
    '--nav-item-text-hover': '#FFFFFF',
    '--nav-item-bg-hover': 'rgba(255, 255, 255, 0.1)',
    '--nav-item-bg-selected': 'rgba(255, 255, 255, 0.1)',

    // ===== 卡片 =====
    '--card-bg': '#FFFFFF',
    '--card-border': '#F0F0F0',
    '--card-shadow': '0 2px 8px rgba(0, 0, 0, 0.08)',
    '--card-hover-border': '#1890FF',
    '--card-hover-shadow': '0 8px 24px rgba(24, 144, 255, 0.15)',

    // ===== 代码编辑器 =====
    '--code-bg': '#FFFFFF',
    '--code-toolbar-bg': '#FAFAFA',
    '--code-border': '#D9D9D9',
    '--code-gutter-bg': '#F5F5F5',
    '--code-gutter-text': '#999999',
    '--code-gutter-active-bg': '#E0E0E0',
    '--code-gutter-active-text': '#333333',
    '--code-scrollbar-track': '#F1F1F1',
    '--code-scrollbar-thumb': '#C1C1C1',
    '--code-scrollbar-thumb-hover': '#A8A8A8',

    // ===== 表格 =====
    '--table-header-bg': '#FAFAFA',
    '--table-row-hover-bg': '#F5F5F5',
    '--table-border': '#F0F0F0',

    // ===== 输入框 =====
    '--input-bg': '#FFFFFF',
    '--input-border': '#D9D9D9',
    '--input-border-hover': '#4096FF',
    '--input-border-focus': '#1677FF',
    '--input-placeholder': '#BFBFBF',

    // ===== 标签/徽章 =====
    '--badge-primary-bg': '#E6F7FF',
    '--badge-primary-text': '#1677FF',
    '--badge-success-bg': '#F6FFED',
    '--badge-success-text': '#52C41A',
    '--badge-warning-bg': '#FFFBE6',
    '--badge-warning-text': '#FAAD14',
    '--badge-error-bg': '#FFF2F0',
    '--badge-error-text': '#FF4D4F',

    // ===== 渐变 =====
    '--gradient-primary': 'linear-gradient(135deg, #1677FF 0%, #14C9C9 100%)',
    '--gradient-secondary': 'linear-gradient(135deg, #6B7280 0%, #4B5563 100%)',
    '--gradient-primary-light': 'linear-gradient(135deg, rgba(22, 119, 255, 0.05) 0%, rgba(20, 201, 201, 0.05) 100%)',

    // ===== 滚动条 =====
    '--scrollbar-track': 'rgba(22, 119, 255, 0.05)',
    '--scrollbar-thumb': 'rgba(22, 119, 255, 0.2)',
    '--scrollbar-thumb-hover': 'rgba(22, 119, 255, 0.3)',

    // ===== 页面级变量 =====
    '--page-bg-gradient': 'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)',
    '--page-header-bg': '#fafafa',
    '--page-header-border': '#f0f0f0',
    '--page-header-title': '#1890ff',
    '--panel-bg': '#f8f9fa',
    '--panel-border': '#e9ecef',
    '--option-label': '#495057',
    '--option-value': '#1890ff',
    '--log-time': '#666',
    '--log-message': '#333',
    '--hint-warning-bg': '#fffbe6',
    '--hint-warning-border': '#ffe58f',
    '--hint-warning-text': '#fa8c16',

    // ===== 尺寸/动画 =====
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
    // ===== 背景色层级 =====
    '--bg-base': '#0F1219',
    '--bg-elevated': '#1F2937',
    '--bg-sunken': '#151C28',
    '--bg-overlay': 'rgba(0, 0, 0, 0.65)',
    '--bg-glass': 'rgba(30, 41, 59, 0.6)',
    '--bg-glass-light': 'rgba(30, 41, 59, 0.4)',
    '--bg-glass-footer': 'rgba(30, 41, 59, 0.3)',

    // ===== 文本色层级 =====
    '--text-primary': '#F3F4F6',
    '--text-secondary': '#9CA3AF',
    '--text-tertiary': '#6B7280',
    '--text-disabled': '#4B5563',
    '--text-inverse': '#1F2937',
    '--text-link': '#60A5FA',
    '--text-link-hover': '#93C5FD',

    // ===== 边框色 =====
    '--border-default': '#374151',
    '--border-light': 'rgba(255, 255, 255, 0.1)',
    '--border-strong': '#4B5563',
    '--border-focus': '#60A5FA',
    '--border-glass': 'rgba(255, 255, 255, 0.1)',
    '--border-glass-light': 'rgba(255, 255, 255, 0.05)',
    '--border-glass-strong': 'rgba(255, 255, 255, 0.15)',

    // ===== 状态色 =====
    '--color-primary': '#60A5FA',
    '--color-primary-hover': '#93C5FD',
    '--color-primary-active': '#3B82F6',
    '--color-primary-bg': '#1E3A5F',
    '--color-primary-border': 'rgba(255, 255, 255, 0.1)',
    '--color-success': '#6EE7B7',
    '--color-success-bg': '#1E3A2F',
    '--color-success-border': 'rgba(110, 231, 183, 0.2)',
    '--color-warning': '#FCD34D',
    '--color-warning-bg': '#3A3520',
    '--color-error': '#F87171',
    '--color-error-bg': '#3A2020',
    '--color-info': '#60A5FA',
    '--color-info-bg': '#1E3A5F',

    // ===== 交互色 =====
    '--interactive-hover': 'rgba(255, 255, 255, 0.08)',
    '--interactive-active': 'rgba(255, 255, 255, 0.12)',
    '--interactive-selected': 'rgba(22, 119, 255, 0.3)',
    '--interactive-hover-inverse': 'rgba(255, 255, 255, 0.15)',
    '--interactive-active-inverse': 'rgba(255, 255, 255, 0.2)',

    // ===== 阴影层级 =====
    '--shadow-xs': '0 1px 2px rgba(0, 0, 0, 0.2)',
    '--shadow-sm': '0 2px 8px rgba(0, 0, 0, 0.25)',
    '--shadow-md': '0 4px 16px rgba(0, 0, 0, 0.3)',
    '--shadow-lg': '0 8px 32px rgba(96, 165, 250, 0.15)',
    '--shadow-xl': '0 16px 48px rgba(0, 0, 0, 0.4)',
    '--shadow-card': '0 8px 32px rgba(0, 0, 0, 0.3)',
    '--shadow-card-hover': '0 12px 40px rgba(96, 165, 250, 0.2)',
    '--shadow-header': '0 2px 12px rgba(0, 0, 0, 0.3)',
    '--shadow-button-hover': '0 4px 12px rgba(96, 165, 250, 0.15)',

    // ===== 头部/导航 =====
    '--header-bg-start': '#1A1A2E',
    '--header-bg-end': '#16213E',
    '--header-text': '#FFFFFF',
    '--header-text-secondary': 'rgba(255, 255, 255, 0.85)',
    '--nav-item-text': 'rgba(255, 255, 255, 0.85)',
    '--nav-item-text-hover': '#FFFFFF',
    '--nav-item-bg-hover': 'rgba(255, 255, 255, 0.08)',
    '--nav-item-bg-selected': 'rgba(22, 119, 255, 0.3)',

    // ===== 卡片 =====
    '--card-bg': '#1F2937',
    '--card-border': '#374151',
    '--card-shadow': '0 2px 8px rgba(0, 0, 0, 0.2)',
    '--card-hover-border': '#60A5FA',
    '--card-hover-shadow': '0 8px 24px rgba(96, 165, 250, 0.15)',

    // ===== 代码编辑器 =====
    '--code-bg': '#1E1E1E',
    '--code-toolbar-bg': '#2D2D30',
    '--code-border': '#3C3C3C',
    '--code-gutter-bg': '#1E1E1E',
    '--code-gutter-text': '#858585',
    '--code-gutter-active-bg': '#2C2C2C',
    '--code-gutter-active-text': '#C6C6C6',
    '--code-scrollbar-track': '#2D2D30',
    '--code-scrollbar-thumb': '#464647',
    '--code-scrollbar-thumb-hover': '#5A5A5A',

    // ===== 表格 =====
    '--table-header-bg': '#2D3748',
    '--table-row-hover-bg': '#374151',
    '--table-border': '#374151',

    // ===== 输入框 =====
    '--input-bg': '#1F2937',
    '--input-border': '#374151',
    '--input-border-hover': '#60A5FA',
    '--input-border-focus': '#3B82F6',
    '--input-placeholder': '#6B7280',

    // ===== 标签/徽章 =====
    '--badge-primary-bg': '#1E3A5F',
    '--badge-primary-text': '#60A5FA',
    '--badge-success-bg': '#1E3A2F',
    '--badge-success-text': '#6EE7B7',
    '--badge-warning-bg': '#3A3520',
    '--badge-warning-text': '#FCD34D',
    '--badge-error-bg': '#3A2020',
    '--badge-error-text': '#F87171',

    // ===== 渐变 =====
    '--gradient-primary': 'linear-gradient(135deg, #1677FF 0%, #14C9C9 100%)',
    '--gradient-secondary': 'linear-gradient(135deg, #6B7280 0%, #4B5563 100%)',
    '--gradient-primary-light': 'linear-gradient(135deg, rgba(22, 119, 255, 0.1) 0%, rgba(20, 201, 201, 0.1) 100%)',

    // ===== 滚动条 =====
    '--scrollbar-track': 'rgba(255, 255, 255, 0.05)',
    '--scrollbar-thumb': 'rgba(255, 255, 255, 0.1)',
    '--scrollbar-thumb-hover': 'rgba(255, 255, 255, 0.2)',

    // ===== 页面级变量 =====
    '--page-bg-gradient': 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)',
    '--page-header-bg': '#1e293b',
    '--page-header-border': '#374151',
    '--page-header-title': '#60a5fa',
    '--panel-bg': '#1e293b',
    '--panel-border': '#374151',
    '--option-label': '#d1d5db',
    '--option-value': '#60a5fa',
    '--log-time': '#9ca3af',
    '--log-message': '#e5e7eb',
    '--hint-warning-bg': 'rgba(245, 158, 11, 0.1)',
    '--hint-warning-border': 'rgba(245, 158, 11, 0.3)',
    '--hint-warning-text': '#fbbf24',

    // ===== 尺寸/动画 =====
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
export function applyTheme(theme = 'light') {
  const vars = themeVars[theme]
  const root = document.documentElement

  Object.entries(vars).forEach(([key, value]) => {
    root.style.setProperty(key, value)
  })

  root.setAttribute('data-theme', theme)
  localStorage.setItem('theme', theme)
}

/**
 * 获取当前主题
 * @returns 当前主题名称
 */
export function getCurrentTheme() {
  const savedTheme = localStorage.getItem('theme')
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
}
