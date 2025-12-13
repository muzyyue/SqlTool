import { ref, computed } from 'vue'

/**
 * 增强版SQL生成器
 * 支持多种数据库语法和高级功能
 */
export function useSqlGeneratorEnhanced() {
  const databaseType = ref('mysql') // mysql, postgresql, sqlserver
  const sqlFormat = ref('formatted') // formatted, minified
  const batchSize = ref(100) // 批量生成大小
  const includeComments = ref(true) // 是否包含注释

  // SQL美化选项
  const beautifyOptions = ref({
    indentSpaces: 4,
    formatStyle: 'expanded', // 'compact' or 'expanded'
    keywordCase: 'upper',     // 'upper' or 'preserve'
    maxLineLength: 80,
    alignValues: true
  })

  /**
   * 生成INSERT语句
   */
  const generateInsertSql = (tableName, fieldMappings, excelData, options = {}) => {
    validateInputs(tableName, fieldMappings, excelData)

    const {
      dbType = databaseType.value,
      format = sqlFormat.value,
      batch = batchSize.value,
      comments = includeComments.value,
      beautifyOptions = {}
    } = options

    const sqlStatements = []

    // 添加表头注释
    if (comments) {
      sqlStatements.push(generateHeaderComment(tableName, fieldMappings, dbType))
    }

    // 分批处理数据
    for (let i = 0; i < excelData.length; i += batch) {
      const batchData = excelData.slice(i, i + batch)
      const batchSql = generateBatchInsertSql(tableName, fieldMappings, batchData, dbType)
      sqlStatements.push(batchSql)
    }

    // 格式化输出
    return formatSql(sqlStatements.join('\n\n'), format, beautifyOptions)
  }

  /**
   * 生成UPDATE语句
   */
  const generateUpdateSql = (tableName, fieldMappings, excelData, whereFields, options = {}) => {
    validateInputs(tableName, fieldMappings, excelData)

    const {
      dbType = databaseType.value,
      format = sqlFormat.value,
      comments = includeComments.value,
      beautifyOptions = {}
    } = options

    const sqlStatements = []

    // 添加表头注释
    if (comments) {
      sqlStatements.push(generateHeaderComment(tableName, fieldMappings, dbType, 'UPDATE'))
    }

    // 生成每条记录的UPDATE语句
    excelData.forEach((row, index) => {
      const updateSql = generateSingleUpdateSql(tableName, fieldMappings, row, whereFields, dbType)
      if (updateSql) {
        sqlStatements.push(updateSql)
      }
    })

    // 格式化输出
    return formatSql(sqlStatements.join('\n\n'), format, beautifyOptions)
  }

  /**
   * 生成批量INSERT语句
   */
  const generateBatchInsertSql = (tableName, fieldMappings, batchData, dbType) => {
    const mappedFields = fieldMappings
      .filter(mapping => mapping.excelHeader && mapping.excelIndex >= 0)
      .sort((a, b) => a.excelIndex - b.excelIndex)

    if (mappedFields.length === 0) {
      throw new Error('没有有效的字段映射关系')
    }

    const fieldNames = mappedFields.map(mapping => escapeFieldName(mapping.ddlField.name, dbType))
    const valuesList = []

    // 处理每行数据
    batchData.forEach(row => {
      const values = mappedFields.map(mapping => {
        const value = row[mapping.excelIndex]
        return formatValue(value, mapping.ddlField.type, dbType)
      })
      valuesList.push(`(${values.join(', ')})`)
    })

    // 确保VALUES子句格式正确，每行单独处理
    const valuesClause = valuesList.length > 1
      ? `VALUES\n  ${valuesList.join(',\n  ')}`
      : `VALUES ${valuesList[0]}`

    return `INSERT INTO ${escapeFieldName(tableName, dbType)} (${fieldNames.join(', ')})\n${valuesClause};`
  }

  /**
   * 生成单条UPDATE语句
   */
  const generateSingleUpdateSql = (tableName, fieldMappings, row, whereFields, dbType) => {
    const setClauses = []
    const whereClauses = []

    fieldMappings.forEach(mapping => {
      if (!mapping.excelHeader || mapping.excelIndex < 0) return

      const value = row[mapping.excelIndex]
      const fieldName = escapeFieldName(mapping.ddlField.name, dbType)
      const formattedValue = formatValue(value, mapping.ddlField.type, dbType)

      // 检查是否为WHERE条件字段
      const isWhereField = whereFields && whereFields.includes(mapping.ddlField.name)

      if (isWhereField) {
        whereClauses.push(`${fieldName} = ${formattedValue}`)
      } else {
        setClauses.push(`${fieldName} = ${formattedValue}`)
      }
    })

    if (setClauses.length === 0) {
      console.warn('没有可更新的字段')
      return null
    }

    if (whereClauses.length === 0) {
      console.warn('没有WHERE条件字段，UPDATE语句可能影响所有记录')
      return null
    }

    return `UPDATE ${escapeFieldName(tableName, dbType)}\nSET\n  ${setClauses.join(',\n  ')}\nWHERE ${whereClauses.join(' AND ')};`
  }

  /**
   * 验证输入参数
   */
  const validateInputs = (tableName, fieldMappings, excelData) => {
    if (!tableName || typeof tableName !== 'string') {
      throw new Error('表名不能为空且必须是字符串')
    }

    if (!Array.isArray(fieldMappings) || fieldMappings.length === 0) {
      throw new Error('字段映射关系不能为空')
    }

    if (!Array.isArray(excelData) || excelData.length === 0) {
      throw new Error('Excel数据不能为空')
    }

    // 验证表名格式
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(tableName)) {
      throw new Error('表名格式不正确')
    }
  }

  /**
   * 转义字段名（根据数据库类型）
   */
  const escapeFieldName = (fieldName, dbType) => {
    const name = String(fieldName).trim()

    switch (dbType) {
      case 'mysql':
        return `\`${name}\``
      case 'postgresql':
        return `"${name}"`
      case 'sqlserver':
        return `[${name}]`
      default:
        return name
    }
  }

  /**
   * 格式化值（根据数据类型和数据库类型）
   */
  const formatValue = (value, dataType, dbType) => {
    if (value === null || value === undefined || value === '') {
      return 'NULL'
    }

    const strValue = String(value).trim()

    // 处理数字类型
    if (isNumericType(dataType)) {
      if (strValue === '') return 'NULL'

      const numValue = parseFloat(strValue)
      if (isNaN(numValue)) {
        throw new Error(`数值类型字段的值"${strValue}"不是有效的数字`)
      }
      return strValue
    }

    // 处理布尔类型
    if (isBooleanType(dataType)) {
      const lowerValue = strValue.toLowerCase()
      if (lowerValue === 'true' || lowerValue === '1' || lowerValue === '是') {
        return dbType === 'postgresql' ? 'TRUE' : '1'
      }
      if (lowerValue === 'false' || lowerValue === '0' || lowerValue === '否') {
        return dbType === 'postgresql' ? 'FALSE' : '0'
      }
      throw new Error(`布尔类型字段的值"${strValue}"不是有效的布尔值`)
    }

    // 处理日期时间类型
    if (isDateTimeType(dataType)) {
      if (strValue === '') return 'NULL'

      const date = parseDateTime(strValue)
      if (!date) {
        throw new Error(`日期时间类型字段的值"${strValue}"格式不正确`)
      }

      switch (dbType) {
        case 'mysql':
          return `'${date.toISOString().slice(0, 19).replace('T', ' ')}'`
        case 'postgresql':
          return `'${date.toISOString()}'`
        case 'sqlserver':
          return `'${date.toISOString().slice(0, 23)}'`
        default:
          return `'${date.toISOString()}'`
      }
    }

    // 默认处理字符串类型
    return `'${escapeString(strValue, dbType)}'`
  }

  /**
   * 转义字符串中的特殊字符
   */
  const escapeString = (str, dbType) => {
    let escaped = str.replace(/'/g, "''")

    // 不同数据库的特殊转义规则
    switch (dbType) {
      case 'mysql':
        escaped = escaped.replace(/\\/g, '\\\\')
        break
      case 'postgresql':
        escaped = escaped.replace(/\\/g, '\\\\')
        break
      case 'sqlserver':
        // SQL Server使用单引号转义
        break
    }

    return escaped
  }

  /**
   * 判断是否为数值类型
   */
  const isNumericType = (dataType) => {
    const numericTypes = [
      'int', 'integer', 'smallint', 'bigint', 'tinyint',
      'decimal', 'numeric', 'float', 'double', 'real',
      'number'
    ]
    return numericTypes.some(type => dataType.toLowerCase().includes(type))
  }

  /**
   * 判断是否为布尔类型
   */
  const isBooleanType = (dataType) => {
    const booleanTypes = ['bool', 'boolean', 'bit']
    return booleanTypes.some(type => dataType.toLowerCase().includes(type))
  }

  /**
   * 判断是否为日期时间类型
   */
  const isDateTimeType = (dataType) => {
    const dateTimeTypes = [
      'date', 'time', 'datetime', 'timestamp',
      'year', 'datetime2', 'smalldatetime'
    ]
    return dateTimeTypes.some(type => dataType.toLowerCase().includes(type))
  }

  /**
   * 解析日期时间字符串
   */
  const parseDateTime = (dateTimeStr) => {
    const formats = [
      'YYYY-MM-DD',
      'YYYY-MM-DD HH:mm:ss',
      'YYYY/MM/DD',
      'YYYY/MM/DD HH:mm:ss',
      'MM/DD/YYYY',
      'MM/DD/YYYY HH:mm:ss'
    ]

    for (const format of formats) {
      const date = new Date(dateTimeStr)
      if (!isNaN(date.getTime())) {
        return date
      }
    }

    return null
  }

  /**
   * 生成表头注释
   */
  const generateHeaderComment = (tableName, fieldMappings, dbType, operation = 'INSERT') => {
    const timestamp = new Date().toLocaleString('zh-CN')
    const mappedCount = fieldMappings.filter(m => m.excelHeader).length
    const totalCount = fieldMappings.length

    let comment = `-- ${operation}语句生成报告\n`
    comment += `-- 生成时间: ${timestamp}\n`
    comment += `-- 目标表: ${tableName}\n`
    comment += `-- 数据库类型: ${dbType.toUpperCase()}\n`
    comment += `-- 字段映射: ${mappedCount}/${totalCount}\n`
    comment += `-- 操作类型: ${operation}\n`
    comment += '--\n'

    // 添加字段映射详情
    comment += '-- 字段映射详情:\n'
    fieldMappings.forEach(mapping => {
      const status = mapping.excelHeader ? '✓' : '✗'
      const excelInfo = mapping.excelHeader ? ` -> "${mapping.excelHeader}"` : ''
      comment += `--   ${status} ${mapping.ddlField.name} (${mapping.ddlField.type})${excelInfo}\n`
    })

    return comment
  }

  /**
   * 高级SQL美化功能
   */
  const beautifySql = (sql, options = {}) => {
    const {
      indentSpaces = 4,
      formatStyle = 'expanded', // 'compact' or 'expanded'
      keywordCase = 'upper',     // 'upper' or 'preserve'
      maxLineLength = 80,
      alignValues = true
    } = options

    let beautified = sql

    // 1. 统一SQL关键字大小写
    if (keywordCase === 'upper') {
      beautified = beautified.replace(/\b(SELECT|INSERT|INTO|VALUES|UPDATE|SET|FROM|WHERE|AND|OR|NOT|NULL|TRUE|FALSE|AS|ON|JOIN|LEFT|RIGHT|INNER|OUTER|GROUP BY|ORDER BY|HAVING|LIMIT|OFFSET|DISTINCT)\b/gi, match => match.toUpperCase())
    }

    // 2. 智能缩进和换行
    beautified = applySmartFormatting(beautified, indentSpaces, formatStyle, maxLineLength)

    // 3. 垂直对齐VALUES子句
    if (alignValues && beautified.toUpperCase().includes('VALUES')) {
      beautified = alignValuesClause(beautified, indentSpaces)
    }

    return beautified
  }

  /**
   * 应用智能格式化
   */
  const applySmartFormatting = (sql, indentSpaces, formatStyle, maxLineLength) => {
    const indent = ' '.repeat(indentSpaces)
    let lines = sql.split('\n')
    let result = []
    let currentIndent = 0

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i].trim()
      if (!line) continue

      // 处理缩进级别
      if (line.endsWith('(')) {
        result.push(' '.repeat(currentIndent) + line)
        currentIndent += indentSpaces
      } else if (line.startsWith(')')) {
        currentIndent = Math.max(0, currentIndent - indentSpaces)
        result.push(' '.repeat(currentIndent) + line)
      } else {
        // 处理长行拆分
        if (line.length > maxLineLength && formatStyle === 'expanded') {
          const splitLine = splitLongLine(line, maxLineLength, indent + ' '.repeat(currentIndent))
          result.push(...splitLine)
        } else {
          result.push(' '.repeat(currentIndent) + line)
        }
      }
    }

    return result.join('\n')
  }

  /**
   * 拆分长行
   */
  const splitLongLine = (line, maxLineLength, indent) => {
    const parts = []
    let currentPart = ''
    const tokens = line.split(',')

    tokens.forEach((token, index) => {
      const trimmedToken = token.trim()
      if (currentPart.length + trimmedToken.length + 2 > maxLineLength && currentPart) {
        parts.push(indent + currentPart + (index < tokens.length - 1 ? ',' : ''))
        currentPart = trimmedToken
      } else {
        if (currentPart) {
          currentPart += ', ' + trimmedToken
        } else {
          currentPart = trimmedToken
        }
      }
    })

    if (currentPart) {
      parts.push(indent + currentPart)
    }

    return parts
  }

  /**
   * 垂直对齐VALUES子句
   */
  const alignValuesClause = (sql, indentSpaces) => {
    const lines = sql.split('\n')
    const valuesIndex = lines.findIndex(line => line.trim().toUpperCase().startsWith('VALUES'))

    if (valuesIndex === -1) return sql

    // 找到VALUES子句开始和结束位置
    let valuesStart = valuesIndex + 1
    let valuesEnd = valuesIndex + 1

    // 查找VALUES子句的结束位置，确保括号正确闭合
    let openParens = 0
    for (let i = valuesStart; i < lines.length; i++) {
      const line = lines[i].trim()
      openParens += (line.match(/\\(/g) || []).length
      openParens -= (line.match(/\\)/g) || []).length

      if (openParens === 0 && (line.endsWith(';') || i === lines.length - 1)) {
        valuesEnd = i + 1
        break
      }
    }

    // 提取VALUES行数据
    const valuesLines = lines.slice(valuesStart, valuesEnd)
    const alignedValues = alignValuesRows(valuesLines, indentSpaces)

    // 重建SQL
    const result = [...lines.slice(0, valuesStart), ...alignedValues, ...lines.slice(valuesEnd)]
    return result.join('\n')
  }

  /**
   * 对齐VALUES行
   */
  const alignValuesRows = (valuesLines, indentSpaces) => {
    if (valuesLines.length <= 1) return valuesLines

    // 分析每行的字段位置
    const fieldPositions = []
    valuesLines.forEach(line => {
      const fields = line.trim().match(/\([^)]+\)/g)
      if (fields) {
        const fieldValues = fields[0].slice(1, -1).split(',').map(f => f.trim())
        fieldValues.forEach((value, index) => {
          if (!fieldPositions[index]) fieldPositions[index] = []
          fieldPositions[index].push(value.length)
        })
      }
    })

    // 计算每列的最大宽度
    const maxWidths = fieldPositions.map(positions => Math.max(...positions))

    // 重新格式化每行
    return valuesLines.map(line => {
      const fields = line.trim().match(/\([^)]+\)/g)
      if (!fields) return line

      const fieldValues = fields[0].slice(1, -1).split(',').map(f => f.trim())
      const alignedFields = fieldValues.map((value, index) => {
        return value.padEnd(maxWidths[index])
      })

      // 确保每行正确闭合，并处理逗号分隔
      const formattedLine = ' '.repeat(indentSpaces) + '(' + alignedFields.join(', ') + ')'

      // 如果是最后一行，确保没有多余的逗号
      const isLastLine = valuesLines.indexOf(line) === valuesLines.length - 1
      return isLastLine ? formattedLine : formattedLine + ','
    })
  }

  /**
   * 格式化SQL语句
   */
  const formatSql = (sql, format, beautifyOptions = {}) => {
    if (format === 'minified') {
      return sql.replace(/\s+/g, ' ').trim()
    }

    // 应用高级美化功能
    if (format === 'formatted') {
      return beautifySql(sql, beautifyOptions)
    }

    // 基础格式化（兼容旧版本）
    return sql
      .replace(/\n\s*\n/g, '\n\n') // 压缩空行
      .replace(/\s+/g, ' ')        // 压缩连续空格
      .replace(/;\s*/g, ';\n\n')   // 语句间添加空行
  }

  /**
   * 预览SQL语句（语法高亮前的处理）
   */
  const previewSql = (sql) => {
    return {
      raw: sql,
      formatted: formatSql(sql, 'formatted'),
      minified: formatSql(sql, 'minified'),
      lineCount: sql.split('\n').length,
      charCount: sql.length
    }
  }

  /**
   * 验证SQL语法（基础验证）
   */
  const validateSqlSyntax = (sql) => {
    const errors = []

    // 检查基本语法错误
    if (!sql.trim()) {
      errors.push('SQL语句为空')
      return { isValid: false, errors }
    }

    // 检查分号结尾
    const lines = sql.split('\n')
    let statementCount = 0
    let currentStatement = ''

    lines.forEach((line, lineIndex) => {
      const trimmedLine = line.trim()
      currentStatement += trimmedLine + ' '

      // 检查是否以分号结尾
      if (trimmedLine.endsWith(';')) {
        statementCount++
        const stmt = currentStatement.trim()

        // 检查INSERT语句格式
        if (stmt.toUpperCase().includes('INSERT')) {
          if (!stmt.toUpperCase().includes('VALUES')) {
            errors.push(`第${statementCount}条INSERT语句（第${lineIndex + 1}行）缺少VALUES关键字`)
          }
        }

        // 检查UPDATE语句格式
        if (stmt.toUpperCase().includes('UPDATE')) {
          if (!stmt.toUpperCase().includes('SET')) {
            errors.push(`第${statementCount}条UPDATE语句（第${lineIndex + 1}行）缺少SET关键字`)
          }
          if (!stmt.toUpperCase().includes('WHERE')) {
            errors.push(`第${statementCount}条UPDATE语句（第${lineIndex + 1}行）缺少WHERE条件`)
          }
        }

        currentStatement = ''
      }
    })

    // 检查是否有未以分号结尾的语句
    if (currentStatement.trim()) {
      errors.push(`存在未以分号结尾的语句（共${statementCount + 1}条语句，第${statementCount + 1}条未正确结尾）`)
    }

    // 检查VALUES子句括号闭合
    const valuesMatches = sql.match(/VALUES\s*\([^)]+/g)
    if (valuesMatches) {
      valuesMatches.forEach((match, index) => {
        const openParens = (match.match(/\\(/g) || []).length
        const closeParens = (match.match(/\\)/g) || []).length
        if (openParens > closeParens) {
          errors.push(`第${index + 1}个VALUES子句括号未正确闭合`)
        }
      })
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  /**
   * 设置数据库类型
   */
  const setDatabaseType = (type) => {
    const supportedTypes = ['mysql', 'postgresql', 'sqlserver']
    if (supportedTypes.includes(type)) {
      databaseType.value = type
    } else {
      throw new Error(`不支持的数据库类型: ${type}`)
    }
  }

  /**
   * 设置SQL格式
   */
  const setSqlFormat = (format) => {
    const supportedFormats = ['formatted', 'minified']
    if (supportedFormats.includes(format)) {
      sqlFormat.value = format
    } else {
      throw new Error(`不支持的SQL格式: ${format}`)
    }
  }

  /**
   * 设置批量大小
   */
  const setBatchSize = (size) => {
    if (size > 0 && size <= 1000) {
      batchSize.value = size
    } else {
      throw new Error('批量大小必须在1-1000之间')
    }
  }

  /**
   * 设置SQL美化选项
   */
  const setBeautifyOptions = (options) => {
    if (typeof options !== 'object') {
      throw new Error('美化选项必须是对象')
    }

    // 验证并更新选项
    if (options.indentSpaces !== undefined) {
      if (options.indentSpaces >= 1 && options.indentSpaces <= 8) {
        beautifyOptions.value.indentSpaces = options.indentSpaces
      } else {
        throw new Error('缩进空格数必须在1-8之间')
      }
    }

    if (options.formatStyle !== undefined) {
      if (['compact', 'expanded'].includes(options.formatStyle)) {
        beautifyOptions.value.formatStyle = options.formatStyle
      } else {
        throw new Error('格式化风格必须是 compact 或 expanded')
      }
    }

    if (options.keywordCase !== undefined) {
      if (['upper', 'preserve'].includes(options.keywordCase)) {
        beautifyOptions.value.keywordCase = options.keywordCase
      } else {
        throw new Error('关键字大小写必须是 upper 或 preserve')
      }
    }

    if (options.maxLineLength !== undefined) {
      if (options.maxLineLength >= 40 && options.maxLineLength <= 200) {
        beautifyOptions.value.maxLineLength = options.maxLineLength
      } else {
        throw new Error('最大行长度必须在40-200之间')
      }
    }

    if (options.alignValues !== undefined) {
      beautifyOptions.value.alignValues = Boolean(options.alignValues)
    }
  }

  /**
   * 重置美化选项为默认值
   */
  const resetBeautifyOptions = () => {
    beautifyOptions.value = {
      indentSpaces: 4,
      formatStyle: 'expanded',
      keywordCase: 'upper',
      maxLineLength: 80,
      alignValues: true
    }
  }

  return {
    databaseType: computed(() => databaseType.value),
    sqlFormat: computed(() => sqlFormat.value),
    batchSize: computed(() => batchSize.value),
    includeComments: computed(() => includeComments.value),
    beautifyOptions: computed(() => beautifyOptions.value),

    generateInsertSql,
    generateUpdateSql,
    previewSql,
    validateSqlSyntax,
    beautifySql,

    setDatabaseType,
    setSqlFormat,
    setBatchSize,
    setBeautifyOptions,
    resetBeautifyOptions
  }
}
