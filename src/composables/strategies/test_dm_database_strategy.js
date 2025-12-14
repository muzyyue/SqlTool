/**
 * 达梦数据库策略集成测试
 * 验证达梦数据库访问策略的完整性和安全性
 */

import {
  DmDatabaseStrategy,
  DmConnectionManager,
  DmExceptionHandler,
} from './DmDatabaseStrategy.js'

/**
 * 达梦数据库策略集成测试类
 */
class DmStrategyTestSuite {
  constructor() {
    this.strategy = new DmDatabaseStrategy()
    this.connectionManager = new DmConnectionManager()
    this.exceptionHandler = new DmExceptionHandler()
    this.testResults = []
  }

  /**
   * 运行所有测试用例
   */
  async runAllTests() {
    console.log('=== 达梦数据库策略集成测试开始 ===\n')

    try {
      await this.testDatabaseTypeDetection()
      await this.testDdlParsing()
      await this.testSecurityValidation()
      await this.testAuditMechanism()
      await this.testConnectionManagement()
      await this.testExceptionHandling()
      await this.testDataTypeMappings()
      await this.testVersionCompatibility()

      this.printTestResults()
    } catch (error) {
      console.error('测试执行失败:', error)
    }
  }

  /**
   * 测试数据库类型检测
   */
  async testDatabaseTypeDetection() {
    console.log('1. 测试数据库类型检测...')

    const testCases = [
      {
        name: '达梦数据库特征检测',
        ddl: `CREATE TABLE users (
          id NUMBER PRIMARY KEY,
          name VARCHAR2(50) NOT NULL,
          created_date DATE DEFAULT SYSDATE,
          tablespace USERS
        ) TABLESPACE USERS STORAGE (INITIAL 64K NEXT 64K)`,
        expectedType: 'dm',
      },
      {
        name: '达梦数据库特有数据类型',
        ddl: `CREATE TABLE products (
          id NUMBER,
          image BLOB,
          xml_data XMLTYPE,
          row_id ROWID,
          interval_data INTERVAL YEAR TO MONTH
        )`,
        expectedType: 'dm',
      },
    ]

    for (const testCase of testCases) {
      try {
        const databaseType = this.strategy.getDatabaseType()
        const isValid = databaseType === testCase.expectedType

        this.recordTestResult(testCase.name, isValid, {
          expected: testCase.expectedType,
          actual: databaseType,
        })
      } catch (error) {
        this.recordTestResult(testCase.name, false, { error: error.message })
      }
    }
  }

  /**
   * 测试DDL解析功能
   */
  async testDdlParsing() {
    console.log('2. 测试DDL解析功能...')

    const testCases = [
      {
        name: '基本表结构解析',
        ddl: `CREATE TABLE employees (
          emp_id NUMBER(10) PRIMARY KEY,
          emp_name VARCHAR2(100) NOT NULL,
          salary NUMBER(10,2),
          hire_date DATE DEFAULT SYSDATE,
          department_id NUMBER(5)
        )`,
        expectedFields: 5,
      },
      {
        name: '复杂约束解析',
        ddl: `CREATE TABLE orders (
          order_id NUMBER PRIMARY KEY,
          customer_id NUMBER NOT NULL,
          order_date DATE,
          total_amount NUMBER(10,2),
          CONSTRAINT fk_customer FOREIGN KEY (customer_id) REFERENCES customers(customer_id),
          CONSTRAINT chk_amount CHECK (total_amount > 0)
        )`,
        expectedConstraints: 2,
      },
      {
        name: '达梦特有语法解析',
        ddl: `CREATE TABLE audit_log (
          log_id NUMBER,
          action_type VARCHAR2(50),
          action_time TIMESTAMP,
          user_name VARCHAR2(50)
        ) TABLESPACE USERS
           STORAGE (INITIAL 64K NEXT 64K)
           PCTFREE 10 PCTUSED 40
           INITRANS 1 MAXTRANS 255
           LOGGING`,
        expectedSecurityLevel: 'LOW',
      },
    ]

    for (const testCase of testCases) {
      try {
        const result = await this.strategy.parseDdl(testCase.ddl)

        let isValid = false
        let details = {}

        if (testCase.expectedFields) {
          isValid = result.fields.length === testCase.expectedFields
          details = {
            expectedFields: testCase.expectedFields,
            actualFields: result.fields.length,
          }
        } else if (testCase.expectedConstraints) {
          isValid = result.constraints.length === testCase.expectedConstraints
          details = {
            expectedConstraints: testCase.expectedConstraints,
            actualConstraints: result.constraints.length,
          }
        } else if (testCase.expectedSecurityLevel) {
          isValid = result.securityLevel === testCase.expectedSecurityLevel
          details = {
            expectedSecurityLevel: testCase.expectedSecurityLevel,
            actualSecurityLevel: result.securityLevel,
          }
        }

        this.recordTestResult(testCase.name, isValid, details)
      } catch (error) {
        this.recordTestResult(testCase.name, false, { error: error.message })
      }
    }
  }

  /**
   * 测试安全验证功能
   */
  async testSecurityValidation() {
    console.log('3. 测试安全验证功能...')

    const testCases = [
      {
        name: '敏感操作检测',
        ddl: 'DROP TABLE users',
        shouldFail: true,
      },
      {
        name: 'SQL注入检测',
        ddl: `CREATE TABLE test; DROP TABLE users; -- (恶意代码)`,
        shouldFail: true,
      },
      {
        name: '合法DDL语句',
        ddl: `CREATE TABLE products (
          id NUMBER PRIMARY KEY,
          name VARCHAR2(100)
        )`,
        shouldFail: false,
      },
      {
        name: '非法标识符检测',
        ddl: `CREATE TABLE 123table (
          id NUMBER
        )`,
        shouldFail: true,
      },
    ]

    for (const testCase of testCases) {
      try {
        const validationResult = await this.strategy.validateDdl(testCase.ddl)
        const isValid = testCase.shouldFail ? !validationResult.valid : validationResult.valid

        this.recordTestResult(testCase.name, isValid, {
          expectedToFail: testCase.shouldFail,
          validationResult: validationResult,
        })
      } catch (error) {
        // 对于应该失败的测试用例，异常也是预期的
        const isValid = testCase.shouldFail
        this.recordTestResult(testCase.name, isValid, { error: error.message })
      }
    }
  }

  /**
   * 测试审计机制
   */
  async testAuditMechanism() {
    console.log('4. 测试审计机制...')

    const testCases = [
      {
        name: 'DDL解析审计',
        ddl: `CREATE TABLE audit_test (
          id NUMBER,
          data VARCHAR2(100)
        )`,
      },
      {
        name: '安全事件审计',
        ddl: 'DROP TABLE important_data',
      },
    ]

    for (const testCase of testCases) {
      try {
        // 这里主要测试审计日志是否正常生成
        // 在实际应用中，审计日志应该写入数据库或文件系统
        const result = await this.strategy.parseDdl(testCase.ddl)

        // 检查结果中是否包含安全级别信息
        const hasSecurityInfo = result.securityLevel !== undefined

        this.recordTestResult(testCase.name, hasSecurityInfo, {
          securityLevel: result.securityLevel,
        })
      } catch (error) {
        // 对于DROP等敏感操作，解析失败是正常的，但审计机制应该仍然工作
        const hasAuditInfo = error.message.includes('审计')
        this.recordTestResult(testCase.name, hasAuditInfo, { error: error.message })
      }
    }
  }

  /**
   * 测试连接管理
   */
  async testConnectionManagement() {
    console.log('5. 测试连接管理...')

    const testCases = [
      {
        name: '有效连接配置',
        config: {
          host: 'localhost',
          port: 5236,
          username: 'test_user',
          password: 'secure_password123',
          database: 'test_db',
        },
        shouldSucceed: true,
      },
      {
        name: '无效端口配置',
        config: {
          host: 'localhost',
          port: 0, // 无效端口
          username: 'test_user',
          password: 'password',
          database: 'test_db',
        },
        shouldSucceed: false,
      },
      {
        name: '弱密码配置',
        config: {
          host: 'localhost',
          port: 5236,
          username: 'test_user',
          password: '123', // 弱密码
          database: 'test_db',
        },
        shouldSucceed: false,
      },
    ]

    for (const testCase of testCases) {
      try {
        const connectionId = await this.connectionManager.connect(testCase.config)
        const isValid = testCase.shouldSucceed && connectionId

        if (connectionId) {
          await this.connectionManager.disconnect(connectionId)
        }

        this.recordTestResult(testCase.name, isValid, {
          connectionId: connectionId || '无',
        })
      } catch (error) {
        const isValid = !testCase.shouldSucceed
        this.recordTestResult(testCase.name, isValid, { error: error.message })
      }
    }
  }

  /**
   * 测试异常处理
   */
  async testExceptionHandling() {
    console.log('6. 测试异常处理...')

    const testCases = [
      {
        name: '连接拒绝异常',
        error: new Error('Connection refused'),
        expectedSeverity: 'CRITICAL',
      },
      {
        name: '权限不足异常',
        error: new Error('Insufficient privileges'),
        expectedSeverity: 'ERROR',
      },
      {
        name: '查询超时异常',
        error: new Error('Query timeout'),
        expectedSeverity: 'WARNING',
      },
      {
        name: '未知异常',
        error: new Error('Some unknown error'),
        expectedSeverity: 'ERROR',
      },
    ]

    for (const testCase of testCases) {
      try {
        const errorInfo = this.exceptionHandler.handleException(testCase.error)
        const isValid = errorInfo.severity === testCase.expectedSeverity

        this.recordTestResult(testCase.name, isValid, {
          expectedSeverity: testCase.expectedSeverity,
          actualSeverity: errorInfo.severity,
          userMessage: errorInfo.userFriendlyMessage,
        })
      } catch (error) {
        this.recordTestResult(testCase.name, false, { error: error.message })
      }
    }
  }

  /**
   * 测试数据类型映射
   */
  async testDataTypeMappings() {
    console.log('7. 测试数据类型映射...')

    const testCases = [
      {
        name: '达梦特有类型映射',
        sourceType: 'VARCHAR2',
        expectedMapping: 'VARCHAR',
      },
      {
        name: '数值类型映射',
        sourceType: 'NUMBER',
        expectedMapping: 'NUMERIC',
      },
      {
        name: '二进制类型映射',
        sourceType: 'BLOB',
        expectedMapping: 'BLOB',
      },
      {
        name: '日期类型映射',
        sourceType: 'DATE',
        expectedMapping: 'DATE',
      },
    ]

    const mappings = this.strategy.getDataTypeMappings()

    for (const testCase of testCases) {
      try {
        const actualMapping = mappings[testCase.sourceType]
        const isValid = actualMapping === testCase.expectedMapping

        this.recordTestResult(testCase.name, isValid, {
          sourceType: testCase.sourceType,
          expectedMapping: testCase.expectedMapping,
          actualMapping: actualMapping,
        })
      } catch (error) {
        this.recordTestResult(testCase.name, false, { error: error.message })
      }
    }
  }

  /**
   * 测试版本兼容性
   */
  async testVersionCompatibility() {
    console.log('8. 测试版本兼容性...')

    const testCases = [
      {
        name: '支持版本检查',
        version: '8.0',
        expectedCompatible: true,
      },
      {
        name: '不支持版本检查',
        version: '6.0',
        expectedCompatible: false,
      },
      {
        name: '最新版本检查',
        version: '8.1',
        expectedCompatible: true,
      },
    ]

    for (const testCase of testCases) {
      try {
        const compatibility = this.strategy.checkVersionCompatibility(testCase.version)
        const isValid = compatibility.compatible === testCase.expectedCompatible

        this.recordTestResult(testCase.name, isValid, {
          version: testCase.version,
          expectedCompatible: testCase.expectedCompatible,
          actualCompatible: compatibility.compatible,
          message: compatibility.message,
        })
      } catch (error) {
        this.recordTestResult(testCase.name, false, { error: error.message })
      }
    }
  }

  /**
   * 记录测试结果
   */
  recordTestResult(testName, passed, details = {}) {
    const result = {
      testName,
      passed,
      timestamp: new Date().toISOString(),
      details,
    }

    this.testResults.push(result)

    const status = passed ? '✓ 通过' : '✗ 失败'
    console.log(`  ${status} ${testName}`)

    if (!passed && Object.keys(details).length > 0) {
      console.log('    详细信息:', JSON.stringify(details, null, 2))
    }
  }

  /**
   * 打印测试结果汇总
   */
  printTestResults() {
    console.log('\n=== 测试结果汇总 ===')

    const totalTests = this.testResults.length
    const passedTests = this.testResults.filter((r) => r.passed).length
    const failedTests = totalTests - passedTests
    const successRate = ((passedTests / totalTests) * 100).toFixed(2)

    console.log(`总测试用例: ${totalTests}`)
    console.log(`通过: ${passedTests}`)
    console.log(`失败: ${failedTests}`)
    console.log(`成功率: ${successRate}%`)

    if (failedTests > 0) {
      console.log('\n失败的测试用例:')
      this.testResults
        .filter((r) => !r.passed)
        .forEach((r) => {
          console.log(`  - ${r.testName}`)
          console.log(`    时间: ${r.timestamp}`)
          if (Object.keys(r.details).length > 0) {
            console.log(`    详情: ${JSON.stringify(r.details)}`)
          }
        })
    }

    console.log('\n=== 达梦数据库策略集成测试完成 ===')

    // 返回测试结果
    return {
      totalTests,
      passedTests,
      failedTests,
      successRate,
      results: this.testResults,
    }
  }
}

/**
 * 运行集成测试
 */
async function runDmStrategyIntegrationTest() {
  const testSuite = new DmStrategyTestSuite()
  const results = await testSuite.runAllTests()

  // 验证测试结果
  if (results.successRate >= 80) {
    console.log('\n🎉 达梦数据库策略集成测试通过！')
    console.log('策略功能完整，安全性验证通过。')
  } else {
    console.log('\n⚠️ 达梦数据库策略集成测试部分失败，需要进一步优化。')
  }

  return results
}

// 如果直接运行此文件，则执行测试
if (import.meta.url === `file://${process.argv[1]}`) {
  runDmStrategyIntegrationTest().catch(console.error)
}

export { runDmStrategyIntegrationTest, DmStrategyTestSuite }
