/**
 * 批量导入解析模块
 * 支持 Excel、CSV、JSON 格式的批量导入
 */

import { read, utils } from 'xlsx'

/**
 * 导入规则类型定义
 * @typedef {Object} ImportRule
 * @property {string} id - 规则唯一标识
 * @property {string} fieldName - 字段名
 * @property {string} newValue - 新值
 * @property {Object} condition - 条件配置
 * @property {boolean} condition.enabled - 是否启用条件
 * @property {string} condition.fieldName - 条件字段
 * @property {string} condition.operator - 操作符
 * @property {string} condition.value - 条件值
 * @property {string} [description] - 描述
 */

/**
 * 解析结果类型
 * @typedef {Object} ParseResult
 * @property {Array<ImportRule>} rules - 解析后的规则列表
 * @property {Array<ParseError>} errors - 解析错误
 * @property {Array<ParseWarning>} warnings - 解析警告
 */

/**
 * 解析错误类型
 * @typedef {Object} ParseError
 * @property {number} row - 行号
 * @property {string} field - 字段名
 * @property {string} message - 错误信息
 */

/**
 * 解析警告类型
 * @typedef {Object} ParseWarning
 * @property {number} row - 行号
 * @property {string} field - 字段名
 * @property {string} message - 警告信息
 */

/**
 * 支持的文件格式
 */
export const SUPPORTED_FORMATS = {
  excel: ['.xlsx', '.xls'],
  csv: ['.csv'],
  json: ['.json'],
}

/**
 * 获取文件扩展名
 * @param {File} file - 文件对象
 * @returns {string} 扩展名（小写，不含点）
 */
export const getFileExtension = (file) => {
  const parts = file.name.split('.')
  return parts.length > 1 ? parts.pop().toLowerCase() : ''
}

/**
 * 校验文件格式
 * @param {File} file - 文件对象
 * @param {Array<string>} allowedFormats - 允许的格式列表
 * @returns {{ valid: boolean, error?: string }}
 */
export const validateFileFormat = (file, allowedFormats = ['xlsx', 'xls', 'csv', 'json']) => {
  const ext = getFileExtension(file)
  if (!allowedFormats.includes(ext)) {
    return {
      valid: false,
      error: `不支持的文件格式: .${ext}，支持的格式: ${allowedFormats.map((f) => '.' + f).join(', ')}`,
    }
  }
  return { valid: true }
}

/**
 * 解析 Excel/CSV 文件
 * @param {File} file - 文件对象
 * @returns {Promise<ParseResult>}
 */
export const parseExcelOrCsvFile = async (file) => {
  const result = {
    rules: [],
    errors: [],
    warnings: [],
  }

  try {
    const buffer = await file.arrayBuffer()
    const workbook = read(buffer, { type: 'array' })

    const firstSheetName = workbook.SheetNames[0]
    if (!firstSheetName) {
      result.errors.push({
        row: 0,
        field: 'file',
        message: 'Excel 文件中没有工作表',
      })
      return result
    }

    const worksheet = workbook.Sheets[firstSheetName]
    const jsonData = utils.sheet_to_json(worksheet, { header: 1, defval: '' })

    if (jsonData.length < 2) {
      result.errors.push({
        row: 0,
        field: 'file',
        message: 'Excel 文件中没有数据（至少需要表头和一行数据）',
      })
      return result
    }

    const headers = jsonData[0].map((h) => String(h).trim())
    const headerMap = normalizeHeaders(headers)

    for (let rowIndex = 1; rowIndex < jsonData.length; rowIndex++) {
      const row = jsonData[rowIndex]
      if (!row || row.every((cell) => !cell)) {
        continue
      }

      try {
        const rule = parseRow(row, headerMap, rowIndex)
        if (rule) {
          result.rules.push(rule)
        }
      } catch (error) {
        result.errors.push({
          row: rowIndex + 1,
          field: 'row',
          message: `解析行 ${rowIndex + 1} 失败: ${error.message}`,
        })
      }
    }
  } catch (error) {
    result.errors.push({
      row: 0,
      field: 'file',
      message: `读取文件失败: ${error.message}`,
    })
  }

  return result
}

/**
 * 标准化表头映射
 * 支持多种表头命名方式
 * @param {Array<string>} headers - 原始表头
 * @returns {Object} 表头映射
 */
const normalizeHeaders = (headers) => {
  const mapping = {
    fieldName: null,
    newValue: null,
    conditionField: null,
    conditionOperator: null,
    conditionValue: null,
    description: null,
  }

  const headerPatterns = {
    fieldName: ['字段名', 'field_name', 'fieldname', 'field', '列名', 'column'],
    newValue: ['新值', 'new_value', 'newvalue', 'new value', '值', 'value', '修改值'],
    conditionField: ['条件字段', 'condition_field', 'conditionfield', 'condition field', '条件列'],
    conditionOperator: ['操作符', 'operator', '条件操作符'],
    conditionValue: ['条件值', 'condition_value', 'conditionvalue', 'condition value'],
    description: ['描述', 'description', 'remark', 'note', '说明'],
  }

  headers.forEach((header, index) => {
    const normalizedHeader = header.toLowerCase().replace(/[_\s]/g, '')

    for (const [key, patterns] of Object.entries(headerPatterns)) {
      for (const pattern of patterns) {
        const normalizedPattern = pattern.toLowerCase().replace(/[_\s]/g, '')
        if (
          normalizedHeader === normalizedPattern ||
          normalizedHeader.includes(normalizedPattern)
        ) {
          if (!mapping[key]) {
            mapping[key] = index
          }
          break
        }
      }
    }
  })

  return mapping
}

/**
 * 解析单行数据
 * @param {Array} row - 行数据
 * @param {Object} headerMap - 表头映射
 * @param {number} rowIndex - 行索引
 * @returns {ImportRule|null}
 */
const parseRow = (row, headerMap, rowIndex) => {
  const fieldName = getCellValue(row, headerMap.fieldName)
  const newValue = getCellValue(row, headerMap.newValue)

  if (!fieldName) {
    return null
  }

  const conditionEnabled =
    headerMap.conditionField !== null && getCellValue(row, headerMap.conditionField)
  const conditionField = conditionEnabled ? getCellValue(row, headerMap.conditionField) : ''
  const conditionOperator = conditionEnabled
    ? getCellValue(row, headerMap.conditionOperator) || '='
    : '='
  const conditionValue = conditionEnabled ? getCellValue(row, headerMap.conditionValue) : ''

  return {
    id: `import_${Date.now()}_${rowIndex}`,
    fieldName: String(fieldName).trim(),
    newValue: newValue !== undefined ? String(newValue).trim() : '',
    condition: {
      enabled: conditionEnabled && !!conditionField,
      fieldName: conditionEnabled ? String(conditionField).trim() : '',
      operator: conditionOperator || '=',
      value: conditionEnabled ? String(conditionValue).trim() : '',
    },
    description:
      headerMap.description !== null
        ? String(getCellValue(row, headerMap.description) || '').trim()
        : '',
  }
}

/**
 * 获取单元格值
 * @param {Array} row - 行数据
 * @param {number|null} index - 列索引
 * @returns {*}
 */
const getCellValue = (row, index) => {
  if (index === null || index === undefined) return null
  return row[index]
}

/**
 * 解析 JSON 文件
 * @param {File} file - 文件对象
 * @returns {Promise<ParseResult>}
 */
export const parseJsonFile = async (file) => {
  const result = {
    rules: [],
    errors: [],
    warnings: [],
  }

  try {
    const text = await file.text()
    let data

    try {
      data = JSON.parse(text)
    } catch (parseError) {
      result.errors.push({
        row: 0,
        field: 'file',
        message: `JSON 解析失败: ${parseError.message}`,
      })
      return result
    }

    if (Array.isArray(data)) {
      data.forEach((item, index) => {
        try {
          const rule = parseJsonItem(item, index)
          if (rule) {
            result.rules.push(rule)
          }
        } catch (error) {
          result.errors.push({
            row: index + 1,
            field: 'item',
            message: `解析第 ${index + 1} 项失败: ${error.message}`,
          })
        }
      })
    } else if (data.rules && Array.isArray(data.rules)) {
      data.rules.forEach((item, index) => {
        try {
          const rule = parseJsonItem(item, index)
          if (rule) {
            result.rules.push(rule)
          }
        } catch (error) {
          result.errors.push({
            row: index + 1,
            field: 'item',
            message: `解析第 ${index + 1} 项失败: ${error.message}`,
          })
        }
      })
    } else {
      result.errors.push({
        row: 0,
        field: 'file',
        message: 'JSON 数据格式不正确，应为数组或包含 rules 数组的对象',
      })
    }
  } catch (error) {
    result.errors.push({
      row: 0,
      field: 'file',
      message: `读取文件失败: ${error.message}`,
    })
  }

  return result
}

/**
 * 解析 JSON 单项
 * @param {Object} item - JSON 对象
 * @param {number} index - 索引
 * @returns {ImportRule|null}
 */
const parseJsonItem = (item, index) => {
  if (!item || typeof item !== 'object') {
    throw new Error('数据项必须是对象')
  }

  const fieldName = item.fieldName || item.field_name || item.field || item.column
  if (!fieldName) {
    return null
  }

  const newValue = item.newValue || item.new_value || item.value || item.new || ''

  let condition = {
    enabled: false,
    fieldName: '',
    operator: '=',
    value: '',
  }

  if (item.condition) {
    const cond = item.condition
    condition = {
      enabled: true,
      fieldName: cond.fieldName || cond.field || cond.field_name || '',
      operator: cond.operator || cond.op || '=',
      value: cond.value || cond.val || '',
    }

    if (!condition.fieldName) {
      const simpleCondition = item.condition
      if (typeof simpleCondition === 'string') {
        const condMatch = simpleCondition.match(/^([^=!<>]+)(=|!=|<>|>=|<=|>|<)(.+)$/)
        if (condMatch) {
          condition.fieldName = condMatch[1].trim()
          condition.operator = condMatch[2]
          condition.value = condMatch[3].trim()
        }
      }
    }

    if (!condition.fieldName) {
      condition.enabled = false
    }
  }

  return {
    id: `import_${Date.now()}_${index}`,
    fieldName: String(fieldName).trim(),
    newValue: String(newValue).trim(),
    condition,
    description: item.description || item.remark || item.note || '',
  }
}

/**
 * 根据文件类型选择解析方法
 * @param {File} file - 文件对象
 * @returns {Promise<ParseResult>}
 */
export const parseImportFile = async (file) => {
  const ext = getFileExtension(file)

  switch (ext) {
    case 'xlsx':
    case 'xls':
      return await parseExcelOrCsvFile(file)
    case 'csv':
      return await parseExcelOrCsvFile(file)
    case 'json':
      return await parseJsonFile(file)
    default:
      return {
        rules: [],
        errors: [
          {
            row: 0,
            field: 'file',
            message: `不支持的文件格式: .${ext}`,
          },
        ],
        warnings: [],
      }
  }
}

/**
 * 生成导入模板数据
 * @param {Array<string>} ddlFieldNames - DDL 字段名列表
 * @returns {Array<Object>}
 */
export const generateTemplateData = (ddlFieldNames) => {
  return ddlFieldNames.slice(0, 10).map((fieldName, index) => ({
    字段名: fieldName,
    新值: `新值${index + 1}`,
    条件字段: '',
    操作符: '=',
    条件值: '',
    描述: `修改 ${fieldName} 字段`,
  }))
}

/**
 * 下载导入模板 Excel 文件
 * @param {Array<string>} ddlFieldNames - DDL 字段名列表
 * @param {string} filename - 文件名
 */
export const downloadTemplateFile = (ddlFieldNames, filename = 'batch_edit_template.xlsx') => {
  const data = generateTemplateData(ddlFieldNames)
  const worksheet = utils.json_to_sheet(data)
  const workbook = utils.book_new()
  utils.book_append_sheet(workbook, worksheet, '批量修改规则')

  const colWidths = [
    { wch: 15 }, // 字段名
    { wch: 15 }, // 新值
    { wch: 15 }, // 条件字段
    { wch: 10 }, // 操作符
    { wch: 20 }, // 条件值
    { wch: 30 }, // 描述
  ]
  worksheet['!cols'] = colWidths

  const blob = workbook_to_blob(workbook)
  downloadBlob(blob, filename)
}

/**
 * 将 workbook 转换为 blob
 * @param {Object} workbook - xlsx workbook
 * @returns {Blob}
 */
const workbook_to_blob = (workbook) => {
  const wbout = utils.sheet_to_csv(workbook.Sheets[workbook.SheetNames[0]])
  return new Blob([wbout], { type: 'text/csv;charset=utf-8;' })
}

/**
 * 下载 blob 文件
 * @param {Blob} blob - blob 对象
 * @param {string} filename - 文件名
 */
const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export { normalizeHeaders }
