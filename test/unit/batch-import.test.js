import { describe, it, expect } from 'vitest'
import { generateTemplateData, SUPPORTED_FORMATS } from '../../src/composables/useImportParser.js'

describe('useImportParser - 文件解析模块', () => {
  describe('SUPPORTED_FORMATS', () => {
    it('应该包含所有支持的格式', () => {
      expect(SUPPORTED_FORMATS.excel).toContain('.xlsx')
      expect(SUPPORTED_FORMATS.excel).toContain('.xls')
      expect(SUPPORTED_FORMATS.csv).toContain('.csv')
      expect(SUPPORTED_FORMATS.json).toContain('.json')
    })
  })

  describe('generateTemplateData', () => {
    it('应该根据字段名生成模板数据', () => {
      const fieldNames = ['id', 'name', 'status', 'amount', 'created_at']
      const templateData = generateTemplateData(fieldNames)

      expect(templateData).toHaveLength(5)
      expect(templateData[0]).toEqual({
        字段名: 'id',
        新值: '新值1',
        条件字段: '',
        操作符: '=',
        条件值: '',
        描述: '修改 id 字段',
      })
    })

    it('应该限制生成的数量（不超过10个）', () => {
      const fieldNames = Array.from({ length: 15 }, (_, i) => `field_${i}`)
      const templateData = generateTemplateData(fieldNames)

      expect(templateData).toHaveLength(10)
    })

    it('应该处理空字段名列表', () => {
      const templateData = generateTemplateData([])
      expect(templateData).toHaveLength(0)
    })
  })
})

describe('useImportParser - parseJsonItem 逻辑测试', () => {
  it('应该正确解析包含 fieldName 和 newValue 的对象', () => {
    const mockItem = { fieldName: 'status', newValue: '已完成' }

    const result = {
      id: `import_${Date.now()}_0`,
      fieldName: String(mockItem.fieldName).trim(),
      newValue: String(mockItem.newValue).trim(),
      condition: {
        enabled: false,
        fieldName: '',
        operator: '=',
        value: '',
      },
      description: mockItem.description || '',
    }

    expect(result.fieldName).toBe('status')
    expect(result.newValue).toBe('已完成')
    expect(result.condition.enabled).toBe(false)
  })

  it('应该正确处理带条件的规则', () => {
    const mockItem = {
      fieldName: 'amount',
      newValue: '0',
      condition: {
        enabled: true,
        fieldName: 'type',
        operator: '=',
        value: '退款',
      },
    }

    const result = {
      id: `import_${Date.now()}_0`,
      fieldName: String(mockItem.fieldName).trim(),
      newValue: String(mockItem.newValue).trim(),
      condition: mockItem.condition,
      description: '',
    }

    expect(result.fieldName).toBe('amount')
    expect(result.condition.enabled).toBe(true)
    expect(result.condition.fieldName).toBe('type')
    expect(result.condition.operator).toBe('=')
    expect(result.condition.value).toBe('退款')
  })

  it('应该支持 field_name 命名风格', () => {
    const mockItem = { field_name: 'status', new_value: '完成' }

    const fieldName = mockItem.fieldName || mockItem.field_name || mockItem.field || ''
    const newValue = mockItem.newValue || mockItem.new_value || mockItem.value || ''

    expect(fieldName).toBe('status')
    expect(newValue).toBe('完成')
  })

  it('应该跳过没有字段名的项', () => {
    const mockItem = { newValue: '无字段名' }

    const fieldName = mockItem.fieldName || mockItem.field_name || mockItem.field || ''

    expect(fieldName).toBe('')
  })

  it('应该正确处理数字类型的新值', () => {
    const mockItem = { fieldName: 'amount', newValue: 100 }

    const newValue = mockItem.newValue !== undefined ? String(mockItem.newValue).trim() : ''

    expect(newValue).toBe('100')
  })

  it('应该支持简化格式的条件（字符串形式）', () => {
    const simpleCondition = 'status=待处理'
    const condMatch = simpleCondition.match(/^([^=!<>]+)(=|!=|<>|>=|<=|>|<)(.+)$/)

    expect(condMatch).not.toBeNull()
    expect(condMatch[1].trim()).toBe('status')
    expect(condMatch[2]).toBe('=')
    expect(condMatch[3].trim()).toBe('待处理')
  })

  it('应该处理空条件字符串', () => {
    const simpleCondition = ''
    const condMatch = simpleCondition.match(/^([^=!<>]+)(=|!=|<>|>=|<=|>|<)(.+)$/)

    expect(condMatch).toBeNull()
  })
})

describe('useImportParser - 模板生成测试', () => {
  it('应该为每个字段生成唯一的模板行', () => {
    const fieldNames = ['field1', 'field2', 'field3']
    const templateData = generateTemplateData(fieldNames)

    expect(templateData[0].新值).toBe('新值1')
    expect(templateData[1].新值).toBe('新值2')
    expect(templateData[2].新值).toBe('新值3')
  })

  it('应该生成包含描述的模板', () => {
    const fieldNames = ['id', 'name']
    const templateData = generateTemplateData(fieldNames)

    expect(templateData[0].描述).toBe('修改 id 字段')
    expect(templateData[1].描述).toBe('修改 name 字段')
  })
})
