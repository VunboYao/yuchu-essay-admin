import { Navigate } from 'react-router'

export function RedirectToDashboard() {
  return <Navigate to="/dashboard" replace />
}
