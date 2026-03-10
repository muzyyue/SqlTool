import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import path from 'path'

export default defineConfig({
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
