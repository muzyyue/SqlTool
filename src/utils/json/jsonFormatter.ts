/**
 * JSON 格式化工具模块
 * 提供 JSON 格式化、压缩、转义、验证、统计等功能
 * @module utils/json/jsonFormatter
 */

import type {
  JsonFormatOptions,
  JsonStats,
  JsonValidationResult,
} from "@/types/json";

/**
 * 默认格式化选项
 */
const DEFAULT_FORMAT_OPTIONS: JsonFormatOptions = {
  indentSpaces: 2,
  formatStyle: "expanded",
  preserveKeyOrder: true,
  sortKeys: false,
};

/**
 * 格式化 JSON 数据
 * @param data - JSON 数据对象或字符串
 * @param options - 格式化选项
 * @returns 格式化后的 JSON 字符串
 * @example
 * formatJson({ name: '张三', age: 25 })
 * // 返回: '{\n  "name": "张三",\n  "age": 25\n}'
 */
export function formatJson(
  data: unknown,
  options: Partial<JsonFormatOptions> = {},
): string {
  const mergedOptions = { ...DEFAULT_FORMAT_OPTIONS, ...options };
  const { indentSpaces, formatStyle, sortKeys } = mergedOptions;

  try {
    const jsonObj = typeof data === "string" ? JSON.parse(data) : data;

    if (formatStyle === "compact") {
      return JSON.stringify(jsonObj);
    }

    if (sortKeys && typeof jsonObj === "object" && jsonObj !== null) {
      const sortedObj = sortObjectKeys(jsonObj);
      return JSON.stringify(sortedObj, null, indentSpaces);
    }

    return JSON.stringify(jsonObj, null, indentSpaces);
  } catch (error) {
    throw new Error(
      `JSON 格式化失败: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * 压缩 JSON 数据（移除所有空白字符）
 * @param data - JSON 数据对象或字符串
 * @returns 压缩后的 JSON 字符串
 * @example
 * minifyJson('{\n  "name": "张三"\n}')
 * // 返回: '{"name":"张三"}'
 */
export function minifyJson(data: unknown): string {
  try {
    const jsonObj = typeof data === "string" ? JSON.parse(data) : data;
    return JSON.stringify(jsonObj);
  } catch (error) {
    throw new Error(
      `JSON 压缩失败: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * 转义 JSON 字符串（用于嵌入到其他字符串中）
 * @param str - 原始字符串
 * @returns 转义后的字符串
 * @example
 * escapeJson('hello\nworld')
 * // 返回: 'hello\\nworld'
 */
export function escapeJson(str: string): string {
  return str
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r")
    .replace(/\t/g, "\\t")
    .replace(/\f/g, "\\f")
    .replace(/[\b]/g, "\\b");
}

/**
 * 反转义 JSON 字符串
 * @param str - 转义后的字符串
 * @returns 原始字符串
 * @example
 * unescapeJson('hello\\nworld')
 * // 返回: 'hello\nworld'
 */
export function unescapeJson(str: string): string {
  return str
    .replace(/\\\\/g, "\\")
    .replace(/\\b/g, "\b")
    .replace(/\\f/g, "\f")
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r")
    .replace(/\\t/g, "\t")
    .replace(/\\"/g, '"')
    .replace(/\\'/g, "'");
}

/**
 * 验证 JSON 字符串格式
 * @param str - JSON 字符串
 * @returns 验证结果
 * @example
 * validateJson('{"name": "张三"}')
 * // 返回: { isValid: true }
 */
export function validateJson(str: string): JsonValidationResult {
  if (!str || !str.trim()) {
    return {
      isValid: false,
      errorMessage: "JSON 字符串为空",
    };
  }

  try {
    JSON.parse(str);
    return { isValid: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const position = extractErrorPosition(errorMessage);

    return {
      isValid: false,
      errorMessage: extractErrorMessage(errorMessage),
      errorLine: position?.line,
      errorColumn: position?.column,
      errorPosition: position?.index,
    };
  }
}

/**
 * 计算 JSON 统计信息
 * @param data - JSON 数据对象或字符串
 * @returns 统计信息
 * @example
 * calculateJsonStats({ name: '张三', age: 25, hobbies: ['读书'] })
 * // 返回: { objectCount: 1, arrayCount: 1, fieldCount: 3, ... }
 */
export function calculateJsonStats(data: unknown): JsonStats {
  const stats: JsonStats = {
    objectCount: 0,
    arrayCount: 0,
    fieldCount: 0,
    size: 0,
    stringCount: 0,
    numberCount: 0,
    booleanCount: 0,
    nullCount: 0,
    maxDepth: 0,
  };

  try {
    const jsonObj = typeof data === "string" ? JSON.parse(data) : data;
    stats.size = new Blob([JSON.stringify(jsonObj)]).size;
    traverseJson(jsonObj, stats, 0);
  } catch {
    // 解析失败时返回默认值
  }

  return stats;
}

/**
 * 处理中文逗号（将中文逗号替换为英文逗号）
 * @param str - 原始字符串
 * @returns 处理后的字符串
 */
export function handleChineseComma(str: string): string {
  return str.replace(/，/g, ",");
}

/**
 * 处理中文引号（将中文引号替换为英文引号）
 * @param str - 原始字符串
 * @returns 处理后的字符串
 */
export function handleChineseQuote(str: string): string {
  return str
    .replace(/"/g, '"')
    .replace(/"/g, '"')
    .replace(/'/g, "'")
    .replace(/'/g, "'");
}

/**
 * Unicode 编码（将中文转换为 Unicode 转义序列）
 * @param str - 原始字符串
 * @returns 编码后的字符串
 * @example
 * encodeUnicode('张三')
 * // 返回: '\u5f20\u4e09'
 */
export function encodeUnicode(str: string): string {
  return str.replace(/[\u4e00-\u9fa5]/g, (char) => {
    return `\\u${char.charCodeAt(0).toString(16).padStart(4, "0")}`;
  });
}

/**
 * Unicode 解码（将 Unicode 转义序列转换为中文）
 * @param str - 编码后的字符串
 * @returns 解码后的字符串
 * @example
 * decodeUnicode('\\u5f20\\u4e09')
 * // 返回: '张三'
 */
export function decodeUnicode(str: string): string {
  return str.replace(/\\u([0-9a-fA-F]{4})/g, (_, code) => {
    return String.fromCharCode(parseInt(code, 16));
  });
}

/**
 * 格式化字节大小为可读字符串
 * @param bytes - 字节数
 * @returns 格式化后的字符串
 * @example
 * formatSize(1024)
 * // 返回: '1 KB'
 */
export function formatSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * 遍历 JSON 对象并统计信息
 * @param obj - JSON 对象
 * @param stats - 统计信息对象
 * @param depth - 当前深度
 */
function traverseJson(obj: unknown, stats: JsonStats, depth: number): void {
  if (depth > stats.maxDepth) {
    stats.maxDepth = depth;
  }

  if (obj === null) {
    stats.nullCount++;
    return;
  }

  if (typeof obj === "boolean") {
    stats.booleanCount++;
    return;
  }

  if (typeof obj === "number") {
    stats.numberCount++;
    return;
  }

  if (typeof obj === "string") {
    stats.stringCount++;
    return;
  }

  if (Array.isArray(obj)) {
    stats.arrayCount++;
    obj.forEach((item) => traverseJson(item, stats, depth + 1));
    return;
  }

  if (typeof obj === "object") {
    stats.objectCount++;
    const keys = Object.keys(obj);
    stats.fieldCount += keys.length;
    keys.forEach((key) => {
      traverseJson((obj as Record<string, unknown>)[key], stats, depth + 1);
    });
  }
}

/**
 * 对对象键进行排序
 * @param obj - 原始对象
 * @returns 排序后的对象
 */
function sortObjectKeys(obj: unknown): unknown {
  if (Array.isArray(obj)) {
    return obj.map(sortObjectKeys);
  }

  if (obj !== null && typeof obj === "object") {
    const sorted: Record<string, unknown> = {};
    const keys = Object.keys(obj).sort();
    keys.forEach((key) => {
      sorted[key] = sortObjectKeys((obj as Record<string, unknown>)[key]);
    });
    return sorted;
  }

  return obj;
}

/**
 * 从错误消息中提取错误位置
 * @param errorMessage - 错误消息
 * @returns 错误位置信息
 */
function extractErrorPosition(
  errorMessage: string,
): { line: number; column: number; index: number } | null {
  const positionMatch = errorMessage.match(/position\s+(\d+)/i);
  if (positionMatch) {
    const index = parseInt(positionMatch[1], 10);
    return {
      line: 1,
      column: index + 1,
      index,
    };
  }
  return null;
}

/**
 * 从错误消息中提取友好的错误描述
 * @param errorMessage - 原始错误消息
 * @returns 友好的错误描述
 */
function extractErrorMessage(errorMessage: string): string {
  if (errorMessage.includes("Unexpected token")) {
    const tokenMatch = errorMessage.match(/Unexpected token\s+(.+?)\s+in/);
    if (tokenMatch) {
      return `意外的符号: ${tokenMatch[1]}`;
    }
    return "JSON 格式错误：存在意外的符号";
  }

  if (errorMessage.includes("Expected")) {
    return "JSON 格式错误：缺少必要的符号或格式不正确";
  }

  if (errorMessage.includes("Unexpected end of JSON input")) {
    return "JSON 格式错误：JSON 字符串不完整";
  }

  return `JSON 格式错误: ${errorMessage}`;
}
