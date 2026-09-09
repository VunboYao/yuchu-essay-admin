import { z } from 'zod'

export const feedbackWrite = z.object({
  reply: z.string().trim().min(1, '回复内容不能为空').max(1000, '回复内容不能超过1000个字符'),
})

export type FeedbackWriteInput = z.input<typeof feedbackWrite>
export type FeedbackWriteOutput = z.output<typeof feedbackWrite>
