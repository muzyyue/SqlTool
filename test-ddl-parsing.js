// DDL解析功能测试脚本
// 直接在浏览器控制台测试

// 测试用例 - 达梦数据库DDL语句
const dmDdl = `
CREATE TABLE "SCOTT"."TEST_TABLE" (
  "ID" NUMBER(10) DEFAULT 0 NOT NULL,
  "NAME" VARCHAR2(50) DEFAULT '' NOT NULL,
  "AGE" NUMBER(3) DEFAULT 0,
  "CREATE_TIME" DATE DEFAULT SYSDATE,
  "REMARK" VARCHAR2(200),
  CONSTRAINT "PK_TEST_TABLE" PRIMARY KEY ("ID")
) STORAGE(ON "MAIN", CLUSTERBTR) ;
`

// 测试用例 - 标准MySQL DDL语句
const mysqlDdl = `
CREATE TABLE test_table (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL DEFAULT '',
  age INT DEFAULT 0,
  create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  remark TEXT
);
`

// 测试用例 - 包含注释的DDL语句
const ddlWithComments = `
-- 这是表注释
CREATE TABLE user_info (
  user_id INT PRIMARY KEY, -- 用户ID
  username VARCHAR(30) NOT NULL, /* 用户名 */
  email VARCHAR(100) UNIQUE,
  created_at DATETIME DEFAULT NOW()
);
`

// 测试预处理函数
function testPreprocessing() {
  console.log('=== 测试DDL预处理功能 ===')
  
  // 模拟预处理函数
  const preprocessDdlStatement = (ddlStatement) => {
    if (!ddlStatement) return ''

    let processed = ddlStatement

    // 1. 标准化换行符和空格
    processed = processed
      .replace(/\r\n|\r|\n/g, ' ') // 替换所有换行符为空格
      .replace(/\s+/g, ' ')        // 合并多个连续空格
      .trim()

    // 2. 处理达梦数据库特有的语法
    // 移除STORAGE等达梦特定关键字，避免node-sql-parser解析失败
    processed = processed.replace(/\bSTORAGE\s*\([^)]*\)/gi, '')
    processed = processed.replace(/\bCOMPRESS\s+\w+/gi, '')

    // 3. 处理注释
    processed = processed
      .replace(/--[^\n]*/g, '')  // 移除单行注释
      .replace(/\/\*[^*]*\*+(?:[^/*][^*]*\*+)*\//g, '')  // 移除多行注释

    // 4. 处理特殊字符和引号
    processed = processed.replace(/[`\[\]]/g, '"')  // 统一引号格式

    console.log('预处理后的DDL语句:', processed)
    return processed
  }

  console.log('原始达梦DDL:', dmDdl)
  const processedDm = preprocessDdlStatement(dmDdl)
  console.log('预处理后达梦DDL:', processedDm)
  console.log('')
  
  console.log('原始MySQL DDL:', mysqlDdl)
  const processedMysql = preprocessDdlStatement(mysqlDdl)
  console.log('预处理后MySQL DDL:', processedMysql)
  console.log('')
  
  console.log('原始带注释DDL:', ddlWithComments)
  const processedWithComments = preprocessDdlStatement(ddlWithComments)
  console.log('预处理后带注释DDL:', processedWithComments)
  console.log('')
}

// 测试正则表达式解析
function testRegexParsing() {
  console.log('=== 测试正则表达式解析功能 ===')
  
  // 模拟达梦数据库解析策略
  const parseWithDmDatabaseRegex = (ddlStatement) => {
    console.log('输入DDL:', ddlStatement)
    
    const result = {
      tableName: '',
      fields: [],
      databaseType: '达梦数据库'
    }

    try {
      // 提取表名
      const tableNameMatch = ddlStatement.match(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([\w\.\"\`\[\]]+)/i)
      if (tableNameMatch && tableNameMatch[1]) {
        result.tableName = tableNameMatch[1].replace(/["`\[\]]/g, '')
        console.log('提取的表名:', result.tableName)
      }

      // 提取字段定义部分
      const createTableIndex = ddlStatement.toLowerCase().indexOf('create table')
      if (createTableIndex === -1) {
        throw new Error('未找到CREATE TABLE关键字')
      }

      const leftParenIndex = ddlStatement.indexOf('(', createTableIndex)
      if (leftParenIndex === -1) {
        throw new Error('未找到字段定义部分的左括号')
      }

      // 使用计数器跟踪括号嵌套深度
      let depth = 1
      let rightParenIndex = leftParenIndex + 1
      const length = ddlStatement.length

      while (rightParenIndex < length && depth > 0) {
        const char = ddlStatement[rightParenIndex]
        if (char === '(') {
          depth++
        } else if (char === ')') {
          depth--
        }
        rightParenIndex++
      }

      if (depth !== 0) {
        throw new Error('括号不匹配')
      }

      const fieldsSection = ddlStatement.substring(leftParenIndex + 1, rightParenIndex - 1)
      console.log('字段定义部分:', fieldsSection)

      // 匹配字段定义
      const fieldRegex = /"([^"]+)"\s+[^,]+?(?:COMMENT\s+'([^']+)'|COMMENT\s+"([^"]+)")?/gim
      const fields = []
      let match

      while ((match = fieldRegex.exec(fieldsSection)) !== null) {
        if (match[1]) {
          const fieldName = match[1]
          const comment = match[2] || match[3] || ''
          
          // 提取数据类型
          const fieldDefinition = match[0]
          const typeMatch = fieldDefinition.match(/\s+(\w+)(?:\([^)]*\))?/)
          const type = typeMatch ? typeMatch[1].toUpperCase() : 'VARCHAR'

          // 检查是否可为空
          const nullable = !/NOT\s+NULL/i.test(fieldDefinition)

          // 提取默认值
          const defaultMatch = fieldDefinition.match(/DEFAULT\s+([^,\s]+)/i)
          const defaultValue = defaultMatch ? defaultMatch[1] : null

          fields.push({
            name: fieldName,
            type: type,
            nullable: nullable,
            defaultValue: defaultValue,
            comment: comment
          })
        }
      }

      // 去重
      const uniqueFields = new Map()
      fields.forEach(field => {
        uniqueFields.set(field.name, field)
      })

      result.fields = Array.from(uniqueFields.values())
      console.log('解析出的字段数量:', result.fields.length)
      console.log('字段详情:', result.fields)

      return result
    } catch (error) {
      console.error('解析失败:', error.message)
      throw error
    }
  }

  // 测试达梦DDL
  console.log('1. 测试达梦数据库DDL:')
  try {
    const result1 = parseWithDmDatabaseRegex(dmDdl)
    console.log('解析成功，字段数量:', result1.fields.length)
  } catch (error) {
    console.log('解析失败:', error.message)
  }
  console.log('')

  // 测试MySQL DDL
  console.log('2. 测试MySQL DDL:')
  try {
    const result2 = parseWithDmDatabaseRegex(mysqlDdl)
    console.log('解析成功，字段数量:', result2.fields.length)
  } catch (error) {
    console.log('解析失败:', error.message)
  }
  console.log('')

  // 测试带注释DDL
  console.log('3. 测试带注释DDL:')
  try {
    const result3 = parseWithDmDatabaseRegex(ddlWithComments)
    console.log('解析成功，字段数量:', result3.fields.length)
  } catch (error) {
    console.log('解析失败:', error.message)
  }
  console.log('')
}

// 运行测试
console.log('开始测试DDL解析功能...\n')
testPreprocessing()
testRegexParsing()
console.log('DDL解析测试完成!')
