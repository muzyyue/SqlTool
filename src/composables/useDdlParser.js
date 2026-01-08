import { ref } from 'vue'
import { StrategyManager } from './useDatabaseStrategy.js'
import { MySqlStrategy } from './strategies/MySqlStrategy.js'
import { PostgreSqlStrategy } from './strategies/PostgreSqlStrategy.js'
import { OracleStrategy } from './strategies/OracleStrategy.js'
import { SqlServerStrategy } from './strategies/SqlServerStrategy.js'
import { DmDatabaseStrategy } from './strategies/DmDatabaseStrategy.js'

/**
 * 增强版DDL解析器
 * 支持多种数据库语法，提供更准确的字段信息提取
 * 集成多数据库策略框架
 */
export function useDdlParser() {
  const parserCache = ref(new Map())
  const strategyManager = new StrategyManager()

  // 手动注册所有数据库策略
  const mysqlStrategy = new MySqlStrategy()
  const postgresqlStrategy = new PostgreSqlStrategy()
  const oracleStrategy = new OracleStrategy()
  const sqlserverStrategy = new SqlServerStrategy()
  const dmStrategy = new DmDatabaseStrategy()

  strategyManager.registerStrategy('mysql', mysqlStrategy)
  strategyManager.registerStrategy('postgresql', postgresqlStrategy)
  strategyManager.registerStrategy('oracle', oracleStrategy)
  strategyManager.registerStrategy('sqlserver', sqlserverStrategy)
  strategyManager.registerStrategy('dm', dmStrategy)

  console.log('DDL解析器已初始化，已注册策略:', strategyManager.getRegisteredStrategies())

  /**
   * 解析DDL语句，提取表结构信息
   * @param {string} ddlStatement - DDL语句
   * @param {boolean} forceRefresh - 是否强制刷新缓存
   * @returns {Object} 解析结果
   */
  const parseDdl = async (ddlStatement, forceRefresh = false) => {
    console.log('=== DDL解析开始 ===')
    console.log('输入DDL语句长度:', ddlStatement?.length || 0)
    console.log('DDL语句前100字符:', ddlStatement?.substring(0, 100))
    console.log('强制刷新缓存:', forceRefresh)

    if (!ddlStatement || typeof ddlStatement !== 'string') {
      console.error('DDL语句不能为空')
      throw new Error('DDL语句不能为空')
    }

    // 检查缓存
    const cacheKey = ddlStatement.trim().toLowerCase()
    if (!forceRefresh && parserCache.value.has(cacheKey)) {
      const cachedResult = parserCache.value.get(cacheKey)
      console.log('使用缓存结果')
      console.log('缓存中的字段数量:', cachedResult.fields?.length || 0)
      console.log('缓存中的字段列表:', cachedResult.fields?.map((f) => f.name) || [])
      return cachedResult
    }

    try {
      const result = await parseDdlWithMultipleStrategies(ddlStatement)

      console.log('最终解析结果:', result)
      console.log('解析出的字段数量:', result.fields?.length || 0)
      console.log('字段名称列表:', result.fields?.map((f) => f.name) || [])

      // 缓存结果
      parserCache.value.set(cacheKey, result)

      console.log('=== DDL解析完成 ===')
      return result
    } catch (error) {
      console.error('DDL解析失败:', error)
      throw new Error(`DDL解析失败: ${error.message}`)
    }
  }

  /**
   * 预处理DDL语句，提高解析成功率
   */
  const preprocessDdlStatement = (ddlStatement) => {
    if (!ddlStatement) return ''

    let processed = ddlStatement

    // 1. 标准化换行符和空格
    processed = processed
      .replace(/\r\n|\r|\n/g, ' ') // 替换所有换行符为空格
      .replace(/\s+/g, ' ') // 合并多个连续空格
      .trim()

    // 2. 处理达梦数据库特有的语法
    // 注意：不要移除用于数据库类型检测的关键字，如STORAGE
    // 只移除可能导致node-sql-parser解析失败的部分
    processed = processed.replace(/\bCOMPRESS\s+\w+/gi, '')
    processed = processed.replace(/\bTABLESPACE\s+\w+/gi, '') // 移除表空间定义
    processed = processed.replace(/\bPARTITION\s+BY[^)]*\)/gi, '') // 移除分区定义

    // 3. 处理注释（改进版）
    // 先处理多行注释，再处理单行注释
    processed = processed
      .replace(/\/\*[^*]*\*+(?:[^/*][^*]*\*+)*\//g, '') // 移除多行注释
      .replace(/--[^\n]*/g, '') // 移除单行注释

    // 4. 处理特殊字符和引号
    processed = processed.replace(/[`[]/g, '"') // 统一引号格式

    // 5. 移除可能导致node-sql-parser解析失败的字符
    // 移除行首的空白字符，避免"Expected \"#\", \"--\", \".\", \"/*\", or [ \\t\\n\\r] but \"i\" found"错误
    processed = processed.replace(/^\s+/, '')

    // 6. 确保语句以CREATE TABLE开头
    // 如果语句不以CREATE TABLE开头，添加适当的空白字符
    if (!processed.toUpperCase().startsWith('CREATE TABLE')) {
      // 查找CREATE TABLE的位置
      const createTableIndex = processed.toUpperCase().indexOf('CREATE TABLE')
      if (createTableIndex > 0) {
        // 移除CREATE TABLE之前的所有内容
        processed = processed.substring(createTableIndex)
      }
    }

    // 7. 保留PostgreSQL特定语法（IDENTITY、COLLATE等）
    // 不移除这些语法，而是简化它们以提高解析成功率
    processed = processed.replace(/GENERATED\s+ALWAYS\s+AS\s+IDENTITY/gi, 'IDENTITY')
    processed = processed.replace(/COLLATE\s+"[^"]+"/gi, 'COLLATE')

    // 8. 移除语句末尾的分号和其他可能干扰解析的字符
    processed = processed.replace(/;\s*$/, '') // 移除末尾分号
    processed = processed.replace(/[^\x20-\x7E\n\r]/g, '') // 移除非ASCII字符

    console.log('预处理后的DDL语句:', processed)
    console.log('预处理前长度:', ddlStatement.length, '预处理后长度:', processed.length)
    return processed
  }

  /**
   * 使用多种策略解析DDL语句
   * 优先使用新的多数据库策略框架，回退到原有策略
   */
  const parseDdlWithMultipleStrategies = async (ddlStatement) => {
    // 首先使用原始DDL进行数据库类型检测，避免预处理移除数据库特有标识
    let databaseType = strategyManager.detectDatabaseType(ddlStatement)
    console.log('使用原始DDL检测到的数据库类型:', databaseType)

    // 预处理DDL语句，提高解析成功率
    const preprocessedDdl = preprocessDdlStatement(ddlStatement)

    // 如果预处理后数据库类型变为unknown，使用预处理前的类型
    if (databaseType === 'unknown') {
      databaseType = strategyManager.detectDatabaseType(preprocessedDdl)
      console.log('使用预处理后DDL检测到的数据库类型:', databaseType)
    }

    // 策略优先级：新策略框架 > 原有策略
    const strategies = [
      // 1. 首先尝试使用新的多数据库策略框架
      async (ddl) => {
        try {
          console.log('=== 尝试使用多数据库策略框架 ===')
          console.log('最终确定的数据库类型:', databaseType)

          if (databaseType !== 'unknown') {
            const strategy = strategyManager.getStrategy(databaseType)
            if (strategy) {
              console.log(`使用数据库策略: ${databaseType}`)
              const result = await strategy.parseDdl(ddl)
              if (result && result.tableName && result.fields.length > 0) {
                result.databaseType = databaseType
                return result
              }
            }
          }
          throw new Error(`未找到合适的数据库策略或策略解析失败`)
        } catch (error) {
          console.warn('多数据库策略框架解析失败:', error.message)
          throw error
        }
      },
      // 2. 回退到原有策略
      parseWithNodeSqlParser,
      parseWithRegexAdvanced, // 通用正则解析策略
      parseWithDmDatabaseRegex, // 达梦数据库专用解析策略
    ]

    for (const strategy of strategies) {
      try {
        const result = await strategy(preprocessedDdl)
        if (result && result.tableName && result.fields.length > 0) {
          console.log(`使用策略 ${strategy.name || '多数据库策略框架'} 解析成功`)
          return result
        }
      } catch (error) {
        console.warn(`策略 ${strategy.name || '多数据库策略框架'} 失败:`, error.message)
      }
    }

    throw new Error('所有解析策略均失败，请检查DDL语句格式')
  }

  /**
   * 提取单个字段的完整信息
   * @param {string} ddlStatement - DDL语句
   * @param {string} fieldName - 要提取的字段名（可选，如果不提供则选择第一个字段）
   * @returns {Object} 字段的完整信息
   */
  const extractSingleFieldInfo = async (ddlStatement, fieldName = null) => {
    console.log('=== 开始提取单个字段信息 ===')
    console.log('目标字段名:', fieldName || '第一个字段')

    try {
      // 使用PostgreSQL策略解析DDL
      const parsedResult = await postgresqlStrategy.parseDdl(ddlStatement)

      if (!parsedResult.fields || parsedResult.fields.length === 0) {
        throw new Error('未找到任何字段定义')
      }

      // 选择目标字段
      let targetField = null
      if (fieldName) {
        targetField = parsedResult.fields.find(
          (field) => field.name.toLowerCase() === fieldName.toLowerCase(),
        )
        if (!targetField) {
          throw new Error(`未找到名为"${fieldName}"的字段`)
        }
      } else {
        targetField = parsedResult.fields[0]
      }

      // 获取字段的完整定义（从原始DDL中提取）
      const fullFieldDefinition = extractFullFieldDefinition(ddlStatement, targetField.name)

      // 构建完整的字段信息
      const fieldInfo = {
        // 基本信息
        fieldName: targetField.name,
        dataType: targetField.type,
        nullable: targetField.nullable,
        defaultValue: targetField.defaultValue,
        isIdentity: targetField.isIdentity,
        comment: targetField.comment,

        // 完整定义
        fullDefinition: fullFieldDefinition,

        // 约束信息
        constraints: extractFieldConstraints(parsedResult.constraints, targetField.name),

        // 索引信息
        indexes: extractFieldIndexes(parsedResult.indexes, targetField.name),

        // 表信息
        tableName: parsedResult.tableName,
        databaseType: parsedResult.databaseType,

        // 字段位置信息
        fieldPosition: parsedResult.fields.findIndex((f) => f.name === targetField.name) + 1,
        totalFields: parsedResult.fields.length,
      }

      console.log('字段信息提取成功:', fieldInfo)
      return fieldInfo
    } catch (error) {
      console.error('字段信息提取失败:', error)
      throw new Error(`字段信息提取失败: ${error.message}`)
    }
  }

  /**
   * 从原始DDL中提取字段的完整定义
   */
  const extractFullFieldDefinition = (ddlStatement, fieldName) => {
    const fieldSectionMatch = ddlStatement.match(/CREATE\s+TABLE[^(]*\(([\s\S]*?)\)/i)
    if (!fieldSectionMatch) return ''

    const fieldSection = fieldSectionMatch[1]
    const fieldDefinitions = splitFieldDefinitions(fieldSection)

    for (const fieldDef of fieldDefinitions) {
      if (fieldDef.toLowerCase().includes(fieldName.toLowerCase())) {
        return fieldDef.trim()
      }
    }

    return ''
  }

  /**
   * 提取字段相关的约束信息
   */
  const extractFieldConstraints = (constraints, fieldName) => {
    const fieldConstraints = []

    for (const constraint of constraints) {
      if (constraint.columns && constraint.columns.includes(fieldName)) {
        fieldConstraints.push({
          type: constraint.type,
          name: constraint.name || '',
          columns: constraint.columns,
        })
      }
    }

    return fieldConstraints
  }

  /**
   * 提取字段相关的索引信息
   */
  const extractFieldIndexes = (indexes, fieldName) => {
    const fieldIndexes = []

    for (const index of indexes) {
      if (index.columns && index.columns.includes(fieldName)) {
        fieldIndexes.push({
          name: index.name,
          columns: index.columns,
          unique: index.unique,
        })
      }
    }

    return fieldIndexes
  }

  /**
   * 分割字段定义（复制自PostgreSqlStrategy）
   * 修复：添加引号处理，防止引号内的逗号被误识别为字段分隔符
   */
  const splitFieldDefinitions = (fieldSection) => {
    const definitions = []
    let currentDef = ''
    let parenDepth = 0
    let inQuotes = false
    let quoteChar = ''

    for (let i = 0; i < fieldSection.length; i++) {
      const char = fieldSection[i]

      // 处理引号
      if ((char === '"' || char === "'") && !inQuotes) {
        inQuotes = true
        quoteChar = char
      } else if (char === quoteChar && inQuotes) {
        inQuotes = false
        quoteChar = ''
      }

      // 只有在不在引号内时才处理括号
      if (!inQuotes) {
        if (char === '(') {
          parenDepth++
        } else if (char === ')') {
          parenDepth--
        }
      }

      // 只有在括号深度为0且不在引号内时才分割字段
      if (char === ',' && parenDepth === 0 && !inQuotes) {
        if (currentDef.trim()) {
          definitions.push(currentDef.trim())
        }
        currentDef = ''
      } else {
        currentDef += char
      }
    }

    if (currentDef.trim()) {
      definitions.push(currentDef.trim())
    }

    return definitions
  }

  /**
   * 达梦数据库专用解析策略（基于Test.txt中的实现）
   */
  const parseWithDmDatabaseRegex = (ddlStatement) => {
    console.log('=== 使用达梦数据库专用解析策略 ===')
    console.log('DDL语句:', ddlStatement)

    const result = {
      tableName: '',
      fields: [],
      databaseType: detectDatabaseType(ddlStatement), // 根据实际内容检测数据库类型
    }

    try {
      // 检查输入有效性
      if (!ddlStatement) {
        throw new Error('DDL语句不能为空')
      }

      // 1. 首先提取CREATE TABLE语句中的字段定义部分
      // 使用更可靠的方法处理嵌套括号
      const createTableIndex = ddlStatement.toLowerCase().indexOf('create table')
      if (createTableIndex === -1) {
        throw new Error('未找到CREATE TABLE关键字')
      }

      // 找到第一个左括号
      const leftParenIndex = ddlStatement.indexOf('(', createTableIndex)
      if (leftParenIndex === -1) {
        throw new Error('未找到字段定义部分的左括号')
      }

      // 使用计数器跟踪括号嵌套深度，找到匹配的右括号
      let depth = 1
      let rightParenIndex = leftParenIndex + 1
      const length = ddlStatement.length

      while (rightParenIndex < length && depth > 0) {
        const char = ddlStatement[rightParenIndex]
        if (char === '(') {
          depth++
        } else if (char === ')') {
          depth--
        }
        rightParenIndex++
      }

      if (depth !== 0) {
        throw new Error('括号不匹配，无法找到字段定义部分的结束')
      }

      // 提取字段定义部分
      const fieldsSection = ddlStatement.substring(leftParenIndex + 1, rightParenIndex - 1)
      console.log('提取的字段定义部分:', fieldsSection)

      // 提取表名
      const tableNameMatch = ddlStatement.match(
        /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([\w."`[\]]+)/i,
      )
      if (tableNameMatch && tableNameMatch[1]) {
        result.tableName = tableNameMatch[1].replace(/["`[\]]/g, '')
        console.log('提取的表名:', result.tableName)
      }

      // 3. 使用splitFieldDefinitions函数分割字段定义
      const fieldDefinitions = splitFieldDefinitions(fieldsSection)
      console.log('分割后的字段定义数量:', fieldDefinitions.length)

      const fields = []

      // 4. 解析每个字段定义
      for (const fieldDef of fieldDefinitions) {
        console.log('解析字段定义:', fieldDef)

        // 跳过约束定义（如PRIMARY KEY、FOREIGN KEY等）
        if (
          /^(PRIMARY\s+KEY|FOREIGN\s+KEY|UNIQUE|CHECK|CONSTRAINT|NOT\s+CLUSTER)/i.test(
            fieldDef.trim(),
          )
        ) {
          console.log('跳过约束定义:', fieldDef.trim())
          continue
        }

        // 使用parseFieldDefinitionEnhanced解析字段
        const parsedField = parseFieldDefinitionEnhanced(fieldDef)
        if (parsedField) {
          fields.push(parsedField)
        }
      }

      result.fields = fields

      console.log('解析出的字段数量:', result.fields.length)
      console.log('字段详情:', result.fields)

      if (result.fields.length === 0) {
        throw new Error('未找到有效的字段定义')
      }

      console.log('=== 达梦数据库专用解析完成 ===')
      return result
    } catch (error) {
      console.error('达梦数据库专用解析失败:', error)
      throw new Error(`达梦数据库解析失败: ${error.message}`)
    }
  }

  /**
   * 使用node-sql-parser解析
   */
  const parseWithNodeSqlParser = async (ddlStatement) => {
    console.log('=== 使用node-sql-parser解析DDL ===')
    console.log('DDL语句:', ddlStatement)

    try {
      // 动态导入node-sql-parser
      const parserModule = await import('node-sql-parser')
      const Parser = parserModule.Parser || parserModule.default?.Parser || parserModule.default

      if (!Parser) {
        console.error('node-sql-parser模块加载失败')
        throw new Error('node-sql-parser模块加载失败')
      }

      const parser = new Parser()
      const ast = parser.parse(ddlStatement, { database: 'MySQL' })

      console.log('AST解析结果:', ast)

      if (!ast || !ast.ast || !ast.ast[0]) {
        console.error('无法解析DDL语句的AST结构')
        throw new Error('无法解析DDL语句的AST结构')
      }

      const tableInfo = extractTableInfoFromAst(ast.ast[0])
      console.log('提取的表信息:', tableInfo)
      console.log('=== node-sql-parser解析完成 ===')

      return tableInfo
    } catch (error) {
      console.error('node-sql-parser解析失败:', error)
      throw new Error(`node-sql-parser解析失败: ${error.message}`)
    }
  }

  /**
   * 从AST提取表信息
   */
  const extractTableInfoFromAst = (astNode) => {
    const result = {
      tableName: '',
      fields: [],
      databaseType: 'unknown',
    }

    // 提取表名
    if (astNode.table && astNode.table.length > 0) {
      result.tableName = astNode.table[0].table || ''
    }

    // 提取字段信息
    if (astNode.create_definitions && Array.isArray(astNode.create_definitions)) {
      result.fields = astNode.create_definitions
        .filter((def) => def.column && def.column.column)
        .map((def) => ({
          name: def.column.column,
          type: def.definition && def.definition.dataType ? def.definition.dataType : 'VARCHAR',
          nullable: !(def.definition && def.definition.nullable === false),
          defaultValue: (def.definition && def.definition.default) || null,
        }))
    }

    return result
  }

  /**
   * 使用增强的正则表达式解析（支持多种数据库语法）
   */
  const parseWithRegexAdvanced = (ddlStatement) => {
    const result = {
      tableName: '',
      fields: [],
      constraints: [], // 新增：约束信息
      databaseType: 'unknown',
    }

    console.log('=== 增强正则表达式解析开始 ===')
    console.log('原始DDL语句:', ddlStatement)

    try {
      // 检测数据库类型
      result.databaseType = detectDatabaseType(ddlStatement)
      console.log('检测到的数据库类型:', result.databaseType)

      // 标准化DDL语句
      const normalizedDdl = ddlStatement
        .replace(/\r\n|\r|\n/g, ' ') // 替换换行符
        .replace(/\s+/g, ' ') // 合并多个空格
        .trim()

      console.log('标准化后DDL:', normalizedDdl)

      // 提取表名（支持多种表名格式）
      const tableNameMatch = normalizedDdl.match(
        /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([\w."`[\]]+)/i,
      )
      if (tableNameMatch && tableNameMatch[1]) {
        result.tableName = tableNameMatch[1].replace(/["`[\]]/g, '')
        console.log('提取的表名:', result.tableName)
      } else {
        console.warn('无法提取表名')
      }

      // 提取约束信息
      result.constraints = extractConstraintsFromDdl(normalizedDdl)
      console.log('提取的约束信息:', result.constraints)

      // 提取字段定义部分（改进的括号匹配）
      const fieldSectionMatch = extractFieldSection(normalizedDdl)
      if (!fieldSectionMatch) {
        console.error('无法找到字段定义部分')
        throw new Error('无法找到字段定义部分')
      }

      console.log('提取的字段定义部分:', fieldSectionMatch)

      // 分割字段定义（考虑逗号在括号内的情况）
      const fieldDefinitions = splitFieldDefinitions(fieldSectionMatch)
      console.log('分割后的字段定义数量:', fieldDefinitions.length)
      console.log('字段定义详情:', fieldDefinitions)

      // 解析每个字段定义（跳过约束定义）
      result.fields = fieldDefinitions
        .filter((fieldDef) => {
          const trimmedDef = fieldDef.trim().toUpperCase()
          return !(
            trimmedDef.startsWith('PRIMARY KEY') ||
            trimmedDef.startsWith('FOREIGN KEY') ||
            trimmedDef.startsWith('UNIQUE') ||
            trimmedDef.startsWith('CONSTRAINT') ||
            trimmedDef.startsWith('NOT CLUSTER PRIMARY KEY')
          )
        })
        .map(parseFieldDefinitionEnhanced)
        .filter((field) => field && field.name)

      // 关联约束信息到字段（设置主键标识）
      associateConstraintsWithFields(result.fields, result.constraints)

      console.log('解析后的字段数量:', result.fields.length)
      console.log('解析后的字段详情:', result.fields)

      if (result.fields.length === 0) {
        console.error('未找到有效的字段定义')
        throw new Error('未找到有效的字段定义')
      }

      console.log('=== 增强正则表达式解析完成 ===')
      return result
    } catch (error) {
      console.error('增强正则表达式解析失败:', error)
      throw new Error(`正则表达式解析失败: ${error.message}`)
    }
  }

  /**
   * 从DDL语句中提取约束信息
   */
  const extractConstraintsFromDdl = (ddlStatement) => {
    const constraints = []

    // 提取主键约束（支持多种语法）
    const primaryKeyPatterns = [
      /PRIMARY\s+KEY\s*\(([^)]+)\)/i, // 标准语法
      /CONSTRAINT\s+[\w"]+\s+PRIMARY\s+KEY\s*\(([^)]+)\)/i, // 带约束名语法
      /,\s*PRIMARY\s+KEY\s*\(([^)]+)\)/i, // 逗号分隔语法
    ]

    for (const pattern of primaryKeyPatterns) {
      const primaryKeyMatch = ddlStatement.match(pattern)
      if (primaryKeyMatch) {
        constraints.push({
          type: 'PRIMARY KEY',
          columns: primaryKeyMatch[1].split(',').map((col) => col.trim().replace(/"/g, '')),
        })
        break // 只匹配第一个有效的主键约束
      }
    }

    // 提取外键约束
    const foreignKeyRegex =
      /CONSTRAINT\s+([\w"]+)\s+FOREIGN\s+KEY\s*\(([^)]+)\)\s+REFERENCES\s+([\w"]+)\s*\(([^)]+)\)/gi
    let fkMatch

    while ((fkMatch = foreignKeyRegex.exec(ddlStatement)) !== null) {
      constraints.push({
        type: 'FOREIGN KEY',
        name: fkMatch[1].replace(/"/g, ''),
        columns: fkMatch[2].split(',').map((col) => col.trim().replace(/"/g, '')),
        referenceTable: fkMatch[3].replace(/"/g, ''),
        referenceColumns: fkMatch[4].split(',').map((col) => col.trim().replace(/"/g, '')),
      })
    }

    // 提取唯一约束
    const uniqueRegex = /CONSTRAINT\s+([\w"]+)\s+UNIQUE\s*\(([^)]+)\)/gi
    let uniqueMatch

    while ((uniqueMatch = uniqueRegex.exec(ddlStatement)) !== null) {
      constraints.push({
        type: 'UNIQUE',
        name: uniqueMatch[1].replace(/"/g, ''),
        columns: uniqueMatch[2].split(',').map((col) => col.trim().replace(/"/g, '')),
      })
    }

    return constraints
  }

  /**
   * 关联约束信息到字段，设置主键标识
   */
  const associateConstraintsWithFields = (fields, constraints) => {
    // 查找主键约束
    const primaryKeyConstraint = constraints.find((constraint) => constraint.type === 'PRIMARY KEY')

    if (primaryKeyConstraint && primaryKeyConstraint.columns) {
      // 遍历主键约束中的字段名
      primaryKeyConstraint.columns.forEach((columnName) => {
        // 查找对应的字段
        const field = fields.find((f) => f.name.toLowerCase() === columnName.toLowerCase())
        if (field) {
          // 设置主键标识
          field.primaryKey = true
          console.log(`字段 ${field.name} 被标识为主键`)
        }
      })
    }
  }

  /**
   * 改进的字段定义部分提取
   */
  const extractFieldSection = (ddlStatement) => {
    // 找到第一个左括号
    const leftParenIndex = ddlStatement.indexOf('(')
    if (leftParenIndex === -1) {
      return null
    }

    // 使用计数器跟踪括号嵌套深度
    let depth = 1
    let rightParenIndex = leftParenIndex + 1
    const length = ddlStatement.length

    while (rightParenIndex < length && depth > 0) {
      const char = ddlStatement[rightParenIndex]
      if (char === '(') {
        depth++
      } else if (char === ')') {
        depth--
      }
      rightParenIndex++
    }

    if (depth !== 0) {
      return null
    }

    // 提取字段定义部分
    return ddlStatement.substring(leftParenIndex + 1, rightParenIndex - 1)
  }

  /**
   * 增强的字段定义解析（支持多种数据库的自增主键识别）
   */
  const parseFieldDefinitionEnhanced = (definition) => {
    if (!definition || !definition.trim()) return null

    // 多种字段定义模式匹配
    const patterns = [
      // 模式1：达梦数据库增强格式 "字段名" 数据类型(参数) [NOT NULL] [DEFAULT 值] [COMMENT '注释']
      /^\s*["']([^"']+)["']\s+(\w+)(?:\(([^)]*)\))?\s*(NOT\s+NULL)?\s*(DEFAULT\s+([^,\s]+))?\s*(?:COMMENT\s+['"]([^'"]*)['"])?/i,

      // 模式2：PostgreSQL格式 "字段名" 数据类型(参数) [NOT NULL] [DEFAULT 值] [IDENTITY] [COLLATE]
      /^\s*["']?([^"',\s]+)["']?\s+(\w+)(?:\([^)]*\))?\s*(NOT\s+NULL)?\s*(DEFAULT\s+([^,\s]+))?\s*(IDENTITY)?\s*(COLLATE)?/i,

      // 模式3：标准格式 "字段名" 数据类型(参数) [NOT NULL] [DEFAULT 值] [COMMENT '注释']
      /^\s*["']?([^"',\s]+)["']?\s+(\w+)(?:\([^)]*\))?\s*(NOT\s+NULL)?\s*(DEFAULT\s+([^,\s]+))?\s*(COMMENT\s+['"]([^'"]*)['"])?/i,

      // 模式4：简写格式 字段名 数据类型(参数)
      /^\s*(\w+)\s+(\w+)(?:\([^)]*\))?/i,

      // 模式5：达梦数据库格式 "字段名" 数据类型(参数) COMMENT '注释'
      /^\s*["']([^"']+)["']\s+(\w+)(?:\([^)]*\))?\s*(?:COMMENT\s+['"]([^'"]*)['"])?/i,
    ]

    for (const pattern of patterns) {
      const match = definition.match(pattern)
      if (match) {
        let name, type, nullable, defaultValue, comment, isIdentity

        if (pattern === patterns[0]) {
          // 达梦数据库增强格式 "字段名" 数据类型(参数) [NOT NULL] [DEFAULT 值] [COMMENT '注释']
          name = match[1]
          type = match[2]?.toUpperCase() || 'VARCHAR'
          nullable = !match[4] // NOT NULL存在则nullable=false
          defaultValue = match[6] || null
          comment = match[7] || null
          isIdentity = detectIdentityField(definition, type)
        } else if (pattern === patterns[1]) {
          // PostgreSQL格式 "字段名" 数据类型(参数) [NOT NULL] [DEFAULT 值] [IDENTITY] [COLLATE]
          name = match[1]
          type = match[2]?.toUpperCase() || 'VARCHAR'
          nullable = !match[3] // NOT NULL存在则nullable=false
          defaultValue = match[5] || null
          isIdentity = match[6] === 'IDENTITY' || detectIdentityField(definition, type)
        } else if (pattern === patterns[2]) {
          // 标准格式 "字段名" 数据类型(参数) [NOT NULL] [DEFAULT 值] [COMMENT '注释']
          name = match[1]
          type = match[2]?.toUpperCase() || 'VARCHAR'
          nullable = !match[3] // NOT NULL存在则nullable=false
          defaultValue = match[5] || null
          comment = match[7] || null
          isIdentity = detectIdentityField(definition, type)
        } else if (pattern === patterns[3]) {
          // 简写格式 字段名 数据类型(参数)
          name = match[1]
          type = match[2]?.toUpperCase() || 'VARCHAR'
          nullable = true
          defaultValue = null
          comment = null
          isIdentity = detectIdentityField(definition, type)
        } else if (pattern === patterns[4]) {
          // 达梦数据库格式 "字段名" 数据类型(参数) COMMENT '注释'
          name = match[1]
          type = match[2]?.toUpperCase() || 'VARCHAR'
          nullable = true
          defaultValue = null
          comment = match[3] || null
          isIdentity = detectIdentityField(definition, type)
        }

        // 清理字段名中的引号
        name = name.replace(/["']/g, '')

        // 处理IDENTITY字段（PostgreSQL自增字段）
        if (isIdentity) {
          type = 'SERIAL' // PostgreSQL自增字段类型
        }

        return {
          name,
          type,
          nullable,
          defaultValue,
          comment,
          isIdentity: !!isIdentity,
          primaryKey: false, // 新增：主键标识，初始为false，后续通过约束关联设置
        }
      }
    }

    console.warn('无法匹配字段定义模式:', definition)
    return null
  }

  /**
   * 检测自增主键字段（支持多种数据库类型）
   */
  const detectIdentityField = (fieldDefinition, dataType) => {
    const upperDef = fieldDefinition.toUpperCase()

    // MySQL: AUTO_INCREMENT
    if (upperDef.includes('AUTO_INCREMENT')) {
      return true
    }

    // PostgreSQL: SERIAL类型或IDENTITY语法
    if (dataType.includes('SERIAL') || upperDef.includes('IDENTITY')) {
      return true
    }

    // SQL Server: IDENTITY关键字
    if (upperDef.includes('IDENTITY')) {
      return true
    }

    // Oracle: GENERATED ALWAYS AS IDENTITY
    if (upperDef.includes('GENERATED ALWAYS AS IDENTITY')) {
      return true
    }

    // 达梦数据库: IDENTITY关键字
    if (upperDef.includes('IDENTITY')) {
      return true
    }

    return false
  }

  /**
   * 解析单个字段定义
   */
  // 移除未使用的parseFieldDefinition函数

  /**
   * 验证DDL语句格式
   */
  const validateDdl = (ddlStatement) => {
    const errors = []

    if (!ddlStatement) {
      errors.push('DDL语句不能为空')
      return errors
    }

    // 检查是否包含CREATE TABLE
    if (!/CREATE\s+TABLE/i.test(ddlStatement)) {
      errors.push('DDL语句必须包含CREATE TABLE关键字')
    }

    // 检查表名
    const tableNameMatch = ddlStatement.match(
      /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([\w."`[\]]+)/i,
    )
    if (!tableNameMatch) {
      errors.push('无法识别表名')
    }

    // 检查字段定义部分
    if (!/\([^)]+\)/.test(ddlStatement)) {
      errors.push('缺少字段定义部分（括号内的内容）')
    }

    return errors
  }

  /**
   * 获取支持的数据库类型
   */
  const getSupportedDatabases = () => {
    return [
      { name: 'MySQL', keywords: ['ENGINE', 'CHARSET', 'COLLATE'] },
      {
        name: 'PostgreSQL',
        keywords: [
          'WITH',
          'TABLESPACE',
          'IDENTITY',
          'COLLATE',
          'OWNER TO',
          'USING btree',
          'GENERATED ALWAYS AS IDENTITY',
        ],
      },
      { name: 'SQL Server', keywords: ['ON', 'TEXTIMAGE_ON'] },
      { name: 'Oracle', keywords: ['TABLESPACE', 'STORAGE'] },
      { name: '达梦数据库', keywords: ['STORAGE', 'COMPRESS'] },
    ]
  }

  /**
   * 检测数据库类型
   */
  // 直接使用strategyManager的detectDatabaseType方法，确保与策略框架一致
  const detectDatabaseType = (ddlStatement) => {
    return strategyManager.detectDatabaseType(ddlStatement)
  }

  /**
   * 清理缓存
   */
  const clearCache = () => {
    parserCache.value.clear()
  }

  return {
    parseDdl,
    extractSingleFieldInfo,
    validateDdl,
    detectDatabaseType,
    clearCache,
    getSupportedDatabases,
  }
}
