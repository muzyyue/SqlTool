# 版本变更历史

## 1.5.19 (2026-02-11)

**InsertPage.vue代码重构优化**

- 提取公共工具函数
  - 新建 src/utils/sqlBeautifier.ts：SQL格式化工具
  - 新建 src/utils/operationLogger.ts：操作日志工具
  - 新建 src/utils/sqlStats.ts：SQL统计工具
  - 新建 src/utils/fileUploader.ts：文件上传工具
  - 新建 src/utils/fieldMapping.ts：字段映射工具
  - 新建 src/utils/index.ts：统一导出文件
- 拆分UI组件
  - 将Excel上传区域替换为ExcelUploadCard组件
  - 移除约120行重复代码
  - 代码从2663行减少到2541行
- 所有代码通过ESLint检查

## 1.5.17 (2026-01-26)

**修复SQL生成中的格式转换问题**

- 修复反斜杠符号被额外转义的问题
  - 修改 escapeString 函数，将单引号转义为双引号
  - 移除对反斜杠的转义逻辑，避免双反斜杠问题
- 修复逗号被添加额外空格的问题
  - 修改 splitLongLine 函数中的条件判断
  - 从 currentPart.length + trimmedToken.length + 2 改为 currentPart.length + trimmedToken.length + 1
  - 确保逗号后不添加额外空格
- 所有代码通过ESLint检查

## 1.5.16 (2026-01-26)

**修复分隔符列宽度不生效的问题**

- 移除分隔符输入框的内联样式 style="width: 100%"
- 让输入框使用表格列定义中的 width: 80 和 minWidth: 80
- 确保分隔符列宽度能够正确显示
- 所有代码通过ESLint检查

## 1.5.15 (2026-01-26)

**修复表格列宽度不生效的问题**

- 在 Ant Design Vue 的 Table 组件中，当使用 scroll 属性时，minWidth 可能不生效
- 为所有表格列同时添加 width 和 minWidth 属性
  - 单列绑定表格：DDL字段、Excel列
  - 字段拼接表格：自定义字段名称、数据类型、源Excel列、分隔符、格式化模板、预览
  - 自定义字段表格：字段名、数据类型、数据来源、配置、预览
- 确保表格列宽度在横向滚动时能够正确显示
- 所有代码通过ESLint检查

## 1.5.14 (2026-01-26)

**优化格式化模板输入框，支持自动扩展高度**

- 将字段拼接表格中的格式化模板输入框从 a-input 改为 a-textarea
- 将自定义字段 Excel 列组合配置中的格式化模板输入框从 a-input 改为 a-textarea
- 添加 auto-size 属性，支持自动扩展高度（minRows: 1, maxRows: 4）
- 为自定义字段中的格式化模板添加 tooltip 提示
- 改善用户对较长模板文本的编辑和预览体验
- 所有代码通过ESLint检查

## 1.5.13 (2026-01-26)

**为自定义字段的字段名列添加选择+自定义功能**

- 修改自定义字段表格中字段名列的实现
  - 添加选择/自定义模式切换功能
  - 选择模式：从DDL字段列表中选择
  - 自定义模式：手动输入字段名
  - 添加清空自定义字段名按钮
  - 添加字段不在DDL中的警告提示
- 更新addCustomField函数，将inputMode默认值设置为'custom'
- 更新loadBindings函数，在加载自定义字段时添加inputMode: 'select'
- 移除Excel列组合配置中的重复字段名输入框
- 修改saveBindings函数，在保存时过滤掉inputMode字段
- 所有代码通过ESLint检查

## 1.5.12 (2026-01-26)

**优化表格响应式布局，支持横向滚动**

- 修改表格列定义，移除固定宽度设置
  - 将所有数据列的width改为minWidth
  - 单列绑定：DDL字段、Excel列使用minWidth
  - 字段拼接：自定义字段名称、数据类型、源Excel列、分隔符、格式化模板、预览使用minWidth
  - 自定义字段：字段名、数据类型、数据来源、配置、预览使用minWidth
- 固定操作列宽度和位置
  - 所有表格的操作列使用固定宽度100px
  - 操作列使用fixed: 'right'固定在右侧
- 添加横向滚动功能
  - 为所有表格添加:scroll="{ x: 'max-content' }"属性
  - 添加CSS样式支持表格横向滚动
  - 确保表格头部、容器、body都支持横向滚动
- 确保在各种数据展示情况下的可用性和视觉一致性
- 所有代码通过ESLint检查

## 1.5.11 (2026-01-26)

**为字段拼接功能添加数据类型配置**

- 在字段拼接规则中添加数据类型选择功能
  - 在concatenationRules数据结构中添加dataType字段
  - 在表格列定义中添加数据类型选择列
  - 在UI中添加数据类型选择器（字符串、整数、小数、日期时间、布尔值）
  - 默认数据类型为字符串
- 更新保存和加载逻辑，正确传递数据类型
  - 更新addConcatenationRule函数，添加dataType参数
  - 更新saveBindings函数，保存dataType到管理器
  - 更新loadBindings函数，加载dataType配置
- 更新InsertPage和UpdatePage中的处理逻辑，使用配置的数据类型
- 所有代码通过ESLint检查

## 1.5.10 (2026-01-26)

**修复字段拼接规则中添加已删除字段时出现冲突错误的问题**

- 修复问题：删除"file_status"字段后重新添加时出现"与现有绑定字段冲突"错误
  - 修改validateBindings函数，移除对customFields与fieldConcatenationRules的冲突检测
  - 因为字段拼接规则中的自定义字段名称会同时创建对应的customField，两者的字段名相同是正常行为
  - 修改isFieldBound函数注释，说明字段拼接规则可以重复选择同一字段（可能是编辑已有规则）
- 优化用户体验，允许在字段拼接中选择已在其他地方使用的字段
- 所有代码通过ESLint检查

## 1.5.9 (2026-01-26)

**恢复字段拼接表格中的操作列**

- 恢复操作列，包含删除按钮
- 保持删除功能正常工作
- 所有代码通过ESLint检查

## 1.5.8 (2026-01-26)

**重构字段拼接功能，移除目标DDL字段并统一样式**

- 移除目标DDL字段列及其相关功能
  - 从concatenationColumns中移除"目标DDL字段"列
  - 从concatenationRules数据结构中移除ddlFieldName字段
  - 移除相关的UI组件（a-select选择器）
  - 移除操作列，因为删除按钮已经在预览列旁边
- 修改自定义字段名称样式为与单列绑定DDL字段选择相同
  - 添加inputMode字段（select/custom）支持选择和自定义两种模式
  - 添加单选按钮组，与单列绑定样式一致
  - 选择模式下使用a-select从availableDdlFields中选择DDL字段
  - 自定义模式下使用a-input输入自定义字段名称
  - 添加清空按钮和警告提示，与单列绑定样式一致
  - 调整列宽度，确保布局合理
- 更新相关逻辑，确保功能完整
  - 修改addConcatenationRule函数，添加inputMode字段
  - 添加clearConcatenationFieldName函数，用于清空自定义字段名称
  - 修改handleConcatenationChange函数，移除对ddlFieldName的依赖
  - 修改saveBindings函数，使用customFieldName而非ddlFieldName
  - 修改removeConcatenationRule函数，移除对ddlFieldName的依赖
  - 修改loadBindings函数，将ddlFieldName映射到customFieldName
  - 修改isFieldBound函数，移除对concatenationRules的检查
  - 修改useCustomBinding.js中的addConcatenationRule和removeConcatenationRule函数参数名
  - 修改InsertPage和UpdatePage中的处理逻辑，使用ddlFieldName作为字段名称
- 所有代码通过ESLint检查

## 1.5.7 (2026-01-26)

**修复字段拼接规则中自定义字段名称未添加到映射配置的问题**

- 修复字段拼接规则中的自定义字段名称未被正确处理的问题
  - 在InsertPage的handleSaveCustomBinding函数中添加对fieldConcatenationRules的处理
  - 在UpdatePage的handleCustomBindingSave函数中添加对fieldConcatenationRules的处理
  - 从字段拼接规则中提取customFieldName或ddlFieldName，创建自定义字段并添加到customBindingManager
  - 优先使用自定义字段名称，如果没有则使用目标DDL字段名称
- 添加详细的调试日志，帮助定位问题
- 确保字段拼接规则中的自定义字段能够正确显示在映射配置中
- 所有代码通过ESLint检查

## 1.5.6 (2026-01-26)

**修复自定义字段-字段拼接功能的添加和删除问题**

- 修复问题1：选择目标DDL字段后无法成功添加到映射配置表
  - 在saveBindings函数中添加字段拼接规则的同步逻辑
  - 确保本地concatenationRules正确同步到customBindingManager
  - 添加验证逻辑，只有配置完整的规则才会被添加
- 修复问题2：删除DDL项后缓存未同步清除导致虚假冲突提示
  - 修复removeConcatenationRule函数，删除时同步清除管理器中的拼接规则和自定义字段
  - 确保删除操作彻底清理所有相关缓存数据
- 优化冲突检测逻辑，明确检测的是自定义字段名而非DDL字段名
- 提升用户体验，确保字段添加和删除操作可靠准确
- 所有代码通过ESLint和Prettier检查

## 1.5.5 (2026-01-24)

**重构 Excel 数据填充工具，实现功能分离和配置隔离**

- 将混合的 handleProcess 函数拆分为五个独立函数
- 创建 handleBasicProcess：处理基础数据填充的核心逻辑
- 创建 handleAdvancedProcess：处理高级数据处理的核心逻辑
- 创建 handleBasicProcessMain：验证基础配置并执行基础数据填充
- 创建 handleAdvancedProcessMain：验证高级配置并执行高级数据处理
- 重构 handleProcess：作为简单的路由器，根据配置调用相应的处理函数
- 完全隔离配置访问：基础功能只使用 config，高级功能只使用 advancedConfig
- 遵循单一职责原则：每个函数只负责一个明确的任务
- 提升代码可维护性：减少 120+ 行重复代码
- 所有代码通过 ESLint 和 Prettier 检查

## 1.5.4 (2026-01-22)

**修复数据去重和行范围选择的重置功能**

- 修复去重复选框事件绑定，正确传递布尔值而不是事件对象
- 修复行范围复选框事件绑定，正确传递布尔值而不是事件对象
- 修复 handleDeduplicationToggle 函数，取消勾选时恢复原始数据并清除所有去重相关设置
- 修复 handleRowRangeToggle 函数，取消勾选时恢复原始数据并清除所有行范围相关设置
- 更新 resetAll 函数，清除去重和行范围相关状态
- 更新 clearFile 函数，清除去重和行范围相关状态
- 添加详细的状态提示和日志记录
- 创建 row-range.test.js 单元测试，包含23个测试用例验证重置功能
- 确保重置操作在各种场景下均能可靠工作

## 1.5.3 (2026-01-20)

**修复字段映射显示和SQL生成问题**

- 修复filteredFieldMappings过滤逻辑，保留自定义字段映射
- 添加自定义字段存在性检查，即使不在parsedFields中也保留
- 确保添加的自定义字段正确显示在映射配置部分
- 确保添加的自定义字段正确生成到SQL中

## 1.5.2 (2026-01-20)

**修复自定义绑定模态框DDL字段选择器数据源**

- 修复CustomBindingModal中availableDdlFields使用DDL原始字段列表数据
- 移除从fieldMappings中提取DDL字段的逻辑
- 确保删除映射字段后，目标DDL字段选择器能正确显示剩余字段
- 避免因映射配置字段变更导致的选择器数据异常

## 1.5.1 (2026-01-20)

**修复SQL插入工具字段映射数据源问题**

- 修复enhancedMatchingStats使用DDL原始字段列表数据统计字段拼接数量
- 修复filteredFieldMappings使用DDL原始字段列表数据过滤字段映射
- 添加DDL字段存在性检查，避免因映射配置字段变更导致的功能异常
- 确保删除映射字段后仍能正确显示统计数据和字段映射

## 1.5.0 (2026-01-20)

**修复Excel填充工具预览功能问题**

- 修复previewColumns计算属性，根据当前预览工作表动态生成列
- 修复预览工作表选择器，正确显示所有工作表选项
- 修复处理后预览功能，自动切换到目标工作表并显示所有列
- 优化用户体验，确保预览功能完整准确

## 1.4.9 (2026-01-20)

**优化Excel填充工具预览功能**

- 添加previewWorksheet状态跟踪当前预览的工作表
- 添加预览工作表选择器，用户可选择预览源工作表或目标工作表
- 修复loadPreview函数使用previewWorksheet而不是worksheet
- 添加handlePreviewSheetChange函数处理预览工作表切换
- 优化用户体验，让用户可以灵活选择预览哪个工作表的数据

## 1.4.8 (2026-01-20)

**修复Excel填充工具数据填充和预览问题**

- 修复数据类型处理，添加getCellType函数正确识别数字、布尔值和字符串类型
- 修复源数据读取，保存原始单元格类型信息
- 修复数据预览功能，移除列数限制，显示所有列
- 增加预览行数限制从10行到20行
- 确保update_time、remark等列能正确显示

## 1.4.7 (2026-01-20)

**修复Excel填充工具删除和重置功能**

- 修复文件删除功能，删除文件时正确清除fileList
- 修复重置按钮功能，重置时清除所有状态数据
- 确保删除和重置操作能够正确更新UI

## 1.4.6 (2026-01-20)

**优化Excel数据填充工具用户体验**

- 添加目标工作表选择功能，支持跨工作表数据填充
- 选择不同工作表时源列和目标列选项自动更新
- 添加目标工作表下拉框UI，提升操作灵活性
- 修改处理逻辑支持跨工作表数据填充
- 更新结果显示包含源工作表和目标工作表信息

## 1.4.5 (2026-01-19)

**修复构建失败问题**

- 添加缺失的CodeMirror依赖包：@codemirror/commands、@codemirror/view

## 1.4.4 (2026-01-19)

**修复SQL生成相关问题**

- 修复应用美化选项后自定义字段不生效的问题（缺少customBindingManager参数）
- 修复PostgreSQL SQL生成中的字段名非空验证
- 修复SQL美化过程中的逗号缺失问题（添加调试日志和临时修复）
- 创建CodeMirror skill，包含Vue 3集成、语言支持、主题定制等完整文档

## 1.4.3 (2026-01-16)

**新增JSON格式化工具**

- 创建JsonPage.vue组件，提供完整的JSON格式化、对比、搜索、统计功能
- 实现JSON格式化和语法高亮，基于CodeMirror 6编辑器
- 实现可折叠JSON块功能，支持折叠/展开对象和数组
- 实现左右两栏对比功能，支持格式化模式和对比模式切换
- 实现搜索定位功能，集成CodeMirror搜索扩展，支持Ctrl+F搜索
- 实现深度对比算法，支持字段对比、深度对比、浅层对比三种模式
- 实现数据统计功能，自动计算对象数量、数组数量、字段总数、数据大小
- 实现逗号识别功能，支持自动处理中文逗号（，）
- 安装CodeMirror相关依赖包：@codemirror/search、@codemirror/fold
- 更新CodeEditor.vue组件，添加enableFold和enableSearch props支持
- 更新tools.js配置，添加JSON工具路由配置
- 优化UI/UX设计，使用玻璃态设计、渐变色、响应式布局
- 完整的暗色主题支持
- 修复ToolCard.vue中props.tool为undefined时的错误，添加安全检查
- 修复ToolsGrid.vue中过滤无效工具对象的问题
- 修复JSON工具路由配置，将/tools/jsonpage改为/tools/json

**修复Excel填充工具路由**

- 修复ExcelFillPage.vue路由配置，将/tools/excelfillpage改为/tools/excelfill
- 确保路由生成器正确匹配文件名

## 1.4.2 (2026-01-15)

**修复 DdlPage.vue 组件导入路径**

- 修复 DdlPage.vue 中 composables 和 components 的导入路径
- 使用 @ 别名与 InsertPage 和 UpdatePage 保持一致的导入方式

## 1.4.1 (2026-01-15)

**修复构建路径错误**

- 修复文件移动后 DdlPage.vue 的 composables 导入路径
- 将 '../composables' 修正为 '../../composables'

## 1.4.0 (2026-01-15)

**路由优化与UI一致性改进**

- 优化路由结构，将 SQL 相关页面（InsertPage、UpdatePage、DdlPage）移动到 tools/sql 目录
- 修改路由配置，使用动态导入加载 SQL 相关页面，路径为 /sql/insert、/sql/update、/sql/ddl
- 添加行范围选择功能，支持选择 Excel 行数范围进行 SQL 生成
- 增强 Excel 解析逻辑，支持 startRow、endRow 参数指定读取范围
- 统一 INSERT 和 UPDATE 页面的卡片风格，添加渐变背景和增强阴影效果
- 修复行范围选择按钮风格与项目其他按钮不一致的问题
- 修复数据预览性能问题，优化 previewData 计算属性，限制预览数据量
- 修复字段匹配类型错误（str2.toLowerCase is not a function）
- 修复 UPDATE 页面条件字段选择后取消再选字段不生效的问题
- 修复 UPDATE 页面选择要修改的字段未包含在 SQL 中的问题
- 修复 UPDATE 页面清除字段映射后 UI 不更新的问题
- 修复 UPDATE 页面清除字段时字段未被自动移除的问题
- 所有 UI 优化遵循项目设计语言，使用玻璃态设计、渐变色、微交互动画
- 完整的响应式设计和暗色主题支持

## 1.3.1 (2026-01-14)

**修复自定义字段与映射配置冲突检测问题**

- 修复CustomBindingModal中checkFieldConflict函数未检查fieldMappings的问题
- 修改冲突检测逻辑：自定义字段只需与映射配置中显示的字段（ddlField.name）冲突检测
- 不再检查Excel列名（sourceField）和DDL原始字段
- 在InsertPage和UpdatePage中传递fieldMappings prop给CustomBindingModal

## 1.3.0 (2026-01-13)

**工具箱页面重构与Excel数据填充工具**

- 将首页从SQL工具改为工具箱页面
- 创建SqlToolPage.vue保留原SQL工具介绍内容
- 新增Excel数据填充工具ExcelFillPage.vue
- 简化导航栏，移除INSERT生成和UPDATE生成菜单项
- 修复多处图标导入缺失问题
- 修复normalizeHeaders函数中表头匹配逻辑错误，导致一个header可能匹配多个key的问题
- 优化匹配策略，优先使用完全匹配，只有在没有完全匹配时才使用部分匹配

## 1.2.52 (2026-01-13)

**添加自定义字段名冲突检测功能**

- 在useCustomBinding.js中添加isFieldNameUnique函数，用于检查字段名是否唯一
- 在CustomBindingModal.vue的addCustomField函数中添加验证逻辑
- 验证字段名是否为空，如果为空则显示警告并阻止添加
- 验证字段名是否已存在，如果存在则显示警告并阻止添加
- 确保一个header只能匹配一个key，避免字段映射冲突

## 1.2.51 (2026-01-13)

**修复批量导入表头匹配逻辑错误**

- 修复测试失败问题，所有26个测试用例全部通过
- 修复normalizeHeaders函数中表头匹配逻辑错误，导致一个header可能匹配多个key的问题
- 优化匹配策略，优先使用完全匹配，只有在没有完全匹配时才使用部分匹配
- 确保一个header只能匹配一个key，避免字段映射冲突
- 修复测试失败问题，所有26个测试用例全部通过

## 1.2.50 (2026-01-13)

**修复批量导入预览和PostgreSQL DDL解析问题**

- 修复批量导入预览中条件值显示错误的问题（从"file_id = file_id"修复为"file_id = 1"）
- 修复normalizeHeaders函数，移除过于宽泛的'条件'模式，避免与'条件字段'混淆
- 修复PostgreSQL DDL解析，支持COLLATE语法和CHECK约束
- 优化PostgreSqlStrategy.js，改进正则表达式匹配逻辑
- 优化代码格式，移除不必要的注释
- 添加9个单元测试用例验证批量导入修复
- 添加3个单元测试用例验证PostgreSQL DDL解析修复

## 1.2.39 (2025-01-09)

**模板管理 - 字段下拉选择功能**

- 模板保存弹窗中的规则预览支持 DDL 字段下拉选择
- 添加 ddlFields prop 从父组件接收字段列表
- 规则预览表格的"字段"列改为可搜索下拉选择框
- 优化字段选择体验，避免手动输入错误

## 1.2.38 (2025-01-09)

**模板管理功能（第二阶段）**

- 新增 useTemplateManager.js 模板管理模块，支持保存/加载/删除/导出
- 新增 TemplateManager.vue 模板管理抽屉组件
- 修复 v-model:open 传递 ref 对象问题，改为传递布尔值
- 规则保存为模板功能，快速复用常用规则
- 模板加载功能，一键应用预设规则
- 模板导出为 JSON 文件功能
- 模板导入功能，支持从 JSON 导入
- 批量导出全部模板功能
- 恢复默认模板和清空所有模板功能
- 19个单元测试用例验证模板管理功能

## 1.2.37 (2025-01-09)

**批量导入修改规则功能（第一阶段）**

- 新增 useImportParser.js 文件解析模块，支持 Excel/CSV/JSON 格式
- 新增 useBatchImport.js 批量导入逻辑，封装完整导入流程
- 修改 BatchEditPanel.vue，添加批量导入 UI 和功能
- 4步导入向导：选择格式 → 上传文件 → 字段映射 → 预览确认
- 支持字段自动匹配（精确/模糊/大小写不敏感）
- 导出当前规则为 Excel 文件功能
- 下载导入模板功能
- 13个单元测试用例验证核心逻辑

## 1.2.36 (2025-01-09)

**修复数据去重切换列时丢失原始数据的问题**

- 添加 originalExcelData 变量保存上传的原始数据
- 修复 applyDeduplication 函数，切换去重列时先恢复原始数据再计算
- 修复前：第一次根据"姓名"列去重→100行变80行，再根据"邮箱"列去重→基于80行数据
- 修复后：始终基于原始100行数据计算，每次切换去重列都正确统计
- 清除文件时同步清除原始数据
- 添加多次去重切换测试用例，验证修复效果
- 支持整数类型（INT、INTEGER、BIGINT、NUMBER 等）验证
- 支持日期类型（DATE、DATETIME、TIMESTAMP 等）验证
- 支持布尔类型（BOOLEAN、BOOL、BIT 等）验证
- 不符合类型的数据会被拒绝并提示错误信息，避免无效数据写入

## 1.2.33 (2025-01-07)

**修复 getExcelColumnIndex 函数属性名错误**

- 修复映射对象属性名错误（excelColumn 改为 excelIndex）
- 修复返回值错误，直接返回 excelColumnIndex 变量
- 添加详细调试日志，方便定位问题

## 1.2.32 (2025-01-07)

**重构批量修改逻辑，改为按列修改**

- 重构 applyBatchEditToData 函数，改为遍历规则而不是遍历行
- 对每个规则，找到对应的 Excel 列索引，直接修改这一列的所有数据
- 如果有条件，只修改满足条件的行；否则修改所有行
- 使用 Set 统计受影响的行数，避免重复计数
- 提升性能，逻辑更清晰，更符合批量修改的语义

## 1.2.31 (2025-01-07)

**修复批量修改数据访问错误**

- 修复 row 数据对象访问问题，将数字索引转换为字符串索引
- 修复条件字段值获取错误，使用 row[String(conditionColumnIndex)]
- 修复字段值修改错误，使用 newRow[String(columnIndex)]

## 1.2.30 (2025-01-07)

**重构批量修改功能，直接修改 Excel 数据**

- 重构 BatchEditPanel 组件，接收 excelData 和 fieldMappings 作为 props
- 根据 DDL 字段名找到对应的 Excel 列索引，直接修改 excelData 中的数据
- 添加 generateSqlFromData 函数，从修改后的数据重新生成 SQL
- 更新 handleBatchPreview、handleBatchApply、handleExcelDataUpdate 函数
- 移除 SQL 解析逻辑，避免解析错误

## 1.2.29 (2025-01-07)

**修复批量修改条件匹配逻辑错误**

- 修复条件字段索引获取错误（rule.condition.value 改为 rule.condition.fieldName）
- 修复 parseInsertSql 函数的表名匹配正则表达式
- 修复批量修改功能无法正确应用条件的问题

## 1.2.28 (2025-01-07)

**修复 useBatchEdit.js 导出问题**

- 将 applyBatchEdit 和 parseInsertSql 改为直接导出的函数
- 修复 BatchEditPanel.vue 无法导入 applyBatchEdit 的问题
- 重构 useBatchEdit.js，将辅助函数移到外部作为独立导出

## 1.2.27 (2025-01-07)

**修复 InsertPage.vue 中代码格式化问题**

- 修复批量修改相关函数被错误格式化成一行的问题
- 修复 batchEditRules 变量定义格式错误
- 恢复 handleBatchPreview、handleBatchApply、handleBatchChange 函数的正常格式

## 1.2.26 (2025-01-07)

**修复批量编辑功能多个问题**

- 修复 BatchEditPanel 组件中 editRules 状态管理问题
- 修复 useBatchEdit.js 中未使用的变量（updateRule, getRulesStats）
- 修复 BatchEditPanel.vue 中未使用的导入（parseInsertSql）
- 修复 BatchEditPanel.vue 中未定义的变量（previewBatchEdit）
- 修复 BatchEditPanel.vue 中未使用的函数（handleChange）
- 修复 v-else 指令错误
- 修复 defineExpose 中的 previewBatchEdit 未定义问题
- 修复 useBatchEdit.js 导出问题

## 1.2.25 (2025-01-07)

**修复 BatchEditPanel.vue 中 Empty 图标错误导入**

- 从 @ant-design/icons-vue 中移除 Empty 导入
- Empty 是 ant-design-vue 的组件，不是图标
- 移除 a-empty 组件中的 :image 属性，避免图标导入错误

## 1.2.24 (2026-01-07)

**添加批量修改SQL语句功能**

- 创建 BatchEditPanel 组件，支持批量修改INSERT语句中的字段值
- 创建 useBatchEdit composable，封装批量修改逻辑
- 支持添加多个修改规则，每个规则可设置字段、新值和条件
- 支持条件过滤（=, !=, >, <, >=, <=, LIKE, IN）
- 提供预览和应用功能，预览不修改原始SQL
- 玻璃态设计风格，与现有组件风格保持一致
- 响应式布局，支持移动端
- 暗色主题支持
- 在 InsertPage 中集成 BatchEditPanel 组件
- 添加预览模式切换（原始SQL/预览修改）
- 创建 uno.config.js 配置文件，提供 UnoCSS 工具类（可选）
- 完整的 JSDoc 注释和文档

## 1.2.23 (2025-12-31)

**修复表格列children属性设置错误**

- 修复 customFieldColumns 中使用 customCell 返回 { children: 'xxx' } 对象的问题
- 将 customCell 改为 customRender，正确返回渲染内容
- 避免 Vue 警告 "Cannot set property children of #<Element> which has only a getter"

## 1.2.22 (2025-12-31)

**修复ASwitch类型检查及级联选择器key重复问题**

- 修复 CustomBindingModal 中 enableCustomBinding watch 监听计算属性时的解包问题
- 修复级联选择器函数选项的 value 使用数据库类型前缀确保唯一性
- 更新 handleCascaderChange 和 getCascaderValue 函数以适配新的 value 格式

## 1.2.21 (2025-12-31)

**修复主键字段未生成到SQL的问题**

- 修改 generateBatchInsertSql 的字段过滤逻辑
- 如果主键字段已映射到 Excel 列（excelIndex >= 0），则保留该字段
- 允许用户手动指定主键值，而不是被过滤掉

## 1.2.20 (2025-12-31)

**修复映射配置必填项无法生成SQL的问题**

- 修复 applyCustomBindingsToMappings 中错误地将所有自定义字段标记为 generatedByFunction = true
- 只有当数据源是函数、自增或静态值时才标记为函数生成
- Excel组合字段需要从Excel获取数据，不应标记为函数生成
- 修复更新映射时丢失 excelHeader 和 excelIndex 的问题

## 1.2.19 (2025-12-31)

**修复自定义字段函数配置无法传递的问题**

- 修复enhancedMatchFields返回值未赋值给fieldMappings.value的问题
- 修复自定义字段未添加到customBindingManager的问题
- 修复importBindings不更新已存在字段的问题
- 修复自定义绑定未自动启用的问题
- 修复字段重复导致自定义字段配置无法正确使用的问题
- 修复formatValue函数不支持不带括号的系统函数（如Oracle的SYSDATE）
- 修复使用配置中的数据库类型而不是当前选择的数据库类型的问题
- 确保自定义字段函数配置能够正确传递到SQL生成逻辑
- 现在根据当前选择的数据库类型生成对应的函数语法

## 1.2.18 (2025-12-31)

**修复自定义字段配置未应用到字段映射的问题**

- 修复applyCustomBindingsToMappings函数未处理customFields的问题
- 将customBindingManager.customFields中的自定义字段添加到enhancedMappings
- 确保自定义字段的ddlField.isCustom和customConfig属性正确设置
- 修复用户配置NOW()函数但生成SQL使用UUID()的问题
- 标记为"函数生成"的字段现在能正确使用配置的函数

## 1.2.17 (2025-12-31)

**修复函数生成字段未添加到SQL语句的问题**

- 修复标记为"函数生成"的字段在生成INSERT和UPDATE语句时被过滤的问题
- 在generateBatchInsertSql中添加对generatedByFunction字段的检查
- 在generateSingleUpdateSql中添加对generatedByFunction字段的检查
- 标记为"函数生成"的字段根据自定义字段配置生成值，不再统一使用UUID
- 支持系统函数、自增、Excel组合、静态值等多种数据源类型
- 修改字段过滤逻辑，保留标记为"函数生成"的主键字段
- 添加调试日志，便于追踪函数生成字段的处理过程

## 1.2.16 (2025-12-31)

**增强错误提示信息的详细程度**

- 将简单的message.warning替换为Modal.error弹窗
- 以列表形式详细展示所有验证错误，便于用户快速定位问题
- 在字段映射验证失败时，提示用户可以使用"函数生成"功能
- 在自定义绑定验证失败时，清晰展示具体配置问题
- 在保存自定义绑定失败时，详细列出所有错误项
- 使用红色高亮显示错误信息，提升可读性

## 1.2.15 (2025-12-31)

**添加函数生成字段支持**

- 在字段映射表格中添加"函数生成"列，允许用户标记字段为通过函数生成
- 修改fieldMappings数据结构，添加generatedByFunction字段
- 修改验证逻辑，标记为"函数生成"的必填字段跳过Excel列映射检查
- 支持处理如UUID主键等通过函数生成的字段，无需Excel列映射
- 同步更新InsertPage和UpdatePage，保持功能一致性

## 1.2.14 (2025-12-31)

**修复自定义字段显示和Win7验证问题（最终修复）**

- 修复添加第二个字段后，第一个字段名不显示的问题
- 修改CustomBindingModal的addCustomField函数，移除立即同步到customBindingManager的逻辑
- 在validateEnhancedMappings中添加调试日志，帮助定位Win7验证问题
- 修复字段同步逻辑，确保数据一致性

## 1.2.13 (2025-12-31)

**修复自定义字段显示和Win7兼容性问题（深度修复）**

- 修复添加自定义字段后，外部显示只显示一个字段的问题
- 修改CustomBindingModal的saveBindings函数，只删除不在新列表中的字段
- 修改CustomBindingModal的addCustomField函数，添加字段时同步到customBindingManager
- 修复Win7 Chrome上生成SQL时提示"请先完成字段映射配置"的问题
- 增强validateMappings函数，添加映射对象和ddlField的空值检查
- 确保在旧版浏览器上的兼容性

## 1.2.12 (2025-12-31)

**修复自定义字段显示和Win7兼容性问题**

- 修复添加自定义字段后，外部显示只显示一个字段的问题
- 修改importBindings函数，合并字段而不是替换，保留已存在的字段
- 修复Win7 Chrome上生成SQL时提示"请先完成字段映射配置"的问题
- 增强validateBindings函数，添加数据类型检查和空值检查
- 确保在旧版浏览器上的兼容性

## 1.2.11 (2025-12-31)

**修复自定义字段编辑功能**

- 修复点击编辑自定义字段后弹窗没有显示信息的问题
- 在CustomBindingModal组件中添加editingField prop
- 在InsertPage和UpdatePage中添加editingCustomField状态管理
- 点击编辑时自动切换到自定义字段标签页
- 关闭弹窗时清空editingCustomField状态

## 1.2.10 (2025-12-31)

**修复测试文件未被git跟踪的问题**

- 从.gitignore中移除test/unit/和test/e2e/的忽略规则
- 确保单元测试和E2E测试文件能够被提交到git仓库
- 解决GitHub Actions中vitest找不到测试文件的问题
- 修复"No test files found"错误

## 1.2.9 (2025-12-31)

**修复GitHub Actions测试运行失败的问题**

- 修改.gitignore文件，允许test/config/目录被git跟踪
- 添加test/unit/和test/e2e/到忽略列表
- 添加test/config/的例外规则，确保配置文件可以被GitHub Actions使用
- 解决Could not resolve vitest.config.js的错误
- 确保GitHub Actions能够正确运行测试

## 1.2.8 (2025-12-31)

**修复字段去重显示-1而不是placeholder的问题**

- 将deduplicationColumn的初始值从-1改为undefined
- 修改applyDeduplication函数中的判断逻辑，检查undefined或null
- 修改handleDeduplicationToggle函数中的重置逻辑，使用undefined
- 确保a-select组件在未选择时正确显示placeholder"请选择去重列"

## 1.2.7 (2025-12-31)

**修复字段去重placeholder和自定义字段自增数据显示null的问题**

- 修改字段去重部分的placeholder为"请选择去重列"，提高用户体验
- 修复自定义字段选择自增数据时SQL中显示null的问题
- 在generateBatchInsertSql和generateSingleUpdateSql中添加customBindingManager参数
- 当自定义字段数据源类型为auto_increment时，调用customBindingManager.generateAutoIncrementValue()生成自增值
- 确保自增字段能够正确生成递增的数值，而不是显示NULL
- 所有E2E测试通过（24/24），验证修复效果

## 1.2.6 (2025-12-31)

**修复删除自定义字段时触发重新解析的问题**

- 修复handleRefreshCustomFields函数调用parseDdl(false)导致重新解析DDL的问题
- 删除自定义字段时不再触发重新解析，避免覆盖已配置的数据
- 在handleDeleteCustomField函数中添加逻辑，从fieldMappings中移除对应的映射记录
- 在CustomFieldManager组件中注释掉emit('refresh')事件触发
- 确保删除自定义字段后，其他已配置的字段映射数据保持不变
- 所有E2E测试通过（24/24），验证修复效果

## 1.2.5 (2025-12-31)

**修复自定义数据列表缓存未清除的问题**

- 在CustomFieldManager组件中添加watcher监听props.customFields的变化
- 当检测到自定义字段数量变化时，自动重置搜索和筛选状态
- 在InsertPage中为CustomFieldManager添加动态key属性
- key基于自定义字段的数量和字段名生成，确保数据变化时组件强制重新渲染
- 确保执行SQL操作后，自定义字段列表缓存能够正确清除
- 确保显示内容与最新的映射配置保持同步
- 所有E2E测试通过（24/24），验证修复效果

## 1.2.4 (2025-12-31)

**修复SQL预览功能异常**

- 修复SqlPreview组件中formatSql方法未导出的问题
- 添加监听props.sql变化，自动清除缓存
- 添加监听props.beautifyOptions变化，自动清除缓存
- 添加监听syntaxHighlight开关变化，自动清除缓存
- 添加监听showLineNumbers开关变化，自动清除缓存
- 确保预览模式切换、格式化、压缩、语法高亮、显示行号等功能正常响应

## 1.2.3 (2025-12-31)

**修复INSERT语句生成功能异常**

- 修复自定义字段映射记录缺少customFieldName属性的问题
- 修复自定义字段被错误标记为isIdentity或primaryKey的问题
- 为自定义字段添加数据类型选择功能（字符串、整数、小数、日期时间、布尔值）
- 在CustomBindingModal中添加数据类型列，允许用户为自定义字段指定数据类型
- 修复generateBatchInsertSql函数中自定义字段的处理逻辑
- 确保自定义字段正确包含在生成的INSERT语句中
- 优化自定义字段的字段名获取逻辑，优先使用customFieldName

## 1.2.2 (2025-12-31)

**自定义字段管理功能**

- 创建CustomFieldManager组件，用于显示和管理自定义字段配置
- 在InsertPage和UpdatePage的字段映射配置中集成CustomFieldManager组件
- 支持搜索功能（按字段名搜索）
- 支持筛选功能（按数据来源类型筛选：系统函数、Excel组合、自增、静态值）
- 清晰展示自定义字段的配置详情（字段名、数据类型、数据来源、配置信息）
- 提供编辑和删除功能，操作便捷
- 界面布局合理，与现有系统风格保持一致
- 使用Ant Design Vue组件，确保UI一致性

## 1.2.1 (2025-12-30)

**Update页面功能优化**

- 修复Update页面SQL预览功能，支持格式化、压缩、语法高亮、显示行号
- 修改SqlPreview组件，添加beautifyOptions props，支持父组件传递美化选项
- 在InsertPage和UpdatePage中传递beautifyOptions给SqlPreview组件
- 统一UpdatePage的beautifyOptions配置与InsertPage保持一致（indentSpaces: 4, formatStyle: 'expanded'）
- 验证数据库类型正确传递给SQL生成逻辑（MySQL、PostgreSQL、SQL Server）
- 修复insert-page.spec.js中未使用的导入（selectField、selectDropdownOption）
- 通过Playwright测试验证格式化、压缩、语法高亮、显示行号功能正常工作

## 1.2.0 (2025-12-29)

**目录结构优化**

- 重组测试目录结构，将所有测试相关文件整合到统一的test/目录下
- 创建test/unit/目录存放单元测试文件
- 创建test/e2e/目录存放E2E测试文件
- 创建test/fixtures/目录存放测试数据和fixture文件
- 创建test/reports/目录存放测试报告（test-results和playwright-report）
- 创建test/docs/目录存放测试文档（TEST_RULES.md、TEST_SUMMARY.md等）
- 创建test/scripts/目录存放测试脚本（test_dm_parser_fix.js等）
- 创建test/config/目录存放测试配置文件（playwright.config.js、vitest.config.js）
- 更新package.json中的所有测试脚本路径，使用新的配置文件位置
- 更新vitest.config.js配置，添加include规则只运行test/unit/目录下的测试
- 更新playwright.config.js配置，调整testDir和reporter路径为相对路径
- 更新.gitignore文件，反映新的测试目录结构
- 修复所有单元测试文件的导入路径（从../src/改为../../src/）
- 验证单元测试和E2E测试在新目录结构下正常运行

## 1.1.0 (2025-12-29)

**正式发布版本**

- 创建完整的Playwright E2E测试框架和自动化测试脚本
- 添加playwright.config.js配置文件，支持Chrome、Firefox、Safari浏览器测试
- 创建test-utils.js工具函数库，提供20+个常用测试辅助函数
- 实现insert-page.spec.js测试套件，包含20个INSERT页面测试用例
- 实现update-page.spec.js测试套件，包含30个UPDATE页面测试用例
- 添加测试报告生成器TestReporter类，支持详细的测试结果统计
- 在package.json中添加7个测试脚本命令（test:e2e、test:e2e:ui、test:e2e:headed等）
- 更新.gitignore，添加e2e/目录和playwright.config.js排除规则
- 测试覆盖范围：页面加载、DDL解析、Excel上传、SQL生成、字段映射、错误处理等
- 基于TEST_RULES.md和TEST_SUMMARY.md的测试经验创建自动化测试脚本

## 1.0.9 (2025-12-28)

**正式发布版本**

- 修复自定义绑定和字段拼接统计数据不更新的问题
- 将useCustomBinding转换为单例模式，确保跨组件数据一致性
- 使用计算属性实现统计数据的响应式更新
- 修改enhancedMatchingStats使用计算属性直接获取统计数据
- 优化统计逻辑，确保添加自定义字段或拼接规则后实时更新
- 修复CustomBindingModal初始化错误，正确处理计算属性props
- 修复useCustomBinding函数缺少return语句导致的undefined错误
- 修复上传文件后customBindingManager为undefined的问题
- 删除语法验证结果功能，移除相关UI和逻辑代码
- 清理SqlPreview组件中的验证相关代码和依赖
- 在DdlPage.vue中添加UPDATE TABLE语句生成功能
- 添加UPDATE TABLE输入界面，支持表名、WHERE条件和更新字段配置
- 优化DdlPage.vue的重置和生成SQL功能，与InsertPage.vue保持一致

## 1.0.8 (2025-12-26)

**正式发布版本**

- 优化映射配置显示逻辑，确保所有DDL字段都显示
- 解析DDL后立即创建映射记录，无论Excel数据是否存在
- 添加"未匹配"标签，明确标识未绑定的字段
- 添加"请先上传Excel文件"提示，改善用户体验
- 优化相似度进度条颜色，根据匹配度显示不同颜色
- 简化Excel列显示逻辑，统一显示格式
- 添加getSimilarityColor函数，根据相似度返回对应颜色

## 1.0.7 (2025-12-26)

**正式发布版本**

- 删除映射配置中的添加字段按钮
- 删除addCustomField函数
- 移除PlusOutlined图标导入
- 用户可通过配置绑定弹窗添加自定义字段
- 简化主界面操作流程，避免功能重复

## 1.0.6 (2025-12-26)

**正式发布版本**

- 删除映射配置表格中的字段名输入框和重置按钮
- 简化字段名显示逻辑，直接显示DDL字段名
- 移除handleFieldNameBlur和resetFieldName处理函数
- 移除updateCustomFieldName和resetCustomFieldName导入
- 简化UI界面，提高用户体验一致性

## 1.0.5 (2025-12-26)

**正式发布版本**

- 单列绑定部分添加DDL字段自定义输入功能，支持选择和自定义两种模式
- 保留原有下拉框选择功能，新增自定义输入模式允许用户手动输入DDL字段名
- 自定义输入支持文本输入和清空功能，与现有表单组件保持一致的UI风格
- 修复单列绑定数据无法传递到外部映射配置的问题
- 修改数据流逻辑，与字段拼接和自定义字段保持一致
- 修复自定义字段无法显示在映射配置中的问题
- 当DDL字段不存在时自动创建临时字段对象并添加到parsedFields
- 修复达梦数据库DDL解析问题，正确识别数据库类型并解析所有字段
- 优化字段拆分逻辑，正确处理引号和括号内的逗号
- 添加约束过滤机制，排除"NOT CLUSTER PRIMARY KEY"等DM特定约束

## 1.0.4 (2025-12-26)

**正式发布版本**

- 添加DDL字段名称修改功能，用户可直接在表格中编辑字段名
- 生成的SQL语句会使用修改后的字段名称
- 支持字段名称重置功能，恢复原始字段名
- 修复自定义绑定开关状态不改变的问题
- 修复PostgreSQL字段名转义测试失败
- 删除Playwright e2e测试文件，解决与Vitest的测试冲突
- 完整的测试覆盖，所有测试通过

## 1.0.3 (2025-12-26)

**正式发布版本**

- 完整的字段拼接功能，支持自定义字段名称和变量引用机制
- 基于选择顺序的变量分配（value1, value2, value3...）
- 格式化模板支持变量引用（{value1}, {value2}等），保持向后兼容{value}
- UI中清晰展示各列对应的变量名称，方便用户在格式化模板中引用
- 拼接字段不出现在DDL原始字段列表，避免重复
- 所有相关UI元素、提示信息和操作说明中文化显示
- 完整的测试覆盖，所有测试通过
- 优化拼接逻辑，仅在整个拼接结果两侧统一添加引号

## 0.0.8 (2025-12-25)

- 实现字段拼接功能的自定义字段名称功能，允许用户为拼接字段指定名称
- 修改拼接逻辑，原始字段值不单独添加引号，仅在整个拼接结果两侧统一添加引号
- 添加isFromConcatenationRule标志，确保拼接字段不出现在DDL原始字段列表
- 所有相关UI元素、提示信息和操作说明中文化显示
- 实现基于选择顺序的变量分配机制（value1, value2, value3...）
- 格式化模板支持变量引用（{value1}, {value2}等），保持向后兼容{value}
- UI中清晰展示各列对应的变量名称，方便用户在格式化模板中引用
- 添加字段拼接变量引用测试用例，所有测试通过

## 0.0.7 (2025-12-25)

- 修复static_value数据源类型未处理的问题，添加静态值字段处理逻辑
- 创建自定义字段功能测试文件，实现11个测试用例覆盖多种场景
- 修复SQL语法验证正则表达式，支持MySQL反引号表名格式
- 所有测试通过（11/11），验证自定义字段添加、SQL生成、语法规范等功能

## 0.0.6 (2025-12-24)

- 修复选择达梦数据库时的运行时错误（handleDatabaseTypeChange函数缺失及逻辑错误）
- 更新函数显示格式，同时展示函数名及简述（不仅显示中文名）
- 解决自定义字段配置中仅显示函数中文描述而无具体函数名的问题
- 修复ESLint的no-case-declarations规则错误

## 0.0.5 (2025-12-24)

- 修复 CustomBindingModal.vue 导入路径错误（useCustomBinding 和 databaseFunctions）
- 添加数据库特定系统函数支持（MySQL、PostgreSQL、Oracle、SQL Server、达梦）
- 创建 databaseFunctions.js 工具文件，包含各数据库常用函数定义
- 修改 CustomBindingModal.vue 添加数据库类型选择器和分类函数列表
- 更新 useSqlGeneratorEnhanced.js 使用 getFunctionInfo 获取正确的数据库函数语法

## 0.0.4 (2025-12-24)

- 修复自定义字段选择"Excel列组合"数据来源时，生成的SQL中没有包含绑定的Excel列数据的问题
- 实现 excel_combine 数据来源的实际读取和组合逻辑
- 从 customField.excelCombineConfig.columns 获取配置的列索引
- 从 row 数据中读取对应列的值并按分隔符组合
- 支持格式模板配置

## 0.0.3 (2025-12-24)

- 修复清除remark等字段后生成SQL时UUID()前缺少逗号的问题
- 修改generateBatchInsertSql的过滤逻辑，保留所有非自增主键和非主键字段
- 未映射到Excel列的普通字段现在会正确包含在字段列表中（值为NULL）
- 确保无论字段是否映射，字段数量都保持一致，SQL语法正确

## 0.0.2 (2025-12-24)

- 修复formatValue函数对系统函数字段（如UUID()）的错误处理
- 在formatValue中添加系统函数调用的特殊处理，避免为函数添加引号
- 确保SQL生成中UUID()等函数字段前有正确的逗号分隔

## 0.0.1 (2025-12-24)

- 修复SQL生成中values数组包含undefined值时逗号丢失的问题
- 在values.join前添加验证逻辑，将undefined/null/''转换为'NULL'
