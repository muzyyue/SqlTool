import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import InsertPage from '../src/views/InsertPage.vue'

// 简单的mock
vi.mock('ant-design-vue', () => ({
  message: {
    success: vi.fn(),
    error: vi.fn()
  }
}))

describe('InsertPage - 简单测试', () => {
  it('应该能够渲染组件', () => {
    // 使用更简单的配置
    const wrapper = mount(InsertPage, {
      global: {
        stubs: {
          // 禁用所有stub，让组件正常渲染
          '*': false
        }
      }
    })
    
    expect(wrapper.exists()).toBe(true)
  })
})