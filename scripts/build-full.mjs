/**
 * 完整构建脚本（开启 tree-shaking）
 *
 * 为什么需要独立脚本：`FOO=1 cmd` 这种写法只在 POSIX shell 有效，
 * 在 Windows 的 cmd/PowerShell 下会直接报错。用 Node 设置 env 可跨平台。
 *
 * 与 `pnpm run build` 的区别（实测于 Node 20.19.0）：
 *   - build      : treeshake 关闭，约 32 秒，产物约 7.08 MB
 *   - build:full : treeshake 开启，约 8 分 8 秒，产物约 6.00 MB
 *
 * Node 24 下 tree-shaking 会因 Rollup 递归栈溢出失败，请使用 .nvmrc 中的版本。
 */
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const viteBin = path.join(root, "node_modules/vite/bin/vite.js");

const child = spawn(
  process.execPath,
  [
    // tree-shaking 期间 Rollup 的调用参数推导会深度递归，
    // 默认 V8 栈（约 984 KB）在 Node 20.19.0 下仍会 "Maximum call stack size exceeded"。
    // 实测需 8000 左右才能完成；CI 与本地都必须走这条，否则发布流程卡在构建步骤。
    "--stack-size=8000",
    "--max-old-space-size=6144",
    viteBin,
    "build",
  ],
  {
    cwd: root,
    stdio: "inherit",
    env: { ...process.env, FULL_BUILD: "1" },
  },
);

child.on("exit", (code, signal) => {
  if (signal) {
    console.error(`构建被信号 ${signal} 终止`);
    process.exit(1);
  }
  process.exit(code ?? 1);
});
