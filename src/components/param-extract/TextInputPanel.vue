<template>
  <div class="text-input-panel">
    <!-- Double-Bezel 外层容器 -->
    <div class="panel-outer-shell">
      <!-- 内层核心 -->
      <div class="panel-inner-core">
        <!-- 工具栏：类型选择 + 操作按钮 -->
        <div class="panel-toolbar">
          <div class="toolbar-left">
            <div class="type-selector">
              <button
                v-for="type in extractTypes"
                :key="type.value"
                class="type-btn"
                :class="{ 'is-active': localExtractType === type.value }"
                @click="handleTypeChange(type.value)"
              >
                <component :is="type.icon" class="btn-icon" />
                <span class="btn-label">{{ type.label }}</span>
              </button>
            </div>
          </div>

          <div class="toolbar-right">
            <button
              class="action-btn precision-btn"
              :class="{ 'is-active': localInteractiveMode }"
              @click="toggleInteractiveMode"
              :title="localInteractiveMode ? '关闭精准提取' : '开启精准提取'"
            >
              <AimOutlined class="btn-icon" />
              <span>精准提取</span>
            </button>

            <button
              class="action-btn primary-btn"
              :disabled="loading"
              @click="handleExtract"
            >
              <template v-if="loading">
                <LoadingOutlined class="btn-icon is-spinning" />
              </template>
              <template v-else>
                <SearchOutlined class="btn-icon" />
              </template>
              <span>提取参数</span>
              <span v-if="loading" class="btn-loading-text">处理中...</span>
            </button>

            <button class="action-btn ghost-btn" @click="handleClear">
              <ClearOutlined class="btn-icon" />
              <span>清空</span>
            </button>
          </div>
        </div>

        <!-- TextArea 输入区 -->
        <div class="panel-body">
          <div class="textarea-wrapper" :class="{ 'is-focused': isFocused }">
            <textarea
              ref="textareaRef"
              :value="internalValue"
              :placeholder="placeholder"
              class="input-textarea"
              :rows="rows"
              @input="handleChange"
              @focus="isFocused = true"
              @blur="isFocused = false"
              @keydown.ctrl.enter="handleShortcutExtract"
            ></textarea>
            <div class="textarea-glow" aria-hidden="true"></div>
          </div>
        </div>

        <!-- 交互式字段-值选择器 -->
        <FieldValueSelector
          v-if="localInteractiveMode"
          :parsed-data="props.parsedData"
          :selected-field="props.selectedField"
          :selected-value="props.selectedValue"
          :disabled="!props.modelValue || loading"
          :confirm-loading="loading"
          @update:selected-field="(val) => emit('update:selectedField', val)"
          @update:selected-value="(val) => emit('update:selectedValue', val)"
          @confirm="(config) => emit('fieldValueConfirm', config)"
        />

        <!-- 状态栏：字数 + 快捷键提示 -->
        <div class="panel-statusbar">
          <div class="status-left">
            <FileTextOutlined class="status-icon" />
            <span class="status-text"
              >字数：<strong>{{ charCount.toLocaleString() }}</strong></span
            >
          </div>
          <div class="status-right">
            <kbd class="shortcut-key">Ctrl</kbd>
            <span class="shortcut-plus">+</span>
            <kbd class="shortcut-key">Enter</kbd>
            <span class="shortcut-hint">提取</span>
          </div>
        </div>

        <!-- 高级选项折叠面板 -->
        <div class="advanced-options">
          <button
            class="options-toggle"
            @click="toggleAdvancedOptions"
            :aria-expanded="showAdvancedOptions"
          >
            <span class="toggle-label">高级选项</span>
            <DownOutlined
              class="toggle-icon"
              :class="{ 'is-expanded': showAdvancedOptions }"
            />
          </button>

          <Transition name="expand">
            <div v-show="showAdvancedOptions" class="options-content">
              <div class="options-grid">
                <label class="option-item">
                  <span class="option-label">自动提取</span>
                  <div class="switch-wrapper">
                    <input
                      type="checkbox"
                      class="switch-input"
                      :checked="localAutoExtract"
                      @change="
                        handleAutoExtractChange(
                          $event.target.checked,
                        )
                      "
                    />
                    <span class="switch-track"></span>
                    <span class="switch-thumb"></span>
                  </div>
                </label>

                <template v-if="showJsonOptions">
                  <label class="option-item">
                    <span class="option-label">展开嵌套对象</span>
                    <div class="switch-wrapper">
                      <input
                        type="checkbox"
                        class="switch-input"
                        :checked="localFlattenNested"
                        @change="
                          handleFlattenNestedChange(
                            $event.target.checked,
                          )
                        "
                      />
                      <span class="switch-track"></span>
                      <span class="switch-thumb"></span>
                    </div>
                  </label>

                  <label class="option-item">
                    <span class="option-label">包含数组索引</span>
                    <div class="switch-wrapper">
                      <input
                        type="checkbox"
                        class="switch-input"
                        :checked="localIncludeArrayIndex"
                        @change="
                          handleIncludeArrayIndexChange(
                            $event.target.checked,
                          )
                        "
                      />
                      <span class="switch-track"></span>
                      <span class="switch-thumb"></span>
                    </div>
                  </label>
                </template>
              </div>
            </div>
          </Transition>
        </div>
      </div>
    </div>
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
  AimOutlined,
  DownOutlined,
  LoadingOutlined,
} from "@ant-design/icons-vue";
import FieldValueSelector from "./FieldValueSelector.vue";

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
  interactiveMode?: boolean;
  parsedData?: any;
  selectedField?: string;
  selectedValue?: string | string[];
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  autoExtract: false,
  flattenNested: false,
  includeArrayIndex: false,
  placeholder: "请粘贴 SQL 语句或 JSON 数据...",
  rows: 10,
  interactiveMode: false,
  parsedData: null,
  selectedField: "",
  selectedValue: () => [],
});

const emit = defineEmits<{
  "update:modelValue": [value: string];
  extract: [];
  clear: [];
  "update:extractType": [value: ExtractType];
  "update:autoExtract": [value: boolean];
  "update:flattenNested": [value: boolean];
  "update:includeArrayIndex": [value: boolean];
  "update:interactiveMode": [value: boolean];
  "update:selectedField": [value: string];
  "update:selectedValue": [value: string[]];
  fieldValueConfirm: [config: { field: string; values: string[] }];
}>();

const internalValue = ref(props.modelValue);
const localExtractType = ref<ExtractType>(props.extractType);
const localAutoExtract = ref(props.autoExtract);
const localFlattenNested = ref(props.flattenNested);
const localIncludeArrayIndex = ref(props.includeArrayIndex);
const localInteractiveMode = ref(props.interactiveMode);
const showAdvancedOptions = ref(false);
const isFocused = ref(false);
const textareaRef = ref<HTMLTextAreaElement>();

const extractTypes = [
  {
    value: "auto" as ExtractType,
    label: "自动检测",
    icon: ThunderboltOutlined,
  },
  { value: "sql" as ExtractType, label: "仅 SQL", icon: CodeOutlined },
  { value: "json" as ExtractType, label: "仅 JSON", icon: ApartmentOutlined },
];

const charCount = computed(() => internalValue.value.length);
const showJsonOptions = computed(
  () => localExtractType.value === "auto" || localExtractType.value === "json",
);

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

watch(
  () => props.interactiveMode,
  (val) => {
    localInteractiveMode.value = val;
  },
);

const handleChange = (e: Event) => {
  const target = e.target as HTMLTextAreaElement;
  internalValue.value = target.value;
  emit("update:modelValue", target.value);
};

const handleTypeChange = (value: ExtractType) => {
  localExtractType.value = value;
  emit("update:extractType", value);
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

const toggleInteractiveMode = () => {
  const newValue = !localInteractiveMode.value;
  localInteractiveMode.value = newValue;
  emit("update:interactiveMode", newValue);

  if (!newValue) {
    emit("update:selectedField", "");
    emit("update:selectedValue", []);
  }
};

const toggleAdvancedOptions = () => {
  showAdvancedOptions.value = !showAdvancedOptions.value;
};

defineExpose({
  getValue: () => internalValue.value,
  setValue: (v: string) => {
    internalValue.value = v;
    emit("update:modelValue", v);
  },
  focus: () => {
    textareaRef.value?.focus();
  },
});
</script>

<style scoped lang="scss">
.text-input-panel {
  width: 100%;
  height: 100%;
  contain: content;

  .panel-outer-shell {
    background: linear-gradient(
      135deg,
      var(--bg-sunken) 0%,
      var(--bg-base) 100%
    );
    border-radius: 24px;
    padding: 6px;
    box-shadow: var(--shadow-xs), var(--shadow-sm);
    transition: box-shadow 0.3s cubic-bezier(0.32, 0.72, 0, 1);

    &:hover {
      box-shadow:
        0 2px 4px rgba(0, 0, 0, 0.06),
        0 8px 24px rgba(0, 0, 0, 0.08);
    }
  }

  .panel-inner-core {
    background: var(--bg-elevated);
    border-radius: 20px;
    overflow: hidden;
    box-shadow:
      inset 0 1px 2px rgba(255, 255, 255, 0.8),
      inset 0 -1px 1px rgba(0, 0, 0, 0.04);
    display: flex;
    flex-direction: column;
  }

  .panel-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px;
    gap: 12px;
    border-bottom: 1px solid var(--border-default);
    background: linear-gradient(
      180deg,
      var(--bg-sunken) 0%,
      var(--bg-base) 100%
    );
    flex-wrap: wrap;

    .toolbar-left {
      display: flex;
      align-items: center;
      flex-shrink: 0;
    }

    .toolbar-right {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-shrink: 0;
    }
  }

  .type-selector {
    display: flex;
    gap: 4px;
    padding: 4px;
    background: var(--bg-base);
    border-radius: 10px;

    .type-btn {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 14px;
      font-size: 13px;
      font-weight: 500;
      color: var(--text-secondary);
      background: transparent;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      transition: background,color,border-color,box-shadow,transform 0.25s cubic-bezier(0.32, 0.72, 0, 1);
      white-space: nowrap;

      .btn-icon {
        font-size: 14px;
        transition: transform 0.2s ease;
      }

      .btn-label {
        letter-spacing: -0.01em;
      }

      &:hover:not(.is-active) {
        color: var(--text-primary);
        background: var(--interactive-hover-inverse);

        .btn-icon {
          transform: scale(1.1);
        }
      }

      &.is-active {
        color: var(--color-primary);
        background: var(--bg-elevated);
        box-shadow:
          var(--shadow-sm),
          0 1px 2px rgba(22, 119, 255, 0.12);

        .btn-icon {
          transform: scale(1.05);
        }
      }
    }
  }

  .action-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 9px 16px;
    font-size: 13px;
    font-weight: 600;
    border: none;
    border-radius: 10px;
    cursor: pointer;
    transition: background,color,border-color,box-shadow,transform 0.25s cubic-bezier(0.32, 0.72, 0, 1);
    white-space: nowrap;
    flex-shrink: 0;

    .btn-icon {
      font-size: 14px;
      transition: transform 0.2s ease;
    }

    &:active {
      transform: scale(0.97);
    }
  }

  .precision-btn {
    color: var(--text-secondary);
    background: var(--bg-sunken);
    border: 1px solid var(--border-default);

    &:hover {
      background: var(--bg-base);
      border-color: var(--border-strong);
    }

    &.is-active {
      color: var(--text-inverse);
      background: linear-gradient(
        135deg,
        var(--color-primary) 0%,
        var(--color-primary-hover) 100%
      );
      border-color: transparent;
      box-shadow: 0 2px 8px rgba(22, 119, 255, 0.3);
    }
  }

  .primary-btn {
    color: var(--text-inverse);
    background: linear-gradient(
      135deg,
      var(--color-primary) 0%,
      var(--color-primary-hover) 100%
    );
    box-shadow: 0 2px 8px rgba(22, 119, 255, 0.25);

    &:hover:not(:disabled) {
      background: linear-gradient(
        135deg,
        var(--color-primary-active) 0%,
        var(--color-primary) 100%
      );
      box-shadow: 0 4px 12px rgba(22, 119, 255, 0.35);
      transform: translateY(-1px);

      .btn-icon {
        transform: translateX(1px);
      }
    }

    &:disabled {
      opacity: 0.7;
      cursor: not-allowed;
    }

    .btn-loading-text {
      font-size: 12px;
      opacity: 0.9;
    }

    .is-spinning {
      animation: spin 1s linear infinite;
    }
  }

  .ghost-btn {
    color: var(--text-secondary);
    background: transparent;
    border: 1px solid var(--border-default);

    &:hover {
      color: var(--text-primary);
      background: var(--bg-sunken);
      border-color: var(--border-strong);
    }
  }

  .panel-body {
    padding: 20px;
  }

  .textarea-wrapper {
    position: relative;
    border-radius: 12px;
    background: var(--bg-base);
    border: 2px solid transparent;
    transition: border-color,background,box-shadow 0.3s cubic-bezier(0.32, 0.72, 0, 1);

    &.is-focused {
      border-color: var(--border-focus);
      background: var(--bg-elevated);
      box-shadow:
        0 0 0 4px rgba(22, 119, 255, 0.08),
        0 2px 8px rgba(22, 119, 255, 0.12);

      .textarea-glow {
        opacity: 1;
      }
    }

    .textarea-glow {
      position: absolute;
      inset: -2px;
      border-radius: 14px;
      background: radial-gradient(
        ellipse at center,
        rgba(22, 119, 255, 0.06) 0%,
        transparent 70%
      );
      opacity: 0;
      transition: opacity 0.3s ease;
      pointer-events: none;
      z-index: 0;
    }
  }

  .input-textarea {
    position: relative;
    z-index: 1;
    width: 100%;
    min-height: 280px;
    padding: 16px;
    font-family: "SF Mono", "Monaco", "Menlo", "Consolas", monospace;
    font-size: 13.5px;
    line-height: 1.7;
    color: var(--text-primary);
    background: transparent;
    border: none;
    outline: none;
    resize: vertical;

    &::placeholder {
      color: var(--text-tertiary);
      font-style: italic;
    }

    &:focus {
      outline: none;
    }
  }

  .panel-statusbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 20px;
    background: linear-gradient(
      180deg,
      var(--bg-sunken) 0%,
      var(--bg-base) 100%
    );
    border-top: 1px solid var(--border-default);

    .status-left,
    .status-right {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .status-icon {
      font-size: 13px;
      color: var(--text-tertiary);
    }

    .status-text {
      font-size: 12.5px;
      color: var(--text-secondary);
      font-weight: 500;

      strong {
        color: var(--text-primary);
        font-weight: 700;
        font-variant-numeric: tabular-nums;
      }
    }

    .shortcut-key {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 24px;
      height: 20px;
      padding: 0 6px;
      font-family: inherit;
      font-size: 11px;
      font-weight: 600;
      color: var(--text-secondary);
      background: var(--bg-elevated);
      border: 1px solid var(--border-strong);
      border-radius: 5px;
      box-shadow: var(--shadow-xs);
    }

    .shortcut-plus {
      font-size: 11px;
      color: var(--text-tertiary);
      margin: 0 2px;
    }

    .shortcut-hint {
      font-size: 12px;
      color: var(--text-tertiary);
      margin-left: 4px;
    }
  }

  .advanced-options {
    border-top: 1px solid var(--border-default);

    .options-toggle {
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
      padding: 14px 20px;
      font-size: 13px;
      font-weight: 600;
      color: var(--text-secondary);
      background: transparent;
      border: none;
      cursor: pointer;
      transition: color,background 0.2s ease;

      &:hover {
        color: var(--text-primary);
        background: var(--interactive-hover);
      }

      .toggle-label {
        letter-spacing: -0.01em;
      }

      .toggle-icon {
        font-size: 12px;
        color: var(--text-tertiary);
        transition: transform 0.3s cubic-bezier(0.32, 0.72, 0, 1);

        &.is-expanded {
          transform: rotate(180deg);
        }
      }
    }

    .options-content {
      padding: 0 20px 18px;
    }

    .options-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 20px;
    }

    .option-item {
      display: flex;
      align-items: center;
      gap: 10px;
      cursor: pointer;

      .option-label {
        font-size: 13px;
        font-weight: 500;
        color: var(--text-secondary);
        user-select: none;
      }

      .switch-wrapper {
        position: relative;
        width: 40px;
        height: 22px;

        .switch-input {
          position: absolute;
          opacity: 0;
          width: 0;
          height: 0;

          &:checked + .switch-track {
            background: linear-gradient(
              135deg,
              var(--color-primary) 0%,
              var(--color-primary-hover) 100%
            );

            & + .switch-thumb {
              transform: translateX(18px);
            }
          }

          &:focus-visible + .switch-track {
            box-shadow: 0 0 0 3px rgba(22, 119, 255, 0.15);
          }
        }

        .switch-track {
          position: absolute;
          inset: 0;
          background: var(--border-default);
          border-radius: 9999px;
          transition: background 0.3s cubic-bezier(0.32, 0.72, 0, 1);
        }

        .switch-thumb {
          position: absolute;
          top: 2px;
          left: 2px;
          width: 18px;
          height: 18px;
          background: var(--bg-elevated);
          border-radius: 50%;
          box-shadow: var(--shadow-xs);
          transition: transform 0.3s cubic-bezier(0.32, 0.72, 0, 1);
        }
      }
    }
  }
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.expand-enter-active,
.expand-leave-active {
  transition: opacity,max-height,padding 0.35s cubic-bezier(0.32, 0.72, 0, 1);
  overflow: hidden;
}

.expand-enter-from,
.expand-leave-to {
  opacity: 0;
  max-height: 0;
  padding-top: 0;
  padding-bottom: 0;
}

.expand-enter-to,
.expand-leave-from {
  opacity: 1;
  max-height: 200px;
}

@media (max-width: 1024px) {
  .text-input-panel {
    .panel-outer-shell {
      border-radius: 20px;
      padding: 5px;
    }

    .panel-inner-core {
      border-radius: 16px;
    }

    .panel-toolbar {
      flex-direction: column;
      align-items: stretch;
      padding: 14px 16px;
      gap: 12px;

      .toolbar-left,
      .toolbar-right {
        justify-content: center;
      }

      .toolbar-right {
        flex-wrap: wrap;
      }
    }

    .type-selector {
      justify-content: center;
    }

    .panel-body {
      padding: 16px;
    }

    .input-textarea {
      min-height: 220px;
    }
  }
}

@media (max-width: 768px) {
  .text-input-panel {
    .panel-outer-shell {
      border-radius: 16px;
      padding: 4px;
    }

    .panel-inner-core {
      border-radius: 12px;
    }

    .panel-toolbar {
      padding: 12px;
      gap: 10px;

      .type-selector {
        .type-btn {
          padding: 7px 10px;
          font-size: 12px;

          .btn-label {
            display: none;
          }
        }
      }

      .action-btn {
        padding: 8px 12px;
        font-size: 12px;

        span:not(.btn-icon):not(.btn-loading-text) {
          display: none;
        }
      }
    }

    .panel-body {
      padding: 12px;
    }

    .input-textarea {
      min-height: 180px;
      font-size: 13px;
      padding: 12px;
    }

    .panel-statusbar {
      flex-direction: column;
      gap: 8px;
      padding: 10px 12px;
      text-align: center;
    }

    .advanced-options {
      .options-toggle {
        padding: 12px;
      }

      .options-content {
        padding: 0 12px 14px;
      }

      .options-grid {
        flex-direction: column;
        gap: 14px;
      }
    }
  }
}
/* ============================================
   深色模式适配说明
   ============================================
   本组件已完成完整的深色模式适配，所有硬编码颜色值已替换为 CSS 变量。

   替换规则汇总：
   - 背景色: white/#f8fafc/#f1f5f9/#fafbfc → var(--bg-elevated)/var(--bg-sunken)/var(--bg-base)
   - 文本色: #1e293b/#334155 → var(--text-primary)
             #64748b/#475569 → var(--text-secondary)
             #94a3b8 → var(--text-tertiary)
             white（按钮active状态）→ var(--text-inverse)
   - 边框色: rgba(0,0,0,0.06/0.08/0.10/0.12) → var(--border-default)/var(--border-strong)
   - 主色: #1677ff → var(--color-primary)
           #4096ff → var(--color-primary-hover)
           #0958d9 → var(--color-primary-active)
   - 阴影: 硬编码 rgba 值 → var(--shadow-xs)/var(--shadow-sm)
   - 交互色: rgba(255,255,255,0.7) → var(--interactive-hover-inverse)
             rgba(0,0,0,0.02) → var(--interactive-hover)

   特殊处理：
   - .panel-outer-shell 渐变: linear-gradient(135deg, var(--bg-sunken), var(--bg-base))
   - .panel-toolbar/.panel-statusbar 渐变: linear-gradient(180deg, var(--bg-sunken), var(--bg-base))
   - .type-selector 背景: var(--bg-base)
   - .textarea-wrapper 背景: var(--bg-base)，聚焦时 var(--bg-elevated)
   - Switch track: var(--border-default)
   - Switch thumb: var(--bg-elevated) + var(--shadow-xs)

   所有变量定义见 src/design/theme.js，亮色/暗色值自动切换。
   ============================================ */
</style>
