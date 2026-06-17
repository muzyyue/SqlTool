# SqlTool — AGENTS.md

这是一个 Vue 3 在线工具箱项目（SQL 生成工具站）。纯前端 SPA，部署到 GitHub Pages。

## 快速命令

```bash
pnpm install          # 安装依赖（Node >=20.19.0）
pnpm dev              # 启动开发服务器 → http://localhost:8024（端口硬编码，strictPort: true）
pnpm build            # 生产构建（4GB内存限制，terser压缩，会移除 console/debugger）
pnpm lint             # ESLint 检查 + 自动修复（带缓存）
pnpm format           # Prettier 格式化 src/ 目录
```

## 测试

- **单元测试**（Vitest，jsdom）：`pnpm test:run`
  - `pnpm test` 进入 watch 模式
  - 配置文件：`test/config/vitest.config.js`（不在根目录）
  - 测试文件：`test/unit/*.test.{js,ts}`
  - setup 文件：`test/unit/setup.js`（全局 stub 了 Ant Design Vue 组件）
  - Ant Design 组件（`a-*` 标签）在 Vitest 中配置为 customElement，测试时不会实际渲染
- **E2E 测试**（Playwright，仅 Microsoft Edge）：`pnpm test:e2e`
  - `pnpm test:e2e:headed` 有头模式 / `test:e2e:debug` 调试模式
  - 单 worker（`workers: 1`），串行执行
  - 内置 webServer 自动执行 `npm run dev`（注意 Playwright 配置里用的是 `npm`，不是 `pnpm`）
  - E2E 测试文件：`test/e2e/*.spec.js`，Page Object：`test/e2e/pages/*.js`
  - 测试数据（.xlsx 文件）存放在 `test/e2e/fixtures/`
- **禁用 CSS**（`css: false`）：Vitest 不解析 CSS，组件测试只测逻辑

## 构建注意事项

- 基础路径是 `/SqlTool/`（vite.config.js 中的 `base` 配置），开发时也以该路径作为 URL 前缀
- 生产构建不生成 sourcemap（`sourcemap: false`）
- Terser 配置了 `drop_console: true`，生产环境不会输出 console 日志
- 手动代码分割：vue-vendor / antd-vendor / xlsx-vendor / ai-module / vendor
- AI 模块（`@xenova/transformers`）在 `optimizeDeps.exclude` 中，避免预构建缓存问题
- 构建产物位于 `dist/`，直接部署到 GitHub Pages

## 架构要点

- **路由**：Vue Router 4 使用 HTML5 History 模式，自动扫描 `views/tools/**/*.vue` 生成工具路由。不要手动注册工具路由，只需在 `views/tools/` 下创建 `.vue` 文件即可
- **路径别名**：`@` → `./src`（jsconfig.json + vite.config.js）
- **状态管理**：Pinia（store 位于 `src/stores/`）
- **CSS 架构**：CSS 变量（`design/theme.js`）→ UnoCSS（原子类）→ SCSS（复杂组件）→ Ant Design（基础 UI）。三层共享变量
- **主题系统**：通过 `design/theme.js` 注入 CSS 自定义属性到 `:root`，暗色模式通过切换 `data-theme` 属性实现，UnoCSS `dark:` variant 配合使用
- **SCSS 全局注入**：`vite.config.js` 中配置了 `additionalData`，所有 Vue 文件自动注入 `variables.scss` 和 `mixins.scss`，无需手动 import
- **Ant Design Vue**：全局注册（`app.use(Antd)`），组件使用 `a-` 前缀

## 项目结构

```
src/
├─ components/     # 可复用组件（Layout, SQL, Excel, AI 等子目录）
├─ composables/    # 逻辑复用（core/data/excel/sql/ai 分类）
├─ config/         # 工具配置（tools.js - 所有工具元数据）
├─ design/         # 主题变量（theme.js）、SCSS 变量/混入
├─ router/         # 路由配置（自动发现 views/tools/）
├─ stores/         # Pinia 状态（theme, ai）
├─ utils/          # 纯函数工具（database/field/file/json/log/sql）
└─ views/          # 页面组件（HomePage, NotFound, SqlToolPage + tools/ 子目录）
```

## 代码规范

- Vue 3 Composition API + `<script setup>`
- 组件文件名使用 PascalCase
- 工具文件（utils/）使用纯函数导出的 ES module
- ESLint 使用 flat config，集成了 `typescript-eslint`（尽管是 `.js` 项目——部分文件是 `.ts`）
- `@typescript-eslint/no-unused-vars` 和 `no-explicit-any` 为 warn 级别，不阻断构建
- `eslint.config.js` 中 `test/` 目录被 global ignore，ESLint 不会检查测试文件

## Git 和发布

- 使用 Conventional Commits（中文描述）
- 每次提交前更新 `history.md`（追加新版本条目）
- 版本号在 `package.json` 中维护，提交前更新
- 发布流程：版本号升级 → git commit → git tag `v版本号` → 用户确认后 `git push origin v版本号`
- CI 在 main/master/rebuild 分支触发，先跑 quality-check（lint + format check + test），成功后才 build
- 发布到 GitHub Pages 需要 commit message 包含 "Deploy"
- `.gitignore` 排除了 `*.md`，但 `AGENTS.md` 需要被跟踪——已添加例外

## 测试约定

- 测试文件全部放在 `test/` 下，不在此目录外创建测试文件
- 如果 `test/` 目录不存在，首次执行测试前自动创建
- 测试临时产物（如 Playwright reports）已写入 `.gitignore`
- `pnpm test:run` 执行 `vitest run`（CI 模式），`pnpm test` 执行 `vitest`（watch 模式）
