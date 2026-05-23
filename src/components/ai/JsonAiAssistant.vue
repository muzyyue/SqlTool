<template>
  <div class="json-ai-assistant">
    <!-- AI 状态检查区域 -->
    <div v-if="!isAiReady && !hasLocalResult" class="ai-status-section">
      <!-- 加载中状态 -->
      <a-spin v-if="isCheckingAi" tip="正在检查 AI 服务状态...">
        <template #indicator>
          <span class="i-carbon-renew spin-icon"></span>
        </template>
      </a-spin>

      <!-- AI 不可用提示 -->
      <a-alert
        v-else-if="aiError"
        type="warning"
        show-icon
        message="AI 服务不可用"
        :description="aiError"
      >
        <template #icon>
          <span class="i-carbon-warning-filled"></span>
        </template>
        <template #action>
          <a-button size="small" @click="handleLocalAnalysis">
            使用本地分析
          </a-button>
        </template>
      </a-alert>

      <!-- AI 未启用提示 -->
      <a-alert
        v-else-if="!aiStore.isEnabled"
        type="info"
        show-icon
        message="AI 功能未启用"
      >
        <template #icon>
          <span class="i-carbon-locked"></span>
        </template>
        <template #action>
          <a-space>
            <a-button size="small" type="primary" @click="handleEnableAi">
              启用 AI
            </a-button>
            <a-button size="small" @click="handleLocalAnalysis">
              本地分析
            </a-button>
          </a-space>
        </template>
      </a-alert>
    </div>

    <!-- 分析内容区域 -->
    <div class="analysis-content">
      <!-- 分析类型选择 -->
      <div class="analysis-tabs">
        <a-tabs
          v-model:activeKey="activeAnalysisType"
          @change="handleTabChange"
        >
          <a-tab-pane key="structure" tab="结构分析">
            <template #tab>
              <span class="tab-label">
                <span class="i-carbon-diagram"></span>
                结构分析
              </span>
            </template>
          </a-tab-pane>
          <a-tab-pane key="quality" tab="质量评估">
            <template #tab>
              <span class="tab-label">
                <span class="i-carbon-chart-radar"></span>
                质量评估
              </span>
            </template>
          </a-tab-pane>
          <a-tab-pane key="fields" tab="字段建议">
            <template #tab>
              <span class="tab-label">
                <span class="i-carbon-text-selection"></span>
                字段建议
              </span>
            </template>
          </a-tab-pane>
        </a-tabs>
      </div>

      <!-- JSON 数据预览 -->
      <div v-if="parsedJson" class="json-preview">
        <div class="preview-header">
          <span class="preview-label">JSON 数据概览</span>
          <a-tag color="blue">{{ jsonSize }}</a-tag>
        </div>
        <div class="preview-stats">
          <div class="stat-item">
            <span class="stat-label">类型:</span>
            <span class="stat-value">{{ jsonType }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">深度:</span>
            <span class="stat-value">{{ jsonDepth }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">节点数:</span>
            <span class="stat-value">{{ jsonNodeCount }}</span>
          </div>
        </div>
      </div>

      <!-- 分析按钮区域 -->
      <div class="action-buttons">
        <a-button
          type="primary"
          :loading="isAnalyzing"
          :disabled="!parsedJson"
          class="analyze-btn"
          @click="handleAnalyze"
        >
          <template #icon>
            <span v-if="!isAnalyzing" class="i-carbon-magic-wand"></span>
          </template>
          {{ isAnalyzing ? "分析中..." : "开始分析" }}
        </a-button>
        <a-button
          v-if="analysisResult"
          :disabled="!analysisResult"
          @click="handleExport"
        >
          <template #icon>
            <span class="i-carbon-download"></span>
          </template>
          导出报告
        </a-button>
      </div>

      <!-- 分析结果区域 -->
      <div v-if="analysisResult" class="result-section">
        <div class="result-header">
          <span class="result-label">分析结果</span>
          <a-tag v-if="analysisSource === 'ai'" color="green">
            <span class="i-carbon-machine-learning"></span>
            AI 分析
          </a-tag>
          <a-tag v-else color="blue">
            <span class="i-carbon-code"></span>
            本地分析
          </a-tag>
        </div>

        <!-- 结构分析结果 -->
        <div v-if="activeAnalysisType === 'structure'" class="result-content">
          <div v-if="structureResult" class="structure-result">
            <div class="result-card">
              <div class="card-title">层级结构</div>
              <div class="card-content">
                <div class="tree-view">
                  <JsonTreeNode
                    v-for="(node, index) in structureResult.tree"
                    :key="index"
                    :node="node"
                    :depth="0"
                  />
                </div>
              </div>
            </div>
            <div class="result-card">
              <div class="card-title">类型分布</div>
              <div class="card-content">
                <div class="type-stats">
                  <div
                    v-for="(count, type) in structureResult.typeDistribution"
                    :key="type"
                    class="type-item"
                  >
                    <a-tag :color="getTypeColor(type)">{{ type }}</a-tag>
                    <span class="type-count">{{ count }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div
            v-else
            class="ai-result"
            v-html="formatMarkdown(analysisResult)"
          ></div>
        </div>

        <!-- 质量评估结果 -->
        <div
          v-else-if="activeAnalysisType === 'quality'"
          class="result-content"
        >
          <div v-if="qualityResult" class="quality-result">
            <div class="score-card">
              <div
                class="score-circle"
                :style="{ '--score-color': getScoreColor(qualityResult.score) }"
              >
                <span class="score-value">{{ qualityResult.score }}</span>
                <span class="score-label">质量评分</span>
              </div>
            </div>
            <div class="metrics-grid">
              <div
                v-for="metric in qualityResult.metrics"
                :key="metric.name"
                class="metric-item"
              >
                <div class="metric-header">
                  <span class="metric-name">{{ metric.name }}</span>
                  <a-progress
                    :percent="metric.score"
                    :stroke-color="getProgressColor(metric.score)"
                    size="small"
                    :show-info="false"
                  />
                </div>
                <div class="metric-desc">{{ metric.description }}</div>
              </div>
            </div>
            <div v-if="qualityResult.issues.length > 0" class="issues-section">
              <div class="issues-title">发现的问题</div>
              <div class="issues-list">
                <div
                  v-for="(issue, index) in qualityResult.issues"
                  :key="index"
                  class="issue-item"
                  :class="issue.severity"
                >
                  <span
                    class="issue-icon"
                    :class="getIssueIcon(issue.severity)"
                  ></span>
                  <div class="issue-content">
                    <div class="issue-message">{{ issue.message }}</div>
                    <div v-if="issue.path" class="issue-path">
                      路径: {{ issue.path }}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div
            v-else
            class="ai-result"
            v-html="formatMarkdown(analysisResult)"
          ></div>
        </div>

        <!-- 字段建议结果 -->
        <div v-else-if="activeAnalysisType === 'fields'" class="result-content">
          <div v-if="fieldsResult" class="fields-result">
            <div
              v-if="fieldsResult.keyFields.length > 0"
              class="fields-section"
            >
              <div class="section-title">
                <span class="i-carbon-star-filled"></span>
                关键字段
              </div>
              <div class="fields-list">
                <a-tag
                  v-for="field in fieldsResult.keyFields"
                  :key="field"
                  color="blue"
                  class="field-tag"
                >
                  {{ field }}
                </a-tag>
              </div>
            </div>
            <div
              v-if="fieldsResult.missingFields.length > 0"
              class="fields-section"
            >
              <div class="section-title">
                <span class="i-carbon-warning-alt"></span>
                缺失字段
              </div>
              <div class="fields-list">
                <a-tag
                  v-for="field in fieldsResult.missingFields"
                  :key="field"
                  color="orange"
                  class="field-tag"
                >
                  {{ field }}
                </a-tag>
              </div>
            </div>
            <div
              v-if="fieldsResult.suggestions.length > 0"
              class="suggestions-section"
            >
              <div class="section-title">
                <span class="i-carbon-light"></span>
                优化建议
              </div>
              <ul class="suggestions-list">
                <li
                  v-for="(suggestion, index) in fieldsResult.suggestions"
                  :key="index"
                >
                  {{ suggestion }}
                </li>
              </ul>
            </div>
          </div>
          <div
            v-else
            class="ai-result"
            v-html="formatMarkdown(analysisResult)"
          ></div>
        </div>
      </div>

      <!-- 错误提示区域 -->
      <a-alert
        v-if="analysisError"
        type="error"
        show-icon
        closable
        :message="analysisError.message"
        class="error-alert"
        @close="analysisError = null"
      >
        <template #icon>
          <span class="i-carbon-warning-filled"></span>
        </template>
      </a-alert>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * JsonAiAssistant 组件
 * JSON AI 分析助手，提供结构分析、质量评估、字段建议等功能
 *
 * @component
 * @example
 * <JsonAiAssistant
 *   :json-data="jsonString"
 *   analysis-type="structure"
 *   @result="handleResult"
 *   @error="handleError"
 * />
 */

import { ref, computed, watch, onMounted, h, type VNode } from "vue";
import { message } from "ant-design-vue";
import { useAiStore } from "@/stores/ai.js";
import { getModelManager } from "@/composables/ai/useModelManager";
import type { GenerateOptions } from "@/composables/ai/types";

// ===== 类型定义 =====

/**
 * 分析类型
 */
type AnalysisType = "structure" | "quality" | "fields";

/**
 * 分析错误接口
 */
interface AnalysisError {
  message: string;
  code?: string;
  details?: unknown;
}

/**
 * 结构分析结果接口
 */
interface StructureResult {
  /** 层级树 */
  tree: TreeNode[];
  /** 类型分布 */
  typeDistribution: Record<string, number>;
  /** 最大深度 */
  maxDepth: number;
  /** 节点总数 */
  totalNodes: number;
}

/**
 * 树节点接口
 */
interface TreeNode {
  /** 键名 */
  key: string;
  /** 值类型 */
  type: string;
  /** 子节点 */
  children?: TreeNode[];
  /** 值预览 */
  preview?: string;
}

/**
 * 质量评估结果接口
 */
interface QualityResult {
  /** 总体评分 (0-100) */
  score: number;
  /** 各项指标 */
  metrics: QualityMetric[];
  /** 问题列表 */
  issues: QualityIssue[];
}

/**
 * 质量指标接口
 */
interface QualityMetric {
  /** 指标名称 */
  name: string;
  /** 指标评分 (0-100) */
  score: number;
  /** 指标描述 */
  description: string;
}

/**
 * 质量问题接口
 */
interface QualityIssue {
  /** 问题消息 */
  message: string;
  /** 严重程度 */
  severity: "error" | "warning" | "info";
  /** 问题路径 */
  path?: string;
}

/**
 * 字段建议结果接口
 */
interface FieldsResult {
  /** 关键字段 */
  keyFields: string[];
  /** 缺失字段 */
  missingFields: string[];
  /** 优化建议 */
  suggestions: string[];
}

// ===== Props 定义 =====

const props = withDefaults(
  defineProps<{
    /** JSON 数据字符串 */
    jsonData: string;
    /** 分析类型 */
    analysisType?: AnalysisType;
  }>(),
  {
    analysisType: "structure",
  },
);

// ===== Emits 定义 =====

const emit = defineEmits<{
  /** 分析结果事件 */
  result: [analysis: string];
  /** 错误事件 */
  error: [error: AnalysisError];
}>();

// ===== Store & Composables =====

const aiStore = useAiStore();
const modelManager = getModelManager();

// ===== 响应式状态 =====

/** 当前分析类型 */
const activeAnalysisType = ref<AnalysisType>(props.analysisType);

/** 解析后的 JSON 数据 */
const parsedJson = ref<unknown>(null);

/** JSON 解析错误 */
const parseError = ref<string | null>(null);

/** 分析结果 */
const analysisResult = ref<string>("");

/** 分析来源 */
const analysisSource = ref<"ai" | "local">("local");

/** 是否正在分析 */
const isAnalyzing = ref(false);

/** 是否正在检查 AI 状态 */
const isCheckingAi = ref(false);

/** AI 错误信息 */
const aiError = ref<string | null>(null);

/** 分析错误信息 */
const analysisError = ref<AnalysisError | null>(null);

/** 结构分析结果 */
const structureResult = ref<StructureResult | null>(null);

/** 质量评估结果 */
const qualityResult = ref<QualityResult | null>(null);

/** 字段建议结果 */
const fieldsResult = ref<FieldsResult | null>(null);

// ===== 计算属性 =====

/** AI 是否就绪 */
const isAiReady = computed(() => {
  return aiStore.canUseAi && !aiError.value;
});

/** 是否有本地分析结果 */
const hasLocalResult = computed(() => {
  return analysisResult.value && analysisSource.value === "local";
});

/** JSON 数据大小 */
const jsonSize = computed(() => {
  if (!props.jsonData) return "0 B";
  const bytes = new Blob([props.jsonData]).size;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
});

/** JSON 数据类型 */
const jsonType = computed(() => {
  if (!parsedJson.value) return "未知";
  return Array.isArray(parsedJson.value) ? "数组" : "对象";
});

/** JSON 数据深度 */
const jsonDepth = computed(() => {
  if (!parsedJson.value) return 0;
  return calculateDepth(parsedJson.value);
});

/** JSON 节点数量 */
const jsonNodeCount = computed(() => {
  if (!parsedJson.value) return 0;
  return countNodes(parsedJson.value);
});

// ===== 监听器 =====

/**
 * 监听 jsonData 变化
 * 自动解析 JSON 数据
 */
watch(
  () => props.jsonData,
  (newData) => {
    if (newData) {
      parseJsonData(newData);
    } else {
      parsedJson.value = null;
      parseError.value = null;
    }
  },
  { immediate: true },
);

/**
 * 监听 analysisType 变化
 */
watch(
  () => props.analysisType,
  (newType) => {
    activeAnalysisType.value = newType;
  },
);

// ===== 生命周期 =====

onMounted(async () => {
  await checkAiAvailability();
});

// ===== 方法 =====

/**
 * 解析 JSON 数据
 * @param data - JSON 字符串
 */
const parseJsonData = (data: string): void => {
  parseError.value = null;
  parsedJson.value = null;

  try {
    parsedJson.value = JSON.parse(data);
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    parseError.value = `JSON 解析失败: ${err.message}`;
    emit("error", {
      message: parseError.value,
      code: "PARSE_ERROR",
      details: error,
    });
  }
};

/**
 * 检查 AI 服务可用性
 */
const checkAiAvailability = async (): Promise<void> => {
  isCheckingAi.value = true;
  aiError.value = null;

  try {
    // 如果未启用，不检查
    if (!aiStore.isEnabled) {
      isCheckingAi.value = false;
      return;
    }

    // 检查可用性
    const isAvailable = await aiStore.checkAvailability();

    if (!isAvailable) {
      aiError.value =
        aiStore.lastError?.message || "AI 服务暂时不可用，将使用本地分析";
    }
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    aiError.value = err.message;
  } finally {
    isCheckingAi.value = false;
  }
};

/**
 * 启用 AI 功能
 */
const handleEnableAi = async (): Promise<void> => {
  try {
    aiStore.toggleEnabled();
    await checkAiAvailability();
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    message.error(`启用 AI 失败: ${err.message}`);
  }
};

/**
 * 处理 Tab 切换
 * @param key - Tab 键值
 */
const handleTabChange = (key: string): void => {
  activeAnalysisType.value = key as AnalysisType;
  // 清除当前结果
  analysisResult.value = "";
  structureResult.value = null;
  qualityResult.value = null;
  fieldsResult.value = null;
};

/**
 * 开始分析
 */
const handleAnalyze = async (): Promise<void> => {
  if (!parsedJson.value) {
    message.warning("请先输入有效的 JSON 数据");
    return;
  }

  isAnalyzing.value = true;
  analysisError.value = null;

  try {
    // 优先使用 AI 分析
    if (isAiReady.value) {
      await performAiAnalysis();
    } else {
      // 降级到本地分析
      await handleLocalAnalysis();
    }
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    analysisError.value = {
      message: err.message,
      code: "ANALYSIS_ERROR",
      details: error,
    };
    emit("error", analysisError.value);
  } finally {
    isAnalyzing.value = false;
  }
};

/**
 * 执行 AI 分析
 */
const performAiAnalysis = async (): Promise<void> => {
  const prompt = buildAnalysisPrompt();
  const options: GenerateOptions = {
    maxTokens: 2000,
    temperature: 0.7,
  };

  try {
    const response = await modelManager.generate(prompt, options);

    if (response.content) {
      analysisResult.value = response.content.trim();
      analysisSource.value = "ai";
      message.success("AI 分析完成");
      emit("result", analysisResult.value);
    } else {
      throw new Error("AI 分析返回空结果");
    }
  } catch (error) {
    // AI 分析失败，降级到本地分析
    console.warn("AI 分析失败，降级到本地分析:", error);
    await handleLocalAnalysis();
  }
};

/**
 * 执行本地分析
 */
const handleLocalAnalysis = async (): Promise<void> => {
  if (!parsedJson.value) {
    message.warning("请先输入有效的 JSON 数据");
    return;
  }

  isAnalyzing.value = true;

  try {
    let result = "";

    switch (activeAnalysisType.value) {
      case "structure":
        structureResult.value = analyzeJsonStructure(parsedJson.value);
        result = formatStructureResult(structureResult.value);
        break;
      case "quality":
        qualityResult.value = analyzeJsonQuality(parsedJson.value);
        result = formatQualityResult(qualityResult.value);
        break;
      case "fields":
        fieldsResult.value = analyzeJsonFields(parsedJson.value);
        result = formatFieldsResult(fieldsResult.value);
        break;
    }

    analysisResult.value = result;
    analysisSource.value = "local";
    message.success("本地分析完成");
    emit("result", result);
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    analysisError.value = {
      message: err.message,
      code: "LOCAL_ANALYSIS_ERROR",
      details: error,
    };
    emit("error", analysisError.value);
  } finally {
    isAnalyzing.value = false;
  }
};

/**
 * 构建分析提示词
 * @returns 完整的提示词
 */
const buildAnalysisPrompt = (): string => {
  const parts: string[] = [];

  // 添加 JSON 数据
  parts.push("## JSON 数据");
  parts.push("```json");
  parts.push(props.jsonData.substring(0, 5000)); // 限制长度
  parts.push("```");
  parts.push("");

  // 根据分析类型添加不同的提示
  switch (activeAnalysisType.value) {
    case "structure":
      parts.push("## 分析任务");
      parts.push("请分析上述 JSON 数据的结构特征：");
      parts.push("1. 层级结构：描述数据的嵌套层级关系");
      parts.push("2. 数据类型：统计各类型字段的数量和分布");
      parts.push("3. 嵌套深度：计算最大嵌套深度");
      parts.push("4. 数组特征：分析数组长度分布和元素类型");
      parts.push("");
      parts.push("请以清晰的格式输出分析结果，包含关键指标和结论。");
      break;

    case "quality":
      parts.push("## 分析任务");
      parts.push("请评估上述 JSON 数据的质量：");
      parts.push("1. 完整性：检查是否有缺失字段或空值");
      parts.push("2. 一致性：检查数据格式和类型是否一致");
      parts.push("3. 有效性：检查数据值是否合理有效");
      parts.push("4. 给出总体质量评分（0-100分）");
      parts.push("");
      parts.push("请列出发现的问题，并给出改进建议。");
      break;

    case "fields":
      parts.push("## 分析任务");
      parts.push("请分析上述 JSON 数据的字段特征：");
      parts.push("1. 关键字段：识别最重要的字段及其作用");
      parts.push("2. 缺失字段：建议可能缺失的有用字段");
      parts.push("3. 字段命名：评估字段命名是否规范");
      parts.push("4. 优化建议：提供字段相关的优化建议");
      parts.push("");
      parts.push("请以结构化的方式输出分析结果。");
      break;
  }

  return parts.join("\n");
};

// ===== 本地分析函数 =====

/**
 * 分析 JSON 结构
 * @param data - JSON 数据
 * @returns 结构分析结果
 */
const analyzeJsonStructure = (data: unknown): StructureResult => {
  const typeDistribution: Record<string, number> = {};
  const tree = buildTree(data, "", typeDistribution);
  const maxDepth = calculateDepth(data);
  const totalNodes = countNodes(data);

  return {
    tree,
    typeDistribution,
    maxDepth,
    totalNodes,
  };
};

/**
 * 构建树结构
 * @param data - 数据
 * @param prefix - 键名前缀
 * @param typeDist - 类型分布统计
 * @returns 树节点数组
 */
const buildTree = (
  data: unknown,
  prefix: string,
  typeDist: Record<string, number>,
): TreeNode[] => {
  const nodes: TreeNode[] = [];

  if (Array.isArray(data)) {
    // 数组类型
    const type = "array";
    typeDist[type] = (typeDist[type] || 0) + 1;

    if (data.length > 0) {
      // 只展示第一个元素的结构
      const childNodes = buildTree(data[0], "", typeDist);
      nodes.push({
        key: `${prefix}[0]`,
        type: `${type}[${data.length}]`,
        children: childNodes,
      });
    } else {
      nodes.push({
        key: prefix,
        type: `${type}[0]`,
        preview: "空数组",
      });
    }
  } else if (data !== null && typeof data === "object") {
    // 对象类型
    const type = "object";
    typeDist[type] = (typeDist[type] || 0) + 1;

    const keys = Object.keys(data as Record<string, unknown>);
    for (const key of keys.slice(0, 20)) {
      // 限制显示数量
      const value = (data as Record<string, unknown>)[key];
      const valueType = getValueType(value);
      typeDist[valueType] = (typeDist[valueType] || 0) + 1;

      if (valueType === "object" || valueType === "array") {
        nodes.push({
          key,
          type: valueType,
          children: buildTree(value, key, typeDist),
        });
      } else {
        nodes.push({
          key,
          type: valueType,
          preview: getPreview(value),
        });
      }
    }

    if (keys.length > 20) {
      nodes.push({
        key: "...",
        type: "more",
        preview: `还有 ${keys.length - 20} 个字段`,
      });
    }
  } else {
    // 基本类型
    const type = getValueType(data);
    typeDist[type] = (typeDist[type] || 0) + 1;
    nodes.push({
      key: prefix || "value",
      type,
      preview: getPreview(data),
    });
  }

  return nodes;
};

/**
 * 分析 JSON 质量
 * @param data - JSON 数据
 * @returns 质量评估结果
 */
const analyzeJsonQuality = (data: unknown): QualityResult => {
  const issues: QualityIssue[] = [];
  let totalFields = 0;
  let nullFields = 0;
  let emptyStrings = 0;
  let invalidValues = 0;

  /**
   * 递归检查数据质量
   * @param obj - 数据对象
   * @param path - 当前路径
   */
  const checkQuality = (obj: unknown, path: string = ""): void => {
    if (obj === null || obj === undefined) {
      nullFields++;
      if (path) {
        issues.push({
          message: "字段值为 null 或 undefined",
          severity: "warning",
          path,
        });
      }
      return;
    }

    if (typeof obj === "string") {
      if (obj.trim() === "") {
        emptyStrings++;
        issues.push({
          message: "字符串字段为空",
          severity: "info",
          path,
        });
      }
      return;
    }

    if (Array.isArray(obj)) {
      if (obj.length === 0) {
        issues.push({
          message: "数组为空",
          severity: "info",
          path,
        });
      }
      obj.forEach((item, index) => {
        checkQuality(item, `${path}[${index}]`);
      });
      return;
    }

    if (typeof obj === "object") {
      const keys = Object.keys(obj);
      totalFields += keys.length;

      for (const key of keys) {
        const value = (obj as Record<string, unknown>)[key];
        const newPath = path ? `${path}.${key}` : key;
        checkQuality(value, newPath);
      }
    }
  };

  checkQuality(data);

  // 计算各项指标
  const completeness =
    totalFields > 0 ? ((totalFields - nullFields) / totalFields) * 100 : 100;
  const consistency = 100 - (emptyStrings / Math.max(totalFields, 1)) * 100;
  const validity = 100 - (invalidValues / Math.max(totalFields, 1)) * 100;

  // 计算总分
  const score = Math.round((completeness + consistency + validity) / 3);

  return {
    score,
    metrics: [
      {
        name: "完整性",
        score: Math.round(completeness),
        description: `字段填充率 ${Math.round(completeness)}%`,
      },
      {
        name: "一致性",
        score: Math.round(consistency),
        description: `数据格式一致性 ${Math.round(consistency)}%`,
      },
      {
        name: "有效性",
        score: Math.round(validity),
        description: `数据值有效性 ${Math.round(validity)}%`,
      },
    ],
    issues,
  };
};

/**
 * 分析 JSON 字段
 * @param data - JSON 数据
 * @returns 字段建议结果
 */
const analyzeJsonFields = (data: unknown): FieldsResult => {
  const allFields = new Set<string>();
  const fieldTypes = new Map<string, Set<string>>();
  const suggestions: string[] = [];

  /**
   * 收集所有字段
   * @param obj - 数据对象
   */
  const collectFields = (obj: unknown): void => {
    if (Array.isArray(obj)) {
      obj.forEach((item) => collectFields(item));
    } else if (obj !== null && typeof obj === "object") {
      const keys = Object.keys(obj as Record<string, unknown>);
      for (const key of keys) {
        allFields.add(key);
        const value = (obj as Record<string, unknown>)[key];
        const type = getValueType(value);

        if (!fieldTypes.has(key)) {
          fieldTypes.set(key, new Set());
        }
        fieldTypes.get(key)!.add(type);
      }

      // 递归处理嵌套对象
      for (const key of keys) {
        const value = (obj as Record<string, unknown>)[key];
        if (typeof value === "object" && value !== null) {
          collectFields(value);
        }
      }
    }
  };

  collectFields(data);

  // 识别关键字段
  const keyFields: string[] = [];
  const commonKeyPatterns = [
    "id",
    "name",
    "title",
    "type",
    "status",
    "time",
    "date",
    "code",
  ];

  for (const field of Array.from(allFields)) {
    const lowerField = field.toLowerCase();
    if (commonKeyPatterns.some((pattern) => lowerField.includes(pattern))) {
      keyFields.push(field);
    }
  }

  // 检查类型不一致的字段
  for (const [field, types] of Array.from(fieldTypes.entries())) {
    if (types.size > 1) {
      suggestions.push(
        `字段 "${field}" 存在多种类型: ${Array.from(types).join(", ")}，建议统一类型`,
      );
    }
  }

  // 建议可能缺失的字段
  const missingFields: string[] = [];
  const suggestedFields = ["id", "createdAt", "updatedAt", "status"];

  for (const suggested of suggestedFields) {
    const hasSimilar = Array.from(allFields).some((f) =>
      f.toLowerCase().includes(suggested.toLowerCase()),
    );
    if (!hasSimilar) {
      missingFields.push(suggested);
    }
  }

  // 添加通用建议
  if (allFields.size > 20) {
    suggestions.push("字段数量较多，建议考虑分组或嵌套结构");
  }

  if (!Array.from(allFields).some((f) => f.toLowerCase().includes("id"))) {
    suggestions.push("建议添加唯一标识字段（如 id）");
  }

  return {
    keyFields,
    missingFields,
    suggestions,
  };
};

// ===== 辅助函数 =====

/**
 * 获取值类型
 * @param value - 值
 * @returns 类型字符串
 */
const getValueType = (value: unknown): string => {
  if (value === null) return "null";
  if (value === undefined) return "undefined";
  if (Array.isArray(value)) return "array";
  return typeof value;
};

/**
 * 获取值预览
 * @param value - 值
 * @returns 预览字符串
 */
const getPreview = (value: unknown): string => {
  if (value === null) return "null";
  if (value === undefined) return "undefined";
  if (typeof value === "string") {
    return value.length > 30 ? `"${value.substring(0, 30)}..."` : `"${value}"`;
  }
  return String(value);
};

/**
 * 计算数据深度
 * @param data - 数据
 * @returns 最大深度
 */
const calculateDepth = (data: unknown): number => {
  if (data === null || typeof data !== "object") {
    return 0;
  }

  if (Array.isArray(data)) {
    if (data.length === 0) return 1;
    return 1 + Math.max(...data.map((item) => calculateDepth(item)));
  }

  const keys = Object.keys(data);
  if (keys.length === 0) return 1;

  return (
    1 +
    Math.max(
      ...keys.map((key) =>
        calculateDepth((data as Record<string, unknown>)[key]),
      ),
    )
  );
};

/**
 * 统计节点数量
 * @param data - 数据
 * @returns 节点数量
 */
const countNodes = (data: unknown): number => {
  if (data === null || typeof data !== "object") {
    return 1;
  }

  if (Array.isArray(data)) {
    return data.reduce((sum, item) => sum + countNodes(item), 1);
  }

  const keys = Object.keys(data);
  return keys.reduce((sum, key) => {
    return sum + countNodes((data as Record<string, unknown>)[key]);
  }, 1);
};

/**
 * 格式化结构分析结果
 * @param result - 结构分析结果
 * @returns 格式化字符串
 */
const formatStructureResult = (result: StructureResult): string => {
  const lines: string[] = [];
  lines.push("## JSON 结构分析报告");
  lines.push("");
  lines.push("### 基本信息");
  lines.push(`- 最大嵌套深度: ${result.maxDepth}`);
  lines.push(`- 节点总数: ${result.totalNodes}`);
  lines.push("");
  lines.push("### 类型分布");
  for (const [type, count] of Object.entries(result.typeDistribution)) {
    lines.push(`- ${type}: ${count}`);
  }
  return lines.join("\n");
};

/**
 * 格式化质量评估结果
 * @param result - 质量评估结果
 * @returns 格式化字符串
 */
const formatQualityResult = (result: QualityResult): string => {
  const lines: string[] = [];
  lines.push("## JSON 质量评估报告");
  lines.push("");
  lines.push(`### 总体评分: ${result.score}/100`);
  lines.push("");
  lines.push("### 各项指标");
  for (const metric of result.metrics) {
    lines.push(`- ${metric.name}: ${metric.score}分 - ${metric.description}`);
  }
  lines.push("");
  if (result.issues.length > 0) {
    lines.push("### 发现的问题");
    for (const issue of result.issues) {
      lines.push(
        `- [${issue.severity}] ${issue.message}${issue.path ? ` (${issue.path})` : ""}`,
      );
    }
  }
  return lines.join("\n");
};

/**
 * 格式化字段建议结果
 * @param result - 字段建议结果
 * @returns 格式化字符串
 */
const formatFieldsResult = (result: FieldsResult): string => {
  const lines: string[] = [];
  lines.push("## JSON 字段分析报告");
  lines.push("");
  if (result.keyFields.length > 0) {
    lines.push("### 关键字段");
    lines.push(result.keyFields.map((f) => `- ${f}`).join("\n"));
    lines.push("");
  }
  if (result.missingFields.length > 0) {
    lines.push("### 建议添加的字段");
    lines.push(result.missingFields.map((f) => `- ${f}`).join("\n"));
    lines.push("");
  }
  if (result.suggestions.length > 0) {
    lines.push("### 优化建议");
    lines.push(result.suggestions.map((s) => `- ${s}`).join("\n"));
  }
  return lines.join("\n");
};

/**
 * 格式化 Markdown
 * @param text - Markdown 文本
 * @returns HTML 字符串
 */
const formatMarkdown = (text: string): string => {
  return text
    .replace(/^### (.*$)/gm, "<h3>$1</h3>")
    .replace(/^## (.*$)/gm, "<h2>$1</h2>")
    .replace(/^# (.*$)/gm, "<h1>$1</h1>")
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/^- (.*$)/gm, "<li>$1</li>")
    .replace(/(<li>[\s\S]*<\/li>)/g, "<ul>$1</ul>")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\n/g, "<br>");
};

/**
 * 获取类型颜色
 * @param type - 类型名称
 * @returns 颜色值
 */
const getTypeColor = (type: string): string => {
  const colors: Record<string, string> = {
    string: "blue",
    number: "green",
    boolean: "orange",
    object: "purple",
    array: "cyan",
    null: "default",
    undefined: "default",
  };
  return colors[type] || "default";
};

/**
 * 获取评分颜色
 * @param score - 评分
 * @returns 颜色值
 */
const getScoreColor = (score: number): string => {
  if (score >= 80) return "#52c41a";
  if (score >= 60) return "#faad14";
  return "#ff4d4f";
};

/**
 * 获取进度条颜色
 * @param score - 评分
 * @returns 颜色值
 */
const getProgressColor = (score: number): string => {
  return getScoreColor(score);
};

/**
 * 获取问题图标
 * @param severity - 严重程度
 * @returns 图标类名
 */
const getIssueIcon = (severity: string): string => {
  const icons: Record<string, string> = {
    error: "i-carbon-close-filled",
    warning: "i-carbon-warning-filled",
    info: "i-carbon-information-filled",
  };
  return icons[severity] || "i-carbon-information";
};

/**
 * 导出分析报告
 */
const handleExport = (): void => {
  if (!analysisResult.value) {
    message.warning("没有可导出的分析结果");
    return;
  }

  const blob = new Blob([analysisResult.value], {
    type: "text/markdown;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `json-analysis-${activeAnalysisType.value}-${Date.now()}.md`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  message.success("报告已导出");
};
</script>

<script lang="ts">
/**
 * JsonTreeNode 组件
 * 用于渲染 JSON 树节点
 * 注意：h 和 VNode 已在第一个 script setup 块中导入
 */

/**
 * 树节点接口（用于 JsonTreeNode 组件）
 */
interface JsonTreeNodeData {
  key: string;
  type: string;
  children?: JsonTreeNodeData[];
  preview?: string;
}

const JsonTreeNode = {
  name: "JsonTreeNode",
  props: {
    node: {
      type: Object,
      required: true,
    },
    depth: {
      type: Number,
      default: 0,
    },
  },
  setup(props: { node: JsonTreeNodeData; depth: number }) {
    const { node, depth } = props;
    const indent = depth * 16;

    return () => {
      const children: VNode[] = [];

      // 节点内容
      children.push(
        h(
          "div",
          { class: "tree-node-content", style: { paddingLeft: `${indent}px` } },
          [
            h("span", { class: "node-key" }, node.key),
            h("span", { class: "node-type" }, `: ${node.type}`),
            node.preview
              ? h("span", { class: "node-preview" }, ` = ${node.preview}`)
              : null,
          ],
        ),
      );

      // 子节点
      if (node.children && node.children.length > 0) {
        children.push(
          h(
            "div",
            { class: "tree-node-children" },
            node.children.map((child, index) =>
              h(JsonTreeNode, { key: index, node: child, depth: depth + 1 }),
            ),
          ),
        );
      }

      return h("div", { class: "tree-node" }, children);
    };
  },
};
</script>

<style scoped>
/**
 * JSON AI 助手容器
 */
.json-ai-assistant {
  padding: 16px;
  background: var(--bg-glass);
  backdrop-filter: blur(var(--backdrop-blur));
  -webkit-backdrop-filter: blur(var(--backdrop-blur));
  border: 1px solid var(--border-glass);
  border-radius: var(--border-radius-md);
  contain: layout style paint;
}

/**
 * AI 状态区域
 */
.ai-status-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 120px;
  gap: 16px;
  margin-bottom: 16px;
}

/**
 * 旋转图标动画
 */
.spin-icon {
  animation: spin 1s linear infinite;
  font-size: 24px;
  color: var(--color-primary);
  will-change: transform;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

/**
 * 分析内容区域
 */
.analysis-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/**
 * 分析类型选择
 */
.analysis-tabs {
  margin-bottom: 8px;
}

.tab-label {
  display: flex;
  align-items: center;
  gap: 6px;
}

/**
 * JSON 数据预览
 */
.json-preview {
  padding: 12px 16px;
  background: var(--bg-elevated);
  border: 1px solid var(--border-default);
  border-radius: var(--border-radius-sm);
}

.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.preview-label {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
}

.preview-stats {
  display: flex;
  gap: 16px;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.stat-label {
  font-size: 13px;
  color: var(--text-secondary);
}

.stat-value {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
}

/**
 * 操作按钮区域
 */
.action-buttons {
  display: flex;
  gap: 12px;
}

.analyze-btn {
  min-width: 120px;
  border-radius: var(--border-radius-sm);
  transition: transform var(--transition-fast) ease, box-shadow var(--transition-fast) ease, background-color var(--transition-fast) ease, border-color var(--transition-fast) ease;
}

.analyze-btn:not(:disabled):hover {
  transform: translateY(-1px);
  box-shadow: var(--shadow-button-hover);
}

.analyze-btn:not(:disabled):active {
  transform: scale(0.98);
}

/**
 * 分析结果区域
 */
.result-section {
  margin-top: 8px;
  padding-top: 16px;
  border-top: 1px solid var(--border-default);
}

.result-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.result-label {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
}

/**
 * 结果内容
 */
.result-content {
  min-height: 200px;
}

/**
 * AI 结果
 */
.ai-result {
  padding: 16px;
  background: var(--bg-elevated);
  border: 1px solid var(--border-default);
  border-radius: var(--border-radius-sm);
  font-size: 14px;
  line-height: 1.8;
  color: var(--text-primary);
}

.ai-result :deep(h1) {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 12px;
}

.ai-result :deep(h2) {
  font-size: 16px;
  font-weight: 600;
  margin-top: 16px;
  margin-bottom: 8px;
}

.ai-result :deep(h3) {
  font-size: 14px;
  font-weight: 500;
  margin-top: 12px;
  margin-bottom: 6px;
}

.ai-result :deep(ul) {
  padding-left: 20px;
  margin: 8px 0;
}

.ai-result :deep(li) {
  margin: 4px 0;
}

.ai-result :deep(code) {
  padding: 2px 6px;
  background: var(--bg-glass);
  border-radius: 4px;
  font-family: "Fira Code", "Consolas", monospace;
  font-size: 13px;
}

/**
 * 结构分析结果
 */
.structure-result {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.result-card {
  background: var(--bg-elevated);
  border: 1px solid var(--border-default);
  border-radius: var(--border-radius-sm);
  overflow: hidden;
}

.card-title {
  padding: 10px 16px;
  background: var(--bg-glass);
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
  border-bottom: 1px solid var(--border-default);
}

.card-content {
  padding: 12px 16px;
}

/**
 * 树视图
 */
.tree-view {
  font-family: "Fira Code", "Consolas", monospace;
  font-size: 13px;
}

.tree-node {
  line-height: 1.8;
}

.tree-node-content {
  display: flex;
  align-items: center;
  gap: 4px;
}

.node-key {
  color: var(--color-primary);
  font-weight: 500;
}

.node-type {
  color: var(--text-secondary);
}

.node-preview {
  color: var(--text-tertiary);
}

.tree-node-children {
  margin-left: 8px;
  border-left: 1px dashed var(--border-default);
}

/**
 * 类型统计
 */
.type-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.type-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.type-count {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
}

/**
 * 质量评估结果
 */
.quality-result {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.score-card {
  display: flex;
  justify-content: center;
  padding: 20px;
  background: var(--bg-elevated);
  border: 1px solid var(--border-default);
  border-radius: var(--border-radius-sm);
}

.score-circle {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 120px;
  height: 120px;
  border-radius: 50%;
  border: 4px solid var(--score-color);
  background: var(--bg-glass);
}

.score-value {
  font-size: 36px;
  font-weight: 600;
  color: var(--score-color);
}

.score-label {
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 4px;
}

/**
 * 指标网格
 */
.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
}

.metric-item {
  padding: 12px;
  background: var(--bg-elevated);
  border: 1px solid var(--border-default);
  border-radius: var(--border-radius-sm);
}

.metric-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.metric-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
}

.metric-desc {
  font-size: 12px;
  color: var(--text-secondary);
}

/**
 * 问题列表
 */
.issues-section {
  margin-top: 8px;
}

.issues-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 12px;
}

.issues-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.issue-item {
  display: flex;
  gap: 8px;
  padding: 10px 12px;
  background: var(--bg-elevated);
  border: 1px solid var(--border-default);
  border-radius: var(--border-radius-sm);
  border-left: 3px solid;
}

.issue-item.error {
  border-left-color: #ff4d4f;
}

.issue-item.warning {
  border-left-color: #faad14;
}

.issue-item.info {
  border-left-color: #1677ff;
}

.issue-icon {
  font-size: 16px;
  flex-shrink: 0;
}

.issue-item.error .issue-icon {
  color: #ff4d4f;
}

.issue-item.warning .issue-icon {
  color: #faad14;
}

.issue-item.info .issue-icon {
  color: #1677ff;
}

.issue-content {
  flex: 1;
}

.issue-message {
  font-size: 13px;
  color: var(--text-primary);
}

.issue-path {
  font-size: 12px;
  color: var(--text-tertiary);
  margin-top: 4px;
  font-family: "Fira Code", "Consolas", monospace;
}

/**
 * 字段建议结果
 */
.fields-result {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.fields-section {
  padding: 12px 16px;
  background: var(--bg-elevated);
  border: 1px solid var(--border-default);
  border-radius: var(--border-radius-sm);
}

.section-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 10px;
}

.fields-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.field-tag {
  font-size: 13px;
}

.suggestions-section {
  padding: 12px 16px;
  background: var(--bg-elevated);
  border: 1px solid var(--border-default);
  border-radius: var(--border-radius-sm);
}

.suggestions-list {
  padding-left: 20px;
  margin: 0;
}

.suggestions-list li {
  font-size: 13px;
  color: var(--text-primary);
  line-height: 1.8;
}

/**
 * 错误提示
 */
.error-alert {
  margin-top: 16px;
  border-radius: var(--border-radius-sm);
}

/**
 * 全局样式覆盖
 */
:deep(.ant-tabs-nav) {
  margin-bottom: 0;
}

:deep(.ant-tabs-tab) {
  padding: 8px 16px;
}

:deep(.ant-tag) {
  border-radius: var(--border-radius-xs);
}

:deep(.ant-progress) {
  flex: 1;
  max-width: 120px;
}

:deep(.ant-alert) {
  border-radius: var(--border-radius-sm);
}
</style>
