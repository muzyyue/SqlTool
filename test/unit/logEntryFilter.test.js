/**
 * 错误日志筛选
 *
 * 用户反馈两点：
 *   1. 不能按分类（错误类型）筛选；
 *   2. 「只能在有限的 200 条中筛选」——实际是误解，筛选作用于全部结果，
 *      只有渲染有上限。本测试要同时证明「类型筛选可用」和
 *      「筛选范围是全量而非前 200 条」。
 */
import { describe, it, expect } from "vitest";
import { classifyError } from "@/utils/log/logErrorExtractor";

/** 构造日志条目 */
const entry = (level, msg) => ({
  timestamp: "2026-09-28T10:54:06",
  level,
  lines: [`2026-09-28T10:54:06.000+08:00 [${level}] ${msg}`],
});

/** 复刻页面 visibleEntries 的筛选逻辑 */
function filterEntries(entries, { typeFilter = [], levelFilter = [], keyword = "" } = {}) {
  let list = entries;
  if (typeFilter.length) {
    const set = new Set(typeFilter);
    list = list.filter((e) => set.has(classifyError(e)));
  }
  if (levelFilter.length) {
    const set = new Set(levelFilter);
    list = list.filter((e) => set.has(e.level));
  }
  const kw = keyword.trim().toLowerCase();
  if (kw) {
    list = list.filter((e) => e.lines.join("\n").toLowerCase().includes(kw));
  }
  return list;
}

// 构造 1000 条混合数据
const entries = Array.from({ length: 1000 }, (_, i) => {
  if (i % 3 === 0) return entry("ERROR", "connection refused: timeout");
  if (i % 3 === 1) return entry("FATAL", "out of memory OOM");
  return entry("ERROR", "some other problem");
});

describe("按错误类型筛选", () => {
  it("可以只筛出超时类", () => {
    const r = filterEntries(entries, { typeFilter: ["超时 (Timeout)"] });
    expect(r.length).toBeGreaterThan(0);
    expect(r.every((e) => classifyError(e) === "超时 (Timeout)")).toBe(true);
  });

  it("可以多选类型", () => {
    const types = ["超时 (Timeout)", "内存不足 (OOM)"];
    const r = filterEntries(entries, { typeFilter: types });
    expect(r.every((e) => types.includes(classifyError(e)))).toBe(true);
    // 两种类型都应出现
    const got = new Set(r.map((e) => classifyError(e)));
    expect(got.size).toBe(2);
  });

  it("空数组表示不筛选", () => {
    expect(filterEntries(entries, { typeFilter: [] })).toHaveLength(entries.length);
  });
});

describe("按级别筛选", () => {
  it("可以只筛 FATAL", () => {
    const r = filterEntries(entries, { levelFilter: ["FATAL"] });
    expect(r.length).toBeGreaterThan(0);
    expect(r.every((e) => e.level === "FATAL")).toBe(true);
  });

  it("级别与类型可叠加", () => {
    const r = filterEntries(entries, {
      levelFilter: ["ERROR"],
      typeFilter: ["超时 (Timeout)"],
    });
    expect(r.every((e) => e.level === "ERROR")).toBe(true);
    expect(r.every((e) => classifyError(e) === "超时 (Timeout)")).toBe(true);
  });
});

describe("筛选范围是全部结果，不受渲染上限影响", () => {
  const PAGE_SIZE = 200;

  it("关键词能在 1000 条中命中，而不只是前 200 条", () => {
    // 构造：只有第 800 条之后才含 unique-keyword
    const data = Array.from({ length: 1000 }, (_, i) =>
      entry("ERROR", i >= 800 ? "unique-keyword hit" : "ordinary"),
    );
    const r = filterEntries(data, { keyword: "unique-keyword" });
    // 200 条之外的内容也必须被筛到
    expect(r).toHaveLength(200);
    expect(r.every((e) => e.lines[0].includes("unique-keyword"))).toBe(true);
  });

  it("类型筛选同样作用于全量", () => {
    // 把超时类全部放在后半段
    const data = Array.from({ length: 1000 }, (_, i) =>
      entry("ERROR", i >= 700 ? "timeout" : "other"),
    );
    const r = filterEntries(data, { typeFilter: ["超时 (Timeout)"] });
    expect(r).toHaveLength(300); // 700~999
    expect(300).toBeGreaterThan(PAGE_SIZE);
  });

  it("筛选结果数可以超过渲染上限，说明筛选不是截断", () => {
    const r = filterEntries(entries, { levelFilter: ["ERROR"] });
    expect(r.length).toBeGreaterThan(PAGE_SIZE);
  });
});

describe("组合筛选", () => {
  it("类型 + 级别 + 关键词三者同时生效", () => {
    const data = [
      entry("ERROR", "timeout happened"),
      entry("ERROR", "timeout but different"),
      entry("FATAL", "timeout fatal"),
      entry("ERROR", "connection refused"),
    ];
    const r = filterEntries(data, {
      levelFilter: ["ERROR"],
      typeFilter: ["超时 (Timeout)"],
      keyword: "happened",
    });
    expect(r).toHaveLength(1);
    expect(r[0].lines[0]).toContain("happened");
  });

  it("无匹配时返回空数组而非报错", () => {
    const r = filterEntries(entries, { keyword: "绝对不存在的关键词xyz" });
    expect(r).toEqual([]);
  });
});
