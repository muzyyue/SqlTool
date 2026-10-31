/**
 * YAML 校验模块单元测试
 *
 * 测试重点来自真实故障场景：Docker Compose 因不可见字符或 Tab 缩进无法启动。
 */

import { describe, it, expect } from "vitest";
import {
  scanInvisibleChars,
  fixRiskyChars,
  validateYaml,
  checkCompose,
  RISKY_CHARS,
} from "@/utils/yaml/yamlValidator";

const NBSP = "\u00a0";
const ZWSP = "\u200b";
const IDEO_SPACE = "\u3000";
const BOM = "\ufeff";
const FULLWIDTH_COLON = "\uff1a";

// 用 Unicode 码位构造样本，避免源码里出现真实不可见字符
const withChar = (code, text) => {
  const ch = String.fromCodePoint(code);
  return text.replace("{X}", ch);
};

describe("scanInvisibleChars", () => {
  it("定位 NBSP 的行号与列号", () => {
    // 第 2 行第 3 列是不换行空格
    const src = `services:\n  ${NBSP}web: x\n`;
    const { issues, total } = scanInvisibleChars(src);
    expect(total).toBe(1);
    expect(issues[0].codePoint).toBe(0x00a0);
    expect(issues[0].line).toBe(2);
    expect(issues[0].column).toBe(3);
    expect(issues[0].codeHex).toBe("U+00A0");
  });

  it("识别零宽空格 ZWSP 并标记为 error", () => {
    const src = `a: ${ZWSP}1\n`;
    const { issues } = scanInvisibleChars(src);
    expect(issues).toHaveLength(1);
    expect(issues[0].codePoint).toBe(0x200b);
    expect(issues[0].severity).toBe("error");
  });

  it("识别全角空格 U+3000", () => {
    const src = `a:\n${IDEO_SPACE}b: 1\n`;
    const { issues } = scanInvisibleChars(src);
    expect(issues[0].codePoint).toBe(0x3000);
  });

  it("识别文件开头的 BOM", () => {
    const src = BOM + "services: {}\n";
    const { issues } = scanInvisibleChars(src);
    expect(issues[0].codePoint).toBe(0xfeff);
    expect(issues[0].line).toBe(1);
    expect(issues[0].column).toBe(1);
  });

  it("识别形似半角冒号的全角冒号", () => {
    const src = `image${FULLWIDTH_COLON} nginx\n`;
    const { issues } = scanInvisibleChars(src);
    expect(issues[0].codePoint).toBe(0xff1a);
    expect(issues[0].name).toContain("全角冒号");
  });

  it("识别 Tab 缩进", () => {
    const src = "services:\n\tweb:\n\t\timage: nginx\n";
    const { issues } = scanInvisibleChars(src);
    // 1 个 Tab + 2 个 Tab = 3 处
    expect(issues).toHaveLength(3);
    expect(issues.every((i) => i.codePoint === 0x0009)).toBe(true);
  });

  it("includeTab=false 时不报告 Tab", () => {
    const src = "services:\n\tweb:\n";
    const { issues } = scanInvisibleChars(src, { includeTab: false });
    expect(issues).toHaveLength(0);
  });

  it("干净文本不产生任何问题", () => {
    const src = "services:\n  web:\n    image: nginx:1.27\n";
    const { issues, total } = scanInvisibleChars(src);
    expect(issues).toHaveLength(0);
    expect(total).toBe(0);
  });

  it("空字符串与非法输入安全返回", () => {
    expect(scanInvisibleChars("").total).toBe(0);
    expect(scanInvisibleChars(null).total).toBe(0);
    expect(scanInvisibleChars(undefined).total).toBe(0);
  });

  it("同一行多个危险字符的列号依次递增", () => {
    const src = `x${NBSP}${NBSP}y\n`;
    const { issues } = scanInvisibleChars(src);
    expect(issues).toHaveLength(2);
    expect(issues[0].column).toBe(2);
    expect(issues[1].column).toBe(3);
  });

  it("超长输入在 maxIssues 处截断并标记 truncated", () => {
    const src = NBSP.repeat(50);
    const { issues, total, truncated } = scanInvisibleChars(src, { maxIssues: 10 });
    expect(total).toBe(50);
    expect(issues).toHaveLength(10);
    expect(truncated).toBe(true);
  });

  it("上下文包含可视化占位符，便于用户看到位置", () => {
    const src = `key: ${NBSP}value\n`;
    const { issues } = scanInvisibleChars(src);
    expect(issues[0].context).toContain("⟦U+00A0⟧");
  });

  it("注释中的全角标点降级为警告并标记 inComment", () => {
    // 注释内容不参与解析，其中的全角标点不可能导致 YAML 报错
    const src = `a: 1\n# 中文，注释：说明\nb: 2\n`;
    const { issues } = scanInvisibleChars(src);
    expect(issues).toHaveLength(2);
    expect(issues.every((i) => i.severity === "warning")).toBe(true);
    expect(issues.every((i) => i.inComment === true)).toBe(true);
    expect(issues[0].reason).toContain("不影响解析");
  });

  it("正文中的全角标点仍判为错误", () => {
    const src = `image${FULLWIDTH_COLON} nginx\n`;
    const { issues } = scanInvisibleChars(src);
    expect(issues[0].severity).toBe("error");
    expect(issues[0].inComment).toBe(false);
  });

  it("# 前若不是空白则不视为注释", () => {
    // `a#b` 中的 # 属于标量内容，其后的全角字符仍在正文里
    const src = `key: a#${NBSP}b\n`;
    const { issues } = scanInvisibleChars(src);
    expect(issues[0].inComment).toBe(false);
    expect(issues[0].severity).toBe("error");
  });

  it("引号内的 # 不开启注释状态", () => {
    const src = `key: "a # b${FULLWIDTH_COLON} c"\n`;
    const { issues } = scanInvisibleChars(src);
    expect(issues[0].inComment).toBe(false);
    expect(issues[0].severity).toBe("error");
  });

  it("注释内的零宽字符仍保持 error 级别", () => {
    // 零宽字符属于应清理的脏字符，即便在注释里也不该放过
    const src = `a: 1\n# note${ZWSP}\n`;
    const { issues } = scanInvisibleChars(src);
    expect(issues[0].codePoint).toBe(0x200b);
    expect(issues[0].severity).toBe("error");
  });
});

describe("fixRiskyChars", () => {
  it("把 NBSP 替换为普通空格", () => {
    const { text, changed } = fixRiskyChars(`a:${NBSP}1\n`);
    expect(text).toBe("a: 1\n");
    expect(changed).toBe(1);
  });

  it("删除零宽空格", () => {
    // 零宽字符只是被删除，不补空格；原文中的空格保留
    const { text } = fixRiskyChars(`a: ${ZWSP}1\n`);
    expect(text).toBe("a: 1\n");
  });

  it("删除文件开头 BOM", () => {
    const { text } = fixRiskyChars(BOM + "a: 1\n");
    expect(text).toBe("a: 1\n");
  });

  it("stripBom=false 时保留 BOM", () => {
    const { text } = fixRiskyChars(BOM + "a: 1\n", { stripBom: false });
    expect(text.startsWith(BOM)).toBe(true);
  });

  it("把 Tab 按 indentWidth 转为空格", () => {
    const { text } = fixRiskyChars("services:\n\tweb:\n", { indentWidth: 2 });
    expect(text).toBe("services:\n  web:\n");
  });

  it("indentWidth 可配置为 4", () => {
    const { text } = fixRiskyChars("a:\n\tb: 1\n", { indentWidth: 4 });
    expect(text).toBe("a:\n    b: 1\n");
  });

  it("把全角冒号替换为半角", () => {
    const { text } = fixRiskyChars(`image${FULLWIDTH_COLON} nginx:1.27\n`);
    expect(text).toBe("image: nginx:1.27\n");
  });

  it("把全角空格替换为半角空格", () => {
    const { text } = fixRiskyChars(`a:\n${IDEO_SPACE}b: 1\n`);
    expect(text).toBe("a:\n b: 1\n");
  });

  it("把 Unicode 行分隔符替换为换行", () => {
    const { text } = fixRiskyChars(`a: 1${String.fromCodePoint(0x2028)}b: 2\n`);
    expect(text).toBe("a: 1\nb: 2\n");
  });

  it("干净文本保持不变且 changed 为 0", () => {
    const src = "services:\n  web:\n    image: nginx:1.27\n";
    const { text, changed } = fixRiskyChars(src);
    expect(text).toBe(src);
    expect(changed).toBe(0);
  });

  it("能修复被污染文本并让校验通过", () => {
    const dirty = `services:\n${IDEO_SPACE}web${FULLWIDTH_COLON}\n${IDEO_SPACE}${IDEO_SPACE}image: nginx:1.27\n`;
    // 修复前必然有问题
    expect(validateYaml(dirty).ok).toBe(false);

    const fixed = fixRiskyChars(dirty, { indentWidth: 2 });
    const result = validateYaml(fixed.text);
    expect(result.invisibleTotal).toBe(0);
    expect(result.parseErrors).toHaveLength(0);
  });
});

describe("validateYaml 结构校验", () => {
  it("合法 Compose 文件校验通过", () => {
    const src = [
      "services:",
      "  web:",
      "    image: nginx:1.27-alpine",
      "    ports:",
      '      - "8080:80"',
      "",
    ].join("\n");
    const r = validateYaml(src);
    expect(r.ok).toBe(true);
    expect(r.errorCount).toBe(0);
    expect(r.parseErrors).toHaveLength(0);
  });

  it("Tab 缩进被判为错误", () => {
    const src = "services:\n\tweb:\n\t\timage: nginx:1.27\n";
    const r = validateYaml(src);
    expect(r.ok).toBe(false);
    expect(r.invisible.some((i) => i.codePoint === 0x0009)).toBe(true);
  });

  it("NBSP 缩进同时触发字符告警与解析错误", () => {
    const src = `services:\n${NBSP}web:\n${NBSP}${NBSP}image: nginx:1.27\n`;
    const r = validateYaml(src);
    expect(r.invisibleTotal).toBeGreaterThan(0);
    expect(r.ok).toBe(false);
  });

  it("重复键被报告", () => {
    const src = "a: 1\na: 2\n";
    const r = validateYaml(src);
    expect(r.errorCount).toBeGreaterThan(0);
    const all = r.parseErrors.map((e) => e.message).join(" ");
    // yaml 库的原文为 "Map keys must be unique"，这里同时兼容中英文表述
    expect(all).toMatch(/unique|duplicated|重复/i);
  });

  it("未闭合引号被报告", () => {
    const src = 'key: "unclosed\n';
    const r = validateYaml(src);
    expect(r.ok).toBe(false);
    expect(r.parseErrors.length).toBeGreaterThan(0);
  });

  it("空文本不崩溃", () => {
    const r = validateYaml("");
    expect(r.lineCount).toBe(0);
    expect(r.errorCount).toBe(0);
  });

  it("纯注释文件不崩溃", () => {
    const r = validateYaml("# 只有注释\n# 没有内容\n");
    // 两行注释 + 末尾换行产生的空行，与下方 lineCount 用例保持同一约定
    expect(r.lineCount).toBe(3);
    expect(r.errorCount).toBe(0);
  });

  it("lineCount 统计正确", () => {
    const r = validateYaml("a: 1\nb: 2\nc: 3\n");
    expect(r.lineCount).toBe(4); // 末尾换行产生一个空行
  });
});

describe("checkCompose Docker Compose 专项检查", () => {
  const run = (src) => {
    const r = validateYaml(src, { compose: true });
    return r.composeIssues;
  };

  it("缺少 services 顶层键时报错", () => {
    const issues = run("version: '3'\nservices2: {}\n");
    expect(issues.some((i) => i.message.includes("services"))).toBe(true);
  });

  it("services 拼写错误时给出提示", () => {
    const issues = run("service:\n  web:\n    image: nginx\n");
    const hit = issues.find((i) => i.message.includes("services"));
    expect(hit).toBeDefined();
    expect(hit.severity).toBe("error");
  });

  it("image 未指定 tag 时告警", () => {
    const issues = run("services:\n  web:\n    image: nginx\n");
    const hit = issues.find((i) => i.path.endsWith(".image"));
    expect(hit).toBeDefined();
    expect(hit.severity).toBe("warning");
    expect(hit.message).toContain("latest");
  });

  it("image 指定了 tag 时不告警", () => {
    const issues = run("services:\n  web:\n    image: nginx:1.27-alpine\n");
    expect(issues.find((i) => i.path.endsWith(".image"))).toBeUndefined();
  });

  it("image 使用 digest 时不告警", () => {
    const issues = run(
      "services:\n  web:\n    image: nginx@sha256:abc123\n",
    );
    expect(issues.find((i) => i.path.endsWith(".image"))).toBeUndefined();
  });

  it("相对路径挂载被告警", () => {
    const issues = run(
      "services:\n  web:\n    image: nginx:1.27\n    volumes:\n      - ./conf:/etc/nginx\n",
    );
    const hit = issues.find((i) => i.path.includes("volumes"));
    expect(hit).toBeDefined();
    expect(hit.message).toContain("相对路径");
  });

  it("绝对路径挂载不告警", () => {
    const issues = run(
      "services:\n  web:\n    image: nginx:1.27\n    volumes:\n      - /data/conf:/etc/nginx\n",
    );
    expect(issues.find((i) => i.path.includes("volumes"))).toBeUndefined();
  });

  it("命名卷不告警", () => {
    const issues = run(
      "services:\n  db:\n    image: postgres:16\n    volumes:\n      - dbdata:/var/lib/postgresql/data\n",
    );
    expect(issues.find((i) => i.path.includes("volumes"))).toBeUndefined();
  });

  it("depends_on 引用不存在的服务时报错", () => {
    const issues = run(
      "services:\n  web:\n    image: nginx:1.27\n    depends_on:\n      - db\n",
    );
    const hit = issues.find((i) => i.path.includes("depends_on"));
    expect(hit).toBeDefined();
    expect(hit.message).toContain("db");
  });

  it("depends_on 引用存在的服务时不报错", () => {
    const issues = run(
      [
        "services:",
        "  web:",
        "    image: nginx:1.27",
        "    depends_on:",
        "      - db",
        "  db:",
        "    image: postgres:16",
        "",
      ].join("\n"),
    );
    expect(issues.find((i) => i.path.includes("depends_on"))).toBeUndefined();
  });

  it("空的 services 给出告警", () => {
    const issues = run("services: {}\n");
    expect(issues.some((i) => i.severity === "warning")).toBe(true);
  });

  it("compose 选项关闭时不产生专项检查结果", () => {
    const r = validateYaml("service:\n  web:\n    image: nginx\n", {
      compose: false,
    });
    expect(r.composeIssues).toHaveLength(0);
  });
});

describe("RISKY_CHARS 表完整性", () => {
  it("每个条目都具备 name / severity / reason / fix", () => {
    for (const [code, info] of Object.entries(RISKY_CHARS)) {
      expect(info.name, `码位 ${code} 缺少 name`).toBeTruthy();
      expect(["error", "warning"]).toContain(info.severity);
      expect(info.reason, `码位 ${code} 缺少 reason`).toBeTruthy();
      expect(info.fix, `码位 ${code} 缺少 fix`).toBeTruthy();
    }
  });

  it("覆盖 Docker 场景中最常见的五类字符", () => {
    expect(RISKY_CHARS[0x0009]).toBeDefined(); // Tab
    expect(RISKY_CHARS[0x00a0]).toBeDefined(); // NBSP
    expect(RISKY_CHARS[0x200b]).toBeDefined(); // ZWSP
    expect(RISKY_CHARS[0x3000]).toBeDefined(); // 全角空格
    expect(RISKY_CHARS[0xfeff]).toBeDefined(); // BOM
  });
});

describe("真实故障场景回归", () => {
  it("从网页复制粘贴的 Compose 片段能被定位并修复", () => {
    // 模拟：缩进用了 NBSP，冒号是全角，还夹了零宽空格
    const dirty = [
      `services${FULLWIDTH_COLON}`,
      `${NBSP}web:`,
      `${NBSP}${NBSP}image${FULLWIDTH_COLON} nginx${ZWSP}:1.27`,
      "",
    ].join("\n");

    const before = validateYaml(dirty);
    expect(before.ok).toBe(false);
    // 至少能定位到 NBSP、全角冒号、零宽空格
    const codes = before.invisible.map((i) => i.codePoint);
    expect(codes).toContain(0x00a0);
    expect(codes).toContain(0xff1a);
    expect(codes).toContain(0x200b);

    const fixed = fixRiskyChars(dirty);
    const after = validateYaml(fixed.text);
    expect(after.invisibleTotal).toBe(0);
    expect(after.parseErrors).toHaveLength(0);
  });

  it("每个问题都带有可读的中文原因与修复建议", () => {
    const { issues } = scanInvisibleChars(`a:${NBSP}1\n`);
    expect(issues[0].reason).toMatch(/[\u4e00-\u9fa5]/);
    expect(issues[0].fix).toMatch(/[\u4e00-\u9fa5]/);
  });
});
