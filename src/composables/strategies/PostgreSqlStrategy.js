import { DatabaseStrategy } from '../useDatabaseStrategy.js'

/**
 * PostgreSQL数据库策略实现
 */
export class PostgreSqlStrategy extends DatabaseStrategy {
  constructor() {
    super()
    this.databaseType = 'postgresql'
    this.supportedVersions = ['9.6', '10', '11', '12', '13', '14', '15']
    this.dataTypeMappings = this.initDataTypeMappings()
    this.keywordMappings = this.initKeywordMappings()
  }

  getDatabaseType() {
    return this.databaseType
  }

  getSupportedVersions() {
    return this.supportedVersions
  }

  async parseDdl(ddlStatement) {
    console.log('=== PostgreSQL DDL解析开始 ===')

    const result = {
      tableName: '',
      fields: [],
      indexes: [],
      constraints: [],
      databaseType: this.databaseType,
      version: this.detectVersion(ddlStatement),
    }

    try {
      // 1. 提取表名
      result.tableName = this.extractTableName(ddlStatement)

      // 2. 提取字段定义
      result.fields = this.extractFieldDefinitions(ddlStatement)

      // 3. 提取索引
      result.indexes = this.extractIndexes(ddlStatement)

      // 4. 提取约束
      result.constraints = this.extractConstraints(ddlStatement)

      console.log('PostgreSQL DDL解析成功:', result)
      return result
    } catch (error) {
      console.error('PostgreSQL DDL解析失败:', error)
      throw error
    }
  }

  async convertDdl(ddlStatement, targetDatabaseType) {
    console.log(`将PostgreSQL DDL转换为${targetDatabaseType}语法`)

    const parsedResult = await this.parseDdl(ddlStatement)
    return this.convertParsedResult(parsedResult, targetDatabaseType)
  }

  async validateDdl(ddlStatement) {
    const errors = []

    if (!ddlStatement.toLowerCase().includes('create table')) {
      errors.push('DDL语句必须包含CREATE TABLE关键字')
    }

    const tableName = this.extractTableName(ddlStatement)
    if (!tableName) {
      errors.push('无法提取有效的表名')
    }

    const fields = this.extractFieldDefinitions(ddlStatement)
    if (fields.length === 0) {
      errors.push('未找到有效的字段定义')
    }

    return errors.length === 0 ? { valid: true } : { valid: false, errors }
  }

  getDataTypeMappings() {
    return this.dataTypeMappings
  }

  getKeywordMappings() {
    return this.keywordMappings
  }

  checkVersionCompatibility(version) {
    const [major, minor] = version.split('.').map(Number)

    for (const supportedVersion of this.supportedVersions) {
      const [supportedMajor, supportedMinor] = supportedVersion.split('.').map(Number)

      if (major === supportedMajor && minor >= supportedMinor) {
        return { compatible: true, recommendedVersion: supportedVersion }
      }
    }

    return {
      compatible: false,
      recommendedVersion: this.supportedVersions[this.supportedVersions.length - 1],
      message: `PostgreSQL ${version} 不在支持的版本范围内`,
    }
  }

  // ========== 私有方法 ==========

  initDataTypeMappings() {
    return {
      // PostgreSQL特有数据类型
      SERIAL: 'INTEGER',
      BIGSERIAL: 'BIGINT',
      SMALLSERIAL: 'SMALLINT',
      MONEY: 'DECIMAL',
      BYTEA: 'BLOB',
      JSONB: 'JSON',

      // 通用类型映射
      INT: 'INTEGER',
      INTEGER: 'INT',
      VARCHAR: 'VARCHAR',
      TEXT: 'TEXT',
      TIMESTAMP: 'DATETIME',
    }
  }

  initKeywordMappings() {
    return {
      'GENERATED ALWAYS AS IDENTITY': 'AUTO_INCREMENT',
      'USING INDEX TABLESPACE': '',
      'WITH OIDS': '',
      TABLESPACE: '',
    }
  }

  extractTableName(ddlStatement) {
    const tableNameRegex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([\w."]+)/i
    const match = ddlStatement.match(tableNameRegex)

    if (match && match[1]) {
      return match[1].replace(/"/g, '')
    }

    return ''
  }

  extractFieldDefinitions(ddlStatement) {
    const fields = []

    const fieldSectionMatch = ddlStatement.match(/CREATE\s+TABLE[^(]*\(([\s\S]*?)\)(?:\s*;)?$/i)
    if (!fieldSectionMatch) return fields

    const fieldSection = fieldSectionMatch[1]
    const fieldDefinitions = this.splitFieldDefinitions(fieldSection)

    for (const fieldDef of fieldDefinitions) {
      const field = this.parseFieldDefinition(fieldDef)
      if (field) {
        fields.push(field)
      }
    }

    return fields
  }

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

  parseFieldDefinition(fieldDef) {
    if (
      fieldDef.toUpperCase().startsWith('PRIMARY KEY') ||
      fieldDef.toUpperCase().startsWith('FOREIGN KEY') ||
      fieldDef.toUpperCase().startsWith('UNIQUE') ||
      fieldDef.toUpperCase().startsWith('CONSTRAINT') ||
      fieldDef.toUpperCase().startsWith('CHECK')
    ) {
      return null
    }

    const hasDataType = /\s+(\w+(?:\([^)]*\))?)/.test(fieldDef)
    if (!hasDataType) {
      return null
    }

    const field = {
      name: '',
      type: '',
      nullable: true,
      defaultValue: null,
      isIdentity: false,
      primaryKey: false,
      comment: '',
    }

    const nameMatch = fieldDef.match(/^([\w"]+)/)
    if (nameMatch) {
      field.name = nameMatch[1].replace(/"/g, '')
    } else {
      return null
    }

    const typeMatch = fieldDef.match(/\s+(\w+(?:\([^)]*\))?)/)
    if (typeMatch) {
      field.type = typeMatch[1].toUpperCase()
    }

    field.nullable = !fieldDef.toUpperCase().includes('NOT NULL')

    field.isIdentity =
      fieldDef.toUpperCase().includes('SERIAL') ||
      fieldDef.toUpperCase().includes('GENERATED ALWAYS AS IDENTITY')

    const defaultValueMatch = fieldDef.match(
      /DEFAULT\s+([^,\s)]+?)(?:\s+(?:NOT NULL|PRIMARY KEY|UNIQUE|COLLATE|$))/i,
    )
    if (defaultValueMatch) {
      field.defaultValue = defaultValueMatch[1].trim()
    }

    const commentMatch = fieldDef.match(/COMMENT\s+'([^']*)'/i)
    if (commentMatch) {
      field.comment = commentMatch[1]
    }

    return field
  }

  extractIndexes(ddlStatement) {
    const indexes = []

    // 提取索引定义
    const indexRegex = /CREATE\s+(?:UNIQUE\s+)?INDEX\s+([\w"]+)\s+ON\s+[\w"]+\s*\(([^)]+)\)/gi
    let match

    while ((match = indexRegex.exec(ddlStatement)) !== null) {
      indexes.push({
        name: match[1].replace(/"/g, ''),
        columns: match[2].split(',').map((col) => col.trim().replace(/"/g, '')),
        unique: match[0].toUpperCase().includes('UNIQUE'),
      })
    }

    return indexes
  }

  extractConstraints(ddlStatement) {
    const constraints = []

    // 提取主键约束（增强版，支持多种语法）
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

  detectVersion(ddlStatement) {
    // 通过语法特征检测PostgreSQL版本
    if (ddlStatement.includes('GENERATED ALWAYS AS IDENTITY')) {
      return '10' // PostgreSQL 10开始支持IDENTITY列
    }

    if (ddlStatement.includes('JSONB')) {
      return '9.4' // PostgreSQL 9.4开始支持JSONB
    }

    return '9.6' // 默认版本
  }

  convertParsedResult(parsedResult, targetDatabaseType) {
    return {
      original: parsedResult,
      converted: {
        tableName: parsedResult.tableName,
        databaseType: targetDatabaseType,
        fields: parsedResult.fields.map((field) => ({
          ...field,
          type: this.mapDataType(field.type, targetDatabaseType),
        })),
        indexes: parsedResult.indexes,
        constraints: parsedResult.constraints,
      },
    }
  }

  mapDataType(postgresType, targetDb) {
    const mappings = {
      mysql: {
        SERIAL: 'INT AUTO_INCREMENT',
        BIGSERIAL: 'BIGINT AUTO_INCREMENT',
        SMALLSERIAL: 'SMALLINT AUTO_INCREMENT',
        BYTEA: 'BLOB',
        MONEY: 'DECIMAL(19,4)',
        TIMESTAMP: 'DATETIME',
      },
      oracle: {
        SERIAL: 'NUMBER GENERATED ALWAYS AS IDENTITY',
        BIGSERIAL: 'NUMBER GENERATED ALWAYS AS IDENTITY',
        SMALLSERIAL: 'NUMBER GENERATED ALWAYS AS IDENTITY',
        BYTEA: 'BLOB',
        MONEY: 'NUMBER(19,4)',
        TIMESTAMP: 'DATE',
      },
      sqlserver: {
        SERIAL: 'INT IDENTITY(1,1)',
        BIGSERIAL: 'BIGINT IDENTITY(1,1)',
        SMALLSERIAL: 'SMALLINT IDENTITY(1,1)',
        BYTEA: 'VARBINARY(MAX)',
        MONEY: 'MONEY',
        TIMESTAMP: 'DATETIME2',
      },
    }

    return mappings[targetDb]?.[postgresType] || postgresType
  }
}
