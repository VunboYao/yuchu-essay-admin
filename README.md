# course-admin-react · React 后台管理端（练手）

用 **Vite + React 19 + TypeScript + Ant Design** 复刻 [`Admin/`](../Admin/)（Vue 3）全部功能，对接同一套 `course_server` `/admin/api/v1`。

## 从这里开始

| 文档 | 用途 |
|------|------|
| **[技术栈提升 · 整体学习计划](../prd/005-技术栈提升-整体学习计划.md)** | 五阶段总路线（P1–P5），本目录对应 **P1** |
| **[SKILLS_CHECKLIST.md](./SKILLS_CHECKLIST.md)** | 技术要求与掌握度自查（学什么 / 会不会） |
| **[DEVELOPMENT_PLAN.md](./DEVELOPMENT_PLAN.md)** | 分步开发计划与验收清单（怎么做 / 做到哪算过） |
| **[ACCEPTANCE_LOG.md](./ACCEPTANCE_LOG.md)** | 分步验收记录 |

建议顺序：先看总计划定位 P1 → 用技能自查标出 L0/L1 缺口并补到 L2 → 再按开发计划从 Step 0 开干。

## 怎么推进

1. 打开 `SKILLS_CHECKLIST.md`，填掌握度，按 Step 前置补学。
2. 打开 `DEVELOPMENT_PLAN.md`，从 **Step 0** 开始实现。
3. 每步先对照 Vue 版 [`Admin/`](../Admin/) 对应文件，再自己写 React。
4. 自测勾选该步验收项后，按文档「分步验收协议」发我检查。
5. 验收记录写入 [ACCEPTANCE_LOG.md](./ACCEPTANCE_LOG.md)。

## 约定

- 本目录用于练手；**默认你写业务代码**，AI 做审查与纠偏。
- Vue 版 `Admin/` **不要改**，作左右对照。
- 开发端口规划：**5174**（Vue Admin 仍为 5173）。
- 默认管理员：`admin / admin123`（需先启动 `course_server`）。

## 当前状态

脚手架尚未创建。请按 `DEVELOPMENT_PLAN.md` 的 Step 1 自行初始化项目。
