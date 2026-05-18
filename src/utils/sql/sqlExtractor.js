/**
 * SQL提取引擎 - 从混合文本中识别并提取SQL语句
 * 支持SQL语法验证和结构化解析
 */

/**
 * SQL关键字正则模式（不区分大小写）
 */
const SQL_KEYWORD_PATTERN = /\b(SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER|DROP|TRUNCATE|BEGIN|COMMIT|ROLLBACK|GRANT|REVOKE)\b/i

/**
 * SQL边界识别正则
 * 匹配完整的SQL语句（支持多行、分号分隔、GO语句）
 */
const SQL_STATEMENT_PATTERN = /(?:(?:SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER|DROP|TRUNCATE)\b[^;]*?(?:;|$))|(?:--\s*GO\s*$)/gims

/**
 * 注释移除正则
 */
const SINGLE_LINE_COMMENT = /--[^\n]*/g
const MULTI_LINE_COMMENT = /\/\*[\s\S]*?\*\//g

/**
 * 字符串内容匹配（用于保护字符串内的伪SQL）
 */
const STRING_PATTERN = /'(?:[^'\\]*(?:\\.[^'\\]*)*)'/g

/**
 * 从混合文本中提取SQL语句
 * @param {string} text - 输入文本
 * @param {Object} options - 提取选项
 * @param {boolean} options.ignoreComments - 是否忽略注释（默认true）
 * @param {boolean} options.preserveStrings - 是否保护字符串内容（默认true）
 * @param {boolean} options.trimWhitespace - 是否修剪空白字符（默认true）
 * @returns {Array<{sql: string, type: string, lineStart: number, lineEnd: number, raw: string}>}
 */
export function extractSqlStatements(text, options = {}) {
  const {
    ignoreComments = true,
    preserveStrings = true,
    trimWhitespace = true
  } = options

  if (!text || typeof text !== 'string') {
    return []
  }

  const results = []
  let workingText = text

  if (ignoreComments) {
    workingText = workingText
      .replace(MULTI_LINE_COMMENT, ' ')
      .replace(SINGLE_LINE_COMMENT, ' ')
  }

  if (preserveStrings) {
    const stringPlaceholders = []
    workingText = workingText.replace(STRING_PATTERN, (match) => {
      const index = stringPlaceholders.length
      stringPlaceholders.push(match)
      return `__STRING_PLACEHOLDER_${index}__`
    })
  }

  const lines = workingText.split('\n')
  let currentStatement = []
  let statementStartLine = 0
  let inStatement = false
  let parenDepth = 0

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmedLine = trimWhitespace ? line.trim() : line

    if (!inStatement) {
      if (SQL_KEYWORD_PATTERN.test(trimmedLine) && trimmedLine.length > 0) {
        inStatement = true
        statementStartLine = i + 1
        currentStatement = [line]
        parenDepth = countParentheses(line)
      }
    } else {
      currentStatement.push(line)
      parenDepth += countParentheses(line)

      const isTerminated = trimmedLine.endsWith(';') ||
                           /^\s*GO\s*$/i.test(trimmedLine) ||
                           (parenDepth === 0 && trimmedLine === '')

      if (isTerminated && parenDepth === 0) {
        let sqlText = currentStatement.join('\n')

        if (trimWhitespace) {
          sqlText = sqlText.replace(/\s+/g, ' ').trim()
        }

        if (sqlText.length > 0) {
          const sqlType = detectSqlType(sqlText)
          results.push({
            sql: cleanSqlStatement(sqlText),
            type: sqlType,
            lineStart: statementStartLine,
            lineEnd: i + 1,
            raw: currentStatement.join('\n')
          })
        }

        inStatement = false
        currentStatement = []
        parenDepth = 0
      }
    }
  }

  if (inStatement && currentStatement.length > 0) {
    let sqlText = currentStatement.join('\n')
    if (trimWhitespace) {
      sqlText = sqlText.replace(/\s+/g, ' ').trim()
    }

    if (sqlText.length > 0) {
      const sqlType = detectSqlType(sqlText)
      results.push({
        sql: cleanSqlStatement(sqlText),
        type: sqlType,
        lineStart: statementStartLine,
        lineEnd: lines.length,
        raw: currentStatement.join('\n')
      })
    }
  }

  return results
}

/**
 * 验证SQL语法
 * @param {string} sql - SQL语句
 * @returns {{valid: boolean, error?: string, ast?: Object}}
 */
export async function validateSql(sql) {
  try {
    const { default: Parser } = await import('node-sql-parser')
    const parser = new Parser()

    const ast = parser.astify(sql)

    return {
      valid: true,
      ast
    }
  } catch (error) {
    return {
      valid: false,
      error: error.message || 'SQL语法错误'
    }
  }
}

/**
 * 解析SQL结构化信息
 * @param {string} sql - SQL语句
 * @returns {{type: string, tables: string[], columns: string[], conditions: string[], hasSubquery: boolean}}
 */
export function parseSqlStructure(sql) {
  const type = detectSqlType(sql)
  const tables = extractTableNames(sql)
  const columns = extractColumnNames(sql)
  const conditions = extractWhereConditions(sql)
  const hasSubquery = /\bSELECT\b.*\bFROM\b.*\bWHERE\b/si.test(sql)

  return {
    type,
    tables,
    columns,
    conditions,
    hasSubquery
  }
}

/**
 * 检测SQL类型
 * @param {string} sql - SQL语句
 * @returns {string} - SQL类型（select/insert/update/delete/ddl/tcl/dcl）
 */
function detectSqlType(sql) {
  const upperSql = sql.trim().toUpperCase()

  if (upperSql.startsWith('SELECT')) return 'select'
  if (upperSql.startsWith('INSERT')) return 'insert'
  if (upperSql.startsWith('UPDATE')) return 'update'
  if (upperSql.startsWith('DELETE')) return 'delete'

  const ddlKeywords = ['CREATE', 'ALTER', 'DROP', 'TRUNCATE']
  for (const keyword of ddlKeywords) {
    if (upperSql.startsWith(keyword)) return 'ddl'
  }

  const tclKeywords = ['BEGIN', 'COMMIT', 'ROLLBACK']
  for (const keyword of tclKeywords) {
    if (upperSql.startsWith(keyword)) return 'tcl'
  }

  const dclKeywords = ['GRANT', 'REVOKE']
  for (const keyword of dclKeywords) {
    if (upperSql.startsWith(keyword)) return 'dcl'
  }

  return 'unknown'
}

/**
 * 提取表名列表
 * @param {string} sql - SQL语句
 * @returns {string[]}
 */
function extractTableNames(sql) {
  const tables = []

  const fromPattern = /\bFROM\s+([^\s,;]+)(?:\s+[^\s,;]+)*/gi
  const joinPattern = /\bJOIN\s+([^\s,;]+)(?:\s+[^\s,;]+)*/gi
  const intoPattern = /\bINTO\s+([^\s,;]+)/gi
  const updatePattern = /\bUPDATE\s+([^\s,;]+)/gi

  let match

  while ((match = fromPattern.exec(sql)) !== null) {
    const table = match[1].replace(/[`'"]/g, '')
    if (!tables.includes(table)) tables.push(table)
  }

  while ((match = joinPattern.exec(sql)) !== null) {
    const table = match[1].replace(/[`'"]/g, '')
    if (!tables.includes(table)) tables.push(table)
  }

  while ((match = intoPattern.exec(sql)) !== null) {
    const table = match[1].replace(/[`'"]/g, '')
    if (!tables.includes(table)) tables.push(table)
  }

  while ((match = updatePattern.exec(sql)) !== null) {
    const table = match[1].replace(/[`'"]/g, '')
    if (!tables.includes(table)) tables.push(table)
  }

  return tables
}

/**
 * 提取字段名列表
 * @param {string} sql - SQL语句
 * @returns {string[]}
 */
function extractColumnNames(sql) {
  const columns = []

  const selectPattern = /\bSELECT\s+(.+?)\s+FROM\b/is
  const selectMatch = selectPattern.exec(sql)

  if (selectMatch) {
    const selectClause = selectMatch[1]
    const columnList = selectClause.split(',')

    columnList.forEach(col => {
      const trimmedCol = col.trim()
      if (trimmedCol !== '*') {
        const columnName = trimmedCol.split(/\s+[/as]/i)[0].trim().replace(/[`'"]/g, '')
        if (columnName && !columns.includes(columnName)) {
          columns.push(columnName)
        }
      }
    })
  }

  return columns
}

/**
 * 提取WHERE条件中的字段
 * @param {string} sql - SQL语句
 * @returns {string[]}
 */
function extractWhereConditions(sql) {
  const conditions = []

  const wherePattern = /\bWHERE\s+(.+?)(?:\s+GROUP\s+BY|\s+ORDER\s+BY|\s+LIMIT|\s+HAVING|\s*$)/is
  const whereMatch = wherePattern.exec(sql)

  if (whereMatch) {
    const whereClause = whereMatch[1]
    const conditionParts = whereClause.split(/\bAND\b|\bOR\b/i)

    conditionParts.forEach(part => {
      const fieldMatch = part.match(/([^\s=<>!]+)\s*[=<>!]+\s*/)
      if (fieldMatch) {
        const field = fieldMatch[1].trim().replace(/[`'"]/g, '')
        if (field && !conditions.includes(field)) {
          conditions.push(field)
        }
      }
    })
  }

  return conditions
}

/**
 * 计算括号深度
 * @param {string} text - 文本行
 * @returns {number} - 括号深度变化
 */
function countParentheses(text) {
  let depth = 0
  let inString = false
  let escapeNext = false

  for (const char of text) {
    if (escapeNext) {
      escapeNext = false
      continue
    }

    if (char === '\\') {
      escapeNext = true
      continue
    }

    if (char === "'") {
      inString = !inString
      continue
    }

    if (!inString) {
      if (char === '(') depth++
      else if (char === ')') depth--
    }
  }

  return depth
}

/**
 * 清理SQL语句
 * @param {string} sql - 原始SQL
 * @returns {string} - 清理后的SQL
 */
function cleanSqlStatement(sql) {
  return sql
    .replace(/\s+/g, ' ')
    .replace(/;\s*$/, '')
    .trim()
}

export default {
  extractSqlStatements,
  validateSql,
  parseSqlStructure
}
