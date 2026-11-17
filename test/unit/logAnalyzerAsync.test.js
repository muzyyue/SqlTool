/**
 * 分批日志解析
 *
 * 大文件的两个真实问题：
 *   1. 同步解析期间主线程被独占，界面无反馈（看起来像卡死）
 *   2. 一次渲染十几万条会拖垮浏览器
 *
 * analyzeLogTextAsync 解决第 1 个：分片执行 + 进度回调 + 可取消。
 * 第 2 个在页面里用渲染上限解决。这里重点保证：
 *   分批结果必须与同步版本完全一致，否则优化就变成了改语义。
 */
import { describe, it, expect } from "vitest";
import { analyzeLogText } from "@/utils/log/logErrorExtractor";
import { analyzeLogTextAsync } from "@/utils/log/logAnalyzerAsync";

/** 构造含多行堆栈的日志 */
function makeLog(count) {
  const levels = ["INFO", "ERROR", "WARN", "ERRO", "DEBUG"];
  const out = [];
  for (let i = 0; i < count; i++) {
    const lv = levels[i % levels.length];
    out.push(
      `2026-09-28T10:54:06.369+08:00 [${lv}] {a1b2c3} request ${i} failed with timeout`,
    );
    if (i % 10 === 0) out.push(`\tat com.example.S${i}(S.java:${i})`);
  }
  return out.join("\n");
}

describe("analyzeLogTextAsync 与同步版一致", () => {
  const text = makeLog(5000);

  it("默认选项结果相同", async () => {
    const sync = analyzeLogText(text, {});
    const asyn = await analyzeLogTextAsync(text, {});
    expect(asyn.parsedCount).toBe(sync.parsedCount);
    expect(asyn.entries.length).toBe(sync.entries.length);
    expect(asyn.stats).toEqual(sync.stats);
  });

  it("includeWarn 结果相同", async () => {
    const sync = analyzeLogText(text, { includeWarn: true });
    const asyn = await analyzeLogTextAsync(text, { includeWarn: true });
    expect(asyn.entries.length).toBe(sync.entries.length);
    expect(asyn.stats.levels).toEqual(sync.stats.levels);
  });

  it("grep 过滤结果相同", async () => {
    const sync = analyzeLogText(text, { grep: "timeout" });
    const asyn = await analyzeLogTextAsync(text, { grep: "timeout" });
    expect(asyn.entries.length).toBe(sync.entries.length);
  });

  it("tail 结果相同", async () => {
    const sync = analyzeLogText(text, { tail: 10 });
    const asyn = await analyzeLogTextAsync(text, { tail: 10 });
    expect(asyn.entries.length).toBe(sync.entries.length);
    expect(asyn.entries[0].timestamp).toBe(sync.entries[0].timestamp);
  });

  it("指定 levels 结果相同", async () => {
    const opts = { levels: ["FATAL", "CRITICAL"] };
    const sync = analyzeLogText(text, opts);
    const asyn = await analyzeLogTextAsync(text, opts);
    expect(asyn.entries.length).toBe(sync.entries.length);
  });

  it("跨批次边界的条目不会丢失或被截断", async () => {
    // 用很小的批次，强制在条目中间切分
    const asyn = await analyzeLogTextAsync(text, { batchLines: 7 });
    const sync = analyzeLogText(text, {});
    expect(asyn.parsedCount).toBe(sync.parsedCount);
    expect(asyn.entries.length).toBe(sync.entries.length);
  });

  it("堆栈行正确归属前一条日志", async () => {
    const src = [
      "2026-09-28T10:54:06.369+08:00 [ERROR] {abc} boom",
      "\tat A.method(A.java:1)",
      "\tat B.method(B.java:2)",
      "2026-09-28T10:54:07.369+08:00 [INFO] {def} ok",
    ].join("\n");
    const asyn = await analyzeLogTextAsync(src, { batchLines: 2 });
    expect(asyn.entries).toHaveLength(1);
    expect(asyn.entries[0].lines).toHaveLength(3);
  });
});

describe("进度回调", () => {
  it("会报告解析进度且百分比单调不减", async () => {
    const seen = [];
    await analyzeLogTextAsync(makeLog(3000), {
      batchLines: 200,
      onProgress: (p) => seen.push(p),
    });

    expect(seen.length).toBeGreaterThan(1);
    const percents = seen.map((p) => p.percent);
    for (let i = 1; i < percents.length; i++) {
      expect(percents[i]).toBeGreaterThanOrEqual(percents[i - 1]);
    }
    // 阶段覆盖
    const stages = new Set(seen.map((p) => p.stage));
    expect(stages.has("parse")).toBe(true);
    expect(stages.has("done")).toBe(true);
  });

  it("进度详情包含已完成行数", async () => {
    const seen = [];
    await analyzeLogTextAsync(makeLog(2000), {
      batchLines: 500,
      onProgress: (p) => seen.push(p),
    });
    const parseSteps = seen.filter((p) => p.stage === "parse");
    expect(parseSteps.length).toBeGreaterThan(0);
    expect(parseSteps[0].detail).toMatch(/已解析/);
  });

  it("未传 onProgress 时不报错", async () => {
    await expect(analyzeLogTextAsync(makeLog(100))).resolves.toBeTruthy();
  });
});

describe("取消", () => {
  it("已取消的 signal 会立即抛 AbortError", async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(
      analyzeLogTextAsync(makeLog(1000), { signal: controller.signal }),
    ).rejects.toMatchObject({ name: "AbortError" });
  });

  it("解析中途取消会停止并抛 AbortError", async () => {
    const controller = new AbortController();
    const p = analyzeLogTextAsync(makeLog(50000), {
      batchLines: 200,
      signal: controller.signal,
      onProgress: (prog) => {
        // 第一批之后取消
        if (prog.stage === "parse" && prog.percent > 0) controller.abort();
      },
    });
    await expect(p).rejects.toMatchObject({ name: "AbortError" });
  });
});

describe("边界输入", () => {
  it("空字符串返回空结果", async () => {
    const r = await analyzeLogTextAsync("");
    expect(r.parsedCount).toBe(0);
    expect(r.entries).toHaveLength(0);
    expect(r.stats.total).toBe(0);
  });

  it("只有堆栈没有日志头时不产生条目", async () => {
    const r = await analyzeLogTextAsync("\tat A.b(A.java:1)\n\tat C.d(C.java:2)");
    expect(r.parsedCount).toBe(0);
  });

  it("不支持流式 file 时的读取降级由页面处理，这里只保证文本解析稳定", async () => {
    const r = await analyzeLogTextAsync("2026-09-28 10:54:06 ERROR boom");
    expect(r.entries).toHaveLength(1);
  });
});
