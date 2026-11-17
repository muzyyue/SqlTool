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

          <!-- 大文件只显示预览：把几十 MB 塞进 textarea 会让浏览器卡死 -->
          <div v-if="isPreviewMode" class="preview-banner">
            <FileTextOutlined class="preview-icon" />
            <div class="preview-text">
              <strong>已载入完整文件</strong>（{{ inputSizeText }}，{{
                totalLines.toLocaleString()
              }}
              行）。为避免卡顿，此处只显示前 {{ PREVIEW_LINES }} 行预览；
              点击「分析」会处理完整内容。
            </div>
          </div>

          <a-textarea
            v-model:value="displayText"
            class="log-textarea"
            :auto-size="{ minRows: 8, maxRows: 16 }"
            :readonly="isPreviewMode"
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
  FileTextOutlined,
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

/**
 * 完整日志内容
 *
 * 大文件（几十 MB）不能直接绑到 textarea：把三千万字符塞进单个输入框，
 * 浏览器要布局整段文本，低配机上会长时间无响应。因此这里保存完整内容
 * 供解析使用，textarea 只显示 displayText（前若干行预览）。
 */
const inputText = ref("");
/** textarea 里实际显示的文本：小文件即全文，大文件只显示预览 */
const displayText = ref("");
/** 大文件预览时记录完整行数，供提示与后续使用 */
const totalLines = ref(0);

/** 超过该大小就只显示预览，避免 textarea 卡死 */
const PREVIEW_THRESHOLD_BYTES = 1024 * 1024; // 1MB
/** 预览保留的行数 */
const PREVIEW_LINES = 500;

/** 当前是否为「大文件预览模式」 */
const isPreviewMode = computed(
  () => inputText.value.length > 0 && totalLines.value > PREVIEW_LINES,
);

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

/** 让出主线程一帧，用于在耗时操作前后保证 UI 能刷新 */
const yieldToMain = () =>
  new Promise((resolve) => {
    if (typeof requestAnimationFrame === "function") {
      requestAnimationFrame(() => resolve());
    } else {
      setTimeout(resolve, 0);
    }
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

/**
 * 已载入内容的字节数
 *
 * 不能用 `new Blob([text]).size` 现算：实测 30MB 文本单次 18ms，
 * 且这是 computed 依赖 inputText，任何触发重算的地方都会再付一次代价。
 * 改为在载入时算一次并缓存。
 */
const inputBytes = ref(0);

const inputSizeText = computed(() => {
  const kb = inputBytes.value / 1024;
  return kb > 1024 ? `${(kb / 1024).toFixed(2)} MB` : `${kb.toFixed(1)} KB`;
});

/**
 * 用户手动编辑 textarea 时同步到 inputText
 *
 * 预览模式下 textarea 是只读的，不会触发；正常模式下两者应保持一致。
 * 这里用 watch 而不是 v-model 直连，是为了让「载入文件」与「手动输入」
 * 走同一套状态更新，避免出现 inputText 与 displayText 不一致。
 */
watch(displayText, (val) => {
  if (isPreviewMode.value) return; // 预览模式只读，忽略
  inputText.value = val;
  // 手动输入时用字符数估算字节数：TextEncoder 编码 30MB 要 9ms，
  // 每次按键都跑会明显卡顿。中文等多字节字符下略有偏差，仅用于显示。
  inputBytes.value = val.length;
  // 大文本不 split（30MB 实测 66ms），改粗略估算行数：
  // 手动输入场景下光标在末尾，按平均行长估算足够用。
  totalLines.value = val ? Math.ceil(val.length / 80) : 0;
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

/** 读取阶段的进度节流：至少间隔这么久才更新一次，避免数字跳变看不清 */
const READ_PROGRESS_INTERVAL_MS = 100;

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

  let lastUpdate = 0;
  const startedAt = Date.now();

  readFileWithProgress(
    file,
    (percent) => {
      if (!showProgress) return;
      // 节流：文件读取往往几十毫秒内就完成，逐块刷新会让用户看到
      // 数字直接从 0 跳到 99，误以为「一上传就 99% 然后卡住」。
      // 这里限制更新频率，让进度变化可感知。
      const nowTs = Date.now();
      if (nowTs - lastUpdate < READ_PROGRESS_INTERVAL_MS) return;
      lastUpdate = nowTs;
      progress.percent = percent;
      progress.detail = `正在读取 ${file.name}（${sizeMb}MB）… ${percent}%`;
    },
    readController?.signal,
  )
    .then((text) => {
      // 读取完成若耗时极短，进度会停在 0 附近就消失，反而让人以为没读到。
      // 补齐一次 100%，让状态变化有始有终。
      if (showProgress) {
        progress.percent = 100;
        progress.detail = `已读取 ${sizeMb}MB，正在准备预览…`;
      }
      // 关键：读取完成后先让出一帧，让「已读取」的状态能绘制出来，
      // 再去处理可能耗时几百毫秒的文本切分与预览截取。
      return yieldToMain().then(() => {
        const bigFile = text.length > PREVIEW_THRESHOLD_BYTES;
        const lines = bigFile ? countLines(text) : text.split(/\r?\n/).length;

        inputText.value = text;
        inputBytes.value = new TextEncoder().encode(text).length;
        totalLines.value = lines;
        fileName.value = file.name;

        // 大文件只把前 PREVIEW_LINES 行交给 textarea，
        // 避免三千万字符进入 DOM 布局导致低配机长时间无响应。
        displayText.value = bigFile ? takeLines(text, PREVIEW_LINES) : text;

        const elapsed = Date.now() - startedAt;
        message.success(
          `已读取 ${file.name}（${sizeMb}MB，${lines.toLocaleString()} 行，${elapsed}ms）` +
            (bigFile ? "，已切换为预览模式" : ""),
        );
      });
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

/** 统计行数：不用 split 建数组，30MB 下 split 要 66ms 且产生大量临时对象 */
function countLines(text) {
  let count = 1;
  for (let i = 0; i < text.length; i++) {
    if (text.charCodeAt(i) === 10) count++;
  }
  return count;
}

/** 取前 n 行，避免对全文 split */
function takeLines(text, n) {
  let seen = 0;
  for (let i = 0; i < text.length; i++) {
    if (text.charCodeAt(i) === 10) {
      seen++;
      if (seen >= n) return text.slice(0, i + 1);
    }
  }
  return text;
}

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
  displayText.value = "";
  inputBytes.value = 0;
  totalLines.value = 0;
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

/* 大文件预览提示：说明只显示前若干行，完整内容仍会被分析 */
.preview-banner {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-top: 16px;
  padding: 10px 12px;
  border-radius: 8px;
  background: var(--color-primary-bg);
  border: 1px solid var(--color-primary-border);
  font-size: 12px;
  line-height: 1.6;
  color: $text-secondary;

  .preview-icon {
    color: var(--color-primary);
    flex-shrink: 0;
    margin-top: 2px;
  }

  .preview-text {
    flex: 1;
  }

  strong {
    color: var(--text-primary);
  }
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
