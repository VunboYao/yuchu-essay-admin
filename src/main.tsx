import { StrictMode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { RouterProvider } from 'react-router'
import '@/shared/styles/tokens.css'
import './index.css'
import '@/shared/config/env'
import { AppProviders } from '@/app/providers/AppProviders'
import router from '@/app/router'

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

export async function mount(props: { container: HTMLElement }) {
  render(props.container)
}

export async function unmount() {
  root?.unmount()
  root = undefined
}

if (!window.__POWERED_BY_QIANKUN__) {
  render(document)
}
