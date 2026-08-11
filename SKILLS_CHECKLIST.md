# React Admin 技术要求与自查清单

> 与 [`DEVELOPMENT_PLAN.md`](./DEVELOPMENT_PLAN.md) 分工：  
> - **开发计划** = 怎么做、做到哪算过  
> - **本文** = 学什么、会不会、开干前自检  
>
> 面向：资深 Vue / TypeScript → 补 React 实战。少科普，多对照与自查题。

官方入口（按需点开，不必全读）：

- [React 文档](https://react.dev/learn)
- [React Router](https://reactrouter.com/)
- [Zustand](https://zustand-demo.pmnd.rs/)
- [TanStack Query](https://tanstack.com/query/latest/docs/framework/react/overview)
- [react-hook-form](https://react-hook-form.com/)
- [Zod](https://zod.dev/)
- [Ant Design](https://ant.design/components/overview-cn)
- [TipTap](https://tiptap.dev/docs)
- [@dnd-kit](https://docs.dndkit.com/)

| 链接 | 一句话 | 类似 Vue 侧 |
|------|--------|-------------|
| React | UI 框架本体 | Vue 3 |
| React Router | 页面路由 | Vue Router |
| Zustand | 全局客户端状态 | Pinia（更轻） |
| TanStack Query | 服务端数据缓存/请求 | vue-query / 自研 request |
| react-hook-form | 表单状态与校验 | ElForm + v-model 模式 |
| Zod | 数据/schema 校验 | yup / 手写校验 |
| Ant Design | UI 组件库 | Element Plus |
| TipTap | 富文本编辑器 | wangeditor / Quill |
| @dnd-kit | 拖拽排序 | vuedraggable |

---

## 1. 怎么用（掌握度）

| 等级 | 含义 | 建议 |
|------|------|------|
| **L0** | 未接触 / 只听过名字 | 先看文档或短 demo |
| **L1** | 能读懂别人的代码 | 对照 Vue 版读一遍即可 |
| **L2** | 不看教程能独立写出来 | **对应 Step 开干前应达到** |
| **L3** | 能讲清原理、边界与常见坑 | 面试 / 带人时再冲 |

填写方式：每条技术后的 `掌握：L_ ` 改成 `L0`～`L3`，自查题能答出再标 L2。

---

## 2. 你已具备（可跳过深学）

这些在 Vue Admin / 现有工程里你大概率已经会，只需记住 **React 侧差异一句**：

| 能力 | React 侧差异 |
|------|----------------|
| TypeScript | 组件用显式 props 类型即可，不强制 `React.FC`；事件是 `React.ChangeEvent` 等 |
| Vite `proxy` / `.env` | 一样；别名、端口改成 5174 即可 |
| axios 拦截器 | 逻辑可原样迁；**拦截器里不要调 React hooks** |
| CRUD 后台模式 | 表格 + 筛选 + 弹窗；UI 换 Ant Design |
| OSS STS 直传 | `ali-oss` 可复用；交互用 React 状态机包一层 |
| pnpm / 模块化目录 | 习惯几乎不变 |

---

## 3. 基础必学包（建议 Step 1 前多数到 L2）

### 3.1 JSX / TSX 与函数组件

- **Vue 对照**：`.vue` template → `return (...)` 的 JSX；`script setup` → 函数体。
- **自查题**：
  1. 为什么属性是 `className` 而不是 `class`？
  2. 如何给组件写 `props` 的 TypeScript 类型？
- 掌握：L_

### 3.2 props / children（组合）

- **Vue 对照**：props + 默认插槽 ≈ `props` + `children`；具名插槽常用「传 render 函数 / 多个 props 节点」代替。
- **自查题**：写一个 `Card`：标题用 prop，正文用 `children`。
- 掌握：L_

### 3.3 useState

- **Vue 对照**：`ref` / `reactive` → `useState`；改状态必须用 setter，不能直接赋值。
- **自查题**：
  1. `setCount(count + 1)` 连点三次为何可能只 +1？应用哪种写法修复？
  2. 对象状态更新时为什么常要展开 `{ ...prev, x }`？
- 掌握：L_

### 3.4 useEffect（含 cleanup）

- **Vue 对照**：`onMounted` / `watch` / `onUnmounted` 的部分职责落在这里；**能不用就不用**（优先事件回调）。
- **自查题**：
  1. 依赖数组 `[]` / `[id]` / 省略 分别什么意思？
  2. 订阅 / timer 为什么要在 return 的 cleanup 里清掉？
- 掌握：L_

### 3.5 useRef

- **Vue 对照**：`ref` 挂 DOM ≈ `useRef`；也可存「改了不触发渲染」的可变盒（如上传中标志、STS 缓存句柄）。
- **自查题**：何时用 `useRef` 而不是 `useState`？
- 掌握：L_

### 3.6 useMemo / useCallback（够用即可）

- **Vue 对照**：`computed` ≈ 常直接算或 `useMemo`；`useCallback` 用于稳定函数引用（传给子组件 / 依赖数组）。
- **自查题**：没有昂贵计算或依赖优化时，要不要默认包一层？为什么？
- 掌握：L_

### 3.7 受控 vs 非受控

- **Vue 对照**：`v-model` → 多为 `value` + `onChange`（受控）。
- **自查题**：受控 Input 最少需要哪两个 props？文件上传的 `<input type="file">` 通常为什么偏非受控？
- 掌握：L_

### 3.8 列表渲染与 key

- **Vue 对照**：`v-for` + `:key` → `.map` + `key`。
- **自查题**：为什么不要用数组下标当长期 key（尤其可排序列表）？
- 掌握：L_

### 3.9 条件渲染

- **Vue 对照**：`v-if` / `v-show` → `&&` / 三元 / 提前 `return null`。
- **自查题**：`{count && <Badge />}` 当 `count === 0` 时页面上可能出现什么？
- 掌握：L_

**基础包开干门槛**：上面 3.1～3.9 多数 ≥ L2 → 可以开始 [`DEVELOPMENT_PLAN.md`](./DEVELOPMENT_PLAN.md) Step 1。

---

## 4. 按 Step 映射的技术要求

每步「开干前」建议相关条目 ≥ L2。详细实现验收仍以开发计划为准。

### Step 0 · 对照阅读（业务地图，非 React API）

| 技术点 | 自查题 | 掌握 |
|--------|--------|------|
| 路由 / 鉴权 / API 解包约定 | 无 token 访问受保护页会怎样？`code === 0` 表示什么？ | L_ |
| 复杂页分布 | 哪几页用到 OSS / 富文本 / 拖拽？ | L_ |

---

### Step 1 · 脚手架与工程基线

| 技术点 | Vue 对照 / 说明 | 自查题 | 掌握 |
|--------|-----------------|--------|------|
| Vite + React 模板 | 等同 Vue Vite 工程 | `main.tsx` 里 `createRoot` + `StrictMode` 各干什么？ | L_ |
| path alias `@/` | 与 Vue 相同 | `vite.config` + `tsconfig` 两边都要配吗？ | L_ |
| `import.meta.env` 类型 | 同 Vite | 如何给 `VITE_API_BASE` 补类型？ | L_ |
| Ant Design 接入 + 中文 locale | Element Plus 中文 | `ConfigProvider` 包在哪一层？ | L_ |

---

### Step 2 · 路由骨架 + Layout

| 技术点 | Vue 对照 / 说明 | 自查题 | 掌握 |
|--------|-----------------|--------|------|
| 嵌套路由 | `children` + layout | Layout 里用什么渲染子路由？ | L_ |
| `Outlet` | `<router-view>` | — | L_ |
| `NavLink` / `useLocation` | `router-link` + `route` | 如何高亮当前菜单？ | L_ |
| `lazy` + `Suspense` | 异步组件 | 懒加载失败时用户看到什么？ | L_ |
| 兜底重定向 | `pathMatch` | 未知 path 如何转到 `/dashboard`？ | L_ |

---

### Step 3 · Auth（Zustand + 守卫）

| 技术点 | Vue 对照 / 说明 | 自查题 | 掌握 |
|--------|-----------------|--------|------|
| Zustand store | Pinia | `set` / `get` 怎么写？如何读写 `localStorage`？ | L_ |
| 受保护路由 | `beforeEach` | 无 token 时如何 `Navigate` 并带上 `redirect`？ | L_ |
| 受控登录表单 | Element Form | 提交时如何防重复点击？ | L_ |
| token key `admin_token` | 与 Vue 一致 | 为何建议与 Vue 共用同一 key？ | L_ |

---

### Step 4 · Axios 封装

| 技术点 | Vue 对照 / 说明 | 自查题 | 掌握 |
|--------|-----------------|--------|------|
| 实例 + 拦截器 | 几乎照搬 | 401 清登录态时如何**不**在拦截器里调 hook？ | L_ |
| 泛型 `get<T>` / 解包 | 同 | `code !== 0` 时抛错还是返回？ | L_ |
| 全局 loading 引用计数 | 同 util | 并发两个请求时 loading 何时关掉？ | L_ |

---

### Step 5 · TanStack Query + 共享 Dialog

| 技术点 | Vue 对照 / 说明 | 自查题 | 掌握 |
|--------|-----------------|--------|------|
| `QueryClientProvider` | 无直接对位（Vue 多为页面 ref） | 为什么要挂在应用根？ | L_ |
| `useQuery` | 拉列表 | `queryKey` 为什么要包含筛选参数？ | L_ |
| `useMutation` + `invalidateQueries` | 写完再拉 | 创建成功后如何让表格刷新？ | L_ |
| loading / error / data 三态 | 手写 flag | 如何区分「首次加载」和「后台刷新」？ | L_ |
| 受控 Dialog + `children` | `AppFormDialog` | 如何禁止点遮罩关闭？确认中如何禁用按钮？ | L_ |

**CRUD 门槛**：Step 5 相关多数 ≥ L2 → 再开 Step 6 业务页。

---

### Step 6～7 · 标签 / 教材分类（RHF + zod + Table）

| 技术点 | Vue 对照 / 说明 | 自查题 | 掌握 |
|--------|-----------------|--------|------|
| react-hook-form | 手写 form state | `register` 与 `Controller` 何时用后者？ | L_ |
| zod + resolver | 手写 rules | 如何把服务端字段校验映射到表单项错误？ | L_ |
| Ant Design Table / Form | Element Table/Form | 分页参数如何与 `useQuery` 的 key 联动？ | L_ |
| 无删除变体（taxonomy） | 同业务 | 如何复用同一套表单、只藏删除入口？ | L_ |

---

### Step 8 · OSS 上传组件

| 技术点 | Vue 对照 / 说明 | 自查题 | 掌握 |
|--------|-----------------|--------|------|
| 隐藏 file input + `useRef` | 同 | 如何触发系统文件选择？ | L_ |
| 上传状态机 | loading / success | 上传中再次点击应怎样处理？ | L_ |
| public URL vs private `objectKey` | 同 util | 下载页为什么存 objectKey 而不是 CDN URL？ | L_ |
| placeholder 降级 | 同 | STS 不可用时 UI 如何仍可填 URL？ | L_ |

---

### Step 9～10 · 运营三页 / 反馈 / 日志

| 技术点 | 自查题 | 掌握 |
|--------|--------|------|
| Upsert（按业务 key） | 与「先查 id 再 put」有何不同？ | L_ |
| 只读页 vs 半写页 | 反馈为何只有回复没有新建删除？ | L_ |
| 筛选分页套路复用 | 能否不复制粘贴整页、只换 api 与列？ | L_ |

---

### Step 11 · 作文专题（@dnd-kit）

| 技术点 | Vue 对照 / 说明 | 自查题 | 掌握 |
|--------|-----------------|--------|------|
| `@dnd-kit` 列表排序 | vuedraggable | 排序结果如何写回受控数组？ | L_ |
| 复合表单（封面 + 多图 + 标签） | 同页 | 多图最多 20 如何在提交前校验？ | L_ |
| 标签内联创建 | 同 | select 输入新名时何时 `POST /tags`？ | L_ |
| 上/下架独立 API | 同 | 为何不上「删除」而用 status？ | L_ |

> 拖拽：**不必**在 Step 1 前学完，到 Step 11 再补到 L2 即可。

---

### Step 12 · 优秀作文（TipTap）

| 技术点 | Vue 对照 / 说明 | 自查题 | 掌握 |
|--------|-----------------|--------|------|
| TipTap 受控接入 | wangEditor | 编辑器内容如何接到 RHF 字段？ | L_ |
| 空 HTML 校验 | 同 | `<p></p>` 算不算空？如何判断？ | L_ |
| 双编辑器实例 | 正文 + 点评 | 卸载时要注意什么？ | L_ |

> 富文本：到 Step 12 再补到 L2 即可。

---

### Step 13 · 下载资料

| 技术点 | 自查题 | 掌握 |
|--------|--------|------|
| private ACL 上传 | 失败重试与成功字段分别是什么？ | L_ |
| 强制删除 `confirm=true` | 第一次删失败后 UX 怎么设计？ | L_ |
| 免费标签业务规则 | 与 `accessType` / `status` 如何联动？ | L_ |

---

### Step 14 · Dashboard

| 技术点 | 自查题 | 掌握 |
|--------|--------|------|
| `useQueries` / 多 `useQuery` | 五个接口如何并行且互不影响错误展示？ | L_ |
| 只读派生展示 | 要不要上图表库？（本项目：不要，与 Vue 一致） | L_ |

---

### Step 15 · 工程化收尾

| 技术点 | 自查题 | 掌握 |
|--------|--------|------|
| Error Boundary | 子树 render 抛错时如何兜底？hooks 里抛错它能接住吗？ | L_ |
| 统一 lazy / 空态 | 列表空数据与请求失败文案如何区分？ | L_ |
| keep-alive 策略 | 本项目用 Query 缓存替代路由缓存；差异是什么？ | L_ |

---

### Step 16 · 测试与 Hooks 提炼（可选）

| 技术点 | 自查题 | 掌握 |
|--------|--------|------|
| Vitest + Testing Library | 如何测「无 token 跳登录」而不是测实现细节？ | L_ |
| 自定义 hooks | `useOssUpload` 的返回值边界怎么设计？ | L_ |
| zod schema 单测 | 非法 slug 是否被拒绝？ | L_ |

---

## 5. 横切能力总表（扫一眼找缺口）

把掌握度填进格子；开对应 Step 前尽量 ≥ L2。

| 能力 | 关联 Step | 掌握 | 备注 |
|------|-----------|------|------|
| JSX / 函数组件 / props | 全程 | L_ | 基础包 |
| useState / Effect / Ref | 全程 | L_ | 基础包 |
| 受控表单思维 | 3, 6+ | L_ | 基础包 |
| React Router 嵌套 / 守卫 | 2–3 | L_ | |
| Zustand | 3 | L_ | |
| axios 模块化（无 hook） | 4 | L_ | 你会，迁即可 |
| TanStack Query | 5+ | L_ | **重点补** |
| Ant Design 常用组件 | 1+ | L_ | 对位 Element |
| RHF + zod | 6+ | L_ | **重点补** |
| OSS 上传组件化 | 8, 11, 13 | L_ | 业务到了再学 |
| @dnd-kit | 11 | L_ | 可后置 |
| TipTap | 12 | L_ | 可后置 |
| Error Boundary / 工程化 | 15 | L_ | |
| Vitest + RTL | 16 | L_ | 可选 |

---

## 6. 开干门槛建议（汇总）

```text
基础必学包（§3）多数 L2
        ↓
    可开始 Step 1～2（脚手架 + 路由壳）
        ↓
    Step 3～4（Auth + API）相关 L2
        ↓
    Step 5（Query + Dialog）相关 L2
        ↓
    开始 Step 6+ 业务 CRUD
        ↓
    Step 11 / 12 前再补 dnd / TipTap 到 L2
```

不必把总表全部刷到 L2 再写第一行代码；**按 Step 前置学习**效率更高。

---

## 7. 与开发计划的配合方式

1. 打开本文，先填 §3 与 §5，标出 L0/L1 缺口。  
2. 缺口对应官方文档做最小 demo（一个页面能跑即可）。  
3. 再按 [`DEVELOPMENT_PLAN.md`](./DEVELOPMENT_PLAN.md) 实现该 Step。  
4. Step 做完用计划里的验收清单找我审查；技术掌握度可在本节回填到 L2/L3。

验收记录仍用 [`ACCEPTANCE_LOG.md`](./ACCEPTANCE_LOG.md)。
