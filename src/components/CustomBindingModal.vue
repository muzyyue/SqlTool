<template>
  <a-modal
    v-model:visible="visible"
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
        <span class="toggle-description">
          启用后，自定义绑定将优先于自动匹配结果
        </span>
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
                  <template v-if="column.key === 'ddlField'">
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
                  </template>
                  
                  <template v-if="column.key === 'excelColumn'">
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
                  </template>
                  
                  <template v-if="column.key === 'actions'">
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
                  </template>
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
                  <template v-if="column.key === 'ddlField'">
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
                  </template>
                  
                  <template v-if="column.key === 'sourceColumns'">
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
                  </template>
                  
                  <template v-if="column.key === 'separator'">
                    <a-input
                      v-model:value="record.separator"
                      placeholder="分隔符（可选）"
                      @change="handleConcatenationChange(record)"
                    />
                  </template>
                  
                  <template v-if="column.key === 'format'">
                    <a-input
                      v-model:value="record.format"
                      placeholder="格式化模板，如：前缀{value}后缀"
                      @change="handleConcatenationChange(record)"
                    />
                  </template>
                  
                  <template v-if="column.key === 'preview'">
                    <div class="preview-value">
                      {{ getConcatenationPreview(record) }}
                    </div>
                  </template>
                  
                  <template v-if="column.key === 'actions'">
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
                  </template>
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

// Props
const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  ddlFields: {
    type: Array,
    default: () => []
  },
  excelHeaders: {
    type: Array,
    default: () => []
  },
  customBindingManager: {
    type: Object,
    required: true
  }
})

// Emits
const emit = defineEmits(['update:visible', 'save'])

// 响应式数据
const visible = ref(props.visible)
const activeTab = ref('single')
const enableCustomBinding = ref(props.customBindingManager.enableCustomBinding)

// 单列绑定数据
const singleBindings = ref([])
const singleBindingColumns = [
  {
    title: 'DDL字段',
    key: 'ddlField',
    width: '30%'
  },
  {
    title: 'Excel列',
    key: 'excelColumn',
    width: '40%'
  },
  {
    title: '操作',
    key: 'actions',
    width: '30%'
  }
]

// 字段拼接数据
const concatenationRules = ref([])
const concatenationColumns = [
  {
    title: '目标DDL字段',
    key: 'ddlField',
    width: '20%'
  },
  {
    title: '源Excel列',
    key: 'sourceColumns',
    width: '25%'
  },
  {
    title: '分隔符',
    key: 'separator',
    width: '15%'
  },
  {
    title: '格式化模板',
    key: 'format',
    width: '20%'
  },
  {
    title: '预览',
    key: 'preview',
    width: '10%'
  },
  {
    title: '操作',
    key: 'actions',
    width: '10%'
  }
]

// 计算属性
const availableDdlFields = computed(() => props.ddlFields)
const totalCustomBindings = computed(() => 
  singleBindings.value.length + concatenationRules.value.length
)

// 监听器
watch(() => props.visible, (newVal) => {
  visible.value = newVal
  if (newVal) {
    // 模态框打开时加载数据
    loadBindings()
  }
})

watch(() => props.customBindingManager.enableCustomBinding, (newVal) => {
  enableCustomBinding.value = newVal
})

// 方法
const loadBindings = () => {
  // 加载单列绑定
  singleBindings.value = props.customBindingManager.customBindings
    .filter(binding => binding.bindingType === 'single')
    .map(binding => ({
      id: binding.id,
      ddlFieldName: binding.ddlFieldName,
      excelIndex: binding.excelIndex
    }))
  
  // 加载字段拼接规则
  concatenationRules.value = props.customBindingManager.fieldConcatenationRules
    .map(rule => ({
      id: rule.id,
      ddlFieldName: rule.ddlFieldName,
      sourceColumns: rule.sourceColumns,
      separator: rule.separator || '',
      format: rule.format || ''
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
    excelIndex: -1
  })
}

const removeSingleBinding = (id) => {
  const index = singleBindings.value.findIndex(binding => binding.id === id)
  if (index >= 0) {
    singleBindings.value.splice(index, 1)
  }
}

const handleSingleBindingChange = (record) => {
  if (record.ddlFieldName && record.excelIndex >= 0) {
    props.customBindingManager.addCustomBinding(
      record.ddlFieldName,
      record.excelIndex,
      'single'
    )
  }
}

const addConcatenationRule = () => {
  concatenationRules.value.push({
    id: generateId(),
    ddlFieldName: '',
    sourceColumns: [],
    separator: '',
    format: ''
  })
}

const removeConcatenationRule = (id) => {
  const index = concatenationRules.value.findIndex(rule => rule.id === id)
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
    props.customBindingManager.addConcatenationRule(
      record.ddlFieldName,
      record.sourceColumns,
      record.separator,
      record.format
    )
  }
}

const isFieldBound = (fieldName) => {
  return singleBindings.value.some(binding => binding.ddlFieldName === fieldName) ||
         concatenationRules.value.some(rule => rule.ddlFieldName === fieldName)
}

const isColumnUsed = (columnIndex, currentBindingId) => {
  return singleBindings.value.some(binding => 
    binding.id !== currentBindingId && binding.excelIndex === columnIndex
  )
}

const getConcatenationPreview = (rule) => {
  if (!rule.ddlFieldName || rule.sourceColumns.length === 0) {
    return '请配置规则'
  }
  
  const sampleValues = rule.sourceColumns.map((colIndex, idx) => 
    `值${idx + 1}`
  )
  
  let result = sampleValues.join(rule.separator || '')
  
  if (rule.format) {
    result = rule.format.replace(/{value}/g, result)
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
  message.info('已重置所有自定义绑定配置')
}

const saveBindings = () => {
  // 验证配置
  const validation = props.customBindingManager.validateBindings()
  
  if (!validation.isValid) {
    message.error(`保存失败: ${validation.errors.join('; ')}`)
    return
  }
  
  emit('save', {
    customBindings: props.customBindingManager.customBindings,
    fieldConcatenationRules: props.customBindingManager.fieldConcatenationRules,
    enableCustomBinding: enableCustomBinding.value
  })
  
  message.success('自定义绑定配置已保存')
  closeModal()
}

const closeModal = () => {
  visible.value = false
  emit('update:visible', false)
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
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

.modal-actions {
  margin-top: 16px;
  text-align: right;
  padding-top: 16px;
  border-top: 1px solid #f0f0f0;
}
</style>