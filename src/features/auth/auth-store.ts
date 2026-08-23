import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { LoginResult } from '@/shared/types'

// 提取登录结果中的必要字段
type AdminInfo = Pick<LoginResult, 'adminId' | 'username' | 'role'>

// 定义状态存储的类型
export type AuthStore = {
  token: string | null
  adminInfo: AdminInfo | null
  // 设置认证状态
  setAuth: (result: LoginResult) => void
  // 清除认证状态
  clear: () => void
}

// 创建状态存储
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
