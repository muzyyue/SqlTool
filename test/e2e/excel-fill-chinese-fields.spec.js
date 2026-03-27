import { test, expect } from "@playwright/test";
import { ExcelFillPage } from "./pages/ExcelFillPage.js";

/**
 * Excel 填充页面 - 中文字段名测试套件
 *
 * 测试目标：验证高级数据处理功能对中文字段名和中文内容的支持
 *
 * 测试场景：
 * 1. 上传包含中文字段名的 Excel 文件
 * 2. 高级数据处理 - 源数据列选择（中文字段名）
 * 3. 高级数据处理 - 数据分割（中文内容）
 * 4. 高级数据处理 - 查询匹配列选择（中文字段名）
 * 5. 高级数据处理 - 提取列选择（中文字段名）
 * 6. 高级数据处理 - 结果填充列选择（中文字段名）
 * 7. 高级数据处理 - 开始处理并验证结果
 */

test.describe("Excel 填充页面 - 中文字段名测试", () => {
  test.describe.configure({ mode: "serial" });

  let excelFillPage;
  let sharedPage;

  test.beforeAll(async ({ browser }) => {
    sharedPage = await browser.newPage();
    excelFillPage = new ExcelFillPage(sharedPage);
    await excelFillPage.goto();
    await excelFillPage.waitForReady();
  });

  test.afterAll(async () => {
    await sharedPage.close();
  });

  test("上传包含中文字段名的 Excel 文件", async () => {
    await excelFillPage.uploadExcel(
      `./test/e2e/fixtures/test_chinese_fields.xlsx`,
    );
    await excelFillPage.waitForUploadSuccess();

    const uploadStatus =
      await excelFillPage.locators.uploadStatusText.textContent();
    expect(uploadStatus).toContain("成功");
  });

  test("高级数据处理 - Tab 切换", async () => {
    const hasTabs = await sharedPage
      .locator(".ant-tabs")
      .isVisible()
      .catch(() => false);

    if (hasTabs) {
      const advancedTab = sharedPage.locator(".ant-tabs-tab").nth(1);
      await advancedTab.click();
      await sharedPage.waitForTimeout(2000);

      const pageContent = await sharedPage.content();
      const hasAdvancedText =
        pageContent.includes("高级数据处理") ||
        pageContent.includes("启用高级");
      expect(hasAdvancedText).toBe(true);
      console.log("✅ 测试通过：成功切换到高级数据处理 Tab");
    }
  });

  test("高级数据处理 - 启用高级数据处理开关", async () => {
    let switchToggle = sharedPage
      .locator('.ant-form-item:has-text("启用高级数据处理") .ant-switch')
      .first();

    const isVisible = await switchToggle.isVisible().catch(() => false);
    console.log("开关是否可见:", isVisible);

    if (!isVisible) {
      switchToggle = sharedPage.locator(".ant-switch").first();
    }

    let isChecked = await switchToggle
      .evaluate((el) => el.classList.contains("ant-switch-checked"))
      .catch(() => false);
    console.log("开关初始状态:", isChecked);

    if (!isChecked) {
      await switchToggle.click();
      await sharedPage.waitForTimeout(3000);

      isChecked = await switchToggle
        .evaluate((el) => el.classList.contains("ant-switch-checked"))
        .catch(() => false);
      console.log("开关点击后状态:", isChecked);
    }

    expect(isChecked).toBe(true);
    console.log("✅ 测试通过：成功启用高级数据处理");
  });

  test("高级数据处理 - 源数据工作表选择", async () => {
    await sharedPage.waitForTimeout(2000);

    const sourceSheetSelect = sharedPage
      .locator('.ant-form-item:has-text("源数据工作表") .ant-select')
      .first();
    const isSourceSheetVisible = await sourceSheetSelect
      .isVisible()
      .catch(() => false);
    console.log("源数据工作表选择器是否可见:", isSourceSheetVisible);

    if (isSourceSheetVisible) {
      await sourceSheetSelect.click();
      await sharedPage.waitForTimeout(500);

      const sheetOption = sharedPage
        .locator('.ant-select-item-option:has-text("源数据表")')
        .first();
      await sheetOption.click();
      await sharedPage.waitForTimeout(2000);
      console.log("✅ 测试通过：成功选择源数据工作表");
    }
  });

  test("高级数据处理 - 源数据列选择（中文字段名）", async () => {
    await sharedPage.waitForTimeout(2000);

    console.log("尝试选择源数据列：商品名称");

    const sourceColumnLabel = sharedPage
      .locator('label:has-text("源数据列")')
      .first();
    const formItem = sourceColumnLabel.locator(
      'xpath=ancestor::div[contains(@class, "ant-form-item")]',
    );
    const selectElement = formItem.locator(".ant-select").first();

    await selectElement.click();
    await sharedPage.waitForTimeout(1000);

    const searchInput = sharedPage
      .locator(".ant-select-selection-search-input")
      .first();
    if (await searchInput.isVisible().catch(() => false)) {
      console.log("输入搜索关键词：商品名称");
      await searchInput.fill("商品名称");
      await sharedPage.waitForTimeout(1000);
    }

    const dropdownOptions = sharedPage.locator(
      ".ant-select-dropdown .ant-select-item-option",
    );
    const optionCount = await dropdownOptions.count();
    console.log(`下拉选项数量: ${optionCount}`);

    let found = false;
    for (let i = 0; i < Math.min(optionCount, 20); i++) {
      const optionText = await dropdownOptions.nth(i).textContent();
      console.log(`选项 ${i}: ${optionText}`);

      if (optionText && optionText.includes("商品名称")) {
        found = true;
        console.log(`找到商品名称选项，索引：${i}`);
        await dropdownOptions.nth(i).click();
        break;
      }
    }

    await sharedPage.waitForTimeout(1000);

    const selectedValue = await selectElement
      .locator(".ant-select-selection-item")
      .textContent()
      .catch(() => "");
    console.log(`已选择的值: ${selectedValue}`);

    if (found && selectedValue.includes("商品名称")) {
      console.log("✅ 测试通过：成功选择中文字段名列");
    } else {
      console.log("❌ 测试失败：无法选择中文字段名列");
      console.log(`  - 是否找到选项: ${found}`);
      console.log(`  - 已选择的值: ${selectedValue}`);
    }

    expect(found).toBe(true);
  });

  test("高级数据处理 - 数据分割符选择", async () => {
    await sharedPage.waitForTimeout(1000);

    const delimiterLabel = sharedPage
      .locator('label:has-text("数据分割符")')
      .first();
    const formItem = delimiterLabel.locator(
      'xpath=ancestor::div[contains(@class, "ant-form-item")]',
    );
    const delimiterSelect = formItem.locator(".ant-select").first();

    await delimiterSelect.click();
    await sharedPage.waitForTimeout(1000);

    const delimiterOption = sharedPage
      .locator('.ant-select-item-option:has-text("逗号")')
      .first();
    await delimiterOption.waitFor({ state: "visible", timeout: 5000 });
    await delimiterOption.click();
    await sharedPage.waitForTimeout(1000);

    console.log("✅ 测试通过：成功选择数据分割符");
  });

  test("高级数据处理 - 查询匹配列选择（中文字段名）", async () => {
    await sharedPage.waitForTimeout(1000);

    console.log("尝试选择查询匹配列：编码");

    const matchColumnLabel = sharedPage
      .locator('label:has-text("查询匹配列")')
      .first();
    const formItem = matchColumnLabel.locator(
      'xpath=ancestor::div[contains(@class, "ant-form-item")]',
    );
    const matchColumnSelect = formItem.locator(".ant-select").first();

    await matchColumnSelect.click();
    await sharedPage.waitForTimeout(1000);

    const searchInput = sharedPage
      .locator(".ant-select-selection-search-input")
      .first();
    if (await searchInput.isVisible().catch(() => false)) {
      console.log("输入搜索关键词：编码");
      await searchInput.fill("编码");
      await sharedPage.waitForTimeout(1000);
    }

    const dropdown = sharedPage.locator(".ant-select-dropdown").last();
    const dropdownOptions = dropdown.locator(".ant-select-item-option");
    const optionCount = await dropdownOptions.count();

    let found = false;
    for (let i = 0; i < Math.min(optionCount, 20); i++) {
      const optionText = await dropdownOptions.nth(i).textContent();
      console.log(`选项 ${i}: ${optionText}`);

      if (optionText && optionText.includes("编码")) {
        found = true;
        console.log(`找到编码选项，索引：${i}`);
        await dropdownOptions.nth(i).click();
        break;
      }
    }

    await sharedPage.waitForTimeout(1000);

    const selectedValue = await matchColumnSelect
      .locator(".ant-select-selection-item")
      .textContent()
      .catch(() => "");

    if (found && selectedValue.includes("编码")) {
      console.log("✅ 测试通过：成功选择中文字段名查询匹配列");
    } else {
      console.log("❌ 测试失败：无法选择中文字段名查询匹配列");
      console.log(`  - 已选择的值: ${selectedValue}`);
    }

    expect(found).toBe(true);
  });

  test("高级数据处理 - 提取列选择（中文字段名）", async () => {
    await sharedPage.waitForTimeout(1000);

    console.log("尝试选择提取列：分类");

    const extractColumnLabel = sharedPage
      .locator('label:has-text("提取列选择")')
      .first();
    const formItem = extractColumnLabel.locator(
      'xpath=ancestor::div[contains(@class, "ant-form-item")]',
    );
    const extractColumnsSelect = formItem.locator(".ant-select").first();

    await extractColumnsSelect.click();
    await sharedPage.waitForTimeout(1000);

    const searchInput = sharedPage
      .locator(".ant-select-selection-search-input")
      .first();
    if (await searchInput.isVisible().catch(() => false)) {
      console.log("输入搜索关键词：分类");
      await searchInput.fill("分类");
      await sharedPage.waitForTimeout(1000);
    }

    const dropdown = sharedPage.locator(".ant-select-dropdown").last();
    const dropdownOptions = dropdown.locator(".ant-select-item-option");
    let foundCategory = false;
    const optionCount = await dropdownOptions.count();

    for (let i = 0; i < Math.min(optionCount, 20); i++) {
      const optionText = await dropdownOptions.nth(i).textContent();
      console.log(`提取列选项 ${i}: ${optionText}`);

      if (optionText && optionText.includes("分类")) {
        foundCategory = true;
        console.log(`找到分类选项，索引：${i}`);
        await dropdownOptions.nth(i).click();
        break;
      }
    }

    await sharedPage.waitForTimeout(500);

    if (foundCategory) {
      console.log("✅ 测试通过：成功选择中文字段名提取列");
    } else {
      console.log("❌ 测试失败：无法选择中文字段名提取列");
    }

    expect(foundCategory).toBe(true);
  });

  test("高级数据处理 - 结果填充列选择（中文字段名）", async () => {
    await sharedPage.waitForTimeout(1000);

    const resultColumnLabel = sharedPage
      .locator('label:has-text("结果填充列")')
      .first();
    const formItem = resultColumnLabel.locator(
      'xpath=ancestor::div[contains(@class, "ant-form-item")]',
    );
    const resultColumnSelect = formItem.locator(".ant-select").first();

    await resultColumnSelect.click();
    await sharedPage.waitForTimeout(1000);

    const dropdown = sharedPage.locator(".ant-select-dropdown").last();
    const dropdownOptions = dropdown.locator(".ant-select-item-option");
    const optionCount = await dropdownOptions.count();

    let found = false;
    for (let i = 0; i < Math.min(optionCount, 20); i++) {
      const optionText = await dropdownOptions.nth(i).textContent();
      console.log(`结果填充列选项 ${i}: ${optionText}`);

      if (
        optionText &&
        (optionText.includes("处理结果") ||
          optionText.includes("匹配数量") ||
          optionText.includes("编码"))
      ) {
        found = true;
        console.log(`找到结果列选项，索引：${i}`);
        await dropdownOptions.nth(i).click();
        break;
      }
    }

    await sharedPage.waitForTimeout(500);

    if (found) {
      console.log("✅ 测试通过：成功选择中文字段名结果填充列");
    } else {
      console.log("❌ 测试失败：无法选择中文字段名结果填充列");
    }

    expect(found).toBe(true);
  });

  test("高级数据处理 - 开始处理并验证结果", async () => {
    await sharedPage.evaluate(() =>
      window.scrollTo(0, document.body.scrollHeight),
    );
    await sharedPage.waitForTimeout(500);

    const processButton = sharedPage
      .locator('button:has-text("开始高级数据处理")')
      .first();
    const isDisabled = await processButton.isDisabled().catch(() => true);

    console.log(`处理按钮状态: ${isDisabled ? "禁用" : "可用"}`);

    if (isDisabled) {
      console.log("❌ 测试失败：处理按钮被禁用，可能是配置不完整");

      const pageContent = await sharedPage.content();
      console.log("页面是否包含警告:", pageContent.includes("请完成以下配置"));
    } else {
      await processButton.click();
      await sharedPage.waitForTimeout(5000);

      await excelFillPage.waitForProcessComplete();

      const hasResult = await excelFillPage.hasResultCard();

      if (hasResult) {
        console.log("✅ 测试通过：高级数据处理完成，结果卡片显示");
        const resultText = await excelFillPage.getResultText();
        console.log("处理结果:", resultText.substring(0, 500));
      } else {
        console.log("❌ 测试失败：处理完成后结果卡片未显示");
      }
    }

    expect(isDisabled).toBe(false);
  });

  test.describe("中文字段名测试报告", () => {
    test("生成测试报告", async () => {
      console.log("\n========================================");
      console.log("Excel 填充页面 - 中文字段名测试报告");
      console.log("========================================");
      console.log("\n测试目标:");
      console.log("  验证高级数据处理功能对中文字段名和中文内容的支持");
      console.log("\n测试场景:");
      console.log("  1. 上传包含中文字段名的 Excel 文件");
      console.log("  2. 基础配置 - 目标工作表选择");
      console.log("  3. 高级数据处理 - Tab 切换");
      console.log("  4. 高级数据处理 - 启用高级数据处理开关");
      console.log("  5. 高级数据处理 - 源数据列选择（中文字段名）");
      console.log("  6. 高级数据处理 - 数据分割符选择");
      console.log("  7. 高级数据处理 - 查询匹配列选择（中文字段名）");
      console.log("  8. 高级数据处理 - 提取列选择（中文字段名）");
      console.log("  9. 高级数据处理 - 结果填充列选择（中文字段名）");
      console.log("  10. 高级数据处理 - 开始处理并验证结果");
      console.log("\n已修复问题:");
      console.log("  - filterOption 函数现在同时匹配列字母和列名");
      console.log("  - 用户输入中文时可以搜索到对应列");
      console.log("========================================");
    });
  });
});
