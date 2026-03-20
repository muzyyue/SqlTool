import { describe, it, expect, beforeEach } from 'vitest'
import { ref } from 'vue'
import { useSqlGeneratorEnhanced } from '../../src/composables/sql/useSqlGeneratorEnhanced'

/**
 * 拼接字段从 fieldConcatenationRules 数据源测试
 * 测试从 fieldConcatenationRules 查找拼接配置的场景
 */
describe('拼接字段从 fieldConcatenationRules 数据源测试', () => {
  let sqlGenerator

  beforeEach(() => {
    sqlGenerator = useSqlGeneratorEnhanced()
  })

  describe('从 fieldConcatenationRules 查找拼接配置', () => {
    it('应该正确从 fieldConcatenationRules 查找拼接配置并生成SQL', () => {
      const tableName = 'users'
      const ddlFields = [
        { name: 'id', type: 'INT', primaryKey: true, isIdentity: true },
        { name: 'name', type: 'VARCHAR(50)', primaryKey: false, isIdentity: false },
        { name: 'email', type: 'VARCHAR(100)', primaryKey: false, isIdentity: false },
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

      const customFields = ref([])

      const fieldConcatenationRules = ref([
        {
          id: 'rule-1',
          ddlFieldName: 'full_name',
          dataType: 'VARCHAR(100)',
          sourceColumns: [1, 2],
          separator: ' ',
          format: '',
        },
      ])

      const customBindingManager = {
        customFields,
        fieldConcatenationRules,
      }

      const allFieldMappings = [
        ...fieldMappings,
        {
          ddlField: {
            name: 'full_name',
            type: 'VARCHAR(100)',
            isCustom: true,
          },
          excelHeader: null,
          excelIndex: -1,
        },
      ]

      const result = sqlGenerator.generateInsertSql(
        tableName,
        allFieldMappings,
        excelData,
        {
          dbType: 'mysql',
          format: 'formatted',
          batch: 100,
          comments: false,
          customBindingManager,
        },
      )

      console.log('从 fieldConcatenationRules 生成的SQL:', result)

      expect(result).toContain('INSERT INTO')
      expect(result).toContain('full_name')
      expect(result).toContain("'张三 zhangsan@example.com'")
      expect(result).toContain("'李四 lisi@example.com'")
    })

    it('应该正确处理多个拼接规则', () => {
      const tableName = 'users'
      const ddlFields = [
        { name: 'id', type: 'INT', primaryKey: true, isIdentity: true },
        { name: 'name', type: 'VARCHAR(50)', primaryKey: false, isIdentity: false },
        { name: 'email', type: 'VARCHAR(100)', primaryKey: false, isIdentity: false },
        { name: 'phone', type: 'VARCHAR(20)', primaryKey: false, isIdentity: false },
      ]

      const excelData = [
        ['1', '张三', 'zhangsan@example.com', '13800138000'],
        ['2', '李四', 'lisi@example.com', '13900139000'],
      ]

      const excelHeaders = ['ID', '姓名', '邮箱', '电话']

      const fieldMappings = ddlFields.map((field, index) => ({
        ddlField: field,
        excelHeader: excelHeaders[index] || null,
        excelIndex: index < excelHeaders.length ? index : -1,
      }))

      const customFields = ref([])

      const fieldConcatenationRules = ref([
        {
          id: 'rule-1',
          ddlFieldName: 'user_contact',
          dataType: 'VARCHAR(150)',
          sourceColumns: [1, 3],
          separator: ':',
          format: '',
        },
        {
          id: 'rule-2',
          ddlFieldName: 'user_email',
          dataType: 'VARCHAR(100)',
          sourceColumns: [2],
          separator: '',
          format: '',
        },
      ])

      const customBindingManager = {
        customFields,
        fieldConcatenationRules,
      }

      const allFieldMappings = [
        ...fieldMappings,
        {
          ddlField: {
            name: 'user_contact',
            type: 'VARCHAR(150)',
            isCustom: true,
          },
          excelHeader: null,
          excelIndex: -1,
        },
        {
          ddlField: {
            name: 'user_email',
            type: 'VARCHAR(100)',
            isCustom: true,
          },
          excelHeader: null,
          excelIndex: -1,
        },
      ]

      const result = sqlGenerator.generateInsertSql(
        tableName,
        allFieldMappings,
        excelData,
        {
          dbType: 'mysql',
          format: 'formatted',
          batch: 100,
          comments: false,
          customBindingManager,
        },
      )

      console.log('多个拼接规则生成的SQL:', result)

      expect(result).toContain('INSERT INTO')
      expect(result).toContain('user_contact')
      expect(result).toContain('user_email')
      expect(result).toContain("'张三:13800138000'")
      expect(result).toContain("'李四:13900139000'")
      expect(result).toContain("'zhangsan@example.com'")
      expect(result).toContain("'lisi@example.com'")
    })

    it('应该正确处理带格式化模板的拼接规则', () => {
      const tableName = 'users'
      const ddlFields = [
        { name: 'id', type: 'INT', primaryKey: true, isIdentity: true },
        { name: 'name', type: 'VARCHAR(50)', primaryKey: false, isIdentity: false },
        { name: 'email', type: 'VARCHAR(100)', primaryKey: false, isIdentity: false },
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

      const customFields = ref([])

      const fieldConcatenationRules = ref([
        {
          id: 'rule-1',
          ddlFieldName: 'formatted_name',
          dataType: 'VARCHAR(150)',
          sourceColumns: [1, 2],
          separator: '',
          format: '姓名:{value1}, 邮箱:{value2}',
        },
      ])

      const customBindingManager = {
        customFields,
        fieldConcatenationRules,
      }

      const allFieldMappings = [
        ...fieldMappings,
        {
          ddlField: {
            name: 'formatted_name',
            type: 'VARCHAR(150)',
            isCustom: true,
          },
          excelHeader: null,
          excelIndex: -1,
        },
      ]

      const result = sqlGenerator.generateInsertSql(
        tableName,
        allFieldMappings,
        excelData,
        {
          dbType: 'mysql',
          format: 'formatted',
          batch: 100,
          comments: false,
          customBindingManager,
        },
      )

      console.log('带格式化模板的拼接规则生成的SQL:', result)

      expect(result).toContain('INSERT INTO')
      expect(result).toContain('formatted_name')
      expect(result).toContain("'姓名:张三, 邮箱:zhangsan@example.com'")
      expect(result).toContain("'姓名:李四, 邮箱:lisi@example.com'")
    })

    it('应该优先使用 customFields 中的配置', () => {
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
      }))

      const customFields = ref([
        {
          fieldName: 'display_name',
          dataType: 'VARCHAR(100)',
          dataSource: 'excel_combine',
          excelCombineConfig: {
            columns: [1],
            separator: '',
            format: '来自customFields: {value}',
          },
        },
      ])

      const fieldConcatenationRules = ref([
        {
          id: 'rule-1',
          ddlFieldName: 'display_name',
          dataType: 'VARCHAR(100)',
          sourceColumns: [1],
          separator: '',
          format: '来自fieldConcatenationRules: {value}',
        },
      ])

      const customBindingManager = {
        customFields,
        fieldConcatenationRules,
      }

      const allFieldMappings = [
        ...fieldMappings,
        {
          ddlField: {
            name: 'display_name',
            type: 'VARCHAR(100)',
            isCustom: true,
          },
          excelHeader: null,
          excelIndex: -1,
        },
      ]

      const result = sqlGenerator.generateInsertSql(
        tableName,
        allFieldMappings,
        excelData,
        {
          dbType: 'mysql',
          format: 'formatted',
          batch: 100,
          comments: false,
          customBindingManager,
        },
      )

      console.log('优先使用 customFields 配置生成的SQL:', result)

      expect(result).toContain('INSERT INTO')
      expect(result).toContain('display_name')
      expect(result).toContain("'来自customFields: 张三'")
      expect(result).not.toContain('来自fieldConcatenationRules')
    })

    it('当 customFields 为空时应该回退到 fieldConcatenationRules', () => {
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
      }))

      const customFields = ref([])

      const fieldConcatenationRules = ref([
        {
          id: 'rule-1',
          ddlFieldName: 'display_name',
          dataType: 'VARCHAR(100)',
          sourceColumns: [1],
          separator: '',
          format: '来自fieldConcatenationRules: {value}',
        },
      ])

      const customBindingManager = {
        customFields,
        fieldConcatenationRules,
      }

      const allFieldMappings = [
        ...fieldMappings,
        {
          ddlField: {
            name: 'display_name',
            type: 'VARCHAR(100)',
            isCustom: true,
          },
          excelHeader: null,
          excelIndex: -1,
        },
      ]

      const result = sqlGenerator.generateInsertSql(
        tableName,
        allFieldMappings,
        excelData,
        {
          dbType: 'mysql',
          format: 'formatted',
          batch: 100,
          comments: false,
          customBindingManager,
        },
      )

      console.log('回退到 fieldConcatenationRules 生成的SQL:', result)

      expect(result).toContain('INSERT INTO')
      expect(result).toContain('display_name')
      expect(result).toContain("'来自fieldConcatenationRules: 张三'")
    })
  })

  describe('边界情况测试', () => {
    it('当 fieldConcatenationRules 为空数组时应该使用默认值', () => {
      const tableName = 'users'
      const ddlFields = [
        { name: 'id', type: 'INT', primaryKey: true, isIdentity: true },
      ]

      const excelData = [['1']]

      const fieldMappings = ddlFields.map((field, index) => ({
        ddlField: field,
        excelHeader: null,
        excelIndex: index,
      }))

      const customFields = ref([])
      const fieldConcatenationRules = ref([])

      const customBindingManager = {
        customFields,
        fieldConcatenationRules,
      }

      const allFieldMappings = [
        ...fieldMappings,
        {
          ddlField: {
            name: 'custom_uuid',
            type: 'VARCHAR(36)',
            isCustom: true,
          },
          excelHeader: null,
          excelIndex: -1,
        },
      ]

      const result = sqlGenerator.generateInsertSql(
        tableName,
        allFieldMappings,
        excelData,
        {
          dbType: 'mysql',
          format: 'formatted',
          batch: 100,
          comments: false,
          customBindingManager,
        },
      )

      console.log('空数组时生成的SQL:', result)

      expect(result).toContain('INSERT INTO')
      expect(result).toContain('custom_uuid')
      expect(result).toContain('UUID()')
    })

    it('当 customBindingManager 为 null 时应该使用默认值', () => {
      const tableName = 'users'
      const ddlFields = [
        { name: 'id', type: 'INT', primaryKey: true, isIdentity: true },
      ]

      const excelData = [['1']]

      const fieldMappings = ddlFields.map((field, index) => ({
        ddlField: field,
        excelHeader: null,
        excelIndex: index,
      }))

      const allFieldMappings = [
        ...fieldMappings,
        {
          ddlField: {
            name: 'custom_uuid',
            type: 'VARCHAR(36)',
            isCustom: true,
          },
          excelHeader: null,
          excelIndex: -1,
        },
      ]

      const result = sqlGenerator.generateInsertSql(
        tableName,
        allFieldMappings,
        excelData,
        {
          dbType: 'mysql',
          format: 'formatted',
          batch: 100,
          comments: false,
          customBindingManager: null,
        },
      )

      console.log('customBindingManager 为 null 时生成的SQL:', result)

      expect(result).toContain('INSERT INTO')
      expect(result).toContain('custom_uuid')
      expect(result).toContain('UUID()')
    })
  })
})
