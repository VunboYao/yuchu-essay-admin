import { z } from 'zod'
import { GRADES, UNITS } from '@/shared/constants/options'

export const taxonomyUnitWriteSchema = z.object({
  textbookVersion: z.string().trim().max(40, { message: '教材版本不能超过40个字符' }),
  grade: z.literal(GRADES, { message: '请选择年级' }),
  semester: z.union([z.literal('上册'), z.literal('下册')]),
  unit: z.literal(UNITS, { message: '请选择单元' }),
  unitTitle: z.string().trim().max(120, { message: '单元标题不能超过120个字符' }),
  sortOrder: z
    .number()
    .int()
    .min(0, { message: '排序值必须是整数' })
    .max(9999, { message: '排序值不能超过9999' }),
  status: z.union([z.literal(0), z.literal(1)]),
})

export type TaxonomyUnitWriteInput = z.input<typeof taxonomyUnitWriteSchema>
export type TaxonomyUnitWriteOutput = z.output<typeof taxonomyUnitWriteSchema>
