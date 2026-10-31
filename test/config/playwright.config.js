import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright测试配置
 * 遵循最佳实践优化配置
 */
export default defineConfig({
  testDir: '../e2e',
  
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  
  timeout: 60000,
  expect: {
    timeout: 10000,
  },
  
  reporter: [
    ['html', { outputFolder: '../reports/playwright-report' }],
    ['list'],
  ],
  
  use: {
    // 与 vite.config.js 的 server.port 保持一致（strictPort: true，固定 8024）
    baseURL: 'http://localhost:8024',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 15000,
    navigationTimeout: 30000,
  },

  projects: [
    {
      name: 'Microsoft Edge',
      use: {
        ...devices['Desktop Edge'],
        channel: 'msedge',
        launchOptions: {
          args: [
            '--disable-gpu',
            '--disable-dev-shm-usage',
            '--no-sandbox',
          ],
        },
      },
    },
  ],

  webServer: {
    // 与 vite.config.js 的 server.port 保持一致（端口固定为 8024）
    command: 'npm run dev',
    url: 'http://localhost:8024',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
})
