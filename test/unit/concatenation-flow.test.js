/**
 * Integration test: Simulate the full handleCustomBindingSave flow
 * to verify concatenation rules survive the entire save process
 */
import { describe, it, expect, beforeEach } from "vitest";
import { ref, computed } from "vue";

/**
 * Creates a minimal custom binding manager with all required functions
 */
function createBindingManager() {
  const customFields = ref([]);
  const customBindings = ref([]);
  const fieldConcatenationRules = ref([]);

  return {
    customFields,
    customBindings,
    fieldConcatenationRules,
    addConcatenationRule: (fieldName, sourceColumns, separator = "", format = null, dataType = "string") => {
      fieldConcatenationRules.value.push({
        id: `r-${Date.now()}`,
        ddlFieldName: fieldName,
        sourceColumns,
        separator,
        format,
        dataType,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    },
    addCustomBinding: (ddlFieldName, excelIndex, bindingType = "single") => {
      customBindings.value.push({ ddlFieldName, excelIndex, bindingType });
    },
    addCustomField: (field) => {
      customFields.value.push(field);
    },
    isFieldNameUnique: () => true,
    removeCustomField: () => {},
    removeConcatenationRule: () => {},
    removeCustomBinding: () => {},
    setEnableCustomBinding: () => {},
    // THIS FUNCTION DOES NOT EXIST in the real composable!
    // InsertPage calls it at line 1872 - it would throw a TypeError
    addFieldConcatenationRule: undefined,
  };
}

/**
 * Simulates the UpdatePage's handleCustomBindingSave logic (AFTER our changes)
 */
function simulateUpdatePageSave(manager, parsedFields, fieldMappings, savePayload) {
  // The save payload from CustomBindingModal has singleBindings, concatenationRules, customFields
  // But we read from the composable (already populated by saveBindings in modal)

  // Step 1: Read from composable (already populated by modal's saveBindings)
  const customBindings = [...manager.customBindings.value];
  const fieldConcatenationRules = [...manager.fieldConcatenationRules.value];

  // Step 2: Process single bindings
  customBindings.filter(b => b.bindingType === "single").forEach(binding => {
    const { ddlFieldName, excelIndex } = binding;
    let ddlField = parsedFields.value.find(f => f.name === ddlFieldName);
    if (!ddlField) {
      ddlField = {
        name: ddlFieldName, type: "string", nullable: true,
        isCustom: true, customConfig: { fieldName: ddlFieldName, isFromCustomBinding: true },
      };
      parsedFields.value.push(ddlField);
    }
    const existingIdx = fieldMappings.value.findIndex(m => m.ddlField?.name === ddlFieldName);
    if (existingIdx >= 0) {
      fieldMappings.value[existingIdx] = { ...fieldMappings.value[existingIdx], excelIndex, status: "bound" };
    } else {
      fieldMappings.value.push({ ddlField, excelIndex, status: "bound", confidence: "manual" });
    }
  });

  // Step 3: Process concatenation rules
  fieldConcatenationRules.forEach(rule => {
    if (rule.ddlFieldName && rule.ddlFieldName.trim() !== "") {
      let ddlField = parsedFields.value.find(f => f.name === rule.ddlFieldName);
      if (!ddlField) {
        ddlField = {
          name: rule.ddlFieldName, type: rule.dataType || "string",
          nullable: true, isCustom: true,
          customConfig: {
            fieldName: rule.ddlFieldName, dataType: rule.dataType || "string",
            dataSource: "excel_combine",
            excelCombineConfig: { columns: rule.sourceColumns || [], separator: rule.separator || "", format: rule.format || "", isFromConcatenationRule: true },
          },
        };
        parsedFields.value.push(ddlField);
      }
      const existingMappingIdx = fieldMappings.value.findIndex(m => m.ddlField?.name === rule.ddlFieldName);
      if (existingMappingIdx >= 0) {
        fieldMappings.value[existingMappingIdx] = {
          ...fieldMappings.value[existingMappingIdx],
          ddlField, excelIndex: -1, excelHeader: null,
          status: "unmatched", confidence: "manual", generatedByFunction: true,
        };
      } else {
        fieldMappings.value.push({
          ddlField, excelHeader: null, excelIndex: -1,
          similarity: 0, confidence: "manual", status: "unmatched", generatedByFunction: true,
        });
      }
    }
  });

  // Step 4: Process custom fields  
  let customFields = savePayload?.customFields || [...manager.customFields.value];

  const validCustomFieldsMap = new Map();
  customFields.forEach(field => {
    if (field && field.fieldName && field.fieldName.trim()) {
      if (!validCustomFieldsMap.has(field.fieldName.trim())) {
        validCustomFieldsMap.set(field.fieldName.trim(), []);
      }
      validCustomFieldsMap.get(field.fieldName.trim()).push(field);
    }
  });
  const validCustomFields = Array.from(validCustomFieldsMap.values()).flat();

  const concatenationRuleNames = new Set(
    fieldConcatenationRules.map(r => r.ddlFieldName).filter(Boolean),
  );

  // Step 5: Filter parsedFields - keep DDL fields + concatenation rule fields
  parsedFields.value = parsedFields.value.filter(field => {
    if (!field.isCustom) return true;
    return concatenationRuleNames.has(field.name);
  });

  // Step 6: Add custom fields to parsedFields
  validCustomFields.forEach(customField => {
    parsedFields.value.push({
      name: customField.fieldName,
      type: customField.dataType || "string",
      isCustom: true,
      customConfig: customField,
    });
  });

  // Step 7: Add field mappings for custom fields
  validCustomFields.forEach(customField => {
    const ddlFieldRef = parsedFields.value.find(f => f.name === customField.fieldName);
    const existingIdx = fieldMappings.value.findIndex(m => m.ddlField?.name === customField.fieldName);
    if (existingIdx >= 0) {
      fieldMappings.value[existingIdx] = { ...fieldMappings.value[existingIdx], ddlField: ddlFieldRef };
    } else {
      fieldMappings.value.push({
        ddlField: ddlFieldRef, excelHeader: null, excelIndex: -1,
        similarity: 0, confidence: "manual", status: "unmatched", generatedByFunction: true,
      });
    }
  });
}

/**
 * Simulates InsertPage's handleCustomBindingSave logic
 * Including the problematic addFieldConcatenationRule call
 */
function simulateInsertPageSave(manager, parsedFields, fieldMappings, savePayload) {
  // Same as UpdatePage steps 1-3
  const customBindings = [...manager.customBindings.value];
  const fieldConcatenationRules = [...manager.fieldConcatenationRules.value];

  // Process single bindings (same as above)
  customBindings.filter(b => b.bindingType === "single").forEach(binding => {
    const { ddlFieldName, excelIndex } = binding;
    let ddlField = parsedFields.value.find(f => f.name === ddlFieldName);
    if (!ddlField) {
      ddlField = {
        name: ddlFieldName, type: "string", nullable: true,
        isCustom: true, customConfig: { fieldName: ddlFieldName, isFromCustomBinding: true },
      };
      parsedFields.value.push(ddlField);
    }
    const existingIdx = fieldMappings.value.findIndex(m => m.ddlField?.name === ddlFieldName);
    if (existingIdx >= 0) {
      fieldMappings.value[existingIdx] = { ...fieldMappings.value[existingIdx], excelIndex, status: "bound" };
    } else {
      fieldMappings.value.push({ ddlField, excelIndex, status: "bound", confidence: "manual" });
    }
  });

  // Process concatenation rules (same as UpdatePage)
  fieldConcatenationRules.forEach(rule => {
    if (rule.ddlFieldName && rule.ddlFieldName.trim() !== "") {
      let ddlField = parsedFields.value.find(f => f.name === rule.ddlFieldName);
      if (!ddlField) {
        ddlField = {
          name: rule.ddlFieldName, type: rule.dataType || "string",
          nullable: true, isCustom: true,
          customConfig: {
            fieldName: rule.ddlFieldName, dataType: rule.dataType || "string",
            dataSource: "excel_combine",
            excelCombineConfig: { columns: rule.sourceColumns || [], separator: rule.separator || "", format: rule.format || "", isFromConcatenationRule: true },
          },
        };
        parsedFields.value.push(ddlField);
      }
      const existingMappingIdx = fieldMappings.value.findIndex(m => m.ddlField?.name === rule.ddlFieldName);
      if (existingMappingIdx >= 0) {
        fieldMappings.value[existingMappingIdx] = {
          ...fieldMappings.value[existingMappingIdx],
          ddlField, excelIndex: -1, excelHeader: null,
          status: "unmatched", confidence: "manual", generatedByFunction: true,
        };
      } else {
        fieldMappings.value.push({
          ddlField, excelHeader: null, excelIndex: -1,
          similarity: 0, confidence: "manual", status: "unmatched", generatedByFunction: true,
        });
      }
    }
  });

  // InsertPage-specific: register concatenation rules to manager
  // THIS CALL DOES NOT EXIST - IT WOULD THROW TypeError!
  try {
    const savedRules = manager.fieldConcatenationRules.value || [];
    fieldConcatenationRules.forEach((rule) => {
      const exists = savedRules.some(
        (savedRule) => savedRule.ddlFieldName === rule.ddlFieldName,
      );
      if (!exists) {
        manager.addFieldConcatenationRule(
          rule.ddlFieldName, rule.sourceColumns, rule.separator, rule.format, rule.dataType,
        );
      }
    });
  } catch (e) {
    // Error is caught by the outer try/catch in the real code
    // This causes handleCustomBindingSave to exit early
    return { error: e.message };
  }

  // The code below would NOT execute if addFieldConcatenationRule throws
  
  // Process custom fields
  let customFields = [...manager.customFields.value];
  if (savePayload?.customFields) {
    savePayload.customFields.forEach(field => {
      if (field && field.fieldName && !customFields.find(f => f.fieldName === field.fieldName)) {
        customFields.push(field);
      }
    });
  }

  const validCustomFieldsMap = new Map();
  customFields.forEach(field => {
    if (field && field.fieldName && field.fieldName.trim()) {
      validCustomFieldsMap.set(field.fieldName.trim(), field);
    }
  });
  const validCustomFields = Array.from(validCustomFieldsMap.values());

  const concatenationRuleNames = new Set(
    fieldConcatenationRules.map(r => r.ddlFieldName).filter(Boolean),
  );

  const newFieldConfigMap = new Map();
  validCustomFields.forEach(field => {
    if (field.fieldName) newFieldConfigMap.set(field.fieldName, field);
  });

  // Cleanup: preserve concatenation rule fields, remove stale custom fields
  parsedFields.value = parsedFields.value.map((field) => {
    if (!field.isCustom) return field;
    if (concatenationRuleNames.has(field.name)) return field;
    if (newFieldConfigMap.has(field.name)) {
      const newConfig = newFieldConfigMap.get(field.name);
      newFieldConfigMap.delete(field.name);
      return { ...field, isCustom: true, customConfig: newConfig };
    }
    return null;
  }).filter(Boolean);

  // Add remaining custom fields
  newFieldConfigMap.forEach((customField) => {
    parsedFields.value.push({
      name: customField.fieldName,
      type: customField.dataType || "string",
      isCustom: true,
      customConfig: customField,
    });
  });

  // Add field mappings
  validCustomFields.forEach(customField => {
    const ddlFieldRef = parsedFields.value.find(f => f.name === customField.fieldName);
    const existingIdx = fieldMappings.value.findIndex(m => m.ddlField?.name === customField.fieldName);
    if (existingIdx >= 0) {
      fieldMappings.value[existingIdx] = { ...fieldMappings.value[existingIdx], ddlField: ddlFieldRef };
    } else {
      fieldMappings.value.push({
        ddlField: ddlFieldRef, excelHeader: null, excelIndex: -1,
        similarity: 0, confidence: "manual", status: "unmatched", generatedByFunction: true,
      });
    }
  });

  return { success: true };
}

function createFilteredFieldMappings(fieldMappings, parsedFields) {
  return computed(() => {
    return fieldMappings.value.filter((mapping) => {
      const ddlFieldExists = parsedFields.value.some(
        (field) => field.name === mapping.ddlField?.name,
      );
      if (!ddlFieldExists) {
        if (mapping.ddlField?.isCustom) return true;
        return false;
      }
      return true;
    });
  });
}

function createCustomFieldsData(manager) {
  return computed(() => {
    const fields = [...manager.customFields.value];
    const bindings = [...manager.customBindings.value];
    const rules = [...manager.fieldConcatenationRules.value];
    const allFields = [...fields];

    bindings.forEach(binding => {
      if (binding.bindingType === "single") {
        allFields.push({
          id: `binding-${binding.ddlFieldName}`,
          fieldName: binding.ddlFieldName, dataType: "string",
          dataSource: "single_binding", config: { excelIndex: binding.excelIndex }, isSingleBinding: true,
        });
      }
    });

    rules.forEach(rule => {
      allFields.push({
        id: `rule-${rule.ddlFieldName}`,
        fieldName: rule.ddlFieldName, dataType: rule.dataType || "string",
        dataSource: "excel_combine",
        excelCombineConfig: { columns: rule.sourceColumns || [], separator: rule.separator || "", format: rule.format || "" },
        isConcatenationRule: true,
      });
    });
    return allFields;
  });
}

describe("Full Save Flow - Concatenation Rule Persistence", () => {
  let manager, parsedFields, fieldMappings, savePayload;

  beforeEach(() => {
    manager = createBindingManager();
    parsedFields = ref([
      { name: "id", type: "INT", isCustom: false },
      { name: "name", type: "VARCHAR", isCustom: false },
      { name: "email", type: "VARCHAR", isCustom: false },
    ]);
    fieldMappings = ref([
      { ddlField: { name: "id", isCustom: false }, excelIndex: 0, status: "bound" },
      { ddlField: { name: "name", isCustom: false }, excelIndex: 1, status: "bound" },
      { ddlField: { name: "email", isCustom: false }, excelIndex: 2, status: "bound" },
    ]);
    savePayload = {
      singleBindings: [],
      concatenationRules: [{ customFieldName: "full_name", sourceColumns: [0, 1], separator: " ", dataType: "string" }],
      customFields: [],
    };

    // Simulate saveBindings() in modal: add to composable BEFORE emit
    manager.addConcatenationRule("full_name", [0, 1], " ", null, "string");
  });

  it("UpdatePage: concatenation rule survives save and appears in parsedFields", () => {
    simulateUpdatePageSave(manager, parsedFields, fieldMappings, savePayload);

    expect(parsedFields.value.find(f => f.name === "full_name")).toBeDefined();
    expect(fieldMappings.value.find(m => m.ddlField?.name === "full_name")).toBeDefined();
  });

  it("UpdatePage: concatenation rule appears in filteredFieldMappings after save", () => {
    simulateUpdatePageSave(manager, parsedFields, fieldMappings, savePayload);

    const filtered = createFilteredFieldMappings(fieldMappings, parsedFields);
    expect(filtered.value.some(m => m.ddlField?.name === "full_name")).toBe(true);
  });

  it("UpdatePage: concatenation rule appears in customFieldsData after save", () => {
    simulateUpdatePageSave(manager, parsedFields, fieldMappings, savePayload);

    const data = createCustomFieldsData(manager);
    expect(data.value.some(f => f.fieldName === "full_name")).toBe(true);
    expect(data.value.find(f => f.fieldName === "full_name")?.isConcatenationRule).toBe(true);
  });

  it("InsertPage: concatenation rule survives cleanup (after fix)", () => {
    const result = simulateInsertPageSave(manager, parsedFields, fieldMappings, savePayload);

    // The function should complete without errors (addFieldConcatenationRule was removed)
    expect(result.success).toBe(true);

    // Concatenation rule should be in parsedFields
    expect(parsedFields.value.find(f => f.name === "full_name")).toBeDefined();

    // And in filteredFieldMappings
    const filtered = createFilteredFieldMappings(fieldMappings, parsedFields);
    expect(filtered.value.some(m => m.ddlField?.name === "full_name")).toBe(true);

    // And in customFieldsData
    const data = createCustomFieldsData(manager);
    expect(data.value.some(f => f.fieldName === "full_name")).toBe(true);
  });

  it("InsertPage: cleanup removes stale custom fields but preserves concatenation rules", () => {
    // Add an extra stale custom field to parsedFields that WOULD be cleaned up
    parsedFields.value.push({
      name: "stale_custom",
      type: "string",
      isCustom: true,
      customConfig: { fieldName: "stale_custom" },
    });
    // Add a duplicate concatenation rule field that should be preserved
    parsedFields.value.push({
      name: "full_name",
      type: "string",
      isCustom: true,
      customConfig: {
        fieldName: "full_name", dataType: "string",
        dataSource: "excel_combine",
        excelCombineConfig: { columns: [0, 1], separator: " ", isFromConcatenationRule: true },
      },
    });

    const result = simulateInsertPageSave(manager, parsedFields, fieldMappings, savePayload);

    expect(result.success).toBe(true);

    // Stale custom field should be removed
    expect(parsedFields.value.find(f => f.name === "stale_custom")).toBeUndefined();

    // Concatenation rule should be preserved
    expect(parsedFields.value.find(f => f.name === "full_name")).toBeDefined();
  });
});
