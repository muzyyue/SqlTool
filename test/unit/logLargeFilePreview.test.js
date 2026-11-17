/**
 * 大文件预览与进度显示
 *
 * 低配机上传 30MB 日志导致页面无响应的根因有两个：
 *   1. 把 3000 万字符塞进 textarea，浏览器要布局整段文本；
 *   2. inputSizeText 每次渲染都 new Blob([text]).size（实测单次 19ms）。
 *
 * 另有一个观感问题：进度上传即显示 99%，因为 file.stream() 单次 read
 * 可能返回数 MB，加上 Math.min(99, …) 后第一次回调就接近满格。
 */
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(__dirname, "../..");
const PAGE = fs.readFileSync(
  path.join(ROOT, "src/views/tools/LogAnalyzerPage.vue"),
  "utf8",
);

function stripComments(src) {
  return src
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^[ \t]*\/\/.*$/gm, "");
}

const CODE = stripComments(PAGE);

describe("大文件不再整块塞进 textarea", () => {
  it("textarea 绑定的是 displayText 而非完整内容 inputText", () => {
    expect(CODE).toMatch(/v-model:value="displayText"/);
    expect(CODE).not.toMatch(/v-model:value="inputText"/);
  });

  it("存在预览阈值与预览行数常量", () => {
    expect(CODE).toMatch(/PREVIEW_THRESHOLD_BYTES\s*=\s*1024\s*\*\s*1024/);
    expect(CODE).toMatch(/PREVIEW_LINES\s*=\s*\d+/);
  });

  it("大文件只把前 PREVIEW_LINES 行交给 textarea", () => {
    expect(CODE).toContain("takeLines(text, PREVIEW_LINES)");
    expect(CODE).toContain("bigFile");
  });

  it("预览模式有提示，且 textarea 只读", () => {
    expect(CODE).toContain("isPreviewMode");
    expect(CODE).toContain(':readonly="isPreviewMode"');
    expect(CODE).toContain("preview-banner");
  });

  it("分析用的仍是完整内容 inputText", () => {
    // handleAnalyze 必须传全文，不能传预览
    expect(CODE).toContain("analyzeLogTextAsync(inputText.value");
  });
});

describe("避免大文本的重复计算", () => {
  it("inputSizeText 不再每次渲染都 new Blob", () => {
    const sizeSection = CODE.slice(
      CODE.indexOf("const inputSizeText"),
      CODE.indexOf("const inputSizeText") + 400,
    );
    expect(sizeSection).not.toContain("new Blob");
    // 改为读取缓存的字节数
    expect(CODE).toContain("const inputBytes = ref(0)");
  });

  it("行数统计不用 split 建数组", () => {
    expect(CODE).toContain("function countLines");
    // countLines 内部应逐字符扫描
    const fn = CODE.slice(
      CODE.indexOf("function countLines"),
      CODE.indexOf("function countLines") + 300,
    );
    expect(fn).toContain("charCodeAt");
    expect(fn).not.toContain("split");
  });

  it("预览截取不用 split", () => {
    const fn = CODE.slice(
      CODE.indexOf("function takeLines"),
      CODE.indexOf("function takeLines") + 400,
    );
    expect(fn).toContain("charCodeAt");
    expect(fn).not.toContain("split");
  });
});

describe("进度显示不再瞬间跳到 99%", () => {
  it("读取阶段有节流间隔", () => {
    expect(CODE).toMatch(/READ_PROGRESS_INTERVAL_MS\s*=\s*\d+/);
    expect(CODE).toContain("lastUpdate");
  });

  it("读取完成后补齐 100% 并提示准备预览", () => {
    expect(CODE).toContain("正在准备预览");
  });

  it("耗时操作前让出一帧，保证 UI 能刷新", () => {
    expect(CODE).toContain("yieldToMain");
    expect(CODE).toContain("return yieldToMain().then");
  });
});

describe("clearAll 同步清理预览相关状态", () => {
  it("清空时重置 displayText / inputBytes / totalLines", () => {
    const fn = CODE.slice(
      CODE.indexOf("function clearAll"),
      CODE.indexOf("function clearAll") + 500,
    );
    expect(fn).toContain('displayText.value = ""');
    expect(fn).toContain("inputBytes.value = 0");
    expect(fn).toContain("totalLines.value = 0");
  });
});
