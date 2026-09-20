import { useEffect } from 'react'
import { useAuthStore } from '@/features/auth/auth-store'
import { Navigate, useLocation, Outlet } from 'react-router'

const FALLBACK = '/dashboard'

/** 只接受本站内部绝对路径；非法或指向登录页时回退 dashboard。 */
function parseRedirectUrl(search: string): string {
  const redirect = new URLSearchParams(search).get('redirect')
  if (!redirect || !redirect.startsWith('/') || redirect.startsWith('//')) {
    return FALLBACK
  }
  // `/articles?page=2#body` → `/articles`，用来判断是不是又指回登录页
  // /[?#]/：在第一个 ? 或 # 处切开
  const pathname = redirect.split(/[?#]/)[0]
  if (pathname === '/login') {
    return FALLBACK
  }
  return redirect
}

export function AuthGate() {
  const location = useLocation()
  const token = useAuthStore((state) => state.token)
  const skipRedirect = useAuthStore((state) => state.skipRedirect)
  const isQiankun = Boolean(window.__POWERED_BY_QIANKUN__)

  // 落到 /login 后再清标记，避免 render 里 setState / StrictMode 提前消费
  useEffect(() => {
    if (location.pathname === '/login' && skipRedirect) {
      useAuthStore.setState({ skipRedirect: false })
    }
  }, [location.pathname, skipRedirect])

  if (isQiankun) {
    if (location.pathname === '/login') {
      return token ? <Navigate replace to={parseRedirectUrl(location.search)} /> : null
    }
    if (!token) return null
    return <Outlet />
  }

  // 已登录停在 /login：跟登录成功后的 setAuth 重渲染是同一条分支，必须吃 redirect
  if (token && location.pathname === '/login') {
    return <Navigate replace to={parseRedirectUrl(location.search)} />
  } else if (!token && location.pathname !== '/login') {
    // 主动退出时,不要携带redirect参数
    if (skipRedirect) {
      return <Navigate replace to="/login" />
    }
    const redirectUrl = `${location.pathname}${location.search}${location.hash}`
    const loginUrl = `/login?redirect=${encodeURIComponent(redirectUrl)}`
    return <Navigate replace to={loginUrl} />
  } else {
    return <Outlet />
  }
}
