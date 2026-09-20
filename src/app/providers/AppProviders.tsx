import { useEffect, useState, type ReactNode } from 'react'
import { App as AntdApp, ConfigProvider, theme } from 'antd'
import zhCN from 'antd/es/locale/zh_CN'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '@/shared/query/query-client'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import {
  applySchemeToDocument,
  nextScheme,
  persistScheme,
  readStoredScheme,
  type ColorScheme,
} from '@/app/theme/theme'
import { ThemeContext } from '@/app/theme/ThemeContext'
import { getQkActions } from '@/shared/qk-actions'
import { useAuthStore } from '@/features/auth/auth-store'

type AppProvidersProps = {
  children: ReactNode
}

function readInitialScheme(): ColorScheme {
  if (window.__POWERED_BY_QIANKUN__) {
    const current = getQkActions()?.getGlobalState().theme
    const scheme: ColorScheme = current === 'dark' ? 'dark' : 'light'
    applySchemeToDocument(scheme)
    return scheme
  }
  return readStoredScheme()
}

export function AppProviders({ children }: AppProvidersProps) {
  const [mode, setMode] = useState<ColorScheme>(readInitialScheme)

  useEffect(() => {
    const actions = getQkActions()
    if (!actions) return
    actions.onGlobalStateChange((state) => {
      if (state.theme === 'light' || state.theme === 'dark') {
        setMode(state.theme)
        applySchemeToDocument(state.theme)
      }
      useAuthStore.setState({
        token: state.token,
        adminInfo: state.adminInfo,
      })
    }, true)
    return () => {
      actions.offGlobalStateChange()
    }
  }, [])

  const toggle = () => {
    const next = nextScheme(mode)
    if (window.__POWERED_BY_QIANKUN__) {
      // 监听会回写 mode；updater 里调 setGlobalState 会被 StrictMode 打两次
      getQkActions()?.setGlobalState({ theme: next })
      return
    }
    persistScheme(next)
    setMode(next)
  }

  return (
    <ThemeContext value={{ mode, toggle }}>
      <ConfigProvider
        locale={zhCN}
        theme={{
          algorithm: mode === 'dark' ? theme.darkAlgorithm : theme.defaultAlgorithm,
          cssVar: { prefix: 'admin-react', key: 'admin-react' },
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
