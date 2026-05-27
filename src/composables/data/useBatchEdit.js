/**
 * 批量修改SQL语句的Composable
 * 提供SQL解析、批量修改、条件匹配等功能
 */

import { ref } from "vue";

/**
 * 批量修改规则类型
 * @typedef {Object} BatchEditRule
 * @property {string} id - 规则唯一标识
 * @property {string} fieldName - 要修改的字段名
 * @property {string} newValue - 新值
 * @property {Object} condition - 修改条件
 * @property {boolean} condition.enabled - 是否启用条件
 * @property {string} condition.operator - 条件操作符
 * @property {string} condition.value - 条件值
 */

/**
 * 解析INSERT语句
 * @param {string} sql - INSERT语句
 * @returns {Object|null} 解析结果 { tableName, fields, values }
 */
export const parseInsertSql = (sql) => {
  if (!sql || !sql.trim().toUpperCase().startsWith("INSERT")) {
    return null;
  }

  try {
    const normalizedSql = sql.trim();

    const tableMatch = normalizedSql.match(
      /INSERT\s+INTO\s+([`"']?)(\w+)\1\s*\(/i,
    );
    if (!tableMatch) {
      return null;
    }

    const tableName = tableMatch[2];

    const fieldsMatch = normalizedSql.match(/\((.*?)\)\s*VALUES/i);
    if (!fieldsMatch) {
      return null;
    }

    const fields = fieldsMatch[1]
      .split(",")
      .map((f) => f.trim().replace(/[`'"]/g, ""));

    const valuesPattern = /\((.*?)\)/gs;
    const values = [];
    let match;
    while ((match = valuesPattern.exec(normalizedSql)) !== null) {
      const rowValues = match[1].split(",").map((v) => {
        const trimmed = v.trim();
        if (
          (trimmed.startsWith("'") && trimmed.endsWith("'")) ||
          (trimmed.startsWith('"') && trimmed.endsWith('"'))
        ) {
          return trimmed.slice(1, -1);
        }
        if (trimmed.toUpperCase() === "NULL") {
          return null;
        }
        if (!isNaN(trimmed)) {
          return Number(trimmed);
        }
        return trimmed;
      });
      values.push(rowValues);
    }

    return {
      tableName,
      fields,
      values,
    };
  } catch (error) {
    console.error("解析INSERT语句失败:", error);
    return null;
  }
};

/**
 * 匹配条件
 * @param {string} fieldValue - 字段值
 * @param {string} operator - 操作符
 * @param {string} conditionValue - 条件值
 * @returns {boolean} 是否匹配
 */
const matchCondition = (fieldValue, operator, conditionValue) => {
  try {
    switch (operator) {
      case "=":
        return String(fieldValue) === String(conditionValue);
      case "!=":
        return String(fieldValue) !== String(conditionValue);
      case ">":
        return Number(fieldValue) > Number(conditionValue);
      case "<":
        return Number(fieldValue) < Number(conditionValue);
      case ">=":
        return Number(fieldValue) >= Number(conditionValue);
      case "<=":
        return Number(fieldValue) <= Number(conditionValue);
      case "LIKE": {
        const pattern = conditionValue.replace(/%/g, ".*").replace(/_/g, ".");
        const regex = new RegExp(pattern, "i");
        return regex.test(String(fieldValue));
      }
      case "IN": {
        const values = conditionValue.split(",").map((v) => v.trim());
        return values.includes(String(fieldValue));
      }
      default:
        return false;
    }
  } catch (error) {
    console.error("条件匹配失败:", error);
    return false;
  }
};

/**
 * 生成INSERT语句
 * @param {string} tableName - 表名
 * @param {Array<string>} fields - 字段列表
 * @param {Array<Array>} values - 值列表
 * @returns {string} INSERT语句
 */
const generateInsertSql = (tableName, fields, values) => {
  const fieldsStr = fields.map((f) => `\`${f}\``).join(", ");
  const valuesStr = values
    .map(
      (row) =>
        `(${row
          .map((v) => {
            if (v === null || v === undefined) {
              return "NULL";
            }
            if (typeof v === "string") {
              return `'${v.replace(/'/g, "''")}'`;
            }
            return v;
          })
          .join(", ")})`,
    )
    .join(",\n  ");

  return `INSERT INTO \`${tableName}\` (${fieldsStr})\nVALUES\n  ${valuesStr};`;
};

/**
 * 应用批量修改规则
 * @param {string} sql - 原始SQL语句
 * @param {Array<BatchEditRule>} rules - 修改规则列表
 * @returns {Object} 修改结果 { sql, affectedRows }
 */
export const applyBatchEdit = (sql, rules) => {
  if (!sql || !rules || rules.length === 0) {
    return {
      sql,
      affectedRows: 0,
    };
  }

  const parsed = parseInsertSql(sql);
  if (!parsed) {
    return {
      sql,
      affectedRows: 0,
    };
  }

  const { tableName, fields, values } = parsed;
  let affectedRows = 0;

  const modifiedValues = values.map((row) => {
    let modified = false;
    const newRow = [...row];

    rules.forEach((rule) => {
      if (
        !rule.fieldName ||
        rule.newValue === undefined ||
        rule.newValue === ""
      ) {
        return;
      }

      const fieldIndex = fields.indexOf(rule.fieldName);
      if (fieldIndex === -1) {
        return;
      }

      if (rule.condition.enabled) {
        const conditionFieldIndex = fields.indexOf(rule.condition.fieldName);
        if (conditionFieldIndex === -1) {
          return;
        }

        const conditionFieldValue = row[conditionFieldIndex];
        if (
          !matchCondition(
            conditionFieldValue,
            rule.condition.operator,
            rule.condition.value,
          )
        ) {
          return;
        }
      }

      newRow[fieldIndex] = rule.newValue;
      modified = true;
    });

    if (modified) {
      affectedRows++;
    }

    return newRow;
  });

  const newSql = generateInsertSql(tableName, fields, modifiedValues);

  return {
    sql: newSql,
    affectedRows,
  };
};

/**
 * 使用批量修改功能
 * @returns {Object} 批量修改相关的方法和状态
 */
export function useBatchEdit() {
  const editRules = ref([]);

  const previewResult = ref({
    sql: "",
    affectedRows: 0,
  });

  const addRule = () => {
    const newRule = {
      id: `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      fieldName: "",
      newValue: "",
      condition: {
        enabled: false,
        operator: "=",
        value: "",
      },
    };
    editRules.value.push(newRule);
  };

  const removeRule = (ruleId) => {
    const index = editRules.value.findIndex((rule) => rule.id === ruleId);
    if (index !== -1) {
      editRules.value.splice(index, 1);
    }
  };

  const previewBatchEdit = (sql, rules) => {
    const result = applyBatchEdit(sql, rules);
    previewResult.value = result;
    return result;
  };

  const resetRules = () => {
    editRules.value = [];
    previewResult.value = {
      sql: "",
      affectedRows: 0,
    };
  };

  return {
    editRules,
    previewResult,
    addRule,
    removeRule,
    parseInsertSql,
    applyBatchEdit,
    previewBatchEdit,
    resetRules,
  };
}
