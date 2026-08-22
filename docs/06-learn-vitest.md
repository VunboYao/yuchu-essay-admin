# Vitest 从零到可运行测试

> 面向第一次系统接触自动化测试的前端开发者。本文先解释术语，再用可直接运行的 TypeScript 示例建立完整心智模型。  
> 示例默认在 Vite + TypeScript 项目中运行，不依赖本仓库当前业务代码。

官方入口：

- [Vitest](https://vitest.dev/)
- [Testing Library](https://testing-library.com/)
- [`@testing-library/jest-dom`](https://github.com/testing-library/jest-dom)

---

## 0. 先建立测试的基本认识

自动化测试就是把「输入什么、应该得到什么」写成代码，让计算机反复验证。

```ts
import { expect, test } from 'vitest'

test('1 加 1 等于 2', () => {
  expect(1 + 1).toBe(2)
})
```

这段代码包含三个核心部分：

1. `test(...)`：声明一个测试用例。
2. 执行被测逻辑：这里是 `1 + 1`。
3. `expect(...).toBe(...)`：断言实际结果符合预期。

测试通过不代表程序没有任何 bug，只代表已经写下来的这些场景目前符合预期。测试的价值主要是：

- 把需求和边界变成可执行规则；
- 修改代码后快速发现回归；
- 让重构有安全网；
- 用示例说明模块应该如何使用。

### 0.1 常见术语

| 术语 | 含义 |
| --- | --- |
| 被测对象（SUT） | System Under Test，当前正在验证的函数、模块或组件 |
| 测试用例（test case） | 一个明确场景，例如「未登录时跳转登录页」 |
| 断言（assertion） | 对结果作判断，例如 `expect(total).toBe(3)` |
| 预期值（expected） | 需求规定应该得到的结果 |
| 实际值（actual） | 代码真正运行得到的结果 |
| 测试套件（suite） | 一组相关测试，通常由 `describe` 组织 |
| 测试运行器（test runner） | 查找、执行、统计测试的工具；Vitest 就是运行器 |
| 匹配器（matcher） | `toBe`、`toEqual`、`toThrow` 这类断言方法 |
| fixture | 测试运行前准备好的固定输入、对象或文件 |
| mock | 用可控的假实现替代真实依赖 |
| spy | 监视函数是否被调用、调用次数和参数，也可临时替换实现 |
| stub | 返回预设结果的简化替身，通常不关心调用过程 |
| 覆盖率（coverage） | 代码行、分支、函数被测试执行到的比例 |
| 回归（regression） | 修改新功能时破坏了原有行为 |
| flaky test | 同一份代码时而通过、时而失败的不稳定测试 |

`mock`、`spy`、`stub` 在日常交流中经常混用。使用 Vitest 时先记住：

- `vi.fn()` 创建可记录调用情况的假函数；
- `vi.spyOn()` 监视已有对象上的方法；
- `vi.mock()` 替换整个模块。

---

## 1. 测试分哪几层

### 1.1 单元测试

验证一个较小、较独立的逻辑单元，例如：

- 价格计算函数；
- Zod schema；
- 格式化工具；
- Zustand store 的状态行为。

单元测试通常运行快、定位准，适合作为第一批测试。

### 1.2 集成测试

验证多个模块接起来后的行为，例如：

- React 组件 + 表单校验；
- 页面 + Router；
- 组件 + Zustand store；
- 请求函数 + 响应转换。

这里的「集成」不等于必须连接真实后端。重点是多个真实模块共同工作。

### 1.3 端到端测试（E2E）

从用户入口操作完整应用，例如打开浏览器、登录、创建标签、检查列表。它最接近真实使用，但运行更慢、维护成本更高，通常由 Playwright 等浏览器工具负责，不是 Vitest 的主要职责。

合理的起点：

1. 纯函数和 schema 写单元测试；
2. 关键组件与路由写少量集成测试；
3. 核心业务链路再补 E2E。

不要为了覆盖率给每个文件机械补测试。优先测试高风险行为、边界和曾经出现过的 bug。

---

## 2. 安装与最小配置

### 2.1 只测试 TypeScript 逻辑

在 Vite 项目中安装：

```bash
pnpm add -D vitest
```

在 `package.json` 增加：

```json
{
  "scripts": {
    "test": "vitest",
    "test:run": "vitest run"
  }
}
```

两条命令的区别：

```bash
# 监听模式：文件变化后只重跑相关测试，适合本地开发
pnpm test

# 单次执行：跑完退出，适合 CI 和提交前验证
pnpm test:run
```

创建 `src/shared/utils/sum.ts`：

```ts
export function sum(a: number, b: number) {
  return a + b
}
```

创建 `src/shared/utils/sum.test.ts`：

```ts
import { describe, expect, it } from 'vitest'
import { sum } from './sum'

describe('sum', () => {
  it('返回两个数字之和', () => {
    expect(sum(1, 2)).toBe(3)
  })

  it('支持负数', () => {
    expect(sum(-1, -2)).toBe(-3)
  })
})
```

运行：

```bash
pnpm test:run
```

Vitest 默认识别 `*.test.ts`、`*.spec.ts` 等文件。两种命名没有能力差异，项目统一一种即可。

### 2.2 测试 React 组件

组件测试需要模拟浏览器 DOM，并提供面向用户行为的查询工具：

```bash
pnpm add -D vitest jsdom @testing-library/react @testing-library/user-event @testing-library/jest-dom
```

在现有 `vite.config.ts` 中添加 `test`。若 TypeScript 不识别 `test` 字段，从 `vitest/config` 导入 `defineConfig`：

```ts
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
})
```

创建 `src/test/setup.ts`：

```ts
import '@testing-library/jest-dom/vitest'
```

`jsdom` 是在 Node.js 进程里模拟的 DOM 环境。它适合组件交互测试，但不是完整浏览器，布局尺寸、真实导航、下载等能力仍应由 E2E 验证。

---

## 3. 测试文件的基本结构

```ts
import { describe, expect, it } from 'vitest'

describe('购物车金额计算', () => {
  it('空购物车金额为 0', () => {
    expect(calculateTotal([])).toBe(0)
  })

  it('累加商品价格和数量', () => {
    const items = [
      { price: 10, quantity: 2 },
      { price: 5, quantity: 1 },
    ]

    expect(calculateTotal(items)).toBe(25)
  })
})
```

### 3.1 `describe`

`describe(name, fn)` 只负责分组：

- 输出更容易阅读；
- 可以在组内共享 `beforeEach`；
- 可以嵌套，但不要嵌套太深。

### 3.2 `test` 和 `it`

两者完全等价：

```ts
test('空数组返回 0', () => {})
it('空数组返回 0', () => {})
```

项目选一种风格统一即可。常见写法是：

```ts
describe('calculateTotal', () => {
  it('空数组返回 0', () => {})
})
```

### 3.3 Arrange、Act、Assert

复杂测试可以按 AAA 结构组织：

```ts
it('应用优惠券后减去优惠金额', () => {
  // Arrange：准备输入与依赖
  const items = [{ price: 100, quantity: 1 }]

  // Act：执行被测行为
  const actual = calculateTotal(items, { discount: 20 })

  // Assert：验证结果
  expect(actual).toBe(80)
})
```

注释不必机械保留。测试足够短时，用空行分隔三个阶段即可。

测试名应该描述业务行为，避免写成：

```ts
it('测试 calculateTotal', () => {})
```

更好的名字：

```ts
it('商品数量为 0 时不计入总价', () => {})
```

---

## 4. 最常用的断言

### 4.1 `toBe`：严格相等

适合基本类型和同一个对象引用：

```ts
expect(1 + 1).toBe(2)
expect('admin').toBe('admin')

const user = { id: 1 }
expect(user).toBe(user)
```

不要用它比较两个内容相同但引用不同的对象：

```ts
expect({ id: 1 }).toBe({ id: 1 }) // 失败
```

### 4.2 `toEqual`：递归比较内容

```ts
expect({ id: 1, roles: ['admin'] }).toEqual({
  id: 1,
  roles: ['admin'],
})
```

### 4.3 局部匹配

只关心结果的一部分时，不要把无关字段全部写进断言：

```ts
expect(result).toMatchObject({
  name: '作文',
  status: 1,
})

expect(users).toContainEqual({ id: 1, name: '张三' })

expect(response).toEqual({
  code: 0,
  data: expect.any(Array),
  message: expect.any(String),
})
```

### 4.4 布尔、空值与集合

```ts
expect(value).toBeTruthy()
expect(value).toBeFalsy()
expect(value).toBeNull()
expect(value).toBeUndefined()
expect(value).toBeDefined()

expect([1, 2, 3]).toContain(2)
expect([1, 2, 3]).toHaveLength(3)
expect('vitest').toContain('test')
```

`toBeTruthy()` 会接受所有真值。明确要求 `true` 时应写：

```ts
expect(result.success).toBe(true)
```

### 4.5 数字与浮点数

```ts
expect(10).toBeGreaterThan(5)
expect(10).toBeGreaterThanOrEqual(10)
expect(3).toBeLessThan(5)
expect(0.1 + 0.2).toBeCloseTo(0.3)
```

浮点运算不要直接用 `toBe(0.3)`。

### 4.6 异常

被测函数会抛错时，必须把调用包在函数里：

```ts
function parsePort(value: string) {
  const port = Number(value)

  if (!Number.isInteger(port) || port <= 0) {
    throw new Error('端口必须是正整数')
  }

  return port
}

it('拒绝无效端口', () => {
  expect(() => parsePort('abc')).toThrow('端口必须是正整数')
})
```

下面写法是错的，因为异常在 `expect` 接管前已经抛出：

```ts
expect(parsePort('abc')).toThrow()
```

---

## 5. 边界值与参数化测试

测试只写正常输入，通常拦不住真实 bug。以分页函数为例，边界至少包括：

- 最小合法值；
- 最大合法值；
- 刚好小于最小值；
- 刚好超过最大值；
- 空值和非法格式。

多个场景结构相同时用 `it.each`：

```ts
import { describe, expect, it } from 'vitest'

function clampPageSize(size: number) {
  return Math.min(100, Math.max(1, size))
}

describe('clampPageSize', () => {
  it.each([
    { input: -1, expected: 1 },
    { input: 0, expected: 1 },
    { input: 1, expected: 1 },
    { input: 20, expected: 20 },
    { input: 100, expected: 100 },
    { input: 101, expected: 100 },
  ])('$input 被限制为 $expected', ({ input, expected }) => {
    expect(clampPageSize(input)).toBe(expected)
  })
})
```

参数化测试减少重复，但不同业务原因的场景不要硬塞进同一个表格，否则失败信息会变得难懂。

---

## 6. 生命周期：每个测试必须互相独立

Vitest 提供四个常见钩子：

```ts
beforeAll(() => {}) // 当前 suite 开始前运行一次
beforeEach(() => {}) // 每个测试前运行
afterEach(() => {}) // 每个测试后运行
afterAll(() => {}) // 当前 suite 结束后运行一次
```

最常用的是 `beforeEach`：

```ts
import { beforeEach, describe, expect, it } from 'vitest'

let cart: string[]

beforeEach(() => {
  cart = []
})

describe('购物车', () => {
  it('初始为空', () => {
    expect(cart).toHaveLength(0)
  })

  it('可以添加商品', () => {
    cart.push('书')
    expect(cart).toEqual(['书'])
  })
})
```

测试不应该依赖执行顺序。任何一个测试单独运行都应该通过。共享可变状态会导致：

- 单独运行通过，整组运行失败；
- 调换顺序后失败；
- 并行执行时偶发失败。

清理定时器、mock、DOM 或订阅应放在 `afterEach`。若 Testing Library 的当前版本已自动清理 DOM，不要重复添加无意义配置。

---

## 7. 异步测试

### 7.1 Promise 成功

最清晰的写法是 `async/await`：

```ts
async function getUserName(id: number) {
  return id === 1 ? '张三' : null
}

it('返回用户名称', async () => {
  const name = await getUserName(1)
  expect(name).toBe('张三')
})
```

也可以直接断言 Promise：

```ts
await expect(getUserName(1)).resolves.toBe('张三')
```

### 7.2 Promise 失败

```ts
async function loadUser(id: number) {
  if (id <= 0) throw new Error('用户 ID 无效')
  return { id }
}

it('拒绝无效用户 ID', async () => {
  await expect(loadUser(0)).rejects.toThrow('用户 ID 无效')
})
```

必须 `await` 或 `return` 这个断言。漏掉后，测试可能在 Promise 完成前就被判定通过：

```ts
// 错误：没有等待
expect(loadUser(0)).rejects.toThrow()
```

---

## 8. Mock：只替换不可控边界

适合 mock 的依赖：

- 网络请求；
- 当前时间；
- 随机数；
- 浏览器存储；
- 第三方 SDK；
- 很慢或会产生外部副作用的服务。

不应为了隔离而 mock 每个内部函数。mock 太多会让测试只证明「假实现按假设工作」，而不是证明真实模块能协作。

### 8.1 `vi.fn()`：创建假函数

```ts
import { expect, it, vi } from 'vitest'

function saveArticle(
  title: string,
  notify: (message: string) => void,
) {
  notify(`已保存：${title}`)
}

it('保存后发送成功通知', () => {
  const notify = vi.fn()

  saveArticle('春天来了', notify)

  expect(notify).toHaveBeenCalledTimes(1)
  expect(notify).toHaveBeenCalledWith('已保存：春天来了')
})
```

可以预设返回值：

```ts
const getToken = vi.fn().mockReturnValue('token-123')
const request = vi.fn().mockResolvedValue({ code: 0 })
```

### 8.2 `vi.spyOn()`：监视已有方法

```ts
import { afterEach, expect, it, vi } from 'vitest'

afterEach(() => {
  vi.restoreAllMocks()
})

it('记录错误日志', () => {
  const spy = vi.spyOn(console, 'error').mockImplementation(() => {})

  console.error('请求失败')

  expect(spy).toHaveBeenCalledWith('请求失败')
})
```

`restoreAllMocks` 会恢复被 `spyOn` 替换的方法，避免污染后续测试。

### 8.3 `vi.mock()`：替换模块

假设 `api.ts`：

```ts
export async function fetchProfile() {
  const response = await fetch('/api/profile')
  return response.json() as Promise<{ name: string }>
}
```

`profile.ts`：

```ts
import { fetchProfile } from './api'

export async function getGreeting() {
  const profile = await fetchProfile()
  return `你好，${profile.name}`
}
```

测试：

```ts
import { beforeEach, expect, it, vi } from 'vitest'
import { fetchProfile } from './api'
import { getGreeting } from './profile'

vi.mock('./api', () => ({
  fetchProfile: vi.fn(),
}))

const mockedFetchProfile = vi.mocked(fetchProfile)

beforeEach(() => {
  mockedFetchProfile.mockReset()
})

it('使用接口返回的名称生成问候语', async () => {
  mockedFetchProfile.mockResolvedValue({ name: '张三' })

  await expect(getGreeting()).resolves.toBe('你好，张三')
})
```

注意：`vi.mock` 会被 Vitest 提升处理。不要依赖它在文件中的视觉顺序来推断执行顺序。

---

## 9. 时间与定时器

真实等待会让测试又慢又不稳定。使用 fake timers 控制时间：

```ts
import { afterEach, expect, it, vi } from 'vitest'

function debounceSave(save: () => void) {
  return setTimeout(save, 300)
}

afterEach(() => {
  vi.useRealTimers()
})

it('300ms 后保存', () => {
  vi.useFakeTimers()
  const save = vi.fn()

  debounceSave(save)
  expect(save).not.toHaveBeenCalled()

  vi.advanceTimersByTime(299)
  expect(save).not.toHaveBeenCalled()

  vi.advanceTimersByTime(1)
  expect(save).toHaveBeenCalledOnce()
})
```

固定当前日期：

```ts
vi.useFakeTimers()
vi.setSystemTime(new Date('2026-08-22T00:00:00Z'))
expect(new Date().toISOString()).toBe('2026-08-22T00:00:00.000Z')
vi.useRealTimers()
```

用完恢复真实时间，否则后续测试可能全部受到影响。

---

## 10. React 组件测试

组件测试关注用户能看见和操作的行为，不关注内部 `useState`、函数名或组件实例。

组件 `Counter.tsx`：

```tsx
import { useState } from 'react'

export function Counter() {
  const [count, setCount] = useState(0)

  return (
    <section>
      <p>当前数量：{count}</p>
      <button type="button" onClick={() => setCount(count + 1)}>
        增加
      </button>
    </section>
  )
}
```

测试 `Counter.test.tsx`：

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { Counter } from './Counter'

describe('Counter', () => {
  it('点击按钮后数量加一', async () => {
    const user = userEvent.setup()
    render(<Counter />)

    expect(screen.getByText('当前数量：0')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '增加' }))

    expect(screen.getByText('当前数量：1')).toBeInTheDocument()
  })
})
```

关键点：

- `render` 把组件渲染到 jsdom；
- `screen` 从当前页面查询元素；
- `getByRole` 按无障碍角色和名称查找，最接近用户操作；
- `userEvent` 模拟完整用户交互，通常比直接 `fireEvent` 更合适；
- 用户交互通常是异步的，所以要 `await`。

### 10.1 查询优先级

优先使用：

1. `getByRole`；
2. `getByLabelText`；
3. `getByPlaceholderText`；
4. `getByText`；
5. 最后才是 `getByTestId`。

示例：

```tsx
screen.getByRole('button', { name: '提交' })
screen.getByLabelText('用户名')
screen.getByText('保存成功')
```

如果只能靠 class 或 DOM 层级找到元素，通常意味着测试在依赖实现细节，或者组件的无障碍语义需要改进。

### 10.2 `getBy`、`queryBy`、`findBy`

| 查询 | 找不到时 | 是否等待 | 使用场景 |
| --- | --- | --- | --- |
| `getBy*` | 立即抛错 | 否 | 元素现在就应该存在 |
| `queryBy*` | 返回 `null` | 否 | 断言元素不存在 |
| `findBy*` | 超时后抛错 | 是 | 元素会在异步操作后出现 |

```tsx
expect(screen.queryByText('加载中')).not.toBeInTheDocument()
expect(await screen.findByText('加载完成')).toBeInTheDocument()
```

---

## 11. 覆盖率怎么理解

安装覆盖率 provider：

```bash
pnpm add -D @vitest/coverage-v8
```

增加脚本：

```json
{
  "scripts": {
    "test:coverage": "vitest run --coverage"
  }
}
```

常见指标：

| 指标 | 含义 |
| --- | --- |
| Statements | 被执行过的语句比例 |
| Branches | `if`、三元表达式等分支被执行的比例 |
| Functions | 被调用过的函数比例 |
| Lines | 被执行过的代码行比例 |

覆盖率只能说明代码是否被执行，不能说明断言是否正确。

```ts
const result = calculateTotal(items)
// 没有 expect，相关代码也可能被计入覆盖率
```

比追求 100% 更重要的是：

- 关键分支是否都有断言；
- 错误路径是否被验证；
- 边界值是否覆盖；
- 测试失败时能否准确指出行为哪里不对。

---

## 12. 常用运行方式

```bash
# 监听全部测试
pnpm vitest

# 单次运行
pnpm vitest run

# 只运行一个文件
pnpm vitest run src/shared/utils/sum.test.ts

# 按测试名称筛选
pnpm vitest run -t "支持负数"

# 更新快照；执行前必须先审查差异
pnpm vitest -u
```

调试期间可临时使用：

```ts
it.only('只运行这个测试', () => {})
it.skip('暂时跳过这个测试', () => {})
```

提交前必须移除误留的 `.only`。长期 `.skip` 会让问题被隐藏，应该说明原因并尽快处理。

---

## 13. 快照测试

快照会把序列化结果保存到文件，后续测试比较是否变化：

```ts
it('生成稳定配置', () => {
  expect(createConfig()).toMatchSnapshot()
})
```

快照适合稳定、结构化且确实需要整体比较的输出。不适合：

- 巨大的 React 页面树；
- 经常变化的日期、随机 ID；
- 开发者不看差异就直接更新的场景。

多数业务逻辑优先写明确断言：

```ts
expect(result).toMatchObject({
  status: 'published',
  title: '春天来了',
})
```

明确断言更容易看出需求是什么。

---

## 14. 常见错误

### 14.1 测实现细节

脆弱测试：

```ts
expect(componentState.isDialogOpen).toBe(true)
```

更稳定的测试：

```ts
expect(screen.getByRole('dialog')).toBeInTheDocument()
```

### 14.2 一个用例验证太多无关行为

「登录、创建、编辑、删除全部成功」放在一个用例里，失败后很难定位。按独立业务行为拆分。

### 14.3 为了让测试通过而复制生产逻辑

如果测试里重新实现一遍相同算法，两边可能错得一模一样。测试应表达外部可观察结果。

### 14.4 忘记等待异步行为

```ts
await user.click(button)
expect(await screen.findByText('保存成功')).toBeInTheDocument()
```

### 14.5 使用真实时间、随机数和网络

这些输入不可控，会造成慢测试和 flaky test。固定时间、注入随机结果、在测试边界替换网络。

### 14.6 用覆盖率代替测试设计

覆盖率是找遗漏的辅助指标，不是最终目标。没有有效断言的 100% 覆盖率仍然没有保护力。

---

## 15. 推荐的首批测试顺序

第一次给项目接测试，不要先测试复杂页面。按下面顺序成本最低：

1. 纯函数：格式化、计算、参数转换；
2. Zod schema：合法输入和关键非法输入；
3. Zustand store：动作导致的公开状态变化；
4. 关键组件：加载、空状态、错误状态、提交；
5. Router：鉴权和 404；
6. 请求层：统一错误转换，不重复测试请求库本身。

每个被测行为至少回答三个问题：

```text
正常情况是什么？
边界在哪里？
失败时应该发生什么？
```

一个好测试通常具备：

- 名称能读出业务规则；
- 输入最小且明确；
- 只因一种业务原因失败；
- 不依赖执行顺序；
- 不连接不必要的外部环境；
- 重构内部实现后仍然成立。

---

## 16. 最小记忆清单

```ts
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'
```

- `describe`：分组；
- `it` / `test`：一个场景；
- `expect`：断言；
- `beforeEach` / `afterEach`：每个测试前后准备与清理；
- `vi.fn`：创建可追踪的假函数；
- `vi.spyOn`：监视已有方法；
- `vi.mock`：替换模块；
- `await`：等待异步行为和异步断言；
- `toBe`：基本类型严格相等；
- `toEqual`：对象或数组内容相等；
- `getByRole`：从用户可操作语义查询组件。

先写少量高价值测试，让它们稳定、可读、能拦回归，再逐步扩展。
