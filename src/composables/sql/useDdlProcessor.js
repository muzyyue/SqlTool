/**
 * 统一DDL处理器
 * 整合DDL类型检测、详细解析和生成功能
 * 提供统一的API接口和缓存机制
 */

import { ref } from 'vue'
import { useDdlTypeParser } from './useDdlTypeParser.js'
import { useDdlParser } from './useDdlParser.js'
import { useDdlGenerator } from './useDdlGenerator.js'
import { StrategyManager } from './useDatabaseStrategy.js'

/**
 * 统一DDL处理器
 */
export function useDdlProcessor() {
  // 解析器实例
  const typeParser = useDdlTypeParser()
  const ddlParser = useDdlParser()
  const ddlGenerator = useDdlGenerator()
  const strategyManager = new StrategyManager()

  // 解析结果缓存
  const parseCache = ref(new Map())

  // 配置选项
  const config = ref({
    // 缓存配置
    cacheEnabled: true,
    cacheTTL: 3600000, // 1小时

    // 解析配置
    strictMode: false,
    skipValidation: false,

    // 生成配置
    includeComments: true,
    formatSql: true,
    indentSpaces: 2,
  })

  /**
   * 设置配置选项
   */
  const setConfig = (newConfig) => {
    config.value = { ...config.value, ...newConfig }
  }

  /**
   * 清理缓存
   */
  const clearCache = () => {
    parseCache.value.clear()
  }

  /**
   * 获取缓存键
   */
  const getCacheKey = (ddlStatement, options) => {
    return `${ddlStatement.trim().toLowerCase()}_${JSON.stringify(options || {})}`
  }

  /**
   * 检测DDL语句类型
   */
  const detectDdlType = (ddlStatement) => {
    return typeParser.detectDdlType(ddlStatement)
  }

  /**
   * 统一解析DDL语句
   * 整合类型检测和详细解析
   */
  const parseDdl = async (ddlStatement, options = {}) => {
    if (!ddlStatement) {
      throw new Error('DDL语句不能为空')
    }

    // 检查缓存
    const cacheKey = getCacheKey(ddlStatement, options)
    if (config.value.cacheEnabled && parseCache.value.has(cacheKey)) {
      const cached = parseCache.value.get(cacheKey)
      if (Date.now() - cached.timestamp < config.value.cacheTTL) {
        return cached.result
      }
      // 缓存过期，移除
      parseCache.value.delete(cacheKey)
    }

    try {
      // 1. 检测DDL类型
      const ddlType = typeParser.detectDdlType(ddlStatement)

      // 2. 使用基础类型解析器获取初步结果
      const typeParseResult = typeParser.parseDdl(ddlStatement)

      // 3. 使用增强解析器获取更详细的结果
      let enhancedResult
      try {
        enhancedResult = await ddlParser.parseDdl(ddlStatement)
      } catch {
        // 增强解析失败时，使用基础解析结果
        enhancedResult = {
          fields: [],
          indexes: [],
          constraints: [],
          databaseType: 'unknown',
        }
      }

      // 4. 合并解析结果
      const finalResult = {
        // 基础信息
        type: ddlType,
        originalStatement: ddlStatement,
        databaseType: enhancedResult.databaseType || 'unknown',
        tableName: typeParseResult.tableName || enhancedResult.tableName || '',

        // 详细信息
        details: {
          fields: enhancedResult.fields || typeParseResult.details.fields || [],
          indexes: enhancedResult.indexes || typeParseResult.details.indexes || [],
          constraints: enhancedResult.constraints || typeParseResult.details.constraints || [],
          tableComment: typeParseResult.details.tableComment || '',
          ...typeParseResult.details,
          ...enhancedResult,
        },

        // 错误和警告
        errors: typeParseResult.errors || [],
        warnings: typeParseResult.warnings || [],
        success: !typeParseResult.hasErrors(),
      }

      // 5. 缓存结果
      if (config.value.cacheEnabled) {
        parseCache.value.set(cacheKey, {
          timestamp: Date.now(),
          result: finalResult,
        })
      }

      return finalResult
    } catch (error) {
      throw new Error(`DDL解析失败: ${error.message}`)
    }
  }

  /**
   * 根据解析结果生成DDL语句
   */
  const generateDdl = (parseResult, targetDatabase, options = {}) => {
    return ddlGenerator.generateDdl(parseResult, targetDatabase, options)
  }

  /**
   * 转换DDL语句到目标数据库语法
   */
  const convertDdl = async (ddlStatement, targetDatabase, options = {}) => {
    // 1. 解析原始DDL
    const parseResult = await parseDdl(ddlStatement, options)

    // 2. 生成目标数据库的DDL
    const generated = ddlGenerator.generateDdl(parseResult, targetDatabase, options)

    return {
      original: ddlStatement,
      parsed: parseResult,
      converted: generated,
      targetDatabase: targetDatabase,
    }
  }

  /**
   * 获取解析结果摘要
   */
  const getParseSummary = (parseResult) => {
    return {
      type: parseResult.type,
      tableName: parseResult.tableName,
      databaseType: parseResult.databaseType,
      fieldCount: parseResult.details.fields.length,
      indexCount: parseResult.details.indexes.length,
      constraintCount: parseResult.details.constraints.length,
      errorCount: parseResult.errors.length,
      warningCount: parseResult.warnings.length,
      success: parseResult.success,
    }
  }

  /**
   * 验证DDL语句
   */
  const validateDdl = (ddlStatement) => {
    const errors = []

    if (!ddlStatement || typeof ddlStatement !== 'string') {
      errors.push('DDL语句不能为空且必须是字符串')
      return { valid: false, errors }
    }

    const ddlType = typeParser.detectDdlType(ddlStatement)
    if (ddlType === typeParser.DdlStatementType.UNKNOWN) {
      errors.push('无法识别的DDL语句类型')
    }

    return {
      valid: errors.length === 0,
      errors,
      ddlType,
    }
  }

  /**
   * 注册数据库策略
   */
  const registerDatabaseStrategy = (databaseType, strategy) => {
    strategyManager.registerStrategy(databaseType, strategy)
  }

  /**
   * 获取已注册的数据库策略
   */
  const getRegisteredStrategies = () => {
    return strategyManager.getRegisteredStrategies()
  }

  /**
   * 获取解析器版本信息
   */
  const getVersionInfo = () => {
    return {
      ddlProcessorVersion: '1.0.0',
      typeParserVersion: '1.0.0',
      enhancedParserVersion: '1.0.0',
      generatorVersion: '1.0.0',
    }
  }

  return {
    // 核心功能
    detectDdlType,
    parseDdl,
    generateDdl,
    convertDdl,

    // 辅助功能
    validateDdl,
    getParseSummary,

    // 配置管理
    config,
    setConfig,
    clearCache,

    // 策略管理
    registerDatabaseStrategy,
    getRegisteredStrategies,

    // 工具方法
    getVersionInfo,

    // 导出相关类型和枚举
    DdlStatementType: typeParser.DdlStatementType,
    DatabaseType: ddlGenerator.DatabaseType,
  }
}
