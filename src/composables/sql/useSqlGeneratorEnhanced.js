import { ref, computed } from 'vue'
import { getFunctionInfo } from '@/utils/database/databaseFunctions'

/**
 * 增强版SQL生成器
 * 支持多种数据库语法和高级功能
 */
export function useSqlGeneratorEnhanced() {
  const databaseType = ref('mysql') // mysql, postgresql, sqlserver
  const sqlFormat = ref('formatted') // formatted, minified
  const batchSize = ref(100) // 批量生成大小
  const includeComments = ref(true) // 是否包含注释

  // SQL美化选项
  const beautifyOptions = ref({
    indentSpaces: 4,
    formatStyle: 'expanded', // 'compact' or 'expanded'
    keywordCase: 'upper', // 'upper' or 'preserve'
    maxLineLength: 80,
    alignValues: true,
  })

  /**
   * 生成INSERT语句（自动排除自增主键字段）
   */
  const generateInsertSql = (tableName, fieldMappings, excelData, options = {}) => {
    validateInputs(tableName, fieldMappings, excelData)

    const {
      dbType = databaseType.value,
      format = sqlFormat.value,
      batch = batchSize.value,
      comments = includeComments.value,
      beautifyOptions = {},
      customBindingManager = null,
    } = options

    if (customBindingManager && customBindingManager.resetAutoIncrementCounters) {
      customBindingManager.resetAutoIncrementCounters()
    }

    const sqlStatements = []

    // 添加表头注释
    if (comments) {
      sqlStatements.push(generateHeaderComment(tableName, fieldMappings, dbType))
    }

    // 分批处理数据
    // 如果数据行数小于等于批量大小，生成单个INSERT语句
    if (excelData.length <= batch) {
      const batchSql = generateBatchInsertSql(
        tableName,
        fieldMappings,
        excelData,
        dbType,
        customBindingManager,
      )
      sqlStatements.push(batchSql)
    } else {
      // 否则按原逻辑分批处理
      for (let i = 0; i < excelData.length; i += batch) {
        const batchData = excelData.slice(i, i + batch)
        const batchSql = generateBatchInsertSql(
          tableName,
          fieldMappings,
          batchData,
          dbType,
          customBindingManager,
        )
        sqlStatements.push(batchSql)
      }
    }

    // 格式化输出
    return formatSql(sqlStatements.join('\n\n'), format, beautifyOptions)
  }

  /**
   * 生成UPDATE语句
   */
  const generateUpdateSql = (tableName, fieldMappings, excelData, whereFields, options = {}) => {
    validateInputs(tableName, fieldMappings, excelData)

    const {
      dbType = databaseType.value,
      format = sqlFormat.value,
      comments = includeComments.value,
      beautifyOptions = {},
      updateFields = null,
      customBindingManager = null,
    } = options

    if (customBindingManager && customBindingManager.resetAutoIncrementCounters) {
      customBindingManager.resetAutoIncrementCounters()
    }

    const sqlStatements = []

    // 添加表头注释
    if (comments) {
      sqlStatements.push(generateHeaderComment(tableName, fieldMappings, dbType, 'UPDATE'))
    }

    // 生成每条记录的UPDATE语句
    excelData.forEach((row) => {
      const updateSql = generateSingleUpdateSql(
        tableName,
        fieldMappings,
        row,
        whereFields,
        dbType,
        updateFields,
        customBindingManager,
      )
      if (updateSql) {
        sqlStatements.push(updateSql)
      }
    })

    // 格式化输出
    return formatSql(sqlStatements.join('\n\n'), format, beautifyOptions)
  }

  /**
   * 获取分组字段值
   * @param {Object} row - 数据行
   * @param {string} groupByField - 分组字段名
   * @param {Array} fieldMappings - 字段映射数组
   * @returns {string} 分组字段值
   */
  const getGroupValue = (row, groupByField, fieldMappings) => {
    if (!groupByField) return ''

    const mapping = fieldMappings.find(
      (m) => m.ddlField.name === groupByField || m.excelHeader === groupByField,
    )
    const excelIndex = mapping ? Number(mapping.excelIndex) : NaN
    if (mapping && !isNaN(excelIndex) && excelIndex >= 0) {
      return String(row[excelIndex] || '')
    }
    return ''
  }

  /**
   * 生成系统函数字段的值
   * @param {Object} customField - 自定义字段配置
   * @param {string} dbType - 数据库类型
   * @param {string} fieldName - 字段名（用于日志）
   * @returns {string} 生成的字段值
   */
  const generateSystemFunctionValue = (customField, dbType, fieldName) => {
    const funcName = customField.systemFunctionConfig?.functionName || 'NOW'
    const funcInfo = getFunctionInfo(dbType, funcName)

    if (funcInfo) {
      console.log(`字段 ${fieldName} 使用函数: ${funcInfo.syntax}`)
      return funcInfo.syntax
    } else {
      console.log(`字段 ${fieldName} 使用默认函数: ${funcName}()`)
      return `${funcName}()`
    }
  }

  /**
   * 生成自增字段的值
   * @param {Object} customField - 自定义字段配置
   * @param {Object} row - 数据行
   * @param {Object} customBindingManager - 自定义绑定管理器
   * @param {Object} ddlField - DDL字段对象
   * @param {Array} fieldMappings - 字段映射数组
   * @param {string} dbType - 数据库类型
   * @returns {string} 生成的字段值
   */
  const generateAutoIncrementValue = (
    customField,
    row,
    customBindingManager,
    ddlField,
    fieldMappings,
    dbType,
  ) => {
    if (customBindingManager && customBindingManager.generateAutoIncrementValue) {
      const groupValue = getGroupValue(row, customField.autoIncrementConfig?.groupBy, fieldMappings)
      const autoIncrementValue = customBindingManager.generateAutoIncrementValue(
        ddlField.name,
        customField.autoIncrementConfig || {},
        groupValue,
      )
      console.log(`自增字段 ${ddlField.name} 的值: ${autoIncrementValue}`)
      return formatValue(autoIncrementValue, ddlField.type, dbType)
    } else {
      console.log(`警告: 自增字段 ${ddlField.name} 缺少customBindingManager，返回NULL`)
      return 'NULL'
    }
  }

  /**
   * 生成Excel组合字段的值
   * @param {Object} customField - 自定义字段配置
   * @param {Object} row - 数据行
   * @param {Object} ddlField - DDL字段对象
   * @param {string} dbType - 数据库类型
   * @returns {string} 生成的字段值
   */
  const generateExcelCombineValue = (customField, row, ddlField, dbType) => {
    const combineConfig = customField.excelCombineConfig || {}
    const columnIndices = combineConfig.columns || []
    const separator = combineConfig.separator || ''
    const formatTemplate = combineConfig.format || ''

    const columnValues = columnIndices
      .map((colIndex) => {
        if (colIndex !== undefined && colIndex >= 0 && row[colIndex] !== undefined) {
          return row[colIndex]
        }
        return ''
      })
      .filter((v) => v !== undefined && v !== null && v !== '')

    let combinedValue = columnValues.join(separator)

    if (formatTemplate) {
      combinedValue = formatTemplate.replace(/\{value(\d+)\}/g, (match, num) => {
        const index = parseInt(num, 10) - 1
        return columnValues[index] !== undefined ? columnValues[index] : ''
      })
      combinedValue = combinedValue.replace(/\{value\}/g, columnValues.join(separator))
    }

    console.log(`Excel组合字段 ${ddlField.name} 的值: ${combinedValue}`)
    return formatValue(combinedValue, ddlField.type, dbType)
  }

  /**
   * 生成静态值字段的值
   * @param {Object} customField - 自定义字段配置
   * @param {Object} ddlField - DDL字段对象
   * @param {string} dbType - 数据库类型
   * @returns {string} 生成的字段值
   */
  const generateStaticValue = (customField, ddlField, dbType) => {
    const staticValue = customField.staticValue !== undefined ? customField.staticValue : 'NULL'
    const fieldType = ddlField?.type || 'VARCHAR'
    console.log(`静态值字段 ${ddlField.name} 的值: ${staticValue}`)
    return formatValue(staticValue, fieldType, dbType)
  }

  /**
   * 生成自定义字段的值（统一入口）
   * @param {Object} mapping - 字段映射对象
   * @param {Object} row - Excel数据行
   * @param {string} dbType - 数据库类型
   * @param {Object} customBindingManager - 自定义绑定管理器
   * @param {Array} fieldMappings - 字段映射数组（用于分组字段查找）
   * @returns {string} 生成的字段值
   */
  const generateCustomFieldValue = (mapping, row, dbType, customBindingManager, fieldMappings) => {
    let customField = null

    // 优先使用 mapping.ddlField.customConfig
    if (mapping.ddlField.isCustom && mapping.ddlField.customConfig) {
      customField = mapping.ddlField.customConfig
    } else if (customBindingManager && customBindingManager.customFields) {
      // 如果 mapping 中没有自定义配置，从 customBindingManager 中查找
      customField = customBindingManager.customFields.value.find(
        (field) => field.fieldName === mapping.ddlField.name
      )
    }

    // 如果找到了自定义字段配置，根据数据源类型生成值
    if (customField) {
      console.log(
        `处理自定义字段: ${mapping.ddlField.name}, 数据源类型: ${customField.dataSource}`,
      )

      switch (customField.dataSource) {
        case 'system_function':
          return generateSystemFunctionValue(customField, dbType, mapping.ddlField.name)

        case 'auto_increment':
          return generateAutoIncrementValue(
            customField,
            row,
            customBindingManager,
            mapping.ddlField,
            fieldMappings,
            dbType,
          )

        case 'excel_combine':
          return generateExcelCombineValue(customField, row, mapping.ddlField, dbType)

        case 'static_value':
          return generateStaticValue(customField, mapping.ddlField, dbType)

        default:
          return 'NULL'
      }
    }

    // 如果没有自定义字段配置，使用默认的 UUID 函数
    const funcInfo = getFunctionInfo(dbType, 'UUID')
    if (funcInfo) {
      console.log(`字段 ${mapping.ddlField.name} 使用默认UUID函数: ${funcInfo.syntax}`)
      return funcInfo.syntax
    } else {
      console.log(`字段 ${mapping.ddlField.name} 使用默认UUID()函数`)
      return 'UUID()'
    }
  }

  /**
   * 生成批量INSERT语句（自动排除自增主键字段和主键字段）
   */
  const generateBatchInsertSql = (
    tableName,
    fieldMappings,
    batchData,
    dbType,
    customBindingManager,
  ) => {

    // 过滤掉自增主键字段和主键字段
    // 保留所有其他字段：有映射的普通字段、无映射的普通字段（值为NULL）、有映射或无映射的自定义字段
    // 注意：标记为"函数生成"的主键字段不会被过滤
    // 注意：如果主键字段已映射到Excel列，也会被保留（允许用户手动指定主键值）
    // 注意：自增主键字段会被排除，由数据库自动生成
    // 保存原始顺序用于排序
    const originalOrder = new Map(fieldMappings.map((m, i) => [m.ddlField?.name, i]))

    const mappedFields = fieldMappings
      .filter((mapping) => {
        const excelIndex = Number(mapping.excelIndex)
        const hasValidMapping = !isNaN(excelIndex) && excelIndex >= 0

        if (mapping.generatedByFunction === true) {
          return true
        }
        if (mapping.ddlField.primaryKey && hasValidMapping) {
          return true
        }
        return !mapping.ddlField.isIdentity && !mapping.ddlField.primaryKey
      })
      .sort((a, b) => {
        // 按照 fieldMappings 的原始顺序排序（即 DDL 字段顺序）
        const aOriginalIndex = originalOrder.get(a.ddlField?.name) ?? 999999
        const bOriginalIndex = originalOrder.get(b.ddlField?.name) ?? 999999

        return aOriginalIndex - bOriginalIndex
      })

    if (mappedFields.length === 0) {
      throw new Error('没有有效的字段映射关系（所有字段都是自增主键、主键字段或未映射）')
    }

    // 生成字段名列表，并验证字段名不为空
    const fieldNames = mappedFields.map((mapping) => {
      const fieldName = mapping.customFieldName || mapping.ddlField.name

      // 验证字段名不为空
      if (!fieldName || String(fieldName).trim() === '') {
        throw new Error(`字段名不能为空（DDL字段: ${mapping.ddlField?.name || 'unknown'}）`)
      }

      return escapeFieldName(fieldName, dbType)
    })

    // 验证字段名列表中没有空字符串
    const emptyFieldIndex = fieldNames.findIndex((name) => !name || String(name).trim() === '')
    if (emptyFieldIndex !== -1) {
      throw new Error(`字段名列表中包含空字段名（索引: ${emptyFieldIndex}）`)
    }
    const valuesList = []

    // 处理每行数据
    batchData.forEach((row, rowIndex) => {
      const values = mappedFields.map((mapping) => {
        console.log(
          `处理字段: ${mapping.ddlField.name}, 自定义字段: ${mapping.ddlField.isCustom}, excelHeader: ${mapping.excelHeader}, excelIndex: ${mapping.excelIndex}, generatedByFunction: ${mapping.generatedByFunction}`,
        )

        // 检查是否标记为通过函数生成
        if (mapping.generatedByFunction === true) {
          console.log(`字段 ${mapping.ddlField.name} 标记为函数生成`)
          return generateCustomFieldValue(mapping, row, dbType, customBindingManager, fieldMappings)
        }

        const currentExcelIndex = Number(mapping.excelIndex)
        const hasValidExcelIndex = !isNaN(currentExcelIndex) && currentExcelIndex >= 0

        // 检查是否是自定义字段且没有映射到Excel列
        if (mapping.ddlField.isCustom && (!mapping.excelHeader || !hasValidExcelIndex)) {
          console.log(
            `处理无映射的自定义字段: ${mapping.ddlField.name}`,
          )
          return generateCustomFieldValue(mapping, row, dbType, customBindingManager, fieldMappings)
        }

        if (!mapping.excelHeader || !hasValidExcelIndex) {
          console.log(`字段 ${mapping.ddlField.name} 未映射到Excel列，返回NULL`)
          return 'NULL'
        } else {
          console.log(
            `处理有映射的字段: ${mapping.ddlField.name}, excelIndex: ${currentExcelIndex}, row数据: ${JSON.stringify(row)}`,
          )

          const value = row[currentExcelIndex]
          console.log(`字段 ${mapping.ddlField.name} 的值: ${value}`)

          const formattedValue = formatValue(value, mapping.ddlField.type, dbType)
          console.log(`格式化后的值: ${formattedValue}`)

          return formattedValue
        }
      })
      console.log(`第${rowIndex + 1}行生成的VALUES: (${values.join(', ')})`)
      console.log(`第${rowIndex + 1}行values数组:`, values)
      console.log(`第${rowIndex + 1}行values数组长度: ${values.length}`)

      const validatedValues = values.map((v) => {
        if (v === undefined || v === null || v === '') {
          return 'NULL'
        }
        return v
      })

      console.log(`第${rowIndex + 1}行validatedValues:`, validatedValues)

      const finalValues = validatedValues.map((v) => {
        if (v === 'NULL' || v === null) {
          return 'NULL'
        }
        // 确保返回值不是 undefined
        if (v === undefined) {
          console.warn(`字段返回了undefined，强制转换为NULL`)
          return 'NULL'
        }
        return v
      })

      console.log(`第${rowIndex + 1}行finalValues:`, finalValues)
      console.log(`第${rowIndex + 1}行finalValues包含undefined:`, finalValues.includes(undefined))

      // 检查每个值
      finalValues.forEach((v, idx) => {
        console.log(`  [${idx}] = ${JSON.stringify(v)}, 类型: ${typeof v}`)
      })

      console.log(`第${rowIndex + 1}行finalValues.join(', '):`, finalValues.join(', '))

      valuesList.push(`(${finalValues.join(', ')})`)
    })

    // 确保VALUES子句格式正确，每行单独处理
    const valuesClause =
      valuesList.length > 1 ? `VALUES\n  ${valuesList.join(',\n  ')}` : `VALUES ${valuesList[0]}`

    // 调试日志：输出valuesList和valuesClause
    console.log('=== VALUES子句生成调试 ===')
    console.log('valuesList长度:', valuesList.length)
    console.log('valuesList:', valuesList)
    console.log('valuesList[0]:', valuesList[0])
    console.log('valuesClause:', valuesClause)
    console.log('valuesClause前50字符:', valuesClause.substring(0, 50))
    console.log('=== 结束 ===')

    const finalSql = `INSERT INTO ${escapeFieldName(tableName, dbType)} (${fieldNames.join(', ')})\n${valuesClause};`
    console.log('=== 最终SQL前200字符 ===')
    console.log(finalSql.substring(0, 200))
    console.log('=== 结束 ===')

    return finalSql
  }

  /**
   * 生成单条UPDATE语句（自动排除自增主键字段和主键字段）
   */
  const generateSingleUpdateSql = (
    tableName,
    fieldMappings,
    row,
    whereFields,
    dbType,
    updateFields = null,
    customBindingManager = null,
  ) => {
    console.log('=== generateSingleUpdateSql 调试 ===')
    console.log('tableName:', tableName)
    console.log('whereFields:', whereFields)
    console.log('updateFields:', updateFields)
    console.log('fieldMappings 数量:', fieldMappings.length)
    console.log(
      'fieldMappings:',
      fieldMappings.map((m) => ({ name: m.ddlField?.name, excelIndex: m.excelIndex })),
    )

    const setClauses = []
    const whereClauses = []

    fieldMappings.forEach((mapping) => {
      console.log(
        `处理字段: ${mapping.ddlField?.name}, excelIndex: ${mapping.excelIndex}, isWhereField: ${whereFields?.includes(mapping.ddlField?.name)}`,
      )

      const isWhereField = whereFields && whereFields.includes(mapping.ddlField.name)
      if (
        !isWhereField &&
        !mapping.generatedByFunction &&
        (mapping.ddlField.isIdentity || mapping.ddlField.primaryKey)
      ) {
        console.log(`跳过自增/主键字段: ${mapping.ddlField.name}`)
        return
      }

      if (updateFields && updateFields.length > 0 && !isWhereField) {
        if (!updateFields.includes(mapping.ddlField.name)) {
          console.log(`跳过未选择的字段: ${mapping.ddlField.name}`)
          return
        }
      }

      console.log(`字段 ${mapping.ddlField.name} 将被添加到 SET 或 WHERE 子句`)

      let value
      const fieldName = mapping.customFieldName || mapping.ddlField.name
      const escapedFieldName = escapeFieldName(fieldName, dbType)

      if (mapping.generatedByFunction === true) {
        value = generateCustomFieldValue(mapping, row, dbType, customBindingManager, fieldMappings)
        if (isWhereField) {
          whereClauses.push(`${escapedFieldName} = ${value}`)
        } else {
          setClauses.push(`${escapedFieldName} = ${value}`)
        }
        return
      }

      const currentExcelIndex = Number(mapping.excelIndex)
      const hasValidExcelIndex = !isNaN(currentExcelIndex) && currentExcelIndex >= 0

      if (mapping.ddlField.isCustom && (!mapping.excelHeader || !hasValidExcelIndex)) {
        value = generateCustomFieldValue(mapping, row, dbType, customBindingManager, fieldMappings)
      }

      if (!mapping.excelHeader || !hasValidExcelIndex) {
        const shouldInclude = updateFields && updateFields.includes(mapping.ddlField.name)
        if (!shouldInclude) {
          console.log(`跳过未映射字段: ${mapping.ddlField.name}（不在updateFields中）`)
          return
        }
        console.log(`字段 ${mapping.ddlField.name} 未映射到Excel列，使用NULL值`)
        value = 'NULL'
      } else {
        value = row[currentExcelIndex]
        value = formatValue(value, mapping.ddlField.type, dbType)
      }

      if (isWhereField) {
        whereClauses.push(`${escapedFieldName} = ${value}`)
      } else {
        setClauses.push(`${escapedFieldName} = ${value}`)
      }
    })

    if (setClauses.length === 0) {
      console.warn('没有可更新的字段')
      console.log('setClauses 为空，可能的原因：')
      console.log('- updateFields 为空或未正确传递')
      console.log('- 所有字段都被跳过了（自增/主键/未选择）')
      console.log('- fieldMappings 中的字段状态不正确')
      return null
    }

    if (whereClauses.length === 0) {
      console.warn('没有WHERE条件字段，UPDATE语句可能影响所有记录')
      return null
    }

    console.log('=== 生成UPDATE语句 ===')
    console.log('setClauses:', setClauses)
    console.log('whereClauses:', whereClauses)

    return `UPDATE ${escapeFieldName(tableName, dbType)}\nSET\n  ${setClauses.join(',\n  ')}\nWHERE ${whereClauses.join(' AND ')};`
  }

  /**
   * 验证输入参数
   */
  const validateInputs = (tableName, fieldMappings, excelData) => {
    if (!tableName || typeof tableName !== 'string') {
      throw new Error('表名不能为空且必须是字符串')
    }

    if (!Array.isArray(fieldMappings) || fieldMappings.length === 0) {
      throw new Error('字段映射关系不能为空')
    }

    if (!Array.isArray(excelData) || excelData.length === 0) {
      throw new Error('Excel数据不能为空')
    }

    // 验证表名格式（支持更灵活的表名格式）
    // 允许：字母、数字、下划线、中文字符、点号、连字符、空格、双引号（用于PostgreSQL模式）
    // 禁止：特殊字符和SQL关键字
    const invalidChars = /[<>/\\;'|*?$^[\]{}()+=]/i
    const sqlKeywords = /\b(SELECT|INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|TRUNCATE)\b/i

    // 检查是否包含不允许的特殊字符（排除双引号，因为PostgreSQL支持带引号的表名）
    if (invalidChars.test(tableName)) {
      throw new Error('表名包含不允许的特殊字符')
    }

    if (sqlKeywords.test(tableName)) {
      throw new Error('表名不能是SQL关键字')
    }

    // 检查双引号是否成对出现（PostgreSQL要求引号成对）
    const quoteCount = (tableName.match(/"/g) || []).length
    if (quoteCount > 0 && quoteCount % 2 !== 0) {
      throw new Error('表名中的双引号必须成对出现')
    }

    // 检查表名长度
    if (tableName.trim().length === 0) {
      throw new Error('表名不能为空')
    }

    if (tableName.trim().length > 128) {
      throw new Error('表名长度不能超过128个字符')
    }
  }

  /**
   * 转义字段名（根据数据库类型）
   * @param {string} fieldName - 字段名
   * @param {string} dbType - 数据库类型
   * @returns {string} 转义后的字段名
   */
  const escapeFieldName = (fieldName, dbType) => {
    const name = String(fieldName).trim()

    // 验证字段名不为空
    if (!name) {
      throw new Error('字段名不能为空')
    }

    // 检查字段名是否已经包含引号
    const hasQuotes =
      (name.startsWith('"') && name.endsWith('"')) ||
      (name.startsWith('`') && name.endsWith('`')) ||
      (name.startsWith('[') && name.endsWith(']'))

    // 如果已经包含引号，直接返回原字段名
    if (hasQuotes) {
      return name
    }

    switch (dbType) {
      case 'mysql':
        return `\`${name}\``
      case 'postgresql': {
        // PostgreSQL: 仅对包含特殊字符或关键字的字段名使用双引号
        const needsQuotes =
          /[^a-zA-Z0-9_]/.test(name) ||
          /^(SELECT|INSERT|UPDATE|DELETE|FROM|WHERE|AND|OR|NOT|NULL|TRUE|FALSE)$/i.test(name)
        return needsQuotes ? `"${name}"` : name
      }
      case 'sqlserver':
        return `[${name}]`
      default:
        return name
    }
  }

  /**
   * 格式化值（根据数据类型和数据库类型）
   */
  const formatValue = (value, dataType, dbType) => {
    if (value === null || value === undefined || value === '') {
      return 'NULL'
    }

    // 特殊处理：如果是系统函数调用（如 UUID(), NOW(), SYSDATE），直接返回
    const strValue = String(value).trim()
    // 匹配带括号的函数调用（如 UUID(), NOW()）
    if (/^[A-Z_]+\(\)$/i.test(strValue)) {
      return strValue
    }
    // 匹配不带括号的系统函数（如 Oracle 的 SYSDATE）
    const systemFunctions = ['SYSDATE', 'CURRENT_DATE', 'CURRENT_TIMESTAMP', 'SYSTIMESTAMP']
    if (systemFunctions.includes(strValue.toUpperCase())) {
      return strValue
    }

    // 特殊处理：如果是已经格式化的 NULL 字符串，直接返回
    if (strValue === 'NULL') {
      return 'NULL'
    }

    // 处理数字类型
    if (isNumericType(dataType)) {
      if (strValue === '') return 'NULL'

      const numValue = parseFloat(strValue)
      if (isNaN(numValue)) {
        throw new Error(`数值类型字段的值"${strValue}"不是有效的数字`)
      }
      return strValue
    }

    // 处理布尔类型
    if (isBooleanType(dataType)) {
      const lowerValue = strValue.toLowerCase()
      if (lowerValue === 'true' || lowerValue === '1' || lowerValue === '是') {
        return dbType === 'postgresql' ? 'TRUE' : '1'
      }
      if (lowerValue === 'false' || lowerValue === '0' || lowerValue === '否') {
        return dbType === 'postgresql' ? 'FALSE' : '0'
      }
      throw new Error(`布尔类型字段的值"${strValue}"不是有效的布尔值`)
    }

    // 处理日期时间类型
    if (isDateTimeType(dataType)) {
      if (strValue === '') return 'NULL'

      const date = parseDateTime(strValue)
      if (!date) {
        throw new Error(`日期时间类型字段的值"${strValue}"格式不正确`)
      }

      switch (dbType) {
        case 'mysql':
          return `'${date.toISOString().slice(0, 19).replace('T', ' ')}'`
        case 'postgresql':
          return `'${date.toISOString()}'`
        case 'sqlserver':
          return `'${date.toISOString().slice(0, 23)}'`
        default:
          return `'${date.toISOString()}'`
      }
    }

    // 默认处理字符串类型
    return `'${escapeString(strValue, dbType)}'`
  }

  /**
   * 转义字符串中的特殊字符
   */
  const escapeString = (str, dbType) => {
    let escaped = str

    switch (dbType) {
      case 'mysql':
        escaped = escaped.replace(/'/g, "''")
        break
      case 'postgresql':
        escaped = escaped.replace(/'/g, "''")
        break
      case 'sqlserver':
        escaped = escaped.replace(/'/g, "''")
        break
    }
    return escaped
  }

  /**
   * 判断是否为数值类型
   */
  const isNumericType = (dataType) => {
    // 首先排除明确的字符串类型
    const stringTypes = ['char', 'varchar', 'text', 'string', 'clob', 'blob', 'bytea']
    if (stringTypes.some((type) => dataType.toLowerCase().includes(type))) {
      return false
    }

    const numericTypes = [
      'int',
      'integer',
      'smallint',
      'bigint',
      'tinyint',
      'decimal',
      'numeric',
      'float',
      'double',
      'real',
      'number',
    ]
    return numericTypes.some((type) => dataType.toLowerCase().includes(type))
  }

  /**
   * 判断是否为布尔类型
   */
  const isBooleanType = (dataType) => {
    const booleanTypes = ['bool', 'boolean', 'bit']
    return booleanTypes.some((type) => dataType.toLowerCase().includes(type))
  }

  /**
   * 判断是否为日期时间类型
   */
  const isDateTimeType = (dataType) => {
    const dateTimeTypes = [
      'date',
      'time',
      'datetime',
      'timestamp',
      'year',
      'datetime2',
      'smalldatetime',
    ]
    return dateTimeTypes.some((type) => dataType.toLowerCase().includes(type))
  }

  /**
   * 解析日期时间字符串
   */
  const parseDateTime = (dateTimeStr) => {
    // 直接尝试转换，不使用预设格式
    const date = new Date(dateTimeStr)
    if (!isNaN(date.getTime())) {
      return date
    }
    return null
  }

  /**
   * 生成表头注释
   */
  const generateHeaderComment = (tableName, fieldMappings, dbType, operation = 'INSERT') => {
    const timestamp = new Date().toLocaleString('zh-CN')

    // 过滤掉自增主键字段（与INSERT语句保持一致）
    const filteredMappings = fieldMappings.filter((mapping) => !mapping.ddlField.isIdentity)
    const mappedCount = filteredMappings.filter((m) => m.excelHeader).length
    const totalCount = filteredMappings.length

    let comment = `-- ${operation}语句生成报告\n`
    comment += `-- 生成时间: ${timestamp}\n`
    comment += `-- 目标表: ${tableName}\n`
    comment += `-- 数据库类型: ${dbType.toUpperCase()}\n`
    comment += `-- 字段映射: ${mappedCount}/${totalCount}\n`
    comment += `-- 操作类型: ${operation}\n`
    comment += '--\n'

    // 添加字段映射详情（排除自增字段）
    comment += '-- 字段映射详情:\n'
    filteredMappings.forEach((mapping) => {
      const status = mapping.excelHeader ? '✓' : '✗'
      const excelInfo = mapping.excelHeader ? ` -> "${mapping.excelHeader}"` : ''
      comment += `--   ${status} ${mapping.ddlField.name} (${mapping.ddlField.type})${excelInfo}\n`
    })

    return comment
  }

  /**
   * 高级SQL美化功能
   */
  const beautifySql = (sql, options = {}) => {
    const {
      indentSpaces = 4,
      formatStyle = 'expanded', // 'compact' or 'expanded'
      keywordCase = 'upper', // 'upper' or 'preserve'
      maxLineLength = 80,
      alignValues = true,
    } = options

    let beautified = sql

    // 1. 统一SQL关键字大小写
    if (keywordCase === 'upper') {
      beautified = beautified.replace(
        /\b(SELECT|INSERT|INTO|VALUES|UPDATE|SET|FROM|WHERE|AND|OR|NOT|NULL|TRUE|FALSE|AS|ON|JOIN|LEFT|RIGHT|INNER|OUTER|GROUP BY|ORDER BY|HAVING|LIMIT|OFFSET|DISTINCT)\b/gi,
        (match) => match.toUpperCase(),
      )
    }

    // 2. 智能缩进和换行
    beautified = applySmartFormatting(beautified, indentSpaces, formatStyle, maxLineLength)

    // 3. 垂直对齐VALUES子句（简化版本，避免复杂逻辑）
    if (alignValues && beautified.toUpperCase().includes('VALUES')) {
      beautified = alignValuesClauseSimple(beautified, indentSpaces)
    }

    return beautified
  }

  /**
   * 应用智能格式化
   */
  const applySmartFormatting = (sql, indentSpaces, formatStyle, maxLineLength) => {
    const indent = ' '.repeat(indentSpaces)
    let lines = sql.split('\n')
    let result = []
    let currentIndent = 0

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i]
      const trimmedLine = line.trim()
      if (!trimmedLine) continue

      if (trimmedLine.endsWith('(')) {
        result.push(' '.repeat(currentIndent) + trimmedLine)
        currentIndent += indentSpaces
      } else if (trimmedLine.startsWith(')')) {
        currentIndent = Math.max(0, currentIndent - indentSpaces)
        result.push(' '.repeat(currentIndent) + trimmedLine)
      } else {
        const startsWithComma = trimmedLine.startsWith(',')
        const contentToProcess = startsWithComma ? trimmedLine.substring(1).trim() : trimmedLine

        if (contentToProcess.length > maxLineLength && formatStyle === 'expanded') {
          const splitLine = splitLongLine(contentToProcess, maxLineLength, indent + ' '.repeat(currentIndent))
          if (startsWithComma) {
            splitLine[0] = ' '.repeat(currentIndent) + ',' + splitLine[0].trim()
          }
          result.push(...splitLine)
        } else {
          if (startsWithComma) {
            result.push(' '.repeat(currentIndent) + ', ' + contentToProcess)
          } else {
            result.push(' '.repeat(currentIndent) + trimmedLine)
          }
        }
      }
    }

    return result.join('\n')
  }

  /**
   * 拆分长行（智能分割，保护引号内的内容）
   * 注意：此函数用于拆分单个VALUES组内的多个值，而不是拆分多个VALUES组
   */
  const splitLongLine = (line, maxLineLength, indent) => {
    if (line.length <= maxLineLength) {
      return [indent + line]
    }

    const parts = []
    let currentPart = ''
    let inQuotes = false
    let parenDepth = 0
    let currentToken = ''

    for (let i = 0; i < line.length; i++) {
      const char = line[i]

      if (char === "'" && (i === 0 || line[i - 1] !== '\\')) {
        inQuotes = !inQuotes
        currentToken += char
      } else if (!inQuotes && char === '(') {
        parenDepth++
        currentToken += char
      } else if (!inQuotes && char === ')') {
        parenDepth = Math.max(0, parenDepth - 1)
        currentToken += char
      } else if (!inQuotes && char === ',' && parenDepth === 1) {
        const trimmedToken = currentToken.trim()
        if (currentPart) {
          if (currentPart.length + trimmedToken.length + 2 > maxLineLength) {
            parts.push(indent + currentPart + ',')
            currentPart = trimmedToken
          } else {
            currentPart += ',' + trimmedToken
          }
        } else {
          currentPart = trimmedToken
        }
        currentToken = ''
      } else {
        currentToken += char
      }
    }

    if (currentToken.trim()) {
      const trimmedToken = currentToken.trim()
      if (currentPart) {
        if (currentPart.length + trimmedToken.length + 2 > maxLineLength) {
          parts.push(indent + currentPart + ',')
          parts.push(indent + trimmedToken)
        } else {
          parts.push(indent + currentPart + ',' + trimmedToken)
        }
      } else {
        parts.push(indent + trimmedToken)
      }
    } else if (currentPart) {
      parts.push(indent + currentPart)
    }

    return parts.length > 0 ? parts : [indent + line]
  }

  /**
   * 简化版VALUES子句对齐
   */
  const alignValuesClauseSimple = (sql, indentSpaces) => {
    const lines = sql.split('\n')
    const valuesIndex = lines.findIndex((line) => line.trim().toUpperCase().startsWith('VALUES'))

    if (valuesIndex === -1) return sql

    // 找到VALUES子句开始位置
    let valuesStart = valuesIndex + 1

    // 简化处理：只处理VALUES后面的几行
    const result = []

    // 添加VALUES行之前的内容
    for (let i = 0; i <= valuesIndex; i++) {
      result.push(lines[i])
    }

    // 处理VALUES子句内容
    let inValues = false
    let openParens = 0

    for (let i = valuesStart; i < lines.length; i++) {
      const line = lines[i].trim()

      // 检查是否进入VALUES子句
      if (!inValues && line.includes('(')) {
        inValues = true
        openParens = (line.match(/\(/g) || []).length
      }

      if (inValues) {
        // 更新括号计数
        openParens += (line.match(/\(/g) || []).length
        openParens -= (line.match(/\)/g) || []).length

        // 简单缩进处理
        const indentedLine = ' '.repeat(indentSpaces) + line
        result.push(indentedLine)

        // 检查是否结束VALUES子句
        if (openParens <= 0 && line.includes(')')) {
          inValues = false
        }
      } else {
        result.push(line)
      }
    }

    return result.join('\n')
  }

  /**
   * 格式化SQL语句
   */
  const formatSql = (sql, format, beautifyOptions = {}) => {
    console.log('=== formatSql 调试 ===')
    console.log('输入SQL:', sql)
    console.log('format:', format)

    if (format === 'minified') {
      let minified = sql
        .replace(/\s+/g, ' ')
        .replace(/\s*\(\s*/g, '(')
        .replace(/\s*\)\s*/g, ')')
        .replace(/\s*,\s*/g, ',')
        .replace(/\s*;\s*/g, ';')
        .trim()

      minified = minified.replace(/\),\(/g, '), (')

      minified = minified.replace(/' ([A-Z_]+\(\))/gi, "', $1")

      minified = minified.replace(/([A-Z_]+\(\)) '/gi, "$1, '")

      minified = minified.replace(/(\d) ([A-Z_]+\(\))/gi, "$1, $2")

      minified = minified.replace(/([A-Z_]+\(\)) (\d)/gi, "$1, $2")

      minified = minified.replace(/NULL ([A-Z_]+\(\))/gi, "NULL, $1")

      minified = minified.replace(/([A-Z_]+\(\)) NULL/gi, "$1, NULL")

      console.log('输出SQL:', minified)
      console.log('=== 结束 ===')

      return minified
    }

    // 应用高级美化功能
    if (format === 'formatted') {
      const result = beautifySql(sql, beautifyOptions)
      console.log('美化后SQL:', result)
      console.log('=== 结束 ===')
      return result
    }

    // 基础格式化（兼容旧版本）
    const result = sql
      .replace(/\n\s*\n/g, '\n\n')
      .replace(/\s+/g, ' ')
      .replace(/;\s*/g, ';\n\n')

    console.log('基础格式化SQL:', result)
    console.log('=== 结束 ===')
    return result
  }

  /**
   * 预览SQL语句（语法高亮前的处理）
   */
  const previewSql = (sql) => {
    return {
      raw: sql,
      formatted: formatSql(sql, 'formatted'),
      minified: formatSql(sql, 'minified'),
      lineCount: sql.split('\n').length,
      charCount: sql.length,
    }
  }

  /**
   * 验证SQL语法（基础验证）
   */
  const validateSqlSyntax = (sql) => {
    const errors = []

    // 检查基本语法错误
    if (!sql.trim()) {
      errors.push('SQL语句为空')
      return { isValid: false, errors }
    }

    // 检查分号结尾
    const lines = sql.split('\n')
    let statementCount = 0
    let currentStatement = ''

    lines.forEach((line, lineIndex) => {
      const trimmedLine = line.trim()
      currentStatement += trimmedLine + ' '

      // 检查是否以分号结尾
      if (trimmedLine.endsWith(';')) {
        statementCount++
        const stmt = currentStatement.trim()

        // 检查语句类型
        const upperStmt = stmt.toUpperCase()

        // 检查INSERT语句格式
        if (upperStmt.startsWith('INSERT')) {
          if (!upperStmt.includes('VALUES')) {
            errors.push(`第${statementCount}条INSERT语句（第${lineIndex + 1}行）缺少VALUES关键字`)
          }
        }
        // 检查UPDATE语句格式
        else if (upperStmt.startsWith('UPDATE')) {
          if (!upperStmt.includes('SET')) {
            errors.push(`第${statementCount}条UPDATE语句（第${lineIndex + 1}行）缺少SET关键字`)
          }
          if (!upperStmt.includes('WHERE')) {
            errors.push(`第${statementCount}条UPDATE语句（第${lineIndex + 1}行）缺少WHERE条件`)
          }
        }

        currentStatement = ''
      }
    })

    // 检查是否有未以分号结尾的语句
    if (currentStatement.trim()) {
      errors.push(
        `存在未以分号结尾的语句（共${statementCount + 1}条语句，第${statementCount + 1}条未正确结尾）`,
      )
    }

    // 检查VALUES子句括号闭合
    const valuesRegex = /VALUES\s*\([^)]*\)/g
    const valuesMatches = sql.match(valuesRegex)
    if (valuesMatches) {
      valuesMatches.forEach((match, index) => {
        const openParens = (match.match(/\(/g) || []).length
        const closeParens = (match.match(/\)/g) || []).length
        if (openParens !== closeParens) {
          errors.push(
            `第${index + 1}个VALUES子句括号未正确闭合（开括号: ${openParens}, 闭括号: ${closeParens}）`,
          )
        }
      })
    }

    return {
      isValid: errors.length === 0,
      errors,
    }
  }

  /**
   * 设置数据库类型
   */
  const setDatabaseType = (type) => {
    const supportedTypes = ['mysql', 'postgresql', 'sqlserver']
    if (supportedTypes.includes(type)) {
      databaseType.value = type
    } else {
      throw new Error(`不支持的数据库类型: ${type}`)
    }
  }

  /**
   * 设置SQL格式
   */
  const setSqlFormat = (format) => {
    const supportedFormats = ['formatted', 'minified']
    if (supportedFormats.includes(format)) {
      sqlFormat.value = format
    } else {
      throw new Error(`不支持的SQL格式: ${format}`)
    }
  }

  /**
   * 设置批量大小
   */
  const setBatchSize = (size) => {
    if (size > 0 && size <= 1000) {
      batchSize.value = size
    } else {
      throw new Error('批量大小必须在1-1000之间')
    }
  }

  /**
   * 设置SQL美化选项
   */
  const setBeautifyOptions = (options) => {
    if (typeof options !== 'object') {
      throw new Error('美化选项必须是对象')
    }

    // 验证并更新选项
    if (options.indentSpaces !== undefined) {
      if (options.indentSpaces >= 1 && options.indentSpaces <= 8) {
        beautifyOptions.value.indentSpaces = options.indentSpaces
      } else {
        throw new Error('缩进空格数必须在1-8之间')
      }
    }

    if (options.formatStyle !== undefined) {
      if (['compact', 'expanded'].includes(options.formatStyle)) {
        beautifyOptions.value.formatStyle = options.formatStyle
      } else {
        throw new Error('格式化风格必须是 compact 或 expanded')
      }
    }

    if (options.keywordCase !== undefined) {
      if (['upper', 'preserve'].includes(options.keywordCase)) {
        beautifyOptions.value.keywordCase = options.keywordCase
      } else {
        throw new Error('关键字大小写必须是 upper 或 preserve')
      }
    }

    if (options.maxLineLength !== undefined) {
      if (options.maxLineLength >= 40 && options.maxLineLength <= 200) {
        beautifyOptions.value.maxLineLength = options.maxLineLength
      } else {
        throw new Error('最大行长度必须在40-200之间')
      }
    }

    if (options.alignValues !== undefined) {
      beautifyOptions.value.alignValues = Boolean(options.alignValues)
    }
  }

  /**
   * 重置美化选项为默认值
   */
  const resetBeautifyOptions = () => {
    beautifyOptions.value = {
      indentSpaces: 4,
      formatStyle: 'expanded',
      keywordCase: 'upper',
      maxLineLength: 80,
      alignValues: true,
    }
  }

  return {
    databaseType: computed(() => databaseType.value),
    sqlFormat: computed(() => sqlFormat.value),
    batchSize: computed(() => batchSize.value),
    includeComments: computed(() => includeComments.value),
    beautifyOptions: computed(() => beautifyOptions.value),

    generateInsertSql,
    generateUpdateSql,
    previewSql,
    validateSqlSyntax,
    formatSql,
    beautifySql,

    setDatabaseType,
    setSqlFormat,
    setBatchSize,
    setBeautifyOptions,
    resetBeautifyOptions,
  }
}
