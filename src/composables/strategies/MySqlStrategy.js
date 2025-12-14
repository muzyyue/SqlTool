import { DatabaseStrategy } from '../useDatabaseStrategy.js'

/**
 * MySQL数据库策略实现
 */
export class MySqlStrategy extends DatabaseStrategy {
  constructor() {
    super()
    this.databaseType = 'mysql'
    this.supportedVersions = ['5.6', '5.7', '8.0']
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
    console.log('=== MySQL DDL解析开始 ===')
    
    const result = {
      tableName: '',
      fields: [],
      indexes: [],
      constraints: [],
      databaseType: this.databaseType,
      version: this.detectVersion(ddlStatement)
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
      
      console.log('MySQL DDL解析成功:', result)
      return result
      
    } catch (error) {
      console.error('MySQL DDL解析失败:', error)
      throw error
    }
  }

  async convertDdl(ddlStatement, targetDatabaseType) {
    console.log(`将MySQL DDL转换为${targetDatabaseType}语法`)
    
    // 先解析MySQL DDL
    const parsedResult = await this.parseDdl(ddlStatement)
    
    // 然后根据目标数据库类型进行转换
    return this.convertParsedResult(parsedResult, targetDatabaseType)
  }

  async validateDdl(ddlStatement) {
    const errors = []
    
    // 基本语法验证
    if (!ddlStatement.toLowerCase().includes('create table')) {
      errors.push('DDL语句必须包含CREATE TABLE关键字')
    }
    
    // 表名验证
    const tableName = this.extractTableName(ddlStatement)
    if (!tableName) {
      errors.push('无法提取有效的表名')
    }
    
    // 字段验证
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
    
    // 检查是否在支持的版本范围内
    for (const supportedVersion of this.supportedVersions) {
      const [supportedMajor, supportedMinor] = supportedVersion.split('.').map(Number)
      
      if (major === supportedMajor && minor >= supportedMinor) {
        return { compatible: true, recommendedVersion: supportedVersion }
      }
    }
    
    return { 
      compatible: false, 
      recommendedVersion: this.supportedVersions[this.supportedVersions.length - 1],
      message: `MySQL ${version} 不在支持的版本范围内`
    }
  }

  // ========== 私有方法 ==========

  initDataTypeMappings() {
    return {
      // MySQL特有数据类型
      'TINYINT': 'SMALLINT',
      'MEDIUMINT': 'INTEGER',
      'YEAR': 'INTEGER',
      'ENUM': 'VARCHAR',
      'SET': 'VARCHAR',
      
      // 通用类型映射
      'INT': 'INTEGER',
      'INTEGER': 'INT',
      'VARCHAR': 'VARCHAR',
      'TEXT': 'TEXT',
      'DATETIME': 'TIMESTAMP',
      'TIMESTAMP': 'DATETIME'
    }
  }

  initKeywordMappings() {
    return {
      'AUTO_INCREMENT': 'GENERATED ALWAYS AS IDENTITY',
      'ENGINE=InnoDB': '',
      'CHARSET=utf8mb4': '',
      'COLLATE=utf8mb4_unicode_ci': '',
      'UNSIGNED': '',
      'ZEROFILL': ''
    }
  }

  extractTableName(ddlStatement) {
    const tableNameRegex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([\w\.`\[\]]+)/i
    const match = ddlStatement.match(tableNameRegex)
    
    if (match && match[1]) {
      // 移除反引号
      return match[1].replace(/`/g, '')
    }
    
    return ''
  }

  extractFieldDefinitions(ddlStatement) {
    const fields = []
    
    // 提取字段定义部分
    const fieldSectionMatch = ddlStatement.match(/CREATE\s+TABLE[^(]*\(([\s\S]*?)\)/i)
    if (!fieldSectionMatch) return fields
    
    const fieldSection = fieldSectionMatch[1]
    
    // 分割字段定义（处理逗号分隔，但排除括号内的逗号）
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
    // 跳过约束定义
    if (fieldDef.toUpperCase().startsWith('PRIMARY KEY') ||
        fieldDef.toUpperCase().startsWith('FOREIGN KEY') ||
        fieldDef.toUpperCase().startsWith('UNIQUE KEY') ||
        fieldDef.toUpperCase().startsWith('KEY') ||
        fieldDef.toUpperCase().startsWith('INDEX') ||
        fieldDef.toUpperCase().startsWith('CONSTRAINT')) {
      return null
    }
    
    const field = {
      name: '',
      type: '',
      nullable: true,
      defaultValue: null,
      isIdentity: false,
      comment: ''
    }
    
    // 提取字段名（第一个单词）
    const nameMatch = fieldDef.match(/^([\w`\[\]]+)/)
    if (nameMatch) {
      field.name = nameMatch[1].replace(/[`\[\]]/g, '')
    }
    
    // 提取数据类型
    const typeMatch = fieldDef.match(/\s+(\w+(?:\([^)]*\))?)/)
    if (typeMatch) {
      field.type = typeMatch[1].toUpperCase()
    }
    
    // 检查是否可为空
    field.nullable = !fieldDef.toUpperCase().includes('NOT NULL')
    
    // 检查自增属性
    field.isIdentity = fieldDef.toUpperCase().includes('AUTO_INCREMENT')
    
    // 提取默认值
    const defaultValueMatch = fieldDef.match(/DEFAULT\s+([^,\s]+)/i)
    if (defaultValueMatch) {
      field.defaultValue = defaultValueMatch[1]
    }
    
    // 提取注释
    const commentMatch = fieldDef.match(/COMMENT\s+'([^']*)'/i)
    if (commentMatch) {
      field.comment = commentMatch[1]
    }
    
    return field
  }

  extractIndexes(ddlStatement) {
    const indexes = []
    
    // 提取索引定义
    const indexRegex = /(?:UNIQUE\s+)?(?:KEY|INDEX)\s+([\w`\[\]]+)\s*\(([^)]+)\)/gi
    let match
    
    while ((match = indexRegex.exec(ddlStatement)) !== null) {
      indexes.push({
        name: match[1].replace(/[`\[\]]/g, ''),
        columns: match[2].split(',').map(col => col.trim().replace(/[`\[\]]/g, '')),
        unique: match[0].toUpperCase().includes('UNIQUE')
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
        columns: primaryKeyMatch[1].split(',').map(col => col.trim().replace(/[`\[\]]/g, ''))
      })
    }
    
    // 提取外键约束
    const foreignKeyRegex = /CONSTRAINT\s+([\w`\[\]]+)\s+FOREIGN\s+KEY\s*\(([^)]+)\)\s+REFERENCES\s+([\w`\[\]]+)\s*\(([^)]+)\)/gi
    let fkMatch
    
    while ((fkMatch = foreignKeyRegex.exec(ddlStatement)) !== null) {
      constraints.push({
        type: 'FOREIGN KEY',
        name: fkMatch[1].replace(/[`\[\]]/g, ''),
        columns: fkMatch[2].split(',').map(col => col.trim().replace(/[`\[\]]/g, '')),
        referenceTable: fkMatch[3].replace(/[`\[\]]/g, ''),
        referenceColumns: fkMatch[4].split(',').map(col => col.trim().replace(/[`\[\]]/g, ''))
      })
    }
    
    return constraints
  }

  detectVersion(ddlStatement) {
    // 通过语法特征检测MySQL版本
    if (ddlStatement.includes('GENERATED ALWAYS AS')) {
      return '8.0' // MySQL 8.0支持生成列
    }
    
    if (ddlStatement.includes('JSON')) {
      return '5.7' // MySQL 5.7开始支持JSON
    }
    
    return '5.6' // 默认版本
  }

  convertParsedResult(parsedResult, targetDatabaseType) {
    // 这里实现具体的转换逻辑
    // 由于时间关系，这里只返回基本结构
    return {
      original: parsedResult,
      converted: {
        tableName: parsedResult.tableName,
        databaseType: targetDatabaseType,
        fields: parsedResult.fields.map(field => ({
          ...field,
          type: this.mapDataType(field.type, targetDatabaseType)
        })),
        indexes: parsedResult.indexes,
        constraints: parsedResult.constraints
      }
    }
  }

  mapDataType(mysqlType, targetDb) {
    const mappings = {
      postgresql: {
        'TINYINT': 'SMALLINT',
        'MEDIUMINT': 'INTEGER',
        'YEAR': 'INTEGER',
        'DATETIME': 'TIMESTAMP',
        'AUTO_INCREMENT': 'SERIAL'
      },
      oracle: {
        'TINYINT': 'NUMBER(3)',
        'SMALLINT': 'NUMBER(5)',
        'INT': 'NUMBER(10)',
        'BIGINT': 'NUMBER(19)',
        'DATETIME': 'DATE',
        'AUTO_INCREMENT': 'NUMBER GENERATED ALWAYS AS IDENTITY'
      },
      sqlserver: {
        'TINYINT': 'TINYINT',
        'INT': 'INT',
        'BIGINT': 'BIGINT',
        'DATETIME': 'DATETIME2',
        'AUTO_INCREMENT': 'IDENTITY(1,1)'
      }
    }
    
    return mappings[targetDb]?.[mysqlType] || mysqlType
  }
}