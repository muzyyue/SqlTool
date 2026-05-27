import { ref, computed } from "vue";
import { pinyin } from "pinyin-pro";
import { useCustomBinding } from "./useCustomBinding";
import { batchConcatenate } from "@/utils/field/fieldConcatenator";

/**
 * 智能字段匹配器
 * 实现DDL字段与Excel列的智能匹配，支持自定义绑定和字段拼接
 */
export function useFieldMatcher() {
  const fieldMappings = ref([]);
  const matchingAlgorithm = ref("similarity"); // similarity, pinyin, manual

  // 集成自定义绑定功能
  const customBindingManager = useCustomBinding();

  /**
   * 执行字段匹配
   * @param {Array} ddlFields - DDL字段列表
   * @param {Array} excelHeaders - Excel表头列表
   * @param {string} algorithm - 匹配算法
   * @returns {Array} 匹配结果
   */
  const matchFields = (ddlFields, excelHeaders, algorithm = "similarity") => {
    if (!ddlFields || !excelHeaders) {
      throw new Error("DDL字段和Excel表头都不能为空");
    }

    matchingAlgorithm.value = algorithm;

    let mappings = [];

    switch (algorithm) {
      case "similarity":
        mappings = matchBySimilarity(ddlFields, excelHeaders);
        break;
      case "pinyin":
        mappings = matchByPinyin(ddlFields, excelHeaders);
        break;
      case "hybrid":
        mappings = matchByHybrid(ddlFields, excelHeaders);
        break;
      case "manual":
        mappings = createManualMappings(ddlFields, excelHeaders);
        break;
      default:
        mappings = matchBySimilarity(ddlFields, excelHeaders);
    }

    fieldMappings.value = mappings;
    return mappings;
  };

  /**
   * 基于名称相似度匹配（Levenshtein距离）
   */
  const matchBySimilarity = (ddlFields, excelHeaders) => {
    const mappings = [];
    const usedExcelIndices = new Set();

    // 为每个DDL字段找到最匹配的Excel列
    ddlFields.forEach((ddlField) => {
      let bestMatch = null;
      let bestScore = -1;

      excelHeaders.forEach((excelHeader, excelIndex) => {
        if (usedExcelIndices.has(excelIndex)) return;

        const similarity = calculateSimilarity(ddlField.name, excelHeader);

        if (similarity > bestScore) {
          bestScore = similarity;
          bestMatch = {
            ddlField,
            excelHeader,
            excelIndex,
            similarity: bestScore,
            confidence: getConfidenceLevel(bestScore),
          };
        }
      });

      if (bestMatch && bestScore > 0.3) {
        // 相似度阈值
        mappings.push({
          ...bestMatch,
          customFieldName: "",
          generatedByFunction: false,
        });
        usedExcelIndices.add(bestMatch.excelIndex);
      } else {
        // 没有找到匹配项
        mappings.push({
          ddlField,
          customFieldName: "",
          excelHeader: null,
          excelIndex: -1,
          similarity: 0,
          confidence: "low",
          status: "unmatched",
          generatedByFunction: false,
        });
      }
    });

    return mappings;
  };

  /**
   * 基于拼音匹配
   */
  const matchByPinyin = (ddlFields, excelHeaders) => {
    const mappings = [];
    const usedExcelIndices = new Set();

    // 转换为拼音首字母
    const ddlPinyinMap = ddlFields.map((field) => ({
      field,
      pinyin: convertToPinyinFirstLetter(field.name),
    }));

    const excelPinyinMap = excelHeaders.map((header, index) => ({
      header,
      index,
      pinyin: convertToPinyinFirstLetter(header),
    }));

    // 基于拼音首字母匹配
    ddlPinyinMap.forEach((ddlItem) => {
      let bestMatch = null;
      let bestScore = -1;

      excelPinyinMap.forEach((excelItem) => {
        if (usedExcelIndices.has(excelItem.index)) return;

        const similarity = calculateSimilarity(
          ddlItem.pinyin,
          excelItem.pinyin,
        );

        if (similarity > bestScore) {
          bestScore = similarity;
          bestMatch = {
            ddlField: ddlItem.field,
            excelHeader: excelItem.header,
            excelIndex: excelItem.index,
            similarity: bestScore,
            confidence: getConfidenceLevel(bestScore),
            pinyinMatch: true,
          };
        }
      });

      if (bestMatch && bestScore > 0.5) {
        // 拼音匹配阈值较高
        mappings.push({
          ...bestMatch,
          customFieldName: "",
          generatedByFunction: false,
        });
        usedExcelIndices.add(bestMatch.excelIndex);
      } else {
        mappings.push({
          ddlField: ddlItem.field,
          customFieldName: "",
          excelHeader: null,
          excelIndex: -1,
          similarity: 0,
          confidence: "low",
          status: "unmatched",
          generatedByFunction: false,
        });
      }
    });

    return mappings;
  };

  /**
   * 混合匹配策略：结合相似度匹配和拼音首字母大写匹配
   * 优先使用相似度匹配，对于未匹配的字段尝试拼音首字母匹配
   */
  const matchByHybrid = (ddlFields, excelHeaders) => {
    const mappings = [];
    const usedExcelIndices = new Set();

    // 转换为拼音首字母（大写）
    const ddlPinyinMap = ddlFields.map((field) => ({
      field,
      pinyin: convertToPinyinFirstLetter(field.name),
    }));

    const excelPinyinMap = excelHeaders.map((header, index) => ({
      header,
      index,
      pinyin: convertToPinyinFirstLetter(header),
    }));

    // 为每个DDL字段找到最匹配的Excel列
    ddlFields.forEach((ddlField, ddlIndex) => {
      let bestMatch = null;
      let bestScore = -1;
      let matchType = "";

      excelHeaders.forEach((excelHeader, excelIndex) => {
        if (usedExcelIndices.has(excelIndex)) return;

        // 计算多种匹配方式的相似度
        const directSimilarity = calculateSimilarity(
          ddlField.name,
          excelHeader,
        );
        const ddlPinyin = ddlPinyinMap[ddlIndex].pinyin;
        const excelPinyin = excelPinyinMap[excelIndex].pinyin;
        const pinyinSimilarity = calculateSimilarity(ddlPinyin, excelPinyin);

        // 检查是否为拼音首字母大写匹配
        const isPinyinUppercaseMatch =
          ddlPinyin.length > 0 &&
          excelPinyin.length > 0 &&
          ddlPinyin === excelPinyin.toUpperCase();

        // 综合评分：优先直接匹配，其次拼音匹配
        let combinedScore = directSimilarity;

        // 如果拼音首字母完全匹配，给予额外加分
        if (isPinyinUppercaseMatch) {
          combinedScore = Math.max(combinedScore, pinyinSimilarity * 1.2);
          matchType = "pinyin-uppercase";
        } else if (pinyinSimilarity > directSimilarity) {
          combinedScore = Math.max(combinedScore, pinyinSimilarity * 0.9);
          matchType = "pinyin";
        }

        if (combinedScore > bestScore) {
          bestScore = combinedScore;
          bestMatch = {
            ddlField,
            excelHeader,
            excelIndex,
            similarity: directSimilarity,
            pinyinSimilarity,
            combinedScore: bestScore,
            confidence: getConfidenceLevel(bestScore),
            matchType,
          };
        }
      });

      // 使用较低的阈值，因为混合匹配更灵活
      const threshold = 0.25;

      if (bestMatch && bestScore > threshold) {
        mappings.push({
          ...bestMatch,
          customFieldName: "",
          generatedByFunction: false,
        });
        usedExcelIndices.add(bestMatch.excelIndex);
      } else {
        mappings.push({
          ddlField,
          customFieldName: "",
          excelHeader: null,
          excelIndex: -1,
          similarity: 0,
          pinyinSimilarity: 0,
          combinedScore: 0,
          confidence: "low",
          status: "unmatched",
          matchType: "none",
          generatedByFunction: false,
        });
      }
    });

    return mappings;
  };

  /**
   * 创建手动匹配模板
   */
  const createManualMappings = (ddlFields) => {
    return ddlFields.map((ddlField) => ({
      ddlField,
      customFieldName: "",
      excelHeader: null,
      excelIndex: -1,
      similarity: 0,
      confidence: "manual",
      status: "pending",
      generatedByFunction: false,
    }));
  };

  /**
   * 计算字符串相似度（Levenshtein距离）
   */
  const calculateSimilarity = (str1, str2) => {
    if (!str1 || !str2 || typeof str1 !== "string" || typeof str2 !== "string")
      return 0;

    const s1 = str1.toLowerCase().replace(/[^\w\u4e00-\u9fa5]/g, "");
    const s2 = str2.toLowerCase().replace(/[^\w\u4e00-\u9fa5]/g, "");

    if (s1 === s2) return 1.0;

    const len1 = s1.length;
    const len2 = s2.length;
    const maxLen = Math.max(len1, len2);

    if (maxLen === 0) return 0;

    // 计算编辑距离
    const distance = levenshteinDistance(s1, s2);

    // 转换为相似度（0-1）
    return 1 - distance / maxLen;
  };

  /**
   * Levenshtein距离算法
   */
  const levenshteinDistance = (s1, s2) => {
    const matrix = [];

    // 初始化矩阵
    for (let i = 0; i <= s2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= s1.length; j++) {
      matrix[0][j] = j;
    }

    // 填充矩阵
    for (let i = 1; i <= s2.length; i++) {
      for (let j = 1; j <= s1.length; j++) {
        if (s2.charAt(i - 1) === s1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // 替换
            matrix[i][j - 1] + 1, // 插入
            matrix[i - 1][j] + 1, // 删除
          );
        }
      }
    }

    return matrix[s2.length][s1.length];
  };

  /**
   * 转换为拼音首字母
   */
  const convertToPinyinFirstLetter = (text) => {
    if (!text) return "";

    const trimmedText = String(text).trim();
    if (!trimmedText) return "";

    try {
      const firstLetters = pinyin(trimmedText, {
        pattern: "first",
        toneType: "none",
      });

      return firstLetters.replace(/\s+/g, "").toUpperCase();
    } catch (error) {
      console.warn("拼音转换失败:", error);
      return "";
    }
  };

  /**
   * 获取置信度等级
   */
  const getConfidenceLevel = (similarity) => {
    if (similarity >= 0.9) return "very-high";
    if (similarity >= 0.7) return "high";
    if (similarity >= 0.5) return "medium";
    if (similarity >= 0.3) return "low";
    return "very-low";
  };

  /**
   * 手动更新字段映射
   */
  const updateFieldMapping = (ddlFieldName, excelHeader, excelIndex) => {
    const mappingIndex = fieldMappings.value.findIndex(
      (mapping) => mapping.ddlField.name === ddlFieldName,
    );

    if (mappingIndex !== -1) {
      fieldMappings.value[mappingIndex] = {
        ...fieldMappings.value[mappingIndex],
        customFieldName:
          fieldMappings.value[mappingIndex].customFieldName || "",
        excelHeader,
        excelIndex,
        similarity: excelHeader
          ? calculateSimilarity(ddlFieldName, excelHeader)
          : 0,
        confidence: excelHeader
          ? getConfidenceLevel(calculateSimilarity(ddlFieldName, excelHeader))
          : "manual",
        status: excelHeader ? "matched" : "unmatched",
      };
    }
  };

  /**
   * 获取匹配统计信息
   */
  const getMatchingStats = computed(() => {
    const total = fieldMappings.value.length;
    const matched = fieldMappings.value.filter((m) => m.excelHeader).length;
    const unmatched = total - matched;

    const confidenceStats = {
      "very-high": 0,
      high: 0,
      medium: 0,
      low: 0,
      "very-low": 0,
      manual: 0,
    };

    fieldMappings.value.forEach((mapping) => {
      confidenceStats[mapping.confidence]++;
    });

    return {
      total,
      matched,
      unmatched,
      matchRate: total > 0 ? (matched / total) * 100 : 0,
      confidenceStats,
    };
  });

  /**
   * 验证映射完整性
   */
  const validateMappings = () => {
    const errors = [];
    const usedExcelIndices = new Set();

    // 检查所有DDL字段是否都有映射
    fieldMappings.value.forEach((mapping) => {
      // 确保映射对象有效
      if (!mapping) {
        return;
      }

      // 确保ddlField存在
      if (!mapping.ddlField) {
        return;
      }

      if (mapping.excelHeader) {
        if (usedExcelIndices.has(mapping.excelIndex)) {
          errors.push(`Excel列"${mapping.excelHeader}"被重复映射`);
        }
        usedExcelIndices.add(mapping.excelIndex);
      }

      // 检查必填字段
      const isNullable = mapping.ddlField.nullable !== false;
      const isGeneratedByFunction = mapping.generatedByFunction === true;
      const isIdentity = mapping.ddlField.isIdentity === true;
      const isPrimaryKey = mapping.ddlField.primaryKey === true;
      const hasCustomBinding = mapping.ddlField.isCustom === true;
      const hasValidMapping = mapping.excelHeader && mapping.excelIndex >= 0;

      // 自增主键字段由数据库自动生成，不需要映射
      if (isIdentity && isPrimaryKey) {
        return;
      }

      // 如果字段标记为通过函数生成，则跳过Excel列映射检查
      // 如果字段有自定义绑定，也跳过检查
      if (
        !isGeneratedByFunction &&
        !hasValidMapping &&
        !isNullable &&
        !hasCustomBinding
      ) {
        errors.push(`必填字段"${mapping.ddlField.name}"未映射到Excel列`);
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
    };
  };

  /**
   * 验证所有DDL字段是否都有映射记录（用于SQL生成前检查）
   * @param {Array} ddlFields - DDL解析出的字段列表
   */
  const validateAllFieldsMapped = (ddlFields) => {
    const errors = [];
    const mappedFieldNames = new Set(
      fieldMappings.value.map((m) => m.ddlField?.name),
    );

    ddlFields.forEach((field) => {
      // 跳过自增主键字段
      if (field.isIdentity && field.primaryKey) {
        return;
      }

      // 跳过自定义字段（它们可能不在映射列表中）
      if (field.isCustom) {
        return;
      }

      // 检查字段是否有映射记录
      if (!mappedFieldNames.has(field.name)) {
        if (field.nullable === false) {
          errors.push(`必填字段"${field.name}"未获取到数据`);
        }
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
    };
  };

  /**
   * 导出映射配置
   */
  const exportMappings = () => {
    return fieldMappings.value.map((mapping) => ({
      ddlField: mapping.ddlField.name,
      excelHeader: mapping.excelHeader,
      excelIndex: mapping.excelIndex,
      similarity: mapping.similarity,
      confidence: mapping.confidence,
      dataType: mapping.ddlField.type,
    }));
  };

  /**
   * 导入映射配置
   */
  const importMappings = (mappingsConfig, ddlFields, excelHeaders) => {
    const newMappings = mappingsConfig.map((config) => {
      const ddlField = ddlFields.find((f) => f.name === config.ddlField);
      const excelHeader = excelHeaders[config.excelIndex];

      return {
        ddlField: ddlField || { name: config.ddlField, type: "UNKNOWN" },
        customFieldName: config.customFieldName || "",
        excelHeader: config.excelIndex >= 0 ? excelHeader : null,
        excelIndex: config.excelIndex,
        similarity: config.similarity || 0,
        confidence: config.confidence || "manual",
        status: config.excelIndex >= 0 ? "matched" : "unmatched",
        generatedByFunction: config.generatedByFunction || false,
      };
    });

    fieldMappings.value = newMappings;
  };

  /**
   * 获取显示的字段名（自定义字段名或原始字段名）
   * @param {Object} mapping - 字段映射对象
   * @returns {string} 显示的字段名
   */
  const getDisplayFieldName = (mapping) => {
    return mapping.customFieldName || mapping.ddlField.name;
  };

  /**
   * 获取SQL使用的字段名（自定义字段名或原始字段名）
   * @param {Object} mapping - 字段映射对象
   * @returns {string} SQL使用的字段名
   */
  const getSqlFieldName = (mapping) => {
    return mapping.customFieldName || mapping.ddlField.name;
  };

  /**
   * 更新字段的自定义字段名
   * @param {string} ddlFieldName - DDL字段名
   * @param {string} customFieldName - 自定义字段名
   */
  const updateCustomFieldName = (ddlFieldName, customFieldName) => {
    const mappingIndex = fieldMappings.value.findIndex(
      (mapping) => mapping.ddlField.name === ddlFieldName,
    );

    if (mappingIndex !== -1) {
      fieldMappings.value[mappingIndex] = {
        ...fieldMappings.value[mappingIndex],
        customFieldName: customFieldName || "",
      };
    }
  };

  /**
   * 重置字段的自定义字段名
   * @param {string} ddlFieldName - DDL字段名
   */
  const resetCustomFieldName = (ddlFieldName) => {
    updateCustomFieldName(ddlFieldName, "");
  };

  /**
   * 重置所有字段的自定义字段名
   */
  const resetAllCustomFieldNames = () => {
    fieldMappings.value.forEach((mapping) => {
      mapping.customFieldName = "";
    });
  };

  /**
   * 重置映射
   */
  const resetMappings = () => {
    fieldMappings.value = [];
  };

  /**
   * 增强的字段匹配方法，支持自定义绑定
   */
  const enhancedMatchFields = (
    ddlFields,
    excelHeaders,
    algorithm = "similarity",
    skipBaseMatching = false,
  ) => {
    let baseMappings;

    if (skipBaseMatching) {
      baseMappings = fieldMappings.value;
    } else {
      baseMappings = matchFields(ddlFields, excelHeaders, algorithm);
    }

    if (customBindingManager.enableCustomBinding.value) {
      return applyCustomBindingsToMappings(baseMappings);
    }

    return baseMappings;
  };

  /**
   * 应用自定义绑定到映射结果
   * @param {Array} baseMappings - 基础映射数组
   * @returns {Array} 增强后的映射数组
   */
  const applyCustomBindingsToMappings = (baseMappings) => {
    const enhancedMappings = [...baseMappings];

    // 应用单列自定义绑定
    customBindingManager.customBindings.value.forEach((customBinding) => {
      if (
        customBinding.bindingType === "single" &&
        customBinding.excelIndex >= 0
      ) {
        const mappingIndex = enhancedMappings.findIndex(
          (mapping) => mapping.ddlField.name === customBinding.ddlFieldName,
        );

        if (mappingIndex >= 0) {
          enhancedMappings[mappingIndex] = {
            ...enhancedMappings[mappingIndex],
            excelHeader: customBinding.excelHeader,
            excelIndex: customBinding.excelIndex,
            confidence: "manual",
            status: "matched",
          };
        }
      }
    });

    customBindingManager.customFields.value.forEach((customField) => {
      // 验证自定义字段名不为空
      if (
        !customField.fieldName ||
        String(customField.fieldName).trim() === ""
      ) {
        console.warn("跳过空字段名的自定义字段:", customField);
        return;
      }

      const mappingIndex = enhancedMappings.findIndex(
        (mapping) => mapping.ddlField.name === customField.fieldName,
      );

      // 只有当数据源是函数、自增或静态值时，才标记为函数生成
      // Excel组合字段需要从Excel获取数据，不应标记为函数生成
      const shouldGenerateByFunction = [
        "system_function",
        "auto_increment",
        "static_value",
      ].includes(customField.dataSource);

      if (mappingIndex >= 0) {
        // 保留原有的 excelHeader、excelIndex、similarity、confidence、status 等属性
        enhancedMappings[mappingIndex] = {
          ...enhancedMappings[mappingIndex],
          ddlField: {
            ...enhancedMappings[mappingIndex].ddlField,
            isCustom: true,
            customConfig: customField,
          },
          customFieldName: customField.fieldName,
          generatedByFunction: shouldGenerateByFunction,
          // 保留原有的 Excel 映射信息
          excelHeader: enhancedMappings[mappingIndex].excelHeader,
          excelIndex: enhancedMappings[mappingIndex].excelIndex,
        };
      } else {
        enhancedMappings.push({
          ddlField: {
            name: customField.fieldName,
            type: customField.dataType || "VARCHAR",
            nullable: true,
            isCustom: true,
            customConfig: customField,
          },
          customFieldName: customField.fieldName,
          excelHeader: null,
          excelIndex: -1,
          similarity: 0,
          confidence: "manual",
          status: "unmatched",
          generatedByFunction: shouldGenerateByFunction,
        });
      }
    });

    return enhancedMappings;
  };

  /**
   * 增强的数据处理，支持字段拼接
   */
  const processDataWithConcatenation = (excelData, ddlFields, excelHeaders) => {
    if (!Array.isArray(excelData) || excelData.length === 0) {
      return excelData;
    }

    // 如果有字段拼接规则，应用拼接
    if (customBindingManager.fieldConcatenationRules.value.length > 0) {
      const concatenationRulesMap = {};
      customBindingManager.fieldConcatenationRules.value.forEach((rule) => {
        concatenationRulesMap[rule.ddlFieldName] = rule;
      });

      return batchConcatenate(excelData, concatenationRulesMap, excelHeaders);
    }

    return excelData;
  };

  /**
   * 获取字段的完整绑定信息
   */
  const getFieldBindingInfo = (ddlFieldName) => {
    const baseMapping = fieldMappings.value.find(
      (mapping) => mapping.ddlField.name === ddlFieldName,
    );

    const customBindingInfo =
      customBindingManager.getFieldBinding(ddlFieldName);

    return {
      baseMapping,
      customBinding: customBindingInfo.customBinding,
      concatenationRule: customBindingInfo.concatenationRule,
      hasCustomBinding: customBindingInfo.hasCustomBinding,
      isCustomBound: customBindingInfo.hasCustomBinding,
    };
  };

  /**
   * 验证完整映射配置（包括自定义绑定）
   */
  const validateEnhancedMappings = () => {
    const baseValidation = validateMappings();
    const customValidation = customBindingManager.validateBindings();

    const allErrors = [...baseValidation.errors, ...customValidation.errors];

    // 添加调试日志
    if (typeof console !== "undefined" && console.log) {
      console.log("=== validateEnhancedMappings 调试信息 ===");
      console.log("baseValidation.isValid:", baseValidation.isValid);
      console.log("baseValidation.errors:", baseValidation.errors);
      console.log("customValidation.isValid:", customValidation.isValid);
      console.log("customValidation.errors:", customValidation.errors);
      console.log("allErrors:", allErrors);
    }

    return {
      isValid: baseValidation.isValid && customValidation.isValid,
      errors: allErrors,
    };
  };

  return {
    fieldMappings: computed(() => fieldMappings.value),
    matchingAlgorithm: computed(() => matchingAlgorithm.value),
    matchingStats: getMatchingStats,

    // 基础方法
    matchFields,
    updateFieldMapping,
    validateMappings,
    exportMappings,
    importMappings,
    resetMappings,

    // 字段名相关方法
    getDisplayFieldName,
    getSqlFieldName,
    updateCustomFieldName,
    resetCustomFieldName,
    resetAllCustomFieldNames,

    // 增强方法（支持自定义绑定）
    enhancedMatchFields,
    processDataWithConcatenation,
    getFieldBindingInfo,
    validateEnhancedMappings,
    validateAllFieldsMapped,

    // 自定义绑定管理器
    customBindingManager,
  };
}
