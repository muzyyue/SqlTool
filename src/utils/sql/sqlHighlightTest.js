/**
 * SQL语法高亮功能测试
 * 验证INSERT语句的语法高亮效果
 */

import { sqlHighlighter } from "./sqlSyntaxHighlighter.js";

// 测试用的INSERT语句
const testSqlStatements = [
  // 基础INSERT语句
  `INSERT INTO users (id, username, email, age, created_at)
   VALUES (1, 'john_doe', 'john@example.com', 25, '2023-12-01 10:30:00');`,

  // 多行INSERT语句
  `INSERT INTO products (name, price, category, description)
   VALUES 
   ('Laptop', 999.99, 'Electronics', 'High-performance laptop with 16GB RAM'),
   ('Mouse', 29.99, 'Electronics', 'Wireless optical mouse'),
   ('Keyboard', 79.99, 'Electronics', 'Mechanical gaming keyboard');`,

  // 包含注释的INSERT语句
  `-- 插入用户数据
   INSERT INTO customers (
     customer_id,    -- 客户ID（主键）
     name,           -- 客户姓名
     email,          -- 邮箱地址
     phone,          -- 电话号码
     registration_date  -- 注册日期
   )
   VALUES (
     1001,
     '张三',
     'zhangsan@example.com',
     '13800138000',
     CURRENT_TIMESTAMP
   );`,

  // 复杂的INSERT语句
  `INSERT INTO orders (
    order_id,
    customer_id,
    total_amount,
    order_date,
    status,
    notes
  ) 
  SELECT 
    2001,
    c.customer_id,
    SUM(p.price * oi.quantity),
    '2023-12-01',
    'pending',
    'Online order'
  FROM customers c
  JOIN order_items oi ON c.customer_id = oi.customer_id
  JOIN products p ON oi.product_id = p.product_id
  WHERE c.customer_id = 1001
  GROUP BY c.customer_id;`,

  // INSERT ... ON DUPLICATE KEY UPDATE
  `INSERT INTO user_preferences (
    user_id,
    theme,
    language,
    notifications
  ) VALUES (
    1,
    'dark',
    'zh-CN',
    true
  ) ON DUPLICATE KEY UPDATE
    theme = VALUES(theme),
    language = VALUES(language),
    notifications = VALUES(notifications);`,
];

/**
 * 执行语法高亮测试
 */
function testSyntaxHighlighting() {
  console.log("=== SQL语法高亮功能测试 ===\n");

  testSqlStatements.forEach((sql, index) => {
    console.log(`测试用例 ${index + 1}:`);
    console.log("原始SQL:");
    console.log(sql);
    console.log("\n高亮后的HTML:");

    try {
      const highlightedHtml = sqlHighlighter.highlight(sql);
      console.log(highlightedHtml);
      console.log("\n" + "=".repeat(80) + "\n");
    } catch (error) {
      console.error("语法高亮失败:", error.message);
      console.log("\n" + "=".repeat(80) + "\n");
    }
  });
}

/**
 * 验证高亮结果的正确性
 */
function validateHighlightResults() {
  console.log("=== 语法高亮结果验证 ===\n");

  const testSql = `INSERT INTO users (id, username, email) VALUES (1, 'john_doe', 'john@example.com');`;

  try {
    const highlightedHtml = sqlHighlighter.highlight(testSql);

    // 检查是否包含预期的CSS类
    const expectedClasses = [
      "sql-keyword", // INSERT, INTO, VALUES
      "sql-table", // users
      "sql-column", // id, username, email
      "sql-number", // 1
      "sql-string", // 'john_doe', 'john@example.com'
    ];

    let validationPassed = true;

    expectedClasses.forEach((className) => {
      if (highlightedHtml.includes(`class="${className}"`)) {
        console.log(`✓ 找到CSS类: ${className}`);
      } else {
        console.log(`✗ 缺少CSS类: ${className}`);
        validationPassed = false;
      }
    });

    console.log(`\n验证结果: ${validationPassed ? "通过" : "失败"}`);
    console.log("高亮后的HTML:");
    console.log(highlightedHtml);

    return validationPassed;
  } catch (error) {
    console.error("验证过程中出现错误:", error.message);
    return false;
  }
}

// 导出测试函数
export { testSyntaxHighlighting, validateHighlightResults, testSqlStatements };

// 如果直接运行此文件，执行测试
if (typeof window === "undefined") {
  // Node.js环境
  testSyntaxHighlighting();
  console.log("\n");
  validateHighlightResults();
}
