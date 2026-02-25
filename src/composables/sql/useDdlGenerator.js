/**
 * 多数据库DDL语句生成器
 * 支持MySQL、PostgreSQL、Oracle、SQL Server、达梦数据库等
 */

import { DdlStatementType } from './useDdlTypeParser.js'

/**
 * 数据库类型枚举
 */
export const DatabaseType = {
  MYSQL: 'mysql',
  POSTGRESQL: 'postgresql',
  ORACLE: 'oracle',
  SQLSERVER: 'sqlserver',
  DM: 'dm',
  UNKNOWN: 'unknown',
}

/**
 * DDL生成选项
 */
export class DdlGenerationOptions {
  constructor() {
    this.ifNotExists = false
    this.ifExists = false
    this.cascade = false
    this.restrict = false
    this.restartIdentity = false
    this.continueIdentity = false
    this.includeComments = true
    this.formatSql = true
    this.indentSpaces = 2
  }
}

/**
 * 多数据库DDL生成器
 */
export class DdlGenerator {
  constructor() {
    this.databaseSyntax = {
      [DatabaseType.MYSQL]: {
        quoteChar: '`',
        stringQuote: "'",
        commentSyntax: 'COMMENT',
        autoIncrementKeyword: 'AUTO_INCREMENT',
        identityKeyword: 'AUTO_INCREMENT',
        defaultSchema: '',
        dataTypes: {
          VARCHAR: 'VARCHAR',
          CHAR: 'CHAR',
          TEXT: 'TEXT',
          INT: 'INT',
          BIGINT: 'BIGINT',
          DECIMAL: 'DECIMAL',
          DATE: 'DATE',
          DATETIME: 'DATETIME',
          TIMESTAMP: 'TIMESTAMP',
          BOOLEAN: 'BOOLEAN',
        },
      },
      [DatabaseType.POSTGRESQL]: {
        quoteChar: '"',
        stringQuote: "'",
        commentSyntax: 'COMMENT',
        autoIncrementKeyword: 'SERIAL',
        identityKeyword: 'GENERATED ALWAYS AS IDENTITY',
        defaultSchema: 'public',
        dataTypes: {
          VARCHAR: 'VARCHAR',
          CHAR: 'CHAR',
          TEXT: 'TEXT',
          INT: 'INTEGER',
          BIGINT: 'BIGINT',
          DECIMAL: 'DECIMAL',
          DATE: 'DATE',
          DATETIME: 'TIMESTAMP',
          TIMESTAMP: 'TIMESTAMP',
          BOOLEAN: 'BOOLEAN',
        },
      },
      [DatabaseType.ORACLE]: {
        quoteChar: '"',
        stringQuote: "'",
        commentSyntax: 'COMMENT',
        autoIncrementKeyword: null,
        identityKeyword: 'GENERATED ALWAYS AS IDENTITY',
        defaultSchema: '',
        dataTypes: {
          VARCHAR: 'VARCHAR2',
          CHAR: 'CHAR',
          TEXT: 'CLOB',
          INT: 'NUMBER',
          BIGINT: 'NUMBER',
          DECIMAL: 'NUMBER',
          DATE: 'DATE',
          DATETIME: 'TIMESTAMP',
          TIMESTAMP: 'TIMESTAMP',
          BOOLEAN: 'NUMBER(1)',
        },
      },
      [DatabaseType.SQLSERVER]: {
        quoteChar: '[',
        stringQuote: "'",
        commentSyntax: null,
        autoIncrementKeyword: 'IDENTITY',
        identityKeyword: 'IDENTITY',
        defaultSchema: 'dbo',
        dataTypes: {
          VARCHAR: 'VARCHAR',
          CHAR: 'CHAR',
          TEXT: 'TEXT',
          INT: 'INT',
          BIGINT: 'BIGINT',
          DECIMAL: 'DECIMAL',
          DATE: 'DATE',
          DATETIME: 'DATETIME',
          TIMESTAMP: 'DATETIME2',
          BOOLEAN: 'BIT',
        },
      },
      [DatabaseType.DM]: {
        quoteChar: '"',
        stringQuote: "'",
        commentSyntax: 'COMMENT',
        autoIncrementKeyword: 'IDENTITY',
        identityKeyword: 'IDENTITY',
        defaultSchema: '',
        dataTypes: {
          VARCHAR: 'VARCHAR',
          CHAR: 'CHAR',
          TEXT: 'CLOB',
          INT: 'INT',
          BIGINT: 'BIGINT',
          DECIMAL: 'DECIMAL',
          DATE: 'DATE',
          DATETIME: 'DATETIME',
          TIMESTAMP: 'TIMESTAMP',
          BOOLEAN: 'BOOLEAN',
        },
      },
    }
  }

  /**
   * 生成DDL语句
   */
  generateDdl(ddlParseResult, targetDatabase, options = new DdlGenerationOptions()) {
    if (!ddlParseResult || !ddlParseResult.type) {
      throw new Error('无效的DDL解析结果')
    }

    if (!targetDatabase || !this.databaseSyntax[targetDatabase]) {
      throw new Error(`不支持的数据库类型: ${targetDatabase}`)
    }

    const syntax = this.databaseSyntax[targetDatabase]

    try {
      switch (ddlParseResult.type) {
        case DdlStatementType.CREATE_TABLE:
          return this.generateCreateTable(ddlParseResult, syntax, options)
        case DdlStatementType.ALTER_TABLE:
          return this.generateAlterTable(ddlParseResult, syntax, options)
        case DdlStatementType.DROP_TABLE:
          return this.generateDropTable(ddlParseResult, syntax, options)
        case DdlStatementType.TRUNCATE_TABLE:
          return this.generateTruncateTable(ddlParseResult, syntax, options)
        case DdlStatementType.CREATE_INDEX:
          return this.generateCreateIndex(ddlParseResult, syntax, options)
        case DdlStatementType.DROP_INDEX:
          return this.generateDropIndex(ddlParseResult, syntax, options)
        case DdlStatementType.CREATE_VIEW:
          return this.generateCreateView(ddlParseResult, syntax, options)
        case DdlStatementType.DROP_VIEW:
          return this.generateDropView(ddlParseResult, syntax, options)
        default:
          throw new Error(`不支持的DDL语句类型: ${ddlParseResult.type}`)
      }
    } catch (error) {
      throw new Error(`生成DDL语句失败: ${error.message}`)
    }
  }

  /**
   * 生成CREATE TABLE语句
   */
  generateCreateTable(parseResult, syntax, options) {
    const { tableName, details } = parseResult
    const { fields = [], constraints = [] } = details

    if (!tableName) {
      throw new Error('缺少表名')
    }

    let sql = 'CREATE TABLE '

    // IF NOT EXISTS
    if (options.ifNotExists) {
      sql += 'IF NOT EXISTS '
    }

    // 表名
    sql += this.quoteIdentifier(tableName, syntax)
    sql += ' (\n'

    // 字段定义
    const fieldDefinitions = fields.map((field) => {
      return this.generateFieldDefinition(field, syntax, options)
    })

    // 约束定义
    const constraintDefinitions = constraints.map((constraint) => {
      return this.generateConstraintDefinition(constraint, syntax)
    })

    // 合并所有定义
    const allDefinitions = [...fieldDefinitions, ...constraintDefinitions]

    // 格式化SQL
    if (options.formatSql) {
      const indent = ' '.repeat(options.indentSpaces)
      sql += allDefinitions.map((def) => indent + def).join(',\n')
    } else {
      sql += allDefinitions.join(', ')
    }

    sql += '\n)'

    // 添加表注释
    if (options.includeComments && parseResult.details.tableComment) {
      sql += `;\n${this.generateTableComment(tableName, parseResult.details.tableComment, syntax)}`
    }

    return sql
  }

  /**
   * 生成ALTER TABLE语句
   */
  generateAlterTable(parseResult, syntax, options) {
    const { tableName, details } = parseResult

    if (!tableName) {
      throw new Error('缺少表名')
    }

    let sql = `ALTER TABLE ${this.quoteIdentifier(tableName, syntax)}`

    const { operationType, columns = [], constraints = [] } = details

    switch (operationType) {
      case 'ADD_COLUMN':
        columns.forEach((column) => {
          sql += ` ADD ${this.generateFieldDefinition(column, syntax, options)}`
        })
        break
      case 'DROP_COLUMN':
        columns.forEach((column) => {
          sql += ` DROP COLUMN ${this.quoteIdentifier(column, syntax)}`
        })
        break
      case 'MODIFY_COLUMN':
        columns.forEach((column) => {
          sql += ` MODIFY ${this.generateFieldDefinition(column, syntax, options)}`
        })
        break
      case 'ADD_CONSTRAINT':
        constraints.forEach((constraint) => {
          sql += ` ADD ${this.generateConstraintDefinition(constraint, syntax)}`
        })
        break
      case 'DROP_CONSTRAINT':
        constraints.forEach((constraint) => {
          sql += ` DROP CONSTRAINT ${this.quoteIdentifier(constraint, syntax)}`
        })
        break
      default:
        throw new Error(`不支持的ALTER TABLE操作类型: ${operationType}`)
    }

    return sql
  }

  /**
   * 生成DROP TABLE语句
   */
  generateDropTable(parseResult, syntax, options) {
    const { tableName } = parseResult

    if (!tableName) {
      throw new Error('缺少表名')
    }

    let sql = 'DROP TABLE '

    // IF EXISTS
    if (options.ifExists) {
      sql += 'IF EXISTS '
    }

    // 表名
    sql += this.quoteIdentifier(tableName, syntax)

    // CASCADE/RESTRICT
    if (options.cascade) {
      sql += ' CASCADE'
    } else if (options.restrict) {
      sql += ' RESTRICT'
    }

    return sql
  }

  /**
   * 生成TRUNCATE TABLE语句
   */
  generateTruncateTable(parseResult, syntax, options) {
    const { tableName } = parseResult

    if (!tableName) {
      throw new Error('缺少表名')
    }

    let sql = 'TRUNCATE TABLE '
    sql += this.quoteIdentifier(tableName, syntax)

    // RESTART IDENTITY/CONTINUE IDENTITY
    if (options.restartIdentity) {
      sql += ' RESTART IDENTITY'
    } else if (options.continueIdentity) {
      sql += ' CONTINUE IDENTITY'
    }

    // CASCADE
    if (options.cascade) {
      sql += ' CASCADE'
    }

    return sql
  }

  /**
   * 生成CREATE INDEX语句
   */
  generateCreateIndex(parseResult, syntax) {
    const { tableName, details } = parseResult
    const { indexName, unique, columns = [] } = details

    if (!tableName || !indexName) {
      throw new Error('缺少表名或索引名')
    }

    let sql = 'CREATE '

    // UNIQUE
    if (unique) {
      sql += 'UNIQUE '
    }

    sql += `INDEX ${this.quoteIdentifier(indexName, syntax)} `
    sql += `ON ${this.quoteIdentifier(tableName, syntax)} `
    sql += `(${columns.map((col) => this.quoteIdentifier(col, syntax)).join(', ')})`

    return sql
  }

  /**
   * 生成DROP INDEX语句
   */
  generateDropIndex(parseResult, syntax, options) {
    const { tableName, details } = parseResult
    const { indexName } = details

    if (!indexName) {
      throw new Error('缺少索引名')
    }

    let sql = 'DROP INDEX '

    // IF EXISTS
    if (options.ifExists) {
      sql += 'IF EXISTS '
    }

    sql += this.quoteIdentifier(indexName, syntax)

    // 某些数据库需要指定表名
    if (tableName && syntax.quoteChar === '[') {
      // SQL Server
      sql += ` ON ${this.quoteIdentifier(tableName, syntax)}`
    }

    // CASCADE
    if (options.cascade) {
      sql += ' CASCADE'
    }

    return sql
  }

  /**
   * 生成CREATE VIEW语句
   */
  generateCreateView(parseResult, syntax) {
    const { tableName, details } = parseResult
    const { materialized, replace } = details

    if (!tableName) {
      throw new Error('缺少视图名')
    }

    let sql = 'CREATE '

    // OR REPLACE
    if (replace) {
      sql += 'OR REPLACE '
    }

    // MATERIALIZED
    if (materialized) {
      sql += 'MATERIALIZED '
    }

    sql += `VIEW ${this.quoteIdentifier(tableName, syntax)} `
    sql += 'AS <select_statement>' // 这里需要实际的SELECT语句

    return sql
  }

  /**
   * 生成DROP VIEW语句
   */
  generateDropView(parseResult, syntax, options) {
    const { tableName, details } = parseResult
    const { materialized } = details

    if (!tableName) {
      throw new Error('缺少视图名')
    }

    let sql = 'DROP '

    // MATERIALIZED
    if (materialized) {
      sql += 'MATERIALIZED '
    }

    sql += 'VIEW '

    // IF EXISTS
    if (options.ifExists) {
      sql += 'IF EXISTS '
    }

    sql += this.quoteIdentifier(tableName, syntax)

    // CASCADE
    if (options.cascade) {
      sql += ' CASCADE'
    }

    return sql
  }

  /**
   * 生成字段定义
   */
  generateFieldDefinition(field, syntax, options) {
    let definition = this.quoteIdentifier(field.name, syntax)

    // 数据类型
    const dataType = this.mapDataType(field.type, syntax)
    definition += ` ${dataType}`

    // 数据长度/精度（如果适用）
    if (field.length) {
      definition += `(${field.length}`
      if (field.precision) {
        definition += `,${field.precision}`
      }
      definition += ')'
    }

    // NOT NULL
    if (!field.nullable) {
      definition += ' NOT NULL'
    }

    // DEFAULT值
    if (field.defaultValue) {
      definition += ` DEFAULT ${this.quoteValue(field.defaultValue, syntax)}`
    }

    // AUTO_INCREMENT/IDENTITY
    if (field.autoIncrement) {
      if (syntax.autoIncrementKeyword) {
        definition += ` ${syntax.autoIncrementKeyword}`
      }
    }

    // PRIMARY KEY
    if (field.primaryKey) {
      definition += ' PRIMARY KEY'
    }

    // UNIQUE
    if (field.unique) {
      definition += ' UNIQUE'
    }

    // 注释
    if (options.includeComments && field.comment) {
      definition += ` ${this.generateFieldComment(field.name, field.comment, syntax)}`
    }

    return definition
  }

  /**
   * 生成约束定义
   */
  generateConstraintDefinition(constraint, syntax) {
    let definition = ''

    switch (constraint.type) {
      case 'PRIMARY_KEY':
        definition = `PRIMARY KEY (${constraint.columns.map((col) => this.quoteIdentifier(col, syntax)).join(', ')})`
        break
      case 'UNIQUE':
        definition = `UNIQUE (${constraint.columns.map((col) => this.quoteIdentifier(col, syntax)).join(', ')})`
        break
      case 'FOREIGN_KEY':
        definition = `FOREIGN KEY (${constraint.columns.map((col) => this.quoteIdentifier(col, syntax)).join(', ')}) `
        definition += `REFERENCES ${this.quoteIdentifier(constraint.referencedTable, syntax)} `
        definition += `(${constraint.referencedColumns.map((col) => this.quoteIdentifier(col, syntax)).join(', ')})`
        break
      default:
        throw new Error(`不支持的约束类型: ${constraint.type}`)
    }

    // 约束名
    if (constraint.name) {
      definition = `CONSTRAINT ${this.quoteIdentifier(constraint.name, syntax)} ${definition}`
    }

    return definition
  }

  /**
   * 生成字段注释
   */
  generateFieldComment(fieldName, comment, syntax) {
    if (!syntax.commentSyntax) return ''

    return `${syntax.commentSyntax} ON COLUMN ${this.quoteIdentifier(fieldName, syntax)} IS ${syntax.stringQuote}${comment}${syntax.stringQuote}`
  }

  /**
   * 生成表注释
   */
  generateTableComment(tableName, comment, syntax) {
    if (!syntax.commentSyntax) return ''

    return `${syntax.commentSyntax} ON TABLE ${this.quoteIdentifier(tableName, syntax)} IS ${syntax.stringQuote}${comment}${syntax.stringQuote}`
  }

  /**
   * 映射数据类型
   */
  mapDataType(sourceType, syntax) {
    const upperType = sourceType.toUpperCase()
    return syntax.dataTypes[upperType] || upperType
  }

  /**
   * 引用标识符
   */
  quoteIdentifier(identifier, syntax) {
    if (!identifier) return ''

    // 处理SQL Server的特殊情况
    if (syntax.quoteChar === '[') {
      return `[${identifier}]`
    }

    return `${syntax.quoteChar}${identifier}${syntax.quoteChar}`
  }

  /**
   * 引用值
   */
  quoteValue(value, syntax) {
    if (typeof value === 'number') {
      return value.toString()
    }

    return `${syntax.stringQuote}${value}${syntax.stringQuote}`
  }

  /**
   * 获取支持的数据库列表
   */
  getSupportedDatabases() {
    return Object.values(DatabaseType).filter((type) => type !== DatabaseType.UNKNOWN)
  }
}

/**
 * 使用DDL生成器的Composable函数
 */
export function useDdlGenerator() {
  const generator = new DdlGenerator()

  /**
   * 生成DDL语句
   */
  const generateDdl = (ddlParseResult, targetDatabase, options = {}) => {
    const generationOptions = Object.assign(new DdlGenerationOptions(), options)
    return generator.generateDdl(ddlParseResult, targetDatabase, generationOptions)
  }

  /**
   * 获取支持的数据库列表
   */
  const getSupportedDatabases = () => {
    return generator.getSupportedDatabases()
  }

  /**
   * 验证数据库类型
   */
  const validateDatabaseType = (databaseType) => {
    return generator.getSupportedDatabases().includes(databaseType)
  }

  return {
    generateDdl,
    getSupportedDatabases,
    validateDatabaseType,
    DatabaseType,
    DdlGenerationOptions,
  }
}
