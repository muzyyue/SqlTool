/**
 * DDL处理模块测试
 * 验证DDL类型检测、解析、错误处理和缓存机制等功能
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { useDdlTypeParser } from '../src/composables/useDdlTypeParser.js'
import { useDdlProcessor } from '../src/composables/useDdlProcessor.js'

// 测试数据
const testDdl = `
CREATE TABLE users (
  id INT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
`

const testAlterDdl = `
ALTER TABLE users
ADD COLUMN age INT;
`

const testDropDdl = `
DROP TABLE IF EXISTS users CASCADE;
`

describe('DDL处理模块测试', () => {
  let typeParser
  let ddlProcessor

  beforeEach(() => {
    typeParser = useDdlTypeParser()
    ddlProcessor = useDdlProcessor()
  })

  describe('DDL类型检测测试', () => {
    it('应该正确检测CREATE TABLE语句类型', () => {
      const type = typeParser.detectDdlType(testDdl)
      expect(type).toBe(typeParser.DdlStatementType.CREATE_TABLE)
    })

    it('应该正确检测ALTER TABLE语句类型', () => {
      const type = typeParser.detectDdlType(testAlterDdl)
      expect(type).toBe(typeParser.DdlStatementType.ALTER_TABLE)
    })

    it('应该正确检测DROP TABLE语句类型', () => {
      const type = typeParser.detectDdlType(testDropDdl)
      expect(type).toBe(typeParser.DdlStatementType.DROP_TABLE)
    })

    it('应该返回UNKNOWN类型对于无效语句', () => {
      const type = typeParser.detectDdlType('INVALID SQL STATEMENT')
      expect(type).toBe(typeParser.DdlStatementType.UNKNOWN)
    })
  })

  describe('DDL解析测试', () => {
    it('应该正确解析CREATE TABLE语句', async () => {
      const result = await ddlProcessor.parseDdl(testDdl)

      expect(result).toHaveProperty('type')
      expect(result).toHaveProperty('tableName')
      expect(result).toHaveProperty('details')
      expect(result).toHaveProperty('success')

      expect(result.type).toBe(typeParser.DdlStatementType.CREATE_TABLE)
      expect(result.tableName).toBe('users')
      expect(result.success).toBe(true)
      expect(result.details.fields).toBeInstanceOf(Array)
      expect(result.details.fields.length).toBeGreaterThan(0)
    })

    it('应该正确解析ALTER TABLE语句', async () => {
      const result = await ddlProcessor.parseDdl(testAlterDdl)

      expect(result.type).toBe(typeParser.DdlStatementType.ALTER_TABLE)
      expect(result.tableName).toBe('users')
      expect(result.success).toBe(true)
    })

    it('应该正确解析DROP TABLE语句', async () => {
      const result = await ddlProcessor.parseDdl(testDropDdl)

      expect(result.type).toBe(typeParser.DdlStatementType.DROP_TABLE)
      expect(result.tableName).toBe('users')
      expect(result.success).toBe(true)
    })
  })

  describe('错误处理测试', () => {
    it('应该处理空DDL语句', async () => {
      await expect(ddlProcessor.parseDdl('')).rejects.toThrow('DDL语句不能为空')
    })

    it('应该处理无效DDL语句', async () => {
      const result = await ddlProcessor.parseDdl('INVALID SQL STATEMENT')

      expect(result).toHaveProperty('errors')
      expect(result.errors).toBeInstanceOf(Array)
      expect(result.success).toBe(false)
    })

    it('应该验证DDL语句并返回错误信息', () => {
      const result = ddlProcessor.validateDdl('INVALID SQL STATEMENT')

      expect(result.valid).toBe(false)
      expect(result.errors).toBeInstanceOf(Array)
      expect(result.errors.length).toBeGreaterThan(0)
    })
  })

  describe('缓存机制测试', () => {
    it('应该缓存解析结果', async () => {
      // 第一次解析
      const result1 = await ddlProcessor.parseDdl(testDdl)

      // 第二次解析，应该使用缓存
      const result2 = await ddlProcessor.parseDdl(testDdl)

      expect(result1).toEqual(result2)
    })

    it('应该在清除缓存后重新解析', async () => {
      // 第一次解析
      const result1 = await ddlProcessor.parseDdl(testDdl)

      // 清除缓存
      ddlProcessor.clearCache()

      // 第二次解析，应该重新解析
      const result2 = await ddlProcessor.parseDdl(testDdl)

      expect(result1).toEqual(result2)
    })

    it('应该根据配置启用/禁用缓存', async () => {
      // 禁用缓存
      ddlProcessor.setConfig({ cacheEnabled: false })

      // 第一次解析
      const result1 = await ddlProcessor.parseDdl(testDdl)

      // 第二次解析，应该重新解析
      const result2 = await ddlProcessor.parseDdl(testDdl)

      expect(result1).toEqual(result2)

      // 重新启用缓存
      ddlProcessor.setConfig({ cacheEnabled: true })
    })
  })

  describe('解析结果摘要测试', () => {
    it('应该返回正确的解析结果摘要', async () => {
      const result = await ddlProcessor.parseDdl(testDdl)
      const summary = ddlProcessor.getParseSummary(result)

      expect(summary).toHaveProperty('type')
      expect(summary).toHaveProperty('tableName')
      expect(summary).toHaveProperty('fieldCount')
      expect(summary).toHaveProperty('indexCount')
      expect(summary).toHaveProperty('constraintCount')
      expect(summary).toHaveProperty('errorCount')
      expect(summary).toHaveProperty('warningCount')
      expect(summary).toHaveProperty('success')

      expect(summary.type).toBe(typeParser.DdlStatementType.CREATE_TABLE)
      expect(summary.tableName).toBe('users')
      expect(summary.success).toBe(true)
      expect(summary.errorCount).toBe(0)
    })
  })

  describe('多种DDL语句类型测试', () => {
    it('应该正确处理CREATE_TABLE语句', async () => {
      const result = await ddlProcessor.parseDdl(testDdl)

      expect(result.type).toBe('CREATE_TABLE')
      expect(result.success).toBe(true)
    })

    it('应该正确处理ALTER_TABLE语句', async () => {
      const result = await ddlProcessor.parseDdl(testAlterDdl)

      expect(result.type).toBe('ALTER_TABLE')
      expect(result.success).toBe(true)
    })

    it('应该正确处理DROP_TABLE语句', async () => {
      const result = await ddlProcessor.parseDdl(testDropDdl)

      expect(result.type).toBe('DROP_TABLE')
      expect(result.success).toBe(true)
    })
  })

  describe('配置管理测试', () => {
    it('应该正确设置和获取配置', () => {
      // 设置配置
      ddlProcessor.setConfig({
        cacheEnabled: false,
        strictMode: true,
        indentSpaces: 4,
      })

      // 验证配置是否生效
      expect(ddlProcessor.config.value.cacheEnabled).toBe(false)
      expect(ddlProcessor.config.value.strictMode).toBe(true)
      expect(ddlProcessor.config.value.indentSpaces).toBe(4)

      // 重置配置
      ddlProcessor.setConfig({
        cacheEnabled: true,
        strictMode: false,
        indentSpaces: 2,
      })
    })
  })
})
