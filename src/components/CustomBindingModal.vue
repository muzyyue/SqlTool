switch
<template>
  <a-modal
    v-model:open="visible"
    title="自定义字段绑定配置"
    width="90%"
    :footer="null"
    :maskClosable="false"
  >
    <div class="custom-binding-modal">
      <!-- 功能切换 -->
      <div class="feature-toggle">
        <a-switch
          v-model:checked="enableCustomBinding"
          checked-children="启用自定义绑定"
          un-checked-children="禁用自定义绑定"
          @change="handleToggleChange"
        />
        <span class="toggle-description">
          启用后，自定义绑定将优先于自动匹配结果
        </span>
      </div>

      <!-- 自定义绑定配置 -->
      <div v-if="enableCustomBinding" class="binding-config">
        <a-tabs v-model:activeKey="activeTab">
          <!-- 单列绑定标签页 -->
          <a-tab-pane key="single" tab="单列绑定">
            <div class="tab-content">
              <div class="section-header">
                <h4>单列绑定配置</h4>
                <a-space>
                  <a-button
                    type="primary"
                    size="small"
                    @click="addSingleBinding"
                  >
                    <template #icon><PlusOutlined /></template>
                    添加绑定
                  </a-button>
                  <a-button
                    type="dashed"
                    size="small"
                    @click="batchAddSingleBindings"
                  >
                    <template #icon><PlusOutlined /></template>
                    批量添加
                  </a-button>
                </a-space>
              </div>

              <a-table
                :data-source="singleBindings"
                :columns="singleBindingColumns"
                :pagination="false"
                size="small"
                :scroll="{ x: 'max-content' }"
              >
                <template #bodyCell="{ column, record }">
                  <div v-if="column.key === 'ddlField'">
                    <div class="ddl-field-input-wrapper">
                      <a-radio-group
                        v-model:value="record.inputMode"
                        size="small"
                        button-style="solid"
                        style="margin-bottom: 8px"
                      >
                        <a-radio-button value="select">选择</a-radio-button>
                        <a-radio-button value="custom">自定义</a-radio-button>
                      </a-radio-group>

                      <a-select
                        v-if="record.inputMode === 'select'"
                        v-model:value="record.ddlFieldName"
                        style="width: 100%"
                        placeholder="选择DDL字段"
                        @change="handleSingleBindingChange(record)"
                      >
                        <a-select-option
                          v-for="field in availableDdlFields"
                          :key="field.name"
                          :value="field.name"
                          :disabled="isFieldBound(field.name, record.id)"
                        >
                          {{ field.name }} ({{ field.type }})
                        </a-select-option>
                      </a-select>

                      <a-input
                        v-else
                        v-model:value="record.customFieldName"
                        placeholder="输入自定义DDL字段名"
                        @change="handleCustomFieldNameChange(record)"
                      >
                        <template #suffix>
                          <a-tooltip
                            v-if="record.customFieldName"
                            title="清空自定义字段名"
                          >
                            <CloseCircleOutlined
                              style="cursor: pointer; color: #999"
                              @click="clearCustomFieldName(record)"
                            />
                          </a-tooltip>
                        </template>
                      </a-input>

                      <a-alert
                        v-if="
                          record.inputMode === 'custom' &&
                          record.customFieldName &&
                          !isFieldInDdl(record.customFieldName)
                        "
                        type="warning"
                        :message="`字段 '${record.customFieldName}' 不在DDL中`"
                        show-icon
                        size="small"
                        style="margin-top: 4px"
                      />
                    </div>
                  </div>

                  <div v-else-if="column.key === 'excelColumn'">
                    <a-select
                      v-model:value="record.excelIndex"
                      style="width: 100%"
                      placeholder="选择Excel列"
                      @change="handleSingleBindingChange(record)"
                    >
                      <a-select-option :value="-1">未绑定</a-select-option>
                      <a-select-option
                        v-for="(header, idx) in excelHeaders"
                        :key="idx"
                        :value="idx"
                        :disabled="isColumnUsed(idx, record.id)"
                      >
                        {{ header }} (列{{ idx + 1 }})
                      </a-select-option>
                    </a-select>
                  </div>

                  <div v-else-if="column.key === 'actions'">
                    <a-space>
                      <a-button
                        type="link"
                        size="small"
                        danger
                        @click="removeSingleBinding(record.id)"
                      >
                        删除
                      </a-button>
                    </a-space>
                  </div>

                  <div v-else>
                    {{ record[column.key] }}
                  </div>
                </template>
              </a-table>
            </div>
          </a-tab-pane>

          <!-- 字段拼接标签页 -->
          <a-tab-pane key="concatenation" tab="字段拼接">
            <div class="tab-content">
              <div class="section-header">
                <h4>字段拼接配置</h4>
                <a-button
                  type="primary"
                  size="small"
                  @click="addConcatenationRule"
                >
                  <template #icon><PlusOutlined /></template>
                  添加拼接规则
                </a-button>
              </div>

              <a-table
                :data-source="concatenationRules"
                :columns="concatenationColumns"
                :pagination="false"
                size="medium"
                :scroll="{ x: 'max-content' }"
              >
                <template #bodyCell="{ column, record }">
                  <div v-if="column.key === 'customFieldName'">
                    <div class="ddl-field-input-wrapper">
                      <a-radio-group
                        v-model:value="record.inputMode"
                        size="small"
                        button-style="solid"
                        style="margin-bottom: 8px; width: 200px"
                      >
                        <a-radio-button value="select">选择</a-radio-button>
                        <a-radio-button value="custom">自定义</a-radio-button>
                      </a-radio-group>

                      <a-select
                        v-if="record.inputMode === 'select'"
                        v-model:value="record.customFieldName"
                        style="width: 100%"
                        placeholder="选择DDL字段"
                        @change="handleConcatenationChange(record)"
                      >
                        <a-select-option
                          v-for="field in availableDdlFields"
                          :key="field.name"
                          :value="field.name"
                          :disabled="isFieldBound(field.name)"
                        >
                          {{ field.name }} ({{ field.type }})
                        </a-select-option>
                      </a-select>

                      <a-input
                        v-else
                        v-model:value="record.customFieldName"
                        placeholder="输入自定义字段名称"
                        @change="handleConcatenationChange(record)"
                      >
                        <template #suffix>
                          <a-tooltip
                            v-if="record.customFieldName"
                            title="清空自定义字段名"
                          >
                            <CloseCircleOutlined
                              style="cursor: pointer; color: #999"
                              @click="clearConcatenationFieldName(record)"
                            />
                          </a-tooltip>
                        </template>
                      </a-input>

                      <a-alert
                        v-if="
                          record.inputMode === 'custom' &&
                          record.customFieldName &&
                          !isFieldInDdl(record.customFieldName)
                        "
                        type="warning"
                        :message="`字段 '${record.customFieldName}' 不在DDL中`"
                        show-icon
                        size="small"
                        style="margin-top: 4px"
                      />
                    </div>
                  </div>

                  <div v-else-if="column.key === 'dataType'">
                    <a-select
                      v-model:value="record.dataType"
                      style="width: 100%"
                      placeholder="数据类型"
                      @change="handleConcatenationChange(record)"
                    >
                      <a-select-option value="string">字符串</a-select-option>
                      <a-select-option value="int">整数</a-select-option>
                      <a-select-option value="decimal">小数</a-select-option>
                      <a-select-option value="datetime"
                        >日期时间</a-select-option
                      >
                      <a-select-option value="boolean">布尔值</a-select-option>
                    </a-select>
                  </div>

                  <div v-else-if="column.key === 'sourceColumns'">
                    <a-select
                      v-model:value="record.sourceColumns"
                      mode="multiple"
                      style="width: 100%"
                      placeholder="选择源Excel列"
                      @change="handleConcatenationChange(record)"
                    >
                      <a-select-option
                        v-for="(header, idx) in excelHeaders"
                        :key="idx"
                        :value="idx"
                      >
                        {{ header }} (列{{ idx + 1 }})
                      </a-select-option>
                    </a-select>
                    <div
                      v-if="record.sourceColumns.length > 0"
                      style="
                        margin-top: 8px;
                        display: flex;
                        flex-wrap: wrap;
                        gap: 4px;
                      "
                    >
                      <a-tag
                        v-for="(colIndex, index) in record.sourceColumns"
                        :key="colIndex"
                        color="blue"
                      >
                        {{ excelHeaders[colIndex] }} (列{{ colIndex + 1 }}) =
                        {{
                          record.columnVariables[colIndex] ||
                          `value${index + 1}`
                        }}
                      </a-tag>
                    </div>
                  </div>

                  <div v-else-if="column.key === 'separator'">
                    <a-input
                      v-model:value="record.separator"
                      placeholder="分隔符（可选）"
                      @change="handleConcatenationChange(record)"
                    />
                  </div>

                  <div v-else-if="column.key === 'format'">
                    <a-tooltip
                      trigger="focus"
                      placement="topLeft"
                      overlay-class-name="numeric-input"
                      title="格式化模板，支持{value1}, {value2}, {value3}等变量引用，或使用{value}表示所有列的拼接结果"
                    >
                      <a-textarea
                        v-model:value="record.format"
                        placeholder="格式化模板，如：前缀{value1}后缀"
                        :auto-size="{ minRows: 1, maxRows: 4 }"
                        @change="handleConcatenationChange(record)"
                      />
                    </a-tooltip>
                  </div>

                  <div v-else-if="column.key === 'preview'">
                    <div class="preview-value">
                      {{ getConcatenationPreview(record) }}
                    </div>
                  </div>

                  <div v-else-if="column.key === 'actions'">
                    <a-space>
                      <a-button
                        type="link"
                        size="small"
                        danger
                        @click="removeConcatenationRule(record.id)"
                      >
                        删除
                      </a-button>
                    </a-space>
                  </div>

                  <div v-else>
                    {{ record[column.key] }}
                  </div>
                </template>
              </a-table>
            </div>
          </a-tab-pane>

          <!-- 自定义字段标签页 -->
          <a-tab-pane key="customFields" tab="自定义字段">
            <div class="tab-content">
              <div class="section-header">
                <h4>自定义字段配置</h4>
                <a-button type="primary" size="small" @click="addCustomField">
                  <template #icon><PlusOutlined /></template>
                  添加字段
                </a-button>
              </div>

              <a-table
                :data-source="customFields"
                :columns="customFieldColumns"
                :pagination="false"
                size="small"
                :scroll="{ x: 'max-content' }"
              >
                <template #bodyCell="{ column, record }">
                  <div v-if="column.key === 'fieldName'">
                    <div class="ddl-field-input-wrapper">
                      <a-radio-group
                        v-model:value="record.inputMode"
                        size="small"
                        button-style="solid"
                        style="margin-bottom: 8px; width: 200px"
                      >
                        <a-radio-button value="select">选择</a-radio-button>
                        <a-radio-button value="custom">自定义</a-radio-button>
                      </a-radio-group>

                      <a-select
                        v-if="record.inputMode === 'select'"
                        v-model:value="record.fieldName"
                        style="width: 100%"
                        placeholder="选择DDL字段"
                        @change="handleCustomFieldChange(record)"
                      >
                        <a-select-option
                          v-for="field in availableDdlFields"
                          :key="field.name"
                          :value="field.name"
                          :disabled="isFieldBound(field.name)"
                        >
                          {{ field.name }} ({{ field.type }})
                        </a-select-option>
                      </a-select>

                      <a-input
                        v-else
                        v-model:value="record.fieldName"
                        placeholder="输入自定义字段名"
                        @change="handleCustomFieldChange(record)"
                      >
                        <template #suffix>
                          <a-tooltip
                            v-if="record.fieldName"
                            title="清空自定义字段名"
                          >
                            <CloseCircleOutlined
                              style="cursor: pointer; color: #999"
                              @click="clearCustomFieldName(record)"
                            />
                          </a-tooltip>
                        </template>
                      </a-input>

                      <a-alert
                        v-if="
                          record.inputMode === 'custom' &&
                          record.fieldName &&
                          !isFieldInDdl(record.fieldName)
                        "
                        type="warning"
                        :message="`字段 '${record.fieldName}' 不在DDL中`"
                        show-icon
                        style="margin-top: 8px"
                      />
                    </div>
                  </div>

                  <div v-else-if="column.key === 'dataType'">
                    <a-select
                      v-model:value="record.dataType"
                      style="width: 100%"
                      placeholder="选择数据类型"
                      @change="handleCustomFieldChange(record)"
                    >
                      <a-select-option value="string">字符串</a-select-option>
                      <a-select-option value="int">整数</a-select-option>
                      <a-select-option value="decimal">小数</a-select-option>
                      <a-select-option value="datetime"
                        >日期时间</a-select-option
                      >
                      <a-select-option value="boolean">布尔值</a-select-option>
                    </a-select>
                  </div>

                  <div v-else-if="column.key === 'dataSource'">
                    <a-select
                      v-model:value="record.dataSource"
                      style="width: 100%"
                      placeholder="选择数据来源"
                      @change="handleCustomFieldChange(record)"
                    >
                      <a-select-option value="system_function"
                        >系统预设函数</a-select-option
                      >
                      <a-select-option value="excel_combine"
                        >Excel列组合</a-select-option
                      >
                      <a-select-option value="auto_increment"
                        >自增数字</a-select-option
                      >
                    </a-select>
                  </div>

                  <div v-else-if="column.key === 'config'">
                    <div
                      v-if="record.dataSource === 'system_function'"
                      class="config-section"
                    >
                      <a-cascader
                        :value="getCascaderValue(record)"
                        :options="cascaderOptions"
                        style="width: 100%"
                        placeholder="选择数据库类型和函数"
                        @change="(value) => handleCascaderChange(value, record)"
                      />
                    </div>

                    <div
                      v-else-if="record.dataSource === 'excel_combine'"
                      class="config-section"
                    >
                      <a-select
                        v-model:value="record.excelCombineConfig.columns"
                        mode="multiple"
                        style="width: 100%"
                        placeholder="选择Excel列"
                        @change="handleCustomFieldChange(record)"
                      >
                        <a-select-option
                          v-for="(header, idx) in excelHeaders"
                          :key="idx"
                          :value="idx"
                        >
                          {{ header }} (列{{ idx + 1 }})
                        </a-select-option>
                      </a-select>
                      <div style="margin-top: 8px; display: flex; gap: 8px">
                        <a-input
                          v-model:value="record.excelCombineConfig.separator"
                          placeholder="分隔符"
                          style="width: 100px"
                          @change="handleCustomFieldChange(record)"
                        />
                        <a-tooltip
                          trigger="focus"
                          placement="topLeft"
                          overlay-class-name="numeric-input"
                          title="格式化模板，支持{value1}, {value2}, {value3}等变量引用，或使用{value}表示所有列的拼接结果"
                        >
                          <a-textarea
                            v-model:value="record.excelCombineConfig.format"
                            placeholder="格式化模板，如：前缀{value}后缀"
                            :auto-size="{ minRows: 1, maxRows: 4 }"
                            style="flex: 1"
                            @change="handleCustomFieldChange(record)"
                          />
                        </a-tooltip>
                      </div>
                    </div>

                    <div
                      v-else-if="record.dataSource === 'auto_increment'"
                      class="config-section"
                    >
                      <div style="display: flex; gap: 8px; margin-bottom: 8px">
                        <a-input-number
                          v-model:value="record.autoIncrementConfig.start"
                          :min="0"
                          placeholder="起始值"
                          @change="handleCustomFieldChange(record)"
                        />
                        <a-input-number
                          v-model:value="record.autoIncrementConfig.step"
                          :min="1"
                          placeholder="步长"
                          @change="handleCustomFieldChange(record)"
                        />
                      </div>
                      <a-select
                        v-model:value="record.autoIncrementConfig.groupBy"
                        placeholder="选择分组字段（可选--字段是映射部分的）"
                        allow-clear
                        style="width: 100%"
                        @change="handleCustomFieldChange(record)"
                      >
                        <a-select-option
                          v-for="field in availableDdlFields"
                          :key="field.name"
                          :value="field.name"
                        >
                          {{ field.name }} ({{ field.type }})
                        </a-select-option>
                      </a-select>
                      <div
                        style="color: #999; font-size: 12px; margin-top: 4px"
                      >
                        相同分组值的行会连续递增，不同则重置
                      </div>
                    </div>
                  </div>

                  <div v-else-if="column.key === 'preview'">
                    <div class="preview-value">
                      {{ getCustomFieldPreview(record) }}
                    </div>
                  </div>

                  <div v-else-if="column.key === 'actions'">
                    <a-space>
                      <a-button
                        type="link"
                        size="small"
                        danger
                        @click="removeCustomField(record.id)"
                      >
                        删除
                      </a-button>
                    </a-space>
                  </div>

                  <div v-else>
                    {{ record[column.key] }}
                  </div>
                </template>
              </a-table>
            </div>
          </a-tab-pane>
        </a-tabs>

        <!-- 统计信息 -->
        <div class="stats-section">
          <a-divider />
          <div class="stats-grid">
            <a-statistic title="单列绑定" :value="singleBindings.length" />
            <a-statistic title="拼接规则" :value="concatenationRules.length" />
            <a-statistic title="自定义字段" :value="customFields.length" />
            <a-statistic title="总自定义绑定" :value="totalCustomBindings" />
          </div>
        </div>

        <!-- 操作按钮 -->
        <div class="modal-actions">
          <a-space>
            <a-button @click="validateBindings">验证配置</a-button>
            <a-button @click="resetBindings">重置所有</a-button>
            <a-button type="primary" @click="saveBindings">保存配置</a-button>
            <a-button @click="closeModal">关闭</a-button>
          </a-space>
        </div>
      </div>
    </div>
  </a-modal>
</template>

<script setup>
import { ref, computed, watch, h } from "vue";
import { PlusOutlined, CloseCircleOutlined } from "@ant-design/icons-vue";
import { message, Modal } from "ant-design-vue";
import {
  getDatabaseFunctions,
  getSupportedDatabaseTypes,
} from "@/utils/database/databaseFunctions";

// Props
const props = defineProps({
  open: {
    type: Boolean,
    default: false,
  },
  ddlFields: {
    type: Array,
    default: () => [],
  },
  excelHeaders: {
    type: Array,
    default: () => [],
  },
  customBindingManager: {
    type: Object,
    required: true,
  },
  editingField: {
    type: Object,
    default: null,
  },
  fieldMappings: {
    type: Array,
    default: () => [],
  },
});

// Emits
const emit = defineEmits(["update:open", "save"]);

// 响应式数据
const visible = ref(props.open);
const activeTab = ref("single");
const enableCustomBinding = ref(false);

// 初始化enableCustomBinding
watch(
  () => props.customBindingManager?.enableCustomBinding?.value,
  (newVal) => {
    if (newVal !== undefined) {
      enableCustomBinding.value = newVal;
    }
  },
  { immediate: true },
);

// 单列绑定数据
const singleBindings = ref([]);
const singleBindingColumns = [
  {
    title: "DDL字段",
    key: "ddlField",
    width: 200,
    minWidth: 200,
  },
  {
    title: "Excel列",
    key: "excelColumn",
    width: 200,
    minWidth: 200,
  },
  {
    title: "操作",
    key: "actions",
    width: 100,
    fixed: "right",
  },
];

// 字段拼接数据
const concatenationRules = ref([]);
const concatenationColumns = [
  {
    title: "自定义字段名称",
    key: "customFieldName",
    width: 200,
    minWidth: 200,
  },
  {
    title: "数据类型",
    key: "dataType",
    width: 150,
    minWidth: 150,
  },
  {
    title: "源Excel列",
    key: "sourceColumns",
    width: 200,
    minWidth: 200,
  },
  {
    title: "分隔符",
    key: "separator",
    width: 120,
    minWidth: 120,
  },
  {
    title: "格式化模板",
    key: "format",
    width: 300,
    minWidth: 300,
  },
  {
    title: "预览",
    key: "preview",
    width: 120,
    minWidth: 120,
  },
  {
    title: "操作",
    key: "actions",
    width: 100,
    fixed: "right",
  },
];

// 自定义字段数据
const customFields = ref([]);

// 根据函数名和数据库类型查找函数对象
/**
 * 根据数据库类型和函数名查找对应的函数对象
 * @param {string} dbType - 数据库类型
 * @param {string} functionName - 函数名
 * @returns {Object|null} 找到的函数对象或null
 */
const findFunctionByFunctionName = (dbType, functionName) => {
  // 验证参数类型
  if (typeof dbType !== "string" || dbType.trim() === "") {
    dbType = "mysql";
  }

  // 确保functionName是字符串且不为空
  if (typeof functionName !== "string" || functionName.trim() === "") {
    return null;
  }

  // 获取对应数据库的函数列表
  const functions = getDatabaseFunctions(dbType);

  if (!Array.isArray(functions)) {
    return null;
  }

  // 查找函数名匹配的函数
  return functions.find(
    (func) =>
      func && typeof func.name === "string" && func.name === functionName,
  );
};

const customFieldColumns = [
  {
    title: "字段名",
    key: "fieldName",
    width: 120,
    minWidth: 120,
  },
  {
    title: "数据类型",
    key: "dataType",
    width: 150,
    minWidth: 150,
  },
  {
    title: "数据来源",
    key: "dataSource",
    width: 150,
    minWidth: 150,
    customRender: ({ record }) => {
      if (!record) return "未知";
      if (
        record.dataSource === "system_function" &&
        record.systemFunctionConfig?.functionName
      ) {
        const func = findFunctionByFunctionName(
          record.systemFunctionConfig.databaseType,
          record.systemFunctionConfig.functionName,
        );
        if (func) {
          return `${func.name} - ${func.description}`;
        }
        return `${record.systemFunctionConfig.functionName} - 未知函数`;
      }
      const sourceLabels = {
        system_function: "系统预设函数",
        excel_combine: "Excel列组合",
        auto_increment: "自增数字",
      };
      return sourceLabels[record.dataSource] || record.dataSource;
    },
  },
  {
    title: "配置",
    key: "config",
    width: 400,
    minWidth: 400,
  },
  {
    title: "预览",
    key: "preview",
    width: 120,
    minWidth: 120,
  },
  {
    title: "操作",
    key: "actions",
    width: 100,
    fixed: "right",
  },
];

// 计算属性
/**
 * 获取可用的DDL字段列表
 * 从DDL原始字段列表中获取，避免因映射配置字段变更导致的问题
 */
const availableDdlFields = computed(() => {
  return props.ddlFields || [];
});
const totalCustomBindings = computed(
  () =>
    singleBindings.value.length +
    concatenationRules.value.length +
    customFields.value.length,
);
/**
 * 获取级联选择器的选项数据
 * @returns {Array} 级联选择器的选项数组
 */
const cascaderOptions = computed(() => {
  const dbTypes = getSupportedDatabaseTypes();
  const usedValues = new Set();

  return dbTypes.map((dbType) => {
    const functions = getDatabaseFunctions(dbType.value);
    const functionOptions = [];

    if (Array.isArray(functions)) {
      for (const func of functions) {
        if (func && func.name && typeof func.name === "string") {
          // 使用数据库类型前缀和类别确保 key 唯一
          const value = `${dbType.value}_${func.name}_${func.category || "default"}`;

          // 跳过重复的 value
          if (usedValues.has(value)) {
            continue;
          }
          usedValues.add(value);

          functionOptions.push({
            value: value,
            label: func.name,
            description: func.description || "",
            databaseType: dbType.value,
            functionName: func.name,
            functionCategory: func.category || "default",
          });
        }
      }
    }

    return {
      value: dbType.value,
      label: dbType.label,
      children: functionOptions,
    };
  });
});

/**
 * 获取级联选择器的当前值
 * @param {Object} record - 自定义字段记录
 * @returns {Array} 级联选择器的值数组 [databaseType, functionKey]
 */
const getCascaderValue = (record) => {
  if (!record || !record.systemFunctionConfig) {
    return [];
  }

  const { databaseType, functionName } = record.systemFunctionConfig;

  if (!databaseType || !functionName) {
    return [];
  }

  // 遍历 cascaderOptions 查找匹配的函数
  for (const dbType of cascaderOptions.value) {
    if (dbType.value === databaseType) {
      for (const func of dbType.children || []) {
        if (func.functionName === functionName) {
          return [databaseType, func.value];
        }
      }
    }
  }

  // 如果找不到精确匹配，使用旧格式作为后备（兼容旧数据）
  return [databaseType, `${databaseType}_${functionName}`];
};

/**
 * 处理级联选择器的变更事件
 * @param {Array} value - 级联选择器的值 [databaseType, functionKey]
 * @param {Object} record - 自定义字段记录
 */
const handleCascaderChange = (value, record) => {
  if (!Array.isArray(value) || value.length !== 2) {
    return;
  }

  const [databaseType, functionKey] = value;

  // 从 functionKey 中提取 functionName（格式: dbType_functionName_category）
  // 分割字符串后，跳过第一个元素（数据库类型），将剩余部分重新连接作为函数名
  // 这样可以正确处理函数名中包含下划线的情况（如 SYS_GUID、TO_CHAR 等）
  const parts = functionKey.split("_");
  const functionName =
    parts.length >= 3
      ? parts.slice(1, -1).join("_")
      : parts.length >= 2
        ? parts.slice(1).join("_")
        : functionKey;

  if (!record.systemFunctionConfig) {
    record.systemFunctionConfig = {
      databaseType: "mysql",
      functionName: "NOW",
    };
  }

  record.systemFunctionConfig.databaseType = databaseType;
  record.systemFunctionConfig.functionName = functionName;

  handleCustomFieldChange(record);
};

// 监听器
watch(
  () => props.open,
  (newVal) => {
    visible.value = newVal;
    if (newVal) {
      // 模态框打开时加载数据
      loadBindings();
      // 如果有编辑字段，根据数据来源切换到对应标签页
      if (props.editingField) {
        const dataSource = props.editingField.dataSource;
        if (dataSource === "single_binding") {
          activeTab.value = "single";
        } else if (dataSource === "excel_combine") {
          activeTab.value = "concatenation";
        } else {
          activeTab.value = "customFields";
        }
      }
    }
  },
);

// 方法
const loadBindings = () => {
  // 根据是否为编辑模式决定是否加载已保存的数据
  if (props.editingField) {
    // 编辑模式：根据数据来源只加载对应的数据
    const dataSource = props.editingField.dataSource;

    if (dataSource === "single_binding") {
      // 编辑单列绑定：只加载这一条数据
      singleBindings.value = [];
      const isInDdl = props.ddlFields.some(
        (field) => field.name === props.editingField.fieldName,
      );
      singleBindings.value.push({
        id: props.editingField.id || generateId(),
        ddlFieldName: isInDdl ? props.editingField.fieldName : "",
        inputMode: isInDdl ? "select" : "custom",
        customFieldName: isInDdl ? "" : props.editingField.fieldName,
        excelIndex: props.editingField.config?.excelIndex || -1,
      });
      concatenationRules.value = [];
      customFields.value = [];
    } else if (dataSource === "excel_combine") {
      // 编辑拼接规则：只加载这一条数据
      singleBindings.value = [];
      concatenationRules.value = [
        {
          id: props.editingField.id || generateId(),
          inputMode: "select",
          customFieldName: props.editingField.fieldName,
          dataType: props.editingField.dataType || "string",
          sourceColumns: props.editingField.config?.sourceColumns || [],
          columnVariables: {},
          separator: props.editingField.config?.separator || "",
          format: props.editingField.config?.format || "",
        },
      ];
      customFields.value = [];
    } else {
      // 编辑自定义字段：只加载这一条数据
      singleBindings.value = [];
      concatenationRules.value = [];
      customFields.value = [
        {
          id: props.editingField.id || generateId(),
          inputMode: "select",
          fieldName: props.editingField.fieldName,
          dataType: props.editingField.dataType || "string",
          dataSource: props.editingField.dataSource || "system_function",
          systemFunctionConfig: {
            databaseType:
              props.editingField.systemFunctionConfig?.databaseType || "mysql",
            functionName:
              props.editingField.systemFunctionConfig?.functionName || "NOW",
          },
          excelCombineConfig: {
            columns: props.editingField.excelCombineConfig?.columns || [],
            separator: props.editingField.excelCombineConfig?.separator || "",
            format: props.editingField.excelCombineConfig?.format || "",
          },
          autoIncrementConfig: {
            start: props.editingField.autoIncrementConfig?.start || 1,
            step: props.editingField.autoIncrementConfig?.step || 1,
          },
        },
      ];
    }
  } else {
    // 添加模式：所有数据都应该是空的
    singleBindings.value = [];
    concatenationRules.value = [];
    customFields.value = [];
  }
};

const handleToggleChange = (checked) => {
  enableCustomBinding.value = checked;
  props.customBindingManager.setEnableCustomBinding(checked);
};

const addSingleBinding = () => {
  singleBindings.value.push({
    id: generateId(),
    ddlFieldName: "",
    inputMode: "select",
    customFieldName: "",
    excelIndex: -1,
  });
};

/**
 * 批量添加单列绑定
 * 为所有未绑定的DDL字段创建绑定记录
 */
const batchAddSingleBindings = () => {
  // 获取已绑定的DDL字段名
  const boundFieldNames = new Set(
    singleBindings.value
      .filter((binding) => binding.ddlFieldName)
      .map((binding) => binding.ddlFieldName),
  );

  // 为所有未绑定的DDL字段创建绑定记录
  props.ddlFields.forEach((ddlField) => {
    if (!boundFieldNames.has(ddlField.name)) {
      singleBindings.value.push({
        id: generateId(),
        ddlFieldName: ddlField.name,
        excelIndex: -1,
      });
    }
  });

  message.success(
    `已批量添加 ${props.ddlFields.length - boundFieldNames.size} 个绑定记录`,
  );
};

const removeSingleBinding = (id) => {
  const index = singleBindings.value.findIndex((binding) => binding.id === id);
  if (index >= 0) {
    singleBindings.value.splice(index, 1);
  }
};

const handleSingleBindingChange = (record) => {
  // 只更新本地状态，不立即添加到管理器中
  // 最终保存时由saveBindings统一处理
};

const addConcatenationRule = () => {
  concatenationRules.value.push({
    id: generateId(),
    inputMode: "select",
    customFieldName: "",
    dataType: "string",
    sourceColumns: [],
    columnVariables: {},
    separator: "",
    format: "",
  });
};

const clearConcatenationFieldName = (record) => {
  record.customFieldName = "";
};

const removeConcatenationRule = (id) => {
  const index = concatenationRules.value.findIndex((rule) => rule.id === id);
  if (index >= 0) {
    const rule = concatenationRules.value[index];
    const customFieldName = rule.customFieldName;

    concatenationRules.value.splice(index, 1);

    if (customFieldName) {
      props.customBindingManager.removeConcatenationRule(customFieldName);
      props.customBindingManager.removeCustomField(customFieldName);
    }
  }
};

const handleConcatenationChange = (record) => {
  if (record.customFieldName && record.sourceColumns.length > 0) {
    // 自动分配变量名：value1, value2, value3...
    const newColumnVariables = {};
    record.sourceColumns.forEach((colIndex, index) => {
      newColumnVariables[colIndex] = `value${index + 1}`;
    });
    record.columnVariables = newColumnVariables;
  }
};

const isFieldBound = (fieldName, currentBindingId) => {
  // 字段拼接规则可以重复选择同一字段（可能是编辑已有规则）
  // 只检查单列绑定中的字段
  return singleBindings.value.some(
    (binding) =>
      binding.id !== currentBindingId && binding.ddlFieldName === fieldName,
  );
};

const isFieldInDdl = (fieldName) => {
  return props.ddlFields.some((field) => field.name === fieldName);
};

const handleCustomFieldNameChange = (record) => {
  // 只更新本地状态，不立即添加到管理器中
  // 最终保存时由saveBindings统一处理
  if (record.customFieldName) {
    record.ddlFieldName = record.customFieldName;
  }
};

const clearCustomFieldName = (record) => {
  record.customFieldName = "";
  record.ddlFieldName = "";
};

const isColumnUsed = (columnIndex, currentBindingId) => {
  return singleBindings.value.some(
    (binding) =>
      binding.id !== currentBindingId && binding.excelIndex === columnIndex,
  );
};

const getConcatenationPreview = (rule) => {
  if (!rule.customFieldName || rule.sourceColumns.length === 0) {
    return "请配置规则";
  }

  let result;
  const sampleValues = rule.sourceColumns.map(
    (colIndex, idx) => `值${idx + 1}`,
  );

  result = sampleValues.join(rule.separator || "");

  if (rule.format) {
    // 替换{value1}, {value2}, {value3}等变量
    result = rule.format.replace(/\{value(\d+)\}/g, (match, num) => {
      const index = parseInt(num, 10) - 1;
      return sampleValues[index] !== undefined ? sampleValues[index] : "";
    });

    // 保持向后兼容：将{value}替换为所有列的拼接结果
    result = result.replace(
      /{value}/g,
      sampleValues.join(rule.separator || ""),
    );
  }

  return result.length > 20 ? result.substring(0, 20) + "..." : result;
};

const validateBindings = () => {
  const validation = props.customBindingManager.validateBindings();

  if (validation.isValid) {
    message.success("自定义绑定配置验证通过");
  } else {
    Modal.error({
      title: "自定义绑定配置验证失败",
      content: h("div", [
        h("p", "以下配置存在问题，请修复后再保存："),
        h("ul", { style: { paddingLeft: "20px", marginTop: "10px" } }, [
          ...validation.errors.map((error) =>
            h(
              "li",
              { style: { marginBottom: "5px", color: "#ff4d4f" } },
              error,
            ),
          ),
        ]),
      ]),
      okText: "我知道了",
    });
  }
};

const resetBindings = () => {
  props.customBindingManager.resetBindings();
  singleBindings.value = [];
  concatenationRules.value = [];
  customFields.value = [];
  message.info("已重置所有自定义绑定配置");
};

/**
 * 检查字段名是否与现有配置冲突
 * @param {string} fieldName - 要检查的字段名
 * @returns {Object} 冲突检测结果 { isConflict: boolean, conflictSource: string }
 */
const checkFieldConflict = (fieldName) => {
  if (!fieldName || typeof fieldName !== "string") {
    return { isConflict: false, conflictSource: "" };
  }

  const trimmedName = fieldName.trim();
  if (!trimmedName) {
    return { isConflict: false, conflictSource: "" };
  }

  // 检查字段映射中显示的DDL字段名（映射配置中显示的字段）
  if (
    props.fieldMappings &&
    props.fieldMappings.some(
      (mapping) => mapping.ddlField?.name === trimmedName,
    )
  ) {
    return { isConflict: true, conflictSource: "字段映射" };
  }

  // 检查单列绑定中的自定义字段名
  if (
    singleBindings.value.some(
      (binding) => binding.customFieldName === trimmedName,
    )
  ) {
    return { isConflict: true, conflictSource: "单列绑定" };
  }

  // 检查字段拼接规则中的自定义字段名
  if (
    concatenationRules.value.some(
      (rule) => rule.customFieldName === trimmedName,
    )
  ) {
    return { isConflict: true, conflictSource: "字段拼接规则" };
  }

  // 检查现有自定义字段
  if (customFields.value.some((field) => field.fieldName === trimmedName)) {
    return { isConflict: true, conflictSource: "自定义字段" };
  }

  return { isConflict: false, conflictSource: "" };
};

const addCustomField = () => {
  const typeLabels = {
    system_function: "系统函数",
    excel_combine: "Excel组合",
    auto_increment: "自增",
  };

  // 使用 generateId() 生成唯一字段名，确保不会重复
  const defaultFieldName = `${typeLabels["system_function"] || "自定义"}_${generateId()}`;

  // 检查生成的默认字段名是否冲突
  const conflictResult = checkFieldConflict(defaultFieldName);
  if (conflictResult.isConflict) {
    Modal.warning({
      title: "字段名冲突",
      content: `字段 "${defaultFieldName}" 与现有的${conflictResult.conflictSource}存在冲突，无法添加重复字段。请刷新页面后重试。`,
      okText: "我知道了",
    });
    return;
  }

  const newField = {
    id: generateId(),
    inputMode: "custom",
    fieldName: defaultFieldName,
    dataType: "string",
    dataSource: "system_function",
    systemFunctionConfig: {
      databaseType: "mysql",
      functionName: "NOW",
    },
    excelCombineConfig: {
      columns: [],
      separator: "",
      format: "",
    },
    autoIncrementConfig: {
      start: 1,
      step: 1,
    },
  };

  customFields.value.push(newField);
};

const removeCustomField = (id) => {
  const index = customFields.value.findIndex((field) => field.id === id);
  if (index >= 0) {
    const fieldToRemove = customFields.value[index];
    customFields.value.splice(index, 1);
    // 从管理器中移除
    if (fieldToRemove.fieldName) {
      props.customBindingManager.removeCustomField(fieldToRemove.fieldName);
    }
  }
};

// 注意：不直接调用addCustomField，只更新本地状态
// 最终保存时由saveBindings统一处理
/**
 * 处理自定义字段变更
 * @param {Object} record - 自定义字段记录
 */
const handleCustomFieldChange = (record) => {
  if (!record || typeof record !== "object") {
    return;
  }

  if (!record.fieldName) {
    return;
  }

  // 检查字段名是否与其他配置冲突
  // 只在字段名变更且不为空时检查
  // 编辑模式下，如果字段名没有改变，不视为冲突
  const originalFieldName = props.editingField?.fieldName || "";
  const conflictResult = checkFieldConflictExcludingCurrent(
    record.fieldName,
    record.id,
    originalFieldName,
  );
  if (conflictResult.isConflict) {
    Modal.warning({
      title: "字段名冲突",
      content: `字段 "${record.fieldName}" 与现有的${conflictResult.conflictSource}存在冲突，请使用其他字段名。`,
      okText: "我知道了",
      onOk: () => {
        record.fieldName = "";
      },
    });
    return;
  }

  if (record.dataSource === "system_function") {
    if (!record.systemFunctionConfig) {
      record.systemFunctionConfig = {
        databaseType: "mysql",
        functionName: "NOW",
      };
    }
  }
};

/**
 * 检查字段名是否与现有配置冲突（排除当前记录）
 * @param {string} fieldName - 要检查的字段名
 * @param {string} currentId - 当前记录的ID，排除自己
 * @param {string} currentFieldName - 当前字段的原始名称（用于编辑模式判断）
 * @returns {Object} 冲突检测结果 { isConflict: boolean, conflictSource: string }
 */
const checkFieldConflictExcludingCurrent = (
  fieldName,
  currentId,
  currentFieldName = "",
) => {
  if (!fieldName || typeof fieldName !== "string") {
    return { isConflict: false, conflictSource: "" };
  }

  const trimmedName = fieldName.trim();
  if (!trimmedName) {
    return { isConflict: false, conflictSource: "" };
  }

  // 检查字段映射中显示的DDL字段名（映射配置中显示的字段）
  // 编辑模式：如果字段名没有改变，不视为冲突
  if (
    props.fieldMappings &&
    props.fieldMappings.some(
      (mapping) => mapping.ddlField?.name === trimmedName,
    )
  ) {
    // 编辑模式且字段名未改变，不视为冲突
    if (currentFieldName && currentFieldName === trimmedName) {
      // 继续检查其他冲突
    } else {
      return { isConflict: true, conflictSource: "字段映射" };
    }
  }

  // 检查单列绑定中的自定义字段名
  if (
    singleBindings.value.some(
      (binding) => binding.customFieldName === trimmedName,
    )
  ) {
    return { isConflict: true, conflictSource: "单列绑定" };
  }

  // 检查字段拼接规则中的自定义字段名
  if (
    concatenationRules.value.some(
      (rule) => rule.customFieldName === trimmedName,
    )
  ) {
    return { isConflict: true, conflictSource: "字段拼接规则" };
  }

  // 检查现有自定义字段（排除当前记录）
  if (
    customFields.value.some(
      (field) => field.id !== currentId && field.fieldName === trimmedName,
    )
  ) {
    return { isConflict: true, conflictSource: "自定义字段" };
  }

  return { isConflict: false, conflictSource: "" };
};

/**
 * 获取自定义字段的预览值
 * @param {Object} field - 自定义字段配置对象
 * @returns {string} 预览值
 */
const getCustomFieldPreview = (field) => {
  // 参数验证
  if (!field || typeof field !== "object") {
    return "字段配置无效";
  }

  if (!field.fieldName || field.fieldName.trim() === "") {
    return "请配置字段名";
  }

  // 根据数据来源类型生成预览
  switch (field.dataSource) {
    case "system_function": {
      // 验证系统函数配置
      if (
        !field.systemFunctionConfig ||
        typeof field.systemFunctionConfig !== "object"
      ) {
        return "系统函数配置无效";
      }

      const { databaseType, functionName } = field.systemFunctionConfig;

      // 如果没有选择函数，提示用户选择
      if (!functionName || functionName.trim() === "") {
        return "请选择系统函数";
      }

      // 查找函数信息
      const func = findFunctionByFunctionName(databaseType, functionName);

      if (func) {
        return `${func.name}() - ${func.description}`;
      }

      // 如果找不到函数，显示用户选择的函数名
      return `${functionName}() - 未知函数`;
    }

    case "excel_combine": {
      // 验证Excel组合配置
      if (
        !field.excelCombineConfig ||
        typeof field.excelCombineConfig !== "object"
      ) {
        return "Excel组合配置无效";
      }

      const { columns, separator = "", format = "" } = field.excelCombineConfig;

      if (!Array.isArray(columns) || columns.length === 0) {
        return "请选择Excel列";
      }

      const sampleValues = columns.map((_, idx) => `值${idx + 1}`);
      let result = sampleValues.join(separator);

      if (format.trim()) {
        result = format.replace(/{value}/g, result);
      }

      return result.length > 20 ? result.substring(0, 20) + "..." : result;
    }

    case "auto_increment": {
      // 验证自增配置
      if (
        !field.autoIncrementConfig ||
        typeof field.autoIncrementConfig !== "object"
      ) {
        return "自增配置无效";
      }

      const { start = 1, step = 1 } = field.autoIncrementConfig;

      // 确保数值类型正确
      const startValue = Number(start) || 1;
      const stepValue = Number(step) || 1;

      return `${startValue} (步长: ${stepValue})`;
    }

    default:
      return "请选择数据来源";
  }
};

const saveBindings = () => {
  // 判断是编辑模式还是添加模式
  const isEditMode = !!props.editingField;

  if (isEditMode) {
    // 编辑模式：只更新被编辑的数据
    const dataSource = props.editingField.dataSource;

    if (dataSource === "single_binding") {
      // 编辑单列绑定：先删除旧的，再添加新的
      props.customBindingManager.removeCustomBinding(
        props.editingField.fieldName,
      );
      singleBindings.value.forEach((binding) => {
        const finalFieldName =
          binding.inputMode === "custom"
            ? binding.customFieldName
            : binding.ddlFieldName;
        if (finalFieldName && binding.excelIndex >= 0) {
          props.customBindingManager.addCustomBinding(
            finalFieldName,
            binding.excelIndex,
            "single",
          );
        }
      });
    } else if (dataSource === "excel_combine") {
      // 编辑拼接规则：先删除旧的，再添加新的
      props.customBindingManager.removeConcatenationRule(
        props.editingField.fieldName,
      );
      concatenationRules.value.forEach((rule) => {
        if (
          rule.customFieldName &&
          rule.sourceColumns &&
          rule.sourceColumns.length > 0
        ) {
          props.customBindingManager.addConcatenationRule(
            rule.customFieldName,
            rule.sourceColumns,
            rule.separator || "",
            rule.format || "",
            rule.dataType || "string",
          );
        }
      });
    } else {
      // 编辑自定义字段：先删除旧的，再添加新的
      props.customBindingManager.removeCustomField(
        props.editingField.fieldName,
      );
      customFields.value.forEach((field) => {
        if (field.fieldName) {
          props.customBindingManager.addCustomField(field);
        }
      });
    }
  } else {
    // 添加模式：只添加新数据，不清空已有数据

    // 1. 添加本地单列绑定
    singleBindings.value.forEach((binding) => {
      const finalFieldName =
        binding.inputMode === "custom"
          ? binding.customFieldName
          : binding.ddlFieldName;
      if (finalFieldName && binding.excelIndex >= 0) {
        // 先删除同名的旧绑定（如果存在）
        props.customBindingManager.removeCustomBinding(finalFieldName);
        props.customBindingManager.addCustomBinding(
          finalFieldName,
          binding.excelIndex,
          "single",
        );
      }
    });

    // 2. 添加本地字段拼接规则
    concatenationRules.value.forEach((rule) => {
      if (
        rule.customFieldName &&
        rule.sourceColumns &&
        rule.sourceColumns.length > 0
      ) {
        // 先删除同名的旧规则（如果存在）
        props.customBindingManager.removeConcatenationRule(
          rule.customFieldName,
        );
        props.customBindingManager.addConcatenationRule(
          rule.customFieldName,
          rule.sourceColumns,
          rule.separator || "",
          rule.format || "",
          rule.dataType || "string",
        );
      }
    });

    // 3. 添加本地自定义字段
    customFields.value.forEach((field) => {
      if (field.fieldName) {
        // 先删除同名的旧字段（如果存在）
        props.customBindingManager.removeCustomField(field.fieldName);
        props.customBindingManager.addCustomField(field);
      }
    });
  }

  // 统计保存的数据
  const singleCount = isEditMode
    ? props.editingField.dataSource === "single_binding"
      ? singleBindings.value.length
      : 0
    : singleBindings.value.length;
  const concatCount = isEditMode
    ? props.editingField.dataSource === "excel_combine"
      ? concatenationRules.value.length
      : 0
    : concatenationRules.value.length;
  const customCount = isEditMode
    ? !["single_binding", "excel_combine"].includes(
        props.editingField.dataSource,
      )
      ? customFields.value.length
      : 0
    : customFields.value.length;

  emit("save", {
    singleBindings: singleBindings.value,
    concatenationRules: concatenationRules.value,
    customFields: customFields.value,
  });

  message.success(
    `自定义绑定配置已保存：${singleCount} 个单列绑定、${concatCount} 个拼接规则、${customCount} 个自定义字段`,
  );

  closeModal();
};

const closeModal = () => {
  visible.value = false;
  emit("update:open", false);
};

const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};
</script>

<style scoped>
.custom-binding-modal {
  max-height: 70vh;
  overflow-y: auto;
  contain: content;
}

.feature-toggle {
  display: flex;
  align-items: center;
  margin-bottom: 16px;
  padding: 12px;
  background: var(--table-header-bg);
  border-radius: var(--border-radius-sm);
}

.toggle-description {
  margin-left: 12px;
  color: var(--text-secondary);
  font-size: 12px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.tab-content {
  min-height: 300px;
}

.tab-content :deep(.ant-table) {
  overflow-x: auto;
}

.tab-content :deep(.ant-table-container) {
  overflow-x: auto;
}

.tab-content :deep(.ant-table-body) {
  overflow-x: auto;
}

.preview-value {
  font-size: 12px;
  color: var(--text-secondary);
  word-break: break-all;
}

.stats-section {
  margin-top: 16px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

.config-section {
  margin-top: 8px;
  padding: 8px;
  background: var(--panel-bg);
  border-radius: var(--border-radius-sm);
  border: 1px solid var(--panel-border);
}

.modal-actions {
  margin-top: 16px;
  text-align: right;
  padding-top: 16px;
  border-top: 1px solid var(--border-default);
}

.ddl-field-input-wrapper {
  padding: 4px;
}

.ddl-field-input-wrapper .ant-radio-group {
  display: flex;
  width: 100%;
}

.ddl-field-input-wrapper .ant-radio-button-wrapper {
  flex: 1;
  text-align: center;
}
</style>
