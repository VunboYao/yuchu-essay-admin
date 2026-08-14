import { isRouteErrorResponse, useRouteError } from 'react-router'

export function RouteErrorBoundary() {
  const error = useRouteError()
  const message = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : error instanceof Error
      ? error.message
      : '页面出错了'

  return (
    <div style={{ padding: 24 }}>
      <h1>出错了</h1>
      <p>{message}</p>
    </div>
  )
}
