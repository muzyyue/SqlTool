import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import path from 'path'
import fs from 'fs'

// 与 vite.config.js 保持一致：测试环境也要注入版本号，
// 否则引用 __APP_VERSION__ 的组件会报 ReferenceError。
const pkg = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, '../../package.json'), 'utf8'),
)

export default defineConfig({
  // 构建时注入的常量，测试环境需要同样的定义
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  plugins: [
    vue({
      template: {
        compilerOptions: {
          isCustomElement: (tag) => tag.startsWith('a-'),
        },
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '../../src'),
    },
  },
  test: {
    include: ['./test/unit/**/*.test.{js,ts}'],
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./test/unit/setup.js'],
    coverage: {
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'test/', '**/*.config.js', '**/*.d.ts'],
    },
    css: false,
    testTimeout: 10000,
  },
})
