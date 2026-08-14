import { Suspense } from 'react'
import { Outlet } from 'react-router'
import { Spin } from 'antd'

export function RouteFallback() {
  return <Spin fullscreen />
}

export default function App() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Outlet />
    </Suspense>
  )
}
