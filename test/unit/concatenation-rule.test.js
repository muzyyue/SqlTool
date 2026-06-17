/**
 * Unit tests: concatenation rule data flow
 * Verifies that field concatenation rules are properly:
 * 1. Stored in the composable
 * 2. Included in customFieldsData computed
 * 3. Not filtered out of filteredFieldMappings
 */
import { describe, it, expect, beforeEach } from "vitest";
import { ref, computed } from "vue";

/**
 * Simulates the relevant parts of useCustomBinding composable
 */
function createCustomBindingManager() {
  const fieldConcatenationRules = ref([]);

  function addConcatenationRule(fieldName, sourceColumns, separator = "", format = null, dataType = "string") {
    const existingIndex = fieldConcatenationRules.value.findIndex(
      (rule) => rule.ddlFieldName === fieldName,
    );
    if (existingIndex >= 0) {
      fieldConcatenationRules.value[existingIndex] = {
        ...fieldConcatenationRules.value[existingIndex],
        sourceColumns,
        separator,
        format,
        dataType,
        updatedAt: new Date().toISOString(),
      };
    } else {
      fieldConcatenationRules.value.push({
        id: `rule-${Date.now()}`,
        ddlFieldName: fieldName,
        sourceColumns,
        separator,
        format,
        dataType,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
  }

  return {
    fieldConcatenationRules,
    addConcatenationRule,
    customFields: ref([]),
    customBindings: ref([]),
  };
}

/**
 * Simulates customFieldsData computed (from UpdatePage.vue / InsertPage.vue)
 */
function createCustomFieldsData(customBindingManager) {
  return computed(() => {
    const fields = Array.isArray(customBindingManager.customFields.value)
      ? customBindingManager.customFields.value
      : [];

    const bindings = Array.isArray(customBindingManager.customBindings.value)
      ? customBindingManager.customBindings.value
      : [];

    const rules = Array.isArray(customBindingManager.fieldConcatenationRules.value)
      ? customBindingManager.fieldConcatenationRules.value
      : [];

    const allFields = [...fields];

    bindings.forEach((binding) => {
      if (binding.bindingType === "single") {
        allFields.push({
          id: `binding-${binding.ddlFieldName}`,
          fieldName: binding.ddlFieldName,
          dataType: "string",
          dataSource: "single_binding",
          config: { excelIndex: binding.excelIndex },
          isSingleBinding: true,
        });
      }
    });

    rules.forEach((rule) => {
      allFields.push({
        id: `rule-${rule.ddlFieldName}`,
        fieldName: rule.ddlFieldName,
        dataType: rule.dataType || "string",
        dataSource: "excel_combine",
        excelCombineConfig: {
          columns: rule.sourceColumns || [],
          separator: rule.separator || "",
          format: rule.format || "",
        },
        isConcatenationRule: true,
      });
    });

    return allFields;
  });
}

/**
 * Simulates filteredFieldMappings (AFTER our fix)
 */
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

describe("Concatenation Rule Data Flow", () => {
  let manager;

  beforeEach(() => {
    manager = createCustomBindingManager();
  });

  it("should store concatenation rules in composable", () => {
    manager.addConcatenationRule("full_name", [0, 1], " ", null, "string");

    expect(manager.fieldConcatenationRules.value).toHaveLength(1);
    expect(manager.fieldConcatenationRules.value[0].ddlFieldName).toBe("full_name");
    expect(manager.fieldConcatenationRules.value[0].sourceColumns).toEqual([0, 1]);
    expect(manager.fieldConcatenationRules.value[0].separator).toBe(" ");
  });

  it("should update existing concatenation rule with same name", () => {
    manager.addConcatenationRule("full_name", [0, 1], " ", null, "string");
    manager.addConcatenationRule("full_name", [0, 1, 2], " - ", null, "string");

    expect(manager.fieldConcatenationRules.value).toHaveLength(1);
    expect(manager.fieldConcatenationRules.value[0].sourceColumns).toEqual([0, 1, 2]);
    expect(manager.fieldConcatenationRules.value[0].separator).toBe(" - ");
  });

  it("customFieldsData computed should include concatenation rules", () => {
    manager.addConcatenationRule("full_name", [0, 1], " ", null, "string");

    const data = createCustomFieldsData(manager);
    expect(data.value).toHaveLength(1);
    expect(data.value[0].fieldName).toBe("full_name");
    expect(data.value[0].dataSource).toBe("excel_combine");
    expect(data.value[0].isConcatenationRule).toBe(true);
  });

  it("customFieldsData should include both fields and concatenation rules", () => {
    // Add a custom field (Tab 3)
    manager.customFields.value.push({
      fieldName: "custom_field",
      dataType: "string",
      dataSource: "system_function",
      systemFunctionConfig: { functionName: "NOW" },
    });

    // Add a concatenation rule (Tab 2)
    manager.addConcatenationRule("full_name", [0, 1], " ", null, "string");

    const data = createCustomFieldsData(manager);
    expect(data.value).toHaveLength(2);

    const customField = data.value.find((f) => f.fieldName === "custom_field");
    expect(customField).toBeDefined();
    expect(customField.dataSource).toBe("system_function");

    const concatField = data.value.find((f) => f.fieldName === "full_name");
    expect(concatField).toBeDefined();
    expect(concatField.dataSource).toBe("excel_combine");
    expect(concatField.isConcatenationRule).toBe(true);
  });

  it("filteredFieldMappings should include concatenation rule mappings (after fix)", () => {
    const parsedFields = ref([
      { name: "id", type: "INT", isCustom: false },
      { name: "name", type: "VARCHAR", isCustom: false },
      { name: "email", type: "VARCHAR", isCustom: false },
    ]);

    const fieldMappings = ref([
      { ddlField: { name: "id", isCustom: false }, excelIndex: 0, status: "bound" },
      { ddlField: { name: "name", isCustom: false }, excelIndex: 1, status: "bound" },
      { ddlField: { name: "email", isCustom: false }, excelIndex: 2, status: "bound" },
    ]);

    // Simulate handleCustomBindingSave adding a concatenation rule
    const concatField = {
      name: "full_name",
      type: "string",
      isCustom: true,
      customConfig: {
        fieldName: "full_name",
        dataType: "string",
        dataSource: "excel_combine",
        excelCombineConfig: { columns: [0, 1], separator: " ", isFromConcatenationRule: true },
      },
    };
    parsedFields.value.push(concatField);
    fieldMappings.value.push({
      ddlField: concatField,
      excelHeader: null,
      excelIndex: -1,
      similarity: 0,
      confidence: "manual",
      status: "unmatched",
      generatedByFunction: true,
    });

    const filtered = createFilteredFieldMappings(fieldMappings, parsedFields);
    expect(filtered.value).toHaveLength(4); // All 4 mappings should be included

    const concatMapping = filtered.value.find((m) => m.ddlField?.name === "full_name");
    expect(concatMapping).toBeDefined();
    expect(concatMapping.status).toBe("unmatched");
    expect(concatMapping.generatedByFunction).toBe(true);
  });

  it("filteredFieldMappings should exclude dangling mappings (field not in parsedFields)", () => {
    const parsedFields = ref([
      { name: "id", type: "INT", isCustom: false },
      { name: "name", type: "VARCHAR", isCustom: false },
    ]);

    const fieldMappings = ref([
      { ddlField: { name: "id", isCustom: false }, excelIndex: 0, status: "bound" },
      { ddlField: { name: "name", isCustom: false }, excelIndex: 1, status: "bound" },
      // A mapping for a field that's NOT in parsedFields
      { ddlField: { name: "nonexistent", isCustom: false }, excelIndex: 2, status: "unmatched" },
    ]);

    const filtered = createFilteredFieldMappings(fieldMappings, parsedFields);
    expect(filtered.value).toHaveLength(2); // nonexistent should be filtered out
    expect(filtered.value.every((m) => m.ddlField.name !== "nonexistent")).toBe(true);
  });

  it("filteredFieldMappings should keep custom field even if not in parsedFields", () => {
    const parsedFields = ref([
      { name: "id", type: "INT", isCustom: false },
    ]);

    const fieldMappings = ref([
      { ddlField: { name: "id", isCustom: false }, excelIndex: 0, status: "bound" },
      // Custom field not in parsedFields (should still be shown)
      { ddlField: { name: "computed_field", isCustom: true }, excelIndex: -1, status: "unmatched" },
    ]);

    const filtered = createFilteredFieldMappings(fieldMappings, parsedFields);
    expect(filtered.value).toHaveLength(2);
    const customMapping = filtered.value.find((m) => m.ddlField.name === "computed_field");
    expect(customMapping).toBeDefined();
  });
});
