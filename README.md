# 在线工具箱 (SqlTool)

面向开发者与数据工作的纯前端工具箱。除 SQL 生成外，还包含 Excel 数据处理、
日志分析、参数提取等常用工具。全部计算在浏览器本地完成，不上传任何数据。

## 功能特性

### SQL 相关
- 🔍 智能 DDL 解析 —— 支持 MySQL、PostgreSQL、SQL Server、达梦等语法
- ⚡ SQL 生成 —— INSERT / UPDATE 语句批量生成
- 🎨 SQL 美化 —— 格式化与语法高亮
- 🔧 批量修改 —— 条件筛选与数据类型校验

### 数据处理
- 📊 Excel 数据填充 —— 源列数据填充到目标列，支持合并单元格
- 🗂 参数提取 —— 从混合文本中提取 SQL 与 JSON 参数

### 开发者工具
- 📄 日志错误分析 —— 提取错误条目（含多行堆栈），统计类型与时间分布
- ⏱ 时间戳转换 —— 时间戳与日期时间互转
- 🧾 YAML 校验 —— 通用 YAML 校验（语法、类型陷阱、不可见字符），附 Docker Compose 专项规则

## 快速开始

```bash
pnpm install
pnpm dev
```

访问 <http://localhost:8024>

> 端口由 `vite.config.js` 固定为 `8024`（`strictPort: true`），不会回退到其他端口。

### Node 版本要求

项目锁定 Node `20.19.0`（见 `.nvmrc`）。**不要使用 Node 24**：

Node 24 + Rollup 7 组合下，tree-shaking 阶段会无限递归并报
`Maximum call stack size exceeded`，导致构建失败。

```bash
nvm use          # 读取 .nvmrc
```

## 构建

```bash
pnpm build       # 快速构建：treeshake 关闭，约 32 秒，产物约 7.08 MB
pnpm build:full  # 完整构建：treeshake 开启，约 8 分 8 秒，产物约 6.00 MB
```

`build:full` 开启 tree-shaking；CI 发布流程使用 `build:full`。

> 分包策略使用 Rollup 默认行为，**没有自定义 `manualChunks`**。
> 原因：手工按「vue/@vue → vue-vendor、其余 node_modules → vendor」分包会让
> `vendor` 与 `vue-vendor` 互相 import 形成循环依赖。关闭 treeshake 时（即
> `pnpm build`）该循环无法被打平，产物启动即抛
> `Cannot access 'y' before initialization`，页面全白，而构建过程却显示成功。
> 修改分包规则后务必用 `vite preview` 实际加载页面验证，不能只看构建退出码。

`build:full` 通过 `scripts/build-full.mjs` 拉起 Vite，并额外传入
`--stack-size=8000`。tree-shaking 阶段 Rollup 的调用参数推导会深度递归，
Node 20.19.0 的默认栈（约 984 KB）仍会抛 `Maximum call stack size exceeded`
（即使 `--max-old-space-size` 调到 6 GB 也无效，因为那是堆上限而非栈上限）。
不直接写进 `package.json` 的脚本，是因为 npm 脚本里传 V8 参数在不同 shell 下
转义容易出错，交给 Node 拼接参数更稳。


## 测试

```bash
pnpm test:run            # 单元测试（Vitest + jsdom）
pnpm test                # 单元测试 watch 模式
pnpm test:e2e            # 端到端测试（Playwright + Microsoft Edge）
pnpm lint:check          # 只检查不修改（CI 使用）
pnpm lint                # 检查并自动修复
```

单元测试覆盖 `src/utils` 与 `src/composables` 层的纯逻辑；页面级组件测试受
Vitest 的 `isCustomElement: tag => tag.startsWith('a-')` 配置限制，含具名插槽的
页面无法编译，因此页面主要通过 e2e 覆盖。

## 持续集成

工作流统一在 `.github/workflows/build.yml`（原先的 `build-and-release.yml`
与 `build-and-deploy.yml` 已合并，避免每次 push 重复构建两遍）。

| 事件 | 行为 |
|---|---|
| PR | 只跑 Lint + 单元测试，不构建、不发布 |
| push 到 main / master | 构建一次 → 发布 GitHub Release |
| 推送 `v*.*.*` 标签 | 构建一次 → 发布 GitHub Release |
| push 且提交消息含 `Deploy` | 额外部署到 GitHub Pages |
| 手动触发 | 可勾选 `deploy_pages` 部署 Pages |

要点：

- **构建只做一次**。产物同时以 `dist-zip`（Release 用）和 `dist-files`
  （Pages 用）两种形态上传，`release` 与 `deploy` 各取所需。
- **Release 无需特殊关键字**，push 即发布；只有 Pages 部署需要 `Deploy`。
  关键字区分大小写，且只看最后一次提交的消息。
- **权限按 job 隔离**：`release` 需要 `contents: write`，`deploy` 需要
  `pages: write` + `id-token: write`。合并到顶层会互相干扰，必须分开写。
- **不包含 Prettier 检查**。原 `build-and-deploy.yml` 写的
  `pnpm run format -- --check` 实际执行 `prettier --write ... --check`，
  `--check` 被忽略，该步骤永远通过；真实的 `prettier --check src/` 当前有
  约 100 个文件不通过。要恢复严格检查，需先单独做一次全量格式化提交。

调整工作流后可用以下命令自检关键行为（PR 是否误构建、deploy 是否误触发等）：

```bash
node scripts/check-workflow.mjs
```


## 技术栈

- Vue 3 + Composition API + `<script setup>`
- Vite 7.x
- Ant Design Vue 4.x
- Pinia / Vue Router
- Vitest + Playwright

## 项目结构

```
src/
├── components/       # 通用与业务组件
├── composables/      # 组合式逻辑（ai / core / data / excel / sql）
├── config/           # 工具元数据（tools.js）
├── design/           # 主题 token（theme.css）与 SCSS 变量
├── router/           # 路由，自动扫描 views/tools 下的页面
├── stores/           # Pinia store
├── utils/            # 纯函数模块
└── views/tools/      # 工具页面；新增页面即自动注册路由
```

新增工具页面只需在 `src/views/tools/` 放一个 `XxxPage.vue`，路由会自动生成为
`/tools/xxx`；同时在 `src/config/tools.js` 登记元数据（图标需在
`src/components/common/ToolCard.vue` 的 `iconMap` 中存在映射）。

## 许可证

MIT
