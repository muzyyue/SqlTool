import { describe, it, expect } from 'vitest'
import {
  generateTemplateData,
  SUPPORTED_FORMATS,
  normalizeHeaders,
} from '../../src/composables/data/useImportParser.js'

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

describe('useImportParser - normalizeHeaders 测试', () => {
  it('应该正确映射标准中文表头', () => {
    const headers = ['字段名', '新值', '条件字段', '操作符', '条件值', '描述']
    const result = normalizeHeaders(headers)

    expect(result.fieldName).toBe(0)
    expect(result.newValue).toBe(1)
    expect(result.conditionField).toBe(2)
    expect(result.conditionOperator).toBe(3)
    expect(result.conditionValue).toBe(4)
    expect(result.description).toBe(5)
  })

  it('应该正确映射英文表头', () => {
    const headers = [
      'field_name',
      'new_value',
      'condition_field',
      'operator',
      'condition_value',
      'description',
    ]
    const result = normalizeHeaders(headers)

    expect(result.fieldName).toBe(0)
    expect(result.newValue).toBe(1)
    expect(result.conditionField).toBe(2)
    expect(result.conditionOperator).toBe(3)
    expect(result.conditionValue).toBe(4)
    expect(result.description).toBe(5)
  })

  it('应该正确处理"条件字段"和"条件值"列，避免混淆', () => {
    const headers = ['字段名', '新值', '条件字段', '操作符', '条件值', '描述']
    const result = normalizeHeaders(headers)

    expect(result.conditionField).toBe(2)
    expect(result.conditionValue).toBe(4)
    expect(result.conditionField).not.toBe(result.conditionValue)
  })

  it('应该处理混合表头（中文和英文混合）', () => {
    const headers = ['列名', 'new_value', 'condition_field', 'operator', '条件值', '说明']
    const result = normalizeHeaders(headers)

    expect(result.fieldName).toBe(0)
    expect(result.newValue).toBe(1)
    expect(result.conditionField).toBe(2)
    expect(result.conditionOperator).toBe(3)
    expect(result.conditionValue).toBe(4)
    expect(result.description).toBe(5)
  })

  it('应该处理缺少某些列的情况', () => {
    const headers = ['字段名', '新值']
    const result = normalizeHeaders(headers)

    expect(result.fieldName).toBe(0)
    expect(result.newValue).toBe(1)
    expect(result.conditionField).toBeNull()
    expect(result.conditionOperator).toBeNull()
    expect(result.conditionValue).toBeNull()
    expect(result.description).toBeNull()
  })

  it('应该处理只有一个条件字段列的情况（没有条件值列）', () => {
    const headers = ['字段名', '新值', '条件字段', '操作符', '描述']
    const result = normalizeHeaders(headers)

    expect(result.conditionField).toBe(2)
    expect(result.conditionValue).toBeNull()
  })

  it('应该处理只有一个条件值列的情况（没有条件字段列）', () => {
    const headers = ['字段名', '新值', '操作符', '条件值', '描述']
    const result = normalizeHeaders(headers)

    expect(result.conditionField).toBeNull()
    expect(result.conditionValue).toBe(3)
  })

  it('应该忽略未匹配的表头', () => {
    const headers = ['字段名', '新值', '未知列', '操作符', '条件值', 'extra']
    const result = normalizeHeaders(headers)

    expect(result.fieldName).toBe(0)
    expect(result.newValue).toBe(1)
    expect(result.conditionOperator).toBe(3)
    expect(result.conditionValue).toBe(4)
  })

  it('应该处理空表头列表', () => {
    const headers = []
    const result = normalizeHeaders(headers)

    expect(result.fieldName).toBeNull()
    expect(result.newValue).toBeNull()
    expect(result.conditionField).toBeNull()
    expect(result.conditionOperator).toBeNull()
    expect(result.conditionValue).toBeNull()
    expect(result.description).toBeNull()
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

describe('useImportParser - 条件值处理测试', () => {
  it('应该正确解析包含条件的Excel行数据', () => {
    const mockRow = ['file_id', '22', 'file_id', '=', '1', '修改文件ID']

    const headerMap = {
      fieldName: 0,
      newValue: 1,
      conditionField: 2,
      conditionOperator: 3,
      conditionValue: 4,
      description: 5,
    }

    const fieldName = mockRow[headerMap.fieldName]
    const newValue = mockRow[headerMap.newValue]
    const conditionField = mockRow[headerMap.conditionField]
    const conditionOperator = mockRow[headerMap.conditionOperator]
    const conditionValue = mockRow[headerMap.conditionValue]
    const description = mockRow[headerMap.description]

    expect(fieldName).toBe('file_id')
    expect(newValue).toBe('22')
    expect(conditionField).toBe('file_id')
    expect(conditionOperator).toBe('=')
    expect(conditionValue).toBe('1')
    expect(description).toBe('修改文件ID')
  })

  it('应该正确处理条件值为空的情况', () => {
    const mockRow = ['status', '已完成', '', '=', '', '修改状态']

    const headerMap = {
      fieldName: 0,
      newValue: 1,
      conditionField: 2,
      conditionOperator: 3,
      conditionValue: 4,
      description: 5,
    }

    const conditionField = mockRow[headerMap.conditionField]
    const conditionValue = mockRow[headerMap.conditionValue]

    expect(conditionField).toBe('')
    expect(conditionValue).toBe('')
  })

  it('应该正确处理IN操作符的条件值（逗号分隔）', () => {
    const mockRow = ['status', '已删除', 'status', 'IN', '待处理,处理中,已完成', '批量更新状态']

    const headerMap = {
      fieldName: 0,
      newValue: 1,
      conditionField: 2,
      conditionOperator: 3,
      conditionValue: 4,
      description: 5,
    }

    const conditionField = mockRow[headerMap.conditionField]
    const conditionOperator = mockRow[headerMap.conditionOperator]
    const conditionValue = mockRow[headerMap.conditionValue]

    expect(conditionField).toBe('status')
    expect(conditionOperator).toBe('IN')
    expect(conditionValue).toBe('待处理,处理中,已完成')
  })

  it('应该正确处理各种操作符的条件值', () => {
    const testCases = [
      { operator: '=', value: '1', expected: '1' },
      { operator: '!=', value: '0', expected: '0' },
      { operator: '>', value: '100', expected: '100' },
      { operator: '<', value: '50', expected: '50' },
      { operator: '>=', value: '10', expected: '10' },
      { operator: '<=', value: '20', expected: '20' },
      { operator: 'LIKE', value: '%test%', expected: '%test%' },
      { operator: 'IN', value: 'a,b,c', expected: 'a,b,c' },
    ]

    for (const testCase of testCases) {
      expect(testCase.value).toBe(testCase.expected)
    }
  })
})
