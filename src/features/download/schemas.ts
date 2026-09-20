import { ACCESS_TYPE_OPTIONS, FREE_TAG } from '@/shared/constants/options'
import { z } from 'zod'

export const downloadWriteSchema = z.object({
  ownerType: z.literal('article'),
  ownerId: z.number().int().min(1, '请选择归属文章'),
  fileName: z.string().trim().min(1, '请输入文件名称').max(255, '文件名称不能超过255个字符'),
  fileUrl: z.string().trim().min(1, '请上传文件').max(1000, '文件路径不能超过1000个字符'),
  fileType: z.string().trim().max(40).default(''),
  fileSize: z.number().int().min(0).default(0),
  accessType: z.enum(ACCESS_TYPE_OPTIONS.map((option) => option.value)),
  tags: z.string().trim().max(500).default(FREE_TAG),
  needLogin: z.boolean().default(true),
  sortOrder: z.number().int().min(0).max(9999),
  status: z.union([z.literal(1), z.literal(0)]).default(1),
})

export type DownloadFileSchemaInput = z.input<typeof downloadWriteSchema>
export type DownloadFileSchemaOutput = z.output<typeof downloadWriteSchema>
