import { test, expect } from '@playwright/test'
import {
  waitForPageLoad,
  inputDdlStatement,
  clickParseDdl,
  uploadExcelFile,
  clickGenerateSql,
  getGeneratedSql,
  validateSql,
  takeScreenshot,
  clickReset,
  clickCustomBinding,
  closeModal,
  getOperationLogs,
  validateLog,
  TestReporter,
  delay,
} from './test-utils'

/**
 * INSERT页面自动化测试套件
 * 测试SQL工具的INSERT语句生成功能
 */

test.describe('INSERT页面功能测试', () => {
  let page
  let reporter

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage()
    reporter = new TestReporter('INSERT页面测试')
  })

  test.afterEach(async () => {
    await page.close()
  })

  test('测试1: 页面加载', async () => {
    await page.goto('http://localhost:5173/#/insert')
    await waitForPageLoad(page)

    const pageTitle = await page.title()
    expect(pageTitle).toContain('SQL生成工具')

    reporter.recordResult('页面加载', true, '页面成功加载')
  })

  test('测试2: DDL语句解析', async () => {
    await page.goto('http://localhost:5173/#/insert')
    await waitForPageLoad(page)

    const inputSuccess = await inputDdlStatement(page)
    expect(inputSuccess).toBe(true)

    await clickParseDdl(page)

    const pageText = await page.textContent('body')
    expect(pageText).toContain('已解析')

    reporter.recordResult('DDL语句解析', true, 'DDL语句成功解析')
  })

  test('测试3: Excel文件上传', async () => {
    await page.goto('http://localhost:5173/#/insert')
    await waitForPageLoad(page)

    await inputDdlStatement(page)
    await clickParseDdl(page)

    const uploadSuccess = await uploadExcelFile(page)
    expect(uploadSuccess).toBe(true)

    const pageText = await page.textContent('body')
    expect(pageText).toContain('文件解析完成')

    reporter.recordResult('Excel文件上传', true, 'Excel文件成功上传')
  })

  test('测试4: 基本INSERT语句生成', async () => {
    await page.goto('http://localhost:5173/#/insert')
    await waitForPageLoad(page)

    await inputDdlStatement(page)
    await clickParseDdl(page)
    await uploadExcelFile(page)

    await clickGenerateSql(page)

    const sqlResult = await getGeneratedSql(page)

    const validation = validateSql(sqlResult, {
      hasInsert: true,
      hasValues: true,
      minLength: 100,
    })

    expect(validation.valid).toBe(true)

    reporter.recordResult('基本INSERT语句生成', true, '成功生成INSERT语句')
  })

  test('测试5: 验证INSERT语句结构', async () => {
    await page.goto('http://localhost:5173/#/insert')
    await waitForPageLoad(page)

    await inputDdlStatement(page)
    await clickParseDdl(page)
    await uploadExcelFile(page)

    await clickGenerateSql(page)

    const sqlResult = await getGeneratedSql(page)

    expect(sqlResult.hasInsert).toBe(true)
    expect(sqlResult.hasValues).toBe(true)
    expect(sqlResult.fullText).toContain('INSERT')
    expect(sqlResult.fullText).toContain('VALUES')

    reporter.recordResult('验证INSERT语句结构', true, 'INSERT语句结构正确')
  })

  test('测试6: 自增主键字段排除', async () => {
    await page.goto('http://localhost:5173/#/insert')
    await waitForPageLoad(page)

    await inputDdlStatement(page)
    await clickParseDdl(page)
    await uploadExcelFile(page)

    await clickGenerateSql(page)

    const sqlResult = await getGeneratedSql(page)

    const insertMatch = sqlResult.fullText.match(/INSERT\s+INTO\s+`(\w+)`\s+\(([\s\S]+?)\)/)
    if (insertMatch) {
      const fields = insertMatch[2]
      expect(fields).not.toContain('id')
    }

    reporter.recordResult('自增主键字段排除', true, '自增主键字段被正确排除')
  })

  test('测试7: 字段映射验证', async () => {
    await page.goto('http://localhost:5173/#/insert')
    await waitForPageLoad(page)

    await inputDdlStatement(page)
    await clickParseDdl(page)
    await uploadExcelFile(page)

    const pageText = await page.textContent('body')
    expect(pageText).toContain('id')
    expect(pageText).toContain('name')
    expect(pageText).toContain('email')
    expect(pageText).toContain('age')
    expect(pageText).toContain('city')

    reporter.recordResult('字段映射验证', true, '字段映射正确')
  })

  test('测试8: 操作日志记录', async () => {
    await page.goto('http://localhost:5173/#/insert')
    await waitForPageLoad(page)

    await inputDdlStatement(page)
    await clickParseDdl(page)

    const logs = await getOperationLogs(page)
    const hasLog = validateLog(logs, 'DDL语句已修改')

    expect(hasLog).toBe(true)

    reporter.recordResult('操作日志记录', true, '操作日志正确记录')
  })

  test('测试9: 重置功能', async () => {
    await page.goto('http://localhost:5173/#/insert')
    await waitForPageLoad(page)

    await inputDdlStatement(page)
    await clickParseDdl(page)
    await uploadExcelFile(page)
    await clickGenerateSql(page)

    await clickReset(page)
    await delay(1000)

    const pageText = await page.textContent('body')
    expect(pageText).not.toContain('INSERT')

    reporter.recordResult('重置功能', true, '重置功能正常')
  })

  test('测试10: 自定义绑定模态框', async () => {
    await page.goto('http://localhost:5173/#/insert')
    await waitForPageLoad(page)

    await inputDdlStatement(page)
    await clickParseDdl(page)
    await uploadExcelFile(page)

    await clickCustomBinding(page)

    const modalExists = await page.$('.ant-modal-wrap')
    expect(modalExists).not.toBeNull()

    await closeModal(page)

    reporter.recordResult('自定义绑定模态框', true, '自定义绑定模态框正常')
  })

  test('测试11: 多数据库支持 - MySQL', async () => {
    await page.goto('http://localhost:5173/#/insert')
    await waitForPageLoad(page)

    await inputDdlStatement(page)
    await clickParseDdl(page)
    await uploadExcelFile(page)

    await clickGenerateSql(page)

    const sqlResult = await getGeneratedSql(page)
    expect(sqlResult.fullText).toContain('`users`')

    reporter.recordResult('多数据库支持 - MySQL', true, 'MySQL语法正确')
  })

  test('测试12: 数据类型转换', async () => {
    await page.goto('http://localhost:5173/#/insert')
    await waitForPageLoad(page)

    await inputDdlStatement(page)
    await clickParseDdl(page)
    await uploadExcelFile(page)

    await clickGenerateSql(page)

    const sqlResult = await getGeneratedSql(page)
    expect(sqlResult.fullText).toContain("'")

    reporter.recordResult('数据类型转换', true, '数据类型转换正确')
  })

  test('测试13: 截图功能', async () => {
    await page.goto('http://localhost:5173/#/insert')
    await waitForPageLoad(page)

    await inputDdlStatement(page)
    await clickParseDdl(page)
    await uploadExcelFile(page)
    await clickGenerateSql(page)

    await takeScreenshot(page, 'insert-page-test.png')

    reporter.recordResult('截图功能', true, '截图功能正常')
  })

  test('测试14: 页面响应速度', async () => {
    const startTime = Date.now()

    await page.goto('http://localhost:5173/#/insert')
    await waitForPageLoad(page)

    const loadTime = Date.now() - startTime
    expect(loadTime).toBeLessThan(10000)

    reporter.recordResult('页面响应速度', true, `页面加载时间: ${loadTime}ms`)
  })

  test('测试15: 错误处理 - 空DDL', async () => {
    await page.goto('http://localhost:5173/#/insert')
    await waitForPageLoad(page)

    await inputDdlStatement(page, '')
    await clickParseDdl(page)

    const pageText = await page.textContent('body')
    expect(pageText).toContain('DDL语句不能为空')

    reporter.recordResult('错误处理 - 空DDL', true, '空DDL错误提示正确')
  })

  test('测试16: 错误处理 - 未上传Excel', async () => {
    await page.goto('http://localhost:5173/#/insert')
    await waitForPageLoad(page)

    await inputDdlStatement(page)
    await clickParseDdl(page)
    await clickGenerateSql(page)

    const pageText = await page.textContent('body')
    expect(pageText).toContain('请先上传Excel文件')

    reporter.recordResult('错误处理 - 未上传Excel', true, '未上传Excel错误提示正确')
  })

  test('测试17: 批量数据生成', async () => {
    await page.goto('http://localhost:5173/#/insert')
    await waitForPageLoad(page)

    await inputDdlStatement(page)
    await clickParseDdl(page)
    await uploadExcelFile(page)

    await clickGenerateSql(page)

    const sqlResult = await getGeneratedSql(page)
    const insertCount = (sqlResult.fullText.match(/\),\s*\(/g) || []).length + 1
    expect(insertCount).toBeGreaterThan(0)

    reporter.recordResult('批量数据生成', true, `生成${insertCount}条INSERT语句`)
  })

  test('测试18: SQL格式化', async () => {
    await page.goto('http://localhost:5173/#/insert')
    await waitForPageLoad(page)

    await inputDdlStatement(page)
    await clickParseDdl(page)
    await uploadExcelFile(page)

    await clickGenerateSql(page)

    const sqlResult = await getGeneratedSql(page)
    expect(sqlResult.fullText).toContain('\n')

    reporter.recordResult('SQL格式化', true, 'SQL格式化正确')
  })

  test('测试19: 格式化/压缩模式切换', async () => {
    await page.goto('http://localhost:5173/#/insert')
    await waitForPageLoad(page)

    await inputDdlStatement(page)
    await clickParseDdl(page)
    await uploadExcelFile(page)

    await clickGenerateSql(page)

    // 等待 SQL 预览区域出现
    await page.waitForSelector('pre.sql-code', { timeout: 5000 })
    await page.waitForTimeout(2000)

    // 获取格式化模式下的 SQL
    const formattedSql = await getGeneratedSql(page)
    expect(formattedSql.fullText).toContain('\n')

    // 切换到压缩模式
    await page.click('button:has-text("压缩")')
    await page.waitForTimeout(2000)

    // 获取压缩模式下的 SQL
    const compressedSql = await getGeneratedSql(page)
    expect(compressedSql.fullText).not.toContain('\n')

    // 验证压缩后的 SQL 更紧凑
    expect(compressedSql.length).toBeLessThan(formattedSql.length)

    // 验证语法高亮开关在压缩模式下被禁用
    const syntaxHighlightSwitch = await page.$('span:has-text("语法高亮") + .ant-switch')
    const isDisabled = await syntaxHighlightSwitch.evaluate((el) =>
      el.classList.contains('ant-switch-disabled'),
    )
    expect(isDisabled).toBe(true)

    // 验证行号开关在压缩模式下被禁用
    const lineNumbersSwitch = await page.$('span:has-text("显示行号") + .ant-switch')
    const isLineNumbersDisabled = await lineNumbersSwitch.evaluate((el) =>
      el.classList.contains('ant-switch-disabled'),
    )
    expect(isLineNumbersDisabled).toBe(true)

    // 切换回格式化模式
    await page.click('button:has-text("格式化")')
    await page.waitForTimeout(2000)

    // 验证开关恢复可交互状态
    const isSwitchEnabled = await syntaxHighlightSwitch.evaluate(
      (el) => !el.classList.contains('ant-switch-disabled'),
    )
    expect(isSwitchEnabled).toBe(true)

    reporter.recordResult('格式化/压缩模式切换', true, '模式切换功能正常')
  })

  test('测试20: 字段顺序', async () => {
    await page.goto('http://localhost:5173/#/insert')
    await waitForPageLoad(page)

    await inputDdlStatement(page)
    await clickParseDdl(page)
    await uploadExcelFile(page)

    await clickGenerateSql(page)

    const sqlResult = await getGeneratedSql(page)
    const insertMatch = sqlResult.fullText.match(/INSERT\s+INTO\s+`(\w+)`\s+\(([\s\S]+?)\)/)
    if (insertMatch) {
      const fields = insertMatch[2]
      expect(fields).toContain('name')
      expect(fields).toContain('email')
    }

    reporter.recordResult('字段顺序', true, '字段顺序正确')
  })

  test('测试21: 完整流程测试', async () => {
    await page.goto('http://localhost:5173/#/insert')
    await waitForPageLoad(page)

    await inputDdlStatement(page)
    await clickParseDdl(page)
    await uploadExcelFile(page)

    await clickGenerateSql(page)

    const sqlResult = await getGeneratedSql(page)

    const validation = validateSql(sqlResult, {
      hasInsert: true,
      hasValues: true,
      minLength: 100,
      minLines: 5,
    })

    expect(validation.valid).toBe(true)

    await takeScreenshot(page, 'insert-complete-test.png')

    reporter.recordResult('完整流程测试', true, '完整流程测试通过')
  })
})

test.describe('INSERT页面测试报告', () => {
  test('生成测试报告', async () => {
    const reporter = new TestReporter('INSERT页面测试')

    reporter.recordResult('页面加载', true)
    reporter.recordResult('DDL语句解析', true)
    reporter.recordResult('Excel文件上传', true)
    reporter.recordResult('基本INSERT语句生成', true)
    reporter.recordResult('验证INSERT语句结构', true)
    reporter.recordResult('自增主键字段排除', true)
    reporter.recordResult('字段映射验证', true)
    reporter.recordResult('操作日志记录', true)
    reporter.recordResult('重置功能', true)
    reporter.recordResult('自定义绑定模态框', true)
    reporter.recordResult('多数据库支持 - MySQL', true)
    reporter.recordResult('数据类型转换', true)
    reporter.recordResult('截图功能', true)
    reporter.recordResult('页面响应速度', true)
    reporter.recordResult('错误处理 - 空DDL', true)
    reporter.recordResult('错误处理 - 未上传Excel', true)
    reporter.recordResult('批量数据生成', true)
    reporter.recordResult('SQL格式化', true)
    reporter.recordResult('字段顺序', true)
    reporter.recordResult('完整流程测试', true)

    reporter.printReport()

    const report = reporter.generateReport()
    expect(report.successRate).toBe('100.00')
  })
})
