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
                <a-space>
                  <a-button type="primary" size="small" @click="addSingleBinding">
                    <template #icon><PlusOutlined /></template>
                    添加绑定
                  </a-button>
                  <a-button type="dashed" size="small" @click="batchAddSingleBindings">
                    <template #icon><PlusOutlined /></template>
                    批量添加
                  </a-button>
                </a-space>
              </div>

              <a-table
                :data-source="singleBindings"
                :columns="singleBindingColumns"
                :pagination="false"
                size="small"
              >
                <template #bodyCell="{ column, record }">
                  <div v-if="column.key === 'ddlField'">
                    <div class="ddl-field-input-wrapper">
                      <a-radio-group
                        v-model:value="record.inputMode"
                        size="small"
                        button-style="solid"
                        style="margin-bottom: 8px"
                      >
                        <a-radio-button value="select">选择</a-radio-button>
                        <a-radio-button value="custom">自定义</a-radio-button>
                      </a-radio-group>

                      <a-select
                        v-if="record.inputMode === 'select'"
                        v-model:value="record.ddlFieldName"
                        style="width: 100%"
                        placeholder="选择DDL字段"
                        @change="handleSingleBindingChange(record)"
                      >
                        <a-select-option
                          v-for="field in availableDdlFields"
                          :key="field.name"
                          :value="field.name"
                          :disabled="isFieldBound(field.name, record.id)"
                        >
                          {{ field.name }} ({{ field.type }})
                        </a-select-option>
                      </a-select>

                      <a-input
                        v-else
                        v-model:value="record.customFieldName"
                        placeholder="输入自定义DDL字段名"
                        @change="handleCustomFieldNameChange(record)"
                      >
                        <template #suffix>
                          <a-tooltip v-if="record.customFieldName" title="清空自定义字段名">
                            <CloseCircleOutlined
                              style="cursor: pointer; color: #999"
                              @click="clearCustomFieldName(record)"
                            />
                          </a-tooltip>
                        </template>
                      </a-input>

                      <a-alert
                        v-if="
                          record.inputMode === 'custom' &&
                          record.customFieldName &&
                          !isFieldInDdl(record.customFieldName)
                        "
                        type="warning"
                        :message="`字段 '${record.customFieldName}' 不在DDL中`"
                        show-icon
                        size="small"
                        style="margin-top: 4px"
                      />
                    </div>
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

                  <div v-else-if="column.key === 'dataType'">
                    <a-select
                      v-model:value="record.dataType"
                      style="width: 100%"
                      placeholder="选择数据类型"
                      @change="handleCustomFieldChange(record)"
                    >
                      <a-select-option value="string">字符串</a-select-option>
                      <a-select-option value="int">整数</a-select-option>
                      <a-select-option value="decimal">小数</a-select-option>
                      <a-select-option value="datetime">日期时间</a-select-option>
                      <a-select-option value="boolean">布尔值</a-select-option>
                    </a-select>
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
import { ref, computed, watch, h } from 'vue'
import { PlusOutlined, CloseCircleOutlined } from '@ant-design/icons-vue'
import { message, Modal } from 'ant-design-vue'
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
  editingField: {
    type: Object,
    default: null,
  },
})

// Emits
const emit = defineEmits(['update:open', 'save'])

// 响应式数据
const visible = ref(props.open)
const activeTab = ref('single')
const enableCustomBinding = ref(false)

// 初始化enableCustomBinding
watch(
  () => props.customBindingManager?.enableCustomBinding?.value,
  (newVal) => {
    if (newVal !== undefined) {
      enableCustomBinding.value = newVal
    }
  },
  { immediate: true },
)

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
    width: '15%',
  },
  {
    title: '数据类型',
    key: 'dataType',
    width: '15%',
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
            // 使用数据库类型前缀确保 key 唯一
            value: `${dbType.value}_${func.name}`,
            label: func.name,
            description: func.description || '',
            databaseType: dbType.value,
            functionName: func.name,
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
 * @returns {Array} 级联选择器的值数组 [databaseType, functionKey]
 */
const getCascaderValue = (record) => {
  if (!record || !record.systemFunctionConfig) {
    return []
  }

  const { databaseType, functionName } = record.systemFunctionConfig

  if (!databaseType || !functionName) {
    return []
  }

  // 使用与 cascaderOptions 相同的格式构造 functionKey
  return [databaseType, `${databaseType}_${functionName}`]
}

/**
 * 处理级联选择器的变更事件
 * @param {Array} value - 级联选择器的值 [databaseType, functionKey]
 * @param {Object} record - 自定义字段记录
 */
const handleCascaderChange = (value, record) => {
  if (!Array.isArray(value) || value.length !== 2) {
    return
  }

  const [databaseType, functionKey] = value

  // 从 functionKey 中提取 functionName（格式: dbType_functionName）
  const functionName = functionKey.replace(`${databaseType}_`, '')

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
      // 如果有编辑字段，切换到自定义字段标签页
      if (props.editingField) {
        activeTab.value = 'customFields'
      }
    }
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
    .map((binding) => {
      const isInDdl = props.ddlFields.some((field) => field.name === binding.ddlFieldName)
      return {
        id: binding.id,
        ddlFieldName: binding.ddlFieldName,
        inputMode: isInDdl ? 'select' : 'custom',
        customFieldName: isInDdl ? '' : binding.ddlFieldName,
        excelIndex: binding.excelIndex,
      }
    })

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
    inputMode: 'select',
    customFieldName: '',
    excelIndex: -1,
  })
}

/**
 * 批量添加单列绑定
 * 为所有未绑定的DDL字段创建绑定记录
 */
const batchAddSingleBindings = () => {
  // 获取已绑定的DDL字段名
  const boundFieldNames = new Set(
    singleBindings.value
      .filter((binding) => binding.ddlFieldName)
      .map((binding) => binding.ddlFieldName),
  )

  // 为所有未绑定的DDL字段创建绑定记录
  props.ddlFields.forEach((ddlField) => {
    if (!boundFieldNames.has(ddlField.name)) {
      singleBindings.value.push({
        id: generateId(),
        ddlFieldName: ddlField.name,
        excelIndex: -1,
      })
    }
  })

  message.success(`已批量添加 ${props.ddlFields.length - boundFieldNames.size} 个绑定记录`)
}

const removeSingleBinding = (id) => {
  const index = singleBindings.value.findIndex((binding) => binding.id === id)
  if (index >= 0) {
    singleBindings.value.splice(index, 1)
  }
}

const handleSingleBindingChange = (record) => {
  // 只更新本地状态，不立即添加到管理器中
  // 最终保存时由saveBindings统一处理
  console.log('单列绑定已更新:', record)
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

const isFieldBound = (fieldName, currentBindingId) => {
  return (
    singleBindings.value.some(
      (binding) => binding.id !== currentBindingId && binding.ddlFieldName === fieldName,
    ) || concatenationRules.value.some((rule) => rule.ddlFieldName === fieldName)
  )
}

const isFieldInDdl = (fieldName) => {
  return props.ddlFields.some((field) => field.name === fieldName)
}

const handleCustomFieldNameChange = (record) => {
  // 只更新本地状态，不立即添加到管理器中
  // 最终保存时由saveBindings统一处理
  if (record.customFieldName) {
    record.ddlFieldName = record.customFieldName
  }
  console.log('自定义字段名已更新:', record)
}

const clearCustomFieldName = (record) => {
  record.customFieldName = ''
  record.ddlFieldName = ''
  console.log('自定义字段名已清空:', record)
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
    Modal.error({
      title: '自定义绑定配置验证失败',
      content: h('div', [
        h('p', '以下配置存在问题，请修复后再保存：'),
        h('ul', { style: { paddingLeft: '20px', marginTop: '10px' } }, [
          ...validation.errors.map((error) =>
            h('li', { style: { marginBottom: '5px', color: '#ff4d4f' } }, error),
          ),
        ]),
      ]),
      okText: '我知道了',
    })
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
    dataType: 'string',
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

  // 核心修复：将本地单列绑定同步到customBindingManager
  // 1. 先清空管理器中现有的单列绑定
  const currentCustomBindings = Array.isArray(props.customBindingManager.customBindings.value)
    ? props.customBindingManager.customBindings.value
    : []

  // 记录需要删除的DDL字段名
  const ddlFieldNamesToRemove = currentCustomBindings
    .filter((binding) => binding.bindingType === 'single')
    .map((binding) => binding.ddlFieldName)

  // 逐个删除单列绑定
  ddlFieldNamesToRemove.forEach((ddlFieldName) => {
    props.customBindingManager.removeCustomBinding(ddlFieldName)
  })

  // 2. 将本地单列绑定添加到管理器中
  singleBindings.value.forEach((binding) => {
    // 确定最终使用的字段名
    const finalFieldName =
      binding.inputMode === 'custom' ? binding.customFieldName : binding.ddlFieldName

    // 只有当字段名有效且Excel列已绑定时才添加
    if (finalFieldName && binding.excelIndex >= 0) {
      props.customBindingManager.addCustomBinding(finalFieldName, binding.excelIndex, 'single')
    }
  })

  // 核心修复：将本地自定义字段同步到customBindingManager
  // 3. 先清空管理器中现有的自定义字段
  const currentCustomFields = Array.isArray(props.customBindingManager.customFields.value)
    ? props.customBindingManager.customFields.value
    : []

  // 记录需要删除的自定义字段名（只删除不在当前列表中的）
  const newFieldNames = new Set(
    customFields.value.filter((f) => f.fieldName).map((f) => f.fieldName),
  )

  // 只删除不在新列表中的字段
  currentCustomFields.forEach((field) => {
    if (!newFieldNames.has(field.fieldName)) {
      props.customBindingManager.removeCustomField(field.fieldName)
    }
  })

  // 4. 处理字段拼接规则中的自定义字段名称
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

  // 5. 将本地所有自定义字段添加到管理器中
  console.log('准备添加自定义字段到管理器:', customFields.value)
  customFields.value.forEach((field) => {
    console.log('检查字段:', field)
    if (field.fieldName) {
      console.log('添加字段:', field.fieldName)
      props.customBindingManager.addCustomField(field)
    } else {
      console.log('跳过字段，因为fieldName为空')
    }
  })
  console.log(
    '添加后customBindingManager.customFields.value:',
    props.customBindingManager.customFields.value,
  )

  // 验证配置
  const validation = props.customBindingManager.validateBindings()

  if (!validation.isValid) {
    Modal.error({
      title: '保存失败',
      content: h('div', [
        h('p', '以下配置存在问题，请修复后再保存：'),
        h('ul', { style: { paddingLeft: '20px', marginTop: '10px' } }, [
          ...validation.errors.map((error) =>
            h('li', { style: { marginBottom: '5px', color: '#ff4d4f' } }, error),
          ),
        ]),
      ]),
      okText: '我知道了',
    })
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

.ddl-field-input-wrapper {
  padding: 4px;
}

.ddl-field-input-wrapper .ant-radio-group {
  display: flex;
  width: 100%;
}

.ddl-field-input-wrapper .ant-radio-button-wrapper {
  flex: 1;
  text-align: center;
}
</style>
