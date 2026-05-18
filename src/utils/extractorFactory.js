/**
 * 提取器工厂 - 统一管理SQL和JSON提取器
 * 提供内容类型自动检测和提取器创建功能
 */

import {
  extractSqlStatements,
  validateSql,
  parseSqlStructure,
} from "@/utils/sql/sqlExtractor";
import {
  extractJsonBlocks,
  parseJsonPairs,
  extractByJsonPath,
  extractAtomicValues,
  analyzeJsonStructure,
} from "@/utils/json/jsonExtractor";

/**
 * 内容类型枚举
 */
export const ContentType = {
  SQL: "sql",
  JSON: "json",
  MIXED: "mixed",
  UNKNOWN: "unknown",
};

/**
 * 内容类型自动检测
 * 通过特征关键词识别输入文本的内容类型
 *
 * @param {string} text - 输入文本
 * @returns {{type: string, confidence: number}} - 检测结果（类型 + 置信度 0-1）
 */
export function detectContentType(text) {
  if (!text || typeof text !== "string") {
    return { type: ContentType.UNKNOWN, confidence: 0 };
  }

  const trimmedText = text.trim();

  // SQL特征检测
  const sqlIndicators = [
    /\b(SELECT|INSERT|UPDATE|DELETE)\b/i, // DML关键字
    /\b(CREATE|ALTER|DROP|TRUNCATE)\b/i, // DDL关键字
    /\b(BEGIN|COMMIT|ROLLBACK)\b/i, // TCL关键字
    /\b(GRANT|REVOKE)\b/i, // DCL关键字
  ];

  let sqlScore = 0;
  sqlIndicators.forEach((pattern) => {
    if (pattern.test(trimmedText)) {
      sqlScore++;
    }
  });

  // JSON特征检测
  const jsonIndicators = [
    /^\s*[{[]/m, // 以 { 或 [ 开头
    /"[^"]+"\s*:/, // "key": 模式
    /\[\s*{/, // [{ 模式（JSON数组）
    /}\s*\]$/, // }] 模式（JSON数组结尾）
  ];

  let jsonScore = 0;
  jsonIndicators.forEach((pattern) => {
    if (pattern.test(trimmedText)) {
      jsonScore++;
    }
  });

  // 计算置信度
  const maxPossible = Math.max(sqlIndicators.length, jsonIndicators.length);
  const sqlConfidence = sqlScore > 0 ? Math.min(sqlScore / maxPossible, 1) : 0;
  const jsonConfidence =
    jsonScore > 0 ? Math.min(jsonScore / maxPossible, 1) : 0;

  // 判断类型
  if (sqlConfidence > 0 && jsonConfidence > 0) {
    // 同时包含SQL和JSON特征 → 混合类型
    return {
      type: ContentType.MIXED,
      confidence: Math.max(sqlConfidence, jsonConfidence),
      details: {
        sql: { score: sqlScore, confidence: sqlConfidence },
        json: { score: jsonScore, confidence: jsonConfidence },
      },
    };
  }

  if (sqlConfidence > 0) {
    return {
      type: ContentType.SQL,
      confidence: sqlConfidence,
      details: { score: sqlScore },
    };
  }

  if (jsonConfidence > 0.3) {
    // JSON需要更高的置信度阈值（避免误判）
    return {
      type: ContentType.JSON,
      confidence: jsonConfidence,
      details: { score: jsonScore },
    };
  }

  return {
    type: ContentType.UNKNOWN,
    confidence: 0,
  };
}

/**
 * 创建对应的提取器实例
 * 根据内容类型返回相应的提取方法集合
 *
 * @param {string} type - 内容类型 ('sql' | 'json' | 'mixed')
 * @returns {Object} - 提取器对象，包含extract、validate、parse等方法
 */
export function createExtractor(type) {
  switch (type) {
    case ContentType.SQL:
      return createSqlExtractor();

    case ContentType.JSON:
      return createJsonExtractor();

    case ContentType.MIXED:
      return createMixedExtractor();

    default:
      throw new Error(`不支持的内容类型: ${type}`);
  }
}

/**
 * SQL提取器
 */
function createSqlExtractor() {
  return {
    type: ContentType.SQL,

    /**
     * 提取SQL语句
     */
    async extract(text, options = {}) {
      const statements = extractSqlStatements(text, options);

      return {
        items: statements.map((stmt, index) => ({
          id: `sql-${index}`,
          type: "sql",
          original: stmt.raw || stmt.sql,
          extracted: [
            {
              key: `statement-${index + 1}`,
              value: stmt.sql,
              dataType: stmt.type,
              lineStart: stmt.lineStart,
              lineEnd: stmt.lineEnd,
              status: "success",
            },
          ],
          stats: {
            total: 1,
            valid: 1,
            error: 0,
            warning: 0,
          },
          metadata: {
            sqlType: stmt.type,
            lineRange: `${stmt.lineStart}-${stmt.lineEnd}`,
          },
        })),
        stats: {
          total: statements.length,
          sqlCount: statements.length,
          jsonCount: 0,
          success: statements.length,
          error: 0,
          warning: 0,
        },
      };
    },

    /**
     * 验证SQL语法
     */
    validate(sql) {
      return validateSql(sql);
    },

    /**
     * 解析SQL结构
     */
    parse(sql) {
      return parseSqlStructure(sql);
    },
  };
}

/**
 * JSON提取器
 */
function createJsonExtractor() {
  return {
    type: ContentType.JSON,

    /**
     * 提取JSON数据
     */
    async extract(text, options = {}) {
      const { mode = "pairs", ...extractOptions } = options;

      try {
        const jsonData = typeof text === "string" ? JSON.parse(text) : text;

        let extracted = [];

        switch (mode) {
          case "pairs":
            extracted = parseJsonPairs(jsonData, extractOptions);
            break;

          case "atomic":
            extracted = extractAtomicValues(jsonData, extractOptions);
            break;

          default:
            extracted = parseJsonPairs(jsonData, extractOptions);
        }

        const successCount = extracted.filter(
          (item) => item.status !== "error",
        ).length;
        const errorCount = extracted.filter(
          (item) => item.status === "error",
        ).length;

        return {
          items: [
            {
              id: "json-0",
              type: "json",
              original: text,
              extracted: extracted.map((item, index) => ({
                key: item.key || item.fullPath || `item-${index}`,
                value: item.value || item.finalValue,
                dataType: item.dataType,
                path: item.path || item.fullPath,
                status: item.status === "error" ? "error" : "success",
                error: item.error || item.metadata?.errorMessage,
                metadata: item,
              })),
              stats: {
                total: extracted.length,
                valid: successCount,
                error: errorCount,
                warning: 0,
              },
              metadata: {
                structure: analyzeJsonStructure(jsonData),
                mode,
              },
            },
          ],
          stats: {
            total: extracted.length,
            sqlCount: 0,
            jsonCount: extracted.length,
            success: successCount,
            error: errorCount,
            warning: 0,
          },
        };
      } catch (error) {
        return {
          items: [],
          stats: {
            total: 0,
            sqlCount: 0,
            jsonCount: 0,
            success: 0,
            error: 1,
            warning: 0,
          },
          error: error.message,
        };
      }
    },

    /**
     * 从混合文本中提取JSON块
     */
    extractBlocks(text) {
      return extractJsonBlocks(text);
    },

    /**
     * JSONPath路径提取
     */
    extractByPath(json, paths) {
      return extractByJsonPath(json, paths);
    },

    /**
     * 智能值解包
     */
    unwrap(json, options = {}) {
      return extractAtomicValues(json, options);
    },

    /**
     * 分析结构
     */
    analyze(json) {
      return analyzeJsonStructure(json);
    },
  };
}

/**
 * 混合提取器（同时处理SQL和JSON）
 */
function createMixedExtractor() {
  const sqlExtractor = createSqlExtractor();
  const jsonExtractor = createJsonExtractor();

  return {
    type: ContentType.MIXED,

    /**
     * 分别提取SQL和JSON
     */
    async extract(text, options = {}) {
      const [sqlResult, jsonResult] = await Promise.all([
        sqlExtractor.extract(text, options).catch(() => ({
          items: [],
          stats: {
            total: 0,
            sqlCount: 0,
            jsonCount: 0,
            success: 0,
            error: 0,
            warning: 0,
          },
        })),
        jsonExtractor.extract(text, options).catch(() => ({
          items: [],
          stats: {
            total: 0,
            sqlCount: 0,
            jsonCount: 0,
            success: 0,
            error: 0,
            warning: 0,
          },
        })),
      ]);

      const allItems = [...sqlResult.items, ...jsonResult.items];

      return {
        items: allItems,
        stats: {
          total: allItems.length,
          sqlCount: sqlResult.stats.total,
          jsonCount: jsonResult.stats.total,
          success: sqlResult.stats.success + jsonResult.stats.success,
          error: sqlResult.stats.error + jsonResult.stats.error,
          warning: sqlResult.stats.warning + jsonResult.stats.warning,
        },
      };
    },

    /**
     * 获取子提取器
     */
    getSqlExtractor() {
      return sqlExtractor;
    },

    /**
     * 获取JSON提取器
     */
    getJsonExtractor() {
      return jsonExtractor;
    },
  };
}

export default {
  detectContentType,
  createExtractor,
  ContentType,
};
