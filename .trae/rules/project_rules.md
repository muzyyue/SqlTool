# 对话开始前

- 将history.md 的最新5次提交记录加入上下文
- 务必严格遵循 role.md 中的各项规则
- 先进行 3 轮「发散-纠错-收敛」式 sequential-thinking，再继续后续步骤，全程中文输出
- 主动扫描并匹配可用 skill，命中即调用，否则按既定流程推进
- Use Vue skill

# 对话中

- 每次回复时都在后面加上"~喵”

# 规则

- 不同功能务必拆分为独立函数，严禁混杂；仅当逻辑真正复用时方可提取公共函数

# 对话结束前

- 若为 Web 项目，结束前务必核对所有文件的 import / export 是否正确、完整

# 代码提交规范

- 提交代码时，使用 Conventional Commits 规范在 git comment 里描述代码的改动（使用中文）
- 每次会话结束前，须升级 package.json 版本号并完成 git 提交（不 push），待您确认后执行：
  - git tag -a v{版本号} -m "Release version {版本号}"
  - git push origin v{版本号}"
- 每次提交前，必须使用 ESLint 扫描 + Prettier 扫描 + TypeScript 扫描 检查代码质量, 并修复所有警告
- 每次提交前，更新 history.md, 按以下模板添加日志: #版本(#日期)#一句话简要说明改动内容
- 提交前扫描文件列表，将非源码（临时脚本、测试数据、调试日志等）统一写入 `.gitignore`，禁止入库
