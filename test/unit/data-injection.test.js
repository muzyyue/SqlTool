import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { generateBatchInsertSql } from '@/composables/sql/useSqlGeneratorEnhanced'
import { ref } from 'vue'

/**
 * 数据注入测试 - 通过构造不同类型的测试数据验证系统处理能力
 * 测试目标：验证系统的异常处理机制和边界情况处理
 */

describe('数据注入测试 - SQL 生成异常处理', () => {
  let mockDdlFields
  let mockCustomBindingManager

  beforeEach(() => {
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
  })

  describe('正常数据测试', () => {
    it('应该正确处理标准的 Excel 数据', () => {
      const excelData = [
        {
          file_name: 'test.txt',
          file_path: '/data/test.txt',
          file_size: 1024
        },
        {
          file_name: 'document.pdf',
          file_path: '/data/document.pdf',
          file_size: 2048
        }
      ]
      
      const fieldMappings = [
        {
          ddlField: mockDdlFields[0],
          excelColumn: { header: 'id', index: 0 },
          excelIndex: 0
        },
        {
          ddlField: mockDdlFields[1],
          excelColumn: { header: 'file_name', index: 1 },
          excelIndex: 1
        },
        {
          ddlField: mockDdlFields[2],
          excelColumn: { header: 'file_path', index: 2 },
          excelIndex: 2
        }
      ]
      
      const result = generateBatchInsertSql(
        excelData,
        fieldMappings,
        mockDdlFields,
        'file_info',
        'postgresql',
        mockCustomBindingManager
      )
      
      expect(result).toBeDefined()
      expect(result).toContain('INSERT INTO "file_info"')
      expect(result).toContain('VALUES')
      expect(result).toContain("'test.txt'")
      expect(result).toContain("'/data/test.txt'")
    })

    it('应该正确处理包含特殊字符的数据', () => {
      const excelData = [
        {
          file_name: "O'Reilly.txt",
          file_path: "/data/O'Reilly/file.txt",
          file_size: 1024
        }
      ]
      
      const fieldMappings = [
        {
          ddlField: mockDdlFields[0],
          excelColumn: { header: 'id', index: 0 },
          excelIndex: 0
        },
        {
          ddlField: mockDdlFields[1],
          excelColumn: { header: 'file_name', index: 1 },
          excelIndex: 1
        },
        {
          ddlField: mockDdlFields[2],
          excelColumn: { header: 'file_path', index: 2 },
          excelIndex: 2
        }
      ]
      
      const result = generateBatchInsertSql(
        excelData,
        fieldMappings,
        mockDdlFields,
        'file_info',
        'postgresql',
        mockCustomBindingManager
      )
      
      expect(result).toBeDefined()
      expect(result).toContain("O''Reilly.txt'")
      expect(result).toContain("'/data/O''Reilly/file.txt'")
    })

    it('应该正确处理包含换行符的数据', () => {
      const excelData = [
        {
          file_name: 'multi\nline.txt',
          file_path: '/data/multi\nline.txt',
          file_size: 1024
        }
      ]
      
      const fieldMappings = [
        {
          ddlField: mockDdlFields[0],
          excelColumn: { header: 'id', index: 0 },
          excelIndex: 0
        },
        {
          ddlField: mockDdlFields[1],
          excelColumn: { header: 'file_name', index: 1 },
          excelIndex: 1
        },
        {
          ddlField: mockDdlFields[2],
          excelColumn: { header: 'file_path', index: 2 },
          excelIndex: 2
        }
      ]
      
      const result = generateBatchInsertSql(
        excelData,
        fieldMappings,
        mockDdlFields,
        'file_info',
        'postgresql',
        mockCustomBindingManager
      )
      
      expect(result).toBeDefined()
      expect(result).toContain('multi\\nline.txt')
    })

    it('应该正确处理包含 Unicode 字符的数据', () => {
      const excelData = [
        {
          file_name: '测试文件.txt',
          file_path: '/data/测试文件.txt',
          file_size: 1024
        }
      ]
      
      const fieldMappings = [
        {
          ddlField: mockDdlFields[0],
          excelColumn: { header: 'id', index: 0 },
          excelIndex: 0
        },
        {
          ddlField: mockDdlFields[1],
          excelColumn: { header: 'file_name', index: 1 },
          excelIndex: 1
        },
        {
          ddlField: mockDdlFields[2],
          excelColumn: { header: 'file_path', index: 2 },
          excelIndex: 2
        }
      ]
      
      const result = generateBatchInsertSql(
        excelData,
        fieldMappings,
        mockDdlFields,
        'file_info',
        'postgresql',
        mockCustomBindingManager
      )
      
      expect(result).toBeDefined()
      expect(result).toContain('测试文件.txt')
    })
  })

  describe('边界数据测试', () => {
    it('应该正确处理空字符串值', () => {
      const excelData = [
        {
          file_name: '',
          file_path: '',
          file_size: 0
        }
      ]
      
      const fieldMappings = [
        {
          ddlField: mockDdlFields[0],
          excelColumn: { header: 'id', index: 0 },
          excelIndex: 0
        },
        {
          ddlField: mockDdlFields[1],
          excelColumn: { header: 'file_name', index: 1 },
          excelIndex: 1
        },
        {
          ddlField: mockDdlFields[2],
          excelColumn: { header: 'file_path', index: 2 },
          excelIndex: 2
        }
      ]
      
      const result = generateBatchInsertSql(
        excelData,
        fieldMappings,
        mockDdlFields,
        'file_info',
        'postgresql',
        mockCustomBindingManager
      )
      
      expect(result).toBeDefined()
      expect(result).toContain("''")
    })

    it('应该正确处理 null 值', () => {
      const excelData = [
        {
          file_name: null,
          file_path: null,
          file_size: null
        }
      ]
      
      const fieldMappings = [
        {
          ddlField: mockDdlFields[0],
          excelColumn: { header: 'id', index: 0 },
          excelIndex: 0
        },
        {
          ddlField: mockDdlFields[1],
          excelColumn: { header: 'file_name', index: 1 },
          excelIndex: 1
        },
        {
          ddlField: mockDdlFields[2],
          excelColumn: { header: 'file_path', index: 2 },
          excelIndex: 2
        }
      ]
      
      const result = generateBatchInsertSql(
        excelData,
        fieldMappings,
        mockDdlFields,
        'file_info',
        'postgresql',
        mockCustomBindingManager
      )
      
      expect(result).toBeDefined()
      expect(result).toContain('NULL')
    })

    it('应该正确处理超长字符串', () => {
      const longString = 'a'.repeat(10000)
      const excelData = [
        {
          file_name: longString,
          file_path: '/data/long.txt',
          file_size: 1024
        }
      ]
      
      const fieldMappings = [
        {
          ddlField: mockDdlFields[0],
          excelColumn: { header: 'id', index: 0 },
          excelIndex: 0
        },
        {
          ddlField: mockDdlFields[1],
          excelColumn: { header: 'file_name', index: 1 },
          excelIndex: 1
        },
        {
          ddlField: mockDdlFields[2],
          excelColumn: { header: 'file_path', index: 2 },
          excelIndex: 2
        }
      ]
      
      const result = generateBatchInsertSql(
        excelData,
        fieldMappings,
        mockDdlFields,
        'file_info',
        'postgresql',
        mockCustomBindingManager
      )
      
      expect(result).toBeDefined()
      expect(result).toContain(longString)
    })

    it('应该正确处理极大数字值', () => {
      const largeNumber = Number.MAX_SAFE_INTEGER
      const excelData = [
        {
          file_name: 'large.txt',
          file_path: '/data/large.txt',
          file_size: largeNumber
        }
      ]
      
      const fieldMappings = [
        {
          ddlField: mockDdlFields[0],
          excelColumn: { header: 'id', index: 0 },
          excelIndex: 0
        },
        {
          ddlField: mockDdlFields[1],
          excelColumn: { header: 'file_name', index: 1 },
          excelIndex: 1
        },
        {
          ddlField: mockDdlFields[2],
          excelColumn: { header: 'file_path', index: 2 },
          excelIndex: 2
        }
      ]
      
      const result = generateBatchInsertSql(
        excelData,
        fieldMappings,
        mockDdlFields,
        'file_info',
        'postgresql',
        mockCustomBindingManager
      )
      
      expect(result).toBeDefined()
      expect(result).toContain(largeNumber.toString())
    })

    it('应该正确处理负数', () => {
      const excelData = [
        {
          file_name: 'negative.txt',
          file_path: '/data/negative.txt',
          file_size: -100
        }
      ]
      
      const fieldMappings = [
        {
          ddlField: mockDdlFields[0],
          excelColumn: { header: 'id', index: 0 },
          excelIndex: 0
        },
        {
          ddlField: mockDdlFields[1],
          excelColumn: { header: 'file_name', index: 1 },
          excelIndex: 1
        },
        {
          ddlField: mockDdlFields[2],
          excelColumn: { header: 'file_path', index: 2 },
          excelIndex: 2
        }
      ]
      
      const result = generateBatchInsertSql(
        excelData,
        fieldMappings,
        mockDdlFields,
        'file_info',
        'postgresql',
        mockCustomBindingManager
      )
      
      expect(result).toBeDefined()
      expect(result).toContain('-100')
    })

    it('应该正确处理小数', () => {
      const excelData = [
        {
          file_name: 'decimal.txt',
          file_path: '/data/decimal.txt',
          file_size: 1024.567
        }
      ]
      
      const fieldMappings = [
        {
          ddlField: mockDdlFields[0],
          excelColumn: { header: 'id', index: 0 },
          excelIndex: 0
        },
        {
          ddlField: mockDdlFields[1],
          excelColumn: { header: 'file_name', index: 1 },
          excelIndex: 1
        },
        {
          ddlField: mockDdlFields[2],
          excelColumn: { header: 'file_path', index: 2 },
          excelIndex: 2
        }
      ]
      
      const result = generateBatchInsertSql(
        excelData,
        fieldMappings,
        mockDdlFields,
        'file_info',
        'postgresql',
        mockCustomBindingManager
      )
      
      expect(result).toBeDefined()
      expect(result).toContain('1024.567')
    })
  })

  describe('异常数据测试', () => {
    it('应该正确处理 undefined 字段值', () => {
      const excelData = [
        {
          file_name: undefined,
          file_path: undefined,
          file_size: undefined
        }
      ]
      
      const fieldMappings = [
        {
          ddlField: mockDdlFields[0],
          excelColumn: { header: 'id', index: 0 },
          excelIndex: 0
        },
        {
          ddlField: mockDdlFields[1],
          excelColumn: { header: 'file_name', index: 1 },
          excelIndex: 1
        },
        {
          ddlField: mockDdlFields[2],
          excelColumn: { header: 'file_path', index: 2 },
          excelIndex: 2
        }
      ]
      
      const result = generateBatchInsertSql(
        excelData,
        fieldMappings,
        mockDdlFields,
        'file_info',
        'postgresql',
        mockCustomBindingManager
      )
      
      expect(result).toBeDefined()
      expect(result).toContain('NULL')
    })

    it('应该正确处理对象类型值', () => {
      const excelData = [
        {
          file_name: { toString: () => 'object.txt' },
          file_path: '/data/object.txt',
          file_size: 1024
        }
      ]
      
      const fieldMappings = [
        {
          ddlField: mockDdlFields[0],
          excelColumn: { header: 'id', index: 0 },
          excelIndex: 0
        },
        {
          ddlField: mockDdlFields[1],
          excelColumn: { header: 'file_name', index: 1 },
          excelIndex: 1
        },
        {
          ddlField: mockDdlFields[2],
          excelColumn: { header: 'file_path', index: 2 },
          excelIndex: 2
        }
      ]
      
      const result = generateBatchInsertSql(
        excelData,
        fieldMappings,
        mockDdlFields,
        'file_info',
        'postgresql',
        mockCustomBindingManager
      )
      
      expect(result).toBeDefined()
    })

    it('应该正确处理数组类型值', () => {
      const excelData = [
        {
          file_name: ['array', 'value'],
          file_path: '/data/array.txt',
          file_size: 1024
        }
      ]
      
      const fieldMappings = [
        {
          ddlField: mockDdlFields[0],
          excelColumn: { header: 'id', index: 0 },
          excelIndex: 0
        },
        {
          ddlField: mockDdlFields[1],
          excelColumn: { header: 'file_name', index: 1 },
          excelIndex: 1
        },
        {
          ddlField: mockDdlFields[2],
          excelColumn: { header: 'file_path', index: 2 },
          excelIndex: 2
        }
      ]
      
      const result = generateBatchInsertSql(
        excelData,
        fieldMappings,
        mockDdlFields,
        'file_info',
        'postgresql',
        mockCustomBindingManager
      )
      
      expect(result).toBeDefined()
    })

    it('应该正确处理包含 SQL 注入的数据', () => {
      const excelData = [
        {
          file_name: "'; DROP TABLE file_info; --",
          file_path: '/data/malicious.txt',
          file_size: 1024
        }
      ]
      
      const fieldMappings = [
        {
          ddlField: mockDdlFields[0],
          excelColumn: { header: 'id', index: 0 },
          excelIndex: 0
        },
        {
          ddlField: mockDdlFields[1],
          excelColumn: { header: 'file_name', index: 1 },
          excelIndex: 1
        },
        {
          ddlField: mockDdlFields[2],
          excelColumn: { header: 'file_path', index: 2 },
          excelIndex: 2
        }
      ]
      
      const result = generateBatchInsertSql(
        excelData,
        fieldMappings,
        mockDdlFields,
        'file_info',
        'postgresql',
        mockCustomBindingManager
      )
      
      expect(result).toBeDefined()
      // SQL 注入被转义为字符串
      expect(result).toContain("'; DROP TABLE file_info; --")
    })

    it('应该正确处理包含 XSS 攻击的数据', () => {
      const excelData = [
        {
          file_name: '<script>alert("XSS")</script>',
          file_path: '/data/xss.txt',
          file_size: 1024
        }
      ]
      
      const fieldMappings = [
        {
          ddlField: mockDdlFields[0],
          excelColumn: { header: 'id', index: 0 },
          excelIndex: 0
        },
        {
          ddlField: mockDdlFields[1],
          excelColumn: { header: 'file_name', index: 1 },
          excelIndex: 1
        },
        {
          ddlField: mockDdlFields[2],
          excelColumn: { header: 'file_path', index: 2 },
          excelIndex: 2
        }
      ]
      
      const result = generateBatchInsertSql(
        excelData,
        fieldMappings,
        mockDdlFields,
        'file_info',
        'postgresql',
        mockCustomBindingManager
      )
      
      expect(result).toBeDefined()
      expect(result).toContain('<script>alert("XSS")</script>')
    })

    it('应该正确处理包含特殊字符的数据', () => {
      const excelData = [
        {
          file_name: 'file@#$%^&*().txt',
          file_path: '/data/special.txt',
          file_size: 1024
        }
      ]
      
      const fieldMappings = [
        {
          ddlField: mockDdlFields[0],
          excelColumn: { header: 'id', index: 0 },
          excelIndex: 0
        },
        {
          ddlField: mockDdlFields[1],
          excelColumn: { header: 'file_name', index: 1 },
          excelIndex: 1
        },
        {
          ddlField: mockDdlFields[2],
          excelColumn: { header: 'file_path', index: 2 },
          excelIndex: 2
        }
      ]
      
      const result = generateBatchInsertSql(
        excelData,
        fieldMappings,
        mockDdlFields,
        'file_info',
        'postgresql',
        mockCustomBindingManager
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
        {
          file_name: 'test.txt',
          file_path: '/data/test.txt',
          file_size: 1024
        }
      ]
      
      const fieldMappings = [
        {
          ddlField: mockDdlFields[0],
          excelColumn: { header: 'id', index: 0 },
          excelIndex: 0
        },
        {
          ddlField: mockDdlFields[1],
          excelColumn: { header: 'file_name', index: 1 },
          excelIndex: 1
        },
        {
          ddlField: mockDdlFields[2],
          excelColumn: { header: 'file_path', index: 2 },
          excelIndex: 2
        },
        {
          ddlField: mockDdlFields[3],
          excelColumn: null,
          excelIndex: -1
        }
      ]
      
      const result = generateBatchInsertSql(
        excelData,
        fieldMappings,
        mockDdlFields,
        'file_info',
        'postgresql',
        mockCustomBindingManager
      )
      
      expect(result).toBeDefined()
      expect(result).toContain('CURRENT_TIMESTAMP')
      expect(result).not.toContain('UUID()')
    })

    it('应该正确处理自增字段配置', () => {
      mockCustomBindingManager.autoIncrementValues = {
        'id': 1
      }
      
      const excelData = [
        {
          file_name: 'test.txt',
          file_path: '/data/test.txt',
          file_size: 1024
        }
      ]
      
      const fieldMappings = [
        {
          ddlField: mockDdlFields[0],
          excelColumn: { header: 'id', index: 0 },
          excelIndex: 0
        },
        {
          ddlField: mockDdlFields[1],
          excelColumn: { header: 'file_name', index: 1 },
          excelIndex: 1
        },
        {
          ddlField: mockDdlFields[2],
          excelColumn: { header: 'file_path', index: 2 },
          excelIndex: 2
        }
      ]
      
      const result = generateBatchInsertSql(
        excelData,
        fieldMappings,
        mockDdlFields,
        'file_info',
        'postgresql',
        mockCustomBindingManager
      )
      
      expect(result).toBeDefined()
      expect(result).toContain('1')
    })

    it('应该正确处理 Excel 组合字段配置', () => {
      mockCustomBindingManager.fieldConcatenationRules.value = [
        {
          customFieldName: 'full_name',
          dataType: 'string',
          columns: ['first_name', 'last_name'],
          separator: ' ',
          formatTemplate: null
        }
      ]
      
      const excelData = [
        {
          first_name: 'John',
          last_name: 'Doe',
          file_path: '/data/test.txt',
          file_size: 1024
        }
      ]
      
      const fieldMappings = [
        {
          ddlField: mockDdlFields[0],
          excelColumn: { header: 'id', index: 0 },
          excelIndex: 0
        },
        {
          ddlField: mockDdlFields[1],
          excelColumn: { header: 'file_name', index: 1 },
          excelIndex: 1
        },
        {
          ddlField: mockDdlFields[2],
          excelColumn: { header: 'file_path', index: 2 },
          excelIndex: 2
        },
        {
          ddlField: {
            name: 'full_name',
            type: 'varchar',
            isCustom: true,
            customConfig: {
              fieldName: 'full_name',
              dataType: 'string',
              dataSource: 'excel_combine',
              excelCombineConfig: {
                columns: ['first_name', 'last_name'],
                separator: ' '
              }
            }
          },
          excelColumn: null,
          excelIndex: -1
        }
      ]
      
      const result = generateBatchInsertSql(
        excelData,
        fieldMappings,
        mockDdlFields,
        'file_info',
        'postgresql',
        mockCustomBindingManager
      )
      
      expect(result).toBeDefined()
      expect(result).toContain('John Doe')
    })

    it('应该正确处理静态值字段配置', () => {
      mockCustomBindingManager.customFields.value = [
        {
          fieldName: 'status',
          dataType: 'string',
          dataSource: 'static_value',
          staticValueConfig: {
            value: 'active',
            dataType: 'string'
          }
        }
      ]
      
      const excelData = [
        {
          file_name: 'test.txt',
          file_path: '/data/test.txt',
          file_size: 1024
        }
      ]
      
      const fieldMappings = [
        {
          ddlField: mockDdlFields[0],
          excelColumn: { header: 'id', index: 0 },
          excelIndex: 0
        },
        {
          ddlField: mockDdlFields[1],
          excelColumn: { header: 'file_name', index: 1 },
          excelIndex: 1
        },
        {
          ddlField: mockDdlFields[2],
          excelColumn: { header: 'file_path', index: 2 },
          excelIndex: 2
        },
        {
          ddlField: {
            name: 'status',
            type: 'varchar',
            isCustom: true,
            customConfig: {
              fieldName: 'status',
              dataType: 'string',
              dataSource: 'static_value',
              staticValueConfig: {
                value: 'active',
                dataType: 'string'
              }
            }
          },
          excelColumn: null,
          excelIndex: -1
        }
      ]
      
      const result = generateBatchInsertSql(
        excelData,
        fieldMappings,
        mockDdlFields,
        'file_info',
        'postgresql',
        mockCustomBindingManager
      )
      
      expect(result).toBeDefined()
      expect(result).toContain("'active'")
    })
  })
})
