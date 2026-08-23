# Step 3 引导式开发：Auth、登录页与路由守卫

> 本文对应 [03-开发计划](./03-开发计划.md) 的 Step 3。  
> 它是一份任务引导，不提供可以整段复制的最终实现。请先自己完成每个检查点，卡住后再展开提示。  
> 质量要求以 [01-工程契约](./01-工程契约.md) 为准。

## 测试暂缓（2026-08-23）

本步 **跳过** 检查点 0（测试基线）和检查点 7（路由行为测试）。  
Vitest / RTL 延后到全部业务开发完成后统一接入（见 [03-开发计划](./03-开发计划.md) Step 16）。  
原文保留，供以后接入时对照。本步从 **检查点 1** 开始；验收以「手动验证矩阵」+ `pnpm verify`（lint + type-check）为准。

## 1. 本步目标

基于 Step 2 已完成的路由和 Layout，实现完整的客户端登录态闭环：

```text
未登录访问业务页
  → AuthGate 记录原目标地址
  → 跳转登录页
  → mock 登录成功
  → Zustand persist 保存会话
  → 回到原目标地址

已登录访问登录页
  → 跳转 Dashboard

点击退出
  → 清空会话
  → 回到登录页
```

完成后必须满足：

- 无 token 访问 `/articles`，进入 `/login?redirect=...`。
- 登录成功后优先回到 `redirect`，没有合法 `redirect` 时进入 `/dashboard`。
- 已登录访问 `/login`，直接进入 `/dashboard`。
- 顶栏展示 `username` 和 `role`。
- 退出后清空 token 与管理员信息，并回到登录页。
- 持久化 key 为 `admin_token`，组件中不散落 `localStorage.setItem`。
- 登录表单只使用 Zod + RHF 管状态和校验。
- 提交期间按钮不可重复触发。
- `pnpm verify` 通过（lint + type-check；本步不要求 Vitest）。

## 2. 本步边界

本步只实现客户端鉴权流程。

本步允许：

- 使用异步 mock 登录函数生成临时 `LoginResult`。
- mock token 使用明显的开发占位值。
- 登录成功后在 UI 层显示提示。

本步禁止：

- 提前创建 Axios 客户端或 `ApiError`。
- 调用真实 `/auth/login` 接口。
- 在拦截器中跳转或弹消息。
- 实现 401 清态；它属于 Step 4。
- 把文章、标签等服务端数据放进 Zustand。
- 为学习 Zustand 新增 Counter 或其它演示页。
- 修改只读对照项目 `Admin/`。

## 3. 开始状态与文件范围

开始前应保持 Step 2 的状态：

- `/login` 与 11 个业务路由已存在。
- 业务路由位于 `AdminLayout` 下。
- 未知路径会重定向 `/dashboard`。
- 页面使用路由 `lazy`。
- 当前 `LoginPage` 仍是占位页。
- 顶栏用户名仍是硬编码文本。

本步预计新增或修改：

```text
src/
├── app/
│   ├── layouts/
│   │   └── AdminLayout.tsx
│   └── router/
│       ├── AuthGate.tsx
│       └── index.ts
├── features/
│   └── auth/
│       ├── auth-store.ts
│       ├── schemas.ts
│       ├── pages/
│       │   ├── LoginPage.tsx
│       │   └── LoginPage.module.css
```

本步 **不要** 安装测试依赖，也不要改 `package.json` 的 `verify` / `vite.config.ts` 的 test 配置。`__tests__/` 与 `src/test/setup.ts` 延后到 Step 16。

文件名可以小幅调整，但业务代码必须留在 `features/auth`，路由守卫必须留在应用壳 `app/router`。

## 4. 使用方式

每个检查点按下面顺序完成：

1. 只看“任务”和“完成信号”，先自己设计。
2. 卡住时再看“提示一”。
3. 仍无法推进再看“提示二”。
4. 完成后回答“自检问题”，不要只看页面能否点击。
5. 每个检查点结束都运行最小验证，不要最后一次性排错。
6. **跳过检查点 0 和检查点 7**（测试，已暂缓）。

---

## 检查点 0：先补齐测试基线

> **暂缓（2026-08-23）**：跳过本检查点，直接做检查点 1。原文保留，供 Step 16 接入 Vitest 时使用。

### 当前问题

Step 3 强制要求 RTL 行为测试，但当前项目还没有 Vitest、jsdom、Testing Library 和 `test` 脚本。直接实现 AuthGate 会再次形成“功能完成、质量门没覆盖测试”的欠账。

### 任务

在 `Admin-React/` 目录安装测试依赖：

```bash
pnpm add -D vitest jsdom @testing-library/react @testing-library/user-event @testing-library/jest-dom
```

然后完成以下配置：

1. `package.json`
   - 增加单次执行的 `test` 脚本。
   - 把 `test` 接入 `verify`，顺序保持 `lint → type-check → test`。
2. `vite.config.ts`
   - 配置测试环境为 `jsdom`。
   - 配置统一 setup 文件。
   - 若 TypeScript 不认识 `test` 配置，使用 `vitest/config` 提供的 `defineConfig`。
3. `src/test/setup.ts`
   - 注册 `@testing-library/jest-dom/vitest`。
4. `src/shared/config/env.ts`
   - 导出 `envSchema`，但仍保留启动时对实际 env 的解析。
5. `src/shared/config/env.test.ts`
   - 合法的 `VITE_API_BASE` 应通过。
   - 空字符串应失败。

### 提示一

测试 `envSchema`，不要直接 import 已经执行 `parse(import.meta.env)` 的 `env`。前者是纯输入输出，后者依赖 Vitest 启动时的环境。

### 提示二

`test` 脚本应当执行一次后退出，不能把 watch 模式接进 `verify`，否则质量门不会正常结束。

### 完成信号

在 `Admin-React/` 目录执行：

```bash
pnpm test
pnpm verify
```

预期：

- env smoke 测试通过。
- `verify` 依次完成 lint、类型检查和测试。
- 命令正常退出，不进入 watch。

### 自检问题

- 为什么测试 `envSchema` 比测试 `env` 稳定？
- 为什么 `verify` 不能调用 Vitest watch 模式？
- jsdom 与真实浏览器的能力边界是什么？

---

## 检查点 1：先设计 Auth 状态，不急着写 UI

### 当前问题

登录页、AuthGate 和顶栏都会使用登录态。如果先在页面中各写一份 token、用户名或 localStorage 逻辑，状态会立刻分叉。

### 任务

先在纸面或注释中确定 `features/auth/auth-store.ts` 的最小公开契约。

状态只需要：

- `token`：未登录时为空。
- `adminInfo`：未登录时为 `null`，登录后包含 `adminId`、`username`、`role`。

动作只需要：

- `setAuth(result)`：从 `LoginResult` 一次写入 token 与管理员信息。
- `clear()`：一次清空完整会话。

持久化要求：

- 使用 Zustand `persist` middleware。
- storage key 固定为 `admin_token`。
- 只持久化 token 与管理员信息。
- 不持久化 actions、loading、error 或可推导状态。

不要额外保存 `isLoggedIn`。它始终可以由 token 是否存在推导，重复存储会产生不一致状态。

### 提示一

`LoginResult` 已存在于 `shared/types`，不要在 auth feature 中再复制一份返回类型。`AdminInfo` 可以从该结果中抽取，也可以在 auth feature 中声明最小类型。

### 提示二

使用 middleware 时，Zustand 的 TypeScript 写法通常是先调用带泛型的 `create`，再把 `persist(...)` 结果交给它。已有学习笔记 [07-learn-zustand.md](./07-learn-zustand.md) 的“持久化”和“完整 auth store”章节可作为 API 参考，但不要复制其中与本项目字段不一致的示例。

### 关键边界

标准 Zustand persist 会把状态序列化后写到 `admin_token`，因此后续 HTTP 层必须通过 store 的 `getState()` 读取 token，不能假设 localStorage 中存的是裸 token 字符串。

本步只要求 storage key 与契约一致，不要为兼容 Vue 的内部存储格式自行实现一套 storage adapter。

### 完成信号

打开浏览器开发者工具，完成一次 mock 登录后检查：

- Local Storage 出现 `admin_token`。
- 刷新页面后登录态仍存在。
- 调用 `clear()` 后 token 和管理员信息同时为空。
- 没有第二个业务组件直接调用 `localStorage.setItem`。

### 自检问题

- 为什么 token 适合 Zustand，而文章列表不适合？
- 为什么 `isLoggedIn` 不应作为独立 state？
- 为什么 Step 4 的 HTTP 客户端应使用 `getState()`，而 React 组件应使用 selector？

---

## 检查点 2：定义登录表单的数据契约

### 当前问题

Vue 页面使用 Element FormRules；React 工程契约要求 Zod 是唯一校验源，RHF 是唯一表单状态源。

### 任务

在 `features/auth/schemas.ts` 定义登录 schema：

- `username`
  - 必填。
  - 输入仅为空白字符时也应失败。
  - 错误文案为“请输入用户名”。
- `password`
  - 必填。
  - 错误文案为“请输入密码”。

从 schema 推导表单值类型，不要再手写一份重复 interface。

不要擅自增加“密码至少 8 位”等产品规则。当前 Vue 页面只要求非空；真实密码强度由后端设置流程决定。

### 提示一

用户名可以在校验前后处理首尾空白；密码不要默认 `trim`，空格可能属于合法密码内容。

### 提示二

登录表单没有 `coerce` 或 `transform` 造成的输入输出差异时，可以使用较简单的 RHF 泛型。需要回顾 `input` 与 `output` 时看 [05-learn-zod-rhf.md](./05-learn-zod-rhf.md)。

### 完成信号

使用 `safeParse` 手动检查：

- 合法用户名和密码通过。
- 空用户名失败。
- 只有空格的用户名失败。
- 空密码失败。

### 自检问题

- 为什么 TypeScript 类型不能代替这里的 Zod？
  - TS 只在编译期存在。用户提交的是运行时字符串，编译器管不到。Vue 的 `FormRules` + 手写 interface 是两份契约，这里 Zod 一份同时管校验和类型。
- 为什么不应为了“更安全”自行加入 Vue 与接口都不存在的密码长度规则？
  - 当前 Vue 页和接口都只要求非空。强度由后端设密流程决定。前端多一条「至少 8 位」会和产品、后端、后续真实登录不一致。
- 为什么密码字段通常不应自动 trim？
  - 空格可以是合法密码内容。trim 会把 `" secret "` 变成 `"secret"`，校验过了、后端对不上。用户名 trim 是规范化展示标识，密码是密钥，两条规则不一样

---

## 检查点 3：把 AuthGate 放进正确的路由层级

### 当前问题

当前所有业务路由都可直接访问。若在每个页面单独判断 token，会产生 11 份重复逻辑；若照搬 Vue `beforeEach`，又会把副作用堆进路由表。

### 任务

创建 `app/router/AuthGate.tsx`，让它负责两条规则：

1. 当前是 `/login` 且已有 token：重定向 `/dashboard`。
2. 当前不是 `/login` 且没有 token：重定向登录页，并携带完整目标地址。
3. 其它情况：渲染下一层路由出口。

目标地址应包含：

- `pathname`
- `search`
- `hash`

登录跳转应使用 `replace`，避免浏览器后退后再次落回守卫前的无效页面。

推荐先画出目标结构，再修改路由：

```text
根 App
└── AuthGate
    ├── /login
    └── AdminLayout
        ├── /dashboard
        ├── /articles
        └── 其它业务路由
```

保持以下既有行为不变：

- 根路径进入 `/dashboard`。
- 未知路径进入 `/dashboard`。
- 所有页面继续 lazy 加载。
- Error Boundary 与加载 fallback 仍存在。

### 提示一

AuthGate 需要读取当前位置、执行声明式重定向并渲染子路由出口。对应的 React Router API 分别是位置 hook、`Navigate` 和 `Outlet`。

### 提示二

不要在路由模块顶层读取一次 token。模块顶层读取不会订阅 store，登录后路由守卫可能仍使用旧值。组件中使用 Zustand selector 才会响应更新。

### 常见错误

- 把 `/login` 放进只允许已登录用户进入的 AdminLayout，导致重定向循环。
- 只保存 `pathname`，丢掉筛选 query。
- 使用 `navigate()` 写进 effect，制造不必要的命令式副作用。
- `<Navigate>` 没有 `replace`，退出后浏览器历史记录反复跳转。
- 为每个业务路由复制一次守卫。

### 完成信号

清空 Local Storage 后手动访问：

```text
/articles?page=2#editor
```

登录页 URL 中的 `redirect` 解码后应仍为：

```text
/articles?page=2#editor
```

### 自检问题

- 为什么 AuthGate 是组件，而不是普通工具函数？
- 为什么它需要 selector，而不是 `getState()`？
- 为什么声明式 `<Navigate>` 比 effect 中调用 `navigate()` 更适合当前场景？

---

## 检查点 4：实现 RHF + Zod 登录表单

### 当前问题

当前登录页只是占位文本。需要实现表单，但不能同时使用 Ant Design Form 状态和 RHF 状态。

### 任务

修改 `features/auth/pages/LoginPage.tsx`：

1. 使用 `useForm` 创建唯一表单实例。
2. 使用 `zodResolver` 接入登录 schema。
3. 为 username 和 password 提供明确的默认值。
4. Ant Design `Form` 只负责布局和提交语义。
5. Ant Design `Input` 与 `Input.Password` 通过 `Controller` 接入 RHF。
6. Zod 错误显示在对应 `Form.Item`。
7. 提交按钮同时表现 loading 和 disabled。
8. Enter 键可以通过标准 form submit 触发登录，不再手写键盘监听。

可以参考 Vue 页的产品内容：

- 标题“欢迎回来”。
- 用户名、密码两个字段。
- 按钮文案“进入后台”。
- 开发环境账号提示。

视觉实现不要求逐像素复制 Vue，但必须具备：

- 清楚的 label。
- 密码隐藏与显示能力。
- 错误文案。
- 键盘可提交。
- 移动端不溢出。

### 提示一

Ant Design 的输入组件是受控组件。本项目统一使用 `Controller`，不要对一个字段同时使用 `register`、Ant Form `rules` 和 RHF。

### 提示二

`formState.isSubmitting` 会在异步提交 Promise 完成前保持为 true。不要再创建第二份 `loading` state。

### 常见错误

- 使用 `Form.useForm()` 再使用 RHF，形成两套值。
- schema 中有错误文案，`Form.Item` 却没有读取 RHF errors。
- 按钮只有 loading，没有 disabled，仍可被重复触发。
- 按钮未设置提交类型，只靠 `onClick`。
- 忘记 `defaultValues`，输入框从 uncontrolled 切换为 controlled。

### 完成信号

- 两个字段为空时提交，接口或 mock 不执行。
- 错误出现在对应字段下方。
- 输入合法值后可以提交。
- 按 Enter 与点击按钮行为相同。
- 提交期间重复点击不会产生第二次登录。

### 自检问题

- Zod、RHF、resolver、Ant Form.Item 各负责什么？
- 为什么这里不需要额外 `useState` 保存表单值和 loading？
- 为什么 Ant Input 应使用 `Controller`？

---

## 检查点 5：接入临时 mock 登录与安全 redirect

### 当前问题

Step 4 才连接真实登录接口，但本步必须跑通“提交 → 保存会话 → 回跳”的完整客户端流程。

### 任务

在 auth feature 内提供一个明确标注为 Step 3 临时实现的异步 mock 登录边界：

- 输入为 schema 校验后的用户名和密码。
- 输出形状必须复用 `LoginResult`。
- 返回 token、adminId、username、role。
- 不保存密码。
- 不访问真实网络。
- Step 4 可以用真实 `login()` 替换这一边界，而不重写表单和 store。

登录成功后的顺序：

1. 等待 mock 登录完成。
2. 调用 store 的 `setAuth`。
3. 读取并校验 `redirect`。
4. 使用 replace 导航到目标页。

`redirect` 来自 URL，属于不可信输入。只接受本站内部绝对路径：

- 必须以单个 `/` 开头。
- 不能以 `//` 开头。
- 不满足条件时使用 `/dashboard`。

不要把完整 URL 或 `javascript:` 等内容直接交给导航。

### 提示一

URLSearchParams 只负责读取字符串，不会替你判断它是否为本站安全路径。

### 提示二

先把“决定最终跳转目标”写成一个小纯函数，再让登录页调用。这样可以用少量输入直接验证边界，也避免 JSX 中堆三元表达式。

### 完成信号

依次验证：

1. 直接打开 `/login`，登录后进入 `/dashboard`。
2. 未登录打开 `/articles`，登录后回到 `/articles`。
3. `/login?redirect=https://example.com` 登录后仍进入 `/dashboard`。
4. `/login?redirect=//example.com` 登录后仍进入 `/dashboard`。

### 自检问题

- 为什么 mock 登录也应返回真实 `LoginResult` 形状？
- 为什么 store 更新必须发生在导航之前？
- 为什么 redirect 必须视为不可信输入？

---

## 检查点 6：让 Layout 消费登录态并完成退出

### 当前问题

顶栏仍显示硬编码“管理员”，无法证明登录信息真正进入了共享客户端状态。

### 任务

修改 `AdminLayout.tsx`：

- 使用精确 selector 分别读取 `adminInfo` 和 `clear`。
- 展示 username 与 role。
- 提供明确的退出入口。
- 退出时先清状态，再 replace 到 `/login`。

本步不要求照搬 Vue 的视觉样式，但不要保留硬编码用户名。

若增加退出确认：

- 确认弹窗属于 UI 层，可以使用 Ant Design。
- 取消时不得清空状态。
- 不要把确认逻辑放进 Zustand action；store 的 `clear()` 只负责状态。

### 提示一

不要使用不带 selector 的完整 store 订阅。用户名变化不应让组件订阅无关字段。

### 提示二

退出后 AuthGate 也会发现 token 为空，但按钮事件仍应明确导航到 `/login`，让用户行为立即可预测。

### 完成信号

- 登录后顶栏显示 mock 返回的 username 与 role。
- 刷新页面后仍显示。
- 退出后 Local Storage 会话被清理。
- 地址变为 `/login`。
- 浏览器后退不能重新进入已退出的业务页。

### 自检问题

- 为什么退出确认属于组件层，而 `clear()` 属于 store？
- 为什么组件使用 selector，而 Step 4 HTTP 层使用 `getState()`？
- 为什么退出导航应使用 replace？

---

## 检查点 7：写路由行为测试

> **暂缓（2026-08-23）**：跳过本检查点。本步用「手动验证矩阵」代替 RTL。原文保留，供 Step 16 接入时使用。

### 测试目标

契约要求验证用户可观察行为：

```text
没有 token
  + 初始地址是 /articles
  → 用户看到登录页
  + 当前地址保留 redirect=/articles
```

不要断言：

- Zustand middleware 内部字段。
- AuthGate 内部调用了几次 selector。
- `Navigate` 组件是否存在。
- localStorage 中 JSON 的内部序列化细节。

### 任务

为了复用生产路由配置进行测试，可以把路由对象数组作为命名导出：

- 生产环境仍用 `createBrowserRouter`。
- 测试使用同一数组创建 memory router。
- 初始地址设为 `/articles`。
- 清理持久化登录态。
- 渲染真实 RouterProvider。
- 断言登录页的可见标题或表单。
- 断言 memory router 当前地址是 `/login`，且 redirect 解码后为 `/articles`。

每个测试前必须重置：

- localStorage。
- Zustand store 的登录状态。

至少完成契约要求的一条测试。建议再补两条高价值行为：

- 已登录访问 `/login` 会进入 `/dashboard`。
- 合法 redirect 登录后会回到原页面。

### 提示一

测试路由行为时，memory router 比修改 `window.location` 更稳定，也不会真的刷新 jsdom 页面。

### 提示二

断言用户看到登录表单，比断言某个内部函数被调用更接近真实需求。查询优先使用 role 和可访问名称。

### 常见错误

- import 已创建好的 BrowserRouter，导致测试依赖浏览器历史。
- 测试之间共享持久化 token，单独运行通过、整组运行失败。
- 忘记等待 lazy route 完成。
- 用 className 或组件内部变量做断言。
- mock 掉整个 AuthGate，最后只验证了自己的 mock。

### 完成信号

在 `Admin-React/` 目录执行：

```bash
pnpm test
```

预期：

- 路由行为测试稳定通过。
- 单独运行该文件和运行全部测试结果一致。
- 控制台没有未处理 Promise、`act(...)` 或路由警告。

### 自检问题

- 为什么应复用生产 routes，而不是在测试里重写一套简化路由？
- 为什么这个测试属于集成行为测试，不是 store 单元测试？
- 为什么断言页面内容比断言 `<Navigate>` 更稳定？

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
- （Vitest 延后到 Step 16，本步不要求 `pnpm test`。）

### 手动验证矩阵

请逐条执行，不要只验证一次登录：

- 清空会话后访问 `/articles`
  - 应进入登录页。
  - redirect 应保留 `/articles`。
- 清空会话后访问 `/articles?page=2#body`
  - redirect 应保留 pathname、search 和 hash。
- 登录成功
  - 应回到合法 redirect。
  - 顶栏显示 username 与 role。
- 刷新业务页
  - 登录态仍存在。
- 已登录访问 `/login`
  - 应进入 `/dashboard`。
- 点击退出
  - 状态和持久化数据被清空。
  - 应进入 `/login`。
- 退出后浏览器后退
  - 不能重新看到受保护业务页。
- 输入空用户名或空密码
  - 对应字段显示错误。
  - mock 登录不执行。
- 快速连续点击提交
  - 只产生一次登录流程。
- 传入外部 redirect
  - 应回退 `/dashboard`，不能离开本站。

## 5. 失败时的最短排查路径

### 登录后仍被送回登录页

依次检查：

1. `setAuth` 是否在导航前执行。
2. AuthGate 是否使用 selector 订阅 token。
3. store 中 token 的空值约定是否前后一致。
4. persist 是否只保存了错误字段。

### 刷新后丢登录态

依次检查：

1. 是否真的使用 `persist` middleware。
2. storage key 是否为 `admin_token`。
3. `partialize` 是否包含 token 与 adminInfo。
4. 是否有初始化代码在刷新时立即调用 `clear()`。

### 登录页和 Dashboard 无限跳转

依次检查：

1. `/login` 是否错误地放在 AdminLayout 的受保护子路由中。
2. AuthGate 的两个分支条件是否互斥。
3. 空 token 是否被当成已登录。
4. Navigate 的目标是否又落回当前地址。

### 表单始终拿不到值

依次检查：

1. Ant 输入组件是否由 `Controller` 接管。
2. `Controller` 是否拿到同一个 `control`。
3. 字段 name 是否与 schema 一致。
4. 是否同时启用了 Ant Form 自己的 model/rules。

### 测试偶发失败

依次检查：

1. 每个测试前是否清空 localStorage。
2. store 是否重置。
3. lazy 页面是否使用异步查询等待出现。
4. memory router 是否每个测试独立创建。
5. 测试是否依赖执行顺序。

## 6. 完成后应能口头回答

1. 为什么 token 放 Zustand，文章列表以后放 TanStack Query？
2. Zustand `persist` 的 `name`、`partialize` 分别控制什么？
3. AuthGate 为什么使用 selector，而 HTTP 客户端以后使用 `getState()`？
4. `<Navigate replace>` 与命令式 `navigate()` 在本场景的差异是什么？
5. redirect 为什么必须保留 query/hash，又为什么必须做内部路径校验？
6. Zod、RHF、resolver、Ant Design 各自负责什么？
7. 为什么提交中状态用 `isSubmitting`，不另建 loading？
8. （Step 16 再答）为什么路由测试应断言用户看到登录页，而不是测试 store 私有字段？
9. Step 4 接真实接口时，哪些文件应替换，哪些文件不应重写？

## 7. 快速上手总结

### 必须掌握

- Zustand `create`：创建 auth store。
- Zustand `persist`：持久化客户端会话。
- Zustand selector：让组件只订阅实际使用的字段。
- React Router `Navigate`：声明式重定向。
- React Router `Outlet`：让 AuthGate 渲染通过守卫的子路由。
- React Router location：生成 redirect 原目标地址。
- Zod schema：提供登录输入的唯一校验规则。
- RHF `useForm`：管理表单状态和提交状态。
- RHF `Controller`：连接 Ant Design 受控输入。
- `zodResolver`：把 Zod 错误映射为 RHF errors。

### 按需了解

- Testing Library：从用户行为验证路由守卫（Step 16 统一接入，本步用手动矩阵代替）。

- Zustand `migrate`：持久化结构上线并发生版本变化时再用。
- Zustand `useShallow`：一次选择多个值且确实返回新对象时再用。
- React Router loader：本项目禁止用它拉业务数据。
- E2E：完整真实登录链路以后可以用 Playwright 验证；本步先用手动矩阵。

### 下一步

Step 3 验收通过后再进入 Step 4：

- 用真实登录 API 替换 mock 登录边界。
- HTTP 客户端通过 `authStore.getState()` 读取 token。
- 业务码失败抛 `ApiError`。
- 401 只清理 auth 状态，不在拦截器里直接操作 UI 或路由。

## 8. 未验证项

- 本文没有替你实现 Step 3 源码。
- 检查点 0 / 7（Vitest 基线与路由行为测试）已暂缓，不在本步验收。
- 完成实现后，请以 `pnpm verify`、`pnpm build` 和「手动验证矩阵」为最终验收依据。
