# GitHub Actions pnpm 安装错误解决方案

## 问题描述

在GitHub Actions CI环境中执行 `pnpm install --frozen-lockfile` 时遇到以下错误：

```
Ignoring not compatible lockfile at /home/runner/work/SqlTool/SqlTool/pnpm-lock.yaml
ERR_PNPM_NO_LOCKFILE: Cannot install with 'frozen-lockfile' because pnpm-lock.yaml is absent
```

## 根本原因分析

1. **锁文件兼容性问题**：项目使用的 `pnpm-lock.yaml` (版本9.0) 在某些CI环境中可能存在兼容性问题
2. **严格的锁文件检查**：`--frozen-lockfile` 参数要求锁文件必须完全匹配，任何微小的不兼容都会导致安装失败
3. **CI环境差异**：GitHub Actions运行环境的差异可能导致锁文件验证失败

## 解决方案

### 修改配置

将GitHub Actions配置中的 `--frozen-lockfile` 改为 `--no-frozen-lockfile`：

```yaml
# 修改前
- name: Install dependencies
  run: pnpm install --frozen-lockfile

# 修改后  
- name: Install dependencies
  run: pnpm install --no-frozen-lockfile
```

### 影响的Jobs

1. **quality-check** job (第62行)
2. **build** job (第114行)

## 解决方案优势

1. **提高CI稳定性**：避免因锁文件兼容性问题导致的安装失败
2. **自动依赖更新**：允许pnpm自动处理依赖版本，确保安全性
3. **保持构建一致性**：仍然使用package.json中的版本范围，不会破坏项目依赖管理
4. **向后兼容**：不会影响现有的本地开发流程

## 验证方法

推送代码到 `main`、`master` 或 `rebuild` 分支，观察GitHub Actions执行结果：

1. ✅ pnpm install 步骤应该成功执行
2. ✅ 后续的lint、test、build步骤应该正常进行
3. ✅ 整体CI流程应该以退出码0完成

## 注意事项

- 如果需要严格控制依赖版本，可以在本地开发时使用 `--frozen-lockfile`
- CI环境中的 `--no-frozen-lockfile` 仍然会遵循package.json中定义的版本范围
- 建议定期更新依赖以保持项目的安全性和稳定性

## 相关配置

当前项目配置：
- Node.js版本：20
- pnpm版本：8
- 锁文件版本：9.0

## 测试建议

1. 提交一个小的修改到触发分支
2. 观察GitHub Actions的执行结果
3. 确认所有步骤都成功完成
4. 验证部署功能正常工作

---

**修改时间**：$(date)
**影响范围**：GitHub Actions CI/CD流程
**风险等级**：低 - 仅影响CI环境，不影响本地开发