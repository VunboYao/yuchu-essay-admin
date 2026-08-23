import { z } from 'zod'

// 登录表单验证
export const loginSchema = z.object({
  // 用户名不能为空
  username: z.string().trim().min(1, { message: '请输入用户名' }),
  // 密码不能为空
  password: z.string().min(1, { message: '请输入密码' }),
})

// 登录表单验证的类型
export type LoginSchemaInput = z.input<typeof loginSchema>
// 登录表单验证的返回类型
export type LoginSchemaOutput = z.output<typeof loginSchema>
