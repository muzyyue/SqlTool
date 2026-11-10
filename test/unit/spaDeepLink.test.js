/**
 * GitHub Pages 深链接回退
 *
 * Pages 是静态托管，直接访问 /SqlTool/tools/xxx 会 404。方案：构建时生成
 * 404.html，把原路径写入 sessionStorage 并跳到 /SqlTool/?p=…；应用启动时
 * restoreDeepLink() 还原 URL。
 *
 * 这里直接测试 src/utils/spaFallback.js 的真实实现，并校验构建产物中的
 * 404.html，而不是在测试里重写一遍逻辑。
 */
import { describe, it, expect, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { restoreDeepLink } from "@/utils/spaFallback";

const ROOT = path.resolve(__dirname, "../..");

/** 构造一个可控的浏览器环境 */
function makeEnv({ url = "/SqlTool/", storage = null, storageThrows = false } = {}) {
  const replaced = [];
  const parsed = new URL(url, "https://example.com");
  const win = {
    location: {
      search: parsed.search,
      pathname: parsed.pathname,
      hash: parsed.hash,
    },
    history: { replaceState: (_s, _t, target) => replaced.push(target) },
    sessionStorage: {
      getItem: (k) => {
        if (storageThrows) throw new Error("QuotaExceededError");
        return k === "spa-redirect" ? storage : null;
      },
      removeItem: vi.fn(),
      setItem: vi.fn(),
    },
  };
  return { win, replaced };
}

describe("restoreDeepLink", () => {
  it("从 sessionStorage 还原路径", () => {
    const { win, replaced } = makeEnv({
      url: "/SqlTool/",
      storage: "?p=" + encodeURIComponent("/SqlTool/tools/loganalyzer"),
    });
    expect(restoreDeepLink({ window: win, URLSearchParams })).toBe(true);
    expect(replaced).toEqual(["/SqlTool/tools/loganalyzer"]);
  });

  it("sessionStorage 为空时退回查询参数", () => {
    const { win, replaced } = makeEnv({
      url:
        "/SqlTool/?p=" + encodeURIComponent("/SqlTool/tools/yamlvalidator"),
    });
    expect(restoreDeepLink({ window: win, URLSearchParams })).toBe(true);
    expect(replaced).toEqual(["/SqlTool/tools/yamlvalidator"]);
  });

  it("还原后清除 sessionStorage，避免影响后续导航", () => {
    const { win } = makeEnv({
      url: "/SqlTool/",
      storage: "?p=" + encodeURIComponent("/SqlTool/tools/uuid"),
    });
    restoreDeepLink({ window: win, URLSearchParams });
    expect(win.sessionStorage.removeItem).toHaveBeenCalledWith("spa-redirect");
  });

  it("保留查询参数与 hash", () => {
    const target = "/SqlTool/tools/loganalyzer?tab=2#result";
    const { win, replaced } = makeEnv({
      url: "/SqlTool/",
      storage: "?p=" + encodeURIComponent(target),
    });
    restoreDeepLink({ window: win, URLSearchParams });
    expect(replaced).toEqual([target]);
  });

  it("正常访问时不做任何改动", () => {
    const { win, replaced } = makeEnv({ url: "/SqlTool/" });
    expect(restoreDeepLink({ window: win, URLSearchParams })).toBe(false);
    expect(replaced).toEqual([]);
  });

  it("拒绝站外地址（防开放重定向）", () => {
    const { win, replaced } = makeEnv({
      url:
        "/SqlTool/?p=" + encodeURIComponent("https://evil.example.com/phish"),
    });
    expect(restoreDeepLink({ window: win, URLSearchParams })).toBe(false);
    expect(replaced).toEqual([]);
  });

  it("拒绝协议相对地址 //evil.com", () => {
    const { win, replaced } = makeEnv({
      url: "/SqlTool/?p=" + encodeURIComponent("//evil.com"),
    });
    expect(restoreDeepLink({ window: win, URLSearchParams })).toBe(false);
    expect(replaced).toEqual([]);
  });

  it("拒绝形似但越界的路径（/SqlTool-evil/）", () => {
    const { win, replaced } = makeEnv({
      url: "/SqlTool/?p=" + encodeURIComponent("/SqlTool-evil/x"),
    });
    expect(restoreDeepLink({ window: win, URLSearchParams })).toBe(false);
    expect(replaced).toEqual([]);
  });

  it("sessionStorage 抛异常时仍能用查询参数还原", () => {
    const { win, replaced } = makeEnv({
      url: "/SqlTool/?p=" + encodeURIComponent("/SqlTool/tools/uuid"),
      storageThrows: true,
    });
    expect(restoreDeepLink({ window: win, URLSearchParams })).toBe(true);
    expect(replaced).toEqual(["/SqlTool/tools/uuid"]);
  });

  it("无 window 环境时安全返回 false（SSR / 测试环境）", () => {
    expect(restoreDeepLink({ window: null, URLSearchParams })).toBe(false);
  });
});

describe("构建产物 404.html", () => {
  const distHtml = path.join(ROOT, "dist/404.html");

  it("存在且脚本闭合、跳转目标正确", () => {
    if (!fs.existsSync(distHtml)) return; // 未构建时跳过
    const html = fs.readFileSync(distHtml, "utf8");
    expect(html).toContain("spa-redirect");
    expect(html).toContain('location.replace("/SqlTool/?p="');
    const opens = (html.match(/<script/g) ?? []).length;
    const closes = (html.match(/<\/script>/g) ?? []).length;
    expect(closes).toBe(opens);
  });

  it("404.html 与 spaFallback 使用同一个 storage key", () => {
    if (!fs.existsSync(distHtml)) return;
    const html = fs.readFileSync(distHtml, "utf8");
    const src = fs.readFileSync(
      path.join(ROOT, "src/utils/spaFallback.js"),
      "utf8",
    );
    // 两端各写一次 key，必须一致，否则还原会失效
    expect(html).toContain('"spa-redirect"');
    expect(src).toContain('"spa-redirect"');
  });
});

describe("还原时机", () => {
  it("router 中 restoreDeepLink 必须早于 createWebHistory", () => {
    // createWebHistory 在构造时就读取 window.location 定下初始路由；
    // 若还原晚于它，URL 会停在 ?p=… 且页面停留在首页（实测过）。
    const src = fs.readFileSync(path.join(ROOT, "src/router/index.js"), "utf8");
    const restoreAt = src.indexOf("restoreDeepLink()");
    const historyAt = src.indexOf("createWebHistory(import.meta.env.BASE_URL)");
    expect(restoreAt).toBeGreaterThan(-1);
    expect(historyAt).toBeGreaterThan(-1);
    expect(restoreAt).toBeLessThan(historyAt);
  });

  it("main.js 不再重复调用（避免产生误导）", () => {
    const src = fs.readFileSync(path.join(ROOT, "src/main.js"), "utf8");
    expect(src).not.toContain("restoreDeepLink(");
  });
});
