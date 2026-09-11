import { z } from 'zod'
import {
  GRADES,
  UNITS,
  SEMESTER_VALUES,
  CONTENT_TYPE_VALUES,
  VIEW_ACCESS_VALUES,
} from '@/shared/constants/options'

export const articleWriteSchema = z.object({
  title: z.string().trim().min(1).max(255),
  slug: z
    .string()
    .trim()
    .min(1)
    .max(255)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, '仅小写字母、数字和连字符，如 grade-3-unit-1'),
  essayTopic: z.string().trim().min(1).max(255),
  summary: z.string().trim().min(1).max(500),
  grade: z.literal(GRADES, { message: '请选择年级' }),
  unit: z.literal(UNITS, { message: '请选择单元' }),
  semester: z.enum(SEMESTER_VALUES, { message: '请选择册次' }),
  contentType: z.enum(CONTENT_TYPE_VALUES, { message: '请选择内容类型' }),
  viewAccessType: z.enum(VIEW_ACCESS_VALUES),
  coverImg: z.string().trim().min(1).max(500),
  audience: z.string().trim().max(120).optional().default(''),
  isRecommended: z.boolean(),
  isHot: z.boolean(),
  sortOrder: z.number().int().min(0).max(9999),
  tagIds: z.array(z.number().int().positive()).default([]),
  textbookVersion: z.string().trim().optional().default('统编版'),
  bodyImages: z
    .array(z.object({ id: z.string(), url: z.string() }))
    .transform((rows) => rows.map((r) => r.url.trim()).filter(Boolean))
    .refine((urls) => urls.length <= 20, { message: '正文图最多 20 张' }),
})

export type ArticleWriteInput = z.input<typeof articleWriteSchema>
export type ArticleWriteOutput = z.output<typeof articleWriteSchema>
