/**
 * INSERT页面 Page Object Model
 * 封装INSERT页面的所有操作和元素定位
 */
export class InsertPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;

    this.locators = {
      ddlInput: page.locator("textarea").first(),
      parseDdlButton: page.locator('button:has-text("解析DDL")').first(),
      fileInput: page.locator('input[type="file"]'),
      generateSqlButton: page.locator('button:has-text("生成SQL")').first(),
      resetButton: page.locator('button:has-text("重置")').first(),
      customBindingButton: page
        .locator('button:has-text("自定义绑定")')
        .first(),
      sqlPreview: page.locator(".sql-code, pre").first(),
      parsedIndicator: page.getByText("已解析", { exact: false }).first(),
      uploadSuccessIndicator: page.getByText(/文件解析成功/i).first(),
      fieldMapping: page.locator(".field-mapping, .ant-table"),
      operationLog: page.locator(".log-item, .operation-log"),
      modal: page.locator(".ant-modal"),
      modalClose: page.locator(".ant-modal-close"),
    };
  }

  /**
   * 导航到 INSERT 页面
   */
  async goto() {
    await this.page.goto("http://localhost:5173/SqlTool/sql/insert");
    await this.page.waitForLoadState("domcontentloaded");
  }

  /**
   * 输入DDL语句
   * @param {string} ddl - DDL语句
   */
  async inputDdl(ddl = TEST_DDL) {
    await this.locators.ddlInput.fill(ddl);
  }

  /**
   * 点击解析 DDL 按钮并等待解析完成
   */
  async parseDdl() {
    // 等待按钮可点击
    await this.locators.parseDdlButton.waitFor({
      state: "visible",
      timeout: 10000,
    });
    await this.locators.parseDdlButton.click();
    await this.locators.parsedIndicator.waitFor({
      state: "visible",
      timeout: 10000,
    });
  }

  /**
   * 上传Excel文件
   * @param {string} filePath - 文件路径
   */
  async uploadExcel(filePath = "test_update.xlsx") {
    const fileInput = await this.page.locator('input[type="file"]');
    await fileInput.setInputFiles(filePath);
    await this.locators.uploadSuccessIndicator.waitFor({
      state: "visible",
      timeout: 15000,
    });
  }

  /**
   * 点击生成SQL按钮并等待结果
   */
  async generateSql() {
    await this.locators.generateSqlButton.click();
    await this.locators.sqlPreview.waitFor({
      state: "visible",
      timeout: 10000,
    });
    await this.page.waitForFunction(
      () => {
        const el = document.querySelector(
          ".sql-code code, pre code, .sql-code, pre",
        );
        return el && el.textContent && el.textContent.length > 50;
      },
      { timeout: 10000 },
    );
  }

  /**
   * 获取生成的SQL内容
   * @returns {Promise<{fullText: string, hasInsert: boolean, hasValues: boolean}>}
   */
  async getSqlContent() {
    const text = await this.locators.sqlPreview.textContent();
    return {
      fullText: text || "",
      hasInsert: text?.includes("INSERT") || false,
      hasValues: text?.includes("VALUES") || false,
      hasUpdate: text?.includes("UPDATE") || false,
      hasWhere: text?.includes("WHERE") || false,
    };
  }

  /**
   * 点击重置按钮
   */
  async reset() {
    await this.locators.resetButton.click();
    await this.page.waitForLoadState("networkidle");
  }

  /**
   * 打开自定义绑定模态框
   */
  async openCustomBinding() {
    await this.locators.customBindingButton.click();
    await this.locators.modal.waitFor({ state: "visible", timeout: 5000 });
  }

  /**
   * 关闭模态框
   */
  async closeModal() {
    await this.locators.modalClose.click();
    await this.locators.modal.waitFor({ state: "hidden", timeout: 5000 });
  }

  /**
   * 检查字段是否存在于映射中
   * @param {string} fieldName - 字段名
   */
  async hasFieldInMapping(fieldName) {
    return this.locators.fieldMapping
      .locator(`text=/${fieldName}/i`)
      .isVisible();
  }

  /**
   * 获取操作日志列表
   * @returns {Promise<string[]>}
   */
  async getOperationLogs() {
    const logs = await this.locators.operationLog.allTextContents();
    return logs;
  }

  /**
   * 等待页面完全加载
   */
  async waitForReady() {
    // 等待页面路由加载完成
    await this.page.waitForLoadState("domcontentloaded");
    await this.page.waitForLoadState("networkidle");

    // 等待 DDL 输入框出现（最基础的元素）
    await this.page.locator("textarea").first().waitFor({
      state: "visible",
      timeout: 15000,
    });

    // 额外等待，确保 Vue 组件完全渲染
    await this.page.waitForTimeout(3000);
  }
}

/**
 * UPDATE页面 Page Object Model
 */
export class UpdatePage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.locators = {
      ddlInput: page.locator("textarea").first(),
      parseDdlButton: page.locator('button:has-text("解析DDL")').first(),
      fileInput: page.locator('input[type="file"]'),
      generateSqlButton: page.locator('button:has-text("生成SQL")').first(),
      resetButton: page.locator('button:has-text("重置")').first(),
      sqlPreview: page.locator(".sql-code, pre").first(),
    };
  }

  async goto() {
    await this.page.goto("http://localhost:5173/SqlTool/sql/update");
    await this.page.waitForLoadState("domcontentloaded");
  }

  async inputDdl(ddl = TEST_DDL) {
    await this.locators.ddlInput.fill(ddl);
  }

  async parseDdl() {
    await this.locators.parseDdlButton.click();
    await this.page.waitForTimeout(2000);
  }

  async uploadExcel(filePath = "test_update.xlsx") {
    await this.locators.fileInput.setInputFiles(filePath);
    await this.page.waitForTimeout(3000);
  }

  async generateSql() {
    await this.locators.generateSqlButton.click();
    await this.page.waitForTimeout(2000);
  }

  async getSqlContent() {
    const text = await this.locators.sqlPreview.textContent();
    return {
      fullText: text || "",
      hasUpdate: text?.includes("UPDATE") || false,
      hasSet: text?.includes("SET") || false,
      hasWhere: text?.includes("WHERE") || false,
    };
  }

  async reset() {
    await this.locators.resetButton.click();
    await this.page.waitForTimeout(1000);
  }

  /**
   * 等待页面完全加载
   */
  async waitForReady() {
    // 等待页面路由加载完成
    await this.page.waitForLoadState("domcontentloaded");
    await this.page.waitForLoadState("networkidle");

    // 等待 DDL 输入框出现（最基础的元素）
    await this.page.locator("textarea").first().waitFor({
      state: "visible",
      timeout: 15000,
    });

    // 额外等待，确保 Vue 组件完全渲染
    await this.page.waitForTimeout(3000);
  }
}

/**
 * 测试用DDL语句
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
 * 测试用Excel文件名
 */
export const TEST_EXCEL_FILE = "test_update.xlsx";
