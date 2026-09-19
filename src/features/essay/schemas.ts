import { z } from 'zod'
import { GRADES } from '@/shared/constants/options'

function isEffectivelyEmptyHtml(html: string): boolean {
  const plain = html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .trim()
  return !/\S/.test(plain)
}

export const essayWriteSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, { message: '请输入标题' })
    .max(255, { message: '标题不能超过255个字符' }),
  grade: z.literal(GRADES, { message: '请选择年级' }),
  body: z.string().refine((value) => !isEffectivelyEmptyHtml(value), {
    message: '请输入正文',
  }),
  comment: z.string().transform((value) => (isEffectivelyEmptyHtml(value) ? '' : value)),
  articleId: z
    .union([z.number().int(), z.literal(''), z.null()])
    .optional()
    .transform((value) => (typeof value === 'number' && value > 0 ? value : null)),
  sortOrder: z
    .number({ error: '请输入排序值' })
    .int({ message: '排序值必须是整数' })
    .min(0, { message: '排序值不能小于0' })
    .max(9999, { message: '排序值不能超过9999' })
    .default(0),
  status: z.union([z.literal(0), z.literal(1)]).default(1),
  tagIds: z.array(z.number().int().positive()).default([]),
})

export type EssayWriteInput = z.input<typeof essayWriteSchema>
export type EssayWriteOutput = z.output<typeof essayWriteSchema>
