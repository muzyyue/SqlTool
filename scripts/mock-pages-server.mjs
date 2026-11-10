/**
 * 模拟 GitHub Pages 的静态托管行为，用于端到端验证深链接回退
 *
 * 与 vite preview 的区别：Pages 对不存在的路径返回 404.html（状态码 404），
 * 而 vite preview 有 historyApiFallback，会直接返回 index.html，测不出真实问题。
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.join(process.cwd(), "dist");
const PORT = Number(process.argv[2] ?? 8037);
const BASE = "/SqlTool";

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".ico": "image/x-icon",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".json": "application/json",
};

const server = http.createServer((req, res) => {
  const url = new URL(req.url, "http://localhost");
  let pathname = decodeURIComponent(url.pathname);

  // 去掉 base 前缀
  if (pathname === BASE) pathname = "/";
  else if (pathname.startsWith(BASE + "/")) pathname = pathname.slice(BASE.length);

  let filePath = path.join(ROOT, pathname);
  if (pathname === "/" || pathname === "") filePath = path.join(ROOT, "index.html");

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath);
    res.writeHead(200, { "Content-Type": MIME[ext] ?? "application/octet-stream" });
    fs.createReadStream(filePath).pipe(res);
    return;
  }

  // 关键：模拟 Pages —— 不存在的路径返回 404.html，状态码 404
  const fallback = path.join(ROOT, "404.html");
  res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
  fs.createReadStream(fallback).pipe(res);
});

server.listen(PORT, () => {
  console.log(`Pages 模拟服务器: http://localhost:${PORT}${BASE}/`);
});
