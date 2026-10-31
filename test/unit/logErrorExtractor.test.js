/**
 * 日志错误提取引擎单元测试（移植自 tjlog.py）
 */

import { describe, it, expect } from "vitest";
import {
  splitLogEntries,
  classifyError,
  getSummary,
  getDetailLines,
  buildStats,
  analyzeLogText,
  renderReportText,
} from "@/utils/log/logErrorExtractor";

const LOG_SAMPLE = [
  "2026-09-28T10:54:06.369+08:00 [INFO] {a1b2c3} 服务启动成功",
  "2026-09-28T10:54:07.000+08:00 [ERRO] {deadbeef} connection refused: dial tcp 10.0.0.1:3306",
  "Stack:",
  "1.  pkg.dial",
  "    /path/file.go:42",
  "2026-09-28T10:55:00.000+08:00 [WARN] {cafe} slow query 2.1s",
  "2026-09-28 10:56:00 ERROR timeout waiting for response",
  "2026-09-28T10:56:30.000+08:00 [FATAL] panic: runtime error: invalid memory address",
].join("\n");

describe("logErrorExtractor", () => {
  describe("splitLogEntries", () => {
    it("按格式 A/B 识别条目并把多行堆栈归到前一条", () => {
      const entries = splitLogEntries(LOG_SAMPLE.split("\n"));
      expect(entries).toHaveLength(5);
      const erro = entries.find((e) => e.level === "ERRO");
      expect(erro.lines).toHaveLength(4); // 含 Stack 与两行栈帧
    });

    it("跳过空行且忽略开头无时间戳的散落行", () => {
      const entries = splitLogEntries(["孤儿行", "", "2026-09-28T10:54:06.369+08:00 [INFO] ok"]);
      expect(entries).toHaveLength(1);
      expect(entries[0].lines).toHaveLength(1);
    });
  });

  describe("classifyError", () => {
    it("按优先级匹配超时类型", () => {
      const entries = splitLogEntries(LOG_SAMPLE.split("\n"));
      const timeout = entries.find((e) => e.level === "ERROR");
      expect(classifyError(timeout)).toBe("超时 (Timeout)");
    });

    it("匹配连接错误类型", () => {
      const entries = splitLogEntries(LOG_SAMPLE.split("\n"));
      const erro = entries.find((e) => e.level === "ERRO");
      expect(classifyError(erro)).toBe("连接错误 (Connection)");
    });

    it("匹配未捕获异常/Panic", () => {
      const entries = splitLogEntries(LOG_SAMPLE.split("\n"));
      const fatal = entries.find((e) => e.level === "FATAL");
      expect(classifyError(fatal)).toBe("未捕获异常/Panic");
    });

    it("未命中任何规则时归为其他", () => {
      const entry = { lines: ["something completely unknown"] };
      expect(classifyError(entry)).toBe("其他 (Other)");
    });
  });

  describe("getSummary / getDetailLines", () => {
    it("去掉 traceId 保留消息主体", () => {
      const entry = {
        lines: ["2026-09-28T10:54:07.000+08:00 [ERRO] {deadbeef} boom"],
      };
      expect(getSummary(entry)).toBe("boom");
      expect(getDetailLines(entry)).toEqual(["boom"]);
    });

    it("超长消息截断并加省略号", () => {
      const long = "x".repeat(260);
      const entry = { lines: [`2026-09-28T10:54:07.000+08:00 [ERRO] {abc} ${long}`] };
      const summary = getSummary(entry, 200);
      expect(summary.length).toBe(204); // 200 + " ..."
      expect(summary.endsWith(" ...")).toBe(true);
    });
  });

  describe("analyzeLogText", () => {
    it("默认只提取错误级别，不含 WARN/INFO", () => {
      const { entries, stats } = analyzeLogText(LOG_SAMPLE);
      expect(entries.map((e) => e.level)).toEqual(["ERRO", "ERROR", "FATAL"]);
      expect(stats.total).toBe(5);
      expect(stats.errorCount).toBe(3);
      expect(stats.errorRate).toBeCloseTo(60, 1);
    });

    it("includeWarn 时纳入 WARN", () => {
      const { entries } = analyzeLogText(LOG_SAMPLE, { includeWarn: true });
      expect(entries.some((e) => e.level === "WARN")).toBe(true);
    });

    it("levels 指定级别时覆盖默认集合", () => {
      const { entries } = analyzeLogText(LOG_SAMPLE, { levels: ["FATAL"] });
      expect(entries).toHaveLength(1);
      expect(entries[0].level).toBe("FATAL");
    });

    it("grep 在已提取结果中再过滤（大小写不敏感）", () => {
      const { entries } = analyzeLogText(LOG_SAMPLE, { grep: "TIMEOUT" });
      expect(entries).toHaveLength(1);
      expect(entries[0].level).toBe("ERROR");
    });

    it("tail 只保留最后 N 条", () => {
      const { entries } = analyzeLogText(LOG_SAMPLE, { tail: 1 });
      expect(entries).toHaveLength(1);
      expect(entries[0].level).toBe("FATAL");
    });

    it("无错误时返回空结果且占比为 0", () => {
      const { entries, stats } = analyzeLogText(
        "2026-09-28T10:54:06.369+08:00 [INFO] all good",
      );
      expect(entries).toEqual([]);
      expect(stats.total).toBe(1);
      expect(stats.errorRate).toBe(0);
    });

    it("统计包含级别、类型与时间分布", () => {
      const { stats } = analyzeLogText(LOG_SAMPLE);
      expect(stats.levels.map((l) => l.name)).toEqual(["ERRO", "ERROR", "FATAL"]);
      expect(stats.types.length).toBeGreaterThan(0);
      expect(stats.types[0].percent).toBeGreaterThan(0);
      expect(stats.times.length).toBeGreaterThan(0);
    });
  });

  describe("renderReportText", () => {
    it("输出编号、时间戳与级别的报告头", () => {
      const res = analyzeLogText(LOG_SAMPLE);
      const text = renderReportText(res, false);
      expect(text).toContain("[001] 2026-09-28T10:54:07.000+08:00  [ERRO]");
      expect(text).not.toContain("错误类型分布");
    });

    it("带统计时包含占比与类型分布标题", () => {
      const text = renderReportText(analyzeLogText(LOG_SAMPLE), true);
      expect(text).toContain("【错误级别分布】");
      expect(text).toContain("【错误类型分布】");
      expect(text).toContain("错误占比");
    });
  });
});
