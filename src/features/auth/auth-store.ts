import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { LoginResult } from '@/shared/types'
import { getQkActions } from '@/shared/qk-actions'

// 提取登录结果中的必要字段
type AdminInfo = Pick<LoginResult, 'adminId' | 'username' | 'role'>

const isQiankun = typeof window !== 'undefined' && Boolean(window.__POWERED_BY_QIANKUN__)

const noopStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
}

// 定义状态存储的类型
export type AuthStore = {
  token: string | null
  adminInfo: AdminInfo | null
  // 主动退出时为 true，不 persist；401 的 clear() 保持 false
  skipRedirect: boolean
  setAuth: (result: LoginResult) => void
  clear: (opts?: { skipRedirect?: boolean }) => void
}

// 创建状态存储
export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      token: null,
      adminInfo: null,
      skipRedirect: false,
      setAuth: (result) =>
        set({
          token: result.token,
          adminInfo: {
            adminId: result.adminId,
            username: result.username,
            role: result.role,
          },
          skipRedirect: false,
        }),
      clear: (opts) => {
        set({
          token: null,
          adminInfo: null,
          skipRedirect: opts?.skipRedirect ?? false,
        })
        if (window.__POWERED_BY_QIANKUN__) {
          getQkActions()?.setGlobalState({ token: null, adminInfo: null })
        }
      },
    }),
    {
      name: 'admin_token',
      storage: createJSONStorage(() => (isQiankun ? noopStorage : localStorage)),
      partialize: (state) => ({ token: state.token, adminInfo: state.adminInfo }),
      skipHydration: isQiankun,
    },
  ),
)
