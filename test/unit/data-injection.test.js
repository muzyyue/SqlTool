import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { useSqlGeneratorEnhanced } from '@/composables/sql/useSqlGeneratorEnhanced'
import { ref } from 'vue'

/**
 * 数据注入测试 - 通过构造不同类型的测试数据验证系统处理能力
 * 测试目标：验证系统的异常处理机制和边界情况处理
 */

describe('数据注入测试 - SQL 生成异常处理', () => {
  let mockDdlFields
  let mockCustomBindingManager
  let sqlGenerator

  beforeEach(() => {
    sqlGenerator = useSqlGeneratorEnhanced()
    
    mockDdlFields = [
      {
        name: 'id',
        type: 'int',
        isPrimaryKey: true,
        isIdentity: true
      },
      {
        name: 'file_name',
        type: 'varchar',
        length: 255,
        isNullable: false
      },
      {
        name: 'file_path',
        type: 'text',
        isNullable: false
      },
      {
        name: 'create_time',
        type: 'timestamptz',
        isNullable: true
      },
      {
        name: 'update_time',
        type: 'timestamptz',
        isNullable: true
      }
    ]
    
    mockCustomBindingManager = {
      customFields: ref([]),
      customBindings: ref([]),
      fieldConcatenationRules: ref([]),
      autoIncrementValues: {}
    }
  })

  afterEach(() => {
    mockDdlFields = null
    mockCustomBindingManager = null
    sqlGenerator = null
  })

  describe('正常数据测试', () => {
    it('应该正确处理标准的 Excel 数据', () => {
      const excelData = [
        ['test.txt', '/data/test.txt', 1024],
        ['document.pdf', '/data/document.pdf', 2048]
      ]
      
      const fieldMappings = [
        {
          ddlField: mockDdlFields[1],
          excelHeader: 'file_name',
          excelIndex: 0
        },
        {
          ddlField: mockDdlFields[2],
          excelHeader: 'file_path',
          excelIndex: 1
        }
      ]
      
      const result = sqlGenerator.generateInsertSql(
        'file_info',
        fieldMappings,
        excelData,
        {
          dbType: 'postgresql',
          format: 'formatted',
          batch: 100,
          comments: false,
          customBindingManager: mockCustomBindingManager
        }
      )
      
      expect(result).toBeDefined()
      expect(result).toContain('INSERT INTO')
      expect(result).toContain('VALUES')
      expect(result).toContain("'test.txt'")
      expect(result).toContain("'/data/test.txt'")
    })

    it('应该正确处理包含特殊字符的数据', () => {
      const excelData = [
        ["O'Reilly.txt", "/data/O'Reilly/file.txt", 1024]
      ]
      
      const fieldMappings = [
        {
          ddlField: mockDdlFields[1],
          excelHeader: 'file_name',
          excelIndex: 0
        },
        {
          ddlField: mockDdlFields[2],
          excelHeader: 'file_path',
          excelIndex: 1
        }
      ]
      
      const result = sqlGenerator.generateInsertSql(
        'file_info',
        fieldMappings,
        excelData,
        {
          dbType: 'postgresql',
          format: 'formatted',
          batch: 100,
          comments: false,
          customBindingManager: mockCustomBindingManager
        }
      )
      
      expect(result).toBeDefined()
      expect(result).toContain("O''Reilly")
    })

    it('应该正确处理包含换行符的数据', () => {
      const excelData = [
        ['multi\nline.txt', '/data/multi\nline.txt', 1024]
      ]
      
      const fieldMappings = [
        {
          ddlField: mockDdlFields[1],
          excelHeader: 'file_name',
          excelIndex: 0
        },
        {
          ddlField: mockDdlFields[2],
          excelHeader: 'file_path',
          excelIndex: 1
        }
      ]
      
      const result = sqlGenerator.generateInsertSql(
        'file_info',
        fieldMappings,
        excelData,
        {
          dbType: 'postgresql',
          format: 'formatted',
          batch: 100,
          comments: false,
          customBindingManager: mockCustomBindingManager
        }
      )
      
      expect(result).toBeDefined()
    })

    it('应该正确处理包含 Unicode 字符的数据', () => {
      const excelData = [
        ['测试文件.txt', '/data/测试文件.txt', 1024]
      ]
      
      const fieldMappings = [
        {
          ddlField: mockDdlFields[1],
          excelHeader: 'file_name',
          excelIndex: 0
        },
        {
          ddlField: mockDdlFields[2],
          excelHeader: 'file_path',
          excelIndex: 1
        }
      ]
      
      const result = sqlGenerator.generateInsertSql(
        'file_info',
        fieldMappings,
        excelData,
        {
          dbType: 'postgresql',
          format: 'formatted',
          batch: 100,
          comments: false,
          customBindingManager: mockCustomBindingManager
        }
      )
      
      expect(result).toBeDefined()
      expect(result).toContain('测试文件.txt')
    })
  })

  describe('边界数据测试', () => {
    it('应该正确处理空字符串值', () => {
      const excelData = [
        ['', '', 0]
      ]
      
      const fieldMappings = [
        {
          ddlField: mockDdlFields[1],
          excelHeader: 'file_name',
          excelIndex: 0
        },
        {
          ddlField: mockDdlFields[2],
          excelHeader: 'file_path',
          excelIndex: 1
        }
      ]
      
      const result = sqlGenerator.generateInsertSql(
        'file_info',
        fieldMappings,
        excelData,
        {
          dbType: 'postgresql',
          format: 'formatted',
          batch: 100,
          comments: false,
          customBindingManager: mockCustomBindingManager
        }
      )
      
      expect(result).toBeDefined()
    })

    it('应该正确处理 null 值', () => {
      const excelData = [
        [null, null, null]
      ]
      
      const fieldMappings = [
        {
          ddlField: mockDdlFields[1],
          excelHeader: 'file_name',
          excelIndex: 0
        },
        {
          ddlField: mockDdlFields[2],
          excelHeader: 'file_path',
          excelIndex: 1
        }
      ]
      
      const result = sqlGenerator.generateInsertSql(
        'file_info',
        fieldMappings,
        excelData,
        {
          dbType: 'postgresql',
          format: 'formatted',
          batch: 100,
          comments: false,
          customBindingManager: mockCustomBindingManager
        }
      )
      
      expect(result).toBeDefined()
      expect(result).toContain('NULL')
    })

    it('应该正确处理超长字符串', () => {
      const longString = 'a'.repeat(10000)
      const excelData = [
        [longString, '/data/long.txt', 1024]
      ]
      
      const fieldMappings = [
        {
          ddlField: mockDdlFields[1],
          excelHeader: 'file_name',
          excelIndex: 0
        },
        {
          ddlField: mockDdlFields[2],
          excelHeader: 'file_path',
          excelIndex: 1
        }
      ]
      
      const result = sqlGenerator.generateInsertSql(
        'file_info',
        fieldMappings,
        excelData,
        {
          dbType: 'postgresql',
          format: 'formatted',
          batch: 100,
          comments: false,
          customBindingManager: mockCustomBindingManager
        }
      )
      
      expect(result).toBeDefined()
      expect(result).toContain(longString)
    })

    it('应该正确处理极大数字值', () => {
      const largeNumber = Number.MAX_SAFE_INTEGER
      const excelData = [
        ['large.txt', largeNumber]
      ]
      
      const fieldMappings = [
        {
          ddlField: mockDdlFields[1],
          excelHeader: 'file_name',
          excelIndex: 0
        },
        {
          ddlField: { name: 'file_size', type: 'bigint', isNullable: true },
          excelHeader: 'file_size',
          excelIndex: 1
        }
      ]
      
      const result = sqlGenerator.generateInsertSql(
        'file_info',
        fieldMappings,
        excelData,
        {
          dbType: 'postgresql',
          format: 'formatted',
          batch: 100,
          comments: false,
          customBindingManager: mockCustomBindingManager
        }
      )
      
      expect(result).toBeDefined()
      expect(result).toContain(largeNumber.toString())
    })

    it('应该正确处理负数', () => {
      const excelData = [
        ['negative.txt', -100]
      ]
      
      const fieldMappings = [
        {
          ddlField: mockDdlFields[1],
          excelHeader: 'file_name',
          excelIndex: 0
        },
        {
          ddlField: { name: 'file_size', type: 'int', isNullable: true },
          excelHeader: 'file_size',
          excelIndex: 1
        }
      ]
      
      const result = sqlGenerator.generateInsertSql(
        'file_info',
        fieldMappings,
        excelData,
        {
          dbType: 'postgresql',
          format: 'formatted',
          batch: 100,
          comments: false,
          customBindingManager: mockCustomBindingManager
        }
      )
      
      expect(result).toBeDefined()
      expect(result).toContain('-100')
    })

    it('应该正确处理小数', () => {
      const excelData = [
        ['decimal.txt', 1024.567]
      ]
      
      const fieldMappings = [
        {
          ddlField: mockDdlFields[1],
          excelHeader: 'file_name',
          excelIndex: 0
        },
        {
          ddlField: { name: 'file_size', type: 'decimal', isNullable: true },
          excelHeader: 'file_size',
          excelIndex: 1
        }
      ]
      
      const result = sqlGenerator.generateInsertSql(
        'file_info',
        fieldMappings,
        excelData,
        {
          dbType: 'postgresql',
          format: 'formatted',
          batch: 100,
          comments: false,
          customBindingManager: mockCustomBindingManager
        }
      )
      
      expect(result).toBeDefined()
      expect(result).toContain('1024.567')
    })
  })

  describe('异常数据测试', () => {
    it('应该正确处理 undefined 字段值', () => {
      const excelData = [
        [undefined, undefined, undefined]
      ]
      
      const fieldMappings = [
        {
          ddlField: mockDdlFields[1],
          excelHeader: 'file_name',
          excelIndex: 0
        },
        {
          ddlField: mockDdlFields[2],
          excelHeader: 'file_path',
          excelIndex: 1
        }
      ]
      
      const result = sqlGenerator.generateInsertSql(
        'file_info',
        fieldMappings,
        excelData,
        {
          dbType: 'postgresql',
          format: 'formatted',
          batch: 100,
          comments: false,
          customBindingManager: mockCustomBindingManager
        }
      )
      
      expect(result).toBeDefined()
      expect(result).toContain('NULL')
    })

    it('应该正确处理对象类型值', () => {
      const objValue = { toString: () => 'object.txt' }
      const excelData = [
        [objValue, '/data/object.txt', 1024]
      ]
      
      const fieldMappings = [
        {
          ddlField: mockDdlFields[1],
          excelHeader: 'file_name',
          excelIndex: 0
        },
        {
          ddlField: mockDdlFields[2],
          excelHeader: 'file_path',
          excelIndex: 1
        }
      ]
      
      const result = sqlGenerator.generateInsertSql(
        'file_info',
        fieldMappings,
        excelData,
        {
          dbType: 'postgresql',
          format: 'formatted',
          batch: 100,
          comments: false,
          customBindingManager: mockCustomBindingManager
        }
      )
      
      expect(result).toBeDefined()
    })

    it('应该正确处理数组类型值', () => {
      const excelData = [
        [['array', 'value'], '/data/array.txt', 1024]
      ]
      
      const fieldMappings = [
        {
          ddlField: mockDdlFields[1],
          excelHeader: 'file_name',
          excelIndex: 0
        },
        {
          ddlField: mockDdlFields[2],
          excelHeader: 'file_path',
          excelIndex: 1
        }
      ]
      
      const result = sqlGenerator.generateInsertSql(
        'file_info',
        fieldMappings,
        excelData,
        {
          dbType: 'postgresql',
          format: 'formatted',
          batch: 100,
          comments: false,
          customBindingManager: mockCustomBindingManager
        }
      )
      
      expect(result).toBeDefined()
    })

    it('应该正确处理包含 SQL 注入的数据', () => {
      const excelData = [
        ["'; DROP TABLE file_info; --", '/data/malicious.txt', 1024]
      ]
      
      const fieldMappings = [
        {
          ddlField: mockDdlFields[1],
          excelHeader: 'file_name',
          excelIndex: 0
        },
        {
          ddlField: mockDdlFields[2],
          excelHeader: 'file_path',
          excelIndex: 1
        }
      ]
      
      const result = sqlGenerator.generateInsertSql(
        'file_info',
        fieldMappings,
        excelData,
        {
          dbType: 'postgresql',
          format: 'formatted',
          batch: 100,
          comments: false,
          customBindingManager: mockCustomBindingManager
        }
      )
      
      expect(result).toBeDefined()
    })

    it('应该正确处理包含 XSS 攻击的数据', () => {
      const excelData = [
        ['<script>alert("XSS")</script>', '/data/xss.txt', 1024]
      ]
      
      const fieldMappings = [
        {
          ddlField: mockDdlFields[1],
          excelHeader: 'file_name',
          excelIndex: 0
        },
        {
          ddlField: mockDdlFields[2],
          excelHeader: 'file_path',
          excelIndex: 1
        }
      ]
      
      const result = sqlGenerator.generateInsertSql(
        'file_info',
        fieldMappings,
        excelData,
        {
          dbType: 'postgresql',
          format: 'formatted',
          batch: 100,
          comments: false,
          customBindingManager: mockCustomBindingManager
        }
      )
      
      expect(result).toBeDefined()
      expect(result).toContain('<script>')
    })

    it('应该正确处理包含特殊字符的数据', () => {
      const excelData = [
        ['file@#$%^&*().txt', '/data/special.txt', 1024]
      ]
      
      const fieldMappings = [
        {
          ddlField: mockDdlFields[1],
          excelHeader: 'file_name',
          excelIndex: 0
        },
        {
          ddlField: mockDdlFields[2],
          excelHeader: 'file_path',
          excelIndex: 1
        }
      ]
      
      const result = sqlGenerator.generateInsertSql(
        'file_info',
        fieldMappings,
        excelData,
        {
          dbType: 'postgresql',
          format: 'formatted',
          batch: 100,
          comments: false,
          customBindingManager: mockCustomBindingManager
        }
      )
      
      expect(result).toBeDefined()
      expect(result).toContain('file@#$%^&*().txt')
    })
  })

  describe('自定义字段数据注入测试', () => {
    it('应该正确处理系统函数配置', () => {
      mockCustomBindingManager.customFields.value = [
        {
          fieldName: 'create_time',
          dataType: 'timestamptz',
          dataSource: 'system_function',
          systemFunctionConfig: {
            databaseType: 'postgresql',
            functionName: 'CURRENT_TIMESTAMP'
          }
        }
      ]
      
      const excelData = [
        ['test.txt', '/data/test.txt', 1024]
      ]
      
      const fieldMappings = [
        {
          ddlField: mockDdlFields[1],
          excelHeader: 'file_name',
          excelIndex: 0
        },
        {
          ddlField: mockDdlFields[2],
          excelHeader: 'file_path',
          excelIndex: 1
        },
        {
          ddlField: { ...mockDdlFields[3], isCustom: true },
          excelHeader: null,
          excelIndex: -1
        }
      ]
      
      const result = sqlGenerator.generateInsertSql(
        'file_info',
        fieldMappings,
        excelData,
        {
          dbType: 'postgresql',
          format: 'formatted',
          batch: 100,
          comments: false,
          customBindingManager: mockCustomBindingManager
        }
      )
      
      expect(result).toBeDefined()
      expect(result).toContain('CURRENT_TIMESTAMP')
    })

    it('应该正确处理拼接字段配置', () => {
      mockCustomBindingManager.fieldConcatenationRules.value = [
        {
          ddlFieldName: 'full_path',
          dataType: 'text',
          sourceColumns: [0, 1],
          separator: '/'
        }
      ]
      
      const excelData = [
        ['test.txt', 'data', 1024]
      ]
      
      const fieldMappings = [
        {
          ddlField: mockDdlFields[1],
          excelHeader: 'file_name',
          excelIndex: 0
        },
        {
          ddlField: mockDdlFields[2],
          excelHeader: 'file_path',
          excelIndex: 1
        },
        {
          ddlField: { name: 'full_path', type: 'text', isCustom: true },
          excelHeader: null,
          excelIndex: -1
        }
      ]
      
      const result = sqlGenerator.generateInsertSql(
        'file_info',
        fieldMappings,
        excelData,
        {
          dbType: 'postgresql',
          format: 'formatted',
          batch: 100,
          comments: false,
          customBindingManager: mockCustomBindingManager
        }
      )
      
      expect(result).toBeDefined()
    })
  })
})
