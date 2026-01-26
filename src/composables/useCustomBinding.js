import { ref, computed } from 'vue'

/**
 * 自定义绑定功能管理器（单例模式）
 * 支持手动绑定、字段拼接和自定义字段功能
 */
let customBindingManagerInstance = null

export function useCustomBinding() {
  // 如果实例已存在，直接返回
  if (customBindingManagerInstance) {
    return customBindingManagerInstance
  }

  // 自定义绑定配置
  const customBindings = ref([])

  // 字段拼接规则
  const fieldConcatenationRules = ref([])

  // 自定义字段配置
  const customFields = ref([])

  // 是否启用自定义绑定
  const enableCustomBinding = ref(false)

  // 自增数字计数器
  const autoIncrementCounters = ref({})

  // 系统预设函数列表
  const systemFunctions = [
    { name: 'CURRENT_DATE', description: '当前日期' },
    { name: 'CURRENT_TIME', description: '当前时间' },
    { name: 'CURRENT_TIMESTAMP', description: '当前时间戳' },
    { name: 'UUID', description: '生成唯一标识符' },
    { name: 'RAND', description: '随机数' },
    { name: 'NOW', description: '当前日期时间' },
    { name: 'SYSDATE', description: '系统日期' },
    { name: 'GETDATE', description: '获取当前日期时间' },
  ]

  /**
   * 添加自定义绑定
   * @param {string} ddlFieldName - DDL字段名
   * @param {number} excelIndex - Excel列索引
   * @param {string} bindingType - 绑定类型：single(单列), concatenated(拼接)
   */
  const addCustomBinding = (ddlFieldName, excelIndex, bindingType = 'single') => {
    const existingIndex = customBindings.value.findIndex(
      (binding) => binding.ddlFieldName === ddlFieldName,
    )

    if (existingIndex >= 0) {
      // 更新现有绑定
      customBindings.value[existingIndex] = {
        ...customBindings.value[existingIndex],
        excelIndex,
        bindingType,
        updatedAt: new Date().toISOString(),
      }
    } else {
      // 添加新绑定
      customBindings.value.push({
        id: generateId(),
        ddlFieldName,
        excelIndex,
        bindingType,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
    }
  }

  /**
   * 移除自定义绑定
   * @param {string} ddlFieldName - DDL字段名
   */
  const removeCustomBinding = (ddlFieldName) => {
    const index = customBindings.value.findIndex((binding) => binding.ddlFieldName === ddlFieldName)
    if (index >= 0) {
      customBindings.value.splice(index, 1)
    }
  }

  /**
   * 添加字段拼接规则
   * @param {string} fieldName - 字段名称（可以是DDL字段名或自定义字段名）
   * @param {Array} sourceColumns - 源Excel列索引数组
   * @param {string} separator - 分隔符
   * @param {string} format - 格式化模板
   * @param {string} dataType - 数据类型（string、int、decimal、datetime、boolean）
   */
  const addConcatenationRule = (
    fieldName,
    sourceColumns,
    separator = '',
    format = null,
    dataType = 'string',
  ) => {
    const existingIndex = fieldConcatenationRules.value.findIndex(
      (rule) => rule.ddlFieldName === fieldName,
    )

    if (existingIndex >= 0) {
      // 更新现有规则
      fieldConcatenationRules.value[existingIndex] = {
        ...fieldConcatenationRules.value[existingIndex],
        sourceColumns,
        separator,
        format,
        dataType,
        updatedAt: new Date().toISOString(),
      }
    } else {
      // 添加新规则
      fieldConcatenationRules.value.push({
        id: generateId(),
        ddlFieldName: fieldName,
        sourceColumns,
        separator,
        format,
        dataType,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
    }
  }

  /**
   * 移除字段拼接规则
   * @param {string} fieldName - 字段名称
   */
  const removeConcatenationRule = (fieldName) => {
    const index = fieldConcatenationRules.value.findIndex((rule) => rule.ddlFieldName === fieldName)
    if (index >= 0) {
      fieldConcatenationRules.value.splice(index, 1)
    }
  }

  /**
   * 应用自定义绑定规则到数据行
   * @param {Object} rowData - Excel数据行
   * @returns {Object} 应用自定义绑定后的数据
   */
  const applyCustomBindings = (rowData) => {
    const result = {}

    // 应用字段拼接规则
    fieldConcatenationRules.value.forEach((rule) => {
      const concatenatedValue = rule.sourceColumns
        .map((colIndex) => {
          const value = rowData[colIndex] || ''
          return rule.format ? applyFormat(value, rule.format) : value
        })
        .join(rule.separator)

      result[rule.ddlFieldName] = concatenatedValue
    })

    // 应用单列自定义绑定
    customBindings.value.forEach((binding) => {
      if (binding.bindingType === 'single' && binding.excelIndex >= 0) {
        result[binding.ddlFieldName] = rowData[binding.excelIndex] || null
      }
    })

    return result
  }

  /**
   * 获取字段的绑定配置
   * @param {string} ddlFieldName - DDL字段名
   * @returns {Object} 绑定配置信息
   */
  const getFieldBinding = (ddlFieldName) => {
    const customBinding = customBindings.value.find(
      (binding) => binding.ddlFieldName === ddlFieldName,
    )

    const concatenationRule = fieldConcatenationRules.value.find(
      (rule) => rule.ddlFieldName === ddlFieldName,
    )

    return {
      customBinding,
      concatenationRule,
      hasCustomBinding: !!customBinding || !!concatenationRule,
    }
  }

  /**
   * 验证自定义绑定配置
   */
  const validateBindings = () => {
    const errors = []

    // 确保数据是数组
    const bindings = Array.isArray(customBindings.value) ? customBindings.value : []
    const rules = Array.isArray(fieldConcatenationRules.value) ? fieldConcatenationRules.value : []
    const fields = Array.isArray(customFields.value) ? customFields.value : []

    // 检查重复绑定（单列绑定之间）
    const fieldBindings = new Set()
    bindings.forEach((binding) => {
      if (binding && binding.ddlFieldName) {
        if (fieldBindings.has(binding.ddlFieldName)) {
          errors.push(`字段"${binding.ddlFieldName}"存在重复的自定义绑定`)
        }
        fieldBindings.add(binding.ddlFieldName)
      }
    })

    // 检查字段拼接规则之间的重复
    rules.forEach((rule) => {
      if (rule && rule.ddlFieldName) {
        if (fieldBindings.has(rule.ddlFieldName)) {
          errors.push(`字段"${rule.ddlFieldName}"同时存在单列绑定和拼接规则`)
        }
        fieldBindings.add(rule.ddlFieldName)
      }
    })

    // 注意：不检查 customFields 与 fieldConcatenationRules 的冲突
    // 因为字段拼接规则中的自定义字段名称会同时创建对应的 customField
    // 这种情况下两者的字段名相同是正常行为，不需要报错

    // 检查无效的Excel列索引
    bindings.forEach((binding) => {
      if (binding && typeof binding.excelIndex === 'number' && binding.excelIndex < -1) {
        errors.push(`字段"${binding.ddlFieldName}"的Excel列索引无效`)
      }
    })

    rules.forEach((rule) => {
      if (rule && Array.isArray(rule.sourceColumns)) {
        rule.sourceColumns.forEach((colIndex) => {
          if (typeof colIndex === 'number' && colIndex < 0) {
            errors.push(`字段"${rule.ddlFieldName}"的拼接源列索引无效`)
          }
        })
      }
    })

    fields.forEach((field) => {
      if (
        field &&
        field.dataSource === 'excel_combine' &&
        Array.isArray(field.excelCombineConfig?.columns)
      ) {
        field.excelCombineConfig.columns.forEach((colIndex) => {
          if (typeof colIndex === 'number' && colIndex < 0) {
            errors.push(`自定义字段"${field.fieldName}"的组合列索引无效`)
          }
        })
      }

      if (field && field.dataSource === 'auto_increment') {
        const config = field.autoIncrementConfig || {}
        if (typeof config.start !== 'number' || isNaN(config.start)) {
          errors.push(`自定义字段"${field.fieldName}"的自增起始值无效`)
        }
        if (typeof config.step !== 'number' || isNaN(config.step) || config.step <= 0) {
          errors.push(`自定义字段"${field.fieldName}"的自增步长无效`)
        }
      }
    })

    return {
      isValid: errors.length === 0,
      errors,
    }
  }

  /**
   * 导出绑定配置
   */
  const exportBindings = () => {
    return {
      customBindings: customBindings.value,
      fieldConcatenationRules: fieldConcatenationRules.value,
      customFields: customFields.value,
      exportTime: new Date().toISOString(),
    }
  }

  /**
   * 导入绑定配置
   */
  const importBindings = (config) => {
    if (config.customBindings) {
      // 确保customBindings始终是数组
      customBindings.value = Array.isArray(config.customBindings) ? config.customBindings : []
    }
    if (config.fieldConcatenationRules) {
      // 确保fieldConcatenationRules始终是数组
      fieldConcatenationRules.value = Array.isArray(config.fieldConcatenationRules)
        ? config.fieldConcatenationRules
        : []
    }
    if (config.customFields) {
      const fields = Array.isArray(config.customFields) ? config.customFields : []
      // 更新或添加字段
      const existingFieldMap = new Map()
      customFields.value.forEach((field) => {
        existingFieldMap.set(field.fieldName, field)
      })

      fields.forEach((field) => {
        if (existingFieldMap.has(field.fieldName)) {
          const existingIndex = customFields.value.findIndex((f) => f.fieldName === field.fieldName)
          if (existingIndex >= 0) {
            customFields.value[existingIndex] = {
              ...customFields.value[existingIndex],
              ...field,
              updatedAt: new Date().toISOString(),
            }
          }
        } else {
          customFields.value.push(field)
        }
      })
      // 重置自增计数器
      fields.forEach((field) => {
        if (field.dataSource === 'auto_increment') {
          autoIncrementCounters.value[field.fieldName] = {
            current: field.autoIncrementConfig?.start || 0,
          }
        }
      })
    }
  }

  /**
   * 重置所有绑定配置
   */
  const resetBindings = () => {
    customBindings.value = []
    fieldConcatenationRules.value = []
    customFields.value = []
    autoIncrementCounters.value = {}
  }

  /**
   * 获取绑定统计信息
   * @returns {Object} 统计信息（包含计算属性）
   */
  const getBindingStats = () => {
    return {
      customBindings: customBindingCount.value,
      concatenationRules: concatenationRuleCount.value,
      customFields: customFieldCount.value,
      hasCustomConfig: totalCustomBindings.value > 0,
    }
  }

  /**
   * 检查字段名是否唯一
   * @param {string} fieldName - 待检查的字段名
   * @param {Array} fieldMappings - 字段映射配置数组
   * @param {Array} parsedFields - DDL 解析后的字段数组
   * @param {Array} customFields - 自定义字段数组
   * @param {string} excludeFieldName - 排除的字段名（编辑时使用）
   * @returns {boolean} - 字段名是否唯一
   */
  const isFieldNameUnique = (
    fieldName,
    fieldMappings = [],
    parsedFields = [],
    customFields = [],
    excludeFieldName = null,
  ) => {
    if (!fieldName || typeof fieldName !== 'string' || fieldName.trim() === '') {
      return false
    }

    const normalizedFieldName = fieldName.trim().toLowerCase()

    const customFieldsData = Array.isArray(customFields) ? customFields : []
    const fieldMappingsData = Array.isArray(fieldMappings) ? fieldMappings : []
    const parsedFieldsData = Array.isArray(parsedFields) ? parsedFields : []

    for (const field of customFieldsData) {
      if (
        field &&
        field.fieldName &&
        field.fieldName.trim().toLowerCase() === normalizedFieldName
      ) {
        if (excludeFieldName && field.fieldName === excludeFieldName) {
          continue
        }
        return false
      }
    }

    for (const mapping of fieldMappingsData) {
      if (
        mapping &&
        mapping.ddlFieldName &&
        mapping.ddlFieldName.trim().toLowerCase() === normalizedFieldName
      ) {
        if (excludeFieldName && mapping.ddlFieldName === excludeFieldName) {
          continue
        }
        return false
      }
    }

    for (const field of parsedFieldsData) {
      if (field && field.name && field.name.trim().toLowerCase() === normalizedFieldName) {
        if (excludeFieldName && field.name === excludeFieldName) {
          continue
        }
        return false
      }
    }

    return true
  }

  /**
   * 添加自定义字段
   * @param {Object} fieldConfig - 自定义字段配置
   */
  const addCustomField = (fieldConfig) => {
    const existingIndex = customFields.value.findIndex(
      (field) => field.fieldName === fieldConfig.fieldName,
    )

    if (existingIndex >= 0) {
      // 更新现有字段
      customFields.value[existingIndex] = {
        ...customFields.value[existingIndex],
        ...fieldConfig,
        updatedAt: new Date().toISOString(),
      }
    } else {
      // 添加新字段
      customFields.value.push({
        id: generateId(),
        ...fieldConfig,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
    }

    // 重置自增计数器
    if (fieldConfig.dataSource === 'auto_increment') {
      autoIncrementCounters.value[fieldConfig.fieldName] = {
        current: fieldConfig.autoIncrementConfig?.start || 0,
      }
    }
  }

  /**
   * 移除自定义字段
   * @param {string} fieldName - 自定义字段名
   */
  const removeCustomField = (fieldName) => {
    const index = customFields.value.findIndex((field) => field.fieldName === fieldName)
    if (index >= 0) {
      customFields.value.splice(index, 1)
      // 移除对应的自增计数器
      delete autoIncrementCounters.value[fieldName]
    }
  }

  /**
   * 获取自定义字段配置
   * @param {string} fieldName - 自定义字段名
   */
  const getCustomField = (fieldName) => {
    return customFields.value.find((field) => field.fieldName === fieldName)
  }

  /**
   * 生成自增数字
   * @param {string} fieldName - 自定义字段名
   * @param {Object} config - 自增配置
   * @param {string} groupValue - 分组字段值，为空则全局递增
   */
  const generateAutoIncrementValue = (fieldName, config, groupValue = '') => {
    const counter = autoIncrementCounters.value[fieldName]

    if (!counter) {
      autoIncrementCounters.value[fieldName] = {
        current: config.start || 0,
        groupValue: groupValue,
      }
    } else {
      if (config.groupBy && counter.groupValue !== groupValue) {
        counter.current = config.start || 0
        counter.groupValue = groupValue
      }
    }

    const currentValue = autoIncrementCounters.value[fieldName].current
    const nextValue = currentValue + (config.step || 1)
    autoIncrementCounters.value[fieldName].current = nextValue

    return currentValue
  }

  /**
   * 重置所有自增计数器
   * 在每次生成SQL前调用，确保从初始值开始
   */
  const resetAutoIncrementCounters = () => {
    const countersToReset = {}

    customFields.value.forEach((field) => {
      if (field.dataSource === 'auto_increment') {
        countersToReset[field.fieldName] = {
          current: field.autoIncrementConfig?.start || 0,
          groupValue: '',
        }
      }
    })

    autoIncrementCounters.value = countersToReset
  }

  /**
   * 应用自定义字段配置到数据行
   * @param {Object} rowData - 原始数据行
   * @param {Array} excelHeaders - Excel表头列表
   */
  const applyCustomFields = (rowData) => {
    const result = {}

    customFields.value.forEach((field) => {
      switch (field.dataSource) {
        case 'system_function':
          // 使用系统预设函数
          result[field.fieldName] = `${field.systemFunctionConfig?.functionName || 'NOW'}()`
          break

        case 'excel_combine': {
          // 组合Excel列数据
          const combineValues = field.excelCombineConfig?.columns
            .map((colIndex) => rowData[colIndex] || '')
            .join(field.excelCombineConfig?.separator || '')
          result[field.fieldName] = field.excelCombineConfig?.format
            ? applyFormat(combineValues, field.excelCombineConfig.format)
            : combineValues
          break
        }

        case 'auto_increment':
          // 生成自增数字
          result[field.fieldName] = generateAutoIncrementValue(
            field.fieldName,
            field.autoIncrementConfig || {},
          )
          break

        default:
          result[field.fieldName] = null
      }
    })

    return result
  }

  /**
   * 生成唯一ID
   */
  const generateId = () => {
    return Date.now().toString(36) + Math.random().toString(36).substr(2)
  }

  /**
   * 应用格式化模板
   */
  const applyFormat = (value, format) => {
    try {
      return format.replace(/{value}/g, value)
    } catch (error) {
      console.error('格式化失败:', error)
      return value
    }
  }

  // 计算属性
  const customBindingCount = computed(() => customBindings.value.length)
  const concatenationRuleCount = computed(() => fieldConcatenationRules.value.length)
  const customFieldCount = computed(() => customFields.value.length)
  const totalCustomBindings = computed(
    () => customBindingCount.value + concatenationRuleCount.value + customFieldCount.value,
  )

  // 保存实例引用
  customBindingManagerInstance = {
    // 状态
    customBindings: computed(() => customBindings.value),
    fieldConcatenationRules: computed(() => fieldConcatenationRules.value),
    customFields: computed(() => customFields.value),
    enableCustomBinding: computed(() => enableCustomBinding.value),

    // 系统预设函数
    systemFunctions: computed(() => systemFunctions),

    // 统计
    customBindingCount,
    concatenationRuleCount,
    customFieldCount,
    totalCustomBindings,

    // 方法
    addCustomBinding,
    removeCustomBinding,
    addConcatenationRule,
    removeConcatenationRule,
    applyCustomBindings,
    getFieldBinding,
    getBindingStats,
    validateBindings,
    exportBindings,
    importBindings,
    resetBindings,

    // 自定义字段方法
    addCustomField,
    removeCustomField,
    getCustomField,
    generateAutoIncrementValue,
    resetAutoIncrementCounters,
    applyCustomFields,
    isFieldNameUnique,

    // 设置
    setEnableCustomBinding: (value) => {
      enableCustomBinding.value = value
    },
  }

  return customBindingManagerInstance
}
