import { fileURLToPath, URL } from "node:url";

import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import vueDevTools from "vite-plugin-vue-devtools";
import UnoCSS from "unocss/vite";

/**
 * tree-shaking 开关
 *
 * 背景：Node 24 + Rollup 7 组合下，tree-shaking 阶段会无限递归触发
 * "Maximum call stack size exceeded"，导致构建失败。Node 20.19.0 下可正常完成，
 * 但耗时会从约 30 秒增加到 8 分钟左右。
 *
 * 因此默认关闭（本地快速构建），通过 FULL_BUILD=1 开启（CI 发布用）。
 * 关闭时产物约 6.79 MB（gzip 1.66 MB），开启后约 5.72 MB（gzip 1.48 MB）。
 *
 * 注：Node 24 下即使开启 FULL_BUILD 也会失败，请用 .nvmrc 指定的版本。
 */
const fullBuild = process.env.FULL_BUILD === "1";

/**
 * 生成 404.html，修复 GitHub Pages 深链接 404
 *
 * Pages 是静态托管，没有服务端 rewrite：用户直接访问 /SqlTool/tools/xxx
 * 时会拿到 404。这里生成的 404.html 会把原始路径编码进 ?p= 参数，
 * 用 location.replace 跳回站点根路径，再由 index.html 里的脚本还原。
 *
 * 为什么不在 404.html 里直接渲染应用：
 *   Pages 对 404.html 返回的 HTTP 状态码是 404。虽然能显示页面，但
 *   搜索引擎与部分 CDN 会把它当作错误；跳回根路径后拿到的是 200。
 *
 * 为什么用 sessionStorage + ?p= 双通道：
 *   部分环境会剥离 query，sessionStorage 作为兜底；两者都没有时
 *   退回首页，不影响正常访问。
 */
function spaFallbackPlugin() {
  return {
    name: "spa-fallback-404",
    apply: "build",
    enforce: "post",
    generateBundle(_options, bundle) {
      const indexHtml = bundle["index.html"];
      if (!indexHtml || indexHtml.type !== "asset") return;

      // 404.html 只负责跳转，不渲染应用，因此无需引用 JS/CSS。
      // 早先想复用 index.html 的资源标签，但用正则从 HTML 里抓 <script>
      // 容易漏掉闭合标签、产出无效 HTML；不引用反而更稳、也更快。
      const fallback = `<!DOCTYPE html>
<html lang="">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>正在打开… - 在线工具箱</title>
    <link rel="icon" href="/SqlTool/favicon.ico" />
  </head>
  <body>
    <div id="app"></div>
    <script>
      // GitHub Pages 深链接回退：保存原始路径后跳回根路径。
      // 根路径的 index.html 会用同样的 key 取回并还原 URL。
      (function () {
        var target =
          window.location.pathname +
          window.location.search +
          window.location.hash;
        var encoded = encodeURIComponent(target);
        try {
          window.sessionStorage.setItem("spa-redirect", "?p=" + encoded);
        } catch (e) {
          // 隐私模式下 sessionStorage 不可用，退化为只用 query 传递
        }
        window.location.replace("/SqlTool/?p=" + encoded);
      })();
    </script>
  </body>
</html>
`;

      this.emitFile({
        type: "asset",
        fileName: "404.html",
        source: fallback,
      });
    },
  };
}

export default defineConfig({
  base: "/SqlTool/",
  plugins: [vue(), vueDevTools({ componentInspector: false }), UnoCSS(), spaFallbackPlugin()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    port: 8024,
    strictPort: true,
    historyApiFallback: true,
  },
  build: {
    target: "es2020",
    minify: "terser",
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
      format: {
        comments: false,
      },
    },
    rollupOptions: {
      treeshake: fullBuild,
      output: {
        /**
         * 不使用自定义 manualChunks。
         *
         * 原因（实测记录）：按「vue/@vue → vue-vendor、其余 node_modules → vendor」
         * 手工分包会让 vendor 与 vue-vendor 互相 import，形成循环依赖。
         * 关闭 treeshake 时（即默认的快速构建）该循环无法被打平，产物启动即报
         *   Uncaught ReferenceError: Cannot access 'y' before initialization
         * 整个页面白屏——构建本身却是成功的，只有实际加载才会暴露。
         *
         * 改为 Rollup 默认分包：两种模式都无循环依赖，产物可正常运行。
         */
        chunkFileNames: (chunkInfo) => {
          if (chunkInfo.name?.startsWith("ai-")) {
            return "assets/ai/[name]-[hash].js";
          }
          return "assets/[name]-[hash].js";
        },
        entryFileNames: "assets/[name]-[hash].js",
        assetFileNames: "assets/[ext]/[name]-[hash].[ext]",
      },
    },
    chunkSizeWarningLimit: 600,
    cssCodeSplit: true,
    sourcemap: false,
    assetsInlineLimit: 4096,
  },
  optimizeDeps: {
    include: [
      "vue",
      "vue-router",
      "pinia",
      "ant-design-vue",
      "@ant-design/icons-vue",
      "node-sql-parser/build/mysql",
    ],
    exclude: ["@xenova/transformers"],
  },
});
