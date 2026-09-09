import { get, put } from '@/shared/api'
import type { Feedback, PageData } from '@/shared/types'
import { type FeedbackStatus } from '@/shared/constants/options'
import type { FeedbackWriteOutput } from './schemas'

export type FeedbackListQuery = {
  keyword?: string
  status: '' | FeedbackStatus
  page: number
  pageSize: number
}

function toListParams(query: FeedbackListQuery) {
  return {
    keyword: query.keyword?.trim() || undefined,
    status: query.status === '' ? undefined : query.status,
    page: query.page,
    pageSize: query.pageSize,
  }
}

export function getFeedbackList(
  query: FeedbackListQuery,
  signal?: AbortSignal,
): Promise<PageData<Feedback>> {
  return get<PageData<Feedback>>('/feedbacks', {
    params: toListParams(query),
    signal,
  })
}

export function replyFeedback({
  id,
  input,
}: {
  id: number
  input: FeedbackWriteOutput
}): Promise<Feedback> {
  return put<Feedback>(`/feedbacks/${id}/reply`, input)
}
