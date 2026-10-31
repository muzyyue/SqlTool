/**
 * 日志错误提取引擎
 * 从 tjlog.py（日志错误提取工具 v2）移植的核心算法：
 * 从日志文本中提取错误级别日志（含多行 Stack Trace），并按错误类型统计分布。
 * 逻辑与 Python 版保持一致（正则、分类优先级、摘要提取规则均对应移植）。
 */

export const ERROR_LEVELS = new Set(["ERRO", "ERROR", "FATAL", "CRITICAL", "PANIC"]);
export const WARN_LEVELS = new Set(["WARN", "WARNING"]);

// 格式 A: 2026-09-28T10:54:06.369+08:00 [ERRO] ...
const LOG_LINE_RE =
  /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[.\d]*[+-]\d{2}:\d{2})\s+\[([A-Z]{4,8})\]/;
// 格式 B: 2026-09-28 10:54:06 ERROR ...（毫秒与时区偏移均可选；
// 修正了 Python 原版将偏移写为必需的 bug，与文档声明的格式 B 保持一致）
const ALT_LEVEL_RE =
  /^(\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:[.\d]*)?(?:[+-]\d{2}:?\d{2})?)\s+(ERROR|ERRO|FATAL|CRITICAL|PANIC|WARN|WARNING|INFO|DEBU|DEBUG)\b/;
// 摘要/详情用（不捕获级别）
const ALT_MSG_RE = new RegExp(ALT_LEVEL_RE.source.replace("(ERROR|ERRO", "(?:ERROR|ERRO"));

export const ERROR_TYPE_PATTERNS = [
  [/timeout|timed?\s*out|deadline\s+exceeded|context\s+canceled/i, "超时 (Timeout)"],
  [/connection\s+(refused|reset|closed|aborted)|ECONNREFUSED|ECONNRESET|broken\s+pipe/i, "连接错误 (Connection)"],
  [/(null|nil)\s*(pointer|reference|dereference)|NullPointer|AttributeError.*None|undefined\s+is\s+not/i, "空指针/引用 (NullRef)"],
  [/\b404\b|not\s+found|ENOENT|no\s+such\s+file/i, "资源不存在 (Not Found)"],
  [/\b5\d{2}\b|internal\s+server\s+error|bad\s+gateway|service\s+unavailable|gateway\s+timeout/i, "服务端错误 (5xx)"],
  [/\b4\d{2}\b|unauthorized|forbidden|permission\s+denied|access\s+denied|EACCES/i, "权限/认证错误 (4xx)"],
  [/out\s+of\s+memory|OOM|memory\s+exceeded|cannot\s+allocate|ENOMEM|MemoryError/i, "内存不足 (OOM)"],
  [/disk\s+full|no\s+space\s+left|ENOSPC|filesystem\s+full/i, "磁盘空间不足 (Disk Full)"],
  [/deadlock|lock\s+(wait|timeout|held)|deadlock\s+detected/i, "死锁/锁等待 (Deadlock)"],
  [/stack\s*overflow|RecursionError|maximum\s+recursion|RangeError.*stack/i, "栈溢出 (Stack Overflow)"],
  [/authentication\s+(fail|error)|auth\s+fail|invalid\s+token|token\s+expired|bad\s+credentials|\b401\b/i, "认证失败 (Auth)"],
  [/certificate|TLS\s|SSL\s|handshake\s+fail|x509/i, "证书/TLS 错误 (TLS)"],
  [/database|DB\s+error|connection\s+pool\s+exhausted|SQL\s+(syntax|error)|replication/i, "数据库错误 (DB)"],
  [/file\s+(not\s+found|permission|locked)|EBUSY|EISDIR|not\s+a\s+directory/i, "文件 I/O 错误 (File)"],
  [/rate\s+limit|\b429\b|too\s+many\s+requests|throttl/i, "限流 (Rate Limit)"],
  [/parse\s+error|JSON\s+syntax|malformed|invalid\s+(json|xml|yaml|protobuf)|decode\s+error/i, "解析错误 (Parse)"],
  [/type\s*mismatch|TypeError|cannot\s+convert|incompatible\s+type/i, "类型错误 (Type)"],
  [/key\s+(not\s+found|error)|KeyError|missing\s+(field|key|parameter)|undefined\s+variable/i, "键/字段缺失 (Key Missing)"],
  [/IO\s+error|EPIPE|EIO|input\/output|read\s+error|write\s+error/i, "I/O 错误 (IO)"],
  [/panic|unhandled\s+exception|uncaught|segmentation\s+fault|SIGSEGV|SIGABRT/i, "未捕获异常/Panic"],
];

/**
 * 将日志行切分为条目（多行 Stack Trace 归属前一条目）
 * @param {string[]} lines
 * @returns {Array<{timestamp: string, level: string, lines: string[]}>}
 */
export function splitLogEntries(lines) {
  const entries = [];
  let current = null;
  for (const line of lines) {
    if (!line) continue;
    const m = LOG_LINE_RE.exec(line) || ALT_LEVEL_RE.exec(line);
    if (m) {
      if (current) entries.push(current);
      current = { timestamp: m[1], level: m[2].toUpperCase(), lines: [line] };
    } else if (current) {
      current.lines.push(line);
    }
  }
  if (current) entries.push(current);
  return entries;
}

/**
 * 按优先级匹配错误类型（先中先归）
 * @param {{lines: string[]}} entry
 * @returns {string}
 */
export function classifyError(entry) {
  const text = entry.lines.join("\n");
  for (const [pattern, name] of ERROR_TYPE_PATTERNS) {
    if (pattern.test(text)) return name;
  }
  return "其他 (Other)";
}

/**
 * 提取 level 后的完整消息（去掉 traceId，保留关键错误信息）
 * @param {{lines: string[]}} entry
 * @param {number} maxLen
 * @returns {string}
 */
export function getSummary(entry, maxLen = 200) {
  const line = entry.lines.length ? entry.lines[0].trim() : "";
  const m = LOG_LINE_RE.exec(line) || ALT_MSG_RE.exec(line);
  let rest = m ? line.slice(m[0].length).trim() : line;
  // 先去掉 traceId {xxxx}，再剥离前导标点（顺序颠倒会让 { 先被剥掉导致清理失效）
  rest = rest.replace(/^\{[a-f0-9]+\}\s*/, "");
  rest = rest.replace(/^[|>\s{-]+/, "").trim();
  if (rest.length > maxLen) rest = rest.slice(0, maxLen) + " ...";
  return rest || "(空)";
}

/**
 * 提取更详细的错误信息（第一行消息，用于统计展示）
 * @param {{lines: string[]}} entry
 * @param {number} maxLen
 * @returns {string[]}
 */
export function getDetailLines(entry, maxLen = 300) {
  const lines = [];
  const first = entry.lines.length ? entry.lines[0].trim() : "";
  const m = LOG_LINE_RE.exec(first) || ALT_MSG_RE.exec(first);
  let msg = m ? first.slice(m[0].length).trim() : first;
  msg = msg.replace(/^\{[a-f0-9]+\}\s*/, "");
  msg = msg.replace(/^[|>\s{-]+/, "").trim();
  if (msg) {
    if (msg.length > maxLen) msg = msg.slice(0, maxLen) + " ...";
    lines.push(msg);
  }
  return lines;
}

/**
 * 构建统计信息（结构化数据，供 UI 渲染）
 * @param {Array} entries 错误条目
 * @param {Array} allEntries 全部条目
 * @returns {{total: number, errorCount: number, errorRate: number, levels: Array, types: Array, times: Array}}
 */
export function buildStats(entries, allEntries) {
  const counter = (map, key) => {
    map.set(key, (map.get(key) || 0) + 1);
  };
  const toSorted = (map) =>
    [...map.entries()].sort((a, b) => b[1] - a[1]).map(([name, count]) => ({ name, count }));

  const levelMap = new Map();
  for (const e of entries) counter(levelMap, e.level);

  const typeMap = new Map();
  const typeExamples = new Map();
  for (const e of entries) {
    const t = classifyError(e);
    counter(typeMap, t);
    if (!typeExamples.has(t)) {
      typeExamples.set(t, getDetailLines(e).length ? getDetailLines(e) : ["(无)"]);
    }
  }

  const timeMap = new Map();
  for (const e of entries) {
    try {
      counter(timeMap, e.timestamp.slice(0, 16));
    } catch {
      /* 无效时间戳跳过 */
    }
  }

  const total = allEntries.length;
  const types = toSorted(typeMap).map((item) => ({
    ...item,
    percent: entries.length ? (item.count / entries.length) * 100 : 0,
    examples: typeExamples.get(item.name) || ["(无)"],
  }));

  return {
    total,
    errorCount: entries.length,
    errorRate: total ? (entries.length / total) * 100 : 0,
    levels: toSorted(levelMap),
    types,
    times: toSorted(timeMap).slice(0, 10),
  };
}

/**
 * 主分析入口
 * @param {string} text 日志全文
 * @param {object} options
 * @param {boolean} [options.includeWarn] 同时包含 WARN/WARNING 级别
 * @param {string[]} [options.levels] 指定提取的级别（覆盖默认）
 * @param {string} [options.grep] 关键词过滤
 * @param {number} [options.tail] 只取最后 N 条
 * @returns {{allEntries: Array, entries: Array, stats: object, parsedCount: number}}
 */
export function analyzeLogText(text, options = {}) {
  const lines = String(text || "").split(/\r?\n/);
  const allEntries = splitLogEntries(lines);

  let err;
  if (options.levels && options.levels.length) {
    const tset = new Set(options.levels.map((x) => x.toUpperCase()));
    err = allEntries.filter((e) => tset.has(e.level));
  } else {
    const levels = new Set(ERROR_LEVELS);
    if (options.includeWarn) for (const l of WARN_LEVELS) levels.add(l);
    err = allEntries.filter((e) => levels.has(e.level));
  }

  if (options.grep) {
    const kw = options.grep.toLowerCase();
    err = err.filter((e) => e.lines.join("\n").toLowerCase().includes(kw));
  }

  if (options.tail && options.tail > 0) {
    err = err.slice(-options.tail);
  }

  const stats = buildStats(err, allEntries);
  return { allEntries, entries: err, stats, parsedCount: allEntries.length };
}

/**
 * 将分析结果渲染为纯文本报告（与 Python 版输出格式一致，供下载/复制）
 * @param {{entries: Array, allEntries: Array, stats: object}} result
 * @param {boolean} withStats 是否附带统计部分
 * @returns {string}
 */
export function renderReportText(result, withStats = true) {
  const { entries, stats } = result;
  const parts = [];
  entries.forEach((e, i) => {
    parts.push("=".repeat(70));
    parts.push(
      `[${String(i + 1).padStart(3, "0")}] ${e.timestamp}  [${e.level}]`,
    );
    parts.push(e.lines.map((l) => l.replace(/\s+$/, "")).join("\n"));
  });
  let text = parts.join("\n");

  if (withStats) {
    const sep = "─".repeat(70);
    const out = ["", sep];
    out.push(`  日志总条目数:  ${stats.total}`);
    out.push(`  错误条目数:    ${stats.errorCount}`);
    if (stats.total) out.push(`  错误占比:      ${stats.errorRate.toFixed(1)}%`);

    if (stats.levels.length) {
      out.push("", "  【错误级别分布】");
      for (const { name, count } of stats.levels) {
        out.push(`    [${name.padEnd(8)}] ${String(count).padStart(4)} 条`);
      }
    }
    if (stats.types.length) {
      out.push("", "  【错误类型分布】");
      out.push(`    ${"类型".padEnd(24)} ${"数量".padStart(5)}  ${"占比".padStart(7)}`);
      for (const t of stats.types) {
        out.push(`    ${t.name.padEnd(24)} ${String(t.count).padStart(5)}  ${t.percent.toFixed(1).padStart(6)}%`);
        for (const dl of t.examples) out.push(`      ↳ ${dl}`);
        out.push("");
      }
    }
    if (stats.times.length) {
      out.push("  【错误时间分布 Top 10】");
      for (const { name, count } of stats.times) {
        out.push(`    ${name}  →  ${count} 条`);
      }
    }
    out.push(sep, "");
    text += "\n" + out.join("\n");
  }
  return text;
}
