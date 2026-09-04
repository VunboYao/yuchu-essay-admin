import { useState, type ReactNode } from 'react'
import { App as AntdApp, ConfigProvider, theme } from 'antd'
import zhCN from 'antd/es/locale/zh_CN'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '@/shared/query/query-client'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { nextScheme, persistScheme, readStoredScheme, type ColorScheme } from '@/app/theme/theme'
import { ThemeContext } from '@/app/theme/ThemeContext'

type AppProvidersProps = {
  children: ReactNode
}

export function AppProviders({ children }: AppProvidersProps) {
  const [mode, setMode] = useState<ColorScheme>(readStoredScheme)

  const toggle = () => {
    setMode((prev) => {
      const next = nextScheme(prev)
      persistScheme(next)
      return next
    })
  }

  return (
    <ThemeContext value={{ mode, toggle }}>
      <ConfigProvider
        locale={zhCN}
        theme={{
          algorithm: mode === 'dark' ? theme.darkAlgorithm : theme.defaultAlgorithm,
          cssVar: { prefix: 'admin-react' },
        }}
      >
        <QueryClientProvider client={queryClient}>
          <AntdApp>{children}</AntdApp>
          <ReactQueryDevtools initialIsOpen={false} />
        </QueryClientProvider>
      </ConfigProvider>
    </ThemeContext>
  )
}
