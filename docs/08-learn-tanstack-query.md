# TanStack Query：从标签列表到写后同步

> 本文基于项目实际安装的 `@tanstack/react-query 5.101.4`，对应
> [`03-开发计划.md`](./03-开发计划.md) 的 Step 5～6。
> 主线只有一条：接入 QueryClient，并用真实标签接口完成列表查询、筛选分页、创建、
> 状态切换、删除和写后同步。

官方入口：

- [TanStack Query](https://tanstack.com/query/latest)
- [React Query 文档](https://tanstack.com/query/latest/docs/framework/react/overview)

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

### 2.3 在 AppProviders 中接入

修改 `src/app/providers/AppProviders.tsx`：

```tsx
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { ConfigProvider } from 'antd'
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
        {children}
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

- 后端字段是 `list`，不是 `items`；
- 列表接口支持 `keyword`、`status`、`page`、`pageSize`；
- 标签没有详情 GET 接口，不要凭空创建 `tagKeys.detail(id)` 或详情预取；
- `AbortSignal` 继续传给 HTTP 层，组件不需要手写取消标记。

---

## 4. 用 key factory 和 queryOptions 定义查询

页面中散落 `['tags']`、`['tag-list']` 等魔法数组，失效时容易匹配错误。
新建 `src/features/tag/queries.ts`：

```ts
import { queryOptions } from '@tanstack/react-query'
import { listTags, type TagListQuery } from './api'

export const tagKeys = {
  all: ['tags'] as const,
  lists: () => [...tagKeys.all, 'list'] as const,
  list: (query: TagListQuery) =>
    [...tagKeys.lists(), query] as const,
}

export const tagQueries = {
  list: (query: TagListQuery) =>
    queryOptions({
      queryKey: tagKeys.list(query),
      queryFn: ({ signal }) => listTags(query, signal),
    }),
}
```

使用时只需要：

```tsx
const tagsQuery = useQuery(tagQueries.list(query))
```

### 4.1 为什么参数必须进入 queryKey

下面每组参数代表不同的服务端结果，因此必须拥有独立缓存：

```text
['tags', 'list', { keyword: '', status: '', page: 1, pageSize: 20 }]
['tags', 'list', { keyword: '', status: '', page: 2, pageSize: 20 }]
['tags', 'list', { keyword: '春天', status: 1, page: 1, pageSize: 20 }]
```

记忆规则：

```text
queryFn 中读取、且会影响响应结果的变量，都应进入 queryKey。
```

对象属性顺序不同会被稳定哈希为同一个 key；数组元素顺序不同则不是同一个 key。
不要把函数、DOM 节点等不可稳定序列化的数据放入 key。

### 4.2 为什么同时使用 queryOptions

key factory 只统一缓存地址，`queryOptions` 进一步把 `queryKey` 和 `queryFn` 绑定起来：

- 页面不会把某个 key 配错到另一个请求函数；
- 预取和测试可以复用同一查询定义；
- TypeScript 能保留 key 与返回数据之间的类型关系；
- 页面只表达“订阅哪个查询”。

---

## 5. 实现列表查询、筛选和分页

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

  if (tagsQuery.isPending) {
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

### 5.1 三个容易混淆的状态

- `isPending`：当前没有成功数据，适合首次整页加载；
- `isFetching`：`queryFn` 正在执行，也包括已有数据时的后台刷新；
- `isLoading`：`isPending && isFetching`，适合禁用查询等特殊场景。

后台刷新失败时，`isRefetchError` 可以为 `true`，同时 `data` 仍保留上一次成功结果。
因此不要只判断 `isError` 就清空整个页面。

### 5.2 keepPreviousData 做了什么

分页参数改变后会产生新 key。`placeholderData: keepPreviousData` 暂时把上一组成功数据
作为新 key 的占位数据：

- 页面不会切换成空白；
- `isPlaceholderData` 为 `true`；
- 占位数据不会作为新 key 的真实成功结果持久写入缓存；
- 新结果到达后自动替换。

实际关键词搜索可进一步采用“输入值”和“已提交查询值”分离，或做 debounce，
避免每次按键都创建新查询。它属于交互策略，不应通过 `refetch(newParams)` 传参。

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

特殊值：

- `Infinity`：不会因时间自动 stale，但仍可被 `invalidateQueries` 失效；
- `'static'`：即使手动失效也不触发重新获取，适合运行期间绝不会变化的数据。

标签属于可变业务数据，不应使用 `'static'`。

### 8.2 gcTime

查询没有任何 observer 后会变成 inactive，此时开始计算 `gcTime`。
浏览器端默认 5 分钟后清理该缓存：

```text
staleTime：多久内不需要重新确认
gcTime：无人使用后，内存里最多保留多久
```

### 8.3 窗口聚焦与网络重连

默认情况下，stale 查询会在以下时机后台刷新：

- 新 observer 挂载；
- 窗口重新聚焦；
- 网络恢复连接。

本文全局关闭了 `refetchOnWindowFocus`，但保留挂载和重连策略。
如果后台业务要求切回页面立即确认最新数据，应删除该配置，而不是在组件中手写 effect。

---

## 9. 条件查询、取消和 initialData

这些能力不是标签列表主线，但容易与基础状态混淆。

### 9.1 enabled 与 skipToken

`enabled: false` 会禁用自动请求。无缓存时，查询处于 `pending` + `idle`，
因此 `isPending` 为 true，而 `isLoading` 为 false。

`skipToken` 是 TypeScript 友好的禁用方式。它不会让 Query“不存在”，而是让当前查询没有
可执行的 `queryFn`，整体行为接近 `enabled: false`。区别是使用 `skipToken` 时不能通过
当前 observer 的 `refetch()` 强制执行。

永久禁用 Query 会退出声明式数据流。通常应让依赖参数进入 state 和 `queryKey`，
在条件满足后自动执行。

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

`placeholderData`：

- 只供当前 observer 临时显示；
- 不作为真实结果持久写入对应缓存；
- 查询直接表现为 success；
- 可通过 `isPlaceholderData` 判断。

`initialData`：

- 只在对应 key 尚无缓存时初始化；
- 会作为真实服务端数据写入缓存；
- 不应填入伪造或不完整对象；
- 可配合 `initialDataUpdatedAt` 告诉 Query 数据真实更新时间。

标签页没有 SSR 或可靠上游缓存，因此本 Demo 不需要 `initialData`。

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
[`06-learn-vitest.md`](./06-learn-vitest.md)。Vitest 测试无需为了 Jest 的退出提示设置
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

- `useQuery(options)`：订阅读取请求及其缓存状态；
- `queryOptions(options)`：集中绑定 `queryKey` 和 `queryFn`；
- `useMutation(options)`：管理创建、更新、删除等写操作；
- `useQueryClient()`：取得当前 Provider 中的 QueryClient；
- `invalidateQueries(filters)`：标记匹配缓存 stale，并默认刷新活跃查询；
- `isPending`：当前没有成功数据；
- `isFetching`：当前正在执行请求，包括后台刷新；
- `staleTime`：数据保持 fresh 的时间；
- `gcTime`：查询 inactive 后的缓存保留时间。

### 12.2 按需了解的 API

- `setQueryData`：能准确维护目标缓存时直接更新；
- `prefetchQuery`：用户大概率马上访问某份已有接口数据时预取；
- `useQueries`：动态数量的并行查询；
- `useInfiniteQuery`：游标分页和加载更多；
- `skipToken`：类型安全地禁用查询；
- 乐观更新：对即时反馈要求高、且失败容易回滚时使用。

本 Demo 没有标签详情接口，因此不创建详情 key，也不展示详情预取。
普通后台页码分页继续使用 `useQuery`，不需要 `useInfiniteQuery`。

### 12.3 常见反模式

- 在 `useEffect` 中请求列表；
- 把 Query data 复制进 Zustand 或第二份组件 state；
- `queryKey` 缺少筛选和分页参数；
- 页面散落 `['tags']` 魔法数组；
- `queryFn` 捕获错误后返回空数组；
- 用 `isFetching` 控制首次整页骨架；
- Mutation 成功后手工维护所有分页；
- 为简单 CRUD 预先加入乐观更新；
- 在应用中创建多个 QueryClient；
- 为不存在的后端接口设计 detail key 和预取。

### 12.4 最小记忆

```text
useQuery 读，useMutation 写
queryKey 决定缓存身份，queryFn 决定如何获取
isPending 管首次无数据，isFetching 管当前请求
写成功后优先 invalidateQueries
服务端数据归 Query，客户端全局状态归 Zustand，局部交互归 useState
```

### 12.5 下一步实践

在当前标签页上继续完成两项小扩展：

1. 将关键词输入改为“输入值 + 点击查询后提交”，避免每次按键请求；
2. 使用 Testing Library 验证创建成功后列表出现新标签，而不是断言 Query 内部状态。

不要切换到新的文章 Demo，也不要提前抽象万能 `useCrud`。
