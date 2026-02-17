import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import UnoCSS from 'unocss/vite'

export default defineConfig({
  base: '/',
  plugins: [vue(), vueDevTools(), UnoCSS()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: `@use "@/design/scss/variables.scss" as *; @use "@/design/scss/mixins.scss" as *;`,
        api: 'modern-compiler',
        silenceDeprecations: ['import'],
      },
    },
  },
  server: {
    historyApiFallback: true,
  },
})
