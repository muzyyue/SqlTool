/**
 * 版本号单一来源
 *
 * 版本号过去在「关于」面板、顶部导航、页脚各写一份，且已与实际脱节
 * （面板写 2.0.0，package.json 是 1.5.86）。现在统一从 package.json 经
 * vite define 注入为 __APP_VERSION__。
 *
 * 这里守护两件事：
 *   1. 各处不再出现硬编码的版本字符串；
 *   2. vite / vitest / eslint 三处都定义了该全局常量，
 *      缺任何一处都会在构建或检查时失败。
 */
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(__dirname, "../..");
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), "utf8");

const pkg = JSON.parse(read("package.json"));

/** 需要展示版本号的组件 */
const COMPONENTS = [
  "src/components/Layout/AboutPanel.vue",
  "src/components/Layout/MainLayout.vue",
];

describe("版本号来源", () => {
  it("组件使用 __APP_VERSION__ 而非硬编码", () => {
    for (const file of COMPONENTS) {
      const src = read(file);
      expect(src, `${file} 应引用 __APP_VERSION__`).toContain("__APP_VERSION__");
    }
  });

  it("组件中不再出现旧的硬编码版本号", () => {
    for (const file of COMPONENTS) {
      const src = read(file);
      // 排除注释中的说明文字
      const withoutComments = src
        .replace(/<!--[\s\S]*?-->/g, "")
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/\/\/.*$/gm, "");
      expect(withoutComments, `${file} 仍含 2.0.0`).not.toMatch(/\b2\.0\.0\b/);
      expect(withoutComments, `${file} 仍含 v2.0`).not.toMatch(/v2\.0\b/);
    }
  });

  it("构建配置注入了版本号", () => {
    const src = read("vite.config.js");
    expect(src).toContain("__APP_VERSION__");
    expect(src).toContain("pkg.version");
  });

  it("测试配置同样注入，否则引用处会 ReferenceError", () => {
    const src = read("test/config/vitest.config.js");
    expect(src).toContain("__APP_VERSION__");
  });

  it("ESLint 声明了该全局，否则 no-undef 报错", () => {
    const src = read("eslint.config.js");
    expect(src).toContain("__APP_VERSION__");
  });

  it("package.json 版本号格式合法", () => {
    expect(pkg.version).toMatch(/^\d+\.\d+\.\d+$/);
  });
});
