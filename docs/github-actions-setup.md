# GitHub Actions CI/CD 配置说明

## 📋 概述

本项目配置了完整的GitHub Actions自动化构建和部署流程，包括代码质量检查、测试、构建和部署到多个平台。

## 🚀 功能特性

### 自动化流程

- **代码质量检查**：ESLint代码规范检查、Prettier格式化检查
- **自动化测试**：运行Vitest单元测试套件
- **构建优化**：基于Vite的快速构建，支持缓存优化
- **多平台部署**：支持GitHub Pages、Vercel等平台

### 触发条件

- 推送到 `main`、`master` 或 `rebuild` 分支
- 创建Pull Request到主分支
- 手动触发部署（支持选择生产/预发布环境）

## 📁 配置文件结构

```
.github/
└── workflows/
    └── build-and-deploy.yml    # 主要的CI/CD配置文件
```

## 🔧 配置详解

### 1. Quality Check Job

```yaml
quality-check:
  steps:
    - 代码检出
    - Node.js 20 环境配置
    - pnpm 8 包管理器配置
    - 依赖安装（使用lockfile确保版本一致性）
    - ESLint代码规范检查
    - Prettier格式检查
    - 单元测试执行
    - 测试结果上传
```

### 2. Build Job

```yaml
build:
  steps:
    - 依赖安装
    - 执行构建命令：pnpm run build
    - 构建产物上传
    - 构建大小分析
```

### 3. 部署 Jobs

支持多种部署目标：

- **GitHub Pages**：推送到main、master或rebuild分支时自动部署到GitHub Pages
- **Vercel**：推送到main、master或rebuild分支时部署到Vercel平台
- **自定义**：可扩展其他部署平台

## 📦 部署平台配置

### GitHub Pages

无需额外配置，推送到main、master或rebuild分支时自动部署。

### Vercel部署

需要在GitHub仓库设置中添加以下secrets：

```
VERCEL_TOKEN      # Vercel访问令牌
VERCEL_ORG_ID     # Vercel组织ID
VERCEL_PROJECT_ID # Vercel项目ID
```

### 其他平台

可以参考配置文件中的Vercel部署示例，添加其他平台的部署步骤。

## 🛠️ 使用方法

### 1. 基本使用

1. 将代码推送到 `main`、`master` 或 `rebuild` 分支
2. GitHub Actions自动执行构建和测试
3. 成功后自动部署到配置的平台

### 2. Pull Request

- 创建Pull Request时自动运行质量检查
- 确保代码符合项目规范

### 3. 手动部署

1. 进入GitHub仓库的Actions页面
2. 选择"Build and Deploy"工作流
3. 点击"Run workflow"
4. 选择部署目标（生产/预发布）
5. 点击"Run workflow"开始部署

## 📊 构建产物

构建完成后会生成以下产物：

- `dist/` 目录：构建后的生产文件
- `test-results/` 目录：测试结果报告

## 🔍 监控和日志

- **Actions页面**：查看所有工作流执行记录
- **构建日志**：详细的构建和部署过程日志
- **部署状态**：实时查看部署进度和结果

## ⚡ 性能优化

### 缓存策略

- **pnpm缓存**：缓存node_modules，提升依赖安装速度
- **构建缓存**：利用GitHub Actions缓存减少重复构建

### 并行执行

- 质量检查和构建可以并行执行
- 多个部署任务独立运行

## 🛡️ 安全考虑

### Secrets管理

- 所有敏感信息通过GitHub Secrets管理
- 支持环境变量的安全传递

### 权限控制

- 最小权限原则
- 仅在必要时授予写权限

## 🔧 自定义配置

### 修改Node版本

在配置文件中修改：

```yaml
env:
  NODE_VERSION: '20' # 修改为需要的版本
```

### 添加新的部署目标

在workflow文件中添加新的job：

```yaml
deploy-custom:
  name: Deploy to Custom Platform
  runs-on: ubuntu-latest
  needs: build
  if: github.ref == 'refs/heads/main'

  steps:
    -  # 添加自定义部署步骤
```

### 修改触发分支

在配置文件中修改：

```yaml
on:
  push:
    branches: [main, rebuild, develop] # 添加更多分支
```

## 📝 注意事项

1. **首次部署前**：确保GitHub Pages已在仓库设置中启用
2. **Vercel配置**：需要先在Vercel平台创建项目并获取相关ID
3. **权限问题**：确保GitHub Token有足够的权限执行部署
4. **构建失败**：检查构建日志，确保所有依赖和配置正确

## 🆘 故障排除

### 常见问题

1. **构建失败**：检查package.json中的构建脚本
2. **依赖安装失败**：确认pnpm-lock.yaml文件存在且版本匹配
3. **部署失败**：检查目标平台的配置和权限

### 调试方法

- 查看Actions页面的详细日志
- 在本地运行相同的构建命令进行测试
- 检查分支保护和状态检查设置

---

通过这个CI/CD配置，你的Vue项目将具备自动化的构建、测试和部署能力，大大提升开发效率和代码质量。
