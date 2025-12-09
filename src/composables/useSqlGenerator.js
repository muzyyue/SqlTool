// 由于node-sql-parser是CommonJS模块，需要使用默认导入方式
import ParserModule from 'node-sql-parser'
const { Parser } = ParserModule

export function useSqlGenerator() {
  const escapeSqlString = (value) => {
    if (value === null || value === undefined) return ''

    const str = String(value)
    // 将单引号替换为两个单引号进行SQL转义
    return str.replace(/'/g, "''")
  }

  // 解析DDL语句获取字段名
  const parseDdlForFields = (ddlStatement) => {
    // 检查输入有效性
    if (!ddlStatement) return []

    try {
      // 正则表达式方法解析达梦数据库DDL
      // 1. 首先提取CREATE TABLE语句中的字段定义部分
      // 使用更可靠的方法处理嵌套括号
      const createTableIndex = ddlStatement.toLowerCase().indexOf('create table')
      if (createTableIndex === -1) {
        return []
      }

      // 找到第一个左括号
      const leftParenIndex = ddlStatement.indexOf('(', createTableIndex)
      if (leftParenIndex === -1) {
        return []
      }

      // 使用计数器跟踪括号嵌套深度，找到匹配的右括号
      let depth = 1
      let rightParenIndex = leftParenIndex + 1
      const length = ddlStatement.length

      while (rightParenIndex < length && depth > 0) {
        const char = ddlStatement[rightParenIndex]
        if (char === '(') {
          depth++
        } else if (char === ')') {
          depth--
        }
        rightParenIndex++
      }

      if (depth !== 0) {
        // 没有找到匹配的右括号
        return []
      }

      // 提取字段定义部分
      const fieldsSection = ddlStatement.substring(leftParenIndex + 1, rightParenIndex - 1)

      // 3. 使用正则表达式匹配字段名
      // 匹配模式："字段名" 数据类型(参数) 其他属性
      // 改进的正则表达式，支持包含括号的数据类型和换行符
      const fieldRegex = /"([^"]+)"\s+\w+(?:\([^)]*\))?/gim
      const fields = []
      let match

      while ((match = fieldRegex.exec(fieldsSection)) !== null) {
        if (match[1]) {
          fields.push(match[1])
        }
      }

      // 去重并返回字段名数组
      return [...new Set(fields)]
    } catch (error) {
      console.error('DDL解析错误:', error)
      return []
    }
  }

  const generateInsertSql = (
    tableName,
    headers,
    rows,
    primaryKeyField = '',
    dynamicFields = [],
    filteredFields = [],
  ) => {
    if (!tableName || !headers || !rows || rows.length === 0) {
      return ''
    }

    // 合并原始表头和动态字段
    const allHeaders = [...headers]
    const validDynamicFields = dynamicFields.filter((field) => field.name.trim() !== '')

    validDynamicFields.forEach((field) => {
      if (!allHeaders.includes(field.name)) {
        allHeaders.push(field.name)
      }
    })

    // 过滤掉不需要的字段
    const filteredHeaders = allHeaders.filter((header) => !filteredFields.includes(header))
    const validDynamicFieldsFiltered = validDynamicFields.filter(
      (field) => !filteredFields.includes(field.name),
    )

    // 构建字段列表部分
    const fields = filteredHeaders.map((header) => `${header}`).join(', ')

    // 查找主键字段的索引（在过滤后的表头中）
    const primaryKeyIndex = primaryKeyField ? filteredHeaders.indexOf(primaryKeyField) : -1

    // 构建值列表部分
    let allValues = []

    // 为数字递增字段准备计数器
    const incrementCounters = {}
    validDynamicFields.forEach((field) => {
      if (field.type === 'increment') {
        incrementCounters[field.name] = field.startNum || 1
      }
    })

    rows.forEach((row) => {
      // 确保row是一个数组且长度与原始headers匹配
      if (!Array.isArray(row) || row.length !== headers.length) {
        console.error('Row does not match headers:', row)
        return
      }

      // 处理一行数据，合并原始行数据和动态字段值，并应用过滤
      const processRow = (originalRow) => {
        // 首先创建包含所有字段的完整行
        const fullRow = [...originalRow]

        // 添加动态字段的值
        validDynamicFields.forEach((field) => {
          let fieldValue
          let isFunction = false
          let addQuotes = field.addQuotes !== false // 默认添加单引号

          // 根据字段类型处理值
          if (field.type === 'increment') {
            // 数字递增类型
            fieldValue = incrementCounters[field.name]
            incrementCounters[field.name]++
            // 允许用户选择是否添加单引号，使用field.addQuotes配置（默认为true）
            addQuotes = field.addQuotes !== false
          } else if (field.function) {
            // 数据库函数
            fieldValue = field.function
            isFunction = true
            addQuotes = false // 函数不添加单引号
          } else {
            // 普通值
            fieldValue = field.value !== undefined ? field.value : ''
          }

          // 将值添加到行数据中，并标记相关属性
          fullRow.push({
            value: fieldValue,
            isFunction: isFunction,
            addQuotes: addQuotes,
          })
        })

        // 然后根据过滤后的表头提取需要的字段值
        const filteredRow = filteredHeaders.map((header) => {
          const index = allHeaders.indexOf(header)
          if (index >= 0) {
            const value = fullRow[index]
            // 如果是普通值（不是动态字段），转换为标准格式
            if (
              typeof value === 'string' ||
              typeof value === 'number' ||
              value === null ||
              value === undefined
            ) {
              return {
                value: value,
                isFunction: false,
                addQuotes: true, // 默认添加单引号
              }
            }
            return value
          }
          return {
            value: '',
            isFunction: false,
            addQuotes: true,
          }
        })

        return filteredRow
      }

      // 正常生成一行记录
      const processedRow = processRow(row)
      const rowValues = processedRow
        .map((cell) => {
          if (cell.isFunction) {
            // 数据库函数不需要引号包裹
            return cell.value
          } else {
            // 根据addQuotes属性决定是否添加单引号
            if (cell.addQuotes) {
              return `'${escapeSqlString(cell.value)}'`
            } else {
              // 数字或其他不需要引号的值
              return cell.value === null || cell.value === undefined || cell.value === ''
                ? 'NULL'
                : String(cell.value)
            }
          }
        })
        .join(', ')
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

  const generateUpdateSql = (
    tableName,
    headers,
    rows,
    primaryKeyFields = [],
    dynamicFields = [],
    filteredFields = [],
    updateFields = [],
  ) => {
    if (!tableName || !headers || !rows || rows.length === 0) {
      return ''
    }

    // 合并原始表头和动态字段
    const allHeaders = [...headers]
    const validDynamicFields = dynamicFields.filter((field) => field.name.trim() !== '')

    validDynamicFields.forEach((field) => {
      if (!allHeaders.includes(field.name)) {
        allHeaders.push(field.name)
      }
    })

    // 过滤掉不需要的字段
    const filteredHeaders = allHeaders.filter((header) => !filteredFields.includes(header))
    const validDynamicFieldsFiltered = validDynamicFields.filter(
      (field) => !filteredFields.includes(field.name),
    )

    // 为数字递增字段准备计数器
    const incrementCounters = {}
    validDynamicFields.forEach((field) => {
      if (field.type === 'increment') {
        incrementCounters[field.name] = field.startNum || 1
      }
    })

    // 存储所有生成的UPDATE语句
    let updateStatements = []

    rows.forEach((row) => {
      // 确保row是一个数组且长度与原始headers匹配
      if (!Array.isArray(row) || row.length !== headers.length) {
        console.error('Row does not match headers:', row)
        return
      }

      // 处理一行数据，合并原始行数据和动态字段值，并应用过滤
      const processRow = (originalRow) => {
        // 首先创建包含所有字段的完整行
        const fullRow = [...originalRow]

        // 添加动态字段的值
        validDynamicFields.forEach((field) => {
          let fieldValue
          let isFunction = false
          let addQuotes = field.addQuotes !== false // 默认添加单引号

          // 根据字段类型处理值
          if (field.type === 'increment') {
            // 数字递增类型
            fieldValue = incrementCounters[field.name]
            incrementCounters[field.name]++
            addQuotes = field.addQuotes !== false
          } else if (field.function) {
            // 数据库函数
            fieldValue = field.function
            isFunction = true
            addQuotes = false // 函数不添加单引号
          } else {
            // 普通值
            fieldValue = field.value !== undefined ? field.value : ''
          }

          // 将值添加到行数据中，并标记相关属性
          fullRow.push({
            value: fieldValue,
            isFunction: isFunction,
            addQuotes: addQuotes,
          })
        })

        // 然后根据过滤后的表头提取需要的字段值
        const filteredRow = {}
        filteredHeaders.forEach((header) => {
          const index = allHeaders.indexOf(header)
          if (index >= 0) {
            const value = fullRow[index]
            // 如果是普通值（不是动态字段），转换为标准格式
            if (
              typeof value === 'string' ||
              typeof value === 'number' ||
              value === null ||
              value === undefined
            ) {
              filteredRow[header] = {
                value: value,
                isFunction: false,
                addQuotes: true, // 默认添加单引号
              }
            } else {
              filteredRow[header] = value
            }
          } else {
            filteredRow[header] = {
              value: '',
              isFunction: false,
              addQuotes: true,
            }
          }
        })

        return filteredRow
      }

      // 处理当前行
      const processedRow = processRow(row)

      const validPrimaryKeys = primaryKeyFields.filter((field) => {
        return (
          processedRow[field] &&
          processedRow[field].value !== null &&
          processedRow[field].value !== undefined &&
          processedRow[field].value !== ''
        )
      })

      if (validPrimaryKeys.length === 0) {
        // 没有有效的主键字段，跳过此行
        return
      }

      // 构建SET子句
      let setClauses = []
      let whereClauses = []

      // 添加设置字段和条件字段
      Object.keys(processedRow).forEach((field) => {
        const cell = processedRow[field]
        let formattedValue

        if (cell.isFunction) {
          // 数据库函数不需要引号包裹
          formattedValue = cell.value
        } else {
          // 根据addQuotes属性决定是否添加单引号
          if (cell.addQuotes) {
            formattedValue = `'${escapeSqlString(cell.value)}'`
          } else {
            // 数字或其他不需要引号的值
            formattedValue =
              cell.value === null || cell.value === undefined || cell.value === ''
                ? 'NULL'
                : String(cell.value)
          }
        }

        // 判断是否为主键字段，作为WHERE条件
        if (primaryKeyFields.includes(field)) {
          whereClauses.push(`${field} = ${formattedValue}`)
        }
        // 如果指定了要更新的字段列表，则只更新列表中的字段
        else if (updateFields.length === 0 || updateFields.includes(field)) {
          setClauses.push(`${field} = ${formattedValue}`)
        }
      })

      // 如果没有要更新的字段，跳过此行
      if (setClauses.length === 0) {
        return
      }

      // 构建UPDATE语句
      const setClause = setClauses.join(', ')
      const whereClause = whereClauses.join(' AND ')

      const updateStatement = `UPDATE ${tableName} SET ${setClause} WHERE ${whereClause};`
      updateStatements.push(updateStatement)
    })

    if (updateStatements.length === 0) {
      return ''
    }

    // 合并所有UPDATE语句
    return updateStatements.join('\n\n')
  }

  return { generateInsertSql, generateUpdateSql, parseDdlForFields }
}
