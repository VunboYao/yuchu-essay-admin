# course-admin-react · React 后台管理端

用 **Vite + React 19 + TypeScript + Ant Design** 复刻 [`Admin/`](../Admin/)（Vue 3）的业务能力，对接同一套 `course_server` `/admin/api/v1`。

文档已按阅读顺序放在 [`docs/`](./docs/README.md)，脚手架不要覆盖该目录。

## 阅读顺序

1. [01 工程契约](./docs/01-工程契约.md) — 质量硬契约（冲突时赢）
2. [02 技能自查](./docs/02-技能自查.md) — 开干前标掌握度
3. [03 开发计划](./docs/03-开发计划.md) — 从 Step 0 搭建
4. [04 验收记录](./docs/04-验收记录.md) — 每步勾选
5. [Zod 与 RHF](./docs/learn-zod-rhf.md) — 两库独立、职责与接线（通用，不是契约）
6. [Zod 与 Vitest](./docs/learn-vitest-zod.md) — 对照本项目，不是契约

总路线：[`prd/005`](../prd/005-技术栈提升-整体学习计划.md)（本目录 = P1）。

## 约定

- Vue 版 `Admin/` 不要改；只对路由 / API 字段 / 业务规则。
- 开发端口 **5174**；账号 `admin / admin123`（需先启动 `course_server`）。
- 质量门：`pnpm verify`（lint + type-check；test 暂缓）红灯 = 该 Step 未完成。
- 代码落在 `src/app/` `src/shared/` `src/features/<域>/`。
