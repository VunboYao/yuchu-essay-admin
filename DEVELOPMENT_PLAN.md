# React Admin 从 0 到 1 开发计划

> 本文档是练手用开发计划：在仓库新建 `Admin-React/`，用 Vite + React 19 + TypeScript 从 0 到 1 复刻现有 Vue Admin（[`Admin/`](../Admin/)）全部功能。  
> 你按步骤实现；每步完成后把代码/疑问发我，我按该步「验收标准」逐项核对。  
> **默认不替你写完整业务**（除非某步明确说「帮我实现」）；Vue Admin 保留作对照，不改动。

---

## 目标与约束

- **练手为主**：完整做一遍 React 实战后台，不追求一次性抄完。
- **功能对等**：与现有 `Admin/` 的 11 个业务页 + 登录 + Layout + OSS/富文本/拖拽 **行为一致**；API 仍对接 `course_server` 的 `/admin/api/v1`。
- **Vue 保留对照**：本目录为 React 版；[`Admin/`](../Admin/) 随时左右对照。
- **验收驱动**：每步有勾选清单；完成一步再进下一步。

---

## 锁定技术栈（与 Vue 对位 + 刻意补 React 缺口）

| 能力 | Vue Admin | React 选型 |
|------|-----------|------------|
| 构建 | Vite | **Vite + React 19** |
| 语言 | TypeScript | TypeScript（严格模式） |
| UI | Element Plus | **Ant Design 5**（中文后台最常见对位） |
| 路由 | Vue Router | **React Router v7** |
| 客户端状态 | Pinia（仅 auth） | **Zustand** |
| 服务端状态 | 页面内 `ref` | **TanStack Query v5**（React 核心实战能力） |
| 表单 | 手写 + Element | **react-hook-form + zod** |
| HTTP | axios | axios（拦截器逻辑可直接迁移） |
| 富文本 | wangEditor | **TipTap** |
| 拖拽 | vuedraggable | **@dnd-kit** |
| OSS | ali-oss | ali-oss（逻辑复用 `Admin/src/utils/ossUpload.ts`） |
| 包管理 | pnpm | pnpm |
| 开发端口 | 5173 | **5174**（避免与 Vue Admin 抢端口） |

**刻意不选 Next.js**：当前 Admin 是纯 SPA，Next 的 RSC/SSR 对后台价值低、干扰「React 基础组件模型」学习。掌握 Vite SPA 后再考虑「可选：迁 Next」。

---

## Vue → React 心智对照（贯穿全程）

| Vue | React |
|-----|-------|
| `.vue` SFC（template/script/style） | `.tsx` + CSS Modules / 全局 CSS |
| `ref` / `reactive` | `useState` / `useReducer` |
| `computed` | `useMemo`（或派生变量） |
| `watch` | `useEffect`（慎用，优先事件驱动） |
| `onMounted` / `onUnmounted` | `useEffect(() => { ...; return cleanup }, [])` |
| `provide/inject` | `Context` |
| Pinia | Zustand |
| Vue Router + `beforeEach` | React Router + 布局路由 / loader / 守卫组件 |
| `v-if` / `v-for` | 条件渲染 / `.map` |
| `v-model` | `value` + `onChange`（或 RHF `Controller`） |
| 插槽 | `children` / render props |
| `keep-alive` | 路由出口缓存策略，或依赖 TanStack Query 缓存 |

---

## 目标目录骨架

```text
Admin-React/
├── DEVELOPMENT_PLAN.md     # 本计划
├── README.md               # 启动说明（Step 15 完善）
├── package.json
├── vite.config.ts          # proxy /admin/api → :8080，alias @
├── .env.development        # VITE_API_BASE=/admin/api/v1
├── index.html
└── src/
    ├── main.tsx
    ├── App.tsx
    ├── routes/index.tsx
    ├── layouts/AdminLayout.tsx
    ├── pages/              # 与 Admin/src/views 一一对应
    ├── components/         # FormDialog / OssUpload / ImageUrlList / RichText
    ├── api/                # 从 Admin/src/api 迁移
    ├── stores/auth.ts      # Zustand
    ├── hooks/              # 自定义 hooks（逐步提炼）
    ├── types/              # 从 Admin/src/types 拷贝
    ├── constants/
    ├── utils/
    └── styles/
```

---

## 功能对等清单（最终验收总表）

与 [`Admin/src/router/index.ts`](../Admin/src/router/index.ts) 一致：

- [ ] 登录 / 登出 / token 守卫 / 401 跳转
- [ ] Dashboard（5 接口并行）
- [ ] 作文专题（筛选、创建编辑、上/下架、封面 OSS、正文图拖拽、标签内联新建）
- [ ] 优秀作文（CRUD、双 TipTap、关联文章、标签内联、删除）
- [ ] 下载资料（CRUD、private OSS、免费标签、强制删除 confirm）
- [ ] 教材分类（无删除）
- [ ] 标签 CRUD
- [ ] 首页入口 / 广告位 / 公众号导流
- [ ] 意见反馈（回复）
- [ ] 操作日志（只读）

复杂点对照：

- [`Admin/src/utils/ossUpload.ts`](../Admin/src/utils/ossUpload.ts)
- [`Admin/src/components/ImageUrlList.vue`](../Admin/src/components/ImageUrlList.vue)
- [`Admin/src/components/RichTextEditor.vue`](../Admin/src/components/RichTextEditor.vue)

---

## 分步验收协议（找我检查时）

每完成一步，请按下面格式发消息（可直接复制）：

```text
【Step 验收】Step N · <步骤名>

自测清单：
- [x] / - [ ] （把该步验收项贴过来并勾选）

相关文件：
- path/to/file.tsx

卡点/疑问：
- （可选）Vue 里是 xxx，React 我写成了 yyy，是否合适？
```

我会对照：

1. 该步「验收标准」是否全部满足  
2. 与 Vue Admin 行为是否对等  
3. 该步列出的 React 技术点是否真正用到（避免黑盒堆砌 Ant Design）

验收记录建议写在本文档各步下方的「验收记录」栏，或另开对话归档。

---

## 分步计划

### Step 0 · 对照阅读（不写代码，约 0.5 天）

**目标**：建立「要造什么」的地图。

**必读**：

- [`Admin/README.md`](../Admin/README.md)
- [`Admin/src/router/index.ts`](../Admin/src/router/index.ts)
- [`Admin/src/layout/index.vue`](../Admin/src/layout/index.vue)
- [`Admin/src/stores/auth.ts`](../Admin/src/stores/auth.ts)
- [`Admin/src/api/request.ts`](../Admin/src/api/request.ts)

**验收**：

- [ ] 能说出完整路由列表（含 path / 中文 title）
- [ ] 能说清鉴权流程（token key、守卫、401）
- [ ] 能说清 API 解包约定（`{ code, message, data }`，`code === 0`）
- [ ] 能指出哪些页有 OSS / 富文本 / 拖拽

**验收记录**：_（日期 / 通过与否 / 备注）_

---

### Step 1 · 脚手架与工程基线

**目标**：空应用能跑起来，目录与脚本就位。

**React 技术点**：Vite React 模板、`main.tsx` 挂载、StrictMode、path alias、env 类型。

**产出**：

- `pnpm create vite . --template react-ts`（在本目录执行，或按你习惯创建后对齐目录名）
- 接入 Ant Design、配置中文 locale、proxy、端口 **5174**
- `pnpm` scripts：`dev` / `build` / `type-check` / `preview`
- 拷贝 `Admin/src/types/`、`Admin/src/constants/options.ts`（可先原样）

**验收**：

- [ ] `pnpm dev` 打开空白页无报错（`http://localhost:5174`）
- [ ] `@/` 别名可用
- [ ] `import.meta.env.VITE_API_BASE` 有类型提示
- [ ] `pnpm type-check` 通过

**验收记录**：_（日期 / 通过与否 / 备注）_

---

### Step 2 · 路由骨架 + Layout 空壳

**目标**：侧栏菜单 + 顶栏 + 子路由占位页，路径与 Vue 完全一致。

**React 技术点**：React Router nested routes、`Outlet`、`NavLink`、`lazy` + `Suspense`、菜单与 `location.pathname` 同步。

**产出**：`src/routes/index.tsx`、`src/layouts/AdminLayout.tsx`、各 `src/pages/*/index.tsx` 占位（标题即可）。

**路径清单**（须一致）：

| path | title |
|------|-------|
| `/login` | 登录（本步可先不做真实登录） |
| `/dashboard` | 数据概览 |
| `/articles` | 作文专题 |
| `/essays` | 优秀作文 |
| `/downloads` | 下载资料 |
| `/taxonomy` | 教材分类 |
| `/tags` | 标签管理 |
| `/home-blocks` | 首页入口 |
| `/ad-slots` | 广告位 |
| `/official-accounts` | 公众号导流 |
| `/feedbacks` | 意见反馈 |
| `/operation-logs` | 操作日志 |

**验收**：

- [ ] 11 个业务 path 可点击切换
- [ ] 刷新深链不 404
- [ ] 未知路径重定向 `/dashboard`
- [ ] 菜单分组与 Vue Layout 一致（概览 / 内容 / 分类标签 / 运营 / 系统）

**验收记录**：_（日期 / 通过与否 / 备注）_

---

### Step 3 · Auth：Zustand + 登录页 + 守卫

**目标**：登录态行为与 Vue 一致。

**React 技术点**：Zustand + localStorage、受保护路由组件、`Navigate` + `redirect` query、受控表单入门。

**对照**：

- [`Admin/src/stores/auth.ts`](../Admin/src/stores/auth.ts)
- [`Admin/src/views/login/index.vue`](../Admin/src/views/login/index.vue)

**验收**：

- [ ] 无 token 访问 `/articles` → `/login?redirect=...`
- [ ] 登录成功跳转 redirect 或 `/dashboard`
- [ ] 已登录访问 `/login` → `/dashboard`
- [ ] 顶栏展示 username/role，登出清 token 并回登录页
- [ ] token key 仍为 `admin_token`（可与 Vue 共用同一后端会话）

**验收记录**：_（日期 / 通过与否 / 备注）_

---

### Step 4 · Axios 封装 + API 模块迁移

**目标**：请求层与 Vue 行为一致（Bearer、解包、401、全局 loading）。

**React 技术点**：模块化 api、泛型、拦截器副作用与 React 解耦（不要在拦截器里直接用 hook）。

**对照**：[`Admin/src/api/request.ts`](../Admin/src/api/request.ts) 及各 `Admin/src/api/*.ts`。

**验收**：

- [ ] 登录接口打通（可在登录页真调）
- [ ] `code !== 0` 抛错并 message 提示
- [ ] 401 清态并跳登录（登录接口本身除外）
- [ ] （可选）`showLoading` 引用计数 loading 生效

**验收记录**：_（日期 / 通过与否 / 备注）_

---

### Step 5 · TanStack Query 基建 + 共享 UI 组件

**目标**：统一「列表查询 / 变更后失效」模式；做出 FormDialog。

**React 技术点**：`QueryClientProvider`、`useQuery` / `useMutation`、`queryKey` 约定、自定义 hook、受控 Dialog、`children` 组合。

**产出**：`AppFormDialog`、全局 `message`/`modal` 封装、Query 默认配置（staleTime 等）。

**验收**：

- [ ] 用任意一个 GET（如 tags 列表）在占位页演示 loading / error / data 三态
- [ ] mutation 成功后 `invalidateQueries` 刷新列表
- [ ] Dialog：禁点遮罩关闭、确认中禁用按钮（对齐 Vue）

**验收记录**：_（日期 / 通过与否 / 备注）_

---

### Step 6 · 标签管理（第一个完整 CRUD）

**目标**：跑通「筛选 + 表格 + 弹窗表单 + 删」标准范式，后续页复制。

**React 技术点**：react-hook-form + zod、Ant Table/Form。

**对照**：[`Admin/src/views/tag/index.vue`](../Admin/src/views/tag/index.vue)

**验收**：

- [ ] 列表分页/筛选与 Vue 字段一致
- [ ] 创建/编辑/删除成功，列表刷新
- [ ] 校验失败有表单错误提示
- [ ] 与 Vue Admin 同账号操作结果一致（可双开 5173 / 5174 对比）

**验收记录**：_（日期 / 通过与否 / 备注）_

---

### Step 7 · 教材分类（无删除变体）

**目标**：复用 Step 6 范式，处理「无删除」与多筛选项。

**对照**：[`Admin/src/views/taxonomy/index.vue`](../Admin/src/views/taxonomy/index.vue)

**验收**：

- [ ] 年级/册次/单元/标题筛选可用
- [ ] 创建/编辑可用
- [ ] 无删除入口
- [ ] 字段与 Vue 一致

**验收记录**：_（日期 / 通过与否 / 备注）_

---

### Step 8 · OSS 上传基础设施

**目标**：抽 `ossUpload` + `OssUploadButton`，后续页复用。

**React 技术点**：`useRef` 隐藏 file input、异步状态机、组件 props（`onSuccess`）、ACL public/private。

**对照**：

- [`Admin/src/components/OssUploadButton.vue`](../Admin/src/components/OssUploadButton.vue)
- [`Admin/src/utils/ossUpload.ts`](../Admin/src/utils/ossUpload.ts)

**验收**：

- [ ] STS 成功时能上传图片并得到 CDN URL
- [ ] STS placeholder 模式可手填 URL 降级
- [ ] `subdir`：`covers` / `body` / `downloads` / `icons` 可配置
- [ ] private 模式返回 `objectKey`（下载页要用）

**验收记录**：_（日期 / 通过与否 / 备注）_

---

### Step 9 · 运营配置三页（home-block / ad-slot / official-account）

**目标**：批量落地中等复杂度 CRUD + Upsert。

**对照**：

- [`Admin/src/views/home-block`](../Admin/src/views/home-block)
- [`Admin/src/views/ad-slot`](../Admin/src/views/ad-slot)
- [`Admin/src/views/official-account`](../Admin/src/views/official-account)
- [`Admin/src/api/config.ts`](../Admin/src/api/config.ts)

**验收**：

- [ ] 首页入口：图标 OSS、navType、switchTab 提示
- [ ] 广告位：按 slotKey upsert、激励视频模板一键填充、page 校验
- [ ] 公众号：按 scene upsert/删
- [ ] 与 Vue 行为一致

**验收记录**：_（日期 / 通过与否 / 备注）_

---

### Step 10 · 反馈回复 + 操作日志

**目标**：只读/半写页面；巩固筛选分页。

**对照**：

- [`Admin/src/views/feedback`](../Admin/src/views/feedback)
- [`Admin/src/views/operation-log`](../Admin/src/views/operation-log)

**验收**：

- [ ] 反馈可回复并改状态
- [ ] 操作日志只读筛选
- [ ] 无多余写操作（反馈无建删、日志无写）

**验收记录**：_（日期 / 通过与否 / 备注）_

---

### Step 11 · 作文专题（高难：OSS + 多图拖拽 + 上架）

**目标**：最接近完整业务页；覆盖拖拽与状态机。

**React 技术点**：`@dnd-kit` 列表排序、复合表单、自定义 hook 拆分、与 Query 协作。

**对照**：

- [`Admin/src/views/article/index.vue`](../Admin/src/views/article/index.vue)
- [`Admin/src/components/ImageUrlList.vue`](../Admin/src/components/ImageUrlList.vue)

**验收**：

- [ ] 列表筛选、创建/编辑、上/下架（独立 status API，无删除）
- [ ] 封面 OSS；正文图最多 20、可拖拽排序、可预览
- [ ] 标签 select 可内联 `POST /tags`
- [ ] slug 校验与 Vue 一致

**验收记录**：_（日期 / 通过与否 / 备注）_

---

### Step 12 · 优秀作文（高难：双富文本）

**目标**：TipTap 受控集成；空 HTML 校验。

**React 技术点**：第三方编辑器与 RHF 桥接、受控/非受控边界、清理卸载。

**对照**：

- [`Admin/src/views/essay/index.vue`](../Admin/src/views/essay/index.vue)
- [`Admin/src/components/RichTextEditor.vue`](../Admin/src/components/RichTextEditor.vue)

**验收**：

- [ ] 正文 + 点评双编辑器
- [ ] 关联文章
- [ ] CRUD + 删除
- [ ] 标签内联新建
- [ ] 空内容拦截

**验收记录**：_（日期 / 通过与否 / 备注）_

---

### Step 13 · 下载资料（高难：private OSS + 强制删）

**目标**：文件上传写 objectKey；删除二次确认流。

**对照**：[`Admin/src/views/download/index.vue`](../Admin/src/views/download/index.vue)

**验收**：

- [ ] 归属文章
- [ ] private 上传写 objectKey
- [ ] 免费标签逻辑与 Vue 一致
- [ ] 删失败后再 `?confirm=true`

**验收记录**：_（日期 / 通过与否 / 备注）_

---

### Step 14 · Dashboard

**目标**：多请求并行与只读展示。

**React 技术点**：`useQueries` 或多个 `useQuery`、数据派生展示（不必上图表库，与 Vue 一致）。

**对照**：

- [`Admin/src/views/dashboard/index.vue`](../Admin/src/views/dashboard/index.vue)
- [`Admin/src/api/stats.ts`](../Admin/src/api/stats.ts)

**验收**：

- [ ] overview / hot-articles / searches / downloads / ad-events 五块数据正确
- [ ] loading 骨架合理

**验收记录**：_（日期 / 通过与否 / 备注）_

---

### Step 15 · 工程化收尾与体验对齐

**目标**：可维护、可演示、与 Vue 体验接近。

**React 技术点**：Error Boundary、路由 `lazy` 统一、404/空态、样式 token、README。

**关于 keep-alive**：Vue 用 `keep-alive max=6`。React 默认不做路由缓存；用 TanStack Query 缓存保证回页数据仍在。若坚持「滚到哪还在哪」，再加轻量 outlet 缓存（可选加分）。

**验收**：

- [ ] 渲染错误有兜底页
- [ ] `pnpm build` + `type-check` 通过
- [ ] README：启动、代理、账号、目录说明
- [ ] 上方「功能对等清单」全部打勾

**验收记录**：_（日期 / 通过与否 / 备注）_

---

### Step 16 · 加分：测试与 Hooks 提炼（可选）

**目标**：补测试与抽象，不挡功能交付。

**React 技术点**：Vitest + Testing Library、测自定义 hook、测登录守卫、测 zod schema。

**验收**：

- [ ] 至少 3 个有意义用例（auth store、request 解包、某个 zod schema）
- [ ] `hooks/` 中有 `useAuth`、`useOssUpload`、`useConfirmDelete` 等提炼

**验收记录**：_（日期 / 通过与否 / 备注）_

---

## 推荐学习节奏

```text
Step0 对照 → Step1 脚手架 → Step2 路由Layout → Step3 Auth
  → Step4 API → Step5 Query+共享组件 → Step6 Tag CRUD
  → Step7 Taxonomy → Step8 OSS → Step9 运营三页
  → Step10 反馈日志 → Step11 Article → Step12 Essay
  → Step13 Download → Step14 Dashboard → Step15 收尾
  → Step16 可选测试
```

| 周次 | 步骤 | 重心 |
|------|------|------|
| Week 1 | Step 0–5 | 打基础 |
| Week 2 | Step 6–10 | CRUD 熟练 |
| Week 3 | Step 11–14 | 复杂业务 |
| Week 4 | Step 15–16 | 打磨 |

每天建议：**先对照 Vue 页 → 自己写 React → 双开 5173/5174 点一遍 → 按「分步验收协议」发我检查**。

---

## 协作约定

1. **你写业务，我做审查与纠偏**（除非你明确说某步「帮我实现」）。
2. 审查维度：Vue 行为对等 + 本步 React 技术点是否真正落地。
3. 后端仍用现有 `course_server`；开发账号默认 `admin / admin123`（见 Vue Admin README）。
4. 接口契约以 [`course_server/docs/api-reference.md`](../course_server/docs/api-reference.md) 为准；字段口径见 [`prd/002`](../prd/002-后台管理系统（内容增长MVP版）.md)。

---

## 当前进度

| Step | 状态 | 备注 |
|------|------|------|
| 0 | 未开始 | 对照阅读 |
| 1 | 未开始 | 脚手架 |
| 2 | 未开始 | 路由 + Layout |
| 3 | 未开始 | Auth |
| 4 | 未开始 | API |
| 5 | 未开始 | Query + 共享组件 |
| 6 | 未开始 | 标签 CRUD |
| 7 | 未开始 | 教材分类 |
| 8 | 未开始 | OSS |
| 9 | 未开始 | 运营三页 |
| 10 | 未开始 | 反馈 + 日志 |
| 11 | 未开始 | 作文专题 |
| 12 | 未开始 | 优秀作文 |
| 13 | 未开始 | 下载资料 |
| 14 | 未开始 | Dashboard |
| 15 | 未开始 | 收尾 |
| 16 | 可选 | 测试 + Hooks |

> 完成某步验收通过后，把上表对应行改为「已通过」并填日期即可。
