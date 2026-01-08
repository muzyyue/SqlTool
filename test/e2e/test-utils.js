/**
 * 测试工具函数
 * 提供常用的测试辅助函数，简化测试脚本编写
 */

/**
 * 测试DDL语句模板
 * @returns {string} DDL语句字符串
 */
export const TEST_DDL = `CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE,
  age INT,
  city VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)`;

/**
 * 测试Excel文件名
 */
export const TEST_EXCEL_FILE = 'test_update.xlsx';

/**
 * 等待页面完全加载
 * @param {Page} page - Playwright页面对象
 * @param {number} timeout - 超时时间（毫秒），默认5000ms
 * @returns {Promise<void>}
 */
export async function waitForPageLoad(page, timeout = 5000) {
  await page.waitForTimeout(timeout);
}

/**
 * 输入DDL语句到文本框
 * @param {Page} page - Playwright页面对象
 * @param {string} ddl - DDL语句
 * @returns {Promise<boolean>} 是否成功输入
 */
export async function inputDdlStatement(page, ddl = TEST_DDL) {
  const result = await page.evaluate((ddlText) => {
    const textareas = document.querySelectorAll('textarea');
    if (textareas.length > 0) {
      const textarea = textareas[0];
      textarea.value = ddlText;
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
      textarea.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    }
    return false;
  }, ddl);

  return result;
}

/**
 * 点击"解析DDL"按钮
 * @param {Page} page - Playwright页面对象
 * @returns {Promise<void>}
 */
export async function clickParseDdl(page) {
  await page.click('button:has-text("解析DDL")');
  await page.waitForTimeout(2000);
}

/**
 * 上传Excel文件
 * @param {Page} page - Playwright页面对象
 * @param {string} fileName - 文件名
 * @param {string} baseUrl - 基础URL
 * @returns {Promise<boolean>} 是否成功上传
 */
export async function uploadExcelFile(page, fileName = TEST_EXCEL_FILE, baseUrl = 'http://localhost:5173') {
  const result = await page.evaluate(async (options) => {
    try {
      const response = await fetch(`${options.baseUrl}/${options.fileName}`);
      const blob = await response.blob();
      const input = document.querySelector('input[type="file"]');
      
      if (!input) {
        return { success: false, error: 'File input not found' };
      }

      const file = new File([blob], options.fileName, { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      input.files = dataTransfer.files;
      input.dispatchEvent(new Event('change', { bubbles: true }));
      
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }, { fileName, baseUrl });

  await page.waitForTimeout(2000);
  return result.success;
}

/**
 * 选择字段（复选框）
 * @param {Page} page - Playwright页面对象
 * @param {string} fieldName - 字段名称
 * @returns {Promise<void>}
 */
export async function selectField(page, fieldName) {
  await page.click(`label:has-text("${fieldName}")`);
  await page.waitForTimeout(500);
}

/**
 * 选择下拉选项
 * @param {Page} page - Playwright页面对象
 * @param {string} optionText - 选项文本
 * @returns {Promise<void>}
 */
export async function selectDropdownOption(page, optionText) {
  await page.click('.ant-select-selector');
  await page.click(`.ant-select-item:has-text("${optionText}")`);
  await page.waitForTimeout(500);
}

/**
 * 点击"生成SQL"按钮
 * @param {Page} page - Playwright页面对象
 * @returns {Promise<void>}
 */
export async function clickGenerateSql(page) {
  await page.click('button:has-text("生成SQL")');
  await page.waitForTimeout(2000);
}

/**
 * 获取生成的SQL内容
 * @param {Page} page - Playwright页面对象
 * @returns {Promise<Object>} SQL内容对象
 */
export async function getGeneratedSql(page) {
  const result = await page.evaluate(() => {
    const sqlPre = document.querySelector('pre.sql-code code');
    if (sqlPre) {
      const fullText = sqlPre.textContent;
      return {
        fullText: fullText,
        length: fullText.length,
        hasInsert: fullText.includes('INSERT'),
        hasUpdate: fullText.includes('UPDATE'),
        hasWhere: fullText.includes('WHERE'),
        hasSet: fullText.includes('SET'),
        hasValues: fullText.includes('VALUES'),
        lines: fullText.split('\n').length
      };
    }
    return { error: 'SQL preview not found' };
  });

  return result;
}

/**
 * 验证SQL语句
 * @param {Object} sqlResult - SQL内容对象
 * @param {Object} expectations - 期望值
 * @returns {boolean} 是否验证通过
 */
export function validateSql(sqlResult, expectations) {
  const errors = [];

  if (expectations.hasInsert && !sqlResult.hasInsert) {
    errors.push('缺少INSERT语句');
  }

  if (expectations.hasUpdate && !sqlResult.hasUpdate) {
    errors.push('缺少UPDATE语句');
  }

  if (expectations.hasWhere && !sqlResult.hasWhere) {
    errors.push('缺少WHERE条件');
  }

  if (expectations.hasSet && !sqlResult.hasSet) {
    errors.push('缺少SET子句');
  }

  if (expectations.hasValues && !sqlResult.hasValues) {
    errors.push('缺少VALUES子句');
  }

  if (expectations.minLength && sqlResult.length < expectations.minLength) {
    errors.push(`SQL长度小于期望值：${sqlResult.length} < ${expectations.minLength}`);
  }

  if (expectations.minLines && sqlResult.lines < expectations.minLines) {
    errors.push(`SQL行数小于期望值：${sqlResult.lines} < ${expectations.minLines}`);
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * 截图并保存
 * @param {Page} page - Playwright页面对象
 * @param {string} fileName - 文件名
 * @param {boolean} fullPage - 是否全屏截图，默认true
 * @returns {Promise<void>}
 */
export async function takeScreenshot(page, fileName, fullPage = true) {
  await page.screenshot({ 
    fullPage, 
    path: `test-results/${fileName}` 
  });
}

/**
 * 启用数据去重
 * @param {Page} page - Playwright页面对象
 * @returns {Promise<void>}
 */
export async function enableDeduplication(page) {
  await page.click('label:has-text("启用数据去重")');
  await page.waitForTimeout(500);
}

/**
 * 选择去重字段
 * @param {Page} page - Playwright页面对象
 * @param {string} fieldName - 字段名称
 * @returns {Promise<void>}
 */
export async function selectDeduplicationColumn(page, fieldName) {
  await page.click('.ant-select-selector');
  await page.click(`.ant-select-item:has-text("${fieldName}")`);
  await page.waitForTimeout(500);
}

/**
 * 点击"自定义绑定"按钮
 * @param {Page} page - Playwright页面对象
 * @returns {Promise<void>}
 */
export async function clickCustomBinding(page) {
  await page.click('button:has-text("自定义绑定")');
  await page.waitForTimeout(1000);
}

/**
 * 关闭模态框
 * @param {Page} page - Playwright页面对象
 * @returns {Promise<void>}
 */
export async function closeModal(page) {
  await page.evaluate(() => {
    const modal = document.querySelector('.ant-modal-wrap');
    if (modal) {
      modal.style.display = 'none';
    }
  });
}

/**
 * 获取页面可见文本
 * @param {Page} page - Playwright页面对象
 * @returns {Promise<string>} 页面文本内容
 */
export async function getPageText(page) {
  return await page.evaluate(() => document.body.textContent);
}

/**
 * 等待元素出现
 * @param {Page} page - Playwright页面对象
 * @param {string} selector - CSS选择器
 * @param {number} timeout - 超时时间（毫秒）
 * @returns {Promise<void>}
 */
export async function waitForSelector(page, selector, timeout = 10000) {
  await page.waitForSelector(selector, { timeout });
}

/**
 * 检查元素是否存在
 * @param {Page} page - Playwright页面对象
 * @param {string} selector - CSS选择器
 * @returns {Promise<boolean>} 是否存在
 */
export async function elementExists(page, selector) {
  return await page.$(selector) !== null;
}

/**
 * 获取元素文本
 * @param {Page} page - Playwright页面对象
 * @param {string} selector - CSS选择器
 * @returns {Promise<string|null>} 元素文本
 */
export async function getElementText(page, selector) {
  const element = await page.$(selector);
  if (!element) {
    return null;
  }
  return await element.textContent();
}

/**
 * 点击"重置"按钮
 * @param {Page} page - Playwright页面对象
 * @returns {Promise<void>}
 */
export async function clickReset(page) {
  await page.click('button:has-text("重置")');
  await page.waitForTimeout(1000);
}

/**
 * 获取操作日志
 * @param {Page} page - Playwright页面对象
 * @returns {Promise<Array>} 操作日志数组
 */
export async function getOperationLogs(page) {
  return await page.evaluate(() => {
    const logItems = document.querySelectorAll('.log-item');
    return Array.from(logItems).map(item => item.textContent);
  });
}

/**
 * 验证操作日志
 * @param {Array} logs - 操作日志数组
 * @param {string} expectedLog - 期望的日志内容
 * @returns {boolean} 是否包含期望日志
 */
export function validateLog(logs, expectedLog) {
  return logs.some(log => log.includes(expectedLog));
}

/**
 * 测试报告生成器
 */
export class TestReporter {
  constructor(testName) {
    this.testName = testName;
    this.startTime = Date.now();
    this.results = [];
    this.errors = [];
  }

  /**
   * 记录测试结果
   * @param {string} testName - 测试名称
   * @param {boolean} passed - 是否通过
   * @param {string} message - 消息
   */
  recordResult(testName, passed, message = '') {
    this.results.push({
      testName,
      passed,
      message,
      timestamp: new Date().toISOString()
    });

    if (!passed) {
      this.errors.push({ testName, message });
    }
  }

  /**
   * 生成测试报告
   * @returns {Object} 测试报告对象
   */
  generateReport() {
    const endTime = Date.now();
    const duration = endTime - this.startTime;

    return {
      testName: this.testName,
      startTime: new Date(this.startTime).toISOString(),
      endTime: new Date(endTime).toISOString(),
      duration,
      totalTests: this.results.length,
      passedTests: this.results.filter(r => r.passed).length,
      failedTests: this.results.filter(r => !r.passed).length,
      successRate: ((this.results.filter(r => r.passed).length / this.results.length) * 100).toFixed(2),
      results: this.results,
      errors: this.errors
    };
  }

  /**
   * 打印测试报告
   */
  printReport() {
    const report = this.generateReport();
    console.log('\n========================================');
    console.log(`测试报告: ${report.testName}`);
    console.log('========================================');
    console.log(`开始时间: ${report.startTime}`);
    console.log(`结束时间: ${report.endTime}`);
    console.log(`持续时间: ${report.duration}ms`);
    console.log(`总测试数: ${report.totalTests}`);
    console.log(`通过数: ${report.passedTests}`);
    console.log(`失败数: ${report.failedTests}`);
    console.log(`成功率: ${report.successRate}%`);
    console.log('========================================\n');

    if (report.errors.length > 0) {
      console.log('失败的测试:');
      report.errors.forEach((error, index) => {
        console.log(`${index + 1}. ${error.testName}: ${error.message}`);
      });
      console.log('');
    }
  }
}

/**
 * 延迟函数
 * @param {number} ms - 延迟毫秒数
 * @returns {Promise<void>}
 */
export function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
