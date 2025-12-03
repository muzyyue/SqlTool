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
    
    // 调试日志已移除
    
    // 构建字段列表部分
    const fields = headers.map(header => `${header}`).join(', ')
    
    // 构建值列表部分
    const values = rows.map(row => {

    console.log('Row:', row);
    
      // 确保row是一个数组且长度与headers匹配
      if (!Array.isArray(row) || row.length !== headers.length) {
        console.error('Row does not match headers:', row)
        return ''
      }
      
      const rowValues = row.map(cell => `'${escapeSqlString(cell)}'`).join(', ')
      return `(${rowValues})`
    }).filter(Boolean).join(',\n')
    
    // 构建完整的INSERT语句
    const sql = `INSERT INTO ${tableName} (${fields}) VALUES
${values};`
    
    return sql
  }
  
  return { generateInsertSql }
}
