# TanStack Query：从标签列表到写后同步

> 本文基于项目实际安装的 `@tanstack/react-query 5.101.4`，对应
> `[03-开发计划.md](./03-开发计划.md)` 的 Step 5～6。
> 主线只有一条：接入 QueryClient，并用真实标签接口完成列表查询、筛选分页、创建、
> 状态切换、删除和写后同步。

官方入口（本文对照 **v5**，不要混用 v4 状态名）：

- [TanStack Query](https://tanstack.com/query/latest)
- [useQuery](https://tanstack.com/query/v5/docs/framework/react/reference/useQuery)
- [useMutation](https://tanstack.com/query/v5/docs/framework/react/reference/useMutation)
- [QueryClient](https://tanstack.com/query/v5/docs/reference/QueryClient)

---

## 0. 目标与完成标准

完成本文后，项目应具备：

```text
AppProviders
  → 提供唯一 QueryClient

features/tag/api.ts
  → 调用真实 /admin/api/v1/tags 接口

features/tag/queries.ts
  → 集中管理 tagKeys 与 queryOptions

features/tag/pages/TagPage.tsx
  → 查询、筛选、分页、状态切换、删除

features/tag/components/CreateTagForm.tsx
  → zod + RHF 校验，创建成功后失效列表
```

验收标准：

- 首次进入标签页能区分加载、失败、空列表和成功状态；
- `keyword`、`status`、`page`、`pageSize` 全部进入 `queryKey`；
- 切换分页时保留上一页数据，不闪成空白页；
- 创建、更新、删除都使用 `useMutation`；
- 写成功后通过 `invalidateQueries` 获取服务端权威结果；
- 页面不使用 `useEffect` 拉取列表，也不复制第二份列表 state；
- `pnpm verify` 通过。



### 0.1 前置条件

本文不是从空 Vite 项目开始，执行前应已完成：

1. Step 3：登录态可用，token key 为 `admin_token`；
2. Step 4：`src/shared/api` 已实现统一响应解包和 `ApiError`；
3. 后端 `course_server` 已启动；
4. 当前工作目录为 `Admin-React/`。

本文假定 `@/shared/api` 暴露以下能力：

- `get<T>(path, { params, signal })`；
- `post<T>(path, body)`；
- `put<T>(path, body)`；
- `del<T>(path)`；
- HTTP `code === 0` 时返回 `data`，否则抛出 `ApiError`。

请求基地址由 `.env.development` 的
`VITE_API_BASE=/admin/api/v1` 提供。Query 层不重复解包响应，也不直接处理 token。

---



## 1. 先建立服务端状态模型

标签列表的真正数据源在后端。浏览器中的列表只是带生命周期的缓存：

```text
数据库
  → HTTP 响应
  → Query cache
  → 订阅该 queryKey 的组件
```

TanStack Query 不替代 `fetch` 或 Axios。HTTP 客户端负责发送请求和解析协议，
TanStack Query 负责：

- 何时请求；
- 如何标识和复用缓存；
- 数据何时 stale；
- 多个组件如何共享同一请求结果；
- 写成功后哪些缓存需要失效；
- loading、error、后台刷新和重试状态。

不要再维护第二份列表：

```text
反模式：
HTTP → Query cache → useEffect → setList → 页面

正确：
HTTP → Query cache → 页面
```

和 Vue 页内拉数对照：以前常在 `onMounted` 里请求，结果放进 `ref`。Query 把「何时请求、
缓存身份、loading / error、写后失效」从组件里抽走，组件只订阅 `queryKey`。不要再把
Query 的 `data` 抄进另一份 `useState`，那相当于 Vue 里请求成功后又 `list.value = data`
再维护一份，缓存和页面会立刻分叉。

### 1.1 四个核心概念

```text
queryKey  = 这份数据是谁
queryFn   = 怎样取得这份数据
staleTime = 多久内认为数据仍然新鲜
gcTime    = 无组件订阅后，缓存最多保留多久
```

Query 用于读取服务端数据，Mutation 用于执行创建、更新、删除等写操作。

---



## 2. 安装并接入唯一 QueryClient



### 2.1 安装

在 `Admin-React/` 执行：

```bash
pnpm add @tanstack/react-query
pnpm add -D @tanstack/react-query-devtools
```

当前项目已经安装 `5.101.4`。如果以后升级，应重新核对本文涉及的状态名和默认行为。

### 2.2 创建 QueryClient

新建 `src/shared/query/query-client.ts`：

```ts
import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
})
```

这里的策略适合后台管理端：

- 数据成功后 30 秒内为 fresh；
- 查询失败最多重试 1 次；
- 切回浏览器窗口时不自动刷新；
- Mutation 默认不重试，避免重复写入。

浏览器端默认 `staleTime` 为 `0`、`gcTime` 为 5 分钟、查询失败重试 3 次。
项目级默认值统一放在这里，业务确有差异时才在单个查询中覆盖。

#### API 细节：`defaultOptions`

这四个值覆盖的是「没有在单个 `useQuery` / `useMutation` 里声明时」的行为：


| option                         | 本文取值     | 浏览器默认  | 替换后标签页会怎样                                                    |
| ------------------------------ | -------- | ------ | ------------------------------------------------------------ |
| `queries.staleTime`            | `30_000` | `0`    | 改小会更勤后台刷新；改 `Infinity` 则除非 `invalidateQueries`，否则不因时间变 stale |
| `queries.retry`                | `1`      | `3`    | `0` / `false` 失败立刻展示错误；`true` 无限重试                           |
| `queries.refetchOnWindowFocus` | `false`  | `true` | 改回 `true` 后，切回浏览器窗口会刷新已 stale 的列表                            |
| `mutations.retry`              | `0`      | `0`    | 显式写出是为了防止以后改成 `1`，创建标签可能被重复提交                                |


单个查询可以覆盖项目默认值，例如某次预取把 `staleTime` 改成 `60_000`。不要为每个页面
再 `new QueryClient()`。

本步未用：`queryCache` / `mutationCache`（要做全局 `onError` 打点时才需要）。

### 2.3 在 AppProviders 中接入

修改 `src/app/providers/AppProviders.tsx`。当前壳已经有 `AntdApp`，插入 Query 时必须保留，
否则登录成功 / 退出成功的 `message` 会丢掉上下文：

```tsx
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { App as AntdApp, ConfigProvider } from 'antd'
import zhCN from 'antd/es/locale/zh_CN'
import type { ReactNode } from 'react'
import { queryClient } from '@/shared/query/query-client'

type AppProvidersProps = {
  children: ReactNode
}

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <ConfigProvider locale={zhCN}>
      <QueryClientProvider client={queryClient}>
        <AntdApp>{children}</AntdApp>
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </ConfigProvider>
  )
}
```

修改 `src/main.tsx`，不要在这里再创建第二个 Provider 或 QueryClient：

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router'
import '@/shared/config/env'
import { AppProviders } from '@/app/providers/AppProviders'
import router from '@/app/router'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>
  </StrictMode>,
)
```

`QueryClient` 必须在组件树外创建。若在组件函数中 `new QueryClient()`，重新渲染时可能
产生新缓存，页面之间也无法稳定共享数据。

#### API 细节：`QueryClientProvider` 与 Devtools

- `QueryClientProvider` 的 `client` 必须指向模块单例 `queryClient`。组件通过
`useQueryClient()` 拿到的就是这一份。
- `ReactQueryDevtools` 的 `initialIsOpen` 默认 `false`。本文写成显式 `false`，开发时
面板收起，不挡标签页。改成 `true` 只会让面板默认展开，不影响缓存。
- 生产环境下组件不渲染面板。本项目直接挂在 `AppProviders`，不要为此再拆一套条件编译。

本步未用：`buttonPosition`、`position`（只改浮动按钮位置，与学习无关）。

---



## 3. 对齐真实标签接口

后端标签列表响应不是 `Tag[]`，而是统一响应解包后的分页对象：

```json
{
  "list": [],
  "total": 0,
  "page": 1,
  "pageSize": 20
}
```

新建 `src/features/tag/api.ts`：

```ts
import { del, get, post, put } from '@/shared/api'

export type TagStatus = 0 | 1

export type Tag = {
  id: number
  name: string
  sortOrder: number
  status: TagStatus
  createdAt: string
  updatedAt: string
}

export type PageData<T> = {
  list: T[]
  total: number
  page: number
  pageSize: number
}

export type TagListQuery = {
  keyword: string
  status: '' | TagStatus
  page: number
  pageSize: number
}

export type TagWriteInput = {
  name: string
  sortOrder: number
  status: TagStatus
}

function toTagListParams(query: TagListQuery) {
  return {
    keyword: query.keyword.trim() || undefined,
    status: query.status === '' ? undefined : query.status,
    page: query.page,
    pageSize: query.pageSize,
  }
}

export function listTags(
  query: TagListQuery,
  signal?: AbortSignal,
): Promise<PageData<Tag>> {
  return get<PageData<Tag>>('/tags', {
    params: toTagListParams(query),
    signal,
  })
}

export function createTag(input: TagWriteInput): Promise<Tag> {
  return post<Tag>('/tags', input)
}

export function updateTag(options: {
  id: number
  input: TagWriteInput
}): Promise<Tag> {
  return put<Tag>(`/tags/${options.id}`, options.input)
}

export function deleteTag(id: number): Promise<{ id: number }> {
  return del<{ id: number }>(`/tags/${id}`)
}
```

需要注意：

- 后端分页对象的数组字段叫 `list`，不是 `items`（这是响应体；下一节的 queryKey 不跟这个字段走）；
- 列表接口支持 `keyword`、`status`、`page`、`pageSize`；
- 标签没有详情 GET 接口；
- `AbortSignal` 继续传给 HTTP 层，组件不需要手写取消标记。

---



## 4. 定义查询：从页面里的 `useQuery` 收到 `queries.ts`

上一节有了 `listTags`。这一节只解决一件事：告诉 Query「这份列表是谁、怎么取」。
先写在页面里看懂，再抽到 `src/features/tag/queries.ts`。中间几段是学习切片，
不是最终文件；完整文件在 §4.5。

### 4.1 最小订阅：`queryKey` + `queryFn`

`useQuery` 先认两个字段：

- `queryKey`：缓存地址，决定「这是哪一份数据」；
- `queryFn`：怎么拿到它。必须返回 Promise，失败 **throw**（HTTP 层已经在 `code !== 0` 时抛 `ApiError`）。不要 `catch` 后 `return []`，也不要 resolve `undefined`。

`query` 是页面上的筛选 state。它既传给 `listTags`，也必须出现在 key 里：

```tsx
const [query, setQuery] = useState<TagListQuery>({
  keyword: '',
  status: '',
  page: 1,
  pageSize: 20,
})

const tagsQuery = useQuery({
  queryKey: ['tags', query],
  queryFn: ({ signal }) => listTags(query, signal),
})
```

`signal` 是 Query 传入的取消信号，继续交给 `get('/tags', { signal })`。
改 `keyword` 或 `page` 时 `query` 变了 → key 变了 → Query 当成另一份数据去请求。

如果写成 `queryKey: ['tags']`，`queryFn` 仍会读到新的 `query`，但地址不变，换页会串缓存。

对象属性顺序不同会被稳定哈希为同一个 key；数组元素顺序不同则不是同一个 key。
不要把函数、DOM 节点放进 key。

### 4.2 失效需要稳定前缀

创建成功后，第 1 页、第 2 页、带 keyword 的列表都过期。
`invalidateQueries` 按 **前缀** 匹配：传入 `['tags', 'list']`，会打中所有以这段开头的 key。

所以地址再拆一层：

```text
['tags', 'list', query]   当前这一页，给 useQuery
['tags', 'list']          所有列表页，给 invalidateQueries
```

中间的 `'list'` 是分类名，表示「列表这类查询」，**不是**后端 JSON 里那个数组字段。
后端若改成 `items`，只改 `PageData` 类型，key 仍写 `'list'`。

这一步把订阅改成：

```ts
queryKey: ['tags', 'list', query]
```

失效写成：

```ts
queryClient.invalidateQueries({ queryKey: ['tags', 'list'] })
```

还不要抽工厂。先记住：订阅用带 `query` 的完整地址，失效用去掉 `query` 的前缀。

### 4.3 把地址收到一处：`tagKeys`

页面里到处手写 `['tags', 'list']` 会拼错。收到同一个对象里，用函数从上一层展开，前缀只写一次。

先只要两层：

```ts
export const tagKeys = {
  lists: () => ['tags', 'list'] as const,
  list: (query: TagListQuery) => [...tagKeys.lists(), query] as const,
}
```

- `tagKeys.list(query)`：订阅当前这一页；
- `tagKeys.lists()`：失效所有列表页；
- `as const`：让 TypeScript 留下只读元组，否则会变成 `string[]`。

根上再加 `all: ['tags']`，让 `lists` 从它展开。现在没有详情查询，写操作仍然只打 `lists()`。
加这一层是为了以后若出现 `['tags', 'detail', id]`，失效列表时不会误伤详情。

```ts
export const tagKeys = {
  all: ['tags'] as const,
  lists: () => [...tagKeys.all, 'list'] as const,
  list: (query: TagListQuery) => [...tagKeys.lists(), query] as const,
}
```

到这里，`tagKeys` 仍然只是 **地址**，还没有绑定 `listTags`。

### 4.4 把取数绑到地址上：`tagQueries`

页面若自己写 `queryFn`，可能把 `tagKeys.list(query)` 配到别的 GET。
`queryOptions` 把地址和取数函数绑成一份，专门给 `useQuery` 用。

这一份 **只放读**。创建 / 更新 / 删除走后面的 `useMutation`，不要在这里加 `update`。

```ts
export const tagQueries = {
  list: (query: TagListQuery) =>
    queryOptions({
      queryKey: tagKeys.list(query),
      queryFn: ({ signal }) => listTags(query, signal),
    }),
}
```

页面变成：

```tsx
const tagsQuery = useQuery(tagQueries.list(query))
```

以后真有详情 GET，才往 `tagKeys` 加 `detail(id)`，并在 `tagQueries` 再绑一个 `queryOptions`。

### 4.5 最终文件

新建 `src/features/tag/queries.ts`：

```ts
import { queryOptions } from '@tanstack/react-query'
import { listTags, type TagListQuery } from './api'

export const tagKeys = {
  all: ['tags'] as const,
  lists: () => [...tagKeys.all, 'list'] as const,
  list: (query: TagListQuery) => [...tagKeys.lists(), query] as const,
}

export const tagQueries = {
  list: (query: TagListQuery) =>
    queryOptions({
      queryKey: tagKeys.list(query),
      queryFn: ({ signal }) => listTags(query, signal),
    }),
}
```

写成功后失效所有列表（§7 会再用到）：

```ts
queryClient.invalidateQueries({ queryKey: tagKeys.lists() })
```

`queryFn` 的 context 里本示例只用 `signal`。`queryKey` / `meta` / `client` 留给默认 queryFn 或调试，这里不用。

---



## 5. 实现列表查询、筛选和分页

上一节已经能 `useQuery(tagQueries.list(query))`。这一节把它接到 TagPage：先认返回值怎么读，
再处理翻页不闪白，最后才给完整文件。更新 / 删除的 `useMutation` 会出现在完整文件里，
原理放到 §6、§7，这里先照抄接线。

### 5.1 接上查询

筛选写在组件 `useState` 里。`query` 变了，key 就变了，Query 会去取新的一页。
不要 `refetch(newParams)` 传参。

```tsx
const [query, setQuery] = useState<TagListQuery>({
  keyword: '',
  status: '',
  page: 1,
  pageSize: 20,
})

const tagsQuery = useQuery(tagQueries.list(query))
```

`tagsQuery.data` 的类型是 `PageData<Tag>`。直接渲染 `data.list`，不要再 `useEffect` 抄进另一份数组。
翻页占位下一小节再加，这一步先把列表读出来。

### 5.2 二维状态机：`status` × `fetchStatus`

v5 把查询拆成两根轴，不要只记三个 boolean：

```text
status      = 有没有一份成功结果     pending | error | success
fetchStatus = queryFn 现在在干什么   fetching | paused | idle
```

标签页上先认这四种（还没有翻页占位）：

```text
首次进入，还没有数据
  status=pending   fetchStatus=fetching   → 整页「加载中」

首次请求就失败
  status=error     data=undefined
  isLoadingError=true  → 整页错误

第 1 页已成功，30 秒后后台刷新
  status=success   fetchStatus=fetching   → 继续显示 data，可加细条提示

后台刷新失败
  status=error     data 仍是上一份成功结果
  isRefetchError=true  → 提示刷新失败，不要把表格清掉
```

派生 boolean 都从这两根轴算出来：


| 字段               | 定义                           | 这一步怎么用                       |
| ---------------- | ---------------------------- | ---------------------------- |
| `isPending`      | `status === 'pending'`       | 还没有成功数据，整页骨架                 |
| `isSuccess`      | `status === 'success'`       | 已有真实成功结果                     |
| `isError`        | `status === 'error'`         | 最近一次请求失败；后台刷新失败时 `data` 可能仍在 |
| `isFetching`     | `fetchStatus === 'fetching'` | 「数据同步中...」细条，包括后台刷新          |
| `isLoading`      | `isPending && isFetching`    | 首次在飞。不要用它当整页骨架的唯一条件          |
| `isRefetching`   | `isFetching && !isPending`   | 已有成功数据时的后台刷新                 |
| `isLoadingError` | 第一次请求就失败                     | 整页错误。此时没有可展示的 `data`         |
| `isRefetchError` | 刷新失败                         | 提示失败，继续显示旧 `data`            |
| `isPaused`       | `fetchStatus === 'paused'`   | 离线暂停；本 Demo 不处理              |
| `isStale`        | 已过 `staleTime` 或被失效          | 一般不用来渲染                      |


页面该读的数据字段：

- `data`：最后一次成功结果；首次无缓存时是 `undefined`
- `error`：失败时的 `ApiError`；成功时为 `null`
- `refetch()`：手动重取当前 key。筛选和分页不要靠它传参，改 `query` state 即可

这一步的骨架可以先写成 `if (tagsQuery.isPending)`。翻页加上占位之后，这个判断要改，见下一小节。
不要用 `isFetching` 控制首次骨架，否则后台刷新也会把整页换成加载中。
不要只判断 `isError` 就清空页面，后台刷新失败时表格还在。

### 5.3 keepPreviousData 做了什么

分页参数改变后会产生新 key。没有占位时，新 key 一开始没有 `data`，页面会闪成空白。

加上 `placeholderData: keepPreviousData`，暂时把上一组成功数据借给新 key 显示：

```tsx
const tagsQuery = useQuery({
  ...tagQueries.list(query),
  placeholderData: keepPreviousData,
})
```

- 页面不会切换成空白；
- `isPlaceholderData` 为 `true`；
- **v5 里该查询仍是** `pending`**，不是** `success`；
- 占位数据不会作为新 key 的真实成功结果持久写入缓存；
- 新结果到达后自动替换，`status` 才变为 `success`。

因此翻页之后，整页骨架必须把占位排除掉：

```tsx
if (tagsQuery.isPending && !tagsQuery.isPlaceholderData) {
  return <p>标签列表加载中...</p>
}
```

只写 `if (tagsQuery.isPending)` 会把上一页表格盖掉，占位等于白做。
「下一页」按钮在 `isPlaceholderData` 时禁用，避免连跳两页。

实际关键词搜索可进一步采用“输入值”和“已提交查询值”分离，或做 debounce，
避免每次按键都创建新查询。它属于交互策略，不应通过 `refetch(newParams)` 传参。

### 5.4 完整页面

将 `src/features/tag/pages/TagPage.tsx` 修改为：

```tsx
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { useState } from 'react'
import {
  deleteTag,
  updateTag,
  type Tag,
  type TagListQuery,
} from '../api'
import { CreateTagForm } from '../components/CreateTagForm'
import { tagKeys, tagQueries } from '../queries'

const initialQuery: TagListQuery = {
  keyword: '',
  status: '',
  page: 1,
  pageSize: 20,
}

export function Component() {
  const queryClient = useQueryClient()
  const [query, setQuery] = useState<TagListQuery>(initialQuery)

  const tagsQuery = useQuery({
    ...tagQueries.list(query),
    placeholderData: keepPreviousData,
  })

  const updateMutation = useMutation({
    mutationFn: updateTag,
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: tagKeys.lists(),
      })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteTag,
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: tagKeys.lists(),
      })
    },
  })

  const toggleStatus = (tag: Tag) => {
    updateMutation.mutate({
      id: tag.id,
      input: {
        name: tag.name,
        sortOrder: tag.sortOrder,
        status: tag.status === 1 ? 0 : 1,
      },
    })
  }

  if (tagsQuery.isPending && !tagsQuery.isPlaceholderData) {
    return <p>标签列表加载中...</p>
  }

  if (tagsQuery.isLoadingError) {
    return <p role="alert">{tagsQuery.error.message}</p>
  }

  const pageData = tagsQuery.data
  const hasNextPage =
    query.page * query.pageSize < pageData.total

  return (
    <main>
      <h1>标签管理</h1>

      <CreateTagForm />

      <section aria-label="标签筛选">
        <input
          aria-label="标签名称"
          value={query.keyword}
          onChange={(event) => {
            setQuery((current) => ({
              ...current,
              keyword: event.target.value,
              page: 1,
            }))
          }}
        />

        <select
          aria-label="标签状态"
          value={query.status}
          onChange={(event) => {
            const value = event.target.value
            setQuery((current) => ({
              ...current,
              status: value === '' ? '' : Number(value) as 0 | 1,
              page: 1,
            }))
          }}
        >
          <option value="">全部状态</option>
          <option value="1">启用</option>
          <option value="0">禁用</option>
        </select>
      </section>

      {tagsQuery.isFetching && <p>数据同步中...</p>}
      {tagsQuery.isRefetchError && (
        <p role="alert">刷新失败，当前显示上一次成功数据</p>
      )}

      {pageData.list.length === 0 ? (
        <p>暂无标签</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>名称</th>
              <th>排序</th>
              <th>状态</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {pageData.list.map((tag) => (
              <tr key={tag.id}>
                <td>{tag.name}</td>
                <td>{tag.sortOrder}</td>
                <td>{tag.status === 1 ? '启用' : '禁用'}</td>
                <td>
                  <button
                    type="button"
                    disabled={updateMutation.isPending}
                    onClick={() => toggleStatus(tag)}
                  >
                    {tag.status === 1 ? '禁用' : '启用'}
                  </button>
                  <button
                    type="button"
                    disabled={
                      tag.status === 1 ||
                      deleteMutation.isPending
                    }
                    onClick={() => deleteMutation.mutate(tag.id)}
                  >
                    删除
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <nav aria-label="标签分页">
        <button
          type="button"
          disabled={query.page === 1}
          onClick={() => {
            setQuery((current) => ({
              ...current,
              page: current.page - 1,
            }))
          }}
        >
          上一页
        </button>
        <span>第 {query.page} 页</span>
        <button
          type="button"
          disabled={
            !hasNextPage || tagsQuery.isPlaceholderData
          }
          onClick={() => {
            setQuery((current) => ({
              ...current,
              page: current.page + 1,
            }))
          }}
        >
          下一页
        </button>
      </nav>

      {(updateMutation.isError || deleteMutation.isError) && (
        <p role="alert">
          {updateMutation.error?.message ??
            deleteMutation.error?.message}
        </p>
      )}
    </main>
  )
}
```

本节故意使用原生表单控件突出 Query 数据流。正式页面可以替换为 Ant Design，
但 Query 的 key、状态和失效逻辑不需要改变。

页面里的 `useMutation` 下一节用创建表单再展开。这里只要看到：写成功后
`invalidateQueries({ queryKey: tagKeys.lists() })`。

### 5.5 API 细节：`useQuery` 本步用到的 options

```tsx
const tagsQuery = useQuery({
  ...tagQueries.list(query),   // 带入 queryKey + queryFn
  placeholderData: keepPreviousData,
})
```


| option            | 本示例                                       | 替换后                                |
| ----------------- | ----------------------------------------- | ---------------------------------- |
| `queryKey`        | `tagKeys.list(query)`                     | 少任一筛选字段，就会串缓存                      |
| `queryFn`         | `({ signal }) => listTags(query, signal)` | 必须 throw，不能返回 `undefined`          |
| `placeholderData` | `keepPreviousData`                        | 去掉后翻页会先闪空白；改成固定对象只适合骨架形状，不适合当上一页数据 |


`keepPreviousData` 是官方提供的函数形式 `placeholderData`：把「上一个 observer 的 data」
临时借给新 key。它不是把第 1 页写入第 2 页的缓存。

本步未用、后台常见、后文展开：

- `enabled` / `skipToken`：条件查询，见 §9.1
- `select`：只把 `data` 投影给组件，不改缓存里的分页对象
- `throwOnError`：把错误丢给最近的 Error Boundary；本页自己渲染 `error.message`
- `refetchOnMount`：见 §8.3

---



## 6. 用 zod + RHF 创建标签

写操作仍遵守项目表单契约。新建
`src/features/tag/components/CreateTagForm.tsx`：

```tsx
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { createTag, type TagWriteInput } from '../api'
import { tagKeys } from '../queries'

const tagSchema = z.object({
  name: z.string().trim().min(1, '请输入标签名称').max(80),
  sortOrder: z.number().int(),
  status: z.union([z.literal(0), z.literal(1)]),
})

export function CreateTagForm() {
  const queryClient = useQueryClient()
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<TagWriteInput>({
    resolver: zodResolver(tagSchema),
    defaultValues: {
      name: '',
      sortOrder: 0,
      status: 1,
    },
  })

  const createMutation = useMutation({
    mutationFn: createTag,
    onSuccess: async () => {
      reset()
      await queryClient.invalidateQueries({
        queryKey: tagKeys.lists(),
      })
    },
  })

  return (
    <form
      onSubmit={handleSubmit((input) => {
        createMutation.mutate(input)
      })}
    >
      <label>
        标签名称
        <input {...register('name')} />
      </label>
      {errors.name && (
        <p role="alert">{errors.name.message}</p>
      )}

      <label>
        排序权重
        <input
          type="number"
          {...register('sortOrder', { valueAsNumber: true })}
        />
      </label>

      <label>
        状态
        <select
          {...register('status', { valueAsNumber: true })}
        >
          <option value="1">启用</option>
          <option value="0">禁用</option>
        </select>
      </label>

      <button
        type="submit"
        disabled={createMutation.isPending}
      >
        {createMutation.isPending ? '创建中...' : '创建标签'}
      </button>

      {createMutation.isError && (
        <p role="alert">{createMutation.error.message}</p>
      )}
    </form>
  )
}
```

`mutate` 适合事件回调，不返回业务 Promise。需要在上层 `try/catch` 或串行流程中等待时，
才使用 `mutateAsync`：

```ts
const createdTag = await createMutation.mutateAsync(input)
console.info(createdTag.id)
```

不要写成 `await createMutation.mutate(input)`。

### 6.1 API 细节：`useMutation`

创建表单用到的是「声明 mutation + 在 submit 里触发」：

```ts
const createMutation = useMutation({
  mutationFn: createTag,
  onSuccess: async () => {
    reset()
    await queryClient.invalidateQueries({ queryKey: tagKeys.lists() })
  },
})

createMutation.mutate(input)
```

**关键参数**


| option       | 本示例         | 说明                                                                  |
| ------------ | ----------- | ------------------------------------------------------------------- |
| `mutationFn` | `createTag` | 必填。接收 `mutate(variables)` 传入的变量，必须 throw 失败                         |
| `onSuccess`  | 重置表单 + 失效列表 | 签名：`(data, variables, onMutateResult, context)`。返回 Promise 会被 await |
| `retry`      | 走项目默认 `0`   | 不要给创建/删除开重试                                                         |


hook 级 `onSuccess` 每次成功都跑。`mutate(vars, { onSuccess })` 只绑这一次调用；
并发多次时，**只有最后一次** 的 per-call 回调会触发。页面级同步缓存放 hook 回调，
一次性 toast 可以放 per-call。

**返回值（标签页该读的）**


| 字段                  | 用途                                         |
| ------------------- | ------------------------------------------ |
| `mutate`            | 事件回调里触发，返回 `void`                          |
| `mutateAsync`       | 需要 `await` 创建结果时用，失败会 reject               |
| `isPending`         | 禁用提交按钮、显示「创建中...」                          |
| `isError` / `error` | 表单下方展示 `ApiError.message`                  |
| `reset`             | 清掉这次 mutation 的 `data` / `error`，回到 `idle` |
| `data`              | 最近一次成功返回的 `Tag`；本表单没用，因为成功后立刻失效列表          |
| `variables`         | 最近一次传入的 `TagWriteInput`；失败回填时偶用            |
| `status`            | `idle` → `pending` → `success` / `error`   |


Mutation 没有 `queryKey`，成功后不会自动更新列表。下一步靠 `invalidateQueries`。

**本步未用**

- `onMutate`：乐观更新前改缓存、返回回滚快照
- `onError` / `onSettled`：失败回滚或无论成败都收尾；本页把错误留在 `isError` 里渲染
- `mutationKey`：给 `setMutationDefaults` 或按 key 过滤 mutation
- `scope: { id }`：同一 id 的 mutation 串行排队；标签创建默认并行即可

---



## 7. Mutation 成功后如何同步缓存

创建标签后，服务端列表已经改变，但旧列表缓存仍然存在。推荐流程：

```text
mutation 成功
  → invalidateQueries(tagKeys.lists())
  → 匹配查询变为 stale
  → 当前活跃列表重新请求
  → 页面得到服务端权威排序和分页结果
```



### 7.1 失效范围

```ts
// 所有标签查询
queryClient.invalidateQueries({
  queryKey: tagKeys.all,
})

// 所有标签列表
queryClient.invalidateQueries({
  queryKey: tagKeys.lists(),
})

// 当前筛选和分页
queryClient.invalidateQueries({
  queryKey: tagKeys.list(query),
  exact: true,
})
```

`invalidateQueries` 默认按前缀匹配，并立即重取匹配的活跃查询。
范围太宽会产生多余请求，范围太窄则可能留下旧数据。

#### API 细节：filters 与 `refetchType`

`invalidateQueries` 做两件事：先把匹配到的查询标成 stale（覆盖 `staleTime`），再按
`refetchType` 决定要不要立刻重取。


| filter        | 本示例                                    | 作用                                                                   |
| ------------- | -------------------------------------- | -------------------------------------------------------------------- |
| `queryKey`    | `tagKeys.lists()` → `['tags', 'list']` | 默认前缀匹配。第 1 页、第 2 页、带 keyword 的列表都会命中                                 |
| `exact`       | 当前筛选那次写成 `true`                        | 只打这一组完整 key，其它分页不受影响                                                 |
| `refetchType` | 未写，默认 `'active'`                       | `'active'` 只重取屏幕上的查询；`'none'` 只标 stale 不发请求；`'all'` 连 inactive 也立刻重取 |
| `type`        | 未写，默认 `'all'`                          | 决定**哪些查询被标 stale**。和 `refetchType` 不是一回事                             |
| `predicate`   | 未用                                     | `(query) => boolean`，前缀表达不了时再手写                                      |


标签 CRUD 推荐 `tagKeys.lists()` + 默认 `refetchType: 'active'`：当前页立刻刷新，
用户没打开的其它分页只标 stale，下次进入再取。

```ts
// 只标 stale，当前页也不立刻重取（少见）
await queryClient.invalidateQueries({
  queryKey: tagKeys.lists(),
  refetchType: 'none',
})
```

`useQueryClient()` 返回当前 Provider 里的那份 client。页面和表单组件里用 hook；
拦截器等非 React 模块才直接 import 模块单例。不要两套混用。

### 7.2 await 还是 void

Mutation 回调返回 Promise 时，Mutation 会等待它结束：

```ts
onSuccess: async () => {
  await queryClient.invalidateQueries({
    queryKey: tagKeys.lists(),
  })
}
```

此时 `isPending` 会持续到活跃列表刷新完成。若页面不需要等待刷新，可明确忽略：

```ts
onSuccess: () => {
  void queryClient.invalidateQueries({
    queryKey: tagKeys.lists(),
  })
}
```



### 7.3 什么时候使用 setQueryData

接口返回完整新实体，且能够准确定位缓存时，可以直接更新：

```ts
queryClient.setQueryData(
  tagKeys.list(query),
  (oldPage: PageData<Tag> | undefined) =>
    oldPage
      ? {
          ...oldPage,
          list: oldPage.list.map((tag) =>
            tag.id === updatedTag.id ? updatedTag : tag,
          ),
        }
      : oldPage,
)
```

但标签列表受排序、筛选和分页影响。若无法确保所有缓存都同步正确，优先失效重取。
不要原地修改 `oldPage.list`。

### 7.4 不要默认使用乐观更新

乐观更新需要取消查询、保存快照、提前写缓存、失败回滚和结束后重新对齐。
标签禁用和删除还受服务端关联校验约束，因此等待服务端成功后再失效更可靠。

点赞、收藏、低风险开关等强即时反馈场景，再按需引入乐观更新。

---



## 8. 新鲜度、回收和默认刷新



### 8.1 staleTime

`staleTime` 表示成功数据在多久内仍被认为 fresh：

```text
fresh
  → 重新挂载时直接使用，不因 stale 触发后台请求

stale
  → 缓存仍可显示，但允许在挂载、聚焦、重连等时机后台刷新
```

stale 不等于缓存被删除，也不等于立即请求。
`invalidateQueries` 会立刻把匹配查询标成 stale，**覆盖** 这里的 `staleTime`（`'static'` 除外）。

特殊值：

- `Infinity`：不会因时间自动 stale，但仍可被 `invalidateQueries` 失效；
- `'static'`：即使手动失效也不触发重新获取，适合运行期间绝不会变化的数据。

标签属于可变业务数据，不应使用 `'static'`。

### 8.2 gcTime

查询没有任何 observer 后会变成 inactive，此时开始计算 `gcTime`。
浏览器端默认 `5 * 60 * 1000`（5 分钟）后清理该缓存；设为 `Infinity` 则禁用回收。

```text
staleTime：多久内不需要重新确认
gcTime：无人使用后，内存里最多保留多久
```

离开标签页再回来：只要还在 `gcTime` 内，缓存还在，组件可以立刻画出旧列表，再按
`staleTime` / `refetchOnMount` 决定要不要后台刷新。

### 8.3 窗口聚焦、挂载与网络重连

这三个 option 类型相同：`boolean | 'always' | ((query) => boolean | 'always')`。
浏览器默认都是 `true`（数据已 stale 才刷新）；`'always'` 会忽略 stale，每次都刷。


| option                 | 默认     | 本文      | 标签页含义                     |
| ---------------------- | ------ | ------- | ------------------------- |
| `refetchOnMount`       | `true` | 未改      | 重新进入标签页时，若列表已 stale 就后台刷新 |
| `refetchOnWindowFocus` | `true` | `false` | 切回浏览器窗口不自动刷。后台管理切来切去太频繁   |
| `refetchOnReconnect`   | `true` | 未改      | 网络从断线恢复后，stale 列表会刷新      |


本文全局关闭了 `refetchOnWindowFocus`，但保留挂载和重连策略。
如果后台业务要求切回页面立即确认最新数据，应删除该配置，而不是在组件中手写 effect。

`staleTime: 'static'` 时，即使 `refetchOnMount: 'always'` 也不会因这些时机重取。
标签是可变业务数据，不要用 `'static'`。

本步未用：`refetchInterval`（轮询）。后台列表用失效重取，不要对标签页做定时刷。

---



## 9. 条件查询、取消和 initialData

这些能力不是标签列表主线，但容易与基础状态混淆。

### 9.1 enabled 与 skipToken

`enabled: false` 会禁用自动请求。无缓存时，查询处于 `pending` + `idle`，
因此 `isPending` 为 true，而 `isLoading` 为 false（`isLoading = isPending && isFetching`）。

`skipToken` 是 TypeScript 友好的禁用方式。它不会让 Query“不存在”，而是让当前查询没有
可执行的 `queryFn`，整体行为接近 `enabled: false`。区别是使用 `skipToken` 时不能通过
当前 observer 的 `refetch()` 强制执行。缺 id 的详情查询常写成
`queryFn: id != null ? () => fetchById(id) : skipToken`，避免 TS 把 `queryFn` 推成
「可能返回 undefined」。

永久禁用 Query 会退出声明式数据流。通常应让依赖参数进入 state 和 `queryKey`，
在条件满足后自动执行。标签列表始终有 `page` / `pageSize`，本 Demo 不需要 `enabled`。

### 9.2 请求取消

TanStack Query 会把 `AbortSignal` 传给 `queryFn`。本文已经把它继续传入 HTTP 层：

```ts
queryFn: ({ signal }) => listTags(query, signal)
```

需要区分两个行为：

- HTTP 层不消费 signal：组件卸载后 Promise 默认仍可完成，结果可以写入缓存；
- HTTP 层把 signal 传给 `fetch` 或 Axios：查询失活或手动取消时，底层请求会中止，
Query 状态回退到请求前状态。

页面不需要再维护 `cancelled` 布尔值。

### 9.3 placeholderData 与 initialData

v5 里两者最大的差别是：**占位不算成功，初始数据算成功并写入缓存。**

`placeholderData`：

- 只供当前 observer 临时显示；
- 不作为真实结果持久写入对应 key 的缓存；
- 查询仍处于 `pending`，不是 `success`（v4 曾表现为 success，v5 改了）；
- 通过 `isPlaceholderData` 判断；
- 函数形式会收到 `(previousData, previousQuery)`；`keepPreviousData` 就是官方封装。

`initialData`：

- 只在对应 key 尚无缓存时初始化；
- 会作为真实服务端数据写入缓存，`status` 为 `success`；
- 默认视为已经 stale，除非同时设了 `staleTime`；
- 不应填入伪造或不完整对象；
- 可配合 `initialDataUpdatedAt` 告诉 Query 数据真实更新时间。

标签页没有 SSR 或可靠上游缓存，因此本 Demo 不需要 `initialData`。翻页用
`placeholderData: keepPreviousData`，首次骨架用 `isPending && !isPlaceholderData`。

---



## 10. 最小测试

本文只验证项目自己的 key 约定，不测试 TanStack Query 内部实现。

尚未安装 Vitest 时，在 `Admin-React/` 执行：

```bash
pnpm add -D vitest
```

新建 `src/features/tag/queries.test.ts`：

```ts
import { describe, expect, it } from 'vitest'
import { tagKeys } from './queries'

describe('tagKeys', () => {
  it('列表 key 包含全部筛选和分页参数', () => {
    const query = {
      keyword: '春天',
      status: 1 as const,
      page: 2,
      pageSize: 20,
    }

    expect(tagKeys.list(query)).toEqual([
      'tags',
      'list',
      query,
    ])
  })
})
```

执行：

```bash
pnpm exec vitest run src/features/tag/queries.test.ts
```

组件行为测试应继续覆盖：

- 首次加载、空列表和请求失败；
- 后台刷新时保留旧数据；
- 创建成功后失效 `tagKeys.lists()`；
- 删除失败时展示服务端错误；
- 用户可观察到的最终行为。

完整的 jsdom 和 Testing Library 配置见
`[06-learn-vitest.md](./06-learn-vitest.md)`。Vitest 测试无需为了 Jest 的退出提示设置
`gcTime: Infinity`；只需要关闭查询重试，避免错误用例等待重试超时。

---



## 11. 验证与排错



### 11.1 验证命令

在 `Admin-React/` 执行：

```bash
pnpm verify
pnpm exec vitest run src/features/tag/queries.test.ts
pnpm dev
```

正常情况下：

- lint 和 TypeScript 检查通过；
- key factory 测试通过；
- 打开 `http://localhost:5174/tags` 能看到真实标签数据；
- React Query Devtools 能看到 `['tags', 'list', ...]`；
- 创建、切换状态、删除后列表自动同步。



### 11.2 常见错误



#### 请求返回 HTML，解析 JSON 失败

原因：错误使用了 `/api/tags`，没有命中 Vite 的 `/admin/api` 代理。

排查：确认 `VITE_API_BASE=/admin/api/v1`，feature API 只传相对路径 `/tags`。

#### 接口成功但 pageData.list 是 undefined

原因：把后端分页结构写成了 `{ items, total }`，或 HTTP 层没有解包统一响应的 `data`。

排查：确认最终业务结果是 `{ list, total, page, pageSize }`。

#### 修改筛选后仍显示旧请求结果

原因：`queryFn` 使用了新参数，但 `queryKey` 没包含这些参数。

排查：检查 `keyword`、`status`、`page`、`pageSize` 是否全部进入 key。

#### 页面一直显示首次加载

原因：禁用查询时只判断了 `isPending`。

排查：条件查询需要区分 `isPending` 和 `isLoading`，并确认 `enabled` 条件是否会变为 true。

#### 翻页时整页又变成「加载中」

原因：用了 `keepPreviousData`，却写 `if (isPending) return 骨架`。v5 占位期间 `status`
仍是 `pending`。

排查：改成 `isPending && !isPlaceholderData`。

#### 写成功后列表不更新

原因：失效 key 与列表 key 前缀不一致，或永久禁用了该查询。

排查：统一使用 `tagKeys.lists()`，不要在页面手写魔法数组。

#### 开发环境看到两次调用

先确认是否确实产生两次网络请求。React StrictMode 会帮助暴露不安全副作用，
但 TanStack Query 会按 key 协调并复用进行中的 Promise。不要因此删除 StrictMode，
也不要改回 `useEffect` 拉取。

---



## 12. 快速上手总结



### 12.1 必须掌握的 API

- `new QueryClient({ defaultOptions })`：全应用一份缓存。本文覆盖 `staleTime: 30_000`、
`retry: 1`、`refetchOnWindowFocus: false`、`mutations.retry: 0`。
- `QueryClientProvider client={queryClient}`：注入模块单例；不要在 render 里 `new`。
- `queryOptions({ queryKey, queryFn })`：把缓存地址和请求函数绑在一起，页面只订阅。
- `useQuery(options)`：订阅读取。本页 spread `tagQueries.list(query)`，再盖
`placeholderData: keepPreviousData`。
- `queryFn({ signal })`：必须 throw，禁止返回 `undefined` 或 `catch` 后返回 `[]`。
- `useMutation({ mutationFn, onSuccess })`：写操作。事件里用 `mutate`，要 `await` 用
`mutateAsync`。
- `useQueryClient()`：拿到当前 Provider 的 client，供 `invalidateQueries` 使用。
- `invalidateQueries({ queryKey })`：前缀匹配标 stale，默认 `refetchType: 'active'`。
- `status` × `fetchStatus`：先认两根轴，再记派生 boolean。
- `isPending && !isPlaceholderData`：首次整页骨架。
- `isFetching`：当前正在请求（含后台刷新），只做细条提示。
- `isLoadingError` / `isRefetchError`：首次失败清页 vs 刷新失败留旧数据。
- `staleTime`：多久内 fresh。`Infinity` 仍可被 invalidate；`'static'` 连失效也不重取。
- `gcTime`：inactive 后内存最多保留多久，浏览器默认 5 分钟。
- `placeholderData` / `keepPreviousData`：v5 仍是 `pending`，不写入新 key 的缓存。



### 12.2 按需了解的 API

- `setQueryData`：能准确定位某一页缓存时直接补丁。标签有排序/筛选/分页，本 Demo 不用。
- `prefetchQuery`：用户马上要看的已有接口。标签没有详情 GET，不预取。
- `select`：只投影给组件，不改 cache。列表页要整页 `PageData`，未拆。
- `skipToken` / `enabled: false`：缺 id 才禁用。标签列表始终可查。
- `useQueries`：动态数量的并行查询。本页只有一个列表。
- `useInfiniteQuery`：游标 / 加载更多。后台页码分页继续用 `useQuery`。
- 乐观更新（`onMutate` + 回滚）：点赞等强即时反馈才需要；标签禁用/删除有服务端约束。

官方还有 `useSuspenseQuery`、`persistQueryClient`、默认 `queryFn`、`notifyOnChangeProps`
等，本教程不覆盖。需要时查
[v5 useQuery](https://tanstack.com/query/v5/docs/framework/react/reference/useQuery)。

### 12.3 常见反模式

- 在 `useEffect` 中请求列表；
- 把 Query data 复制进 Zustand 或第二份组件 state；
- `queryKey` 缺少筛选和分页参数；
- 页面散落 `['tags']` 魔法数组；
- `queryFn` 捕获错误后返回空数组，或 resolve `undefined`；
- 用 `isFetching` 或裸 `isPending` 控制首次整页骨架；
- Mutation 成功后手工维护所有分页；
- 为简单 CRUD 预先加入乐观更新；
- 在应用中创建多个 QueryClient，或在组件函数里 `new QueryClient()`；
- 为不存在的后端接口设计 detail key 和预取；
- 整段覆盖 `AppProviders` 时丢掉 `AntdApp`。



### 12.4 最小记忆

```text
useQuery 读，useMutation 写
queryKey 决定缓存身份，queryFn 决定如何获取（必须 throw）
status × fetchStatus 是两根轴
isPending && !isPlaceholderData 管首次骨架
isFetching 管当前请求（含后台刷新）
写成功后优先 invalidateQueries(tagKeys.lists())
服务端数据归 Query，客户端全局状态归 Zustand，局部交互归 useState
```

