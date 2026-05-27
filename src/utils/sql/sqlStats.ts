/**
 * SQL统计工具
 * 提供SQL语句的统计信息计算功能
 */

/**
 * SQL统计信息接口
 */
export interface SqlStats {
  statementCount: number;
  affectedRows: number;
  generationTime: number;
  tableName?: string;
  fieldCount?: number;
}

/**
 * 统计SQL语句数量
 * @param {string} sql - SQL语句
 * @returns {number} 语句数量
 */
export const countSqlStatements = (sql: string): number => {
  if (!sql || !sql.trim()) {
    return 0;
  }
  return sql.split(";").filter((s) => s.trim()).length;
};

/**
 * 提取SQL中的表名
 * @param {string} sql - SQL语句
 * @returns {string | null} 表名
 */
export const extractTableName = (sql: string): string | null => {
  if (!sql) return null;

  const insertMatch = sql.match(/INSERT\s+INTO\s+[`"']?(\w+)[`"']?/i);
  if (insertMatch) {
    return insertMatch[1];
  }

  const updateMatch = sql.match(/UPDATE\s+[`"']?(\w+)[`"']?/i);
  if (updateMatch) {
    return updateMatch[1];
  }

  return null;
};

/**
 * 计算SQL统计信息
 * @param {string} sql - SQL语句
 * @param {number} dataRowCount - 数据行数
 * @param {number} generationTime - 生成时间（毫秒）
 * @returns {SqlStats} 统计信息对象
 */
export const calculateSqlStats = (
  sql: string,
  dataRowCount: number = 0,
  generationTime: number = 0,
): SqlStats => {
  const statementCount = countSqlStatements(sql);
  const tableName = extractTableName(sql);

  return {
    statementCount,
    affectedRows: dataRowCount,
    generationTime,
    tableName,
    fieldCount: 0,
  };
};

/**
 * 获取SQL统计摘要
 * @param {SqlStats} stats - 统计信息
 * @returns {string} 摘要字符串
 */
export const getSqlStatsSummary = (stats: SqlStats): string => {
  const parts: string[] = [];

  if (stats.statementCount > 0) {
    parts.push(`${stats.statementCount} 条语句`);
  }

  if (stats.affectedRows > 0) {
    parts.push(`影响 ${stats.affectedRows} 行`);
  }

  if (stats.generationTime > 0) {
    parts.push(`耗时 ${stats.generationTime}ms`);
  }

  return parts.join(" | ");
};

/**
 * 格式化SQL大小
 * @param {string} sql - SQL语句
 * @returns {{ bytes: number; kb: string }} 大小信息
 */
export const formatSqlSize = (sql: string): { bytes: number; kb: string } => {
  const bytes = new Blob([sql]).size;
  const kb = (bytes / 1024).toFixed(2);
  return { bytes, kb: `${kb} KB` };
};
