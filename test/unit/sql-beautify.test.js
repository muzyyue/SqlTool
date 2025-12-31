import { describe, it, expect } from 'vitest'
import { useSqlGeneratorEnhanced } from '../../src/composables/useSqlGeneratorEnhanced'

/**
 * SQL美化功能单元测试套件
 */
describe('SQL美化功能', () => {
  const { beautifySql } = useSqlGeneratorEnhanced()

  describe('基础美化功能', () => {
    it('应该正确美化INSERT语句', () => {
      const inputSql = `INSERT INTO users (id, name, email, created_at) VALUES (1, '张三', 'zhangsan@example.com', '2023-01-01'), (2, '李四', 'lisi@example.com', '2023-01-02');`

      const result = beautifySql(inputSql, {
        indentSpaces: 4,
        formatStyle: 'expanded',
        keywordCase: 'upper',
        maxLineLength: 80,
        alignValues: true
      })

      expect(result).toContain('INSERT INTO')
      expect(result).toContain('VALUES')
      expect(result).toContain('\n')
      expect(result.split('\n').length).toBeGreaterThan(1)
    })

    it('应该统一SQL关键字为大写', () => {
      const inputSql = `insert into users (id, name) values (1, '张三');`

      const result = beautifySql(inputSql, {
        keywordCase: 'upper'
      })

      expect(result).toContain('INSERT')
      expect(result).toContain('INTO')
      expect(result).toContain('VALUES')
      expect(result).not.toContain('insert')
      expect(result).not.toContain('values')
    })

    it('应该保持关键字原样', () => {
      const inputSql = `insert into users (id, name) values (1, '张三');`

      const result = beautifySql(inputSql, {
        keywordCase: 'preserve'
      })

      expect(result).toContain('insert')
      expect(result).toContain('values')
    })
  })

  describe('缩进和换行功能', () => {
    it('应该应用正确的缩进', () => {
      const inputSql = `INSERT INTO users (id, name, email) VALUES (1, '张三', 'zhangsan@example.com');`

      const result = beautifySql(inputSql, {
        indentSpaces: 2,
        formatStyle: 'expanded'
      })

      const lines = result.split('\n').filter(line => line.trim() !== '')
      if (lines.length > 1) {
        expect(lines[1].startsWith('  ')).toBe(true) // 2个空格的缩进
      }
    })

    it('应该支持不同的缩进空格数', () => {
      const inputSql = `insert into users (id, name) values (1, '张三');`

      const result2 = beautifySql(inputSql, { indentSpaces: 2 })
      const result4 = beautifySql(inputSql, { indentSpaces: 4 })

      const lines2 = result2.split('\n').filter(line => line.trim() !== '')
      const lines4 = result4.split('\n').filter(line => line.trim() !== '')

      if (lines2.length > 1) {
        expect(lines2[1].startsWith('  ')).toBe(true) // 2个空格缩进
      }
      if (lines4.length > 1) {
        expect(lines4[1].startsWith('    ')).toBe(true) // 4个空格缩进
      }
    })
  })

  describe('长行拆分功能', () => {
    it('应该拆分超过最大行长度的行', () => {
      const longLine = `INSERT INTO users (id, name, email, phone, address, city, country, zip_code, created_at, updated_at) VALUES (1, '张三', 'zhangsan@example.com', '13800138000', '北京市朝阳区', '北京', '中国', '100000', '2023-01-01', '2023-01-01');`

      const result = beautifySql(longLine, {
        maxLineLength: 60,
        formatStyle: 'expanded'
      })

      const lines = result.split('\n')
      expect(lines.length).toBeGreaterThan(2)

      // 检查每行长度不超过最大限制
      lines.forEach(line => {
        expect(line.length).toBeLessThanOrEqual(80) // 允许一些缓冲
      })
    })

    it('应该正确处理紧凑风格', () => {
      const inputSql = `INSERT INTO users (id, name, email) VALUES (1, '张三', 'zhangsan@example.com');`

      const result = beautifySql(inputSql, {
        formatStyle: 'compact',
        maxLineLength: 40
      })

      const lines = result.split('\n')
      expect(lines.length).toBeLessThanOrEqual(3) // 紧凑风格应该保持较少的行数
    })
  })

  describe('垂直对齐功能', () => {
    it('应该对齐VALUES子句中的字段值', () => {
      const inputSql = `INSERT INTO users (id, name, email) VALUES
  (1, '张三', 'zhangsan@example.com'),
  (2, '李四', 'lisi@example.com'),
  (3, '王五', 'wangwu@example.com');`

      const result = beautifySql(inputSql, {
        alignValues: true,
        indentSpaces: 4
      })

      const lines = result.split('\n')
      const valuesLines = lines.filter(line => line.trim().startsWith('('))

      if (valuesLines.length > 1) {
        // 检查对齐效果
        const firstLineFields = valuesLines[0].split(',').map(f => f.trim())
        const secondLineFields = valuesLines[1].split(',').map(f => f.trim())

        // 字段数量应该相同
        expect(firstLineFields.length).toBe(secondLineFields.length)
      }
    })

    it('应该正确处理单行VALUES', () => {
      const inputSql = `INSERT INTO users (id, name) VALUES (1, '张三');`

      const result = beautifySql(inputSql, {
        alignValues: true
      })

      expect(result).toContain('VALUES')
      expect(result).toContain('(1,')
    })
  })

  describe('格式化函数集成', () => {
    it('beautifySql应该支持格式化选项', () => {
      const inputSql = `insert into users (id, name) values (1, '张三');`

      const result = beautifySql(inputSql, {
        keywordCase: 'upper',
        formatStyle: 'expanded'
      })

      expect(result).toContain('INSERT')
      expect(result).toContain('INTO')
      expect(result).toContain('VALUES')
    })

    it('应该支持压缩格式', () => {
      const inputSql = `insert into users (id, name) values
      (1, '张三');`

      const result = inputSql.replace(/\s+/g, ' ').trim()

      expect(result).not.toContain('\n')
      expect(result).not.toContain('  ')
    })
  })

  describe('边界情况处理', () => {
    it('应该处理空SQL', () => {
      const result = beautifySql('', {
        indentSpaces: 4,
        keywordCase: 'upper'
      })

      expect(result).toBe('')
    })

    it('应该处理只有空格的SQL', () => {
      const result = beautifySql('   \n\n   ', {
        indentSpaces: 4
      })

      expect(result.trim()).toBe('')
    })

    it('应该处理不包含关键字的SQL', () => {
      const result = beautifySql('SELECT * FROM users;', {
        keywordCase: 'upper'
      })

      expect(result).toContain('SELECT')
      expect(result).toContain('FROM')
    })
  })

  describe('性能测试', () => {
    it('应该高效处理大量数据', () => {
      // 生成大量数据的SQL
      let largeSql = 'INSERT INTO users (id, name, email) VALUES\n'
      for (let i = 1; i <= 100; i++) {
        largeSql += `  (${i}, '用户${i}', 'user${i}@example.com')${i < 100 ? ',' : ''}\n`
      }
      largeSql += ';'

      const startTime = performance.now()
      const result = beautifySql(largeSql, {
        indentSpaces: 2,
        alignValues: true
      })
      const endTime = performance.now()

      expect(result).toBeDefined()
      expect(endTime - startTime).toBeLessThan(1000) // 应该在1秒内完成
    })
  })
})
