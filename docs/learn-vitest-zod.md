# Zod 与 Vitest · 对本项目够用的一份

> 不是通用教程。只覆盖 `Admin-React/` 会用到的部分。  
> 对照你已有的：**TypeScript 类型、Vue Element `FormRules`、Go `json.Unmarshal` / `go test`**。  
> 当前仓库：Zod 已用于 env；Vitest 暂缓。读完能看懂现有代码，并知道后面 Step 会写成什么样。

冲突时以 [01 工程契约](./01-工程契约.md) 为准。

---

## 0. 先分清两件事

| | Zod | Vitest |
|--|-----|--------|
| 干什么 | **运行时**校验未知数据，并推出 TS 类型 | **跑测试**（Vite 原生，API 很像 Jest） |
| 本项目用在哪 | env、登录/CRUD 表单 schema | `pnpm test`；随 Step 锁行为 |
| 不是什么 | 不是 `shared/types` 的替代品 | 不是覆盖率工具；不测 store 内部字段名 |

一句话：

- TS `interface` = 编译期承诺，对 `import.meta.env`、表单字符串、接口 JSON **无效**。
- Zod schema = 运行时的那份承诺（类似 Go 把 JSON 解进 struct，解失败就 err）。
- Vitest = 把「合法通过 / 非法拒绝」写成可重复跑的 `assert`（类似 `go test`）。

Vue Admin 里 Element `FormRules` 是运行时校验，但和 `interface` 是两份手写。本项目用 **一份 zod schema** 同时服务表单和类型。

---

## 1. Zod

### 1.1 三个 API（先只记这些）

```ts
import { z } from 'zod'

const schema = z.object({
  name: z.string().min(1),
})

schema.parse({ name: '作文' })
// 成功 → 返回收窄后的数据；失败 → throw ZodError

const r = schema.safeParse({ name: '' })
// { success: true, data } | { success: false, error }
// 表单、测试用这个，不要用 try/catch 包 parse

type Input = z.infer<typeof schema>
// { name: string }  — 类型从 schema 推，不要再手写一份
```

和 Go 的对应：

| Zod | Go |
|-----|-----|
| `schema.parse(x)` | `json.Unmarshal` 失败直接 err；这里是抛错 |
| `schema.safeParse(x)` | 返回 `(value, err)`，不 panic |
| `z.infer<typeof schema>` | 从 struct 标签推断类型（TS 侧自动得到） |

启动期（env 缺了就不该跑）用 `parse`。用户输入用 `safeParse` 或交给 RHF resolver。

### 1.2 读本仓库已经写好的代码

[`src/shared/config/env.ts`](../src/shared/config/env.ts)：

```ts
const envSchema = z.object({
  VITE_API_BASE: z.string().min(1),
})

export type AppEnv = z.infer<typeof envSchema>

export const env: AppEnv = envSchema.parse({
  VITE_API_BASE: import.meta.env.VITE_API_BASE,
})
```

逐行：

1. `z.object`：描述「我们承认的 env 长什么样」。
2. `z.string().min(1)`：不能是 `undefined` / `""`。Vite 里没配的 `VITE_*` 是 `undefined`，TS 还觉得它是 `string`，这就是为什么不能散落 `import.meta.env.VITE_API_BASE`。
3. `z.infer`：`AppEnv` 跟 schema 锁死，改字段只改一处。
4. **模块加载时 `parse`**：缺变量进程直接炸，比跑到请求才发现好。
5. 业务代码只 `import { env } from '@/shared/config'`，读 `env.VITE_API_BASE`。

`main.tsx` 里的 `import '@/shared/config/env'` 是副作用：现在还没 HTTP 客户端引用 `env`，必须 import 一次才会 parse。Step 4 接上 `shared/api` 之后，这条副作用 import 可以拿掉。

接入 Vitest 时会把 `envSchema` **export** 出来测 `safeParse`，避免在测试里真去读 `import.meta.env`。那是后话，现在不用改。

### 1.3 本项目后面会写成什么样（先认形状，不要现在实现）

**分层（容易混）：**

| 层 | 放哪 | 例子 |
|----|------|------|
| 接口 DTO | `shared/types` | `Tag`、`Article`（后端已经校验过的形状） |
| 枚举选项 | `shared/constants/options.ts` | `STATUS_OPTIONS` + `EnableStatus` |
| **写表单输入** | `features/<域>/schemas.ts` | 登录、新建标签；**这才是 zod** |

DTO 用 `interface` 即可。Zod 打在**不信任的输入**：env、用户表单。不要给每个 API 响应用 zod 再 parse 一遍（Step 4 的边界是 `code === 0` + `ApiError`）。

**Step 3 登录**（对照 Vue [`Admin/src/views/login/index.vue`](../../Admin/src/views/login/index.vue) 的 `FormRules`）：

```ts
// 以后会落在 features/auth/schemas.ts
export const loginSchema = z.object({
  username: z.string().min(1, '请输入用户名'),
  password: z.string().min(1, '请输入密码'),
})

export type LoginValues = z.infer<typeof loginSchema>
```

Vue 的 `rules` + `reactive(form)` 拆成两份；这里 schema 既是校验也是 `LoginValues`。

接到 RHF（Step 3 才写，认这个接线即可）：

```ts
useForm<LoginValues>({
  resolver: zodResolver(loginSchema),
  defaultValues: { username: 'admin', password: '' },
})
```

Ant Design 输入框走 `Controller`，不要 `register` 硬套。校验失败的 `message` 落到对应 `Form.Item`。

**Step 6 标签**（对照 Vue tag 页 `name: required`）：

```ts
export const tagSchema = z.object({
  name: z.string().min(1, '请输入标签名'),
  sortOrder: z.number().int(),
  status: z.union([z.literal(0), z.literal(1)]), // EnableStatus
})
```

`status` 不要写成 `z.number()`：`shared/constants` 已经把 `0 | 1` 收紧了，schema 跟它对齐。

需要「选项里的字符串联合」时：

```ts
const CONTENT_TYPES = ['unit_guide', 'unit_writing', 'material', 'other'] as const
z.enum(CONTENT_TYPES)
```

这和 `options.ts` 里 `as const` + `(typeof X)[number]['value']` 是同一类收紧，只是一个给 TS 编译期，一个给运行时。

### 1.4 刻意先不学的

`coerce`、`transform`、`refine`/`superRefine`、异步 refine、zod 当 axios 响应解码器。等表单出现「空 HTML 算空」（Step 12）再补 `refine`。

---

## 2. Vitest

Vue Admin **没有**测试。你这边对照物是 `course_server` 的 `go test`，不是 Element 页面。

### 2.1 和 `go test` 差在哪

| 点 | `go test` | Vitest |
|----|-----------|--------|
| 文件 | `*_test.go` | `*.test.ts` / `*.spec.ts` |
| 函数 | `func TestXxx(t *testing.T)` | `it('...', () => { ... })` |
| 失败 | `t.Fatalf` | `expect(x).toBe(y)` 抛错 |
| 表格 | `[]struct` + `t.Run` | `it.each` / `test.each` |
| 跑 | `go test ./test/...` | `pnpm test`（Vite 直接转 TS，不用另配 Jest transformer） |
| DOM | 无 | 组件测试用 **jsdom** + Testing Library |

`describe` / `it` / `expect` 和 Jest 同款。你若写过 Jest，Vitest 几乎零迁移；没写过就把它当成带 `expect` 的 `go test`。

Testing Library（RTL）测的是 **用户能看见/点到的行为**，不测 `useState` 叫什么、不测 Zustand 字段名。契约原话：测行为，不测实现细节。

### 2.2 本项目测什么（按 Step，不是按覆盖率）

来自 [01 工程契约](./01-工程契约.md)：

| 时机 | 测什么 | 不测什么 |
|------|--------|----------|
| Step 1 | `envSchema`：有 `VITE_API_BASE` 通过；空字符串拒绝 | 不测 Vite 本身 |
| Step 3 | 无 token 打开受保护路由 → 登录页 | 不测 persist 内部 key 拼法（token key 产品规则仍是 `admin_token`） |
| Step 4 | `code === 0` 解包；`code !== 0` 抛 `ApiError`；401 清态；登录 401 不按过期跳转 | 不测 axios 源码 |
| Step 6+ | 每个写表单 schema：合法通过 / 非法拒绝 | 不测「Ant 弹窗开没开」的实现细节 |
| Step 6 | `queryKey` 工厂含 keyword / page / pageSize | 不打真网络 |

Vitest 暂缓期间：`pnpm verify` = lint + type-check。接上之后变回 `lint && type-check && test`。

### 2.3 Step 1 smoke 会长这样（认形状即可）

文件建议：`src/shared/config/env.test.ts`  
（feature 域则放 `features/<域>/__tests__/xxx.test.ts`）

```ts
import { describe, expect, it } from 'vitest'
import { envSchema } from './env'

describe('envSchema', () => {
  it('合法 base 通过', () => {
    const r = envSchema.safeParse({ VITE_API_BASE: '/admin/api/v1' })
    expect(r.success).toBe(true)
  })

  it('空字符串拒绝', () => {
    const r = envSchema.safeParse({ VITE_API_BASE: '' })
    expect(r.success).toBe(false)
  })
})
```

要点：测 **schema**，不要 `import { env }`。`env` 在模块加载时已经 `parse(import.meta.env)`，单测里很难稳定控制。

Step 6 schema 测试同构：`tagSchema.safeParse({ name: '记叙', sortOrder: 0, status: 1 })` 通过；`name: ''` 失败。这就是「合法通过 / 非法拒绝」，不需要 RTL。

### 2.4 组件测试（Step 3 才需要，现在扫一眼）

```ts
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'

it('无 token 访问受保护路由会到登录页', () => {
  // 清掉 admin_token 后 render 带 AuthGate 的路由
  expect(screen.getByText('登录')).toBeInTheDocument()
})
```

记住口令：**render 真实 UI → 断言用户看见的字/跳转**。不要 `expect(store.getState().xxx)`。

### 2.5 接入时工程上会多这几行（现在不要装）

- 依赖：`vitest`、`jsdom`、`@testing-library/react`、`@testing-library/jest-dom`
- `package.json`：`"test": "vitest run"`，`verify` 补上 `&& pnpm test`
- `vite.config.ts` 增加 `test: { environment: 'jsdom' }`（和 Vite 共用 alias `@/`）

跑法：`pnpm test`；开发时可 `pnpm exec vitest` 看 watch。

---

## 3. 和本项目目录的对应

```text
src/shared/config/env.ts          ← 现在：zod parse env
src/shared/config/env.test.ts     ← Step 1 smoke（暂缓）
src/shared/types/                 ← DTO，不用 zod
src/shared/constants/options.ts   ← as const 联合，给 DTO 和以后的 z.enum 对齐
src/features/auth/schemas.ts      ← Step 3 登录 zod
src/features/tag/schemas.ts       ← Step 6 第一条 CRUD schema
src/features/tag/__tests__/       ← schema 测试；不要测网络
```

---

## 4. 读完能口头答出这 5 句就算过关

1. 为什么 `import.meta.env.VITE_API_BASE` 不能满项目散落？（TS 骗你它一定是 string；zod parse 才是信任边界。）
2. `shared/types` 的 `Tag` 和 `features/tag/schemas.ts` 各管什么？
3. 表单为什么不用 Ant Design Form 的 rules，而用 zod + RHF？
4. Step 1 的测试为什么测 schema 而不是测 `env` 常量？
5. AuthGate 测试为什么不断言 store 字段名？

对应 [02 技能自查](./02-技能自查.md) 里 env zod、RHF + zod、Vitest + RTL 那几行。

---

## 5. 建议阅读顺序

1. 把本文 §1.2 对着 `env.ts` 看一遍（现在就能做）。
2. 做 Step 2 Layout，不必碰 zod/vitest。
3. Step 3 前：把 §1.3 登录 schema + §2.4 扫一遍，再写代码。
4. Step 6 前：把 tag schema + `safeParse` 测试抄成那个域的 `__tests__`。

官方文档（需要查 API 时再点，不必先读完）：

- [Zod](https://zod.dev/)
- [Vitest](https://vitest.dev/)
- [Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
