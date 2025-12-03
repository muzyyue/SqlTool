export function useSqlGenerator() {
  const escapeSqlString = (value) => {
    if (value === null || value === undefined) return ''
    
    const str = String(value)
    // 将单引号替换为两个单引号进行SQL转义
    return str.replace(/'/g, "''")
  }
  
  const generateInsertSql = (tableName, headers, rows) => {
    if (!tableName || !headers || !rows || rows.length === 0) {
      return ''
    }
    
    // 构建字段列表部分
    const fields = headers.map(header => `[${header}]`).join(', ')
    
    // 构建值列表部分
    const values = rows.map(row => {
      const rowValues = row.map(cell => `'${escapeSqlString(cell)}'`).join(', ')
      return `(${rowValues})`
    }).join(',\n')
    
    // 构建完整的INSERT语句
    const sql = `INSERT INTO [${tableName}] (${fields}) VALUES\n${values};`
    
    return sql
  }
  
  return { generateInsertSql }
}
