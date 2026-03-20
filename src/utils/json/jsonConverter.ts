/**
 * JSON 格式转换工具模块
 * 提供 JSON 转 XML、YAML、CSV、SQL 等格式的功能
 * @module utils/json/jsonConverter
 */

import type { FormatConverterOptions } from "@/types/json";

/**
 * 将 JSON 转换为指定格式
 * @param data - JSON 数据
 * @param options - 转换选项
 * @returns 转换后的字符串
 */
export function convertFormat(
  data: unknown,
  options: FormatConverterOptions,
): string {
  const { targetFormat } = options;
  const jsonObj = typeof data === "string" ? JSON.parse(data) : data;

  switch (targetFormat) {
    case "xml":
      return convertToXml(jsonObj, options.xmlRootName || "root");
    case "yaml":
      return convertToYaml(jsonObj);
    case "csv":
      return convertToCsv(
        jsonObj,
        options.csvDelimiter || ",",
        options.includeHeader !== false,
      );
    case "sql":
      return convertToSql(jsonObj, options.sqlTableName || "json_data");
    case "toml":
      return convertToToml(jsonObj);
    default:
      throw new Error(`不支持的目标格式: ${targetFormat}`);
  }
}

/**
 * 将 JSON 转换为 XML
 * @param data - JSON 数据
 * @param rootName - 根元素名称
 * @returns XML 字符串
 */
function convertToXml(data: unknown, rootName: string): string {
  const header = '<?xml version="1.0" encoding="UTF-8"?>';
  const root = convertValueToXml(data, rootName);
  return `${header}\n${root}`;
}

/**
 * 递归转换值为 XML
 */
function convertValueToXml(value: unknown, tagName: string): string {
  const safeTagName = sanitizeXmlTagName(tagName);

  if (value === null) {
    return `<${safeTagName}></${safeTagName}>`;
  }

  if (value === undefined) {
    return `<${safeTagName}></${safeTagName}>`;
  }

  if (
    typeof value === "boolean" ||
    typeof value === "number" ||
    typeof value === "string"
  ) {
    return `<${safeTagName}>${escapeXml(String(value))}</${safeTagName}>`;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return `<${safeTagName}></${safeTagName}>`;
    }
    const items = value
      .map((item) => convertValueToXml(item, "item"))
      .join("\n  ");
    return `<${safeTagName}>\n  ${items}\n</${safeTagName}>`;
  }

  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const keys = Object.keys(obj);

    if (keys.length === 0) {
      return `<${safeTagName}></${safeTagName}>`;
    }

    const children = keys
      .map((key) => convertValueToXml(obj[key], key))
      .join("\n  ");
    return `<${safeTagName}>\n  ${children}\n</${safeTagName}>`;
  }

  return `<${safeTagName}></${safeTagName}>`;
}

/**
 * 将 JSON 转换为 YAML
 * @param data - JSON 数据
 * @returns YAML 字符串
 */
function convertToYaml(data: unknown, indent: number = 0): string {
  const prefix = "  ".repeat(indent);

  if (data === null) {
    return "null";
  }

  if (data === undefined) {
    return "";
  }

  if (typeof data === "boolean") {
    return data ? "true" : "false";
  }

  if (typeof data === "number") {
    return String(data);
  }

  if (typeof data === "string") {
    if (data.includes("\n") || data.includes(":") || data.includes("#")) {
      return `"${escapeYamlString(data)}"`;
    }
    return data;
  }

  if (Array.isArray(data)) {
    if (data.length === 0) {
      return "[]";
    }

    const items = data
      .map((item) => {
        const itemYaml = convertToYaml(item, indent + 1);
        if (typeof item === "object" && item !== null) {
          return `${prefix}- ${itemYaml.trimStart()}`;
        }
        return `${prefix}- ${itemYaml}`;
      })
      .join("\n");

    return items;
  }

  if (typeof data === "object") {
    const obj = data as Record<string, unknown>;
    const keys = Object.keys(obj);

    if (keys.length === 0) {
      return "{}";
    }

    const pairs = keys.map((key) => {
      const value = obj[key];
      const valueYaml = convertToYaml(value, indent + 1);

      if (typeof value === "object" && value !== null) {
        if (Array.isArray(value) && value.length === 0) {
          return `${prefix}${key}: []`;
        }
        if (!Array.isArray(value) && Object.keys(value).length === 0) {
          return `${prefix}${key}: {}`;
        }
        return `${prefix}${key}:\n${valueYaml}`;
      }

      return `${prefix}${key}: ${valueYaml}`;
    });

    return pairs.join("\n");
  }

  return String(data);
}

/**
 * 将 JSON 转换为 CSV
 * @param data - JSON 数据
 * @param delimiter - 分隔符
 * @param includeHeader - 是否包含表头
 * @returns CSV 字符串
 */
function convertToCsv(
  data: unknown,
  delimiter: string = ",",
  includeHeader: boolean = true,
): string {
  if (!Array.isArray(data)) {
    throw new Error("CSV 转换需要数组类型的数据");
  }

  if (data.length === 0) {
    return "";
  }

  const firstItem = data[0];
  if (
    typeof firstItem !== "object" ||
    firstItem === null ||
    Array.isArray(firstItem)
  ) {
    throw new Error("CSV 转换需要对象数组类型的数据");
  }

  const obj = firstItem as Record<string, unknown>;
  const headers = Object.keys(obj);

  const rows: string[] = [];

  if (includeHeader) {
    rows.push(headers.map((h) => escapeCsvCell(h, delimiter)).join(delimiter));
  }

  for (const item of data) {
    if (typeof item !== "object" || item === null) {
      continue;
    }

    const row = headers.map((header) => {
      const value = (item as Record<string, unknown>)[header];
      return escapeCsvCell(formatCsvValue(value), delimiter);
    });

    rows.push(row.join(delimiter));
  }

  return rows.join("\n");
}

/**
 * 将 JSON 转换为 SQL INSERT 语句
 * @param data - JSON 数据
 * @param tableName - 表名
 * @returns SQL 字符串
 */
function convertToSql(data: unknown, tableName: string = "json_data"): string {
  if (!Array.isArray(data)) {
    throw new Error("SQL 转换需要数组类型的数据");
  }

  if (data.length === 0) {
    return "";
  }

  const firstItem = data[0];
  if (
    typeof firstItem !== "object" ||
    firstItem === null ||
    Array.isArray(firstItem)
  ) {
    throw new Error("SQL 转换需要对象数组类型的数据");
  }

  const obj = firstItem as Record<string, unknown>;
  const columns = Object.keys(obj)
    .map((col) => `"${col}"`)
    .join(", ");

  const values = data
    .filter(
      (item) =>
        typeof item === "object" && item !== null && !Array.isArray(item),
    )
    .map((item) => {
      const row = Object.values(item as Record<string, unknown>)
        .map((val) => formatSqlValue(val))
        .join(", ");
      return `(${row})`;
    })
    .join("\n");

  if (!values) {
    return "";
  }

  return `INSERT INTO "${tableName}" (${columns}) VALUES\n${values};`;
}

/**
 * 将 JSON 转换为 TOML
 * @param data - JSON 数据
 * @returns TOML 字符串
 */
function convertToToml(data: unknown): string {
  if (typeof data !== "object" || data === null || Array.isArray(data)) {
    throw new Error("TOML 转换需要对象类型的数据");
  }

  return convertValueToToml(data as Record<string, unknown>, 0);
}

/**
 * 递归转换值为 TOML
 */
function convertValueToToml(
  obj: Record<string, unknown>,
  indent: number,
): string {
  const lines: string[] = [];

  const keys = Object.keys(obj);

  for (const key of keys) {
    const value = obj[key];
    const safeKey = /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key) ? key : `"${key}"`;

    if (value === null) {
      lines.push(`${safeKey} = ""`);
      continue;
    }

    if (value === undefined) {
      continue;
    }

    if (typeof value === "boolean") {
      lines.push(`${safeKey} = ${value}`);
      continue;
    }

    if (typeof value === "number") {
      lines.push(`${safeKey} = ${value}`);
      continue;
    }

    if (typeof value === "string") {
      if (value.includes("\n") || value.includes('"')) {
        lines.push(`${safeKey} = """${value}"""`);
      } else {
        lines.push(`${safeKey} = "${value}"`);
      }
      continue;
    }

    if (Array.isArray(value)) {
      if (value.length === 0) {
        lines.push(`${safeKey} = []`);
        continue;
      }

      const firstItem = value[0];
      if (typeof firstItem === "object" && firstItem !== null) {
        lines.push(`[[${safeKey}]]`);
        for (const item of value) {
          if (typeof item === "object" && item !== null) {
            const nested = convertValueToToml(
              item as Record<string, unknown>,
              indent + 1,
            );
            lines.push(nested);
          }
        }
      } else {
        const items = value.map((v) => formatTomlValue(v)).join(", ");
        lines.push(`${safeKey} = [${items}]`);
      }
      continue;
    }

    if (typeof value === "object") {
      lines.push(`[${safeKey}]`);
      const nested = convertValueToToml(
        value as Record<string, unknown>,
        indent + 1,
      );
      lines.push(nested);
      continue;
    }
  }

  return lines.join("\n");
}

/**
 * 转义 XML 特殊字符
 */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * 清理 XML 标签名称
 */
function sanitizeXmlTagName(name: string): string {
  const cleaned = name.replace(/[^a-zA-Z0-9_-]/g, "_");
  if (/^[0-9]/.test(cleaned)) {
    return `_${cleaned}`;
  }
  return cleaned || "item";
}

/**
 * 转义 YAML 字符串
 */
function escapeYamlString(str: string): string {
  return str.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n");
}

/**
 * 格式化 CSV 单元格值
 */
function formatCsvValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }
  if (typeof value === "object") {
    return JSON.stringify(value);
  }
  return String(value);
}

/**
 * 转义 CSV 单元格
 */
function escapeCsvCell(value: string, delimiter: string): string {
  if (
    value.includes(delimiter) ||
    value.includes('"') ||
    value.includes("\n")
  ) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * 格式化 SQL 值
 */
function formatSqlValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "NULL";
  }

  if (typeof value === "boolean") {
    return value ? "TRUE" : "FALSE";
  }

  if (typeof value === "number") {
    return String(value);
  }

  if (typeof value === "string") {
    return `'${value.replace(/'/g, "''")}'`;
  }

  if (typeof value === "object") {
    return `'${JSON.stringify(value).replace(/'/g, "''")}'`;
  }

  return "NULL";
}

/**
 * 格式化 TOML 值
 */
function formatTomlValue(value: unknown): string {
  if (value === null) {
    return '""';
  }
  if (typeof value === "boolean") {
    return String(value);
  }
  if (typeof value === "number") {
    return String(value);
  }
  if (typeof value === "string") {
    if (value.includes("\n") || value.includes('"')) {
      return `"""${value}"""`;
    }
    return `"${value}"`;
  }
  return '""';
}
