# 版本变更历史

## 0.0.1 (2025-12-24)

- 修复SQL生成中values数组包含undefined值时逗号丢失的问题
- 在values.join前添加验证逻辑，将undefined/null/''转换为'NULL'
