import { describe, it, expect } from 'vitest'
import { useSqlGeneratorEnhanced } from '../src/composables/useSqlGeneratorEnhanced'

/**
 * 字段名修改功能测试套件
 * 测试用户修改DDL字段名称后，生成的SQL使用自定义字段名
 */
describe('字段名修改功能测试', () => {
  const sqlGenerator = useSqlGeneratorEnhanced()

  describe('修改字段名后SQL生成', () => {
    it('应该使用自定义字段名生成SQL', () => {
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
        customFieldName: '',
      }))

      fieldMappings[1].customFieldName = 'user_name'
      fieldMappings[2].customFieldName = 'user_email'

      const sql = sqlGenerator.generateInsertSql(tableName, fieldMappings, excelData, {
        dbType: 'mysql',
        format: 'formatted',
        comments: false,
      })

      expect(sql).toContain('`user_name`')
      expect(sql).toContain('`user_email`')
      expect(sql).not.toContain('`name`')
      expect(sql).not.toContain('`email`')
    })

    it('未修改字段名时应使用原始字段名', () => {
      const tableName = 'users'
      const ddlFields = [
        { name: 'id', type: 'INT', primaryKey: true, isIdentity: true },
        { name: 'name', type: 'VARCHAR(50)', primaryKey: false, isIdentity: false },
        { name: 'email', type: 'VARCHAR(100)', primaryKey: false, isIdentity: false },
      ]

      const excelData = [['1', '张三', 'zhangsan@example.com']]

      const excelHeaders = ['ID', '姓名', '邮箱']

      const fieldMappings = ddlFields.map((field, index) => ({
        ddlField: field,
        excelHeader: excelHeaders[index] || null,
        excelIndex: index < excelHeaders.length ? index : -1,
        customFieldName: '',
      }))

      const sql = sqlGenerator.generateInsertSql(tableName, fieldMappings, excelData, {
        dbType: 'mysql',
        format: 'formatted',
        comments: false,
      })

      expect(sql).toContain('`name`')
      expect(sql).toContain('`email`')
    })

    it('清空自定义字段名后应恢复原始字段名', () => {
      const tableName = 'users'
      const ddlFields = [
        { name: 'id', type: 'INT', primaryKey: true, isIdentity: true },
        { name: 'name', type: 'VARCHAR(50)', primaryKey: false, isIdentity: false },
      ]

      const excelData = [['1', '张三']]

      const excelHeaders = ['ID', '姓名']

      const fieldMappings = ddlFields.map((field, index) => ({
        ddlField: field,
        excelHeader: excelHeaders[index] || null,
        excelIndex: index < excelHeaders.length ? index : -1,
        customFieldName: '',
      }))

      fieldMappings[1].customFieldName = 'user_name'

      let sql = sqlGenerator.generateInsertSql(tableName, fieldMappings, excelData, {
        dbType: 'mysql',
        format: 'formatted',
        comments: false,
      })

      expect(sql).toContain('`user_name`')

      fieldMappings[1].customFieldName = ''

      sql = sqlGenerator.generateInsertSql(tableName, fieldMappings, excelData, {
        dbType: 'mysql',
        format: 'formatted',
        comments: false,
      })

      expect(sql).toContain('`name`')
      expect(sql).not.toContain('`user_name`')
    })

    it('UPDATE语句应使用自定义字段名', () => {
      const tableName = 'users'
      const ddlFields = [
        { name: 'id', type: 'INT', primaryKey: true, isIdentity: true },
        { name: 'name', type: 'VARCHAR(50)', primaryKey: false, isIdentity: false },
        { name: 'email', type: 'VARCHAR(100)', primaryKey: false, isIdentity: false },
      ]

      const excelData = [['1', '张三', 'zhangsan@example.com']]

      const excelHeaders = ['ID', '姓名', '邮箱']

      const fieldMappings = ddlFields.map((field, index) => ({
        ddlField: field,
        excelHeader: excelHeaders[index] || null,
        excelIndex: index < excelHeaders.length ? index : -1,
        customFieldName: '',
      }))

      fieldMappings[1].customFieldName = 'user_name'
      fieldMappings[2].customFieldName = 'user_email'

      const sql = sqlGenerator.generateUpdateSql(tableName, fieldMappings, excelData, ['id'], {
        dbType: 'mysql',
        format: 'formatted',
        comments: false,
      })

      expect(sql).toContain('`user_name`')
      expect(sql).toContain('`user_email`')
      expect(sql).not.toContain('`name`')
      expect(sql).not.toContain('`email`')
    })

    it('PostgreSQL数据库应使用双引号包裹包含特殊字符的自定义字段名', () => {
      const tableName = 'users'
      const ddlFields = [
        { name: 'id', type: 'INT', primaryKey: true, isIdentity: true },
        { name: 'name', type: 'VARCHAR(50)', primaryKey: false, isIdentity: false },
      ]

      const excelData = [['1', '张三']]

      const excelHeaders = ['ID', '姓名']

      const fieldMappings = ddlFields.map((field, index) => ({
        ddlField: field,
        excelHeader: excelHeaders[index] || null,
        excelIndex: index < excelHeaders.length ? index : -1,
        customFieldName: '',
      }))

      fieldMappings[1].customFieldName = 'user-name'

      const sql = sqlGenerator.generateInsertSql(tableName, fieldMappings, excelData, {
        dbType: 'postgresql',
        format: 'formatted',
        comments: false,
      })

      expect(sql).toContain('"user-name"')
      expect(sql).not.toContain('"name"')
    })

    it('SQL Server数据库应使用方括号包裹自定义字段名', () => {
      const tableName = 'users'
      const ddlFields = [
        { name: 'id', type: 'INT', primaryKey: true, isIdentity: true },
        { name: 'name', type: 'VARCHAR(50)', primaryKey: false, isIdentity: false },
      ]

      const excelData = [['1', '张三']]

      const excelHeaders = ['ID', '姓名']

      const fieldMappings = ddlFields.map((field, index) => ({
        ddlField: field,
        excelHeader: excelHeaders[index] || null,
        excelIndex: index < excelHeaders.length ? index : -1,
        customFieldName: '',
      }))

      fieldMappings[1].customFieldName = 'user_name'

      const sql = sqlGenerator.generateInsertSql(tableName, fieldMappings, excelData, {
        dbType: 'sqlserver',
        format: 'formatted',
        comments: false,
      })

      expect(sql).toContain('[user_name]')
      expect(sql).not.toContain('[name]')
    })
  })
})
