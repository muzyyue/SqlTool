/**
 * 日志分析的分批解析
 *
 * 为什么需要：100MB 日志的纯计算约 550ms，本身不算慢，但有两个问题：
 *   1. 一次性同步解析会长时间占用主线程，期间界面完全卡死、没有任何反馈；
 *   2. 解析结果动辄十几万条，直接渲染会把浏览器拖垮。
 *
 * 这里把解析拆成可让出的批次，每批之后回调进度，让 UI 能更新。
 * 逻辑与 logErrorExtractor.js 保持一致，只是分片执行，避免两套规则漂移。
 */
import {
  ALT_LEVEL_RE,
  ERROR_LEVELS,
  LOG_LINE_RE,
  WARN_LEVELS,
  buildStats,
} from "./logErrorExtractor.js";

/** 默认每批处理的行数，兼顾响应速度与调用开销 */
export const DEFAULT_BATCH_LINES = 20000;

/**
 * 两次让出之间至少间隔的毫秒数
 *
 * 每批都 setTimeout(0) 在小批次下会让「让出」本身成为瓶颈：
 * 浏览器对嵌套 setTimeout 有 4ms 下限，批次过密时总耗时会成倍放大。
 * 改为按时间预算让出——处理满 16ms 才让一次，既保证界面响应，
 * 又避免频繁让出拖慢解析。
 */
const YIELD_BUDGET_MS = 16;

const now = () =>
  typeof performance !== "undefined" && performance.now
    ? performance.now()
    : Date.now();

/** 让出主线程一次 */
const yieldToMain = () =>
  new Promise((resolve) => {
    if (typeof setTimeout === "function") setTimeout(resolve, 0);
    else resolve();
  });

/**
 * 分批解析日志
 *
 * @param {string} text 日志全文
 * @param {object} [options]
 * @param {number} [options.batchLines] 每批处理行数
 * @param {boolean} [options.includeWarn]
 * @param {string[]} [options.levels]
 * @param {string} [options.grep]
 * @param {number} [options.tail]
 * @param {(progress: {stage: string, percent: number, detail: string}) => void} [options.onProgress]
 * @param {AbortSignal} [options.signal] 用于取消
 * @returns {Promise<{allEntries: Array, entries: Array, stats: object, parsedCount: number}>}
 */
export async function analyzeLogTextAsync(text, options = {}) {
  const {
    batchLines = DEFAULT_BATCH_LINES,
    includeWarn = false,
    levels,
    grep = "",
    tail = 0,
    onProgress,
    signal,
  } = options;

  const report = (stage, percent, detail) => {
    if (typeof onProgress === "function") onProgress({ stage, percent, detail });
  };

  const throwIfAborted = () => {
    if (signal?.aborted) {
      const err = new Error("分析已取消");
      err.name = "AbortError";
      throw err;
    }
  };

  const source = String(text || "");
  report("split", 0, "正在切分文本…");

  // 切分本身无法分片（split 是单次原生调用，100MB 约 80ms），
  // 但先让出一帧，保证「开始分析」的提示能先绘制出来。
  await yieldToMain();
  throwIfAborted();

  const lines = source.split(/\r?\n/);
  const totalLines = lines.length;

  // 目标级别集合
  let levelSet;
  if (levels && levels.length) {
    levelSet = new Set(levels.map((x) => String(x).toUpperCase()));
  } else {
    levelSet = new Set(ERROR_LEVELS);
    if (includeWarn) for (const l of WARN_LEVELS) levelSet.add(l);
  }
  const grepLower = grep ? String(grep).toLowerCase() : "";

  const allEntries = [];
  const errorEntries = [];
  let current = null;

  // 保证进度至少上报若干次：即使总耗时很短（小数据或极快机器），
  // 也让 UI 能看到过程，而不是从 0 直接跳到 100。
  const totalBatches = Math.ceil(totalLines / batchLines);
  const minReportInterval = Math.max(1, Math.floor(totalBatches / 20));
  let batchesSinceReport = 0;

  for (let start = 0; start < totalLines; start += batchLines) {
    throwIfAborted();
    const end = Math.min(start + batchLines, totalLines);
    const batchStartedAt = now();

    for (let i = start; i < end; i++) {
      const line = lines[i];
      if (!line) continue;

      const m = LOG_LINE_RE.exec(line) || ALT_LEVEL_RE.exec(line);
      if (m) {
        if (current) {
          allEntries.push(current);
          if (current.__isError) errorEntries.push(current);
        }
        const level = m[2].toUpperCase();
        current = {
          timestamp: m[1],
          level,
          lines: [line],
          __isError: levelSet.has(level),
        };
      } else if (current) {
        current.lines.push(line);
      }
    }

    // 让出策略：处理耗时超过预算时才让出并上报进度，
    // 保证界面能刷新；小批次连续处理，避免几百次 setTimeout 把总耗时拖长。
    // 另外每完成固定比例的批次也上报一次，保证小数据量下进度不会从 0 跳到 100。
    batchesSinceReport++;
    const shouldReport =
      now() - batchStartedAt >= YIELD_BUDGET_MS ||
      end === totalLines ||
      batchesSinceReport >= minReportInterval;

    if (shouldReport) {
      batchesSinceReport = 0;
      report(
        "parse",
        Math.round((end / totalLines) * 100),
        `已解析 ${end.toLocaleString()} / ${totalLines.toLocaleString()} 行`,
      );
      await yieldToMain();
      throwIfAborted();
    }
  }

  if (current) {
    allEntries.push(current);
    if (current.__isError) errorEntries.push(current);
  }

  // 去掉内部标记，避免污染返回结构
  for (const e of allEntries) delete e.__isError;

  throwIfAborted();
  report("filter", 100, "正在应用过滤条件…");
  await yieldToMain();

  let err = errorEntries;

  if (grepLower) {
    err = err.filter((e) =>
      e.lines.join("\n").toLowerCase().includes(grepLower),
    );
  }

  if (tail && tail > 0) {
    err = err.slice(-tail);
  }

  report("stats", 100, "正在统计…");
  await yieldToMain();
  const stats = buildStats(err, allEntries);

  report("done", 100, "完成");
  return { allEntries, entries: err, stats, parsedCount: allEntries.length };
}
