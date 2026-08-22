# Zustand：React 客户端状态管理

> 本文讲清 Zustand 的定位、核心 API、选择器、更新方式、持久化和工程落点。  
> 需要对照时只对比 Vue 3，不把 Zustand 当成 Vuex 或 Pinia 的逐项翻版。

官方入口：

- [Zustand](https://zustand.docs.pmnd.rs/)
- [GitHub](https://github.com/pmndrs/zustand)

---

## 0. Zustand 解决什么问题

React 组件自己的状态通常从 `useState` 开始：

```tsx
const [open, setOpen] = useState(false)
```

当状态需要被多个距离较远的组件共享，并且不适合一路通过 props 传递时，可以放进 Zustand store，例如：

- 当前登录用户和 token；
- 当前工作区；
- 全局主题、语言；
- 跨页面保留的草稿；
- 全局抽屉、播放器等客户端状态。

Zustand 的核心模型很小：

```text
store = state + actions

组件通过 selector 订阅需要的 state
action 通过 set 更新 state
```

最小示例：

```ts
import { create } from 'zustand'

type CounterStore = {
  count: number
  increment: () => void
}

export const useCounterStore = create<CounterStore>((set) => ({
  count: 0,
  increment: () => set((state) => ({ count: state.count + 1 })),
}))
```

组件使用：

```tsx
import { useCounterStore } from './counter-store'

export function Counter() {
  const count = useCounterStore((state) => state.count)
  const increment = useCounterStore((state) => state.increment)

  return <button onClick={increment}>当前数量：{count}</button>
}
```

和 Vue 3 的直觉对照：

| Zustand                       | Vue 3                                                    |
| ----------------------------- | -------------------------------------------------------- |
| `create(...)` 创建 store hook | 创建一个组合式函数或 Pinia store                         |
| `state.count`                 | `ref.value` / `reactiveState.count`                      |
| `set(...)` 更新状态           | 给 `ref.value` 或 reactive 属性赋值                      |
| selector 订阅片段             | `computed(() => store.count)` / `storeToRefs` 后按需使用 |
| action                        | 组合式函数或 Pinia 中的方法                              |

最大的使用差异不是语法，而是订阅方式：React 组件调用 selector 后，selector 返回值变化才触发该组件重新渲染。

---

## 1. 先判断是否真的需要 Zustand

状态管理不等于所有状态都放进全局 store。

### 1.1 留在组件里的状态

只影响当前组件或很小子树的状态，优先 `useState`：

```tsx
const [open, setOpen] = useState(false)
const [activeTab, setActiveTab] = useState('base')
```

典型场景：

- 单个弹窗开关；
- hover、折叠、临时输入；
- 当前组件内部的步骤；
- 不需要跨路由保留的 UI 状态。

Vue 3 中这相当于组件内的 `ref`，不会因为项目安装了 Pinia 就把所有 `ref` 搬进全局。

### 1.2 通过 props 传递

父子组件之间的明确数据流，props 通常最简单：

```tsx
<UserCard user={user} onEdit={handleEdit} />
```

一两层 props 不是问题。为了消灭正常 props 而创建全局 store，反而隐藏了组件依赖。

### 1.3 Context 更合适的状态

如果状态天然属于某棵组件子树，并且需要按实例隔离，Context 更合适：

- 表单上下文；
- 主题 Provider；
- 每个编辑器实例自己的配置；
- 第三方库 Provider。

Zustand 默认导出的模块级 store 是单例。需要多个独立实例时，应创建 vanilla store，再通过 Context 注入，后文会讲。

### 1.4 不要把服务端数据默认放进 Zustand

列表、详情、分页和请求缓存是服务端状态，通常更适合 TanStack Query：

```text
服务端状态：文章列表、标签详情、分页、缓存、失效、重试
客户端状态：token、主题、跨页面草稿、纯 UI 协调状态
```

把接口列表复制进 Zustand 会额外制造：

- 缓存什么时候失效；
- 新增后如何同步多份列表；
- 页面切换是否重取；
- loading、error、retry 如何统一；
- 相同请求如何去重。

Zustand 可以发请求，但「能做」不等于「适合替代请求缓存库」。

---

## 2. 安装与第一个可运行示例

安装：

```bash
pnpm add zustand
```

创建 `src/features/counter/counter-store.ts`：

```ts
import { create } from 'zustand'

type CounterState = {
  count: number
}

type CounterActions = {
  increment: () => void
  decrement: () => void
  reset: () => void
}

type CounterStore = CounterState & CounterActions

export const useCounterStore = create<CounterStore>((set) => ({
  count: 0,

  increment: () => {
    set((state) => ({ count: state.count + 1 }))
  },

  decrement: () => {
    set((state) => ({ count: state.count - 1 }))
  },

  reset: () => {
    set({ count: 0 })
  },
}))
```

创建 `src/features/counter/Counter.tsx`：

```tsx
import { useCounterStore } from './counter-store'

export function Counter() {
  const count = useCounterStore((state) => state.count)
  const increment = useCounterStore((state) => state.increment)
  const decrement = useCounterStore((state) => state.decrement)
  const reset = useCounterStore((state) => state.reset)

  return (
    <section>
      <p>当前数量：{count}</p>
      <button type="button" onClick={decrement}>
        减少
      </button>
      <button type="button" onClick={increment}>
        增加
      </button>
      <button type="button" onClick={reset}>
        重置
      </button>
    </section>
  )
}
```

在页面中渲染：

```tsx
import { Counter } from '@/features/counter/Counter'

export default function App() {
  return <Counter />
}
```

不需要 Provider。`create` 返回的 `useCounterStore` 既是 React hook，也带有访问 store 的静态方法。

---

## 3. `create`、`set`、`get` 分别是什么

```ts
const useStore = create<Store>((set, get) => ({
  // 初始状态和 actions
}))
```

### 3.1 `create`

`create` 接收一个初始化函数，返回绑定到该 store 的 hook：

```ts
const useStore = create<Store>(() => ({
  count: 0,
}))
```

TypeScript 泛型描述 store 的完整形状，通常包括状态和 actions。

### 3.2 `set`

`set` 更新状态。传对象时，默认只做第一层合并：

```ts
set({ count: 0 })
```

需要依赖旧状态时必须传函数：

```ts
set((state) => ({ count: state.count + 1 }))
```

错误写法：

```ts
increment: () => set({ count: get().count + 1 })
```

这并非永远错误，但对「基于旧值计算新值」来说，函数式更新更清晰，也更不容易在连续更新中使用过期值。

### 3.3 `get`

`get()` 读取当前完整状态，常用于 action 内组合其他信息：

```ts
type CartStore = {
  items: Array<{ price: number; quantity: number }>
  getTotal: () => number
}

const useCartStore = create<CartStore>((_, get) => ({
  items: [],
  getTotal: () => get().items.reduce((total, item) => total + item.price * item.quantity, 0),
}))
```

如果值只用于渲染，优先在组件 selector 中读取。不要把大量可推导数据重复存进 state。

---

## 4. Selector：性能和依赖边界的核心

selector 是传给 store hook 的函数：

```ts
const count = useCounterStore((state) => state.count)
```

它表达两件事：

1. 当前组件需要 store 的哪一部分；
2. 哪个返回值变化时需要重新渲染。

### 4.1 不要无条件订阅整个 store

```tsx
// 不推荐：store 任意字段变化都可能让组件重渲染
const store = useCounterStore()

// 同样不推荐：解构只改变取值写法，不会缩小订阅范围
const { user, logout } = useAuthStore()
```

直接对整个 store 做对象解构，效果与先取得 `store` 再访问字段基本相同：组件仍订阅整个 store，其他字段变化也可能触发重渲染。对象解构本身不具备 selector 的按需订阅能力。

按需订阅：

```tsx
const user = useAuthStore((state) => state.user)
const logout = useAuthStore((state) => state.logout)
```

这类似 Vue 3 组件只消费自己需要的 `computed` / `ref`，但 React 中 selector 的返回值直接决定订阅更新。

### 4.2 单值 selector

最简单，也最推荐：

```tsx
const token = useAuthStore((state) => state.token)
```

基本类型或稳定函数引用可以直接按 `Object.is` 比较。

### 4.3 一次选择多个值

下面每次都会创建新对象：

```tsx
const auth = useAuthStore((state) => ({
  user: state.user,
  logout: state.logout,
}))
```

应使用 `useShallow` 做浅比较：

```tsx
import { useShallow } from 'zustand/react/shallow'

const { user, logout } = useAuthStore(
  useShallow((state) => ({
    user: state.user,
    logout: state.logout,
  })),
)
```

也可以分别订阅，代码往往更直白：

```tsx
const user = useAuthStore((state) => state.user)
const logout = useAuthStore((state) => state.logout)
```

不要预防性地给所有 selector 加 `useShallow`。单值 selector 不需要。

### 4.4 派生值

简单派生值可以直接在 selector 计算：

```tsx
const completedCount = useTodoStore((state) => state.todos.filter((todo) => todo.completed).length)
```

如果 selector **返回新数组或新对象**，每次比较都会认为引用变化。可使用 `useShallow`：

```tsx
const completedTodos = useTodoStore(
  useShallow((state) => state.todos.filter((todo) => todo.completed)),
)
```

计算特别昂贵时再评估 memo，而不是默认给所有派生值做复杂缓存。

---

## 5. 对象和数组必须不可变更新

Zustand 不会自动把深层修改转换成不可变更新。

### 5.1 更新对象

```ts
type Profile = {
  name: string
  preferences: {
    theme: 'light' | 'dark'
  }
}

type ProfileStore = {
  profile: Profile
  setTheme: (theme: Profile['preferences']['theme']) => void
}

export const useProfileStore = create<ProfileStore>((set) => ({
  profile: {
    name: '张三',
    preferences: { theme: 'light' },
  },

  setTheme: (theme) =>
    set((state) => ({
      profile: {
        ...state.profile,
        preferences: {
          ...state.profile.preferences,
          theme,
        },
      },
    })),
}))
```

下面写法直接修改旧对象，不要使用：

```ts
set((state) => {
  state.profile.preferences.theme = 'dark'
  return state
})
```

Vue 3 的 `reactive` 可以直接修改深层属性，因为 Vue 用响应式代理追踪变化；Zustand 默认按不可变状态方式工作，需要返回新引用。

### 5.2 更新数组

```ts
type Todo = {
  id: string
  title: string
  completed: boolean
}

type TodoStore = {
  todos: Todo[]
  addTodo: (todo: Todo) => void
  toggleTodo: (id: string) => void
  removeTodo: (id: string) => void
}

export const useTodoStore = create<TodoStore>((set) => ({
  todos: [],

  addTodo: (todo) =>
    set((state) => ({
      todos: [...state.todos, todo],
    })),

  toggleTodo: (id) =>
    set((state) => ({
      todos: state.todos.map((todo) =>
        todo.id === id ? { ...todo, completed: !todo.completed } : todo,
      ),
    })),

  removeTodo: (id) =>
    set((state) => ({
      todos: state.todos.filter((todo) => todo.id !== id),
    })),
}))
```

对应关系：

| 目标     | 不可变更新          |
| -------- | ------------------- |
| 添加     | `[...items, item]`  |
| 删除     | `items.filter(...)` |
| 修改一项 | `items.map(...)`    |
| 替换全部 | `newItems`          |

不要先 `push` / `splice` 旧数组再把同一个引用放回去。

---

## 6. Actions 应该放在哪里

推荐把业务相关状态和修改它的 actions 放在同一个 store：

```ts
type AuthStore = {
  token: string | null
  user: User | null
  login: (session: Session) => void
  logout: () => void
}
```

好处：

- 状态只能通过明确动作修改；
- 组件只表达「登录」「退出」，不重复拼装状态；
- 可在非 React 代码中复用同一动作；
- 测试可以直接验证公开行为。

不推荐让组件散落低层字段修改：

```tsx
// 组件知道太多状态结构
useAuthStore.setState({
  token: null,
  user: null,
  permissions: [],
})
```

应调用：

```tsx
const logout = useAuthStore((state) => state.logout)
logout()
```

### 6.1 一个 action 调用另一个 action

可以用 `get()`：

```ts
type Store = {
  count: number
  reset: () => void
  resetAndLog: () => void
}

const useStore = create<Store>((set, get) => ({
  count: 0,
  reset: () => set({ count: 0 }),
  resetAndLog: () => {
    get().reset()
    console.info('计数已重置')
  },
}))
```

但不要把 store actions 写成层层互调的隐式流程。复杂业务流程更适合独立 service，store 只保存客户端状态。

---

## 7. 在 React 组件外使用 store

`create` 返回的 hook 还提供：

```ts
useAuthStore.getState()
useAuthStore.setState(...)
useAuthStore.subscribe(...)
```

例如 HTTP 层遇到 401 时清理登录态：

```ts
useAuthStore.getState().logout()
```

读取当前 token：

```ts
const token = useAuthStore.getState().token
```

注意：

- `getState()` 只是读取当时快照，不会让调用者自动响应后续变化；
- React 组件渲染中仍应使用 hook + selector；
- `setState` 适合基础设施或测试，业务代码优先调用 action。

### 7.1 订阅变化

```ts
const unsubscribe = useAuthStore.subscribe((state, previousState) => {
  if (state.token !== previousState.token) {
    console.info('登录态变化')
  }
})

unsubscribe()
```

订阅会产生清理责任。组件内使用时放进 effect 并返回 `unsubscribe`；能用 hook selector 完成时，不要手动订阅。

---

## 8. 持久化 `persist`

登录态、主题等状态可能需要刷新后保留。Zustand 提供 `persist` middleware：

```ts
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

type AuthUser = {
  id: number
  name: string
}

type AuthStore = {
  token: string | null
  user: AuthUser | null
  login: (token: string, user: AuthUser) => void
  logout: () => void
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      token: null,
      user: null,

      login: (token, user) => set({ token, user }),
      logout: () => set({ token: null, user: null }),
    }),
    {
      name: 'admin-auth',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        token: state.token,
        user: state.user,
      }),
    },
  ),
)
```

这里使用 `create<AuthStore>()(...)` 的双括号写法，是 middleware 场景下常见的 TypeScript 写法。

### 8.1 `name`

`name` 是存储 key：

```ts
name: 'admin-auth'
```

修改 key 等于切换到一份新存储。生产项目应把它当成持久化契约。

### 8.2 `partialize`

只持久化必要字段：

```ts
partialize: (state) => ({
  token: state.token,
  user: state.user,
})
```

不要持久化：

- actions；
- loading、error；
- 弹窗开关；
- 可从其他字段推导的值；
- 服务端列表缓存；
- 临时表单输入，除非产品明确需要草稿恢复。

### 8.3 安全边界

`localStorage` 中的数据用户可读取、修改，不能作为可信权限依据：

- 前端 token 只用于发起请求；
- 权限最终由后端验证；
- 不存密码和高敏感数据；
- 读取持久化数据后仍应允许后端判定会话失效。

### 8.4 版本迁移

状态结构改变时可以设置 `version` 和 `migrate`：

```ts
persist(
  (set) => ({
    theme: 'light' as 'light' | 'dark',
    setTheme: (theme: 'light' | 'dark') => set({ theme }),
  }),
  {
    name: 'settings',
    version: 2,
    migrate: (persistedState, version) => {
      const state = persistedState as {
        theme?: 'light' | 'dark'
        darkMode?: boolean
      }

      if (version === 1) {
        return {
          ...state,
          theme: state.darkMode ? 'dark' : 'light',
        }
      }

      return state
    },
  },
)
```

持久化结构一旦上线，就不再只是内部实现。重命名字段时应考虑旧用户本地仍保留旧数据。

---

## 9. 异步 actions

Zustand 不限制 action 是否异步：

```ts
type ProfileStore = {
  profile: User | null
  loading: boolean
  error: string | null
  loadProfile: () => Promise<void>
}

export const useProfileStore = create<ProfileStore>((set) => ({
  profile: null,
  loading: false,
  error: null,

  loadProfile: async () => {
    set({ loading: true, error: null })

    try {
      const response = await fetch('/api/profile')
      if (!response.ok) throw new Error('获取用户信息失败')

      const profile = (await response.json()) as User
      set({ profile })
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '未知错误',
      })
    } finally {
      set({ loading: false })
    }
  },
}))
```

这段代码能运行，但在真实后台项目中，用户详情如果属于服务端数据，通常交给 TanStack Query 更合适。Zustand 只保留必须跨模块使用的客户端登录态。

适合异步 action 的情况：

- 客户端初始化流程；
- 对接只能通过全局 SDK 访问的状态；
- 不需要缓存、重试、失效管理的简单一次性操作。

如果开始手写 query key、缓存时间、请求去重、重试和失效，说明需求已经属于服务端状态管理。

---

## 10. Store 拆分策略

### 10.1 按业务边界拆分

推荐：

```text
features/
├── auth/
│   └── auth-store.ts
├── editor/
│   └── draft-store.ts
└── player/
    └── player-store.ts
```

不推荐一开始创建：

```text
stores/
└── root-store.ts  // 所有业务状态都塞进去
```

按业务边界拆分的好处：

- selector 和类型更小；
- 模块依赖清楚；
- 测试和重置更容易；
- 删除功能时能整体删除 store。

### 10.2 什么时候考虑 slices

单个 store 已经非常大，但多个状态必须作为一个整体更新或共享 middleware 时，可以使用 slice pattern。小项目不要提前引入。

```ts
type UserSlice = {
  user: User | null
  setUser: (user: User | null) => void
}

type ThemeSlice = {
  theme: 'light' | 'dark'
  setTheme: (theme: 'light' | 'dark') => void
}

type AppStore = UserSlice & ThemeSlice
```

slices 只是拆初始化代码，不会自动建立模块隔离。跨 slice 随意读写仍会形成耦合。

### 10.3 不要为 getters 模仿 class

简单派生值直接用 selector：

```tsx
const isLoggedIn = useAuthStore((state) => Boolean(state.token))
```

只有非 React 代码也需要复用复杂计算时，再考虑 store 方法或独立纯函数。

---

## 11. 多实例 store：vanilla store + Context

模块级 `create` store 是单例。如果页面上有两个独立编辑器，它们不能共享同一份草稿状态。

创建 vanilla store：

```ts
import { createStore } from 'zustand/vanilla'

type EditorStore = {
  content: string
  setContent: (content: string) => void
}

export function createEditorStore(initialContent = '') {
  return createStore<EditorStore>((set) => ({
    content: initialContent,
    setContent: (content) => set({ content }),
  }))
}

export type EditorStoreApi = ReturnType<typeof createEditorStore>
```

通过 Context 注入：

```tsx
import { createContext, type PropsWithChildren, useContext, useRef } from 'react'
import { useStore } from 'zustand'
import { createEditorStore, type EditorStoreApi } from './editor-store'

const EditorStoreContext = createContext<EditorStoreApi | null>(null)

export function EditorStoreProvider({
  children,
  initialContent,
}: PropsWithChildren<{ initialContent?: string }>) {
  const storeRef = useRef<EditorStoreApi | null>(null)

  if (!storeRef.current) {
    storeRef.current = createEditorStore(initialContent)
  }

  return (
    <EditorStoreContext.Provider value={storeRef.current}>{children}</EditorStoreContext.Provider>
  )
}

export function useEditorStore<T>(
  selector: (state: EditorStoreApi['getState'] extends () => infer S ? S : never) => T,
) {
  const store = useContext(EditorStoreContext)
  if (!store) {
    throw new Error('useEditorStore 必须在 EditorStoreProvider 内使用')
  }

  return useStore(store, selector)
}
```

使用：

```tsx
<EditorStoreProvider initialContent="第一份草稿">
  <Editor />
</EditorStoreProvider>

<EditorStoreProvider initialContent="第二份草稿">
  <Editor />
</EditorStoreProvider>
```

这更接近 Vue 3 中通过 `provide` / `inject` 为每棵组件子树提供独立实例。

如果应用只需要一个全局 auth store，不要套这层结构。

---

## 12. 测试 Zustand store

store 测试应验证公开状态行为，不绑定内部实现。

为了让每个测试有独立实例，优先测试 store factory：

```ts
import { createStore } from 'zustand/vanilla'

type CounterStore = {
  count: number
  increment: () => void
  reset: () => void
}

export function createCounterStore() {
  return createStore<CounterStore>((set) => ({
    count: 0,
    increment: () => set((state) => ({ count: state.count + 1 })),
    reset: () => set({ count: 0 }),
  }))
}
```

测试：

```ts
import { describe, expect, it } from 'vitest'
import { createCounterStore } from './counter-store'

describe('counter store', () => {
  it('初始数量为 0', () => {
    const store = createCounterStore()

    expect(store.getState().count).toBe(0)
  })

  it('increment 使数量加一', () => {
    const store = createCounterStore()

    store.getState().increment()

    expect(store.getState().count).toBe(1)
  })

  it('reset 恢复初始数量', () => {
    const store = createCounterStore()
    store.getState().increment()

    store.getState().reset()

    expect(store.getState().count).toBe(0)
  })
})
```

每个用例创建新 store，不需要手动猜测哪些字段要重置。

组件测试再验证：

- 组件能显示 selector 选择的值；
- 点击按钮会触发 action；
- action 后用户界面发生预期变化。

不要测试：

- Zustand 内部如何保存 listener；
- action 函数引用的实现细节；
- 已由 Zustand 自己保证的库行为。

---

## 13. TypeScript 实践

### 13.1 状态和 actions 分开声明

```ts
type AuthState = {
  token: string | null
  user: User | null
}

type AuthActions = {
  login: (session: Session) => void
  logout: () => void
}

type AuthStore = AuthState & AuthActions
```

这样读类型时能立刻区分数据与行为。

### 13.2 不要把可空值伪装成必有值

```ts
// 推荐
user: User | null

// 不推荐
user: {} as User
```

组件通过分支处理未登录状态：

```tsx
const user = useAuthStore((state) => state.user)
if (!user) return null
```

### 13.3 action 参数使用业务类型

```ts
type Session = {
  token: string
  user: User
}

login: (session: Session) => void
```

不要为了「通用」写成：

```ts
setState: (payload: Partial<AuthState>) => void
```

通用 setter 会让任何调用方都能构造不一致状态，例如有 `user` 却没有 `token`。

### 13.4 middleware 的双括号

无 middleware：

```ts
create<AuthStore>((set) => ({
  // ...
}))
```

有 middleware：

```ts
create<AuthStore>()(
  persist(
    (set) => ({
      // ...
    }),
    { name: 'auth' },
  ),
)
```

这是为了让 TypeScript 在 middleware 改变 store 类型时正确推断，不是调用了两次 store。

---

## 14. 常见反模式

### 14.1 把所有状态放进一个全局 store

后果是任意模块都能读写任意业务，依赖边界消失。按 auth、editor、player 等业务拆分。

### 14.2 组件订阅完整 store

```tsx
const store = useAppStore()
```

改成精确 selector：

```tsx
const theme = useAppStore((state) => state.theme)
```

### 14.3 直接修改对象和数组

```ts
state.items.push(item)
return state
```

改成返回新引用：

```ts
return { items: [...state.items, item] }
```

### 14.4 重复保存派生状态

```ts
{
  items,
  itemCount,
  totalPrice,
}
```

如果 `itemCount` 和 `totalPrice` 完全能从 `items` 算出，就只保存 `items`，避免三份数据不同步。

### 14.5 把请求缓存塞进 store

如果状态需要 stale time、缓存失效、请求去重和 retry，交给服务端状态工具。

### 14.6 在 React 渲染中使用 `getState`

```tsx
const token = useAuthStore.getState().token
```

它不会订阅变化。组件中应写：

```tsx
const token = useAuthStore((state) => state.token)
```

### 14.7 直接暴露任意字段更新

```ts
setAuth: (patch: Partial<AuthState>) => set(patch)
```

改成 `login`、`logout`、`refreshSession` 等有业务语义的 action，保护状态不变量。

### 14.8 过早引入 middleware 和 slices

先用一个普通 `create` store。只有出现明确需求时再增加 `persist`、devtools 或 slice pattern。

---

## 15. Zustand 与 Vue 3 的关键差异

| 关注点     | Zustand + React                  | Vue 3                                       |
| ---------- | -------------------------------- | ------------------------------------------- |
| 响应式来源 | store 订阅 + selector 返回值比较 | `ref` / `reactive` 依赖追踪                 |
| 深层修改   | 默认要求不可变更新并产生新引用   | reactive 对象可直接修改深层属性             |
| 组件取值   | `useStore(selector)`             | `ref.value`、模板自动解包、`storeToRefs`    |
| 派生状态   | selector 或独立纯函数            | `computed`                                  |
| 全局实例   | 模块级 store 默认单例            | 模块级 composable 或 Pinia store 常见为单例 |
| 子树实例   | vanilla store + Context          | `provide` / `inject`                        |
| 更新动作   | `set` 返回局部新状态             | 修改 ref/reactive，或调用 store action      |

最需要转换的习惯有两个：

1. 不要照搬 `reactive` 的深层原地修改，Zustand 默认返回新引用；
2. 不要在组件里拿完整 store，使用 selector 明确订阅边界。

---

## 16. 一个完整的 auth store

```ts
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

export type AuthUser = {
  id: number
  username: string
  roles: string[]
}

export type Session = {
  token: string
  user: AuthUser
}

type AuthState = {
  token: string | null
  user: AuthUser | null
}

type AuthActions = {
  login: (session: Session) => void
  updateUser: (user: AuthUser) => void
  logout: () => void
}

type AuthStore = AuthState & AuthActions

const initialState: AuthState = {
  token: null,
  user: null,
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      ...initialState,

      login: ({ token, user }) => {
        set({ token, user })
      },

      updateUser: (user) => {
        set((state) => {
          if (!state.token) return state
          return { user }
        })
      },

      logout: () => {
        set(initialState)
      },
    }),
    {
      name: 'admin-auth',
      storage: createJSONStorage(() => localStorage),
      partialize: ({ token, user }) => ({ token, user }),
    },
  ),
)

export const selectIsLoggedIn = (state: AuthStore) => Boolean(state.token)
```

组件：

```tsx
import { selectIsLoggedIn, useAuthStore } from './auth-store'

export function UserMenu() {
  const user = useAuthStore((state) => state.user)
  const isLoggedIn = useAuthStore(selectIsLoggedIn)
  const logout = useAuthStore((state) => state.logout)

  if (!isLoggedIn || !user) {
    return <a href="/login">登录</a>
  }

  return (
    <div>
      <span>{user.username}</span>
      <button type="button" onClick={logout}>
        退出
      </button>
    </div>
  )
}
```

非 React 请求层读取 token：

```ts
const token = useAuthStore.getState().token
```

收到 401 后：

```ts
useAuthStore.getState().logout()
```

这份 store 只管理客户端会话，不保存文章列表、用户详情请求缓存或全局 loading。

---

## 17. 选型清单

遇到一个状态时依次问：

```text
只属于当前组件？
  → useState

父子之间传递是否清晰？
  → props

是否天然属于一棵子树，或需要多个实例？
  → Context，必要时注入 vanilla Zustand store

是否来自服务端，需要缓存、失效、重试？
  → TanStack Query

是否是多个远距离组件共享的客户端状态？
  → Zustand
```

创建 store 后再检查：

- 是否按业务边界拆分；
- 组件是否使用精确 selector；
- 对象和数组是否不可变更新；
- 是否只持久化必要字段；
- 是否用有业务语义的 actions 保护状态；
- 是否误存了服务端数据或可推导数据；
- 测试是否为每个用例创建独立 store。

Zustand 的优势是简单。只有明确需求出现时才增加 middleware、Context、多实例或 slices，才能保持这份简单。
