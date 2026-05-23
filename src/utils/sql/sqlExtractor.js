/**
 * SQL提取引擎 - 从混合文本中识别并提取SQL语句
 * 支持SQL语法验证和结构化解析
 */

/**
 * SQL关键字正则模式（不区分大小写）
 * 覆盖：DML、DDL、DCL、TCL、CTE、MERGE、存储过程等
 */
const SQL_KEYWORD_PATTERN = /\b(SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER|DROP|TRUNCATE|BEGIN|COMMIT|ROLLBACK|GRANT|REVOKE|WITH|MERGE|CALL|DECLARE|EXEC|EXECUTE)\b/i

/**
 * SQL语句起始正则（用于快速定位SQL片段）
 */
const SQL_START_PATTERN = /\b(?:SELECT|INSERT\s+INTO|UPDATE|DELETE\s+FROM|CREATE\s+(?:TABLE|INDEX|VIEW|PROCEDURE|FUNCTION|TRIGGER|DATABASE|SCHEMA)|ALTER\s+(?:TABLE|INDEX|VIEW|PROCEDURE|FUNCTION|TRIGGER|DATABASE)|DROP\s+(?:TABLE|INDEX|VIEW|PROCEDURE|FUNCTION|TRIGGER|DATABASE)|TRUNCATE\s+TABLE|BEGIN|(?:DECLARE\s*.*?\s*)?BEGIN|WITH\s+\w+\s+AS\s*\(|MERGE\s+INTO|CALL\s+|EXEC(?:UTE)?\s+)\b/i

/**
 * 日志/时间戳前缀正则（用于清理非SQL内容）
 */
const LOG_PREFIX_PATTERN = /^\s*(?:\[\d{4}-\d{2}-\d{2}[^\]]*\]|\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?|\w{3}\s+\d{1,2}\s+\d{2}:\d{2}:\d{2})\s*[-:]\s*/gm

/**
 * 代码块标记正则
 */
const CODE_BLOCK_PATTERN = /```(?:sql|SQL|mysql|postgresql|plsql|tsql)\s*\n([\s\S]*?)```/g

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
 * 从混合文本中智能提取SQL语句
 * 支持多种场景：日志文件、代码块、Markdown、纯文本等
 * 
 * @param {string} text - 输入文本（可能包含非SQL内容）
 * @param {Object} options - 提取选项
 * @param {boolean} options.ignoreComments - 是否忽略注释（默认true）
 * @param {boolean} options.preserveStrings - 是否保护字符串内容（默认true）
 * @param {boolean} options.trimWhitespace - 是否修剪空白字符（默认true）
 * @param {boolean} options.removeLogPrefix - 是否移除日志前缀（默认true）
 * @param {boolean} options.extractCodeBlocks - 是否从代码块中提取（默认true）
 * @returns {Array<{sql: string, type: string, lineStart: number, lineEnd: number, raw: string}>}
 */
export function extractSqlStatements(text, options = {}) {
  const {
    ignoreComments = true,
    preserveStrings = true,
    trimWhitespace = true,
    removeLogPrefix = true,
    extractCodeBlocks = true,
  } = options

  if (!text || typeof text !== 'string') {
    return []
  }

  let workingText = text

  // 1. 智能预处理：移除日志前缀
  if (removeLogPrefix) {
    workingText = workingText.replace(LOG_PREFIX_PATTERN, '')
  }

  // 2. 从代码块中提取SQL（优先级高，因为格式最清晰）
  if (extractCodeBlocks) {
    const codeBlockResults = extractFromCodeBlocks(workingText)
    if (codeBlockResults.length > 0) {
      return codeBlockResults
    }
  }

  // 3. 标准SQL提取流程
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

  // 使用改进的分割算法
  const statements = splitByDelimiter(workingText)
  const results = []

  for (const rawStatement of statements) {
    const sqlText = trimWhitespace ? rawStatement.replace(/\s+/g, ' ').trim() : rawStatement

    if (sqlText.length === 0) continue

    // 验证是否是有效的SQL语句
    if (!isValidSqlStatement(sqlText)) continue

    const sqlType = detectSqlType(sqlText)
    results.push({
      sql: cleanSqlStatement(sqlText),
      type: sqlType,
      lineStart: 0,
      lineEnd: 0,
      raw: rawStatement
    })
  }

  return results
}

/**
 * 从Markdown代码块中提取SQL语句
 * @param {string} text - 包含代码块的文本
 * @returns {Array} - 提取的SQL语句数组
 */
function extractFromCodeBlocks(text) {
  const results = []
  const regex = /```(?:sql|SQL|mysql|postgresql|plsql|tsql|oracle|mariadb)\s*\n([\s\S]*?)```/g
  let match

  while ((match = regex.exec(text)) !== null) {
    const sqlContent = match[1].trim()
    if (sqlContent.length > 0) {
      // 分割代码块内的多条语句
      const statements = splitByDelimiter(sqlContent)
      for (const stmt of statements) {
        const cleaned = stmt.replace(/\s+/g, ' ').trim()
        if (cleaned.length > 0 && isValidSqlStatement(cleaned)) {
          results.push({
            sql: cleanSqlStatement(cleaned),
            type: detectSqlType(cleaned),
            lineStart: 0,
            lineEnd: 0,
            raw: stmt
          })
        }
      }
    }
  }

  return results
}

/**
 * 验证是否为有效的SQL语句
 * 增强版：支持更多SQL语法模式
 * @param {string} sql - 待验证的SQL文本
 * @returns {boolean}
 */
function isValidSqlStatement(sql) {
  const trimmed = sql.trim()
  
  // 必须以SQL关键字开头
  if (!SQL_START_PATTERN.test(trimmed)) {
    return false
  }
  
  // 重置正则状态
  SQL_START_PATTERN.lastIndex = 0
  
  // 最小长度检查（避免误匹配短字符串）
  if (trimmed.length < 6) {
    return false
  }
  
  return true
}

/**
 * 智能分割SQL语句（考虑括号平衡和字符串）
 * @param {string} text - 输入文本
 * @returns {string[]} - 分割后的语句数组
 */
function splitByDelimiter(text) {
  const statements = []
  let current = []
  let parenDepth = 0
  let inString = false
  let escapeNext = false

  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    const prevChar = i > 0 ? text[i - 1] : ''

    if (escapeNext) {
      current.push(char)
      escapeNext = false
      continue
    }

    if (char === '\\') {
      current.push(char)
      escapeNext = true
      continue
    }

    if (char === "'") {
      inString = !inString
      current.push(char)
      continue
    }

    if (inString) {
      current.push(char)
      continue
    }

    if (char === '(') {
      parenDepth++
      current.push(char)
      continue
    }

    if (char === ')') {
      parenDepth--
      current.push(char)
      continue
    }

    // 检测分号分隔符（仅在括号平衡时）
    if (char === ';' && parenDepth === 0) {
      const statement = current.join('').trim()
      if (statement.length > 0) {
        statements.push(statement)
      }
      current = []
      continue
    }

    // 检测GO语句（T-SQL风格）
    if (char === '\n' || char === '\r') {
      const lineSoFar = current.join('').trim()
      if (/^\s*GO\s*$/i.test(lineSoFar)) {
        if (lineSoFar.length > 0) {
          statements.push(lineSoFar)
        }
        current = []
        continue
      }
    }

    current.push(char)
  }

  // 处理末尾剩余内容
  const remaining = current.join('').trim()
  if (remaining.length > 0) {
    statements.push(remaining)
  }

  return statements
}

/**
 * 验证SQL语法
 * @param {string} sql - SQL语句
 * @param {string} [database='mysql'] - 数据库类型（mysql/postgresql/mssql/oracle）
 * @returns {{valid: boolean, error?: string, ast?: Object}}
 */
export async function validateSql(sql, database = 'mysql') {
  // 输入验证
  if (!sql || typeof sql !== 'string' || sql.trim().length === 0) {
    return {
      valid: false,
      error: 'SQL语句不能为空'
    }
  }

  try {
    const { Parser } = await import('node-sql-parser')
    const parser = new Parser()

    // node-sql-parser v5.x 需要指定数据库类型
    const ast = parser.astify(sql, { database })

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

  // 增强的子查询检测：支持 FROM/WHERE/SELECT 子句中的子查询
  const hasSubquery =
    /\bFROM\s*\(/i.test(sql) ||           // FROM (SELECT ...)
    /\bWHERE\s+.*\bIN\s*\(/i.test(sql) || // WHERE ... IN (SELECT ...)
    /\bEXISTS\s*\(/i.test(sql) ||         // EXISTS (SELECT ...)
    /(?:\bSELECT\b.*\bFROM\b).*\(.*\bSELECT\b/i.test(sql) || // SELECT...FROM...(SELECT...)
    /\(\s*SELECT\b/i.test(sql)            // (SELECT ...) 任意位置

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
 * 增强版：支持 CTE、MERGE、存储过程等
 * @param {string} sql - SQL语句
 * @returns {string} - SQL类型（select/insert/update/delete/ddl/tcl/dcl/merge/cte/procedure）
 */
function detectSqlType(sql) {
  const upperSql = sql.trim().toUpperCase()

  // CTE (WITH ... AS) - 必须在 SELECT 之前检测
  if (/^WITH\s+(?:RECURSIVE\s+)?\w+\s+AS\s*\(/i.test(sql)) return 'cte'
  
  // MERGE语句
  if (/^MERGE\s+INTO/i.test(sql)) return 'merge'

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

  // 存储过程/函数调用
  if (/^(?:CALL|EXEC|EXECUTE)\s+/i.test(sql)) return 'procedure'

  // DECLARE块（PL/SQL）
  if (/^DECLARE\b/i.test(sql)) return 'procedure'

  return 'unknown'
}

/**
 * 提取表名列表
 * @param {string} sql - SQL语句
 * @returns {string[]}
 */
function extractTableNames(sql) {
  const tables = []

  // FROM 子句（支持别名：FROM table_name alias 或 FROM table_name AS alias）
  const fromPattern = /\bFROM\s+([a-zA-Z_][a-zA-Z0-9_]*)/gi
  // JOIN 子句（支持所有JOIN类型和别名）
  const joinPattern = /\b(?:INNER\s+|LEFT\s+(?:OUTER\s+)?|RIGHT\s+(?:OUTER\s+)?|FULL\s+(?:OUTER\s+)?|CROSS\s+|NATURAL\s+)?JOIN\s+([a-zA-Z_][a-zA-Z0-9_]*)/gi
  // INTO 子句
  const intoPattern = /\bINTO\s+([a-zA-Z_][a-zA-Z0-9_]*)/gi
  // UPDATE 子句
  const updatePattern = /\bUPDATE\s+([a-zA-Z_][a-zA-Z0-9_]*)/gi

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
