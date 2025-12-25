import { describe, it, expect } from 'vitest'
import { useSqlGeneratorEnhanced } from '../src/composables/useSqlGeneratorEnhanced'

/**
 * 自定义字段功能测试套件
 * 测试自定义字段添加、清除预设字段、SQL生成等功能
 */
describe('自定义字段功能测试', () => {
  const sqlGenerator = useSqlGeneratorEnhanced()

  describe('添加自定义字段后清除预设字段，验证SQL生成', () => {
    it('应该成功添加自定义字段并生成包含自定义字段的SQL', () => {
      const tableName = 'users'
      const ddlFields = [
        { name: 'id', type: 'INT', primaryKey: true, isIdentity: true },
        { name: 'name', type: 'VARCHAR(50)', primaryKey: false, isIdentity: false },
        { name: 'email', type: 'VARCHAR(100)', primaryKey: false, isIdentity: false },
        { name: 'created_at', type: 'TIMESTAMP', primaryKey: false, isIdentity: false },
      ]

      const excelData = [
        ['1', '张三', 'zhangsan@example.com'],
        ['2', '李四', 'lisi@example.com'],
      ]

      const excelHeaders = ['ID', '姓名', '邮箱']

      const fieldMappings = ddlFields.map((field, index) => ({
        ddlField: field,
        excelHeader: excelHeaders[index] || null,
        excelIndex: index < excelHeaders.length ? index : -1,
      }))

      const customFields = [
        {
          name: 'custom_timestamp',
          type: 'TIMESTAMP',
          isCustom: true,
          customConfig: {
            dataSource: 'system_function',
            systemFunctionConfig: {
              databaseType: 'mysql',
              functionName: 'NOW',
              category: '日期时间',
            },
          },
        },
      ]

      const allFieldMappings = [
        ...fieldMappings,
        ...customFields.map((customField) => ({
          ddlField: customField,
          excelHeader: null,
          excelIndex: -1,
        })),
      ]

      const result = sqlGenerator.generateInsertSql(tableName, allFieldMappings, excelData, {
        dbType: 'mysql',
        format: 'formatted',
        batch: 100,
        comments: true,
      })

      console.log('生成的SQL:', result)

      expect(result).toContain('INSERT INTO')
      expect(result).toContain('users')
      expect(result).toContain('custom_timestamp')
      expect(result).toContain('NOW()')
      expect(result).toContain('name')
      expect(result).toContain('email')
      expect(result).toContain('VALUES')
    })

    it('清除预设字段后应保留自定义字段', () => {
      const tableName = 'users'

      const excelData = [['1', '张三', 'zhangsan@example.com']]

      const customFields = [
        {
          name: 'custom_timestamp',
          type: 'TIMESTAMP',
          isCustom: true,
          customConfig: {
            dataSource: 'system_function',
            systemFunctionConfig: {
              databaseType: 'mysql',
              functionName: 'NOW',
              category: '日期时间',
            },
          },
        },
        {
          name: 'custom_user_id',
          type: 'INT',
          isCustom: true,
          customConfig: {
            dataSource: 'auto_increment',
          },
        },
      ]

      const allFieldMappings = customFields.map((customField) => ({
        ddlField: customField,
        excelHeader: null,
        excelIndex: -1,
      }))

      const result = sqlGenerator.generateInsertSql(tableName, allFieldMappings, excelData, {
        dbType: 'mysql',
        format: 'formatted',
        batch: 100,
        comments: true,
      })

      console.log('清除预设字段后的SQL:', result)

      expect(result).toContain('INSERT INTO')
      expect(result).toContain('custom_timestamp')
      expect(result).toContain('NOW()')
      expect(result).toContain('custom_user_id')
      expect(result).toContain('VALUES')
    })

    it('应该支持多个自定义字段', () => {
      const tableName = 'orders'
      const ddlFields = [
        { name: 'id', type: 'INT', primaryKey: true, isIdentity: true },
        { name: 'order_no', type: 'VARCHAR(50)', primaryKey: false, isIdentity: false },
      ]

      const excelData = [['1', 'ORD001']]

      const customFields = [
        {
          name: 'created_at',
          type: 'TIMESTAMP',
          isCustom: true,
          customConfig: {
            dataSource: 'system_function',
            systemFunctionConfig: {
              databaseType: 'mysql',
              functionName: 'NOW',
              category: '日期时间',
            },
          },
        },
        {
          name: 'updated_at',
          type: 'TIMESTAMP',
          isCustom: true,
          customConfig: {
            dataSource: 'system_function',
            systemFunctionConfig: {
              databaseType: 'mysql',
              functionName: 'NOW',
              category: '日期时间',
            },
          },
        },
        {
          name: 'status',
          type: 'VARCHAR(20)',
          isCustom: true,
          customConfig: {
            dataSource: 'static_value',
            staticValue: 'PENDING',
          },
        },
      ]

      const fieldMappings = ddlFields.map((field, index) => ({
        ddlField: field,
        excelHeader: index === 1 ? '订单号' : null,
        excelIndex: index === 1 ? 1 : -1,
      }))

      const allFieldMappings = [
        ...fieldMappings,
        ...customFields.map((customField) => ({
          ddlField: customField,
          excelHeader: null,
          excelIndex: -1,
        })),
      ]

      const result = sqlGenerator.generateInsertSql(tableName, allFieldMappings, excelData, {
        dbType: 'mysql',
        format: 'formatted',
        batch: 100,
        comments: true,
      })

      console.log('多个自定义字段的SQL:', result)

      expect(result).toContain('INSERT INTO')
      expect(result).toContain('created_at')
      expect(result).toContain('updated_at')
      expect(result).toContain('status')
      expect(result).toContain('NOW()')
      expect(result).toContain("'PENDING'")
    })
  })

  describe('SQL语法规范性验证', () => {
    it('生成的SQL应该符合标准SQL语法', () => {
      const tableName = 'test_table'
      const customFields = [
        {
          name: 'created_at',
          type: 'TIMESTAMP',
          isCustom: true,
          customConfig: {
            dataSource: 'system_function',
            systemFunctionConfig: {
              databaseType: 'mysql',
              functionName: 'NOW',
              category: '日期时间',
            },
          },
        },
      ]

      const excelData = [[]]

      const fieldMappings = customFields.map((customField) => ({
        ddlField: customField,
        excelHeader: null,
        excelIndex: -1,
      }))

      const result = sqlGenerator.generateInsertSql(tableName, fieldMappings, excelData, {
        dbType: 'mysql',
        format: 'formatted',
        batch: 100,
        comments: false,
      })

      console.log('SQL语法验证:', result)

      const sqlRegex = /INSERT\s+INTO\s+[^\s(]+\s*\([^)]+\)\s*VALUES\s*\([^)]+\);?/i
      expect(result).toMatch(sqlRegex)
    })

    it('SQL语句应该以分号结尾', () => {
      const tableName = 'test_table'
      const customFields = [
        {
          name: 'created_at',
          type: 'TIMESTAMP',
          isCustom: true,
          customConfig: {
            dataSource: 'system_function',
            systemFunctionConfig: {
              databaseType: 'mysql',
              functionName: 'NOW',
              category: '日期时间',
            },
          },
        },
      ]

      const excelData = [[]]

      const fieldMappings = customFields.map((customField) => ({
        ddlField: customField,
        excelHeader: null,
        excelIndex: -1,
      }))

      const result = sqlGenerator.generateInsertSql(tableName, fieldMappings, excelData, {
        dbType: 'mysql',
        format: 'formatted',
        batch: 100,
        comments: false,
      })

      const hasSemicolon = result.trim().endsWith(';')
      expect(hasSemicolon).toBe(true)
    })

    it('SQL语句应该包含正确的引号', () => {
      const tableName = 'test_table'
      const customFields = [
        {
          name: 'status',
          type: 'VARCHAR(20)',
          isCustom: true,
          customConfig: {
            dataSource: 'static_value',
            staticValue: 'ACTIVE',
          },
        },
      ]

      const excelData = [[]]

      const fieldMappings = customFields.map((customField) => ({
        ddlField: customField,
        excelHeader: null,
        excelIndex: -1,
      }))

      const result = sqlGenerator.generateInsertSql(tableName, fieldMappings, excelData, {
        dbType: 'mysql',
        format: 'formatted',
        batch: 100,
        comments: false,
      })

      expect(result).toContain("'ACTIVE'")
    })
  })

  describe('自定义字段配置的持久性验证', () => {
    it('多次清除操作后自定义字段配置应保持持久性', () => {
      const tableName = 'test_table'
      const customFields = [
        {
          name: 'created_at',
          type: 'TIMESTAMP',
          isCustom: true,
          customConfig: {
            dataSource: 'system_function',
            systemFunctionConfig: {
              databaseType: 'mysql',
              functionName: 'NOW',
              category: '日期时间',
            },
          },
        },
      ]

      const excelData = [[]]

      const fieldMappings = customFields.map((customField) => ({
        ddlField: customField,
        excelHeader: null,
        excelIndex: -1,
      }))

      const result1 = sqlGenerator.generateInsertSql(tableName, fieldMappings, excelData, {
        dbType: 'mysql',
        format: 'formatted',
        batch: 100,
        comments: false,
      })

      const result2 = sqlGenerator.generateInsertSql(tableName, fieldMappings, excelData, {
        dbType: 'mysql',
        format: 'formatted',
        batch: 100,
        comments: false,
      })

      expect(result1).toContain('created_at')
      expect(result2).toContain('created_at')
      expect(result1).toBe(result2)
    })

    it('自定义字段配置在不同数据库类型下应保持一致', () => {
      const tableName = 'test_table'
      const customFields = [
        {
          name: 'created_at',
          type: 'TIMESTAMP',
          isCustom: true,
          customConfig: {
            dataSource: 'system_function',
            systemFunctionConfig: {
              databaseType: 'mysql',
              functionName: 'NOW',
              category: '日期时间',
            },
          },
        },
      ]

      const excelData = [[]]

      const fieldMappings = customFields.map((customField) => ({
        ddlField: customField,
        excelHeader: null,
        excelIndex: -1,
      }))

      const mysqlResult = sqlGenerator.generateInsertSql(tableName, fieldMappings, excelData, {
        dbType: 'mysql',
        format: 'formatted',
        batch: 100,
        comments: false,
      })

      const postgresqlResult = sqlGenerator.generateInsertSql(tableName, fieldMappings, excelData, {
        dbType: 'postgresql',
        format: 'formatted',
        batch: 100,
        comments: false,
      })

      expect(mysqlResult).toContain('created_at')
      expect(postgresqlResult).toContain('created_at')
    })
  })

  describe('不同数据库类型的自定义字段支持', () => {
    it('应该支持MySQL的自定义字段', () => {
      const tableName = 'test_table'
      const customFields = [
        {
          name: 'created_at',
          type: 'TIMESTAMP',
          isCustom: true,
          customConfig: {
            dataSource: 'system_function',
            systemFunctionConfig: {
              databaseType: 'mysql',
              functionName: 'NOW',
              category: '日期时间',
            },
          },
        },
      ]

      const excelData = [[]]

      const fieldMappings = customFields.map((customField) => ({
        ddlField: customField,
        excelHeader: null,
        excelIndex: -1,
      }))

      const result = sqlGenerator.generateInsertSql(tableName, fieldMappings, excelData, {
        dbType: 'mysql',
        format: 'formatted',
        batch: 100,
        comments: false,
      })

      expect(result).toContain('NOW()')
    })

    it('应该支持PostgreSQL的自定义字段', () => {
      const tableName = 'test_table'
      const customFields = [
        {
          name: 'created_at',
          type: 'TIMESTAMP',
          isCustom: true,
          customConfig: {
            dataSource: 'system_function',
            systemFunctionConfig: {
              databaseType: 'postgresql',
              functionName: 'NOW',
              category: '日期时间',
            },
          },
        },
      ]

      const excelData = [[]]

      const fieldMappings = customFields.map((customField) => ({
        ddlField: customField,
        excelHeader: null,
        excelIndex: -1,
      }))

      const result = sqlGenerator.generateInsertSql(tableName, fieldMappings, excelData, {
        dbType: 'postgresql',
        format: 'formatted',
        batch: 100,
        comments: false,
      })

      expect(result).toContain('NOW()')
    })

    it('应该支持SQL Server的自定义字段', () => {
      const tableName = 'test_table'
      const customFields = [
        {
          name: 'created_at',
          type: 'DATETIME',
          isCustom: true,
          customConfig: {
            dataSource: 'system_function',
            systemFunctionConfig: {
              databaseType: 'sqlserver',
              functionName: 'GETDATE',
              category: '日期时间',
            },
          },
        },
      ]

      const excelData = [[]]

      const fieldMappings = customFields.map((customField) => ({
        ddlField: customField,
        excelHeader: null,
        excelIndex: -1,
      }))

      const result = sqlGenerator.generateInsertSql(tableName, fieldMappings, excelData, {
        dbType: 'sqlserver',
        format: 'formatted',
        batch: 100,
        comments: false,
      })

      expect(result).toContain('GETDATE()')
    })
  })
})
