import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { useSqlGeneratorEnhanced } from "@/composables/sql/useSqlGeneratorEnhanced";

/**
 * 函数调用测试 - 直接测试核心业务逻辑函数
 * 测试目标：验证函数的输入输出正确性，不依赖 UI 和浏览器
 */

describe("函数调用测试 - SQL 生成核心逻辑", () => {
  let sqlGenerator;

  beforeEach(() => {
    // 初始化 composable
    sqlGenerator = useSqlGeneratorEnhanced();
  });

  afterEach(() => {
    sqlGenerator = null;
  });

  describe("generateInsertSql - 批量插入 SQL 生成", () => {
    it("应该生成正确的 PostgreSQL INSERT 语句", () => {
      // Excel 数据格式：数组数组，每个子数组代表一行
      const excelData = [
        ["test1.txt", "/data/test1.txt", 1024],
        ["test2.txt", "/data/test2.txt", 2048],
      ];

      const ddlFields = [
        { name: "file_id", type: "int8", isPrimaryKey: true, isIdentity: true },
        { name: "file_name", type: "varchar", length: 255 },
        { name: "file_path", type: "text" },
        { name: "file_size", type: "int8" },
      ];

      const fieldMappings = [
        { ddlField: ddlFields[0], excelHeader: null, excelIndex: -1 },
        {
          ddlField: ddlFields[1],
          excelHeader: "file_name",
          excelIndex: 0,
        },
        {
          ddlField: ddlFields[2],
          excelHeader: "file_path",
          excelIndex: 1,
        },
        {
          ddlField: ddlFields[3],
          excelHeader: "file_size",
          excelIndex: 2,
        },
      ];

      const customBindingManager = {
        customFields: [],
        customBindings: [],
        fieldConcatenationRules: [],
        autoIncrementValues: {},
      };

      const result = sqlGenerator.generateInsertSql(
        "file_info",
        fieldMappings,
        excelData,
        {
          dbType: "postgresql",
          customBindingManager,
        },
      );

      expect(result).toBeDefined();
      expect(result).toContain("INSERT INTO file_info");
      expect(result).toContain("VALUES");
      expect(result).toContain("'test1.txt'");
      expect(result).toContain("'test2.txt'");
    });

    it("应该为系统函数生成正确的语法", () => {
      const excelData = [
        ["test.txt", "/data/test.txt", 1024],
      ];

      const ddlFields = [
        { name: "file_id", type: "int8", isPrimaryKey: true, isIdentity: true },
        { name: "file_name", type: "varchar", length: 255 },
        { name: "create_time", type: "timestamptz" },
      ];

      const fieldMappings = [
        { ddlField: ddlFields[0], excelColumn: null, excelIndex: -1 },
        {
          ddlField: ddlFields[1],
          excelColumn: { header: "file_name", index: 0 },
          excelIndex: 0,
        },
        {
          ddlField: {
            ...ddlFields[2],
            isCustom: true,
            customConfig: {
              fieldName: "create_time",
              dataType: "timestamptz",
              dataSource: "system_function",
              systemFunctionConfig: {
                databaseType: "postgresql",
                functionName: "CURRENT_TIMESTAMP",
              },
            },
          },
          excelColumn: null,
          excelIndex: -1,
        },
      ];

      const customBindingManager = {
        customFields: [],
        customBindings: [],
        fieldConcatenationRules: [],
        autoIncrementValues: {},
      };

      const result = sqlGenerator.generateInsertSql(
        "file_info",
        fieldMappings,
        excelData,
        {
          dbType: "postgresql",
          customBindingManager,
        },
      );

      expect(result).toBeDefined();
      expect(result).toContain("CURRENT_TIMESTAMP");
      expect(result).not.toContain("UUID()");
    });

    it("应该处理空值和 undefined 值", () => {
      const excelData = [
        [null, undefined, 0],
      ];

      const ddlFields = [
        { name: "file_id", type: "int8", isPrimaryKey: true, isIdentity: true },
        { name: "file_name", type: "varchar", length: 255 },
        { name: "file_path", type: "text" },
        { name: "file_size", type: "int8" },
      ];

      const fieldMappings = [
        { ddlField: ddlFields[0], excelHeader: null, excelIndex: -1 },
        {
          ddlField: ddlFields[1],
          excelHeader: "file_name",
          excelIndex: 0,
        },
        {
          ddlField: ddlFields[2],
          excelHeader: "file_path",
          excelIndex: 1,
        },
        {
          ddlField: ddlFields[3],
          excelHeader: "file_size",
          excelIndex: 2,
        },
      ];

      const customBindingManager = {
        customFields: [],
        customBindings: [],
        fieldConcatenationRules: [],
        autoIncrementValues: {},
      };

      const result = sqlGenerator.generateInsertSql(
        "file_info",
        fieldMappings,
        excelData,
        {
          dbType: "postgresql",
          customBindingManager,
        },
      );

      expect(result).toBeDefined();
      expect(result).toContain("NULL");
    });

    it("应该处理特殊字符", () => {
      const excelData = [
        ["O'Reilly.txt", "/data/test's file.txt", 1024],
      ];

      const ddlFields = [
        { name: "file_id", type: "int8", isPrimaryKey: true, isIdentity: true },
        { name: "file_name", type: "varchar", length: 255 },
        { name: "file_path", type: "text" },
        { name: "file_size", type: "int8" },
      ];

      const fieldMappings = [
        { ddlField: ddlFields[0], excelHeader: null, excelIndex: -1 },
        {
          ddlField: ddlFields[1],
          excelHeader: "file_name",
          excelIndex: 0,
        },
        {
          ddlField: ddlFields[2],
          excelHeader: "file_path",
          excelIndex: 1,
        },
        {
          ddlField: ddlFields[3],
          excelHeader: "file_size",
          excelIndex: 2,
        },
      ];

      const customBindingManager = {
        customFields: [],
        customBindings: [],
        fieldConcatenationRules: [],
        autoIncrementValues: {},
      };

      const result = sqlGenerator.generateInsertSql(
        "file_info",
        fieldMappings,
        excelData,
        {
          dbType: "postgresql",
          customBindingManager,
        },
      );

      expect(result).toBeDefined();
      // PostgreSQL 使用两个单引号转义一个单引号
      expect(result).toContain("O''Reilly.txt");
      expect(result).toContain("/data/test''s file.txt");
    });

    it("应该支持 MySQL 数据库", () => {
      const excelData = [
        ["test.txt", "/data/test.txt", 1024],
      ];

      const ddlFields = [
        { name: "id", type: "int", isPrimaryKey: true, isIdentity: true },
        { name: "file_name", type: "varchar", length: 255 },
        { name: "file_path", type: "text" },
        { name: "file_size", type: "int" },
      ];

      const fieldMappings = [
        { ddlField: ddlFields[0], excelColumn: null, excelIndex: -1 },
        {
          ddlField: ddlFields[1],
          excelColumn: { header: "file_name", index: 0 },
          excelIndex: 0,
        },
        {
          ddlField: ddlFields[2],
          excelColumn: { header: "file_path", index: 1 },
          excelIndex: 1,
        },
        {
          ddlField: ddlFields[3],
          excelColumn: { header: "file_size", index: 2 },
          excelIndex: 2,
        },
      ];

      const customBindingManager = {
        customFields: [],
        customBindings: [],
        fieldConcatenationRules: [],
        autoIncrementValues: {},
      };

      const result = sqlGenerator.generateInsertSql(
        "file_info",
        fieldMappings,
        excelData,
        {
          dbType: "mysql",
          customBindingManager,
        },
      );

      expect(result).toBeDefined();
      expect(result).toContain("INSERT INTO `file_info`");
    });

    it("应该支持达梦数据库", () => {
      const excelData = [
        ["test.txt", "/data/test.txt", 1024],
      ];

      const ddlFields = [
        { name: "file_id", type: "int8", isPrimaryKey: true, isIdentity: true },
        { name: "file_name", type: "varchar", length: 255 },
        { name: "file_path", type: "text" },
        { name: "file_size", type: "int8" },
      ];

      const fieldMappings = [
        { ddlField: ddlFields[0], excelColumn: null, excelIndex: -1 },
        {
          ddlField: ddlFields[1],
          excelColumn: { header: "file_name", index: 0 },
          excelIndex: 0,
        },
        {
          ddlField: ddlFields[2],
          excelColumn: { header: "file_path", index: 1 },
          excelIndex: 1,
        },
        {
          ddlField: ddlFields[3],
          excelColumn: { header: "file_size", index: 2 },
          excelIndex: 2,
        },
      ];

      const customBindingManager = {
        customFields: [],
        customBindings: [],
        fieldConcatenationRules: [],
        autoIncrementValues: {},
      };

      const result = sqlGenerator.generateInsertSql(
        "file_info",
        fieldMappings,
        excelData,
        {
          dbType: "dm",
          customBindingManager,
        },
      );

      expect(result).toBeDefined();
      expect(result).toContain("INSERT INTO file_info");
    });
  });

  describe("generateUpdateSql - 更新 SQL 生成", () => {
    it("应该生成正确的 PostgreSQL UPDATE 语句", () => {
      const excelData = [
        [1, "updated.txt", "/data/updated.txt"],
      ];

      const ddlFields = [
        { name: "file_id", type: "int8", isPrimaryKey: true },
        { name: "file_name", type: "varchar", length: 255 },
        { name: "file_path", type: "text" },
      ];

      const fieldMappings = [
        {
          ddlField: ddlFields[0],
          excelHeader: "file_id",
          excelIndex: 0,
        },
        {
          ddlField: ddlFields[1],
          excelHeader: "file_name",
          excelIndex: 1,
        },
        {
          ddlField: ddlFields[2],
          excelHeader: "file_path",
          excelIndex: 2,
        },
      ];

      const customBindingManager = {
        customFields: [],
        customBindings: [],
        fieldConcatenationRules: [],
        autoIncrementValues: {},
      };

      const result = sqlGenerator.generateUpdateSql(
        "file_info",
        fieldMappings,
        excelData,
        ["file_id"], // whereFields 参数：WHERE 条件字段数组
        {
          dbType: "postgresql",
          customBindingManager,
        },
      );

      expect(result).toBeDefined();
      expect(result).toContain("UPDATE file_info");
      expect(result).toContain("SET");
      expect(result).toContain("WHERE");
    });
  });
});
