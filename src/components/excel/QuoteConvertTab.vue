<template>
  <VbenGlassCard title="引号转换配置" class="quote-card">
    <a-form :model="localQuoteConfig" layout="vertical">
      <a-form-item label="工作表">
        <a-select
          v-model:value="localQuoteConfig.sheetName"
          placeholder="选择工作表"
          @change="handleSheetChange"
        >
          <a-select-option
            v-for="sheet in sheetNames"
            :key="sheet"
            :value="sheet"
          >
            {{ sheet }}
          </a-select-option>
        </a-select>
        <template #extra>
          <span class="hint-text"> 选择要处理的工作表 </span>
        </template>
      </a-form-item>
      <a-form-item label="源列">
        <a-select
          v-model:value="localQuoteConfig.sourceColumn"
          placeholder="选择源列"
          show-search
          :filter-option="filterOption"
        >
          <a-select-option
            v-for="col in columns"
            :key="col.letter"
            :value="col.letter"
          >
            {{ col.letter }} ({{ col.name }})
          </a-select-option>
        </a-select>
      </a-form-item>
      <a-form-item label="分隔符">
        <a-select v-model:value="localQuoteConfig.delimiter">
          <a-select-option value="comma">逗号 (,)</a-select-option>
          <a-select-option value="semicolon">分号 (;)</a-select-option>
          <a-select-option value="space">空格</a-select-option>
          <a-select-option value="newline">换行</a-select-option>
          <a-select-option value="custom">自定义</a-select-option>
        </a-select>
      </a-form-item>
      <a-form-item
        label="自定义分隔符"
        v-if="localQuoteConfig.delimiter === 'custom'"
      >
        <a-input
          v-model:value="localQuoteConfig.customDelimiter"
          placeholder="请输入自定义分隔符"
        />
      </a-form-item>
      <a-form-item label="引号样式">
        <a-radio-group v-model:value="localQuoteConfig.quoteStyle">
          <a-radio value="double">双引号 (")</a-radio>
          <a-radio value="single">单引号 (')</a-radio>
        </a-radio-group>
      </a-form-item>
      <a-form-item label="目标列">
        <a-select
          v-model:value="localQuoteConfig.targetColumn"
          placeholder="选择目标列（可选，默认新增）"
          show-search
          :filter-option="filterOption"
          allow-clear
        >
          <a-select-option
            v-for="col in columns"
            :key="col.letter"
            :value="col.letter"
          >
            {{ col.letter }} ({{ col.name }})
          </a-select-option>
        </a-select>
      </a-form-item>
    </a-form>
    <a-form-item>
      <a-button
        type="primary"
        size="large"
        :loading="quoteProcessing"
        :disabled="!canProcessQuote"
        @click="handleProcess"
        block
      >
        <template #icon>
          <PlayCircleOutlined />
        </template>
        开始引号转换
      </a-button>
    </a-form-item>
    <a-form-item label="转换进度" v-if="quoteProcessing || quoteProgress > 0">
      <a-progress
        :percent="quoteProgress"
        :status="quoteProgress === 100 ? 'success' : 'active'"
      />
      <template #extra>
        <span class="hint-text">{{ quoteStatusText }}</span>
      </template>
    </a-form-item>
  </VbenGlassCard>
</template>

<script setup>
/**
 * @fileoverview 引号转换Tab组件
 * @description 提供Excel数据的引号转换功能，支持多种分隔符和引号样式
 * @author SqlTool
 */

import { computed } from "vue";
import { PlayCircleOutlined } from "@ant-design/icons-vue";
import VbenGlassCard from "@/components/common/VbenGlassCard.vue";

/**
 * 组件Props定义
 * @typedef {Object} Props
 */
const props = defineProps({
  /** 引号配置对象 */
  quoteConfig: {
    type: Object,
    required: true,
  },
  /** 工作表名称列表 */
  sheetNames: {
    type: Array,
    default: () => [],
  },
  /** 源列列表 */
  columns: {
    type: Array,
    default: () => [],
  },
  /** 是否可处理 */
  canProcessQuote: {
    type: Boolean,
    default: false,
  },
  /** 处理中状态 */
  quoteProcessing: {
    type: Boolean,
    default: false,
  },
  /** 处理进度 */
  quoteProgress: {
    type: Number,
    default: 0,
  },
  /** 处理状态文本 */
  quoteStatusText: {
    type: String,
    default: "",
  },
  /** 下拉过滤函数 */
  filterOption: {
    type: Function,
    default: () => true,
  },
});

/**
 * 组件Emits定义
 */
const emit = defineEmits(["update:quoteConfig", "sheetChange", "process"]);

/**
 * 本地引号配置对象（双向绑定）
 */
const localQuoteConfig = computed({
  get: () => props.quoteConfig,
  set: (value) => emit("update:quoteConfig", value),
});

/**
 * 处理工作表变更
 * @param {string} sheetName - 新的工作表名称
 */
const handleSheetChange = (sheetName) => {
  emit("sheetChange", sheetName);
};

/**
 * 处理开始处理按钮点击
 */
const handleProcess = () => {
  emit("process");
};
</script>

<style scoped lang="scss">
.quote-card {
  padding: 32px;
  contain: layout style;
  will-change: auto;
}

.hint-text {
  font-size: 12px;
  color: $text-secondary;
}

@include respond-to(lg) {
  .quote-card {
    padding: 24px;
  }
}
</style>
