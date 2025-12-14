import { DatabaseStrategy } from '../useDatabaseStrategy.js'

/**
 * Oracle数据库策略实现
 */
export class OracleStrategy extends DatabaseStrategy {
  constructor() {
    super()
    this.databaseType = 'oracle'
    this.supportedVersions = ['11g', '12c', '18c', '19c', '21c']
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
    console.log('=== Oracle DDL解析开始 ===')

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

      console.log('Oracle DDL解析成功:', result)
      return result
    } catch (error) {
      console.error('Oracle DDL解析失败:', error)
      throw error
    }
  }

  async convertDdl(ddlStatement, targetDatabaseType) {
    console.log(`将Oracle DDL转换为${targetDatabaseType}语法`)

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
    // Oracle版本格式特殊处理
    const versionMap = {
      '11g': 11,
      '12c': 12,
      '18c': 18,
      '19c': 19,
      '21c': 21,
    }

    const currentVersion = versionMap[version] || parseInt(version)

    for (const supportedVersion of this.supportedVersions) {
      const supportedVersionNum = versionMap[supportedVersion] || parseInt(supportedVersion)

      if (currentVersion >= supportedVersionNum) {
        return { compatible: true, recommendedVersion: supportedVersion }
      }
    }

    return {
      compatible: false,
      recommendedVersion: this.supportedVersions[this.supportedVersions.length - 1],
      message: `Oracle ${version} 不在支持的版本范围内`,
    }
  }

  // ========== 私有方法 ==========

  initDataTypeMappings() {
    return {
      // Oracle特有数据类型
      NUMBER: 'DECIMAL',
      VARCHAR2: 'VARCHAR',
      NVARCHAR2: 'NVARCHAR',
      CLOB: 'TEXT',
      BLOB: 'BLOB',
      RAW: 'VARBINARY',
      'LONG RAW': 'VARBINARY(MAX)',
      ROWID: 'VARCHAR(18)',
      UROWID: 'VARCHAR(4000)',

      // 通用类型映射
      INT: 'NUMBER',
      INTEGER: 'NUMBER',
      DATE: 'TIMESTAMP',
      TIMESTAMP: 'DATETIME',
    }
  }

  initKeywordMappings() {
    return {
      TABLESPACE: '',
      PCTFREE: '',
      PCTUSED: '',
      INITRANS: '',
      MAXTRANS: '',
      STORAGE: '',
      LOB: '',
      ENABLE: '',
      DISABLE: '',
    }
  }

  extractTableName(ddlStatement) {
    const tableNameRegex = /CREATE\s+(?:GLOBAL\s+TEMPORARY\s+)?TABLE\s+(?:\w+\.)?([\w"]+)/i
    const match = ddlStatement.match(tableNameRegex)

    if (match && match[1]) {
      return match[1].replace(/"/g, '')
    }

    return ''
  }

  extractFieldDefinitions(ddlStatement) {
    const fields = []

    // 提取字段定义部分 - 匹配到最后一个右括号
    const fieldSectionMatch = ddlStatement.match(/CREATE\s+TABLE[^(]*\(([\s\S]*)\)[^)]*$/i)
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
    // 检查是否是纯约束定义（不是字段定义）
    const trimmedDef = fieldDef.trim()
    if (
      trimmedDef.toUpperCase().startsWith('PRIMARY KEY') ||
      trimmedDef.toUpperCase().startsWith('FOREIGN KEY') ||
      trimmedDef.toUpperCase().startsWith('UNIQUE') ||
      trimmedDef.toUpperCase().startsWith('CONSTRAINT')
    ) {
      return null
    }

    const field = {
      name: '',
      type: '',
      nullable: true,
      defaultValue: null,
      isIdentity: false,
      comment: '',
    }

    // 提取字段名（从字段定义的开头提取，直到遇到空格或括号）
    const nameMatch = trimmedDef.match(/^([\w"]+)/)
    if (nameMatch) {
      field.name = nameMatch[1].replace(/"/g, '')
    }

    // 提取数据类型（处理Oracle的NUMBER(p,s)格式）
    // 跳过字段名部分，然后提取数据类型
    const afterName = trimmedDef.substring(field.name.length).trim()
    const typeMatch = afterName.match(/^(\w+(?:\([^)]*\))?)/)
    if (typeMatch) {
      field.type = typeMatch[1].toUpperCase()
    }

    // 检查是否可为空
    field.nullable = !trimmedDef.toUpperCase().includes('NOT NULL')

    // 检查自增属性（Oracle 12c+支持IDENTITY）
    // 支持多种Oracle自增语法：GENERATED ALWAYS AS IDENTITY, GENERATED BY DEFAULT AS IDENTITY, GENERATED ... AS IDENTITY
    const upperDef = trimmedDef.toUpperCase()
    field.isIdentity = upperDef.includes('GENERATED') && upperDef.includes('AS IDENTITY')

    // 提取默认值
    const defaultValueMatch = trimmedDef.match(/DEFAULT\s+([^,\s]+)/i)
    if (defaultValueMatch) {
      field.defaultValue = defaultValueMatch[1]
    }

    // 提取注释
    const commentMatch = trimmedDef.match(/COMMENT\s+'([^']*)'/i)
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

    // 提取主键约束
    const primaryKeyMatch = ddlStatement.match(/PRIMARY\s+KEY\s*\(([^)]+)\)/i)
    if (primaryKeyMatch) {
      constraints.push({
        type: 'PRIMARY KEY',
        columns: primaryKeyMatch[1].split(',').map((col) => col.trim().replace(/"/g, '')),
      })
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

    // 提取检查约束
    const checkRegex = /CONSTRAINT\s+([\w"]+)\s+CHECK\s*\(([^)]+)\)/gi
    let checkMatch

    while ((checkMatch = checkRegex.exec(ddlStatement)) !== null) {
      constraints.push({
        type: 'CHECK',
        name: checkMatch[1].replace(/"/g, ''),
        condition: checkMatch[2].trim(),
      })
    }

    return constraints
  }

  detectVersion(ddlStatement) {
    // 通过语法特征检测Oracle版本
    if (ddlStatement.includes('GENERATED ALWAYS AS IDENTITY')) {
      return '12c' // Oracle 12c开始支持IDENTITY列
    }

    if (ddlStatement.includes('JSON')) {
      return '12c' // Oracle 12c开始支持JSON
    }

    if (ddlStatement.includes('GLOBAL TEMPORARY')) {
      return '11g' // Oracle 11g支持全局临时表
    }

    return '11g' // 默认版本
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

  mapDataType(oracleType, targetDb) {
    const mappings = {
      mysql: {
        NUMBER: 'DECIMAL',
        VARCHAR2: 'VARCHAR',
        NVARCHAR2: 'NVARCHAR',
        CLOB: 'LONGTEXT',
        RAW: 'VARBINARY',
        'LONG RAW': 'LONGBLOB',
        DATE: 'DATETIME',
        TIMESTAMP: 'DATETIME',
      },
      postgresql: {
        NUMBER: 'NUMERIC',
        VARCHAR2: 'VARCHAR',
        NVARCHAR2: 'VARCHAR',
        CLOB: 'TEXT',
        RAW: 'BYTEA',
        'LONG RAW': 'BYTEA',
        DATE: 'TIMESTAMP',
        TIMESTAMP: 'TIMESTAMP',
      },
      sqlserver: {
        NUMBER: 'DECIMAL',
        VARCHAR2: 'VARCHAR',
        NVARCHAR2: 'NVARCHAR',
        CLOB: 'VARCHAR(MAX)',
        RAW: 'VARBINARY',
        'LONG RAW': 'VARBINARY(MAX)',
        DATE: 'DATETIME2',
        TIMESTAMP: 'DATETIME2',
      },
    }

    return mappings[targetDb]?.[oracleType] || oracleType
  }
}
