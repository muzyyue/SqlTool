/**
 * 模板管理模块
 * 提供规则的保存、加载、删除、导出等模板管理功能
 */

import { ref, computed } from "vue";

/**
 * 模板类型定义
 * @typedef {Object} RuleTemplate
 * @property {string} id - 模板唯一标识
 * @property {string} name - 模板名称
 * @property {string} description - 模板描述
 * @property {Array} rules - 规则列表
 * @property {string} createdAt - 创建时间
 * @property {string} updatedAt - 更新时间
 */

/**
 * 存储键名
 */
const STORAGE_KEY = "batch_edit_templates";

/**
 * 默认模板列表
 */
const DEFAULT_TEMPLATES = [
  {
    id: "template_status_update",
    name: "状态更新模板",
    description: "通用的状态字段更新规则",
    rules: [
      {
        fieldName: "status",
        newValue: "已完成",
        condition: {
          enabled: true,
          fieldName: "status",
          operator: "=",
          value: "待处理",
        },
        description: "将待处理状态更新为已完成",
      },
      {
        fieldName: "updated_at",
        newValue: "NOW()",
        condition: { enabled: false, fieldName: "", operator: "=", value: "" },
        description: "更新时间戳",
      },
    ],
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-01T00:00:00Z",
  },
  {
    id: "template_data_clean",
    name: "数据清理模板",
    description: "清理空值和默认值的规则",
    rules: [
      {
        fieldName: "amount",
        newValue: "0",
        condition: {
          enabled: true,
          fieldName: "amount",
          operator: "=",
          value: "",
        },
        description: "空金额置零",
      },
      {
        fieldName: "deleted",
        newValue: "1",
        condition: {
          enabled: true,
          fieldName: "status",
          operator: "=",
          value: "已删除",
        },
        description: "标记删除状态",
      },
    ],
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-01T00:00:00Z",
  },
];

/**
 * 从本地存储加载模板
 * @returns {Array<RuleTemplate>}
 */
const loadTemplatesFromStorage = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const templates = JSON.parse(stored);
      if (Array.isArray(templates) && templates.length > 0) {
        return templates;
      }
    }
  } catch (error) {
    console.error("加载模板失败:", error);
  }
  return [];
};

/**
 * 保存模板到本地存储
 * @param {Array<RuleTemplate>} templates - 模板列表
 */
const saveTemplatesToStorage = (templates) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
  } catch (error) {
    console.error("保存模板失败:", error);
  }
};

/**
 * 使用模板管理功能
 * @returns {Object} 模板管理相关方法和状态
 */
export function useTemplateManager() {
  const templates = ref([]);
  const templateDrawerVisible = ref(false);
  const savingTemplate = ref(false);

  const initialized = ref(false);

  const initTemplates = () => {
    if (initialized.value) return;

    const storedTemplates = loadTemplatesFromStorage();
    if (storedTemplates.length > 0) {
      templates.value = storedTemplates;
    } else {
      templates.value = [...DEFAULT_TEMPLATES];
      saveTemplatesToStorage(templates.value);
    }
    initialized.value = true;
  };

  const getTemplateById = (id) => {
    return templates.value.find((t) => t.id === id);
  };

  const saveTemplate = (template) => {
    const now = new Date().toISOString();

    if (template.id) {
      const index = templates.value.findIndex((t) => t.id === template.id);
      if (index !== -1) {
        templates.value[index] = {
          ...template,
          updatedAt: now,
        };
        saveTemplatesToStorage(templates.value);
        return templates.value[index];
      }
    }

    const newTemplate = {
      ...template,
      id: `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: now,
      updatedAt: now,
    };
    templates.value.push(newTemplate);
    saveTemplatesToStorage(templates.value);
    return newTemplate;
  };

  const deleteTemplate = (templateId) => {
    const index = templates.value.findIndex((t) => t.id === templateId);
    if (index !== -1) {
      templates.value.splice(index, 1);
      saveTemplatesToStorage(templates.value);
      return true;
    }
    return false;
  };

  const duplicateTemplate = (templateId) => {
    const template = getTemplateById(templateId);
    if (!template) return null;

    const now = new Date().toISOString();
    const newTemplate = {
      ...template,
      id: `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: `${template.name} (副本)`,
      createdAt: now,
      updatedAt: now,
    };

    templates.value.push(newTemplate);
    saveTemplatesToStorage(templates.value);
    return newTemplate;
  };

  const exportTemplate = (templateId, format = "json") => {
    const template = getTemplateById(templateId);
    if (!template) return null;

    const exportData = {
      templateName: template.name,
      description: template.description,
      exportedAt: new Date().toISOString(),
      version: "1.0",
      rules: template.rules,
    };

    if (format === "json") {
      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${template.name.replace(/[^a-z0-9\u4e00-\u9fa5]/gi, "_")}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }

    return exportData;
  };

  const importTemplate = (jsonData) => {
    try {
      let data = jsonData;

      if (typeof jsonData === "string") {
        data = JSON.parse(jsonData);
      }

      if (!data.templateName || !data.rules) {
        throw new Error("模板数据格式不正确");
      }

      const now = new Date().toISOString();
      const newTemplate = {
        id: `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: data.templateName,
        description: data.description || "",
        rules: data.rules,
        createdAt: now,
        updatedAt: now,
      };

      templates.value.push(newTemplate);
      saveTemplatesToStorage(templates.value);

      return newTemplate;
    } catch (error) {
      console.error("导入模板失败:", error);
      throw error;
    }
  };

  const clearAllTemplates = () => {
    templates.value = [];
    localStorage.removeItem(STORAGE_KEY);
  };

  const resetToDefaultTemplates = () => {
    templates.value = [...DEFAULT_TEMPLATES];
    saveTemplatesToStorage(templates.value);
  };

  const templateCount = computed(() => templates.value.length);

  const templateList = computed(() => {
    return templates.value.map((t) => ({
      id: t.id,
      name: t.name,
      description: t.description,
      ruleCount: t.rules?.length || 0,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
    }));
  });

  const openTemplateDrawer = () => {
    initTemplates();
    templateDrawerVisible.value = true;
  };

  const closeTemplateDrawer = () => {
    templateDrawerVisible.value = false;
  };

  return {
    templates,
    templateDrawerVisible,
    savingTemplate,
    templateCount,
    templateList,
    initTemplates,
    getTemplateById,
    saveTemplate,
    deleteTemplate,
    duplicateTemplate,
    exportTemplate,
    importTemplate,
    clearAllTemplates,
    resetToDefaultTemplates,
    openTemplateDrawer,
    closeTemplateDrawer,
  };
}
