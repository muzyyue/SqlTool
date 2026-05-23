<template>
  <div class="field-value-selector">
    <!-- 标题栏 -->
    <div class="selector-header">
      <AimOutlined class="header-icon" />
      <span class="header-title">交互式参数选择</span>
    </div>

    <!-- 选择器主体 -->
    <div class="selector-body">
      <!-- 字段选择 -->
      <div class="selector-row">
        <label class="selector-label">
          <Tag color="blue">字段 (Field)</Tag>
        </label>
        <a-select
          v-model:value="localField"
          :options="fieldOptions"
          placeholder="请选择要提取的字段"
          :disabled="disabled || !hasData"
          allow-clear
          show-search
          :filter-option="filterOption"
          @change="handleFieldChange"
          class="selector-select"
        />
      </div>

      <!-- 值选择 -->
      <div class="selector-row">
        <label class="selector-label">
          <Tag color="green">取值 (Value)</Tag>
        </label>
        <a-select
          v-model:value="localValue"
          :options="valueOptions"
          :placeholder="
            localField
              ? '请选择具体取值'
              : '请先选择字段'
          "
          :disabled="disabled || !localField"
          allow-clear
          show-search
          :filter-option="filterOption"
          mode="multiple"
          @change="handleValueChange"
          class="selector-select"
        >
          <template #option="{ label, count }">
            <span>{{ label }}</span>
            <Badge
              v-if="count !== undefined"
              :count="count"
              :number-style="{ backgroundColor: 'var(--color-primary)' }"
              style="margin-left: 8px"
            />
          </template>
        </a-select>
      </div>

      <!-- 已选条件显示 -->
      <div v-if="localField && localValues.length > 0" class="selected-info">
        <span class="info-label">已选条件:</span>
        <div class="info-content">
          <Tag
            v-for="(val, idx) in localValues"
            :key="idx"
            color="processing"
            closable
            @close="removeValue(val)"
          >
            {{ truncateString(val, 30) }}
          </Tag>
        </div>
      </div>
    </div>

    <!-- 操作按钮 -->
    <div class="selector-footer">
      <a-button
        type="primary"
        :disabled="!canConfirm"
        :loading="confirmLoading"
        @click="handleConfirm"
        block
      >
        <CheckOutlined /> 确认提取
      </a-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { AimOutlined, CheckOutlined } from "@ant-design/icons-vue";
import { Tag, Badge } from "ant-design-vue";
import type { SelectProps } from "ant-design-vue";

interface FieldOption {
  label: string;
  value: string;
}

interface ValueOption {
  label: string;
  value: string;
  count?: number;
}

interface Props {
  /** 解析后的 JSON 数据 */
  parsedData: Array<Record<string, any>> | Record<string, any> | null;
  /** 当前选中的字段 */
  selectedField?: string;
  /** 当前选中的值（支持多选） */
  selectedValue?: string | string[];
  /** 是否禁用 */
  disabled?: boolean;
  /** 确认按钮 loading 状态 */
  confirmLoading?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  selectedField: "",
  selectedValue: () => [],
  disabled: false,
  confirmLoading: false,
});

const emit = defineEmits<{
  "update:selectedField": [value: string];
  "update:selectedValue": [value: string[]];
  confirm: [config: { field: string; values: string[] }];
}>();

/** 内部状态 */
const localField = ref<string>(props.selectedField);
const localValues = ref<string[]>(
  Array.isArray(props.selectedValue)
    ? props.selectedValue
    : props.selectedValue
      ? [props.selectedValue]
      : [],
);

/** 计算属性 */
const hasData = computed(() => {
  if (!props.parsedData) return false;
  if (Array.isArray(props.parsedData)) return props.parsedData.length > 0;
  return Object.keys(props.parsedData).length > 0;
});

const canConfirm = computed(
  () => !props.disabled && localField.value && localValues.value.length > 0,
);

/**
 * 构建字段选项列表
 * 从解析后的数据中递归收集所有可用字段路径
 */
const fieldOptions = computed<SelectProps["options"]>(() => {
  if (!hasData.value) return [];

  const fields = new Set<string>();

  function collectKeys(obj: any, prefix = "") {
    if (Array.isArray(obj)) {
      obj.forEach((item) => collectKeys(item, prefix));
      return;
    }

    if (typeof obj === "object" && obj !== null) {
      Object.keys(obj).forEach((key) => {
        const fullPath = prefix ? `${prefix}.${key}` : key;
        fields.add(fullPath);

        if (!prefix) {
          collectKeys(obj[key], key);
        }
      });
    }
  }

  collectKeys(props.parsedData);

  return Array.from(fields)
    .sort()
    .map((f) => ({
      label: f,
      value: f,
    }));
});

/**
 * 构建值选项列表
 * 根据选定字段从数据中提取所有唯一值
 */
const valueOptions = computed<SelectProps["options"]>(() => {
  if (!hasData.value || !localField.value) return [];

  const values = new Map<string, number>();

  function extractValues(obj: any) {
    if (Array.isArray(obj)) {
      obj.forEach((item) => extractValues(item));
      return;
    }

    if (typeof obj === "object" && obj !== null) {
      const fieldValue = getNestedValue(obj, localField.value);

      if (fieldValue !== undefined) {
        const normalized = normalizeValue(fieldValue);
        if (Array.isArray(normalized)) {
          normalized.forEach((v) => {
            values.set(v, (values.get(v) || 0) + 1);
          });
        } else {
          values.set(normalized, (values.get(normalized) || 0) + 1);
        }
      }
    }
  }

  extractValues(props.parsedData);

  return Array.from(values.entries())
    .map(([value, count]) => ({
      label: truncateString(value, 50),
      value,
      count,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
});

/**
 * 支持点号路径的嵌套值访问
 */
function getNestedValue(obj: any, path: string): any {
  if (!obj || !path) return undefined;

  const keys = path.split(".");
  let current: any = obj;

  for (const key of keys) {
    if (
      current !== null &&
      current !== undefined &&
      typeof current === "object" &&
      key in current
    ) {
      current = current[key];
    } else {
      return undefined;
    }
  }

  return current;
}

/**
 * 规范化值为可读字符串
 * 处理字符串化JSON、对象、数组等复杂类型
 */
function normalizeValue(value: any): any {
  if (value === null || value === undefined) return "";

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (
      (trimmed.startsWith("{") || trimmed.startsWith("[")) &&
      trimmed.length < 10000
    ) {
      try {
        const parsed = JSON.parse(trimmed);
        return normalizeValue(parsed);
      } catch {
        return value;
      }
    }
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((v) => normalizeValue(v)).flat();
  }

  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return "[Object]";
    }
  }

  return String(value);
}

/** 截断过长字符串 */
function truncateString(str: string, maxLen: number = 50): string {
  if (!str) return "";
  return str.length <= maxLen ? str : str.slice(0, maxLen) + "...";
}

/** 下拉框过滤函数 */
const filterOption = (input: string, option: any) =>
  option.label.toLowerCase().includes(input.toLowerCase());

/** 事件处理 */
function handleFieldChange(value: string) {
  localField.value = value;
  localValues.value = [];
  emit("update:selectedField", value);
  emit("update:selectedValue", []);
}

function handleValueChange(values: string[]) {
  localValues.value = values;
  emit("update:selectedValue", values);
}

function removeValue(value: string) {
  const idx = localValues.value.indexOf(value);
  if (idx > -1) {
    localValues.value.splice(idx, 1);
    emit("update:selectedValue", [...localValues.value]);
  }
}

function handleConfirm() {
  if (canConfirm.value) {
    emit("confirm", {
      field: localField.value,
      values: [...localValues.value],
    });
  }
}

/** 同步外部 props 变化 */
watch(
  () => props.selectedField,
  (val) => {
    if (val !== localField.value) {
      localField.value = val || "";
    }
  },
);

watch(
  () => props.selectedValue,
  (val) => {
    const arr = Array.isArray(val) ? val : val ? [val] : [];
    if (JSON.stringify(arr) !== JSON.stringify(localValues.value)) {
      localValues.value = arr;
    }
  },
);
</script>

<style scoped lang="scss">
.field-value-selector {
  background: var(--bg-elevated);
  border: 1px solid var(--border-default);
  border-radius: var(--border-radius-md);
  overflow: hidden;
  contain: content;
}

.selector-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: linear-gradient(
    135deg,
    rgba(22, 119, 255, 0.05),
    rgba(20, 201, 201, 0.05)
  );
  border-bottom: 1px solid var(--border-default);

  .header-icon {
    font-size: 16px;
    color: var(--color-primary);
  }

  .header-title {
    font-size: 14px;
    font-weight: 600;
    color: var(--text-primary);
  }
}

.selector-body {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.selector-row {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.selector-label {
  font-size: 13px;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  gap: 4px;
}

.selector-select {
  width: 100%;

  :deep(.ant-select-selector) {
    min-height: 36px;
  }
}

.selected-info {
  padding: 12px;
  background: var(--interactive-selected, rgba(22, 119, 255, 0.04));
  border: 1px dashed var(--color-primary-border);
  border-radius: var(--border-radius-sm);
  display: flex;
  flex-direction: column;
  gap: 8px;

  .info-label {
    font-size: 12px;
    color: var(--text-secondary);
    font-weight: 500;
  }

  .info-content {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;

    :deep(.ant-tag) {
      margin: 0;
    }
  }
}

.selector-footer {
  padding: 12px 16px;
  border-top: 1px solid var(--border-default);
  background: var(--bg-sunken);
}

@media (max-width: 768px) {
  .selector-body {
    padding: 12px;
  }

  .selected-info {
    padding: 10px;
  }
}
</style>
