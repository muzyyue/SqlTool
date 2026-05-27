<template>
  <VbenGlassCard title="高级数据处理" class="advanced-card">
    <a-form :model="localAdvancedConfig" layout="vertical">
      <a-form-item label="源数据工作表" v-if="hasMultipleSheets">
        <a-select
          v-model:value="localAdvancedConfig.sourceSheetName"
          placeholder="选择源数据工作表"
          @change="handleSourceSheetChange"
          style="width: 300px"
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
          <span class="hint-text"> 选择包含源数据列的工作表 </span>
        </template>
      </a-form-item>

      <a-alert
        v-if="localAdvancedConfig.sourceSheetName && sourceWorksheet"
        type="info"
        show-icon
        style="margin-bottom: 16px"
      >
        <template #message>
          <div class="sheet-info">
            <div class="sheet-info-item">
              <span class="sheet-info-label">工作表名称:</span>
              <span class="sheet-info-value">{{
                localAdvancedConfig.sourceSheetName
              }}</span>
            </div>
            <div class="sheet-info-item">
              <span class="sheet-info-label">列数:</span>
              <span class="sheet-info-value">{{ sourceColumns.length }}</span>
            </div>
            <div class="sheet-info-item">
              <span class="sheet-info-label">行数:</span>
              <span class="sheet-info-value">{{ sheetRowCount }}</span>
            </div>
          </div>
        </template>
      </a-alert>

      <a-form-item label="源数据列">
        <a-select
          v-model:value="localAdvancedConfig.sourceColumnForSplit"
          placeholder="选择源数据列（用于分割）"
          show-search
          :filter-option="filterOption"
          style="width: 300px"
          @change="handleSourceColumnForSplitChange"
        >
          <a-select-option
            v-for="col in sourceColumns"
            :key="col.letter"
            :value="col.letter"
          >
            {{ col.letter }} ({{ col.name }})
          </a-select-option>
        </a-select>
        <template #extra>
          <span class="hint-text"> 选择包含需要分割的数据的列 </span>
        </template>
      </a-form-item>

      <a-form-item label="数据分割符">
        <a-select
          v-model:value="localAdvancedConfig.splitDelimiterType"
          placeholder="选择分割符"
          style="width: 300px"
          @change="handleSplitDelimiterTypeChange"
        >
          <a-select-option
            v-for="option in splitDelimiterOptions"
            :key="option.value"
            :value="option.value"
          >
            {{ option.label }}
          </a-select-option>
        </a-select>
        <a-input
          v-if="isCustomSplitDelimiter"
          v-model:value="localAdvancedConfig.customSplitDelimiter"
          placeholder="请输入自定义分割符"
          style="width: 300px; margin-top: 8px"
        />
        <template #extra>
          <span class="hint-text"> 用于分割源列中的多个数据项 </span>
        </template>
      </a-form-item>

      <a-form-item label="查询匹配工作表" v-if="hasMultipleSheets">
        <a-select
          v-model:value="localAdvancedConfig.matchSheetName"
          placeholder="选择查询匹配工作表"
          @change="handleMatchSheetChange"
          style="width: 300px"
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
          <span class="hint-text"> 选择包含查询匹配列和提取列的工作表 </span>
        </template>
      </a-form-item>

      <a-alert
        v-if="localAdvancedConfig.matchSheetName && matchWorksheet"
        type="info"
        show-icon
        style="margin-bottom: 16px"
      >
        <template #message>
          <div class="sheet-info">
            <div class="sheet-info-item">
              <span class="sheet-info-label">工作表名称:</span>
              <span class="sheet-info-value">{{
                localAdvancedConfig.matchSheetName
              }}</span>
            </div>
            <div class="sheet-info-item">
              <span class="sheet-info-label">列数:</span>
              <span class="sheet-info-value">{{ matchColumns.length }}</span>
            </div>
            <div class="sheet-info-item">
              <span class="sheet-info-label">行数:</span>
              <span class="sheet-info-value">{{ matchSheetRowCount }}</span>
            </div>
          </div>
        </template>
      </a-alert>

      <a-form-item label="查询匹配列">
        <a-select
          v-model:value="localAdvancedConfig.matchColumn"
          placeholder="选择用于匹配查询的列"
          show-search
          :filter-option="filterOption"
          style="width: 300px"
          @change="handleMatchColumnChange"
        >
          <a-select-option
            v-for="col in matchColumns"
            :key="col.letter"
            :value="col.letter"
          >
            {{ col.letter }} ({{ col.name }})
          </a-select-option>
        </a-select>
        <template #extra>
          <span class="hint-text"> 在此列中查找与分割后的数据项匹配的行 </span>
        </template>
      </a-form-item>

      <a-form-item label="提取列选择">
        <a-select
          v-model:value="localAdvancedConfig.extractColumns"
          mode="multiple"
          placeholder="选择需要提取的列"
          show-search
          :filter-option="filterOption"
          style="width: 100%"
          @change="handleExtractColumnsChange"
        >
          <a-select-option
            v-for="col in matchColumns"
            :key="col.letter"
            :value="col.letter"
          >
            {{ col.letter }} ({{ col.name }})
          </a-select-option>
        </a-select>
        <template #extra>
          <span class="hint-text"> 从匹配到的行中提取指定列的数据 </span>
        </template>
      </a-form-item>

      <a-form-item label="目标工作表" v-if="hasMultipleSheets">
        <a-select
          v-model:value="localAdvancedConfig.targetSheetName"
          placeholder="选择目标工作表（可选）"
          @change="handleTargetSheetChange"
          style="width: 300px"
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
          <span class="hint-text"> 选择用于填充数据的目标工作表 </span>
        </template>
      </a-form-item>
      <a-form-item label="结果拼接符">
        <a-input
          v-model:value="localAdvancedConfig.joinDelimiter"
          placeholder="请输入拼接符，如：, 或 ; 或 空格"
          style="width: 300px"
        />
        <template #extra>
          <span class="hint-text"> 用于拼接多个提取的数据项 </span>
        </template>
      </a-form-item>

      <a-form-item label="结果填充列">
        <a-select
          v-model:value="localAdvancedConfig.resultColumn"
          placeholder="选择结果填充列（可选）"
          show-search
          :filter-option="filterOption"
          allow-clear
          style="width: 300px"
          @change="handleResultColumnChange"
        >
          <a-select-option
            v-for="col in sourceColumns"
            :key="col.letter"
            :value="col.letter"
          >
            {{ col.letter }} ({{ col.name }})
          </a-select-option>
        </a-select>
        <template #extra>
          <span class="hint-text"> 不选择则填充到源工作表的结果列 </span>
        </template>
      </a-form-item>

      <a-alert
        v-if="localAdvancedConfig.targetSheetName && targetWorksheet"
        type="info"
        show-icon
        style="margin-bottom: 16px"
      >
        <template #message>
          <div class="sheet-info">
            <div class="sheet-info-item">
              <span class="sheet-info-label">工作表名称:</span>
              <span class="sheet-info-value">{{
                localAdvancedConfig.targetSheetName
              }}</span>
            </div>
            <div class="sheet-info-item">
              <span class="sheet-info-label">列数:</span>
              <span class="sheet-info-value">{{ targetColumns.length }}</span>
            </div>
            <div class="sheet-info-item">
              <span class="sheet-info-label">行数:</span>
              <span class="sheet-info-value">{{ targetSheetRowCount }}</span>
            </div>
          </div>
        </template>
      </a-alert>

      <a-form-item
        label="目标填充列"
        v-if="localAdvancedConfig.targetSheetName"
      >
        <a-select
          v-model:value="localAdvancedConfig.targetColumn"
          placeholder="选择目标工作表中的填充列"
          show-search
          :filter-option="filterOption"
          allow-clear
          style="width: 300px"
          @change="handleTargetColumnChange"
        >
          <a-select-option
            v-for="col in targetColumns"
            :key="col.letter"
            :value="col.letter"
          >
            {{ col.letter }} ({{ col.name }})
          </a-select-option>
        </a-select>
        <template #extra>
          <span class="hint-text"> 选择目标工作表中用于填充数据的列 </span>
        </template>
      </a-form-item>

      <a-form-item label="未匹配处理">
        <a-radio-group v-model:value="localAdvancedConfig.noMatchAction">
          <a-radio value="skip">跳过处理</a-radio>
          <a-radio value="default">使用默认值</a-radio>
        </a-radio-group>
      </a-form-item>

      <a-form-item
        label="默认值"
        v-if="localAdvancedConfig.noMatchAction === 'default'"
      >
        <a-input
          v-model:value="localAdvancedConfig.defaultValue"
          placeholder="请输入默认值"
          style="width: 300px"
        />
      </a-form-item>

      <a-form-item label="处理进度">
        <a-progress
          :percent="processingProgress"
          :status="processingStatus"
          :stroke-color="progressColor"
        />
        <template #extra>
          <span class="hint-text">{{ processingStatusText }}</span>
        </template>
      </a-form-item>

      <a-form-item>
        <a-button
          type="primary"
          size="large"
          :loading="processing"
          :disabled="!canProcessAdvanced"
          @click="handleProcess"
          block
        >
          <template #icon>
            <PlayCircleOutlined />
          </template>
          开始高级数据处理
        </a-button>
      </a-form-item>
    </a-form>
  </VbenGlassCard>
</template>

<script setup>
/**
 * @fileoverview 高级数据处理Tab组件
 * @description 提供Excel数据的高级处理功能，包括数据分割、查询匹配、提取和拼接等
 * @author SqlTool
 */
import { computed } from "vue";
import { PlayCircleOutlined } from "@ant-design/icons-vue";
import VbenGlassCard from "@/components/common/VbenGlassCard.vue";
import * as XLSX from "xlsx";

/**
 * 组件Props定义
 * @typedef {Object} Props
 */
const props = defineProps({
  /** 高级配置对象 */
  advancedConfig: {
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
  /** 源数据列列表 */
  sourceColumns: {
    type: Array,
    default: () => [],
  },
  /** 源工作表对象 */
  sourceWorksheet: {
    type: Object,
    default: null,
  },
  /** 匹配工作表对象 */
  matchWorksheet: {
    type: Object,
    default: null,
  },
  /** 匹配列列表 */
  matchColumns: {
    type: Array,
    default: () => [],
  },
  /** 目标工作表对象 */
  targetWorksheet: {
    type: Object,
    default: null,
  },
  /** 是否多工作表 */
  hasMultipleSheets: {
    type: Boolean,
    default: false,
  },
  /** 是否可处理 */
  canProcessAdvanced: {
    type: Boolean,
    default: false,
  },
  /** 处理中状态 */
  processing: {
    type: Boolean,
    default: false,
  },
  /** 处理进度 */
  processingProgress: {
    type: Number,
    default: 0,
  },
  /** 处理状态文本 */
  processingStatusText: {
    type: String,
    default: "",
  },
  /** 进度条颜色 */
  progressColor: {
    type: String,
    default: "#d9d9d9",
  },
  /** 分割符选项 */
  splitDelimiterOptions: {
    type: Array,
    default: () => [],
  },
  /** 是否自定义分割符 */
  isCustomSplitDelimiter: {
    type: Boolean,
    default: false,
  },
  /** 下拉过滤函数 */
  filterOption: {
    type: Function,
    default: () => true,
  },
});

/**
 * 定义组件事件
 */
const emit = defineEmits([
  "update:advancedConfig",
  "sourceSheetChange",
  "sourceColumnForSplitChange",
  "splitDelimiterTypeChange",
  "matchSheetChange",
  "matchColumnChange",
  "extractColumnsChange",
  "resultColumnChange",
  "targetSheetChange",
  "targetColumnChange",
  "process",
]);

/**
 * 本地高级配置对象（双向绑定）
 */
const localAdvancedConfig = computed({
  get: () => props.advancedConfig,
  set: (value) => emit("update:advancedConfig", value),
});

/**
 * 获取工作表行数
 * @param {Object} worksheet - 工作表对象
 * @returns {number} 行数
 */
const sheetRowCount = computed(() => {
  if (!props.sourceWorksheet || !props.sourceWorksheet["!ref"]) return 0;
  const range = XLSX.utils.decode_range(props.sourceWorksheet["!ref"]);
  return range.e.r + 1;
});

/**
 * 获取匹配工作表行数
 * @returns {number} 行数
 */
const matchSheetRowCount = computed(() => {
  if (!props.matchWorksheet || !props.matchWorksheet["!ref"]) return 0;
  const range = XLSX.utils.decode_range(props.matchWorksheet["!ref"]);
  return range.e.r + 1;
});

/**
 * 获取目标工作表行数
 * @returns {number} 行数
 */
const targetSheetRowCount = computed(() => {
  if (!props.targetWorksheet || !props.targetWorksheet["!ref"]) return 0;
  const range = XLSX.utils.decode_range(props.targetWorksheet["!ref"]);
  return range.e.r + 1;
});

/**
 * 处理源数据工作表变更
 * @param {string} sheetName - 新的工作表名称
 */
const handleSourceSheetChange = (sheetName) => {
  emit("sourceSheetChange", sheetName);
};

/**
 * 处理目标工作表变更
 * @param {string} sheetName - 新的工作表名称
 */
const handleTargetSheetChange = (sheetName) => {
  emit("targetSheetChange", sheetName);
};

/**
 * 处理源数据列变更
 * @param {string} value - 选中的列值
 */
const handleSourceColumnForSplitChange = (value) => {
  emit("sourceColumnForSplitChange", value);
};

/**
 * 处理分割符类型变更
 * @param {string} type - 分割符类型
 */
const handleSplitDelimiterTypeChange = (type) => {
  emit("splitDelimiterTypeChange", type);
};

/**
 * 处理匹配工作表变更
 * @param {string} sheetName - 新的工作表名称
 */
const handleMatchSheetChange = (sheetName) => {
  emit("matchSheetChange", sheetName);
};

/**
 * 处理查询匹配列变更
 * @param {string} value - 选中的列值
 */
const handleMatchColumnChange = (value) => {
  emit("matchColumnChange", value);
};

/**
 * 处理提取列变更
 * @param {Array} value - 选中的列值数组
 */
const handleExtractColumnsChange = (value) => {
  emit("extractColumnsChange", value);
};

/**
 * 处理结果填充列变更
 * @param {string} value - 选中的列值
 */
const handleResultColumnChange = (value) => {
  emit("resultColumnChange", value);
};

/**
 * 处理目标填充列变更
 * @param {string} value - 选中的列值
 */
const handleTargetColumnChange = (value) => {
  emit("targetColumnChange", value);
};

/**
 * 处理开始处理按钮点击
 */
const handleProcess = () => {
  emit("process");
};
</script>

<style scoped lang="scss">
.advanced-card {
  padding: 32px;
  contain: layout style;
  will-change: auto;
}

.hint-text {
  font-size: 12px;
  color: $text-secondary;
}

.sheet-info {
  @include flex-column;
  gap: 8px;
}

.sheet-info-item {
  display: flex;
  gap: 8px;
}

.sheet-info-label {
  font-weight: 500;
  color: $text-secondary;
}

.sheet-info-value {
  font-weight: 600;
  color: $color-primary;
}
</style>
