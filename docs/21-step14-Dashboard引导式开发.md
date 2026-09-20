# Step 14 引导式开发：Dashboard（五路并行 + 分块失败）

> 本文对应 [03-开发计划](./03-开发计划.md) 的 Step 14。  
> 它是一份任务引导，不提供可以整段复制的最终页面。请先自己完成每个检查点，卡住后再展开提示。  
> 质量要求以 [01-工程契约](./01-工程契约.md) 为准。

本步 **没有** 测试检查点。Vitest 仍延后到 Step 16。验收以「手动验证矩阵」+ `pnpm verify`（lint + type-check）为准。

Step 6 已经把「一条 `useQuery` + `QueryState` 四态」跑通。运营三页、操作日志已经把「无分页数组」跑通。本步 **不再重讲** `queryOptions` / `signal` / 四态 if/else。同样逻辑打开历史文件；本文只写增量：**固定 5 路 GET 并行、各块独立 error、overview 在渲染时派生卡片，刷新走 `invalidateQueries`。**

## 1. 本步目标

把 `features/dashboard` 的 Empty 占位收成一条自包含、只读 feature。看起来像「再做一个列表页」，真正要练的是：五块数据不要绑成一次 `Promise.all`。

```text
和 Tag / 运营页相同（不要再发明一套）
  每域 api.ts + queries.ts
  queryFn 接 { signal }，失败必须 throw
  服务端数据只活在 Query cache；写成功 / 刷新只靠 invalidateQueries

和 Tag / 运营页不同（整页复制会错）
  没有筛选、没有分页、没有 Dialog、没有 schemas.ts、没有 mutation
  不是 1 个列表，是 5 个 GET；其中 overview 还要派生两行卡片
  QueryState 按块用，禁止包住整页
  刷新按钮不是 loadAll()，是失效本域 all key

和 Vue Dashboard 不同（翻译会错）
  禁止 onMounted + Promise.all + 5 个 ref
  禁止任一失败就整页白屏 / 全局遮罩
  禁止把 todayMetrics 再 useState 一份
```

完成后必须满足：

- overview / hot-articles / hot-searches / hot-downloads / ad-events 五块数据正确。
- 首次进入能看到 loading；某一块失败时其余块仍能展示，不是整页白屏或全局遮罩。
- 无 `useEffect` 拉数；无图表库；`pnpm verify` 通过。

03 写「与 Vue 产品一致」：指卡片字段、四张表的列、数字格式、不上 echarts。**不是**把另一端的 `loadAll`、`Promise.all`、Element 图标名搬进来。

## 2. 本步边界

本步只做 `features/dashboard`。路由 `/dashboard` 已在 [`src/app/router/index.ts`](../src/app/router/index.ts) 挂好，不要改壳。

本步允许：

- 使用已有 `QueryState` / `PageHeader`。
- 使用已有 `StatsOverview` / `Article` / `HotSearch` / `HotDownload` / `AdEventsStat`（都在 `shared/types`）。
- 对照 [`home-block/api.ts`](../src/features/home-block/api.ts) 的无参 GET + `signal`。
- 对照 [`OfficialAccountPage.tsx`](../src/features/official-account/pages/OfficialAccountPage.tsx) 的四态 if/else（数组列表）。
- 检查点 6 **直接使用**本文给出的 CSS，不要自己发明色板。
- 检查点 7 做一次复制量体检；默认 **不抽** `useDashboard`。

本步禁止：

- `useEffect` 拉数，或 `const [overview, setOverview]` 这类第二份服务端 state。
- 一条 `queryFn` 里 `Promise.all` 五个接口（那是 Vue `loadAll` 换皮，error 仍然绑死）。
- 用一个 `QueryState` 包住整页；用全局 Loading / `Spin` 罩全屏。
- 装 echarts / recharts / `@ant-design/charts`。卡片 + Table 即可。
- 为只读页补 `schemas.ts` / RHF / `AppFormDialog`。
- 给统计发明 POST / PUT / DELETE。
- 用 `articleQueries.list` 冒充热门文章（排序、条数、是否过滤草稿都对不上）。
- `features/dashboard` import 其它 feature 的页面或内部组件。
- 在 axios 或 Query 全局回调里 `message`。
- 顺手写 `features/download` 真页面（Step 13 仍独立）。
- 安装测试依赖、改 `verify`。
- 修改只读对照项目 `Admin/`，以及 `miniApp/`。
- 预防性 `useMemo` / `useCallback` 包 `buildTodayMetrics`。
- 把统计放进 Zustand。

03 里「对照 `Admin/src/views/dashboard`」对本步过宽。业务规则已经写在后端 handler 和 `shared/types` 里。

## 3. 开始状态与文件范围

开始前应保持：

- Step 6 已通过：[`TagPage.tsx`](../src/features/tag/pages/TagPage.tsx) 是可对照的 `QueryState` 四态。
- 计划顺序上 Step 13 可以还没做。本步 **不依赖** download 源码。
- QueryClient 已挂；登录真调可用；端口 **5174**。
- 后端 `course_server` 已启动（默认账号 `admin / admin123`）。
- `/dashboard` 目前是 `Empty description="暂无数据"`。

本步预计新增或修改：

```text
src/features/dashboard/
├── api.ts
├── queries.ts
└── pages/
    ├── DashboardPage.tsx          # 替换 Empty
    └── DashboardPage.module.css   # 本步直接给出，见检查点 6
```

本步 **不要** 改 `shared/types`（统计类型已经在），**不要** 改 `QueryState`，**不要** 把卡片抬进 `shared/ui`（只有本页用）。

不需要 `pnpm add`。`@tanstack/react-query` 已是 **5.101.4**；图标用现有 `@ant-design/icons`（`HomeBlockPage` 已在用）。

## 4. 使用方式

每个检查点按下面顺序完成：

1. 只看「任务」和「完成信号」，先自己设计。
2. 卡住时再看「提示一」。
3. 仍无法推进再看「提示二」。
4. 完成后回答「自检问题」。
5. 每个检查点结束都跑最小验证，不要最后一次性排错。

### 同样逻辑去哪看（不要在本文找 API 解释）

| 要做的事 | 打开这个，不要重写一遍 |
|---|---|
| 无参 GET + `signal` | [`home-block/api.ts`](../src/features/home-block/api.ts) |
| `queryKeys` + `queryOptions` | [`home-block/queries.ts`](../src/features/home-block/queries.ts)；本步多几条 key，不是多一层分页 |
| 数组列表的四态 if/else | [`OfficialAccountPage.tsx`](../src/features/official-account/pages/OfficialAccountPage.tsx) |
| `QueryState` 不发请求、只管四态 | [`QueryState.tsx`](../src/shared/ui/QueryState.tsx) |
| `PageHeader` 的 `description` / `extra` | [`PageHeader.tsx`](../src/shared/ui/PageHeader.tsx) |
| `status` × `fetchStatus`、`isPending` vs `isFetching` | [08-learn-tanstack-query.md](./08-learn-tanstack-query.md) §5；[13-疑问点记录.md](./13-疑问点记录.md) §3 |
| 失效前缀 | 任意一页的 `invalidateQueries({ queryKey: xxxKeys.all })` |

### 对照源（本步不读 `Admin/src`）

**删掉 `Admin/src` 这份检查点仍能做完。**

Step 14 要对等的是：5 个 GET 的 path、响应字段、Top N、今日从哪一天 0:00 起算、热门下载过滤条件。这些都可以从后端 handler 和本仓库已有类型推出。

另一端的 `onMounted(loadAll)`、`Promise.all`、五个 `ref`、Element 图标名，落在 01 的禁止照搬清单里。读了只会把实现锁成翻译。

| 要确认的事实 | 去哪看 |
|---|---|
| 路径：`GET /stats/overview`、`/hot-articles`、`/hot-searches`、`/hot-downloads`、`/ad-events` | [api-reference.md](../../course_server/docs/api-reference.md) §3.2；[`router.go`](../../course_server/internal/router/router.go) |
| overview 字段：`users/pv/uv/articles/essays/downloads/searches/favorites/shares/ads` | [`StatsOverview`](../../course_server/internal/handler/stats.go) 的 `StatsOverview`；类型已在 [`shared/types`](../src/shared/types/index.ts) |
| 「今日」= 服务器本地时区当日 `00:00:00` 起 | `stats.go` 的 `startOfToday` |
| UV 只计 `user_id > 0` 的登录用户 | `countDistinctViewUsers` |
| 热门文章 Top 10，按 `view_count DESC`；**不过滤**草稿 | `StatsHotArticles`；行类型用已有 `Article` |
| 热门搜索 Top 20，按 `search_logs.keyword` 聚合 | `StatsHotSearches` → `HotSearch` |
| 热门下载 Top 20：仅 `status=启用` 且 `access_type=free` | `StatsHotDownloads` → `HotDownload` |
| 广告：`summary`（今日/累计）+ `bySlot`（按广告位累计） | `StatsAdEvents` → `AdEventsStat` |
| 解包 `{ code, message, data }`，`code === 0` | 已有 `shared/api`；本步不要再写一层 |

---

## 5. 架构主课：五路并行，互不拖死

Tag 页是 **1 个 query → 1 个四态 → 1 张表**。Dashboard 是 **5 个 query → 5 个四态 → 卡片 + 四张表**。

若把五路绑成一次 `Promise.all`，得到的是 Vue 已经证明过的失败模式：热门搜索挂了，今日 PV 也不让看。

```text
禁止（Vue loadAll 换皮）
  queryFn: () => Promise.all([getOverview(), getHotArticles(), ...])
  → 一个 queryKey、一份 error、一份 pending
  → QueryState 只能包整页
  → 和「不上全局 Loading」的契约对着干

允许（本步）
  const overviewQuery = useQuery(dashboardQueries.overview())
  const hotArticlesQuery = useQuery(dashboardQueries.hotArticles())
  ... 共 5 次
  → 五个 cache 槽，五个 error
  → 每个区块自己的 QueryState
  → 刷新：invalidateQueries({ queryKey: dashboardKeys.all })

按需了解
  useQueries({ queries: [...] })
  → 适合「条数运行时才知道」的列表
  → 本步 5 条名字固定，用 5 个 useQuery 更可读
  → 03 两种都算达标；审查会看你有没有把 error 绑死，不看你有没有用 useQueries
```

`QueryClient` 的默认 `staleTime: 30_000` 对五路同样生效。从别的菜单切回 `/dashboard`，30 秒内五块都可以直接用缓存。真要最新数据，点刷新按钮失效 `dashboardKeys.all`，不要把 `staleTime` 改回 `0`。

overview **只订一次**。今日运营和内容规模是同一份 JSON 的两次派生，不是两次 GET。

派生发生在渲染：

```text
overviewQuery.data
  → buildTodayMetrics(data)   // 9 张今日卡
  → buildStockMetrics(data)   // 3 张存量卡
```

不要：

```ts
// ❌ 01：派生数据禁止 Effect 同步到另一份 state
useEffect(() => {
  setTodayMetrics(buildTodayMetrics(overview))
}, [overview])
```

刷新时已有 data：`status` 仍是 `success`，`isFetching` 为 true。`QueryState` 不要打回 `pending`，否则整块卡片会闪成 Skeleton。刷新按钮用「任一 query `isFetching && !isPending`」显示 loading 即可。

版本入口：[useQuery](https://tanstack.com/query/v5/docs/framework/react/reference/useQuery)、[useQueries](https://tanstack.com/query/v5/docs/framework/react/reference/useQueries)、[invalidateQueries](https://tanstack.com/query/v5/docs/reference/QueryClient#queryclientinvalidatequeries)。当前仓库是 Query **v5.101.4**。

---

## 检查点 1：先写下产品契约，不急着改页面

### 当前问题

占位页只有一个 Empty。五块数据的字段、Top N、空态含义还没写清。先画表格，再写 `api.ts`。

### 任务

在纸上或注释里写下下面这张表，直到你能不看 handler 复述。**先不要改 `DashboardPage.tsx`。**

**页面结构**

| 区块 | 数据来源 | 空 / 失败时 |
|---|---|---|
| 页头「数据概览」+ 刷新 | 无请求 | 页头始终在，不被 `QueryState` 包住 |
| 今日运营（9 张卡） | `GET /stats/overview` | 与内容规模共用这一次 query |
| 内容规模（3 张卡） | 同上 | overview 失败则两行卡片一起 Alert |
| 热门文章 Top 10 | `GET /stats/hot-articles` → `Article[]` | 空数组 = Empty；失败 = 本卡 Alert |
| 热门搜索词 Top 20 | `GET /stats/hot-searches` → `HotSearch[]` | 同上 |
| 免费资料下载排行 Top 20 | `GET /stats/hot-downloads` → `HotDownload[]` | 同上 |
| 广告统计 | `GET /stats/ad-events` → 表格用 `bySlot` | `bySlot.length === 0` 算空；`summary` 本页表格不用 |

**今日运营卡片（主数字 = `today`，副文案 = 累计）**

| 标签 | 主数字 | 副文案 |
|---|---|---|
| PV（浏览量） | `pv.today` | `累计 ${pv.total}` |
| UV（登录用户） | `uv.today` | `累计 ${uv.total}` |
| 下载次数 | `downloads.today` | `累计 ${downloads.total}` |
| 搜索次数 | `searches.today` | `累计 ${searches.total}` |
| 收藏次数 | `favorites.today` | `累计 ${favorites.total}` |
| 分享次数 | `shares.today` | `累计 ${shares.total}` |
| 广告曝光 | `ads.expose.today` | `累计 ${ads.expose.total}` |
| 广告点击 | `ads.click.today` | `累计 ${ads.click.total}` |
| 激励完成 | `ads.rewardedComplete.today` | `累计 ${ads.rewardedComplete.total}` |

副文案色：一律次要色。今日运营没有「正向高亮」。

**内容规模卡片**

| 标签 | 主数字 | 副文案 |
|---|---|---|
| 用户数 | `users.total` | `今日新增 +N` 或 `今日新增 0`（`today > 0` 时加 `+`，副文案用正向色） |
| 文章总数 | `articles.total` | `已发布 ${articles.published}` |
| 优秀作文 | `essays.total` | 无副文案（留空位，避免卡片高度塌掉） |

**四张表列**

| 表 | 列 | `rowKey` |
|---|---|---|
| 热门文章 | `#`（序号）、标题 `title`、年级 `grade`、浏览 `viewCount` | `id` |
| 热门搜索 | `#`、关键词 `keyword`、次数 `count` | `keyword`（聚合结果没有 id） |
| 热门下载 | `#`、文件名 `fileName`、类型 `fileType`、下载 `downloadCount` | `fileId` |
| 广告统计 | 广告位 `slotKey`、曝光 `expose`、点击 `click`、激励完成 `rewardedComplete` | `slotKey` |

序号列用 Table `index`，不要拿数组下标当 `rowKey`。

**数字格式 `formatNumber`**

- `n >= 10000` → `(n / 10000).toFixed(1) + 'w'`
- `n >= 1000` → `(n / 1000).toFixed(1) + 'k'`
- 否则原样字符串

表格里的浏览 / 次数 / 下载 **不要** 再套 `formatNumber`，跟 Vue 产品一致：卡片缩写，表格用原始整数。

**今日提示文案**

`截至 ${year}年${month}月${day}日 0:00 起`。用浏览器本地日期即可。后端按服务器本地时区切日；本地 MVP 通常是同一台机器。不要自己算「今日」再去改 query，接口没有日期参数。

### 提示一

overview 成功但全是 0 **不是** empty。卡片仍要渲染。`QueryState` 的 `empty` 只给数组块。

广告的 `summary` 与 overview 的 `ads` 含义接近。本页表格只渲染 `bySlot`，不要再做一张 summary 表。

### 提示二

热门文章 handler **没有** `status = published`。草稿若 view_count 够高会出现在 Top 10。前端不要擅自 `filter`。热门下载已经在服务端过滤了免费 + 启用，前端也不要再滤一遍。

### 完成信号

你能不看代码说出：5 个 path、9+3 张卡的字段、四张表的 `rowKey`、为什么 overview 失败不该连累热门文章。

### 自检问题

- 为什么热门文章不能复用 `articleQueries.list()`？
  - list 是分页 + 筛选；hot-articles 是 `view_count` Top 10，且不过滤草稿。path 也不是 `/articles`。
- UV 和 PV 差在哪？
  - PV 是 `view_logs` 行数；UV 是去重后的登录用户。匿名浏览不计 UV。

---

## 检查点 2：画出依赖，先不写页面

### 当前问题

文件还没拆。先决定 key、谁派生、刷新打哪一层，避免一会儿写成一条大 query。

### 任务

画出本域依赖（纸上即可）：

```text
dashboardKeys.all = ['stats']
  ├── overview
  ├── hot-articles
  ├── hot-searches
  ├── hot-downloads
  └── ad-events

DashboardPage
  ├── useQuery × 5（或 useQueries，但结果仍要按名字用）
  ├── PageHeader.extra = 刷新
  │     → queryClient.invalidateQueries({ queryKey: dashboardKeys.all })
  ├── QueryState(overview) → 今日运营 + 内容规模
  └── 四个 QueryState → 四张 Table
```

本步 **没有** `lists(query)` 那一层：这些 GET 都没有筛选参数。不要为了「和 tag 长得像」硬造 `list: (q) => ...`。

本步 **没有** `schemas.ts`。只读页没有写模型。

跨域：不要 import `articleQueries` / `download` feature。热门文章的 `Article` 类型从 `@/shared/types` 来就够。

### 提示一

`all` 用 `['stats']` 对齐 URL 前缀，刷新一次能打中五块。不要五条 `invalidateQueries` 抄五遍。

### 提示二

`useQueries` 返回数组。你若用它，立刻把结果起名：

```ts
const [overviewQuery, hotArticlesQuery, ...] = useQueries({ queries: [...] })
```

不要在 JSX 里写 `results[2]`。条数以后一加，下标会静默错位。

### 完成信号

图上能指出：5 个 cache 槽、1 次刷新、overview 只订一次、没有 Form / mutation。

### 自检问题

- 为什么刷新不写成五个 `refetch()`？
  - 能用前缀失效就用前缀。和写后 `invalidateQueries(tagKeys.all)` 同一套肌肉。`refetch()` 只打当前观察者；失效还能让以后订阅的查询自动变 stale。
- 为什么 `queryKey: ['dashboard']` 一条打天下不行？
  - 五个 GET 会变成一份 cache，失败绑死。那是检查点 0 就要拒绝的方案。

---

## 检查点 3：`api.ts` + `queries.ts`

### 当前问题

页面还不能发请求。先把五条 GET 收到本域，再接线。

### 任务

新建：

- [`src/features/dashboard/api.ts`](../src/features/dashboard/api.ts)
- [`src/features/dashboard/queries.ts`](../src/features/dashboard/queries.ts)

要求：

1. 五个函数：`getOverview` / `getHotArticles` / `getHotSearches` / `getHotDownloads` / `getAdEvents`。
2. 全部走已有 `get<T>`，把 `signal` 传进 axios config。
3. 泛型分别是 `StatsOverview`、`Article[]`、`HotSearch[]`、`HotDownload[]`、`AdEventsStat`。
4. `dashboardQueries.overview()` 这类工厂返回 `queryOptions({ queryKey, queryFn })`。
5. 页面暂时不要 `useQuery`。

最小验证：文件能通过类型检查的写法（先不跑页面）。若你改完想确认编译，在 `Admin-React/` 执行：

```bash
pnpm type-check
```

### 提示一

无参 GET 抄 home-block 的参数形状：`({ signal }: { signal?: AbortSignal })`，调用 `get(url, { signal })`。

不要写 `toListParams`。这些接口没有 query string。

### 提示二

`queries.ts` 可以长这样（你自己补其余四条，不要复制完事却说不清 key）：

```ts
import { queryOptions } from '@tanstack/react-query'
import { getOverview } from './api'

export const dashboardKeys = {
  all: ['stats'] as const,
  overview: () => [...dashboardKeys.all, 'overview'] as const,
  // hotArticles / hotSearches / hotDownloads / adEvents
}

export const dashboardQueries = {
  overview: () =>
    queryOptions({
      queryKey: dashboardKeys.overview(),
      queryFn: ({ signal }) => getOverview({ signal }),
    }),
  // ...
}
```

`as const` 不要丢。页面里禁止再写 `queryKey: ['stats']`。

### 常见错误

- `get<StatsOverview[]>('/stats/overview')`：overview 是对象不是数组。
- 热门文章 `get<PageData<Article>>`：这个接口直接返回数组。
- `queryFn` 里 `Promise.all`。
- 把五个函数塞进 `shared/api`。统计只服务 Dashboard，放本域。

### 完成信号

两个文件存在；五条 path 与类型对得上；`dashboardKeys.all` 能覆盖五条具体 key。

### 自检问题

- `queryFn` 为什么必须把 `signal` 往下传？
  - 组件卸载 / 失效重打时 Query 会 abort。不传则 axios 仍可能在卸载后回来，白打一次。
- 为什么不在 `api.ts` 里 `catch` 后返回空数组？
  - Query 靠 throw 进 error 态。吞掉错误，`QueryState` 会把失败画成 Empty。

---

## 检查点 4：数字派生（渲染时算，不另存 state）

### 当前问题

overview 的 JSON 不能直接丢给 JSX。9+3 张卡需要一层纯函数。这一层很容易被写成 `useState` + `useEffect`。

### 任务

在 `DashboardPage.tsx`（或同域一个 `metrics.ts`，不要进 `shared`）写下：

- `formatNumber(n: number): string`
- `buildTodayMetrics(overview: StatsOverview)`
- `buildStockMetrics(overview: StatsOverview)`

卡片结构自定，但至少要有：`label`、`value`（已经 format 过或在渲染时 format）、`sub`、`subTone: 'muted' | 'positive'`、以及检查点 6 要用的 `accent`（CSS 变量名，见下一检查点）。

**不要** 在这一步就接 `useQuery`。你可以先用一个本地常量假数据跑 TypeScript，下一步再删掉。假数据不要提交。

### 提示一

函数签名吃完整 `StatsOverview`，不要 12 个参数。派生是「一份 JSON → 视图模型」，不是 12 次取值散落在 JSX。

`users.today > 0` 才 `positive` 且前缀 `+`。`today === 0` 时文案仍是 `今日新增 0`，色用 `muted`。

优秀作文没有 `sub`：渲染时用 `\u00a0` 或 CSS `min-height` 占位，避免三张卡高低不齐。检查点 6 的 `.metricSub` 已留 `min-height`。

### 提示二

`formatNumber` 可以直接用：

```ts
function formatNumber(n: number): string {
  if (n >= 10_000) return `${(n / 10_000).toFixed(1)}w`
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  return String(n)
}
```

不要 `useMemo(() => buildTodayMetrics(data), [data])`。12 次加减法构不成卡顿证据。01 禁止预防性 memo。

### 完成信号

纯函数可对一组假 overview 算出 9 张 + 3 张；源码里没有 `setTodayMetrics`。

### 自检问题

- 为什么 `toFixed(1)` 出现 `1.0k` 可以接受？
  - 产品就是这样缩写。不要再手写 `trim` 掉 `.0`，除非验收明确要求。
- 卡片 `value` 用 `number` 还是已经 format 的 `string`？
  - 都行。选一种，JSX 里不要 format 两次。

---

## 检查点 5：页面接到五块 QueryState + 刷新

### 当前问题

请求工厂有了，派生有了，还没接到 `/dashboard`。这一步才是本课落地。

### 任务

替换 [`DashboardPage.tsx`](../src/features/dashboard/pages/DashboardPage.tsx) 的 Empty。

1. 五个 `useQuery(...)`，options 来自 `dashboardQueries.*()`。不要再 spread 一层 `placeholderData: keepPreviousData`——本页没有分页切换。
2. `PageHeader`：`title="数据概览"`，`description` 写一句「今日运营与内容规模一览」。`extra` 放刷新 `Button`。
3. 刷新：`queryClient.invalidateQueries({ queryKey: dashboardKeys.all })`。按钮 `loading` 用「任一块 `isFetching && !isPending`」。
4. overview 的 `QueryState` 包住「今日运营 + 内容规模」两节。`empty` 对 overview 不要用：对象不会是空数组。
5. 四张表各自一个 `QueryState`。数组 `length === 0` 才 `empty`。广告看 `bySlot`。
6. Table：`pagination={false}`，`size="small"`。不要前端再截 Top N。
7. 首次 pending：该块 `QueryState` 走 Skeleton。**页头始终渲染。**
8. 某块 `isError` 且没有 data：该块 Alert。其它块不受影响。
9. 刷新失败但旧 data 还在：保持 success 展示旧数据。不要把 `QueryState` 打回 `error`（对照 TagPage 的 `isRefetchError` 思路；卡片页可以不做顶部 Alert，至少不能卸掉旧数字）。
10. 图标用 `@ant-design/icons`。不必 1:1 复刻 Element 图标名；9+3 个能区分即可。
11. `className` 对齐检查点 6 的 CSS。自定义属性这样设（否则 TS 不认 `--accent`）：

```tsx
style={
  {
    '--accent': 'var(--dash-jade)',
    '--delay': `${index * 40}ms`,
  } as CSSProperties
}
```

`accent` 的取值必须是检查点 6 里定义的 `var(--dash-jade)` / `var(--dash-copper)` / `var(--dash-gold)` 之一，不要在 TS 里写 `#hex`。

### 提示一

四态派生仍然是那套 if/else，只是要从 1 份变成 5 份。可以写一个 5 行的小函数：

```ts
function readStatus(query: {
  isPending: boolean
  isError: boolean
  data: unknown
}): QueryStateEnum {
  if (query.isPending) return 'pending'
  if (query.isError && !query.data) return 'error'
  return 'success'
}
```

数组块在 `'success'` 之后再判断 `length === 0` → `'empty'`。不要把这个函数抽到 `shared`。

`errorText` 继续：`error instanceof ApiError ? error.message : '加载失败'`。

### 提示二

页头不要放进 `QueryState`。结构近似：

```text
div.page
  PageHeader extra=刷新
  QueryState(overview)
    section 今日运营
    section 内容规模
  div.tablesGrid
    四张 tableCard，每张内部自己的 QueryState + Table
```

刷新不要 `await` 五个 `refetch()` 再 `message.success`。失效是同步标记 stale，重打是 Query 自己的事。本页也没有必须 toast 的写操作。

`Button` 不要配全局 `Spin` spinning={true} 罩住 `document.body`。

### 常见错误

- `useQuery({ queryKey: ['stats'], queryFn: () => Promise.all([...]) })`。
- `if (a.isPending || b.isPending || ...) queryStatus = 'pending'` 然后一个 `QueryState` 包整页。
- overview 失败时 `return <Empty />` 把四张表也 return 掉。
- `loading={overviewQuery.isFetching}` 套在整页 `Spin` 上。
- Table `rowKey` 用 index。
- 热门文章列去渲染 `body` / `coverImg`。

### 完成信号

登录后打开 `http://localhost:5174/dashboard`：页头立刻在；五块会各自进 pending → 数据；Network 能看到五条 `/stats/*`。

在 `Admin-React/` 执行：

```bash
pnpm verify
```

### 自检问题

- 为什么刷新时不能把 overview 的 `QueryState` 打回 `pending`？
  - `isPending` 在已有 data 时是 false。你若写成 `isFetching → pending`，卡片会闪 Skeleton，这就是 01 说的「用错 `isFetching` 当首次骨架」。
- 五条请求是并行还是串行？
  - 五个 `useQuery` 在同一次渲染订阅，Query 会并行打（受连接数限制）。不要在 `queryFn` 里 `await getOverview()` 完再打下一个。

---

## 检查点 6：把 CSS 原样放进文件

### 当前问题

页面逻辑可以先用 className 占位。视觉网格、强调色、响应式断点本步直接给，避免你从 Vue 抄 `--jade-600`（本仓库 token 不叫这个名字）。

### 任务

新建 [`src/features/dashboard/pages/DashboardPage.module.css`](../src/features/dashboard/pages/DashboardPage.module.css)，**整文件粘贴**下面内容。不要改色值去「更像 Vue」。不要把变量抬进 `tokens.css`（只有本页用）。

然后确认：

- 根节点 `className={styles.page}`（`--dash-*` 定义在这里，卡片的 `var(--dash-jade)` 才能解析）。
- 卡片根节点同时有 `styles.metricCard`，并用 inline style 写 `--accent` / `--delay`。
- 副文案：`muted` → `styles.metricSubMuted`；`positive` → `styles.metricSubPositive`。

```css
.page {
  display: flex;
  flex-direction: column;
  gap: 24px;
  --dash-jade: #3d8b7a;
  --dash-copper: #c47a4a;
  --dash-gold: #c9a227;
  --dash-positive: #3d8b7a;
}

.metricsSection {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.metricsHeader {
  display: flex;
  align-items: baseline;
  gap: 12px;
}

.metricsTitle {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  color: var(--color-text);
}

.metricsHint {
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-secondary);
}

.metricsGrid {
  display: grid;
  gap: 14px;
}

.metricsGridToday {
  grid-template-columns: repeat(5, minmax(0, 1fr));
}

.metricsGridStock {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.metricCard {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px;
  background: var(--color-bg-container);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  position: relative;
  overflow: hidden;
  animation: metric-enter 0.5s ease both;
  animation-delay: var(--delay, 0ms);
}

.metricCard::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  background: var(--accent, var(--dash-jade));
  border-radius: 3px 0 0 3px;
}

.metricIcon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: color-mix(in srgb, var(--accent, var(--dash-jade)) 12%, transparent);
  color: var(--accent, var(--dash-jade));
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 17px;
  flex-shrink: 0;
}

.metricBody {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.metricLabel {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.metricValue {
  font-size: 26px;
  font-weight: 700;
  color: var(--color-text);
  line-height: 1.3;
  margin: 2px 0;
}

.metricSub {
  font-size: 12px;
  font-weight: 600;
  min-height: 16px;
}

.metricSubMuted {
  color: var(--color-text-secondary);
}

.metricSubPositive {
  color: var(--dash-positive);
}

.tablesGrid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20px;
}

.tableCard {
  min-width: 0;
  background: var(--color-bg-container);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 16px;
}

.cardHeader {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  font-weight: 600;
  color: var(--color-text);
}

.cardDot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
  background: var(--dash-jade);
}

.cardDotCopper {
  background: var(--dash-copper);
}

.cardDotGold {
  background: var(--dash-gold);
}

.cardDotJadeDark {
  background: color-mix(in srgb, var(--dash-jade) 70%, black);
}

.cardHint {
  margin-left: auto;
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-secondary);
}

@keyframes metric-enter {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 1400px) {
  .metricsGridToday {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}

@media (max-width: 1100px) {
  .metricsGridToday {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .tablesGrid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .metricsGridToday,
  .metricsGridStock {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 480px) {
  .metricsGridToday,
  .metricsGridStock {
    grid-template-columns: 1fr;
  }
}
```

### 提示一

CSS Modules 里的 `metricGridToday` 在 TS 是 `styles.metricsGridToday`。两套 class 可以并列：`className={`${styles.metricsGrid} ${styles.metricsGridToday}`}`。

四张表的圆点：文章 jade、搜索 copper、下载 gold、广告 `cardDotJadeDark`。

### 提示二

不要把 `--dash-jade` 写进 `tokens.css`。01 的分层是「多处重复的色才进 shared」。现在只有 Dashboard 用这三色。

不要用 Tailwind arbitrary class 拼动态色。动态强调色走 `--accent`。

### 完成信号

宽屏 5+3 卡片网格、下面 2×2 表；缩到 ~1100px 表变单列。卡片左边有 3px 强调条。没有 `#3d8b7a` 出现在 `.tsx` 里。

### 自检问题

- 为什么 `--dash-jade` 定义在 `.page` 而不是 `:root`？
  - 作用域限制在本页。暗色主题仍用同一套强调色，背景走 `--color-bg-container`，对比足够。
- 为什么动画 delay 用 CSS 变量而不是 12 个 class？
  - delay 随 index 变。01：运行时动态值走 `style` / CSS 变量。

---

## 检查点 7：Rule of Three 体检（默认不抽 hook）

### 当前问题

现在已经有很多「`useQuery` + 四态 if/else + Table」。Dashboard 又写了五遍四态，看起来很想抽 `useDashboard`。

### 任务

把 `TagPage`、`OfficialAccountPage`、`DashboardPage` 并排，只回答：

1. 重复的是不是 **只** 有「订阅 query + 四态」？Dashboard 的五路并行、卡片派生、无分页，是否已经和列表页不同？
2. 若抽 `useDashboardQueries()`，调用方是否仍能看出「这不管 Table、不管卡片」？
3. 若抽 `MetricCard`，它是不是非平凡 UI（强调条 / 图标槽 / 副文案色），还是一层 `div` 套壳？

默认结论：

- **不抽** `useDashboard` / `useStatsPage` / `useParallelQueries`。
- `MetricCard` 可以留在 `DashboardPage.tsx` 里当局部函数组件；只有当你确认 JSX 复制了两遍（今日 + 存量）时，才允许在本域建 `components/MetricCard.tsx`。
- **不要** 抬到 `shared/ui`。第二页真用到指标卡再搬。

把体检结果写在验收备注里一句即可。

### 提示一

五次 `useQuery` 看起来啰嗦，但是 5 个**不同** cache 槽。压成 `useQueries` 只是少写几个标识符，不是抽象层。不要为了少写而引入 `queries.map` 动态配置——名字会丢。

### 提示二

若你抽了 hook，审查会看 import。出现 `formatNumber` / `antd Table` / `message.success` 就说明越界了。

### 完成信号

- 要么：Page 里仍能指着五次 `useQuery` 和两行 `build*Metrics`，备注写「未抽 Page hook」。
- 要么：本域有一个只负责「指标卡外观」的 `MetricCard`，Page 仍拥有五次订阅和刷新。

### 自检问题

- 为什么现在还不能做成 `shared/ui/StatCard`？
  - 只有本页用。YAGNI。Step 15 收尾也不是为了发明设计系统。
- 四态小函数写在 Page 顶部可以吗？
  - 可以。它不是 hook，不违反 Rules of Hooks，也不需要进 `shared`。

---

## 检查点 8：完整验收

### 自动验证

在 `Admin-React/` 目录执行：

```bash
pnpm verify
pnpm build
```

预期：Oxlint 通过；TypeScript 严格检查通过；Vite 生产构建完成。本步不要求 `pnpm test`。

### 手动验证矩阵

前置：后端已启动；前端 `pnpm dev` 在 **5174**；用 `admin / admin123` 登录。

**页头**

- `/dashboard` 不再是整页「暂无数据」Empty。
- 标题「数据概览」；右侧有刷新按钮。
- 页头在五块还 pending 时就已经在，不是白屏。

**今日运营 / 内容规模**

- 9 张 + 3 张卡片字段与检查点 1 一致。
- 主数字走 `formatNumber`；副文案是累计 / 已发布 / 今日新增。
- 用户数 `today > 0` 时副文案带 `+` 且为正向色。
- 提示文案含「0:00 起」。
- Network：`GET /admin/api/v1/stats/overview` 一次，不是两次。

**四张表**

- 热门文章最多 10 行，列：标题 / 年级 / 浏览。`rowKey` 是 id。
- 热门搜索最多 20 行，列：关键词 / 次数。
- 热门下载最多 20 行，列：文件名 / 类型 / 下载。
- 广告表列：广告位 / 曝光 / 点击 / 激励完成。数据是 `bySlot` 不是 `summary`。
- 没有分页器。

**首次 loading vs 单块失败**

- 清空该页 Query 缓存后刷新：五块各自 Skeleton，没有全屏遮罩。
- DevTools → Network → Block request URL 拦 `**/stats/hot-searches**` → 点刷新：搜索那张卡 Alert，其余块仍有数。
- 取消 Block 后再刷新：搜索卡恢复。

**刷新**

- 点击刷新后五条 `/stats/*` 再打（若仍在 `staleTime` 内，`invalidateQueries` 仍会重打 active 查询）。
- 刷新过程中卡片数字不闪成 Skeleton。
- 按钮有 loading；没有 `message.success('刷新成功')` 的硬性要求，有也不要进 axios。

**缓存**

- 切到 `/tags` 再立刻回 `/dashboard`：30 秒内可以不打网（`staleTime`）。这能说明默认配置生效，不是本页又写了一套。

**共性**

- 无 `useEffect` 拉数。
- 无 `any`、无 `useCrud`、无图表库。
- 无 `schemas.ts`、无 Dialog。
- toast 若出现，只来自 `App.useApp()`。
- 源码不 import `features/article` / `features/download` 的页面或组件。

### 代码审查时自搜

```text
useEffect
setOverview
setTodayMetrics
Promise.all
queryKey: ['stats'
queryKey: ['dashboard'
keepPreviousData
useCrud
from 'antd' 的静态 message
echarts
recharts
Spin
features/article/
features/download/
loadAll
onMounted
```

预期：`useEffect` 不为拉数 / 不为派生同步出现；`queryKey` 只来自 `dashboardKeys`；`Promise.all` 不出现在 `queryFn`；没有图表库；没有全屏 `Spin`；`invalidateQueries` 打 `dashboardKeys.all`。五个 `useQuery` 或一次 `useQueries` 都可以，但 JSX 里必须能按名字拿到各块 error。

按 [03 验收协议](./03-开发计划.md) 发审查时，把本矩阵勾过去。备注写清：未读 `Admin/src`；单块失败用 Network block 测过；Rule of Three 是否抽了 hook。

---

## 6. 失败时的最短排查路径

### 进入页面仍是「暂无数据」Empty，且没有刷新按钮

占位页没替换，或懒加载的 `Component` 没导出。路由已经指向 `features/dashboard/pages/DashboardPage`，不要去改 router。

### 五条请求变成一条，失败时整页 Alert

`queryFn` 里 `Promise.all`，或一个 `QueryState` 用「任一路 pending / error」包整页。拆回五次订阅。

### overview 打了两次

今日运营和内容规模各写了一次 `useQuery(dashboardQueries.overview())`——cache 会去重，但不要靠这点偷懒。订一次，两节都读 `overviewQuery.data`。

### 卡片是空的但 Network 200

把 `StatsOverview` 当成了数组，或读成 `data.data.pv`。`get<T>` 已经解包到 `data`。直接 `overview.pv.today`。

### 热门文章表空白，响应其实是数组

把 `PageData` 的 `.list` 套上去了。`dataSource={hotArticlesQuery.data}`。

### 广告表空白，响应有 `summary`

表格绑了整个 `AdEventsStat`。应绑 `data.bySlot`。

### 刷新时卡片闪 Skeleton

`isFetching` 被当成了 `pending`。首次骨架只看 `isPending`（且没有旧 data）。

### 拦 hot-searches 后整页挂掉

还是 `Promise.all` 或整页 `QueryState`。或者 `throw` 写在页面渲染函数里而不是 queryFn。

### 数字是 `1.0k` 但你想要 `1k`

按产品用 `toFixed(1)`。不要为此引入 `Intl.NumberFormat` 再开一轮文案。

### `pnpm` 报在根目录找不到 package

工作目录必须是 `Admin-React/`。本步不需要装新包。

### TS 报 `--accent` 不在 `CSSProperties` 里

`as CSSProperties` 断言整份 style 对象。不要为此关掉 `strict`。

---

## 7. 完成后应能口头回答

1. 为什么本步不读 `Admin/src` 也能做完验收？
2. 为什么 `Promise.all` 五个 GET 放进一条 `queryFn` 验收不能过？
3. `useQuery` × 5 和 `useQueries` 各适合什么？本步为什么推荐前者？
4. 为什么 `QueryState` 不能包住 `PageHeader`？
5. overview 失败为什么不该连累热门文章？今日运营和内容规模为什么可以一起失败？
6. 刷新为什么走 `invalidateQueries(dashboardKeys.all)` 而不是 `loadAll()`？
7. 为什么 `buildTodayMetrics` 不能 `useEffect` 进另一份 state？为什么不必 `useMemo`？
8. 热门文章为什么不用 `articleQueries.list`？热门下载为什么不用 download 列表接口？
9. `isPending` 和 `isFetching` 在本页各控制什么？
10. 为什么默认不抽 `useDashboard`，MetricCard 也不进 `shared/ui`？

---

## 8. 快速上手总结

### 必须掌握

- **对照源在后端 handler + 已有类型**：path、字段、Top N、免费下载过滤、今日 0:00。不需要 `Admin/src`。
- **固定多路用多次 `useQuery`**：每个区块独立 pending / error / data。不要 `Promise.all` 绑死。
- **`QueryState` 按块用**：页头始终在；overview 喂两行卡片；四张表各管各的。
- **派生在渲染时算**：`buildTodayMetrics(overviewQuery.data)`，禁止第二份 metrics state。
- **刷新 = 失效前缀**：`invalidateQueries({ queryKey: dashboardKeys.all })`。

### 按需了解

- `useQueries`：动态条数、或一份配置驱动的并行查询。本步 5 个名字是静态的。
- `useQueries` 的 `combine`：把数组收成一份派生结果。本页每块 UI 仍要单独 error，不适合先 combine 再拆。
- 广告 `summary`：和 overview.`ads` 接近，本页表格不用。
- 热门文章可能含未发布：handler 不过滤 status，前端不要擅自藏。
- `placeholderData: keepPreviousData`：分页切换才需要。本页没有。
- 图表库：产品就是卡片 + 表。Step 15 也不为 Dashboard 加图。
- schema / RTL：Step 16。

### 下一步

Step 14 验收通过后：

- 计划里的 Step 13（下载资料）若还没做，按 [20-step13-下载资料引导式开发.md](./20-step13-下载资料引导式开发.md) 回去补；**不要**在 Dashboard 里提前写 download。
- Step 15 才做 Error Boundary 文案、README、空态打磨。本步不要顺手改壳。

## 9. 未验证项

- 本文没有替你实现页面源码，因此不能声称「按本文复制即可运行」。
- CSS 已给出完整小文件；卡片 JSX、五次 `useQuery` 接线、表格列需你按检查点自己写。
- 未在隔离空目录复现本步（本步是累计项目，依赖 Step 1–12 的仓库状态）。
- 未实际执行 `pnpm verify` / `pnpm build`（没有落地源码）。
- 单块失败矩阵依赖本机 5174、后端和浏览器 Network block。
- `useQueries` / `useQuery` 的精确行为以仓库已装 Query **v5.101.4** 的官方文档为准。
- 完成实现后，请以 `pnpm verify`、`pnpm build` 和「手动验证矩阵」为最终验收依据。
