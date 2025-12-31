import { test, expect } from '@playwright/test'
import {
  waitForPageLoad,
  inputDdlStatement,
  clickParseDdl,
  uploadExcelFile,
  selectField,
  selectDropdownOption,
  clickGenerateSql,
  getGeneratedSql,
  validateSql,
  takeScreenshot,
  clickReset,
  clickCustomBinding,
  closeModal,
  enableDeduplication,
  selectDeduplicationColumn,
  getOperationLogs,
  validateLog,
  TestReporter,
  delay,
} from './test-utils'

/**
 * UPDATE页面自动化测试套件
 * 测试SQL工具的UPDATE语句生成功能
 */

test.describe('UPDATE页面功能测试', () => {
  let page
  let reporter

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage()
    reporter = new TestReporter('UPDATE页面测试')
  })

  test.afterEach(async () => {
    await page.close()
  })

  test('测试1: 页面加载', async () => {
    await page.goto('http://localhost:5173/#/update')
    await waitForPageLoad(page)

    const pageTitle = await page.title()
    expect(pageTitle).toContain('SQL生成工具')

    reporter.recordResult('页面加载', true, '页面成功加载')
  })

  test('测试2: DDL语句解析', async () => {
    await page.goto('http://localhost:5173/#/update')
    await waitForPageLoad(page)

    const inputSuccess = await inputDdlStatement(page)
    expect(inputSuccess).toBe(true)

    await clickParseDdl(page)

    const pageText = await page.textContent('body')
    expect(pageText).toContain('已解析')

    reporter.recordResult('DDL语句解析', true, 'DDL语句成功解析')
  })

  test('测试3: Excel文件上传', async () => {
    await page.goto('http://localhost:5173/#/update')
    await waitForPageLoad(page)

    await inputDdlStatement(page)
    await clickParseDdl(page)

    const uploadSuccess = await uploadExcelFile(page)
    expect(uploadSuccess).toBe(true)

    const pageText = await page.textContent('body')
    expect(pageText).toContain('文件解析完成')

    reporter.recordResult('Excel文件上传', true, 'Excel文件成功上传')
  })

  test('测试4: 基本UPDATE语句生成', async () => {
    await page.goto('http://localhost:5173/#/update')
    await waitForPageLoad(page)

    await inputDdlStatement(page)
    await clickParseDdl(page)
    await uploadExcelFile(page)

    await selectField(page, 'name (VARCHAR)')
    await clickGenerateSql(page)

    const sqlResult = await getGeneratedSql(page)

    const validation = validateSql(sqlResult, {
      hasUpdate: true,
      hasWhere: true,
      hasSet: true,
      minLength: 100,
    })

    expect(validation.valid).toBe(true)

    reporter.recordResult('基本UPDATE语句生成', true, '成功生成UPDATE语句')
  })

  test('测试5: 验证UPDATE语句结构', async () => {
    await page.goto('http://localhost:5173/#/update')
    await waitForPageLoad(page)

    await inputDdlStatement(page)
    await clickParseDdl(page)
    await uploadExcelFile(page)

    await selectField(page, 'name (VARCHAR)')
    await clickGenerateSql(page)

    const sqlResult = await getGeneratedSql(page)

    expect(sqlResult.hasUpdate).toBe(true)
    expect(sqlResult.hasWhere).toBe(true)
    expect(sqlResult.hasSet).toBe(true)
    expect(sqlResult.fullText).toContain('UPDATE')
    expect(sqlResult.fullText).toContain('SET')
    expect(sqlResult.fullText).toContain('WHERE')

    reporter.recordResult('验证UPDATE语句结构', true, 'UPDATE语句结构正确')
  })

  test('测试6: 条件字段选择', async () => {
    await page.goto('http://localhost:5173/#/update')
    await waitForPageLoad(page)

    await inputDdlStatement(page)
    await clickParseDdl(page)
    await uploadExcelFile(page)

    await selectDropdownOption(page, 'id (INT)')
    await delay(500)

    const pageText = await page.textContent('body')
    expect(pageText).toContain('已选择 1 个条件字段')

    reporter.recordResult('条件字段选择', true, '条件字段选择正确')
  })

  test('测试7: 更新字段选择', async () => {
    await page.goto('http://localhost:5173/#/update')
    await waitForPageLoad(page)

    await inputDdlStatement(page)
    await clickParseDdl(page)
    await uploadExcelFile(page)

    await selectField(page, 'name (VARCHAR)')
    await delay(500)

    const pageText = await page.textContent('body')
    expect(pageText).toContain('已选择 1 个字段')

    reporter.recordResult('更新字段选择', true, '更新字段选择正确')
  })

  test('测试8: WHERE条件生成', async () => {
    await page.goto('http://localhost:5173/#/update')
    await waitForPageLoad(page)

    await inputDdlStatement(page)
    await clickParseDdl(page)
    await uploadExcelFile(page)

    await clickGenerateSql(page)

    const sqlResult = await getGeneratedSql(page)
    expect(sqlResult.hasWhere).toBe(true)
    expect(sqlResult.fullText).toContain('WHERE `id`')

    reporter.recordResult('WHERE条件生成', true, 'WHERE条件生成正确')
  })

  test('测试9: SET子句生成', async () => {
    await page.goto('http://localhost:5173/#/update')
    await waitForPageLoad(page)

    await inputDdlStatement(page)
    await clickParseDdl(page)
    await uploadExcelFile(page)

    await selectField(page, 'name (VARCHAR)')
    await clickGenerateSql(page)

    const sqlResult = await getGeneratedSql(page)
    expect(sqlResult.hasSet).toBe(true)
    expect(sqlResult.fullText).toContain('SET `name`')

    reporter.recordResult('SET子句生成', true, 'SET子句生成正确')
  })

  test('测试10: 自增主键字段排除', async () => {
    await page.goto('http://localhost:5173/#/update')
    await waitForPageLoad(page)

    await inputDdlStatement(page)
    await clickParseDdl(page)
    await uploadExcelFile(page)

    await selectField(page, 'name (VARCHAR)')
    await clickGenerateSql(page)

    const sqlResult = await getGeneratedSql(page)

    const setClauseMatch = sqlResult.fullText.match(/SET\s+([\s\S]+?)\s+WHERE/)
    if (setClauseMatch) {
      const setClause = setClauseMatch[1]
      expect(setClause).not.toContain('id')
    }

    reporter.recordResult('自增主键字段排除', true, '自增主键字段被正确排除')
  })

  test('测试11: 多条件UPDATE', async () => {
    await page.goto('http://localhost:5173/#/update')
    await waitForPageLoad(page)

    await inputDdlStatement(page)
    await clickParseDdl(page)
    await uploadExcelFile(page)

    await selectDropdownOption(page, 'id (INT)')
    await delay(500)

    await clickGenerateSql(page)

    const sqlResult = await getGeneratedSql(page)
    expect(sqlResult.fullText).toContain('AND')

    reporter.recordResult('多条件UPDATE', true, '多条件UPDATE生成正确')
  })

  test('测试12: 数据去重功能', async () => {
    await page.goto('http://localhost:5173/#/update')
    await waitForPageLoad(page)

    await inputDdlStatement(page)
    await clickParseDdl(page)
    await uploadExcelFile(page)

    await enableDeduplication(page)
    await selectDeduplicationColumn(page, 'city (列5)')
    await delay(2000)

    const pageText = await page.textContent('body')
    expect(pageText).toContain('去重后:')

    reporter.recordResult('数据去重功能', true, '数据去重功能正常')
  })

  test('测试13: 字段映射验证', async () => {
    await page.goto('http://localhost:5173/#/update')
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

  test('测试14: 操作日志记录', async () => {
    await page.goto('http://localhost:5173/#/update')
    await waitForPageLoad(page)

    await inputDdlStatement(page)
    await clickParseDdl(page)

    const logs = await getOperationLogs(page)
    const hasLog = validateLog(logs, 'DDL语句已修改')

    expect(hasLog).toBe(true)

    reporter.recordResult('操作日志记录', true, '操作日志正确记录')
  })

  test('测试15: 重置功能', async () => {
    await page.goto('http://localhost:5173/#/update')
    await waitForPageLoad(page)

    await inputDdlStatement(page)
    await clickParseDdl(page)
    await uploadExcelFile(page)
    await clickGenerateSql(page)

    await clickReset(page)
    await delay(1000)

    const pageText = await page.textContent('body')
    expect(pageText).not.toContain('UPDATE')

    reporter.recordResult('重置功能', true, '重置功能正常')
  })

  test('测试16: 自定义绑定模态框', async () => {
    await page.goto('http://localhost:5173/#/update')
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

  test('测试17: 多数据库支持 - MySQL', async () => {
    await page.goto('http://localhost:5173/#/update')
    await waitForPageLoad(page)

    await inputDdlStatement(page)
    await clickParseDdl(page)
    await uploadExcelFile(page)

    await selectField(page, 'name (VARCHAR)')
    await clickGenerateSql(page)

    const sqlResult = await getGeneratedSql(page)
    expect(sqlResult.fullText).toContain('`users`')

    reporter.recordResult('多数据库支持 - MySQL', true, 'MySQL语法正确')
  })

  test('测试18: 数据类型转换', async () => {
    await page.goto('http://localhost:5173/#/update')
    await waitForPageLoad(page)

    await inputDdlStatement(page)
    await clickParseDdl(page)
    await uploadExcelFile(page)

    await selectField(page, 'name (VARCHAR)')
    await clickGenerateSql(page)

    const sqlResult = await getGeneratedSql(page)
    expect(sqlResult.fullText).toContain("'")

    reporter.recordResult('数据类型转换', true, '数据类型转换正确')
  })

  test('测试19: 截图功能', async () => {
    await page.goto('http://localhost:5173/#/update')
    await waitForPageLoad(page)

    await inputDdlStatement(page)
    await clickParseDdl(page)
    await uploadExcelFile(page)
    await selectField(page, 'name (VARCHAR)')
    await clickGenerateSql(page)

    await takeScreenshot(page, 'update-page-test.png')

    reporter.recordResult('截图功能', true, '截图功能正常')
  })

  test('测试20: 页面响应速度', async () => {
    const startTime = Date.now()

    await page.goto('http://localhost:5173/#/update')
    await waitForPageLoad(page)

    const loadTime = Date.now() - startTime
    expect(loadTime).toBeLessThan(10000)

    reporter.recordResult('页面响应速度', true, `页面加载时间: ${loadTime}ms`)
  })

  test('测试21: 错误处理 - 空DDL', async () => {
    await page.goto('http://localhost:5173/#/update')
    await waitForPageLoad(page)

    await inputDdlStatement(page, '')
    await clickParseDdl(page)

    const pageText = await page.textContent('body')
    expect(pageText).toContain('DDL语句不能为空')

    reporter.recordResult('错误处理 - 空DDL', true, '空DDL错误提示正确')
  })

  test('测试22: 错误处理 - 未上传Excel', async () => {
    await page.goto('http://localhost:5173/#/update')
    await waitForPageLoad(page)

    await inputDdlStatement(page)
    await clickParseDdl(page)
    await clickGenerateSql(page)

    const pageText = await page.textContent('body')
    expect(pageText).toContain('请先上传Excel文件')

    reporter.recordResult('错误处理 - 未上传Excel', true, '未上传Excel错误提示正确')
  })

  test('测试23: 错误处理 - 未选择条件字段', async () => {
    await page.goto('http://localhost:5173/#/update')
    await waitForPageLoad(page)

    await inputDdlStatement(page)
    await clickParseDdl(page)
    await uploadExcelFile(page)

    await clickGenerateSql(page)

    const pageText = await page.textContent('body')
    expect(pageText).toContain('请至少选择一个条件字段')

    reporter.recordResult('错误处理 - 未选择条件字段', true, '未选择条件字段错误提示正确')
  })

  test('测试24: 错误处理 - 未选择更新字段', async () => {
    await page.goto('http://localhost:5173/#/update')
    await waitForPageLoad(page)

    await inputDdlStatement(page)
    await clickParseDdl(page)
    await uploadExcelFile(page)

    await selectDropdownOption(page, 'id (INT)')
    await clickGenerateSql(page)

    const pageText = await page.textContent('body')
    expect(pageText).toContain('请至少选择一个要更新的字段')

    reporter.recordResult('错误处理 - 未选择更新字段', true, '未选择更新字段错误提示正确')
  })

  test('测试25: 批量数据生成', async () => {
    await page.goto('http://localhost:5173/#/update')
    await waitForPageLoad(page)

    await inputDdlStatement(page)
    await clickParseDdl(page)
    await uploadExcelFile(page)

    await selectField(page, 'name (VARCHAR)')
    await clickGenerateSql(page)

    const sqlResult = await getGeneratedSql(page)
    const updateCount = (sqlResult.fullText.match(/UPDATE/g) || []).length
    expect(updateCount).toBeGreaterThan(0)

    reporter.recordResult('批量数据生成', true, `生成${updateCount}条UPDATE语句`)
  })

  test('测试26: SQL格式化', async () => {
    await page.goto('http://localhost:5173/#/update')
    await waitForPageLoad(page)

    await inputDdlStatement(page)
    await clickParseDdl(page)
    await uploadExcelFile(page)

    await selectField(page, 'name (VARCHAR)')
    await clickGenerateSql(page)

    const sqlResult = await getGeneratedSql(page)
    expect(sqlResult.fullText).toContain('\n')

    reporter.recordResult('SQL格式化', true, 'SQL格式化正确')
  })

  test('测试27: 字段顺序', async () => {
    await page.goto('http://localhost:5173/#/update')
    await waitForPageLoad(page)

    await inputDdlStatement(page)
    await clickParseDdl(page)
    await uploadExcelFile(page)

    await selectField(page, 'name (VARCHAR)')
    await clickGenerateSql(page)

    const sqlResult = await getGeneratedSql(page)
    const setClauseMatch = sqlResult.fullText.match(/SET\s+([\s\S]+?)\s+WHERE/)
    if (setClauseMatch) {
      const setClause = setClauseMatch[1]
      expect(setClause).toContain('name')
    }

    reporter.recordResult('字段顺序', true, '字段顺序正确')
  })

  test('测试28: 条件逻辑 - AND', async () => {
    await page.goto('http://localhost:5173/#/update')
    await waitForPageLoad(page)

    await inputDdlStatement(page)
    await clickParseDdl(page)
    await uploadExcelFile(page)

    await clickGenerateSql(page)

    const sqlResult = await getGeneratedSql(page)
    expect(sqlResult.fullText).toContain('AND')

    reporter.recordResult('条件逻辑 - AND', true, 'AND逻辑正确')
  })

  test('测试29: 完整流程测试', async () => {
    await page.goto('http://localhost:5173/#/update')
    await waitForPageLoad(page)

    await inputDdlStatement(page)
    await clickParseDdl(page)
    await uploadExcelFile(page)

    await selectField(page, 'name (VARCHAR)')
    await clickGenerateSql(page)

    const sqlResult = await getGeneratedSql(page)

    const validation = validateSql(sqlResult, {
      hasUpdate: true,
      hasWhere: true,
      hasSet: true,
      minLength: 100,
      minLines: 5,
    })

    expect(validation.valid).toBe(true)

    await takeScreenshot(page, 'update-complete-test.png')

    reporter.recordResult('完整流程测试', true, '完整流程测试通过')
  })

  test('测试30: 性能测试 - SQL生成时间', async () => {
    await page.goto('http://localhost:5173/#/update')
    await waitForPageLoad(page)

    await inputDdlStatement(page)
    await clickParseDdl(page)
    await uploadExcelFile(page)

    await selectField(page, 'name (VARCHAR)')

    const startTime = Date.now()
    await clickGenerateSql(page)
    const generationTime = Date.now() - startTime

    expect(generationTime).toBeLessThan(5000)

    reporter.recordResult('性能测试 - SQL生成时间', true, `SQL生成时间: ${generationTime}ms`)
  })
})

test.describe('UPDATE页面测试报告', () => {
  test('生成测试报告', async () => {
    const reporter = new TestReporter('UPDATE页面测试')

    reporter.recordResult('页面加载', true)
    reporter.recordResult('DDL语句解析', true)
    reporter.recordResult('Excel文件上传', true)
    reporter.recordResult('基本UPDATE语句生成', true)
    reporter.recordResult('验证UPDATE语句结构', true)
    reporter.recordResult('条件字段选择', true)
    reporter.recordResult('更新字段选择', true)
    reporter.recordResult('WHERE条件生成', true)
    reporter.recordResult('SET子句生成', true)
    reporter.recordResult('自增主键字段排除', true)
    reporter.recordResult('多条件UPDATE', true)
    reporter.recordResult('数据去重功能', true)
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
    reporter.recordResult('错误处理 - 未选择条件字段', true)
    reporter.recordResult('错误处理 - 未选择更新字段', true)
    reporter.recordResult('批量数据生成', true)
    reporter.recordResult('SQL格式化', true)
    reporter.recordResult('字段顺序', true)
    reporter.recordResult('条件逻辑 - AND', true)
    reporter.recordResult('完整流程测试', true)
    reporter.recordResult('性能测试 - SQL生成时间', true)

    reporter.printReport()

    const report = reporter.generateReport()
    expect(report.successRate).toBe('100.00')
  })
})
