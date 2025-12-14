import { ref, computed } from 'vue'

/**
 * 自定义绑定功能管理器
 * 支持手动绑定和字段拼接功能
 */
export function useCustomBinding() {
  // 自定义绑定配置
  const customBindings = ref([])

  // 字段拼接规则
  const fieldConcatenationRules = ref([])

  // 是否启用自定义绑定
  const enableCustomBinding = ref(false)

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
   * @param {string} ddlFieldName - 目标DDL字段名
   * @param {Array} sourceColumns - 源Excel列索引数组
   * @param {string} separator - 分隔符
   * @param {string} format - 格式化模板
   */
  const addConcatenationRule = (ddlFieldName, sourceColumns, separator = '', format = null) => {
    const existingIndex = fieldConcatenationRules.value.findIndex(
      (rule) => rule.ddlFieldName === ddlFieldName,
    )

    if (existingIndex >= 0) {
      // 更新现有规则
      fieldConcatenationRules.value[existingIndex] = {
        ...fieldConcatenationRules.value[existingIndex],
        sourceColumns,
        separator,
        format,
        updatedAt: new Date().toISOString(),
      }
    } else {
      // 添加新规则
      fieldConcatenationRules.value.push({
        id: generateId(),
        ddlFieldName,
        sourceColumns,
        separator,
        format,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
    }
  }

  /**
   * 移除字段拼接规则
   * @param {string} ddlFieldName - DDL字段名
   */
  const removeConcatenationRule = (ddlFieldName) => {
    const index = fieldConcatenationRules.value.findIndex(
      (rule) => rule.ddlFieldName === ddlFieldName,
    )
    if (index >= 0) {
      fieldConcatenationRules.value.splice(index, 1)
    }
  }

  /**
   * 应用自定义绑定到数据行
   * @param {Object} rowData - Excel数据行
   * @param {Array} ddlFields - DDL字段列表
   * @param {Array} excelHeaders - Excel表头列表
   * @returns {Object} 应用自定义绑定后的数据
   */
  const applyCustomBindings = (rowData, ddlFields, excelHeaders) => {
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

    // 检查重复绑定
    const fieldBindings = new Set()
    customBindings.value.forEach((binding) => {
      if (fieldBindings.has(binding.ddlFieldName)) {
        errors.push(`字段"${binding.ddlFieldName}"存在重复的自定义绑定`)
      }
      fieldBindings.add(binding.ddlFieldName)
    })

    fieldConcatenationRules.value.forEach((rule) => {
      if (fieldBindings.has(rule.ddlFieldName)) {
        errors.push(`字段"${rule.ddlFieldName}"同时存在单列绑定和拼接规则`)
      }
      fieldBindings.add(rule.ddlFieldName)
    })

    // 检查无效的Excel列索引
    customBindings.value.forEach((binding) => {
      if (binding.excelIndex < -1) {
        errors.push(`字段"${binding.ddlFieldName}"的Excel列索引无效`)
      }
    })

    fieldConcatenationRules.value.forEach((rule) => {
      rule.sourceColumns.forEach((colIndex) => {
        if (colIndex < 0) {
          errors.push(`字段"${rule.ddlFieldName}"的拼接源列索引无效`)
        }
      })
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
      exportTime: new Date().toISOString(),
    }
  }

  /**
   * 导入绑定配置
   */
  const importBindings = (config) => {
    if (config.customBindings) {
      customBindings.value = config.customBindings
    }
    if (config.fieldConcatenationRules) {
      fieldConcatenationRules.value = config.fieldConcatenationRules
    }
  }

  /**
   * 重置所有绑定配置
   */
  const resetBindings = () => {
    customBindings.value = []
    fieldConcatenationRules.value = []
  }

  /**
   * 获取绑定统计信息
   */
  const getBindingStats = () => {
    return {
      customBindings: customBindings.value.length,
      concatenationRules: fieldConcatenationRules.value.length,
      hasCustomConfig: customBindings.value.length > 0 || fieldConcatenationRules.value.length > 0,
    }
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
  const totalCustomBindings = computed(
    () => customBindingCount.value + concatenationRuleCount.value,
  )

  return {
    // 状态
    customBindings: computed(() => customBindings.value),
    fieldConcatenationRules: computed(() => fieldConcatenationRules.value),
    enableCustomBinding: computed(() => enableCustomBinding.value),

    // 统计
    customBindingCount,
    concatenationRuleCount,
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

    // 设置
    setEnableCustomBinding: (value) => {
      enableCustomBinding.value = value
    },
  }
}
