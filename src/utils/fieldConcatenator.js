/**
 * 字段拼接工具
 * 支持多种拼接模式和格式化选项
 */

/**
 * 拼接模式枚举
 */
export const ConcatenationMode = {
  SIMPLE: 'simple',           // 简单拼接
  FORMATTED: 'formatted',     // 格式化拼接
  TEMPLATE: 'template'        // 模板拼接
}

/**
 * 拼接配置
 */
export class ConcatenationConfig {
  constructor(options = {}) {
    this.mode = options.mode || ConcatenationMode.SIMPLE
    this.separator = options.separator || ''
    this.format = options.format || null
    this.template = options.template || null
    this.prefix = options.prefix || ''
    this.suffix = options.suffix || ''
    this.trimValues = options.trimValues !== false // 默认修剪值
    this.ignoreEmpty = options.ignoreEmpty !== false // 默认忽略空值
  }
}

/**
 * 字段拼接器
 */
export class FieldConcatenator {
  /**
   * 构造函数
   * @param {ConcatenationConfig} config - 拼接配置
   */
  constructor(config = new ConcatenationConfig()) {
    this.config = config
  }

  /**
   * 拼接多个字段值
   * @param {Array} values - 字段值数组
   * @returns {string} 拼接结果
   */
  concatenate(values) {
    if (!Array.isArray(values)) {
      throw new Error('values参数必须是数组')
    }

    // 预处理值
    const processedValues = this.preprocessValues(values)
    
    // 根据模式进行拼接
    switch (this.config.mode) {
      case ConcatenationMode.FORMATTED:
        return this.formatConcatenation(processedValues)
      case ConcatenationMode.TEMPLATE:
        return this.templateConcatenation(processedValues)
      case ConcatenationMode.SIMPLE:
      default:
        return this.simpleConcatenation(processedValues)
    }
  }

  /**
   * 预处理字段值
   * @param {Array} values - 原始值数组
   * @returns {Array} 处理后的值数组
   */
  preprocessValues(values) {
    return values
      .map(value => {
        // 转换为字符串
        let strValue = String(value || '')
        
        // 修剪值
        if (this.config.trimValues) {
          strValue = strValue.trim()
        }
        
        return strValue
      })
      .filter(value => {
        // 过滤空值
        if (this.config.ignoreEmpty) {
          return value.length > 0
        }
        return true
      })
  }

  /**
   * 简单拼接
   * @param {Array} values - 处理后的值数组
   * @returns {string} 拼接结果
   */
  simpleConcatenation(values) {
    if (values.length === 0) {
      return ''
    }
    
    let result = values.join(this.config.separator)
    
    // 添加前缀和后缀
    if (this.config.prefix) {
      result = this.config.prefix + result
    }
    if (this.config.suffix) {
      result = result + this.config.suffix
    }
    
    return result
  }

  /**
   * 格式化拼接
   * @param {Array} values - 处理后的值数组
   * @returns {string} 拼接结果
   */
  formatConcatenation(values) {
    if (!this.config.format) {
      return this.simpleConcatenation(values)
    }

    try {
      // 使用格式化模板
      let result = this.config.format
      
      // 替换占位符
      values.forEach((value, index) => {
        const placeholder = `{${index}}`
        result = result.replace(new RegExp(placeholder, 'g'), value)
      })
      
      // 替换通用占位符
      result = result.replace(/{value}/g, values.join(this.config.separator))
      
      return result
    } catch (error) {
      console.error('格式化拼接失败:', error)
      return this.simpleConcatenation(values)
    }
  }

  /**
   * 模板拼接
   * @param {Array} values - 处理后的值数组
   * @returns {string} 拼接结果
   */
  templateConcatenation(values) {
    if (!this.config.template) {
      return this.simpleConcatenation(values)
    }

    try {
      // 使用模板引擎（简化版）
      let result = this.config.template
      
      // 替换索引占位符
      values.forEach((value, index) => {
        const placeholder = `\$\{${index}\}`
        result = result.replace(new RegExp(placeholder, 'g'), value)
      })
      
      // 替换字段名占位符（需要额外的字段名映射）
      if (this.config.fieldMapping) {
        Object.entries(this.config.fieldMapping).forEach(([fieldName, fieldIndex]) => {
          const placeholder = `\$\{${fieldName}\}`
          const value = values[fieldIndex] || ''
          result = result.replace(new RegExp(placeholder, 'g'), value)
        })
      }
      
      return result
    } catch (error) {
      console.error('模板拼接失败:', error)
      return this.simpleConcatenation(values)
    }
  }

  /**
   * 验证配置
   * @returns {Object} 验证结果
   */
  validateConfig() {
    const errors = []
    
    if (this.config.mode === ConcatenationMode.FORMATTED && !this.config.format) {
      errors.push('格式化模式需要提供format参数')
    }
    
    if (this.config.mode === ConcatenationMode.TEMPLATE && !this.config.template) {
      errors.push('模板模式需要提供template参数')
    }
    
    return {
      isValid: errors.length === 0,
      errors
    }
  }

  /**
   * 获取拼接预览
   * @param {Array} sampleValues - 示例值数组
   * @returns {string} 预览结果
   */
  getPreview(sampleValues = null) {
    const values = sampleValues || Array.from({ length: 3 }, (_, i) => `示例值${i + 1}`)
    
    try {
      return this.concatenate(values)
    } catch (error) {
      return `预览失败: ${error.message}`
    }
  }
}

/**
 * 预设拼接模式
 */
export const PresetConcatenations = {
  // 姓名拼接
  FULL_NAME: new ConcatenationConfig({
    mode: ConcatenationMode.FORMATTED,
    format: '{0}{1}{2}',
    separator: '',
    trimValues: true,
    ignoreEmpty: true
  }),

  // 地址拼接
  FULL_ADDRESS: new ConcatenationConfig({
    mode: ConcatenationMode.FORMATTED,
    format: '{0}{1}{2}{3}',
    separator: '',
    trimValues: true,
    ignoreEmpty: true
  }),

  // 日期时间拼接
  DATETIME: new ConcatenationConfig({
    mode: ConcatenationMode.FORMATTED,
    format: '{0}-{1}-{2} {3}:{4}:{5}',
    separator: '-',
    trimValues: true,
    ignoreEmpty: false
  }),

  // 路径拼接
  FILE_PATH: new ConcatenationConfig({
    mode: ConcatenationMode.SIMPLE,
    separator: '/',
    trimValues: true,
    ignoreEmpty: true
  }),

  // 逗号分隔列表
  COMMA_LIST: new ConcatenationConfig({
    mode: ConcatenationMode.SIMPLE,
    separator: ', ',
    trimValues: true,
    ignoreEmpty: true
  })
}

/**
 * 创建拼接器实例的快捷函数
 */
export function createConcatenator(options) {
  return new FieldConcatenator(
    options instanceof ConcatenationConfig ? options : new ConcatenationConfig(options)
  )
}

/**
 * 批量处理数据行的拼接
 * @param {Array} rows - 数据行数组
 * @param {Object} concatenationRules - 拼接规则映射
 * @param {Array} excelHeaders - Excel表头
 * @returns {Array} 处理后的数据行
 */
export function batchConcatenate(rows, concatenationRules, excelHeaders) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return rows
  }

  return rows.map(row => {
    const newRow = { ...row }
    
    Object.entries(concatenationRules).forEach(([targetField, rule]) => {
      if (rule.sourceColumns && Array.isArray(rule.sourceColumns)) {
        // 提取源列值
        const sourceValues = rule.sourceColumns.map(colIndex => {
          const header = excelHeaders[colIndex]
          return row[colIndex] || row[header] || ''
        })
        
        // 创建拼接器
        const concatenator = createConcatenator({
          mode: rule.format ? ConcatenationMode.FORMATTED : ConcatenationMode.SIMPLE,
          separator: rule.separator || '',
          format: rule.format,
          trimValues: true,
          ignoreEmpty: rule.ignoreEmpty !== false
        })
        
        // 执行拼接
        newRow[targetField] = concatenator.concatenate(sourceValues)
      }
    })
    
    return newRow
  })
}

/**
 * 验证拼接规则
 * @param {Object} rule - 拼接规则
 * @param {Array} excelHeaders - Excel表头
 * @returns {Object} 验证结果
 */
export function validateConcatenationRule(rule, excelHeaders) {
  const errors = []
  
  if (!rule.ddlFieldName) {
    errors.push('目标DDL字段名不能为空')
  }
  
  if (!rule.sourceColumns || !Array.isArray(rule.sourceColumns)) {
    errors.push('源列配置必须为数组')
  } else if (rule.sourceColumns.length === 0) {
    errors.push('至少需要配置一个源列')
  } else {
    // 检查列索引有效性
    rule.sourceColumns.forEach(colIndex => {
      if (colIndex < 0 || colIndex >= excelHeaders.length) {
        errors.push(`列索引${colIndex}超出有效范围`)
      }
    })
  }
  
  // 检查分隔符
  if (rule.separator && typeof rule.separator !== 'string') {
    errors.push('分隔符必须是字符串')
  }
  
  // 检查格式化模板
  if (rule.format && typeof rule.format !== 'string') {
    errors.push('格式化模板必须是字符串')
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}