import { z } from 'zod'

const envSchema = z.object({
  VITE_API_BASE: z.string().min(1),
})

export type AppEnv = z.infer<typeof envSchema>

// 启动时解析一次；缺变量直接抛错，禁止业务代码再读 import.meta.env.VITE_*
export const env: AppEnv = envSchema.parse({
  VITE_API_BASE: import.meta.env.VITE_API_BASE,
})
