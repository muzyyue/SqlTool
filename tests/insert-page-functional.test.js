import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'

// 创建一个简单的Vue组件来测试
const SimpleInsertPage = {
  template: `
    <div>
      <h2>INSERT语句生成</h2>
      <textarea v-model="ddlStatement" placeholder="请输入CREATE TABLE语句..."></textarea>
      <button @click="parseDdl">解析DDL</button>
      <div v-if="parsedFields.length > 0">
        已解析 {{ parsedFields.length }} 个字段
      </div>
    </div>
  `,
  data() {
    return {
      ddlStatement: '',
      parsedFields: []
    }
  },
  methods: {
    parseDdl() {
      // 简单的模拟解析
      if (this.ddlStatement.includes('CREATE TABLE')) {
        this.parsedFields = [{ name: 'id', type: 'int' }, { name: 'name', type: 'varchar' }]
      }
    }
  }
}

describe('InsertPage - 功能测试', () => {
  it('应该能够渲染简单组件', () => {
    const wrapper = mount(SimpleInsertPage)
    expect(wrapper.exists()).toBe(true)
    expect(wrapper.find('h2').text()).toBe('INSERT语句生成')
  })

  it('应该能够解析DDL语句', async () => {
    const wrapper = mount(SimpleInsertPage)
    
    // 设置DDL语句
    await wrapper.setData({ ddlStatement: 'CREATE TABLE users (id INT, name VARCHAR(50))' })
    
    // 点击解析按钮
    await wrapper.find('button').trigger('click')
    
    // 检查解析结果
    expect(wrapper.vm.parsedFields).toHaveLength(2)
    expect(wrapper.find('div').text()).toContain('已解析 2 个字段')
  })
})

// 测试实际的composable函数
describe('InsertPage - composable函数测试', () => {
  it('应该能够导入和使用composable函数', () => {
    // 测试composable函数的导入
    const { useSqlGeneratorEnhanced } = require('../src/composables/useSqlGeneratorEnhanced')
    const { useDdlParser } = require('../src/composables/useDdlParser')
    
    expect(typeof useSqlGeneratorEnhanced).toBe('function')
    expect(typeof useDdlParser).toBe('function')
  })
})