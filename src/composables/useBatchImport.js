/**
 * 批量导入功能 Composable
 * 封装批量导入修改规则的完整流程
 */

import { reactive, computed } from 'vue'
import { message } from 'ant-design-vue'
import { parseImportFile, validateFileFormat, downloadTemplateFile } from './useImportParser.js'
import { useTemplateManager } from './useTemplateManager.js'

/**
 * 导入配置选项
 * @typedef {Object} ImportOptions
 * @property {boolean} enableAutoMatch - 是否启用自动字段匹配（默认 true）
 * @property {number} maxRules - 最大导入规则数量（默认 100）
 * @property {boolean} skipInvalid - 是否跳过无效规则（默认 true）
 * @property {boolean} autoPreview - 是否自动预览（默认 false）
 */

/**
 * 字段映射项
 * @typedef {Object} FieldMapping
 * @property {number} importIndex - 导入数据索引
 * @property {string} importField - 导入的字段名
 * @property {string|null} ddlField - 匹配的 DDL 字段名
 * @property {string} status - 匹配状态: matched, partial, unmatched
 * @property {string} matchType - 匹配类型: exact, case-insensitive, fuzzy, none
 */

/**
 * 验证结果
 * @typedef {Object} ValidationResult
 * @property {boolean} valid - 是否有效
 * @property {Array<ValidationError>} errors - 错误列表
 * @property {Array<ValidationWarning>} warnings - 警告列表
 */

/**
 * 使用批量导入功能
 * @param {Object} options - 配置选项
 * @returns {Object} 批量导入相关方法和状态
 */
export function useBatchImport(options = {}) {
  const { enableAutoMatch = true, maxRules = 100 } = options

  const props = {
    ddlFields: [],
    editRules: [],
  }

  const emit = {
    onRulesChange: () => {},
    onImportComplete: () => {},
    onImportError: () => {},
  }

  const importState = reactive({
    visible: false,
    step: 0,
    format: 'excel',
    file: null,
    fileList: [],
    parsedRules: [],
    fieldMappings: [],
    previewRules: [],
    validationResult: null,
    importing: false,
    uploading: false,
    error: null,
    templateDrawerVisible: false,
    templates: [],
  })

  const formatOptions = [
    { label: 'Excel 文件 (.xlsx, .xls)', value: 'excel' },
    { label: 'CSV 文件 (.csv)', value: 'csv' },
    { label: 'JSON 文件 (.json)', value: 'json' },
  ]

  const operatorOptions = [
    { label: '=', value: '=' },
    { label: '!=', value: '!=' },
    { label: '>', value: '>' },
    { label: '<', value: '<' },
    { label: '>=', value: '>=' },
    { label: '<=', value: '<=' },
    { label: 'LIKE', value: 'LIKE' },
    { label: 'IN', value: 'IN' },
  ]

  const mappingColumns = [
    {
      title: '导入字段',
      dataIndex: 'importField',
      key: 'importField',
      width: '30%',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: '15%',
    },
    {
      title: 'DDL 字段',
      dataIndex: 'ddlField',
      key: 'ddlField',
      width: '40%',
    },
    {
      title: '操作',
      key: 'action',
      width: '15%',
    },
  ]

  const previewColumns = [
    {
      title: '序号',
      dataIndex: 'index',
      key: 'index',
      width: '60px',
    },
    {
      title: '字段名',
      dataIndex: 'fieldName',
      key: 'fieldName',
      width: '20%',
    },
    {
      title: '新值',
      dataIndex: 'newValue',
      key: 'newValue',
      width: '25%',
    },
    {
      title: '条件',
      dataIndex: 'condition',
      key: 'condition',
      width: '35%',
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      width: '20%',
    },
  ]

  const statusText = {
    matched: '已匹配',
    partial: '部分匹配',
    unmatched: '未匹配',
  }

  const statusColor = {
    matched: 'green',
    partial: 'orange',
    unmatched: 'red',
  }

  const ddlFieldOptions = computed(() => {
    return props.ddlFields.map((field) => ({
      label: `${field.name} (${field.type})`,
      value: field.name,
    }))
  })

  const canNext = computed(() => {
    switch (importState.step) {
      case 0:
        return !!importState.format
      case 1:
        return importState.file !== null && !importState.uploading
      case 2:
        return importState.fieldMappings.length > 0
      case 3:
        return importState.previewRules.length > 0
      default:
        return false
    }
  })

  const formatName = computed(() => {
    const formatMap = {
      excel: 'Excel',
      csv: 'CSV',
      json: 'JSON',
    }
    return formatMap[importState.format] || importState.format
  })

  const openImport = () => {
    resetImport()
    importState.visible = true
  }

  const closeImport = () => {
    importState.visible = false
    resetImport()
  }

  const resetImport = () => {
    importState.step = 0
    importState.format = 'excel'
    importState.file = null
    importState.fileList = []
    importState.parsedRules = []
    importState.fieldMappings = []
    importState.previewRules = []
    importState.validationResult = null
    importState.importing = false
    importState.uploading = false
    importState.error = null
  }

  const nextStep = () => {
    if (importState.step < 3) {
      importState.step++
      if (importState.step === 2 && importState.parsedRules.length > 0) {
        performFieldMapping()
      } else if (importState.step === 3) {
        generatePreview()
      }
    }
  }

  const prevStep = () => {
    if (importState.step > 0) {
      importState.step--
    }
  }

  const setFormat = (format) => {
    importState.format = format
  }

  const beforeUpload = (file) => {
    const validation = validateFileFormat(file)
    if (!validation.valid) {
      message.error(validation.error)
      return false
    }
    return true
  }

  const handleUpload = async (options) => {
    const { file, onSuccess, onError } = options
    importState.uploading = true
    importState.file = file
    importState.fileList = [file]

    try {
      const result = await parseImportFile(file)

      if (result.errors.length > 0 && result.rules.length === 0) {
        importState.error = result.errors[0].message
        onError(result.errors[0].message)
        message.error(`解析失败: ${result.errors[0].message}`)
        importState.uploading = false
        return
      }

      if (result.rules.length > maxRules) {
        message.warning(`导入数据超过最大限制 ${maxRules} 条，将截取前 ${maxRules} 条`)
        result.rules = result.rules.slice(0, maxRules)
      }

      importState.parsedRules = result.rules

      if (result.warnings.length > 0) {
        result.warnings.forEach((warning) => {
          message.warn(`第 ${warning.row} 行: ${warning.message}`)
        })
      }

      onSuccess('文件解析成功')
      message.success(`成功解析 ${result.rules.length} 条规则`)
    } catch (error) {
      importState.error = error.message
      onError(error.message)
      message.error(`文件处理失败: ${error.message}`)
    } finally {
      importState.uploading = false
    }
  }

  const customRequest = (options) => {
    handleUpload(options)
  }

  const performFieldMapping = () => {
    if (!enableAutoMatch || props.ddlFields.length === 0) {
      importState.fieldMappings = importState.parsedRules.map((rule, index) => ({
        importIndex: index,
        importField: rule.fieldName,
        ddlField: null,
        status: 'unmatched',
        matchType: 'none',
      }))
      return
    }

    importState.fieldMappings = importState.parsedRules.map((rule, index) => {
      const ddlField = matchField(rule.fieldName, props.ddlFields)

      return {
        importIndex: index,
        importField: rule.fieldName,
        ddlField: ddlField?.name || null,
        status: ddlField ? 'matched' : 'unmatched',
        matchType: ddlField?.matchType || 'none',
      }
    })
  }

  const matchField = (fieldName, ddlFields) => {
    const normalizedName = fieldName.toLowerCase().replace(/[_\s-]/g, '')

    for (const field of ddlFields) {
      const fieldNameLower = field.name.toLowerCase()

      if (fieldNameLower === normalizedName) {
        return { name: field.name, matchType: 'exact' }
      }
    }

    for (const field of ddlFields) {
      const fieldNameLower = field.name.toLowerCase()

      if (fieldNameLower === fieldName.toLowerCase()) {
        return { name: field.name, matchType: 'case-insensitive' }
      }
    }

    for (const field of ddlFields) {
      const fieldNameLower = field.name.toLowerCase()

      if (
        normalizedName.length >= 2 &&
        fieldNameLower.length >= 2 &&
        (normalizedName.includes(fieldNameLower) || fieldNameLower.includes(normalizedName))
      ) {
        return { name: field.name, matchType: 'fuzzy' }
      }
    }

    return null
  }

  const handleFieldMappingChange = (mapping) => {
    const index = importState.fieldMappings.findIndex((m) => m.importIndex === mapping.importIndex)
    if (index !== -1) {
      const newMapping = {
        ...mapping,
        ddlField: mapping.ddlField,
        status: mapping.ddlField ? 'matched' : 'unmatched',
        matchType: mapping.ddlField ? 'manual' : 'none',
      }
      importState.fieldMappings[index] = newMapping
    }
  }

  const skipMapping = (mapping) => {
    const index = importState.fieldMappings.findIndex((m) => m.importIndex === mapping.importIndex)
    if (index !== -1) {
      importState.fieldMappings.splice(index, 1)
    }
  }

  const generatePreview = () => {
    const fieldMappingMap = new Map(
      importState.fieldMappings.map((m) => [m.importIndex, m.ddlField]),
    )

    importState.previewRules = importState.parsedRules
      .filter((rule, index) => {
        const mappedField = fieldMappingMap.get(index)
        return mappedField !== undefined && mappedField !== null
      })
      .map((rule, displayIndex) => {
        const originalIndex = importState.parsedRules.indexOf(rule)
        const ddlField = fieldMappingMap.get(originalIndex)

        let conditionText = ''
        if (rule.condition.enabled) {
          conditionText = `${rule.condition.fieldName} ${rule.condition.operator} ${rule.condition.value}`
        }

        return {
          ...rule,
          index: displayIndex + 1,
          ddlField: ddlField || rule.fieldName,
          condition: conditionText || '-',
        }
      })
  }

  const confirmImport = () => {
    importState.importing = true

    try {
      const fieldMappingMap = new Map(
        importState.fieldMappings.map((m) => [m.importIndex, m.ddlField]),
      )

      const rulesToAdd = importState.parsedRules
        .filter((rule, index) => {
          const mappedField = fieldMappingMap.get(index)
          return mappedField !== undefined && mappedField !== null && mappedField !== ''
        })
        .map((rule) => {
          const originalIndex = importState.parsedRules.indexOf(rule)
          const ddlField = fieldMappingMap.get(originalIndex)

          return {
            id: `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            fieldName: ddlField || rule.fieldName,
            newValue: rule.newValue,
            condition: rule.condition,
            description: rule.description,
          }
        })

      if (rulesToAdd.length === 0) {
        message.warning('没有有效的规则可导入')
        importState.importing = false
        return
      }

      importState.previewRules = rulesToAdd.map((rule, index) => ({
        ...rule,
        index: index + 1,
        condition: rule.condition.enabled
          ? `${rule.condition.fieldName} ${rule.condition.operator} ${rule.condition.value}`
          : '-',
      }))

      emit.onRulesChange(rulesToAdd)
      emit.onImportComplete(rulesToAdd)

      message.success(`成功导入 ${rulesToAdd.length} 条修改规则`)
      closeImport()
    } catch (error) {
      importState.error = error.message
      emit.onImportError(error)
      message.error(`导入失败: ${error.message}`)
    } finally {
      importState.importing = false
    }
  }

  const downloadTemplate = () => {
    const fieldNames = props.ddlFields.map((f) => f.name)
    downloadTemplateFile(fieldNames, 'batch_edit_template.xlsx')
    message.success('模板下载成功')
  }

  const setDdlFields = (fields) => {
    props.ddlFields = fields
  }

  const setOnRulesChange = (callback) => {
    emit.onRulesChange = callback
  }

  const setOnImportComplete = (callback) => {
    emit.onImportComplete = callback
  }

  const setOnImportError = (callback) => {
    emit.onImportError = callback
  }

  const templateManager = useTemplateManager()

  const openTemplateDrawer = () => {
    templateManager.openTemplateDrawer()
  }

  const closeTemplateDrawer = () => {
    templateManager.closeTemplateDrawer()
  }

  return {
    importState,
    formatOptions,
    operatorOptions,
    mappingColumns,
    previewColumns,
    statusText,
    statusColor,
    ddlFieldOptions,
    canNext,
    formatName,
    templateManager,
    openTemplateDrawer,
    closeTemplateDrawer,
    openImport,
    closeImport,
    nextStep,
    prevStep,
    setFormat,
    beforeUpload,
    customRequest,
    handleFieldMappingChange,
    skipMapping,
    confirmImport,
    downloadTemplate,
    setDdlFields,
    setOnRulesChange,
    setOnImportComplete,
    setOnImportError,
  }
}
