import { ref } from 'vue'

/**
 * 增强版DDL解析器
 * 支持多种数据库语法，提供更准确的字段信息提取
 */
export function useDdlParser() {
  const parserCache = ref(new Map())

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
      console.log('缓存中的字段列表:', cachedResult.fields?.map(f => f.name) || [])
      return cachedResult
    }

    try {
      const result = await parseDdlWithMultipleStrategies(ddlStatement)

      console.log('最终解析结果:', result)
      console.log('解析出的字段数量:', result.fields?.length || 0)
      console.log('字段名称列表:', result.fields?.map(f => f.name) || [])

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
      .replace(/\s+/g, ' ')        // 合并多个连续空格
      .trim()

    // 2. 处理达梦数据库特有的语法
    // 移除STORAGE等达梦特定关键字，避免node-sql-parser解析失败
    processed = processed.replace(/\bSTORAGE\s*\([^)]*\)/gi, '')
    processed = processed.replace(/\bCOMPRESS\s+\w+/gi, '')
    processed = processed.replace(/\bTABLESPACE\s+\w+/gi, '') // 移除表空间定义
    processed = processed.replace(/\bPARTITION\s+BY[^)]*\)/gi, '') // 移除分区定义

    // 3. 处理注释（改进版）
    // 先处理多行注释，再处理单行注释
    processed = processed
      .replace(/\/\*[^*]*\*+(?:[^/*][^*]*\*+)*\//g, '')  // 移除多行注释
      .replace(/--[^\n]*/g, '')  // 移除单行注释

    // 4. 处理特殊字符和引号
    processed = processed.replace(/[`\[\]]/g, '"')  // 统一引号格式

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

    // 7. 移除语句末尾的分号和其他可能干扰解析的字符
    processed = processed.replace(/;\s*$/, '') // 移除末尾分号
    processed = processed.replace(/[^\x20-\x7E\n\r]/g, '') // 移除非ASCII字符

    console.log('预处理后的DDL语句:', processed)
    console.log('预处理前长度:', ddlStatement.length, '预处理后长度:', processed.length)
    return processed
  }

  /**
   * 使用多种策略解析DDL语句
   */
  const parseDdlWithMultipleStrategies = async (ddlStatement) => {
    // 预处理DDL语句，提高解析成功率
    const preprocessedDdl = preprocessDdlStatement(ddlStatement)

    const strategies = [
      parseWithNodeSqlParser,
      parseWithDmDatabaseRegex,  // 新增达梦数据库专用解析策略
      parseWithRegexAdvanced
    ]

    for (const strategy of strategies) {
      try {
        const result = await strategy(preprocessedDdl)
        if (result && result.tableName && result.fields.length > 0) {
          console.log(`使用策略 ${strategy.name} 解析成功`)
          return result
        }
      } catch (error) {
        console.warn(`策略 ${strategy.name} 失败:`, error.message)
      }
    }

    throw new Error('所有解析策略均失败，请检查DDL语句格式')
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
      databaseType: '达梦数据库'
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

      // 2. 提取表名
      const tableNameMatch = ddlStatement.match(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([\w\.\"\`\[\]]+)/i)
      if (tableNameMatch && tableNameMatch[1]) {
        result.tableName = tableNameMatch[1].replace(/["`\[\]]/g, '')
        console.log('提取的表名:', result.tableName)
      }

      // 3. 使用正则表达式匹配字段名和注释
      // 匹配模式："字段名" 数据类型(参数) 其他属性 [COMMENT '注释']
      // 改进的正则表达式，支持包含括号的数据类型、换行符和注释
      const fieldRegex = /"([^"]+)"\s+[^,]+?(?:COMMENT\s+'([^']+)'|COMMENT\s+"([^"]+)")?/gim
      const fields = []
      let match

      while ((match = fieldRegex.exec(fieldsSection)) !== null) {
        if (match[1]) {
          const fieldName = match[1]
          // 提取注释，支持单引号和双引号
          const comment = match[2] || match[3] || ''

          // 尝试提取数据类型
          const fieldDefinition = match[0]
          const typeMatch = fieldDefinition.match(/\s+(\w+)(?:\([^)]*\))?/)
          const type = typeMatch ? typeMatch[1].toUpperCase() : 'VARCHAR'

          // 检查是否可为空
          const nullable = !/NOT\s+NULL/i.test(fieldDefinition)

          // 提取默认值
          const defaultMatch = fieldDefinition.match(/DEFAULT\s+([^,\s]+)/i)
          const defaultValue = defaultMatch ? defaultMatch[1] : null

          fields.push({
            name: fieldName,
            type: type,
            nullable: nullable,
            defaultValue: defaultValue,
            comment: comment
          })
        }
      }

      // 去重并返回字段对象数组
      const uniqueFields = new Map()
      fields.forEach(field => {
        uniqueFields.set(field.name, field)
      })

      result.fields = Array.from(uniqueFields.values())

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
      databaseType: 'unknown'
    }

    // 提取表名
    if (astNode.table && astNode.table.length > 0) {
      result.tableName = astNode.table[0].table || ''
    }

    // 提取字段信息
    if (astNode.create_definitions && Array.isArray(astNode.create_definitions)) {
      result.fields = astNode.create_definitions
        .filter(def => def.column && def.column.column)
        .map(def => ({
          name: def.column.column,
          type: def.definition && def.definition.dataType ? def.definition.dataType : 'VARCHAR',
          nullable: !(def.definition && def.definition.nullable === false),
          defaultValue: def.definition && def.definition.default || null
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
      databaseType: 'unknown'
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
        .replace(/\s+/g, ' ')        // 合并多个空格
        .trim()

      console.log('标准化后DDL:', normalizedDdl)

      // 提取表名（支持多种表名格式）
      const tableNameMatch = normalizedDdl.match(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([\w\.\"\`\[\]]+)/i)
      if (tableNameMatch && tableNameMatch[1]) {
        result.tableName = tableNameMatch[1].replace(/["`\[\]]/g, '')
        console.log('提取的表名:', result.tableName)
      } else {
        console.warn('无法提取表名')
      }

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

      // 解析每个字段定义
      result.fields = fieldDefinitions.map(parseFieldDefinitionEnhanced)
        .filter(field => field && field.name)

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
   * 增强的字段定义解析
   */
  const parseFieldDefinitionEnhanced = (definition) => {
    if (!definition || !definition.trim()) return null

    // 多种字段定义模式匹配
    const patterns = [
      // 模式1：标准格式 "字段名" 数据类型(参数) [NOT NULL] [DEFAULT 值] [COMMENT '注释']
      /^\s*["']?([^"',\s]+)["']?\s+(\w+)(?:\([^)]*\))?\s*(NOT\s+NULL)?\s*(DEFAULT\s+([^,\s]+))?\s*(COMMENT\s+['"]([^'"]*)['"])?/i,

      // 模式2：简写格式 字段名 数据类型(参数)
      /^\s*(\w+)\s+(\w+)(?:\([^)]*\))?/i,

      // 模式3：达梦数据库格式 "字段名" 数据类型(参数) COMMENT '注释'
      /^\s*["']([^"']+)["']\s+(\w+)(?:\([^)]*\))?\s*(?:COMMENT\s+['"]([^'"]*)['"])?/i
    ]

    for (const pattern of patterns) {
      const match = definition.match(pattern)
      if (match) {
        let name, type, nullable, defaultValue, comment

        if (pattern === patterns[0]) {
          // 标准格式
          name = match[1]
          type = match[2]?.toUpperCase() || 'VARCHAR'
          nullable = !match[3] // NOT NULL存在则nullable=false
          defaultValue = match[5] || null
          comment = match[7] || null
        } else if (pattern === patterns[1]) {
          // 简写格式
          name = match[1]
          type = match[2]?.toUpperCase() || 'VARCHAR'
          nullable = true
          defaultValue = null
          comment = null
        } else if (pattern === patterns[2]) {
          // 达梦数据库格式
          name = match[1]
          type = match[2]?.toUpperCase() || 'VARCHAR'
          nullable = true
          defaultValue = null
          comment = match[3] || null
        }

        // 清理字段名中的引号
        name = name.replace(/["']/g, '')

        return {
          name,
          type,
          nullable,
          defaultValue,
          comment
        }
      }
    }

    console.warn('无法匹配字段定义模式:', definition)
    return null
  }

  /**
   * 智能分割字段定义
   */
  const splitFieldDefinitions = (fieldSection) => {
    const definitions = []
    let current = ''
    let depth = 0

    for (let i = 0; i < fieldSection.length; i++) {
      const char = fieldSection[i]

      if (char === '(') depth++
      if (char === ')') depth--

      if (char === ',' && depth === 0) {
        definitions.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }

    if (current.trim()) {
      definitions.push(current.trim())
    }

    return definitions
  }

  /**
   * 解析单个字段定义
   */
  const parseFieldDefinition = (definition) => {
    // 匹配字段名（支持引号包围）
    const nameMatch = definition.match(/^(["'`\w\[\]]+)/)
    if (!nameMatch) return null

    const rawName = nameMatch[1]
    const name = rawName.replace(/["'`\[\]]/g, '')

    // 匹配数据类型
    const typeMatch = definition.match(/\s+(\w+)(?:\([^)]*\))?/)
    const type = typeMatch ? typeMatch[1].toUpperCase() : 'VARCHAR'

    // 检查是否可为空
    const nullable = !/NOT\s+NULL/i.test(definition)

    // 提取默认值
    const defaultMatch = definition.match(/DEFAULT\s+([^,\s]+)/i)
    const defaultValue = defaultMatch ? defaultMatch[1] : null

    return {
      name,
      type,
      nullable,
      defaultValue
    }
  }

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
    const tableNameMatch = ddlStatement.match(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([\w\.\"\`\[\]]+)/i)
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
      { name: 'PostgreSQL', keywords: ['WITH', 'TABLESPACE'] },
      { name: 'SQL Server', keywords: ['ON', 'TEXTIMAGE_ON'] },
      { name: 'Oracle', keywords: ['TABLESPACE', 'STORAGE'] },
      { name: '达梦数据库', keywords: ['STORAGE', 'COMPRESS'] }
    ]
  }

  /**
   * 检测数据库类型
   */
  const detectDatabaseType = (ddlStatement) => {
    const databases = getSupportedDatabases()

    for (const db of databases) {
      for (const keyword of db.keywords) {
        if (new RegExp(`\\b${keyword}\\b`, 'i').test(ddlStatement)) {
          return db.name
        }
      }
    }

    return 'Unknown'
  }

  /**
   * 清理缓存
   */
  const clearCache = () => {
    parserCache.value.clear()
  }

  return {
    parseDdl,
    validateDdl,
    detectDatabaseType,
    clearCache,
    getSupportedDatabases
  }
}
