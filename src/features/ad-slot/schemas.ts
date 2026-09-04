import { z } from 'zod'
import { AD_PAGE_VALUES, AD_TYPE_VALUES } from '@/shared/constants/options'

export const adSlotWriteSchema = z
  .object({
    slotKey: z.string().trim().min(1, '广告位标识不能为空').max(80, '广告位标识不能超过80个字符'),
    slotName: z
      .string()
      .trim()
      .min(1, '广告位名称不能为空')
      .max(120, '广告位名称不能超过120个字符'),
    page: z.enum(AD_PAGE_VALUES),
    position: z.string().trim().optional(),
    adType: z.enum(AD_TYPE_VALUES),
    adUnitId: z.string().trim().optional(),
    sortOrder: z.number().int().min(0, '排序值不能小于0').max(9999, '排序值不能超过9999'),
    status: z.union([z.literal(0), z.literal(1)]),
  })
  .superRefine((data, ctx) => {
    if (data.adType === 'rewarded_video' && data.page !== 'download') {
      ctx.addIssue({
        code: 'custom',
        path: ['page'],
        message: '激励视频广告位只能用于下载页面',
      })
    }
  })

export type AdSlotWriteInput = z.input<typeof adSlotWriteSchema>
export type AdSlotWriteOutput = z.output<typeof adSlotWriteSchema>
