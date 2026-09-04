import { z } from 'zod'

export const officialAccountWriteSchema = z.object({
  scene: z.string().trim().min(1, '场景不能为空'),
  username: z.string().trim().min(1, '用户名不能为空'),
  title: z.string().trim().optional(),
  description: z.string().trim().optional(),
  status: z.union([z.literal(0), z.literal(1)]),
})

export type OfficialAccountWriteInput = z.input<typeof officialAccountWriteSchema>
export type OfficialAccountWriteOutput = z.output<typeof officialAccountWriteSchema>
