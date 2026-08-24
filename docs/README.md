# 文档怎么读

按编号顺序看。冲突时以 **01 工程契约** 为准。

| 编号 | 文件 | 何时读 |
|------|------|--------|
| 01 | [工程契约](./01-工程契约.md) | 开工前必读；写代码 / Review 的质量真相源 |
| 02 | [技能自查](./02-技能自查.md) | 01 之后、写第一行代码之前，标 L0/L1 缺口 |
| 03 | [开发计划](./03-开发计划.md) | 自查后从 Step 0 开干；每步验收清单在这里。Vitest 延后到 Step 16 |
| 04 | [验收记录](./04-验收记录.md) | 每完成一步勾选、找人审查时附上 |
| 08 | [TanStack Query](./08-learn-tanstack-query.md) | Step 5～6 前后读。用标签 CRUD 学 Query v5：Client、queryKey、状态机、写后失效 |
| 09 | [Step 3 Auth 引导式开发](./09-step3-auth引导式开发.md) | 完成路由与 Layout 后，按检查点实现登录态闭环。检查点 0 / 7（测试）暂缓 |
| 10 | [Step 4 HTTP 引导式开发](./10-step4-http引导式开发.md) | Step 3 通过后，按检查点实现 ApiError、axios 客户端与真登录。对照源为 01 契约 + 后端 API，不读 `Admin/src`。检查点 7（测试）暂缓 |
| 11 | [Step 5 Shared 引导式开发](./11-step5-shared引导式开发.md) | Step 4 通过后，按检查点挂 QueryClient、做 Dialog / QueryState。对照源为 01 契约 + TanStack / antd 官方 API，不读 `Admin/src`。禁止演示 GET |
| — | [Zod 与 RHF](./learn-zod-rhf.md) | 通用说明：两库独立、职责、接线；不是契约 |
| — | [Zod 与 Vitest](./learn-vitest-zod.md) | 对照本项目的学习笔记；不是契约 |
| — | [前端项目格式化配置指南](./前端项目格式化配置指南.md) | 复制 Prettier、EditorConfig 与工作区配置时查阅 |

根目录 [`../README.md`](../README.md) 只保留启动入口。脚手架不要删 `docs/`。

总路线见 [`prd/005`](../../prd/005-技术栈提升-整体学习计划.md)（本目录 = P1）。
