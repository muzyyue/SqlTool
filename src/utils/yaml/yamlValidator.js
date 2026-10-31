/**
 * YAML 校验模块
 *
 * 针对「Linux 上 Docker Compose 因 YAML 未知字符起不来」这一真实场景设计。
 * 与通用 YAML 解析器的关键区别：解析器只会报
 *   `found character that cannot start any token`
 * 却不告诉你到底是哪个字符、位于第几列、Unicode 码位是什么、从哪复制来的。
 *
 * 本模块分三层检查：
 *   1. scanInvisibleChars —— 逐字符扫描不可见字符与全角标点（解析器做不到）
 *   2. YAML.parseDocument —— 结构合法性（遵循 YAML 1.2，含重复键与缩进警告）
 *   3. checkCompose —— Docker Compose 专项规则
 */

import { parseDocument } from "yaml";

/**
 * 危险字符表
 *
 * 每一项描述：码位、名称、原因、处理建议。
 * severity: "error" 表示几乎必然导致 YAML 无法解析；"warning" 表示可能不报错但语义错误。
 */
export const RISKY_CHARS = {
  0x0009: {
    name: "TAB（制表符）",
    severity: "error",
    reason: "YAML 规范禁止用 Tab 缩进。Docker Compose 会直接报错，且编辑器里肉眼可能与空格无异。",
    fix: "替换为等宽空格",
  },
  0x00a0: {
    name: "NBSP（不换行空格）",
    severity: "error",
    reason:
      "最常见的隐形杀手。从网页、Word、微信复制内容时自动带入，视觉上与普通空格几乎一致，但 YAML 不认为它是空格。",
    fix: "替换为普通空格",
  },
  0x1680: {
    name: "OGHAM SPACE MARK",
    severity: "error",
    reason: "Unicode 空格字符，YAML 不识别为缩进。",
    fix: "替换为普通空格",
  },
  0x2000: {
    name: "EN QUAD（Unicode 空格）",
    severity: "error",
    reason: "Unicode 空格字符，YAML 不识别为缩进。",
    fix: "替换为普通空格",
  },
  0x2001: {
    name: "EM QUAD（Unicode 空格）",
    severity: "error",
    reason: "Unicode 空格字符，YAML 不识别为缩进。",
    fix: "替换为普通空格",
  },
  0x2002: {
    name: "EN SPACE",
    severity: "error",
    reason: "Unicode 空格字符，YAML 不识别为缩进。",
    fix: "替换为普通空格",
  },
  0x2003: {
    name: "EM SPACE",
    severity: "error",
    reason: "Unicode 空格字符，YAML 不识别为缩进。",
    fix: "替换为普通空格",
  },
  0x2004: {
    name: "THREE-PER-EM SPACE",
    severity: "error",
    reason: "Unicode 空格字符，YAML 不识别为缩进。",
    fix: "替换为普通空格",
  },
  0x2005: {
    name: "FOUR-PER-EM SPACE",
    severity: "error",
    reason: "Unicode 空格字符，YAML 不识别为缩进。",
    fix: "替换为普通空格",
  },
  0x2006: {
    name: "SIX-PER-EM SPACE",
    severity: "error",
    reason: "Unicode 空格字符，YAML 不识别为缩进。",
    fix: "替换为普通空格",
  },
  0x2007: {
    name: "FIGURE SPACE",
    severity: "error",
    reason: "Unicode 空格字符，YAML 不识别为缩进。",
    fix: "替换为普通空格",
  },
  0x2008: {
    name: "PUNCTUATION SPACE",
    severity: "error",
    reason: "Unicode 空格字符，YAML 不识别为缩进。",
    fix: "替换为普通空格",
  },
  0x2009: {
    name: "THIN SPACE（窄空格）",
    severity: "error",
    reason: "Unicode 空格字符，YAML 不识别为缩进。",
    fix: "替换为普通空格",
  },
  0x200a: {
    name: "HAIR SPACE",
    severity: "error",
    reason: "Unicode 空格字符，YAML 不识别为缩进。",
    fix: "替换为普通空格",
  },
  0x200b: {
    name: "ZWSP（零宽空格）",
    severity: "error",
    reason: "完全不可见、不占宽度。从网页富文本复制时常见，会让 YAML 报无法理解的语法错误。",
    fix: "直接删除",
  },
  0x200c: {
    name: "ZWNJ（零宽非连接符）",
    severity: "error",
    reason: "完全不可见的格式控制字符，会破坏键名与缩进解析。",
    fix: "直接删除",
  },
  0x200d: {
    name: "ZWJ（零宽连接符）",
    severity: "error",
    reason: "完全不可见的格式控制字符，会破坏键名与缩进解析。",
    fix: "直接删除",
  },
  0x2028: {
    name: "LINE SEPARATOR（行分隔符）",
    severity: "error",
    reason: "Unicode 行分隔符。部分编辑器不显示为换行，YAML 解析会错位。",
    fix: "替换为普通换行",
  },
  0x2029: {
    name: "PARAGRAPH SEPARATOR（段分隔符）",
    severity: "error",
    reason: "Unicode 段分隔符。部分编辑器不显示为换行，YAML 解析会错位。",
    fix: "替换为普通换行",
  },
  0x202f: {
    name: "NNBSP（窄不换行空格）",
    severity: "error",
    reason: "不可见空格，YAML 不识别为缩进。",
    fix: "替换为普通空格",
  },
  0x205f: {
    name: "MEDIUM MATHEMATICAL SPACE",
    severity: "error",
    reason: "Unicode 空格字符，YAML 不识别为缩进。",
    fix: "替换为普通空格",
  },
  0x2060: {
    name: "WORD JOINER（零宽）",
    severity: "error",
    reason: "不可见的格式控制字符，会破坏解析。",
    fix: "直接删除",
  },
  0x3000: {
    name: "IDEOGRAPHIC SPACE（全角空格）",
    severity: "error",
    reason: "中文输入法按空格时常误打出。宽度与两个半角空格相似，但 YAML 不认作缩进。",
    fix: "替换为普通空格",
  },
  0xfeff: {
    name: "BOM（字节顺序标记）",
    severity: "error",
    reason:
      "Windows 记事本以 UTF-8 另存时可能写入。若出现在文件开头会让第一个键名损坏；出现在中间则更隐蔽。",
    fix: "直接删除",
  },
  0xfffd: {
    name: "REPLACEMENT CHARACTER（替换字符）",
    severity: "error",
    reason: "编码转换失败留下的痕迹，说明文件可能不是 UTF-8，或曾经过错误的转码。",
    fix: "需要重新以 UTF-8 保存原文件",
  },
  0xff1a: {
    name: "全角冒号「：」",
    severity: "error",
    reason: "中文输入法下打出的冒号。YAML 只认半角冒号加空格，全角冒号会让整行变成普通字符串。",
    fix: "替换为半角冒号",
  },
  0xff0c: {
    name: "全角逗号「，」",
    severity: "error",
    reason: "中文输入法下打出的逗号，在流式数组 [a，b] 中会导致解析失败。",
    fix: "替换为半角逗号",
  },
  0xff02: {
    name: "全角引号「＂」",
    severity: "error",
    reason: "全角引号不具备 YAML 引号的转义语义，会让值变成带有引号的普通字符串。",
    fix: "替换为半角双引号",
  },
  0xff07: {
    name: "全角单引号「＇」",
    severity: "error",
    reason: "全角单引号不具备 YAML 引号的转义语义。",
    fix: "替换为半角单引号",
  },
  0xff3b: {
    name: "全角左方括号「［」",
    severity: "error",
    reason: "全角括号不参与 YAML 流式集合语法。",
    fix: "替换为半角方括号",
  },
  0xff3d: {
    name: "全角右方括号「］」",
    severity: "error",
    reason: "全角括号不参与 YAML 流式集合语法。",
    fix: "替换为半角方括号",
  },
  0xff5b: {
    name: "全角左花括号「｛」",
    severity: "error",
    reason: "全角括号不参与 YAML 流式映射语法。",
    fix: "替换为半角花括号",
  },
  0xff5d: {
    name: "全角右花括号「｝」",
    severity: "error",
    reason: "全角括号不参与 YAML 流式映射语法。",
    fix: "替换为半角花括号",
  },
  0xff03: {
    name: "全角井号「＃」",
    severity: "warning",
    reason: "全角井号不会被识别为注释起始，可能导致意外的键名。",
    fix: "替换为半角井号",
  },
  0xff0d: {
    name: "全角连字符「－」",
    severity: "warning",
    reason: "全角连字符不会被识别为列表项标记。",
    fix: "替换为半角连字符",
  },
};

/** 被视为「零宽/直接删除」的码位 */
const DELETE_CHARS = new Set([
  0x200b, 0x200c, 0x200d, 0x2060, 0xfeff,
]);

/** 被视为「替换为普通换行」的码位 */
const NEWLINE_CHARS = new Set([0x2028, 0x2029]);

/**
 * 扫描文本中的危险字符
 *
 * 按码位遍历（for...of 可正确处理代理对），记录每个命中字符的
 * 行号、列号、码位、名称与原因。
 *
 * @param {string} text - 待扫描文本
 * @param {object} [options]
 * @param {boolean} [options.includeTab=true] - 是否报告 Tab（部分场景允许）
 * @param {number} [options.maxIssues=500] - 最大报告数量，避免超长文件产生海量结果
 * @returns {{issues: Array, total: number, truncated: boolean}}
 */
export function scanInvisibleChars(text, options = {}) {
  const { includeTab = true, maxIssues = 500 } = options;
  const issues = [];
  let total = 0;

  if (typeof text !== "string" || text.length === 0) {
    return { issues, total: 0, truncated: false };
  }

  let line = 1;
  let column = 1;
  // 全文只切分一次：命中多条问题时若每次都 text.split()，大文件会产生大量重复工作
  let lines = null;

  for (const char of text) {
    const code = char.codePointAt(0);

    // 换行推进行列计数（\r\n 中的 \r 也在此处理）
    if (char === "\n") {
      line += 1;
      column = 1;
      continue;
    }
    if (char === "\r") {
      continue;
    }

    const info = RISKY_CHARS[code];
    const isTab = code === 0x0009;

    if (info && (includeTab || !isTab)) {
      total += 1;
      if (issues.length < maxIssues) {
        lines ??= text.split(/\r?\n/);
        issues.push({
          line,
          column,
          codePoint: code,
          codeHex: "U+" + code.toString(16).toUpperCase().padStart(4, "0"),
          char,
          name: info.name,
          severity: info.severity,
          reason: info.reason,
          fix: info.fix,
          // 便于在 UI 中展示上下文
          context: buildContext(lines, line, column),
        });
      }
    }

    column += 1;
  }

  return { issues, total, truncated: total > issues.length };
}

/**
 * 取某一行的上下文片段（用于 UI 展示）
 * @param {string[]} lines - 已按行切分好的数组，由调用方复用，避免重复全文切分
 * @param {number} targetLine
 * @param {number} column
 * @param {number} [radius=24]
 * @returns {string}
 */
function buildContext(lines, targetLine, column, radius = 24) {
  const raw = lines[targetLine - 1] ?? "";
  if (!raw) return "";

  const start = Math.max(0, column - 1 - radius);
  const end = Math.min(raw.length, column - 1 + radius);
  const prefix = start > 0 ? "…" : "";
  const suffix = end < raw.length ? "…" : "";

  // 把不可见字符替换为可视化占位，便于用户看到位置
  // 注意：这里逐字符判断而非用正则，因为正则里写 \u0009 这类控制字符会被
  // ESLint 的 no-control-regex 规则判为错误，从而阻断 lint 检查
  const slice = Array.from(raw.slice(start, end))
    .map((c) => {
      const cp = c.codePointAt(0);
      if (!isRiskyCodePoint(cp)) return c;
      const hex = "U+" + cp.toString(16).toUpperCase().padStart(4, "0");
      const known = RISKY_CHARS[cp];
      return known ? `⟦${hex}⟧` : "⟦?⟧";
    })
    .join("");

  return prefix + slice + suffix;
}

/**
 * 判断码位是否属于「需要在上下文里可视化」的范围
 * 覆盖 RISKY_CHARS 中的全部字符，以及 U+200E / U+200F 等方向控制符
 * @param {number} cp
 * @returns {boolean}
 */
function isRiskyCodePoint(cp) {
  if (Object.prototype.hasOwnProperty.call(RISKY_CHARS, cp)) return true;
  // 全角区（U+FF00–U+FFEF）：除 RISKY_CHARS 已列出的标点外，
  // 其余全角字符也一并可视化，避免「看起来一样却解析失败」的情况
  if (cp >= 0xff00 && cp <= 0xffef) return true;
  // 方向控制符 LRM / RLM，同样不可见且会干扰解析
  return cp === 0x200e || cp === 0x200f;
}

/**
 * 自动修复危险字符
 *
 * 修复策略按 RISKY_CHARS 的 fix 字段执行：
 *   - 空格类 → 替换为半角空格
 *   - 零宽类 → 直接删除
 *   - 行分隔符 → 替换为 \n
 *   - Tab → 按 indentWidth 转为空格
 *   - 全角标点 → 半角
 *
 * @param {string} text
 * @param {object} [options]
 * @param {number} [options.indentWidth=2] - Tab 转换宽度
 * @param {boolean} [options.stripBom=true]
 * @returns {{text: string, changed: number}}
 */
export function fixRiskyChars(text, options = {}) {
  const { indentWidth = 2, stripBom = true } = options;

  if (typeof text !== "string" || text.length === 0) {
    return { text: text ?? "", changed: 0 };
  }

  let changed = 0;

  // 逐字符重建，保证计数准确
  const out = [];
  for (const char of text) {
    const code = char.codePointAt(0);

    if (code === 0x0009) {
      out.push(" ".repeat(indentWidth));
      changed += 1;
      continue;
    }
    if (DELETE_CHARS.has(code)) {
      if (code === 0xfeff && !stripBom) {
        out.push(char);
        continue;
      }
      changed += 1;
      continue;
    }
    if (NEWLINE_CHARS.has(code)) {
      out.push("\n");
      changed += 1;
      continue;
    }
    if (code === 0x00a0 || code === 0x3000 || (code >= 0x2000 && code <= 0x200a) ||
        code === 0x1680 || code === 0x202f || code === 0x205f) {
      out.push(" ");
      changed += 1;
      continue;
    }

    // 全角标点映射
    const fullwidthMap = {
      0xff1a: ":", 0xff0c: ",", 0xff02: '"', 0xff07: "'",
      0xff3b: "[", 0xff3d: "]", 0xff5b: "{", 0xff5d: "}",
      0xff03: "#", 0xff0d: "-",
    };
    if (fullwidthMap[code]) {
      out.push(fullwidthMap[code]);
      changed += 1;
      continue;
    }

    out.push(char);
  }

  return { text: out.join(""), changed };
}

/**
 * 检查 Docker Compose 专项规则
 *
 * @param {*} doc - YAML.parseDocument 的结果
 * @returns {Array} 问题列表
 */
export function checkCompose(doc) {
  const issues = [];

  let data;
  try {
    data = doc.toJS();
  } catch {
    // 解析失败时不进入语义检查
    return issues;
  }

  if (!data || typeof data !== "object" || Array.isArray(data)) {
    issues.push({
      severity: "error",
      path: "(根)",
      message: "Compose 文件的根节点必须是映射（key: value），当前不是。",
      hint: "检查文件是否为空，或缩进是否让整份文件变成了一个列表。",
    });
    return issues;
  }

  // 1. services 顶层键
  const hasServices = Object.prototype.hasOwnProperty.call(data, "services");
  if (!hasServices) {
    const nearMiss = Object.keys(data).find((k) =>
      /^services?$/i.test(k.trim()),
    );
    issues.push({
      severity: "error",
      path: "(根)",
      message: nearMiss
        ? `顶层键「${nearMiss}」拼写不正确，应为「services」。`
        : "缺少顶层键「services」，Docker Compose 无法识别任何服务。",
      hint: "标准 Compose 文件结构为 services → 服务名 → 配置。",
    });
    return issues;
  }

  const services = data.services;
  if (!services || typeof services !== "object" || Array.isArray(services)) {
    issues.push({
      severity: "error",
      path: "services",
      message: "「services」必须是映射，当前不是。",
      hint: "检查 services 下一层的缩进是否统一。",
    });
    return issues;
  }

  const serviceNames = Object.keys(services);

  if (serviceNames.length === 0) {
    issues.push({
      severity: "warning",
      path: "services",
      message: "「services」下没有任何服务。",
      hint: "确认是否漏掉了服务定义。",
    });
  }

  for (const name of serviceNames) {
    const svc = services[name];
    const base = `services.${name}`;

    if (!svc || typeof svc !== "object" || Array.isArray(svc)) {
      issues.push({
        severity: "error",
        path: base,
        message: `服务「${name}」的定义不是映射。`,
        hint: "服务配置应为 key: value 形式。",
      });
      continue;
    }

    // 2. image 未指定 tag
    if (typeof svc.image === "string") {
      const image = svc.image.trim();
      const lastSegment = image.split("/").pop() ?? "";
      const hasTag = lastSegment.includes(":");
      const hasDigest = image.includes("@sha256:");
      if (!hasTag && !hasDigest) {
        issues.push({
          severity: "warning",
          path: `${base}.image`,
          message: `镜像「${image}」未指定 tag，默认使用 latest。`,
          hint: "生产环境建议固定版本，如 nginx:1.27-alpine，避免上游更新导致服务启动失败。",
        });
      }
    }

    // 3. 相对路径挂载（Linux 上极易出问题）
    if (Array.isArray(svc.volumes)) {
      svc.volumes.forEach((vol, idx) => {
        // 短语法为「源:目标[:模式]」，只取源段判断；长语法本身就是源路径
        const raw = typeof vol === "string" ? vol : vol?.source;
        if (typeof raw !== "string") return;
        const v = typeof vol === "string" ? raw.split(":")[0] : raw;

        // 命名卷（不含路径分隔符，也不以 . 或 ~ 开头）是合法的
        const isNamedVolume =
          !v.includes("/") && !v.includes("\\") && !v.startsWith(".") && !v.startsWith("~");
        if (isNamedVolume) return;

        if (v.startsWith("/") || v.startsWith("$") || v.startsWith("~")) return;

        issues.push({
          severity: "warning",
          path: `${base}.volumes[${idx}]`,
          message: `挂载源「${v}」是相对路径。`,
          hint:
            "相对路径基于 compose 文件所在目录解析。若在 Linux 上用 systemd 或不同工作目录启动，路径会变化导致挂载失败。建议改用绝对路径或命名卷。",
        });
      });
    }

    // 4. depends_on 引用了不存在的服务
    if (svc.depends_on) {
      const deps = Array.isArray(svc.depends_on)
        ? svc.depends_on
        : Object.keys(svc.depends_on ?? {});
      for (const dep of deps) {
        if (!serviceNames.includes(dep)) {
          issues.push({
            severity: "error",
            path: `${base}.depends_on`,
            message: `依赖的服务「${dep}」不存在。`,
            hint: "检查服务名拼写，或确认该服务是否被误删。",
          });
        }
      }
    }

    // 5. ports 格式
    if (Array.isArray(svc.ports)) {
      svc.ports.forEach((port, idx) => {
        const p = String(port);
        if (p.includes(":") || /^\d+$/.test(p)) return;
        issues.push({
          severity: "warning",
          path: `${base}.ports[${idx}]`,
          message: `端口映射「${p}」格式可疑。`,
          hint: "常见格式为 HOST:CONTAINER，如 8080:80。",
        });
      });
    }
  }

  return issues;
}

/**
 * 主校验入口
 *
 * @param {string} text - YAML 全文
 * @param {object} [options]
 * @param {boolean} [options.compose=false] - 是否启用 Docker Compose 专项检查
 * @param {boolean} [options.includeTab=true] - 是否把 Tab 视为问题
 * @returns {object} 校验结果
 */
export function validateYaml(text, options = {}) {
  const { compose = false, includeTab = true } = options;

  const source = typeof text === "string" ? text : "";

  // 第一层：不可见字符
  const invisible = scanInvisibleChars(source, { includeTab });

  // 第二层：结构解析
  const doc = parseDocument(source, {
    // 记录出现重复键等情况
    uniqueKeys: true,
    // 保留注释便于后续显示
    keepSourceTokens: false,
  });

  const parseErrors = doc.errors.map((e) => ({
    line: e.linePos?.[0]?.line ?? null,
    column: e.linePos?.[0]?.col ?? null,
    message: e.message.split("\n")[0],
    fullMessage: e.message,
  }));

  const parseWarnings = doc.warnings.map((w) => ({
    line: w.linePos?.[0]?.line ?? null,
    column: w.linePos?.[0]?.col ?? null,
    message: w.message.split("\n")[0],
    fullMessage: w.message,
  }));

  // 第三层：Compose 专项
  const composeIssues = compose ? checkCompose(doc) : [];

  const lineCount = source.length === 0 ? 0 : source.split(/\r?\n/).length;

  const errorCount =
    parseErrors.length +
    invisible.issues.filter((i) => i.severity === "error").length +
    composeIssues.filter((i) => i.severity === "error").length;

  const warningCount =
    parseWarnings.length +
    invisible.issues.filter((i) => i.severity === "warning").length +
    composeIssues.filter((i) => i.severity === "warning").length;

  return {
    ok: errorCount === 0,
    lineCount,
    errorCount,
    warningCount,
    invisible: invisible.issues,
    invisibleTotal: invisible.total,
    invisibleTruncated: invisible.truncated,
    parseErrors,
    parseWarnings,
    composeIssues,
    // 解析成功时的数据结构，供 UI 展示摘要
    data: doc.errors.length === 0 ? safeToJS(doc) : null,
  };
}

/**
 * 安全地把 YAML Document 转为 JS 对象
 * @param {*} doc
 * @returns {*}
 */
function safeToJS(doc) {
  try {
    return doc.toJS({ maxAliasCount: 100 });
  } catch {
    return null;
  }
}
