import { z } from 'zod'
import { NAV_TYPE_VALUES } from '@/shared/constants/options'

export const homeBlockWriteSchema = z.object({
  title: z.string().trim().min(1, '标题不能为空').max(120, '标题不能超过120个字符'),
  icon: z.string().trim().min(1, '图标不能为空').max(500, '图标不能超过500个字符'),
  navType: z.enum(NAV_TYPE_VALUES),
  path: z
    .string()
    .trim()
    .min(1, '路径不能为空')
    .max(500, '路径不能超过500个字符')
    .startsWith('/pages/', '路径必须以 /pages/ 开头'),
  sortOrder: z.number().int().min(0, '排序值不能小于0').max(9999, '排序值不能超过9999'),
  status: z.union([z.literal(0), z.literal(1)]),
})

export type HomeBlockWriteInput = z.input<typeof homeBlockWriteSchema>
export type HomeBlockWriteOutput = z.output<typeof homeBlockWriteSchema>
