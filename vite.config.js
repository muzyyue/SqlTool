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

export default defineConfig({
  base: "/SqlTool/",
  plugins: [vue(), vueDevTools({ componentInspector: false }), UnoCSS()],
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
