import { useAuthStore } from '@/features/auth/auth-store'
import { Navigate, useLocation, Outlet } from 'react-router'

export function AuthGate() {
  const location = useLocation()

  // 获取当前路径和查询参数
  const redirectUrl = `${location.pathname}${location.search}${location.hash}`
  // 构建登录 URL，携带重定向参数
  const loginUrl = `/login?redirect=${encodeURIComponent(redirectUrl)}`

  // 检查是否已登录
  const token = useAuthStore((state) => state.token)

  // 如果已登录，且当前路径为登录页，则重定向到首页
  if (token && location.pathname === '/login') {
    return <Navigate replace to="/dashboard" />
  } else if (!token && location.pathname !== '/login') {
    // 如果未登录，则重定向到登录页
    return <Navigate replace to={loginUrl} />
  } else {
    return <Outlet />
  }
}
