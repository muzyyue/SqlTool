# 版本变更历史

## 0.0.2 (2025-12-24)

- 修复formatValue函数对系统函数字段（如UUID()）的错误处理
- 在formatValue中添加系统函数调用的特殊处理，避免为函数添加引号
- 确保SQL生成中UUID()等函数字段前有正确的逗号分隔

## 0.0.1 (2025-12-24)

- 修复SQL生成中values数组包含undefined值时逗号丢失的问题
- 在values.join前添加验证逻辑，将undefined/null/''转换为'NULL'
