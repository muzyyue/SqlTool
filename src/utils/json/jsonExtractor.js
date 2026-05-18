/**
 * JSON参数提取引擎 - 从JSON数据中提取键值对、支持智能解包
 * 支持多种提取模式：键值对扁平化、JSONPath路径提取、混合文本识别、智能值解包
 */

/**
 * 从混合文本中提取所有JSON片段
 * 使用平衡括号匹配算法（比正则更准确）
 * @param {string} text - 输入文本
 * @returns {Array<{json: string, startIndex: number, endIndex: number}>}
 */
export function extractJsonBlocks(text) {
  if (!text || typeof text !== "string") {
    return [];
  }

  const results = [];
  let i = 0;

  while (i < text.length) {
    const char = text[i];

    if (char === "{" || char === "[") {
      const start = i;
      const end = findMatchingBracket(text, i);

      if (end !== -1) {
        const jsonStr = text.slice(start, end + 1);

        try {
          JSON.parse(jsonStr);
          results.push({
            json: jsonStr,
            startIndex: start,
            endIndex: end,
          });
        } catch (e) {
          // 不是合法JSON，跳过
        }

        i = end + 1;
        continue;
      }
    }

    i++;
  }

  return results;
}

/**
 * 解析JSON对象的所有键值对（扁平化处理）
 * @param {Object|Array} json - JSON对象或数组
 * @param {Object} options - 提取选项
 * @param {number} options.maxDepth - 最大递归深度（默认10）
 * @param {boolean} options.includeArrays - 是否展开数组元素（默认false）
 * @param {string} options.prefix - 路径前缀（默认'$'）
 * @returns {Array<{key: string, value: any, path: string, dataType: string, depth: number}>}
 */
export function parseJsonPairs(json, options = {}) {
  const { maxDepth = 10, includeArrays = false, prefix = "$" } = options;

  const result = [];

  function traverse(obj, currentPath, depth) {
    if (depth > maxDepth) return;

    if (obj === null || obj === undefined) {
      result.push({
        key: currentPath.split(".").pop() || "null",
        value: obj,
        path: currentPath,
        dataType: "null",
        depth,
      });
      return;
    }

    if (Array.isArray(obj)) {
      if (includeArrays) {
        obj.forEach((item, index) => {
          const itemPath = `${currentPath}[${index}]`;
          if (item && typeof item === "object") {
            traverse(item, itemPath, depth + 1);
          } else {
            result.push({
              key: `[${index}]`,
              value: item,
              path: itemPath,
              dataType: getDataType(item),
              depth: depth + 1,
            });
          }
        });
      } else {
        result.push({
          key: currentPath.split(".").pop() || "root",
          value: obj,
          path: currentPath,
          dataType: "array",
          length: obj.length,
          depth,
        });
      }
    } else if (typeof obj === "object") {
      for (const [key, value] of Object.entries(obj)) {
        const newPath = `${currentPath}.${key}`;
        if (value && typeof value === "object") {
          traverse(value, newPath, depth + 1);
        } else {
          result.push({
            key,
            value,
            path: newPath,
            dataType: getDataType(value),
            depth: depth + 1,
          });
        }
      }
    }
  }

  traverse(json, prefix, 0);
  return result;
}

/**
 * 根据JSONPath表达式批量提取值（简化版实现）
 * 支持: $.key, $.key[0], $.key.subkey, [*] 通配符
 * @param {Object|Array} json - JSON对象或数组
 * @param {string[]} paths - JSONPath表达式数组
 * @returns {Array<{path: string, value: any, dataType: string, status: string, error?: string}>}
 */
export function extractByJsonPath(json, paths) {
  if (!paths || !Array.isArray(paths)) {
    return [];
  }

  return paths.map((path) => {
    try {
      const value = evaluateJsonPath(json, path);
      return {
        path,
        value,
        dataType: Array.isArray(value) ? "array" : getDataType(value),
        status: "success",
      };
    } catch (error) {
      return {
        path,
        value: null,
        dataType: "error",
        status: "error",
        error: error.message,
      };
    }
  });
}

/**
 * ⭐ 智能值解包 - 从复杂嵌套结构中递归提取原子值
 * 核心能力：自动检测字符串化JSON、递归解析、数据血缘追踪
 *
 * @param {Object|Array} json - JSON对象或数组
 * @param {Object} options - 解包选项
 * @param {number} options.maxDepth - 最大解析深度（默认3，防止无限递归）
 * @param {boolean} options.detectStringifiedJson - 是否检测字符串化JSON（默认true）
 * @param {boolean} options.includeLineage - 是否包含数据血缘（默认true）
 * @param {string[]} options.wrapperPatterns - 识别的包装模式列表
 * @returns {Array<{finalValue: any, fullPath: string, dataType: string, parseDepth: number, lineage: Array, metadata: Object}>}
 */
export function extractAtomicValues(json, options = {}) {
  const {
    maxDepth = 8,
    detectStringifiedJson = true,
    includeLineage = true,
    wrapperPatterns = ["field/value", "data/value", "content/body"],
  } = options;

  const results = [];
  const visited = new WeakSet();

  /**
   * 递归解包函数
   * @param {*} currentValue 当前值
   * @param {string} currentPath 当前路径
   * @param {number} depth 当前深度
   * @param {Array} lineage 数据血缘链
   * @param {boolean} fromStringifiedJson 是否来自字符串化JSON解包
   */
  function unwrap(
    currentValue,
    currentPath,
    depth,
    lineage = [],
    fromStringifiedJson = false,
  ) {
    // 深度限制
    if (depth > maxDepth) {
      results.push(
        createExtractResult(
          currentValue,
          currentPath,
          depth,
          lineage,
          "depth-limit",
          { errorMessage: `超过最大解析深度 (${maxDepth})` },
        ),
      );
      return;
    }

    // 循环引用检测
    if (typeof currentValue === "object" && currentValue !== null) {
      if (visited.has(currentValue)) {
        results.push(
          createExtractResult(
            currentValue,
            currentPath,
            depth,
            lineage,
            "circular-ref",
            { errorMessage: "检测到循环引用" },
          ),
        );
        return;
      }
      visited.add(currentValue);
    }

    // ⭐ 情况1（优先）：字符串化的JSON → 解析后继续递归
    // 必须在原子值检查之前，否则字符串会被直接当作原子值返回
    if (detectStringifiedJson && isStringifiedJson(currentValue)) {
      let parsed;
      try {
        parsed = JSON.parse(currentValue);
        const newLineage = includeLineage
          ? [
              ...lineage,
              createLineageStep(currentPath, currentValue, "parse-json-string"),
            ]
          : lineage;
        unwrap(parsed, currentPath, depth + 1, newLineage, true);
        return;
      } catch (e) {
        // 解析失败，当作普通字符串处理
        results.push(
          createExtractResult(
            currentValue,
            currentPath,
            depth,
            lineage,
            "parse-error",
            { errorMessage: e.message, isEscapedJson: true },
          ),
        );
        return;
      }
    }

    // 情况2：已经是原子值 → 直接提取
    if (!isComplexType(currentValue)) {
      results.push(
        createExtractResult(
          currentValue,
          currentPath,
          depth,
          lineage,
          "success",
          fromStringifiedJson ? { isEscapedJson: true } : undefined,
        ),
      );
      return;
    }

    // 情况3：数组 → 遍历每个元素
    if (Array.isArray(currentValue)) {
      currentValue.forEach((item, index) => {
        const itemPath = `${currentPath}[${index}]`;
        const newLineage = includeLineage
          ? [...lineage, createLineageStep(itemPath, item, "access")]
          : lineage;
        unwrap(item, itemPath, depth + 1, newLineage, fromStringifiedJson);
      });
      return;
    }

    // 情况4：对象 → 遍历每个键值对
    if (typeof currentValue === "object" && currentValue !== null) {
      for (const [key, value] of Object.entries(currentValue)) {
        const valuePath = `${currentPath}.${key}`;
        const newLineage = includeLineage
          ? [...lineage, createLineageStep(valuePath, value, "access")]
          : lineage;
        unwrap(value, valuePath, depth + 1, newLineage, fromStringifiedJson);
      }
      return;
    }
  }

  // 从根节点开始解包
  unwrap(json, "$", 0);

  return results;
}

/**
 * 分析JSON结构（深度、类型分布等）
 * @param {Object|Array} json - JSON对象或数组
 * @returns {{depth: number, totalKeys: number, typeStats: Object}}
 */
export function analyzeJsonStructure(json) {
  let maxDepth = 0;
  let totalKeys = 0;
  const typeStats = {
    string: 0,
    number: 0,
    boolean: 0,
    null: 0,
    object: 0,
    array: 0,
  };

  function analyze(obj, depth) {
    if (depth > maxDepth) maxDepth = depth;

    if (Array.isArray(obj)) {
      typeStats.array++;
      obj.forEach((item) => {
        if (item && typeof item === "object") {
          analyze(item, depth + 1);
        } else {
          totalKeys++;
          typeStats[getDataType(item)]++;
        }
      });
    } else if (typeof obj === "object" && obj !== null) {
      typeStats.object++;
      for (const value of Object.values(obj)) {
        if (value && typeof value === "object") {
          analyze(value, depth + 1);
        } else {
          totalKeys++;
          typeStats[getDataType(value)]++;
        }
      }
    }
  }

  analyze(json, 0);

  return {
    depth: maxDepth,
    totalKeys,
    typeStats,
  };
}

// ==================== 内部辅助函数 ====================

/**
 * 查找匹配的括号位置
 */
function findMatchingBracket(text, startIndex) {
  const openChar = text[startIndex];
  const closeChar = openChar === "{" ? "}" : "]";
  let depth = 1;
  let inString = false;
  let escapeNext = false;

  for (let i = startIndex + 1; i < text.length; i++) {
    const char = text[i];

    if (escapeNext) {
      escapeNext = false;
      continue;
    }

    if (char === "\\") {
      escapeNext = true;
      continue;
    }

    if (char === '"' || char === "'") {
      inString = !inString;
      continue;
    }

    if (!inString) {
      if (char === openChar) depth++;
      else if (char === closeChar) {
        depth--;
        if (depth === 0) return i;
      }
    }
  }

  return -1;
}

/**
 * 检测是否为复杂类型（需要进一步解包）
 */
function isComplexType(value) {
  if (value === null || value === undefined) return false;
  return typeof value === "object" || typeof value === "function";
}

/**
 * 检测字符串是否为字符串化的JSON
 */
function isStringifiedJson(value) {
  if (typeof value !== "string") return false;

  const trimmed = value.trim();

  // 快速检查：必须以 { 或 [ 开头
  if (!/^\s*[{[]/.test(trimmed)) return false;

  try {
    const parsed = JSON.parse(trimmed);
    // 解析成功且结果是非简单类型（对象/数组）
    return typeof parsed === "object" && parsed !== null;
  } catch (e) {
    return false;
  }
}

/**
 * 获取数据类型标签
 */
function getDataType(value) {
  if (value === null) return "null";
  if (value === undefined) return "undefined";
  if (Array.isArray(value)) return "array";
  return typeof value;
}

/**
 * 获取JSON类型（用于血缘记录）
 */
function getJsonType(parsed) {
  if (Array.isArray(parsed)) return "array";
  if (parsed === null) return "null";
  return "object";
}

/**
 * 创建血缘步骤记录
 */
function createLineageStep(path, rawValue, action) {
  return {
    step: 0, // 将由调用者设置正确的步骤号
    path,
    rawValue: truncateValue(rawValue),
    action,
    type: getDataType(rawValue),
  };
}

/**
 * 创建提取结果对象
 */
function createExtractResult(
  finalValue,
  fullPath,
  parseDepth,
  lineage,
  status,
  metadata = {},
) {
  const baseMetadata = {
    originalWrapper: detectWrapperPattern(fullPath),
    isEscapedJson: metadata.isEscapedJson || false,
    charLength: typeof finalValue === "string" ? finalValue.length : null,
    ...metadata,
  };

  return {
    finalValue,
    fullPath,
    dataType: getDataType(finalValue),
    parseDepth,
    status,
    lineage: lineage.map((step, index) => ({ ...step, step: index + 1 })),
    metadata: baseMetadata,
  };
}

/**
 * 截断过长的值显示
 */
function truncateValue(value, maxLength = 50) {
  if (value === null || value === undefined) return value;
  if (typeof value !== "string") return value;
  return value.length > maxLength ? `${value.slice(0, maxLength)}...` : value;
}

/**
 * 检测包装模式
 */
function detectWrapperPattern(path) {
  if (/\.field$/.test(path) || /\.value$/.test(path))
    return "field/value pattern";
  if (/\.data$/.test(path)) return "data/value pattern";
  if (/\.content$/.test(path) || /\.body$/.test(path))
    return "content/body pattern";
  if (/\.result$/.test(path)) return "result/data pattern";
  return null;
}

/**
 * 简化版JSONPath求值器
 */
function evaluateJsonPath(json, path) {
  if (!path || typeof path !== "string") {
    throw new Error("无效的JSONPath表达式");
  }

  if (path === "$") return json;

  const normalizedPath = path.replace(/^\$\.?/, "");
  const parts = normalizedPath.split(/\.|\[|\]/).filter((p) => p !== "");

  let current = json;

  for (const part of parts) {
    if (current === null || current === undefined) {
      throw new Error(`路径 "${part}" 处的值为空`);
    }

    if (part === "*") {
      // 通配符：返回所有元素的值
      if (Array.isArray(current)) {
        return current
          .map((item) => {
            if (typeof item === "object" && item !== null) {
              return Object.values(item);
            }
            return item;
          })
          .flat();
      }
      return Object.values(current);
    }

    if (/^\d+$/.test(part)) {
      // 数组索引
      const index = parseInt(part, 10);
      if (!Array.isArray(current) || index >= current.length) {
        throw new Error(`数组索引越界: ${index}`);
      }
      current = current[index];
    } else {
      // 对象属性
      if (typeof current !== "object" || !(part in current)) {
        throw new Error(`属性 "${part}" 不存在`);
      }
      current = current[part];
    }
  }

  return current;
}

export default {
  extractJsonBlocks,
  parseJsonPairs,
  extractByJsonPath,
  extractAtomicValues,
  analyzeJsonStructure,
};
