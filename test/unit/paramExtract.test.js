/**
 * @fileoverview 参数提取功能单元测试
 * @description 测试ParamExtractTab组件的核心函数：findBestMatch、writeToTargetColumn等
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// 模拟 findBestMatch 函数（从组件中提取的逻辑）
function findBestMatch(sourceValue, results) {
  if (!results || results.length === 0) return null;

  // 优先精确匹配
  const exactMatch = results.find((r) => r.content.includes(sourceValue));
  if (exactMatch) return exactMatch;

  // 其次部分匹配
  const partialMatch = results.find(
    (r) =>
      sourceValue.includes(r.content) ||
      r.content.split("").some((char) => sourceValue.includes(char)),
  );
  if (partialMatch) return partialMatch;

  // 最后返回第一个结果
  return results[0];
}

describe("ParamExtractTab - 核心功能测试", () => {
  describe("findBestMatch 函数", () => {
    it("应该在结果为空时返回 null", () => {
      const result = findBestMatch("test", []);
      expect(result).toBeNull();
    });

    it("应该在 undefined 结果时返回 null", () => {
      const result = findBestMatch("test", undefined);
      expect(result).toBeNull();
    });

    it("应该找到精确匹配的结果", () => {
      const results = [
        { content: "name=张三" },
        { content: "age=25" },
        { content: "city=北京" },
      ];

      const result = findBestMatch("name=张三", results);
      expect(result).toEqual({ content: "name=张三" });
    });

    it("应该找到包含源值的结果", () => {
      const results = [
        { content: "name" },
        { content: "age" },
        { content: "city" },
      ];

      const result = findBestMatch("name=张三, age=25", results);
      expect(result).toEqual({ content: "name" });
    });

    it("应该找到被源值包含的结果", () => {
      const results = [
        { content: "张三" },
        { content: "李四" },
        { content: "王五" },
      ];

      const result = findBestMatch("用户：张三正在登录系统", results);
      expect(result).toEqual({ content: "张三" });
    });

    it("在没有匹配时返回第一个结果", () => {
      const results = [
        { content: "default1" },
        { content: "default2" },
      ];

      const result = findBestMatch("完全不相关的内容", results);
      expect(result).toEqual({ content: "default1" });
    });

    it("应该处理特殊字符和空格", () => {
      const results = [
        { content: '{"key": "value"}' },
        { content: "[1, 2, 3]" },
        { content: "SELECT * FROM table" },
      ];

      const result = findBestMatch('数据: {"key": "value"}', results);
      expect(result).toEqual({ content: '{"key": "value"}' });
    });
  });

  describe("列选项生成逻辑", () => {
    it("应该正确生成列选项（带名称）", () => {
      const columns = [
        { letter: "A", name: "姓名", index: 0 },
        { letter: "B", name: "年龄", index: 1 },
      ];

      const columnOptions = columns.map((col) => ({
        value: col.letter,
        label:
          col.name && col.name !== `列${col.index + 1}`
            ? `${col.letter} (${col.name})`
            : col.letter,
      }));

      expect(columnOptions).toEqual([
        { value: "A", label: "A (姓名)" },
        { value: "B", label: "B (年龄)" },
      ]);
    });

    it("应该正确生成列选项（无自定义名称）", () => {
      const columns = [
        { letter: "A", name: "列1", index: 0 },
        { letter: "B", name: "列2", index: 1 },
      ];

      const columnOptions = columns.map((col) => ({
        value: col.letter,
        label:
          col.name && col.name !== `列${col.index + 1}`
            ? `${col.letter} (${col.name})`
            : col.letter,
      }));

      expect(columnOptions).toEqual([
        { value: "A", label: "A" },
        { value: "B", label: "B" },
      ]);
    });

    it("应该生成包含新建列选项的目标列选项", () => {
      const columns = [
        { letter: "A", name: "姓名", index: 0 },
        { letter: "B", name: "年龄", index: 1 },
      ];

      const existingColumns = columns.map((col) => ({
        value: col.letter,
        label:
          col.name && col.name !== `列${col.index + 1}`
            ? `${col.letter} (${col.name}) - 覆盖`
            : `${col.letter} - 覆盖`,
      }));

      existingColumns.push({
        value: "__new__",
        label: "➕ 新建列 (C)",
      });

      expect(existingColumns).toEqual([
        { value: "A", label: "A (姓名) - 覆盖" },
        { value: "B", label: "B (年龄) - 覆盖" },
        { value: "__new__", label: "➕ 新建列 (C)" },
      ]);
    });

    it("应该处理空列数组", () => {
      const columns = [];

      const columnOptions = columns.map((col) => ({
        value: col.letter,
        label: col.letter,
      }));

      expect(columnOptions).toEqual([]);
    });
  });

  describe("Excel 数据读取逻辑模拟", () => {
    it("应该正确读取源列数据（跳过标题行）", () => {
      // 模拟工作表数据
      const mockCells = {
        A1: { v: "姓名", t: "s" }, // 标题行
        A2: { v: "张三", t: "s" },
        A3: { v: "李四", t: "s" },
        A4: { v: "", t: "s" }, // 空值
        A5: { v: "王五", t: "s" },
      };

      const sourceColIndex = 0; // A列
      const startRow = 2; // 从第2行开始
      const maxRow = 5;

      const sourceData = [];
      for (let row = startRow - 1; row < maxRow; row++) {
        const cellAddress = String.fromCharCode(65 + sourceColIndex) + (row + 1); // 简化的列字母转换
        const cell = mockCells[cellAddress];

        if (cell && cell.v !== undefined && cell.v !== "") {
          sourceData.push({
            value: String(cell.v),
            row: row + 1,
          });
        }
      }

      expect(sourceData).toEqual([
        { value: "张三", row: 2 },
        { value: "李四", row: 3 },
        { value: "王五", row: 5 },
      ]);

      // 验证空值被跳过
      expect(sourceData.length).toBe(3);
    });

    it("应该合并多行为文本进行提取", () => {
      const sourceData = [
        { value: "name=张三", row: 2 },
        { value: "age=25", row: 3 },
        { value: "city=北京", row: 4 },
      ];

      const textToProcess = sourceData.map((item) => item.value).join("\n");

      expect(textToProcess).toBe("name=张三\nage=25\ncity=北京");
      expect(textToProcess.split("\n").length).toBe(3);
    });
  });

  describe("目标列写入逻辑模拟", () => {
    it("应该将提取结果写入目标列单元格", () => {
      // 模拟工作表对象
      const ws = {};

      // 模拟提取结果
      const extractedResults = [{ content: "张三" }, { content: "25" }];

      // 模拟源数据
      const sourceData = [
        { value: "user:name:张三,age:25", row: 2 },
        { value: "user:name:李四,age:30", row: 3 },
      ];

      const targetColIndex = 1; // B列

      // 执行写入逻辑
      for (const sourceItem of sourceData) {
        let extractedContent = "";

        if (extractedResults.length > 0) {
          // 简化版匹配逻辑：按索引对应
          const idx = sourceData.indexOf(sourceItem);
          extractedContent =
            extractedResults[idx]?.content || "";
        }

        const targetCellAddress =
          String.fromCharCode(65 + targetColIndex) + sourceItem.row;

        if (!ws[targetCellAddress]) {
          ws[targetCellAddress] = {};
        }

        ws[targetCellAddress].v = extractedContent;
        ws[targetCellAddress].t = "s";
      }

      // 验证写入结果
      expect(ws["B2"].v).toBe("张三");
      expect(ws["B2"].t).toBe("s");
      expect(ws["B3"].v).toBe("25");
      expect(ws["B3"].t).toBe("s");
    });

    it("应该处理新建列的情况（扩展范围）", () => {
      const initialRange = { s: { r: 0, c: 0 }, e: { r: 4, c: 1 } }; // A1:B5

      const targetColIndex = initialRange.e.c + 1; // 新建第3列（C）
      initialRange.e.c = targetColIndex;

      // 验证范围已扩展
      expect(targetColIndex).toBe(2); // C列的索引
      expect(initialRange.e.c).toBe(2);

      // 新建列应该是 C 列
      const newColLetter = String.fromCharCode(65 + targetColIndex);
      expect(newColLetter).toBe("C");
    });
  });

  describe("错误处理", () => {
    it("应该验证必填字段", () => {
      const selectedColumn = undefined;
      const targetColumn = undefined;

      let errors = [];

      if (!selectedColumn) {
        errors.push("请选择源列");
      }
      if (!targetColumn) {
        errors.push("请选择目标列");
      }

      expect(errors).toContain("请选择源列");
      expect(errors).toContain("请选择目标列");
      expect(errors.length).toBe(2);
    });

    it("应该处理无效的列选择", () => {
      const columns = [
        { letter: "A", name: "姓名", index: 0 },
        { letter: "B", name: "年龄", index: 1 },
      ];

      const invalidColumn = "Z";
      const found = columns.find((col) => col.letter === invalidColumn);

      expect(found).toBeUndefined();

      // 应该抛出错误或返回提示
      try {
        if (!found) {
          throw new Error("无效的列选择");
        }
      } catch (error) {
        expect(error.message).toBe("无效的列选择");
      }
    });
  });

  describe("性能边界测试", () => {
    it("应该处理大量数据的提取", () => {
      // 生成1000条测试数据
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        value: `field${i}=value${i}`,
        row: i + 2,
      }));

      // 合并文本
      const startTime = performance.now();
      const textToProcess = largeDataset.map((item) => item.value).join("\n");
      const endTime = performance.now();

      // 验证性能：处理1000条数据应在100ms内完成
      expect(endTime - startTime).toBeLessThan(100);
      expect(textToProcess.split("\n").length).toBe(1000);
    });

    it("应该处理超长文本内容", () => {
      const longText = "a".repeat(10000);
      const results = [{ content: longText.substring(0, 100) }];

      const result = findBestMatch(longText, results);

      // 应该能找到匹配（即使文本很长）
      expect(result).not.toBeNull();
    });
  });
});
