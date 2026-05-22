import { fileURLToPath, URL } from "node:url";

import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import vueDevTools from "vite-plugin-vue-devtools";
import UnoCSS from "unocss/vite";
import { visualizer } from "rollup-plugin-visualizer";

export default defineConfig({
  base: "/SqlTool/",
  plugins: [
    vue(),
    vueDevTools(),
    UnoCSS(),
    visualizer({
      filename: "./dist/stats.html",
      open: false,
      gzipSize: true,
      brotliSize: true,
      template: "treemap",
    }),
  ],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: `@use "@/design/scss/variables.scss" as *; @use "@/design/scss/mixins.scss" as *;`,
        silenceDeprecations: ["import"],
      },
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
        dead_code: true,
        evaluate: true,
      },
      format: {
        comments: false,
      },
    },
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (
            id.includes("node_modules/vue/") ||
            id.includes("node_modules/@vue/")
          ) {
            return "vue-vendor";
          }
          if (
            id.includes("node_modules/ant-design-vue/") ||
            id.includes("node_modules/@ant-design/")
          ) {
            return "antd-vendor";
          }
          if (id.includes("node_modules/xlsx/")) {
            return "xlsx-vendor";
          }
          if (id.includes("node_modules/@xenova/transformers/")) {
            return "ai-transformers";
          }
          if (
            id.includes("/src/composables/ai/") ||
            id.includes("/src/components/ai/")
          ) {
            return "ai-module";
          }
          if (id.includes("node_modules/")) {
            return "vendor";
          }
        },
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
