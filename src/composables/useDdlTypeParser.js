/**
 * DDL语句类型解析器
 * 支持解析多种DDL语句类型：CREATE TABLE、ALTER TABLE、DROP TABLE、TRUNCATE TABLE等
 */

/**
 * DDL语句类型枚举
 */
export const DdlStatementType = {
  // 表相关
  CREATE_TABLE: 'CREATE_TABLE',
  ALTER_TABLE: 'ALTER_TABLE',
  DROP_TABLE: 'DROP_TABLE',
  TRUNCATE_TABLE: 'TRUNCATE_TABLE',

  // 索引相关
  CREATE_INDEX: 'CREATE_INDEX',
  DROP_INDEX: 'DROP_INDEX',
  ALTER_INDEX: 'ALTER_INDEX',

  // 视图相关
  CREATE_VIEW: 'CREATE_VIEW',
  ALTER_VIEW: 'ALTER_VIEW',
  DROP_VIEW: 'DROP_VIEW',

  // 序列相关
  CREATE_SEQUENCE: 'CREATE_SEQUENCE',
  ALTER_SEQUENCE: 'ALTER_SEQUENCE',
  DROP_SEQUENCE: 'DROP_SEQUENCE',

  // 触发器相关
  CREATE_TRIGGER: 'CREATE_TRIGGER',
  ALTER_TRIGGER: 'ALTER_TRIGGER',
  DROP_TRIGGER: 'DROP_TRIGGER',

  // 存储过程和函数相关
  CREATE_PROCEDURE: 'CREATE_PROCEDURE',
  ALTER_PROCEDURE: 'ALTER_PROCEDURE',
  DROP_PROCEDURE: 'DROP_PROCEDURE',
  CREATE_FUNCTION: 'CREATE_FUNCTION',
  ALTER_FUNCTION: 'ALTER_FUNCTION',
  DROP_FUNCTION: 'DROP_FUNCTION',

  // 其他
  CREATE_SCHEMA: 'CREATE_SCHEMA',
  DROP_SCHEMA: 'DROP_SCHEMA',
  CREATE_DATABASE: 'CREATE_DATABASE',
  ALTER_DATABASE: 'ALTER_DATABASE',
  DROP_DATABASE: 'DROP_DATABASE',

  // 未知类型
  UNKNOWN: 'UNKNOWN',
}

/**
 * DDL语句解析结果
 */
export class DdlParseResult {
  constructor(type, tableName, operation, details = {}) {
    // 基本信息
    this.type = type
    this.tableName = tableName
    this.operation = operation
    this.originalStatement = ''
    this.databaseType = 'unknown'
    this.version = 'unknown'

    // 详细信息
    this.details = {
      // 字段信息
      fields: [],
      // 索引信息
      indexes: [],
      // 约束信息
      constraints: [],
      // 表注释
      tableComment: '',
      // 其他详细信息
      ...details,
    }

    // 错误信息
    this.errors = []
    this.warnings = []

    // 解析状态
    this.success = true
  }

  /**
   * 添加错误信息
   */
  addError(message, position = null) {
    this.errors.push({ message, position })
    this.success = false
  }

  /**
   * 添加警告信息
   */
  addWarning(message, position = null) {
    this.warnings.push({ message, position })
  }

  /**
   * 检查是否有错误
   */
  hasErrors() {
    return this.errors.length > 0
  }

  /**
   * 检查是否有警告
   */
  hasWarnings() {
    return this.warnings.length > 0
  }

  /**
   * 设置解析成功状态
   */
  setSuccess(success) {
    this.success = success
  }

  /**
   * 获取解析结果的摘要信息
   */
  getSummary() {
    return {
      type: this.type,
      tableName: this.tableName,
      databaseType: this.databaseType,
      fieldCount: this.details.fields.length,
      indexCount: this.details.indexes.length,
      constraintCount: this.details.constraints.length,
      errorCount: this.errors.length,
      warningCount: this.warnings.length,
      success: this.success,
    }
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
        /^\s*CREATE\s+(?:TEMPORARY|TEMP)\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([\w."`[\]]+)/i,
        /^\s*CREATE\s+GLOBAL\s+(?:TEMPORARY|TEMP)\s+TABLE\s+([\w."`[\]]+)/i,
        /^\s*CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([\w."`[\]]+)/i,
      ],

      // ALTER TABLE 模式
      [DdlStatementType.ALTER_TABLE]: [/^\s*ALTER\s+TABLE\s+([\w."`[\]]+)/i],

      // DROP TABLE 模式
      [DdlStatementType.DROP_TABLE]: [
        /^\s*DROP\s+TABLE\s+(?:IF\s+EXISTS\s+)?([\w."`[\]]+)/i,
        /^\s*DROP\s+TEMPORARY\s+TABLE\s+(?:IF\s+EXISTS\s+)?([\w."`[\]]+)/i,
      ],

      // TRUNCATE TABLE 模式
      [DdlStatementType.TRUNCATE_TABLE]: [
        /^\s*TRUNCATE\s+(?:TABLE\s+)?([\w."`[\]]+)/i,
        /^\s*TRUNCATE\s+TABLE\s+(?:IF\s+EXISTS\s+)?([\w."`[\]]+)/i,
      ],

      // CREATE INDEX 模式
      [DdlStatementType.CREATE_INDEX]: [
        /^\s*CREATE\s+(?:UNIQUE\s+)?(?:INDEX|KEY)\s+(?:IF\s+NOT\s+EXISTS\s+)?([\w."`[\]]+)/i,
        /^\s*CREATE\s+INDEX\s+(?:IF\s+NOT\s+EXISTS\s+)?([\w."`[\]]+)/i,
      ],

      // DROP INDEX 模式
      [DdlStatementType.DROP_INDEX]: [
        /^\s*DROP\s+(?:INDEX|KEY)\s+(?:IF\s+EXISTS\s+)?([\w."`[\]]+)/i,
        /^\s*DROP\s+INDEX\s+(?:IF\s+EXISTS\s+)?([\w."`[\]]+)/i,
      ],

      // ALTER INDEX 模式
      [DdlStatementType.ALTER_INDEX]: [/^\s*ALTER\s+(?:INDEX|KEY)\s+([\w."`[\]]+)/i],

      // CREATE VIEW 模式
      [DdlStatementType.CREATE_VIEW]: [
        /^\s*CREATE\s+(?:OR\s+REPLACE\s+)?(?:MATERIALIZED\s+)?VIEW\s+(?:IF\s+NOT\s+EXISTS\s+)?([\w."`[\]]+)/i,
        /^\s*CREATE\s+VIEW\s+([\w."`[\]]+)/i,
      ],

      // ALTER VIEW 模式
      [DdlStatementType.ALTER_VIEW]: [
        /^\s*ALTER\s+(?:MATERIALIZED\s+)?VIEW\s+([\w."`[\]]+)/i,
        /^\s*ALTER\s+VIEW\s+([\w."`[\]]+)/i,
      ],

      // DROP VIEW 模式
      [DdlStatementType.DROP_VIEW]: [
        /^\s*DROP\s+(?:MATERIALIZED\s+)?VIEW\s+(?:IF\s+EXISTS\s+)?([\w."`[\]]+)/i,
        /^\s*DROP\s+VIEW\s+([\w."`[\]]+)/i,
      ],

      // CREATE SEQUENCE 模式
      [DdlStatementType.CREATE_SEQUENCE]: [
        /^\s*CREATE\s+(?:OR\s+REPLACE\s+)?SEQUENCE\s+(?:IF\s+NOT\s+EXISTS\s+)?([\w."`[\]]+)/i,
      ],

      // ALTER SEQUENCE 模式
      [DdlStatementType.ALTER_SEQUENCE]: [/^\s*ALTER\s+SEQUENCE\s+([\w."`[\]]+)/i],

      // DROP SEQUENCE 模式
      [DdlStatementType.DROP_SEQUENCE]: [/^\s*DROP\s+SEQUENCE\s+(?:IF\s+EXISTS\s+)?([\w."`[\]]+)/i],

      // CREATE TRIGGER 模式
      [DdlStatementType.CREATE_TRIGGER]: [
        /^\s*CREATE\s+(?:OR\s+REPLACE\s+)?(?:BEFORE|AFTER|INSTEAD\s+OF\s+)?TRIGGER\s+([\w."`[\]]+)/i,
      ],

      // ALTER TRIGGER 模式
      [DdlStatementType.ALTER_TRIGGER]: [/^\s*ALTER\s+TRIGGER\s+([\w."`[\]]+)/i],

      // DROP TRIGGER 模式
      [DdlStatementType.DROP_TRIGGER]: [/^\s*DROP\s+TRIGGER\s+(?:IF\s+EXISTS\s+)?([\w."`[\]]+)/i],

      // CREATE PROCEDURE 模式
      [DdlStatementType.CREATE_PROCEDURE]: [
        /^\s*CREATE\s+(?:OR\s+REPLACE\s+)?PROCEDURE\s+([\w."`[\]]+)/i,
      ],

      // ALTER PROCEDURE 模式
      [DdlStatementType.ALTER_PROCEDURE]: [/^\s*ALTER\s+PROCEDURE\s+([\w."`[\]]+)/i],

      // DROP PROCEDURE 模式
      [DdlStatementType.DROP_PROCEDURE]: [
        /^\s*DROP\s+PROCEDURE\s+(?:IF\s+EXISTS\s+)?([\w."`[\]]+)/i,
      ],

      // CREATE FUNCTION 模式
      [DdlStatementType.CREATE_FUNCTION]: [
        /^\s*CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+([\w."`[\]]+)/i,
      ],

      // ALTER FUNCTION 模式
      [DdlStatementType.ALTER_FUNCTION]: [/^\s*ALTER\s+FUNCTION\s+([\w."`[\]]+)/i],

      // DROP FUNCTION 模式
      [DdlStatementType.DROP_FUNCTION]: [/^\s*DROP\s+FUNCTION\s+(?:IF\s+EXISTS\s+)?([\w."`[\]]+)/i],

      // CREATE SCHEMA 模式
      [DdlStatementType.CREATE_SCHEMA]: [
        /^\s*CREATE\s+(?:OR\s+REPLACE\s+)?SCHEMA\s+(?:IF\s+NOT\s+EXISTS\s+)?([\w."`[\]]+)/i,
      ],

      // DROP SCHEMA 模式
      [DdlStatementType.DROP_SCHEMA]: [/^\s*DROP\s+SCHEMA\s+(?:IF\s+EXISTS\s+)?([\w."`[\]]+)/i],

      // CREATE DATABASE 模式
      [DdlStatementType.CREATE_DATABASE]: [
        /^\s*CREATE\s+DATABASE\s+(?:IF\s+NOT\s+EXISTS\s+)?([\w."`[\]]+)/i,
      ],

      // ALTER DATABASE 模式
      [DdlStatementType.ALTER_DATABASE]: [/^\s*ALTER\s+DATABASE\s+([\w."`[\]]+)/i],

      // DROP DATABASE 模式
      [DdlStatementType.DROP_DATABASE]: [/^\s*DROP\s+DATABASE\s+(?:IF\s+EXISTS\s+)?([\w."`[\]]+)/i],
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

    if (!normalizedStatement) {
      return DdlStatementType.UNKNOWN
    }

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
   * 获取错误位置信息
   */
  getErrorPosition(ddlStatement, searchText) {
    if (!ddlStatement || !searchText) {
      return null
    }

    const lines = ddlStatement.split(/\r\n|\r|\n/)
    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      const line = lines[lineIndex]
      const columnIndex = line.indexOf(searchText)
      if (columnIndex !== -1) {
        return {
          line: lineIndex + 1,
          column: columnIndex + 1,
          lineText: line.trim(),
        }
      }
    }
    return null
  }

  /**
   * 解析DDL语句
   */
  parseDdl(ddlStatement) {
    try {
      const ddlType = this.detectDdlType(ddlStatement)

      if (ddlType === DdlStatementType.UNKNOWN) {
        const result = new DdlParseResult(DdlStatementType.UNKNOWN, '', ddlStatement)
        result.originalStatement = ddlStatement
        result.addError('无法识别的DDL语句类型')
        return result
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
        case DdlStatementType.ALTER_INDEX:
          return this.parseAlterIndex(ddlStatement, result)
        case DdlStatementType.DROP_INDEX:
          return this.parseDropIndex(ddlStatement, result)
        case DdlStatementType.CREATE_VIEW:
          return this.parseCreateView(ddlStatement, result)
        case DdlStatementType.ALTER_VIEW:
          return this.parseAlterView(ddlStatement, result)
        case DdlStatementType.DROP_VIEW:
          return this.parseDropView(ddlStatement, result)
        case DdlStatementType.CREATE_SEQUENCE:
          return this.parseCreateSequence(ddlStatement, result)
        case DdlStatementType.ALTER_SEQUENCE:
          return this.parseAlterSequence(ddlStatement, result)
        case DdlStatementType.DROP_SEQUENCE:
          return this.parseDropSequence(ddlStatement, result)
        case DdlStatementType.CREATE_TRIGGER:
          return this.parseCreateTrigger(ddlStatement, result)
        case DdlStatementType.ALTER_TRIGGER:
          return this.parseAlterTrigger(ddlStatement, result)
        case DdlStatementType.DROP_TRIGGER:
          return this.parseDropTrigger(ddlStatement, result)
        case DdlStatementType.CREATE_PROCEDURE:
          return this.parseCreateProcedure(ddlStatement, result)
        case DdlStatementType.ALTER_PROCEDURE:
          return this.parseAlterProcedure(ddlStatement, result)
        case DdlStatementType.DROP_PROCEDURE:
          return this.parseDropProcedure(ddlStatement, result)
        case DdlStatementType.CREATE_FUNCTION:
          return this.parseCreateFunction(ddlStatement, result)
        case DdlStatementType.ALTER_FUNCTION:
          return this.parseAlterFunction(ddlStatement, result)
        case DdlStatementType.DROP_FUNCTION:
          return this.parseDropFunction(ddlStatement, result)
        case DdlStatementType.CREATE_SCHEMA:
          return this.parseCreateSchema(ddlStatement, result)
        case DdlStatementType.DROP_SCHEMA:
          return this.parseDropSchema(ddlStatement, result)
        case DdlStatementType.CREATE_DATABASE:
          return this.parseCreateDatabase(ddlStatement, result)
        case DdlStatementType.ALTER_DATABASE:
          return this.parseAlterDatabase(ddlStatement, result)
        case DdlStatementType.DROP_DATABASE:
          return this.parseDropDatabase(ddlStatement, result)
        default:
          return result
      }
    } catch (error) {
      const result = new DdlParseResult(DdlStatementType.UNKNOWN, '', ddlStatement)
      result.originalStatement = ddlStatement
      result.addError(`解析失败: ${error.message}`)
      return result
    }
  }

  /**
   * 解析CREATE TABLE语句
   */
  parseCreateTable(ddlStatement, result) {
    const normalized = ddlStatement
      .replace(/\r\n|\r|\n/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()

    try {
      // 提取表名
      const tableNameMatch =
        normalized.match(
          /CREATE\s+(?:TEMPORARY|TEMP)\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([\w."`[\]]+)/i,
        ) ||
        normalized.match(/CREATE\s+GLOBAL\s+(?:TEMPORARY|TEMP)\s+TABLE\s+([\w."`[\]]+)/i) ||
        normalized.match(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([\w."`[\]]+)/i)

      if (tableNameMatch && tableNameMatch[1]) {
        result.tableName = tableNameMatch[1].replace(/["`[\]]/g, '')
      } else {
        result.addError(
          '无法从CREATE TABLE语句中提取表名',
          this.getErrorPosition(ddlStatement, 'CREATE TABLE'),
        )
      }

      // 提取字段定义部分
      const fieldSectionMatch = normalized.match(/CREATE\s+TABLE[^(]*\(([\s\S]*?)\)/i)
      if (fieldSectionMatch && fieldSectionMatch[1]) {
        result.details.fields = this.parseFieldDefinitions(fieldSectionMatch[1])
      } else {
        result.addError(
          '无法找到CREATE TABLE语句中的字段定义部分',
          this.getErrorPosition(ddlStatement, 'CREATE TABLE'),
        )
      }

      // 提取约束信息
      result.details.constraints = this.extractConstraints(normalized)

      // 提取索引信息
      result.details.indexes = this.extractIndexes(normalized)

      // 验证必要的解析结果
      if (!result.tableName) {
        result.addError(
          'CREATE TABLE语句缺少表名',
          this.getErrorPosition(ddlStatement, 'CREATE TABLE'),
        )
      }

      if (result.details.fields.length === 0) {
        result.addWarning(
          'CREATE TABLE语句中未找到有效的字段定义',
          this.getErrorPosition(ddlStatement, 'CREATE TABLE'),
        )
      }
    } catch (error) {
      result.addError(
        `解析CREATE TABLE语句失败: ${error.message}`,
        this.getErrorPosition(ddlStatement, 'CREATE TABLE'),
      )
    }

    return result
  }

  /**
   * 解析ALTER TABLE语句
   */
  parseAlterTable(ddlStatement, result) {
    const normalized = ddlStatement
      .replace(/\r\n|\r|\n/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()

    // 提取表名
    const tableNameMatch = normalized.match(/ALTER\s+TABLE\s+([\w."`[\]]+)/i)
    if (tableNameMatch && tableNameMatch[1]) {
      result.tableName = tableNameMatch[1].replace(/["`[\]]/g, '')
    }

    // 解析操作类型
    if (/ADD\s+(?:COLUMN\s+)?\w+/i.test(normalized)) {
      result.details.operationType = 'ADD_COLUMN'
      result.details.columns = this.extractAddedColumns(normalized)
    } else if (/DROP\s+(?:COLUMN\s+)?\w+/i.test(normalized)) {
      result.details.operationType = 'DROP_COLUMN'
      result.details.columns = this.extractDroppedColumns(normalized)
    } else if (
      /MODIFY\s+(?:COLUMN\s+)?\w+/i.test(normalized) ||
      /ALTER\s+(?:COLUMN\s+)?\w+/i.test(normalized)
    ) {
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
    const normalized = ddlStatement
      .replace(/\r\n|\r|\n/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()

    // 提取表名
    const tableNameMatch = normalized.match(/DROP\s+TABLE\s+(?:IF\s+EXISTS\s+)?([\w."`[\]]+)/i)
    if (tableNameMatch && tableNameMatch[1]) {
      result.tableName = tableNameMatch[1].replace(/["`[\]]/g, '')
    }

    result.details.cascade = /CASCADE/i.test(normalized)
    result.details.restrict = /RESTRICT/i.test(normalized)

    return result
  }

  /**
   * 解析TRUNCATE TABLE语句
   */
  parseTruncateTable(ddlStatement, result) {
    const normalized = ddlStatement
      .replace(/\r\n|\r|\n/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()

    // 提取表名
    const tableNameMatch = normalized.match(/TRUNCATE\s+(?:TABLE\s+)?([\w."`[\]]+)/i)
    if (tableNameMatch && tableNameMatch[1]) {
      result.tableName = tableNameMatch[1].replace(/["`[\]]/g, '')
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
    const normalized = ddlStatement
      .replace(/\r\n|\r|\n/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()

    // 提取索引名和表名
    const indexMatch = normalized.match(
      /CREATE\s+(?:UNIQUE\s+)?INDEX\s+(?:IF\s+NOT\s+EXISTS\s+)?([\w."`[\]]+)\s+ON\s+([\w."`[\]]+)/i,
    )
    if (indexMatch && indexMatch[1] && indexMatch[2]) {
      result.tableName = indexMatch[2].replace(/["`[\]]/g, '')
      result.details.indexName = indexMatch[1].replace(/["`[\]]/g, '')
    }

    result.details.unique = /UNIQUE\s+INDEX/i.test(normalized)
    result.details.columns = this.extractIndexColumns(normalized)

    return result
  }

  /**
   * 解析DROP INDEX语句
   */
  parseDropIndex(ddlStatement, result) {
    const normalized = ddlStatement
      .replace(/\r\n|\r|\n/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()

    // 提取索引名
    const indexMatch = normalized.match(/DROP\s+INDEX\s+(?:IF\s+EXISTS\s+)?([\w."`[\]]+)/i)
    if (indexMatch && indexMatch[1]) {
      result.details.indexName = indexMatch[1].replace(/["`[\]]/g, '')
    }

    // 尝试提取表名（某些数据库语法）
    const tableMatch = normalized.match(/ON\s+([\w."`[\]]+)/i)
    if (tableMatch && tableMatch[1]) {
      result.tableName = tableMatch[1].replace(/["`[\]]/g, '')
    }

    result.details.cascade = /CASCADE/i.test(normalized)

    return result
  }

  /**
   * 解析CREATE VIEW语句
   */
  parseCreateView(ddlStatement, result) {
    const normalized = ddlStatement
      .replace(/\r\n|\r|\n/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()

    // 提取视图名
    const viewMatch = normalized.match(
      /CREATE\s+(?:OR\s+REPLACE\s+)?(?:MATERIALIZED\s+)?VIEW\s+(?:IF\s+NOT\s+EXISTS\s+)?([\w."`[\]]+)/i,
    )
    if (viewMatch && viewMatch[1]) {
      result.tableName = viewMatch[1].replace(/["`[\]]/g, '')
    }

    result.details.materialized = /MATERIALIZED\s+VIEW/i.test(normalized)
    result.details.replace = /OR\s+REPLACE/i.test(normalized)

    return result
  }

  /**
   * 解析DROP VIEW语句
   */
  parseDropView(ddlStatement, result) {
    const normalized = ddlStatement
      .replace(/\r\n|\r|\n/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()

    // 提取视图名
    const viewMatch = normalized.match(
      /DROP\s+(?:MATERIALIZED\s+)?VIEW\s+(?:IF\s+EXISTS\s+)?([\w."`[\]]+)/i,
    )
    if (viewMatch && viewMatch[1]) {
      result.tableName = viewMatch[1].replace(/["`[\]]/g, '')
    }

    result.details.materialized = /MATERIALIZED\s+VIEW/i.test(normalized)
    result.details.cascade = /CASCADE/i.test(normalized)

    return result
  }

  /**
   * 解析ALTER INDEX语句
   */
  parseAlterIndex(ddlStatement, result) {
    const normalized = ddlStatement
      .replace(/\r\n|\r|\n/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()

    // 提取索引名
    const indexMatch = normalized.match(/ALTER\s+(?:INDEX|KEY)\s+([\w."`[\]]+)/i)
    if (indexMatch && indexMatch[1]) {
      result.details.indexName = indexMatch[1].replace(/["`[\]]/g, '')
    }

    // 提取表名
    const tableMatch = normalized.match(/ON\s+([\w."`[\]]+)/i)
    if (tableMatch && tableMatch[1]) {
      result.tableName = tableMatch[1].replace(/["`[\]]/g, '')
    }

    return result
  }

  /**
   * 解析ALTER VIEW语句
   */
  parseAlterView(ddlStatement, result) {
    const normalized = ddlStatement
      .replace(/\r\n|\r|\n/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()

    // 提取视图名
    const viewMatch = normalized.match(/ALTER\s+(?:MATERIALIZED\s+)?VIEW\s+([\w."`[\]]+)/i)
    if (viewMatch && viewMatch[1]) {
      result.tableName = viewMatch[1].replace(/["`[\]]/g, '')
    }

    result.details.materialized = /MATERIALIZED\s+VIEW/i.test(normalized)

    return result
  }

  /**
   * 解析CREATE SEQUENCE语句
   */
  parseCreateSequence(ddlStatement, result) {
    const normalized = ddlStatement
      .replace(/\r\n|\r|\n/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()

    // 提取序列名
    const sequenceMatch = normalized.match(
      /CREATE\s+(?:OR\s+REPLACE\s+)?SEQUENCE\s+(?:IF\s+NOT\s+EXISTS\s+)?([\w."`[\]]+)/i,
    )
    if (sequenceMatch && sequenceMatch[1]) {
      result.tableName = sequenceMatch[1].replace(/["`[\]]/g, '')
    }

    return result
  }

  /**
   * 解析ALTER SEQUENCE语句
   */
  parseAlterSequence(ddlStatement, result) {
    const normalized = ddlStatement
      .replace(/\r\n|\r|\n/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()

    // 提取序列名
    const sequenceMatch = normalized.match(/ALTER\s+SEQUENCE\s+([\w."`[\]]+)/i)
    if (sequenceMatch && sequenceMatch[1]) {
      result.tableName = sequenceMatch[1].replace(/["`[\]]/g, '')
    }

    return result
  }

  /**
   * 解析DROP SEQUENCE语句
   */
  parseDropSequence(ddlStatement, result) {
    const normalized = ddlStatement
      .replace(/\r\n|\r|\n/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()

    // 提取序列名
    const sequenceMatch = normalized.match(/DROP\s+SEQUENCE\s+(?:IF\s+EXISTS\s+)?([\w."`[\]]+)/i)
    if (sequenceMatch && sequenceMatch[1]) {
      result.tableName = sequenceMatch[1].replace(/["`[\]]/g, '')
    }

    result.details.cascade = /CASCADE/i.test(normalized)

    return result
  }

  /**
   * 解析CREATE TRIGGER语句
   */
  parseCreateTrigger(ddlStatement, result) {
    const normalized = ddlStatement
      .replace(/\r\n|\r|\n/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()

    // 提取触发器名
    const triggerMatch = normalized.match(
      /CREATE\s+(?:OR\s+REPLACE\s+)?(?:BEFORE|AFTER|INSTEAD\s+OF\s+)?TRIGGER\s+([\w."`[\]]+)/i,
    )
    if (triggerMatch && triggerMatch[1]) {
      result.tableName = triggerMatch[1].replace(/["`[\]]/g, '')
    }

    return result
  }

  /**
   * 解析ALTER TRIGGER语句
   */
  parseAlterTrigger(ddlStatement, result) {
    const normalized = ddlStatement
      .replace(/\r\n|\r|\n/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()

    // 提取触发器名
    const triggerMatch = normalized.match(/ALTER\s+TRIGGER\s+([\w."`[\]]+)/i)
    if (triggerMatch && triggerMatch[1]) {
      result.tableName = triggerMatch[1].replace(/["`[\]]/g, '')
    }

    return result
  }

  /**
   * 解析DROP TRIGGER语句
   */
  parseDropTrigger(ddlStatement, result) {
    const normalized = ddlStatement
      .replace(/\r\n|\r|\n/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()

    // 提取触发器名
    const triggerMatch = normalized.match(/DROP\s+TRIGGER\s+(?:IF\s+EXISTS\s+)?([\w."`[\]]+)/i)
    if (triggerMatch && triggerMatch[1]) {
      result.tableName = triggerMatch[1].replace(/["`[\]]/g, '')
    }

    return result
  }

  /**
   * 解析CREATE PROCEDURE语句
   */
  parseCreateProcedure(ddlStatement, result) {
    const normalized = ddlStatement
      .replace(/\r\n|\r|\n/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()

    // 提取存储过程名
    const procMatch = normalized.match(/CREATE\s+(?:OR\s+REPLACE\s+)?PROCEDURE\s+([\w."`[\]]+)/i)
    if (procMatch && procMatch[1]) {
      result.tableName = procMatch[1].replace(/["`[\]]/g, '')
    }

    return result
  }

  /**
   * 解析ALTER PROCEDURE语句
   */
  parseAlterProcedure(ddlStatement, result) {
    const normalized = ddlStatement
      .replace(/\r\n|\r|\n/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()

    // 提取存储过程名
    const procMatch = normalized.match(/ALTER\s+PROCEDURE\s+([\w."`[\]]+)/i)
    if (procMatch && procMatch[1]) {
      result.tableName = procMatch[1].replace(/["`[\]]/g, '')
    }

    return result
  }

  /**
   * 解析DROP PROCEDURE语句
   */
  parseDropProcedure(ddlStatement, result) {
    const normalized = ddlStatement
      .replace(/\r\n|\r|\n/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()

    // 提取存储过程名
    const procMatch = normalized.match(/DROP\s+PROCEDURE\s+(?:IF\s+EXISTS\s+)?([\w."`[\]]+)/i)
    if (procMatch && procMatch[1]) {
      result.tableName = procMatch[1].replace(/["`[\]]/g, '')
    }

    result.details.cascade = /CASCADE/i.test(normalized)

    return result
  }

  /**
   * 解析CREATE FUNCTION语句
   */
  parseCreateFunction(ddlStatement, result) {
    const normalized = ddlStatement
      .replace(/\r\n|\r|\n/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()

    // 提取函数名
    const funcMatch = normalized.match(/CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+([\w."`[\]]+)/i)
    if (funcMatch && funcMatch[1]) {
      result.tableName = funcMatch[1].replace(/["`[\]]/g, '')
    }

    return result
  }

  /**
   * 解析ALTER FUNCTION语句
   */
  parseAlterFunction(ddlStatement, result) {
    const normalized = ddlStatement
      .replace(/\r\n|\r|\n/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()

    // 提取函数名
    const funcMatch = normalized.match(/ALTER\s+FUNCTION\s+([\w."`[\]]+)/i)
    if (funcMatch && funcMatch[1]) {
      result.tableName = funcMatch[1].replace(/["`[\]]/g, '')
    }

    return result
  }

  /**
   * 解析DROP FUNCTION语句
   */
  parseDropFunction(ddlStatement, result) {
    const normalized = ddlStatement
      .replace(/\r\n|\r|\n/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()

    // 提取函数名
    const funcMatch = normalized.match(/DROP\s+FUNCTION\s+(?:IF\s+EXISTS\s+)?([\w."`[\]]+)/i)
    if (funcMatch && funcMatch[1]) {
      result.tableName = funcMatch[1].replace(/["`[\]]/g, '')
    }

    result.details.cascade = /CASCADE/i.test(normalized)

    return result
  }

  /**
   * 解析CREATE SCHEMA语句
   */
  parseCreateSchema(ddlStatement, result) {
    const normalized = ddlStatement
      .replace(/\r\n|\r|\n/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()

    // 提取模式名
    const schemaMatch = normalized.match(
      /CREATE\s+(?:OR\s+REPLACE\s+)?SCHEMA\s+(?:IF\s+NOT\s+EXISTS\s+)?([\w."`[\]]+)/i,
    )
    if (schemaMatch && schemaMatch[1]) {
      result.tableName = schemaMatch[1].replace(/["`[\]]/g, '')
    }

    return result
  }

  /**
   * 解析DROP SCHEMA语句
   */
  parseDropSchema(ddlStatement, result) {
    const normalized = ddlStatement
      .replace(/\r\n|\r|\n/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()

    // 提取模式名
    const schemaMatch = normalized.match(/DROP\s+SCHEMA\s+(?:IF\s+EXISTS\s+)?([\w."`[\]]+)/i)
    if (schemaMatch && schemaMatch[1]) {
      result.tableName = schemaMatch[1].replace(/["`[\]]/g, '')
    }

    result.details.cascade = /CASCADE/i.test(normalized)
    result.details.restrict = /RESTRICT/i.test(normalized)

    return result
  }

  /**
   * 解析CREATE DATABASE语句
   */
  parseCreateDatabase(ddlStatement, result) {
    const normalized = ddlStatement
      .replace(/\r\n|\r|\n/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()

    // 提取数据库名
    const dbMatch = normalized.match(/CREATE\s+DATABASE\s+(?:IF\s+NOT\s+EXISTS\s+)?([\w."`[\]]+)/i)
    if (dbMatch && dbMatch[1]) {
      result.tableName = dbMatch[1].replace(/["`[\]]/g, '')
    }

    return result
  }

  /**
   * 解析ALTER DATABASE语句
   */
  parseAlterDatabase(ddlStatement, result) {
    const normalized = ddlStatement
      .replace(/\r\n|\r|\n/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()

    // 提取数据库名
    const dbMatch = normalized.match(/ALTER\s+DATABASE\s+([\w."`[\]]+)/i)
    if (dbMatch && dbMatch[1]) {
      result.tableName = dbMatch[1].replace(/["`[\]]/g, '')
    }

    return result
  }

  /**
   * 解析DROP DATABASE语句
   */
  parseDropDatabase(ddlStatement, result) {
    const normalized = ddlStatement
      .replace(/\r\n|\r|\n/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()

    // 提取数据库名
    const dbMatch = normalized.match(/DROP\s+DATABASE\s+(?:IF\s+EXISTS\s+)?([\w."`[\]]+)/i)
    if (dbMatch && dbMatch[1]) {
      result.tableName = dbMatch[1].replace(/["`[\]]/g, '')
    }

    result.details.cascade = /CASCADE/i.test(normalized)
    result.details.restrict = /RESTRICT/i.test(normalized)

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
    const nameMatch = normalized.match(/^([\w."`[\]]+)/)
    if (!nameMatch) return null

    const fieldName = nameMatch[1].replace(/["`[\]]/g, '')

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
      fullDefinition: normalized,
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
        columns: primaryKeyMatch[1].split(',').map((col) => col.trim().replace(/["`[\]]/g, '')),
      })
    }

    // 唯一约束
    const uniqueMatches = ddlStatement.matchAll(/UNIQUE\s*\(([^)]+)\)/gi)
    for (const match of uniqueMatches) {
      constraints.push({
        type: 'UNIQUE',
        columns: match[1].split(',').map((col) => col.trim().replace(/["`[\]]/g, '')),
      })
    }

    // 外键约束
    const foreignKeyMatches = ddlStatement.matchAll(
      /FOREIGN\s+KEY\s*\(([^)]+)\)\s+REFERENCES\s+([\w."`[\]]+)\s*\(([^)]+)\)/gi,
    )
    for (const match of foreignKeyMatches) {
      constraints.push({
        type: 'FOREIGN_KEY',
        columns: match[1].split(',').map((col) => col.trim().replace(/["`[\]]/g, '')),
        referencedTable: match[2].replace(/["`[\]]/g, ''),
        referencedColumns: match[3].split(',').map((col) => col.trim().replace(/["`[\]]/g, '')),
      })
    }

    return constraints
  }

  /**
   * 提取索引信息
   */
  extractIndexes(ddlStatement) {
    const indexes = []

    const indexMatches = ddlStatement.matchAll(
      /(?:CREATE\s+)?(?:UNIQUE\s+)?INDEX\s+([\w."`[\]]+)\s+ON\s+([\w."`[\]]+)\s*\(([^)]+)\)/gi,
    )
    for (const match of indexMatches) {
      indexes.push({
        name: match[1].replace(/["`[\]]/g, ''),
        table: match[2].replace(/["`[\]]/g, ''),
        columns: match[3].split(',').map((col) => col.trim().replace(/["`[\]]/g, '')),
        unique: match[0].includes('UNIQUE'),
      })
    }

    return indexes
  }

  /**
   * 提取添加的列
   */
  extractAddedColumns(ddlStatement) {
    const columns = []
    const addMatches = ddlStatement.matchAll(
      /ADD\s+(?:COLUMN\s+)?([\w."`[\]]+)\s+(\w+(?:\([^)]*\))?)/gi,
    )

    for (const match of addMatches) {
      columns.push({
        name: match[1].replace(/["`[\]]/g, ''),
        type: match[2],
      })
    }

    return columns
  }

  /**
   * 提取删除的列
   */
  extractDroppedColumns(ddlStatement) {
    const columns = []
    const dropMatches = ddlStatement.matchAll(/DROP\s+(?:COLUMN\s+)?([\w."`[\]]+)/gi)

    for (const match of dropMatches) {
      columns.push(match[1].replace(/["`[\]]/g, ''))
    }

    return columns
  }

  /**
   * 提取修改的列
   */
  extractModifiedColumns(ddlStatement) {
    const columns = []
    const modifyMatches = ddlStatement.matchAll(
      /(?:MODIFY|ALTER)\s+(?:COLUMN\s+)?([\w."`[\]]+)\s+(\w+(?:\([^)]*\))?)/gi,
    )

    for (const match of modifyMatches) {
      columns.push({
        name: match[1].replace(/["`[\]]/g, ''),
        type: match[2],
      })
    }

    return columns
  }

  /**
   * 提取添加的约束
   */
  extractAddedConstraints(ddlStatement) {
    const constraints = []
    const constraintMatches = ddlStatement.matchAll(
      /ADD\s+CONSTRAINT\s+([\w."`[\]]+)\s+(PRIMARY\s+KEY|UNIQUE|FOREIGN\s+KEY)\s*\(([^)]+)\)/gi,
    )

    for (const match of constraintMatches) {
      constraints.push({
        name: match[1].replace(/["`[\]]/g, ''),
        type: match[2].toUpperCase(),
        columns: match[3].split(',').map((col) => col.trim().replace(/["`[\]]/g, '')),
      })
    }

    return constraints
  }

  /**
   * 提取删除的约束
   */
  extractDroppedConstraints(ddlStatement) {
    const constraints = []
    const dropMatches = ddlStatement.matchAll(/DROP\s+CONSTRAINT\s+([\w."`[\]]+)/gi)

    for (const match of dropMatches) {
      constraints.push(match[1].replace(/["`[\]]/g, ''))
    }

    return constraints
  }

  /**
   * 提取索引列
   */
  extractIndexColumns(ddlStatement) {
    const columnMatch = ddlStatement.match(/\(([^)]+)\)/)
    if (columnMatch) {
      return columnMatch[1].split(',').map((col) => col.trim().replace(/["`[\]]/g, ''))
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
    return Object.values(DdlStatementType).filter((type) => type !== DdlStatementType.UNKNOWN)
  }

  return {
    detectDdlType,
    parseDdl,
    getSupportedDdlTypes,
    DdlStatementType,
  }
}
