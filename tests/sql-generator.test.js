import { describe, it, expect } from 'vitest'
import { useSqlGeneratorEnhanced } from '../src/composables/useSqlGeneratorEnhanced'

/**
 * SQL生成器功能集成测试套件
 */
describe('SQL生成器功能', () => {
  const sqlGenerator = useSqlGeneratorEnhanced()

  describe('INSERT语句生成', () => {
    it('应该生成基本的INSERT语句', () => {
      const tableName = 'users'
      const fieldMappings = [
        { ddlField: { name: 'id', type: 'INT' }, excelHeader: 'ID', excelIndex: 0 },
        { ddlField: { name: 'name', type: 'VARCHAR' }, excelHeader: '姓名', excelIndex: 1 },
        { ddlField: { name: 'email', type: 'VARCHAR' }, excelHeader: '邮箱', excelIndex: 2 }
      ]
      const excelData = [
        ['1', '张三', 'zhangsan@example.com'],
        ['2', '李四', 'lisi@example.com']
      ]

      const result = sqlGenerator.generateInsertSql(tableName, fieldMappings, excelData)

      expect(result).toContain('INSERT INTO')
      expect(result).toContain('users')
      expect(result).toContain('id')
      expect(result).toContain('name')
      expect(result).toContain('email')
      expect(result).toContain('VALUES')
      expect(result.split(';').length - 1).toBe(1) // 应该有一个分号
    })

    it('应该支持美化选项', () => {
      const tableName = 'products'
      const fieldMappings = [
        { ddlField: { name: 'id', type: 'INT' }, excelHeader: 'ID', excelIndex: 0 },
        { ddlField: { name: 'name', type: 'VARCHAR' }, excelHeader: '产品名', excelIndex: 1 }
      ]
      const excelData = [['1', '笔记本电脑']]

      const result = sqlGenerator.generateInsertSql(tableName, fieldMappings, excelData, {
        beautifyOptions: {
          keywordCase: 'upper',
          indentSpaces: 2,
          alignValues: true
        }
      })

      expect(result).toContain('INSERT')
      expect(result).toContain('INTO')
      expect(result).toContain('VALUES')
    })

    it('应该支持批量处理', () => {
      const tableName = 'orders'
      const fieldMappings = [
        { ddlField: { name: 'id', type: 'INT' }, excelHeader: '订单ID', excelIndex: 0 },
        { ddlField: { name: 'amount', type: 'DECIMAL' }, excelHeader: '金额', excelIndex: 1 }
      ]

      // 生成大量测试数据
      const excelData = []
      for (let i = 1; i <= 150; i++) {
        excelData.push([i.toString(), (i * 10).toString()])
      }

      const result = sqlGenerator.generateInsertSql(tableName, fieldMappings, excelData, {
        batch: 50
      })

      const statements = result.split('INSERT INTO')
      expect(statements.length - 1).toBe(3) // 150条数据，每批50条，应该生成3个INSERT语句
    })
  })

  describe('UPDATE语句生成', () => {
    it('应该生成基本的UPDATE语句', () => {
      const tableName = 'users'
      const fieldMappings = [
        { ddlField: { name: 'id', type: 'INT' }, excelHeader: 'ID', excelIndex: 0 },
        { ddlField: { name: 'name', type: 'VARCHAR' }, excelHeader: '姓名', excelIndex: 1 },
        { ddlField: { name: 'email', type: 'VARCHAR' }, excelHeader: '邮箱', excelIndex: 2 }
      ]
      const excelData = [['1', '张三', 'zhangsan@example.com']]
      const whereFields = ['id']

      const result = sqlGenerator.generateUpdateSql(tableName, fieldMappings, excelData, whereFields)

      expect(result).toContain('UPDATE')
      expect(result).toContain('SET')
      expect(result).toContain('WHERE')
      expect(result).toContain('`id` = 1') // 注意字段名被转义了
    })

    it('应该处理多个WHERE条件', () => {
      const tableName = 'orders'
      const fieldMappings = [
        { ddlField: { name: 'order_id', type: 'INT' }, excelHeader: '订单ID', excelIndex: 0 },
        { ddlField: { name: 'customer_id', type: 'INT' }, excelHeader: '客户ID', excelIndex: 1 },
        { ddlField: { name: 'status', type: 'VARCHAR' }, excelHeader: '状态', excelIndex: 2 }
      ]
      const excelData = [['1001', '2001', '已完成']]
      const whereFields = ['order_id', 'customer_id']

      const result = sqlGenerator.generateUpdateSql(tableName, fieldMappings, excelData, whereFields)

      expect(result).toContain('WHERE')
      expect(result).toContain('AND')
      expect(result).toContain('`order_id` = 1001') // 注意字段名被转义了
      expect(result).toContain('`customer_id` = 2001') // 注意字段名被转义了
    })
  })

  describe('输入验证', () => {
    it('应该验证表名为空', () => {
      const fieldMappings = [{ ddlField: { name: 'id', type: 'INT' }, excelHeader: 'ID', excelIndex: 0 }]
      const excelData = [['1']]

      expect(() => {
        sqlGenerator.generateInsertSql('', fieldMappings, excelData)
      }).toThrow('表名不能为空且必须是字符串')
    })

    it('应该验证字段映射为空', () => {
      expect(() => {
        sqlGenerator.generateInsertSql('users', [], [['1']])
      }).toThrow('字段映射关系不能为空')
    })

    it('应该验证Excel数据为空', () => {
      const fieldMappings = [{ ddlField: { name: 'id', type: 'INT' }, excelHeader: 'ID', excelIndex: 0 }]

      expect(() => {
        sqlGenerator.generateInsertSql('users', fieldMappings, [])
      }).toThrow('Excel数据不能为空')
    })
  })

  describe('数据库类型支持', () => {
    it('应该支持MySQL字段转义', () => {
      const tableName = 'users'
      const fieldMappings = [
        { ddlField: { name: 'user id', type: 'INT' }, excelHeader: '用户ID', excelIndex: 0 }
      ]
      const excelData = [['1']]

      const result = sqlGenerator.generateInsertSql(tableName, fieldMappings, excelData, {
        dbType: 'mysql'
      })

      expect(result).toContain('`user id`')
    })

    it('应该支持PostgreSQL字段转义', () => {
      const tableName = 'users'
      const fieldMappings = [
        { ddlField: { name: 'user name', type: 'VARCHAR' }, excelHeader: '用户名', excelIndex: 0 }
      ]
      const excelData = [['张三']]

      const result = sqlGenerator.generateInsertSql(tableName, fieldMappings, excelData, {
        dbType: 'postgresql'
      })

      expect(result).toContain('"user name"')
    })

    it('应该支持SQL Server字段转义', () => {
      const tableName = 'users'
      const fieldMappings = [
        { ddlField: { name: 'user name', type: 'VARCHAR' }, excelHeader: '用户名', excelIndex: 0 }
      ]
      const excelData = [['张三']]

      const result = sqlGenerator.generateInsertSql(tableName, fieldMappings, excelData, {
        dbType: 'sqlserver'
      })

      expect(result).toContain('[user name]')
    })
  })

  describe('数据类型格式化', () => {
    it('应该正确格式化字符串类型', () => {
      const tableName = 'users'
      const fieldMappings = [
        { ddlField: { name: 'name', type: 'VARCHAR' }, excelHeader: '姓名', excelIndex: 0 }
      ]
      const excelData = [['张三']]

      const result = sqlGenerator.generateInsertSql(tableName, fieldMappings, excelData)

      expect(result).toContain("'张三'")
    })

    it('应该正确格式化数字类型', () => {
      const tableName = 'products'
      const fieldMappings = [
        { ddlField: { name: 'price', type: 'DECIMAL' }, excelHeader: '价格', excelIndex: 0 }
      ]
      const excelData = [['99.99']]

      const result = sqlGenerator.generateInsertSql(tableName, fieldMappings, excelData)

      expect(result).toContain('99.99')
      expect(result).not.toContain("'99.99'")
    })

    it('应该处理NULL值', () => {
      const tableName = 'users'
      const fieldMappings = [
        { ddlField: { name: 'name', type: 'VARCHAR' }, excelHeader: '姓名', excelIndex: 0 }
      ]
      const excelData = [['']]

      const result = sqlGenerator.generateInsertSql(tableName, fieldMappings, excelData)

      expect(result).toContain('NULL')
    })
  })

  describe('注释功能', () => {
    it('应该生成包含注释的SQL', () => {
      const tableName = 'users'
      const fieldMappings = [
        { ddlField: { name: 'id', type: 'INT' }, excelHeader: 'ID', excelIndex: 0 },
        { ddlField: { name: 'name', type: 'VARCHAR' }, excelHeader: '姓名', excelIndex: 1 }
      ]
      const excelData = [['1', '张三']]

      const result = sqlGenerator.generateInsertSql(tableName, fieldMappings, excelData, {
        comments: true
      })

      expect(result).toContain('--')
      expect(result).toContain('生成时间')
      expect(result).toContain('目标表')
      expect(result).toContain('字段映射详情')
    })

    it('应该生成纯SQL（不含注释）', () => {
      const tableName = 'users'
      const fieldMappings = [
        { ddlField: { name: 'id', type: 'INT' }, excelHeader: 'ID', excelIndex: 0 }
      ]
      const excelData = [['1']]

      const result = sqlGenerator.generateInsertSql(tableName, fieldMappings, excelData, {
        comments: false
      })

      expect(result).not.toContain('--')
    })
  })
})
