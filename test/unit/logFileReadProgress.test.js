/**
 * 大文件读取的进度反馈
 *
 * 曾经的实现用 message.loading 逐块刷新提示（先销毁旧的再弹新的），
 * 100MB 文件会连续弹出几百条 toast，观感极差。现在改为页面内进度卡片，
 * 这里是防止回退的守护测试。
 */
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(__dirname, "../..");
const PAGE = fs.readFileSync(
  path.join(ROOT, "src/views/tools/LogAnalyzerPage.vue"),
  "utf8",
);

/** 去掉注释，避免把注释里提到的 API 名误判为实际调用 */
function stripComments(src) {
  return src
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^[ \t]*\/\/.*$/gm, "");
}

const PAGE_CODE = stripComments(PAGE);

describe("读取进度不再刷 toast", () => {
  it("不在进度回调里调用 message.loading", () => {
    // 关键：进度回调中若出现 message.loading，就会随每个 chunk 弹一次
    const readSection = PAGE_CODE.slice(
      PAGE_CODE.indexOf("const handleFileRead"),
      PAGE_CODE.indexOf("async function readFileWithProgress"),
    );
    expect(readSection).not.toContain("message.loading");
  });

  it("整个页面都不再用 message.loading 显示进度", () => {
    expect(PAGE_CODE).not.toContain("message.loading");
  });

  it("进度信息写入页面内的 progress 状态", () => {
    expect(PAGE).toContain("progress.percent");
    expect(PAGE).toContain("progress.detail");
    expect(PAGE).toContain("progress.stage");
  });

  it("读取与解析共用同一块进度区域", () => {
    expect(PAGE).toContain("const busy = computed");
    // 模板里用 busy 控制显示，而不是只有 analyzing
    expect(PAGE).toContain('v-if="busy"');
  });

  it("只渲染一块进度卡片，避免重复", () => {
    const matches = PAGE.match(/class="progress-card"/g) ?? [];
    expect(matches).toHaveLength(1);
  });
});

describe("小文件不显示进度卡片", () => {
  it("存在按文件大小决定是否展示的阈值", () => {
    expect(PAGE).toMatch(/showProgress\s*=\s*file\.size\s*>\s*2\s*\*\s*1024\s*\*\s*1024/);
    expect(PAGE).toContain("loading.value = showProgress");
  });
});

describe("取消", () => {
  it("支持取消文件读取，且 AbortError 不当作失败", () => {
    expect(PAGE).toContain("readController");
    expect(PAGE).toContain("AbortError");
  });

  it("读取流在取消时被释放", () => {
    // 避免持有文件句柄
    expect(PAGE).toContain("reader.cancel()");
  });
});
