<template>
  <div class="text-input-panel">
    <!-- 工具栏：类型选择 + 操作按钮 -->
    <div class="panel-toolbar">
      <a-radio-group
        :value="localExtractType"
        button-style="solid"
        size="small"
        @change="handleTypeChange"
      >
        <a-radio-button value="auto"
          ><ThunderboltOutlined />自动检测</a-radio-button
        >
        <a-radio-button value="sql"><CodeOutlined />仅 SQL</a-radio-button>
        <a-radio-button value="json"
          ><ApartmentOutlined />仅 JSON</a-radio-button
        >
      </a-radio-group>
      <a-space :size="8">
        <a-button type="primary" :loading="loading" @click="handleExtract"
          ><template #icon><SearchOutlined /></template>提取参数</a-button
        >
        <a-button @click="handleClear"
          ><template #icon><ClearOutlined /></template>清空</a-button
        >
      </a-space>
    </div>

    <!-- TextArea 输入区 -->
    <div class="panel-body">
      <a-textarea
        ref="textareaRef"
        :value="internalValue"
        :placeholder="placeholder"
        :auto-size="{ minRows: rows, maxRows: 20 }"
        class="input-textarea"
        @change="handleChange"
        @keydown.ctrl.enter="handleShortcutExtract"
      />
    </div>

    <!-- 状态栏：字数 + 快捷键提示 -->
    <div class="panel-statusbar">
      <span><FileTextOutlined /> 字数：{{ charCount }}</span>
      <span class="shortcut-hint"><EnterOutlined /> Ctrl+Enter 提取</span>
    </div>

    <!-- 高级选项折叠面板 -->
    <a-collapse
      v-model:activeKey="collapseActiveKey"
      ghost
      class="advanced-options"
    >
      <a-collapse-panel key="advanced" header="高级选项">
        <div class="options-grid">
          <div class="option-item">
            <span>自动提取</span
            ><a-switch
              :checked="localAutoExtract"
              size="small"
              @change="handleAutoExtractChange"
            />
          </div>
          <template v-if="showJsonOptions">
            <div class="option-item">
              <span>展开嵌套对象</span
              ><a-switch
                :checked="localFlattenNested"
                size="small"
                @change="handleFlattenNestedChange"
              />
            </div>
            <div class="option-item">
              <span>包含数组索引</span
              ><a-switch
                :checked="localIncludeArrayIndex"
                size="small"
                @change="handleIncludeArrayIndexChange"
              />
            </div>
          </template>
        </div>
      </a-collapse-panel>
    </a-collapse>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from "vue";
import {
  ThunderboltOutlined,
  CodeOutlined,
  ApartmentOutlined,
  SearchOutlined,
  ClearOutlined,
  FileTextOutlined,
  EnterOutlined,
} from "@ant-design/icons-vue";

/** 提取类型 */
type ExtractType = "auto" | "sql" | "json";

interface Props {
  modelValue: string;
  extractType: ExtractType;
  loading?: boolean;
  autoExtract?: boolean;
  flattenNested?: boolean;
  includeArrayIndex?: boolean;
  placeholder?: string;
  rows?: number;
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  autoExtract: false,
  flattenNested: false,
  includeArrayIndex: false,
  placeholder: "请粘贴 SQL 语句或 JSON 数据...",
  rows: 8,
});

const emit = defineEmits<{
  "update:modelValue": [value: string];
  extract: [];
  clear: [];
  "update:extractType": [value: ExtractType];
  "update:autoExtract": [value: boolean];
  "update:flattenNested": [value: boolean];
  "update:includeArrayIndex": [value: boolean];
}>();

// 内部状态
const internalValue = ref(props.modelValue);
const localExtractType = ref<ExtractType>(props.extractType);
const localAutoExtract = ref(props.autoExtract);
const localFlattenNested = ref(props.flattenNested);
const localIncludeArrayIndex = ref(props.includeArrayIndex);
const collapseActiveKey = ref<string[]>([]);
const textareaRef = ref();

// 计算属性
const charCount = computed(() => internalValue.value.length);
const showJsonOptions = computed(
  () => localExtractType.value === "auto" || localExtractType.value === "json",
);

// 同步外部props变化
watch(
  () => props.modelValue,
  (val) => {
    if (val !== internalValue.value) internalValue.value = val;
  },
);
watch(
  () => props.extractType,
  (val) => {
    localExtractType.value = val;
  },
);
watch(
  () => props.autoExtract,
  (val) => {
    localAutoExtract.value = val;
  },
);
watch(
  () => props.flattenNested,
  (val) => {
    localFlattenNested.value = val;
  },
);
watch(
  () => props.includeArrayIndex,
  (val) => {
    localIncludeArrayIndex.value = val;
  },
);

// 事件处理
const handleChange = (e: Event) => {
  const target = e.target as HTMLTextAreaElement;
  internalValue.value = target.value;
  emit("update:modelValue", target.value);
};

const handleTypeChange = (e: Event) => {
  const target = e.target as HTMLInputElement;
  localExtractType.value = target.value as ExtractType;
  emit("update:extractType", localExtractType.value);
};
const handleExtract = () => emit("extract");
const handleClear = () => {
  internalValue.value = "";
  emit("update:modelValue", "");
  emit("clear");
};
const handleShortcutExtract = (e: KeyboardEvent) => {
  e.preventDefault();
  handleExtract();
};
const handleAutoExtractChange = (v: boolean) => {
  localAutoExtract.value = v;
  emit("update:autoExtract", v);
};
const handleFlattenNestedChange = (v: boolean) => {
  localFlattenNested.value = v;
  emit("update:flattenNested", v);
};
const handleIncludeArrayIndexChange = (v: boolean) => {
  localIncludeArrayIndex.value = v;
  emit("update:includeArrayIndex", v);
};

defineExpose({
  getValue: () => internalValue.value,
  setValue: (v: string) => {
    internalValue.value = v;
    emit("update:modelValue", v);
  },
  focus: () => {
    textareaRef.value?.focus?.();
  },
});
</script>

<style scoped lang="scss">
.text-input-panel {
  display: flex;
  flex-direction: column;
  background: $card-bg;
  border: 1px solid $border-default;
  border-radius: $border-radius-md;
  overflow: hidden;
}

.panel-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  background: $bg-elevated;
  border-bottom: 1px solid $border-default;
  gap: 12px;
}

.panel-body {
  padding: 12px 16px;
}

.input-textarea {
  width: 100%;
  font-family: "Monaco", "Menlo", monospace;
  font-size: 13px;
  line-height: 1.6;
  resize: vertical;

  &:focus {
    box-shadow: 0 0 0 2px $color-primary-border;
  }
}

:deep(.ant-input) {
  background: $code-bg;
  border-color: $code-border;
  color: $text-primary;
  &::placeholder {
    color: $text-disabled;
  }
}

.panel-statusbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 16px;
  background: $bg-sunken;
  border-top: 1px solid $border-light;
  font-size: 12px;
  color: $text-secondary;

  span {
    display: flex;
    align-items: center;
    gap: 4px;
  }
}

.shortcut-hint {
  opacity: 0.7;
}

.advanced-options {
  border-top: 1px solid $border-light;

  :deep(.ant-collapse-header) {
    padding: 8px 16px !important;
    font-size: 13px;
    color: $text-secondary;
  }
  :deep(.ant-collapse-content-box) {
    padding: 12px 16px !important;
  }
}

.options-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}

.option-item {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 160px;
  span {
    font-size: 13px;
    color: $text-secondary;
    white-space: nowrap;
  }
}

@media (max-width: 768px) {
  .panel-toolbar {
    flex-direction: column;
    padding: 8px 12px;
  }
  .panel-body {
    padding: 8px 12px;
  }
  .options-grid {
    flex-direction: column;
    gap: 12px;
  }
  .option-item {
    min-width: unset;
  }
}
</style>
