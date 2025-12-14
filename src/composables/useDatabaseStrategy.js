/**
 * 多数据库策略框架 - 统一的策略接口
 * 支持MySQL、PostgreSQL、Oracle、SQL Server等数据库的差异化DDL处理
 */

/**
 * 数据库策略接口定义
 */
export class DatabaseStrategy {
  constructor() {
    if (this.constructor === DatabaseStrategy) {
      throw new Error('DatabaseStrategy是抽象类，不能直接实例化')
    }
  }

  /**
   * 获取数据库类型标识
   */
  getDatabaseType() {
    throw new Error('必须实现getDatabaseType方法')
  }

  /**
   * 获取支持的数据库版本范围
   */
  getSupportedVersions() {
    throw new Error('必须实现getSupportedVersions方法')
  }

  /**
   * 解析DDL语句
   */
  async parseDdl(ddlStatement) {
    throw new Error('必须实现parseDdl方法')
  }

  /**
   * 转换DDL语句到目标数据库语法
   */
  async convertDdl(ddlStatement, targetDatabaseType) {
    throw new Error('必须实现convertDdl方法')
  }

  /**
   * 验证DDL语句语法正确性
   */
  async validateDdl(ddlStatement) {
    throw new Error('必须实现validateDdl方法')
  }

  /**
   * 获取数据类型映射表
   */
  getDataTypeMappings() {
    throw new Error('必须实现getDataTypeMappings方法')
  }

  /**
   * 获取关键字映射表
   */
  getKeywordMappings() {
    throw new Error('必须实现getKeywordMappings方法')
  }

  /**
   * 检查版本兼容性
   */
  checkVersionCompatibility(version) {
    throw new Error('必须实现checkVersionCompatibility方法')
  }
}

/**
 * 数据库方言识别器
 */
export class DatabaseDialectDetector {
  constructor() {
    this.databasePatterns = {
      mysql: [
        /ENGINE\s*=\s*\w+/i,
        /AUTO_INCREMENT/i,
        /CHARSET\s*=\s*\w+/i,
        /COLLATE\s*=\s*\w+/i,
        /\bTINYINT\b/i,
        /\bMEDIUMINT\b/i,
        /\bYEAR\b/i,
        /\bENUM\s*\(/i,
        /\bSET\s*\(/i,
      ],
      postgresql: [
        /SERIAL\b/i,
        /BIGSERIAL\b/i,
        /BYTEA\b/i,
        /JSONB\b/i,
        /UUID\b/i,
        /ARRAY\b/i,
        /COLLATE\s+"pg_catalog"/i,
        /GENERATED\s+ALWAYS\s+AS\s+IDENTITY/i,
        /USING\s+\w+/i,
      ],
      oracle: [
        /VARCHAR2\b/i,
        /NUMBER\s*\(/i,
        /CLOB\b/i,
        /BLOB\b/i,
        /RAW\b/i,
        /LONG\b/i,
        /SEQUENCE\b/i,
        /SYSDATE\b/i,
        /DEFAULT\s+[^\s]+\s+ON\s+NULL/i,
        /CONSTRAINT\s+[^\s]+\s+CHECK/i,
      ],
      sqlserver: [
        /\bINT\s+IDENTITY\s*\(/i,
        /\bDATETIME2\b/i,
        /\bDATETIMEOFFSET\b/i,
        /\bSMALLDATETIME\b/i,
        /\bHIERARCHYID\b/i,
        /\bGEOGRAPHY\b/i,
        /\bGEOMETRY\b/i,
        /\bXML\b/i,
        /\bMONEY\b/i,
        /\bSMALLMONEY\b/i,
        /WITH\s+\([^)]*\)/i,
      ],
      dm: [
        /\bTABLESPACE\b/i,
        /\bSTORAGE\b/i,
        /\bPCTFREE\b/i,
        /\bPCTUSED\b/i,
        /\bINITRANS\b/i,
        /\bMAXTRANS\b/i,
        /\bCOMPRESS\b/i,
        /\bLOGGING\b/i,
        /\bNOLOGGING\b/i,
        /\bPARALLEL\b/i,
        /\bCACHE\b/i,
        /\bNOCACHE\b/i,
        /\bMONITORING\b/i,
        /\bENABLE\b/i,
        /\bDISABLE\b/i,
        /\bVALIDATE\b/i,
        /\bNOVALIDATE\b/i,
        /\bRELY\b/i,
        /\bNORELY\b/i,
        /\bBINARY\b/i,
        /\bVARBINARY\b/i,
        /\bLONGVARBINARY\b/i,
        /\bIMAGE\b/i,
        /\bBFILE\b/i,
        /\bROWID\b/i,
        /\bUROWID\b/i,
        /\bXMLTYPE\b/i,
        /\bINTERVAL\s+YEAR\s+TO\s+MONTH\b/i,
        /\bINTERVAL\s+DAY\s+TO\s+SECOND\b/i,
        /\bIDENTITY\s*\(\s*1\s*,\s*1\s*\)/i, // 达梦数据库特有的IDENTITY语法
        /\bTIMESTAMP\s+DEFAULT\s+CURRENT_TIMESTAMP\b/i,
        // 移除过于宽泛的VARCHAR模式，避免误识别其他数据库
      ],
    }
  }

  /**
   * 检测数据库方言类型
   */
  detectDialect(ddlStatement) {
    if (!ddlStatement || typeof ddlStatement !== 'string') {
      return 'unknown'
    }

    const scores = {}

    // 计算每种数据库的匹配分数
    for (const [dbType, patterns] of Object.entries(this.databasePatterns)) {
      scores[dbType] = 0

      for (const pattern of patterns) {
        if (pattern.test(ddlStatement)) {
          scores[dbType]++
        }
      }
    }

    // 找到最高分数的数据库类型
    let maxScore = 0
    let detectedType = 'unknown'

    for (const [dbType, score] of Object.entries(scores)) {
      if (score > maxScore) {
        maxScore = score
        detectedType = dbType
      }
    }

    // 如果最高分数为0，则使用通用检测逻辑
    if (maxScore === 0) {
      return this.detectByCommonPatterns(ddlStatement)
    }

    return detectedType
  }

  /**
   * 通过通用模式检测数据库类型
   */
  detectByCommonPatterns(ddlStatement) {
    const lowerDdl = ddlStatement.toLowerCase()

    // 检查CREATE TABLE语法特征
    if (lowerDdl.includes('create table')) {
      // MySQL特征
      if (lowerDdl.includes('auto_increment') || lowerDdl.includes('engine=')) {
        return 'mysql'
      }

      // PostgreSQL特征
      if (lowerDdl.includes('serial') || lowerDdl.includes('bytea')) {
        return 'postgresql'
      }

      // Oracle特征
      if (lowerDdl.includes('varchar2') || lowerDdl.includes('number(')) {
        return 'oracle'
      }

      // SQL Server特征
      if (lowerDdl.includes('identity(') || lowerDdl.includes('datetime2')) {
        return 'sqlserver'
      }

      // 达梦数据库特征
      if (
        lowerDdl.includes('tablespace') ||
        lowerDdl.includes('storage') ||
        lowerDdl.includes('pctfree') ||
        lowerDdl.includes('logging') ||
        (lowerDdl.includes('identity(') && lowerDdl.includes('timestamp default current_timestamp'))
      ) {
        return 'dm'
      }
    }

    return 'unknown'
  }

  /**
   * 获取数据库方言的置信度分数
   */
  getConfidenceScore(ddlStatement, databaseType) {
    if (!this.databasePatterns[databaseType]) {
      return 0
    }

    let score = 0
    const patterns = this.databasePatterns[databaseType]

    for (const pattern of patterns) {
      if (pattern.test(ddlStatement)) {
        score++
      }
    }

    // 计算置信度百分比
    const maxPossibleScore = patterns.length
    return maxPossibleScore > 0 ? (score / maxPossibleScore) * 100 : 0
  }
}

/**
 * 策略管理器
 */
export class StrategyManager {
  constructor() {
    this.strategies = new Map()
    this.dialectDetector = new DatabaseDialectDetector()
    this.defaultStrategy = null

    // 自动注册所有策略
    this.registerDefaultStrategies()
  }

  registerDefaultStrategies() {
    // 这里暂时不自动注册，由外部调用时手动注册
    console.log('策略管理器已初始化，请手动注册策略')
  }

  /**
   * 注册策略
   */
  registerStrategy(databaseType, strategy) {
    if (!(strategy instanceof DatabaseStrategy)) {
      throw new Error('策略必须继承自DatabaseStrategy')
    }

    this.strategies.set(databaseType, strategy)
    console.log(`已注册 ${databaseType} 策略`)

    // 设置默认策略（第一个注册的策略）
    if (!this.defaultStrategy) {
      this.defaultStrategy = strategy
    }
  }

  /**
   * 获取策略
   */
  getStrategy(databaseType) {
    const strategy = this.strategies.get(databaseType)

    if (!strategy) {
      throw new Error(`未找到 ${databaseType} 的策略实现`)
    }

    return strategy
  }

  /**
   * 自动选择策略
   */
  autoSelectStrategy(ddlStatement) {
    const detectedType = this.dialectDetector.detectDialect(ddlStatement)

    if (detectedType !== 'unknown' && this.strategies.has(detectedType)) {
      const confidence = this.dialectDetector.getConfidenceScore(ddlStatement, detectedType)
      console.log(`检测到数据库类型: ${detectedType}, 置信度: ${confidence.toFixed(2)}%`)

      if (confidence >= 60) {
        return this.strategies.get(detectedType)
      }
    }

    // 使用默认策略
    console.log('使用默认策略')
    return this.defaultStrategy
  }

  /**
   * 获取所有已注册的策略类型
   */
  getRegisteredStrategies() {
    return Array.from(this.strategies.keys())
  }

  /**
   * 检查策略是否可用
   */
  isStrategyAvailable(databaseType) {
    return this.strategies.has(databaseType)
  }

  /**
   * 检测数据库类型
   */
  detectDatabaseType(ddlStatement) {
    const detectedType = this.dialectDetector.detectDialect(ddlStatement)
    return detectedType
  }

  /**
   * 解析DDL语句
   */
  async parseDdl(ddlStatement, databaseType = null) {
    if (!databaseType) {
      const detection = this.detectDatabaseType(ddlStatement)
      databaseType = detection.databaseType

      if (databaseType === 'unknown') {
        throw new Error('无法识别数据库类型，请明确指定 databaseType 参数')
      }
    }

    const strategy = this.getStrategy(databaseType)
    return await strategy.parseDdl(ddlStatement)
  }

  /**
   * 转换DDL语句
   */
  async convertDdl(ddlStatement, targetDatabaseType, sourceDatabaseType = null) {
    if (!sourceDatabaseType) {
      const detection = this.detectDatabaseType(ddlStatement)
      sourceDatabaseType = detection.databaseType

      if (sourceDatabaseType === 'unknown') {
        throw new Error('无法识别源数据库类型，请明确指定 sourceDatabaseType 参数')
      }
    }

    const strategy = this.getStrategy(sourceDatabaseType)
    return await strategy.convertDdl(ddlStatement, targetDatabaseType)
  }

  /**
   * 验证DDL语句
   */
  async validateDdl(ddlStatement, databaseType = null) {
    if (!databaseType) {
      const detection = this.detectDatabaseType(ddlStatement)
      databaseType = detection.databaseType

      if (databaseType === 'unknown') {
        throw new Error('无法识别数据库类型，请明确指定 databaseType 参数')
      }
    }

    const strategy = this.getStrategy(databaseType)
    return await strategy.validateDdl(ddlStatement)
  }

  /**
   * 获取支持的数据库列表
   */
  getSupportedDatabases() {
    return Array.from(this.strategies.keys())
  }

  /**
   * 检查版本兼容性
   */
  checkVersionCompatibility(databaseType, version) {
    const strategy = this.getStrategy(databaseType)
    return strategy.checkVersionCompatibility(version)
  }
}

/**
 * 数据类型映射器
 */
export class DataTypeMapper {
  constructor() {
    this.typeMappings = {
      // 通用类型映射
      common: {
        string: {
          mysql: 'VARCHAR(255)',
          postgresql: 'VARCHAR(255)',
          oracle: 'VARCHAR2(255)',
          sqlserver: 'VARCHAR(255)',
        },
        integer: {
          mysql: 'INT',
          postgresql: 'INTEGER',
          oracle: 'NUMBER(10)',
          sqlserver: 'INT',
        },
        boolean: {
          mysql: 'BOOLEAN',
          postgresql: 'BOOLEAN',
          oracle: 'NUMBER(1)',
          sqlserver: 'BIT',
        },
        datetime: {
          mysql: 'DATETIME',
          postgresql: 'TIMESTAMP',
          oracle: 'DATE',
          sqlserver: 'DATETIME2',
        },
      },
    }
  }

  /**
   * 映射数据类型
   */
  mapDataType(sourceType, sourceDb, targetDb) {
    if (!this.typeMappings.common[sourceType]) {
      return this.getDefaultMapping(sourceType, targetDb)
    }

    return this.typeMappings.common[sourceType][targetDb] || sourceType
  }

  /**
   * 获取默认数据类型映射
   */
  getDefaultMapping(sourceType, targetDb) {
    const typeMappings = {
      mysql: {
        SERIAL: 'INT AUTO_INCREMENT',
        BIGSERIAL: 'BIGINT AUTO_INCREMENT',
        BYTEA: 'LONGBLOB',
        JSONB: 'JSON',
        UUID: 'CHAR(36)',
        'TEXT[]': 'TEXT',
      },
      postgresql: {
        AUTO_INCREMENT: 'SERIAL',
        TINYINT: 'SMALLINT',
        MEDIUMINT: 'INTEGER',
        YEAR: 'INTEGER',
        DATETIME: 'TIMESTAMP',
        LONGTEXT: 'TEXT',
      },
      oracle: {
        AUTO_INCREMENT: 'NUMBER GENERATED ALWAYS AS IDENTITY',
        TINYINT: 'NUMBER(3)',
        SMALLINT: 'NUMBER(5)',
        INT: 'NUMBER(10)',
        BIGINT: 'NUMBER(19)',
        BOOLEAN: 'NUMBER(1)',
        DATETIME: 'DATE',
        TEXT: 'CLOB',
      },
      sqlserver: {
        SERIAL: 'INT IDENTITY(1,1)',
        BIGSERIAL: 'BIGINT IDENTITY(1,1)',
        BOOLEAN: 'BIT',
        BYTEA: 'VARBINARY(MAX)',
        JSONB: 'NVARCHAR(MAX)',
        UUID: 'UNIQUEIDENTIFIER',
      },
    }

    return typeMappings[targetDb]?.[sourceType] || sourceType
  }

  /**
   * 添加自定义类型映射
   */
  addCustomMapping(sourceType, targetDb, mappedType) {
    if (!this.typeMappings.custom) {
      this.typeMappings.custom = {}
    }

    if (!this.typeMappings.custom[sourceType]) {
      this.typeMappings.custom[sourceType] = {}
    }

    this.typeMappings.custom[sourceType][targetDb] = mappedType
  }
}

// 所有类都已经在文件顶部使用export导出，不需要重复导出
