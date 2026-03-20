// node-sql-parser 在浏览器环境中需要使用特定数据库的构建版本
// 使用 mysql 构建版本以避免 Node.js 全局对象依赖问题
let Parser;

/**
 * 初始化 Parser 的异步函数
 * 使用 node-sql-parser/build/mysql 以确保浏览器兼容性
 */
const initParser = async () => {
  if (!Parser) {
    try {
      // 优先使用 MySQL 构建版本（浏览器兼容）
      const parserModule = await import("node-sql-parser/build/mysql");
      Parser =
        parserModule.Parser ||
        parserModule.default?.Parser ||
        parserModule.default;
    } catch (error) {
      console.error("Failed to import node-sql-parser/build/mysql:", error);
      // 回退到通用版本（可能在某些环境下工作）
      try {
        const parserModule = await import("node-sql-parser");
        Parser =
          parserModule.Parser ||
          parserModule.default?.Parser ||
          parserModule.default;
      } catch (fallbackError) {
        console.error("Fallback import also failed:", fallbackError);
      }
    }
  }
};

// 新增注释：该文件用于生成SQL语句，包括INSERT和UPDATE操作

export function useSqlGenerator() {
  const escapeSqlString = (value) => {
    if (value === null || value === undefined) return "";

    const str = String(value);
    // 将单引号替换为两个单引号进行SQL转义
    return str.replace(/'/g, "''");
  };

  // 解析 DDL 语句获取字段名
  const parseDdlForFields = async (ddlStatement) => {
    // 检查输入有效性
    if (
      !ddlStatement ||
      typeof ddlStatement !== "string" ||
      ddlStatement.trim() === ""
    ) {
      console.warn("parseDdlForFields: 输入为空或非字符串，返回空数组");
      return [];
    }

    try {
      // 初始化 Parser
      await initParser();

      // 如果 Parser 初始化成功，使用 node-sql-parser 解析
      if (Parser) {
        try {
          const parser = new Parser();
          const ast = parser.parse(ddlStatement, { database: "MySQL" });

          // 从 AST 中提取字段名
          const fields = [];

          if (ast && ast.ast && ast.ast[0] && ast.ast[0].create_definitions) {
            ast.ast[0].create_definitions.forEach((definition) => {
              if (definition.column && definition.column.column) {
                fields.push(definition.column.column);
              }
            });
          }

          return fields;
        } catch (parseError) {
          console.warn(
            "使用 node-sql-parser 解析失败，回退到正则表达式方法:",
            parseError.message || parseError,
          );
        }
      }

      // 如果 Parser 未初始化或解析失败，使用原来的正则表达式方法
      // 正则表达式方法解析达梦数据库 DDL
      // 1. 首先提取 CREATE TABLE 语句中的字段定义部分
      // 使用更可靠的方法处理嵌套括号
      const createTableIndex = ddlStatement
        .toLowerCase()
        .indexOf("create table");
      if (createTableIndex === -1) {
        console.warn(
          "parseDdlForFields: 未找到 CREATE TABLE 关键字，返回空数组",
        );
        return [];
      }

      // 找到第一个左括号
      const leftParenIndex = ddlStatement.indexOf("(", createTableIndex);
      if (leftParenIndex === -1) {
        console.warn(
          "parseDdlForFields: 未找到字段定义开始的左括号，返回空数组",
        );
        return [];
      }

      // 使用计数器跟踪括号嵌套深度，找到匹配的右括号
      let depth = 1;
      let rightParenIndex = leftParenIndex + 1;
      const length = ddlStatement.length;

      while (rightParenIndex < length && depth > 0) {
        const char = ddlStatement[rightParenIndex];
        if (char === "(") {
          depth++;
        } else if (char === ")") {
          depth--;
        }
        rightParenIndex++;
      }

      if (depth !== 0) {
        // 没有找到匹配的右括号
        console.warn("parseDdlForFields: 括号未正确闭合，返回空数组");
        return [];
      }

      // 提取字段定义部分
      const fieldsSection = ddlStatement.substring(
        leftParenIndex + 1,
        rightParenIndex - 1,
      );

      // 3. 使用正则表达式匹配字段名
      // 匹配模式："字段名" 数据类型 (参数) 其他属性
      // 改进的正则表达式，支持包含括号的数据类型和换行符
      const fieldRegex = /"([^"]+)"\s+\w+(?:\([^)]*\))?/gim;
      const fields = [];
      let match;

      while ((match = fieldRegex.exec(fieldsSection)) !== null) {
        if (match[1]) {
          fields.push(match[1]);
        }
      }

      // 去重并返回字段名数组
      const uniqueFields = [...new Set(fields)];
      console.log(`parseDdlForFields: 成功解析 ${uniqueFields.length} 个字段`);
      return uniqueFields;
    } catch (error) {
      console.error("DDL 解析错误:", error.message || error);
      return [];
    }
  };

  const generateInsertSql = async (ddl, data, tableName) => {
    if (!ddl || !data || !tableName) return "";

    try {
      // 解析表名，处理可能存在的模式名
      const parsedTableName = tableName.includes(".")
        ? tableName.split(".").pop()
        : tableName;

      // 从DDL解析字段
      const fields = await parseDdlForFields(ddl);

      // 构建字段列表字符串
      const fieldList = fields.map((field) => `"${field}"`).join(", ");

      // 为每行数据生成值列表
      const valueRows = data.map((row) => {
        // 对每个字段值进行处理
        const values = fields.map((field) => {
          const value = row[field];

          // 处理NULL值
          if (value === null || value === undefined) {
            return "NULL";
          }

          // 处理数值类型（整数和浮点数）
          if (typeof value === "number") {
            return value.toString();
          }

          // 处理布尔类型
          if (typeof value === "boolean") {
            return value ? "1" : "0";
          }

          // 处理字符串类型 - 进行SQL转义
          return `'${escapeSqlString(value)}'`;
        });

        return `(${values.join(", ")})`;
      });

      // 组合最终的INSERT语句
      return `INSERT INTO ${parsedTableName} (${fieldList}) VALUES ${valueRows.join(", ")};`;
    } catch (error) {
      console.error("INSERT SQL生成错误:", error);
      return "";
    }
  };

  const generateUpdateSql = async (
    ddl,
    data,
    tableName,
    primaryKeyFields = [],
  ) => {
    if (!ddl || !data || !tableName || primaryKeyFields.length === 0) {
      return "";
    }

    try {
      // 从DDL解析字段
      const fields = await parseDdlForFields(ddl);

      // 存储所有生成的UPDATE语句
      let updateStatements = [];

      data.forEach((row) => {
        // 验证主键字段在当前行中是否存在且非空
        const validPrimaryKeys = primaryKeyFields.filter((field) => {
          return (
            row[field] !== null && row[field] !== undefined && row[field] !== ""
          );
        });

        if (validPrimaryKeys.length === 0) {
          // 没有有效的主键字段，跳过此行
          return;
        }

        // 构建SET子句
        let setClauses = [];
        let whereClauses = [];

        // 为每个字段构建SET或WHERE子句
        fields.forEach((field) => {
          // 跳过主键字段，因为它们应该在WHERE子句中
          if (primaryKeyFields.includes(field)) {
            // 主键字段用于WHERE条件
            const value = row[field];

            // 处理不同类型的值
            let formattedValue;
            if (value === null || value === undefined) {
              formattedValue = "NULL";
            } else if (typeof value === "number") {
              formattedValue = value.toString();
            } else if (typeof value === "boolean") {
              formattedValue = value ? "1" : "0";
            } else {
              // 字符串类型需要转义
              formattedValue = `'${escapeSqlString(value)}'`;
            }

            whereClauses.push(`${field} = ${formattedValue}`);
          } else {
            // 非主键字段用于SET子句
            const value = row[field];

            // 处理不同类型的值
            let formattedValue;
            if (value === null || value === undefined) {
              formattedValue = "NULL";
            } else if (typeof value === "number") {
              formattedValue = value.toString();
            } else if (typeof value === "boolean") {
              formattedValue = value ? "1" : "0";
            } else {
              // 字符串类型需要转义
              formattedValue = `'${escapeSqlString(value)}'`;
            }

            setClauses.push(`${field} = ${formattedValue}`);
          }
        });

        // 如果没有要更新的字段，跳过此行
        if (setClauses.length === 0) {
          return;
        }

        // 构建UPDATE语句
        const setClause = setClauses.join(", ");
        const whereClause = whereClauses.join(" AND ");

        const updateStatement = `UPDATE ${tableName} SET ${setClause} WHERE ${whereClause};`;
        updateStatements.push(updateStatement);
      });

      if (updateStatements.length === 0) {
        return "";
      }

      // 合并所有UPDATE语句
      return updateStatements.join("\n\n");
    } catch (error) {
      console.error("UPDATE SQL生成错误:", error);
      return "";
    }
  };

  return { generateInsertSql, generateUpdateSql, parseDdlForFields };
}
