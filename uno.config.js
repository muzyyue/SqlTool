import { defineConfig, presetUno } from 'unocss'
import presetAttributify from '@unocss/preset-attributify'
import transformerVariantGroup from '@unocss/transformer-variant-group'
import transformerDirectives from '@unocss/transformer-directives'

export default defineConfig({
  presets: [presetUno(), presetAttributify()],
  transformers: [transformerVariantGroup(), transformerDirectives()],
  theme: {
    colors: {
      primary: {
        DEFAULT: '#1677FF',
        light: '#1677FF',
        dark: '#1677FF',
      },
      secondary: {
        DEFAULT: '#14C9C9',
        light: '#14C9C9',
        dark: '#14C9C9',
      },
      success: '#10B981',
      warning: '#F59E0B',
      error: '#EF4444',
      info: '#3B82F6',
    },
    borderRadius: {
      xs: '4px',
      sm: '8px',
      md: '12px',
      lg: '16px',
      xl: '20px',
    },
    boxShadow: {
      sm: '0 2 8 0 rgba(0,0,0,0.08)',
      md: '0 4 16 0 rgba(0,0,0,0.1)',
      lg: '0 8 32 0 rgba(22,119,255,0.12)',
      xl: '0 16 48 0 rgba(0,0,0,0.15)',
    },
    backdrop: {
      blur: '20px',
    },
    glass: {
      bg: 'rgba(255,255,255,0.85)',
      bgDark: 'rgba(30,41,59,0.6)',
      border: 'rgba(255,255,255,0.5)',
      borderDark: 'rgba(255,255,255,0.1)',
    },
    gradient: {
      primary: 'linear-gradient(135deg, #1677FF 0%, #14C9C9 100%)',
    },
  },
  shortcuts: {
    'glass-card': 'bg-white/85 backdrop-blur-20px shadow-lg border border-white/50',
    'gradient-button': 'text-white rounded-sm shadow-sm hover:shadow-md active:scale-95',
    'gradient-text': 'bg-clip-text text-transparent',
  },
  darkMode: 'class',
  safelist: ['glass-card', 'gradient-button', 'gradient-text'],
})
