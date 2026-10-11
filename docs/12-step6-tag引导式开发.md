# Step 6 引导式开发：标签管理（第一条垂直切片）

> 本文对应 [03-开发计划](./03-开发计划.md) 的 Step 6。  
> 它是一份任务引导，不提供可以整段复制的最终页面。请先自己完成每个检查点，卡住后再展开提示。  
> 质量要求以 [01-工程契约](./01-工程契约.md) 为准。

本步 **没有** 测试检查点。Vitest 仍延后到 [03-开发计划](./03-开发计划.md) Step 16。验收以「手动验证矩阵」+ `pnpm verify`（lint + type-check）为准。

## 1. 本步目标

Step 5 已经挂好 QueryClient 和共享 UI。本步是 Query 的**第一次合法使用**：把标签页做成后面 10 页都要复用的范式，而不是再学一遍 HTTP。

```text
features/tag
  api.ts        只描述路径、查询参数、写入口
  queries.ts    tagKeys + queryOptions；页面禁止魔法串
  schemas.ts    写表单的唯一校验源
  pages/        列表筛选 + Table + Dialog
  components/   仅本域表单字段（不要带 mutation）

数据流
  筛选 / 分页 state
    → queryKey 含 keyword / status / page / pageSize
    → useQuery 出 PageData<Tag>
    → QueryState 画四态；Table 只渲染成功有数据
    → 创建 / 编辑 / 删除 mutation
    → invalidateQueries(tagKeys.lists())
    → 列表再走同一条 query，没有第二份 list
```

完成后必须满足：

- 列表筛选字段与分页参数和后端一致；`queryKey` 含 `keyword` / `status` / `page` / `pageSize`。
- 创建 / 编辑 / 删除成功，列表只靠 `invalidateQueries` 刷新。
- 校验失败落到对应表单项；提交中 Dialog 确认按钮不可再点。
- 无 `useEffect` 拉列表；无第二份 `list` state；无万能 `useCrud`。
- `pnpm verify` 通过（lint + type-check）。

## 2. 本步边界

本步只做 `features/tag` 这一条垂直切片。

本步允许：

- 把 08 学习切片收成 Ant Design 正式页（Table、筛选条、Dialog）。
- 新建 `schemas.ts`、`TagPage.module.css`；重写或替换 `CreateTagForm`。
- 使用已有 `AppFormDialog` / `QueryState` / `PageHeader` / `App.useApp()`。
- 使用已有 `STATUS_OPTIONS`、`statusLabel`、`Tag`、`PageData`。

本步禁止：

- 抽万能 `useCrud` / `useListPage`。表单字段组件可以抽，CRUD 流程不要抽。
- `useEffect` 里 `listTags` / `setList`。
- 在 axios 拦截器或 Query 全局回调里 `message`。
- 把列表放进 Zustand。
- 给其它域写 `api.ts` / 真页面（教材分类是 Step 7）。
- 安装测试依赖、改 `verify` 脚本、补 schema 单测。
- 修改只读对照项目 `Admin/`。
- 把 [08](./08-learn-tanstack-query.md) 的原生 `<table>` 当验收产物留下。

## 3. 开始状态与文件范围

开始前应保持 Step 5 已通过：

- `QueryClientProvider` 已挂；默认 `staleTime: 30_000`、`retry: 1`、`refetchOnWindowFocus: false`、`mutations.retry: 0`。
- `AppFormDialog` 禁点遮罩关闭、确认中锁按钮。
- `QueryState` 只画四态，不发请求。
- 登录真调可用；`VITE_API_BASE=/admin/api/v1`；开发端口 **5174**。
- 后端 `course_server` 已启动（默认账号 `admin / admin123`）。

当前仓库里 `features/tag` **不是空的**。那是 08 的 Query 学习切片，外加 Step 5 在 TagPage 上的 Dialog / QueryState 临时接线。Step 5 验收明确说过：进入 Step 6 前自行删除或收成正式切片。本步的工作就是收成，不是在原生 table 上继续打补丁。

本步预计新增或修改：

```text
src/features/tag/
├── api.ts                         # 审计：DTO 与 HTTP；不要和第二份 Tag 类型漂移
├── queries.ts                     # 审计：tagKeys / tagQueries
├── schemas.ts                     # 新建：写表单 zod
├── pages/
│   ├── TagPage.tsx                # 重写为 Ant Table + QueryState + Dialog
│   └── TagPage.module.css         # 本步直接给出，见检查点 7
└── components/
    └── TagForm.tsx                # 替换 CreateTagForm：只渲染字段，不发请求
```

文件名可以小幅调整，但 `api` / `queries` / `schemas` / `pages` 这四件必须在 `features/tag`。不要把 `queryKey` 写进页面字符串，也不要把 Dialog 做成内部 `useQuery` 的智能弹窗。

本步 **不要** 安装新依赖。

## 4. 使用方式

每个检查点按下面顺序完成：

1. 只看“任务”和“完成信号”，先自己设计。
2. 卡住时再看“提示一”。
3. 仍无法推进再看“提示二”。
4. 完成后回答“自检问题”。
5. 每个检查点结束都跑最小验证，不要最后一次性排错。

### 对照源（本步不读 `Admin/src`）

**删掉 `Admin/src` 这份检查点仍能做完。**

Step 6 要对等的是：路由 `/tags`、接口路径、请求/响应字段、删除/禁用的业务规则。这些都可以从后端契约和本仓库已有代码推出。Vue 页里的 `load()`、`list ref`、拦截器 toast、Element 表单规则，落在 01 的禁止照搬清单里，读了只会干扰实现。

03 里「与 Vue Admin 同账号操作结果一致」指的是**同一条数据、同一次写操作的后端结果**（搜得到同一批、禁用被拒时文案来自后端、删启用中的标签失败）。那是可选的黑盒对照：两个浏览器都打同一个 API。不需要打开 `Admin/src`，也不需要把 Vue 的筛选交互、分页组件、表格列宽搬过来。

| 要确认的事实 | 去哪看 |
|---|---|
| 路径 `GET/POST /tags`、`PUT/DELETE /tags/:id`；删除须已禁用且无内容关联 | [api-reference.md](../../course_server/docs/api-reference.md) §3.5 |
| 列表 query：`keyword`、`status`、`page`、`pageSize`；写字段 `name`、`sortOrder`、`status` | 下文「产品契约」；实现见 `course_server/internal/handler` 的 `ListTags` / `CreateTag` / `UpdateTag` / `DeleteTag` |
| 名称必填、trim、最长 80；重名拒绝；启用→禁用须无关联；删除须已禁用且无关联 | 同上，以及 `internal/dto/admin/tag.go`、`internal/model/model_write.go` |
| `queryKeys` + `queryOptions`；禁止 Effect 拉数；禁止第一页 `useCrud` | [01-工程契约.md](./01-工程契约.md)「TanStack Query」「禁止」 |
| Dialog 禁点遮罩、确认中禁用；zod + RHF + `Controller` | 01「表单」；现成范式 [`LoginPage.tsx`](../src/features/auth/pages/LoginPage.tsx) |
| 四态怎么接到 Query 返回值 | 01 审查条第 3 条；[`QueryState.tsx`](../src/shared/ui/QueryState.tsx) |
| `queryKey` 必须含筛选/分页；写后 `invalidateQueries` | [08](./08-learn-tanstack-query.md) §4（只读 key / options / 失效；不要搬它的原生 table） |
| Table 受控分页、`Form.Item` + `Controller` | [Ant Design 6 Table](https://ant.design/components/table-cn)、[Form](https://ant.design/components/form-cn)（项目已装 antd `^6.6.0`） |

本步不要去翻其它端的列表页实现。你要做的是 React 后台的第一条 CRUD，不是翻译。

---

## 检查点 1：先写下产品契约，不急着改 Table

### 当前问题

标签页看起来像「一张表 + 一个弹窗」，真正要锁住的是字段和规则。字段写错，后面 10 页会抄错；规则写在按钮 `disabled` 里却和后端不一致，用户会在 toast 里看到英文/中文两套说法。

### 任务

先在纸面或注释里填完下面三张表，再碰文件。数值以**后端**为准，不要凭 08 学习切片里的 `pageSize: 5` 或 05 笔记里的 `max(20)`。

**1. 列表查询（`GET /tags`）**

| 参数 | 类型 | 规则 |
|---|---|---|
| `keyword` | string，可选 | 按名称模糊搜；空串或纯空格不要传 |
| `status` | `0 \| 1`，可选 | 不传 = 全部；不要传空串给后端 |
| `page` | number | 从 1 起；缺省 1 |
| `pageSize` | number | 后端缺省 **20**，上限 100（`pageParams`）。本页 UI 不展示切换，请求固定带 `10`，见检查点 6 |

响应解包后是 `PageData<Tag>`：`{ list, total, page, pageSize }`。排序由后端做：`sort_order DESC, id DESC`。前端不要再本地 sort。后端缺省 20 是「请求没带 pageSize 时」的值，不是前端必须锁 20。

**2. 实体与写入口**

| 字段 | 列表展示 | 创建/编辑 | 规则 |
|---|---|---|---|
| `id` | 不用展示 | 不出现在表单 | 路径参数 |
| `name` | 要 | 要 | trim 后非空，最长 80；全局唯一 |
| `sortOrder` | 要 | 要 | 整数；越大越靠前；缺省 0 |
| `status` | 要 | 要 | `1` 启用 / `0` 禁用；创建缺省启用 |
| `createdAt` / `updatedAt` | 至少展示一个 | 不出现在表单 | 服务端时间，原样显示即可 |
| `type` | 不要 | 不要 | 后端已废弃 |

`Tag` 已在 [`shared/types`](../src/shared/types/index.ts)。`EnableStatus`、`STATUS_OPTIONS`、`statusLabel` 已在 [`shared/constants/options.ts`](../src/shared/constants/options.ts)。本域不要再定义一份会漂移的 `TagStatus`。

**3. 写操作规则（失败文案以后端为准）**

| 操作 | 接口 | 前端先拦住 | 后端仍可能拒绝 |
|---|---|---|---|
| 创建 | `POST /tags` | zod：名称、排序、状态 | 重名 |
| 更新 | `PUT /tags/:id` | 同上 | 重名；**启用→禁用**时若仍被文章/作文引用 |
| 删除 | `DELETE /tags/:id` | 启用中的行不给删（按钮禁用） | 未禁用；仍被内容引用 |

后端删除/禁用的典型 message（UI 原样展示，不要自己翻译一套）：

- `仅已禁用的标签可删除，请先将标签禁用`
- `该标签仍被 N 篇文章、M 篇优秀作文使用，请先在对应内容中取消关联后再操作`
- `tag with same name already exists`

### 提示一

状态怎么分层，后面检查点必须填得进去：

| 数据 | 放哪 | 本步 |
|---|---|---|
| token / 管理员 | Zustand persist | 已有，不要动 |
| 当前页的 `list` / `total` | Query cache | 第一次合法出现 |
| `keyword` / `status` / `page` / `pageSize` | 页面 `useState`（这是查询条件，不是列表本身） | 要 |
| 弹窗开关、正在编辑的行 | 页面 `useState` | 要 |
| 输入框里还没点搜索的关键字草稿 | 页面 `useState` | 要（见检查点 6） |
| 表单值 | RHF | 要 |

「再 `const [list, setList] = useState(data.list)`」填不进去。

### 提示二

08 已经用原生 table 跑通过 Query。本步验收的是**同一套数据流 + Ant Design 产品壳**，不是「再实现一遍 listTags」。概念对不上时读 08 的 key / `invalidateQueries` / `keepPreviousData`；UI 对不上时读 LoginPage 和 `shared/ui`。

### 完成信号

不写组件也能回答：列表有哪些 query；创建提交哪三个字段；为什么启用中的标签不能删。

### 自检问题

- 为什么后端 `pageSize` 缺省 20，本页初始却是 10？
  - 20 是 handler 没收到该参数时的缺省。本页 `showSizeChanger: false`，前端锁 10，数据量不大时仍能翻页。Network 里应看到 `pageSize=10`，不是漏传。
- 为什么禁用/删除规则要写在契约里，而不是等 toast 才知道？
  - 按钮能先挡住的，不要让用户点出 400。挡不住的（重名、仍被引用）再展示 `ApiError.message`。
- 为什么本步不读 `Admin/src` 也能锁字段？
  - 字段和规则的真相源是后端 DTO / handler。Vue 只是另一个客户端。

---

## 检查点 2：收拾 08 切片，定文件职责

### 当前问题

现在的 TagPage 同时做了三件不该长期共存的事：08 的原生 table、Step 5 的 `tempStatus` 四态演示、Dialog 里 `setTimeout(2000)` 假提交。`CreateTagForm` 自己 `useMutation`，Dialog 的确定按钮又走另一套 `onSubmit`。审查时无法判断哪条路径是真的。

### 任务

先划职责，再决定删什么、留什么。

1. **`api.ts`**：只保留 HTTP 函数和本域查询/写入类型。实体 `Tag`、`PageData` 从 `shared/types` 引。不要在本文件再写一份 `Tag`。
2. **`queries.ts`**：只保留 `tagKeys` + `tagQueries.list`。页面禁止手写 `['tags', query]`。
3. **`schemas.ts`**：本步新建。写表单只认这一份 zod。
4. **`TagForm`**：只渲染字段（`control` 从外面传入）。禁止在表单组件里 `useMutation` / `useQueryClient`。
5. **`TagPage`**：拥有筛选 state、`useQuery`、三个 `useMutation`、Dialog `open`、`useForm`。删掉 `tempStatus`、假提交、原生 `<table>`、`<select>` 演示。
6. 删除或彻底替换 `CreateTagForm.tsx`，不要留一个已不引用的文件。

本检查点可以先改 import 和删演示代码，Table 可以暂时空着，但页面必须能编译。

### 提示一

`AppFormDialog` 的确定按钮调用的是你传入的 `onSubmit`。表单组件如果自己再放一个 `<button type="submit">`，会出现两个提交入口。LoginPage 的按钮在 Form 里是因为登录页没有 Dialog。标签创建走 Dialog，字段组件就不要再放提交按钮。

`CreateTagForm` 里的 `register` 也不要带到 Ant 控件上。Ant `Input` / `Select` / `InputNumber` 是受控组件，接 RHF 必须 `Controller`。01 写过，LoginPage 就是样例。

### 提示二

`shared/api/index.ts` 目前只导出 `get` / `post`。`put` / `del` 从 `@/shared/api/http` 引即可（08 已经这么做）。不要为了「入口好看」顺手改 shared 的对外导出——那不是本步的范围。

### 常见错误

- 留着 `tempStatus` 的 `<select>`，「先做 Table 再删」。审查会当成演示页残留。
- `CreateTagForm` 和页面各写一套 `createTag` mutation，创建成功路径会分叉。
- 把 `Tag` 同时写在 `shared/types` 和 `api.ts`，改了一处忘了另一处。

### 完成信号

- 源码搜不到 `tempStatus`、`setTimeout` 假提交、`Please enter a tag name`。
- `CreateTagForm` 要么消失，要么不再被引用。
- `pnpm verify` 仍绿（页面可以先很丑）。

最小验证：

```bash
# 工作目录：Admin-React/
pnpm verify
```

### 自检问题

- 为什么表单组件不能自己 `useMutation`？
  - Dialog 的 `confirmLoading`、关闭时机、`invalidateQueries` 属于页面流程。字段组件一写 mutation，Dialog 确定按钮就成了摆设，或者出现双提交。
- 为什么现在抽 `TagForm` 不算 `useCrud`？
  - 它没有列表、没有 queryKey、没有删除。只是「受控字段 + `control`」。CRUD 流程仍在 TagPage。

---

## 检查点 3：审计 `api.ts`，对齐后端而不是对齐 08

### 当前问题

08 为了尽快看到请求，在 `api.ts` 里自建了 `Tag` / `PageData` / `TagStatus`。那些形状碰巧对，但本步要以 `shared/types` 和后端为准收紧。另外 `pageSize: 5` 的默认值如果写在页面初始 state，会变成产品行为。

### 任务

打开 [`api.ts`](../src/features/tag/api.ts)，做到：

1. `listTags` → `GET /tags`，`params` 只包含有值的筛选。`keyword` trim 后为空则 `undefined`；`status === ''` 则 `undefined`。
2. `createTag` → `POST /tags`，body 为 `{ name, sortOrder, status }`。
3. `updateTag` → `PUT /tags/:id`，body 同样三个字段（后端更新 DTO 与创建共用，不支持「只传 status」）。
4. `deleteTag` → `DELETE /tags/:id`。
5. `queryFn` 要把 Query 给的 `signal` 传给 `get`，切筛选时才能取消过期请求。
6. 类型：`Tag`、`PageData` 从 `@/shared/types` 来；`TagListQuery`、`TagWriteInput` 留在本域（它们不是跨 feature DTO）。

本检查点不要 `useQuery`。用登录后的浏览器或临时在控制台调用也可以，但不要把探测代码提交进页面。

### 提示一

`toTagListParams` 这种纯函数值得留：它把 UI 上的「全部状态 = `''`」翻译成 HTTP 上的「不传 status」。不要让 axios 把 `status=` 空串发到后端——handler 里 `status != ""` 才过滤，空串虽碰巧没筛，但和「不传」不是同一份契约，其它页抄起来会乱。

### 提示二

`updateTag` 不要设计成 `Partial<TagWriteInput>`。禁用开关看起来只改 status，实际 PUT 仍要带上当前的 `name` 和 `sortOrder`。从行数据里取，不要开一个「只传 status」的假 API。

### 完成信号

你能指着四个函数说出 method、path、哪些字段会出现在 Network 里。

### 自检问题

- 为什么列表函数要收 `signal`？
  - Query 在 queryKey 变化或组件卸载时会 abort。不传 `signal`，过期响应仍可能回来，只是 Query 会丢掉；传了才能少打无用请求。
- `TagListQuery.status` 为什么包含 `''`？
  - 那是 UI 的「全部」。HTTP 层要把它丢掉。两种类型不要合成一个。

---

## 检查点 4：`queryKeys` 必须含筛选 / 分页

### 当前问题

`queryKey: ['tags']` 看起来能出列表，换页、换关键字时地址不变，缓存会串。01 和 03 把「key 含 keyword / page / pageSize」写成了本步验收项，不是风格问题。

### 任务

[`queries.ts`](../src/features/tag/queries.ts) 保持（或改成）这一层，不要再简化：

```text
tagKeys.all          ['tags']
tagKeys.lists()      ['tags', 'list']          ← 写操作失效用这个
tagKeys.list(query)  ['tags', 'list', query]   ← useQuery 订阅用这个
```

`tagQueries.list(query)` 用 `queryOptions({ queryKey, queryFn })` 绑死 `listTags`。页面只写：

```ts
useQuery({
  ...tagQueries.list(query),
  placeholderData: keepPreviousData,
})
```

`keepPreviousData` 写在页面这一次调用上，不要写进 `tagQueries` 的默认值——不是所有将来的 tag 查询都要占位。

本检查点仍可以先不画 Ant Table，但 Devtools 里必须能看到 key 随筛选变化。

### 提示一

[08 §4](./08-learn-tanstack-query.md) 把「为什么 lists 和 list 要分开」写过了。失效时用前缀 `tagKeys.lists()`，不要 `tagKeys.all` 除非你确实想连将来的 detail 一起打。本步没有 detail query，打 `lists()` 就够。

`query` 对象进 key 时，靠的是 Query 的稳定序列化。不要在 render 里每次 `list({ ...query, keyword: query.keyword.trim() })` 造出新对象形状却让 key 和你 `setQuery` 的那份不一致。trim 放在 `toTagListParams`，UI state 保持输入值。

### 提示二

翻页时如果不用 `placeholderData: keepPreviousData`，`isPending` 在 key 变化的那一瞬间会回到 true，表格会闪成 QueryState 的 Skeleton。08 已经踩过。Ant Table 同样会闪，不是原生 table 才有的问题。

判断「真正的首次加载」用：

```ts
tagsQuery.isPending && !tagsQuery.isPlaceholderData
```

不要只写 `if (tagsQuery.isPending)`。

### 常见错误

- 页面再写一遍 `queryKey: ['tags', query]`，和 `tagQueries` 分叉。
- `invalidateQueries({ queryKey: tagKeys.list(query) })`：只打当前这一页，其它页的缓存会脏着。
- 把 `keepPreviousData` 抄进 QueryClient 默认值。

### 完成信号

Devtools 中，改关键字或翻页会出现不同的 `['tags','list',{...}]`；创建成功后这些 list 查询会变成 stale 并重打。

### 自检问题

- 为什么失效用 `lists()` 而不是 `list(query)`？
  - 你刚创建的标签可能出现在第 1 页，用户却停在第 2 页的缓存上。前缀失效让所有分页/筛选组合都重新向服务器对齐。
- 为什么 `status` 也要进 key？
  - 03 示例写了 keyword / page / pageSize。漏掉 `status` 时，「全部」和「仅启用」会共享同一条缓存。本步把四个都放进去。

---

## 检查点 5：`schemas.ts` —— 写表单的唯一校验源

### 当前问题

08 把 schema 写在 `CreateTagForm` 里，英文错误文案，且没有独立文件。03 要求本步产出 `schemas.ts`（单测留 Step 16，但文件本步就要有）。

### 任务

新建 `src/features/tag/schemas.ts`：

- `name`：`trim` → 非空「请输入标签名称」→ `max(80)`「名称不超过 80 个字符」。
- `sortOrder`：整数（不要 `coerce` 掩盖空值；空值应在表单项报错）。
- `status`：`z.union([z.literal(0), z.literal(1)])`。不要 `z.number()` 再靠运行时碰运气。
- 导出 `tagWriteSchema`，以及 `TagWriteInput` / `TagWriteOutput`（或你命名的 `z.input` / `z.output`）。

页面 `useForm` 的 generic 与 LoginPage 同一套：`useForm<Input, unknown, Output>` + `zodResolver(tagWriteSchema)`。

不要把「重名」写进 zod。那是服务端唯一约束，本地 schema 看不到其它行。

### 提示一

[`LoginPage`](../src/features/auth/pages/LoginPage.tsx) 和 [`auth/schemas.ts`](../src/features/auth/schemas.ts) 就是接线。标签多一个数字字段：`InputNumber` 必须 `Controller`，不要 `register('sortOrder', { valueAsNumber: true })` 硬套到 Ant 控件上。

05 笔记里的 `createTagSchema` 写过 `max(20)`，那是学习示例，**不要抄**。以后端 `maxTagNameLen = 80` 为准。

### 提示二

`status` 用 `Select` 时，option 的 value 是 number。确认 `Controller` 交回 RHF 的是 `0 | 1`，不是 `"0"`。zod 的 `literal(0)` 会拒绝字符串，这正是你要的——类型在表单出口就闭合。

默认值：

```ts
{ name: '', sortOrder: 0, status: 1 }
```

打开编辑时在**点击事件**里 `reset({ name, sortOrder, status })`，不要 `useEffect(() => reset(tag), [tag])`。

### 完成信号

空名称点确定，错误出现在名称这一项，不出现在 toast，Dialog 不关闭。

### 自检问题

- 为什么重名不放进 zod？
  - zod 校验的是这一份表单值的形状。库里有没有同名是服务器的事。前端重复实现会和后端规则分叉。
- 为什么编辑要用 `reset` 而不是给 `defaultValues` 换引用？
  - RHF 的 `defaultValues` 只在 mount 时吃一次。Dialog `destroyOnHidden` 会卸表单，但更稳的做法是打开时显式 `reset`，创建/编辑切来切去不会串值。

---

## 检查点 6：筛选接到 `query`，关键字不要每个字符打一次

### 当前问题

08 的输入框 `onChange` 直接 `setQuery({ keyword })`。每个字符都会换 `queryKey`，等于把输入过程当成查询条件。后台筛选的产品行为是：点搜索（或回车）才生效；改状态这种离散值可以立刻生效；改筛选时页码回到 1。

### 任务

页面上保留一份 `query: TagListQuery` 作为**已生效**的查询条件（它进 `queryKey`）。

另外保留一份 `keywordDraft`（或等价）。筛选放进 `PageHeader` 的 `children`（检查点 7），不要再做一排独立 toolbar：

- 名称：受控输入，改的是 draft，不改 `query.keyword`。
- 搜索按钮 / `Input.Search` 的 `onSearch`：把 draft 写入 `query`，同时 `page: 1`。
- 状态 `Select`：立刻写入 `query.status`，同时 `page: 1`。选项来自 `STATUS_OPTIONS`，外加一个「全部」值为 `''`。
- 分页：Table 的 `pagination.onChange` 只改 `page`。本页 `showSizeChanger: false`，`pageSize` 保持初始 10。

不要 debounce 每个字符（那是另一套复杂度）。不要用 Effect 把 draft 同步到 query。

初始 `query`：

```ts
{ keyword: '', status: '', page: 1, pageSize: 10 }
```

### 提示一

`Input.Search` 可以同时承担输入和按钮。`onSearch` 在点按钮和回车时触发。状态筛选只有三个值，没有「输入过程」，可以直接 `setQuery`。

离散筛选立刻生效、文本筛选确认后生效——这是 React 后台常见分法，不是从 Vue 搬来的。

### 提示二

`query.page * query.pageSize < total` 这种手写「有没有下一页」可以丢掉。Ant Table 的分页用 `total` 自己算。你要做的是把 `current` / `pageSize` / `total` 做成受控，别让 Table 自己偷偷存一份页码。antd 默认只在 `total >= 50` 时才画出条数切换；本页产品选择是**始终不展示**，所以要显式 `showSizeChanger: false`，不要靠数据量碰巧藏起来。

### 完成信号

- 输入「免费」但不点搜索：Network 不应出现新的 `keyword=免费`。
- 点搜索：key 里的 keyword 变成「免费」，页码为 1。
- 切到「禁用」：立刻重打，`status=0`，页码为 1。

### 自检问题

- 为什么 draft 和 query 要分开？
  - 输入过程不是查询条件。混在一起，Query 会把每个字符当成一次不同的列表。
- 改筛选为什么要 `page: 1`？
  - 你在第 3 页搜一个只有 2 条的关键字，如果不回第一页，会拿着 `page=3` 去问服务器，得到空列表，看起来像「没有数据」。

---

## 检查点 7：Ant Table + QueryState + 样式（样式直接用）

### 当前问题

布局一旦每页手写一排 `flex`，间距会分叉。本步把标签页的壳定下来，后面的列表页抄的是这个壳，不是 08 的原生 table。

### 任务

1. 用 `PageHeader`：title「标签管理」，`extra` 放「新建标签」。
2. 筛选控件放进 `PageHeader` 的 `children`（检查点 6）。`PageHeader` 已有 `.filters` 槽，本页不要再做 `.toolbar`。
3. 用 `QueryState` 包住表格。四态在 **render 里用 if/else 派生**，不要 `useEffect` + `setStatus`，也不要用嵌套三元（见下方「常见错误」）：

| 条件 | `status` |
|---|---|
| `isPending && !isPlaceholderData` | `'pending'` |
| `!data && isError` | `'error'` |
| `data.list.length === 0` | `'empty'` |
| 其余（有 `data`） | `'success'` |

`isLoadingError` 语义上就是「首次失败、没有 data」，写成 `!data && isError` 即可，不必再 `|| isLoadingError`。

有数据时的后台刷新（`isFetching && !isPending`）**不要**卸表格，也不要把 `status` 设回 `'pending'`。给一行轻量提示即可。

有数据时的 `isRefetchError`：表格仍显示上一份成功数据，表格上方一行提示。不要整页换成 QueryState 的 error，也不要在 render 里调 `message.error`（每轮都会弹）。

4. 成功分支用 antd `Table`：
   - `rowKey="id"`（禁止用下标）。
   - 列：名称、排序、状态、更新时间、操作。
   - 状态列用 `statusLabel`，不要自己再写一遍三元。
   - 受控分页：`current` / `pageSize` / `total` / `onChange`；`showSizeChanger: false`，`pageSize` 锁 10。
   - `loading` 不要绑 `isFetching`（会在翻页占位时整表转圈，和 Skeleton 重复）。首次加载交给 QueryState。
5. **样式不要自己发明。** 筛选间距走 `PageHeader.module.css`。本页只建 `src/features/tag/pages/TagPage.module.css`，整文件如下：

```css
.page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.keyword {
  width: 220px;
}

.status {
  width: 160px;
}

.fetchingHint {
  margin: 0;
  font-size: 13px;
  line-height: 1.5;
  color: rgba(0, 0, 0, 0.45);
}

.fetchError {
  margin: 0;
  font-size: 13px;
  line-height: 1.5;
  color: #ff4d4f;
}

.rowActions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}
```

页面骨架（class 名必须对上；控件和列自己接）：

```tsx
<div className={styles.page}>
  <PageHeader title="标签管理" extra={/* 新建按钮 */}>
    {/* Input.Search 用 className={styles.keyword} */}
    {/* 状态 Select 用 className={styles.status} */}
  </PageHeader>

  <QueryState
    status={queryStatus}
    errorText={tagsQuery.error ?? '加载失败'}
    emptyText="暂无标签"
  >
    {showFetchingHint ? (
      <p className={styles.fetchingHint}>数据同步中</p>
    ) : null}
    {showFetchError ? (
      <p className={styles.fetchError}>数据同步失败</p>
    ) : null}
    <Table /* ... */ />
  </QueryState>
</div>
```

四态推荐写法（不要抄成嵌套三元）：

```ts
let queryStatus: QueryStateEnum = 'success'
if (tagsQuery.isPending && !tagsQuery.isPlaceholderData) {
  queryStatus = 'pending'
} else if (!tagsQuery.data && tagsQuery.isError) {
  queryStatus = 'error'
} else if (tagsQuery.data?.list.length === 0) {
  queryStatus = 'empty'
}

const showFetchingHint = Boolean(
  tagsQuery.data && tagsQuery.isFetching && !tagsQuery.isPending,
)
const showFetchError = Boolean(tagsQuery.data && tagsQuery.isRefetchError)
```

不要在这一步引入 `shared/styles` token、不要上 Tailwind、不要在 TSX 里写 `color: '#xxx'`。操作列的按钮间距用 `.rowActions`。

### 提示一

`QueryState` 的 success 才渲染 `children`。Table 放在它里面，空列表就不会出现「表头 + 暂无数据」叠两层——空态由 QueryState 的 `Empty` 负责。若你更想保留表头空态，可以把 empty 也判成 `'success'` 并让 Table 自己画空。两种都成立，选一种并在自检里说得出。推荐本步用 QueryState 的 empty，表格更干净。

Layout 的 `Content` 已经有白底和 padding（`AdminLayout.module.css` 的 `.content`）。页面不要再套一层 Card 去「看起来像后台」，除非你有空白需要分区。本步一张表够了。

### 提示二

更新时间直接渲染接口返回的 `updatedAt` 字符串。不要为了格式化去装 dayjs。后端 `jsontime` 已经是可读时间。

`columns` 可以写在组件里。01 禁止预防性 `useMemo`。不要为了「columns 稳定」包一层。

### 常见错误

- `status={isPending ? 'pending' : ...}` 忘记 `isPlaceholderData`，翻页闪 Skeleton。
- 用嵌套三元写 `isError || isLoadingError`：Query 的返回值是 discriminated union，`||` 右侧会被收成 `never`（`Property 'isLoadingError' does not exist on type 'never'`）。用 if/else + `!data && isError`。
- 用 `useEffect` 把四态同步进另一份 `useState`：派生展示直接算。
- `loading={tagsQuery.isFetching}` 导致占位刷新时表格和 Skeleton 一起转。
- 自己再写一套 `.page { padding: 24px }` 或 `.toolbar`，和 Layout / PageHeader 的间距叠起来。

### 完成信号

- `/tags` 能看到筛选条和表格，不再是原生 `<table>`。
- 空库或搜不到：QueryState 空态，不是报错。
- 断网或停后端再进页：QueryState 错误态。
- 翻页不闪成整页 Skeleton。
- 筛选在 PageHeader 里，不是独立 toolbar。
- 样式只有这一份 module，TSX 里没有行内 `color: '#xxx'`。

### 自检问题

- 为什么首次 pending 和后台 fetching 不能用同一个转圈？
  - 没数据时转圈是在等第一份结果。有数据时转圈等于把表藏起来。审查条第 3 条要能分开描述。
- 为什么本步把 CSS 写死在文档里？
  - 列表页的间距不是本步要学的概念。概念在 Query 和表单。间距分叉了，后面 10 页会各写一套。
- 为什么筛选放进 PageHeader，不自己做 `.toolbar`？
  - `PageHeader` 已经有筛选槽。后面列表页抄「标题 + extra + children」，间距不会分叉。

---

## 检查点 8：创建 / 编辑共用 Dialog，表单走 RHF

### 当前问题

创建和编辑的字段相同、校验相同、接口 body 相同，只是 method 和成功文案不同。两套表单会立刻分叉。本步用**一个** `AppFormDialog` + 一份 `useForm` + 一个「正在编辑的 Tag | null」。

### 任务

1. `editing: Tag | null`。`null` 且 `open` → 创建；非 `null` → 编辑。
2. 点「新建标签」：`reset` 到创建默认值，`editing = null`，`open = true`。
3. 点行内「编辑」：`reset` 到该行的 `name` / `sortOrder` / `status`，`editing = tag`，`open = true`。
4. `AppFormDialog`：
   - `title` 随模式变。
   - `confirmLoading` 绑创建或更新 mutation 的 `isPending`（当前模式那一个）。
   - `onSubmit` 调 `form.handleSubmit(onValid)`。
   - `onClose` 只关窗；提交中不要关（壳已经拦了取消）。
5. `onValid` 里：创建走 `createTag`，编辑走 `updateTag({ id, input })`。成功：`message.success`、关窗、`invalidateQueries({ queryKey: tagKeys.lists() })`。失败：`message.error(ApiError.message)`，**不关窗**。
6. `TagForm` 接收 `control` 和 `errors`（或 `formState`），用 `Form layout="vertical"` + `Form.Item` 的 `validateStatus` / `help`，与 LoginPage 相同。
7. 不要在 `onValid` 成功后再 `setList`。

mutation 的 `onSuccess` 里做 invalidate 也可以；toast 和关窗放在页面调用处，这样你能区分「创建成功」和「更新成功」文案。不要在 axios 里弹。

### 提示一

`AppFormDialog` 不会帮你 `handleSubmit`。它只在点确定时调用 `onSubmit`。因此：

```ts
onSubmit={() => {
  void form.handleSubmit(onValid)()
}}
```

校验失败时 RHF 不会调 `onValid`，Dialog 保持打开，`confirmLoading` 不应被设为 true。不要在点确定时先 `setConfirmLoading(true)` 再提交——那会让校验失败也转圈。直接用 `mutation.isPending`。

### 提示二

`destroyOnHidden` 已经在 Dialog 壳上。关窗后字段组件会卸。下一次打开仍要 `reset`，因为 RHF 实例如果留在页面（推荐留在 TagPage，不要放进会随 Dialog 卸载的子树），值会还在。

`useForm` 放在 TagPage，`TagForm` 只吃 `control`。这样 Dialog 卸字段时，resolver 和默认值还在。

### 常见错误

- 编辑提交只传了改过的字段。后端要完整 `name` + `sortOrder` + `status`。
- 成功后关窗，但 `invalidateQueries` 写成了 `list(query)` 只打当前筛选。
- Ant `Form` 和 RHF 两套 `onFinish`。只保留 RHF；Ant Form 用 `layout` 和 `Form.Item` 画 UI，不要再 `onFinish`。

### 完成信号

- 创建「引导测试」成功，列表出现该行（可能在第 1 页，注意排序权重）。
- 再编辑改名，表格名称变，不必手动刷新浏览器。
- 名称为空：Form.Item 红字，无 toast，窗不关。
- 重名：toast 为后端 message，窗不关。

### 自检问题

- 为什么 `confirmLoading` 不要用本地 `useState` 包一层？
  - mutation 已经有 `isPending`。再包一层就要在失败/校验失败时手动拨回来，这是第二份提交中状态。
- 为什么校验失败走 Form.Item，请求失败走 toast？
  - 前者是「这份输入不合法」，能定位到字段。后者是「服务器拒绝」，不一定属于某一个输入框（重名勉强算，引用计数不算）。

---

## 检查点 9：启用 / 禁用 / 删除

### 当前问题

删除不是普通 CRUD 的第四个按钮。后端要求：先禁用，且没有文章/作文引用。前端要在按钮上表达这条规则，并把后端拒绝原样给用户。

### 任务

操作列三个动作即可：编辑、启用或禁用、删除。

**禁用 / 启用**

- 文案随当前 `status` 切换。
- 点击即 `updateTag`，body 带上当前 `name`、`sortOrder`、以及翻转后的 `status`。
- `isPending` 时禁用这几个按钮，避免连点。
- 失败 `message.error`。不要本地改该行 status。

**删除**

- `status === 1`：按钮 `disabled`，`title` 或 Tooltip 写「请先禁用再删除」。
- `status === 0`：`Popconfirm`（Layout 退出登录已经用过）确认后再 `deleteTag(id)`。
- 确认文案：「确定删除该标签？删除后不可恢复。」
- 失败同样 toast 后端 message（仍被引用时会返回中文计数）。
- 成功 `message.success` + `invalidateQueries({ queryKey: tagKeys.lists() })`。

不要做「删除失败后再带 `?confirm=true`」。那是下载资料 Step 13 的规则，标签删除没有这层。

不要在本步做批量删除、不要做行选择。

### 提示一

启用中禁用按钮，是产品规则的前端投影，不是乐观更新。后端仍是权威：若有人在另一端把标签绑到文章上，禁用请求照样 400，你的 toast 必须能看见那句「仍被 N 篇文章使用」。

`Popconfirm` 在 `disabled` 按钮上点不出来。所以启用中直接 disable 删除，不要套一层点了没反应的确认框。

### 提示二

三个 mutation 可以分开 `useMutation`，也可以写三个 `mutationFn` 共用一个 generic。分开更易读：`createMutation` / `updateMutation` / `deleteMutation`。不要为此抽 `useTagMutations`。

删除成功后如果当前页空了（删的是本页最后一条），Query 失效重打会得到空 list。这时 QueryState 应走到 empty，或你把 `page` 往前拨一页。本步允许不自动回退页码——空态是合法结果。若你做了回退，在验收备注里写一句。

### 完成信号

- 启用中的行：删除按钮不可点。
- 禁用一个无引用的标签，再删除，行消失。
- 对仍被内容使用的标签点禁用：toast 为后端中文，行仍是启用。
- 全程没有 `useEffect`。

### 自检问题

- 为什么禁用失败不能在前端先把 Switch 拨过去再拨回来？
  - 那是乐观更新。本步没有「失败回滚」的 evidience 需求。等 invalidate 后的服务器结果，少一份会和 cache 打架的本地 status。
- 为什么本步不抽「危险操作 confirm」共享组件？
  - 全项目才第二次用 `Popconfirm`（第一次是退出登录）。Rule of Three：等第三处相同结构再抽。

---

## 检查点 10：完整验收

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

前置：后端已启动；前端 `pnpm dev` 在 **5174**；用 `admin / admin123` 登录。

- 列表
  - 进入 `/tags` 首次为 pending，随后是表或空态。
  - 无 `useEffect` 拉列表（源码搜 `useEffect` 不应为了 tags GET 出现）。
  - Devtools 的 key 含 `keyword`、`status`、`page`、`pageSize`。
  - 输入关键字不点搜索：不发新请求。点搜索 / 回车后才带 `keyword`，且 `page=1`。
  - 状态筛选立刻生效，`page=1`。
  - 翻页不闪整页 Skeleton；`pageSize` 固定 10，不展示条数切换。
- 创建
  - 空名称：表单项错误，窗不关。
  - 合法创建成功，列表刷新，无手动 F5。
  - 重名：toast 后端文案，窗不关。
- 编辑
  - 打开时字段是当前行；提交后名称/排序/状态与服务器一致。
- 禁用 / 删除
  - 启用中不能删。
  - 无引用的标签：禁用 → 删除 → 行消失。
  - 有引用的标签：禁用失败，toast 含文章/作计数，行仍启用。
- 状态分层
  - 列表只在 Query cache；没有 `const [list, setList]`。
  - toast 来自 `App.useApp()`，不来自 axios。
  - Dialog 点遮罩不关；提交中确定按钮不可点。
- 边界
  - 无 `any`、无万能 `useCrud`、无其它业务域真页面。
  - 无 Step 5 的 `tempStatus` 演示、无 08 原生 table、无假 `setTimeout` 提交。
  - `features/a` 没有 import `features/tag` 的页面组件。

### 可选：黑盒对照（仍不读 `Admin/src`）

若本机 Vue Admin 也在 5173 跑，用**同一账号**各做一次：搜同一个关键字、删同一个无引用的禁用标签。只核对结果（条数、能否删、失败文案），不核对布局、分页器样式、是否有全局 Loading。

没有跑 5173 不影响本步通过。后端契约已经足够验收。

### 代码审查时自搜

```text
useEffect
setList
queryKey: ['tags']
useCrud
tempStatus
CreateTagForm
register(
from 'antd' 的静态 message
```

预期：`useEffect` 不为拉数出现；`queryKey` 只来自 `tagKeys`；`register` 不应出现在 Ant 控件上；`message` 只来自 `App.useApp()`。

按 [03 验收协议](./03-开发计划.md) 发审查时，把本矩阵勾过去。

---

## 5. 失败时的最短排查路径

### 进入 `/tags` 立刻红字「No QueryClient set」

`QueryClientProvider` 没挂住路由树。回到 Step 5 的 `AppProviders`，不要在 TagPage 里 `new QueryClient()`。

### Network 里请求打到了 `/tags` 但页面一直 pending

解包失败会进 error，不是永远 pending。若一直 Skeleton：检查 `QueryState` 是否把 `isFetching` 当成了 `pending`，或 `data` 其实已经回来但你映射错了。

### 筛选「全部」却变成只看禁用

`status` 把 `''` 传成了 `0`，或 `Select` 把空值收成了 `undefined` 又被你写成 `0`。对照 `toTagListParams`：全部 = 不传该参数。

### 每敲一个字都打请求

`keywordDraft` 和 `query` 又混在一起了。`onChange` 只改 draft。

### 翻页闪白

缺少 `keepPreviousData`，或首次判断没用 `!isPlaceholderData`。

### 点 Dialog 确定没反应

`onSubmit` 没有调用 `form.handleSubmit(...)()`。壳只负责点确定，不会自己 `handleSubmit`。

### 校验失败也转圈

不要手写 `confirmLoading` state。用 `mutation.isPending`。

### 创建成功了表格没有新行

`invalidateQueries` 的 key 是否为 `tagKeys.lists()`。是否只打了 `tagKeys.list(query)` 而新行不在当前筛选里（例如当前筛的是禁用，新行默认启用）。

### 删除启用中的标签弹出后端那句「请先将标签禁用」

前端按钮没 disable。先挡住，再依赖后端兜底。

### `pnpm verify` 报 `Tag` 重复定义

`api.ts` 和 `shared/types` 各写了一份。删本域那份，改 import。

### 工作目录不对

所有 pnpm 命令在 `Admin-React/`。仓库根没有这份 `package.json`。

---

## 6. 完成后应能口头回答

1. 为什么 Query 的第一次使用必须是标签真页，而不是 Step 5 随便 GET 一下？
2. `tagKeys.list(query)` 和 `tagKeys.lists()` 各给谁用？
3. 为什么 `queryKey` 漏掉 `status` 会串缓存？
4. `isPending` 和 `isFetching` 在这页分别让用户看到什么？
5. 为什么关键字要用 draft，状态筛选可以立刻写进 `query`？
6. 为什么更新禁用不能只传 `{ status: 0 }`？
7. 校验失败、重名、仍被引用，三种失败各展示在哪？
8. 为什么本步不抽 `useCrud`？
9. 为什么打开编辑用点击时 `reset`，不用 Effect 同步？
10. 为什么不读 `Admin/src` 也能验收本步？

---

## 7. 快速上手总结

### 必须掌握

- `tagKeys` + `queryOptions`：地址和取数绑在一处；key 含全部筛选/分页。
- `useQuery` + `QueryState`：pending / error / empty / success；有数据的 fetching 不卸表。
- `placeholderData: keepPreviousData`：换 key 时保住上一页。
- `useMutation` + `invalidateQueries(tagKeys.lists())`：写后只认服务器。
- zod + RHF + `Controller` + `AppFormDialog`：校验在字段，提交中用 `isPending`。
- 删除/禁用的产品规则：启用中不能删；引用关系以后端 400 为准。

### 按需了解

- `keepPreviousData` 与 `placeholderData` 函数形式：本步用前者够了。
- Table `loading`：本步不用它表达首次加载。
- 删空当前页后自动 `page - 1`：可选，不是验收项。
- 乐观更新：本步不做。
- 08 原生 table：学习切片，不是产品壳。
- schema / queryKey 单测：Step 16。

### 下一步

Step 6 验收通过后再进入 Step 7：

- 教材分类：同样的 list + Dialog 范式，**无删除**，筛选项更多。
- 若与 tag 页出现大段复制，Step 7 才允许抽薄层 list hook（Rule of Three）。
- 本步不要提前抽那层 hook。

## 8. 未验证项

- 本文没有替你实现 TagPage 源码，因此不能声称「按本文复制即可运行」。
- CSS 已给出完整文件；表格列、mutation 接线、schema 需你按检查点自己写。
- 未在隔离空目录复现本步（本步是累计项目，依赖 Step 1–5 的仓库状态）。
- 「与 Vue 操作结果一致」未作为必跑项；未跑 5173 时，以后端契约 + 手动验证矩阵为准。
- 完成实现后，请以 `pnpm verify`、`pnpm build` 和「手动验证矩阵」为最终验收依据。
