<template>
  <div class="excel-fill-page">
    <div class="page-header">
      <h1 class="page-title">Excel 数据填充工具</h1>
      <p class="page-subtitle">
        将源列数据填充到目标列，支持合并单元格和高级数据处理
      </p>
    </div>

    <div class="content-container">
      <VbenGlassCard title="上传 Excel 文件" class="upload-card">
        <a-upload-dragger
          :file-list="fileList"
          :before-upload="beforeUpload"
          @remove="handleRemove"
          accept=".xlsx,.xlsm"
          :max-count="1"
        >
          <p class="ant-upload-drag-icon">
            <InboxOutlined />
          </p>
          <p class="ant-upload-text">点击或拖拽文件到此区域上传</p>
          <p class="ant-upload-hint">
            支持 .xlsx、.xlsm 格式，文件大小限制 50MB
          </p>
        </a-upload-dragger>
        <div v-if="uploadProgress > 0" class="upload-progress-container">
          <a-progress
            :percent="uploadProgress"
            :status="uploadProgress === 100 ? 'success' : 'active'"
            :stroke-color="uploadProgress === 100 ? '#52c41a' : '#1890ff'"
          />
          <p class="upload-status-text">{{ uploadStatusText }}</p>
        </div>
      </VbenGlassCard>

      <a-tabs
        v-model:activeKey="activeTabKey"
        v-if="workbook"
        class="config-tabs"
      >
        <a-tab-pane key="basic">
          <template #tab>
            <span><FormOutlined /> 基础配置</span>
          </template>
          <BasicFillTab
            :config="config"
            :columns="columns"
            :sheet-names="sheetNames"
            :target-columns="targetColumns"
            :filter-option="filterOption"
            @sheet-change="handleSheetChange"
            @source-column-change="handleSourceColumnChange"
            @target-sheet-change="handleTargetSheetChange"
            @target-column-change="handleTargetColumnChange"
          />
        </a-tab-pane>

        <a-tab-pane key="advanced">
          <template #tab>
            <span><SettingOutlined /> 高级数据处理</span>
          </template>
          <AdvancedFillTab
            :advanced-config="advancedConfig"
            :columns="columns"
            :sheet-names="sheetNames"
            :target-columns="targetColumns"
            :source-columns="sourceColumns"
            :source-worksheet="sourceWorksheet"
            :match-worksheet="matchWorksheet"
            :match-columns="matchColumns"
            :target-worksheet="targetWorksheet"
            :has-multiple-sheets="hasMultipleSheets"
            :can-process-advanced="canProcessAdvanced"
            :processing="processing"
            :processing-progress="processingProgress"
            :processing-status-text="processingStatusText"
            :processing-status="processingStatus"
            :progress-color="progressColor"
            :split-delimiter-options="splitDelimiterOptions"
            :is-custom-split-delimiter="isCustomSplitDelimiter"
            :filter-option="filterOption"
            @source-sheet-change="handleSourceSheetChange"
            @source-column-for-split-change="handleSourceColumnForSplitChange"
            @split-delimiter-type-change="handleSplitDelimiterTypeChange"
            @match-sheet-change="handleMatchSheetChange"
            @match-column-change="handleMatchColumnChange"
            @extract-columns-change="handleExtractColumnsChange"
            @result-column-change="handleResultColumnChange"
            @target-sheet-change="handleTargetSheetChange"
            @target-column-change="handleTargetColumnChange"
            @process="handleProcess"
          />
        </a-tab-pane>

        <a-tab-pane key="quote">
          <template #tab>
            <span><FormatPainterOutlined /> 引号转换</span>
          </template>
          <QuoteConvertTab
            :quote-config="quoteConfig"
            :sheet-names="sheetNames"
            :columns="columns"
            :can-process-quote="canProcessQuote"
            :quote-processing="quoteProcessing"
            :quote-progress="quoteProgress"
            :quote-status-text="quoteStatusText"
            :filter-option="filterOption"
            @sheet-change="handleQuoteSheetChange"
            @process="handleQuoteProcess"
          />
        </a-tab-pane>
      </a-tabs>

      <VbenGlassCard title="数据预览" class="preview-card" v-if="workbook">
        <a-form layout="inline" style="margin-bottom: 16px">
          <a-form-item label="预览工作表">
            <a-select
              v-model:value="previewSheetName"
              placeholder="选择预览工作表"
              @change="handlePreviewSheetChange"
              style="width: 200px"
            >
              <a-select-option
                v-for="sheet in sheetNames"
                :key="sheet"
                :value="sheet"
              >
                {{ sheet }}
              </a-select-option>
            </a-select>
          </a-form-item>
        </a-form>
        <a-table
          :columns="previewColumns"
          :data-source="previewData"
          :pagination="false"
          :scroll="{ x: 'max-content' }"
          bordered
          size="small"
        />
      </VbenGlassCard>

      <div class="action-buttons" v-if="workbook && activeTabKey !== 'quote'">
        <a-button
          type="primary"
          size="large"
          :loading="processing"
          :disabled="
            activeTabKey === 'advanced' ? !canProcessAdvanced : !canProcessBasic
          "
          @click="handleProcess"
        >
          <template #icon>
            <PlayCircleOutlined />
          </template>
          {{ activeTabKey === "advanced" ? "开始高级数据处理" : "开始处理" }}
        </a-button>
        <a-button size="large" @click="handleReset">
          <template #icon>
            <ReloadOutlined />
          </template>
          重置
        </a-button>
      </div>

      <VbenGlassCard title="处理结果" class="result-card" v-if="result">
        <a-descriptions bordered :column="1">
          <a-descriptions-item label="输入文件">
            {{ result.inputFile }}
          </a-descriptions-item>
          <a-descriptions-item label="输出文件">
            {{ result.outputFile }}
          </a-descriptions-item>
          <a-descriptions-item label="源工作表">
            {{ result.sourceSheetName }}
          </a-descriptions-item>
          <a-descriptions-item
            label="源数据工作表"
            v-if="result.advancedEnabled"
          >
            {{ result.sourceSheetNameForSplit || "无" }}
          </a-descriptions-item>
          <a-descriptions-item
            label="查询匹配工作表"
            v-if="result.advancedEnabled"
          >
            {{ result.matchSheetName || "无" }}
          </a-descriptions-item>
          <a-descriptions-item label="目标工作表">
            {{ result.targetSheetName }}
          </a-descriptions-item>
          <a-descriptions-item label="源列">
            {{ result.sourceColumn }} (列号: {{ result.sourceColumnNum }})
          </a-descriptions-item>
          <a-descriptions-item label="源数据列（用于分割）">
            {{ result.sourceColumnForSplit || "无" }}
          </a-descriptions-item>
          <a-descriptions-item label="目标列">
            {{ result.targetColumn }} (列号: {{ result.targetColumnNum }})
          </a-descriptions-item>
          <a-descriptions-item label="数据起始行">
            {{ result.startRow }}
          </a-descriptions-item>
          <a-descriptions-item label="保持合并格式">
            {{ result.keepMergedFormat ? "是" : "否" }}
          </a-descriptions-item>
          <a-descriptions-item label="高级数据处理">
            {{ result.advancedEnabled ? "是" : "否" }}
          </a-descriptions-item>
          <template v-if="result.advancedEnabled">
            <a-descriptions-item label="分割符">
              {{ result.splitDelimiter || "无" }}
            </a-descriptions-item>
            <a-descriptions-item label="查询匹配列">
              {{ result.matchColumn || "无" }}
            </a-descriptions-item>
            <a-descriptions-item label="提取列">
              {{ result.extractColumns?.join(", ") || "无" }}
            </a-descriptions-item>
            <a-descriptions-item label="拼接符">
              {{ result.joinDelimiter || "无" }}
            </a-descriptions-item>
            <a-descriptions-item label="结果填充列">
              {{ result.resultColumn || "覆盖源列" }}
            </a-descriptions-item>
            <a-descriptions-item label="未匹配处理">
              {{
                result.noMatchAction === "skip"
                  ? "跳过"
                  : `使用默认值: ${result.defaultValue}`
              }}
            </a-descriptions-item>
            <a-descriptions-item label="源列数据总数">
              {{ result.sourceDataCount }}
            </a-descriptions-item>
            <a-descriptions-item label="分割后数据项数">
              {{ result.splitDataCount }}
            </a-descriptions-item>
            <a-descriptions-item label="匹配成功数">
              {{ result.matchedCount }}
            </a-descriptions-item>
            <a-descriptions-item label="未匹配数">
              {{ result.unmatchedCount }}
            </a-descriptions-item>
            <a-descriptions-item label="提取数据项数">
              {{ result.extractedCount }}
            </a-descriptions-item>
          </template>
          <template v-if="result.quoteConverted">
            <a-descriptions-item label="转换类型">
              引号转换
            </a-descriptions-item>
            <a-descriptions-item label="处理数量">
              {{ result.processedCount }} 个单元格
            </a-descriptions-item>
          </template>
          <a-descriptions-item label="总处理单元数">
            {{ result.totalCellsProcessed }}
          </a-descriptions-item>
          <a-descriptions-item label="合并单元格数">
            {{ result.mergedCellsProcessed }}
          </a-descriptions-item>
          <a-descriptions-item label="普通单元格数">
            {{ result.normalCellsProcessed }}
          </a-descriptions-item>
          <a-descriptions-item label="成功填充数据">
            {{ result.dataFilledCount }}
          </a-descriptions-item>
          <a-descriptions-item label="跳过的单元数">
            {{ result.skippedCount }}
          </a-descriptions-item>
        </a-descriptions>

        <div class="result-actions">
          <a-button type="primary" @click="handleDownload">
            <template #icon>
              <DownloadOutlined />
            </template>
            下载结果文件
          </a-button>
          <a-button @click="handleReset">
            <template #icon>
              <ReloadOutlined />
            </template>
            重新处理
          </a-button>
        </div>
      </VbenGlassCard>
    </div>

    <!-- 悬浮按钮组 -->
    <a-float-button-group trigger="click" type="primary" shape="circle">
      <template #icon><SettingOutlined /></template>
      <a-float-button @click="scrollToTop">
        <template #icon><VerticalAlignTopOutlined /></template>
        <template #tooltip>回到顶部</template>
      </a-float-button>
      <a-float-button @click="handleToggleTheme">
        <template #icon>
          <BulbOutlined v-if="!isDark" />
          <BulbFilled v-else />
        </template>
        <template #tooltip>{{
          isDark ? "切换亮色模式" : "切换暗色模式"
        }}</template>
      </a-float-button>
    </a-float-button-group>
  </div>
</template>

<script setup>
/**
 * @fileoverview Excel数据填充工具页面
 * @description 提供Excel数据填充、高级数据处理和引号转换功能
 * @author SqlTool
 */

import { ref, computed } from "vue";
import { message } from "ant-design-vue";
import { storeToRefs } from "pinia";
import {
  InboxOutlined,
  PlayCircleOutlined,
  ReloadOutlined,
  DownloadOutlined,
  SettingOutlined,
  VerticalAlignTopOutlined,
  BulbOutlined,
  BulbFilled,
  FormOutlined,
  FormatPainterOutlined,
} from "@ant-design/icons-vue";
import VbenGlassCard from "@/components/common/VbenGlassCard.vue";
import BasicFillTab from "@/components/excel/BasicFillTab.vue";
import AdvancedFillTab from "@/components/excel/AdvancedFillTab.vue";
import QuoteConvertTab from "@/components/excel/QuoteConvertTab.vue";
import * as XLSX from "xlsx";
import { useThemeStore } from "@/stores/theme.js";
import { useSettings } from "@/composables/core/useSettings.js";

const themeStore = useThemeStore();
const { isDark } = storeToRefs(themeStore);
const { getSetting } = useSettings();

const scrollToTop = () => {
  window.scrollTo({ top: 0, behavior: "smooth" });
};

const handleToggleTheme = () => {
  themeStore.toggle();
};

const fileList = ref([]);
const workbook = ref(null);
const worksheet = ref(null);
const targetWorksheet = ref(null);
const previewWorksheet = ref(null);
const previewSheetName = ref("");
const sheetNames = ref([]);
const columns = ref([]);
const targetColumns = ref([]);
const sourceColumns = ref([]);
const sourceWorksheet = ref(null);
const previewData = ref([]);
const processing = ref(false);
const result = ref(null);
const outputBlob = ref(null);
const processingProgress = ref(0);
const processingStatusText = ref("");
const uploadProgress = ref(0);
const uploadStatusText = ref("");
const activeTabKey = ref("basic");

const quoteConfig = ref({
  sheetName: "",
  sourceColumn: "",
  delimiter: "comma",
  customDelimiter: "",
  quoteStyle: "double",
  targetColumn: "",
});

// 引号转换相关状态
const quoteProcessing = ref(false);
const quoteProgress = ref(0);
const quoteStatusText = ref("");

const hasMultipleSheets = computed(() => {
  return sheetNames.value.length > 1;
});

const splitDelimiterOptions = [
  { label: "逗号 (,)", value: "comma", delimiter: "," },
  { label: "分号 (;)", value: "semicolon", delimiter: ";" },
  { label: "空格 ( )", value: "space", delimiter: " " },
  { label: "换行 (\\n)", value: "newline", delimiter: "\n" },
  { label: "自定义", value: "custom", delimiter: "" },
];

const isCustomSplitDelimiter = computed(() => {
  return advancedConfig.value.splitDelimiterType === "custom";
});

const config = ref({
  sheetName: "",
  targetSheetName: "",
  sourceColumn: "",
  targetColumn: "",
  startRow: 2,
  keepMergedFormat: true,
});

const advancedConfig = ref({
  enabled: false,
  sourceSheetName: "",
  sourceColumnForSplit: "",
  splitDelimiter: ",",
  splitDelimiterType: "comma",
  customSplitDelimiter: "",
  matchSheetName: "",
  matchColumn: "",
  extractColumns: [],
  joinDelimiter: ",",
  resultColumn: "",
  noMatchAction: "skip",
  defaultValue: "",
  targetSheetName: "",
  targetColumn: "",
});

const matchColumns = ref([]);
const matchWorksheet = ref(null);

const canProcessAdvanced = computed(() => {
  if (!workbook.value) return false;

  return (
    advancedConfig.value.sourceSheetName &&
    advancedConfig.value.sourceSheetName !== "" &&
    advancedConfig.value.sourceColumnForSplit &&
    advancedConfig.value.sourceColumnForSplit !== "" &&
    advancedConfig.value.splitDelimiter &&
    advancedConfig.value.splitDelimiter !== "" &&
    advancedConfig.value.matchSheetName &&
    advancedConfig.value.matchSheetName !== "" &&
    advancedConfig.value.matchColumn &&
    advancedConfig.value.matchColumn !== "" &&
    advancedConfig.value.extractColumns &&
    advancedConfig.value.extractColumns.length > 0 &&
    (advancedConfig.value.noMatchAction === "default"
      ? advancedConfig.value.defaultValue !== ""
      : true)
  );
});

const canProcessBasic = computed(() => {
  if (!workbook.value) return false;

  return (
    config.value.sheetName &&
    config.value.targetSheetName &&
    config.value.sourceColumn &&
    config.value.targetColumn
  );
});

/**
 * 引号转换是否可处理
 * 检查工作簿、源列和分隔符配置是否完整
 */
const canProcessQuote = computed(() => {
  if (!workbook.value) return false;
  if (!quoteConfig.value.sourceColumn) return false;
  if (
    quoteConfig.value.delimiter === "custom" &&
    !quoteConfig.value.customDelimiter
  )
    return false;
  return true;
});

/**
 * 获取实际分隔符
 * 根据配置返回对应的分隔符字符
 * @returns {string} 分隔符字符
 */
const getQuoteDelimiter = () => {
  const delimiterMap = {
    comma: ",",
    semicolon: ";",
    space: " ",
    newline: "\n",
    custom: quoteConfig.value.customDelimiter,
  };
  return delimiterMap[quoteConfig.value.delimiter] || ",";
};

/**
 * 处理引号转换
 * 将源列数据按分隔符分割后添加引号并输出到目标列
 */
const handleQuoteProcess = async () => {
  if (!canProcessQuote.value) {
    message.warning("请先配置所有参数！");
    return;
  }

  quoteProcessing.value = true;
  quoteProgress.value = 0;
  quoteStatusText.value = "准备处理...";

  try {
    const sheetName = quoteConfig.value.sheetName || config.value.sheetName;
    const ws = workbook.value.Sheets[sheetName];
    if (!ws) {
      throw new Error("工作表不存在");
    }
    const sourceColIndex = columns.value.find(
      (c) => c.letter === quoteConfig.value.sourceColumn,
    )?.index;
    if (sourceColIndex === undefined) {
      throw new Error("无效的源列选择");
    }

    const range = XLSX.utils.decode_range(ws["!ref"]);
    const maxRow = range.e.r + 1;
    const delimiter = getQuoteDelimiter();
    const quoteChar = quoteConfig.value.quoteStyle === "double" ? '"' : "'";

    // 确定目标列
    let targetColIndex;
    if (quoteConfig.value.targetColumn) {
      targetColIndex = columns.value.find(
        (c) => c.letter === quoteConfig.value.targetColumn,
      )?.index;
    } else {
      // 新增列
      targetColIndex = range.e.c + 1;
      range.e.c = targetColIndex;
      ws["!ref"] = XLSX.utils.encode_range(range);
    }

    let processedCount = 0;
    const startRow = config.value.startRow || 2;

    for (let row = startRow - 1; row < maxRow; row++) {
      const sourceCellAddress =
        XLSX.utils.encode_col(sourceColIndex) + (row + 1);
      const cell = ws[sourceCellAddress];

      if (cell && cell.v !== undefined && cell.v !== "") {
        const value = String(cell.v);
        const items = value
          .split(delimiter)
          .map((item) => item.trim())
          .filter((item) => item !== "");
        const quotedItems = items.map(
          (item) => `${quoteChar}${item}${quoteChar}`,
        );
        const result = quotedItems.join(",");

        const targetCellAddress =
          XLSX.utils.encode_col(targetColIndex) + (row + 1);
        if (!ws[targetCellAddress]) {
          ws[targetCellAddress] = {};
        }
        ws[targetCellAddress].v = result;
        ws[targetCellAddress].t = "s";
        processedCount++;
      }

      quoteProgress.value = Math.round(
        ((row - startRow + 2) / (maxRow - startRow + 1)) * 100,
      );
      quoteStatusText.value = `处理中... ${row - startRow + 2}/${maxRow - startRow + 1}`;
    }

    // 更新列信息
    if (!quoteConfig.value.targetColumn) {
      const newColLetter = XLSX.utils.encode_col(targetColIndex);
      columns.value.push({
        letter: newColLetter,
        name: "引号转换结果",
        index: targetColIndex,
      });
    }

    // 生成输出文件
    outputBlob.value = generateOutputFile(workbook.value, sheetNames.value);

    result.value = {
      inputFile: fileList.value[0]?.name || "unknown",
      outputFile: `quote_converted_${fileList.value[0]?.name || "output.xlsx"}`,
      sourceSheetName: config.value.sheetName,
      targetSheetName: config.value.sheetName,
      sourceColumn: quoteConfig.value.sourceColumn,
      targetColumn:
        quoteConfig.value.targetColumn || XLSX.utils.encode_col(targetColIndex),
      processedCount,
      totalCellsProcessed: processedCount,
      quoteConverted: true,
    };

    quoteProgress.value = 100;
    quoteStatusText.value = `处理完成！共转换 ${processedCount} 个单元格`;
    message.success("引号转换完成！");

    // 刷新预览
    loadPreview();
  } catch (error) {
    console.error("引号转换失败:", error);
    message.error(`引号转换失败: ${error.message}`);
    quoteStatusText.value = "处理失败";
  } finally {
    quoteProcessing.value = false;
  }
};

const processingStatus = computed(() => {
  return processingProgress.value === 100
    ? "success"
    : processingProgress.value > 0
      ? "active"
      : "normal";
});

const progressColor = computed(() => {
  return processingProgress.value === 100
    ? "#52c41a"
    : processingProgress.value > 0
      ? "#1890ff"
      : "#d9d9d9";
});

const previewColumns = computed(() => {
  if (!previewWorksheet.value) return [];
  const ws = previewWorksheet.value;
  const range = XLSX.utils.decode_range(ws["!ref"]);
  const maxCol = range.e.c + 1;

  const cols = [];
  for (let i = 0; i < maxCol; i++) {
    const colLetter = XLSX.utils.encode_col(i);
    const cellAddress = colLetter + "1";
    const cell = ws[cellAddress];
    const colName = cell ? cell.v : `列${i + 1}`;

    cols.push({
      letter: colLetter,
      name: colName,
      index: i,
    });
  }

  return cols.map((col) => ({
    title: `${col.letter} (${col.name})`,
    dataIndex: col.letter,
    key: col.letter,
    width: 150,
  }));
});

/**
 * 处理文件上传
 * 读取 Excel 文件并初始化工作表和列信息
 * @param {File} file - 上传的文件对象
 * @returns {boolean} 是否继续上传
 */
const beforeUpload = async (file) => {
  const supportedFormats = getSetting("supportedFormats") || [
    "xlsx",
    "xls",
    "csv",
  ];
  const fileExt = file.name.split(".").pop().toLowerCase();
  const isExcel = supportedFormats.includes(fileExt) || fileExt === "xlsm";

  if (!isExcel) {
    message.error(
      `只能上传 ${supportedFormats.map((f) => `.${f}`).join("、")} 格式的文件！`,
    );
    return false;
  }

  const maxFileSizeMB = getSetting("maxFileSize") || 10;
  const maxSize = maxFileSizeMB * 1024 * 1024;
  if (file.size > maxSize) {
    message.error(
      `文件大小超过限制: ${(file.size / 1024 / 1024).toFixed(2)}MB > ${maxFileSizeMB}MB`,
    );
    return false;
  }

  uploadProgress.value = 0;
  uploadStatusText.value = "正在读取文件...";

  try {
    const reader = new FileReader();

    const readFilePromise = new Promise((resolve, reject) => {
      reader.onload = async (e) => {
        try {
          uploadProgress.value = 50;
          uploadStatusText.value = "正在解析文件...";

          await new Promise((resolve) => requestAnimationFrame(resolve));

          const data = new Uint8Array(e.target.result);
          const wb = XLSX.read(data, { type: "array" });

          await new Promise((resolve) => requestAnimationFrame(resolve));

          workbook.value = wb;
          sheetNames.value = wb.SheetNames;

          if (wb.SheetNames && wb.SheetNames.length > 0) {
            config.value.sheetName = wb.SheetNames[0];
            config.value.targetSheetName = wb.SheetNames[0];
            previewSheetName.value = wb.SheetNames[0];
            loadSheet(wb.SheetNames[0]);
            loadTargetSheet(wb.SheetNames[0]);
            loadSourceSheet(wb.SheetNames[0]);
            loadMatchSheet(wb.SheetNames[0]);

            advancedConfig.value.sourceSheetName = wb.SheetNames[0];
            advancedConfig.value.sourceColumnForSplit = "";
            advancedConfig.value.splitDelimiter = ",";
            advancedConfig.value.matchSheetName = wb.SheetNames[0];
            advancedConfig.value.matchColumn = "";
            advancedConfig.value.extractColumns = [];
            advancedConfig.value.joinDelimiter = ",";
            advancedConfig.value.resultColumn = "";
            advancedConfig.value.noMatchAction = "skip";
            advancedConfig.value.defaultValue = "";
          }

          uploadProgress.value = 100;
          uploadStatusText.value = "文件上传成功！";
          message.success("文件上传成功！");
          resolve();
        } catch (error) {
          console.error("文件解析失败:", error);
          message.error(`文件解析失败: ${error.message}`);
          uploadStatusText.value = "解析失败";
          reject(error);
        }
      };

      reader.onerror = (error) => {
        console.error("文件读取错误:", error);
        message.error(`文件读取失败: ${error.message || "未知错误"}`);
        uploadStatusText.value = "读取失败";
        reject(error);
      };

      reader.onabort = () => {
        message.error("文件读取被中断");
        uploadStatusText.value = "读取被中断";
        reject(new Error("文件读取被中断"));
      };

      reader.readAsArrayBuffer(file);
    });

    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(
        () => reject(new Error("文件上传超时，请检查文件格式或尝试重新上传")),
        30000,
      );
    });

    await Promise.race([readFilePromise, timeoutPromise]);
  } catch (error) {
    console.error("文件上传失败:", error);
    if (error.message.includes("超时")) {
      message.error(
        "文件上传超时，可能是文件过大或格式异常，请尝试重新上传或使用较小的文件",
      );
    } else {
      message.error(`文件上传失败: ${error.message}`);
    }
    uploadStatusText.value = "上传失败";
    return false;
  }

  fileList.value = [file];

  setTimeout(() => {
    uploadProgress.value = 0;
    uploadStatusText.value = "";
  }, 3000);

  return false;
};

/**
 * 处理文件移除
 * 重置所有状态和数据
 */
const handleRemove = () => {
  workbook.value = null;
  worksheet.value = null;
  targetWorksheet.value = null;
  previewWorksheet.value = null;
  sheetNames.value = [];
  columns.value = [];
  targetColumns.value = [];
  previewData.value = [];
  result.value = null;
  outputBlob.value = null;
  fileList.value = [];
  processingProgress.value = 0;
  processingStatusText.value = "";
  uploadProgress.value = 0;
  uploadStatusText.value = "";
  config.value = {
    sheetName: "",
    targetSheetName: "",
    sourceColumn: "",
    targetColumn: "",
    startRow: 2,
    keepMergedFormat: true,
  };
  advancedConfig.value = {
    enabled: false,
    sourceColumnForSplit: "",
    splitDelimiter: ",",
    matchColumn: "",
    extractColumns: [],
    joinDelimiter: ",",
    resultColumn: "",
    noMatchAction: "skip",
    defaultValue: "",
  };
  quoteProgress.value = 0;
  quoteStatusText.value = "";
  quoteConfig.value = {
    sourceColumn: "",
    delimiter: "comma",
    customDelimiter: "",
    quoteStyle: "double",
    targetColumn: "",
  };
};

/**
 * 加载源工作表
 * 读取工作表并提取列信息
 * @param {string} sheetName - 工作表名称
 */
const loadSheet = (sheetName) => {
  const ws = workbook.value.Sheets[sheetName];
  worksheet.value = ws;
  previewWorksheet.value = ws;

  const range = XLSX.utils.decode_range(ws["!ref"]);
  const maxCol = range.e.c + 1;

  columns.value = [];
  for (let i = 0; i < maxCol; i++) {
    const colLetter = XLSX.utils.encode_col(i);
    const cellAddress = colLetter + "1";
    const cell = ws[cellAddress];
    const colName = cell ? cell.v : `列${i + 1}`;

    columns.value.push({
      letter: colLetter,
      name: colName,
      index: i,
    });
  }

  loadPreview();
};

/**
 * 加载目标工作表
 * 读取目标工作表并提取列信息
 * @param {string} sheetName - 工作表名称
 */
const loadTargetSheet = (sheetName) => {
  const ws = workbook.value.Sheets[sheetName];
  targetWorksheet.value = ws;

  const range = XLSX.utils.decode_range(ws["!ref"]);
  const maxCol = range.e.c + 1;

  targetColumns.value = [];
  for (let i = 0; i < maxCol; i++) {
    const colLetter = XLSX.utils.encode_col(i);
    const cellAddress = colLetter + "1";
    const cell = ws[cellAddress];
    const colName = cell ? cell.v : `列${i + 1}`;

    targetColumns.value.push({
      letter: colLetter,
      name: colName,
      index: i,
    });
  }
};

/**
 * 加载源数据工作表
 * 读取源数据工作表并提取列信息
 * @param {string} sheetName - 工作表名称
 */
const loadSourceSheet = (sheetName) => {
  const ws = workbook.value.Sheets[sheetName];
  sourceWorksheet.value = ws;

  const range = XLSX.utils.decode_range(ws["!ref"]);
  const maxCol = range.e.c + 1;

  sourceColumns.value = [];
  for (let i = 0; i < maxCol; i++) {
    const colLetter = XLSX.utils.encode_col(i);
    const cellAddress = colLetter + "1";
    const cell = ws[cellAddress];
    const colName = cell ? cell.v : `列${i + 1}`;

    sourceColumns.value.push({
      letter: colLetter,
      name: colName,
      index: i,
    });
  }
};

/**
 * 加载匹配工作表
 * 读取匹配工作表并提取列信息
 * @param {string} sheetName - 工作表名称
 */
const loadMatchSheet = (sheetName) => {
  const ws = workbook.value.Sheets[sheetName];
  matchWorksheet.value = ws;

  const range = XLSX.utils.decode_range(ws["!ref"]);
  const maxCol = range.e.c + 1;

  matchColumns.value = [];
  for (let i = 0; i < maxCol; i++) {
    const colLetter = XLSX.utils.encode_col(i);
    const cellAddress = colLetter + "1";
    const cell = ws[cellAddress];
    const colName = cell ? cell.v : `列${i + 1}`;

    matchColumns.value.push({
      letter: colLetter,
      name: colName,
      index: i,
    });
  }
};

/**
 * 处理源工作表变更
 * @param {string} sheetName - 新的工作表名称
 */
const handleSheetChange = (sheetName) => {
  loadSheet(sheetName);

  // 验证之前选择的列是否在新工作表中仍然有效
  if (config.value.sourceColumn) {
    const columnExists = columns.value.some(
      (c) => c.letter === config.value.sourceColumn,
    );
    if (!columnExists) {
      config.value.sourceColumn = "";
    }
  }

  // 验证高级配置中的源数据列是否在新工作表中仍然有效
  if (advancedConfig.value.sourceColumnForSplit) {
    const columnExists = columns.value.some(
      (c) => c.letter === advancedConfig.value.sourceColumnForSplit,
    );
    if (!columnExists) {
      advancedConfig.value.sourceColumnForSplit = "";
    }
  }

  // 验证高级配置中的结果填充列是否在新工作表中仍然有效
  if (advancedConfig.value.resultColumn) {
    const columnExists = columns.value.some(
      (c) => c.letter === advancedConfig.value.resultColumn,
    );
    if (!columnExists) {
      advancedConfig.value.resultColumn = "";
    }
  }
};

/**
 * 处理目标工作表变更
 * @param {string} sheetName - 新的工作表名称
 */
const handleTargetSheetChange = (sheetName) => {
  loadTargetSheet(sheetName);

  // 验证之前选择的目标列是否在新工作表中仍然有效
  if (config.value.targetColumn) {
    const columnExists = targetColumns.value.some(
      (c) => c.letter === config.value.targetColumn,
    );
    if (!columnExists) {
      config.value.targetColumn = "";
    }
  }

  // 验证高级配置中的查询匹配列是否在新工作表中仍然有效
  if (advancedConfig.value.matchColumn) {
    const columnExists = targetColumns.value.some(
      (c) => c.letter === advancedConfig.value.matchColumn,
    );
    if (!columnExists) {
      advancedConfig.value.matchColumn = "";
    }
  }

  // 验证高级配置中的提取列是否在新工作表中仍然有效
  if (
    advancedConfig.value.extractColumns &&
    advancedConfig.value.extractColumns.length > 0
  ) {
    const validColumns = advancedConfig.value.extractColumns.filter((col) =>
      targetColumns.value.some((c) => c.letter === col),
    );
    if (validColumns.length !== advancedConfig.value.extractColumns.length) {
      advancedConfig.value.extractColumns = validColumns;
    }
  }
};

/**
 * 处理预览工作表变更
 * @param {string} sheetName - 新的工作表名称
 */
const handlePreviewSheetChange = (sheetName) => {
  if (sheetName) {
    previewWorksheet.value = workbook.value.Sheets[sheetName];
    loadPreview();
  }
};

/**
 * 处理源列变更
 * @param {string} value - 选中的列值
 */
const handleSourceColumnChange = () => {
  // 源列变更处理
};

/**
 * 处理目标列变更
 * @param {string} value - 选中的列值
 */
const handleTargetColumnChange = () => {
  // 目标列变更处理
};

/**
 * 处理源数据列变更
 * @param {string} value - 选中的列值
 */
const handleSourceColumnForSplitChange = () => {
  // 源数据列变更处理
};

/**
 * 处理源数据工作表变更
 * @param {string} sheetName - 新的工作表名称
 */
const handleSourceSheetChange = (sheetName) => {
  loadSourceSheet(sheetName);

  if (advancedConfig.value.sourceColumnForSplit) {
    const columnExists = sourceColumns.value.some(
      (c) => c.letter === advancedConfig.value.sourceColumnForSplit,
    );
    if (!columnExists) {
      advancedConfig.value.sourceColumnForSplit = "";
    }
  }

  if (advancedConfig.value.resultColumn) {
    const columnExists = sourceColumns.value.some(
      (c) => c.letter === advancedConfig.value.resultColumn,
    );
    if (!columnExists) {
      advancedConfig.value.resultColumn = "";
    }
  }
};

/**
 * 处理匹配工作表变更
 * @param {string} sheetName - 新的工作表名称
 */
const handleMatchSheetChange = (sheetName) => {
  loadMatchSheet(sheetName);

  if (advancedConfig.value.matchColumn) {
    const columnExists = matchColumns.value.some(
      (c) => c.letter === advancedConfig.value.matchColumn,
    );
    if (!columnExists) {
      advancedConfig.value.matchColumn = "";
    }
  }

  if (
    advancedConfig.value.extractColumns &&
    advancedConfig.value.extractColumns.length > 0
  ) {
    const validColumns = advancedConfig.value.extractColumns.filter((col) =>
      matchColumns.value.some((c) => c.letter === col),
    );
    if (validColumns.length !== advancedConfig.value.extractColumns.length) {
      advancedConfig.value.extractColumns = validColumns;
    }
  }
};

/**
 * 处理查询匹配列变更
 * @param {string} value - 选中的列值
 */
const handleMatchColumnChange = () => {
  // 查询匹配列变更处理
};

/**
 * 处理提取列变更
 * @param {Array} value - 选中的列值数组
 */
const handleExtractColumnsChange = () => {
  // 提取列变更处理
};

/**
 * 处理引号转换工作表变更
 * @param {string} sheetName - 新的工作表名称
 */
const handleQuoteSheetChange = (sheetName) => {
  const ws = workbook.value.Sheets[sheetName];
  const range = XLSX.utils.decode_range(ws["!ref"]);
  const maxCol = range.e.c + 1;

  const newColumns = [];
  for (let i = 0; i < maxCol; i++) {
    const colLetter = XLSX.utils.encode_col(i);
    const cellAddress = colLetter + "1";
    const cell = ws[cellAddress];
    const colName = cell ? cell.v : `列${i + 1}`;

    newColumns.push({
      letter: colLetter,
      name: colName,
      index: i,
    });
  }
  columns.value = newColumns;
  quoteConfig.value.sourceColumn = "";
  quoteConfig.value.targetColumn = "";
};

/**
 * 处理分割符类型变更
 * @param {string} type - 分割符类型
 */
const handleSplitDelimiterTypeChange = (type) => {
  const option = splitDelimiterOptions.find((opt) => opt.value === type);
  if (option) {
    if (type === "custom") {
      advancedConfig.value.splitDelimiter =
        advancedConfig.value.customSplitDelimiter;
    } else {
      advancedConfig.value.splitDelimiter = option.delimiter;
    }
  }
};

/**
 * 加载预览数据
 * 从工作表中提取前20行数据用于预览
 */
const loadPreview = () => {
  if (!previewWorksheet.value) return;

  const ws = previewWorksheet.value;
  const range = XLSX.utils.decode_range(ws["!ref"]);
  const maxRow = Math.min(range.e.r + 1, 20);
  const maxCol = range.e.c + 1;

  previewData.value = [];
  for (let row = 0; row < maxRow; row++) {
    const rowData = {};
    for (let col = 0; col < maxCol; col++) {
      const colLetter = XLSX.utils.encode_col(col);
      const cellAddress = colLetter + (row + 1);
      const cell = ws[cellAddress];
      rowData[colLetter] = cell ? cell.v : "";
    }
    previewData.value.push(rowData);
  }
};

/**
 * 过滤选项
 * 用于下拉搜索的过滤函数
 * 支持匹配列字母和列名（包括中文列名）
 * @param {string} input - 用户输入
 * @param {Object} option - 选项对象
 * @returns {boolean} 是否匹配
 */
const filterOption = (input, option) => {
  const inputLower = input.toLowerCase();
  const optionValue = (option.value || "").toLowerCase();
  const optionLabel = (option.label || "").toLowerCase();
  return optionValue.includes(inputLower) || optionLabel.includes(inputLower);
};

/**
 * 获取单元格类型
 * 根据值类型返回对应的单元格类型标识
 * @param {*} value - 单元格值
 * @returns {string} 单元格类型
 */
const getCellType = (value) => {
  if (typeof value === "number") return "n";
  if (typeof value === "boolean") return "b";
  return "s";
};

/**
 * 分割数据
 * 根据分割符将字符串分割为数组
 * @param {string} value - 待分割的字符串
 * @param {string} delimiter - 分割符
 * @returns {Array} 分割后的数组
 */
const splitData = (value, delimiter) => {
  if (!value || value === "") return [];
  if (!delimiter || delimiter === "") return [value];

  const strValue = String(value);

  if (delimiter === "\n") {
    return strValue
      .split(/\r?\n|\r/)
      .map((item) => item.trim())
      .filter((item) => item !== "");
  }

  return strValue
    .split(delimiter)
    .map((item) => item.trim())
    .filter((item) => item !== "");
};

/**
 * 查询匹配数据
 * 在指定工作表的指定列中查找匹配的行
 * @param {string} value - 待匹配的值
 * @param {string} matchColumn - 匹配列
 * @param {Object} worksheet - 工作表对象
 * @param {Array} columns - 列信息数组
 * @returns {Object|null} 匹配的行数据或null
 */
const findMatchedRow = (value, matchColumn, worksheet, columns) => {
  if (!matchColumn || !worksheet) return null;

  const ws = worksheet;
  const range = XLSX.utils.decode_range(ws["!ref"]);
  const maxRow = range.e.r + 1;
  const maxCol = range.e.c + 1;

  const matchColIndex = columns.find((c) => c.letter === matchColumn)?.index;
  if (matchColIndex === undefined) return null;

  for (let row = 0; row < maxRow; row++) {
    const colLetter = XLSX.utils.encode_col(matchColIndex);
    const cellAddress = colLetter + (row + 1);
    const cell = ws[cellAddress];

    if (cell && String(cell.v).trim() === String(value).trim()) {
      const rowData = {};
      for (let col = 0; col < maxCol; col++) {
        const colLetter = XLSX.utils.encode_col(col);
        const cellAddress = colLetter + (row + 1);
        const cell = ws[cellAddress];
        rowData[colLetter] = cell ? cell.v : "";
      }
      return rowData;
    }
  }

  return null;
};

/**
 * 提取数据
 * 从行数据中提取指定列的值
 * @param {Object} rowData - 行数据对象
 * @param {Array} extractColumns - 提取列数组
 * @returns {Array} 提取的值数组
 */
const extractData = (rowData, extractColumns) => {
  if (!extractColumns || extractColumns.length === 0) return [];
  return extractColumns.map((col) => rowData[col] || "");
};

/**
 * 拼接数据
 * 使用拼接符将数组拼接为字符串
 * @param {Array} data - 待拼接的数据数组
 * @param {string} delimiter - 拼接符
 * @returns {string} 拼接后的字符串
 */
const joinData = (data, delimiter) => {
  if (!data || data.length === 0) return "";
  if (!delimiter || delimiter === "") return data.join("");
  return data.join(delimiter);
};

/**
 * 读取源数据
 * 从工作表的指定列读取数据
 * @param {Object} worksheet - 工作表对象
 * @param {number} colNum - 列号（从1开始）
 * @param {number} startRow - 起始行（从1开始）
 * @returns {Array} 包含 {value, type, row} 的数组
 */
const readSourceData = (worksheet, colNum, startRow) => {
  const range = XLSX.utils.decode_range(worksheet["!ref"]);
  const maxRow = range.e.r + 1;

  const sourceData = [];
  for (let row = startRow - 1; row < maxRow; row++) {
    const colLetter = XLSX.utils.encode_col(colNum - 1);
    const cellAddress = colLetter + (row + 1);
    const cell = worksheet[cellAddress];
    if (cell && cell.v !== undefined && cell.v !== "") {
      sourceData.push({
        value: cell.v,
        type: cell.t || getCellType(cell.v),
        row: row + 1,
      });
    }
  }
  return sourceData;
};

/**
 * 写入单元格
 * 在工作表的指定位置写入值和类型
 * @param {Object} worksheet - 工作表对象
 * @param {number} colNum - 列号（从1开始）
 * @param {number} row - 行号（从1开始）
 * @param {*} value - 要写入的值
 * @param {string} type - 单元格类型
 */
const writeCell = (worksheet, colNum, row, value, type) => {
  const colLetter = XLSX.utils.encode_col(colNum - 1);
  const cellAddress = colLetter + row;
  if (!worksheet[cellAddress]) {
    worksheet[cellAddress] = {};
  }
  worksheet[cellAddress].v = value;
  worksheet[cellAddress].t = type;
};

/**
 * 生成输出文件
 * 创建新的工作簿并生成 Excel 文件
 * @param {Object} workbook - 原始工作簿对象
 * @param {Array} sheetNames - 工作表名称数组
 * @returns {Blob} Excel 文件的 Blob 对象
 */
const generateOutputFile = (workbook, sheetNames) => {
  const newWb = XLSX.utils.book_new();
  for (const sheetName of sheetNames) {
    XLSX.utils.book_append_sheet(newWb, workbook.Sheets[sheetName], sheetName);
  }

  const excelBuffer = XLSX.write(newWb, { bookType: "xlsx", type: "array" });
  return new Blob([excelBuffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
};

/**
 * 更新进度
 * 更新处理进度和状态文本
 * @param {number} current - 当前处理的索引
 * @param {number} total - 总数
 * @param {string} statusText - 状态文本
 * @param {Ref} progressRef - 进度引用
 * @param {Ref} statusTextRef - 状态文本引用
 */
const updateProgress = (
  current,
  total,
  statusText,
  progressRef,
  statusTextRef,
) => {
  progressRef.value = Math.round(((current + 1) / total) * 100);
  statusTextRef.value = `${statusText} ${current + 1}/${total}...`;
};

/**
 * 处理基础数据填充
 * 将源数据填充到目标列，支持合并单元格处理
 * @param {Array} sourceData - 源数据数组
 * @param {Object} targetWs - 目标工作表对象
 * @param {number} targetColNum - 目标列号（从1开始）
 * @param {Ref} progressRef - 进度引用
 * @param {Ref} statusTextRef - 状态文本引用
 * @returns {Object} 包含 dataFilledCount 和 skippedCount 的对象
 */
const handleBasicProcess = (
  sourceData,
  targetWs,
  targetColNum,
  progressRef,
  statusTextRef,
) => {
  let dataFilledCount = 0;
  let skippedCount = 0;

  const merges = targetWs["!merges"] || [];
  const targetMergedCells = [];
  const targetMergedRows = new Set();

  for (const merge of merges) {
    if (merge.s.c === targetColNum - 1 && merge.e.c === targetColNum - 1) {
      if (merge.e.r >= config.value.startRow - 1) {
        targetMergedCells.push({
          startRow: merge.s.r + 1,
          endRow: merge.e.r + 1,
          range: merge,
        });
        for (let row = merge.s.r; row <= merge.e.r; row++) {
          targetMergedRows.add(row);
        }
      }
    }
  }

  const targetRange = XLSX.utils.decode_range(targetWs["!ref"]);
  const maxTargetRow = targetRange.e.r + 1;

  const allTargetCells = [];

  targetMergedCells.sort((a, b) => a.startRow - b.startRow);
  for (const mergedCell of targetMergedCells) {
    allTargetCells.push({
      type: "merged",
      startRow: mergedCell.startRow,
      endRow: mergedCell.endRow,
      range: mergedCell.range,
    });
  }

  for (let row = config.value.startRow - 1; row < maxTargetRow; row++) {
    if (!targetMergedRows.has(row)) {
      allTargetCells.push({
        type: "normal",
        row: row + 1,
      });
    }
  }

  allTargetCells.sort((a, b) => {
    const rowA = a.type === "merged" ? a.startRow : a.row;
    const rowB = b.type === "merged" ? b.startRow : b.row;
    return rowA - rowB;
  });

  for (let i = 0; i < allTargetCells.length; i++) {
    if (i < sourceData.length) {
      updateProgress(
        i,
        sourceData.length,
        "处理第",
        progressRef,
        statusTextRef,
      );
      const { value, type: cellType } = sourceData[i];
      const cellInfo = allTargetCells[i];

      if (cellInfo.type === "merged") {
        if (config.value.keepMergedFormat) {
          for (let row = cellInfo.startRow - 1; row < cellInfo.endRow; row++) {
            writeCell(targetWs, targetColNum, row + 1, value, cellType);
          }
        } else {
          writeCell(targetWs, targetColNum, cellInfo.startRow, value, cellType);
        }
      } else {
        writeCell(targetWs, targetColNum, cellInfo.row, value, cellType);
      }

      dataFilledCount++;
    } else {
      skippedCount++;
    }
  }

  return { dataFilledCount, skippedCount };
};

/**
 * 处理高级数据处理
 * 对源数据进行分割、匹配、提取和拼接操作
 * @param {Array} sourceData - 源数据数组
 * @param {Object} sourceWs - 源工作表对象
 * @param {number} sourceColNum - 源列号（从1开始）
 * @param {Ref} progressRef - 进度引用
 * @param {Ref} statusTextRef - 状态文本引用
 * @returns {Object} 包含各种统计数据的对象
 */
const handleAdvancedProcess = (
  sourceData,
  sourceWs,
  sourceColNum,
  progressRef,
  statusTextRef,
) => {
  let dataFilledCount = 0;
  let skippedCount = 0;
  let splitDataCount = 0;
  let matchedCount = 0;
  let unmatchedCount = 0;
  let extractedCount = 0;

  const matchWs = matchWorksheet.value;
  const matchCols = matchColumns.value;

  for (let i = 0; i < sourceData.length; i++) {
    const { value, row } = sourceData[i];

    updateProgress(i, sourceData.length, "处理第", progressRef, statusTextRef);

    const splitItems = splitData(value, advancedConfig.value.splitDelimiter);
    splitDataCount += splitItems.length;

    const extractedValues = [];

    for (const item of splitItems) {
      const matchedRow = findMatchedRow(
        item,
        advancedConfig.value.matchColumn,
        matchWs,
        matchCols,
      );

      if (matchedRow) {
        matchedCount++;
        const extracted = extractData(
          matchedRow,
          advancedConfig.value.extractColumns,
        );
        extractedValues.push(...extracted);
        extractedCount += extracted.length;
      } else {
        unmatchedCount++;

        if (advancedConfig.value.noMatchAction === "default") {
          extractedValues.push(advancedConfig.value.defaultValue);
        } else {
          continue;
        }
      }
    }

    const joinedValue = joinData(
      extractedValues,
      advancedConfig.value.joinDelimiter,
    );
    const resultColNum = advancedConfig.value.resultColumn
      ? sourceColumns.value.find(
          (c) => c.letter === advancedConfig.value.resultColumn,
        )?.index + 1
      : sourceColNum;

    if (resultColNum) {
      writeCell(sourceWs, resultColNum, row, joinedValue, "s");
      dataFilledCount++;
    } else {
      skippedCount++;
    }
  }

  return {
    dataFilledCount,
    skippedCount,
    splitDataCount,
    matchedCount,
    unmatchedCount,
    extractedCount,
  };
};

/**
 * 处理基础数据填充（主函数）
 * 验证基础配置并执行基础数据填充
 * @returns {Object} 包含处理结果和统计数据的对象
 */
const handleBasicProcessMain = async () => {
  if (!canProcessBasic.value) {
    message.warning("请先配置所有参数！");
    return null;
  }

  const sourceWs = worksheet.value;
  const targetWs = targetWorksheet.value;

  const sourceColNum =
    columns.value.find((c) => c.letter === config.value.sourceColumn)?.index +
    1;
  const targetColNum =
    targetColumns.value.find((c) => c.letter === config.value.targetColumn)
      ?.index + 1;

  if (!sourceColNum) {
    throw new Error(
      `无效的源列选择：${config.value.sourceColumn}。请确保在工作表"${config.value.sheetName}"中选择有效的列。`,
    );
  }

  if (!targetColNum) {
    throw new Error(
      `无效的目标列选择：${config.value.targetColumn}。请确保在工作表"${config.value.targetSheetName}"中选择有效的列。`,
    );
  }

  const sourceData = readSourceData(
    sourceWs,
    sourceColNum,
    config.value.startRow,
  );
  processingStatusText.value = "执行基础数据填充...";

  const processResult = handleBasicProcess(
    sourceData,
    targetWs,
    targetColNum,
    processingProgress,
    processingStatusText,
  );

  return {
    ...processResult,
    sourceColumn: config.value.sourceColumn,
    sourceColumnForSplit: "",
    sourceColumnNum: sourceColNum,
    targetColumn: config.value.targetColumn,
    targetColumnNum: targetColNum,
    startRow: config.value.startRow,
    keepMergedFormat: config.value.keepMergedFormat,
    advancedEnabled: false,
    splitDelimiter: "",
    matchColumn: "",
    extractColumns: [],
    joinDelimiter: "",
    resultColumn: "",
    noMatchAction: "skip",
    defaultValue: "",
    sourceDataCount: sourceData.length,
    splitDataCount: 0,
    matchedCount: 0,
    unmatchedCount: 0,
    extractedCount: 0,
    totalCellsProcessed: sourceData.length,
    mergedCellsProcessed: (targetWs["!merges"] || []).length,
    normalCellsProcessed: sourceData.length,
  };
};

/**
 * 处理高级数据处理（主函数）
 * 验证高级配置并执行高级数据处理
 * @returns {Object} 包含处理结果和统计数据的对象
 */
const handleAdvancedProcessMain = async () => {
  if (!canProcessAdvanced.value) {
    message.warning("请先配置所有参数！");
    return null;
  }

  const sourceWs = sourceWorksheet.value;

  const sourceColNum =
    sourceColumns.value.find(
      (c) => c.letter === advancedConfig.value.sourceColumnForSplit,
    )?.index + 1;

  if (!sourceColNum) {
    throw new Error(
      `无效的源列选择：${advancedConfig.value.sourceColumnForSplit}。请确保在工作表"${advancedConfig.value.sourceSheetName}"中选择有效的列。`,
    );
  }

  const sourceData = readSourceData(
    sourceWs,
    sourceColNum,
    config.value.startRow,
  );
  processingStatusText.value = "执行高级数据处理...";

  const processResult = handleAdvancedProcess(
    sourceData,
    sourceWs,
    sourceColNum,
    processingProgress,
    processingStatusText,
  );

  return {
    ...processResult,
    sourceColumn: "",
    sourceColumnForSplit: advancedConfig.value.sourceColumnForSplit,
    sourceSheetNameForSplit: advancedConfig.value.sourceSheetName,
    matchSheetName: advancedConfig.value.matchSheetName,
    sourceColumnNum: sourceColNum,
    targetColumn: "",
    targetColumnNum: 0,
    startRow: config.value.startRow,
    keepMergedFormat: false,
    advancedEnabled: true,
    splitDelimiter: advancedConfig.value.splitDelimiter,
    matchColumn: advancedConfig.value.matchColumn,
    extractColumns: advancedConfig.value.extractColumns,
    joinDelimiter: advancedConfig.value.joinDelimiter,
    resultColumn: advancedConfig.value.resultColumn,
    noMatchAction: advancedConfig.value.noMatchAction,
    defaultValue: advancedConfig.value.defaultValue,
    sourceDataCount: sourceData.length,
    totalCellsProcessed: sourceData.length,
    mergedCellsProcessed: 0,
    normalCellsProcessed: sourceData.length,
  };
};

/**
 * 处理数据
 * 主处理函数，执行基础填充或高级数据处理
 */
const handleProcess = async () => {
  const shouldUseAdvanced = activeTabKey.value === "advanced";
  const shouldUseQuote = activeTabKey.value === "quote";

  processing.value = true;
  processingProgress.value = 0;
  processingStatusText.value = "准备处理...";

  try {
    let processResult;

    if (shouldUseQuote) {
      await handleQuoteProcess();
      return;
    }

    if (shouldUseAdvanced) {
      processResult = await handleAdvancedProcessMain();
    } else {
      processResult = await handleBasicProcessMain();
    }

    if (!processResult) {
      return;
    }

    outputBlob.value = generateOutputFile(workbook.value, sheetNames.value);

    result.value = {
      inputFile: fileList.value[0]?.name || "unknown",
      outputFile: `filled_${fileList.value[0]?.name || "output.xlsx"}`,
      sourceSheetName: config.value.sheetName,
      targetSheetName: config.value.targetSheetName,
      ...processResult,
    };

    processingProgress.value = 100;
    processingStatusText.value = "处理完成！";
    message.success("处理完成！");
  } catch (error) {
    console.error("处理失败:", error);
    message.error(`处理失败: ${error.message}`);
    processingStatusText.value = "处理失败";
  } finally {
    processing.value = false;

    if (result.value) {
      previewWorksheet.value =
        workbook.value.Sheets[result.value.sourceSheetName];
      previewSheetName.value = result.value.sourceSheetName;
      loadPreview();
    }
  }
};

/**
 * 下载结果文件
 * 触发浏览器下载处理后的 Excel 文件
 */
const handleDownload = () => {
  if (!outputBlob.value) {
    message.warning("请先处理数据！");
    return;
  }

  const url = URL.createObjectURL(outputBlob.value);
  const link = document.createElement("a");
  link.href = url;
  link.download = result.value?.outputFile || "output.xlsx";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  message.success("文件下载成功！");
};

/**
 * 重置所有状态
 * 清除所有数据和配置，恢复初始状态
 */
const handleReset = () => {
  workbook.value = null;
  worksheet.value = null;
  targetWorksheet.value = null;
  previewWorksheet.value = null;
  previewSheetName.value = "";
  sheetNames.value = [];
  columns.value = [];
  targetColumns.value = [];
  sourceColumns.value = [];
  sourceWorksheet.value = null;
  previewData.value = [];
  result.value = null;
  outputBlob.value = null;
  fileList.value = [];
  processingProgress.value = 0;
  processingStatusText.value = "";
  uploadProgress.value = 0;
  uploadStatusText.value = "";
  config.value = {
    sheetName: "",
    targetSheetName: "",
    sourceColumn: "",
    targetColumn: "",
    startRow: 2,
    keepMergedFormat: true,
  };
  advancedConfig.value = {
    enabled: false,
    sourceSheetName: "",
    sourceColumnForSplit: "",
    splitDelimiter: ",",
    splitDelimiterType: "comma",
    customSplitDelimiter: "",
    matchSheetName: "",
    matchColumn: "",
    extractColumns: [],
    joinDelimiter: ",",
    resultColumn: "",
    noMatchAction: "skip",
    defaultValue: "",
  };

  // 重置引号转换状态
  quoteProgress.value = 0;
  quoteStatusText.value = "";
  quoteConfig.value = {
    sourceColumn: "",
    delimiter: "comma",
    customDelimiter: "",
    quoteStyle: "double",
    targetColumn: "",
  };

  message.info("已重置，可以重新处理");
};
</script>

<style scoped lang="scss">
// ========================================
// Excel 数据填充工具页面样式
// ========================================

.excel-fill-page {
  min-height: 100vh;
  background: $bg-base;
  padding: 40px 20px;
}

.page-header {
  text-align: center;
  margin-bottom: 60px;
}

.page-title {
  font-size: 48px;
  font-weight: 700;
  color: $color-primary;
  margin-bottom: 16px;
  line-height: 1.2;
}

.page-subtitle {
  font-size: 20px;
  color: $text-secondary;
  margin-bottom: 0;
  line-height: 1.6;
}

.content-container {
  @include flex-column;

  max-width: 1200px;
  margin: 0 auto;
  gap: 32px;
}

// 卡片统一样式
.upload-card,
.preview-card,
.result-card {
  padding: 32px;
}

.config-tabs {
  margin-bottom: 32px;

  :deep(.ant-tabs-nav) {
    margin-bottom: 24px;
  }

  :deep(.ant-tabs-tab) {
    padding: 12px 24px;
    font-size: 15px;
    font-weight: 500;
    transition: all 0.2s ease;

    &:hover {
      color: $color-primary;
    }
  }

  :deep(.ant-tabs-tab-active) {
    background: rgba(22, 119, 255, 0.08);
    border-radius: 8px 8px 0 0;
  }

  :deep(.ant-tabs-ink-bar) {
    height: 3px;
    background: $color-primary;
    border-radius: 2px;
  }
}

.action-buttons {
  display: flex;
  gap: 16px;
  justify-content: center;
  margin: 32px 0;
}

.hint-text {
  font-size: 12px;
  color: $text-secondary;
}

.upload-progress-container {
  margin-top: 16px;
  padding: 16px;
  background: $bg-elevated;
  border-radius: $border-radius-sm;
}

.upload-status-text {
  margin-top: 8px;
  font-size: 14px;
  color: $text-secondary;
  text-align: center;
}

.result-actions {
  display: flex;
  gap: 16px;
  margin-top: 24px;
  justify-content: center;
}

// 响应式布局
@include respond-to(lg) {
  .page-title {
    font-size: 36px;
  }

  .page-subtitle {
    font-size: 18px;
  }

  .upload-card,
  .preview-card,
  .result-card {
    padding: 24px;
  }
}

@include respond-to(md) {
  .page-title {
    font-size: 28px;
  }

  .page-subtitle {
    font-size: 16px;
  }

  .action-buttons {
    flex-direction: column;
  }

  .result-actions {
    flex-direction: column;
  }

  .config-tabs {
    :deep(.ant-tabs-nav) {
      .ant-tabs-nav-wrap {
        overflow-x: auto;
        -webkit-overflow-scrolling: touch;
      }
    }

    :deep(.ant-tabs-tab) {
      padding: 10px 16px;
      font-size: 14px;
      white-space: nowrap;
    }
  }
}

@include respond-to(sm) {
  .excel-fill-page {
    padding: 20px 15px;
  }

  .page-title {
    font-size: 24px;
  }

  .page-subtitle {
    font-size: 14px;
  }
}
</style>
