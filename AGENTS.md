# SqlTool — AGENTS.md

## 仓库定位

- Vue 3 + Vite + Ant Design Vue + UnoCSS/SCSS 的纯前端 SPA，部署到 GitHub Pages。
- 根目录单包项目；使用 `pnpm`，`pnpm-lock.yaml` 是主锁文件，不要编辑 `yarn.lock`。
- Node 引擎要求：`^20.19.0 || >=22.12.0`。

## 开发与验证命令

```bash
pnpm install
pnpm dev
pnpm run build
pnpm lint
pnpm format
```

- 开发端口由 `vite.config.js` 硬编码为 `8024`，且 `strictPort: true`；基础路径是 `/SqlTool/`。
- 生产构建使用 4GB Vite 内存上限；不生成 sourcemap，Terser 会移除 `console`/`debugger`。
- pnpm 11 可能先因 ignored native build scripts 中止 `pnpm run build`；若发生，直接运行：
  `node node_modules/vite/bin/vite.js build`。启用 `pnpm approve-builds` 前先检查 `pnpm-workspace.yaml`。

## 测试

- 单元测试：`pnpm test:run`；进入 watch 模式使用 `pnpm test`。
- 单文件测试：`pnpm test:run test/unit/foo.test.js`。
- Vitest 配置在 `test/config/vitest.config.js`，使用 jsdom、CSS `false`、全局 Ant Design stub setup；测试文件在 `test/unit/*.test.{js,ts}`。
- E2E：`pnpm test:e2e`；单页脚本有 `test:e2e:insert`、`test:e2e:update`、`test:e2e:excel-fill`、`test:e2e:all`。
- E2E 只使用 Microsoft Edge，`workers: 1`，配置文件为 `test/config/playwright.config.js`。
- Playwright 配置当前使用 `baseURL: http://localhost:5173` 和 `npm run dev`，而 Vite 配置端口是 `8024`；运行 E2E 前先确认实际服务地址，不要假设二者已对齐。
- 测试 Excel 由 `test/e2e/fixtures/*.js` 生成，不是预置的 `.xlsx` 文件。
- 新增功能前，应准备对应测试数据并执行聚焦测试，再报告完成；测试文件放在 `test/` 下。

## 架构与入口

- 入口是 `src/main.js`；路由入口是 `src/router/index.js`。
- `src/router/index.js` 通过 `import.meta.glob("../views/tools/**/*.vue")` 自动扫描工具页面；新增工具只放文件，不要手动注册路由。
- SQL 工具页面位于 `src/views/tools/sql/`，通用工具页面位于 `src/views/tools/`。
- 状态由 `src/stores/` 的 Pinia store 管理；工具元数据在 `src/config/tools.js`。
- CSS token 由 `src/design/theme.css` 提供；Vue SCSS 只在需要时显式 `@use` 变量/mixins；AntD reset 最先加载。
- 主题切换只写 `data-theme`，不再由 JS 向 DOM 注入 CSS 变量；AI 相关模块在构建时被拆为 `ai-module`/`ai-transformers` chunk，并排除 `@xenova/transformers` 的预构建缓存。

## 代码与发布约束

- Vue 使用 Composition API + `<script setup>`；组件名使用 PascalCase；`utils/` 保持纯函数 ES module。
- ESLint 使用 flat config；`test/` 被全局忽略；`no-unused-vars` 与 `no-explicit-any` 是 warning，不是阻断错误。
- 发布以 `.github/workflows/build-and-release.yml` 为准：触发 `main`、`master`、`rebuild` 和 `v*.*.*` 标签；CI 使用 Node 22.19.0、pnpm 11、`pnpm install --no-frozen-lockfile` 和直接执行 Vite 构建命令，发布产物是 `dist.zip`。
- 不要把 README 的端口或旧测试说明当作可执行事实；配置和 scripts 是冲突时的优先级更高依据。
