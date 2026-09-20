import { StrictMode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { RouterProvider } from 'react-router'
import '@/shared/styles/tokens.css'
import './index.css'
import '@/shared/config/env'
import { AppProviders } from '@/app/providers/AppProviders'
import router from '@/app/router'
import { getQkActions, setQkActions, type GlobalState } from '@/shared/qk-actions'

let root: Root | undefined

function render(container: ParentNode = document) {
  const el = container.querySelector('#root')
  if (!(el instanceof HTMLElement)) {
    throw new Error('[react-admin] #root not found in container')
  }

  root = createRoot(el)
  root.render(
    <StrictMode>
      <AppProviders>
        <RouterProvider router={router} />
      </AppProviders>
    </StrictMode>,
  )
}

export async function bootstrap() {}

type QiankunProps = {
  container: HTMLElement
  theme?: GlobalState['theme']
  onGlobalStateChange?: (
    callback: (state: GlobalState, prev: GlobalState) => void,
    fireImmediately?: boolean,
  ) => void
  setGlobalState?: (patch: Record<string, unknown>) => boolean
  offGlobalStateChange?: () => boolean
  getGlobalState?: () => GlobalState
}

export async function mount(props: QiankunProps) {
  if (props.onGlobalStateChange && props.setGlobalState && props.offGlobalStateChange) {
    setQkActions({
      onGlobalStateChange: props.onGlobalStateChange,
      setGlobalState: props.setGlobalState,
      offGlobalStateChange: props.offGlobalStateChange,
      getGlobalState:
        props.getGlobalState ??
        (() => ({ token: null, adminInfo: null, theme: props.theme ?? 'light' })),
    })
  }
  render(props.container)
}

export async function unmount() {
  root?.unmount()
  root = undefined
  getQkActions()?.offGlobalStateChange()
  setQkActions(undefined)
}

if (!window.__POWERED_BY_QIANKUN__) {
  render(document)
}
