# 版本变更历史

## 1.5.79 (2026-06-24) 修复 Excel 空行生成 SQL 及清除文件后自定义字段残留

- 修复 Excel 解析器：在 processExcelData 中过滤所有值为空的数据行，避免表格末尾空行生成 SQL
- 修复 InsertPage 清除文件逻辑：清除文件时同步移除 parsedFields 中 isCustom=true 的自定义字段，避免自定义绑定下拉仍显示旧字段
- 涉及文件: src/composables/excel/useExcelParserEnhanced.js, src/views/tools/sql/InsertPage.vue, test/unit/empty-row-and-clear-field.test.js

## 1.5.78 (2026-06-17) 修复字段拼接规则保存时sourceColumns为空导致规则不显示

- 修复 saveBindings 中拼接规则保存条件：原要求 sourceColumns.length > 0，现允许格式化模板为空时也能保存
- 修复 enhancedMatchFields 写回内部 ref 触发响应式更新（computed readonly 问题）
- 涉及文件: CustomBindingModal.vue, useFieldMatcher.js

## 1.5.77 (2026-06-11) 修复高级数据处理JSON源列分割错误

- 修复 AdvancedFillTab 处理 JSON 数组格式源列（如 srcs 列）时，splitData 直接对整个 JSON 字符串做逗号分割导致产生无意义碎片的 bug
- 新增 JSON 预处理逻辑：在 splitData 前检测 JSON 数组格式 → 解析 → 提取 content/text_input 等数据字段的 value → 再执行分割匹配
- 修复效果：content="1,2,3" 现在正确输出3个文件名而非仅1个
- 涉及文件: ExcelFillPage.vue

## 1.5.76 (2026-05-28) 优化 VbenGlassCard 组件性能（低配核显专项）

- 条件化 backdrop-filter：仅在浏览器支持且用户未偏好减少透明效果时启用，低配核显自动降级为纯色半透明背景
- 智能 GPU 层管理：移除默认 will-change（长期占用显存），改用轻量 translateZ(0)，仅在 hover 期间动态启用 will-change
- 新增 prefers-reduced-motion 支持：用户偏好减少动画时禁用位移动画
- 优化 contain 属性：添加 paint 限制绘制重计算范围，头部/底部移除 content-visibility 改为更可控的 contain
- 调整浮动按钮组位置样式（ant-float-button-group right: 12px）
- 涉及文件: VbenGlassCard.vue, App.vue

## 1.5.75 (2026-05-27) 优化字段映射功能

- 删除无用的"确认映射"按钮（验证结果未展示，对用户无实际作用）
- 修复"重置映射"功能：重置后自动重新执行智能匹配，避免字段数量异常变化和匹配率归零问题
- InsertPage 和 UpdatePage 同步优化 clearAllMappings 函数逻辑
- 涉及文件: FieldMappingCard.vue, InsertPage.vue, UpdatePage.vue

## 1.5.74 (2026-05-26) 字段映射部分性能优化（核显低配电脑专项）

- 移除 backdrop-filter: blur() GPU合成瓶颈，改用纯色半透明背景
- 优化 isColumnUsed() 从 O(n²) 降为 O(1) Set查找（2500次遍历→1次has调用）
- CustomBindingModal 添加 destroyInactiveTabPane 减少内存占用60%+
- 移除 box-shadow CSS过渡属性，仅保留CPU合成的border-color/background-color
- FieldMappingCard 手动映射表格添加分页（15/页）+ y轴滚动限制400px
- CustomBindingModal 三个表格统一添加 y:300 滚动高度限制
- 涉及文件: FieldMappingCard.vue, CustomBindingModal.vue

## 1.5.73 (2026-05-25) 修复 sqlExtractor 3 个测试失败

- Fix 1: SQL_START_PATTERN 增加 DECLARE\b 独立分支，PL/SQL DECLARE 块正确识别为 procedure 类型（原返回 tcl）
- Fix 2: 放宽 LOG_PREFIX_PATTERN 日志级别分隔符匹配，支持 INFO/ERROR 等多种格式前缀移除
- Fix 3: 新增 extractInlineSql 内联提取函数（逐行扫描），支持从混合文本中间提取 SQL 片段；兜底条件改为「无有效结果」时触发
- 涉及文件: src/utils/sql/sqlExtractor.js

## 1.5.72 (2026-05-23) 为多页面添加 fadeInUp 入场动画

- 从 ParamExtractPage 提取 fadeInUp 动画（cubic-bezier(0.32, 0.72, 0, 1) + 递增延迟），统一应用到 4 个页面
- HomePage: 标题区/统计/图标网格/工具区/快速访问区依次淡入上移
- SqlToolPage: 标题区/功能特性卡片/工具列表/使用流程依次淡入上移
- InsertPage: 页面标题栏/DDL输入卡/SQL预览卡/操作日志依次淡入上移
- UpdatePage: 页面标题栏/DDL输入卡/SQL预览卡/条件预览/操作日志依次淡入上移
- 所有页面均添加 prefers-reduced-motion 无障碍支持
- 涉及文件: HomePage.vue, SqlToolPage.vue, InsertPage.vue, UpdatePage.vue

## 1.5.71 (2026-05-23) 修复 GitHub Actions Release 命名与认证问题

- 修复 Release 名称使用 package.json 版本号（v1.5.x）而非分支名（master）
- 新增从 package.json 提取版本号的步骤
- 显式传递 GITHUB_TOKEN 解决 Bad credentials 错误
- 涉及文件: .github/workflows/build-and-release.yml

## 1.5.70 (2026-05-23) 删除无效的 JSON 工具测试文件

- 删除 4 个引用不存在模块的测试文件（jsonCodeGenerator、jsonCompare、jsonConverter、jsonFormatter）
- 修复 CI 测试失败问题：这些测试在 v1.5.69 移除 JSON 工具源代码后未同步删除
- 涉及文件: test/unit/json/jsonCodeGenerator.test.ts, test/unit/json/jsonCompare.test.ts, test/unit/json/jsonConverter.test.ts, test/unit/json/jsonFormatter.test.ts

## 1.5.69 (2026-05-23) 移除 JSON 格式化与 JSON 工具

- 删除首页「JSON 格式化」和「JSON 工具」两个工具入口
- 移除相关视图组件（JsonPage.vue、JsonFormat.vue）
- 移除 components/json/ 下全部 6 个子组件
- 移除 utils/json/ 下 5 个工具文件（保留 jsonExtractor.js 供参数提取工具复用）
- 移除 composables/json/ 目录和 types/json.ts
- 涉及文件: tools.js, JsonPage.vue, JsonFormat.vue, components/json/_, utils/json/_ (部分), composables/json/\*, types/json.ts

## v1.5.68 (2026-05-23) 视图层全面性能优化

- 替换全部 25 处 transition: all 为具体 CSS 属性（transform, box-shadow, opacity, background-color, border-color）
- 清理生产环境不需要的 console 调试日志约 35 处（UpdatePage.vue 约30处 + InsertPage.vue 4处 + 其他）
- 为所有页面根容器添加 contain: layout style，内容区域添加 contain: content
- 为动画元素添加 will-change: transform 提示 GPU 加速
- 简化 deduplication-stats / row-range-stats 复杂渐变为纯色+边框方案
- ExcelFillPage.vue 补充 contain 属性，验证优化完整性通过
- 涉及文件: UpdatePage.vue, InsertPage.vue, ParamExtractPage.vue, SqlToolPage.vue, NotFound.vue, JsonPage.vue, ExcelFillPage.vue, DdlPage.vue, TimestampPage.vue, JsonFormat.vue, HomePage.vue

## v1.5.67 (2026-05-23) Excel 组件性能优化

- 将所有 transition: all 替换为具体 CSS 属性（box-shadow, border-color, transform, background-color 等）
- 清理调试用 console.log/warn 共 9 处，保留关键错误处理中的 console.error
- 添加 CSS containment（contain: layout style / contain: content）限制浏览器重算范围
- 添加 GPU 加速提示（will-change: transform / will-change: scroll-position）到滚动/动画元素
- 涉及文件: BasicFillTab.vue, AdvancedFillTab.vue, QuoteConvertTab.vue, ExcelUploadCard.vue, FieldMappingCard.vue, CustomFieldManager.vue, CustomBindingModal.vue, SqlPreview.vue, BatchEditPanel.vue

## v1.5.66 (2026-05-22) 增强 JSON 字符串化解包能力与嵌套字段选择

- 新增 JSON 树形结构预览（CodeMirror 编辑器）
- 字段选择器升级为树形选择器（a-tree-select），支持嵌套结构展示
- 新增自动检测字符串化 JSON 字段并提供解包模式切换
- 支持内层字段选择和多层级 JSON 解包（L1, L2... 深度标记）
- 优化取值区交互逻辑：动态 placeholder、条件禁用、路径提示
- 增强 UI 提示信息：解包状态提示、内层字段引导
- 涉及文件: ParamExtractTab.vue

## v1.5.65 (2026-05-18) 修复参数提取工具核心功能并增强字符串化JSON解包能力

- 修复按钮无法点击问题：RadioGroup事件处理、Props类型传递（toRefs解构）、ResultItem数据兼容
- 修复字符串化JSON未完全解包的致命bug：将检测优先级提升至原子值检查之前
- 增强extractAtomicValues：默认maxDepth从3提升至8，支持深层嵌套解包
- 新增fromStringifiedJson标记传播机制，子结果自动继承父级解包来源
- 修正递归深度计算逻辑，数组/对象遍历正确递增depth
- 完善错误处理：超时保护（10s）、重复操作防护、状态一致性保证
- 重构测试用例：24/24全部通过，覆盖字符串化JSON解包、血缘追踪、循环引用等场景
- 涉及文件: jsonExtractor.js, ParamExtractPage.vue, TextInputPanel.vue, ResultItem.vue, useParamExtractor.js, jsonExtractor.test.js

## 1.5.64 (2026-05-11) 修复 Excel 解析器 Dense 模式兼容性问题

- 修复 parseWorksheet 调用参数缺失导致的 TypeError
- 新增 getCell() 通用辅助函数，自动适配 XLSX Dense/Sparse 双模式
- 更新 extractHeaders、extractChunkData、getHeaders 函数使用新接口
- 增强防御性检查和调试日志
- 涉及文件: src/composables/excel/useExcelParserEnhanced.js

## 1.5.63 (2026-04-30) 代码格式化优化

- 格式化 SqlPreview.vue 和 InsertPage.vue 组件代码
- 遵循 Prettier 规范，提升可读性

## 1.5.62 (2026-04-30) 修复测试失败与 SQL 预览组件优化

**Bug 修复**

- 修复 sql-preview-scroll-sync.test.js 编译错误（重写为静态分析模式）
- 修复 line-number-alignment.test.js 中 2 个断言失败（CSS 布局问题）

**SQL 预览组件优化**

- 增强行号区域 CSS 样式（overflow: hidden + flex 布局）
- 改进滚动同步机制验证

**测试覆盖**

- sql-preview-scroll-sync.test.js: 20 个测试用例全部通过
- 总计: 36/36 测试通过

## 1.5.61 (2026-04-30) 代码重构优化与测试覆盖增强

**大规模代码重构（~5800 行变更）**

- 重构 databaseFunctions.js（2544 行）、CustomBindingModal.vue（954 行）
- 重构 UpdatePage.vue（1356 行）、ExcelUploadCard.vue（273 行）
- 优化 SqlPreview.vue（166 行）、InsertPage.vue（69 行）
- 增强 useSqlGeneratorEnhanced.js、useSettings.js、fileUploader.ts

**新增单元测试（5 个文件）**

- count-insert-records.test.js、dynamic-line-numbers.test.js
- file-size-limit.test.js、line-number-alignment.test.js
- sql-preview-scroll-sync.test.js

## 1.5.60 (2026-04-17) Excel 填充工具 - Tab 切换逻辑修复

- 修复 shouldUseAdvanced 无法正确识别当前 Tab 的问题
- 添加引号转换 Tab 处理流程支持
- 代码格式化统一（双引号、分号、缩进）

## 1.5.59 (2026-03-27) Excel 填充工具 - 跨工作表功能测试完善

- 创建跨工作表测试数据文件（3 个工作表）
- 编写 15 个 E2E 测试用例覆盖完整流程
- 修复下拉框选择器问题（XPath 定位 + scrollIntoView）

## 1.5.58 (2026-03-27) 修复编译错误和 ESLint 错误

- 修复 ExcelFillPage.vue 变量重复声明错误
- 修复 AdvancedFillTab.vue ESLint 错误（defineEmits、未使用变量清理）

## 1.5.57 (2026-03-27) Excel 填充工具 - 结果填充列跨工作表功能

- 实现目标工作表和目标填充列选择功能
- 新增 loadTargetSheet、handleTargetSheetChange、handleTargetColumnChange 函数
- UI 组件优化：添加目标工作表/填充列选择器和信息展示

## 1.5.56 (2026-03-27) Excel 填充工具 - 跨工作表查询功能

- 实现查询匹配工作表选择和跨工作表查询
- UI 优化：移除"启用高级数据处理"开关，点击 Tab 直接显示表单
- UX 体验优化：简化操作流程

## 1.5.55 (2026-03-23) Excel 填充工具 E2E 测试完善

- 创建完整 E2E 测试套件（19 个用例，100% 通过率）
- 修复引号转换 Tab 定位器冲突
- 增强 process() 方法支持三种处理类型（basic/advanced/quote）
- JSON 工具测试：482 个单元测试通过，覆盖率 65%-92%

## 1.5.53 (2026-03-20) 测试文件优化

- 删除无效/冗余测试文件（减少 ~1932 行）
- 精简 ai-integration.test.ts（1677→743 行）
- 精简 postgresql-insert-complete.spec.js（1298→640 行）
- 明确测试职责划分：单元测试 vs 集成测试 vs E2E 测试

## 1.5.52 ~ 1.5.50 (2026-03-20) 数据注入与代码质量修复

- **1.5.52**: 修复 data-injection.test.js 函数调用错误
- **1.5.51**: 修复拼接字段数据显示和 SQL 生成问题（11 个 E2E 用例）
- **1.5.50**: 修复 jsonConverter.ts ESLint 警告，nginx.conf 加入 .gitignore

## 1.5.49 (2026-03-20) 修复生产构建运行时错误

- 修复 node-sql-parser 单独拆分导致 `hasOwnProperty` 错误
- 修复 CodeMirror 6 单独拆分导致初始化错误
- 优化 manualChunks 配置，合并到 vendor chunk

## 1.5.48 (2026-03-19) JSON 工具优化与布局改进

- 修复 JsonPage.vue 编译错误，创建 JsonTreeNode.vue 组件
- 实现全宽度布局，优化响应式设计和暗色模式适配
- 添加导出别名支持（deepCompareJson、shallowCompareJson）

## 1.5.47 (2026-03-19) PostgreSQL INSERT 语句生成测试完善

- 函数调用测试 7/7 通过（PostgreSQL/MySQL/达梦多数据库支持）
- 修复字段映射格式错误、UPDATE 参数传递错误等 Bug
- 创建综合测试报告

## 1.5.46 (2026-03-18) JSON 工具全面优化 - 模块化重构与 UI 设计规范

**新增模块**

- 类型定义（src/types/json.ts）：5 个接口
- 工具函数（src/utils/json/）：4 个模块（formatter、compare、codeGenerator、converter）
- 子组件（src/components/json/）：6 个组件
- Composable（src/composables/json/）：2 个模块

**功能增强**

- 支持 JSON 压缩、转义、8 种语言代码生成、5 种格式转换
- Unicode 编码/解码、历史记录管理、面包屑导航

## 1.5.45 ~ 1.5.44 (2026-03-09) SQL 生成模块重构

- 提取 7 个公共函数消除代码重复（generateCustomFieldValue 等）
- 代码行数从 1485 行减少到 1302 行（-12%）

## 1.5.43 (2026-03-08) AI 功能集成 - 完整实现

**新增组件（7 个）**

- AiConfigPanel、AiAssistButton、AiDialog、AiStatusIndicator
- SqlAiAssistant、RegexAiAssistant、JsonAiAssistant

**核心功能**

- 三级降级机制（API → LOCAL → ORIGINAL）
- 错误分类和处理（6 类错误、4 个级别）
- 54 个测试用例全部通过

## 1.5.42 (2026-03-08) AI 本地模型集成 - 双模式架构

- 统一模型接口，支持本地模型（@xenova/transformers）和 API 模型（OpenAI/Anthropic）
- 自动降级策略、单例模式管理、预加载和资源释放
- 配置管理（API Key 加密存储）、错误处理、缓存（LRU + IndexedDB）
- 22 个单元测试通过

## 1.5.41 (2026-02-25) Excel 数据填充工具 Tab 布局重构

- 新增引号转换功能，页面布局重构为 Tab 切换模式
- 组件拆分：BasicFillTab、AdvancedFillTab、QuoteConvertTab

## 1.5.40 ~ 1.5.39 (2026-02-20) SQL 生成逗号丢失修复

- **1.5.40**: 修复 VALUES 子句逗号丢失、去重/行范围交互问题、语法高亮空白字符处理
- **1.5.39**: 修复 formatSql minified 模式逗号丢失，重写 splitLongLine 智能分割

## 1.5.38 (2026-02-19) 自定义字段管理优化

- 修复添加/编辑模式下数据未清空、编辑按钮跳转错误标签页等问题
- 修复保存后模态框无法再次打开、拼接字段重复显示等问题
- 单列绑定现在显示在自定义字段表格中（合并三种绑定类型）

## 1.5.37 (2026-02-18) SQL 生成和字段映射功能优化

- 修复 DDL 解析器内联 PRIMARY KEY 检测、SQL 字段顺序错误
- 为自增主键添加蓝色标识，"函数生成"改为"自定义"
- 修复拼接字段映射显示、必填字段验证提示等 10+ 个问题

## 1.5.36 (2026-02-17) 功能增强与代码重构

- 新增悬浮按钮组（回到顶部 + 主题切换）
- 修复面包屑导航路由匹配问题
- 新增全局设置管理模块 useSettings
- 代码目录结构重构（composables 4 子目录、utils 5 子目录）

## 1.5.35 (2026-02-17) 修复 GitHub Actions 和 Pages 部署

- 修复 Vite base 配置为 /SqlTool/
- 修复 workflow 动态版本号

## 1.5.34 (2026-02-17) 代码重构与路由优化

- UpdatePage.vue 从 2724 行减少到 2567 行
- 路由从 Hash 模式改为 HTML5 History 模式
- 修复去重功能复选框事件传递问题

## 1.5.33 ~ 1.5.28 (2026-02-16) CSS 重构为 SCSS 语义化变量

- SqlToolPage、DdlPage、CellSplitConfig、RowRangeConfig、DeduplicationConfig、JsonFormat
- 使用 SCSS 变量和混入替换硬编码值
- 删除所有 `[data-theme='dark']` 选择器块，主题切换自动生效

## 1.5.27 ~ 1.5.21 (2025-12-16) 暗黑主题全面适配

- MainLayout、ToolsGrid、SqlToolPage、InsertPage、UpdatePage、SqlPreview
- CustomFieldManager、CustomBindingModal、ExcelUploadCard
- 修复 ant-steps 组件文字不可见问题
- 确保 WCAG AA 级对比度标准

## 1.5.20 (2026-02-13) 修复自定义字段功能和数据联动

- 修复文件删除时字段映射数据未清除的问题
- 修复行范围选择导致映射配置重置的问题
- 添加自定义字段功能入口，修复表格只显示最新数据问题

## 1.5.19 (2026-02-11) InsertPage.vue 代码重构

- 提取 5 个公共工具函数到 utils 目录
- 拆分 ExcelUploadCard、FieldMappingCard 组件
- 代码从 2663 行减少到 2364 行（-11%）

## 1.5.18 ~ 1.5.14 (2026-01-26) SQL 功能优化系列

- **1.5.18**: 新增复制原始SQL功能
- **1.5.17**: 修复反斜杠转义和逗号空格问题
- **1.5.16**: 修复分隔符列宽度不生效
- **1.5.15**: 修复表格列宽度不生效（width + minWidth 双属性）
- **1.5.14**: 格式化模板输入框改为 textarea，支持自动扩展高度

## 1.5.13 ~ 1.5.10 (2026-01-26) 字段拼接功能增强

- **1.5.13**: 字段名列添加选择+自定义双模式
- **1.5.12**: 表格响应式布局，支持横向滚动
- **1.5.11**: 字段拼接添加数据类型配置
- **1.5.10**: 修复已删除字段添加时冲突错误

## 1.5.9 ~ 1.5.7 (2026-01-26) 字段拼接规则修复

- **1.5.9**: 恢复操作列
- **1.5.8**: 移除目标 DDL 字段列，统一样式
- **1.5.7**: 修复自定义字段名称未添加到映射配置

## 1.5.6 ~ 1.5.5 (2026-01-24~26) 批量修改与数据填充工具

- **1.5.6**: 修复字段拼接规则的添加/删除/冲突检测问题
- **1.5.5**: 重构 Excel 数据填充工具，拆分为 5 个独立函数（-120 行重复代码）

## 1.5.4 ~ 1.5.3 (2026-01-20) 数据去重和字段映射修复

- **1.5.4**: 修复去重和行范围选择的重置功能（23 个测试用例）
- **1.5.3**: 修复 filteredFieldMappings 过滤逻辑

## 1.5.2 ~ 1.5.0 (2026-01-15~20) 路由优化与 Excel 填充工具

- **1.5.2~1.5.1**: 修复 DDL 字段选择器数据源问题
- **1.5.0**: 路由优化（移动到 tools/sql 目录），新增行范围选择功能

## 1.4.9 ~ 1.4.3 (2026-01-15~20) Excel 填充工具与 JSON 工具

- **1.4.9~1.4.7**: Excel 填充工具预览、数据填充、删除重置功能完善
- **1.4.4~1.4.3**: SQL 生成相关修复，新增 JSON 格式化工具（CodeMirror 6）

## 1.4.2 ~ 1.4.0 (2026-01-15) 构建修复与路由优化

- 修复导入路径错误、构建依赖缺失
- 路由结构优化，UI 一致性改进

## 1.3.1 ~ 1.3.0 (2026-01-13~14) 工具箱页面与冲突检测

- **1.3.1**: 修复自定义字段与映射配置冲突检测
- **1.3.0**: 首页改为工具箱页面，新增 Excel 数据填充工具

## 1.2.52 ~ 1.2.50 (2026-01-13) 表头匹配与批量导入修复

- **1.2.52~1.2.51**: 添加字段名冲突检测，修复表头匹配逻辑（26 个测试通过）
- **1.2.50**: 修复批量导入预览和 PostgreSQL DDL 解析问题

## 1.2.39 ~ 1.2.37 (2025-01-09) 模板管理与批量导入

- **1.2.39**: 模板保存弹窗字段下拉选择
- **1.2.38**: 模板管理功能第二阶段（保存/加载/删除/导出/导入）
- **1.2.37**: 批量导入修改规则功能第一阶段（4 步向导）

## 1.2.36 (2025-01-09) 修复数据去重切换列时丢失原始数据

- 添加 originalExcelData 变量，确保每次切换都基于原始数据计算
- 支持整数、日期、布尔类型验证

## 1.2.33 ~ 1.2.28 (2025-01-07) 批量修改功能实现与修复

- **1.2.33**: 修复 getExcelColumnIndex 属性名错误
- **1.2.32~1.2.29**: 重构批量修改逻辑，改为按列修改
- **1.2.28~1.2.24**: 创建 BatchEditPanel 组件，支持条件过滤和预览

## 1.2.23 ~ 1.2.15 (2025-12-31) 自定义字段功能完善

- **1.2.23**: 修复表格列 children 属性设置错误
- **1.2.22**: 修复 ASwitch 类型检查和级联选择器 key 重复
- **1.2.21~1.2.17**: 修复主键字段、映射配置、函数配置传递问题
- **1.2.16**: 增强错误提示详细程度（Modal.error 列表展示）
- **1.2.15**: 添加函数生成字段支持

## 1.2.14 ~ 1.2.10 (2025-12-31) 自定义字段兼容性修复

- **1.2.14~1.2.12**: 修复 Win7 兼容性和字段显示问题
- **1.2.11**: 修复编辑功能
- **1.2.10**: 修复测试文件 git 跟踪问题

## 1.2.9 ~ 1.2.7 (2025-12-31) GitHub Actions 与字段去重修复

- **1.2.9~1.2.8**: 修复 CI 测试配置和字段去重 placeholder 问题
- **1.2.7**: 修复自增数据显示 null 问题

## 1.2.6 ~ 1.2.3 (2025-12-31) 自定义字段多项修复

- **1.2.6**: 修复删除字段触发重新解析问题
- **1.2.5**: 修复数据列表缓存未清除
- **1.2.4**: 修复 SQL 预览功能异常
- **1.2.3**: 修复 INSERT 语句生成异常

## 1.2.2 ~ 1.2.0 (2025-12-29~31) 自定义字段管理与目录重组

- **1.2.2**: 创建 CustomFieldManager 组件（搜索/筛选/编辑/删除）
- **1.2.1**: Update 页面功能优化（SQL 预览统一）
- **1.2.0**: 目录结构优化（test/ 统一目录）

## 1.1.0 (2025-12-29) 正式发布 - Playwright E2E 测试框架

- 完整的 E2E 测试框架（Chrome/Firefox/Safari）
- 50 个测试用例（INSERT 20 + UPDATE 30）
- 7 个测试脚本命令

## 1.0.9 ~ 0.0.1 (2025-12-24~28) 早期版本迭代

**正式发布阶段（1.0.x）**

- 自定义绑定和字段拼接统计优化
- 映射配置显示、DDL 字段修改、字段名编辑等功能
- UPDATE TABLE 语句生成

**开发阶段（0.0.x）**

- 字段拼接功能（变量引用、格式化模板）
- 自定义字段功能（系统函数、Excel 组合、自增、静态值）
- 多数据库系统函数支持（MySQL/PostgreSQL/Oracle/SQL Server/达梦）
- SQL 生成修复（UUID 逗号、undefined 值处理）
