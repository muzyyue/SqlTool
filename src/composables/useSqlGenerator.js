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

    // 为数字递增字段准备计数器
    const incrementCounters = {};
    validDynamicFields.forEach(field => {
      if (field.type === 'increment') {
        incrementCounters[field.name] = field.startNum || 1;
      }
    });

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
          let fieldValue;
          let isFunction = false;
          let addQuotes = field.addQuotes !== false; // 默认添加单引号

          // 根据字段类型处理值
          if (field.type === 'increment') {
            // 数字递增类型
            fieldValue = incrementCounters[field.name];
            incrementCounters[field.name]++;
            // 允许用户选择是否添加单引号，使用field.addQuotes配置（默认为true）
            addQuotes = field.addQuotes !== false;
          } else if (field.function) {
            // 数据库函数
            fieldValue = field.function;
            isFunction = true;
            addQuotes = false; // 函数不添加单引号
          } else {
            // 普通值
            fieldValue = field.value !== undefined ? field.value : '';
          }

          // 将值添加到行数据中，并标记相关属性
          fullRow.push({
            value: fieldValue,
            isFunction: isFunction,
            addQuotes: addQuotes
          });
        });

        // 然后根据过滤后的表头提取需要的字段值
        const filteredRow = filteredHeaders.map(header => {
          const index = allHeaders.indexOf(header);
          if (index >= 0) {
            const value = fullRow[index];
            // 如果是普通值（不是动态字段），转换为标准格式
            if (typeof value === 'string' || typeof value === 'number' || value === null || value === undefined) {
              return {
                value: value,
                isFunction: false,
                addQuotes: true // 默认添加单引号
              };
            }
            return value;
          }
          return {
            value: '',
            isFunction: false,
            addQuotes: true
          };
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
              const rowValues = processedRow.map(cell => {
                if (cell.isFunction) {
                  // 数据库函数不需要引号包裹
                  return cell.value;
                } else {
                  // 根据addQuotes属性决定是否添加单引号
                  if (cell.addQuotes) {
                    return `'${escapeSqlString(cell.value)}'`;
                  } else {
                    // 数字或其他不需要引号的值
                    return cell.value === null || cell.value === undefined || cell.value === '' ? 'NULL' : String(cell.value);
                  }
                }
              }).join(', ')
              allValues.push(`(${rowValues})`)
            }
          })
          return
        }
      }

      // 正常生成一行记录
      const processedRow = processRow(row);
      const rowValues = processedRow.map(cell => {
        if (cell.isFunction) {
          // 数据库函数不需要引号包裹
          return cell.value;
        } else {
          // 根据addQuotes属性决定是否添加单引号
          if (cell.addQuotes) {
            return `'${escapeSqlString(cell.value)}'`;
          } else {
            // 数字或其他不需要引号的值
            return cell.value === null || cell.value === undefined || cell.value === '' ? 'NULL' : String(cell.value);
          }
        }
      }).join(', ')
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

  const generateUpdateSql = (tableName, headers, rows, primaryKeyFields = [], multiValueSeparator = ',', dynamicFields = [], filteredFields = [], updateFields = []) => {
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

    // 为数字递增字段准备计数器
    const incrementCounters = {};
    validDynamicFields.forEach(field => {
      if (field.type === 'increment') {
        incrementCounters[field.name] = field.startNum || 1;
      }
    });

    // 存储所有生成的UPDATE语句
    let updateStatements = [];

    rows.forEach(row => {
      // 确保row是一个数组且长度与原始headers匹配
      if (!Array.isArray(row) || row.length !== headers.length) {
        console.error('Row does not match headers:', row);
        return;
      }

      // 处理一行数据，合并原始行数据和动态字段值，并应用过滤
      const processRow = (originalRow) => {
        // 首先创建包含所有字段的完整行
        const fullRow = [...originalRow];

        // 添加动态字段的值
        validDynamicFields.forEach(field => {
          let fieldValue;
          let isFunction = false;
          let addQuotes = field.addQuotes !== false; // 默认添加单引号

          // 根据字段类型处理值
          if (field.type === 'increment') {
            // 数字递增类型
            fieldValue = incrementCounters[field.name];
            incrementCounters[field.name]++;
            addQuotes = field.addQuotes !== false;
          } else if (field.function) {
            // 数据库函数
            fieldValue = field.function;
            isFunction = true;
            addQuotes = false; // 函数不添加单引号
          } else {
            // 普通值
            fieldValue = field.value !== undefined ? field.value : '';
          }

          // 将值添加到行数据中，并标记相关属性
          fullRow.push({
            value: fieldValue,
            isFunction: isFunction,
            addQuotes: addQuotes
          });
        });

        // 然后根据过滤后的表头提取需要的字段值
        const filteredRow = {};
        filteredHeaders.forEach(header => {
          const index = allHeaders.indexOf(header);
          if (index >= 0) {
            const value = fullRow[index];
            // 如果是普通值（不是动态字段），转换为标准格式
            if (typeof value === 'string' || typeof value === 'number' || value === null || value === undefined) {
              filteredRow[header] = {
                value: value,
                isFunction: false,
                addQuotes: true // 默认添加单引号
              };
            } else {
              filteredRow[header] = value;
            }
          } else {
            filteredRow[header] = {
              value: '',
              isFunction: false,
              addQuotes: true
            };
          }
        });

        return filteredRow;
      };

      // 处理当前行
      const processedRow = processRow(row);
      
      // 检查主键字段是否都有值
      const validPrimaryKeys = primaryKeyFields.filter(field => {
        return processedRow[field] && (processedRow[field].value !== null && processedRow[field].value !== undefined && processedRow[field].value !== '');
      });

      if (validPrimaryKeys.length === 0) {
        // 没有有效的主键字段，跳过此行
        return;
      }

      // 构建SET子句
      let setClauses = [];
      let whereClauses = [];

      // 添加设置字段和条件字段
      Object.keys(processedRow).forEach(field => {
        const cell = processedRow[field];
        let formattedValue;
        
        if (cell.isFunction) {
          // 数据库函数不需要引号包裹
          formattedValue = cell.value;
        } else {
          // 根据addQuotes属性决定是否添加单引号
          if (cell.addQuotes) {
            formattedValue = `'${escapeSqlString(cell.value)}'`;
          } else {
            // 数字或其他不需要引号的值
            formattedValue = cell.value === null || cell.value === undefined || cell.value === '' ? 'NULL' : String(cell.value);
          }
        }

        // 判断是否为主键字段，作为WHERE条件
        if (primaryKeyFields.includes(field)) {
          whereClauses.push(`${field} = ${formattedValue}`);
        } 
        // 如果指定了要更新的字段列表，则只更新列表中的字段
        else if (updateFields.length === 0 || updateFields.includes(field)) {
          setClauses.push(`${field} = ${formattedValue}`);
        }
      });

      // 如果没有要更新的字段，跳过此行
      if (setClauses.length === 0) {
        return;
      }

      // 构建UPDATE语句
      const setClause = setClauses.join(', ');
      const whereClause = whereClauses.join(' AND ');
      
      const updateStatement = `UPDATE ${tableName} SET ${setClause} WHERE ${whereClause};`;
      updateStatements.push(updateStatement);
    });

    if (updateStatements.length === 0) {
      return '';
    }

    // 合并所有UPDATE语句
    return updateStatements.join('\n\n');
  }

  return { generateInsertSql, generateUpdateSql }
}
