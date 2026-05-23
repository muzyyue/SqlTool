# SqlTool 更新日志

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
