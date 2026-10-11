# Step 4 引导式开发：HTTP 客户端、ApiError 与真登录

> 本文对应 [03-开发计划](./03-开发计划.md) 的 Step 4。  
> 它是一份任务引导，不提供可以整段复制的最终实现。请先自己完成每个检查点，卡住后再展开提示。  
> 质量要求以 [01-工程契约](./01-工程契约.md) 为准。

## 测试策略（2026-10-11 修订）

检查点 7（HTTP 解包 / 401 行为测试）已于 2026-10-11 补齐（见 [04-验收记录](./04-验收记录.md)）。  
Vitest 已接入，本步不再跳过测试。  
原文保留，供对照。验收以「手动验证矩阵」+ `pnpm verify` 为准。

## 1. 本步目标

基于 Step 3 已完成的登录态闭环，把 mock 登录换成真实 HTTP，并让请求层与 UI 解耦：

```text
登录页提交
  → features/auth/api.ts 调用共享客户端
  → 带上 baseURL，解包 { code, message, data }
  → code === 0 时返回 LoginResult
  → 登录页只 setAuth；离开 /login 仍由 AuthGate 负责

业务码失败
  → HTTP 层 throw ApiError
  → UI 层（登录页）再提示
  → 拦截器不弹消息、不跳转

非登录接口 HTTP 401
  → authStore.getState().clear()（不传 skipRedirect）
  → AuthGate 把人送去 /login?redirect=...

登录接口 HTTP 401（密码错误）
  → 只 throw ApiError
  → 不清会话、不改 URL
```

完成后必须满足：

- 登录页真调 `POST /admin/api/v1/auth/login`，成功后行为与 Step 3 一致（redirect / 顶栏 / persist）。
- `code !== 0` 抛 `ApiError`；提示发生在 UI 层，不在拦截器。
- 非登录请求 401 只 `clear()`；登录请求 401 不当成过期跳转。
- 无全局 Loading 引用计数。
- 无 `any`。
- `pnpm verify` 通过（lint + type-check + test）。

## 2. 本步边界

本步只实现 HTTP 内核，并用登录这一条垂直切片打通它。

本步允许：

- 安装 `axios`。
- 新建 `src/shared/api/`。
- 替换 `features/auth/api.ts` 的 mock。
- 登录页 `catch ApiError` 后用已有的 `App.useApp().message` 提示失败。

本步禁止：

- 为验证 Query 或 HTTP 新建演示页、临时路由、或「随便 GET 一下」的页面。
- 预写 tag / article / dashboard 等其它域的 `api.ts`（留给后续 Step）。
- 在拦截器里调用 `message`、`navigate`、`useNavigate` 或任何 React hook。
- 实现全局 Loading 引用计数。
- 把 QueryClient、`shared/ui`、业务列表放进本步。
- 从 `localStorage['admin_token']` 当裸 JWT 读取（persist 存的是 JSON 状态，不是 token 字符串）。
- 修改只读对照项目 `Admin/`。

03 开发计划里「把各域 API 文件迁过来」对本步过宽。本步用登录证明客户端能用即可；其它域的 `api.ts` 在第一次真调该接口时再写。

## 3. 开始状态与文件范围

开始前应保持 Step 3 的状态：

- Zustand persist 的 key 为 `admin_token`；组件用 selector，HTTP 将用 `getState()`。
- 登录页只 `setAuth`，不自己 `navigate()`。
- 主动退出 `clear({ skipRedirect: true })`；以后 401 的 `clear()` 不传 skip。
- `features/auth/api.ts` 仍是标注为 Step 3 临时实现的 mock。
- `VITE_API_BASE=/admin/api/v1` 已由 [`shared/config/env.ts`](../src/shared/config/env.ts) 解析。
- Vite 已把 `/admin/api` 代理到 `http://localhost:8080`。
- 当前 **还没有** axios，也没有 `src/shared/api/`。

本步预计新增或修改：

```text
src/
├── shared/
│   └── api/
│       ├── api-error.ts      # ApiError
│       ├── http.ts           # axios 实例、拦截器、get/post
│       └── index.ts          # 对外导出
└── features/
    └── auth/
        ├── api.ts            # mock → 真登录
        └── pages/
            └── LoginPage.tsx # catch ApiError，成功路径不改跳转职责
```

文件名可以小幅调整，但 HTTP 内核必须留在 `shared/api`，登录函数必须留在 `features/auth`。不要把 axios 实例写进 LoginPage。

本步 **不要** 安装测试依赖，也不要改 `verify` 脚本。

## 4. 使用方式

每个检查点按下面顺序完成：

1. 只看“任务”和“完成信号”，先自己设计。
2. 卡住时再看“提示一”。
3. 仍无法推进再看“提示二”。
4. 完成后回答“自检问题”，不要只看页面能否登录。
5. 每个检查点结束都运行最小验证，不要最后一次性排错。
6. **跳过检查点 7**（测试，已暂缓）。

### 对照源（本步不读 `Admin/src`）

验收项都可以从下面三处推出，**不要**把其它端的请求封装当实现模板：

| 要确认的事实 | 去哪看 |
|---|---|
| `ApiError` 字段、解包、拦截器禁止 UI、401 只清态 | [01-工程契约.md](./01-工程契约.md)「HTTP」与「禁止」表 |
| 信封 `{ code, message, data }`、`Authorization: Bearer`、`POST /auth/login` 字段 | [course_server/docs/api-reference.md](../../course_server/docs/api-reference.md) §1.2、§1.3、§3.1 |
| `getState()`、`clear()` 与 skipRedirect 的既有语义 | [`auth-store.ts`](../src/features/auth/auth-store.ts)、[`AuthGate.tsx`](../src/app/router/AuthGate.tsx) |
| mock 替换点、登录页成功路径 | [`features/auth/api.ts`](../src/features/auth/api.ts)、[`LoginPage.tsx`](../src/features/auth/pages/LoginPage.tsx) |

登录失败为什么是 401：本仓库后端对错误密码调用 `Unauthorized`（HTTP 401，body 里 `code` 也是 401）。若把「任意 401」都当成会话过期，登录页输错密码会被当成掉线。这条规则由**本后端契约**推出，不是从其它前端抄来的。

---

## 检查点 1：先设计 HTTP 契约，不急着 new axios

### 当前问题

登录页、以后的业务页、401 清态都会走同一条请求通道。如果先在页面里直接 `fetch`，解包、token、错误形状会立刻分叉。

### 任务

先在纸面或注释中确定三件事，再写文件。

**1. `ApiError` 的最小公开形状**（与 01 契约对齐，不要自行加一堆用不到的字段）：

- 继承 `Error`，`message` 给 UI 展示。
- `status?`：HTTP 状态码。
- `code?`：业务码（信封里的 `code`）。
- `isUnauthorized`：是否按「未授权」处理。

**2. 成功路径只返回 `data`。**  
信封类型已经在 [`shared/types`](../src/shared/types/index.ts) 的 `ApiResponse<T>`。业务函数的返回类型是 `T`，不是 `ApiResponse<T>`，也不是 Axios 的 `response` 对象。

登录成功的 `T` 复用已有 `LoginResult`：`token`、`adminId`、`username`、`role`。不要在 auth feature 再抄一份。

**3. 失败路径统一 throw。**  
`code !== 0`、HTTP 4xx/5xx、没有响应（网络断开）都必须让调用方进 `catch`。不要有的接口 `return null`、有的 `throw`、有的自己 `message.error`。

### 提示一

后端约定：成功是 HTTP 200 且 `code = 0`；失败时 **HTTP 状态码与 `code` 一致**（常见 400 / 401 / 403 / 404 / 500）。不要假设「只有 HTTP 200 的 body 里才有信封」。axios 默认把 4xx 当成异常，信封往往在 error 的 `response.data` 里。

### 提示二

`isUnauthorized` 用 HTTP `status === 401` 即可。不要用 `message` 字符串去猜「是不是过期」。密码错误和 token 过期在本后端都是 401，区分它们靠 **请求是不是登录接口**，不靠文案。

### 完成信号

你能在不写 axios 的情况下回答：

- 调用方拿到的是 `LoginResult` 还是整段信封。
- UI 从哪里读错误文案。
- 401 时 HTTP 层做什么、AuthGate 做什么。

### 自检问题

- 为什么 `ApiError` 要单独成类，而不是 `throw new Error(message)`？
  - 登录页和以后的 Query `onError` 需要区分未授权、业务失败和网络失败。`instanceof ApiError` 加上 `status` / `code` / `isUnauthorized` 是稳定分支；纯字符串 Error 只能解析文案。
- 为什么成功要解包 `data`，不要把信封传进页面？
  - 页面关心的是资源。信封是传输细节。每页都写 `res.code === 0` 会复制出 11 份分叉，也更容易把 `any` 带回来。
- 为什么本步不把「过期提示」写进 `ApiError`？
  - 提示是 UI。HTTP 只负责抛错和清态。文案在登录页或以后的 Query 错误态里决定。

---

## 检查点 2：axios 实例与 token 注入

### 当前问题

`LoginResult` 和 persist 已经能保存 token，但还没有任何请求会带 `Authorization`。token 也不能从 React 树里读：拦截器不是组件。

### 任务

在 `Admin-React/` 目录安装：

```bash
pnpm add axios
```

然后创建 axios 实例：

1. `baseURL` 使用 `env.VITE_API_BASE`（从 `@/shared/config` 导入），禁止业务代码再读 `import.meta.env.VITE_*`。
2. 请求拦截器：若 `useAuthStore.getState().token` 有值，设置 `Authorization: Bearer <token>`。
3. 拦截器内 **禁止** 使用任何 hook（`useAuthStore()`、`useNavigate()` 等）。
4. 不要解析 `localStorage.getItem('admin_token')`。persist 写入的是带 `state` 的 JSON，不是 JWT 字符串。

实例放在 `shared/api`。这是本步允许的一处「shared 读取 auth store」：01 契约已经点名 `authStore.getState()`，不要为此把 store 搬进 `shared`，也不要再抽一层 TokenProvider。其它 feature 仍然只通过 `shared/api` 发请求，禁止 `features/tag` 去 import `features/auth`。

本检查点先做到「能发出带正确 baseURL 的请求」。解包和 401 分流放到后面。

### 提示一

登录接口本身不需要鉴权。有 token 时带上 Bearer 也可以（后端会忽略），但 **不要** 用「当前有没有 token」判断这是不是登录请求。判断看 URL。

### 提示二

axios 1.x 自带类型，不必再装 `@types/axios`。实例用 `axios.create({ baseURL })`，不要每个函数 `axios.get` 散落默认实例。

### 常见错误

- 把 persist 的 JSON 整段当 token，请求头变成 `Bearer {"state":...}`。
- 在拦截器里 `useAuthStore((s) => s.token)`：hook 只能在组件或自定义 hook 顶层调用。
- `baseURL` 写成 `http://localhost:8080`，绕过 Vite 代理，开发时踩 CORS。
- `baseURL` 漏了 `/v1`，实际打到 `/admin/api/auth/login`。

### 完成信号

打开开发者工具 Network（此时若尚未接真登录，可用临时 `console` 调一次实例，测完删掉）：

- 请求 URL 以 `/admin/api/v1` 开头。
- 已登录时后续请求带 `Authorization: Bearer ...`，值与 store 里的 token 一致，不是 localStorage 原串。

### 自检问题

- 为什么 HTTP 用 `getState()`，AuthGate 用 selector？
  - 拦截器不在 React 渲染周期里，没有「订阅后重渲染」。它要的是发请求这一刻的快照。Gate 必须在 token 变化时重画，所以要 selector。
- 为什么不能把 token 通过函数参数从 LoginPage 一层层传进 axios？
  - 以后每个业务请求都要带 token。从页面传会让所有调用方依赖 UI。store 是会话的唯一来源。

---

## 检查点 3：按信封解包，失败则抛 `ApiError`

### 当前问题

axios 默认成功时给你 `AxiosResponse`；失败时抛 `AxiosError`。页面既不想看见 `response.data.data`，也不想自己解析两种错误。

### 任务

实现唯一的解包函数（名字自定），供后续 `get` / `post` 或拦截器调用：

- 从响应 body 读取 `ApiResponse<T>`。
- `code === 0`：返回 `data`（类型为 `T`）。
- 否则：`throw new ApiError(...)`，`message` 优先用信封的 `message`。
- HTTP 4xx/5xx 也走同一条解包，不要只处理 2xx。
- 没有 `response`（断网、代理失败）：仍然 throw，让调用方能 `catch`。此时没有信封，`isUnauthorized` 应为 `false`。

类型必须闭合：`get` / `post` 的返回是 `Promise<T>`，解包入参是 `ApiResponse<T>`。不要用 `any` 把 Axios 的 data 糊过去。

### 提示一

axios 默认 `validateStatus` 只把 2xx 当成功。本后端失败是 401 配 `{ code: 401, message }`，会进 **error** 分支。两条路都要解包时，抽出同一个函数，不要复制两份 `if (code === 0)`。

可选做法（选一种说得出理由即可）：

- 放宽 `validateStatus`，让 4xx 也进「有 response」的路径，再统一解包。
- 保持默认，在 success / error 拦截器里调用同一 unpack。

不要为了省事把拦截器返回值改成 `any`。

### 提示二

解包后的 `data` 在 TypeScript 里仍可能是 `T | undefined`（`noUncheckedIndexedAccess` / 可选字段）。登录成功时 `data` 必须是 `LoginResult`；若你选择在解包里对 `data` 做收窄，要保证失败码不会把 `undefined` 当成成功返回。

### 常见错误

- 只判断 HTTP 200，忽略 body 里的 `code`。
- 只判断 `code === 0`，4xx 时根本没读到 body。
- `throw error.response.data`，抛出去的不是 `Error`，`catch` 里拿不到 `message`。
- 解包写在 LoginPage，其它接口再抄一份。

### 完成信号

先不要接 UI。用临时调用或日志确认：

- 正确账号：返回值已经是 `LoginResult` 字段，而不是 `{ code, message, data }`。
- 错误密码：抛出的是 `ApiError`，`status` / `code` 为 401，`message` 来自后端（本仓库为 `invalid username or password`）。

确认后删掉临时调用。

### 自检问题

- 为什么解包属于 `shared/api`，不属于某个 feature？
  - 所有后台接口共用同一信封。解包是信任边界，只应有一份。
- 为什么不要在解包里 `message.error`？
  - 同一错误在登录页、表格、Dialog 里展示方式不同。HTTP 不知道当前 UI。01 契约禁止拦截器调 UI 库。

---

## 检查点 4：401 分流——清态，但不跳转

### 当前问题

AuthGate 已经能在「没 token 且不在登录页」时送去 `/login?redirect=...`。HTTP 层若再 `navigate`，会和 Gate 抢 URL。登录接口的 401 若也 `clear()` 并当成过期，输错密码会破坏登录页上的 `redirect`。

### 任务

在响应错误处理里加上且仅加上：

1. **非登录请求** 且 `status === 401`：调用 `useAuthStore.getState().clear()`，**不要**传 `skipRedirect`。
2. **登录请求** 的 401：只 throw `ApiError`，不清态。
3. 任何情况下拦截器都不调用路由 API、不调用 `message`。

如何识别登录请求：看这次 config 的 URL 是否为 `/auth/login`（相对 `baseURL`）。不要用「当前页面是不是 `/login`」——拦截器没有 location，也不该有。

本检查点不要改 AuthGate。401 后的跳转是 token 变空之后 Gate 的既有分支。主动退出仍然是 Layout 的 `clear({ skipRedirect: true })`。

```text
非登录 401
  → clear()           # skipRedirect 保持 false
  → Gate 发现没 token 且人还在业务页
  → /login?redirect=原地址

登录 401（错密码）
  → 不 clear
  → 人仍在 /login?redirect=...
  → 登录页 catch 后提示

主动退出（已实现，不要改）
  → clear({ skipRedirect: true })
  → 裸 /login
```

### 提示一

登录页在 Step 3 已经可能带着 `?redirect=/articles`。错密码如果触发「过期跳转」，常见后果是 `redirect` 被重写、套娃，或提示变成「请重新登录」而不是密码错误。

### 提示二

`clear()` 会触发订阅了 token 的组件重渲染。拦截器里再 `navigate('/login')` 没有必要，而且会和 Gate 的 `<Navigate replace>` 抢历史——这和 Step 3 禁止登录页自己 `navigate()` 是同一条规则。

### 常见错误

- 所有 401 都 `clear()`，登录失败把尚未登录的状态机搅乱（例如误设 skip、误改 persist）。
- 401 时 `clear({ skipRedirect: true })`，过期后回到裸登录页，丢了深链。
- 拦截器 `window.location.href = '/login'`，整页刷新且丢掉 redirect。
- 用 `message.includes('token')` 区分密码错误和过期。

### 完成信号

- 用错误密码提交登录：URL 仍停在登录页，`redirect` query 不变，Local Storage 没有被写成一份空会话之外的异常状态；若本来就未登录，persist 仍是空。
- 代码审查：拦截器文件里搜不到 `message`、`navigate`、`useNavigate`、`window.location`。

非登录 401 的端到端验证放到检查点 8（本步还没有业务 GET 页）。

### 自检问题

- 为什么登录 401 不能当成过期？
  - 本后端把「用户名或密码错误」也映射成 HTTP 401。过期语义是「已有会话作废」；登录页这时往往还没有有效会话，要保留用户正在看的 `redirect`。
- 为什么 401 不传 `skipRedirect`？
  - 过期发生在业务页上，用户期望重新登录后回到原页。`skipRedirect` 是主动退出的意图，和 401 相反。
- 为什么 `isUnauthorized` 为 true 仍可能不 `clear()`？
  - `isUnauthorized` 描述 HTTP 语义。清不清会话还要看是不是登录接口。两个条件是与，不是只看 401。

### 复盘：跳转为什么已经够了（2026-08-24）

Step 3 把「去哪」收成 `(token, URL, skipRedirect)` 的派生结果。本步只补上会改 `token` 的第二个写入点：

| 写入点 | 谁调用 | Gate 随后做什么 |
|---|---|---|
| 登录成功 | 登录页 `setAuth` | 有 token 还在 `/login` → 安全 redirect |
| 主动退出 | Layout `clear({ skipRedirect: true })` | 裸 `/login` |
| 非登录 401 | HTTP `clear()` | `/login?redirect=` |
| 登录 401 | 不写 store | 仍停在登录页 |

HTTP 如果再负责跳转，这张表会多出第五条命令式路径，Step 3 的 redirect 校验和 skip 标记都会被绕开。

---

## 检查点 5：泛型 `get<T>` / `post<T>`

### 当前问题

拦截器和解包若直接暴露 axios 实例，每个 feature 仍会写出 `res.data.data` 或把 `AxiosResponse` 传进页面。

### 任务

在 `shared/api` 导出（名称可微调，职责不能少）：

- `get<T>(url, config?) => Promise<T>`
- `post<T>(url, body?, config?) => Promise<T>`

要求：

- 调用方只传相对 `baseURL` 的路径，例如 `/auth/login`。
- 返回值已经是解包后的 `T`。
- 失败时 Promise reject 的是 `ApiError`（网络错误也应可 catch）。
- 本步不需要封装全部 HTTP 动词；没有 PUT/DELETE 的调用方，就不要先写。

`features/auth/api.ts` 将变成这两个函数的薄封装，而不是第二个 axios 实例。

### 提示一

把「解包 + 抛 ApiError」收进 `get`/`post`（或它们共用的 `request<T>`），拦截器专注 token 与 401 清态。返回类型在自己的函数上声明 `Promise<T>`，比强改 axios 拦截器的返回类型更不容易和 `AxiosResponse` 打架。

### 提示二

`T` 由调用方传入。登录写作 `post<LoginResult>('/auth/login', data)`。不要在 http 客户端内部写死 `LoginResult`。

### 完成信号

- 工程里没有业务文件 import axios 默认实例。
- `api.ts` 不再出现 `setTimeout` mock。
- `pnpm type-check` 能通过（可与检查点 6 一起验）。

### 自检问题

- 为什么现在不封装 `put` / `del`？
  - 没有调用方。Step 6 标签更新/删除时再加，避免空 API。
- 为什么 feature 的 `api.ts` 还要存在，不让页面直接 `post`？
  - 路径、请求体、返回类型是领域知识。页面应依赖 `login(data)`，而不是散落 URL 字符串。

---

## 检查点 6：替换 mock，登录页只在 UI 层处理失败

### 当前问题

mock 用 3 秒延迟和硬编码账号模拟成功。真接口会失败、会 401、会断网。当前 `LoginPage` 的 `onSubmit` 没有 `catch`，reject 会变成未处理 Promise。

### 任务

1. 改 `features/auth/api.ts`：
   - 删除 mock 与 `setTimeout`。
   - `login` 仍接受 schema 输出、返回 `Promise<LoginResult>`。
   - 内部只调用共享 `post`，路径为 `/auth/login`。
2. 改 `LoginPage.tsx`：
   - 成功：仍然只 `setAuth`，仍然可以由 UI 提示「登录成功」。不要新增 `navigate()`。
   - 失败：`catch` 后提示 `ApiError.message`（或等价的用户可读文案）。
   - 不要在这里解包信封，不要在这里 `clear()`。
3. `isSubmitting` 继续作为提交中状态。请求失败后按钮应恢复可点，以便改密码重试。

前置：本机 `course_server` 已在 `:8080` 运行，开发账号与提示文案一致（默认 `admin` / `admin123`）。

### 提示一

`unknown` 收窄：先 `instanceof ApiError`，再读 `message`。不要 `catch (e: any)`。非 `ApiError` 给一条通用失败文案即可。

### 提示二

RHF 的 `handleSubmit` 在 async 回调 reject 时仍会结束 `isSubmitting`。不要为失败再加一份 `loading` state。也不要用「请求中」再盖一层全屏 Spin——那就是全局 Loading 的变体。

### 常见错误

- 成功后再 `navigate('/dashboard')`，盖掉 `?redirect=/articles`。
- 把 401 提示写成「登录过期」。
- 失败时 `clear()`，把用户从带 redirect 的登录页清成莫名状态。
- 留下 mock 分支用环境变量切换，「开发走假数据」——本步目标就是真调。

### 完成信号

- 正确密码：进入 redirect 或 `/dashboard`，顶栏是后端返回的 username / role，refresh 仍在。
- 错误密码：停在登录页，字段下方或 message 有失败文案，`redirect` 还在。
- Network 里能看到 `POST /admin/api/v1/auth/login`，不再是 3 秒假延迟。

### 自检问题

- Step 4 替换真接口时，哪些文件应改，哪些不应重写？
  - 应改：`shared/api/*`（新建）、`features/auth/api.ts`、登录页的 `catch`。
  - 不应重写：`auth-store` 的 persist 契约、AuthGate 的跳转表、登录 schema、Layout 退出。
- 为什么成功提示可以在登录页，失败提示也在登录页，但不能进拦截器？
  - 这两次提示都发生在用户刚点「进入后台」的上下文。拦截器不知道这次请求是不是登录、该不该说话。

---

## 检查点 7：HTTP 行为测试

> **暂缓（2026-08-23）**：跳过本检查点。本步用「手动验证矩阵」代替。原文保留，供 Step 16 接入 Vitest 时使用。

### 测试目标

契约要求覆盖请求层行为，不测 axios 内部，不测组件样式：

```text
解包成功     → 返回 data，调用方拿到 T
业务码失败   → throw ApiError（code !== 0）
非登录 401   → 调用 clear()，不 navigate
登录 401     → throw ApiError，不调用 clear()
```

不要断言：

- axios 拦截器被注册了几次。
- persist 的 JSON 内部字段名。
- Ant Design `message` 是否被调用（那是 UI 层，可放登录页测试；HTTP 测试不要 mock 整个 antd）。

### 任务

Step 16 再做。建议届时：

- 用 axios mock adapter 或对 `get`/`post` 注入假 client，不要打真实 `:8080`。
- 每个用例重置 `useAuthStore`。
- 登录 URL 与其它 URL 至少各一条 401。

### 完成信号（Step 16 才执行）

```bash
pnpm test
pnpm verify
```

### 自检问题

- 为什么这些测试属于 HTTP 模块，而不是 LoginPage？
- 为什么 401 用例要断言「没有 navigate」，而不是断言「最终 URL 是登录页」？

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
- 测试已由 `test/http.test.ts` 覆盖（8 条）。

### 手动验证矩阵

前置：`course_server` 在 `http://localhost:8080`，前端 `pnpm dev` 在 **5174**。请逐条执行。

- 清空会话后打开 `/login`，用 `admin` / `admin123` 登录
  - Network 出现 `POST /admin/api/v1/auth/login`。
  - 进入 `/dashboard`。
  - 顶栏 username / role 来自接口，不是 mock 里的占位字符串。
- 清空会话后访问 `/articles`，再登录
  - 回到 `/articles`。
- 清空会话后访问 `/articles?page=2#body`，再登录
  - redirect 仍完整。
- 错误密码
  - 仍在登录页。
  - `redirect` 不被改写。
  - 有失败提示。
  - 没有全屏 Loading 遮罩。
- 快速连续点击提交
  - 提交中按钮不可用；不要靠「拦截器队列」当防重。
- 已登录访问 `/login`
  - 仍由 AuthGate 送走，HTTP 层不参与。
- 退出
  - 仍是裸 `/login`（本步不应破坏 Step 3）。
- 非登录 401（本步无业务 GET 页，用一次性控制台调用，**不要写成页面**）
  1. 先合法登录进入任意业务页。
  2. 在 persist 里把 `token` 改成明显假值，或直接 `useAuthStore.setState({ token: 'invalid' })`。
  3. 在控制台对共享客户端请求一次需鉴权接口（例如 `get('/tags')`）。
  4. 应被送去 `/login?redirect=...`（当前业务路径），而不是裸 `/login`。
  5. 测完不要把这次调用留在源码或某个按钮上。

说明：AuthGate **不校验 JWT 真伪**，只看 store 里有没有 token。伪造 token 时会先进入业务页，直到第一条需鉴权请求 401。这是预期，不是漏做守卫。

## 5. 失败时的最短排查路径

### 登录一直 pending / 失败但 Network 是 404

依次检查：

1. `course_server` 是否在 8080。
2. `baseURL` 是否为 `/admin/api/v1`。
3. 路径是否写成了 `/admin/api/v1/auth/login`（会和 baseURL 叠成双前缀）。
4. Vite proxy 是否仍指向 8080。

### 登录成功但立刻回到登录页

依次检查：

1. 解包是否真的返回了 `data.token`，还是把整段信封传给了 `setAuth`。
2. `setAuth` 是否在 `await login()` 之后执行。
3. persist 的 token 是否被 401 处理误 `clear()`（登录 401 分流是否误伤成功响应）。

### 错密码却变成「请重新登录」或 redirect 丢失

依次检查：

1. 是否对 `/auth/login` 的 401 调用了 `clear()`。
2. 拦截器是否 `navigate` / 改 `window.location`。
3. 登录页是否在 catch 里自己跳转。

### 已登录的业务请求没有 Authorization

依次检查：

1. 拦截器是否用 `getState().token`。
2. 是否误读 localStorage 原串。
3. 请求是否发生在 `setAuth` 之前。

### 类型检查对 `data` 报 possibly undefined

依次检查：

1. 是否把 `ApiResponse<T>['data']` 直接当 `T` 返回，没有收窄 `code === 0`。
2. 是否用 `any` 绕过而不是收窄。

### 控制台出现未处理的 Promise

登录页 `onSubmit` 是否缺少 `catch`；axios 错误是否在到达 UI 前被转换成 `ApiError` 并 reject。

## 6. 完成后应能口头回答

1. 信封 `{ code, message, data }` 在哪一层拆掉？调用方为什么只看到 `T`？
2. 为什么 axios 默认 4xx 会让「只在 then 里读 body」的解包失效？
3. 为什么 token 用 `getState()`，而 AuthGate 用 selector？
4. 为什么拦截器禁止 `message` 和 `navigate`？
5. 本后端登录失败为什么是 401？这对分流意味着什么？
6. 非登录 401 为什么调用不带 skip 的 `clear()`？
7. 为什么本步不预写其它域的 `api.ts`？
8. 为什么伪造 token 时 AuthGate 不会立刻踢人，必须等第一条 401？
9. `ApiError` 的 `status`、`code`、`isUnauthorized` 各给谁用？
10. Step 16 再答：为什么 HTTP 测试应 mock 网络，而不是打真实 8080？

## 7. 快速上手总结

### 必须掌握

- `axios.create`：为后台固定 `baseURL`，避免散落默认实例。
- 请求拦截器 + `getState()`：在非 React 环境注入 `Bearer` token。
- 信封解包：`code === 0` 返回 `data`，否则 `throw ApiError`。
- `ApiError`：把 HTTP/业务失败变成 UI 可分支的错误对象。
- 401 分流：非登录 `clear()`；登录只抛错。跳转仍归 AuthGate。
- 泛型 `get<T>` / `post<T>`：feature 的 `api.ts` 只描述领域，不碰信封。
- UI 层 `catch`：提示发生在用户动作处，不进拦截器。

### 按需了解

- axios `validateStatus`：想把 4xx 收进同一条解包路径时再用。
- PUT / DELETE 封装：第一个写接口需要时再加。
- 取消请求 / `AbortController`：本步没有列表页，不必做。
- axios retry：不要为登录失败自动重试。
- Testing Library / mock adapter：Step 16 再接入。

### 下一步

Step 4 验收通过后再进入 Step 5：

- 挂 `QueryClientProvider` 与默认 `staleTime`。
- 做 `AppFormDialog` / 查询态组件。
- **仍然不要**随便 GET；Query 的第一次合法使用是 Step 6 标签页。

## 8. 未验证项

- 本文没有替你实现 Step 4 源码。
- 检查点 7（Vitest：解包 / 401 分流）已暂缓，不在本步验收。
- 完成实现后，请以 `pnpm verify`、`pnpm build` 和「手动验证矩阵」为最终验收依据。
- 非登录 401 依赖控制台一次性请求；若跳过该条，须在 Step 6 第一条真列表请求时补验。
