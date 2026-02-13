/**
 * SQL美化工具
 * 提供SQL语句格式化、缩进、关键字大小写转换等功能
 */

/**
 * SQL美化选项接口
 */
export interface SqlBeautifyOptions {
  indentSpaces: number
  formatStyle: 'compact' | 'expanded'
  keywordCase: 'upper' | 'preserve'
  maxLineLength: number
  alignValues: boolean
}

/**
 * SQL关键字列表
 */
const SQL_KEYWORDS = new Set([
  'SELECT',
  'FROM',
  'WHERE',
  'AND',
  'OR',
  'INSERT',
  'INTO',
  'VALUES',
  'UPDATE',
  'SET',
  'DELETE',
  'CREATE',
  'TABLE',
  'ALTER',
  'DROP',
  'INDEX',
  'JOIN',
  'LEFT',
  'RIGHT',
  'INNER',
  'OUTER',
  'ON',
  'AS',
  'ORDER',
  'BY',
  'GROUP',
  'HAVING',
  'LIMIT',
  'OFFSET',
  'DISTINCT',
  'NULL',
  'IS',
  'NOT',
  'BETWEEN',
  'IN',
  'LIKE',
  'EXISTS',
  'CASE',
  'WHEN',
  'THEN',
  'ELSE',
  'END',
  'UNION',
  'ALL',
  'PRIMARY',
  'KEY',
  'FOREIGN',
  'REFERENCES',
  'CONSTRAINT',
  'DEFAULT',
  'UNIQUE',
  'CHECK',
  'CASCADE',
  'ON',
  'OFF',
  'TRUE',
  'FALSE',
  'CAST',
  'CONVERT',
  'COALESCE',
  'NULLIF',
  'COUNT',
  'SUM',
  'AVG',
  'MIN',
  'MAX',
  'ROUND',
  'FLOOR',
  'CEIL',
  'CEILING',
  'ABS',
  'POWER',
  'SQRT',
  'CONCAT',
  'SUBSTRING',
  'LENGTH',
  'TRIM',
  'UPPER',
  'LOWER',
  'REPLACE',
  'DATE',
  'TIME',
  'DATETIME',
  'TIMESTAMP',
  'YEAR',
  'MONTH',
  'DAY',
  'HOUR',
  'MINUTE',
  'SECOND',
  'NOW',
  'CURDATE',
  'CURTIME',
])

/**
 * 检测词是否为SQL关键字
 * @param {string} word - 要检测的词
 * @returns {boolean} 是否为SQL关键字
 */
const isSqlKeyword = (word: string): boolean => {
  return SQL_KEYWORDS.has(word.toUpperCase())
}

/**
 * 将关键字转换为指定大小写
 * @param {string} word - 关键字
 * @param {string} caseType - 大小写类型：'upper' | 'preserve'
 * @returns {string} 转换后的关键字
 */
const formatKeyword = (word: string, caseType: 'upper' | 'preserve'): string => {
  if (caseType === 'upper') {
    return word.toUpperCase()
  }
  return word
}

/**
 * 缩进SQL语句
 * @param {string} sql - SQL语句
 * @param {number} spaces - 缩进空格数
 * @returns {string} 缩进后的SQL语句
 */
const indentSql = (sql: string, spaces: number): string => {
  const indent = ' '.repeat(spaces)
  return sql
    .split('\n')
    .map((line) => indent + line)
    .join('\n')
}

/**
 * 美化INSERT语句
 * @param {string} sql - INSERT语句
 * @param {SqlBeautifyOptions} options - 美化选项
 * @returns {string} 美化后的SQL语句
 */
const beautifyInsertSql = (sql: string, options: SqlBeautifyOptions): string => {
  const { formatStyle, indentSpaces, keywordCase, alignValues } = options

  if (formatStyle === 'compact') {
    return formatKeyword(sql, keywordCase)
  }

  let result = sql

  const insertRegex = /INSERT\s+INTO\s+(\w+)\s*\(([^)]+)\)\s*VALUES\s*/i
  const match = result.match(insertRegex)

  if (match) {
    const tableName = match[1]
    const columnsPart = match[2]

    const columns = columnsPart.split(',').map((col) => col.trim())

    let columnLine = `INSERT INTO ${tableName} (\n  ${columns.map((col) => formatKeyword(col, keywordCase)).join(',\n  ')}\n)`
    result = result.replace(insertRegex, columnLine + '\nVALUES')

    if (alignValues) {
      result = result.replace(/\(([^)]+)\)/g, (match) => {
        const values = match
          .slice(1, -1)
          .split(',')
          .map((v) => v.trim())
        const maxLength = Math.max(...values.map((v) => v.length))
        const alignedValues = values.map((v) => v + ' '.repeat(maxLength - v.length)).join(', ')
        return `(\n  ${alignedValues}\n)`
      })
    }
  }

  return result
}

/**
 * 美化UPDATE语句
 * @param {string} sql - UPDATE语句
 * @param {SqlBeautifyOptions} options - 美化选项
 * @returns {string} 美化后的SQL语句
 */
const beautifyUpdateSql = (sql: string, options: SqlBeautifyOptions): string => {
  const { formatStyle, keywordCase } = options

  if (formatStyle === 'compact') {
    return formatKeyword(sql, keywordCase)
  }

  let result = sql

  const updateRegex = /UPDATE\s+(\w+)\s+SET\s*/i
  if (updateRegex.test(result)) {
    result = result.replace(updateRegex, `UPDATE ${formatKeyword('$1', keywordCase)} SET\n  `)
  }

  result = result.replace(/(\w+)\s*=\s*([^,]+)(,?\s*)/gi, (match, col, val, suffix) => {
    return `${formatKeyword(col, keywordCase)} = ${val.trim()}${suffix}\n  `
  })

  return result.trimEnd()
}

/**
 * 格式化SQL语句
 * @param {string} sql - 原始SQL语句
 * @param {SqlBeautifyOptions} options - 格式化选项
 * @returns {string} 格式化后的SQL语句
 */
export const formatSql = (sql: string, options: Partial<SqlBeautifyOptions> = {}): string => {
  const defaultOptions: SqlBeautifyOptions = {
    indentSpaces: 4,
    formatStyle: 'expanded',
    keywordCase: 'upper',
    maxLineLength: 80,
    alignValues: true,
  }

  const finalOptions = { ...defaultOptions, ...options }

  let result = sql.trim()

  if (result.toUpperCase().startsWith('INSERT')) {
    result = beautifyInsertSql(result, finalOptions)
  } else if (result.toUpperCase().startsWith('UPDATE')) {
    result = beautifyUpdateSql(result, finalOptions)
  }

  const indentSpaces = finalOptions.indentSpaces
  const lines = result.split('\n')
  const indentedLines = lines.map((line, index) => {
    if (index === 0) return line
    const trimmedLine = line.trim()
    if (!trimmedLine) return ''
    return ' '.repeat(indentSpaces) + trimmedLine
  })

  return indentedLines.join('\n').trim()
}

/**
 * 压缩SQL语句（移除多余空白）
 * @param {string} sql - 原始SQL语句
 * @returns {string} 压缩后的SQL语句
 */
export const compressSql = (sql: string): string => {
  return sql
    .replace(/\s+/g, ' ')
    .replace(/\s*([,()=+])\s*/g, '$1')
    .replace(/\s*([<>]=?)\s*/g, ' $1 ')
    .trim()
}

/**
 * 获取默认美化选项
 * @returns {SqlBeautifyOptions} 默认美化选项
 */
export const getDefaultBeautifyOptions = (): SqlBeautifyOptions => {
  return {
    indentSpaces: 4,
    formatStyle: 'expanded',
    keywordCase: 'upper',
    maxLineLength: 80,
    alignValues: true,
  }
}

/**
 * 验证美化选项
 * @param {Partial<SqlBeautifyOptions>} options - 美化选项
 * @returns {{ valid: boolean; errors: string[] }} 验证结果
 */
export const validateBeautifyOptions = (
  options: Partial<SqlBeautifyOptions>,
): { valid: boolean; errors: string[] } => {
  const errors: string[] = []

  if (options.indentSpaces !== undefined) {
    if (options.indentSpaces < 1 || options.indentSpaces > 16) {
      errors.push('缩进空格数必须在1-16之间')
    }
  }

  if (options.formatStyle !== undefined) {
    if (!['compact', 'expanded'].includes(options.formatStyle)) {
      errors.push('格式化风格只能是 compact 或 expanded')
    }
  }

  if (options.keywordCase !== undefined) {
    if (!['upper', 'preserve'].includes(options.keywordCase)) {
      errors.push('关键字大小写只能是 upper 或 preserve')
    }
  }

  if (options.maxLineLength !== undefined) {
    if (options.maxLineLength < 40 || options.maxLineLength > 500) {
      errors.push('最大行长度必须在40-500之间')
    }
  }

  return { valid: errors.length === 0, errors }
}
