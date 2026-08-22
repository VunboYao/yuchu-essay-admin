# Zod 与 React Hook Form：各自独立，如何接线

> 通用说明，不绑定任何业务仓库。对照物：TypeScript 类型、Vue Element / Ant Design Form、vee-validate、Go `json.Unmarshal`。  
> 本仓库落地约定见 [learn-vitest-zod.md](./learn-vitest-zod.md) 与 [01 工程契约](./01-工程契约.md)；冲突时契约赢。

官方入口：

- [Zod](https://zod.dev/)
- [React Hook Form](https://react-hook-form.com/)
- [`@hookform/resolvers`](https://github.com/react-hook-form/resolvers)

---

## 0. 结论：两个独立库，第三包才是胶水

**Zod 和 React Hook Form（RHF）完全独立。** 它们不是同一作者、不互相 import、安装其中一个不会带上另一个。

|          | Zod                                                  | React Hook Form                                                       |
| -------- | ---------------------------------------------------- | --------------------------------------------------------------------- |
| npm      | `zod`                                                | `react-hook-form`                                                     |
| 依赖     | **零运行时依赖**，不依赖 React                       | 只依赖 React                                                          |
| 能跑在哪 | Node / Deno / Bun / 浏览器 / CLI / 边缘函数          | **仅 React 组件树**                                                   |
| 干什么   | 描述「数据长什么样」，**运行时**校验，并推出 TS 类型 | 管表单：值、脏、触碰、提交、错误展示、少重渲染                        |
| 不管什么 | 不管 input 焦点、不管提交按钮、不管 UI               | 不管 schema 怎么写；校验可以是原生 HTML、手写函数、Yup、Zod、Valibot… |

业界口头说「用 zod + rhf」，是因为 **React 表单的主流组合拳**，不是因为它们绑死了。真正把它们接上的是可选第三包：

```text
zod                     ← 校验规则 + 类型（任何 JS 环境）
react-hook-form         ← 表单状态机（只认 React）
@hookform/resolvers     ← 把 schema.parse 的结果翻译成 RHF 的 errors 形状
```

类比你已经熟的栈：

| 组合                                   | 关系                                                             |
| -------------------------------------- | ---------------------------------------------------------------- |
| vee-validate + yup / zod               | Vue 侧几乎同一拆法                                               |
| Element `FormRules` + `reactive(form)` | 规则和值两份手写；zod+RHF 把「规则」抽成可复用 schema            |
| axios + Zod                            | 请求库和校验库独立；你可以只在拦截器里 `safeParse`，根本没有表单 |
| Gin `ShouldBindJSON` + 业务 handler    | 绑定/校验是一层，HTTP 处理是另一层                               |

一句话：**Zod 是「数据契约」；RHF 是「表单运行时」；resolver 是适配器。** 可以只用其中一个。

---

## 1. 为什么 TypeScript 不够，才需要 Zod

```ts
interface Login {
  username: string
  password: string
}

function login(body: Login) {
  /* ... */
}

login(JSON.parse(localStorage.getItem('draft') ?? '{}'))
// TS 编译通过。运行时可能是 { username: 1 } 或 {}。
```

`interface` / `type` 在 **`tsc` 编译完就蒸发**。对下面这些输入它帮不上忙：

- `import.meta.env.VITE_*`（没配时是 `undefined`，类型却写成 `string`）
- `<input>` 的值永远是 **string**（空串、`"12"`、`"on"`）
- `JSON.parse`、`localStorage`、querystring、webhook body
- 后端 JSON（Go 侧已经 `ShouldBind` 过，前端仍可能拿到过期字段）

Zod 做的事和 Go 把 JSON 解进 struct 同一类：**运行时按契约拆包，失败给 error**。额外彩蛋是 `z.infer` 能从同一份 schema 推出 TS 类型，避免「interface 一份、rules 一份」漂移。

```ts
import { z } from 'zod'

const loginSchema = z.object({
  username: z.string().min(1, '请输入用户名'),
  password: z.string().min(8, '至少 8 位'),
})

type Login = z.infer<typeof loginSchema>
// { username: string; password: string }
```

必须分两步：`loginSchema` 是运行时对象，泛型只吃类型。

| 写法                          | 得到什么                                                                 |
| ----------------------------- | ------------------------------------------------------------------------ |
| `loginSchema`                 | 运行时对象，能 `.parse()` / `.safeParse()`                               |
| `typeof loginSchema`          | schema **自己**的 TS 类型（`ZodObject<…>`），不是 `{ username: string }` |
| `z.infer<typeof loginSchema>` | 校验 **成功之后** 的数据形状                                             |

不能写 `z.infer<loginSchema>`。**`typeof` 是值 → 类型的桥**（TS 的 `typeof`，不是 JS 运行时那个）。

```ts
loginSchema.parse({ username: 'a', password: '12345678' }) // 返回数据（output）
loginSchema.safeParse({ username: '', password: 'x' }) // { success: false, error }
```

| API                      | 行为                                                                     | 适合                           |
| ------------------------ | ------------------------------------------------------------------------ | ------------------------------ |
| `parse(x)`               | 失败 **throw** `ZodError`                                                | 启动期：env 缺了就不该跑       |
| `safeParse(x)`           | 返回 `{ success, data \| error }`，不抛                                  | 用户输入、测试、请求解码       |
| `z.infer<typeof schema>` | **类型工具**（不是运行时函数）：从 schema **推** 类型；默认 = **output** | 替代手写 interface（同一份源） |

Vue 对照：Element `rules: { name: [{ required: true }] }` 只在表单提交时跑，类型还得另写。Zod 把这两件事收成一份。

---

## 2. Zod 本身（完全可以没有表单）

先钉死语法。Zod 的调用看起来像一串方法，其实分四类：

| 写法                                     | 是什么                                                                 | 例子                              |
| ---------------------------------------- | ---------------------------------------------------------------------- | --------------------------------- |
| `z.string()` / `z.object()` / `z.enum()` | **工厂**：调用后得到一份 schema                                        | `z.number()`                      |
| `.min(1)` / `.int()` / `.email()`        | **schema 上的方法**：收紧规则；返回同类 schema，所以能链式             | `z.string().min(1).max(50)`       |
| `z.coerce`                               | **命名空间**，不是函数。后面再跟类型工厂，才表示「先强制转到那种类型」 | `z.coerce.number()`               |
| `z.infer<>` / `z.input<>` / `z.output<>` | **纯类型工具**，只存在于 TS；运行时没有这些函数                        | `type T = z.infer<typeof schema>` |

读一条链时从左到右：工厂（或 `z.coerce` + 工厂）→ `.int()` / `.min()` 这类方法 → 最后 `.parse()` / `.safeParse()`。

不能写成 `z.infer(schema)` 或 `z.coerce()`：前者是类型工具要用 `<>`，后者必须再跟 `.number()` / `.string()` 等工厂。

### 2.1 常见形状

```ts
import { z } from 'zod'

z.string().min(1).max(50)
z.number().int().positive()
z.boolean()
z.literal(0)
z.enum(['draft', 'published']) // 字符串联合
z.union([z.literal(0), z.literal(1)]) // 0 | 1
z.array(z.string()).max(20)
z.object({ id: z.number(), name: z.string() })
z.record(z.string(), z.number()) // { [k: string]: number }
z.discriminatedUnion('type', [
  z.object({ type: z.literal('email'), email: z.string() }),
  z.object({ type: z.literal('sms'), phone: z.string() }),
])
```

每条都是 **运行时校验 + `z.infer<>` 推出 TS 类型**。读法：`z.string()` / `z.enum()` 是工厂；`.min(1)` / `.int()` 是该 schema 上的方法。

| Schema                                  | 推出的类型                     | 含义                                                                                                                                                    |
| --------------------------------------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `z.string().min(1).max(50)`             | `string`                       | 字符串，长度 1–50（空串不过；单独 `z.string()` 允许 `""`）                                                                                              |
| `z.number().int().positive()`           | `number`                       | 正整数。`1.5` 过不了 `.int()`；`0` 过不了 `.positive()`（含 0 用 `.nonnegative()`）                                                                     |
| `z.boolean()`                           | `boolean`                      | 必须是真正的 `true` / `false`；`"true"`、`1`、`0` 都失败。checkbox 自己把勾选转成 boolean，**不要** `z.coerce.boolean()`（`Boolean("false") === true`） |
| `z.literal(0)`                          | `0`                            | 只能是数字 `0`，不能是 `1`、`"0"`                                                                                                                       |
| `z.enum(['draft', 'published'])`        | `'draft' \| 'published'`       | 字符串联合；运行时也会拦，传 `'archived'` 失败                                                                                                          |
| `z.union([z.literal(0), z.literal(1)])` | `0 \| 1`                       | 数字联合。`z.enum` 只吃字符串，后端 0/1 开关只能用 `union` + `literal`                                                                                  |
| `z.array(z.string()).max(20)`           | `string[]`                     | 字符串数组，最多 20 项；空数组 `[]` 能过（没写 `.min(1)`）                                                                                              |
| `z.object({ id, name })`                | `{ id: number; name: string }` | 对象形状，字段写死                                                                                                                                      |
| `z.record(z.string(), z.number())`      | `Record<string, number>`       | 任意 key，值必须都是 number（动态字典）                                                                                                                 |
| `z.discriminatedUnion('type', [...])`   | 见下                           | 按判别字段 `type` 分流的对象联合                                                                                                                        |

`discriminatedUnion` 推出：

```ts
{ type: 'email'; email: string } | { type: 'sms'; phone: string }
```

比普通 `z.union` 好在：先看 `type` 再选分支，错误更准。对应 TS 的 discriminated union（`kind: 'success' | 'error'` 那种）。

记忆：**`enum` 管字符串联合，`literal` + `union` 管数字联合，`discriminatedUnion` 管带 tag 的对象联合。**

对象默认 **strip** 未知键（多传的字段丢掉）。`.strict()` / `.passthrough()` 是 **object schema 上的方法**：拒绝多余字段用前者，原样保留用后者。

### 2.2 `input` vs `output`（和 HTML 表单最容易撞车）

`parse` 是一道门：

```text
进门的值（input）  ──parse──►  出门的值（output）
控件 / JSON / query            你的业务代码拿到的
```

没有 `coerce` / `transform` 时，两边类型一样，`z.infer` 随便用。有转换时会分叉——表单最容易在这里栽。

**为什么会分叉：** HTML 的 `<input type="number">` 给你的仍是 **字符串**（空是 `""`，填了是 `"18"`）。`z.number()` 不收 string：

```ts
z.number().parse('18') // 抛错：期望 number，收到 string
```

`z.coerce` 是命名空间（强制转换标识），**不是方法**。后面跟哪个类型工厂，就往哪种类型转：

| 写法                 | 运行时大约等于                                      |
| -------------------- | --------------------------------------------------- |
| `z.coerce.number()`  | `Number(x)` 再当 number 校验                        |
| `z.coerce.string()`  | `String(x)`                                         |
| `z.coerce.boolean()` | `Boolean(x)`（`"false"` 也会变成 `true`，表单别用） |
| `z.coerce.date()`    | `new Date(x)`                                       |

转完之后的 `.int()` `.min(0)` 是普通 number 方法，不再转换。整条 `z.coerce.number().int().min(0)` 读作：先转成 number → 必须整数 → 不能小于 0。

```ts
const schema = z.object({
  age: z.coerce.number().int().min(0),
})

schema.parse({ age: '18' }) // { age: 18 }
schema.parse({ age: 18 }) // { age: 18 }  本来就是 number 也行
schema.parse({ age: 'abc' }) // 失败，Number('abc') 是 NaN
schema.parse({ age: '' }) // 成功但变成 { age: 0 }  ← Number('') === 0
```

| 进门 `age` | 结果          | 原因                                                       |
| ---------- | ------------- | ---------------------------------------------------------- |
| `'18'`     | `{ age: 18 }` | 字符串数字被掰过来                                         |
| `18`       | `{ age: 18 }` | 已经是 number                                              |
| `'abc'`    | 失败          | `Number('abc')` 是 `NaN`                                   |
| `''`       | `{ age: 0 }`  | `Number('') === 0`，空输入被当成 0；表单里常要先把空串拦掉 |

coerce 不是魔法，就是 **先强制转换，再校验**。空串变 0 这种副作用要自己知道。

**类型跟着分叉：**

```ts
type In = z.input<typeof schema> // { age: unknown }  — 进门：coerce 声明「什么都收」
type Out = z.output<typeof schema> // { age: number }   — 出门：转换 + 校验成功之后
type Out2 = z.infer<typeof schema> // 默认 = output，不是 input
```

`z.input` / `z.output` / `z.infer` 和 `z.string()` 不是一类东西：它们是 **TS 类型工具**，只能写在 `type X = …` 里，运行时调用会报错。

`z.input` 推出 `unknown` 而不是 `string`：运行时连 `true` / `null` 都会拿去 `Number()`，TS 没法收窄成某一种，只能标「未知」。

对照：不加 coerce 时两边相同。

```ts
const plain = z.object({ age: z.number().int().min(0) })
// z.input / z.output / z.infer 都是 { age: number }
plain.parse({ age: '18' }) // 失败
```

接 RHF 时，两边分别对应表单的两个阶段：

| 阶段                           | 用哪个类型               | 典型 API                                                   |
| ------------------------------ | ------------------------ | ---------------------------------------------------------- |
| 控件里还没 parse               | **input**                | `defaultValues`、`register`、`Controller` 的 `field.value` |
| resolver 已经 `safeParse` 成功 | **output**（=`z.infer`） | `handleSubmit` 回调的 `data`，拿去调 API                   |

如果 schema 有 coerce，却写成 `useForm<z.infer<typeof schema>>()`：TS 会要求 `defaultValues.age` 是 `number`，但原生 input 实际是 string——**类型撒谎**。正确拆法见 §4、§5.3。

`transform` 同样会让 input ≠ output（改值，有时改类型），见下一节。

### 2.3 `refine` / `transform` / `pipe`

这三个都是 **schema 实例上的方法**（挂在 `z.object()` / `z.string()` 的返回值上），不是 `z.refine()` 那种顶级工厂。

```ts
const passwordSchema = z
  .object({
    password: z.string().min(8),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    message: '两次密码不一致',
    path: ['confirm'], // 错误挂到哪个字段
  })

const htmlNotEmpty = z
  .string()
  .transform((s) => s.replace(/<[^>]+>/g, '').trim())
  .pipe(z.string().min(1, '内容不能为空'))
```

三个东西干的活不一样：

| API                 | 干什么                                                  | 改不改类型                         |
| ------------------- | ------------------------------------------------------- | ---------------------------------- |
| `.refine(fn)`       | 额外谓词。跨字段最常用（确认密码、开始日期 < 结束日期） | **不改**。input = output           |
| `.transform(fn)`    | 当前规则过了之后，把值改成别的再出门                    | **可能改**。例如 `string → number` |
| `.pipe(nextSchema)` | 把当前 output 当作下一个 schema 的 input                | 由后一段决定                       |

`passwordSchema`：字段各自先过 `z.string()`，对象拼起来后再跑 refine。`path: ['confirm']` 让错误出现在「确认密码」框上，而不是挂在整个 form。对应 Element 自定义 validator 里读 `form.password`。

`htmlNotEmpty` 是一条流水线（富文本空内容常见）：

```text
'<p>  </p>'     → transform 剥标签并 trim → ''       → pipe min(1) → 失败「内容不能为空」
'<p>hello</p>'  → transform               → 'hello'  → pipe min(1) → 出门 'hello'（标签没了）
```

先剥再量长度：如果只写 `z.string().min(1)`，`'<p></p>'` 会被当成有内容。

跨字段要报多个错时用 `.superRefine`，里面可以 `ctx.addIssue` 多次。单字段格式继续用链式 `.email()` / `.regex()` / `.refine()`。

### 2.4 Zod 的非表单用法（证明它独立）

```ts
// 1) 环境变量（Vite / Node）
//    .url() 是 string schema 的格式方法（必须是合法 URL），不是新工厂
const env = z.object({ DATABASE_URL: z.string().url() }).parse(process.env)

// 2) 本地缓存
const draft = schema.safeParse(JSON.parse(raw))
if (!draft.success) localStorage.removeItem('draft')

// 3) 第三方 webhook / 查询参数（searchParams 全是 string，所以 page 用 coerce，见 §2.2）
//    .default(1) 也是 schema 方法：缺省 / undefined 时出门填 1，该字段在 input 上变成可选
const Query = z.object({ page: z.coerce.number().int().min(1).default(1) })
const q = Query.parse(Object.fromEntries(new URL(location.href).searchParams))

// 4) CLI
//    z.tuple 是工厂：定长数组，每项按位置写死（对照 TS 元组 [string, 'dev' | 'prod']）
const Args = z.tuple([z.string(), z.enum(['dev', 'prod'])])
Args.parse(process.argv.slice(2))
```

这些场景里 **没有 React，更没有 RHF**。Zod 就是个 `json.Unmarshal` + 校验器。

## 2.5 和同类库

| 库                | 特点                                           | 何时选                |
| ----------------- | ---------------------------------------------- | --------------------- |
| **Zod**           | TS 优先、`infer`、生态最大（RHF / tRPC / env） | 默认                  |
| Yup               | Formik 年代标配，API 偏链式、类型推断弱一档    | 老项目                |
| Valibot           | 树摇更好、API 接近 Zod                         | 对包体敏感            |
| Joi               | Node 校验老牌，浏览器包偏大                    | 纯后端                |
| ArkType / Typia   | 更激进的类型语法                               | 新实验                |
| `class-validator` | 装饰器 + class，Nest 常见                      | 已是 class 风格就别混 |

选 Zod 的工程理由通常不是「校验更强」，而是 **一份 schema → 类型 + 运行时 + 表单 + 测试**。

---

## 3. React Hook Form 本身（完全可以没有 Zod）

RHF 解决的是 React 表单的老问题：每个 `onChange` 都 `setState` → 整表重渲染。它默认走 **非受控**：input 自己持有 DOM 值，RHF 用 ref 在提交/校验时读取。这和 Vue 的 `v-model`（受控）相反，更接近「原生 form + 提交时读 `FormData`」。

先认 API 形态（和 Zod 的「工厂 / 方法 / 类型工具」同类问题）：

| 写法                                            | 是什么                                                                                                  |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `useForm()`                                     | **hook**，创建表单实例；`register` / `handleSubmit` / `control` 都从它的返回值里拆，不是从包顶层 import |
| `{...register('email', rules)}`                 | `register` 是 **函数**，返回 `{ name, onChange, onBlur, ref }`，必须展开到原生 input 上                 |
| `Controller`                                    | **组件**，接受控 UI 库                                                                                  |
| `useFieldArray` / `useWatch` / `useFormContext` | 另外的 **hook**，都要吃同一个 `control`（或 `FormProvider`）                                            |
| `control`                                       | `useForm` 返回的对象，专门传给 `Controller` / `useFieldArray`，不是 DOM 节点                            |

### 3.1 最小形态：只有 RHF，校验写在 `register` 里

```tsx
import { useForm } from 'react-hook-form'

type Values = { email: string; age: number }

export function Signup() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    defaultValues: { email: '', age: 18 },
    mode: 'onSubmit', // 默认；也可 onBlur / onChange / onTouched / all
  })

  return (
    <form
      onSubmit={handleSubmit(async (values) => {
        await api.signup(values)
      })}
    >
      <input
        {...register('email', { required: '必填', pattern: { value: /@/, message: '不像邮箱' } })}
      />
      {errors.email && <span>{errors.email.message}</span>}

      <input type="number" {...register('age', { valueAsNumber: true, min: 1 })} />
      {errors.age && <span>{errors.age.message}</span>}

      <button disabled={isSubmitting}>提交</button>
    </form>
  )
}
```

这里 **没有 Zod**。规则是 RHF 内置的（`required` / `min` / `max` / `pattern` / `validate`），对应 HTML5 constraint + 自定义函数。小表单这样写完全合法。

`valueAsNumber: true` 是 RHF 读 DOM 时把字符串转成 number，和 Zod 的 `coerce` 同类。两条路只走一条，见 §7 坑 4。

### 3.2 核心 API（先记这些）

| API                                              | 作用                                                         | Vue 对照                                     |
| ------------------------------------------------ | ------------------------------------------------------------ | -------------------------------------------- |
| `useForm()`                                      | 创建表单实例                                                 | `reactive(form)` + `ref(formRef)`            |
| `register('name')`                               | 把 **原生** input 接到 RHF（ref + onChange + onBlur + name） | 给 `<el-input>` 绑 `v-model`，但这里是非受控 |
| `Controller` / `useController`                   | 接 **受控** 组件（Ant Select、DatePicker、自定义）           | 自定义组件上的 `v-model`                     |
| `handleSubmit(onValid, onInvalid)`               | 先校验再调回调；拦住默认提交                                 | `el-form.validate()`                         |
| `formState.errors`                               | 字段错误                                                     | `formRef.validate` 的 callback               |
| `formState.isSubmitting` / `isDirty` / `isValid` | 提交中 / 脏 / 当前是否合法                                   | 自己维护 `loading` + 手动算                  |
| `watch` / `useWatch`                             | 订阅字段；`useWatch` 重渲染范围更小                          | `watch(() => form.x)`                        |
| `setValue` / `getValues` / `reset`               | 命令式读写、还原                                             | `form.x =` / `Object.assign`                 |
| `trigger`                                        | 手动跑校验（下一步按钮、失焦外的时机）                       | `formRef.validateField`                      |
| `useFieldArray`                                  | 动态列表（增删改排序）                                       | `v-for` + 自己管 index                       |
| `FormProvider` + `useFormContext`                | 把 form 传给深层子组件                                       | provide / inject                             |

`formState` 默认是 **代理订阅**：你解构了 `errors` 才订阅 errors，没读 `isDirty` 就不会因 dirty 重渲染。不要 `const { formState } = useForm()` 再随处 `formState.xxx` 而不解构需要的键——文档建议：

```ts
const {
  formState: { errors, isSubmitting },
} = useForm()
```

### 3.3 `register` vs `Controller`（UI 库必撞）

原生 `<input>` / `<select>` / `<textarea>` 支持 ref，用 `register`。

Ant Design、MUI、自己的 `Switch` 往往是 **完全受控**（只认 `value` + `onChange`，不把值写进 DOM）。对它们 `register` 对不上，必须：

```tsx
import { Controller, useForm } from 'react-hook-form'
import { Select } from 'antd'
;<Controller
  name="status"
  control={control}
  render={({ field, fieldState }) => (
    <Select
      {...field}
      options={[
        { value: 0, label: '停用' },
        { value: 1, label: '启用' },
      ]}
      status={fieldState.error ? 'error' : undefined}
    />
  )}
/>
```

`field` 里是 `{ value, onChange, onBlur, ref, name }`。Ant 的 `Select` 要的就是 `value`/`onChange`，对得上。`Input` 虽然看起来像原生，但 Ant `Input` 也是受控封装，**后台里和 Ant 控件打交道时一律 `Controller`**，比混用 `register` 少踩坑。

这就是为什么「RHF + Ant」会显得比「RHF + 原生 input」啰嗦：啰嗦的是 **受控组件适配**，不是 Zod。

### 3.4 校验时机

```ts
useForm({
  mode: 'onSubmit', // 第一次：提交才校验
  reValidateMode: 'onChange', // 第一次失败后：改值就重校
})
```

| mode               | 体验                             |
| ------------------ | -------------------------------- |
| `onSubmit`（默认） | 不打扰输入中的人；后台 CRUD 常用 |
| `onBlur`           | 离开字段再提示                   |
| `onChange`         | 每键一次，错误闪得勤             |
| `all`              | blur + change 都跑               |

和 Element 的 `trigger: 'blur'` 是同一类旋钮。

### 3.5 RHF 也可以接别的校验库

resolver 是一个函数约定，不是 Zod 专属：

```ts
useForm({ resolver: yupResolver(yupSchema) })
useForm({ resolver: zodResolver(zodSchema) })
useForm({ resolver: valibotResolver(valibotSchema) })
useForm({
  resolver: async (values) => {
    // 完全手写：返回 { values, errors }
    if (!values.email) {
      return { values: {}, errors: { email: { type: 'required', message: '必填' } } }
    }
    return { values, errors: {} }
  },
})
```

所以：**RHF 不依赖 Zod；Zod 也不知道 RHF 存在。** 它们只在 `resolver` 这个接口上相遇。

---

## 4. 胶水：`@hookform/resolvers`

```bash
pnpm add react-hook-form zod @hookform/resolvers
```

三个包，三个职责。`zodResolver` 是 **函数**：吃一份 Zod schema，返回 RHF 要的 `resolver`。从子路径 `@hookform/resolvers/zod` import，不是 `from '@hookform/resolvers'`。少装 resolvers 也能自己写 `resolver` 函数，但错误路径（`path: ['items', 0, 'name']`）和 `ZodError.issues` 的翻译很烦，没必要手写。

```ts
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const schema = z.object({
  title: z.string().min(1, '请输入标题'),
  count: z.coerce.number().int().min(0),
})

type Values = z.infer<typeof schema> // = output，提交成功后的形状

const { control, handleSubmit } = useForm<z.input<typeof schema>, unknown, Values>({
  resolver: zodResolver(schema),
  defaultValues: { title: '', count: 0 },
})
```

`useForm` 三个类型参数对应 §2.2 的进门 / 出门：

```ts
useForm<
  z.input<typeof schema>, // 1. 表单持有的值（控件 / defaultValues）
  unknown, // 2. TContext，resolver 上下文；不用就 unknown
  z.output<typeof schema> // 3. parse 成功后 handleSubmit 拿到的值
>
```

这里 `count` 用了 coerce：进门可以是 `"3"` / `3` / 甚至别的，出门 `data.count` 一定是 `number`。没有 coerce / transform 时三个参数相同，可简化成 `useForm<z.infer<typeof schema>>()`。

提交流程：

```text
用户点提交
  → RHF 收集当前值（input 形状）
  → resolver 调 schema.safeParse
       失败 → 把 issues 写成 errors.title.message，打断提交
       成功 → 把 parse 后的 data（output）交给 handleSubmit 回调
  → 你的 onValid(data) 里调 API
```

`zodResolver` 做的翻译大致是：

```ts
// 伪代码
const r = schema.safeParse(values)
if (!r.success) {
  return { values: {}, errors: zodIssuesToRhf(r.error.issues) }
}
return { values: r.data, errors: {} }
```

字段级 `message` 来自你在 schema 里写的 `'请输入标题'`，不是 RHF 编的。因此 **文案只写在 Zod 一处**，测试也可以只测 schema，不测按钮。

---

## 5. 三套完整示例（从拆开到组合）

### 5.1 只用 Zod：校验函数，任意调用方

```ts
import { z } from 'zod'

// 创建 schema: 定义运行时校验规则,同时描述数据结构
export const createTagSchema = z.object({
  name: z.string().min(1, '请输入标签名').max(20),
  sortOrder: z.number().int(),
  status: z.union([z.literal(0), z.literal(1)]),
})

// 获取类型: 从 schema 推导 TypeScript 类型
export type CreateTag = z.infer<typeof createTagSchema>

// 解析输入: 校验 unknown 输入; 成功返回类型安全数据, 失败抛错
export function parseCreateTag(input: unknown): CreateTag {
  const r = createTagSchema.safeParse(input)
  if (!r.success) {
    throw new Error(r.error.issues[0]?.message ?? '校验失败')
  }
  return r.data
}

// Node 脚本、测试、非 React 页面都可以 import 这一份
```

### 5.2 只用 RHF：原生表单，内置规则

见 §3.1。适合字段少、规则简单、不需要把同一份规则复用到测试 / 服务端。

### 5.3 Zod + RHF + 受控 UI（后台最常见）

```tsx
import { z } from 'zod'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button, Form, Input, InputNumber, Select } from 'antd'

const schema = z.object({
  name: z.string().min(1, '请输入名称'),
  sortOrder: z.number().int(),
  status: z.union([z.literal(0), z.literal(1)]),
})

type FormInput = z.input<typeof schema>
type FormOutput = z.output<typeof schema>

export function TagForm({ onSubmit }: { onSubmit: (v: FormOutput) => Promise<void> }) {
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', sortOrder: 0, status: 1 },
  })

  return (
    <Form layout="vertical" onFinish={handleSubmit(onSubmit)}>
      <Form.Item
        label="名称"
        validateStatus={errors.name ? 'error' : ''}
        help={errors.name?.message}
      >
        <Controller name="name" control={control} render={({ field }) => <Input {...field} />} />
      </Form.Item>

      <Form.Item
        label="排序"
        validateStatus={errors.sortOrder ? 'error' : ''}
        help={errors.sortOrder?.message}
      >
        <Controller
          name="sortOrder"
          control={control}
          render={({ field }) => <InputNumber {...field} style={{ width: '100%' }} />}
        />
      </Form.Item>

      <Form.Item label="状态">
        <Controller
          name="status"
          control={control}
          render={({ field }) => (
            <Select
              {...field}
              options={[
                { value: 1, label: '启用' },
                { value: 0, label: '停用' },
              ]}
            />
          )}
        />
      </Form.Item>

      <Button htmlType="submit" type="primary" loading={isSubmitting} disabled={isSubmitting}>
        保存
      </Button>
    </Form>
  )
}
```

关键点：

1. **不要**再用 Ant `Form.useForm()` / `rules`。Ant `Form` 在这里只当布局（`Form.Item` 的 label / help），状态以 RHF 为准。两套状态 = 提交时值对不上。
2. `onFinish={handleSubmit(onSubmit)}`：Ant 的提交钩子只负责「点了保存」，真正校验走 RHF。
3. `isSubmitting` 防重复点击：`handleSubmit` 在 async 回调 resolve 前会保持 `true`。
4. 泛型写成 `useForm<Input, unknown, Output>`：有 `coerce` 时避免「控件是 string、回调以为是 number」的类型撒谎。本例 `sortOrder` 走 Ant `InputNumber`（本身给 number），**没有** coerce，所以 `FormInput === FormOutput`；三个泛型是和 §4 对齐的写法，以后加转换不用改结构。无变换时也可以简化成 `useForm<z.infer<typeof schema>>()`。

**Zod 管「数据长什么样」，RHF 管「表单跑起来」，resolver 翻译错误，Ant Form 只管画，Controller 把受控控件接到 RHF，Form.Item 只负责把 errors 画出来**

### 5.4 动态列表 `useFieldArray`

在 5.3 之上只多一件事：行是可变的。RHF 用 `useFieldArray` 管增删；Zod 用 `z.array().min().max()` 管条数和每行形状。Ant 仍然只画 UI。

```tsx
import { z } from 'zod'
import { useForm, Controller, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button, Form, Input, Space } from 'antd'

const schema = z.object({
  items: z
    .array(
      z.object({
        title: z.string().min(1, '请输入标题'),
        url: z.string().url('请输入合法 URL'),
      }),
    )
    .min(1, '至少一条')
    .max(20, '最多 20 条'),
})

type FormInput = z.input<typeof schema>
type FormOutput = z.output<typeof schema>

export function LinkListForm({ onSubmit }: { onSubmit: (v: FormOutput) => Promise<void> }) {
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(schema),
    defaultValues: { items: [{ title: '', url: '' }] },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'items' })

  const itemsError = errors.items?.root?.message ?? errors.items?.message

  return (
    <Form layout="vertical" onFinish={handleSubmit(onSubmit)}>
      {itemsError && <p style={{ color: '#ff4d4f' }}>{itemsError}</p>}

      {fields.map((f, i) => (
        <Space key={f.id} align="start" wrap>
          <Form.Item
            label="标题"
            validateStatus={errors.items?.[i]?.title ? 'error' : ''}
            help={errors.items?.[i]?.title?.message}
          >
            <Controller
              name={`items.${i}.title`}
              control={control}
              render={({ field }) => <Input {...field} />}
            />
          </Form.Item>

          <Form.Item
            label="链接"
            validateStatus={errors.items?.[i]?.url ? 'error' : ''}
            help={errors.items?.[i]?.url?.message}
          >
            <Controller
              name={`items.${i}.url`}
              control={control}
              render={({ field }) => <Input {...field} />}
            />
          </Form.Item>

          <Button htmlType="button" onClick={() => remove(i)} disabled={fields.length <= 1}>
            删
          </Button>
        </Space>
      ))}

      <Space>
        <Button
          htmlType="button"
          onClick={() => append({ title: '', url: '' })}
          disabled={fields.length >= 20}
        >
          加一条
        </Button>
        <Button htmlType="submit" type="primary" loading={isSubmitting} disabled={isSubmitting}>
          保存
        </Button>
      </Space>
    </Form>
  )
}
```

关键点：

1. `useFieldArray` 是 hook，必须传入和 `useForm` **同一个** `control`。`fields` 是当前行的快照；`append` / `remove`（还有 `insert` / `move` / `swap`）是它返回的命令函数。
2. `key={f.id}`：`id` 是 RHF 生成的稳定 key。**不要**用 index 当 React key——删中间项时后面的行会错位，受控输入会串值。
3. `name` 仍然用 index：`` `items.${i}.title` ``。key 用 `f.id`、name 用下标，两套各司其职。
4. 行内错误走 `errors.items?.[i]?.title`；**数组级**错误（`.min(1)` / `.max(20)`）在 `errors.items?.root?.message` 或 `errors.items?.message`（视 resolvers 版本）。`items` 既是 FieldError 数组又可能带 `root`，所以两处都要看。
5. 加/删必须 `htmlType="button"`，否则会触发表单提交。删到 0 条时 Zod 会报「至少一条」；本例直接禁掉最后一条的删，避免先空再报错。
6. `defaultValues.items` 至少给 `[{ title: '', url: '' }]`，不要 `undefined`（§7 坑 3）。

---

## 6. 和你熟悉的栈对照

### 6.1 Vue 后台（Element / vee-validate）

| Vue                                           | React 这边                                         |
| --------------------------------------------- | -------------------------------------------------- |
| `reactive(form)` + `v-model`                  | RHF（原生用 `register`，组件库用 `Controller`）    |
| `el-form` `:rules`                            | Zod schema（或 RHF `register` 规则）               |
| `formRef.validate()`                          | `handleSubmit` / `trigger`                         |
| vee-validate `useForm` + `yup`                | RHF + resolver + Zod（几乎同构）                   |
| `el-form` 自己存一份 model                    | **不要**再让 Ant Form 存一份；只借 Form.Item 画 UI |
| 跨字段：自定义 validator 里读 `form.password` | `schema.refine`，`path` 指到目标字段               |

vee-validate 4 的定位 ≈ RHF：都是「表单运行时」，校验库可插拔。你若在 Vue 里用过 `yup` + vee-validate，这边只是换皮。

### 6.2 Go / Gin

| Go                                | Zod / RHF                                |
| --------------------------------- | ---------------------------------------- |
| struct + `binding:"required"`     | Zod schema                               |
| `c.ShouldBindJSON(&req)` 失败 400 | `parse` / `safeParse` / resolver         |
| handler 里用已经 Bind 过的 `req`  | `handleSubmit` 回调里的 `data`（output） |
| `json.Unmarshal` 到 struct        | `schema.parse(JSON.parse(text))`         |
| 测试表：合法 / 非法 JSON          | `schema.safeParse` 的 `success`          |

后端已经 Bind 过的响应，前端 **不必** 再用 Zod 解一遍（除非你不信任网关、或在做 tRPC 那种端到端 schema）。Zod 打在 **不信任的输入**：浏览器用户、env、第三方、本地缓存。

### 6.3 和 Formik / Ant Form / 自己 `useState` 比

| 方案                        | 值存在哪       | 重渲染        | 校验            |
| --------------------------- | -------------- | ------------- | --------------- |
| 每个字段 `useState`         | React state    | 每键一次整表  | 自己写          |
| Formik / Ant `Form.useForm` | 受控 state     | 偏多          | Yup / rules     |
| **RHF**                     | 默认非受控 DOM | 提交/出错才更 | 内置或 resolver |
| 纯 `FormData`               | 提交瞬间读 DOM | 最少          | 自己 + Zod      |

RHF 赢在中大型表单的渲染成本和生态（resolver、field array）。十个字段的登录框，四种都能写；差别在 CRUD 弹窗堆到 20+ 字段、嵌套、上传、富文本之后。

---

## 7. 常见坑

**1. 两套表单状态**  
Ant `Form.useForm()` 和 `useForm()` 同时用。提交时 Ant 一份、RHF 一份，对不上。UI 库只负责控件，值只走 RHF。

**2. 对 Ant `Select`/`DatePicker` 用 `register`**  
这些组件不转发原生 ref 值。必须 `Controller`。

**3. 忘记 `defaultValues`**  
受控组件从 `undefined` → 有值会警告 uncontrolled/controlled 切换。所有字段给初始值（`''` / `0` / `[]`）。

**4. HTML 永远是 string，schema 写成 `z.number()`**  
`<input>` 或没配 `valueAsNumber` 时，Zod 会报「期望 number，收到 string」。选一条路：

- schema 用 `z.coerce.number()`，或
- `register('age', { valueAsNumber: true })`，或
- Ant `InputNumber` 本身给出 `number`（此时不要 coerce 两次）

**5. `z.infer` 当 defaultValues 的类型，却用了 `coerce`/`transform`**  
`infer` 是 output。`defaultValues` 要 input。用 `z.input<>` / `z.output<>` 拆开，或避免在表单 schema 里 transform。

**6. 把 API 响应用 Zod 再 parse 一遍当「类型安全」**  
类型安全来自你对后端契约的信任边界。重复 parse 每个 list 接口会噪声大、还要维护两份 DTO。更常见的切法：env + **写表单** 用 Zod；读接口用 TS interface。

**7. `watch()` 订阅整个 form**  
大表单会退回「每键一次重渲染」。要派生 UI 时用 `useWatch({ name: 'status' })`。

**8. `reset` 时机**  
编辑弹窗打开时 `reset(detail)`，关闭时 `reset(empty)`。不要靠 `defaultValues` 自动跟着 props 变（默认不会）；需要跟 props 变就在打开的 effect / 事件里 `reset`。

**9. 异步校验**  
`z.string().refine(async (name) => !(await api.exists(name)), '已占用')` 可以，但要接受输入停顿。更常见：提交时打接口，409 映射到 `setError('name', { message })`。

**10. Zod 大版本**  
Zod 3 与 4 的 error 定制、string format 有差异。Zod 4 把部分格式提升成了顶级工厂：`z.email()` ≈ `z.string().email()`（都是工厂，不是 `z.coerce` 那种命名空间）。`@hookform/resolvers` 要对上你装的 Zod 大版本；升级时先看 resolvers 的 Zod 4 说明，不要只升 `zod`。

---

## 8. 什么时候不该组合、什么时候只用一个

| 场景                                   | 建议                                                            |
| -------------------------------------- | --------------------------------------------------------------- |
| Vite/Node env、CLI、webhook、本地 JSON | **只 Zod**                                                      |
| 三字段搜索条、无需复用规则             | **只 RHF**（`register` 内置规则）甚至纯受控 `useState`          |
| 登录 / CRUD 写表单、规则要测、要复用   | **Zod + RHF + resolvers**                                       |
| 非 React（小程序、Go 模板、脚本）      | Zod 或后端 binding；RHF 用不上                                  |
| Vue                                    | vee-validate / Element rules；不要为了「和 React 统一」硬接 RHF |

组合的收益是 **单一校验源**：同一份 schema 给表单、给单测 `safeParse`、必要时给服务端（共享包）。代价是多两个依赖和一层 resolver。字段少、规则一次性，不必上。

---

## 9. 测试怎么切（不必上 RTL）

schema 是纯函数，测它比测按钮便宜：

```ts
it('空名称拒绝', () => {
  const r = createTagSchema.safeParse({ name: '', sortOrder: 0, status: 1 })
  expect(r.success).toBe(false)
})

it('合法通过', () => {
  const r = createTagSchema.safeParse({ name: '记叙', sortOrder: 0, status: 1 })
  expect(r.success).toBe(true)
})
```

组件测试只补「用户点得到的行为」（提交中按钮 disabled、校验文案出现）。不要断言 `formState` 内部字段名。

---

## 10. 官方文档地图（按需点，不必通读）

Zod：

1. Defining schemas
2. Parsing (`parse` / `safeParse`)
3. Inferring types（`infer` / `input` / `output`）
4. 需要跨字段时再看 `refine` / `superRefine`

RHF：

1. Get started（`register` + `handleSubmit`）
2. `Controller`（接 Ant / MUI 必读）
3. `formState`
4. `useFieldArray`（动态行才读）
5. Advanced: `FormProvider`、performance（`useWatch`）

Resolvers：README 里选 `zodResolver` 那一节即可，别的适配器当「RHF 不绑死 Zod」的证据扫一眼。

---

## 11. 读完能口头答出这 6 句就算过关

1. Zod 和 RHF 谁依赖谁？都不依赖；可选第三包 `@hookform/resolvers` 做翻译。
2. 为什么 TS `interface` 替代不了 Zod？（编译期蒸发；env / input / JSON 是运行时未知数据。）
3. 没有表单时 Zod 能干什么？env、缓存、query、webhook、CLI。
4. 没有 Zod 时 RHF 怎么校验？`register('x', { required, min, validate })` 或手写 `resolver`。
5. 为什么 Ant Design 要用 `Controller` 而不是 `register`？（受控组件，不暴露原生 value ref。）
6. `z.infer` 和 `z.input` 在有 `coerce` 时差在哪？前者是出门后的类型，`defaultValues` 要用进门前的。
