/**
 * GitHub Actions 工作流结构自检
 *
 * 用途：合并 workflow 或调整触发条件后，快速确认关键行为没有被改坏。
 * 这些断言覆盖的是「容易写错但 CI 不会立刻报错」的地方，
 * 例如 PR 时误触发构建、deploy 误在 PR 上跑、release 依赖提交消息关键字等。
 *
 * 运行：node scripts/check-workflow.mjs
 */
import fs from "node:fs";
import { parse } from "yaml";

const FILE = ".github/workflows/build.yml";
const text = fs.readFileSync(FILE, "utf8");
const wf = parse(text);
const checks = [];

const buildSteps = wf.jobs.build.steps;

// 1. 触发器
for (const t of ["push", "pull_request", "workflow_dispatch"]) {
  checks.push([`触发器含 ${t}`, t in wf.on]);
}
checks.push(["push 含标签 v*.*.*", wf.on.push.tags.includes("v*.*.*")]);

// 2. PR 只跑 lint 与单测：构建与产物步骤必须带 pull_request 排除条件
for (const name of [
  "Build project",
  "Archive build files",
  "Upload build artifact (zip)",
  "Upload build artifact (directory)",
]) {
  const step = buildSteps.find((s) => s.name === name);
  checks.push([`PR 跳过: ${name}`, !!step && String(step.if).includes("pull_request")]);
}

for (const name of ["Lint", "Unit tests"]) {
  const step = buildSteps.find((s) => s.name === name);
  checks.push([`PR 执行: ${name}`, !!step && step.if === undefined]);
}

// 3. release 无条件发布，不依赖提交消息关键字
checks.push(["release 不依赖 Deploy 关键字", !wf.jobs.release.if.includes("Deploy")]);
checks.push(["release 覆盖 master", wf.jobs.release.if.includes("refs/heads/master")]);
checks.push(["release 覆盖标签", wf.jobs.release.if.includes("refs/tags/v")]);

// 4. deploy 只在 Deploy 关键字或手动勾选时执行
checks.push(["deploy 依赖 Deploy 关键字", wf.jobs.deploy.if.includes("Deploy")]);
checks.push(["deploy 支持手动触发", wf.jobs.deploy.if.includes("workflow_dispatch")]);
checks.push(["deploy 不在 PR 触发", !wf.jobs.deploy.if.includes("pull_request")]);

// 5. 权限按 job 分离
checks.push(["release 有 contents:write", wf.jobs.release.permissions?.contents === "write"]);
checks.push(["deploy 有 pages:write", wf.jobs.deploy.permissions?.pages === "write"]);
checks.push(["deploy 有 id-token:write", wf.jobs.deploy.permissions?.["id-token"] === "write"]);

// 6. 产物只构建一次
checks.push(["release needs build", wf.jobs.release.needs === "build"]);
checks.push(["deploy needs build", wf.jobs.deploy.needs === "build"]);
const buildRuns = buildSteps.filter((s) => s.run?.includes("build:full"));
checks.push(["构建命令只出现一次", buildRuns.length === 1]);

// 7. 重复发布防护：tag 已存在时不得覆盖旧产物
const releaseSteps = wf.jobs.release.steps;
const tagCheck = releaseSteps.find((s) => s.id === "tag_check");
checks.push(["release 有 tag 存在性检查", !!tagCheck]);
checks.push([
  "tag 检查查询 git/ref/tags",
  !!tagCheck && String(tagCheck.run).includes("/git/ref/tags/"),
]);
checks.push([
  "tag 已存在时跳过下载产物",
  releaseSteps.find((s) => s.name === "Download build artifact")?.if ===
    "steps.tag_check.outputs.exists == 'false'",
]);
checks.push([
  "tag 已存在时跳过创建 Release",
  releaseSteps.find((s) => s.name === "Create GitHub Release")?.if ===
    "steps.tag_check.outputs.exists == 'false'",
]);
checks.push([
  "查询失败时不按可用处理（避免误覆盖）",
  !!tagCheck && String(tagCheck.run).includes("*)") && String(tagCheck.run).includes("exists=true"),
]);

let failed = 0;
for (const [label, ok] of checks) {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}`);
  if (!ok) failed++;
}
console.log(`\n${checks.length - failed}/${checks.length} passed`);
process.exit(failed ? 1 : 0);
