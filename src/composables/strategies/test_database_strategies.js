import { StrategyManager } from '../useDatabaseStrategy.js'
import { MySqlStrategy } from './MySqlStrategy.js'
import { PostgreSqlStrategy } from './PostgreSqlStrategy.js'
import { OracleStrategy } from './OracleStrategy.js'
import { SqlServerStrategy } from './SqlServerStrategy.js'

/**
 * 多数据库策略测试脚本
 */
async function testDatabaseStrategies() {
  console.log('=== 开始测试多数据库策略 ===\n')

  // 创建策略管理器
  const strategyManager = new StrategyManager()

  // 手动注册所有策略
  console.log('注册数据库策略...')
  strategyManager.registerStrategy('mysql', new MySqlStrategy())
  strategyManager.registerStrategy('postgresql', new PostgreSqlStrategy())
  strategyManager.registerStrategy('oracle', new OracleStrategy())
  strategyManager.registerStrategy('sqlserver', new SqlServerStrategy())

  console.log('已注册的数据库类型:', strategyManager.getSupportedDatabases())
  console.log('')

  // 测试用例
  const testCases = [
    {
      name: 'MySQL DDL解析测试',
      ddl: `CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL,
  email VARCHAR(100) UNIQUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  status ENUM('active', 'inactive') DEFAULT 'active'
) ENGINE=InnoDB CHARSET=utf8mb4;`,
      expectedType: 'mysql',
    },
    {
      name: 'PostgreSQL DDL解析测试',
      ddl: `CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) NOT NULL,
  email VARCHAR(100) UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status VARCHAR(10) DEFAULT 'active'
);`,
      expectedType: 'postgresql',
    },
    {
      name: 'Oracle DDL解析测试',
      ddl: `CREATE TABLE users (
  id NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  username VARCHAR2(50) NOT NULL,
  email VARCHAR2(100) UNIQUE,
  created_at DATE DEFAULT SYSDATE,
  status VARCHAR2(10) DEFAULT 'active'
);`,
      expectedType: 'oracle',
    },
    {
      name: 'SQL Server DDL解析测试',
      ddl: `CREATE TABLE [users] (
  [id] INT IDENTITY(1,1) PRIMARY KEY,
  [username] VARCHAR(50) NOT NULL,
  [email] VARCHAR(100) UNIQUE,
  [created_at] DATETIME2 DEFAULT GETDATE(),
  [status] VARCHAR(10) DEFAULT 'active'
);`,
      expectedType: 'sqlserver',
    },
  ]

  // 执行测试
  for (const testCase of testCases) {
    console.log(`=== ${testCase.name} ===`)

    try {
      // 测试数据库类型检测
      const detection = strategyManager.detectDatabaseType(testCase.ddl)
      console.log(
        `检测结果: ${detection.databaseType} (置信度: ${detection.confidence.toFixed(2)})`,
      )

      // 测试DDL解析
      const parsedResult = await strategyManager.parseDdl(testCase.ddl, testCase.expectedType)
      console.log(
        `解析成功 - 表名: ${parsedResult.tableName}, 字段数: ${parsedResult.fields.length}`,
      )

      // 显示字段信息
      parsedResult.fields.forEach((field, index) => {
        console.log(
          `  字段${index + 1}: ${field.name} ${field.type} ${field.nullable ? 'NULL' : 'NOT NULL'} ${field.isIdentity ? 'IDENTITY' : ''}`,
        )
      })

      // 测试DDL验证
      const validation = await strategyManager.validateDdl(testCase.ddl, testCase.expectedType)
      console.log(`验证结果: ${validation.valid ? '通过' : '失败'}`)

      if (!validation.valid) {
        console.log('验证错误:', validation.errors)
      }

      // 测试版本兼容性检查
      const versionCheck = strategyManager.checkVersionCompatibility(
        testCase.expectedType,
        'latest',
      )
      console.log(`版本兼容性: ${versionCheck.compatible ? '兼容' : '不兼容'}`)

      console.log('')
    } catch (error) {
      console.error(`测试失败: ${error.message}`)
      console.log('')
    }
  }

  // 测试DDL转换功能
  console.log('=== DDL转换测试 ===')

  const mysqlDdl = `CREATE TABLE products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  price DECIMAL(10,2),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;`

  try {
    console.log('将MySQL DDL转换为PostgreSQL语法...')
    const conversionResult = await strategyManager.convertDdl(mysqlDdl, 'postgresql', 'mysql')
    console.log('转换成功!')
    console.log('原始表名:', conversionResult.original.tableName)
    console.log('目标表名:', conversionResult.converted.tableName)
    console.log('目标数据库类型:', conversionResult.converted.databaseType)

    console.log('字段映射结果:')
    conversionResult.converted.fields.forEach((field) => {
      console.log(`  ${field.name}: ${field.type}`)
    })
  } catch (error) {
    console.error(`转换失败: ${error.message}`)
  }

  console.log('')

  // 测试数据类型映射
  console.log('=== 数据类型映射测试 ===')

  const dataTypes = ['INT', 'VARCHAR', 'DATETIME', 'DECIMAL']
  const sourceDb = 'mysql'
  const targetDbs = ['postgresql', 'oracle', 'sqlserver']

  for (const dataType of dataTypes) {
    console.log(`\n${sourceDb}.${dataType} 映射:`)

    for (const targetDb of targetDbs) {
      const mappedType = strategyManager.mapDataType(dataType, sourceDb, targetDb)
      console.log(`  → ${targetDb}: ${mappedType}`)
    }
  }

  console.log('\n=== 测试完成 ===')
}

// 执行测试
// 移除对process变量的使用，改为手动调用测试函数
// testDatabaseStrategies().catch(console.error)

export { testDatabaseStrategies }
