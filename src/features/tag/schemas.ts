import { z } from 'zod'

export const tagWriteSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, { message: '请输入标签名称' })
    .max(80, { message: '标签名称不能超过80个字符' }),
  sortOrder: z
    .number({ error: '请输入排序值' })
    .int({ message: '排序值必须是整数' })
    .min(0, { message: '排序值不能小于0' })
    .max(9999, { message: '排序值不能超过9999' }),
  status: z.union([z.literal(0), z.literal(1)]),
})

export type TagWriteInput = z.input<typeof tagWriteSchema>
export type TagWriteOutput = z.output<typeof tagWriteSchema>
