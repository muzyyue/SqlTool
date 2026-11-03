import { execSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import YAML from "yaml";

// 从 workflow 中抽出真实的 shell 片段执行，验证分支行为。
// 不在测试里重新实现判断逻辑，否则测不到真实代码。

const wf = YAML.parse(fs.readFileSync(".github/workflows/build.yml", "utf8"));
const step = wf.jobs.release.steps.find((s) => s.id === "tag_check");
if (!step) {
  console.error("未找到 tag_check 步骤");
  process.exit(1);
}

// 把 curl 调用替换为可控桩，按 STUB_STATUS 返回指定 HTTP 码
const script = step.run.replace(
  /status=\$\(curl[\s\S]*?\)\n/,
  'status="${STUB_STATUS:-000}"\n',
);

const tmpDir = os.tmpdir();
const scriptPath = path.join(tmpDir, "tag-guard-under-test.sh");
fs.writeFileSync(scriptPath, script, "utf8");

/** Windows 路径转 WSL 挂载路径（C:\ → /mnt/c/） */
const toPosix = (p) => {
  if (process.platform !== "win32") return p;
  const normalized = p.replace(/\\/g, "/");
  return normalized.replace(/^([A-Za-z]):/, (_, d) => `/mnt/${d.toLowerCase()}`);
};

const scriptPosix = toPosix(scriptPath);

const runCase = (stubStatus) => {
  const outPath = path.join(tmpDir, `out-${stubStatus}.txt`);
  if (fs.existsSync(outPath)) fs.unlinkSync(outPath);
  // WSL 不完全继承 Windows 进程的环境变量，改为在 bash 命令内联赋值
  execSync(
    `bash -c 'STUB_STATUS=${stubStatus} VERSION=1.5.83 GITHUB_OUTPUT="${toPosix(outPath)}" bash "${scriptPosix}"'`,
    { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
  );
  if (!fs.existsSync(outPath)) return "(脚本未写输出)";
  const written = fs.readFileSync(outPath, "utf8");
  const m = /exists=(true|false)/.exec(written);
  return m?.[1] ?? `(无法解析: ${written.trim()})`;
};

const cases = [
  [404, "false", "tag 不存在 → 继续发布"],
  [200, "true", "tag 已存在 → 跳过"],
  [401, "true", "未授权 → 跳过"],
  [403, "true", "无权限/限流 → 跳过"],
  [500, "true", "服务端错误 → 跳过"],
  ["000", "true", "网络失败 → 跳过"],
];

let failed = 0;
for (const [status, expected, label] of cases) {
  let actual;
  try {
    actual = runCase(status);
  } catch (e) {
    actual = `异常: ${(e.stderr ?? e.message).split("\n")[0]}`;
  }
  const ok = actual === expected;
  if (!ok) failed++;
  console.log(
    `  ${ok ? "PASS" : "FAIL"}  HTTP ${String(status).padEnd(4)} exists=${actual}  ${label}`,
  );
}

console.log(`\n${cases.length - failed}/${cases.length} passed`);
process.exit(failed ? 1 : 0);
