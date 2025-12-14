/**
 * DDL语句类型解析器
 * 支持解析多种DDL语句类型：CREATE TABLE、ALTER TABLE、DROP TABLE、TRUNCATE TABLE等
 */

/**
 * DDL语句类型枚举
 */
export const DdlStatementType = {
  CREATE_TABLE: 'CREATE_TABLE',
  ALTER_TABLE: 'ALTER_TABLE',
  DROP_TABLE: 'DROP_TABLE',
  TRUNCATE_TABLE: 'TRUNCATE_TABLE',
  CREATE_INDEX: 'CREATE_INDEX',
  DROP_INDEX: 'DROP_INDEX',
  CREATE_VIEW: 'CREATE_VIEW',
  DROP_VIEW: 'DROP_VIEW',
  UNKNOWN: 'UNKNOWN'
}

/**
 * DDL语句解析结果
 */
export class DdlParseResult {
  constructor(type, tableName, operation, details = {}) {
    this.type = type
    this.tableName = tableName
    this.operation = operation
    this.details = details
    this.databaseType = 'unknown'
    this.originalStatement = ''
  }
}

/**
 * DDL类型解析器
 */
export class DdlTypeParser {
  constructor() {
    this.statementPatterns = {
      // CREATE TABLE 模式
      [DdlStatementType.CREATE_TABLE]: [
        /^\s*CREATE\s+(?:TEMPORARY\s+)?TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([\w\."`\[\]]+)/i,
        /^\s*CREATE\s+GLOBAL\s+TEMPORARY\s+TABLE\s+([\w\."`\[\]]+)/i
      ],
      
      // ALTER TABLE 模式
      [DdlStatementType.ALTER_TABLE]: [
        /^\s*ALTER\s+TABLE\s+([\w\."`\[\]]+)/i
      ],
      
      // DROP TABLE 模式
      [DdlStatementType.DROP_TABLE]: [
        /^\s*DROP\s+TABLE\s+(?:IF\s+EXISTS\s+)?([\w\."`\[\]]+)/i
      ],
      
      // TRUNCATE TABLE 模式
      [DdlStatementType.TRUNCATE_TABLE]: [
        /^\s*TRUNCATE\s+(?:TABLE\s+)?([\w\."`\[\]]+)/i
      ],
      
      // CREATE INDEX 模式
      [DdlStatementType.CREATE_INDEX]: [
        /^\s*CREATE\s+(?:UNIQUE\s+)?INDEX\s+(?:IF\s+NOT\s+EXISTS\s+)?([\w\."`\[\]]+)/i
      ],
      
      // DROP INDEX 模式
      [DdlStatementType.DROP_INDEX]: [
        /^\s*DROP\s+INDEX\s+(?:IF\s+EXISTS\s+)?([\w\."`\[\]]+)/i
      ],
      
      // CREATE VIEW 模式
      [DdlStatementType.CREATE_VIEW]: [
        /^\s*CREATE\s+(?:OR\s+REPLACE\s+)?(?:MATERIALIZED\s+)?VIEW\s+(?:IF\s+NOT\s+EXISTS\s+)?([\w\."`\[\]]+)/i
      ],
      
      // DROP VIEW 模式
      [DdlStatementType.DROP_VIEW]: [
        /^\s*DROP\s+(?:MATERIALIZED\s+)?VIEW\s+(?:IF\s+EXISTS\s+)?([\w\."`\[\]]+)/i
      ]
    }
  }

  /**
   * 检测DDL语句类型
   */
  detectDdlType(ddlStatement) {
    if (!ddlStatement || typeof ddlStatement !== 'string') {
      return DdlStatementType.UNKNOWN
    }

    // 标准化语句（移除多余空格和换行符）
    const normalizedStatement = ddlStatement
      .replace(/\r\n|\r|\n/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()

    // 检查每种语句类型
    for (const [type, patterns] of Object.entries(this.statementPatterns)) {
      for (const pattern of patterns) {
        if (pattern.test(normalizedStatement)) {
          return type
        }
      }
    }

    return DdlStatementType.UNKNOWN
  }

  /**
   * 解析DDL语句
   */
  parseDdl(ddlStatement) {
    const ddlType = this.detectDdlType(ddlStatement)
    
    if (ddlType === DdlStatementType.UNKNOWN) {
      throw new Error('无法识别的DDL语句类型')
    }

    const result = new DdlParseResult(ddlType, '', ddlStatement)
    result.originalStatement = ddlStatement

    // 根据类型进行具体解析
    switch (ddlType) {
      case DdlStatementType.CREATE_TABLE:
        return this.parseCreateTable(ddlStatement, result)
      case DdlStatementType.ALTER_TABLE:
        return this.parseAlterTable(ddlStatement, result)
      case DdlStatementType.DROP_TABLE:
        return this.parseDropTable(ddlStatement, result)
      case DdlStatementType.TRUNCATE_TABLE:
        return this.parseTruncateTable(ddlStatement, result)
      case DdlStatementType.CREATE_INDEX:
        return this.parseCreateIndex(ddlStatement, result)
      case DdlStatementType.DROP_INDEX:
        return this.parseDropIndex(ddlStatement, result)
      case DdlStatementType.CREATE_VIEW:
        return this.parseCreateView(ddlStatement, result)
      case DdlStatementType.DROP_VIEW:
        return this.parseDropView(ddlStatement, result)
      default:
        return result
    }
  }

  /**
   * 解析CREATE TABLE语句
   */
  parseCreateTable(ddlStatement, result) {
    const normalized = ddlStatement.replace(/\r\n|\r|\n/g, ' ').replace(/\s+/g, ' ').trim()
    
    // 提取表名
    const tableNameMatch = normalized.match(/CREATE\s+(?:TEMPORARY\s+)?TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([\w\."`\[\]]+)/i)
    if (tableNameMatch && tableNameMatch[1]) {
      result.tableName = tableNameMatch[1].replace(/["`\[\]]/g, '')
    }

    // 提取字段定义部分
    const fieldSectionMatch = normalized.match(/CREATE\s+TABLE[^(]*\(([\s\S]*?)\)/i)
    if (fieldSectionMatch && fieldSectionMatch[1]) {
      result.details.fields = this.parseFieldDefinitions(fieldSectionMatch[1])
    }

    // 提取约束信息
    result.details.constraints = this.extractConstraints(normalized)
    
    // 提取索引信息
    result.details.indexes = this.extractIndexes(normalized)

    return result
  }

  /**
   * 解析ALTER TABLE语句
   */
  parseAlterTable(ddlStatement, result) {
    const normalized = ddlStatement.replace(/\r\n|\r|\n/g, ' ').replace(/\s+/g, ' ').trim()
    
    // 提取表名
    const tableNameMatch = normalized.match(/ALTER\s+TABLE\s+([\w\."`\[\]]+)/i)
    if (tableNameMatch && tableNameMatch[1]) {
      result.tableName = tableNameMatch[1].replace(/["`\[\]]/g, '')
    }

    // 解析操作类型
    if (/ADD\s+(?:COLUMN\s+)?\w+/i.test(normalized)) {
      result.details.operationType = 'ADD_COLUMN'
      result.details.columns = this.extractAddedColumns(normalized)
    } else if (/DROP\s+(?:COLUMN\s+)?\w+/i.test(normalized)) {
      result.details.operationType = 'DROP_COLUMN'
      result.details.columns = this.extractDroppedColumns(normalized)
    } else if (/MODIFY\s+(?:COLUMN\s+)?\w+/i.test(normalized) || /ALTER\s+(?:COLUMN\s+)?\w+/i.test(normalized)) {
      result.details.operationType = 'MODIFY_COLUMN'
      result.details.columns = this.extractModifiedColumns(normalized)
    } else if (/ADD\s+CONSTRAINT/i.test(normalized)) {
      result.details.operationType = 'ADD_CONSTRAINT'
      result.details.constraints = this.extractAddedConstraints(normalized)
    } else if (/DROP\s+CONSTRAINT/i.test(normalized)) {
      result.details.operationType = 'DROP_CONSTRAINT'
      result.details.constraints = this.extractDroppedConstraints(normalized)
    }

    return result
  }

  /**
   * 解析DROP TABLE语句
   */
  parseDropTable(ddlStatement, result) {
    const normalized = ddlStatement.replace(/\r\n|\r|\n/g, ' ').replace(/\s+/g, ' ').trim()
    
    // 提取表名
    const tableNameMatch = normalized.match(/DROP\s+TABLE\s+(?:IF\s+EXISTS\s+)?([\w\."`\[\]]+)/i)
    if (tableNameMatch && tableNameMatch[1]) {
      result.tableName = tableNameMatch[1].replace(/["`\[\]]/g, '')
    }

    result.details.cascade = /CASCADE/i.test(normalized)
    result.details.restrict = /RESTRICT/i.test(normalized)

    return result
  }

  /**
   * 解析TRUNCATE TABLE语句
   */
  parseTruncateTable(ddlStatement, result) {
    const normalized = ddlStatement.replace(/\r\n|\r|\n/g, ' ').replace(/\s+/g, ' ').trim()
    
    // 提取表名
    const tableNameMatch = normalized.match(/TRUNCATE\s+(?:TABLE\s+)?([\w\."`\[\]]+)/i)
    if (tableNameMatch && tableNameMatch[1]) {
      result.tableName = tableNameMatch[1].replace(/["`\[\]]/g, '')
    }

    result.details.cascade = /CASCADE/i.test(normalized)
    result.details.restartIdentity = /RESTART\s+IDENTITY/i.test(normalized)
    result.details.continueIdentity = /CONTINUE\s+IDENTITY/i.test(normalized)

    return result
  }

  /**
   * 解析CREATE INDEX语句
   */
  parseCreateIndex(ddlStatement, result) {
    const normalized = ddlStatement.replace(/\r\n|\r|\n/g, ' ').replace(/\s+/g, ' ').trim()
    
    // 提取索引名和表名
    const indexMatch = normalized.match(/CREATE\s+(?:UNIQUE\s+)?INDEX\s+(?:IF\s+NOT\s+EXISTS\s+)?([\w\."`\[\]]+)\s+ON\s+([\w\."`\[\]]+)/i)
    if (indexMatch && indexMatch[1] && indexMatch[2]) {
      result.tableName = indexMatch[2].replace(/["`\[\]]/g, '')
      result.details.indexName = indexMatch[1].replace(/["`\[\]]/g, '')
    }

    result.details.unique = /UNIQUE\s+INDEX/i.test(normalized)
    result.details.columns = this.extractIndexColumns(normalized)

    return result
  }

  /**
   * 解析DROP INDEX语句
   */
  parseDropIndex(ddlStatement, result) {
    const normalized = ddlStatement.replace(/\r\n|\r|\n/g, ' ').replace(/\s+/g, ' ').trim()
    
    // 提取索引名
    const indexMatch = normalized.match(/DROP\s+INDEX\s+(?:IF\s+EXISTS\s+)?([\w\."`\[\]]+)/i)
    if (indexMatch && indexMatch[1]) {
      result.details.indexName = indexMatch[1].replace(/["`\[\]]/g, '')
    }

    // 尝试提取表名（某些数据库语法）
    const tableMatch = normalized.match(/ON\s+([\w\."`\[\]]+)/i)
    if (tableMatch && tableMatch[1]) {
      result.tableName = tableMatch[1].replace(/["`\[\]]/g, '')
    }

    result.details.cascade = /CASCADE/i.test(normalized)

    return result
  }

  /**
   * 解析CREATE VIEW语句
   */
  parseCreateView(ddlStatement, result) {
    const normalized = ddlStatement.replace(/\r\n|\r|\n/g, ' ').replace(/\s+/g, ' ').trim()
    
    // 提取视图名
    const viewMatch = normalized.match(/CREATE\s+(?:OR\s+REPLACE\s+)?(?:MATERIALIZED\s+)?VIEW\s+(?:IF\s+NOT\s+EXISTS\s+)?([\w\."`\[\]]+)/i)
    if (viewMatch && viewMatch[1]) {
      result.tableName = viewMatch[1].replace(/["`\[\]]/g, '')
    }

    result.details.materialized = /MATERIALIZED\s+VIEW/i.test(normalized)
    result.details.replace = /OR\s+REPLACE/i.test(normalized)

    return result
  }

  /**
   * 解析DROP VIEW语句
   */
  parseDropView(ddlStatement, result) {
    const normalized = ddlStatement.replace(/\r\n|\r|\n/g, ' ').replace(/\s+/g, ' ').trim()
    
    // 提取视图名
    const viewMatch = normalized.match(/DROP\s+(?:MATERIALIZED\s+)?VIEW\s+(?:IF\s+EXISTS\s+)?([\w\."`\[\]]+)/i)
    if (viewMatch && viewMatch[1]) {
      result.tableName = viewMatch[1].replace(/["`\[\]]/g, '')
    }

    result.details.materialized = /MATERIALIZED\s+VIEW/i.test(normalized)
    result.details.cascade = /CASCADE/i.test(normalized)

    return result
  }

  /**
   * 解析字段定义
   */
  parseFieldDefinitions(fieldSection) {
    const fields = []
    const definitions = this.splitFieldDefinitions(fieldSection)
    
    for (const definition of definitions) {
      const field = this.parseSingleField(definition)
      if (field) {
        fields.push(field)
      }
    }
    
    return fields
  }

  /**
   * 解析单个字段定义
   */
  parseSingleField(fieldDefinition) {
    const normalized = fieldDefinition.trim()
    
    // 提取字段名（支持引号）
    const nameMatch = normalized.match(/^([\w\."`\[\]]+)/)
    if (!nameMatch) return null
    
    const fieldName = nameMatch[1].replace(/["`\[\]]/g, '')
    
    // 提取数据类型
    const typeMatch = normalized.match(/\s+(\w+)(?:\([^)]*\))?/)
    const dataType = typeMatch ? typeMatch[1].toUpperCase() : 'VARCHAR'
    
    // 检查约束
    const nullable = !/NOT\s+NULL/i.test(normalized)
    const primaryKey = /PRIMARY\s+KEY/i.test(normalized)
    const unique = /UNIQUE/i.test(normalized)
    
    // 提取默认值
    const defaultMatch = normalized.match(/DEFAULT\s+([^,\s]+)/i)
    const defaultValue = defaultMatch ? defaultMatch[1] : null
    
    // 提取注释
    const commentMatch = normalized.match(/COMMENT\s+['"]([^'"]+)['"]/i)
    const comment = commentMatch ? commentMatch[1] : ''
    
    return {
      name: fieldName,
      type: dataType,
      nullable: nullable,
      primaryKey: primaryKey,
      unique: unique,
      defaultValue: defaultValue,
      comment: comment,
      fullDefinition: normalized
    }
  }

  /**
   * 分割字段定义
   */
  splitFieldDefinitions(fieldSection) {
    const definitions = []
    let currentDef = ''
    let parenDepth = 0

    for (let i = 0; i < fieldSection.length; i++) {
      const char = fieldSection[i]

      if (char === '(') {
        parenDepth++
      } else if (char === ')') {
        parenDepth--
      }

      if (char === ',' && parenDepth === 0) {
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
   * 提取约束信息
   */
  extractConstraints(ddlStatement) {
    const constraints = []
    
    // 主键约束
    const primaryKeyMatch = ddlStatement.match(/PRIMARY\s+KEY\s*\(([^)]+)\)/i)
    if (primaryKeyMatch) {
      constraints.push({
        type: 'PRIMARY_KEY',
        columns: primaryKeyMatch[1].split(',').map(col => col.trim().replace(/["`\[\]]/g, ''))
      })
    }
    
    // 唯一约束
    const uniqueMatches = ddlStatement.matchAll(/UNIQUE\s*\(([^)]+)\)/gi)
    for (const match of uniqueMatches) {
      constraints.push({
        type: 'UNIQUE',
        columns: match[1].split(',').map(col => col.trim().replace(/["`\[\]]/g, ''))
      })
    }
    
    // 外键约束
    const foreignKeyMatches = ddlStatement.matchAll(/FOREIGN\s+KEY\s*\(([^)]+)\)\s+REFERENCES\s+([\w\."`\[\]]+)\s*\(([^)]+)\)/gi)
    for (const match of foreignKeyMatches) {
      constraints.push({
        type: 'FOREIGN_KEY',
        columns: match[1].split(',').map(col => col.trim().replace(/["`\[\]]/g, '')),
        referencedTable: match[2].replace(/["`\[\]]/g, ''),
        referencedColumns: match[3].split(',').map(col => col.trim().replace(/["`\[\]]/g, ''))
      })
    }
    
    return constraints
  }

  /**
   * 提取索引信息
   */
  extractIndexes(ddlStatement) {
    const indexes = []
    
    const indexMatches = ddlStatement.matchAll(/(?:CREATE\s+)?(?:UNIQUE\s+)?INDEX\s+([\w\."`\[\]]+)\s+ON\s+([\w\."`\[\]]+)\s*\(([^)]+)\)/gi)
    for (const match of indexMatches) {
      indexes.push({
        name: match[1].replace(/["`\[\]]/g, ''),
        table: match[2].replace(/["`\[\]]/g, ''),
        columns: match[3].split(',').map(col => col.trim().replace(/["`\[\]]/g, '')),
        unique: match[0].includes('UNIQUE')
      })
    }
    
    return indexes
  }

  /**
   * 提取添加的列
   */
  extractAddedColumns(ddlStatement) {
    const columns = []
    const addMatches = ddlStatement.matchAll(/ADD\s+(?:COLUMN\s+)?([\w\."`\[\]]+)\s+(\w+(?:\([^)]*\))?)/gi)
    
    for (const match of addMatches) {
      columns.push({
        name: match[1].replace(/["`\[\]]/g, ''),
        type: match[2]
      })
    }
    
    return columns
  }

  /**
   * 提取删除的列
   */
  extractDroppedColumns(ddlStatement) {
    const columns = []
    const dropMatches = ddlStatement.matchAll(/DROP\s+(?:COLUMN\s+)?([\w\."`\[\]]+)/gi)
    
    for (const match of dropMatches) {
      columns.push(match[1].replace(/["`\[\]]/g, ''))
    }
    
    return columns
  }

  /**
   * 提取修改的列
   */
  extractModifiedColumns(ddlStatement) {
    const columns = []
    const modifyMatches = ddlStatement.matchAll(/(?:MODIFY|ALTER)\s+(?:COLUMN\s+)?([\w\."`\[\]]+)\s+(\w+(?:\([^)]*\))?)/gi)
    
    for (const match of modifyMatches) {
      columns.push({
        name: match[1].replace(/["`\[\]]/g, ''),
        type: match[2]
      })
    }
    
    return columns
  }

  /**
   * 提取添加的约束
   */
  extractAddedConstraints(ddlStatement) {
    const constraints = []
    const constraintMatches = ddlStatement.matchAll(/ADD\s+CONSTRAINT\s+([\w\."`\[\]]+)\s+(PRIMARY\s+KEY|UNIQUE|FOREIGN\s+KEY)\s*\(([^)]+)\)/gi)
    
    for (const match of constraintMatches) {
      constraints.push({
        name: match[1].replace(/["`\[\]]/g, ''),
        type: match[2].toUpperCase(),
        columns: match[3].split(',').map(col => col.trim().replace(/["`\[\]]/g, ''))
      })
    }
    
    return constraints
  }

  /**
   * 提取删除的约束
   */
  extractDroppedConstraints(ddlStatement) {
    const constraints = []
    const dropMatches = ddlStatement.matchAll(/DROP\s+CONSTRAINT\s+([\w\."`\[\]]+)/gi)
    
    for (const match of dropMatches) {
      constraints.push(match[1].replace(/["`\[\]]/g, ''))
    }
    
    return constraints
  }

  /**
   * 提取索引列
   */
  extractIndexColumns(ddlStatement) {
    const columnMatch = ddlStatement.match(/\(([^)]+)\)/)
    if (columnMatch) {
      return columnMatch[1].split(',').map(col => col.trim().replace(/["`\[\]]/g, ''))
    }
    return []
  }
}

/**
 * 使用DDL类型解析器的Composable函数
 */
export function useDdlTypeParser() {
  const parser = new DdlTypeParser()

  /**
   * 检测DDL语句类型
   */
  const detectDdlType = (ddlStatement) => {
    return parser.detectDdlType(ddlStatement)
  }

  /**
   * 解析DDL语句
   */
  const parseDdl = (ddlStatement) => {
    return parser.parseDdl(ddlStatement)
  }

  /**
   * 获取支持的DDL语句类型列表
   */
  const getSupportedDdlTypes = () => {
    return Object.values(DdlStatementType).filter(type => type !== DdlStatementType.UNKNOWN)
  }

  return {
    detectDdlType,
    parseDdl,
    getSupportedDdlTypes,
    DdlStatementType
  }
}