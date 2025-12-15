import { DatabaseStrategy } from '../useDatabaseStrategy.js'

/**
 * 达梦数据库（DM Database）策略实现
 * 包含数据库连接管理、安全控制、审计机制等完整功能
 */
export class DmDatabaseStrategy extends DatabaseStrategy {
  constructor() {
    super()
    this.databaseType = 'dm'
    this.supportedVersions = ['7.0', '8.0', '8.1']
    this.dataTypeMappings = this.initDataTypeMappings()
    this.keywordMappings = this.initKeywordMappings()
    this.securityConfig = this.initSecurityConfig()
    this.auditConfig = this.initAuditConfig()
  }

  getDatabaseType() {
    return this.databaseType
  }

  getSupportedVersions() {
    return this.supportedVersions
  }

  async parseDdl(ddlStatement) {
    console.log('=== 达梦数据库 DDL 解析开始 ===')

    const result = {
      tableName: '',
      fields: [],
      indexes: [],
      constraints: [],
      databaseType: this.databaseType,
      version: this.detectVersion(ddlStatement),
      securityLevel: this.analyzeSecurityLevel(ddlStatement),
    }

    try {
      // 1. 安全验证
      await this.validateSecurity(ddlStatement)

      // 2. 提取表名
      result.tableName = this.extractTableName(ddlStatement)

      // 3. 提取字段定义
      result.fields = this.extractFieldDefinitions(ddlStatement)

      // 4. 提取索引
      result.indexes = this.extractIndexes(ddlStatement)

      // 5. 提取约束
      result.constraints = this.extractConstraints(ddlStatement)

      // 6. 记录审计日志
      await this.logAudit('DDL_PARSE', ddlStatement, result)

      console.log('达梦数据库 DDL 解析成功:', result)
      return result
    } catch (error) {
      // 记录错误审计日志
      await this.logAudit('DDL_PARSE_ERROR', ddlStatement, { error: error.message })
      console.error('达梦数据库 DDL 解析失败:', error)
      throw error
    }
  }

  async convertDdl(ddlStatement, targetDatabaseType) {
    console.log(`将达梦数据库 DDL 转换为 ${targetDatabaseType} 语法`)

    // 先解析达梦数据库 DDL
    const parsedResult = await this.parseDdl(ddlStatement)

    // 然后根据目标数据库类型进行转换
    return this.convertParsedResult(parsedResult, targetDatabaseType)
  }

  async validateDdl(ddlStatement) {
    const errors = []

    // 基本语法验证
    if (!ddlStatement.toLowerCase().includes('create table')) {
      errors.push('DDL 语句必须包含 CREATE TABLE 关键字')
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

    // 安全验证
    const securityErrors = await this.validateSecurity(ddlStatement)
    errors.push(...securityErrors)

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
      message: `达梦数据库 ${version} 不在支持的版本范围内`,
    }
  }

  // ========== 安全控制方法 ==========

  /**
   * 初始化安全配置
   */
  initSecurityConfig() {
    return {
      // 敏感操作限制
      sensitiveOperations: ['DROP', 'TRUNCATE', 'ALTER'],

      // 权限级别
      permissionLevels: {
        READ_ONLY: 1,
        READ_WRITE: 2,
        ADMIN: 3,
      },

      // 连接安全配置
      connectionSecurity: {
        maxConnections: 100,
        idleTimeout: 1800, // 30分钟
        passwordExpiry: 90, // 90天
        failedLoginAttempts: 5,
      },

      // 数据加密配置
      encryption: {
        enabled: true,
        algorithm: 'AES256',
        keyRotation: 30, // 30天
      },
    }
  }

  /**
   * 初始化审计配置
   */
  initAuditConfig() {
    return {
      // 审计级别
      auditLevels: {
        NONE: 0,
        BASIC: 1,
        DETAILED: 2,
        ALL: 3,
      },

      // 审计事件
      auditEvents: [
        'DDL_PARSE',
        'DDL_CONVERT',
        'SECURITY_VIOLATION',
        'CONNECTION_ATTEMPT',
        'PERMISSION_CHANGE',
      ],

      // 审计保留策略
      retention: {
        enabled: true,
        days: 365,
        maxSize: '10GB',
      },
    }
  }

  /**
   * 验证DDL语句安全性
   */
  async validateSecurity(ddlStatement) {
    const errors = []
    const upperDdl = ddlStatement.toUpperCase()

    // 检查敏感操作
    for (const operation of this.securityConfig.sensitiveOperations) {
      if (upperDdl.includes(operation)) {
        errors.push(`检测到敏感操作: ${operation}，需要管理员权限`)
      }
    }

    // 检查表名安全性（防止SQL注入）
    const tableName = this.extractTableName(ddlStatement)
    if (tableName && !this.isValidIdentifier(tableName)) {
      errors.push('表名包含非法字符，可能存在安全风险')
    }

    // 检查字段名安全性
    const fields = this.extractFieldDefinitions(ddlStatement)
    for (const field of fields) {
      if (!this.isValidIdentifier(field.name)) {
        errors.push(`字段名 "${field.name}" 包含非法字符`)
      }
    }

    return errors
  }

  /**
   * 分析DDL语句的安全级别
   */
  analyzeSecurityLevel(ddlStatement) {
    let securityLevel = 'LOW'
    const upperDdl = ddlStatement.toUpperCase()

    if (upperDdl.includes('DROP') || upperDdl.includes('TRUNCATE')) {
      securityLevel = 'HIGH'
    } else if (upperDdl.includes('ALTER') || upperDdl.includes('GRANT')) {
      securityLevel = 'MEDIUM'
    }

    return securityLevel
  }

  /**
   * 记录审计日志
   */
  async logAudit(eventType, ddlStatement, result) {
    const auditLog = {
      timestamp: new Date().toISOString(),
      eventType,
      ddlStatement: this.maskSensitiveData(ddlStatement),
      result: this.maskSensitiveData(JSON.stringify(result)),
      user: 'system', // 实际应用中应从会话中获取
      ipAddress: '127.0.0.1', // 实际应用中应从请求中获取
      securityLevel: this.analyzeSecurityLevel(ddlStatement),
    }

    // 在实际应用中，这里应该将审计日志写入数据库或文件系统
    console.log('审计日志:', auditLog)

    return auditLog
  }

  /**
   * 掩码敏感数据
   */
  maskSensitiveData(data) {
    // 在实际应用中，这里应该实现更复杂的敏感数据掩码逻辑
    return data.replace(/password=['"][^'"]*['"]/gi, "password='***'")
  }

  /**
   * 验证标识符合法性
   */
  isValidIdentifier(identifier) {
    // 达梦数据库标识符命名规则
    const validIdentifierRegex = /^[a-zA-Z_][a-zA-Z0-9_]*$/
    return validIdentifierRegex.test(identifier)
  }

  // ========== 达梦数据库特有数据类型映射 ==========

  initDataTypeMappings() {
    return {
      // 达梦数据库特有数据类型
      BINARY: 'BLOB',
      VARBINARY: 'BLOB',
      LONGVARBINARY: 'BLOB',
      IMAGE: 'BLOB',
      CLOB: 'TEXT',
      NCLOB: 'TEXT',
      BFILE: 'BLOB',
      RAW: 'BLOB',
      'LONG RAW': 'BLOB',
      ROWID: 'VARCHAR',
      UROWID: 'VARCHAR',
      NUMBER: 'NUMERIC',
      DECIMAL: 'NUMERIC',
      NUMERIC: 'NUMERIC',
      FLOAT: 'REAL',
      REAL: 'REAL',
      DOUBLE: 'DOUBLE PRECISION',
      DATE: 'DATE',
      TIME: 'TIME',
      TIMESTAMP: 'TIMESTAMP',
      'TIMESTAMP WITH TIME ZONE': 'TIMESTAMP WITH TIME ZONE',
      'TIMESTAMP WITH LOCAL TIME ZONE': 'TIMESTAMP',
      'INTERVAL YEAR TO MONTH': 'VARCHAR',
      'INTERVAL DAY TO SECOND': 'VARCHAR',
      BOOLEAN: 'BOOLEAN',
      XMLTYPE: 'XML',

      // 字符串类型
      CHAR: 'CHAR',
      VARCHAR: 'VARCHAR',
      VARCHAR2: 'VARCHAR',
      NCHAR: 'NCHAR',
      NVARCHAR: 'NVARCHAR',
      NVARCHAR2: 'NVARCHAR',
      LONG: 'TEXT',
      'LONG VARCHAR': 'TEXT',

      // 通用类型映射
      INT: 'INTEGER',
      INTEGER: 'INT',
      SMALLINT: 'SMALLINT',
      BIGINT: 'BIGINT',
      TINYINT: 'SMALLINT',
      TEXT: 'TEXT',
      BLOB: 'BLOB',
    }
  }

  initKeywordMappings() {
    return {
      // 达梦数据库特有关键字
      TABLESPACE: '',
      STORAGE: '',
      PCTFREE: '',
      PCTUSED: '',
      INITRANS: '',
      MAXTRANS: '',
      COMPRESS: '',
      LOGGING: '',
      NOLOGGING: '',
      PARALLEL: '',
      CACHE: '',
      NOCACHE: '',
      MONITORING: '',
      ENABLE: '',
      DISABLE: '',
      VALIDATE: '',
      NOVALIDATE: '',
      RELY: '',
      NORELY: '',

      // 约束相关
      CONSTRAINT: 'CONSTRAINT',
      'PRIMARY KEY': 'PRIMARY KEY',
      'FOREIGN KEY': 'FOREIGN KEY',
      UNIQUE: 'UNIQUE',
      CHECK: 'CHECK',
      'NOT NULL': 'NOT NULL',
      DEFAULT: 'DEFAULT',
    }
  }

  // ========== DDL解析核心方法 ==========

  extractTableName(ddlStatement) {
    const tableNameRegex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([\w.`[\]]+)/i
    const match = ddlStatement.match(tableNameRegex)

    if (match && match[1]) {
      // 移除反引号
      return match[1].replace(/`/g, '')
    }

    return ''
  }

  extractFieldDefinitions(ddlStatement) {
    const fields = []

    // 提取字段定义部分 - 匹配到最后一个右括号
    const fieldSectionMatch = ddlStatement.match(/CREATE\s+TABLE[^(]*\(([\s\S]*)\)[^)]*$/i)
    if (!fieldSectionMatch) return fields

    const fieldSection = fieldSectionMatch[1]

    // 分割字段定义
    const fieldDefinitions = this.splitFieldDefinitions(fieldSection)

    // 调试信息：打印分割后的字段定义
    console.log('分割后的字段定义:', fieldDefinitions)

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
    let inQuotes = false
    let quoteChar = ''

    console.log('原始字段定义部分:', fieldSection)

    for (let i = 0; i < fieldSection.length; i++) {
      const char = fieldSection[i]

      // 处理引号
      if ((char === '"' || char === "'") && !inQuotes) {
        inQuotes = true
        quoteChar = char
      } else if (char === quoteChar && inQuotes) {
        inQuotes = false
        quoteChar = ''
      }

      // 只有在不在引号内时才处理括号
      if (!inQuotes) {
        if (char === '(') {
          parenDepth++
          console.log(`位置 ${i}: 遇到 '('，括号深度增加到 ${parenDepth}`)
        } else if (char === ')') {
          parenDepth--
          console.log(`位置 ${i}: 遇到 ')'，括号深度减少到 ${parenDepth}`)
        }
      }

      // 只有在括号深度为0且不在引号内时才分割字段
      if (char === ',' && parenDepth === 0 && !inQuotes) {
        console.log(`位置 ${i}: 遇到 ','，分割字段: "${currentDef.trim()}"`)
        if (currentDef.trim()) {
          definitions.push(currentDef.trim())
        }
        currentDef = ''
      } else {
        currentDef += char
      }
    }

    if (currentDef.trim()) {
      console.log(`最后剩余字段: "${currentDef.trim()}"`)
      definitions.push(currentDef.trim())
    }

    console.log('最终分割结果:', definitions)
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
      length: null,
      nullable: true,
      defaultValue: null,
      isIdentity: false,
      comment: '',
    }

    // 提取字段名
    const nameMatch = trimmedDef.match(/^([\w]+)/)
    if (nameMatch) {
      field.name = nameMatch[1]
    }

    // 提取数据类型和长度
    const typeMatch = trimmedDef.match(/\b(\w+)(?:\((\d+(?:,\s*\d+)*)\))?/i)
    if (typeMatch) {
      field.type = typeMatch[1].toUpperCase()
      if (typeMatch[2]) {
        field.length = typeMatch[2]
      }
    }

    // 检查是否允许NULL
    if (trimmedDef.toUpperCase().includes('NOT NULL')) {
      field.nullable = false
    }

    // 检查自增属性（达梦数据库使用IDENTITY）
    field.isIdentity = trimmedDef.toUpperCase().includes('IDENTITY')

    // 提取默认值
    const defaultMatch = trimmedDef.match(/DEFAULT\s+([^,\s]+)/i)
    if (defaultMatch) {
      field.defaultValue = defaultMatch[1]
    }

    // 提取注释
    const commentMatch = trimmedDef.match(/COMMENT\s+['"]([^'"]*)['"]/i)
    if (commentMatch) {
      field.comment = commentMatch[1]
    }

    return field.name ? field : null
  }

  extractIndexes(ddlStatement) {
    const indexes = []
    const indexRegex =
      /(?:CREATE\s+(?:UNIQUE\s+)?INDEX\s+[^(]*\([^)]*\)|,\s*(?:UNIQUE\s+)?\([^)]*\))/gi
    const matches = ddlStatement.match(indexRegex) || []

    for (const match of matches) {
      const index = {
        name: '',
        columns: [],
        unique: match.toUpperCase().includes('UNIQUE'),
        type: 'BTREE',
      }

      // 提取索引名
      const nameMatch = match.match(/INDEX\s+(\w+)/i)
      if (nameMatch) {
        index.name = nameMatch[1]
      }

      // 提取列名
      const columnsMatch = match.match(/\(([^)]+)\)/)
      if (columnsMatch) {
        index.columns = columnsMatch[1].split(',').map((col) => col.trim())
      }

      indexes.push(index)
    }

    return indexes
  }

  extractConstraints(ddlStatement) {
    const constraints = []

    // 主键约束
    const pkMatch = ddlStatement.match(/PRIMARY\s+KEY\s*\(([^)]+)\)/i)
    if (pkMatch) {
      constraints.push({
        type: 'PRIMARY KEY',
        columns: pkMatch[1].split(',').map((col) => col.trim()),
        name: 'PRIMARY',
      })
    }

    // 外键约束
    const fkRegex =
      /CONSTRAINT\s+(\w+)\s+FOREIGN\s+KEY\s*\(([^)]+)\)\s+REFERENCES\s+(\w+)\s*\(([^)]+)\)/gi
    let fkMatch
    while ((fkMatch = fkRegex.exec(ddlStatement)) !== null) {
      constraints.push({
        type: 'FOREIGN KEY',
        name: fkMatch[1],
        columns: fkMatch[2].split(',').map((col) => col.trim()),
        referenceTable: fkMatch[3],
        referenceColumns: fkMatch[4].split(',').map((col) => col.trim()),
      })
    }

    // 唯一约束
    const uniqueRegex = /(?:CONSTRAINT\s+(\w+)\s+)?UNIQUE\s*\(([^)]+)\)/gi
    let uniqueMatch
    while ((uniqueMatch = uniqueRegex.exec(ddlStatement)) !== null) {
      constraints.push({
        type: 'UNIQUE',
        name: uniqueMatch[1] || `UNIQUE_${constraints.length + 1}`,
        columns: uniqueMatch[2].split(',').map((col) => col.trim()),
      })
    }

    return constraints
  }

  detectVersion() {
    // 在实际应用中，这里应该从数据库连接或配置中获取版本信息
    // ddlStatement参数暂时未使用，保留以备将来扩展
    // 这里简单返回支持的版本
    return this.supportedVersions[0]
  }

  convertParsedResult(parsedResult, targetDatabaseType) {
    // 实现达梦数据库到目标数据库的转换逻辑
    // 这里返回一个简单的转换结果
    return {
      ...parsedResult,
      targetDatabaseType,
      convertedAt: new Date().toISOString(),
      conversionNotes: [`从达梦数据库转换到 ${targetDatabaseType}`],
    }
  }
}

/**
 * 达梦数据库连接管理器
 */
export class DmConnectionManager {
  constructor() {
    this.connections = new Map()
    this.connectionPool = []
    this.maxConnections = 10
  }

  /**
   * 建立数据库连接
   */
  async connect(config) {
    const connectionId = this.generateConnectionId()

    // 验证连接配置
    this.validateConnectionConfig(config)

    // 创建连接对象
    const connection = {
      id: connectionId,
      config: this.maskSensitiveConfig(config),
      createdAt: new Date(),
      lastUsed: new Date(),
      status: 'connected',
      transactionCount: 0,
    }

    this.connections.set(connectionId, connection)

    // 记录连接审计日志
    await this.logConnectionAudit('CONNECT', connection)

    return connectionId
  }

  /**
   * 断开数据库连接
   */
  async disconnect(connectionId) {
    const connection = this.connections.get(connectionId)
    if (connection) {
      connection.status = 'disconnected'

      // 记录断开连接审计日志
      await this.logConnectionAudit('DISCONNECT', connection)

      this.connections.delete(connectionId)
    }
  }

  /**
   * 验证连接配置
   */
  validateConnectionConfig(config) {
    const requiredFields = ['host', 'port', 'username', 'password', 'database']
    const missingFields = requiredFields.filter((field) => !config[field])

    if (missingFields.length > 0) {
      throw new Error(`缺少必要的连接配置: ${missingFields.join(', ')}`)
    }

    // 验证端口范围
    if (config.port < 1 || config.port > 65535) {
      throw new Error('端口号必须在 1-65535 范围内')
    }

    // 验证密码强度
    if (config.password && config.password.length < 8) {
      throw new Error('密码长度必须至少8个字符')
    }
  }

  /**
   * 生成连接ID
   */
  generateConnectionId() {
    return `dm_conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * 掩码敏感配置信息
   */
  maskSensitiveConfig(config) {
    const maskedConfig = { ...config }
    if (maskedConfig.password) {
      maskedConfig.password = '***'
    }
    return maskedConfig
  }

  /**
   * 记录连接审计日志
   */
  async logConnectionAudit(eventType, connection) {
    const auditLog = {
      timestamp: new Date().toISOString(),
      eventType,
      connectionId: connection.id,
      config: connection.config,
      user: 'system',
    }

    console.log('连接审计日志:', auditLog)
    return auditLog
  }
}

/**
 * 达梦数据库异常处理器
 */
export class DmExceptionHandler {
  constructor() {
    this.errorMappings = this.initErrorMappings()
  }

  /**
   * 初始化错误映射
   */
  initErrorMappings() {
    return {
      // 连接错误
      'Connection refused': '数据库连接被拒绝，请检查网络连接和数据库服务状态',
      'Invalid username/password': '用户名或密码错误',
      'Database not found': '数据库不存在',

      // 语法错误
      'Syntax error': 'SQL语法错误',
      'Table already exists': '表已存在',
      'Table does not exist': '表不存在',

      // 权限错误
      'Insufficient privileges': '权限不足',
      'Access denied': '访问被拒绝',

      // 资源错误
      'Out of memory': '内存不足',
      'Disk full': '磁盘空间不足',

      // 超时错误
      'Query timeout': '查询超时',
      'Connection timeout': '连接超时',
    }
  }

  /**
   * 处理数据库异常
   */
  handleException(error, context = {}) {
    const errorInfo = {
      originalError: error.message,
      userFriendlyMessage: this.getUserFriendlyMessage(error.message),
      timestamp: new Date().toISOString(),
      context,
      severity: this.determineSeverity(error.message),
      recoverySteps: this.getRecoverySteps(error.message),
    }

    // 记录错误审计日志
    this.logErrorAudit(errorInfo)

    return errorInfo
  }

  /**
   * 获取用户友好的错误消息
   */
  getUserFriendlyMessage(errorMessage) {
    for (const [pattern, message] of Object.entries(this.errorMappings)) {
      if (errorMessage.includes(pattern)) {
        return message
      }
    }

    return '发生未知错误，请联系系统管理员'
  }

  /**
   * 确定错误严重性
   */
  determineSeverity(errorMessage) {
    const criticalErrors = [
      'Connection refused',
      'Invalid username/password',
      'Database not found',
      'Out of memory',
      'Disk full',
    ]

    const warningErrors = ['Query timeout', 'Connection timeout']

    if (criticalErrors.some((pattern) => errorMessage.includes(pattern))) {
      return 'CRITICAL'
    } else if (warningErrors.some((pattern) => errorMessage.includes(pattern))) {
      return 'WARNING'
    } else {
      return 'ERROR'
    }
  }

  /**
   * 获取恢复步骤
   */
  getRecoverySteps(errorMessage) {
    const steps = {
      'Connection refused': ['检查数据库服务是否启动', '验证网络连接', '检查防火墙设置'],
      'Invalid username/password': ['验证用户名和密码', '检查用户权限', '联系数据库管理员重置密码'],
      'Database not found': ['验证数据库名称', '检查数据库连接字符串', '确认数据库已创建'],
      default: ['检查SQL语句语法', '验证数据库对象是否存在', '联系系统管理员'],
    }

    for (const [pattern, recoverySteps] of Object.entries(steps)) {
      if (errorMessage.includes(pattern)) {
        return recoverySteps
      }
    }

    return steps.default
  }

  /**
   * 记录错误审计日志
   */
  logErrorAudit(errorInfo) {
    const auditLog = {
      timestamp: errorInfo.timestamp,
      eventType: 'DATABASE_ERROR',
      severity: errorInfo.severity,
      originalError: errorInfo.originalError,
      userFriendlyMessage: errorInfo.userFriendlyMessage,
      context: errorInfo.context,
    }

    console.log('错误审计日志:', auditLog)
  }
}
