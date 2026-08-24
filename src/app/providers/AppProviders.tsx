import type { ReactNode } from 'react'
import { App as AntdApp, ConfigProvider } from 'antd'
import zhCN from 'antd/es/locale/zh_CN'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '@/shared/query/query-client'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'

type AppProvidersProps = {
  children: ReactNode
}

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <ConfigProvider locale={zhCN}>
      <QueryClientProvider client={queryClient}>
        <AntdApp>{children}</AntdApp>
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </ConfigProvider>
  )
}
