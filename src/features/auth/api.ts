import type { LoginResult } from '@/shared/types'
import type { LoginSchemaOutput } from './schemas'

// 「Step 3 临时实现」 mock login
export const login = (data: LoginSchemaOutput): Promise<LoginResult> => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (data.username === 'admin' && data.password === 'admin123') {
        resolve({
          token: '1234567890',
          adminId: 1,
          username: 'admin',
          role: 'Super Admin',
        })
      } else {
        reject(new Error('登录失败'))
      }
    }, 3000)
  })
}
