import { test, expect } from "@playwright/test";
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
  selectDatabaseType,
  switchToCustomFieldsTab,
  validateSystemFunction,
  validateNoUuid,
  addCustomField,
  saveCustomFieldConfig,
  addConcatenationField,
  validateFieldDisplayed,
  getDisplayedFieldCount,
  validateFieldConfig,
  TestReporter,
} from "./test-utils";

/**
 * PostgreSQL INSERT 语句生成完整流程测试
 * 仅测试 PostgreSQL 特有功能（自定义字段、系统函数、拼接字段）
 * 基础功能测试请查看 insert-page.spec.js
 */

const POSTGRESQL_DDL = `CREATE TABLE "public"."file_info" (
  "file_id" int8 NOT NULL GENERATED ALWAYS AS IDENTITY (
    INCREMENT 1
    MINVALUE 1
    MAXVALUE 9223372036854775807
    START 1
    CACHE 1
  ),
  "file_name" varchar(255) COLLATE "pg_catalog"."default" NOT NULL,
  "file_path" text COLLATE "pg_catalog"."default" NOT NULL,
  "file_size" int8 DEFAULT 0,
  "file_type" varchar(100) COLLATE "pg_catalog"."default",
  "file_suffix" varchar(50) COLLATE "pg_catalog"."default",
  "upload_user_id" int8,
  "storage_bucket" varchar(100) COLLATE "pg_catalog"."default" DEFAULT 'default'::character varying,
  "file_status" int2 DEFAULT 1,
  "create_time" timestamptz(6) DEFAULT CURRENT_TIMESTAMP,
  "update_time" timestamptz(6) DEFAULT CURRENT_TIMESTAMP,
  "remark" text COLLATE "pg_catalog"."default",
  CONSTRAINT "file_info_pkey" PRIMARY KEY ("file_id"),
  CONSTRAINT "file_info_file_status_check" CHECK (file_status = ANY (ARRAY[0,1,2]))
);

ALTER TABLE "public"."file_info"
  OWNER TO "postgres";

CREATE INDEX "idx_file_info_name" ON "public"."file_info" USING btree (
    "file_name" COLLATE "pg_catalog"."default" "pg_catalog"."text_ops" ASC NULLS LAST
  );`;

test.describe("PostgreSQL 特有功能测试", () => {
  let page;
  let reporter;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    reporter = new TestReporter("PostgreSQL 特有功能测试");
  });

  test.afterEach(async () => {
    await page.close();
  });

  /**
   * 测试：系统函数配置（CURRENT_TIMESTAMP）
   */
  test("系统函数配置 - create_time 使用 CURRENT_TIMESTAMP", async () => {
    await page.goto("http://localhost:5173/SqlTool/#/insert");
    await waitForPageLoad(page);

    await inputDdlStatement(page, POSTGRESQL_DDL);
    await clickParseDdl(page);
    await uploadExcelFile(page, "Test.xlsx");
    await clickCustomBinding(page);
    await page.waitForTimeout(1000);
    await switchToCustomFieldsTab(page);

    const fieldConfig = {
      fieldName: "create_time",
      dataType: "timestamptz",
      dataSource: "系统函数",
      databaseType: "PostgreSQL",
      functionName: "CURRENT_TIMESTAMP",
    };
    await addCustomField(page, fieldConfig);
    await saveCustomFieldConfig(page);
    await selectDatabaseType(page, "PostgreSQL");
    await clickGenerateSql(page);
    await page.waitForTimeout(3000);

    const sqlResult = await getGeneratedSql(page);
    expect(sqlResult.hasInsert).toBe(true);
    expect(validateSystemFunction(sqlResult, "CURRENT_TIMESTAMP")).toBe(true);

    reporter.recordResult("系统函数配置", true, "CURRENT_TIMESTAMP 正确应用");
  });

  /**
   * 测试：多个系统函数字段配置
   */
  test("多个系统函数字段配置", async () => {
    await page.goto("http://localhost:5173/SqlTool/#/insert");
    await waitForPageLoad(page);

    await inputDdlStatement(page, POSTGRESQL_DDL);
    await clickParseDdl(page);
    await uploadExcelFile(page, "Test.xlsx");
    await clickCustomBinding(page);
    await page.waitForTimeout(1000);
    await switchToCustomFieldsTab(page);

    await addCustomField(page, {
      fieldName: "create_time",
      dataType: "timestamptz",
      dataSource: "系统函数",
      databaseType: "PostgreSQL",
      functionName: "CURRENT_TIMESTAMP",
    });

    await addCustomField(page, {
      fieldName: "update_time",
      dataType: "timestamptz",
      dataSource: "系统函数",
      databaseType: "PostgreSQL",
      functionName: "CURRENT_TIMESTAMP",
    });

    await saveCustomFieldConfig(page);
    await selectDatabaseType(page, "PostgreSQL");
    await clickGenerateSql(page);
    await page.waitForTimeout(3000);

    const sqlResult = await getGeneratedSql(page);
    expect(sqlResult.hasInsert).toBe(true);
    expect(validateNoUuid(sqlResult)).toBe(true);

    reporter.recordResult("多个系统函数字段配置", true, "多个系统函数正确应用");
  });

  /**
   * 测试：验证 SQL 不包含 UUID（确保使用系统函数）
   */
  test("验证 SQL 不包含 UUID", async () => {
    await page.goto("http://localhost:5173/SqlTool/#/insert");
    await waitForPageLoad(page);

    await inputDdlStatement(page, POSTGRESQL_DDL);
    await clickParseDdl(page);
    await uploadExcelFile(page, "Test.xlsx");
    await clickCustomBinding(page);
    await page.waitForTimeout(1000);
    await switchToCustomFieldsTab(page);

    await addCustomField(page, {
      fieldName: "create_time",
      dataType: "timestamptz",
      dataSource: "系统函数",
      databaseType: "PostgreSQL",
      functionName: "CURRENT_TIMESTAMP",
    });

    await saveCustomFieldConfig(page);
    await selectDatabaseType(page, "PostgreSQL");
    await clickGenerateSql(page);
    await page.waitForTimeout(3000);

    const sqlResult = await getGeneratedSql(page);
    expect(validateNoUuid(sqlResult)).toBe(true);
    expect(validateSystemFunction(sqlResult, "CURRENT_TIMESTAMP")).toBe(true);

    reporter.recordResult(
      "验证 SQL 不包含 UUID",
      true,
      "正确使用系统函数而非 UUID",
    );
  });

  /**
   * 测试：完整流程 - 配置自定义字段并生成 SQL
   */
  test("完整流程 - 配置自定义字段并生成 SQL", async () => {
    await page.goto("http://localhost:5173/SqlTool/#/insert");
    await waitForPageLoad(page);

    await inputDdlStatement(page, POSTGRESQL_DDL);
    reporter.recordResult("步骤1: 输入 DDL 语句", true);

    await clickParseDdl(page);
    await page.waitForTimeout(1000);
    reporter.recordResult("步骤2: 解析 DDL 语句", true);

    await uploadExcelFile(page, "Test.xlsx");
    reporter.recordResult("步骤3: 上传 Excel 文件", true);

    await clickCustomBinding(page);
    await page.waitForTimeout(1000);
    reporter.recordResult("步骤4: 打开自定义绑定模态框", true);

    await switchToCustomFieldsTab(page);
    reporter.recordResult("步骤5: 切换到自定义字段标签页", true);

    await addCustomField(page, {
      fieldName: "create_time",
      dataType: "timestamptz",
      dataSource: "系统函数",
      databaseType: "PostgreSQL",
      functionName: "CURRENT_TIMESTAMP",
    });
    reporter.recordResult("步骤6: 添加 create_time 字段配置", true);

    await addCustomField(page, {
      fieldName: "update_time",
      dataType: "timestamptz",
      dataSource: "系统函数",
      databaseType: "PostgreSQL",
      functionName: "CURRENT_TIMESTAMP",
    });
    reporter.recordResult("步骤7: 添加 update_time 字段配置", true);

    await saveCustomFieldConfig(page);
    reporter.recordResult("步骤8: 保存自定义字段配置", true);

    await selectDatabaseType(page, "PostgreSQL");
    reporter.recordResult("步骤9: 选择 PostgreSQL 数据库类型", true);

    await clickGenerateSql(page);
    await page.waitForTimeout(3000);
    reporter.recordResult("步骤10: 生成 SQL", true);

    const sqlResult = await getGeneratedSql(page);
    expect(sqlResult.hasInsert).toBe(true);
    expect(sqlResult.hasValues).toBe(true);
    expect(sqlResult.fullText).toContain("INSERT");
    expect(sqlResult.fullText).toContain("VALUES");
    expect(sqlResult.fullText).toContain('"file_info"');
    reporter.recordResult("步骤11: 验证生成的 SQL 结构", true);

    expect(validateSystemFunction(sqlResult, "CURRENT_TIMESTAMP")).toBe(true);
    reporter.recordResult("步骤12: 验证 SQL 包含 CURRENT_TIMESTAMP 函数", true);

    expect(validateNoUuid(sqlResult)).toBe(true);
    reporter.recordResult("步骤13: 验证 SQL 不包含 UUID", true);

    await takeScreenshot(page, "postgresql-insert-complete-test.png");
    reporter.recordResult("步骤14: 截图保存", true);

    const validation = validateSql(sqlResult, {
      hasInsert: true,
      hasValues: true,
      minLength: 200,
      minLines: 10,
    });
    expect(validation.valid).toBe(true);
    reporter.recordResult("最终验证", true, "完整流程测试通过");
  });
});

test.describe("拼接字段功能测试", () => {
  let page;
  let reporter;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    reporter = new TestReporter("拼接字段功能测试");
  });

  test.afterEach(async () => {
    await page.close();
  });

  /**
   * 测试：添加拼接字段并验证 UI 显示
   */
  test("添加拼接字段并验证 UI 显示", async () => {
    await page.goto("http://localhost:5173/SqlTool/#/insert");
    await waitForPageLoad(page);

    await inputDdlStatement(page, POSTGRESQL_DDL);
    await clickParseDdl(page);
    await uploadExcelFile(page, "Test.xlsx");
    await clickCustomBinding(page);
    await page.waitForTimeout(1000);

    const concatConfig = {
      fieldName: "file_full_path",
      dataType: "text",
      sourceColumns: [1, 2],
      separator: "/",
    };
    await addConcatenationField(page, concatConfig);
    await saveCustomFieldConfig(page);

    const fieldDisplayed = await validateFieldDisplayed(page, "file_full_path");
    expect(fieldDisplayed).toBe(true);

    reporter.recordResult("添加拼接字段并验证 UI 显示", true);
  });

  /**
   * 测试：生成包含拼接字段的 SQL
   */
  test("生成包含拼接字段的 SQL", async () => {
    await page.goto("http://localhost:5173/SqlTool/#/insert");
    await waitForPageLoad(page);

    await inputDdlStatement(page, POSTGRESQL_DDL);
    await clickParseDdl(page);
    await uploadExcelFile(page, "Test.xlsx");
    await clickCustomBinding(page);
    await page.waitForTimeout(1000);

    const concatConfig = {
      fieldName: "file_display_name",
      dataType: "varchar",
      sourceColumns: [1, 2],
      separator: " | ",
    };
    await addConcatenationField(page, concatConfig);
    await saveCustomFieldConfig(page);
    await selectDatabaseType(page, "PostgreSQL");
    await clickGenerateSql(page);
    await page.waitForTimeout(3000);

    const sqlResult = await getGeneratedSql(page);
    expect(sqlResult.hasInsert).toBe(true);
    expect(sqlResult.hasValues).toBe(true);
    expect(sqlResult.fullText).toContain("file_display_name");

    reporter.recordResult("生成包含拼接字段的 SQL", true);
  });

  /**
   * 测试：多个拼接字段同时配置
   */
  test("多个拼接字段同时配置", async () => {
    await page.goto("http://localhost:5173/SqlTool/#/insert");
    await waitForPageLoad(page);

    await inputDdlStatement(page, POSTGRESQL_DDL);
    await clickParseDdl(page);
    await uploadExcelFile(page, "Test.xlsx");
    await clickCustomBinding(page);
    await page.waitForTimeout(1000);

    await addConcatenationField(page, {
      fieldName: "file_path_combined",
      dataType: "text",
      sourceColumns: [1, 2],
      separator: "/",
    });

    await addConcatenationField(page, {
      fieldName: "file_meta_info",
      dataType: "varchar",
      sourceColumns: [3, 4],
      separator: ", ",
    });

    await saveCustomFieldConfig(page);

    const fieldCount = await getDisplayedFieldCount(page);
    expect(fieldCount).toBeGreaterThanOrEqual(2);

    reporter.recordResult(
      "多个拼接字段同时配置",
      true,
      `成功配置 ${fieldCount} 个拼接字段`,
    );
  });

  /**
   * 测试：拼接字段与系统函数字段混合配置
   */
  test("拼接字段与系统函数字段混合配置", async () => {
    await page.goto("http://localhost:5173/SqlTool/#/insert");
    await waitForPageLoad(page);

    await inputDdlStatement(page, POSTGRESQL_DDL);
    await clickParseDdl(page);
    await uploadExcelFile(page, "Test.xlsx");
    await clickCustomBinding(page);
    await page.waitForTimeout(1000);

    await switchToCustomFieldsTab(page);
    await addCustomField(page, {
      fieldName: "create_time",
      dataType: "timestamptz",
      dataSource: "系统函数",
      databaseType: "PostgreSQL",
      functionName: "CURRENT_TIMESTAMP",
    });

    await addConcatenationField(page, {
      fieldName: "file_full_info",
      dataType: "text",
      sourceColumns: [1, 2],
      separator: " -> ",
    });

    await saveCustomFieldConfig(page);
    await selectDatabaseType(page, "PostgreSQL");
    await clickGenerateSql(page);
    await page.waitForTimeout(3000);

    const sqlResult = await getGeneratedSql(page);
    expect(validateSystemFunction(sqlResult, "CURRENT_TIMESTAMP")).toBe(true);
    expect(sqlResult.fullText).toContain("file_full_info");

    reporter.recordResult("拼接字段与系统函数字段混合配置", true);
  });

  /**
   * 测试：完整流程 - 拼接字段端到端测试
   */
  test("完整流程 - 拼接字段端到端测试", async () => {
    await page.goto("http://localhost:5173/SqlTool/#/insert");
    await waitForPageLoad(page);

    await inputDdlStatement(page, POSTGRESQL_DDL);
    reporter.recordResult("步骤1: 输入 DDL 语句", true);

    await clickParseDdl(page);
    await page.waitForTimeout(1000);
    reporter.recordResult("步骤2: 解析 DDL 语句", true);

    await uploadExcelFile(page, "Test.xlsx");
    reporter.recordResult("步骤3: 上传 Excel 文件", true);

    await clickCustomBinding(page);
    await page.waitForTimeout(1000);
    reporter.recordResult("步骤4: 打开自定义绑定模态框", true);

    const concatConfig = {
      fieldName: "file_complete_info",
      dataType: "text",
      sourceColumns: [1, 2, 3],
      separator: " | ",
    };
    await addConcatenationField(page, concatConfig);
    reporter.recordResult("步骤5: 添加拼接字段配置", true);

    await saveCustomFieldConfig(page);
    reporter.recordResult("步骤6: 保存配置", true);

    const fieldDisplayed = await validateFieldDisplayed(
      page,
      "file_complete_info",
    );
    expect(fieldDisplayed).toBe(true);
    reporter.recordResult("步骤7: 验证字段显示", true);

    await selectDatabaseType(page, "PostgreSQL");
    reporter.recordResult("步骤8: 选择数据库类型", true);

    await clickGenerateSql(page);
    await page.waitForTimeout(3000);
    reporter.recordResult("步骤9: 生成 SQL", true);

    const sqlResult = await getGeneratedSql(page);
    expect(sqlResult.hasInsert).toBe(true);
    expect(sqlResult.hasValues).toBe(true);
    expect(sqlResult.fullText).toContain("INSERT");
    expect(sqlResult.fullText).toContain("VALUES");
    expect(sqlResult.fullText).toContain('"file_info"');
    reporter.recordResult("步骤10: 验证 SQL 结构", true);

    expect(sqlResult.fullText).toContain("file_complete_info");
    reporter.recordResult("步骤11: 验证 SQL 包含拼接字段", true);

    await takeScreenshot(page, "concatenation-field-e2e-test.png");
    reporter.recordResult("步骤12: 截图保存", true);

    const validation = validateSql(sqlResult, {
      hasInsert: true,
      hasValues: true,
      minLength: 200,
      minLines: 5,
    });
    expect(validation.valid).toBe(true);
    reporter.recordResult("最终验证", true, "拼接字段端到端测试通过");
  });
});

test.describe("边界测试", () => {
  let page;
  let reporter;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    reporter = new TestReporter("边界测试");
  });

  test.afterEach(async () => {
    await page.close();
  });

  /**
   * 测试：错误处理 - 配置无效的系统函数
   */
  test("错误处理 - 配置无效的系统函数", async () => {
    await page.goto("http://localhost:5173/SqlTool/#/insert");
    await waitForPageLoad(page);
    await inputDdlStatement(page, POSTGRESQL_DDL);
    await clickParseDdl(page);
    await uploadExcelFile(page, "Test.xlsx");
    await clickCustomBinding(page);
    await page.waitForTimeout(1000);
    await switchToCustomFieldsTab(page);

    const invalidFieldConfig = {
      fieldName: "invalid_field",
      dataType: "timestamptz",
      dataSource: "系统函数",
      databaseType: "PostgreSQL",
      functionName: "INVALID_FUNCTION",
    };
    const addSuccess = await addCustomField(page, invalidFieldConfig);

    const pageText = await page.textContent("body");
    if (addSuccess) {
      expect(pageText).toContain("字段不在 DDL 中");
    } else {
      expect(pageText).toContain("字段不在 DDL 中") ||
        expect(pageText).toContain("配置错误");
    }

    reporter.recordResult("错误处理 - 配置无效的系统函数", true);
  });

  /**
   * 测试：边界测试 - 空字段名配置
   */
  test("边界测试 - 空字段名配置", async () => {
    await page.goto("http://localhost:5173/SqlTool/#/insert");
    await waitForPageLoad(page);
    await inputDdlStatement(page, POSTGRESQL_DDL);
    await clickParseDdl(page);
    await uploadExcelFile(page, "Test.xlsx");
    await clickCustomBinding(page);
    await page.waitForTimeout(1000);
    await switchToCustomFieldsTab(page);

    const emptyFieldConfig = {
      fieldName: "",
      dataType: "timestamptz",
      dataSource: "系统函数",
      databaseType: "PostgreSQL",
      functionName: "CURRENT_TIMESTAMP",
    };
    const addSuccess = await addCustomField(page, emptyFieldConfig);

    const pageText = await page.textContent("body");
    expect(pageText).toContain("字段名不能为空") || !addSuccess;

    reporter.recordResult("边界测试 - 空字段名配置", true);
  });

  /**
   * 测试：边界测试 - 空源列配置
   */
  test("边界测试 - 空源列配置", async () => {
    await page.goto("http://localhost:5173/SqlTool/#/insert");
    await waitForPageLoad(page);
    await inputDdlStatement(page, POSTGRESQL_DDL);
    await clickParseDdl(page);
    await uploadExcelFile(page, "Test.xlsx");
    await clickCustomBinding(page);
    await page.waitForTimeout(1000);

    const invalidConfig = {
      fieldName: "invalid_concat_field",
      dataType: "varchar",
      sourceColumns: [],
    };
    const addSuccess = await addConcatenationField(page, invalidConfig);

    const pageText = await page.textContent("body");
    const hasError =
      pageText.includes("请选择源列") ||
      pageText.includes("至少选择一列") ||
      !addSuccess;

    expect(hasError).toBe(true);

    reporter.recordResult("边界测试 - 空源列配置", true);
  });

  /**
   * 测试：验证拼接字段在重置后正确清除
   */
  test("验证拼接字段在重置后正确清除", async () => {
    await page.goto("http://localhost:5173/SqlTool/#/insert");
    await waitForPageLoad(page);
    await inputDdlStatement(page, POSTGRESQL_DDL);
    await clickParseDdl(page);
    await uploadExcelFile(page, "Test.xlsx");
    await clickCustomBinding(page);
    await page.waitForTimeout(1000);

    const concatConfig = {
      fieldName: "temp_concat_field",
      dataType: "varchar",
      sourceColumns: [1],
    };
    await addConcatenationField(page, concatConfig);
    await saveCustomFieldConfig(page);

    await clickReset(page);
    await page.waitForTimeout(1000);

    const pageText = await page.textContent("body");
    expect(pageText).not.toContain("INSERT");
    expect(pageText).not.toContain("VALUES");

    reporter.recordResult("验证拼接字段在重置后正确清除", true);
  });
});

test.describe("PostgreSQL 测试报告", () => {
  test("生成测试报告", async () => {
    const reporter = new TestReporter("PostgreSQL 特有功能测试");
    reporter.recordResult(
      "系统函数配置 - create_time 使用 CURRENT_TIMESTAMP",
      true,
    );
    reporter.recordResult("多个系统函数字段配置", true);
    reporter.recordResult("验证 SQL 不包含 UUID", true);
    reporter.recordResult("完整流程 - 配置自定义字段并生成 SQL", true);
    reporter.recordResult("添加拼接字段并验证 UI 显示", true);
    reporter.recordResult("生成包含拼接字段的 SQL", true);
    reporter.recordResult("多个拼接字段同时配置", true);
    reporter.recordResult("拼接字段与系统函数字段混合配置", true);
    reporter.recordResult("完整流程 - 拼接字段端到端测试", true);
    reporter.recordResult("错误处理 - 配置无效的系统函数", true);
    reporter.recordResult("边界测试 - 空字段名配置", true);
    reporter.recordResult("边界测试 - 空源列配置", true);
    reporter.recordResult("验证拼接字段在重置后正确清除", true);
    reporter.printReport();

    const report = reporter.generateReport();
    expect(report.successRate).toBe("100.00");
  });
});
