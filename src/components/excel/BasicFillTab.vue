<template>
  <VbenGlassCard title="基础配置" class="config-card">
    <a-form :model="localConfig" layout="vertical">
      <a-form-item label="工作表">
        <a-select
          v-model:value="localConfig.sheetName"
          placeholder="选择源工作表"
          @change="handleSheetChange"
        >
          <a-select-option v-for="sheet in sheetNames" :key="sheet" :value="sheet">
            {{ sheet }}
          </a-select-option>
        </a-select>
      </a-form-item>

      <a-form-item label="源列">
        <a-select
          v-model:value="localConfig.sourceColumn"
          placeholder="选择源列"
          show-search
          :filter-option="filterOption"
          @change="handleSourceColumnChange"
        >
          <a-select-option v-for="col in columns" :key="col.letter" :value="col.letter">
            {{ col.letter }} ({{ col.name }})
          </a-select-option>
        </a-select>
      </a-form-item>

      <a-form-item label="目标工作表">
        <a-select
          v-model:value="localConfig.targetSheetName"
          placeholder="选择目标工作表"
          @change="handleTargetSheetChange"
        >
          <a-select-option v-for="sheet in sheetNames" :key="sheet" :value="sheet">
            {{ sheet }}
          </a-select-option>
        </a-select>
      </a-form-item>

      <a-form-item label="目标列">
        <a-select
          v-model:value="localConfig.targetColumn"
          placeholder="选择目标列"
          show-search
          :filter-option="filterOption"
          @change="handleTargetColumnChange"
        >
          <a-select-option v-for="col in targetColumns" :key="col.letter" :value="col.letter">
            {{ col.letter }} ({{ col.name }})
          </a-select-option>
        </a-select>
      </a-form-item>

      <a-form-item label="数据起始行">
        <a-input-number
          v-model:value="localConfig.startRow"
          :min="1"
          :max="1000"
          placeholder="默认为 2（跳过表头）"
        />
      </a-form-item>

      <a-form-item label="保持合并单元格格式">
        <a-switch v-model:checked="localConfig.keepMergedFormat" />
        <template #extra>
          <span class="hint-text"> 开启后，合并单元格会先解除合并，填充数据后再重新合并 </span>
        </template>
      </a-form-item>
    </a-form>
  </VbenGlassCard>
</template>

<script setup>
/**
 * @fileoverview 基础配置Tab组件
 * @description 提供Excel数据填充的基础配置功能，包括工作表选择、源列/目标列配置等
 * @author SqlTool
 */

import { computed } from 'vue'
import VbenGlassCard from '@/components/common/VbenGlassCard.vue'

/**
 * 组件Props定义
 * @typedef {Object} Props
 * @property {Object} config - 基础配置对象
 * @property {Array} columns - 源列列表
 * @property {Array} sheetNames - 工作表名称列表
 * @property {Array} targetColumns - 目标列列表
 * @property {Function} filterOption - 下拉过滤函数
 */
const props = defineProps({
  /** 基础配置对象 */
  config: {
    type: Object,
    required: true,
  },
  /** 源列列表 */
  columns: {
    type: Array,
    default: () => [],
  },
  /** 工作表名称列表 */
  sheetNames: {
    type: Array,
    default: () => [],
  },
  /** 目标列列表 */
  targetColumns: {
    type: Array,
    default: () => [],
  },
  /** 下拉过滤函数 */
  filterOption: {
    type: Function,
    default: () => true,
  },
})

/**
 * 组件Emits定义
 * @typedef {Object} Emits
 */
const emit = defineEmits([
  'update:config',
  'sheetChange',
  'sourceColumnChange',
  'targetSheetChange',
  'targetColumnChange',
])

/**
 * 本地配置对象（双向绑定）
 * @type {ComputedRef<Object>}
 */
const localConfig = computed({
  get: () => props.config,
  set: (value) => emit('update:config', value),
})

/**
 * 处理工作表变更
 * @param {string} sheetName - 新的工作表名称
 */
const handleSheetChange = (sheetName) => {
  emit('sheetChange', sheetName)
}

/**
 * 处理源列变更
 * @param {string} value - 选中的列值
 */
const handleSourceColumnChange = (value) => {
  emit('sourceColumnChange', value)
}

/**
 * 处理目标工作表变更
 * @param {string} sheetName - 新的工作表名称
 */
const handleTargetSheetChange = (sheetName) => {
  emit('targetSheetChange', sheetName)
}

/**
 * 处理目标列变更
 * @param {string} value - 选中的列值
 */
const handleTargetColumnChange = (value) => {
  emit('targetColumnChange', value)
}
</script>

<style scoped lang="scss">
.config-card {
  padding: 32px;
  contain: layout style;
  will-change: auto;
}

.hint-text {
  font-size: 12px;
  color: $text-secondary;
}

@include respond-to(lg) {
  .config-card {
    padding: 24px;
  }
}
</style>
