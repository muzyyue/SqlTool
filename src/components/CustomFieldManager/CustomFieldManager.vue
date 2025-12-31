<template>
  <div class="custom-field-manager">
    <!-- 顶部操作栏 -->
    <div class="manager-header">
      <div class="search-filter-group">
        <!-- 搜索框 -->
        <a-input
          v-model:value="searchText"
          placeholder="搜索字段名"
          allow-clear
          size="small"
          style="width: 200px"
        >
          <template #prefix>
            <SearchOutlined />
          </template>
        </a-input>

        <!-- 筛选器 -->
        <a-select
          v-model:value="filterType"
          placeholder="筛选数据来源"
          allow-clear
          size="small"
          style="width: 150px"
        >
          <a-select-option value="all">全部</a-select-option>
          <a-select-option value="system_function">系统函数</a-select-option>
          <a-select-option value="excel_combine">Excel组合</a-select-option>
          <a-select-option value="auto_increment">自增</a-select-option>
          <a-select-option value="static_value">静态值</a-select-option>
        </a-select>
      </div>

      <div class="stats-info">
        <a-tag color="blue">共 {{ filteredFields.length }} 个字段</a-tag>
      </div>
    </div>

    <!-- 自定义字段表格 -->
    <a-table
      :data-source="filteredFields"
      :columns="columns"
      :pagination="false"
      size="small"
      :scroll="{ y: 300 }"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'fieldName'">
          <strong>{{ record.fieldName }}</strong>
        </template>

        <template v-else-if="column.key === 'dataType'">
          <a-tag color="default" size="small">{{ record.dataType || 'string' }}</a-tag>
        </template>

        <template v-else-if="column.key === 'dataSource'">
          <a-tag :color="getDataSourceColor(record.dataSource)" size="small">
            {{ getDataSourceLabel(record.dataSource) }}
          </a-tag>
        </template>

        <template v-else-if="column.key === 'config'">
          <div class="config-detail">
            <template v-if="record.dataSource === 'system_function'">
              <span>函数: {{ record.systemFunctionConfig?.functionName || 'NOW' }}</span>
              <a-tag color="blue" size="small">
                {{ record.systemFunctionConfig?.databaseType || 'mysql' }}
              </a-tag>
            </template>

            <template v-else-if="record.dataSource === 'excel_combine'">
              <div class="config-item">
                <span>列: {{ formatColumns(record.excelCombineConfig?.columns) }}</span>
              </div>
              <div class="config-item">
                <span>分隔符: {{ record.excelCombineConfig?.separator || '' }}</span>
              </div>
              <div v-if="record.excelCombineConfig?.format" class="config-item">
                <span>格式: {{ record.excelCombineConfig.format }}</span>
              </div>
            </template>

            <template v-else-if="record.dataSource === 'auto_increment'">
              <div class="config-item">
                <span>起始: {{ record.autoIncrementConfig?.start || 1 }}</span>
              </div>
              <div class="config-item">
                <span>步长: {{ record.autoIncrementConfig?.step || 1 }}</span>
              </div>
            </template>

            <template v-else-if="record.dataSource === 'static_value'">
              <span>值: {{ record.staticValue }}</span>
            </template>
          </div>
        </template>

        <template v-else-if="column.key === 'actions'">
          <a-space>
            <a-button type="link" size="small" @click="handleEdit(record)">
              <template #icon><EditOutlined /></template>
              编辑
            </a-button>
            <a-button type="link" size="small" danger @click="handleDelete(record)">
              <template #icon><DeleteOutlined /></template>
              删除
            </a-button>
          </a-space>
        </template>
      </template>
    </a-table>

    <!-- 空状态 -->
    <a-empty
      v-if="filteredFields.length === 0"
      description="暂无自定义字段"
      :image="Empty.PRESENTED_IMAGE_SIMPLE"
    />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { message, Modal, Empty } from 'ant-design-vue'
import { SearchOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons-vue'

const props = defineProps({
  customFields: {
    type: Array,
    default: () => [],
  },
  customBindingManager: {
    type: Object,
    required: true,
  },
})

const emit = defineEmits(['edit', 'delete', 'refresh'])

const searchText = ref('')
const filterType = ref('all')

const columns = [
  {
    title: '字段名',
    key: 'fieldName',
    width: 150,
  },
  {
    title: '数据类型',
    key: 'dataType',
    width: 100,
  },
  {
    title: '数据来源',
    key: 'dataSource',
    width: 120,
  },
  {
    title: '配置详情',
    key: 'config',
    width: 300,
  },
  {
    title: '操作',
    key: 'actions',
    width: 120,
    fixed: 'right',
  },
]

const filteredFields = computed(() => {
  let fields = [...props.customFields]

  if (searchText.value) {
    const searchLower = searchText.value.toLowerCase()
    fields = fields.filter((field) => field.fieldName.toLowerCase().includes(searchLower))
  }

  if (filterType.value && filterType.value !== 'all') {
    fields = fields.filter((field) => field.dataSource === filterType.value)
  }

  return fields
})

const getDataSourceLabel = (dataSource) => {
  const labels = {
    system_function: '系统函数',
    excel_combine: 'Excel组合',
    auto_increment: '自增',
    static_value: '静态值',
  }
  return labels[dataSource] || dataSource
}

const getDataSourceColor = (dataSource) => {
  const colors = {
    system_function: 'blue',
    excel_combine: 'green',
    auto_increment: 'orange',
    static_value: 'purple',
  }
  return colors[dataSource] || 'default'
}

const formatColumns = (columns) => {
  if (!columns || columns.length === 0) {
    return '无'
  }
  return columns.map((col) => `列${col + 1}`).join(', ')
}

const handleEdit = (record) => {
  emit('edit', record)
}

const handleDelete = (record) => {
  Modal.confirm({
    title: '确认删除',
    content: `确定要删除自定义字段 "${record.fieldName}" 吗？`,
    okText: '确定',
    okType: 'danger',
    cancelText: '取消',
    onOk: () => {
      try {
        props.customBindingManager.removeCustomField(record.fieldName)
        emit('delete', record)
        emit('refresh')
        message.success(`已删除自定义字段: ${record.fieldName}`)
      } catch (error) {
        message.error(`删除失败: ${error.message}`)
      }
    },
  })
}
</script>

<style scoped>
.custom-field-manager {
  background: white;
  border-radius: 4px;
}

.manager-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding: 12px;
  background: #fafafa;
  border-radius: 4px;
}

.search-filter-group {
  display: flex;
  gap: 8px;
}

.stats-info {
  display: flex;
  align-items: center;
}

.config-detail {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 12px;
}

.config-item {
  color: #666;
}

:deep(.ant-table) {
  font-size: 12px;
}

:deep(.ant-table-tbody > tr > td) {
  padding: 8px 12px;
}
</style>
