<template>
  <div class="json-toolbar">
    <!-- 左侧按钮组 -->
    <div class="toolbar-left">
      <a-radio-group v-model:value="viewMode" button-style="solid" size="small" @change="handleViewModeChange">
        <a-radio-button value="tree">
          <ApartmentOutlined />
          树视图
        </a-radio-button>
        <a-radio-button value="code">
          <CodeOutlined />
          代码
        </a-radio-button>
      </a-radio-group>

      <a-divider type="vertical" />

      <a-space :size="8">
        <a-button size="small" @click="handleFormat">
          <template #icon><FormatPainterOutlined /></template>
          格式化
        </a-button>
        <a-button size="small" @click="handleCompress">
          <template #icon><CompressOutlined /></template>
          压缩
        </a-button>
        <a-button size="small" @click="handleEscape">
          <template #icon><LinkOutlined /></template>
          转义
        </a-button>
        <a-button size="small" @click="handleUnescape">
          <template #icon><DisconnectOutlined /></template>
          反转义
        </a-button>
      </a-space>

      <a-divider type="vertical" />

      <a-space :size="8">
        <a-button size="small" @click="handleExpandAll">
          <template #icon><DownOutlined /></template>
          全展开
        </a-button>
        <a-button size="small" @click="handleCollapseAll">
          <template #icon><RightOutlined /></template>
          全折叠
        </a-button>
      </a-space>
    </div>

    <!-- 右侧设置组 -->
    <div class="toolbar-right">
      <a-space :size="8">
        <span class="setting-label">缩进：</span>
        <a-select v-model:value="indentSpaces" size="small" style="width: 80px" @change="handleIndentChange">
          <a-select-option :value="2">2 空格</a-select-option>
          <a-select-option :value="4">4 空格</a-select-option>
        </a-select>

        <span class="setting-label">字体：</span>
        <a-select v-model:value="fontSize" size="small" style="width: 80px" @change="handleFontSizeChange">
          <a-select-option :value="12">12px</a-select-option>
          <a-select-option :value="14">14px</a-select-option>
          <a-select-option :value="16">16px</a-select-option>
          <a-select-option :value="18">18px</a-select-option>
        </a-select>

        <a-button size="small" @click="handleDownload">
          <template #icon><DownloadOutlined /></template>
          下载
        </a-button>
      </a-space>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import {
  ApartmentOutlined,
  CodeOutlined,
  FormatPainterOutlined,
  CompressOutlined,
  LinkOutlined,
  DisconnectOutlined,
  DownOutlined,
  RightOutlined,
  DownloadOutlined,
} from '@ant-design/icons-vue'

/**
 * 组件属性定义
 */
interface Props {
  /** 当前视图模式 */
  modelViewMode?: 'tree' | 'code'
  /** 缩进空格数 */
  modelIndentSpaces?: number
  /** 字体大小 */
  modelFontSize?: number
}

const props = withDefaults(defineProps<Props>(), {
  modelViewMode: 'tree',
  modelIndentSpaces: 2,
  modelFontSize: 14,
})

/**
 * 组件事件定义
 */
const emit = defineEmits<{
  'update:modelViewMode': [value: 'tree' | 'code']
  'update:modelIndentSpaces': [value: number]
  'update:modelFontSize': [value: number]
  format: []
  compress: []
  escape: []
  unescape: []
  expandAll: []
  collapseAll: []
  download: []
}>()

const viewMode = ref<'tree' | 'code'>(props.modelViewMode)
const indentSpaces = ref(props.modelIndentSpaces)
const fontSize = ref(props.modelFontSize)

watch(
  () => props.modelViewMode,
  (val) => {
    viewMode.value = val
  },
)

watch(
  () => props.modelIndentSpaces,
  (val) => {
    indentSpaces.value = val
  },
)

watch(
  () => props.modelFontSize,
  (val) => {
    fontSize.value = val
  },
)

const handleViewModeChange = () => {
  emit('update:modelViewMode', viewMode.value)
}

const handleIndentChange = () => {
  emit('update:modelIndentSpaces', indentSpaces.value)
}

const handleFontSizeChange = () => {
  emit('update:modelFontSize', fontSize.value)
}

const handleFormat = () => {
  emit('format')
}

const handleCompress = () => {
  emit('compress')
}

const handleEscape = () => {
  emit('escape')
}

const handleUnescape = () => {
  emit('unescape')
}

const handleExpandAll = () => {
  emit('expandAll')
}

const handleCollapseAll = () => {
  emit('collapseAll')
}

const handleDownload = () => {
  emit('download')
}
</script>

<style scoped lang="scss">
.json-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
  background: $bg-elevated;
  border-bottom: 1px solid $border-default;
  min-height: 40px;
  contain: layout;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.toolbar-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.setting-label {
  font-size: 13px;
  color: $text-secondary;
}

:deep(.ant-radio-group) {
  .ant-radio-button-wrapper {
    height: 28px;
    line-height: 26px;
    font-size: 13px;
  }
}

:deep(.ant-btn-sm) {
  height: 28px;
  font-size: 13px;
}

:deep(.ant-select-sm) {
  .ant-select-selector {
    height: 28px !important;
  }
}

@media (max-width: 768px) {
  .json-toolbar {
    flex-direction: column;
    gap: 8px;
    padding: 8px 12px;
  }

  .toolbar-left,
  .toolbar-right {
    width: 100%;
    justify-content: flex-start;
    flex-wrap: wrap;
  }
}
</style>
