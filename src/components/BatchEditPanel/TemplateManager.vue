<template>
  <a-drawer
    v-model:open="drawerVisible"
    title="规则模板管理"
    width="400"
    placement="right"
    :body-style="{ paddingBottom: '80px' }"
    :mask-closable="true"
    :closable="true"
    @close="handleDrawerClose"
  >
    <template #extra>
      <a-space>
        <a-button @click="handleExportAll">导出全部</a-button>
        <a-button type="primary" @click="openSaveModal"> <PlusOutlined /> 新建模板 </a-button>
      </a-space>
    </template>

    <div class="template-header">
      <a-input-search
        v-model:value="searchText"
        placeholder="搜索模板名称"
        style="width: 100%; margin-bottom: 16px"
        allow-clear
      />
    </div>

    <div class="template-list">
      <a-empty v-if="filteredTemplates.length === 0" description="暂无模板" />

      <a-list
        v-else
        :data-source="filteredTemplates"
        :pagination="{ pageSize: 5 }"
        item-layout="vertical"
      >
        <template #renderItem="{ item }">
          <a-list-item class="template-item">
            <template #actions>
              <a-space size="small">
                <a-tooltip title="加载此模板">
                  <a-button type="link" size="small" @click="handleLoadTemplate(item)">
                    <template #icon><DownloadOutlined /></template>
                    加载
                  </a-button>
                </a-tooltip>
                <a-tooltip title="导出为JSON文件">
                  <a-button type="link" size="small" @click="handleExportTemplate(item)">
                    <template #icon><ExportOutlined /></template>
                    导出
                  </a-button>
                </a-tooltip>
                <a-popconfirm
                  title="确定要删除此模板吗？"
                  ok-text="确定"
                  cancel-text="取消"
                  @confirm="handleDeleteTemplate(item.id)"
                >
                  <a-tooltip title="删除模板">
                    <a-button type="link" danger size="small">
                      <template #icon><DeleteOutlined /></template>
                    </a-button>
                  </a-tooltip>
                </a-popconfirm>
              </a-space>
            </template>

            <a-list-item-meta :description="item.description">
              <template #title>
                <div class="template-title">
                  <span>{{ item.name }}</span>
                  <a-tag color="blue" size="small">{{ item.ruleCount }} 条规则</a-tag>
                </div>
              </template>
            </a-list-item-meta>

            <div class="template-meta">
              <span class="meta-item">
                <ClockCircleOutlined /> {{ formatDate(item.updatedAt) }}
              </span>
            </div>
          </a-list-item>
        </template>
      </a-list>
    </div>

    <a-divider />

    <div class="template-footer">
      <a-space direction="vertical" style="width: 100%">
        <a-button block @click="handleResetToDefault"> <ReloadOutlined /> 恢复默认模板 </a-button>
        <a-button
          block
          danger
          @click="handleClearAll"
          :disabled="
            templateManager.templateCount === 0 || templateManager.templateCount.value === 0
          "
        >
          <DeleteOutlined /> 清空所有模板
        </a-button>
      </a-space>
    </div>

    <a-modal
      v-model:open="saveModalVisible"
      :title="editingTemplate ? '编辑模板' : '新建模板'"
      :confirm-loading="savingLoading"
      @ok="handleSaveTemplate"
      @cancel="closeSaveModal"
    >
      <a-form :model="templateForm" layout="vertical">
        <a-form-item label="模板名称" :rules="[{ required: true, message: '请输入模板名称' }]">
          <a-input
            v-model:value="templateForm.name"
            placeholder="请输入模板名称"
            :maxlength="50"
            show-count
          />
        </a-form-item>

        <a-form-item label="模板描述">
          <a-textarea
            v-model:value="templateForm.description"
            placeholder="请输入模板描述（可选）"
            :rows="3"
            :maxlength="200"
            show-count
          />
        </a-form-item>

        <a-form-item label="规则预览">
          <a-table
            :data-source="templateForm.rules"
            :columns="rulePreviewColumns"
            :pagination="false"
            size="small"
            :scroll="{ y: 200 }"
          />
        </a-form-item>
      </a-form>
    </a-modal>

    <a-modal
      v-model:open="importModalVisible"
      title="导入模板"
      :confirm-loading="importing"
      @ok="handleConfirmImport"
      @cancel="closeImportModal"
    >
      <a-upload
        v-model:file-list="importFileList"
        :before-upload="beforeImportUpload"
        accept=".json"
        :max-count="1"
      >
        <a-button> <upload-outlined /> 点击上传 JSON 文件 </a-button>
      </a-upload>
      <a-divider>或</a-divider>
      <a-textarea v-model:value="importText" placeholder="直接粘贴 JSON 内容" :rows="6" />
    </a-modal>
  </a-drawer>
</template>

<script setup>
import { ref, computed, reactive, watch, h, onMounted } from 'vue'
import { message } from 'ant-design-vue'
import {
  PlusOutlined,
  DownloadOutlined,
  ExportOutlined,
  DeleteOutlined,
  ReloadOutlined,
  ClockCircleOutlined,
  UploadOutlined,
} from '@ant-design/icons-vue'
import ASelect from 'ant-design-vue/es/select'
import AInput from 'ant-design-vue/es/input'
import { useTemplateManager } from '@/composables/data/useTemplateManager.js'

const Select = ASelect
const Input = AInput

const props = defineProps({
  currentRules: {
    type: Array,
    default: () => [],
  },
  ddlFields: {
    type: Array,
    default: () => [],
  },
})

const emit = defineEmits(['load', 'export'])

const templateManager = useTemplateManager()

const drawerVisible = ref(false)

onMounted(() => {
  templateManager.initTemplates()
  watch(
    () => templateManager.templateDrawerVisible.value,
    (visible) => {
      drawerVisible.value = visible
    },
    { immediate: true },
  )
})

const handleDrawerClose = () => {
  drawerVisible.value = false
  templateManager.templateDrawerVisible.value = false
}

watch(drawerVisible, (visible) => {
  templateManager.templateDrawerVisible.value = visible
})

const searchText = ref('')
const saveModalVisible = ref(false)
const importModalVisible = ref(false)
const editingTemplate = ref(null)
const importing = ref(false)
const importFileList = ref([])
const importText = ref('')

const templateForm = reactive({
  name: '',
  description: '',
  rules: [],
})

const rulePreviewColumns = [
  {
    title: '字段',
    dataIndex: 'fieldName',
    key: 'fieldName',
    width: '30%',
    customRender: ({ record }) =>
      h(Select, {
        value: record.fieldName,
        'onUpdate:value': (value) => {
          record.fieldName = value
        },
        placeholder: '选择字段',
        style: 'width: 100%',
        showSearch: true,
        optionFilterProp: 'label',
        options: ddlFieldOptions.value,
      }),
  },
  {
    title: '新值',
    dataIndex: 'newValue',
    key: 'newValue',
    width: '30%',
    customRender: ({ record }) =>
      h(Input, {
        value: record.newValue,
        'onUpdate:value': (value) => {
          record.newValue = value
        },
        placeholder: '输入新值',
        allowClear: true,
        style: 'width: 100%',
      }),
  },
  {
    title: '条件',
    dataIndex: 'condition',
    key: 'condition',
    width: '40%',
    customRender: ({ record }) => {
      const cond = record.condition || { enabled: false, fieldName: '', operator: '=', value: '' }
      return h(
        'span',
        { style: 'font-size: 12px; color: #666' },
        cond.enabled ? `${cond.fieldName} ${cond.operator} ${cond.value}` : '无条件',
      )
    },
  },
]

const ddlFieldOptions = computed(() => {
  return props.ddlFields.map((field) => {
    if (typeof field === 'string') {
      return { label: field, value: field }
    }
    return { label: `${field.name} (${field.type})`, value: field.name }
  })
})

const filteredTemplates = computed(() => {
  if (!searchText.value) {
    return templateManager.templateList.value
  }
  const search = searchText.value.toLowerCase()
  return templateManager.templateList.value.filter(
    (t) =>
      t.name.toLowerCase().includes(search) ||
      (t.description && t.description.toLowerCase().includes(search)),
  )
})

const savingLoading = computed(() => !!templateManager.savingTemplate.value)

const formatDate = (dateStr) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const openSaveModal = () => {
  editingTemplate.value = null
  templateForm.name = ''
  templateForm.description = ''
  templateForm.rules = props.currentRules.map((r) => ({
    ...r,
    condition: r.condition || { enabled: false, fieldName: '', operator: '=', value: '' },
  }))
  saveModalVisible.value = true
}

const closeSaveModal = () => {
  saveModalVisible.value = false
  editingTemplate.value = null
}

const handleSaveTemplate = () => {
  if (!templateForm.name.trim()) {
    message.warning('请输入模板名称')
    return
  }

  if (!templateForm.rules || templateForm.rules.length === 0) {
    message.warning('模板至少包含一条规则')
    return
  }

  try {
    templateManager.saveTemplate({
      id: editingTemplate.value?.id,
      name: templateForm.name.trim(),
      description: templateForm.description.trim(),
      rules: templateForm.rules.map((r) => ({
        fieldName: r.fieldName,
        newValue: r.newValue,
        condition: r.condition || { enabled: false, fieldName: '', operator: '=', value: '' },
        description: r.description || '',
      })),
    })

    message.success(editingTemplate.value ? '模板更新成功' : '模板保存成功')
    closeSaveModal()
  } catch {
    message.error('保存模板失败')
  }
}

const handleDeleteTemplate = (templateId) => {
  const success = templateManager.deleteTemplate(templateId)
  if (success) {
    message.success('模板已删除')
  } else {
    message.error('删除失败，模板不存在')
  }
}

const handleLoadTemplate = (template) => {
  const fullTemplate = templateManager.getTemplateById(template.id)
  if (fullTemplate) {
    emit('load', fullTemplate.rules)
    templateManager.closeTemplateDrawer()
    message.success(`已加载模板 "${template.name}"，包含 ${fullTemplate.rules.length} 条规则`)
  }
}

const handleExportTemplate = (template) => {
  templateManager.exportTemplate(template.id, 'json')
  message.success(`已导出模板 "${template.name}"`)
  emit('export', template)
}

const handleExportAll = () => {
  const allTemplates = {
    exportedAt: new Date().toISOString(),
    version: '1.0',
    templates: templateManager.templates.value,
  }

  const blob = new Blob([JSON.stringify(allTemplates, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `batch_edit_templates_${new Date().toISOString().slice(0, 10)}.json`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)

  message.success(`已导出全部 ${templateManager.templateCount.value} 个模板`)
}

const beforeImportUpload = (file) => {
  const isJson = file.name.endsWith('.json')
  if (!isJson) {
    message.error('只支持 JSON 格式文件')
    return false
  }
  return true
}

const handleConfirmImport = async () => {
  let jsonData = null

  if (importFileList.value.length > 0) {
    const file = importFileList.value[0].originFileObj
    try {
      const text = await file.text()
      jsonData = text
    } catch {
      message.error('读取文件失败')
      return
    }
  } else if (importText.value.trim()) {
    jsonData = importText.value.trim()
  } else {
    message.warning('请上传文件或粘贴 JSON 内容')
    return
  }

  importing.value = true

  try {
    const template = templateManager.importTemplate(jsonData)
    message.success(`成功导入模板 "${template.name}"`)
    closeImportModal()
  } catch (error) {
    message.error('导入失败: ' + error.message)
  } finally {
    importing.value = false
  }
}

const closeImportModal = () => {
  importModalVisible.value = false
  importFileList.value = []
  importText.value = ''
}

const handleResetToDefault = () => {
  templateManager.resetToDefaultTemplates()
  message.success('已恢复默认模板')
}

const handleClearAll = () => {
  templateManager.clearAllTemplates()
  message.success('已清空所有模板')
}

watch(
  () => props.currentRules,
  (newRules) => {
    if (saveModalVisible.value && !editingTemplate.value) {
      templateForm.rules = newRules.map((r) => ({
        ...r,
        condition: r.condition || { enabled: false, fieldName: '', operator: '=', value: '' },
      }))
    }
  },
  { deep: true },
)

defineExpose({
  openImportModal: () => {
    importModalVisible.value = true
  },
  openSaveModal,
})
</script>

<style scoped>
.template-header {
  margin-bottom: 16px;
}

.template-list {
  max-height: calc(100vh - 350px);
  overflow-y: auto;
  contain: content;
}

.template-item {
  padding: 12px;
  background: #fafafa;
  border-radius: 8px;
  margin-bottom: 12px;
  content-visibility: auto;
  contain-intrinsic-size: auto 100px;
}

.template-item:hover {
  background: #f0f0f0;
}

.template-title {
  display: flex;
  align-items: center;
  gap: 8px;
}

.template-meta {
  margin-top: 8px;
  color: #999;
  font-size: 12px;
}

.meta-item {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-right: 12px;
}

.template-footer {
  margin-top: 16px;
}

.template-footer .ant-btn {
  margin-bottom: 8px;
}
</style>
