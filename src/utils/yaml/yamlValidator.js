/**
 * YAML 校验模块
 *
 * 面向两类使用场景：
 *   一、通用 YAML 文件（K8s 清单、CI 配置、Helm、任意配置文件）
 *   二、Docker Compose 文件（在通用检查之上追加专项规则）
 *
 * 与通用 YAML 解析器的关键区别：解析器只会报
 *   `found character that cannot start any token`
 * 却不告诉你到底是哪个字符、位于第几列、Unicode 码位是什么、从哪复制来的。
 *
 * 本模块分四层检查：
 *   1. scanInvisibleChars —— 逐字符扫描不可见字符与全角标点（解析器做不到）
 *   2. parseAllDocuments —— 结构合法性，支持多文档（解析器默认只认单文档）
 *   3. checkGenericYaml  —— 任何 YAML 都可能踩到的坑（类型隐式转换、键名含冒号、别名）
 *   4. checkCompose      —— Docker Compose 专项规则（按需启用）
 */

import { isMap as yamlIsMap, isSeq as yamlIsSeq, parseAllDocuments } from "yaml";

const isMap = (node) => yamlIsMap(node);
const isSeq = (node) => yamlIsSeq(node);

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
 * 常见文件类型推断
 *
 * 用于在「通用模式」下按文件名给出更贴合的提示，例如
 * docker-compose.yml 自动启用 Compose 专项规则。
 * 只做后缀文件名匹配，不读内容，避免误判。
 */
const FILE_KIND_HINTS = [
  { pattern: /^(docker-)?compose\.ya?ml$/i, kind: "compose" },
  { pattern: /^(k8s|kubernetes)/i, kind: "k8s" },
  { pattern: /\.github\/workflows\//i, kind: "actions" },
  { pattern: /^\.?gitlab-ci\.ya?ml$/i, kind: "ci" },
  { pattern: /^Chart\.ya?ml$/i, kind: "helm" },
  { pattern: /^values\.ya?ml$/i, kind: "helm" },
  { pattern: /^pubspec\.ya?ml$/i, kind: "packages" },
  { pattern: /^pnpm-workspace\.ya?ml$/i, kind: "packages" },
  { pattern: /^\.?prettierrc\.ya?ml$/i, kind: "config" },
];

/**
 * 依据文件名推断 YAML 用途
 * @param {string} name - 文件名或路径
 * @returns {string} compose / k8s / actions / ci / helm / packages / config / generic
 */
export function guessFileKind(name) {
  const normalized = String(name ?? "").replace(/\\/g, "/");
  const base = normalized.split("/").pop() ?? "";
  for (const { pattern, kind } of FILE_KIND_HINTS) {
    if (pattern.test(base) || pattern.test(normalized)) return kind;
  }
  return "generic";
}

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
  // 注释状态：YAML 中 # 之后到行尾的内容不参与解析。
  // 注释里的全角标点、零宽字符不会导致语法错误，必须与正文区分，
  // 否则任何带中文注释的文件都会刷出一堆误报的错误。
  let inComment = false;
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let prevChar = "";

  for (const char of text) {
    const code = char.codePointAt(0);

    // 换行推进行列计数（\r\n 中的 \r 也在此处理）
    if (char === "\n") {
      line += 1;
      column = 1;
      inComment = false;
      prevChar = "";
      continue;
    }
    if (char === "\r") {
      continue;
    }

    // 引号状态只在与注释无关的正文中跟踪
    if (!inComment) {
      if (char === "'" && !inDoubleQuote) {
        inSingleQuote = !inSingleQuote;
      } else if (char === '"' && !inSingleQuote) {
        inDoubleQuote = !inDoubleQuote;
      } else if (
        char === "#" &&
        !inSingleQuote &&
        !inDoubleQuote &&
        (prevChar === "" || prevChar === " " || prevChar === "\t")
      ) {
        // # 之前必须是空白或行首才构成注释；`a#b` 中的 # 属于标量内容
        inComment = true;
      }
    }

    const info = RISKY_CHARS[code];
    const isTab = code === 0x0009;

    if (info && (includeTab || !isTab)) {
      total += 1;
      if (issues.length < maxIssues) {
        lines ??= text.split(/\r?\n/);
        // 注释内的全角标点不会破坏解析：降级为 warning 并说明原因。
        // 零宽字符、BOM 即便在注释里也属于应清理的脏字符，保持原级别。
        const harmlessInComment =
          inComment && code >= 0xff00 && code <= 0xffef;
        issues.push({
          line,
          column,
          codePoint: code,
          codeHex: "U+" + code.toString(16).toUpperCase().padStart(4, "0"),
          char,
          name: info.name,
          severity: harmlessInComment ? "warning" : info.severity,
          reason: harmlessInComment
            ? `${info.reason}（该字符位于注释中，不影响解析，可忽略）`
            : info.reason,
          fix: info.fix,
          inComment,
          // 便于在 UI 中展示上下文
          context: buildContext(lines, line, column),
        });
      }
    }

    prevChar = char;
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
 * 通用 YAML 专项检查（不假定是 Compose）
 *
 * 针对任何 YAML 文件都可能踩到的坑：
 *   1. 隐式类型转换导致值被悄悄改写（如 version: 1.10 → 1.1、0123 → 123）
 *   2. 键名里混入冒号（漏写冒号后的空格），键会被解析成一整串
 *   3. 未定义别名（错误只在 toJS 时暴露）
 *   4. 重复键（由解析器报告，这里补一条可读说明）
 *   5. 顶层结构类型提示
 *
 * @param {*} doc - 单个 YAML Document
 * @param {string} source - 该文档对应的源码片段
 * @param {number} [docIndex] - 多文档时的序号（从 0 开始）
 * @returns {Array} 问题列表
 */
export function checkGenericYaml(doc, source) {
  const issues = [];
  const push = (item) => issues.push(item);

  const contents = doc?.contents;
  if (!contents) {
    // 空文档（空文件、仅注释）不算错误，直接返回
    return issues;
  }

  // 1. 未定义别名：doc.errors 为空，但 toJS 会抛错
  if (isMap(contents) || isSeq(contents)) {
    try {
      doc.toJS({ maxAliasCount: 100 });
    } catch (err) {
      const msg = String(err?.message ?? "");
      if (/alias|anchor/i.test(msg)) {
        push({
          severity: "error",
          path: "(别名)",
          message: `别名无法解析：${msg.split("\n")[0]}`,
          hint: "别名（*name）必须先由锚点（&name）定义，且锚点要在引用之前出现。",
        });
      }
    }
  }

  // 2. 键名中混入冒号（通常是 "key:value" 漏了空格）
  if (isMap(contents)) {
    for (const pair of contents.items) {
      const key = pair.key;
      if (!key || typeof key.value !== "string") continue;
      const raw = typeof key.source === "string" ? key.source : "";
      // 已加引号的键是作者有意为之，不报
      if (key.type && key.type !== "PLAIN") continue;
      // 未加引号的键里出现冒号，几乎必然是漏写空格
      if (raw.includes(":")) {
        const line = key.range?.[0] != null ? lineOf(source, key.range[0]) : null;
        push({
          severity: "error",
          path: String(key.value),
          line,
          message: `键名「${key.value}」中含有冒号，冒号后可能漏了空格。`,
          hint: 'YAML 的键值分隔必须是「冒号 + 空格」。若键名本身含冒号，需加引号，如 "a:b": 1。',
        });
      }
    }
  }

  return issues;
}

/**
 * 把字符偏移量换算成行号（从 1 开始）
 * @param {string} source
 * @param {number} offset
 * @returns {number|null}
 */
function lineOf(source, offset) {
  if (typeof source !== "string" || offset == null || offset < 0) return null;
  let line = 1;
  for (let i = 0; i < offset && i < source.length; i += 1) {
    if (source[i] === "\n") line += 1;
  }
  return line;
}

/**
 * 检查隐式类型转换
 *
 * YAML 会按规范把未加引号的值转成数字/布尔/null，这在配置里常常是事故来源：
 *   version: 1.10   → 1.1     （版本号被吃掉末位 0）
 *   build: 0123     → 123     （前导 0 被去掉）
 *   port: 1_000     → 1000
 * 只要 source（原文）与转换后的 value 文本不一致，就提示用户加引号。
 *
 * @param {*} doc
 * @param {string} source
 * @returns {Array}
 */
function checkImplicitTypes(doc, source) {
  const issues = [];
  const contents = doc?.contents;
  if (!isMap(contents)) return issues;

  for (const pair of contents.items) {
    const node = pair.value;
    if (!node || typeof node.source !== "string") continue;
    const raw = node.source;
    const converted = String(node.value);

    // 只关心「原文与转换结果不同」的标量
    if (raw === converted) continue;

    // 空值（键后面什么都没写）是合法的 YAML，不是类型转换
    if (raw === "" || raw === "~") continue;

    // null 转换（~、null、Null、NULL）一般是有意的，不报
    if (node.value === null && /^(~|null)$/i.test(raw)) continue;

    // 普通整数/小数且能原样还原的不报：1、-2、0.5、9e99 之外的常规写法
    // 注意 1.10 这类「末尾带 0 的小数」必须报，因为转成 1.1 丢了信息
    if (
      typeof node.value === "number" &&
      /^-?(0|[1-9]\d*)$/.test(raw)
    ) {
      continue;
    }

    const keyName = pair.key?.value;
    const line = node.range?.[0] != null ? lineOf(source, node.range[0]) : null;

    let reason = `值「${raw}」被解释为 ${typeof node.value}（${converted}），与原文不一致。`;
    if (typeof node.value === "number" && /^0\d/.test(raw)) {
      reason = `值「${raw}」以 0 开头，被当作数字解析成 ${converted}，前导 0 丢失。`;
    } else if (typeof node.value === "number" && /^\d+\.\d*0$/.test(raw)) {
      reason = `值「${raw}」作为数字会丢掉末尾的 0，实际值为 ${converted}。`;
    }

    issues.push({
      severity: "warning",
      path: String(keyName ?? ""),
      line,
      message: reason,
      hint: `若要保持原文，请加引号：${keyName}: "${raw}"`,
    });
  }

  return issues;
}

/**
 * 把解析器错误/警告统一成 UI 可用的结构
 * @param {Array} list - doc.errors 或 doc.warnings
 * @param {number} docIndex
 * @returns {Array}
 */
function normalizeMessages(list, docIndex = 0) {
  return (list ?? []).map((e) => ({
    line: e.linePos?.[0]?.line ?? null,
    column: e.linePos?.[0]?.col ?? null,
    message: String(e.message ?? "").split("\n")[0],
    fullMessage: String(e.message ?? ""),
    docIndex,
  }));
}

/**
 * 安全地把 YAML Document 转为 JS，失败时返回 null 而不抛错
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

/**
 * 主校验入口
 *
 * 默认按「通用 YAML」校验：不再强制要求顶层 services，
 * 因此 K8s 清单、CI 配置、Helm values、任意配置文件都能正常通过。
 *
 * @param {string} text - YAML 全文
 * @param {object} [options]
 * @param {boolean} [options.compose=false] - 是否追加 Docker Compose 专项检查
 * @param {boolean} [options.includeTab=true] - 是否把 Tab 视为问题
 * @param {boolean} [options.checkTypes=true] - 是否检查隐式类型转换
 * @param {string} [options.fileName] - 文件名，用于推断用途
 * @returns {object} 校验结果
 */
export function validateYaml(text, options = {}) {
  const {
    compose = false,
    includeTab = true,
    checkTypes = true,
    fileName = "",
  } = options;

  const source = typeof text === "string" ? text : "";

  // 第一层：不可见字符
  const invisible = scanInvisibleChars(source, { includeTab });

  // 第二层：结构解析，支持 --- 分隔的多文档
  const docs = parseAllDocuments(source, {
    uniqueKeys: true,
    keepSourceTokens: false,
  });

  const parseErrors = [];
  const parseWarnings = [];
  docs.forEach((doc, index) => {
    parseErrors.push(...normalizeMessages(doc.errors, index));
    parseWarnings.push(...normalizeMessages(doc.warnings, index));
  });

  // 第三层：通用 YAML 检查
  const genericIssues = [];
  docs.forEach((doc) => {
    genericIssues.push(...checkGenericYaml(doc, source));
    if (checkTypes) genericIssues.push(...checkImplicitTypes(doc, source));
  });

  // 第四层：Compose 专项。多文档场景下 Compose 语义不适用，避免误报
  const composeIssues =
    compose && docs.length === 1 ? checkCompose(docs[0]) : [];

  const lineCount = source.length === 0 ? 0 : source.split(/\r?\n/).length;

  const countSeverity = (list, level) =>
    list.filter((i) => i.severity === level).length;

  const errorCount =
    parseErrors.length +
    countSeverity(invisible.issues, "error") +
    countSeverity(genericIssues, "error") +
    countSeverity(composeIssues, "error");

  const warningCount =
    parseWarnings.length +
    countSeverity(invisible.issues, "warning") +
    countSeverity(genericIssues, "warning") +
    countSeverity(composeIssues, "warning");

  // 解析成功时给出结构摘要：多文档返回数组，单文档返回对象
  const data =
    parseErrors.length > 0
      ? null
      : docs.length > 1
        ? docs.map((d) => safeToJS(d))
        : safeToJS(docs[0]);

  return {
    ok: errorCount === 0,
    lineCount,
    docCount: docs.length,
    fileKind: guessFileKind(fileName),
    errorCount,
    warningCount,
    invisible: invisible.issues,
    invisibleTotal: invisible.total,
    invisibleTruncated: invisible.truncated,
    parseErrors,
    parseWarnings,
    genericIssues,
    composeIssues,
    data,
  };
}
