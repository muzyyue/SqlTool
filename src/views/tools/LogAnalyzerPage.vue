<template>
  <div class="log-analyzer-page">
    <div class="page-stack">
      <!-- 页头卡片 -->
      <VbenGlassCard :hoverable="false" class="header-card">
        <div class="page-header">
          <div>
            <h1 class="page-title">日志错误分析</h1>
            <p class="page-subtitle">
              提取错误级别日志（含多行 Stack Trace），并统计错误类型分布
            </p>
          </div>
          <div class="header-actions">
            <GradientButton type="secondary" size="md" @click="clearAll">
              清空
            </GradientButton>
            <GradientButton
              type="primary"
              size="md"
              :loading="analyzing"
              @click="handleAnalyze"
            >
              分析
            </GradientButton>
          </div>
        </div>
      </VbenGlassCard>

      <!-- 输入区 -->
      <div class="content-layout">
        <VbenGlassCard
          :hoverable="false"
          title="日志输入"
          description="直接粘贴日志内容，或拖拽 / 选择日志文件（.log / .txt）"
        >
          <a-upload-dragger
            :show-upload-list="false"
            :before-upload="handleFileRead"
            accept=".log,.txt,.out,text/plain"
            :max-count="1"
          >
            <p class="ant-upload-drag-icon">
              <InboxOutlined />
            </p>
            <p class="ant-upload-text">点击或拖拽日志文件到此区域</p>
            <p class="ant-upload-hint">
              在浏览器本地解析，文件不会上传到任何服务器（限制
              {{ maxFileSizeMb }} MB，可在「系统设置 → 文件设置」调整）
            </p>
          </a-upload-dragger>

          <a-textarea
            v-model:value="inputText"
            class="log-textarea"
            :auto-size="{ minRows: 8, maxRows: 16 }"
            placeholder="2026-09-28T10:54:06.369+08:00 [ERRO] {a1b2c3} connection refused: dial tcp 10.0.0.1:3306"
            spellcheck="false"
          />
          <div class="input-meta">
            <span>{{ inputSizeText }}</span>
            <span v-if="fileName">来源文件：{{ fileName }}</span>
          </div>
        </VbenGlassCard>

        <VbenGlassCard
          :hoverable="false"
          title="提取选项"
          description="对应命令行的可选参数"
        >
          <div class="options-grid">
            <div class="option-row">
              <label>包含 WARN 级别</label>
              <a-switch v-model:checked="options.includeWarn" />
            </div>

            <div class="option-row option-col">
              <label>指定日志级别（留空则提取全部错误级别）</label>
              <a-select
                v-model:value="options.levels"
                mode="multiple"
                allow-clear
                placeholder="ERRO / FATAL / PANIC ..."
                :options="levelOptions"
                style="width: 100%"
              />
            </div>

            <div class="option-row option-col">
              <label>关键词过滤（在错误结果中再筛）</label>
              <a-input
                v-model:value="options.grep"
                allow-clear
                placeholder="例如：timeout、404、download"
              />
            </div>

            <div class="option-row">
              <label>只看最后 N 条（0 为全部）</label>
              <a-input-number
                v-model:value="options.tail"
                :min="0"
                :max="100000"
                style="width: 120px"
              />
            </div>

            <div class="option-row">
              <label>输出统计信息</label>
              <a-switch v-model:checked="options.withStats" />
            </div>
          </div>

          <div class="supported-formats">
            <div class="formats-title">支持的日志格式</div>
            <ul>
              <li>
                <code>2026-09-28T10:54:06.369+08:00 [ERRO] {traceId} message</code>
              </li>
              <li>
                <code>2026-09-28 10:54:06 ERROR message</code>
              </li>
              <li>多行 Stack Trace 自动归属前一条日志</li>
            </ul>
          </div>
        </VbenGlassCard>
      </div>

      <!-- 进度：读取文件与解析共用一块区域，避免刷屏的 toast 提示 -->
      <VbenGlassCard v-if="busy" :hoverable="false" class="progress-card">
        <div class="progress-head">
          <LoadingOutlined class="progress-icon" />
          <span class="progress-title">{{ progressStageLabel }}</span>
          <span class="progress-percent">{{ progress.percent }}%</span>
        </div>
        <a-progress
          :percent="progress.percent"
          :show-info="false"
          :status="'active'"
          size="small"
        />
        <div class="progress-detail">{{ progress.detail }}</div>
        <div class="progress-actions">
          <a-button size="small" @click="cancelAnalyze">取消</a-button>
        </div>
      </VbenGlassCard>

      <!-- 结果区：全部内容收在卡片内 -->
      <template v-if="hasResult">
        <VbenGlassCard v-if="!result.entries.length" :hoverable="false">
          <div class="empty-result">
            <CheckCircleOutlined class="empty-icon" />
            <span>未发现符合条件的错误日志</span>
          </div>
        </VbenGlassCard>

        <template v-else>
          <div v-if="options.withStats" class="stats-overview">
            <VbenGlassCard :hoverable="false" title="统计概览">
              <div class="stats-grid">
                <div class="stat-item">
                  <span class="stat-value">{{ result.stats.total }}</span>
                  <span class="stat-label">日志总条目</span>
                </div>
                <div class="stat-item stat-error">
                  <span class="stat-value">{{ result.stats.errorCount }}</span>
                  <span class="stat-label">错误条目</span>
                </div>
                <div class="stat-item">
                  <span class="stat-value">{{ result.stats.errorRate.toFixed(1) }}%</span>
                  <span class="stat-label">错误占比</span>
                </div>
              </div>

              <div v-if="result.stats.levels.length" class="stats-section">
                <div class="section-title">错误级别分布</div>
                <div class="bar-list">
                  <div
                    v-for="lv in result.stats.levels"
                    :key="lv.name"
                    class="bar-row"
                  >
                    <span class="bar-name">[{{ lv.name }}]</span>
                    <div class="bar-track">
                      <div
                        class="bar-fill"
                        :style="{ width: barWidth(lv.count, maxLevelCount) }"
                      ></div>
                    </div>
                    <span class="bar-count">{{ lv.count }} 条</span>
                  </div>
                </div>
              </div>

              <div v-if="result.stats.times.length" class="stats-section">
                <div class="section-title">错误时间分布 Top 10</div>
                <div class="time-list">
                  <div
                    v-for="t in result.stats.times"
                    :key="t.name"
                    class="time-row"
                  >
                    <span class="time-key">{{ t.name }}</span>
                    <span class="time-count">→ {{ t.count }} 条</span>
                  </div>
                </div>
              </div>
            </VbenGlassCard>

            <VbenGlassCard :hoverable="false" title="错误类型分布">
              <a-table
                :data-source="result.stats.types"
                :columns="typeColumns"
                row-key="name"
                size="small"
                :pagination="false"
                :scroll="{ y: 360 }"
              />
            </VbenGlassCard>
          </div>

          <VbenGlassCard :hoverable="false" class="entries-card">
            <template #header>
              <div class="entries-header">
                <span class="entries-title">
                  错误日志（{{ result.entries.length }} 条）
                </span>
                <div class="entries-actions">
                  <a-button size="small" @click="copyReport">
                    <template #icon><CopyOutlined /></template>
                    复制报告
                  </a-button>
                  <a-button size="small" @click="downloadReport">
                    <template #icon><DownloadOutlined /></template>
                    下载 TXT
                  </a-button>
                </div>
              </div>
            </template>

            <div class="entries-filter">
              <a-input
                v-model:value="entryFilter"
                allow-clear
                placeholder="在结果中即时筛选（不重新分析）"
              >
                <template #prefix><SearchOutlined /></template>
              </a-input>
              <div v-if="visibleEntries.length > PAGE_SIZE" class="entries-pager">
                <span class="pager-info">
                  显示前 {{ PAGE_SIZE }} 条（共
                  {{ visibleEntries.length.toLocaleString() }} 条）
                </span>
                <a-button
                  size="small"
                  :disabled="renderLimit >= visibleEntries.length"
                  @click="showMore"
                >
                  再显示 {{ PAGE_STEP }} 条
                </a-button>
                <a-button
                  size="small"
                  type="link"
                  :disabled="renderLimit <= PAGE_SIZE"
                  @click="renderLimit = PAGE_SIZE"
                >
                  收起到 {{ PAGE_SIZE }} 条
                </a-button>
              </div>
            </div>

            <div class="entries-list">
              <div
                v-for="item in renderedEntries"
                :key="item.__index"
                class="entry-item"
              >
                <div class="entry-head" @click="toggle(item.__index)">
                  <span class="entry-index">
                    {{ String(item.__index + 1).padStart(3, "0") }}
                  </span>
                  <span class="entry-time">{{ item.timestamp }}</span>
                  <a-tag :color="levelTagColor(item.level)">{{ item.level }}</a-tag>
                  <span class="entry-type">{{ typeOf(item) }}</span>
                  <span class="entry-summary">{{ summaryOf(item) }}</span>
                  <RightOutlined
                    class="entry-arrow"
                    :class="{ expanded: expandedSet.has(item.__index) }"
                  />
                </div>
                <pre v-if="expandedSet.has(item.__index)" class="entry-body">{{
                  item.lines.join("\n")
                }}</pre>
              </div>
              <div v-if="!visibleEntries.length" class="entries-none">
                当前筛选条件下没有条目
              </div>
            </div>
          </VbenGlassCard>
        </template>
      </template>

      <!-- 空状态卡片 -->
      <VbenGlassCard
        v-if="!hasResult && !analyzing"
        :hoverable="false"
        class="empty-card"
      >
        <div class="empty-state">
          <FileSearchOutlined class="empty-state-icon" />
          <h3>等待日志输入</h3>
          <p>粘贴日志文本或上传日志文件，点击「分析」提取错误并统计分布</p>
        </div>
      </VbenGlassCard>
    </div>
  </div>
</template>

<script setup>
import { computed, reactive, ref, watch } from "vue";
import { message } from "ant-design-vue";
import {
  InboxOutlined,
  CopyOutlined,
  DownloadOutlined,
  SearchOutlined,
  RightOutlined,
  CheckCircleOutlined,
  LoadingOutlined,
  FileSearchOutlined,
} from "@ant-design/icons-vue";
import VbenGlassCard from "@/components/common/VbenGlassCard.vue";
import GradientButton from "@/components/common/GradientButton.vue";
import {
  renderReportText,
  classifyError,
  getSummary,
} from "@/utils/log/logErrorExtractor";
import { analyzeLogTextAsync } from "@/utils/log/logAnalyzerAsync";
import { useSettings } from "@/composables/core/useSettings.js";

const { getSetting } = useSettings();

/** 日志文件大小上限（MB），来自系统设置的「文件设置」页 */
const maxFileSizeMb = computed(() => {
  const v = Number(getSetting("logMaxFileSize"));
  return Number.isFinite(v) && v > 0 ? v : 20;
});
const maxFileSizeBytes = computed(() => maxFileSizeMb.value * 1024 * 1024);

const inputText = ref("");
const fileName = ref("");
/** 读取文件的进度 */
const loading = ref(false);
const analyzing = ref(false);

/** 读取或解析进行中，两者共用同一块进度区域 */
const busy = computed(() => loading.value || analyzing.value);
const hasResult = ref(false);
const entryFilter = ref("");
const expandedSet = ref(new Set());

/** 渲染上限：一次只渲染这么多条，避免十几万 DOM 节点把页面卡死 */
const PAGE_SIZE = 200;
const PAGE_STEP = 500;
const renderLimit = ref(PAGE_SIZE);

/** 解析进度 */
const progress = reactive({
  percent: 0,
  detail: "",
  stage: "",
});
const progressStageLabels = {
  read: "正在读取文件",
  split: "正在切分文本",
  parse: "正在解析日志",
  filter: "正在应用过滤",
  stats: "正在统计",
  done: "完成",
};
const progressStageLabel = computed(
  () => progressStageLabels[progress.stage] ?? "正在分析",
);

/** 取消控制器 */
let analyzeController = null;
let readController = null;

function cancelAnalyze() {
  // 读取和解析共用同一个取消按钮，谁在进行就取消谁
  if (readController) {
    readController.abort();
    message.info("已取消读取");
    return;
  }
  if (analyzeController) {
    analyzeController.abort();
    message.info("已取消分析");
  }
}

const options = reactive({
  includeWarn: false,
  levels: [],
  grep: "",
  tail: 0,
  withStats: true,
});

const levelOptions = [
  "ERRO",
  "ERROR",
  "FATAL",
  "CRITICAL",
  "PANIC",
  "WARN",
  "WARNING",
  "INFO",
  "DEBUG",
].map((v) => ({ value: v, label: v }));

const result = reactive({ entries: [], allEntries: [], stats: null });

const inputSizeText = computed(() => {
  const kb = new Blob([inputText.value || ""]).size / 1024;
  return kb > 1024 ? `${(kb / 1024).toFixed(2)} MB` : `${kb.toFixed(1)} KB`;
});

const typeColumns = [
  { title: "类型", dataIndex: "name", key: "name" },
  { title: "数量", dataIndex: "count", key: "count", width: 72, align: "right" },
  {
    title: "占比",
    key: "percent",
    width: 80,
    align: "right",
    customRender: ({ record }) => `${record.percent.toFixed(1)}%`,
  },
  {
    title: "示例",
    key: "example",
    ellipsis: true,
    customRender: ({ record }) => (record.examples && record.examples[0]) || "",
  },
];

const maxLevelCount = computed(() =>
  Math.max(1, ...result.stats.levels.map((l) => l.count)),
);

const visibleEntries = computed(() => {
  const kw = entryFilter.value.trim().toLowerCase();
  if (!kw) return result.entries;
  return result.entries.filter((e) => e.lines.join("\n").toLowerCase().includes(kw));
});

/**
 * 实际渲染的条目
 *
 * 只取前 renderLimit 条，并附加原始下标 __index：
 * 之前在模板里用 result.entries.indexOf(item) 求序号，
 * 那是每条一次 O(n) 的线性查找，十几万条时是 O(n²)，会直接卡死。
 */
const renderedEntries = computed(() =>
  visibleEntries.value
    .slice(0, renderLimit.value)
    .map((item, i) => ({ ...item, __index: i })),
);

/** 筛选条件变化时重置渲染上限，避免残留上一次的展开量 */
watch(entryFilter, () => {
  renderLimit.value = PAGE_SIZE;
});

function showMore() {
  renderLimit.value = Math.min(
    renderLimit.value + PAGE_STEP,
    visibleEntries.value.length,
  );
}

function barWidth(count, max) {
  return `${Math.max(3, (count / max) * 100)}%`;
}

function typeOf(entry) {
  return classifyError(entry);
}

function summaryOf(entry) {
  return getSummary(entry, 160);
}

function levelTagColor(level) {
  if (level === "FATAL" || level === "PANIC" || level === "CRITICAL") return "red";
  if (level === "ERROR" || level === "ERRO") return "volcano";
  if (level.startsWith("WARN")) return "orange";
  return "default";
}

function toggle(index) {
  const next = new Set(expandedSet.value);
  if (next.has(index)) next.delete(index);
  else next.add(index);
  expandedSet.value = next;
}

const handleFileRead = (file) => {
  if (file.size > maxFileSizeBytes.value) {
    // 显示实际大小，便于判断是哪个文件触发了限制
    const actualMb = (file.size / 1024 / 1024).toFixed(2);
    message.error(
      `文件 ${actualMb}MB，超过 ${maxFileSizeMb.value}MB 限制。可在「系统设置 → 文件设置」中调整`,
    );
    return false;
  }

  const sizeMb = (file.size / 1024 / 1024).toFixed(1);

  // 进度显示在页面内的进度卡片里，不用 message.loading 刷 toast。
  // 早先用「销毁旧 toast 再弹新的」逐块更新，100MB 文件会连续刷新
  // 几百次提示，观感极差——这正是现在改成卡片的原因。
  //
  // 小文件读取几乎瞬间完成，不显示进度卡片，否则会闪一下反而更糟。
  const showProgress = file.size > 2 * 1024 * 1024;

  readController = new AbortController();
  loading.value = showProgress;
  progress.stage = "read";
  progress.percent = 0;
  progress.detail = `正在读取 ${file.name}（${sizeMb}MB）…`;

  readFileWithProgress(
    file,
    (percent) => {
      if (!showProgress) return;
      // 只在百分比变化时更新，避免无谓的响应式触发
      if (percent !== progress.percent) {
        progress.percent = percent;
        progress.detail = `正在读取 ${file.name}（${sizeMb}MB）… ${percent}%`;
      }
    },
    readController?.signal,
  )
    .then((text) => {
      inputText.value = text;
      fileName.value = file.name;
      message.success(
        `已读取 ${file.name}（${sizeMb}MB，${text.split("\n").length.toLocaleString()} 行）`,
      );
    })
    .catch((err) => {
      if (err?.name === "AbortError") return; // 用户主动取消，不报错
      message.error(`读取文件失败：${err.message}`);
    })
    .finally(() => {
      loading.value = false;
      readController = null;
      progress.percent = 0;
      progress.detail = "";
    });

  // 阻止 antd 自动上传
  return false;
};

/**
 * 读取文件文本，并给出真实进度
 *
 * 为什么不用 FileReader.readAsText：
 * 它虽然支持 progress 事件，但对本地 File 对象通常只触发一次，
 * 100MB 文件读入期间界面没有任何反馈，看起来像卡死。
 *
 * 这里用 file.stream() 按块读取并逐块解码，块之间 await 让出主线程，
 * 进度是真实的字节数比例。TextDecoder 使用 stream 模式，
 * 避免在多字节字符（中文）被块边界截断时产生乱码。
 *
 * @param {File} file
 * @param {(percent: number) => void} [onProgress]
 * @returns {Promise<string>}
 */
async function readFileWithProgress(file, onProgress, signal) {
  const throwIfAborted = () => {
    if (signal?.aborted) {
      const err = new Error("读取已取消");
      err.name = "AbortError";
      throw err;
    }
  };

  // 浏览器不支持流式读取时退回一次性读取
  if (typeof file.stream !== "function") {
    const text = await file.text();
    onProgress?.(100);
    return text;
  }

  const reader = file.stream().getReader();
  const decoder = new TextDecoder("utf-8");
  const parts = [];
  let loaded = 0;

  try {
    while (true) {
      throwIfAborted();
      const { done, value } = await reader.read();
      if (done) break;
      loaded += value.length;
      // stream: true 表示后续还有数据，遇到不完整的多字节字符先缓存
      parts.push(decoder.decode(value, { stream: true }));
      onProgress?.(Math.min(99, Math.round((loaded / file.size) * 100)));
    }
  } catch (err) {
    // 取消时释放底层流，避免占用文件句柄
    await reader.cancel().catch(() => {});
    throw err;
  }

  parts.push(decoder.decode()); // 冲刷残留字节
  onProgress?.(100);
  return parts.join("");
}

async function handleAnalyze() {
  if (!inputText.value.trim()) {
    message.warning("请先输入或上传日志内容");
    return;
  }
  if (analyzing.value) return;

  analyzing.value = true;
  hasResult.value = false;
  progress.percent = 0;
  progress.detail = "准备中…";
  progress.stage = "split";

  analyzeController = new AbortController();
  const startedAt = Date.now();

  try {
    const res = await analyzeLogTextAsync(inputText.value, {
      includeWarn: options.includeWarn,
      levels: options.levels,
      grep: options.grep.trim(),
      tail: options.tail || 0,
      signal: analyzeController.signal,
      onProgress: (p) => {
        progress.percent = p.percent;
        progress.detail = p.detail;
        progress.stage = p.stage;
      },
    });

    result.entries = res.entries;
    result.allEntries = res.allEntries;
    result.stats = res.stats;
    hasResult.value = true;
    expandedSet.value = new Set();
    entryFilter.value = "";
    renderLimit.value = PAGE_SIZE;

    const elapsed = Date.now() - startedAt;
    if (!res.entries.length) {
      message.info(`未发现符合条件的错误日志（耗时 ${elapsed}ms）`);
    } else {
      message.success(
        `识别 ${res.parsedCount.toLocaleString()} 条日志，提取 ${res.entries.length.toLocaleString()} 条错误（耗时 ${elapsed}ms）`,
      );
    }
  } catch (err) {
    if (err?.name === "AbortError") {
      // 用户主动取消，不当作错误
      progress.detail = "已取消";
    } else {
      message.error(`分析失败：${err.message}`);
    }
  } finally {
    analyzing.value = false;
    analyzeController = null;
  }
}

function buildReportText() {
  return renderReportText(
    { entries: result.entries, allEntries: result.allEntries, stats: result.stats },
    options.withStats,
  );
}

async function copyReport() {
  try {
    await navigator.clipboard.writeText(buildReportText());
    message.success("报告已复制到剪贴板");
  } catch {
    message.error("复制失败，请使用下载");
  }
}

function downloadReport() {
  const blob = new Blob([buildReportText()], {
    type: "text/plain;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `error-report-${Date.now()}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

function clearAll() {
  inputText.value = "";
  fileName.value = "";
  entryFilter.value = "";
  hasResult.value = false;
  expandedSet.value = new Set();
  result.entries = [];
  result.allEntries = [];
  result.stats = null;
  message.success("已清空");
}
</script>

<style lang="scss" scoped>
@use "@/design/scss/variables" as *;
@use "@/design/scss/mixins" as *;

.log-analyzer-page {
  padding: 40px 20px;
  max-width: 1400px;
  margin: 0 auto;
  contain: layout style;
}

/* 所有卡片统一取消 hover 上浮/浮起效果 */
.page-stack :deep(.vben-glass-card) {
  transition: none !important;
  will-change: auto !important;
}

.page-stack :deep(.vben-glass-card:hover) {
  transform: translateZ(0) !important;
  box-shadow: var(--shadow-lg) !important;
}

.page-stack {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.page-header {
  @include flex-between;
  gap: 16px;

  .page-title {
    margin: 0;
    font-size: 28px;
    font-weight: 600;
  }

  .page-subtitle {
    margin: 6px 0 0;
    color: $text-secondary;
  }
}

.header-actions {
  display: flex;
  gap: 12px;
  flex-shrink: 0;
}

.content-layout {
  display: grid;
  grid-template-columns: 3fr 2fr;
  gap: 24px;
  align-items: start;
}

.log-textarea {
  margin-top: 16px;
  font-family: "Consolas", "Monaco", "Courier New", monospace;
  font-size: 12px;
  line-height: 1.6;
}

.input-meta {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-top: 8px;
  font-size: 12px;
  color: $text-secondary;
}

.options-grid {
  @include flex-column;
  gap: 16px;
}

.option-row {
  @include flex-between;
  gap: 12px;

  label {
    color: $text-secondary;
    white-space: nowrap;
  }
}

.option-col {
  flex-direction: column;
  align-items: stretch;
  gap: 8px;
}

.supported-formats {
  margin-top: 20px;
  padding-top: 16px;
  @include divider-top;

  .formats-title {
    font-weight: 500;
    margin-bottom: 8px;
  }

  ul {
    margin: 0;
    padding-left: 18px;
    font-size: 12px;
    color: $text-secondary;
  }

  code {
    font-family: "Consolas", "Monaco", "Courier New", monospace;
    font-size: 11px;
    background: var(--bg-sunken);
    color: var(--text-primary);
    padding: 1px 6px;
    border-radius: 4px;
  }
}

.empty-result {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 8px 0;
  color: var(--color-success);
  font-size: 15px;
}

.stats-overview {
  display: grid;
  grid-template-columns: 2fr 3fr;
  gap: 24px;
  align-items: start;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.stat-item {
  @include flex-column;
  align-items: center;
  gap: 4px;
  padding: 14px 8px;
  border-radius: 10px;
  background: var(--bg-sunken);

  .stat-value {
    font-size: 24px;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
  }

  .stat-label {
    font-size: 12px;
    color: $text-secondary;
  }
}

.stat-error .stat-value {
  color: var(--color-error);
}

.stats-section {
  margin-top: 20px;
  padding-top: 16px;
  @include divider-top;

  .section-title {
    font-weight: 600;
    margin-bottom: 12px;
  }
}

.bar-list {
  @include flex-column;
  gap: 8px;
}

.bar-row {
  display: grid;
  grid-template-columns: 90px 1fr 60px;
  align-items: center;
  gap: 10px;
  font-size: 12px;
}

.bar-name {
  font-family: "Consolas", "Monaco", "Courier New", monospace;
  color: $text-secondary;
}

.bar-track {
  height: 8px;
  border-radius: 4px;
  background: var(--bg-sunken);
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  border-radius: 4px;
  background: linear-gradient(90deg, #ff7875, var(--color-error));
  transition: width 0.3s ease;
}

.bar-count {
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.time-list {
  @include flex-column;
  gap: 6px;
  font-size: 12px;
}

.time-row {
  @include flex-between;
  color: $text-secondary;
}

.time-key {
  font-family: "Consolas", "Monaco", "Courier New", monospace;
}

.entries-header {
  @include flex-between;
  gap: 12px;
  flex-wrap: wrap;

  .entries-title {
    font-size: 16px;
    font-weight: 600;
  }
}

.entries-actions {
  display: flex;
  gap: 8px;
}

.entries-filter {
  margin-bottom: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.entries-pager {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  font-size: 12px;
  color: $text-secondary;
}

.pager-info {
  font-variant-numeric: tabular-nums;
}

.progress-card {
  border: 1px solid var(--border-default);
}

.progress-head {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}

.progress-icon {
  color: var(--color-primary);
  font-size: 16px;
}

.progress-title {
  font-weight: 600;
  flex: 1;
}

.progress-percent {
  font-variant-numeric: tabular-nums;
  color: var(--color-primary);
  font-weight: 600;
}

.progress-detail {
  margin-top: 6px;
  font-size: 12px;
  color: $text-secondary;
  font-variant-numeric: tabular-nums;
}

.progress-actions {
  margin-top: 10px;
}

.entries-list {
  max-height: 520px;
  overflow-y: auto;
  @include custom-scrollbar;
}

.entry-item {
  border: 1px solid var(--border-default);
  border-radius: 8px;
  margin-bottom: 8px;
  overflow: hidden;
}

.entry-head {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  cursor: pointer;
  font-size: 12px;
  background: var(--bg-sunken);

  &:hover {
    background: var(--interactive-hover);
  }
}

.entry-index {
  font-family: "Consolas", "Monaco", "Courier New", monospace;
  color: $text-tertiary;
}

.entry-time {
  font-family: "Consolas", "Monaco", "Courier New", monospace;
  white-space: nowrap;
}

.entry-type {
  color: $text-secondary;
  white-space: nowrap;
}

.entry-summary {
  flex: 1;
  min-width: 0;
  @include text-ellipsis;
}

.entry-arrow {
  margin-left: auto;
  transition: transform 0.2s ease;

  &.expanded {
    transform: rotate(90deg);
  }
}

.entry-body {
  margin: 0;
  padding: 12px;
  font-family: "Consolas", "Monaco", "Courier New", monospace;
  font-size: 12px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-all;
  background: var(--bg-sunken);
  color: var(--text-primary);
  max-height: 320px;
  overflow: auto;
  @include custom-scrollbar;
}

.entries-none {
  padding: 20px;
  text-align: center;
  color: $text-secondary;
}

.empty-state {
  @include flex-column-center;
  gap: 12px;
  padding: 32px 20px;
  color: $text-secondary;

  .empty-state-icon {
    font-size: 40px;
    color: var(--color-primary);
  }

  h3 {
    margin: 0;
    font-size: 18px;
    color: var(--text-primary);
  }

  p {
    margin: 0;
  }
}

@include respond-to(md) {
  .content-layout,
  .stats-overview {
    grid-template-columns: 1fr;
  }

  .page-header {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
