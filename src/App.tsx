import { Suspense, useEffect, useState } from 'react'
import { Outlet } from 'react-router'
import { Spin } from 'antd'
import { getQkActions } from '@/shared/qk-actions'
import { useAuthStore } from '@/features/auth/auth-store'

export function RouteFallback() {
  return <Spin fullscreen />
}

function goVueArticles() {
  // 不能 navigate('/vue/articles')：basename 是 /react，会被吃成 /react/vue/articles
  // qiankun 已 patch pushState 并补派 popstate；再手动 dispatch 会让本应用 router 把 URL 抢回去
  history.pushState(history.state, '', '/vue/articles')
}

function readTheme() {
  const theme = getQkActions()?.getGlobalState().theme
  return theme === 'dark' ? 'dark' : 'light'
}

export default function App() {
  const isQiankun = Boolean(window.__POWERED_BY_QIANKUN__)
  const [theme, setTheme] = useState(readTheme)

  useEffect(() => {
    const actions = getQkActions()
    if (!actions) return
    actions.onGlobalStateChange((state) => {
      if (state.theme === 'light' || state.theme === 'dark') setTheme(state.theme)
      useAuthStore.setState({
        token: state.token,
        adminInfo: state.adminInfo,
      })
    }, true)
    return () => {
      actions.offGlobalStateChange()
    }
  }, [])

  function toggleTheme() {
    getQkActions()?.setGlobalState({ theme: theme === 'light' ? 'dark' : 'light' })
  }

  return (
    <Suspense fallback={<RouteFallback />}>
      {isQiankun ? (
        <div className="qk-teach">
          <button type="button" className="qk-teach-btn" onClick={toggleTheme}>
            主题：{theme}
          </button>
          <button type="button" className="qk-teach-btn" onClick={goVueArticles}>
            去 Vue 文章
          </button>
        </div>
      ) : null}
      <Outlet />
    </Suspense>
  )
}
