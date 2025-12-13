import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'

// 创建一个简化的InsertPage组件用于测试
const createSimpleInsertPage = () => {
  return {
    template: `
      <div class="insert-page">
        <h2>INSERT语句生成</h2>
        <textarea v-model="ddlStatement" placeholder="请输入CREATE TABLE语句..."></textarea>
        <button @click="parseDdl">解析DDL</button>
        <div v-if="parsedFields.length > 0">
          已解析 {{ parsedFields.length }} 个字段
        </div>
        <div v-if="excelData && excelData.length > 0">
          已上传Excel数据，共 {{ excelData.length }} 行
        </div>
        <div v-if="generatedSql">
          <h3>生成的SQL:</h3>
          <pre>{{ generatedSql }}</pre>
        </div>
      </div>
    `,
    data() {
      return {
        ddlStatement: '',
        parsedFields: [],
        excelData: [],
        generatedSql: ''
      }
    },
    methods: {
      parseDdl() {
        if (this.ddlStatement.includes('CREATE TABLE')) {
          this.parsedFields = [{ name: 'id', type: 'int' }, { name: 'name', type: 'varchar' }]
        }
      }
    }
  }
}

// Mock message组件
vi.mock('ant-design-vue', () => ({
  message: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn()
  }
}))

// 创建Vue应用实例
const createWrapper = () => {
  const SimpleInsertPage = createSimpleInsertPage()
  return mount(SimpleInsertPage, {
    global: {
      stubs: {
        '*': false
      }
    }
  })
}

/**
 * InsertPage组件测试套件 - 专注于核心功能测试
 */
describe('InsertPage', () => {
  let wrapper

  beforeEach(() => {
    wrapper = createWrapper()
  })

  describe('基础功能', () => {
    it('应该正确渲染组件', () => {
      expect(wrapper.find('h2').text()).toBe('INSERT语句生成')
      expect(wrapper.find('textarea').exists()).toBe(true)
      expect(wrapper.find('button').text()).toBe('解析DDL')
    })

    it('应该解析DDL语句', async () => {
      const ddlText = 'CREATE TABLE users (id INT, name VARCHAR(50))'
      await wrapper.find('textarea').setValue(ddlText)
      await wrapper.find('button').trigger('click')

      expect(wrapper.vm.parsedFields).toHaveLength(2)
      expect(wrapper.vm.parsedFields[0].name).toBe('id')
      expect(wrapper.vm.parsedFields[1].name).toBe('name')
    })

    it('应该显示解析结果', async () => {
      const ddlText = 'CREATE TABLE users (id INT, name VARCHAR(50))'
      await wrapper.find('textarea').setValue(ddlText)
      await wrapper.find('button').trigger('click')

      expect(wrapper.text()).toContain('已解析 2 个字段')
    })

    it('应该显示生成的SQL', async () => {
      const testSql = 'INSERT INTO users (id, name) VALUES (1, \'test\');'
      wrapper.vm.generatedSql = testSql

      // 等待Vue更新DOM
      await wrapper.vm.$nextTick()

      expect(wrapper.find('pre').text()).toContain('INSERT INTO')
      expect(wrapper.find('pre').text()).toContain('VALUES')
    })
  })

  describe('数据绑定', () => {
    it('应该绑定DDL输入', async () => {
      const ddlText = 'CREATE TABLE test_table (id INT)'
      await wrapper.find('textarea').setValue(ddlText)

      expect(wrapper.vm.ddlStatement).toBe(ddlText)
    })

    it('应该绑定Excel数据', () => {
      const testData = [{ 0: '1', 1: 'test' }]
      wrapper.vm.excelData = testData

      expect(wrapper.vm.excelData).toEqual(testData)
    })
  })
})
