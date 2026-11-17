import { analyzeLogText } from "../src/utils/log/logErrorExtractor.js";
import { analyzeLogTextAsync } from "../src/utils/log/logAnalyzerAsync.js";

function makeLog(targetMB) {
  const target = targetMB * 1024 * 1024;
  const lines = [];
  let size = 0;
  let i = 0;
  const levels = ["INFO", "INFO", "INFO", "DEBUG", "ERROR", "WARN", "ERRO"];
  while (size < target) {
    const lv = levels[i % levels.length];
    const line =
      `2026-09-28T10:54:06.369+08:00 [${lv}] {a1b2c3d4} ` +
      `request id=${i} path=/api/v1/resource/${i % 500} ` +
      `msg=some message text here that is reasonably long to simulate real logs`;
    lines.push(line);
    size += line.length + 1;
    i++;
    if (i % 50 === 0) {
      for (let s = 0; s < 3; s++) {
        const stack = `\tat com.example.Service.method${s}(Service.java:${100 + s})`;
        lines.push(stack);
        size += stack.length + 1;
      }
    }
  }
  return lines.join("\n");
}

const mb = Number(process.argv[2] ?? 100);
const text = makeLog(mb);
console.log(`日志: ${(Buffer.byteLength(text) / 1024 / 1024).toFixed(1)} MB，${text.split("\n").length.toLocaleString()} 行`);

const t0 = Date.now();
analyzeLogText(text, {});
console.log(`同步版 analyzeLogText : ${Date.now() - t0} ms`);

let lastPercent = -1;
let reports = 0;
const t1 = Date.now();
const res = await analyzeLogTextAsync(text, {
  onProgress: (p) => {
    reports++;
    lastPercent = p.percent;
  },
});
const elapsed = Date.now() - t1;
console.log(`异步版 analyzeAsync  : ${elapsed} ms（进度回调 ${reports} 次，最终 ${lastPercent}%）`);
console.log(`  解析条目 ${res.parsedCount.toLocaleString()}，错误 ${res.entries.length.toLocaleString()}`);
console.log(`  堆内存 ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(0)} MB`);
