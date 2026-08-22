import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { LoginResult } from '@/shared/types'

type AdminInfo = Pick<LoginResult, 'adminId' | 'username' | 'role'>

type AuthStore = {
  token: string | null
  adminInfo: AdminInfo | null
  setAuth: (result: LoginResult) => void
  clear: () => void
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      token: null,
      adminInfo: null,
      setAuth: (result) =>
        set({
          token: result.token,
          adminInfo: {
            adminId: result.adminId,
            username: result.username,
            role: result.role,
          },
        }),
      clear: () => set({ token: null, adminInfo: null }),
    }),
    {
      name: 'admin_token',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ token: state.token, adminInfo: state.adminInfo }),
    },
  ),
)
