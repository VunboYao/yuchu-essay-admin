# Step 5 引导式开发：QueryClient 与共享 UI

> 本文对应 [03-开发计划](./03-开发计划.md) 的 Step 5。  
> 它是一份任务引导，不提供可以整段复制的最终实现。请先自己完成每个检查点，卡住后再展开提示。  
> 质量要求以 [01-工程契约](./01-工程契约.md) 为准。

本步 **没有** 测试检查点。Vitest 仍延后到 [03-开发计划](./03-开发计划.md) Step 16。验收以「手动验证矩阵」+ `pnpm verify`（lint + type-check）为准。

## 1. 本步目标

基于 Step 4 已完成的 HTTP 内核，把后续业务页会共用的两件事一次装好：

```text
AppProviders
  → 唯一 QueryClient（带项目级默认值）
  → 现有 AntdApp 继续提供 message / modal

shared/ui
  → AppFormDialog：受控壳，表单状态仍归调用方
  → QueryState：把 pending / error / empty / success 画成产品态
  → PageHeader（必要时）：页内标题 + 右侧操作区

本步结束时
  → 还没有任何业务 GET
  → 还没有任何新路由 / 演示页
```

完成后必须满足：

- `QueryClientProvider` 已挂在 app providers；你能说出默认 `staleTime` 的取值和原因。
- `AppFormDialog` 点遮罩关不掉；确认进行中确认按钮不可再点。
- `QueryState` 能区分首次加载、请求失败、成功但无数据和成功有内容；它自己不发请求。
- `message` / `modal` 只从 UI 层经 `App.useApp()` 调用，不进 axios。
- **没有**「随便 GET 一下」的演示路由、临时页或留在源码里的探测请求。
- `pnpm verify` 通过（lint + type-check）。

## 2. 本步边界

本步只铺基础设施。Query 的第一次合法使用是 Step 6 标签页。

本步允许：

- 使用已经装好的 `@tanstack/react-query`（当前 `package.json` 为 `5.101.4`）。
- 新建 `src/shared/query/`、`src/shared/ui/`。
- 在 `AppProviders` 上挂 `QueryClientProvider`；开发态可挂 React Query Devtools。
- 为验证 Dialog / QueryState，在**已有占位页**上用本地 `useState` 临时接线，**禁止发请求**。

本步禁止：

- 调用任何业务 GET / POST（登录以外；登录属于 Step 4，不要回头改）。
- 新建演示路由、`/query-playground`、或「测 Query 专用」页面。
- 在本步写 `features/tag/api.ts`、`queries.ts` 或 `useQuery`。
- 在 axios 拦截器、`shared/api` 里调用 `message` / `modal`。
- 再包一套全局 Loading 引用计数。
- 把 Query cache 或列表数据放进 Zustand。
- 修改只读对照项目 `Admin/`。
- 按 [08-learn-tanstack-query.md](./08-learn-tanstack-query.md) 后半的标签 CRUD 往下做——那是 Step 6。

## 3. 开始状态与文件范围

开始前应保持 Step 4 的状态：

- `src/shared/api` 已能解包 `{ code, message, data }`，失败抛 `ApiError`。
- 登录页真调接口；拦截器不弹消息、不跳转。
- [`AppProviders.tsx`](../src/app/providers/AppProviders.tsx) 已有 `ConfigProvider` + `AntdApp`，**还没有** `QueryClientProvider`。
- 登录页、Layout 已经用 `App.useApp().message`。
- 11 个业务页仍是占位（例如标签页只渲染 `Empty`）。
- `@tanstack/react-query` 与 `@tanstack/react-query-devtools` 已在 `package.json`；若本地还没装，在 `Admin-React/` 执行 `pnpm install`。

本步预计新增或修改：

```text
src/
├── app/
│   └── providers/
│       └── AppProviders.tsx    # 插入 QueryClientProvider，保留 AntdApp
└── shared/
    ├── query/
    │   ├── query-client.ts     # 唯一 QueryClient + 默认值
    │   └── index.ts
    └── ui/
        ├── AppFormDialog.tsx
        ├── QueryState.tsx
        ├── PageHeader.tsx      # 必要时
        └── index.ts
```

文件名可以小幅调整，但 Query 默认配置必须留在 `shared/query`，共享 UI 必须留在 `shared/ui`。不要把 `QueryClient` 写进某个 feature，也不要把 Dialog 做成带 `useQuery` 的智能弹窗。

本步 **不要** 安装测试依赖，也不要改 `verify` 脚本。

## 4. 使用方式

每个检查点按下面顺序完成：

1. 只看“任务”和“完成信号”，先自己设计。
2. 卡住时再看“提示一”。
3. 仍无法推进再看“提示二”。
4. 完成后回答“自检问题”。
5. 每个检查点结束都跑最小验证，不要最后一次性排错。

### 对照源（本步不读 `Admin/src`）

**删掉 `Admin/src` 这份检查点仍能做完。**  
Step 5 没有字段表、没有列表筛选、没有要抄的接口路径。要落地的是 React 后台的基础设施，对照源如下：

| 要确认的事实 | 去哪看 |
|---|---|
| Query 默认值写在 `shared/query`；禁止演示 GET；第一次 `useQuery` 必须是标签真页 | [01-工程契约.md](./01-工程契约.md)「禁止」表与「TanStack Query」 |
| Dialog：禁点遮罩关闭；提交中禁用确认按钮 | [01-工程契约.md](./01-工程契约.md)「表单」 |
| 首次加载 / 空列表 / 失败 / 后台刷新分别给用户看什么 | [01-工程契约.md](./01-工程契约.md) 审查条第 3 条 |
| `message` 在 UI，不进拦截器 | 01「HTTP」；现有 [`LoginPage.tsx`](../src/features/auth/pages/LoginPage.tsx)、[`AdminLayout.tsx`](../src/app/layouts/AdminLayout.tsx) |
| `staleTime` / `retry` / `refetchOnWindowFocus` 官方默认 | [QueryClient 默认选项](https://tanstack.com/query/latest/docs/reference/QueryClient)（项目已装 v5.101.4） |
| Modal 受控 API（`open`、`maskClosable`、`confirmLoading`） | [Ant Design 6 Modal](https://ant.design/components/modal-cn)（项目已装 antd `^6.6.0`） |
| QueryClient 为什么不要在 render 里 `new` | [08 §2](./08-learn-tanstack-query.md) 只读「安装并接入」。Provider 示例已保留 `AntdApp`，但仍**不要**做它后半的标签页 |

本步不要去翻其它端的 Dialog / Message / 页内 `load()`。那些实现落在 01 的禁止照搬清单里：全局 Loading、拦截器 toast、页内 loading 旗标。你要做的是它们的 React 替代物，不是翻译。

---

## 检查点 1：先设计内核契约，不急着 new QueryClient

### 当前问题

Step 6 起会有 11 个业务页共用同一套：何时算数据过期、弹窗怎么关、列表四态怎么画、失败提示从哪弹。如果每页各写一套，默认值会分叉，Dialog 行为也会分叉。

### 任务

先在纸面或注释里写清四件事，再碰文件。

**1. QueryClient 只负责默认策略，不负责发某条请求。**  
本步结束时，Devtools 的 Queries 列表可以为空。空是正确的。

**2. Dialog 是壳，不是表单。**  
调用方拥有 `open`、提交函数、RHF 实例。Dialog 只保证两条用户可观察规则：

- 点遮罩不能关闭（避免误触丢掉未提交内容）。
- 确认进行中，确认按钮不可再点（不要靠「再点一次当排队」）。

**3. QueryState 画产品态，不拥有数据。**  
它接收「现在是哪一态」，渲染 loading / error / empty / children。它内部禁止 `useQuery`、禁止 `get()`。

**4. 反馈 API 已经有了。**  
`AntdApp` + `App.useApp()` 就是 03 说的「给 UI 层用的 message / modal」。本步要守住边界，不要再造第二个 toast 单例。

### 提示一

把状态分层写进同一张表，后面检查点必须填得进去：

| 数据 | 放哪 | 本步会不会出现 |
|---|---|---|
| token / 管理员 | Zustand persist | 已有，不要动 |
| 列表 / 详情 | Query cache | **本步不出现** |
| 弹窗开关、临时演示用的 open | 组件 `useState` | 仅临时验证 |
| 过期策略、重试 | QueryClient 默认 | 本步要写 |

填不进去的东西（例如「在 axios 里记一条 loadingCount」）不要做。

### 提示二

`isPending` 和 `isFetching` 不是同一种用户体验：

- 首次进入、还没有任何成功数据 → 整区 loading。
- 已有数据、正在后台刷新 → 表格还在，最多给一个轻量「同步中」。
- 请求成功但 `list.length === 0` → 空态，不是 loading。
- 请求失败 → 错误态，不是空态。

本步的 QueryState 至少要能表达前三种失败/空/成功，以及首次 pending。`isFetching` 可以先不做成独立组件，留给 Step 6 页面自己决定要不要加一行提示。

### 完成信号

你能在不写组件的情况下回答：

- 为什么本步挂上 QueryClient 却一张表都不拉。
- Dialog 的 `open` 由谁持有。
- 空列表为什么不能复用 loading 组件。

### 自检问题

- 为什么 Query 的第一次使用不能是「随便 GET /tags 看通不通」？
  - 01 禁止 throwaway 演示页。探测请求一旦留下，就会变成假业务、假 `queryKey`、假错误处理。HTTP 通不通 Step 4 已经用登录证明过。
- 为什么 Dialog 要禁点遮罩关闭？
  - 后台表单弹窗里通常有未提交输入。点到遮罩是误操作的高发路径。这是产品规则，写在 01，不是某份 UI 库的默认值。
- 为什么本步不读 `Admin/src`？
  - 没有要对等的字段或路由。那边的页内 `load()`、全局 Loading、拦截器 toast 正是本步要避开的实现。

---

## 检查点 2：写出项目级 QueryClient 默认值

### 当前问题

TanStack Query v5 浏览器端默认 `staleTime` 为 `0`：数据一进缓存就算过期，组件一挂上就可能再打网络。后台页来回切菜单时，这个默认值会让每个列表都像「每次进入都重新 load」。默认值必须集中写一次，不能等 Step 6 在页面上各写一套。

### 任务

新建 `src/shared/query/query-client.ts`（文件名自定），导出**一份** `QueryClient`。

你必须能指出并解释这些默认值（取值可以是你的选择，但要说得出理由）：

| 选项 | 官方默认（v5） | 你要决定的问题 |
|---|---|---|
| `queries.staleTime` | `0` | 切回刚看过的页，多少毫秒内直接用缓存、不立刻重打？ |
| `queries.retry` | `3` | 后台读失败要不要连打三次？ |
| `queries.refetchOnWindowFocus` | `true` | 从别的窗口切回来，正在编辑的页要不要自动重拉？ |
| `mutations.retry` | `0` | 写失败要不要自动重试？（重试等于可能重复提交） |
| `queries.gcTime` | `5 * 60 * 1000` | 本步可以不改；能说明它和 `staleTime` 不是一回事即可 |

实例必须在模块顶层（或 `useState(() => new QueryClient())`）创建。禁止在 `AppProviders` 函数体每次 render `new QueryClient()`。

本检查点还不要挂 Provider，也不要 `useQuery`。

### 提示一

后台管理的常见一组选择（你可以不同意，但要能反驳）：

- `staleTime`：`30_000`。菜单来回切时 30 秒内视为 fresh；真要最新数据靠写后 `invalidateQueries`，不靠「每次 mount 都打」。
- `retry: 1`：读失败再试一次，避免 3 次重试把错误态拖得很长。
- `refetchOnWindowFocus: false`：焦点回来时自动重拉，容易打断正在填的表单观感；后台数据变更靠自己的写操作失效，不靠切窗口。
- `mutations.retry: 0`：创建/删除不要自动重放。

这些数字写在 `defaultOptions` 里。某个查询以后确有不同需求，再在那一条 `queryOptions` 上覆盖。不要为「以后可能」提前做每页配置。

版本入口：[QueryClient](https://tanstack.com/query/latest/docs/reference/QueryClient)。若升级大版本，先核对这些默认值有没有变。

### 提示二

`staleTime` 和 `gcTime`：

- `staleTime`：有观察者时，多久内算 fresh，不自动重打。
- `gcTime`：没有观察者之后，缓存还能活多久，然后被垃圾回收。

把 `staleTime` 设很大不会让缓存永远占内存；没人订阅后仍按 `gcTime` 回收。不要为了「省内存」把 `staleTime` 设回 `0`。

### 常见错误

- 在组件函数里 `const client = new QueryClient()`：StrictMode / 重渲染会丢掉缓存。
- 只改 `staleTime`，其余继续用官方默认，却说不清「切窗口会不会重拉」。
- 为了本步「看到请求」去设 `staleTime: 0` 再打一条 GET。

### 完成信号

打开该文件，你能用两句话向审查者解释：`staleTime` 取值、以及为什么写在 `shared/query` 而不是即将到来的 TagPage。

### 自检问题

- 为什么默认值不写在 `features/tag/queries.ts`？
  - tag 只是第一个消费者。11 页各写一套，过期策略会分叉。01 要求默认值在 `shared/query`。
- `staleTime: 0` 在后台的具体坏处是什么？
  - 从标签页切到分类再切回来，会先闪一次 pending 或再打一次相同列表。用户会觉得「菜单切换很慢」，其实是默认策略在拉。
- 为什么本步改默认值，却验证不了它生效？
  - 生效要有一条真实 query。那是 Step 6 的事。本步验收的是「值写在哪、理由说不说得出」，不是「我看见 Network 少打了一次」。

---

## 检查点 3：挂上 Provider，并保住 AntdApp

### 当前问题

QueryClient 现在只是一个普通对象。组件要用 `useQuery`，必须被 `QueryClientProvider` 包住。现有树里已经有 `AntdApp`，登录成功提示依赖它。

### 任务

改 [`src/app/providers/AppProviders.tsx`](../src/app/providers/AppProviders.tsx)：

1. 用检查点 2 导出的那一份 client，挂 `QueryClientProvider`。
2. **保留** `ConfigProvider`（中文 locale）和 `AntdApp`。
3. 开发环境可以挂 `ReactQueryDevtools`，`initialIsOpen={false}`。
4. 不要在 `main.tsx` 再造第二份 Provider 或第二份 client。
5. 不要为了抄学习笔记把 `AntdApp` 删掉。

建议顺序（说得出理由即可）：

```text
ConfigProvider
  AntdApp
    QueryClientProvider
      children
      Devtools（可选）
```

`QueryClientProvider` 不依赖 antd；`App.useApp()` 必须在 `AntdApp` 里面。谁包谁，以「现有 LoginPage / Layout 的 `App.useApp()` 不能坏」为准。

### 提示一

[08 §2.3](./08-learn-tanstack-query.md) 的 Provider 示例已与当前壳对齐（保留 `AntdApp`）。
对照时看「client 从哪里 import、Devtools 放哪」；不要删掉现有的 `AntdApp`，也不要做 08 后半的标签 CRUD。

若包还没装进 `node_modules`，在 `Admin-React/` 执行 `pnpm install`。不要在仓库根装。

### 提示二

Devtools 是验证「Provider 在不在」的合法手段：打开任意已登录页，Devtools 能出现，Queries 为空。这不是业务 GET，也不要为此写一条 `queryFn`。

生产构建里 Devtools 跟随 `import.meta.env.DEV` 或直接让打包器 tree-shake；不要为此新建演示路由。

### 常见错误

- 替换掉 `AntdApp` 后，登录页 `App.useApp()` 运行时报不在 App 内。
- `main.tsx` 和 `AppProviders` 各 `new` 了一份 QueryClient。
- 为了「看见绿点」写了 `useQuery({ queryKey: ['ping'], queryFn: () => get('/tags') })`。

### 完成信号

- `pnpm dev` 打开 `http://localhost:5174`，登录后任意业务占位页不报错。
- Devtools 能打开，Queries 列表为空（或只有你自己没删干净的探测——有就删掉）。
- 登录成功、退出成功的 toast 仍在。

最小验证：

```bash
# 工作目录：Admin-React/
pnpm verify
```

### 自检问题

- 为什么 client 要在组件树外创建？
  - Provider 重渲染不应换掉 cache。树外一份，所有页面共享同一份查询结果。
- Devtools 空着算不算 Step 5 没做完？
  - 空着才对。有查询说明你提前做了 Step 6，或留下了探测请求。

---

## 检查点 4：反馈只留在 UI 层

### 当前问题

03 写「全局 message/modal 封装给 UI 层调用，不进 axios」。这容易被做成又一个 `shared/ui/toast.ts` 单例。antd 6 的静态 `message.success()` 不走 `AntdApp` 上下文，和 `App.useApp()` 会变成两套管线。

### 任务

本检查点 **默认不新增文件**。做三件确认：

1. 打开 `shared/api`（Step 4 的客户端）：搜不到 `message`、`modal`、`App.useApp`、`notification`。
2. 打开登录页和 Layout：成功 / 失败提示仍从 `App.useApp()` 来，和 Step 3/4 一致。
3. 在 `shared/ui` 的入口或注释里写清约定即可：UI 组件用 `App.useApp()`；以后删除确认用 `modal.confirm` 或页面里的 `Popconfirm`，都在用户动作处调用。

不要写这种 one-liner：

```ts
// 不要做：只是把 App.useApp 换了个名字
export function useFeedback() {
  return App.useApp()
}
```

### 提示一

antd 6 里 `App.useApp()` 返回 `{ message, modal, notification }`。这就是 03 要的「封装」——上下文已经在 `AntdApp` 里。再包一层没有新行为，审查时算套壳 hook。

静态 `import { message } from 'antd'` 在 5/6 需要 `message.useMessage()` 的 holder。项目已经用 `AntdApp`，不要混用静态 API。

### 提示二

`modal.confirm` 属于「用户点了危险动作之后」。本步没有删除接口，不要为了演示 confirm 去打 DELETE。Layout 里已有退出用的 `Popconfirm`，够说明「确认在 UI」。

### 完成信号

- `shared/api` 与拦截器零 UI 调用（Step 4 已要求，本步回归）。
- 没有新增 toast 包装文件，或你能说明那个文件提供了 `App.useApp` 没有的能力。

### 自检问题

- 为什么失败提示不能在 `QueryClient` 的 `MutationCache` 全局 `onError` 里一刀切？
  - 登录、表格、Dialog 的展示不同。全局 onError 会变成拦截器 toast 的 Query 版。页面或调用方自己 `catch` / 渲染 `QueryState` 的 error。
- 03 的「封装」为什么不是新写一个 `toast.ts`？
  - 真要解决的是调用边界：谁可以弹。不是再发明一套 API。

---

## 检查点 5：`AppFormDialog`——受控壳 + children

### 当前问题

Step 6 起，创建 / 编辑都会是「表格行操作 → 弹窗 → zod + RHF → 提交」。如果每页直接铺一坨 Modal 属性，遮罩能否关闭、确认中能否连点，会每页不一样。

### 任务

在 `src/shared/ui` 实现 `AppFormDialog`（名字可等价）。它必须是**受控**组件：

- `open` + `onClose`（或 `onCancel`）由父组件传入，Dialog 不自己藏一份「其实开着」的 state。
- `children` 渲染表单主体。不要在 Dialog 内部 `useForm()`。
- 点遮罩不关闭。对应 antd 6 Modal 的 `maskClosable={false}`。
- 用 `confirmLoading` 或等价的 `okButtonProps.disabled` 表达「确认中」。父组件传入 `confirmLoading` / `submitting`。
- 点取消：未提交中才关；提交中取消按钮也建议禁用，避免半截请求还在飞、窗却没了。
- 关闭后不要残留上一份表单 DOM。antd 6 用 `destroyOnHidden`（不要写已弃用的 `destroyOnClose`，先核你装的 6.6 文档）。

本检查点不要接真实提交 API，不要把某个 feature 的 schema 写进来。

类型用显式 `type Props = { ... }`，不要 `React.FC`。

### 提示一

最小 props 可以是：

- `open: boolean`
- `title: string`
- `confirmLoading?: boolean`
- `onClose: () => void`
- `onSubmit?: () => void`（确认按钮；表单也可以自己用 `htmlType="submit"`）
- `children: ReactNode`
- `okText?` / `cancelText?`

`onSubmit` 不要在 Dialog 里 `await` 完再擅自 `onClose()`。关不关窗是调用方的事：提交成功才关，校验失败要留在窗里。

官方入口：[Modal](https://ant.design/components/modal-cn)。本项目 antd `^6.6.0`。受控用 `open`，不要用旧的 `visible`。

### 提示二

临时验证（测完必须拆掉，或确保不进验收产物）：

1. 打开任意现有占位页，例如 [`TagPage.tsx`](../src/features/tag/pages/TagPage.tsx)。
2. 本地 `const [open, setOpen] = useState(false)`。
3. 一个「打开」按钮 + `AppFormDialog`，`children` 写一行静态文字即可。
4. 再加一个本地 `submitting`：点确认后 `setSubmitting(true)`，`setTimeout` 1 秒再设回 false。**不要** `get` / `post`。
5. 手测：点遮罩，窗还在；确认中按钮不可点。
6. **拆掉这段临时接线**，占位页回到原来的 `Empty`。

不要新建 `/dialog-demo` 路由。

### 常见错误

- Dialog 内部 `useForm`，父页面再来一份 RHF：两套表单状态。
- `maskClosable` 忘了关，点遮罩丢草稿。
- `onOk` 里直接 `onClose()`，校验失败窗也关了。
- 为了看「确认中」去打登录或 `/tags`。
- 用 antd `Form` 的 `onFinish` 管校验，丢掉即将到来的 zod + RHF。

### 完成信号

- 组件能单独通过类型检查。
- 你能指出遮罩和确认中分别绑在哪个 prop。
- 占位页上没有残留的演示按钮（除非你愿意把它当成 Step 6 的起点——那也**不能**带请求）。

最小验证：临时接线手测后拆掉，再执行 `pnpm verify`。

### 自检问题

- 为什么表单状态不能放进 Dialog？
  - 创建和编辑的 defaultValues、schema、提交函数都不同。Dialog 只保证壳的产品规则。children 组合比「Dialog 收一份巨大 config」更适合 11 个域。
- 提交中为什么要禁用确认，而不是再点就 queue？
  - 写操作不幂等时，排队等于重复提交。01 要求确认中禁用。
- `destroyOnHidden` 解决什么？
  - 关掉后卸掉 children，下次打开不会带着上一次的输入 DOM / 焦点。RHF 的 `reset` 仍是调用方责任；卸 DOM 是双保险，不是替代 reset。

---

## 检查点 6：`QueryState`——四态是产品，不是 `loading` 旗标

### 当前问题

没有共享查询态时，页面会退化成一个布尔 `loading`：没回来就转圈，回来了无论空还是失败都当「有数据」。01 审查条要你能分开说：首次加载、空列表、请求失败、后台刷新，用户分别看见什么。

### 任务

在 `src/shared/ui` 实现 `QueryState`（或等价名字）。它是展示组件：

1. **pending**：还没有任何成功数据。整区替换成 Spin / 骨架，不要同时画出空表格。
2. **error**：请求失败。展示可读文案；可选给 `onRetry`。文案优先用 `ApiError.message`，不要把整段 Error 对象 `String(error)`。
3. **empty**：已经成功，但没有可展示行。用 `Empty`，文案由调用方传入（「暂无标签」和「暂无日志」不是同一句）。
4. **success**：渲染 `children`。

它 **禁止**：

- 调用 `useQuery` / `useMutation` / `get` / `post`。
- 把 `isFetching` 当成 pending，把已有表格卸掉重画成转圈。
- 用 `{total && <Table />}` 这种写法（`0` 会渲染出来）。

pending / error / empty 的判定由**调用方**传入（布尔或判别联合，你选一种说得出理由）。QueryState 不要自己猜 `data` 是不是数组。

本检查点不要在业务页里接 `useQuery`。用静态 props 验证四态即可。

### 提示一

两种 API 都可以，选一种坚持：

- 布尔组合：`isPending` + `isError` + `isEmpty` + `children`。调用方从 Query 的 `isPending` / `isError` 和 `data.list.length === 0` 传入。
- 判别联合：`status: 'pending' | 'error' | 'empty' | 'success'`。更不容易出现「pending 和 empty 同时为 true」。

无论哪种，优先级必须写死：**pending 压过 empty，error 压过 empty**。没有数据且还在飞，不是空态。

`children` 只在 success 出现。不要在 pending 时也 mount 重表格，再靠 CSS 藏起来——本步没有性能证据，不必玩这种技巧。

### 提示二

临时验证（同样：现有占位页 + 本地 state，测完拆）：

- 四个按钮或一个 `select`，切换 `pending | error | empty | success`。
- success 的 children 写「假内容」静态节点，不要 `get('/tags')`。
- 确认 pending 看不见空态，error 看不见表格。

拆掉后再 `pnpm verify`。

`ApiError` 从 `@/shared/api` 引入做 `instanceof` 即可。QueryState 属于 `shared`，可以依赖 `shared/api`，不要依赖 `features/*`。

### 常见错误

- 组件内部 `useQuery({ queryKey: ['demo'] })`「为了更真实」。
- `isEmpty` 在 pending 时也是 true（`data` 还是 `undefined`）。
- 只有 `loading` / `!loading` 两态，失败和空走同一张 Empty。
- 用 `isFetching` 做整页 Spin，后台刷新会闪白。

### 完成信号

- 四态在静态 props 下观感可区分。
- 源码里没有 `useQuery`。
- 占位页恢复原样。

### 自检问题

- 为什么 QueryState 不自己调 `useQuery`？
  - 查询的 `queryKey`、`queryFn`、筛选参数属于某个 feature。共享 UI 一旦写死 key，就会逼出万能 CRUD。它只负责「给定一态，怎么画」。
- 空列表为什么不是 error？
  - 服务器说「0 条」是成功。error 是请求没做成。混在一起，用户会在「没有数据」时点重试，打出同样的空结果。
- 后台刷新为什么不要卸掉 children？
  - 已有数据时 `isPending === false` 且 `isFetching === true`。卸掉会闪。轻量提示即可，本步可以先不做这行提示。

---

## 检查点 7：`PageHeader`（必要时，保持薄）

### 当前问题

Layout 顶栏已经用路由 `handle.title` 画了页面标题。业务页还需要「标题下方的说明 + 右侧新建按钮」这类页内头。11 页都手写一排 `flex` 可以，但标题和操作区的间距会分叉。

### 任务

若你决定本步就抽：在 `src/shared/ui` 做薄 `PageHeader`。

- `title: ReactNode`（或 string）。
- `extra?: ReactNode`（右侧操作，通常是按钮）。
- `children?` 或 `description?` 作可选说明。
- 不要在这里读路由、不要读 auth、不要放 Tabs。

若你认为 Layout 顶栏已够、想等到 Step 6 第一次出现「新建标签」再抽：可以跳过本文件。03 写的是「必要时」。跳过时，在验收备注里写一句即可。

不要为了让 PageHeader「看起来完整」去接 Dialog 和 GET。

### 提示一

AdminLayout 的标题是**壳**上的当前路由名。PageHeader 是**页内**的内容头。两者可以并存：壳负责菜单上下文，页内头负责「这一屏在干什么 + 主操作」。不要在 PageHeader 里再 `useMatches()` 读一遍 title，除非你有意让页内头和顶栏显示不同文案。

### 完成信号

- 做了：组件能渲染 title + extra，类型闭合，没有请求。
- 没做：你能说明 Step 6 第一次有右侧按钮时再抽，而不是复制三次后再抽。

### 自检问题

- 为什么现在抽 PageHeader 不算过早抽象？
  - 它没有业务分支，只是 title / extra 槽。Rule of Three 针对的是 CRUD 流程，不是三行布局。
- 为什么不要在 PageHeader 里写死「新建」按钮？
  - 有的页没有新建（操作日志），有的主操作不叫新建。`extra` 交给页面。

---

## 检查点 8：完整验收

### 自动验证

在 `Admin-React/` 目录执行：

```bash
pnpm verify
pnpm build
```

预期：

- Oxlint 通过。
- TypeScript 严格检查通过。
- Vite 生产构建完成。
- 本步不要求 `pnpm test`。

### 手动验证矩阵

前置：前端 `pnpm dev` 在 **5174**。本步**不依赖**再打业务 GET；后端开着即可，不用为了本步去点标签页。

- Provider
  - 登录后任意占位页不报错。
  - `App.useApp()` 的登录成功 / 退出成功 toast 仍在。
  - React Query Devtools 可打开，Queries **为空**。
- 默认配置
  - 能向审查者指出 `staleTime`（以及你改过的 `retry` / `refetchOnWindowFocus`）的代码位置和原因。
- Dialog（用检查点 5 的临时接线，测完删除）
  - 点遮罩不关闭。
  - 确认中确认按钮不可点。
  - 没有新增路由。
- QueryState（用检查点 6 的静态四态，测完删除）
  - pending / error / empty / success 观感可区分。
  - 源码搜不到本步新增的 `useQuery`、`get('/tags')`、`queryFn`。
- 边界
  - `shared/api` 仍无 `message` / `modal`。
  - 无 `/query-demo`、无 Vite 计数器、无新的 `src/pages`。
  - `features/tag` 等业务域没有本步长出来的 api / queries。

### 代码审查时自搜

```text
useQuery
useMutation
queryFn
get('/
post('/
from 'antd' 里的静态 message
maskClosable
confirmLoading
```

预期：前五项只应出现在 Step 4 已有的登录路径（`post` 登录），不应出现新的业务请求；`maskClosable` / `confirmLoading` 应出现在 `AppFormDialog`。

---

## 5. 失败时的最短排查路径

### 登录成功但 toast 没了

依次检查：

1. `AntdApp` 是否还在。
2. 是否改成了静态 `message.success`。
3. `App.useApp()` 是否仍在 `AntdApp` 子树内。

### `useQuery` 报 No QueryClient set

`QueryClientProvider` 没挂，或挂在了会用到 Query 的树外面。本步如果出现这句话，通常是你提前写了 `useQuery`——删掉探测，而不是先「修」这条报错。

### Devtools 里已经有一条 tags 查询

本步做过头了。删掉对应 `useQuery` / 预取，回到 Queries 为空。标签列表属于 Step 6。

### 点遮罩仍然关闭 Dialog

`maskClosable` 是否传到了真正渲染的 Modal，而不是只写在你自己的 props 类型上却没往下放。

### 确认中按钮还能点

`confirmLoading` 或 `okButtonProps.disabled` 有没有接到父组件的 submitting。父组件若在 `onSubmit` 里立刻 `onClose()`，你看不见禁用态。

### `pnpm verify` 报 antd / query 模块找不到

工作目录是否为 `Admin-React/`。仓库根没有这份 `package.json`。在子项目执行 `pnpm install`。

### 类型报 `React.FC` 或 children 不对

组件用 `type Props = { children: ReactNode; ... }`。`children` 在 success 分支才渲染时，不要把 props 标成必有 data。

---

## 6. 完成后应能口头回答

1. `staleTime` 写在哪？取值是多少？为什么不是官方默认 `0`？
2. `staleTime` 和 `gcTime` 各管什么？
3. 为什么本步挂了 QueryClient 却一张表都不拉？
4. 为什么 08 的 Provider 示例不能整段替换 `AppProviders`？
5. Dialog 的 `open` 和表单值分别由谁持有？
6. 点遮罩不关、确认中禁用，分别对应 antd 的哪个 prop？
7. QueryState 为什么禁止内部 `useQuery`？
8. pending、empty、error 同时可能为真时，优先级是什么？
9. `message` 为什么继续用 `App.useApp()`，而不是 `shared/ui/toast.ts`？
10. 为什么本步不需要 `Admin/src` 也能验收？

---

## 7. 快速上手总结

### 必须掌握

- `QueryClient` + `defaultOptions`：项目级 `staleTime` / `retry` / `refetchOnWindowFocus` / mutation `retry`。
- `QueryClientProvider`：整棵树共用一份 cache；client 不要在 render 里 `new`。
- 受控 Dialog + `children`：壳保证遮罩和确认中行为，表单状态留在调用方。
- `maskClosable={false}`、`confirmLoading`（antd 6 Modal）。
- `QueryState`：pending / error / empty / success 是四种产品态。
- `App.useApp()`：UI 层反馈的唯一入口；HTTP 与 QueryClient 全局回调都不弹。

### 按需了解

- `ReactQueryDevtools`：确认 Provider 与以后的 cache，本步 Queries 应为空。
- `gcTime`：没订阅后缓存活多久；本步可不改默认 5 分钟。
- `PageHeader`：页内标题 + `extra`；Layout 顶栏已够时可延后到 Step 6。
- `modal.confirm`：危险写操作的二次确认；本步没有删除接口。
- `isFetching` 轻量提示：有真实列表后再做，不要做成整页 Spin。
- Query 全局 `MutationCache.onError`：默认不要用它弹 toast。

### 下一步

Step 5 验收通过后再进入 Step 6：

- 标签页成为 Query 的第一次合法使用。
- `queryKeys` + `queryOptions`，`queryKey` 含筛选 / 分页。
- 列表走 `useQuery` + `QueryState`；写操作走 zod + RHF + `AppFormDialog`。
- 写成功 `invalidateQueries`，不要第二份 list state。
- 仍然不要抽万能 `useCrud`。

## 8. 未验证项

- 本文没有替你实现 Step 5 源码，因此不能声称「按本文复制即可运行」。
- Dialog / QueryState 的点击验证依赖你在占位页上的临时接线；接线拆除后，持续验证只剩类型检查与代码审查。
- `staleTime` 是否真的减少了重复请求，要到 Step 6 第一条真实列表才能观察。
- 完成实现后，请以 `pnpm verify`、`pnpm build` 和「手动验证矩阵」为最终验收依据。
