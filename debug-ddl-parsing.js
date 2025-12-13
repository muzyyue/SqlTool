// DDL解析调试脚本
const testDdls = [
  // 达梦数据库DDL
  `CREATE TABLE "SCOTT"."TEST_TABLE" (
    "ID" NUMBER(10) NOT NULL,
    "NAME" VARCHAR2(50) NOT NULL,
    "AGE" NUMBER(3),
    "EMAIL" VARCHAR2(100),
    "CREATE_TIME" DATE DEFAULT SYSDATE,
    "UPDATE_TIME" DATE,
    CONSTRAINT "PK_TEST_TABLE" PRIMARY KEY ("ID")
  ) TABLESPACE "USERS" STORAGE (INITIAL 64K NEXT 1M MINEXTENTS 1 MAXEXTENTS UNLIMITED) COMPRESS FOR OLTP;`,

  // 标准MySQL DDL
  `CREATE TABLE test_table (
    id INT NOT NULL AUTO_INCREMENT,
    name VARCHAR(50) NOT NULL,
    age INT,
    email VARCHAR(100),
    create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    update_time TIMESTAMP NULL,
    PRIMARY KEY (id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

  // 带注释的DDL
  `CREATE TABLE user_info (
    -- 用户ID
    user_id INT NOT NULL COMMENT '用户唯一标识',
    /* 用户名 */
    username VARCHAR(50) NOT NULL COMMENT '用户登录名',
    age TINYINT COMMENT '用户年龄',
    email VARCHAR(100) COMMENT '用户邮箱',
    create_time DATETIME DEFAULT NOW() COMMENT '创建时间',
    PRIMARY KEY (user_id)
  ) COMMENT='用户信息表';`
]

// 模拟预处理函数
function preprocessDdlStatement(ddlStatement) {
  if (!ddlStatement) return ''

  let processed = ddlStatement

  // 1. 标准化换行符和空格
  processed = processed
    .replace(/\r\n|\r|\n/g, ' ') // 替换所有换行符为空格
    .replace(/\s+/g, ' ')        // 合并多个连续空格
    .trim()

  // 2. 处理达梦数据库特有的语法
  processed = processed.replace(/\bSTORAGE\s*\([^)]*\)/gi, '')
  processed = processed.replace(/\bCOMPRESS\s+\w+/gi, '')
  processed = processed.replace(/\bTABLESPACE\s+\w+/gi, '') // 移除表空间定义
  processed = processed.replace(/\bPARTITION\s+BY[^)]*\)/gi, '') // 移除分区定义

  // 3. 处理注释
  processed = processed
    .replace(/--[^\n]*/g, '')  // 移除单行注释
    .replace(/\/\*[^*]*\*+(?:[^/*][^*]*\*+)*\//g, '')  // 移除多行注释

  // 4. 处理特殊字符和引号
  processed = processed.replace(/[`\[\]]/g, '"')

  // 5. 移除行首空白字符
  processed = processed.replace(/^\s+/, '')

  // 6. 确保语句以CREATE TABLE开头
  if (!processed.toUpperCase().startsWith('CREATE TABLE')) {
    const createTableIndex = processed.toUpperCase().indexOf('CREATE TABLE')
    if (createTableIndex > 0) {
      processed = processed.substring(createTableIndex)
    }
  }

  // 7. 移除语句末尾的分号和其他字符
  processed = processed.replace(/;\s*$/, '')
  processed = processed.replace(/[^\x20-\x7E\n\r]/g, '')

  return processed
}

console.log('=== DDL预处理测试开始 ===\n')

testDdls.forEach((ddl, index) => {
  console.log(`测试用例 ${index + 1}:`)
  console.log('原始DDL:')
  console.log(ddl)
  console.log('\n预处理后DDL:')
  const processed = preprocessDdlStatement(ddl)
  console.log(processed)
  console.log('预处理前长度:', ddl.length, '预处理后长度:', processed.length)
  
  // 检查是否以CREATE TABLE开头
  const startsWithCreateTable = processed.toUpperCase().startsWith('CREATE TABLE')
  console.log('是否以CREATE TABLE开头:', startsWithCreateTable)
  
  // 检查是否包含可能导致node-sql-parser失败的字符
  const firstChar = processed.trim().charAt(0)
  const validStartChars = ['C', 'c', ' ', '\t', '\n', '\r']
  const isValidStart = validStartChars.some(char => firstChar === char)
  console.log('首字符:', `'${firstChar}'`, '是否有效:', isValidStart)
  
  console.log('---'.repeat(20) + '\n')
})

console.log('=== DDL预处理测试完成 ===')