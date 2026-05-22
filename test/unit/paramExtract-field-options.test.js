/**
 * @fileoverview 字段提取功能单元测试 - 使用真实测试数据验证
 * @description 测试 fieldOptions 和 valueOptions 的双策略提取逻辑
 */

import { describe, it, expect } from "vitest";

// 模拟 ParamExtractTab.vue 中的 fieldOptions 计算逻辑（策略2）
function buildFieldOptionsFromExtractedItems(extractedItems) {
  if (!extractedItems || extractedItems.length === 0) {
    return [];
  }

  const fields = new Set();

  extractedItems.forEach((item) => {
    // 从提取结果的 extracted 数组中收集字段名
    if (item.extracted && Array.isArray(item.extracted)) {
      item.extracted.forEach((ext) => {
        const field = ext.path || ext.key;
        if (field) {
          fields.add(field);
        }
      });
    }

    // 如果没有 extracted 字段，尝试从 content 中推断（针对SQL等非结构化数据）
    if (!item.extracted && item.content) {
      const content = item.content;
      // 检测键值对模式：key=value 或 key:value
      const kvPattern = /(\w+)\s*[=:]\s*([^,;]+)/g;
      let match;
      while ((match = kvPattern.exec(content)) !== null) {
        fields.add(match[1].trim());
      }

      // 检测SQL参数模式：@param 或 :param 或 ?param
      const sqlParamPattern = /[@:?](\w+)/g;
      while ((match = sqlParamPattern.exec(content)) !== null) {
        fields.add(match[1].trim());
      }
    }
  });

  if (fields.size > 0) {
    return Array.from(fields)
      .sort()
      .map((f) => ({ label: f, value: f }));
  }

  return [];
}

// 模拟 buildFieldOptions 函数（策略1 - JSON格式）
function buildFieldOptions(data) {
  if (!data) return [];

  const fields = new Set();

  function collectKeys(obj, prefix = "") {
    if (Array.isArray(obj)) {
      obj.forEach((item, idx) => collectKeys(item, prefix));
      return;
    }

    if (typeof obj === "object" && obj !== null) {
      Object.keys(obj).forEach((key) => {
        const fullPath = prefix ? `${prefix}.${key}` : key;
        fields.add(fullPath);

        if (!prefix) {
          collectKeys(obj[key], key);
        }
      });
    }
  }

  collectKeys(data);

  return Array.from(fields)
    .sort()
    .map((f) => ({ label: f, value: f }));
}

// 模拟 valueOptions 计算逻辑（策略2）
function buildValueOptionsFromExtractedItems(extractedItems, selectedField) {
  if (!selectedField || !extractedItems || extractedItems.length === 0) {
    return [];
  }

  const valueMap = new Map();

  extractedItems.forEach((item) => {
    // 从 extracted 数组中查找匹配字段的取值
    if (item.extracted && Array.isArray(item.extracted)) {
      const matched = item.extracted.find(
        (ext) =>
          ext.path === selectedField ||
          ext.key === selectedField,
      );

      if (matched && matched.value !== undefined) {
        const valueStr = String(matched.value);
        valueMap.set(valueStr, (valueMap.get(valueStr) || 0) + 1);
      }
    }

    // 如果没有 extracted，尝试从 content 中解析（针对键值对/SQL）
    if (!item.extracted && item.content) {
      const content = item.content;

      // 键值对模式：field=value
      const kvPattern = new RegExp(
        `${selectedField}\\s*[=:]\\s*([^,;]+)`,
        "g",
      );
      let match;
      while ((match = kvPattern.exec(content)) !== null) {
        const value = match[1].trim();
        valueMap.set(value, (valueMap.get(value) || 0) + 1);
      }
    }
  });

  if (valueMap.size > 0) {
    return Array.from(valueMap.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([label, count]) => ({ label, value: label, count }));
  }

  return [];
}

describe("字段提取功能测试 - 真实数据", () => {
  describe("测试数据解析", () => {
    const testData = `[{"field":"files","type":"files","value":"[{\\\"type\\\":1,\\\"value\\\":\\\"灼云间,无道书\\\"}]","value_data":{"files":[],"file":["灼云间","无道书"],"wsml":""}}]`;

    it("应该正确解析JSON字符串", () => {
      const parsed = JSON.parse(testData);
      expect(parsed).toBeInstanceOf(Array);
      expect(parsed.length).toBe(1);
      expect(parsed[0]).toHaveProperty("field", "files");
      expect(parsed[0]).toHaveProperty("type", "files");
      expect(parsed[0]).toHaveProperty("value");
      expect(parsed[0]).toHaveProperty("value_data");
    });

    it("策略1 - buildFieldOptions 应该提取所有字段（含嵌套）", () => {
      const parsed = JSON.parse(testData);
      const options = buildFieldOptions(parsed);

      console.log("📋 提取的字段列表:", options.map(o => o.value));

      // 预期字段（顶层 + 嵌套）
      const expectedFields = [
        "field",
        "type",
        "value",
        "value_data",
        "value_data.files",
        "value_data.file",
        "value_data.wsml"
      ];

      expect(options.length).toBeGreaterThanOrEqual(expectedFields.length);

      // 验证关键字段存在
      const fieldValues = options.map(o => o.value);
      expectedFields.forEach(field => {
        expect(fieldValues).toContain(field);
      });
    });

    it("应该能访问嵌套字段的值", () => {
      const parsed = JSON.parse(testData);
      const item = parsed[0];

      // 验证嵌套结构可访问
      expect(item.value_data).toBeDefined();
      expect(item.value_data.file).toBeDefined();
      expect(Array.isArray(item.value_data.file)).toBe(true);
      expect(item.value_data.file).toContain("灼云间");
      expect(item.value_data.file).toContain("无道书");
    });
  });

  describe("模拟 extractor.extract() 返回结果", () => {
    // 模拟 useParamExtractor 对该数据的处理结果
    function createMockExtractResult(testData) {
      const parsed = JSON.parse(testData)[0];

      return [{
        id: "json-0",
        type: "json",
        original: testData,
        content: testData,
        extracted: [
          { key: "field", value: parsed.field, path: "field" },
          { key: "type", value: parsed.type, path: "type" },
          { key: "value", value: parsed.value, path: "value" },
          { key: "files", value: JSON.stringify(parsed.value_data.files), path: "value_data.files" },
          { key: "file", value: parsed.value_data.file.join(", "), path: "value_data.file" },
          { key: "wsml", value: parsed.value_data.wsml, path: "value_data.wsml" },
        ],
        status: "success"
      }];
    }

    const testData = `[{"field":"files","type":"files","value":"[{\\\"type\\\":1,\\\"value\\\":\\\"灼云间,无道书\\\"}]","value_data":{"files":[],"file":["灼云间","无道书"],"wsml":""}}]`;
    const mockExtractedItems = createMockExtractResult(testData);

    it("策略2 - fieldOptions 应该从 extracted 数组中收集字段", () => {
      const options = buildFieldOptionsFromExtractedItems(mockExtractedItems);

      console.log("📋 策略2提取的字段:", options.map(o => o.value));

      expect(options.length).toBeGreaterThan(0);

      const fieldValues = options.map(o => o.value);

      // 验证所有字段都被提取
      expect(fieldValues).toContain("field");
      expect(fieldValues).toContain("type");
      expect(fieldValues).toContain("value");
      expect(fieldValues).toContain("value_data.files");
      expect(fieldValues).toContain("value_data.file");
      expect(fieldValues).toContain("value_data.wsml");
    });

    it("选择 'field' 字段后，valueOptions 应该返回对应的值", () => {
      const options = buildValueOptionsFromExtractedItems(mockExtractedItems, "field");

      console.log("📋 'field' 字段的取值:", options);

      expect(options.length).toBeGreaterThan(0);
      expect(options[0].label).toBe("files");
      expect(options[0].count).toBe(1); // 出现1次
    });

    it("选择 'type' 字段后，valueOptions 应该返回对应的值", () => {
      const options = buildValueOptionsFromExtractedItems(mockExtractedItems, "type");

      console.log("📋 'type' 字段的取值:", options);

      expect(options.length).toBeGreaterThan(0);
      expect(options[0].label).toBe("files");
    });

    it("选择 'value_data.file' 字段后，valueOptions 应该返回文件列表", () => {
      const options = buildValueOptionsFromExtractedItems(mockExtractedItems, "value_data.file");

      console.log("📋 'value_data.file' 字段的取值:", options);

      expect(options.length).toBeGreaterThan(0);
      expect(options[0].label).toContain("灼云间");
      expect(options[0].label).toContain("无道书");
    });

    it("选择不存在的字段时，应返回空数组", () => {
      const options = buildValueOptionsFromExtractedItems(mockExtractedItems, "nonexistent_field");

      expect(options).toEqual([]);
    });
  });

  describe("边界情况测试", () => {
    it("空数组输入应返回空选项", () => {
      const options = buildFieldOptionsFromExtractedItems([]);
      expect(options).toEqual([]);
    });

    it("null 输入应返回空选项", () => {
      const options = buildFieldOptionsFromExtractedItems(null);
      expect(options).toEqual([]);
    });

    it("没有 extracted 和 content 的项应被跳过", () => {
      const items = [{ id: "empty" }]; // 没有 extracted 和 content
      const options = buildFieldOptionsFromExtractedItems(items);
      expect(options).toEqual([]);
    });

    it("多个相同字段应去重", () => {
      const items = [
        {
          extracted: [
            { key: "name", value: "张三", path: "name" },
            { key: "age", value: 25, path: "age" },
          ]
        },
        {
          extracted: [
            { key: "name", value: "李四", path: "name" }, // name 重复
            { key: "city", value: "北京", path: "city" },
          ]
        }
      ];

      const options = buildFieldOptionsFromExtractedItems(items);
      const fieldValues = options.map(o => o.value);

      // name 只出现一次（去重）
      const nameCount = fieldValues.filter(f => f === "name").length;
      expect(nameCount).toBe(1);

      // 总共3个唯一字段
      expect(fieldValues).toContain("name");
      expect(fieldValues).toContain("age");
      expect(fieldValues).toContain("city");
      expect(options.length).toBe(3);
    });

    it("取值应按出现次数降序排列", () => {
      const items = [
        { extracted: [{ key: "status", value: "active", path: "status" }] },
        { extracted: [{ key: "status", value: "active", path: "status" }] }, // active 出现2次
        { extracted: [{ key: "status", value: "inactive", path: "status" }] }, // inactive 出现1次
      ];

      const options = buildValueOptionsFromExtractedItems(items, "status");

      console.log("📋 按频率排序的取值:", options);

      expect(options.length).toBe(2);
      expect(options[0].label).toBe("active"); // 最常用在前
      expect(options[0].count).toBe(2);
      expect(options[1].label).toBe("inactive");
      expect(options[1].count).toBe(1);
    });
  });

  describe("完整流程集成测试", () => {
    it("完整模拟：选择源列 → 预提取 → 选择字段 → 选择取值", async () => {
      const testData = `[{"field":"files","type":"files","value":"[{\\\"type\\\":1,\\\"value\\\":\\\"灼云间,无道书\\\"}]","value_data":{"files":[],"file":["灼云间","无道书"],"wsml":""}}]`;

      // Step 1: 模拟预提取后的结果
      const parsed = JSON.parse(testData)[0];
      const mockExtractedItems = [{
        id: "json-0",
        type: "json",
        original: testData,
        content: testData,
        extracted: Object.keys(parsed).map(key => ({
          key,
          value: typeof parsed[key] === "object" ? JSON.stringify(parsed[key]) : parsed[key],
          path: key
        })),
        status: "success"
      }];

      // 递归处理嵌套对象以生成完整的 extracted 列表
      function flattenObject(obj, prefix = "") {
        const result = [];
        for (const [key, value] of Object.entries(obj)) {
          const fullPath = prefix ? `${prefix}.${key}` : key;
          if (typeof value === "object" && value !== null && !Array.isArray(value)) {
            result.push(...flattenObject(value, fullPath));
          } else {
            result.push({
              key: fullPath,
              value: Array.isArray(value) ? JSON.stringify(value) : String(value),
              path: fullPath
            });
          }
        }
        return result;
      }

      mockExtractedItems[0].extracted = flattenObject(parsed);

      // Step 2: 获取字段选项
      const fieldOptions = buildFieldOptionsFromExtractedItems(mockExtractedItems);
      console.log("\n✅ Step 2 - 字段选项:");
      fieldOptions.forEach(opt => console.log(`   - ${opt.label}`));
      expect(fieldOptions.length).toBeGreaterThan(0);

      // Step 3: 选择一个字段（如 file）
      const selectedField = "value_data.file";
      const valueOptions = buildValueOptionsFromExtractedItems(mockExtractedItems, selectedField);
      console.log(`\n✅ Step 3 - 选择字段 '${selectedField}' 的取值:`);
      valueOptions.forEach(opt => console.log(`   - ${opt.label} (${opt.count}次)`));
      expect(valueOptions.length).toBeGreaterThan(0);

      // Step 4: 验证取值内容
      expect(valueOptions[0].label).toContain("灼云间");
      expect(valueOptions[0].label).toContain("无道书");

      console.log("\n🎉 完整流程测试通过！");
    });
  });
});
