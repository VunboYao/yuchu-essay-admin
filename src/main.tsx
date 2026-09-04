import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@/shared/styles/tokens.css'
import './index.css'
import '@/shared/config/env'
import { AppProviders } from '@/app/providers/AppProviders'
import router from '@/app/router'
import { RouterProvider } from 'react-router'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>
  </StrictMode>,
)
