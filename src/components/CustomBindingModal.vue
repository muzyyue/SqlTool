<template>
  <a-modal
    v-model:open="visible"
    title="自定义字段绑定配置"
    width="90%"
    :footer="null"
    :maskClosable="false"
  >
    <div class="custom-binding-modal">
      <!-- 功能切换 -->
      <div class="feature-toggle">
        <a-switch
          v-model:checked="enableCustomBinding"
          checked-children="启用自定义绑定"
          un-checked-children="禁用自定义绑定"
          @change="handleToggleChange"
        />
        <span class="toggle-description"> 启用后，自定义绑定将优先于自动匹配结果 </span>
      </div>

      <!-- 自定义绑定配置 -->
      <div v-if="enableCustomBinding" class="binding-config">
        <a-tabs v-model:activeKey="activeTab">
          <!-- 单列绑定标签页 -->
          <a-tab-pane key="single" tab="单列绑定">
            <div class="tab-content">
              <div class="section-header">
                <h4>单列绑定配置</h4>
                <a-button type="primary" size="small" @click="addSingleBinding">
                  <template #icon><PlusOutlined /></template>
                  添加绑定
                </a-button>
              </div>

              <a-table
                :data-source="singleBindings"
                :columns="singleBindingColumns"
                :pagination="false"
                size="small"
              >
                <template #bodyCell="{ column, record }">
                  <div v-if="column.key === 'ddlField'">
                    <a-select
                      v-model:value="record.ddlFieldName"
                      style="width: 100%"
                      placeholder="选择DDL字段"
                      @change="handleSingleBindingChange(record)"
                    >
                      <a-select-option
                        v-for="field in availableDdlFields"
                        :key="field.name"
                        :value="field.name"
                        :disabled="isFieldBound(field.name)"
                      >
                        {{ field.name }} ({{ field.type }})
                      </a-select-option>
                    </a-select>
                  </div>

                  <div v-else-if="column.key === 'excelColumn'">
                    <a-select
                      v-model:value="record.excelIndex"
                      style="width: 100%"
                      placeholder="选择Excel列"
                      @change="handleSingleBindingChange(record)"
                    >
                      <a-select-option :value="-1">未绑定</a-select-option>
                      <a-select-option
                        v-for="(header, idx) in excelHeaders"
                        :key="idx"
                        :value="idx"
                        :disabled="isColumnUsed(idx, record.id)"
                      >
                        {{ header }} (列{{ idx + 1 }})
                      </a-select-option>
                    </a-select>
                  </div>

                  <div v-else-if="column.key === 'actions'">
                    <a-space>
                      <a-button
                        type="link"
                        size="small"
                        danger
                        @click="removeSingleBinding(record.id)"
                      >
                        删除
                      </a-button>
                    </a-space>
                  </div>

                  <div v-else>
                    {{ record[column.key] }}
                  </div>
                </template>
              </a-table>
            </div>
          </a-tab-pane>

          <!-- 字段拼接标签页 -->
          <a-tab-pane key="concatenation" tab="字段拼接">
            <div class="tab-content">
              <div class="section-header">
                <h4>字段拼接配置</h4>
                <a-button type="primary" size="small" @click="addConcatenationRule">
                  <template #icon><PlusOutlined /></template>
                  添加拼接规则
                </a-button>
              </div>

              <a-table
                :data-source="concatenationRules"
                :columns="concatenationColumns"
                :pagination="false"
                size="small"
              >
                <template #bodyCell="{ column, record }">
                  <div v-if="column.key === 'customFieldName'">
                    <a-input
                      v-model:value="record.customFieldName"
                      placeholder="输入自定义字段名称"
                      @change="handleConcatenationChange(record)"
                    />
                  </div>

                  <div v-else-if="column.key === 'ddlField'">
                    <a-select
                      v-model:value="record.ddlFieldName"
                      style="width: 100%"
                      placeholder="选择目标DDL字段"
                      @change="handleConcatenationChange(record)"
                    >
                      <a-select-option
                        v-for="field in availableDdlFields"
                        :key="field.name"
                        :value="field.name"
                        :disabled="isFieldBound(field.name)"
                      >
                        {{ field.name }} ({{ field.type }})
                      </a-select-option>
                    </a-select>
                  </div>

                  <div v-else-if="column.key === 'sourceColumns'">
                    <a-select
                      v-model:value="record.sourceColumns"
                      mode="multiple"
                      style="width: 100%"
                      placeholder="选择源Excel列"
                      @change="handleConcatenationChange(record)"
                    >
                      <a-select-option
                        v-for="(header, idx) in excelHeaders"
                        :key="idx"
                        :value="idx"
                      >
                        {{ header }} (列{{ idx + 1 }})
                      </a-select-option>
                    </a-select>
                    <div
                      v-if="record.sourceColumns.length > 0"
                      style="margin-top: 8px; display: flex; flex-wrap: wrap; gap: 4px"
                    >
                      <a-tag
                        v-for="(colIndex, index) in record.sourceColumns"
                        :key="colIndex"
                        color="blue"
                      >
                        {{ excelHeaders[colIndex] }} (列{{ colIndex + 1 }}) =
                        {{ record.columnVariables[colIndex] || `value${index + 1}` }}
                      </a-tag>
                    </div>
                  </div>

                  <div v-else-if="column.key === 'separator'">
                    <a-input
                      v-model:value="record.separator"
                      placeholder="分隔符（可选）"
                      @change="handleConcatenationChange(record)"
                    />
                  </div>

                  <div v-else-if="column.key === 'format'">
                    <a-tooltip
                      trigger="focus"
                      placement="topLeft"
                      overlay-class-name="numeric-input"
                      title="格式化模板，支持{value1}, {value2}, {value3}等变量引用，或使用{value}表示所有列的拼接结果"
                    >
                      <a-input
                        v-model:value="record.format"
                        placeholder="格式化模板，如：前缀{value1}后缀"
                        @change="handleConcatenationChange(record)"
                      />
                    </a-tooltip>
                  </div>

                  <div v-else-if="column.key === 'preview'">
                    <div class="preview-value">
                      {{ getConcatenationPreview(record) }}
                    </div>
                  </div>

                  <div v-else-if="column.key === 'actions'">
                    <a-space>
                      <a-button
                        type="link"
                        size="small"
                        danger
                        @click="removeConcatenationRule(record.id)"
                      >
                        删除
                      </a-button>
                    </a-space>
                  </div>

                  <div v-else>
                    {{ record[column.key] }}
                  </div>
                </template>
              </a-table>
            </div>
          </a-tab-pane>

          <!-- 自定义字段标签页 -->
          <a-tab-pane key="customFields" tab="自定义字段">
            <div class="tab-content">
              <div class="section-header">
                <h4>自定义字段配置</h4>
                <a-button type="primary" size="small" @click="addCustomField">
                  <template #icon><PlusOutlined /></template>
                  添加字段
                </a-button>
              </div>

              <a-table
                :data-source="customFields"
                :columns="customFieldColumns"
                :pagination="false"
                size="small"
              >
                <template #bodyCell="{ column, record }">
                  <div v-if="column.key === 'fieldName'">
                    <a-input
                      v-model:value="record.fieldName"
                      placeholder="字段名"
                      @change="handleCustomFieldChange(record)"
                    />
                  </div>

                  <div v-else-if="column.key === 'dataSource'">
                    <a-select
                      v-model:value="record.dataSource"
                      style="width: 100%"
                      placeholder="选择数据来源"
                      @change="handleCustomFieldChange(record)"
                    >
                      <a-select-option value="system_function">系统预设函数</a-select-option>
                      <a-select-option value="excel_combine">Excel列组合</a-select-option>
                      <a-select-option value="auto_increment">自增数字</a-select-option>
                    </a-select>
                  </div>

                  <div v-else-if="column.key === 'config'">
                    <div v-if="record.dataSource === 'system_function'" class="config-section">
                      <a-cascader
                        :value="getCascaderValue(record)"
                        :options="cascaderOptions"
                        style="width: 100%"
                        placeholder="选择数据库类型和函数"
                        @change="(value) => handleCascaderChange(value, record)"
                      />
                    </div>

                    <div v-else-if="record.dataSource === 'excel_combine'" class="config-section">
                      <a-input
                        v-model:value="record.fieldName"
                        placeholder="请输入自定义字段名称"
                        style="width: 100%; margin-bottom: 8px"
                        @change="handleCustomFieldChange(record)"
                      />
                      <a-select
                        v-model:value="record.excelCombineConfig.columns"
                        mode="multiple"
                        style="width: 100%"
                        placeholder="选择Excel列"
                        @change="handleCustomFieldChange(record)"
                      >
                        <a-select-option
                          v-for="(header, idx) in excelHeaders"
                          :key="idx"
                          :value="idx"
                        >
                          {{ header }} (列{{ idx + 1 }})
                        </a-select-option>
                      </a-select>
                      <div style="margin-top: 8px; display: flex; gap: 8px">
                        <a-input
                          v-model:value="record.excelCombineConfig.separator"
                          placeholder="分隔符"
                          style="width: 100px"
                          @change="handleCustomFieldChange(record)"
                        />
                        <a-input
                          v-model:value="record.excelCombineConfig.format"
                          placeholder="格式化模板，如：前缀{value}后缀"
                          style="flex: 1"
                          @change="handleCustomFieldChange(record)"
                        />
                      </div>
                    </div>

                    <div v-else-if="record.dataSource === 'auto_increment'" class="config-section">
                      <div style="display: flex; gap: 8px">
                        <a-input-number
                          v-model:value="record.autoIncrementConfig.start"
                          :min="0"
                          placeholder="起始值"
                          @change="handleCustomFieldChange(record)"
                        />
                        <a-input-number
                          v-model:value="record.autoIncrementConfig.step"
                          :min="1"
                          placeholder="步长"
                          @change="handleCustomFieldChange(record)"
                        />
                      </div>
                    </div>
                  </div>

                  <div v-else-if="column.key === 'preview'">
                    <div class="preview-value">
                      {{ getCustomFieldPreview(record) }}
                    </div>
                  </div>

                  <div v-else-if="column.key === 'actions'">
                    <a-space>
                      <a-button
                        type="link"
                        size="small"
                        danger
                        @click="removeCustomField(record.id)"
                      >
                        删除
                      </a-button>
                    </a-space>
                  </div>

                  <div v-else>
                    {{ record[column.key] }}
                  </div>
                </template>
              </a-table>
            </div>
          </a-tab-pane>
        </a-tabs>

        <!-- 统计信息 -->
        <div class="stats-section">
          <a-divider />
          <div class="stats-grid">
            <a-statistic title="单列绑定" :value="singleBindings.length" />
            <a-statistic title="拼接规则" :value="concatenationRules.length" />
            <a-statistic title="自定义字段" :value="customFields.length" />
            <a-statistic title="总自定义绑定" :value="totalCustomBindings" />
          </div>
        </div>

        <!-- 操作按钮 -->
        <div class="modal-actions">
          <a-space>
            <a-button @click="validateBindings">验证配置</a-button>
            <a-button @click="resetBindings">重置所有</a-button>
            <a-button type="primary" @click="saveBindings">保存配置</a-button>
            <a-button @click="closeModal">关闭</a-button>
          </a-space>
        </div>
      </div>
    </div>
  </a-modal>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { PlusOutlined } from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'
import { getDatabaseFunctions, getSupportedDatabaseTypes } from '../utils/databaseFunctions'

// Props
const props = defineProps({
  open: {
    type: Boolean,
    default: false,
  },
  ddlFields: {
    type: Array,
    default: () => [],
  },
  excelHeaders: {
    type: Array,
    default: () => [],
  },
  customBindingManager: {
    type: Object,
    required: true,
  },
})

// Emits
const emit = defineEmits(['update:open', 'save'])

// 响应式数据
const visible = ref(props.open)
const activeTab = ref('single')
const enableCustomBinding = ref(props.customBindingManager.enableCustomBinding)

// 单列绑定数据
const singleBindings = ref([])
const singleBindingColumns = [
  {
    title: 'DDL字段',
    key: 'ddlField',
    width: '30%',
  },
  {
    title: 'Excel列',
    key: 'excelColumn',
    width: '40%',
  },
  {
    title: '操作',
    key: 'actions',
    width: '30%',
  },
]

// 字段拼接数据
const concatenationRules = ref([])
const concatenationColumns = [
  {
    title: '自定义字段名称',
    key: 'customFieldName',
    width: '20%',
  },
  {
    title: '目标DDL字段',
    key: 'ddlField',
    width: '20%',
  },
  {
    title: '源Excel列',
    key: 'sourceColumns',
    width: '25%',
  },
  {
    title: '分隔符',
    key: 'separator',
    width: '10%',
  },
  {
    title: '格式化模板',
    key: 'format',
    width: '15%',
  },
  {
    title: '预览',
    key: 'preview',
    width: '10%',
  },
  {
    title: '操作',
    key: 'actions',
    width: '10%',
  },
]

// 自定义字段数据
const customFields = ref([])

// 根据函数名和数据库类型查找函数对象
/**
 * 根据数据库类型和函数名查找对应的函数对象
 * @param {string} dbType - 数据库类型
 * @param {string} functionName - 函数名
 * @returns {Object|null} 找到的函数对象或null
 */
const findFunctionByFunctionName = (dbType, functionName) => {
  // 验证参数类型
  if (typeof dbType !== 'string' || dbType.trim() === '') {
    dbType = 'mysql'
  }

  // 确保functionName是字符串且不为空
  if (typeof functionName !== 'string' || functionName.trim() === '') {
    return null
  }

  // 获取对应数据库的函数列表
  const functions = getDatabaseFunctions(dbType)

  if (!Array.isArray(functions)) {
    return null
  }

  // 查找函数名匹配的函数
  return functions.find(
    (func) => func && typeof func.name === 'string' && func.name === functionName,
  )
}

const customFieldColumns = [
  {
    title: '字段名',
    key: 'fieldName',
    width: '20%',
  },
  {
    title: '数据来源',
    key: 'dataSource',
    width: '20%',
    customCell: (_, record) => {
      if (!record) return { children: '' }
      if (record.dataSource === 'system_function' && record.systemFunctionConfig?.functionName) {
        const func = findFunctionByFunctionName(
          record.systemFunctionConfig.databaseType,
          record.systemFunctionConfig.functionName,
        )
        if (func) {
          return { children: `${func.name} - ${func.description}` }
        }
        return { children: `${record.systemFunctionConfig.functionName} - 未知函数` }
      }
      return {
        children:
          {
            system_function: '系统预设函数',
            excel_combine: 'Excel列组合',
            auto_increment: '自增数字',
          }[record.dataSource] || record.dataSource,
      }
    },
  },
  {
    title: '配置',
    key: 'config',
    width: '30%',
  },
  {
    title: '预览',
    key: 'preview',
    width: '20%',
  },
  {
    title: '操作',
    key: 'actions',
    width: '10%',
  },
]

// 计算属性
const availableDdlFields = computed(() => props.ddlFields)
const totalCustomBindings = computed(
  () => singleBindings.value.length + concatenationRules.value.length + customFields.value.length,
)
/**
 * 获取级联选择器的选项数据
 * @returns {Array} 级联选择器的选项数组
 */
const cascaderOptions = computed(() => {
  const dbTypes = getSupportedDatabaseTypes()
  return dbTypes.map((dbType) => {
    const functions = getDatabaseFunctions(dbType.value)
    const functionOptions = []

    if (Array.isArray(functions)) {
      for (const func of functions) {
        if (func && func.name && typeof func.name === 'string') {
          functionOptions.push({
            value: func.name,
            label: func.name,
            description: func.description || '',
          })
        }
      }
    }

    return {
      value: dbType.value,
      label: dbType.label,
      children: functionOptions,
    }
  })
})

/**
 * 获取级联选择器的当前值
 * @param {Object} record - 自定义字段记录
 * @returns {Array} 级联选择器的值数组 [databaseType, functionName]
 */
const getCascaderValue = (record) => {
  if (!record || !record.systemFunctionConfig) {
    return []
  }

  const { databaseType, functionName } = record.systemFunctionConfig

  if (!databaseType || !functionName) {
    return []
  }

  return [databaseType, functionName]
}

/**
 * 处理级联选择器的变更事件
 * @param {Array} value - 级联选择器的值 [databaseType, functionName]
 * @param {Object} record - 自定义字段记录
 */
const handleCascaderChange = (value, record) => {
  if (!Array.isArray(value) || value.length !== 2) {
    return
  }

  const [databaseType, functionName] = value

  if (!record.systemFunctionConfig) {
    record.systemFunctionConfig = {
      databaseType: 'mysql',
      functionName: 'NOW',
    }
  }

  record.systemFunctionConfig.databaseType = databaseType
  record.systemFunctionConfig.functionName = functionName

  handleCustomFieldChange(record)
}

// 监听器
watch(
  () => props.open,
  (newVal) => {
    visible.value = newVal
    if (newVal) {
      // 模态框打开时加载数据
      loadBindings()
    }
  },
)

watch(
  () => props.customBindingManager.enableCustomBinding,
  (newVal) => {
    enableCustomBinding.value = newVal
  },
)

// 方法
const loadBindings = () => {
  // 加载单列绑定 - 确保customBindings是数组
  const customBindings = Array.isArray(props.customBindingManager.customBindings)
    ? props.customBindingManager.customBindings
    : []
  singleBindings.value = customBindings
    .filter((binding) => binding.bindingType === 'single')
    .map((binding) => ({
      id: binding.id,
      ddlFieldName: binding.ddlFieldName,
      excelIndex: binding.excelIndex,
    }))

  // 加载字段拼接规则 - 确保fieldConcatenationRules是数组
  const fieldConcatenationRules = Array.isArray(props.customBindingManager.fieldConcatenationRules)
    ? props.customBindingManager.fieldConcatenationRules
    : []
  concatenationRules.value = fieldConcatenationRules.map((rule) => ({
    id: rule.id,
    customFieldName: rule.customFieldName || '',
    ddlFieldName: rule.ddlFieldName,
    sourceColumns: rule.sourceColumns,
    columnVariables: rule.columnVariables || {},
    separator: rule.separator || '',
    format: rule.format || '',
  }))

  // 加载自定义字段 - 确保customFields是数组
  const customFieldsData = Array.isArray(props.customBindingManager.customFields)
    ? props.customBindingManager.customFields
    : []
  customFields.value = customFieldsData.map((field) => ({
    id: field.id,
    fieldName: field.fieldName,
    dataSource: field.dataSource || 'system_function',
    systemFunctionConfig: {
      databaseType: field.systemFunctionConfig?.databaseType || 'mysql',
      functionName: field.systemFunctionConfig?.functionName || 'NOW',
    },
    excelCombineConfig: {
      columns: field.excelCombineConfig?.columns || [],
      separator: field.excelCombineConfig?.separator || '',
      format: field.excelCombineConfig?.format || '',
    },
    autoIncrementConfig: {
      start: field.autoIncrementConfig?.start || 1,
      step: field.autoIncrementConfig?.step || 1,
    },
  }))
}

const handleToggleChange = (checked) => {
  enableCustomBinding.value = checked
  props.customBindingManager.setEnableCustomBinding(checked)
}

const addSingleBinding = () => {
  singleBindings.value.push({
    id: generateId(),
    ddlFieldName: '',
    excelIndex: -1,
  })
}

const removeSingleBinding = (id) => {
  const index = singleBindings.value.findIndex((binding) => binding.id === id)
  if (index >= 0) {
    singleBindings.value.splice(index, 1)
  }
}

const handleSingleBindingChange = (record) => {
  if (record.ddlFieldName && record.excelIndex >= 0) {
    props.customBindingManager.addCustomBinding(record.ddlFieldName, record.excelIndex, 'single')
  }
}

const addConcatenationRule = () => {
  concatenationRules.value.push({
    id: generateId(),
    customFieldName: '',
    ddlFieldName: '',
    sourceColumns: [],
    columnVariables: {},
    separator: '',
    format: '',
  })
}

const removeConcatenationRule = (id) => {
  const index = concatenationRules.value.findIndex((rule) => rule.id === id)
  if (index >= 0) {
    concatenationRules.value.splice(index, 1)
    // 从管理器中也移除
    const rule = concatenationRules.value[index]
    if (rule) {
      props.customBindingManager.removeConcatenationRule(rule.ddlFieldName)
    }
  }
}

const handleConcatenationChange = (record) => {
  if (record.ddlFieldName && record.sourceColumns.length > 0) {
    // 自动分配变量名：value1, value2, value3...
    const newColumnVariables = {}
    record.sourceColumns.forEach((colIndex, index) => {
      newColumnVariables[colIndex] = `value${index + 1}`
    })
    record.columnVariables = newColumnVariables

    props.customBindingManager.addConcatenationRule(
      record.ddlFieldName,
      record.sourceColumns,
      record.separator,
      record.format,
    )
  }
}

const isFieldBound = (fieldName) => {
  return (
    singleBindings.value.some((binding) => binding.ddlFieldName === fieldName) ||
    concatenationRules.value.some((rule) => rule.ddlFieldName === fieldName)
  )
}

const isColumnUsed = (columnIndex, currentBindingId) => {
  return singleBindings.value.some(
    (binding) => binding.id !== currentBindingId && binding.excelIndex === columnIndex,
  )
}

const getConcatenationPreview = (rule) => {
  if (!rule.ddlFieldName || rule.sourceColumns.length === 0) {
    return '请配置规则'
  }

  let result
  const sampleValues = rule.sourceColumns.map((colIndex, idx) => `值${idx + 1}`)

  result = sampleValues.join(rule.separator || '')

  if (rule.format) {
    // 替换{value1}, {value2}, {value3}等变量
    result = rule.format.replace(/\{value(\d+)\}/g, (match, num) => {
      const index = parseInt(num, 10) - 1
      return sampleValues[index] !== undefined ? sampleValues[index] : ''
    })

    // 保持向后兼容：将{value}替换为所有列的拼接结果
    result = result.replace(/{value}/g, sampleValues.join(rule.separator || ''))
  }

  return result.length > 20 ? result.substring(0, 20) + '...' : result
}

const validateBindings = () => {
  const validation = props.customBindingManager.validateBindings()

  if (validation.isValid) {
    message.success('自定义绑定配置验证通过')
  } else {
    message.error(`配置验证失败: ${validation.errors.join('; ')}`)
  }
}

const resetBindings = () => {
  props.customBindingManager.resetBindings()
  singleBindings.value = []
  concatenationRules.value = []
  customFields.value = []
  message.info('已重置所有自定义绑定配置')
}

const addCustomField = () => {
  customFields.value.push({
    id: generateId(),
    fieldName: '',
    dataSource: 'system_function',
    systemFunctionConfig: {
      databaseType: 'mysql',
      functionName: 'NOW',
    },
    excelCombineConfig: {
      columns: [],
      separator: '',
      format: '',
    },
    autoIncrementConfig: {
      start: 1,
      step: 1,
    },
  })
}

const removeCustomField = (id) => {
  const index = customFields.value.findIndex((field) => field.id === id)
  if (index >= 0) {
    const fieldToRemove = customFields.value[index]
    customFields.value.splice(index, 1)
    // 从管理器中移除
    if (fieldToRemove.fieldName) {
      props.customBindingManager.removeCustomField(fieldToRemove.fieldName)
    }
  }
}

// 注意：不直接调用addCustomField，只更新本地状态
// 最终保存时由saveBindings统一处理
const handleCustomFieldChange = (record) => {
  // 只更新本地状态，不立即添加到管理器中
  // 确保字段名有效
  if (!record.fieldName) {
    return
  }

  // 可以在这里添加一些本地验证
  if (record.dataSource === 'system_function') {
    // 确保函数配置对象存在
    if (!record.systemFunctionConfig) {
      record.systemFunctionConfig = {
        databaseType: 'mysql',
        functionName: 'NOW',
      }
    }
  }

  console.log('自定义字段已更新:', record)
}

/**
 * 获取自定义字段的预览值
 * @param {Object} field - 自定义字段配置对象
 * @returns {string} 预览值
 */
const getCustomFieldPreview = (field) => {
  // 参数验证
  if (!field || typeof field !== 'object') {
    return '字段配置无效'
  }

  if (!field.fieldName || field.fieldName.trim() === '') {
    return '请配置字段名'
  }

  // 根据数据来源类型生成预览
  switch (field.dataSource) {
    case 'system_function': {
      // 验证系统函数配置
      if (!field.systemFunctionConfig || typeof field.systemFunctionConfig !== 'object') {
        return '系统函数配置无效'
      }

      const { databaseType, functionName } = field.systemFunctionConfig

      // 如果没有选择函数，提示用户选择
      if (!functionName || functionName.trim() === '') {
        return '请选择系统函数'
      }

      // 查找函数信息
      const func = findFunctionByFunctionName(databaseType, functionName)

      if (func) {
        return `${func.name}() - ${func.description}`
      }

      // 如果找不到函数，显示用户选择的函数名
      return `${functionName}() - 未知函数`
    }

    case 'excel_combine': {
      // 验证Excel组合配置
      if (!field.excelCombineConfig || typeof field.excelCombineConfig !== 'object') {
        return 'Excel组合配置无效'
      }

      const { columns, separator = '', format = '' } = field.excelCombineConfig

      if (!Array.isArray(columns) || columns.length === 0) {
        return '请选择Excel列'
      }

      const sampleValues = columns.map((_, idx) => `值${idx + 1}`)
      let result = sampleValues.join(separator)

      if (format.trim()) {
        result = format.replace(/{value}/g, result)
      }

      return result.length > 20 ? result.substring(0, 20) + '...' : result
    }

    case 'auto_increment': {
      // 验证自增配置
      if (!field.autoIncrementConfig || typeof field.autoIncrementConfig !== 'object') {
        return '自增配置无效'
      }

      const { start = 1, step = 1 } = field.autoIncrementConfig

      // 确保数值类型正确
      const startValue = Number(start) || 1
      const stepValue = Number(step) || 1

      return `${startValue} (步长: ${stepValue})`
    }

    default:
      return '请选择数据来源'
  }
}

const saveBindings = () => {
  console.log(
    '========================customFields===================================',
    customFields.value,
  )

  // 核心修复：将本地自定义字段同步到customBindingManager
  // 1. 先清空管理器中现有的自定义字段
  customFields.value.forEach((field) => {
    if (field.fieldName) {
      props.customBindingManager.removeCustomField(field.fieldName)
    }
  })

  // 2. 处理字段拼接规则中的自定义字段名称
  concatenationRules.value.forEach((rule) => {
    if (rule.customFieldName && rule.customFieldName.trim() !== '') {
      // 创建独立的自定义字段
      const customField = {
        fieldName: rule.customFieldName,
        dataSource: 'excel_combine',
        excelCombineConfig: {
          columns: rule.sourceColumns || [],
          separator: rule.separator || '',
          format: rule.format || '',
          isFromConcatenationRule: true,
        },
      }
      props.customBindingManager.addCustomField(customField)
    }
  })

  // 3. 将本地所有自定义字段添加到管理器中
  customFields.value.forEach((field) => {
    if (field.fieldName) {
      props.customBindingManager.addCustomField(field)
    }
  })

  // 验证配置
  const validation = props.customBindingManager.validateBindings()

  if (!validation.isValid) {
    message.error(`保存失败: ${validation.errors.join('; ')}`)
    return
  }

  emit('save', {
    customBindings: props.customBindingManager.customBindings.value,
    fieldConcatenationRules: props.customBindingManager.fieldConcatenationRules.value,
    customFields: props.customBindingManager.customFields.value,
    enableCustomBinding: enableCustomBinding.value,
  })

  message.success('自定义绑定配置已保存')
  closeModal()
}

const closeModal = () => {
  visible.value = false
  emit('update:open', false)
}

const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2)
}
</script>

<style scoped>
.custom-binding-modal {
  max-height: 70vh;
  overflow-y: auto;
}

.feature-toggle {
  display: flex;
  align-items: center;
  margin-bottom: 16px;
  padding: 12px;
  background: #f5f5f5;
  border-radius: 4px;
}

.toggle-description {
  margin-left: 12px;
  color: #666;
  font-size: 12px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.tab-content {
  min-height: 300px;
}

.preview-value {
  font-size: 12px;
  color: #666;
  word-break: break-all;
}

.stats-section {
  margin-top: 16px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

.config-section {
  margin-top: 8px;
  padding: 8px;
  background: #f8f9fa;
  border-radius: 4px;
  border: 1px solid #e9ecef;
}

.modal-actions {
  margin-top: 16px;
  text-align: right;
  padding-top: 16px;
  border-top: 1px solid #f0f0f0;
}
</style>
