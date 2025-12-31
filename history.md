# 版本变更历史

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
