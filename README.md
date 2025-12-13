# SQL生成工具 (SqlTool)

一个基于Vue 3开发的智能SQL语句生成工具，能够根据DDL语句和Excel数据快速生成规范的INSERT和UPDATE SQL语句。支持多种数据库类型、智能字段映射、SQL美化等功能。

## ✨ 核心功能特性

### 🔍 智能DDL解析
- 支持MySQL、PostgreSQL、SQL Server等多种数据库DDL语法
- 自动解析表结构、字段信息、数据类型和约束条件
- 提取字段注释信息，增强SQL可读性

### 📊 Excel数据导入
- 支持.xlsx、.xls、.csv格式文件上传
- 智能识别Excel表头，自动建立字段映射关系
- 支持拼音匹配、相似度匹配等智能映射算法

### ⚡ SQL语句生成
- **INSERT语句生成**：批量生成规范的INSERT INTO语句
- **UPDATE语句生成**：基于主键字段生成UPDATE SET WHERE语句
- **多数据库兼容**：支持不同数据库类型的语法差异
- **批量处理**：支持大数据量分批处理，避免SQL过长

### 🎨 SQL美化与验证
- **智能格式化**：支持紧凑和扩展两种格式风格
- **语法高亮**：实时预览SQL语句，支持语法高亮
- **语法验证**：自动检测SQL语法错误，提供详细错误信息
- **垂直对齐**：VALUES子句字段值自动对齐，提升可读性

### 🔧 高级功能
- **动态字段管理**：支持添加自定义字段，设置数据类型和默认值
- **批量修改**：支持对多个字段或记录进行统一编辑
- **数据过滤**：基于DDL字段进行精确过滤，只处理表结构中定义的字段
- **函数支持**：内置常用数据库函数，支持自定义函数编辑

## 🚀 快速开始

### 环境要求
- Node.js 20.19.0+ 或 22.12.0+
- pnpm 8.0.0+
- 现代浏览器（Chrome 90+, Firefox 88+, Safari 14+）

### 安装步骤

1. **克隆项目**
```bash
git clone <项目仓库地址>
cd SqlTool
```

2. **安装依赖**
```bash
pnpm install
```

3. **启动开发服务器**
```bash
pnpm dev
```

4. **访问应用**
打开浏览器访问 http://localhost:5173

### 构建生产版本
```bash
# 构建生产版本
pnpm build

# 预览生产构建
pnpm preview
```

## 📖 使用指南

### 基本使用流程

1. **选择操作类型**
   - 在首页选择"生成INSERT"或"生成UPDATE"

2. **输入DDL语句**
   ```sql
   CREATE TABLE users (
     id INT PRIMARY KEY,
     name VARCHAR(100) NOT NULL,
     email VARCHAR(255) UNIQUE,
     created_at DATETIME DEFAULT CURRENT_TIMESTAMP
   );
   ```

3. **上传Excel文件**
   - 支持包含表头行的Excel文件
   - 系统自动解析数据并建立映射关系

4. **配置字段映射**
   - 系统自动匹配DDL字段与Excel列
   - 支持手动调整映射关系
   - 实时显示匹配率和匹配状态

5. **生成SQL语句**
   - 选择数据库类型（MySQL/PostgreSQL/SQL Server）
   - 配置SQL格式（美化/压缩）
   - 生成并预览SQL语句

### 高级功能使用

#### 动态字段管理
- 在字段映射界面点击"添加字段"
- 设置字段名称、数据类型和默认值
- 支持数字递增、函数表达式等高级功能

#### 批量修改功能
- 选择需要批量修改的字段
- 设置替换规则或转换函数
- 支持正则表达式匹配和替换

#### SQL美化配置
```javascript
// 美化选项示例
{
  indentSpaces: 4,        // 缩进空格数
  formatStyle: 'expanded', // 格式风格：expanded/compact
  keywordCase: 'upper',   // 关键字大小写：upper/preserve
  maxLineLength: 80,      // 最大行长度
  alignValues: true       // 是否对齐VALUES子句
}
```

## 🏗️ 项目架构

### 技术栈
- **前端框架**: Vue 3 + Composition API
- **构建工具**: Vite 7.x
- **UI组件库**: Ant Design Vue 4.x
- **路由管理**: Vue Router 4.x
- **测试框架**: Vitest + Vue Test Utils
- **代码规范**: ESLint + Prettier

### 核心模块

#### 1. DDL解析模块 (`useDdlParser.js`)
- 解析CREATE TABLE语句
- 提取字段信息、数据类型、约束条件
- 支持多种数据库语法差异

#### 2. Excel解析模块 (`useExcelParserEnhanced.js`)
- 解析Excel文件内容
- 智能识别表头和数据类型
- 支持大数据量分块处理

#### 3. SQL生成模块 (`useSqlGeneratorEnhanced.js`)
- 生成INSERT/UPDATE SQL语句
- 支持多数据库类型适配
- 提供SQL美化和验证功能

#### 4. 字段匹配模块 (`useFieldMatcher.js`)
- 智能匹配DDL字段与Excel列
- 支持拼音转换和相似度计算
- 提供匹配置信度评估

### 目录结构
```
src/
├── components/          # 公共组件
│   ├── Layout/         # 布局组件
│   └── SqlPreview/     # SQL预览组件
├── composables/        # 组合式函数
│   ├── useDdlParser.js              # DDL解析
│   ├── useExcelParserEnhanced.js    # Excel解析增强版
│   ├── useSqlGeneratorEnhanced.js   # SQL生成增强版
│   ├── useFieldMatcher.js           # 字段匹配
│   ├── useErrorHandler.js           # 错误处理
│   └── usePinyinConverter.js        # 拼音转换
├── views/              # 页面组件
│   ├── HomePage.vue    # 首页
│   ├── InsertPage.vue  # INSERT生成页面
│   └── UpdatePage.vue  # UPDATE生成页面
├── router/             # 路由配置
└── main.js            # 应用入口
```

## 🔧 配置说明

### 数据库类型配置
支持以下数据库类型：
- **MySQL**: 使用反引号转义字段名
- **PostgreSQL**: 使用双引号转义字段名  
- **SQL Server**: 使用方括号转义字段名

### SQL格式配置
- **formatted**: 美化格式，适合阅读和调试
- **minified**: 压缩格式，适合生产环境使用

### 批量处理配置
- 默认批量大小：100条记录
- 支持自定义批量大小
- 大数据量自动分批处理

## 🧪 测试

### 运行测试
```bash
# 运行所有测试
pnpm test

# 运行UI测试界面
pnpm test:ui

# 运行测试并生成报告
pnpm test:run
```

### 测试覆盖范围
- DDL解析功能测试
- Excel解析功能测试  
- SQL生成功能测试
- SQL美化功能测试
- 字段匹配功能测试

## 📊 API文档

### 核心函数接口

#### generateInsertSql(tableName, fieldMappings, excelData, options)
生成INSERT SQL语句

**参数:**
- `tableName`: 表名
- `fieldMappings`: 字段映射关系数组
- `excelData`: Excel数据数组
- `options`: 配置选项

**返回值:** 格式化后的SQL语句

#### generateUpdateSql(tableName, fieldMappings, excelData, whereFields, options)
生成UPDATE SQL语句

**参数:**
- `whereFields`: WHERE条件字段数组
- 其他参数同INSERT

#### beautifySql(sql, options)
美化SQL语句

**参数:**
- `sql`: 原始SQL语句
- `options`: 美化配置选项

#### validateSqlSyntax(sql)
验证SQL语法

**返回值:** 包含验证结果和错误信息的对象

## ❓ 常见问题解答

### Q: 为什么生成的SQL语句执行报错？
A: 请检查以下可能的原因：
1. DDL语句格式是否正确
2. 字段映射关系是否准确
3. 数据类型转换是否合理
4. 数据库类型设置是否正确

### Q: 如何提高字段匹配的准确性？
A: 可以尝试以下方法：
1. 确保Excel表头与DDL字段名一致
2. 使用拼音匹配功能
3. 手动调整映射关系
4. 检查字段数据类型是否匹配

### Q: 支持哪些Excel文件格式？
A: 支持.xlsx、.xls、.csv格式，最大文件大小10MB。

### Q: 如何处理大数据量的Excel文件？
A: 系统支持分批处理，可以调整批量大小参数，避免生成过长的SQL语句。

### Q: 如何添加自定义数据库函数？
A: 在动态字段管理界面，选择"函数"类型，可以输入自定义函数表达式。

## 🐛 问题反馈

如果您在使用过程中遇到问题，请通过以下方式反馈：

1. 检查控制台错误信息
2. 查看浏览器开发者工具
3. 提供重现步骤和测试数据
4. 提交Issue到项目仓库

## 📄 许可证

本项目采用MIT许可证，详见LICENSE文件。

## 🤝 贡献指南

我们欢迎任何形式的贡献！请参考以下步骤：

1. Fork本项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启Pull Request

## 🔄 更新日志

### v0.0.0 (当前版本)
- ✅ 基础INSERT/UPDATE SQL生成功能
- ✅ 智能DDL解析和字段匹配
- ✅ Excel文件导入和解析
- ✅ SQL美化和语法验证
- ✅ 多数据库类型支持
- ✅ 动态字段管理和批量修改
- ✅ 完整的测试覆盖

## 📞 联系方式

如有任何问题或建议，请联系项目维护者。

---

**注意**: 本项目仍在积极开发中，功能可能会有所调整。建议定期查看更新日志了解最新变化。