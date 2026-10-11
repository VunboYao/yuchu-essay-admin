import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { beforeEach, expect, test } from 'vitest'
import { AuthGate } from '../src/app/router/AuthGate'
import { useAuthStore } from '../src/features/auth/auth-store'

/** 把落到登录页之后的 search 打出来，用来断言 redirect 带没带、带了什么。 */
function LoginProbe() {
  const location = useLocation()
  return <div data-testid="login-search">{location.search}</div>
}

/**
 * 路由树照 src/app/router/index.ts 搭：/login 在 AuthGate 里面，不是它的兄弟。
 * 搭成兄弟的话，「已登录还停在 /login」这条分支永远进不去，测出来是假绿。
 */
function renderAt(entry: string, token: string | null, skipRedirect = false) {
  useAuthStore.setState({ token, adminInfo: null, skipRedirect })

  return render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route element={<AuthGate />}>
          <Route path="/login" element={<LoginProbe />} />
          <Route path="/dashboard" element={<div>dashboard</div>} />
          <Route path="/articles" element={<div>articles</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  localStorage.clear()
  useAuthStore.setState({ token: null, adminInfo: null, skipRedirect: false })
  delete window.__POWERED_BY_QIANKUN__
})

test('未登录访问业务页：带去处跳到登录页，path + search + hash 都带上', () => {
  renderAt('/articles?page=2', null)
  expect(screen.getByTestId('login-search').textContent).toBe('?redirect=%2Farticles%3Fpage%3D2')
})

test('已登录停在登录页：吃掉 redirect，送去目标页', () => {
  renderAt('/login?redirect=%2Farticles', 'token')
  expect(screen.getByText('articles')).toBeInTheDocument()
  expect(screen.queryByTestId('login-search')).not.toBeInTheDocument()
})

test('redirect 是协议相对地址（//evil.com）时回落 dashboard', () => {
  renderAt('/login?redirect=%2F%2Fevil.com', 'token')
  expect(screen.getByText('dashboard')).toBeInTheDocument()
})

test('redirect 指回登录页时回落 dashboard，不自己咬自己', () => {
  renderAt('/login?redirect=%2Flogin', 'token')
  expect(screen.getByText('dashboard')).toBeInTheDocument()
})

test('未登录直接打开登录页：不重定向，否则死循环', () => {
  renderAt('/login', null)
  expect(screen.getByTestId('login-search').textContent).toBe('')
})

test('主动退出：跳登录页但不带 redirect，且标记落地即清', () => {
  renderAt('/articles', null, true)

  expect(screen.getByTestId('login-search').textContent).toBe('')
  // 不清的话，下次被踢出登录会莫名其妙不回原页
  expect(useAuthStore.getState().skipRedirect).toBe(false)
})

test('qiankun 下没 token 时不渲染也不跳登录 —— 登录归基座管', () => {
  window.__POWERED_BY_QIANKUN__ = true
  const { container } = renderAt('/articles', null)

  expect(container).toBeEmptyDOMElement()
  expect(screen.queryByTestId('login-search')).not.toBeInTheDocument()
})

test('qiankun 下有 token 时正常渲染子路由', () => {
  window.__POWERED_BY_QIANKUN__ = true
  renderAt('/articles', 'token')

  expect(screen.getByText('articles')).toBeInTheDocument()
})
