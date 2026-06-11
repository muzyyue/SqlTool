<template>
  <div class="batch-edit-panel">
    <div class="glass-card">
      <a-collapse v-model:activeKey="activeKey" :bordered="false">
        <a-collapse-panel key="1" header="批量修改SQL语句">
          <div class="action-bar">
            <a-space>
              <a-button type="primary" @click="handleAddRule" size="small">
                <template #icon><PlusOutlined /></template>
                添加修改规则
              </a-button>
              <a-button @click="batchImport.openImport" size="small">
                <template #icon><ImportOutlined /></template>
                批量导入
              </a-button>
              <a-button
                @click="templateManager.openTemplateDrawer()"
                size="small"
              >
                <template #icon><FolderOpenOutlined /></template>
                模板管理
              </a-button>
              <a-button
                @click="handleExportRules('excel')"
                size="small"
                :disabled="editRules.length === 0"
              >
                <template #icon><ExportOutlined /></template>
                导出Excel
              </a-button>
              <a-button
                @click="handleExportRules('json')"
                size="small"
                :disabled="editRules.length === 0"
              >
                <template #icon><FileExcelOutlined /></template>
                导出JSON
              </a-button>
              <a-button
                @click="handleReset"
                size="small"
                :disabled="editRules.length === 0"
              >
                <template #icon><ReloadOutlined /></template>
                重置
              </a-button>
            </a-space>

            <div class="stats-info">
              <a-tag color="blue">规则数量: {{ editRules.length }}</a-tag>
              <a-tag v-if="rulesStats.withCondition > 0" color="orange">
                带条件: {{ rulesStats.withCondition }}
              </a-tag>
            </div>
          </div>

          <div v-if="editRules.length > 0" class="rules-list">
            <div
              v-for="rule in editRules"
              :key="rule.id"
              class="rule-item glass-card-inner"
            >
              <div class="rule-header">
                <span class="rule-title"
                  >修改规则 #{{ editRules.indexOf(rule) + 1 }}</span
                >
                <a-button
                  type="link"
                  danger
                  size="small"
                  @click="handleRemoveRule(rule.id)"
                >
                  <template #icon><DeleteOutlined /></template>
                  删除
                </a-button>
              </div>

              <div class="rule-field">
                <label class="field-label">选择字段:</label>
                <a-select
                  v-model:value="rule.fieldName"
                  placeholder="请选择要修改的字段"
                  style="width: 100%"
                  :options="fieldOptions"
                  show-search
                  :filter-option="filterOption"
                />
              </div>

              <div class="rule-field">
                <label class="field-label">新值:</label>
                <a-input
                  v-model:value="rule.newValue"
                  placeholder="输入新的字段值"
                  :allow-clear="true"
                >
                  <template #suffix>
                    <a-tooltip title="输入NULL表示设置为空值">
                      <InfoCircleOutlined style="color: #999" />
                    </a-tooltip>
                  </template>
                </a-input>
              </div>

              <div class="rule-field condition-section">
                <div class="condition-header">
                  <a-checkbox v-model:checked="rule.condition.enabled">
                    <span class="condition-label">设置修改条件</span>
                  </a-checkbox>
                  <a-tooltip title="启用后，只有满足条件的行才会被修改">
                    <QuestionCircleOutlined
                      style="color: #999; margin-left: 4px"
                    />
                  </a-tooltip>
                </div>

                <div v-if="rule.condition.enabled" class="condition-content">
                  <div class="condition-row">
                    <label class="field-label">条件字段:</label>
                    <a-select
                      v-model:value="rule.condition.fieldName"
                      placeholder="选择条件字段"
                      style="width: 100%"
                      :options="fieldOptions"
                      show-search
                      :filter-option="filterOption"
                    />
                  </div>
                  <div class="condition-row">
                    <label class="field-label">操作符:</label>
                    <a-select
                      v-model:value="rule.condition.operator"
                      placeholder="选择操作符"
                      style="width: 100%"
                    >
                      <a-select-option value="=">=</a-select-option>
                      <a-select-option value="!=">!=</a-select-option>
                      <a-select-option value=">">&gt;</a-select-option>
                      <a-select-option value="<">&lt;</a-select-option>
                      <a-select-option value=">=">&gt;=</a-select-option>
                      <a-select-option value="<=">&lt;=</a-select-option>
                      <a-select-option value="LIKE">LIKE</a-select-option>
                      <a-select-option value="IN">IN</a-select-option>
                    </a-select>
                  </div>
                  <div class="condition-row">
                    <label class="field-label">条件值:</label>
                    <a-input
                      v-model:value="rule.condition.value"
                      placeholder="输入条件值"
                      :allow-clear="true"
                    >
                      <template #suffix>
                        <a-tooltip title="IN操作符使用逗号分隔多个值">
                          <InfoCircleOutlined style="color: #999" />
                        </a-tooltip>
                      </template>
                    </a-input>
                  </div>
                </div>
              </div>
            </div>

            <a-empty
              v-if="editRules.length === 0"
              description="暂无修改规则，点击上方按钮添加"
              style="padding: 40px 0"
            />

            <div v-if="editRules.length > 0" class="bottom-actions">
              <a-space>
                <a-button @click="handlePreview" :loading="previewing">
                  <template #icon><EyeOutlined /></template>
                  预览修改
                </a-button>
                <a-button
                  type="primary"
                  @click="handleApply"
                  :loading="applying"
                >
                  <template #icon><CheckOutlined /></template>
                  应用修改
                </a-button>
              </a-space>
            </div>

            <a-alert
              v-if="previewResult.affectedRows > 0"
              :message="`预览结果：将影响 ${previewResult.affectedRows} 行数据`"
              type="info"
              show-icon
              style="flex: 1; margin-left: 16px"
            />
          </div>
        </a-collapse-panel>
      </a-collapse>
    </div>

    <a-modal
      v-model:open="batchImport.importState.visible"
      :title="`批量导入修改规则`"
      width="800px"
      :footer="null"
      :mask-closable="false"
    >
      <a-steps
        :current="batchImport.importState.step"
        size="small"
        style="margin-bottom: 24px"
      >
        <a-step title="选择格式" />
        <a-step title="上传文件" />
        <a-step title="字段映射" />
        <a-step title="预览确认" />
      </a-steps>

      <div class="import-content">
        <div
          v-if="batchImport.importState.step === 0"
          class="import-step step-format"
        >
          <h4>选择导入格式</h4>
          <a-radio-group
            v-model:value="batchImport.importState.format"
            class="format-options"
            @change="(e) => batchImport.setFormat(e.target.value)"
          >
            <a-card
              hoverable
              class="format-card"
              @click="batchImport.setFormat('excel')"
            >
              <template #cover>
                <div class="format-icon">
                  <FileExcelOutlined style="font-size: 48px; color: #52c41a" />
                </div>
              </template>
              <a-radio-button
                value="excel"
                :checked="batchImport.importState.format === 'excel'"
              >
                Excel 文件
              </a-radio-button>
              <p class="format-hint">支持 .xlsx、.xls、.csv 格式</p>
            </a-card>
            <a-card
              hoverable
              class="format-card"
              @click="batchImport.setFormat('json')"
            >
              <template #cover>
                <div class="format-icon">
                  <CodeOutlined style="font-size: 48px; color: #1890ff" />
                </div>
              </template>
              <a-radio-button
                value="json"
                :checked="batchImport.importState.format === 'json'"
              >
                JSON 文件
              </a-radio-button>
              <p class="format-hint">支持标准 JSON 格式</p>
            </a-card>
          </a-radio-group>
        </div>

        <div
          v-if="batchImport.importState.step === 1"
          class="import-step step-upload"
        >
          <h4>上传 {{ batchImport.formatName }} 文件</h4>
          <a-upload
            v-model:file-list="batchImport.importState.fileList"
            :before-upload="batchImport.beforeUpload"
            :custom-request="batchImport.customRequest"
            accept=".xlsx,.xls,.csv,.json"
            :show-upload-list="true"
            name="file"
          >
            <a-button :loading="batchImport.importState.uploading">
              <upload-outlined />
              点击或拖拽文件到此处上传
            </a-button>
          </a-upload>
          <a-divider />
          <a-button type="link" @click="batchImport.downloadTemplate">
            <DownloadOutlined /> 下载导入模板
          </a-button>
        </div>

        <div
          v-if="batchImport.importState.step === 2"
          class="import-step step-mapping"
        >
          <h4>确认字段映射</h4>
          <p class="mapping-tip">
            系统将尝试自动匹配字段名，请确认或修改以下映射关系
          </p>
          <a-table
            :data-source="batchImport.importState.fieldMappings"
            :columns="batchImport.mappingColumns"
            :pagination="false"
            size="small"
            :scroll="{ y: 300 }"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'importField'">
                {{ record.importField }}
              </template>
              <template v-if="column.key === 'status'">
                <a-tag :color="batchImport.statusColor[record.status]">
                  {{ batchImport.statusText[record.status] }}
                </a-tag>
              </template>
              <template v-if="column.key === 'ddlField'">
                <a-select
                  v-model:value="record.ddlField"
                  :options="batchImport.ddlFieldOptions"
                  placeholder="选择 DDL 字段"
                  style="width: 100%"
                  show-search
                  :filter-option="filterOption"
                  @change="
                    (value) => batchImport.handleFieldMappingChange(record)
                  "
                  allow-clear
                />
              </template>
              <template v-if="column.key === 'action'">
                <a-button
                  type="link"
                  size="small"
                  danger
                  @click="batchImport.skipMapping(record)"
                >
                  跳过
                </a-button>
              </template>
            </template>
          </a-table>
          <a-alert
            v-if="batchImport.importState.fieldMappings.length === 0"
            message="没有需要映射的字段"
            type="info"
            show-icon
            style="margin-top: 16px"
          />
        </div>

        <div
          v-if="batchImport.importState.step === 3"
          class="import-step step-preview"
        >
          <h4>预览即将导入的规则</h4>
          <a-table
            :data-source="batchImport.importState.previewRules"
            :columns="batchImport.previewColumns"
            :pagination="{ pageSize: 5 }"
            size="small"
            :scroll="{ y: 300 }"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'condition'">
                <span v-if="record.condition !== '-'">
                  <a-tag color="orange">{{ record.condition }}</a-tag>
                </span>
                <span v-else>-</span>
              </template>
            </template>
          </a-table>
          <a-alert
            message="确认导入"
            :description="`即将添加 ${batchImport.importState.previewRules.length} 条修改规则，是否继续？`"
            type="info"
            show-icon
            style="margin-top: 16px"
          />
        </div>

        <div v-if="batchImport.importState.error" class="import-error">
          <a-alert
            :message="batchImport.importState.error"
            type="error"
            show-icon
          />
        </div>
      </div>

      <a-divider />

      <div
        class="import-actions"
        style="
          display: flex;
          justify-content: space-between;
          align-items: center;
        "
      >
        <a-space>
          <a-button
            v-if="batchImport.importState.step > 0"
            @click="batchImport.prevStep"
          >
            上一步
          </a-button>
          <a-button
            v-if="batchImport.importState.step < 3"
            type="primary"
            @click="batchImport.nextStep"
            :disabled="!batchImport.canNext"
          >
            下一步
          </a-button>
          <a-button
            v-if="batchImport.importState.step === 3"
            type="primary"
            @click="batchImport.confirmImport"
            :loading="batchImport.importState.importing"
          >
            确认导入
          </a-button>
        </a-space>
        <a-button @click="batchImport.closeImport">取消</a-button>
      </div>
    </a-modal>

    <TemplateManager
      :current-rules="editRules"
      :ddl-fields="fieldOptions"
      @load="handleLoadTemplate"
      @export="handleExportTemplate"
    />
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from "vue";
import { message } from "ant-design-vue";
import * as XLSX from "xlsx";
import {
  PlusOutlined,
  ReloadOutlined,
  DeleteOutlined,
  EyeOutlined,
  CheckOutlined,
  QuestionCircleOutlined,
  InfoCircleOutlined,
  ImportOutlined,
  ExportOutlined,
  UploadOutlined,
  DownloadOutlined,
  FileExcelOutlined,
  CodeOutlined,
  FolderOpenOutlined,
} from "@ant-design/icons-vue";
import { useBatchImport } from "@/composables/data/useBatchImport.js";
import { useTemplateManager } from "@/composables/data/useTemplateManager.js";
import TemplateManager from "./TemplateManager.vue";

const props = defineProps({
  ddlFields: {
    type: Array,
    default: () => [],
  },
  excelData: {
    type: Array,
    default: () => [],
  },
  fieldMappings: {
    type: Array,
    default: () => [],
  },
  autoPreview: {
    type: Boolean,
    default: false,
  },
  rules: {
    type: Array,
    default: () => [],
  },
});

const emit = defineEmits(["preview", "apply", "change", "update:excelData"]);

const activeKey = ref([]);
const previewing = ref(false);
const applying = ref(false);
const editRules = ref([]);
const previewResult = ref({
  affectedRows: 0,
  modifiedData: [],
});

const batchImport = useBatchImport({
  enableAutoMatch: true,
  maxRules: 100,
  skipInvalid: true,
  autoPreview: false,
});

const templateManager = useTemplateManager();

const fieldOptions = computed(() => {
  return props.ddlFields.map((field) => ({
    label: `${field.name} (${field.type})`,
    value: field.name,
  }));
});

const rulesStats = computed(() => {
  return {
    total: editRules.value.length,
    withCondition: editRules.value.filter((r) => r.condition.enabled).length,
  };
});

const filterOption = (input, option) => {
  return option.label.toLowerCase().includes(input.toLowerCase());
};

onMounted(() => {
  batchImport.setDdlFields(props.ddlFields);
  batchImport.setOnRulesChange((newRules) => {
    editRules.value = [...editRules.value, ...newRules];
    emit("change", editRules.value);
    if (props.autoPreview && props.excelData.length > 0) {
      handlePreview();
    }
  });
  batchImport.setOnImportComplete((rules) => {
    message.success(`成功导入 ${rules.length} 条规则`);
  });
  batchImport.setOnImportError((error) => {
    message.error(`导入失败: ${error.message}`);
  });
});

watch(
  () => props.ddlFields,
  (newFields) => {
    batchImport.setDdlFields(newFields);
  },
  { deep: true },
);

watch(
  editRules,
  () => {
    if (
      props.autoPreview &&
      props.excelData &&
      props.excelData.length > 0 &&
      editRules.value.length > 0
    ) {
      const result = applyBatchEditToData(props.excelData, editRules.value);
      emit("preview", result);
    }
    emit("change", editRules.value);
  },
  { deep: true },
);

watch(
  () => props.rules,
  (newRules) => {
    if (newRules && newRules.length > 0) {
      editRules.value = [...newRules];
    }
  },
  { immediate: true },
);

const handleExportRules = (format = "excel") => {
  if (editRules.value.length === 0) {
    message.warning("没有可导出的规则");
    return;
  }

  const exportData = editRules.value.map((rule) => ({
    字段名: rule.fieldName,
    新值: rule.newValue,
    条件字段: rule.condition.enabled ? rule.condition.fieldName : "",
    操作符: rule.condition.enabled ? rule.condition.operator : "",
    条件值: rule.condition.enabled ? rule.condition.value : "",
    描述: rule.description || "",
  }));

  if (format === "excel") {
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "批量修改规则");

    const colWidths = [
      { wch: 20 },
      { wch: 30 },
      { wch: 20 },
      { wch: 10 },
      { wch: 30 },
      { wch: 30 },
    ];
    worksheet["!cols"] = colWidths;

    XLSX.writeFile(workbook, "batch_edit_rules.xlsx");
    message.success(`已导出 ${editRules.value.length} 条规则到 Excel`);
  } else if (format === "json") {
    const jsonData = {
      templateName: "批量修改规则导出",
      exportedAt: new Date().toISOString(),
      version: "1.0",
      ruleCount: editRules.value.length,
      rules: editRules.value.map((rule) => ({
        fieldName: rule.fieldName,
        newValue: rule.newValue,
        condition: rule.condition.enabled
          ? {
              enabled: true,
              fieldName: rule.condition.fieldName,
              operator: rule.condition.operator,
              value: rule.condition.value,
            }
          : { enabled: false, fieldName: "", operator: "=", value: "" },
        description: rule.description || "",
      })),
    };

    const blob = new Blob([JSON.stringify(jsonData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `batch_edit_rules_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    message.success(`已导出 ${editRules.value.length} 条规则到 JSON`);
  }
};

const getExcelColumnIndex = (ddlFieldName) => {
  const mapping = props.fieldMappings.find((m) => {
    const ddlField = m.ddlField;
    const ddlFieldNameValue =
      ddlField && typeof ddlField === "object" ? ddlField.name : ddlField;
    return ddlFieldNameValue === ddlFieldName || m.excelHeader === ddlFieldName;
  });
  return mapping ? mapping.excelIndex : -1;
};

const matchCondition = (fieldValue, operator, conditionValue) => {
  try {
    switch (operator) {
      case "=":
        return String(fieldValue) === String(conditionValue);
      case "!=":
        return String(fieldValue) !== String(conditionValue);
      case ">":
        return Number(fieldValue) > Number(conditionValue);
      case "<":
        return Number(fieldValue) < Number(conditionValue);
      case ">=":
        return Number(fieldValue) >= Number(conditionValue);
      case "<=":
        return Number(fieldValue) <= Number(conditionValue);
      case "LIKE": {
        const pattern = conditionValue.replace(/%/g, ".*").replace(/_/g, ".");
        const regex = new RegExp(pattern, "i");
        return regex.test(String(fieldValue));
      }
      case "IN": {
        const values = conditionValue.split(",").map((v) => v.trim());
        return values.includes(String(fieldValue));
      }
      default:
        return false;
    }
  } catch (error) {
    console.error("条件匹配失败:", error);
    return false;
  }
};

const validateFieldType = (fieldName, value) => {
  const field = props.ddlFields.find((f) => f.name === fieldName);
  if (!field) {
    return { valid: true, error: null };
  }

  const fieldType = (field.type || "").toUpperCase();
  const strValue = String(value).trim();

  if (
    strValue === "" ||
    strValue === "NULL" ||
    strValue === "NULL".toLowerCase()
  ) {
    return { valid: true, error: null };
  }

  const intTypes = [
    "INT",
    "INTEGER",
    "BIGINT",
    "SMALLINT",
    "TINYINT",
    "MEDIUMINT",
    "NUMBER",
    "NUMERIC",
    "DECIMAL",
    "FLOAT",
    "DOUBLE",
    "REAL",
    "BIGDECIMAL",
  ];
  const dateTypes = ["DATE", "DATETIME", "TIMESTAMP", "TIME", "YEAR"];
  const boolTypes = ["BOOLEAN", "BOOL", "BIT"];

  if (intTypes.some((t) => fieldType.includes(t))) {
    const numValue = Number(strValue);
    if (isNaN(numValue) || !isFinite(numValue)) {
      return {
        valid: false,
        error: `字段 "${fieldName}" 类型为 ${field.type}，值 "${value}" 不是有效的数字`,
      };
    }
  } else if (dateTypes.some((t) => fieldType.includes(t))) {
    const dateValue = new Date(strValue);
    if (isNaN(dateValue.getTime())) {
      return {
        valid: false,
        error: `字段 "${fieldName}" 类型为 ${field.type}，值 "${value}" 不是有效的日期格式`,
      };
    }
  } else if (boolTypes.some((t) => fieldType.includes(t))) {
    const lowerValue = strValue.toLowerCase();
    if (!["TRUE", "FALSE", "1", "0", "YES", "NO"].includes(lowerValue)) {
      return {
        valid: false,
        error: `字段 "${fieldName}" 类型为 ${field.type}，值 "${value}" 不是有效的布尔值（可用 TRUE/FALSE/1/0）`,
      };
    }
  }

  return { valid: true, error: null };
};

const applyBatchEditToData = (data, rules) => {
  if (!data || !rules || rules.length === 0) {
    return {
      affectedRows: 0,
      modifiedData: data,
    };
  }

  const modifiedData = data.map((row) => ({ ...row }));
  const affectedRowIndices = new Set();

  rules.forEach((rule) => {
    if (
      !rule.fieldName ||
      rule.newValue === undefined ||
      rule.newValue === ""
    ) {
      return;
    }

    const columnIndex = getExcelColumnIndex(rule.fieldName);
    if (columnIndex === -1) {
      return;
    }

    const typeValidation = validateFieldType(rule.fieldName, rule.newValue);
    if (!typeValidation.valid) {
      throw new Error(typeValidation.error);
    }

    let rowIndicesToModify = [];

    if (rule.condition.enabled) {
      const conditionColumnIndex = getExcelColumnIndex(
        rule.condition.fieldName,
      );
      if (conditionColumnIndex === -1) {
        return;
      }

      rowIndicesToModify = modifiedData
        .map((row, index) => {
          const conditionFieldValue = row[String(conditionColumnIndex)];
          const match = matchCondition(
            conditionFieldValue,
            rule.condition.operator,
            rule.condition.value,
          );
          return match ? index : -1;
        })
        .filter((index) => index !== -1);
    } else {
      rowIndicesToModify = modifiedData.map((_, index) => index);
    }

    rowIndicesToModify.forEach((rowIndex) => {
      modifiedData[rowIndex][String(columnIndex)] = rule.newValue;
      affectedRowIndices.add(rowIndex);
    });
  });

  return {
    affectedRows: affectedRowIndices.size,
    modifiedData,
  };
};

const handleAddRule = () => {
  const newRule = {
    id: `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    fieldName: "",
    newValue: "",
    condition: {
      enabled: false,
      operator: "=",
      value: "",
    },
  };
  editRules.value.push(newRule);
  if (activeKey.value.length === 0) {
    activeKey.value = ["1"];
  }
  emit("change", editRules.value);
};

const handleRemoveRule = (ruleId) => {
  const index = editRules.value.findIndex((rule) => rule.id === ruleId);
  if (index !== -1) {
    editRules.value.splice(index, 1);
  }
  emit("change", editRules.value);
};

const handleReset = () => {
  editRules.value = [];
  previewResult.value = {
    affectedRows: 0,
    modifiedData: [],
  };
  message.info("已重置所有修改规则");
  emit("change", editRules.value);
};

const handleLoadTemplate = (rules) => {
  const normalizedRules = rules.map((rule) => ({
    id: `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    fieldName: rule.fieldName || "",
    newValue: rule.newValue || "",
    condition: rule.condition || {
      enabled: false,
      fieldName: "",
      operator: "=",
      value: "",
    },
    description: rule.description || "",
  }));

  editRules.value = [...editRules.value, ...normalizedRules];
  emit("change", editRules.value);
  message.success(`已加载 ${normalizedRules.length} 条规则`);
};

const handleExportTemplate = (template) => {
  message.info(`模板 "${template.name}" 已导出`);
};

const handlePreview = async () => {
  if (!props.excelData || props.excelData.length === 0) {
    message.warning("请先上传Excel文件");
    return;
  }
  if (editRules.value.length === 0) {
    message.warning("请先添加修改规则");
    return;
  }
  previewing.value = true;
  try {
    const result = applyBatchEditToData(props.excelData, editRules.value);
    previewResult.value = result;
    emit("preview", result);
    message.success(`预览成功，将影响 ${result.affectedRows} 行数据`);
  } catch (error) {
    message.error("预览失败：" + error.message);
  } finally {
    previewing.value = false;
  }
};

const handleApply = async () => {
  if (!props.excelData || props.excelData.length === 0) {
    message.warning("请先上传Excel文件");
    return;
  }
  if (editRules.value.length === 0) {
    message.warning("请先添加修改规则");
    return;
  }
  applying.value = true;
  try {
    const result = applyBatchEditToData(props.excelData, editRules.value);
    emit("update:excelData", result.modifiedData);
    emit("apply", result);
    message.success(`应用成功，已修改 ${result.affectedRows} 行数据`);
  } catch (error) {
    message.error("应用失败：" + error.message);
  } finally {
    applying.value = false;
  }
};

watch(
  editRules,
  () => {
    if (
      props.autoPreview &&
      props.excelData &&
      props.excelData.length > 0 &&
      editRules.value.length > 0
    ) {
      const result = applyBatchEditToData(props.excelData, editRules.value);
      emit("preview", result);
    }
    emit("change", editRules.value);
  },
  { deep: true },
);

defineExpose({
  addRule: handleAddRule,
  removeRule: handleRemoveRule,
  resetRules: handleReset,
  applyBatchEdit: () => applyBatchEditToData(props.excelData, editRules.value),
});
</script>

<style scoped>
.batch-edit-panel {
  margin-top: 16px;
  contain: layout style;
}

.glass-card {
  background: var(--bg-elevated);
  border-radius: var(--border-radius-md);
  border: 1px solid var(--border-default);
  overflow: hidden;
}

.glass-card-inner {
  background: var(--bg-elevated);
  border-radius: var(--border-radius-sm);
  border: 1px solid var(--border-light);
  padding: 16px;
  margin-bottom: 12px;
  transition: border-color var(--transition-normal) ease;
}

.glass-card-inner:hover {
  border-color: var(--color-primary-border);
}

.action-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: var(--color-primary-bg);
  border-bottom: 1px solid var(--color-primary-border);
  margin-bottom: 16px;
  border-radius: var(--border-radius-sm);
}

.stats-info {
  display: flex;
  gap: 8px;
}

.rules-list {
  max-height: 500px;
  overflow-y: auto;
  padding: 0;
  content-visibility: auto;
  contain-intrinsic-size: auto 300px;
}

.rule-item {
  margin-bottom: 12px;
}

.rule-item:last-child {
  margin-bottom: 0;
}

.rule-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--color-primary-border);
}

.rule-title {
  font-weight: 600;
  font-size: 14px;
  color: var(--color-primary);
}

.rule-field {
  margin-bottom: 12px;
}

.rule-field:last-child {
  margin-bottom: 0;
}

.field-label {
  display: block;
  margin-bottom: 6px;
  font-size: 13px;
  color: var(--text-secondary);
  font-weight: 500;
}

.condition-section {
  background: var(--color-success-bg);
  border-radius: var(--border-radius-sm);
  padding: 12px;
  border: 1px solid var(--color-success-border);
}

.condition-header {
  display: flex;
  align-items: center;
  margin-bottom: 12px;
}

.condition-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--color-success);
}

.condition-content {
  padding-left: 24px;
}

.condition-row {
  margin-bottom: 12px;
}

.condition-row:last-child {
  margin-bottom: 0;
}

.bottom-actions {
  display: flex;
  align-items: center;
  padding: 16px;
  background: var(--color-primary-bg);
  border-top: 1px solid var(--color-primary-border);
  margin-top: 16px;
  border-radius: var(--border-radius-sm);
}

.bottom-actions .ant-alert {
  margin-left: 0 !important;
  margin-top: 12px;
}

.rules-list::-webkit-scrollbar {
  width: 6px;
}

.rules-list::-webkit-scrollbar-track {
  background: var(--scrollbar-track);
  border-radius: 3px;
}

.rules-list::-webkit-scrollbar-thumb {
  background: var(--scrollbar-thumb);
  border-radius: 3px;
}

.rules-list::-webkit-scrollbar-thumb:hover {
  background: var(--scrollbar-thumb-hover);
}

:deep(.ant-collapse) {
  background: transparent;
  border: none;
}

:deep(.ant-collapse-item) {
  border: none;
}

:deep(.ant-collapse-header) {
  font-weight: 600;
  font-size: 15px;
  color: var(--color-primary);
  padding: 16px;
}

:deep(.ant-collapse-content) {
  border: none;
  background: transparent;
  transition: none;
}

:deep(.ant-collapse-content-box) {
  padding: 0 16px 16px;
}

:deep(.ant-btn) {
  transition: background-color var(--transition-fast) ease;
}

:deep(.ant-btn:hover) {
  opacity: 0.9;
}

:deep(.ant-btn:active) {
  opacity: 1;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.rule-item {
  animation: fadeIn 0.2s ease;
}

.import-content {
  min-height: 300px;
}

.import-step {
  padding: 16px 0;
}

.import-step h4 {
  margin-bottom: 16px;
  color: #333;
  font-size: 16px;
}

.format-options {
  display: flex;
  gap: 16px;
}

.format-card {
  width: 180px;
  text-align: center;
  cursor: pointer;
}

.format-card:hover {
  border-color: #1890ff;
}

.format-icon {
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fafafa;
  border-radius: 8px 8px 0 0;
}

.format-hint {
  margin-top: 8px;
  color: #999;
  font-size: 12px;
}

.mapping-tip {
  margin-bottom: 16px;
  color: #666;
  font-size: 13px;
}

.import-error {
  margin-top: 16px;
}

.import-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid #f0f0f0;
}
</style>
