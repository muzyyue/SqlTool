/**
 * countInsertRecords 函数单元测试
 * 验证从SQL INSERT语句中正确提取记录数
 */

import { describe, it, expect, beforeAll } from 'vitest'
import fs from 'fs'
import path from 'path'

describe('countInsertRecords', () => {
  let countInsertRecords

  beforeAll(() => {
    const vueCode = fs.readFileSync(
      path.join(__dirname, '../../src/views/tools/sql/InsertPage.vue'),
      'utf-8'
    )

    const match = vueCode.match(/const countInsertRecords = \(sql\) => \{[\s\S]*?\n\};/)
    if (match) {
      const fnCode = match[0].replace('const countInsertRecords', 'countInsertRecords')
      eval(fnCode)
    }
  })

  it('应该正确统计简单的INSERT语句记录数', () => {
    const sql = `INSERT INTO users (id, name, age) VALUES (1, 'Alice', 25), (2, 'Bob', 30);`
    const result = countInsertRecords(sql)
    expect(result).toBe(2)
  })

  it('应该处理单条INSERT记录', () => {
    const sql = `INSERT INTO users (id, name) VALUES (1, 'Test');`
    const result = countInsertRecords(sql)
    expect(result).toBe(1)
  })

  it('应该处理包含特殊字符的值（如引号）', () => {
    const sql = `INSERT INTO users (id, name) VALUES (1, 'O''Brien'), (2, 'It''s a "test"');`
    const result = countInsertRecords(sql)
    expect(result).toBe(2)
  })

  it('应该处理多行格式的INSERT语句', () => {
    const sql = `INSERT INTO files (
      file_name,
      file_path,
      file_size
    ) VALUES 
      ('test.xlsx', '/data/test.xlsx', 1024000),
      ('doc.pdf', '/data/doc.pdf', 2048000);`
    const result = countInsertRecords(sql)
    expect(result).toBe(2)
  })

  it('应该处理空输入', () => {
    expect(countInsertRecords(null)).toBe(0)
    expect(countInsertRecords(undefined)).toBe(0)
    expect(countInsertRecords('')).toBe(0)
    expect(countInsertRecords(123)).toBe(0)
  })

  it('应该处理非INSERT语句', () => {
    const sql = `UPDATE users SET name = 'Test' WHERE id = 1;`
    const result = countInsertRecords(sql)
    expect(result).toBe(0)
  })

  it('应该处理大量记录的INSERT语句', () => {
    const values = Array.from({ length: 100 }, (_, i) => `(${i}, 'User${i}', ${20 + i})`).join(', ')
    const sql = `INSERT INTO users (id, name, age) VALUES ${values};`
    const result = countInsertRecords(sql)
    expect(result).toBe(100)
  })

  it('应该处理包含SYS_GUID()等函数调用的值', () => {
    const sql = `INSERT INTO files (file_name, file_id) VALUES 
      ('test.pdf', SYS_GUID()),
      ('doc.docx', SYS_GUID()),
      ('image.png', SYS_GUID());`
    const result = countInsertRecords(sql)
    expect(result).toBe(3)
  })

  it('应该正确处理嵌套括号的情况', () => {
    const sql = `INSERT INTO data (id, config) VALUES (1, '{"key": "value"}'), (2, '[1, 2, 3]');`
    const result = countInsertRecords(sql)
    expect(result).toBe(2)
  })
})
