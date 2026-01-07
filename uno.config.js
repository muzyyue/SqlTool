/**
 * UnoCSS 配置文件
 *
 * 本配置文件定义了项目中使用的UnoCSS工具类
 * 包括玻璃态效果、渐变背景、响应式设计等
 *
 * 安装UnoCSS：
 * pnpm add -D unocss
 *
 * 在 vite.config.js 中配置：
 * import UnoCSS from 'unocss/vite'
 * export default defineConfig({
 *   plugins: [UnoCSS(), ...]
 * })
 *
 * 在 main.js 中导入：
 * import 'virtual:uno.css'
 */

import { defineConfig, presetUno, presetAttributify, presetIcons } from 'unocss'

export default defineConfig({
  // 预设配置
  presets: [
    presetUno(), // 默认预设，包含Tailwind CSS兼容的工具类
    presetAttributify(), // 属性化模式，支持 class="flex" 写成 flex
    presetIcons({
      scale: 1.2,
      warn: true,
      extraProperties: {
        'display': 'inline-block',
        'vertical-align': 'middle',
      },
    }), // 图标预设
  ],

  // 主题配置
  theme: {
    colors: {
      // 主色调
      primary: {
        DEFAULT: '#1677FF',
        light: '#4096FF',
        lighter: '#69B1FF',
        dark: '#0958D9',
      },
      // 辅助色
      secondary: {
        DEFAULT: '#14C9C9',
        light: '#45D9D9',
        lighter: '#78E8E8',
        dark: '#0E8F8F',
      },
      // 玻璃态背景
      glass: {
        light: 'rgba(255, 255, 255, 0.85)',
        dark: 'rgba(30, 41, 59, 0.6)',
      },
    },
    boxShadow: {
      // 玻璃态阴影
      'glass-sm': '0 2px 8px rgba(22, 119, 255, 0.08)',
      'glass': '0 8px 32px rgba(22, 119, 255, 0.12)',
      'glass-lg': '0 16px 48px rgba(22, 119, 255, 0.16)',
    },
    backdropBlur: {
      'glass': '20px',
    },
    borderRadius: {
      // 半径比例
      'tag': '4px',
      'btn': '8px',
      'card': '12px',
      'icon-lg': '16px',
    },
  },

  // 快捷方式
  shortcuts: {
    // 玻璃态卡片
    'glass-card':
      'bg-glass-light backdrop-blur-glass shadow-glass border border-white/30 rounded-card',
    // 玻璃态卡片（暗色）
    'glass-card-dark':
      'bg-glass-dark backdrop-blur-glass shadow-glass border border-white/10 rounded-card',
    // 渐变按钮
    'gradient-btn':
      'bg-gradient-to-r from-primary to-secondary text-white rounded-btn shadow-glass-sm hover:shadow-glass transition-all duration-200 active:scale-98 active:brightness-110',
    // 渐变文本
    'text-gradient':
      'bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent',
    // 玻璃态输入框
    'glass-input':
      'bg-white/60 backdrop-blur-md border border-primary/20 rounded-btn focus:border-primary/50 focus:shadow-glass-sm transition-all',
    // 玻璃态面板
    'glass-panel':
      'bg-glass-light backdrop-blur-glass shadow-glass border border-white/20 rounded-card',
    // 玻璃态面板（暗色）
    'glass-panel-dark':
      'bg-glass-dark backdrop-blur-glass shadow-glass border border-white/10 rounded-card',
  },

  // 自定义规则
  rules: [
    // 玻璃态效果
    [
      /^glass-(\d+)$/,
      ([, d]) => ({
        'background': `rgba(255, 255, 255, ${Number(d) / 100})`,
        'backdrop-filter': `blur(${d / 2}px)`,
        '-webkit-backdrop-filter': `blur(${d / 2}px)`,
      }),
    ],
    // 渐变背景
    [
      /^gradient-(\d+)-(\d+)$/,
      ([, from, to]) => ({
        'background': `linear-gradient(135deg, #${from} 0%, #${to} 100%)`,
      }),
    ],
    // 微交互动画
    [
      /^hover-elevate-(\d+)$/,
      ([, d]) => ({
        'transition': 'all 0.2s ease',
        '&:hover': {
          'transform': `translateY(-${d}px)`,
          'box-shadow': '0 8px 32px rgba(22, 119, 255, 0.12)',
        },
      }),
    ],
    // 按钮点击效果
    [
      /^active-scale-(\d+)$/,
      ([, d]) => ({
        '&:active': {
          'transform': `scale(${Number(d) / 100})`,
        },
      }),
    ],
  ],

  // 安全列表
  safelist: [
    // Ant Design Vue 组件类
    'ant-btn',
    'ant-input',
    'ant-select',
    'ant-collapse',
    'ant-table',
    'ant-modal',
    'ant-form',
    'ant-space',
    // 自定义组件类
    'glass-card',
    'glass-card-inner',
    'batch-edit-panel',
    'sql-preview-container',
    // 图标类
    'anticon',
    'anticon-plus',
    'anticon-delete',
    'anticon-reload',
    'anticon-eye',
    'anticon-check',
    'anticon-question-circle',
    'anticon-info-circle',
  ],

  // 图标集
  icons: {
    scale: 1.2,
    cdn: 'https://esm.sh/',
  },

  // 变换器
  transformers: [],

  // 插件
  plugins: [],
})
