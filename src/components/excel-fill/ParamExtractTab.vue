<template>
  <VbenGlassCard title="智能参数提取">
    <div class="param-extract-tab">
      <!-- Section 1: 数据源选择 -->
      <div class="section-title">输入数据源</div>

      <div class="form-item">
        <label>数据来源</label>
        <a-select
          v-model:value="dataSource"
          :options="dataSourceOptions"
          @change="handleDataSourceChange"
        />
      </div>

      <!-- 手动输入模式 -->
      <template v-if="dataSource === 'manual'">
        <div class="form-item">
          <label>输入内容</label>
          <a-textarea
            v-model:value="inputText"
            :rows="8"
            placeholder="请粘贴 SQL 语句或 JSON 数据..."
            :maxlength="10000"
            show-count
          />
        </div>
      </template>

      <!-- 从源列读取模式 -->
      <template v-if="dataSource === 'column'">
        <div class="form-item">
          <label>选择源列</label>
          <a-select
            v-model:value="selectedColumn"
            :options="columnOptions"
            placeholder="请选择要提取的列"
            allow-clear
            :disabled="!props.columns || props.columns.length === 0"
          />
        </div>

        <div class="form-item">
          <label>目标列</label>
          <a-select
            v-model:value="targetColumn"
            :options="targetColumnOptions"
            placeholder="选择或新建目标列"
            allow-clear
            :disabled="!props.columns || props.columns.length === 0"
          />
        </div>

        <div class="hint-text">
          将从选定的源列中逐行读取数据进行参数提取，结果写入目标列
        </div>
      </template>

      <!-- Section 2: 提取配置 -->
      <div class="section-divider"></div>
      <div class="section-title">提取配置</div>

      <div class="form-row">
        <div class="form-item flex-1">
          <label>提取类型</label>
          <a-select v-model:value="extractType" :options="extractTypeOptions" />
        </div>

        <div class="form-item flex-1">
          <label>提取模式</label>
          <a-select v-model:value="extractMode" :options="extractModeOptions" />
        </div>
      </div>

      <div class="form-row">
        <div class="form-item flex-1 checkbox-item">
          <a-checkbox v-model:checked="flattenNested">
            展开嵌套对象
          </a-checkbox>
        </div>

        <div class="form-item flex-1 checkbox-item">
          <a-checkbox v-model:checked="autoExtract">
            自动提取（输入时实时提取）
          </a-checkbox>
        </div>
      </div>

      <!-- Section 2.5: 交互式参数选择（仅在精准筛选模式下显示） -->
      <template v-if="extractMode === 'interactive'">
        <div class="section-divider"></div>
        <div class="section-title interactive-section-title">
          <SettingOutlined />
          <span>交互式参数选择</span>
        </div>

        <div class="interactive-selector">
          <!-- 数据结构概览 -->
          <div
            v-if="isSampleAnalyzed"
            class="schema-summary"
            role="region"
            aria-label="数据结构概览"
          >
            <div class="schema-header">
              <DatabaseOutlined aria-hidden="true" />
              <span class="schema-type-tag">{{ dataTypeLabel }}</span>
              <span class="schema-meta">
                {{ sampleSchema.sampleCount }} 条样本 ·
                {{ sampleSchema.fields.length }} 个字段
              </span>
            </div>

            <!-- JSON 树形结构预览（使用 CodeMirror） -->
            <div class="schema-preview">
              <CodeEditor
                :model-value="formattedSampleJson"
                language="json"
                :readonly="true"
                :min-lines="8"
                :max-lines="15"
                placeholder="暂无数据预览..."
              />
            </div>
          </div>

          <div class="form-item">
            <label class="field-label">字段 (Field)</label>
            <a-tree-select
              v-model:value="selectedField"
              :tree-data="fieldOptions"
              :placeholder="
                dataSource === 'column' && selectedColumn
                  ? '正在加载字段...'
                  : '请先提取数据以加载字段'
              "
              allow-clear
              :disabled="!canUseInteractiveSelector"
              @change="handleFieldChange"
              show-search
              tree-node-filter-prop="title"
              :dropdown-style="{ maxHeight: '400px', overflow: 'auto' }"
              :tree-default-expand-all="false"
            />
          </div>

          <!-- 🆕 JSON 字符串化解包提示条 -->
          <a-alert
            v-if="parsedJsonCache"
            :type="isJsonUnwrapMode ? 'success' : 'info'"
            show-icon
            closable
            class="json-unwrap-hint"
            @close="toggleJsonUnwrapMode(false)"
          >
            <template #message>
              <div class="unwrap-hint-content">
                <span class="hint-icon">📦</span>
                <div class="hint-info">
                  <span class="hint-text">{{ unwrapHintMessage }}</span>
                  <span
                    v-if="parsedJsonCache?.samplePreview"
                    class="hint-preview"
                  >
                    {{ parsedJsonCache.samplePreview }}
                  </span>
                </div>
                <div class="hint-actions">
                  <a-switch
                    :checked="isJsonUnwrapMode"
                    size="small"
                    @change="toggleJsonUnwrapMode"
                  />
                  <span
                    class="switch-label"
                    :class="{ active: isJsonUnwrapMode }"
                  >
                    {{ isJsonUnwrapMode ? "已开启" : "开启解析" }}
                  </span>
                </div>
              </div>
            </template>
          </a-alert>

          <!-- 🆕 模式A：JSON解包模式 - 选择内层字段 -->
          <div v-if="isJsonUnwrapMode" class="form-item">
            <label class="inner-field-label">
              内层字段
              <span v-if="jsonUnwrapDepth > 0" class="depth-badge">
                L{{ jsonUnwrapDepth + 1 }}
              </span>
            </label>
            <a-tree-select
              v-model:value="selectedInnerField"
              :tree-data="innerFieldOptions"
              placeholder="请选择要提取的内层字段..."
              allow-clear
              show-search
              tree-node-filter-prop="title"
              :dropdown-style="{ maxHeight: '300px', overflow: 'auto' }"
              :tree-default-expand-all="false"
              @change="handleInnerFieldChange"
            />
          </div>

          <!-- 取值区域（两种模式共用） -->
          <div class="form-item">
            <label class="value-label">
              取值 (Value)
              <span
                v-if="isJsonUnwrapMode && selectedInnerField"
                class="field-path-hint"
              >
                → {{ selectedInnerField }}
              </span>
            </label>
            <a-select
              v-model:value="selectedValues"
              :options="valueOptions"
              mode="multiple"
              :placeholder="
                isJsonUnwrapMode && !selectedInnerField
                  ? '请先选择内层字段'
                  : !selectedField
                    ? '请先选择字段'
                    : '请选择要提取的取值'
              "
              allow-clear
              :disabled="
                !selectedField || (isJsonUnwrapMode && !selectedInnerField)
              "
              @change="handleValueChange"
              show-search
              :filter-option="filterOption"
            >
              <template #option="{ label, count }">
                <span>{{ label }}</span>
                <span
                  v-if="count"
                  style="float: right; color: #999; font-size: 12px"
                >
                  ({{ count }})
                </span>
              </template>
            </a-select>
            <div v-if="!selectedField && hasResults" class="hint-text">
              请先选择字段以查看可用取值
            </div>
            <div
              v-if="isJsonUnwrapMode && !selectedInnerField && selectedField"
              class="hint-text"
            >
              请从上方树形结构中选择内层字段
            </div>
          </div>
        </div>
      </template>

      <!-- Section 3: 操作按钮 -->
      <div class="action-area">
        <a-button
          type="primary"
          size="large"
          :loading="isLoading"
          @click="handleExtract"
          block
        >
          <template #icon><SearchOutlined /></template>
          {{ isLoading ? "正在提取..." : "开始提取" }}
        </a-button>
      </div>

      <!-- Section 4: 提取结果 -->
      <div v-if="hasResults" class="result-section">
        <div class="section-divider"></div>
        <div class="section-title">提取结果</div>

        <!-- 统计信息 -->
        <div class="stats-bar">
          <span class="stat-item">
            总数: <strong>{{ stats.total }}</strong>
          </span>
          <span class="stat-divider">|</span>
          <span class="stat-item stat-sql">
            SQL: <strong>{{ stats.sqlCount }}</strong>
          </span>
          <span class="stat-divider">|</span>
          <span class="stat-item stat-json">
            JSON: <strong>{{ stats.jsonCount }}</strong>
          </span>
          <span class="stat-divider">|</span>
          <span
            class="stat-item"
            :class="`stat-${getRateLevel(stats.successRate)}`"
          >
            成功率: <strong>{{ stats.successRate }}%</strong>
          </span>
        </div>

        <!-- 结果列表 -->
        <a-table
          :columns="resultColumns"
          :data-source="filteredItems"
          :pagination="{ pageSize: 10, size: 'small' }"
          size="small"
          :scroll="{ y: 300 }"
          row-key="id"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'type'">
              <a-tag :color="record.type === 'sql' ? 'blue' : 'purple'">
                {{ record.type.toUpperCase() }}
              </a-tag>
            </template>

            <template v-if="column.key === 'status'">
              <a-tag :color="getStatusColor(record.status)">
                {{ getStatusText(record.status) }}
              </a-tag>
            </template>

            <template v-if="column.key === 'action'">
              <a-space>
                <a-button type="link" size="small" @click="handleCopy(record)">
                  复制
                </a-button>
                <a-button
                  type="link"
                  size="small"
                  @click="handleViewDetail(record)"
                >
                  详情
                </a-button>
              </a-space>
            </template>
          </template>
        </a-table>

        <!-- 批量操作 -->
        <div class="batch-actions">
          <a-button size="small" @click="handleCopyAll">
            <template #icon><CopyOutlined /></template>
            复制全部
          </a-button>
          <a-button
            size="small"
            type="primary"
            ghost
            @click="handleExportResults"
          >
            <template #icon><ExportOutlined /></template>
            导出结果
          </a-button>
        </div>
      </div>

      <!-- 错误提示 -->
      <a-alert
        v-if="error"
        :message="error"
        type="error"
        show-icon
        closable
        class="error-alert"
        @close="clearError"
      />
    </div>
  </VbenGlassCard>
</template>

<script setup>
import { ref, computed, watch, nextTick } from "vue";
import {
  SearchOutlined,
  CopyOutlined,
  ExportOutlined,
  SettingOutlined,
  DatabaseOutlined,
} from "@ant-design/icons-vue";
import { message } from "ant-design-vue";
import VbenGlassCard from "@/components/common/VbenGlassCard.vue";
import CodeEditor from "@/components/common/CodeEditor.vue";
import { useParamExtractor } from "@/composables/useParamExtractor.js";
import * as XLSX from "xlsx";

const props = defineProps({
  workbook: {
    type: Object,
    default: null,
  },
  sheets: {
    type: Array,
    default: () => [],
  },
  columns: {
    type: Array,
    default: () => [],
  },
});

const emit = defineEmits(["extract-complete"]);

// 数据源选项
const dataSource = ref("manual");
const dataSourceOptions = [
  { value: "manual", label: "手动输入" },
  { value: "column", label: "从源列读取" },
];

// 输入数据
const inputText = ref("");
const selectedColumn = ref(undefined);
const targetColumn = ref(undefined);

// 提取配置
const extractType = ref("auto");
const extractTypeOptions = [
  { value: "auto", label: "自动检测" },
  { value: "sql", label: "仅 SQL" },
  { value: "json", label: "仅 JSON" },
];

const extractMode = ref("normal");
const extractModeOptions = [
  { value: "normal", label: "标准模式" },
  { value: "interactive", label: "精准筛选" },
];

const flattenNested = ref(false);
const autoExtract = ref(false);

// 交互式参数选择状态
const selectedField = ref(undefined);
const selectedValues = ref([]);

// 🆕 JSON 字符串化解包模式（支持多层嵌套）
const isJsonUnwrapMode = ref(false); // 是否启用JSON解包模式
const selectedInnerField = ref(undefined); // 选中的内层字段路径
const jsonUnwrapDepth = ref(0); // 当前解包深度（支持多层嵌套）
const parsedJsonCache = ref(null); // 解析结果缓存
const innerFieldTree = ref([]); // 内层字段树形结构

/**
 * 检测当前选中字段的值是否为字符串化JSON
 * 仅当字段类型为 string 时才检测
 */
const isFieldStringifiedJson = computed(() => {
  if (!selectedField.value) {
    return false;
  }
  if (!sourceDataCache.value || !sourceDataCache.value.length) {
    return false;
  }

  const fieldInfo = sampleSchema.value?.fields?.find(
    (f) => f.path === selectedField.value,
  );

  if (!fieldInfo) {
    return false;
  }
  if (fieldInfo.type !== "string") {
    return false;
  }

  try {
    const firstSample = sourceDataCache.value[0].value;

    if (
      !firstSample ||
      !(firstSample.startsWith("{") || firstSample.startsWith("["))
    ) {
      return false;
    }

    const parsedRoot = JSON.parse(firstSample);
    const fieldValue = getNestedValue(parsedRoot, selectedField.value);

    const result = isStringifiedJsonSimple(fieldValue);

    return result;
  } catch (e) {
    return false;
  }
});

/**
 * JSON 解包提示信息
 */
const unwrapHintMessage = computed(() => {
  if (!parsedJsonCache.value) return "";

  const { itemCount, fieldCount } = parsedJsonCache.value;
  const depthLabel =
    jsonUnwrapDepth.value > 0 ? ` · 第${jsonUnwrapDepth.value + 1}层` : "";
  return `已检测到JSON数据${depthLabel}：${itemCount} 个元素 · ${fieldCount} 个字段`;
});

/**
 * 内层字段树形选项（用于 a-tree-select）
 * 支持多层嵌套：如果内层字段值仍然是字符串化JSON，可继续解包
 */
const innerFieldOptions = computed(() => {
  if (!isJsonUnwrapMode.value || !parsedJsonCache.value) return [];
  return innerFieldTree.value;
});

// 🆕 新架构：采样分析结果（通用数据结构）
const sampleSchema = ref(null); // 存储采样的通用结构
const isSampleAnalyzed = computed(() => !!sampleSchema.value);
const sourceDataCache = ref([]);

const dataTypeLabel = computed(() => {
  const map = {
    json: "JSON",
    keyvalue: "键值对",
    sql: "SQL 参数",
    unknown: "未知",
  };
  return map[sampleSchema.value?.dataType] || "未知";
});

/**
 * 格式化的样本 JSON 数据（用于 CodeMirror 预览）
 * 从缓存的第一条数据解析并格式化显示
 */
const formattedSampleJson = computed(() => {
  if (!sourceDataCache.value || sourceDataCache.value.length === 0) {
    return "";
  }

  const firstSample = sourceDataCache.value[0].value;

  // 尝试解析并格式化 JSON
  if (
    (firstSample.startsWith("{") || firstSample.startsWith("[")) &&
    firstSample.length < 100000
  ) {
    try {
      const parsed = JSON.parse(firstSample);
      return JSON.stringify(parsed, null, 2);
    } catch (e) {
      // 解析失败，返回原始数据（可能被截断）
      return firstSample.substring(0, 2000);
    }
  }

  // 非 JSON 数据，直接返回
  return firstSample;
});

function getFieldTypeColor(type) {
  const colorMap = {
    string: "blue",
    number: "green",
    boolean: "orange",
    array: "purple",
    parameter: "cyan",
    object: "magenta",
  };
  return colorMap[type] || "default";
}

/**
 * 将扁平字段路径列表构建为树形结构（用于 a-tree-select）
 * @param {Array<{path: string, label: string, type: string}>} flatFields - 扁平字段列表
 * @returns {Array<{value: string, title: string, children?: Array, type: string}>} 树形结构
 */
function buildFieldTree(flatFields) {
  const root = { children: {} };

  for (const field of flatFields) {
    const parts = field.path.split(/\.|\[|\]/).filter((p) => p !== "");
    let current = root;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isLast = i === parts.length - 1;
      const nodeKey = part;

      if (!current.children[nodeKey]) {
        current.children[nodeKey] = {
          value: isLast ? field.path : null,
          title: part,
          type: isLast ? field.type : inferTypeFromPath(part, i, parts),
          children: {},
          isLeaf: false,
        };
      }

      // 叶子节点：设置最终值和类型
      if (isLast) {
        current.children[nodeKey].value = field.path;
        current.children[nodeKey].type = field.type;
        current.children[nodeKey].isLeaf = true;
      }

      current = current.children[nodeKey];
    }
  }

  // 将对象树转为数组格式，并清理空 children
  function toArray(node) {
    const result = [];
    for (const key of Object.keys(node.children || {}).sort()) {
      const child = node.children[key];
      const item = {
        value: child.value || key,
        title: `${key}${child.type ? ` (${child.type})` : ""}`,
        type: child.type,
      };

      const hasChildren =
        child.children && Object.keys(child.children).length > 0;
      if (hasChildren) {
        item.children = toArray(child);
      }

      result.push(item);
    }
    return result;
  }

  return toArray(root);
}

/**
 * 从路径片段推断类型（非叶子节点）
 * @param {string} part - 路径片段
 * @param {number} index - 当前索引
 * @param {string[]} parts - 所有路径片段
 * @returns {string} 推断的类型
 */
function inferTypeFromPath(part, index, parts) {
  if (/^\d+$/.test(part)) return "item";
  if (index < parts.length - 1) return "object";
  return "unknown";
}

// 使用 composable
const extractor = useParamExtractor();

// 直接使用 composable 返回的计算属性和方法
const { isLoading, hasResults, filteredItems } = extractor;

// 计算属性
const stats = computed(() => extractor.state.stats);
const error = computed(() => extractor.state.lastError);

// 是否可以使用交互式参数选择器
const canUseInteractiveSelector = computed(() => {
  // 手动输入模式：需要有提取结果
  if (dataSource.value === "manual") {
    return hasResults.value;
  }
  // 从源列读取模式：只要有源列选择就可以（会自动预加载）
  return dataSource.value === "column" && !!selectedColumn.value;
});

// 列选项（动态生成）
const columnOptions = computed(() => {
  if (!props.columns || props.columns.length === 0) return [];
  return props.columns.map((col) => ({
    value: col.letter,
    label:
      col.name && col.name !== `列${col.index + 1}`
        ? `${col.letter} (${col.name})`
        : col.letter,
  }));
});

// 目标列选项（包含"新建列"选项）
const targetColumnOptions = computed(() => {
  if (!props.columns || props.columns.length === 0) return [];

  const existingColumns = props.columns.map((col) => ({
    value: col.letter,
    label:
      col.name && col.name !== `列${col.index + 1}`
        ? `${col.letter} (${col.name}) - 覆盖`
        : `${col.letter} - 覆盖`,
  }));

  // 添加新建列选项
  const newColLetter =
    props.columns.length > 0
      ? XLSX.utils.encode_col(props.columns.length)
      : "A";

  existingColumns.push({
    value: `__new__`,
    label: `➕ 新建列 (${newColLetter})`,
  });

  return existingColumns;
});

// 🆕 新架构：基于sampleSchema的即时字段选项（树形结构）
const fieldOptions = computed(() => {
  // ✅ 策略1：基于 sampleSchema（采样模式，<100ms响应）
  if (isSampleAnalyzed.value && sampleSchema.value?.fields?.length > 0) {
    return buildFieldTree(sampleSchema.value.fields);
  }

  // ⚠️ 回退：手动输入模式 + 已有提取结果
  if (dataSource.value === "manual" && hasResults.value) {
    if (filteredItems.value?.length > 0) {
      const fields = [];
      const fieldSet = new Set();

      filteredItems.value.forEach((item) => {
        if (item.extracted?.length > 0) {
          item.extracted.forEach((ext) => {
            const path = ext.path || ext.key;
            if (path && !fieldSet.has(path)) {
              fieldSet.add(path);
              fields.push({
                path,
                label: path.split(".").pop(),
                type: ext.dataType || "string",
              });
            }
          });
        }
      });

      if (fields.length > 0) {
        return buildFieldTree(fields);
      }
    }
  }

  return [];
});

// 🆕 新架构：两阶段取值选项
const valueOptions = computed(() => {
  if (!selectedField.value) return [];

  // ✅ 阶段1：基于 sampleSchema（预览，快速）
  if (isSampleAnalyzed.value && sampleSchema.value) {
    const field = sampleSchema.value.fields.find(
      (f) => f.path === selectedField.value,
    );

    if (field?.values?.length > 0) {
      // 过滤掉空值，避免下拉选项中出现空数据
      return field.values
        .filter((v) => v !== undefined && v !== null && String(v).trim() !== "")
        .map((v) => ({
          label: v,
          value: v,
          count: field.count,
        }));
    }
  }

  // ⚠️ 阶段2：基于完整提取结果（精确）
  // 保留原有逻辑作为回退...

  return [];
});

// 下拉搜索过滤函数
function filterOption(input, option) {
  const inputLower = input.toLowerCase();
  const optionValue = (option.value || "").toLowerCase();
  const optionLabel = (option.label || "").toLowerCase();
  return optionValue.includes(inputLower) || optionLabel.includes(inputLower);
}

/**
 * 🆕 解析当前选中字段的值为JSON（支持多层嵌套）
 * 从样本数据中提取字段值，尝试解析为JSON，构建内层字段树
 */
function parseSelectedFieldAsJson(depth = 0) {
  if (!selectedField.value) {
    return false;
  }

  if (!sourceDataCache.value?.length) {
    if (sampleSchema.value && formattedSampleJson.value) {
      return parseFromFormattedSample(depth);
    }
    return false;
  }

  const MAX_DEPTH = 3;
  if (depth > MAX_DEPTH) {
    message.warning(`已达到最大解析深度 (${MAX_DEPTH} 层)`);
    return false;
  }

  try {
    const firstSample = sourceDataCache.value[0].value;

    const sampleStr = String(firstSample ?? "").trim();

    let parsedRoot;
    let targetData;

    if (sampleStr.startsWith("{") || sampleStr.startsWith("[")) {
      parsedRoot = JSON.parse(sampleStr);

      if (depth === 0 && selectedField.value) {
        targetData = getNestedValue(parsedRoot, selectedField.value);
      } else if (depth > 0 && selectedInnerField.value) {
        targetData = getNestedValue(
          parsedJsonCache.value?.raw,
          selectedInnerField.value,
        );
      } else {
        targetData = parsedRoot;
      }
    } else {
      targetData = sampleStr;
    }

    if (targetData == null) {
      const valueOptionVal = valueOptions.value[0]?.value;
      if (valueOptionVal && isStringifiedJsonSimple(valueOptionVal)) {
        targetData = JSON.parse(valueOptionVal);
      } else {
        return false;
      }
    }

    if (isStringifiedJsonSimple(targetData)) {
      const innerParsed = JSON.parse(targetData);

      const flatFields = flattenObject(innerParsed);

      parsedJsonCache.value = {
        raw: innerParsed,
        fields: flatFields.map((f) => ({
          path: f.path,
          label: f.path.split(".").pop() || f.path,
          type: f.dataType,
          value: f.value,
        })),
        itemCount: Array.isArray(innerParsed) ? innerParsed.length : 1,
        fieldCount: flatFields.length,
        samplePreview:
          typeof targetData === "string"
            ? targetData.substring(0, 80) + "..."
            : JSON.stringify(targetData).substring(0, 80) + "...",
      };

      innerFieldTree.value = buildFieldTree(parsedJsonCache.value.fields);
      jsonUnwrapDepth.value = depth;
      isJsonUnwrapMode.value = true;

      return true;
    }

    if (typeof targetData === "object" && targetData !== null) {
      const flatFields = flattenObject(targetData);
      parsedJsonCache.value = {
        raw: targetData,
        fields: flatFields.map((f) => ({
          path: f.path,
          label: f.path.split(".").pop() || f.path,
          type: f.dataType,
          value: f.value,
        })),
        itemCount: Array.isArray(targetData) ? targetData.length : 1,
        fieldCount: flatFields.length,
        samplePreview: JSON.stringify(targetData).substring(0, 80) + "...",
      };

      innerFieldTree.value = buildFieldTree(parsedJsonCache.value.fields);
      jsonUnwrapDepth.value = depth;
      isJsonUnwrapMode.value = true;

      return true;
    }

    return false;
  } catch (e) {
    try {
      const firstVal = valueOptions.value[0]?.value;
      if (firstVal && isStringifiedJsonSimple(firstVal)) {
        const fallbackParsed = JSON.parse(firstVal);
        const flatFields = flattenObject(fallbackParsed);

        parsedJsonCache.value = {
          raw: fallbackParsed,
          fields: flatFields.map((f) => ({
            path: f.path,
            label: f.path.split(".").pop() || f.path,
            type: f.dataType,
            value: f.value,
          })),
          itemCount: Array.isArray(fallbackParsed) ? fallbackParsed.length : 1,
          fieldCount: flatFields.length,
          samplePreview: firstVal.substring(0, 80) + "...",
        };

        innerFieldTree.value = buildFieldTree(parsedJsonCache.value.fields);
        jsonUnwrapDepth.value = depth;
        isJsonUnwrapMode.value = true;

        return true;
      }
    } catch (e2) {
      // 容错降级失败
    }

    return false;
  }
}

/**
 * 从格式化样本中解析（当 sourceDataCache 为空时的回退方案）
 */
function parseFromFormattedSample(depth) {
  try {
    const sampleText = formattedSampleJson.value;
    if (
      !sampleText ||
      !(sampleText.startsWith("{") || sampleText.startsWith("["))
    ) {
      return false;
    }

    const parsedRoot = JSON.parse(sampleText);
    let targetData = parsedRoot;

    if (depth === 0 && selectedField.value) {
      targetData = getNestedValue(parsedRoot, selectedField.value);
    }

    if (!targetData || !isStringifiedJsonSimple(targetData)) {
      return false;
    }

    const innerParsed = JSON.parse(targetData);
    const flatFields = flattenObject(innerParsed);

    parsedJsonCache.value = {
      raw: innerParsed,
      fields: flatFields.map((f) => ({
        path: f.path,
        label: f.path.split(".").pop() || f.path,
        type: f.dataType,
        value: f.value,
      })),
      itemCount: Array.isArray(innerParsed) ? innerParsed.length : 1,
      fieldCount: flatFields.length,
      samplePreview: targetData.substring(0, 80) + "...",
    };

    innerFieldTree.value = buildFieldTree(parsedJsonCache.value.fields);
    jsonUnwrapDepth.value = depth;
    isJsonUnwrapMode.value = true;

    return true;
  } catch (e) {
    return false;
  }
}

/**
 * 🆕 切换 JSON 解包模式（支持多层嵌套）
 * @param {boolean} enabled - 是否启用
 */
function toggleJsonUnwrapMode(enabled) {
  isJsonUnwrapMode.value = enabled;
  selectedInnerField.value = undefined;

  if (enabled) {
    const success = parseSelectedFieldAsJson(jsonUnwrapDepth.value);
    if (success) {
      message.success("✅ JSON 解析成功！已发现内层字段");
    } else {
      isJsonUnwrapMode.value = false;
      message.error("❌ 该字段的值不是有效的JSON格式");
    }
  } else {
    // 关闭时重置状态
    parsedJsonCache.value = null;
    innerFieldTree.value = [];
    jsonUnwrapDepth.value = 0;
  }
}

/**
 * 🆕 处理内层字段选择变化
 * 当用户选择内层字段时，检测是否需要继续解包
 */
function handleInnerFieldChange(value) {
  selectedValues.value = [];

  if (!value) {
    selectedInnerField.value = undefined;
    return;
  }

  selectedInnerField.value = value;

  // 获取选中字段的值，检查是否仍然是字符串化JSON
  const fieldInfo = parsedJsonCache.value?.fields?.find(
    (f) => f.path === value,
  );
  if (fieldInfo && isStringifiedJsonSimple(fieldInfo.value)) {
    message.info(
      `📦 内层字段 "${fieldInfo.label}" 的值仍是JSON数据，已自动继续解析...`,
    );

    // 递归解析下一层
    setTimeout(() => {
      parseSelectedFieldAsJson(jsonUnwrapDepth.value + 1);
    }, 100);
  } else {
    // 普通字段，加载可选值
    loadInnerFieldValues(value);
  }
}

/**
 * 🆕 加载内层字段的可选值列表
 * @param {string} innerPath - 内层字段路径
 */
function loadInnerFieldValues(innerPath) {
  if (!parsedJsonCache.value || !sourceDataCache.value.length) return;

  try {
    const valuesSet = new Set();

    for (const sourceItem of sourceDataCache.value) {
      let currentValue = sourceItem.value;

      // 第一层：提取外层字段
      if (jsonUnwrapDepth.value === 0 && selectedField.value) {
        const parsedRoot = JSON.parse(currentValue);
        currentValue = getNestedValue(parsedRoot, selectedField.value);

        // 如果是字符串化JSON，先解析
        if (isStringifiedJsonSimple(currentValue)) {
          currentValue = JSON.parse(currentValue);
        }
      }

      // 后续层：从缓存中提取
      if (typeof currentValue === "string") {
        try {
          currentValue = JSON.parse(currentValue);
        } catch (e) {
          // JSON解析失败，保持原值
        }
      }

      // 提取内层字段的值
      const finalValue = getNestedValue(currentValue, innerPath);
      if (finalValue !== undefined && finalValue !== null) {
        const strValue = String(finalValue);
        if (strValue.length <= 100) {
          valuesSet.add(strValue);
        }
      }
    }

    // 更新 valueOptions（通过响应式方式）
    if (valuesSet.size > 0) {
      const valuesArray = Array.from(valuesSet);

      // 触发UI更新提示
      message.info(`已加载 ${valuesArray.length} 个可选值，请选择要提取的内容`);
    }
  } catch (e) {
    // 内层取值加载失败
  }
}

/**
 * 处理字段选择变化
 * 当用户选择字段时，自动检测是否为字符串化JSON并触发解包
 */
function handleFieldChange(value) {
  selectedValues.value = [];
  selectedInnerField.value = undefined;

  isJsonUnwrapMode.value = false;
  parsedJsonCache.value = null;
  innerFieldTree.value = [];
  jsonUnwrapDepth.value = 0;

  if (!value) {
    extractor.setInteractiveMode(false);
  } else {
    extractor.setInteractiveMode(true);
    extractor.state.selectedField = value;

    message.info(`已选择字段: ${value}，请选择要提取的取值`);

    nextTick(() => {
      let success = parseSelectedFieldAsJson(0);
      if (success) {
        message.success(`自动检测到JSON数据！${unwrapHintMessage.value}`);
        return;
      }

      setTimeout(() => {
        success = parseSelectedFieldAsJson(0);
        if (success) {
          message.success(`自动检测到JSON数据！${unwrapHintMessage.value}`);
        }
      }, 200);
    });
  }
}

/**
 * 处理取值选择变化
 * 当用户选择取值后，自动执行精准提取
 */
async function handleValueChange(values) {
  if (!selectedField.value || values.length === 0) {
    return;
  }

  // 更新composable状态
  extractor.state.selectedValues = values;

  // 执行精准提取
  try {
    await extractor.extractByFieldAndValue(selectedField.value, values);

    if (extractor.state.lastError) {
      message.error(`精准提取失败: ${extractor.state.lastError}`);
    } else {
      const count = extractor.filteredItems.value.length;
      message.success(
        `精准筛选完成！找到 ${count} 条匹配 "${selectedField.value}" 的结果`,
      );
    }
  } catch (error) {
    message.error(`精准提取失败: ${error.message}`);
  }
}

// 表格列定义
const resultColumns = [
  {
    title: "类型",
    dataIndex: "type",
    key: "type",
    width: 80,
    align: "center",
  },
  {
    title: "内容预览",
    dataIndex: "content",
    key: "content",
    ellipsis: true,
  },
  {
    title: "状态",
    dataIndex: "status",
    key: "status",
    width: 80,
    align: "center",
  },
  {
    title: "操作",
    key: "action",
    width: 120,
    align: "center",
  },
];

// 方法
function handleDataSourceChange(value) {
  if (value === "column" && (!props.columns || props.columns.length === 0)) {
    message.warning("请先上传 Excel 文件并解析列信息");
  }
}

/**
 * 简化版字符串化JSON检测（用于 flattenObject）
 * @param {string} value - 要检测的字符串
 * @returns {boolean} 是否为字符串化JSON
 */
function isStringifiedJsonSimple(value) {
  if (typeof value !== "string") return false;

  const trimmed = value.trim();

  // 快速检查：必须以 { 或 [ 开头
  if (!/^\s*[{[]/.test(trimmed)) return false;

  try {
    const parsed = JSON.parse(trimmed);
    return typeof parsed === "object" && parsed !== null;
  } catch (e) {
    return false;
  }
}

/**
 * 递归展平嵌套对象为键值对数组（用于手动解析JSON）
 * @param {Object} obj - 要展平的对象
 * @param {string} prefix - 前缀路径
 * @returns {Array<{key: string, value: any, path: string, dataType: string}>}
 */
function flattenObject(obj, prefix = "") {
  const result = [];

  if (obj === null || obj === undefined) {
    return result;
  }

  if (typeof obj !== "object") {
    // 基本类型：检查是否为字符串化JSON
    if (typeof obj === "string" && isStringifiedJsonSimple(obj)) {
      try {
        const parsed = JSON.parse(obj);
        return flattenObject(parsed, prefix);
      } catch (e) {
        // 解析失败，当作普通字符串处理
      }
    }

    result.push({
      key: prefix || "value",
      value: obj,
      path: prefix || "value",
      dataType: typeof obj,
    });
    return result;
  }

  if (Array.isArray(obj)) {
    // 数组：序列化为字符串值
    result.push({
      key: prefix || "array",
      value: JSON.stringify(obj),
      path: prefix || "array",
      dataType: "array",
    });

    // 同时展平每个元素
    obj.forEach((item, idx) => {
      const itemPath = prefix ? `${prefix}[${idx}]` : `[${idx}]`;
      result.push(...flattenObject(item, itemPath));
    });

    return result;
  }

  // 对象：递归展平每个属性
  Object.entries(obj).forEach(([key, value]) => {
    const fullPath = prefix ? `${prefix}.${key}` : key;

    if (value !== null && typeof value === "object") {
      // 嵌套对象或数组：递归展平
      result.push(...flattenObject(value, fullPath));
    } else {
      // 基本类型：直接添加
      result.push({
        key: fullPath,
        value: value,
        path: fullPath,
        dataType: typeof value,
      });
    }
  });

  return result;
}

/**
 * 🆕 分析样本数据，提取通用字段结构
 * @param {string[]} sampleLines - 样本数据行数组（通常3行）
 * @returns {Object|null} 结构对象 { fields: [{path, label, type, values[], count}], dataType, sampleCount }
 */
function analyzeSampleData(sampleLines) {
  if (!sampleLines || sampleLines.length === 0) return null;

  const fields = new Map();
  let dataType = "unknown";

  for (const line of sampleLines) {
    const trimmed = line.trim();

    // 尝试JSON解析
    if (
      (trimmed.startsWith("[") || trimmed.startsWith("{")) &&
      trimmed.length < 100000
    ) {
      try {
        const parsed = JSON.parse(trimmed);
        const items = Array.isArray(parsed) ? parsed : [parsed];
        dataType = "json";

        items.forEach((item) => {
          flattenObject(item).forEach((f) => {
            if (!fields.has(f.path)) {
              fields.set(f.path, {
                path: f.path,
                label: f.path.split(".").pop(),
                type: f.dataType,
                values: new Set(),
                count: 0,
              });
            }
            const fieldInfo = fields.get(f.path);
            if (f.value !== undefined && f.value !== null) {
              fieldInfo.values.add(String(f.value).substring(0, 100));
            }
            fieldInfo.count++;
          });
        });
      } catch (e) {
        // JSON解析失败，继续其他格式检测
      }
    }

    // 键值对模式检测
    if (dataType === "unknown") {
      const kvPattern = /(\w+)\s*[=:]\s*([^,;]+)/g;
      let match;
      let hasKV = false;

      while ((match = kvPattern.exec(trimmed)) !== null) {
        hasKV = true;
        const key = match[1].trim();
        const value = match[2].trim();

        if (!fields.has(key)) {
          fields.set(key, {
            path: key,
            label: key,
            type: "string",
            values: new Set(),
            count: 0,
          });
        }
        fields.get(key).values.add(value.substring(0, 100));
        fields.get(key).count++;
        dataType = "keyvalue";
      }

      // SQL参数模式检测
      if (!hasKV) {
        const sqlPattern = /[@:?](\w+)/g;
        while ((match = sqlPattern.exec(trimmed)) !== null) {
          const param = match[1].trim();
          if (!fields.has(param)) {
            fields.set(param, {
              path: param,
              label: param,
              type: "parameter",
              values: new Set(),
              count: 0,
            });
          }
          fields.get(param).count++;
          dataType = "sql";
        }
      }
    }
  }

  if (fields.size > 0) {
    return {
      fields: Array.from(fields.values()).map((f) => ({
        ...f,
        values: Array.from(f.values), // Set→Array for reactivity
      })),
      dataType,
      sampleCount: sampleLines.length,
    };
  }

  return null;
}

// 🆕 新架构：采样分析模式 - 只分析前3行，不处理全部数据
watch(selectedColumn, async (newColumn) => {
  // 清空状态
  selectedField.value = undefined;
  selectedValues.value = [];
  sampleSchema.value = null;
  sourceDataCache.value = [];

  if (!newColumn || dataSource.value !== "column") {
    return;
  }

  try {
    const sheetName = props.sheets[0];
    const ws = props.workbook.Sheets[sheetName];
    if (!ws) return;

    const sourceColIndex = props.columns.find(
      (col) => col.letter === newColumn,
    )?.index;
    if (sourceColIndex === undefined) return;

    // 1️⃣ 读取全部数据并缓存（只读一次）
    const range = XLSX.utils.decode_range(ws["!ref"]);
    const maxRow = range.e.r + 1;
    const allData = [];

    for (let row = 1; row < maxRow; row++) {
      // 从第2行开始（跳过标题）
      const cellAddress = XLSX.utils.encode_col(sourceColIndex) + (row + 1);
      const cell = ws[cellAddress];
      if (cell?.v !== undefined && cell.v !== "") {
        allData.push({ value: String(cell.v), row: row + 1 });
      }
    }

    if (allData.length === 0) return;

    sourceDataCache.value = allData;

    // 2️⃣ 只取前3行作为样本
    const SAMPLE_SIZE = Math.min(3, allData.length);
    const sampleLines = allData.slice(0, SAMPLE_SIZE).map((d) => d.value);

    // 3️⃣ 分析样本，提取通用结构
    const schema = analyzeSampleData(sampleLines);

    if (schema?.fields?.length > 0) {
      sampleSchema.value = schema;
    }
  } catch (error) {
    // 采样分析失败
  }
});

async function handleExtract() {
  let textToProcess = "";

  if (dataSource.value === "manual") {
    textToProcess = inputText.value;
    if (!textToProcess.trim()) {
      message.warning("请输入要提取的内容");
      return;
    }
  } else if (dataSource.value === "column") {
    if (!selectedColumn.value) {
      message.warning("请选择源列");
      return;
    }

    if (!targetColumn.value) {
      message.warning("请选择目标列");
      return;
    }

    // 🆕 使用缓存的 sourceDataCache（避免重复读取Excel）
    if (sourceDataCache.value.length === 0) {
      message.warning("源列数据未缓存，请重新选择源列");
      return;
    }

    try {
      const sheetName = props.sheets[0];
      const ws = props.workbook.Sheets[sheetName];

      // 批量提取结果
      const batchResults = [];

      for (const sourceItem of sourceDataCache.value) {
        let extractedContent = "";

        if (selectedField.value) {
          extractedContent = extractFieldValue(
            sourceItem.value,
            selectedField.value,
            isJsonUnwrapMode.value ? selectedInnerField.value : undefined,
          );
        } else {
          extractedContent = sourceItem.value;
        }

        batchResults.push({
          row: sourceItem.row,
          original: sourceItem.value,
          extracted: extractedContent,
        });
      }

      // 写入目标列
      await writeBatchToTargetColumn(ws, batchResults, targetColumn.value);

      const excelBuffer = XLSX.write(
        { Sheets: { [props.sheets[0]]: ws }, SheetNames: [props.sheets[0]] },
        { bookType: "xlsx", type: "array" },
      );
      const outputBlob = new Blob([excelBuffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      message.success(`批量提取完成！已处理 ${batchResults.length} 行数据`);

      emit("extract-complete", {
        sourceColumn: selectedColumn.value,
        targetColumn: targetColumn.value,
        processedCount: batchResults.length,
        outputBlob,
      });
    } catch (error) {
      message.error(`批量提取失败: ${error.message}`);
    }

    return; // 结束column模式处理
  }

  // 手动输入模式：仅提取显示，不写入Excel
  extractor.state.inputText = textToProcess;
  extractor.state.extractType = extractType.value;
  extractor.state.flattenNested = flattenNested.value;

  await extractor.extract();

  if (extractor.state.lastError) {
    message.error("提取失败");
  } else {
    const count = extractor.state.stats.total;
    if (count > 0) {
      message.success(`成功提取 ${count} 条结果`);
    } else {
      message.warning("未检测到可提取的内容");
    }
  }
}

/**
 * 将提取结果写入目标列
 * @param {Object} ws - 工作表对象
 * @param {Array} sourceData - 源数据数组 [{value, row}]
 * @param {string} targetColumnValue - 目标列值（可能是 "__new__" 或列字母）
 */
async function writeToTargetColumn(ws, sourceData, targetColumnValue) {
  let targetColIndex;

  if (targetColumnValue === "__new__") {
    // 新建列：在现有列之后添加新列
    const range = XLSX.utils.decode_range(ws["!ref"]);
    targetColIndex = range.e.c + 1;
    range.e.c = targetColIndex;
    ws["!ref"] = XLSX.utils.encode_range(range);
  } else {
    // 使用现有列
    const targetCol = props.columns.find(
      (col) => col.letter === targetColumnValue,
    );
    if (!targetCol) {
      throw new Error("无效的目标列选择");
    }
    targetColIndex = targetCol.index;
  }

  // 获取提取结果
  const extractedResults = extractor.filteredItems.value;

  // 为每一行源数据找到对应的提取结果并写入
  for (const sourceItem of sourceData) {
    // 简单策略：按顺序匹配或查找包含关系
    let extractedContent = "";

    if (extractedResults.length > 0) {
      // 查找与当前源值最匹配的结果
      const matchedResult = findBestMatch(sourceItem.value, extractedResults);
      extractedContent = matchedResult ? matchedResult.content : "";
    }

    // 写入单元格
    const targetCellAddress =
      XLSX.utils.encode_col(targetColIndex) + sourceItem.row;

    if (!ws[targetCellAddress]) {
      ws[targetCellAddress] = {};
    }

    ws[targetCellAddress].v = extractedContent || sourceItem.value;
    ws[targetCellAddress].t = "s";
  }
}

/**
 * 查找最佳匹配的提取结果
 * @param {string} sourceValue - 源值
 * @param {Array} results - 提取结果数组
 * @returns {Object|null} 最佳匹配的结果项
 */
function findBestMatch(sourceValue, results) {
  if (!results || results.length === 0) return null;

  // 优先精确匹配
  const exactMatch = results.find((r) => r.content.includes(sourceValue));
  if (exactMatch) return exactMatch;

  // 其次部分匹配
  const partialMatch = results.find(
    (r) =>
      sourceValue.includes(r.content) ||
      r.content.split("").some((char) => sourceValue.includes(char)),
  );
  if (partialMatch) return partialMatch;

  // 最后返回第一个结果
  return results[0];
}

function getStatusColor(status) {
  const map = { success: "green", warning: "orange", error: "red" };
  return map[status] || "default";
}

function getStatusText(status) {
  const map = { success: "成功", warning: "警告", error: "错误" };
  return map[status] || status;
}

function getRateLevel(rate) {
  if (rate >= 90) return "excellent";
  if (rate >= 60) return "good";
  return "poor";
}

function handleCopy(record) {
  navigator.clipboard.writeText(record.content).then(
    () => message.success("已复制到剪贴板"),
    () => message.error("复制失败"),
  );
}

async function handleCopyAll() {
  try {
    const text = filteredItems.value.map((r) => r.content).join("\n\n");
    await navigator.clipboard.writeText(text);
    message.success(`已复制全部 ${filteredItems.value.length} 条结果到剪贴板`);
  } catch (err) {
    message.error("复制失败");
  }
}

function handleViewDetail(record) {
  extractor.selectItem(record);
  // TODO: 显示详情弹窗或抽屉
  message.info(`查看详情: ${record.content.substring(0, 50)}...`);
}

function handleExportResults() {
  // TODO: 实现导出功能
  message.info("导出功能开发中...");
}

function clearError() {
  extractor.state.lastError = null;
}

/**
 * 🆕 从单个数据项中按字段路径提取值
 * 支持多层嵌套和字符串化JSON解包
 * @param {string} data - 原始数据字符串（通常是JSON）
 * @param {string} fieldPath - 字段路径（如 "value_data.file" 或 "value[0].value"）
 * @param {string} [innerPath] - 内层字段路径（JSON解包模式下使用，如 "file" 或 "[0].value"）
 * @returns {string} 提取的值
 */
function extractFieldValue(data, fieldPath, innerPath) {
  try {
    if (
      (data.startsWith("{") || data.startsWith("[")) &&
      data.length < 100000
    ) {
      const parsed = JSON.parse(data);
      const items = Array.isArray(parsed) ? parsed : [parsed];

      for (const item of items) {
        const value = getNestedValue(item, fieldPath);
        // 字段值为空字符串时跳过，继续查找下一个 item
        if (value !== undefined && value !== "") {
          let result = value;

          if (typeof result === "string" && isStringifiedJsonSimple(result)) {
            try {
              result = JSON.parse(result);
            } catch (e) {
              return cleanExtractResult(result);
            }
          }

          if (innerPath && typeof result === "object" && result !== null) {
            const innerValue = getNestedValue(result, innerPath);
            if (innerValue !== undefined) {
              result = innerValue;
            }
          }

          if (Array.isArray(result)) {
            if (result.length === 0) return "[]";
            const mapped = result
              .map((item) =>
                typeof item === "object" && item !== null
                  ? (item.value ?? JSON.stringify(item))
                  : String(item),
              )
              .map((v) => v.trim()); // 去掉每个值的首尾空白
            // 过滤：空串、纯逗号、纯分隔符
            const filtered = mapped.filter(
              (v) => v !== "" && !/^[,\s;，；]+$/.test(v),
            );
            if (filtered.length === 0) return "";
            const joined = filtered.join(", ");
            console.log(
              "[DEBUG] extractFieldValue mapped:",
              JSON.stringify(mapped),
              "filtered:",
              JSON.stringify(filtered),
              "joined:",
              JSON.stringify(joined),
            );
            return cleanExtractResult(joined);
          }

          return cleanExtractResult(
            typeof result === "object"
              ? JSON.stringify(result)
              : String(result),
          );
        }
      }
    }

    return cleanExtractResult(data);
  } catch (e) {
    return data;
  }
}

/**
 * 清理提取结果：去掉首尾多余的分隔符和空白
 * 处理原始数据中已包含 ",觉文" 这类带前导逗号的情况
 */
function cleanExtractResult(result) {
  if (typeof result !== "string") return result;
  // 去掉前导的 ", " / "," / "，" / "；" 等分隔符 + 空白
  return result.replace(/^[,\s;，；]+/, "").replace(/[,\s;，；]+$/, "");
}

/**
 * 🆕 按路径获取嵌套对象的值
 * 支持点号分隔和数组索引：如 "a.b.c" 或 "value[0].value"
 * @param {Object} obj - 对象
 * @param {string} path - 路径（如 "a.b.c" 或 "value[0].value"）
 * @returns {*} 值
 */
function getNestedValue(obj, path) {
  // 支持数组索引的路径解析：value[0].value -> ['value', '0', 'value']
  const parts = path.split(/\.|\[|\]/).filter((p) => p !== "");

  return parts.reduce((current, key) => {
    if (current === undefined || current === null) return undefined;

    // 尝试作为数字索引（数组访问）
    if (/^\d+$/.test(key)) {
      const index = parseInt(key, 10);
      return Array.isArray(current) ? current[index] : undefined;
    }

    // 对象属性访问
    return current[key];
  }, obj);
}

/**
 * 🆕 批量写入目标列
 * @param {Object} ws - 工作表对象
 * @param {Array} results - 结果数组 [{row, original, extracted}]
 * @param {string} targetColumnValue - 目标列值
 */
async function writeBatchToTargetColumn(ws, results, targetColumnValue) {
  let targetColIndex;

  if (targetColumnValue === "__new__") {
    // 新建列
    const range = XLSX.utils.decode_range(ws["!ref"]);
    targetColIndex = range.e.c + 1;
    range.e.c = targetColIndex;
    ws["!ref"] = XLSX.utils.encode_range(range);
  } else {
    // 使用现有列
    const targetCol = props.columns.find(
      (col) => col.letter === targetColumnValue,
    );
    if (!targetCol) throw new Error("无效的目标列选择");
    targetColIndex = targetCol.index;
  }

  // 写入每个结果
  for (const result of results) {
    const targetCellAddress =
      XLSX.utils.encode_col(targetColIndex) + result.row;

    if (!ws[targetCellAddress]) {
      ws[targetCellAddress] = {};
    }

    // 使用 ?? 仅对 null/undefined 回退，保留空字符串/0/false
    const valueToWrite =
      result.extracted !== undefined && result.extracted !== null
        ? result.extracted
        : result.original;
    ws[targetCellAddress].v = valueToWrite;
    ws[targetCellAddress].t = "s";
  }
}
</script>

<style scoped lang="scss">
.param-extract-tab {
  content-visibility: auto;
  contain-intrinsic-size: auto 800px;

  .section-title {
    font-size: 15px;
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: 16px;
    padding-left: 2px;
  }

  .section-divider {
    height: 1px;
    background: var(--border-default);
    margin: 24px 0 20px;
  }

  .form-item {
    margin-bottom: 18px;

    > label {
      display: block;
      font-size: 13px;
      font-weight: 500;
      color: var(--text-secondary);
      margin-bottom: 6px;
    }

    // 覆盖 checkbox 内部的 label 样式，避免被上面的 > label 规则影响
    :deep(label.ant-checkbox-wrapper) {
      display: inline-flex !important;
      align-items: center;
      font-size: 14px;
      color: var(--text-primary);
      margin-bottom: 0;
    }
  }

  .form-row {
    display: flex;
    gap: 16px;

    .flex-1 {
      flex: 1;
    }

    .checkbox-item {
      display: flex;
      align-items: center;
      padding-top: 4px;

      // 强制覆盖所有嵌套的 label 为 inline-flex
      :deep(.ant-checkbox-wrapper) {
        display: inline-flex !important;
        align-items: center !important;
        font-size: 14px;
        color: var(--text-primary);
        margin-bottom: 0 !important;
      }

      // 确保 checkbox 本身也是 inline
      :deep(.ant-checkbox) {
        display: inline-flex;
        align-items: center;
      }
    }
  }

  .hint-text {
    font-size: 12px;
    color: var(--text-tertiary);
    line-height: 1.5;
    margin-top: -10px;
    margin-bottom: 16px;
    padding-left: 2px;
  }

  .action-area {
    margin-top: 24px;
    margin-bottom: 20px;

    .ant-btn {
      height: 44px;
      font-size: 15px;
      font-weight: 600;
      border-radius: 8px;
    }
  }

  .result-section {
    .stats-bar {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 16px;
      background: var(--bg-sunken);
      border-radius: 8px;
      margin-bottom: 16px;
      flex-wrap: wrap;

      .stat-item {
        font-size: 13px;
        color: var(--text-secondary);

        strong {
          color: var(--text-primary);
          font-weight: 700;
          font-variant-numeric: tabular-nums;
        }

        &.stat-sql strong {
          color: #1677ff;
        }

        &.stat-json strong {
          color: #8b5cf6;
        }

        &.stat-excellent strong {
          color: #10b981;
        }

        &.stat-good strong {
          color: #f59e0b;
        }

        &.stat-poor strong {
          color: #ef4444;
        }
      }

      .stat-divider {
        color: var(--border-default);
        font-weight: 300;
      }
    }

    .batch-actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      margin-top: 12px;
      padding-top: 12px;
      border-top: 1px solid var(--border-default);
    }
  }

  .error-alert {
    margin-top: 16px;
  }

  // 交互式参数选择器样式
  .interactive-section-title {
    display: flex;
    align-items: center;
    gap: 8px;
    color: var(--text-primary, #1f2937);
    font-size: 15px;
    font-weight: 600;

    .anticon {
      font-size: 16px;
      color: #1677ff;
    }
  }

  .interactive-selector {
    background: #f8f9fb;
    border-radius: 12px;
    padding: 24px;
    margin-top: 16px;
    border: 1px solid rgba(22, 119, 255, 0.08);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
    will-change: transform;
    contain: layout;

    // 数据结构概览
    .schema-summary {
      background: rgba(8, 145, 178, 0.04);
      border: 1px solid rgba(8, 145, 178, 0.12);
      border-radius: 10px;
      padding: 14px 18px;
      margin-bottom: 20px;

      .schema-header {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 12px;

        .anticon {
          font-size: 15px;
          color: #0891b2;
        }

        .schema-type-tag {
          display: inline-flex;
          align-items: center;
          padding: 2px 10px;
          background: #cffafe;
          color: #0e7490;
          font-size: 12px;
          font-weight: 700;
          border-radius: 4px;
          letter-spacing: 0.5px;
        }

        .schema-meta {
          font-size: 12px;
          color: #6b7280;
          font-weight: 500;

          &::before {
            content: "·";
            margin: 0 8px;
            color: #0891b2;
            opacity: 0.4;
          }
        }
      }

      // JSON 树形结构预览
      .schema-preview {
        margin-top: 12px;
        border-radius: 8px;
        overflow: hidden;
        border: 1px solid rgba(8, 145, 178, 0.15);
        background: #ffffff;
        box-shadow:
          0 1px 3px rgba(0, 0, 0, 0.04),
          inset 0 1px 0 rgba(255, 255, 255, 0.8);

        // 覆盖 CodeEditor 默认样式以适配容器
        :deep(.code-editor-container) {
          border: none;
          border-radius: 8px;
          background: transparent;
        }

        :deep(.cm-editor) {
          font-size: 13px;
          line-height: 1.6;
        }

        :deep(.cm-content) {
          padding: 16px;
        }
      }
    }

    .form-item {
      margin-bottom: 20px;

      &:last-child {
        margin-bottom: 0;
      }
    }

    .field-label {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      color: #6366f1;
      font-size: 13px;
      font-weight: 600;
      margin-bottom: 8px;
      padding-left: 10px;
      border-left: 3px solid #6366f1;
      transition:
        color 0.2s ease,
        border-left-color 0.2s ease;

      &:hover {
        color: #4f46e5;
        border-left-color: #4f46e5;
      }

      &::before {
        content: "";
        display: inline-block;
        width: 16px;
        height: 16px;
        background: linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%);
        border-radius: 4px;
        transition: background 0.2s ease;
      }
    }

    // 树形选择器样式适配
    :deep(.ant-tree-select) {
      .ant-select-selector {
        border-radius: 8px !important;
        min-height: 44px;
        border: 1.5px solid #e5e7eb;

        &:hover {
          border-color: #93c5fd;
          box-shadow: 0 0 0 3px rgba(147, 197, 253, 0.15);
        }

        &.ant-select-focused {
          border-color: #1677ff !important;
          box-shadow: 0 0 0 3px rgba(22, 119, 255, 0.12) !important;
        }
      }

      // 下拉菜单中的树节点
      .ant-select-tree-treenode {
        padding: 4px 8px;

        .ant-select-tree-node-content-wrapper {
          border-radius: 4px;

          /* 性能优化：只过渡 background-color */
          transition: background-color 0.15s ease;

          &:hover {
            background: rgba(99, 102, 241, 0.08);
          }
        }

        // 叶子节点（可选中）样式增强
        &.ant-select-tree-treenode-selected {
          .ant-select-tree-node-content-wrapper {
            background: linear-gradient(
              135deg,
              rgba(99, 102, 241, 0.12) 0%,
              rgba(139, 92, 246, 0.08) 100%
            );
            color: #4338ca;
            font-weight: 600;
          }
        }

        // 类型标签颜色
        .ant-tree-title {
          font-size: 13px;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }
      }
    }

    .value-label {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      color: #059669;
      font-size: 13px;
      font-weight: 600;
      margin-bottom: 8px;
      padding-left: 10px;
      border-left: 3px solid #059669;
      transition:
        color 0.2s ease,
        border-left-color 0.2s ease;

      &:hover {
        color: #047857;
        border-left-color: #047857;
      }

      &::before {
        content: "";
        display: inline-block;
        width: 16px;
        height: 16px;
        background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
        border-radius: 4px;
        transition: background 0.2s ease;
      }
    }

    :deep(.ant-select) {
      width: 100%;

      .ant-select-selector {
        border-radius: 8px !important;
        min-height: 44px;
        border: 1.5px solid #e5e7eb;
        background: white;
        transition:
          border-color 0.25s cubic-bezier(0.4, 0, 0.2, 1),
          box-shadow 0.25s cubic-bezier(0.4, 0, 0.2, 1);

        &:hover {
          border-color: #93c5fd;
          box-shadow: 0 0 0 3px rgba(147, 197, 253, 0.15);
        }

        &.ant-select-focused {
          border-color: #1677ff !important;
          box-shadow: 0 0 0 3px rgba(22, 119, 255, 0.12) !important;
        }
      }

      .ant-select-selection-placeholder {
        color: #9ca3af;
        font-size: 14px;
      }
    }

    :deep(.ant-select-multiple) {
      .ant-select-selection-item {
        background: #eff6ff !important;
        border: 1.5px solid #93c5fd !important;
        border-radius: 6px;
        color: #1e40af;
        font-weight: 500;
        font-size: 13px;
        margin: 2px;
        transition:
          background 0.2s ease,
          border-color 0.2s ease,
          transform 0.2s ease,
          box-shadow 0.2s ease;

        &:hover {
          background: #dbeafe !important;
          border-color: #60a5fa !important;
          transform: translateY(-1px);
          box-shadow: 0 2px 4px rgba(96, 165, 250, 0.15);
        }

        .ant-select-selection-item-remove {
          color: #60a5fa;
          margin-left: 6px;
          font-size: 12px;

          &:hover {
            color: #dc2626;
            transform: scale(1.15);
          }
        }
      }

      .ant-select-selection-overflow {
        gap: 4px;
      }
    }

    .hint-text {
      margin-top: 8px;
      font-style: italic;
      color: #6b7280;
      font-size: 12px;
      opacity: 0.85;
    }

    // 🆕 JSON 字符串化解包提示条样式
    .json-unwrap-hint {
      margin: 16px 0;
      border-radius: 10px;
      overflow: hidden;

      &.ant-alert-info {
        background: rgba(99, 102, 241, 0.06);
        border: 1px solid rgba(99, 102, 241, 0.18);
      }

      &.ant-alert-success {
        background: rgba(16, 185, 129, 0.06);
        border: 1px solid rgba(16, 185, 129, 0.2);
      }

      :deep(.ant-alert-icon) {
        display: none; // 隐藏默认图标
      }

      :deep(.ant-alert-message) {
        padding: 0;
      }

      .unwrap-hint-content {
        display: flex;
        align-items: center;
        gap: 16px;
        padding: 4px 0;

        .hint-icon {
          font-size: 22px;
          flex-shrink: 0;
        }

        .hint-info {
          flex: 1;
          min-width: 0;

          .hint-text {
            display: block;
            font-size: 13px;
            color: #4338ca;
            font-weight: 600;
            margin: 0 0 4px 0;
            font-style: normal;
            opacity: 1;
          }

          .hint-preview {
            display: block;
            font-size: 11px;
            color: #7c3aed;
            font-family: "Consolas", "Monaco", "Courier New", monospace;
            background: rgba(139, 92, 246, 0.08);
            padding: 2px 8px;
            border-radius: 4px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
        }

        .hint-actions {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-shrink: 0;

          .switch-label {
            font-size: 12px;
            color: #9ca3af;
            font-weight: 500;
            transition:
              color 0.2s ease,
              font-weight 0.2s ease;

            &.active {
              color: #059669;
              font-weight: 600;
            }
          }
        }
      }
    }

    // 🆕 内层字段标签样式（紫色，区别于外层）
    .inner-field-label {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      color: #8b5cf6;
      font-size: 13px;
      font-weight: 600;
      margin-bottom: 8px;
      padding-left: 10px;
      border-left: 3px solid #8b5cf6;
      transition:
        color 0.2s ease,
        border-left-color 0.2s ease;

      &:hover {
        color: #7c3aed;
        border-left-color: #7c3aed;
      }

      &::before {
        content: "";
        display: inline-block;
        width: 16px;
        height: 16px;
        background: linear-gradient(135deg, #ede9fe 0%, #ddd6fe 100%);
        border-radius: 4px;
        transition: background 0.2s ease;
      }

      .depth-badge {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 1px 6px;
        font-size: 10px;
        font-weight: 700;
        color: #fff;
        background: #8b5cf6;
        border-radius: 10px;
        letter-spacing: 0.5px;
      }
    }

    // 🆕 字段路径提示（在取值标签后显示）
    .field-path-hint {
      font-size: 11px;
      color: #8b5cf6;
      font-family: "Consolas", "Monaco", "Courier New", monospace;
      font-weight: 500;
      background: rgba(139, 92, 246, 0.1);
      padding: 2px 8px;
      border-radius: 4px;
      max-width: 200px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }
}

@media (max-width: 768px) {
  .param-extract-tab {
    .form-row {
      flex-direction: column;
      gap: 0;
    }

    .stats-bar {
      flex-direction: column;
      align-items: flex-start;
      gap: 6px;
    }

    .stat-divider {
      display: none;
    }
  }
}
</style>
