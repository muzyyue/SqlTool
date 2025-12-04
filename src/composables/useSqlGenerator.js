export function useSqlGenerator() {
  const escapeSqlString = (value) => {
    if (value === null || value === undefined) return ''
    
    const str = String(value)
    // 将单引号替换为两个单引号进行SQL转义
    return str.replace(/'/g, "''")
  }
  
  const generateInsertSql = (tableName, headers, rows, primaryKeyField = '', multiValueSeparator = ',', dynamicFields = [], filteredFields = []) => {
    if (!tableName || !headers || !rows || rows.length === 0) {
      return ''
    }
    
    // 合并原始表头和动态字段
    const allHeaders = [...headers];
    const validDynamicFields = dynamicFields.filter(field => field.name.trim() !== '');
    
    validDynamicFields.forEach(field => {
      if (!allHeaders.includes(field.name)) {
        allHeaders.push(field.name);
      }
    });
    
    // 过滤掉不需要的字段
    const filteredHeaders = allHeaders.filter(header => !filteredFields.includes(header));
    const validDynamicFieldsFiltered = validDynamicFields.filter(field => !filteredFields.includes(field.name));
    
    // 构建字段列表部分
    const fields = filteredHeaders.map(header => `${header}`).join(', ')
    
    // 查找主键字段的索引（在过滤后的表头中）
    const primaryKeyIndex = primaryKeyField ? filteredHeaders.indexOf(primaryKeyField) : -1
    
    // 构建值列表部分
    let allValues = []
    
    rows.forEach(row => {
      // 确保row是一个数组且长度与原始headers匹配
      if (!Array.isArray(row) || row.length !== headers.length) {
        console.error('Row does not match headers:', row)
        return
      }
      
      // 处理一行数据，合并原始行数据和动态字段值，并应用过滤
      const processRow = (originalRow) => {
        // 首先创建包含所有字段的完整行
        const fullRow = [...originalRow];
        
        // 添加动态字段的值
        validDynamicFields.forEach(field => {
          const fieldValue = field.value !== undefined ? field.value : '';
          fullRow.push(fieldValue);
        });
        
        // 然后根据过滤后的表头提取需要的字段值
        const filteredRow = filteredHeaders.map(header => {
          const index = allHeaders.indexOf(header);
          return index >= 0 ? fullRow[index] : '';
        });
        
        return filteredRow;
      };

      // 检查主键字段是否有多个值
      if (primaryKeyIndex !== -1 && row[headers.indexOf(primaryKeyField)]) {
        const primaryKeyValues = String(row[headers.indexOf(primaryKeyField)]).split(multiValueSeparator)
        
        // 如果有多个值，为每个值生成一条记录
        if (primaryKeyValues.length > 1) {
          primaryKeyValues.forEach(value => {
            const trimmedValue = value.trim()
            if (trimmedValue) {
              const newRow = [...row]
              newRow[headers.indexOf(primaryKeyField)] = trimmedValue
              const processedRow = processRow(newRow);
              const rowValues = processedRow.map(cell => `'${escapeSqlString(cell)}'`).join(', ')
              allValues.push(`(${rowValues})`)
            }
          })
          return
        }
      }
      
      // 正常生成一行记录
      const processedRow = processRow(row);
      const rowValues = processedRow.map(cell => `'${escapeSqlString(cell)}'`).join(', ')
      allValues.push(`(${rowValues})`)
    })
    
    if (allValues.length === 0) {
      return ''
    }
    
    // 构建完整的INSERT语句
    const values = allValues.join(',\n')
    const sql = `INSERT INTO ${tableName} (${fields}) VALUES
${values};`
    
    return sql
  }
  
  return { generateInsertSql }
}
