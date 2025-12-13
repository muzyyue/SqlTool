import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [
    vue({
      template: {
        compilerOptions: {
          // 将a-开头的标签视为自定义元素，避免警告
          isCustomElement: (tag) => tag.startsWith('a-')
        }
      }
    })
  ],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.js'],
    coverage: {
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.config.js',
        '**/*.d.ts'
      ]
    },
    alias: {
      '@': new URL('./src', import.meta.url).pathname
    },
    // 禁用测试中的CSS导入，提高测试速度
    css: false,
    // 设置测试超时时间
    testTimeout: 10000
  }
})
