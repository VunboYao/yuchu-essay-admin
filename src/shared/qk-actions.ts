export type GlobalState = {
  token: string | null
  adminInfo: { adminId: number; username: string; role: string } | null
  theme: 'light' | 'dark'
}

export type QkActions = {
  onGlobalStateChange: (
    callback: (state: GlobalState, prev: GlobalState) => void,
    fireImmediately?: boolean,
  ) => void
  setGlobalState: (patch: Record<string, unknown>) => boolean
  offGlobalStateChange: () => boolean
  getGlobalState: () => GlobalState
}

let actions: QkActions | undefined

export function setQkActions(next?: QkActions) {
  actions = next
}

export function getQkActions() {
  return actions
}
