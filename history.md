# 版本变更历史

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
