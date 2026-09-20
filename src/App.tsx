import { Suspense } from 'react'
import { Outlet } from 'react-router'
import { Spin } from 'antd'
import { useTheme } from '@/app/theme/useTheme'

export function RouteFallback() {
  return <Spin fullscreen />
}

function goVueArticles() {
  // 不能 navigate('/vue/articles')：basename 是 /react，会被吃成 /react/vue/articles
  // qiankun 已 patch pushState 并补派 popstate；再手动 dispatch 会让本应用 router 把 URL 抢回去
  history.pushState(history.state, '', '/vue/articles')
}

export default function App() {
  const isQiankun = Boolean(window.__POWERED_BY_QIANKUN__)
  const { mode, toggle } = useTheme()

  return (
    <Suspense fallback={<RouteFallback />}>
      {isQiankun ? (
        <div className="qk-teach">
          <button type="button" className="qk-teach-btn" onClick={toggle}>
            主题：{mode}
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
