/**
 * Excel 填充页面 Page Object Model
 * 封装 Excel 填充页面的所有操作和元素定位
 */
export class ExcelFillPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;

    this.locators = {
      // 上传区域
      fileInput: page.locator('input[type="file"]'),
      uploadArea: page.locator(".ant-upload-drag, .ant-upload"),
      uploadProgress: page.locator(".upload-progress-container"),
      uploadStatusText: page.locator(".upload-status-text"),

      // Tab 导航
      basicTab: page.locator(".ant-tabs-tab").nth(0),
      advancedTab: page.locator(".ant-tabs-tab").nth(1),
      quoteTab: page.locator(".ant-tabs-tab").nth(2),

      // 基础配置
      sourceSheetSelect: page
        .locator('.ant-form-item:has-text("工作表") .ant-select')
        .first(),
      targetSheetSelect: page
        .locator('.ant-form-item:has-text("目标工作表") .ant-select')
        .first(),
      sourceColumnSelect: page
        .locator('.ant-form-item:has-text("源列") .ant-select')
        .first(),
      targetColumnSelect: page
        .locator('.ant-form-item:has-text("目标列") .ant-select')
        .first(),

      // 高级配置 - 使用实际的标签文本
      sourceColumnForSplitSelect: page
        .locator('.ant-form-item:has-text("源数据列") .ant-select')
        .first(),
      splitDelimiterSelect: page
        .locator('.ant-form-item:has-text("数据分割符") .ant-select')
        .first(),
      matchSheetSelect: page
        .locator('.ant-form-item:has-text("查询匹配工作表") .ant-select')
        .first(),
      matchColumnSelect: page
        .locator('.ant-form-item:has-text("查询匹配列") .ant-select')
        .first(),
      extractColumnsSelect: page
        .locator('.ant-form-item:has-text("提取列选择") .ant-select')
        .first(),
      resultColumnSelect: page
        .locator('.ant-form-item:has-text("结果填充列") .ant-select')
        .first(),
      targetSheetSelect: page
        .locator('.ant-form-item:has-text("目标工作表") .ant-select')
        .first(),
      targetColumnSelect: page
        .locator('.ant-form-item:has-text("目标填充列") .ant-select')
        .first(),

      // 引号转换配置 - 使用 XPath 定位引号转换 Tab 容器内的元素
      quoteSourceColumnSelect: page
        .locator(
          'xpath=//div[contains(@class, "quote-card")]//div[contains(@class, "ant-form-item") and contains(., "源列")]//div[contains(@class, "ant-select")]',
        )
        .first(),
      quoteDelimiterSelect: page
        .locator(
          'xpath=//div[contains(@class, "quote-card")]//div[contains(@class, "ant-form-item") and contains(., "分隔符")]//div[contains(@class, "ant-select")]',
        )
        .first(),
      quoteStyleSelect: page
        .locator(
          'xpath=//div[contains(@class, "quote-card")]//div[contains(@class, "ant-form-item") and contains(., "引号样式")]//div[contains(@class, "ant-radio-group")]',
        )
        .first(),

      // 操作按钮
      processButton: page
        .locator(
          'button:has-text("开始处理"), button:has-text("开始高级数据处理")',
        )
        .first(),
      resetButton: page.locator('button:has-text("重置")').first(),
      downloadButton: page.locator('button:has-text("下载结果文件")').first(),

      // 结果区域
      resultCard: page.locator(".result-card"),
      resultDescriptions: page.locator(".ant-descriptions"),

      // 数据预览
      previewTable: page.locator(".preview-card .ant-table"),
    };
  }

  /**
   * 导航到 Excel 填充页面
   */
  async goto() {
    await this.page.goto("http://localhost:5173/SqlTool/tools/excelfill");
    await this.page.waitForLoadState("domcontentloaded");
  }

  /**
   * 等待页面完全加载
   */
  async waitForReady() {
    await this.page.waitForLoadState("domcontentloaded");
    await this.page.waitForLoadState("networkidle");

    // 等待页面标题出现（使用更精确的定位器）
    await this.page
      .locator("h1:has-text('Excel'), .page-title:has-text('Excel')")
      .waitFor({
        state: "visible",
        timeout: 15000,
      });

    // 额外等待，确保 Vue 组件完全渲染
    await this.page.waitForTimeout(3000);
  }

  /**
   * 上传 Excel 文件
   * @param {string} filePath - 文件路径
   */
  async uploadExcel(filePath) {
    const fileInput = this.locators.fileInput;
    await fileInput.setInputFiles(filePath);

    // 等待上传完成
    await this.page.waitForTimeout(3000);
  }

  /**
   * 等待上传成功提示
   */
  async waitForUploadSuccess() {
    await this.page.waitForFunction(
      () => {
        const statusText = document.querySelector(".upload-status-text");
        return statusText && statusText.textContent.includes("成功");
      },
      { timeout: 15000 },
    );
  }

  /**
   * 切换到基础配置 Tab
   */
  async switchToBasicTab() {
    await this.locators.basicTab.click();
    await this.page.waitForTimeout(500);
  }

  /**
   * 切换到高级数据处理 Tab
   */
  async switchToAdvancedTab() {
    await this.locators.advancedTab.click();
    await this.page.waitForTimeout(500);
  }

  /**
   * 切换到引号转换 Tab
   */
  async switchToQuoteTab() {
    await this.locators.quoteTab.click();
    await this.page.waitForTimeout(500);
  }

  /**
   * 选择源工作表
   * @param {string} sheetName - 工作表名称
   */
  async selectSourceSheet(sheetName) {
    await this.locators.sourceSheetSelect.click();
    await this.page.waitForTimeout(300);
    const option = this.page
      .locator(`.ant-select-item-option:has-text("${sheetName}")`)
      .first();
    await option.click();
    await this.page.waitForTimeout(500);
  }

  /**
   * 选择目标工作表
   * @param {string} sheetName - 工作表名称
   */
  async selectTargetSheet(sheetName) {
    await this.locators.targetSheetSelect.click();
    await this.page.waitForTimeout(300);
    const option = this.page
      .locator(`.ant-select-item-option:has-text("${sheetName}")`)
      .first();
    await option.click();
    await this.page.waitForTimeout(500);
  }

  /**
   * 选择源列
   * @param {string} columnName - 列名
   */
  async selectSourceColumn(columnName) {
    await this.locators.sourceColumnSelect.click();
    await this.page.waitForTimeout(500);
    // 使用键盘导航选择选项
    await this.page.keyboard.press("ArrowDown");
    await this.page.waitForTimeout(200);
    // 继续按 ArrowDown 直到找到包含列名的选项
    let found = false;
    for (let i = 0; i < 10; i++) {
      const selectedOption = await this.page
        .locator(".ant-select-item-option-selected")
        .first()
        .textContent();
      if (selectedOption && selectedOption.includes(columnName)) {
        found = true;
        break;
      }
      await this.page.keyboard.press("ArrowDown");
      await this.page.waitForTimeout(100);
    }
    // 按 Enter 确认选择
    await this.page.keyboard.press("Enter");
    await this.page.waitForTimeout(500);
  }

  /**
   * 选择目标列
   * @param {string} columnName - 列名
   */
  async selectTargetColumn(columnName) {
    await this.locators.targetColumnSelect.click();
    await this.page.waitForTimeout(500);
    // 使用键盘导航选择选项
    await this.page.keyboard.press("ArrowDown");
    await this.page.waitForTimeout(200);
    // 继续按 ArrowDown 直到找到包含列名的选项
    let found = false;
    for (let i = 0; i < 10; i++) {
      const selectedOption = await this.page
        .locator(".ant-select-item-option-selected")
        .first()
        .textContent();
      if (selectedOption && selectedOption.includes(columnName)) {
        found = true;
        break;
      }
      await this.page.keyboard.press("ArrowDown");
      await this.page.waitForTimeout(100);
    }
    // 按 Enter 确认选择
    await this.page.keyboard.press("Enter");
    await this.page.waitForTimeout(500);
  }

  /**
   * 点击处理按钮
   * @param {'basic' | 'advanced' | 'quote'} [type='basic'] - 处理类型
   */
  async process(type = "basic") {
    // 根据类型获取对应的按钮文本
    let targetButtonText;
    if (type === "basic") {
      targetButtonText = "开始处理";
    } else if (type === "advanced") {
      targetButtonText = "开始高级数据处理";
    } else if (type === "quote") {
      targetButtonText = "开始引号转换";
    }

    // 等待按钮启用
    await this.page.waitForFunction(
      (searchText) => {
        const buttons = document.querySelectorAll("button");
        for (let button of buttons) {
          const text = button.textContent;
          if (text && text.includes(searchText)) {
            return !button.disabled;
          }
        }
        return false;
      },
      targetButtonText,
      { timeout: 30000 },
    );

    // 根据类型点击对应的按钮
    await this.page
      .locator(`button:has-text("${targetButtonText}")`)
      .first()
      .click();

    // 等待处理完成
    await this.page.waitForTimeout(5000);
  }

  /**
   * 点击重置按钮
   */
  async reset() {
    await this.locators.resetButton.click();
    await this.page.waitForTimeout(1000);
  }

  /**
   * 点击下载结果按钮
   */
  async download() {
    await this.locators.downloadButton.click();
    await this.page.waitForTimeout(1000);
  }

  /**
   * 检查结果卡片是否显示
   * @returns {Promise<boolean>}
   */
  async hasResultCard() {
    return this.locators.resultCard.isVisible();
  }

  /**
   * 获取处理结果文本
   * @returns {Promise<string>}
   */
  async getResultText() {
    return this.locators.resultDescriptions.textContent();
  }

  /**
   * 检查是否包含指定文本
   * @param {string} text - 要查找的文本
   * @returns {Promise<boolean>}
   */
  async containsText(text) {
    const resultText = await this.getResultText();
    return resultText.includes(text);
  }

  /**
   * 获取数据预览表格的行数
   * @returns {Promise<number>}
   */
  async getPreviewRowCount() {
    const rows = this.locators.previewTable.locator("tbody tr");
    return await rows.count();
  }

  /**
   * 等待处理完成
   */
  async waitForProcessComplete() {
    // 等待按钮变为可用状态
    await this.page.waitForFunction(
      () => {
        const buttons = document.querySelectorAll("button");
        for (let button of buttons) {
          const text = button.textContent;
          if (
            text &&
            (text.includes("开始处理") || text.includes("开始高级数据处理"))
          ) {
            return !button.disabled;
          }
        }
        return false;
      },
      { timeout: 30000 },
    );
  }
}

/**
 * 测试用 Excel 文件名
 */
export const TEST_EXCEL_FILE = "test_excel_fill.xlsx";

/**
 * 测试用多工作表 Excel 文件名
 */
export const TEST_EXCEL_MULTI_SHEETS = "test_excel_multi_sheets.xlsx";

/**
 * 测试用跨工作表 Excel 文件名
 */
export const TEST_EXCEL_CROSS_SHEET = "test_cross_sheet.xlsx";
